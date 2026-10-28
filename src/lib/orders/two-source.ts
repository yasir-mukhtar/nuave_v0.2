/**
 * Spec 018: the server side of a two-source order. An order approved with a
 * search place asks every question to the ChatGPT app and to Google (R-12),
 * delivers a report when each source completed at least 5 of its 10 checks
 * (R-19), and saves a code-built block beside the model-written report.
 */
import { failedChatGptObservation, type ChatGptFacts } from "../checks/chatgpt";
import type { GoogleCheck } from "../checks/google";
import type { BusinessListing } from "../checks/listings";
import { stripPhoneNumbers } from "../checks/phones";
import { findNames } from "../audit/find-names";
import {
  subjectAliases,
  subjectBrandName,
  type DirectTenAuditContext,
} from "../audit/direct-ten-context-v2";
import {
  googleCoverageFinding,
  reportSubjectForCategory,
  topicsMissing,
  TWO_SOURCE_REPORT_VERSION,
  urlDomain,
  type CompetitorFact,
  type ReportSubject,
  type TwoSourceQuestion,
  type TwoSourceReport,
  type TwoSourceReportFacts,
  type TwoSourceWriterFacts,
} from "../audit/two-source-report";
import {
  SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
  type AuditCallTelemetry,
  type AuditObservation,
  type AuditPrompt,
  type AuditReport,
} from "../audit/types";
import { contextSearchPlace } from "../discovery/order-discovery";
import {
  INDONESIA_LOCATION_CODE,
  INDONESIA_SEARCH_PLACE,
  type SearchPlace,
} from "../discovery/places";
import {
  FALLBACK_ORIGIN,
  QUESTION_LABEL_TEXT,
  type QuestionOrigin,
} from "../discovery/question-rules";
import { questionOriginLines } from "../intake/question-origin-lines";
import type { OrderQuestionRow } from "./store";

/** Recorded in the intake at approval: this order asks both sources. */
export const TWO_SOURCE_CHECKS = "chatgpt-google-v1" as const;
/** R-19 (founder Q-2): each source completes at least 5 of its 10 checks. */
export const MIN_COMPLETED_PER_SOURCE = 5;

export type TwoSourceSetup = {
  place: SearchPlace;
  /** AC-20: "klinik" when the confirmed category names a clinic. */
  subject: ReportSubject;
  google: { code: number; name: string };
  /** The business name and confirmed aliases (R-16). */
  names: string[];
  origins: QuestionOrigin[] | null;
  /** How the approved pack was written (R-08); null for a pack approved
   * before the mode was recorded. */
  questionMode: "grounded" | "fallback" | null;
};

type Intake = {
  context: DirectTenAuditContext;
  prompts: AuditPrompt[];
  checks?: unknown;
  question_origins?: unknown;
  question_mode?: unknown;
};

/** The two-source setup of an approved intake, or null for a one-source order
 * (approved before Spec 018). */
export function twoSourceSetup(intake: Intake): TwoSourceSetup | null {
  if (intake.checks !== TWO_SOURCE_CHECKS) return null;
  const place = contextSearchPlace(intake.context) ?? INDONESIA_SEARCH_PLACE;
  return {
    place,
    subject: reportSubjectForCategory(intake.context.category?.value ?? ""),
    google:
      place.kind === "place"
        ? { code: place.code, name: place.display }
        : { code: INDONESIA_LOCATION_CODE, name: "Indonesia" },
    names: [
      subjectBrandName(intake.context),
      ...subjectAliases(intake.context),
    ].filter((name) => name.trim()),
    origins:
      Array.isArray(intake.question_origins) &&
      intake.question_origins.length === intake.prompts.length
        ? (intake.question_origins as QuestionOrigin[])
        : null,
    questionMode:
      intake.question_mode === "grounded" || intake.question_mode === "fallback"
        ? intake.question_mode
        : null,
  };
}

/** AC-05: search data backs the pack only when it was written from the pool.
 * A customer's edit never turns a fallback pack into a search-data one. */
export function searchDataAvailable(setup: TwoSourceSetup): boolean {
  if (setup.questionMode) return setup.questionMode === "grounded";
  return setup.origins
    ? setup.origins.some(
        (origin) =>
          origin.label !== "disusun_dari_profil" &&
          origin.label !== "diubah_oleh_anda",
      )
    : false;
}

const final = (status: string | null) =>
  status === "done" || status === "exhausted";

/** R-19: where the order stands once its checks are saved. */
export function twoSourceGate(rows: readonly OrderQuestionRow[]): {
  allFinal: boolean;
  chatgptCompleted: number;
  googleCompleted: number;
  passes: boolean;
} {
  const chatgptCompleted = rows.filter((row) => row.status === "done").length;
  const googleCompleted = rows.filter((row) => row.g_status === "done").length;
  return {
    allFinal:
      rows.length === 10 &&
      rows.every((row) => final(row.status) && final(row.g_status)),
    chatgptCompleted,
    googleCompleted,
    passes:
      chatgptCompleted >= MIN_COMPLETED_PER_SOURCE &&
      googleCompleted >= MIN_COMPLETED_PER_SOURCE,
  };
}

function parse<T>(json: string | null): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/** The ten ChatGPT observations the report pipeline reads: an answer, or the
 * honest failed record of a check whose attempts are used up (R-20). In
 * synthetic mode every record carries the synthetic label. */
export function twoSourceObservations(input: {
  rows: readonly OrderQuestionRow[];
  prompts: readonly AuditPrompt[];
  synthetic: boolean;
  now: Date;
}): AuditObservation[] {
  return input.prompts.map((prompt) => {
    const row = input.rows.find((item) => item.prompt_id === prompt.prompt_id);
    const saved = parse<AuditObservation>(row?.observation_json ?? null);
    const observation =
      saved ??
      failedChatGptObservation({
        prompt,
        reason: row?.last_failure ?? "",
        telemetry:
          parse<AuditCallTelemetry[]>(row?.attempts_json ?? "[]") ?? [],
        at: input.now,
      });
    return input.synthetic
      ? {
          ...observation,
          system: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
          requested_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
          returned_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
        }
      : observation;
  });
}

/** Spec 018 R-28: what the report-writing model reads about both sources,
 * built by code from the saved checks. */
export function twoSourceReportFacts(input: {
  rows: readonly OrderQuestionRow[];
  prompts: readonly AuditPrompt[];
  subject?: ReportSubject;
  /** The business name and confirmed aliases (N-33). */
  names?: readonly string[];
}): TwoSourceReportFacts {
  let chatgptCompleted = 0;
  let chatgptNamed = 0;
  const google = input.prompts.map((prompt) => {
    const row = input.rows.find((item) => item.prompt_id === prompt.prompt_id);
    if (row?.status === "done") {
      chatgptCompleted += 1;
      if (parse<ChatGptFacts>(row.c_facts_json)?.named === "named")
        chatgptNamed += 1;
    }
    const check =
      row?.g_status === "done"
        ? parse<GoogleCheck>(row.g_result_json ?? null)
        : null;
    if (!check)
      return {
        prompt_id: prompt.prompt_id,
        outcome: "failed" as const,
        business_named: null,
        cited_domains: [],
      };
    return {
      prompt_id: prompt.prompt_id,
      outcome: check.outcome,
      business_named:
        check.outcome === "summary" ? check.named === "named" : null,
      cited_domains: [
        ...new Set(
          check.references.flatMap((reference) => {
            const domain = urlDomain(reference.url);
            return domain ? [domain] : [];
          }),
        ),
      ].slice(0, 10),
    };
  });
  return {
    ...(input.subject ? { subject: input.subject } : {}),
    ...(input.names?.length ? { names: [...input.names] } : {}),
    counts: {
      chatgpt: { completed: chatgptCompleted, named: chatgptNamed },
      google: {
        completed: google.filter((fact) => fact.outcome !== "failed").length,
        summaries: google.filter((fact) => fact.outcome === "summary").length,
        named: google.filter((fact) => fact.business_named === true).length,
      },
    },
    google,
  };
}

function normalized(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim();
}

/** The longest Google answer the writer reads (the longest in NV-3WDSAY is
 * 4,227 characters, so most arrive whole); the report-writer test uses the
 * same limit. */
export const WRITER_GOOGLE_TEXT_MAX_CHARS = 3_000;

/** A Google answer for the writer: phone numbers removed again (in case a
 * saved answer predates the filter), and a long one shortened at the last
 * sentence (or word) end that fits, ending with "…". */
export function writerGoogleText(
  text: string,
  max = WRITER_GOOGLE_TEXT_MAX_CHARS,
): string {
  const clean = stripPhoneNumbers(text).trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const sentence = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf(".\n"),
    cut.lastIndexOf("\n"),
  );
  const end = sentence > max * 0.6 ? sentence + 1 : cut.lastIndexOf(" ");
  return `${cut.slice(0, end > 0 ? end : max).trim()} …`;
}

/**
 * Spec 021 B-01: what the new writer reads beside the counts, from the same
 * code-built block the report saves (so the businesses per answer are
 * counted by Part C's rule). Built before the report exists, so nothing here
 * depends on the writer's own reading.
 */
export function twoSourceWriterFacts(input: {
  rows: readonly OrderQuestionRow[];
  prompts: readonly AuditPrompt[];
  observations: readonly AuditObservation[];
  setup: TwoSourceSetup;
}): TwoSourceWriterFacts {
  const two = buildTwoSourceReport({
    ...input,
    report: { details: [] },
    orderNumber: null,
  });
  const others = (two.competitors?.others ?? []).filter(
    (fact) => fact.chatgpt.length + fact.google.length > 0,
  );
  return {
    questions: two.questions.map((question) => ({
      prompt_id: question.prompt_id,
      ordinal: question.ordinal,
      topic: question.topic,
      volume: question.volume,
      named: { chatgpt: question.chatgpt.named, google: question.google.named },
      google_text:
        question.google.outcome === "summary"
          ? writerGoogleText(question.google.text)
          : "",
      businesses: {
        chatgpt: others
          .filter((fact) => fact.chatgpt.includes(question.prompt_id))
          .map((fact) => fact.name),
        google: others
          .filter((fact) => fact.google.includes(question.prompt_id))
          .map((fact) => fact.name),
      },
    })),
    businesses: others.map((fact) => fact.name),
  };
}

/** The code-built block saved with a two-source report. */
export function buildTwoSourceReport(input: {
  report: Pick<AuditReport, "details">;
  rows: readonly OrderQuestionRow[];
  prompts: readonly AuditPrompt[];
  observations: readonly AuditObservation[];
  setup: TwoSourceSetup;
  orderNumber: string | null;
}): TwoSourceReport {
  const { setup } = input;
  const own = setup.names.map(normalized).filter(Boolean);
  // N-21: a branch of the business ("CS Dental Surabaya") is not another
  // business: any name holding an own name as whole words is skipped.
  const isOwn = (name: string) => {
    const key = ` ${normalized(name)} `;
    return own.some((ownName) => key.includes(` ${ownName} `));
  };
  const googleTexts: string[] = [];
  const chatgptBusinesses: string[] = [];
  const googleBusinesses: string[] = [];
  const times: string[] = [];
  // Spec 021 Part C: what each answer says and what each page listed.
  const answers: {
    id: string;
    chatgpt: string;
    google: string;
    listings: { chatgpt: BusinessListing[]; google: BusinessListing[] };
  }[] = [];
  const questions = input.prompts.map((prompt, index) => {
    const row = input.rows.find((item) => item.prompt_id === prompt.prompt_id);
    const observation = input.observations.find(
      (item) => item.prompt_id === prompt.prompt_id,
    );
    const facts = parse<ChatGptFacts>(row?.c_facts_json ?? null);
    const google = parse<GoogleCheck>(row?.g_result_json ?? null);
    const origin = setup.origins?.[index] ?? FALLBACK_ORIGIN;
    const lines = questionOriginLines(prompt.question, origin);
    const answered =
      row?.status === "done" && observation?.run_status === "completed";
    if (answered && observation) times.push(observation.observed_at);
    if (answered && facts)
      for (const name of facts.businesses)
        if (!isOwn(name) && !chatgptBusinesses.includes(name))
          chatgptBusinesses.push(name);
    const googleDone = row?.g_status === "done" && google !== null;
    if (googleDone) times.push(google.observed_at);
    if (googleDone && google.outcome === "summary") {
      googleTexts.push(` ${normalized(google.text)} `);
      for (const name of google.businesses ?? [])
        if (!isOwn(name) && !googleBusinesses.includes(name))
          googleBusinesses.push(name);
    }
    answers.push({
      id: prompt.prompt_id,
      chatgpt: answered && observation ? observation.raw_answer : "",
      google: googleDone && google.outcome === "summary" ? google.text : "",
      listings: {
        chatgpt: answered ? (facts?.listings ?? []) : [],
        google:
          googleDone && google.outcome === "summary"
            ? (google.listings ?? [])
            : [],
      },
    });
    const detail = input.report.details.find(
      (item) => item.prompt_id === prompt.prompt_id,
    );
    const question: TwoSourceQuestion & {
      chatgptSources: { url: string }[];
    } = {
      prompt_id: prompt.prompt_id,
      ordinal: index + 1,
      question: prompt.question,
      label: origin.label,
      label_text: QUESTION_LABEL_TEXT[origin.label],
      topic_line: lines.topic,
      topic: origin.topic ?? origin.originalTopic ?? null,
      volume: lines.topic.includes("pencarian/bulan") ? origin.volume : null,
      data_month: origin.dataMonth,
      chatgpt: answered
        ? {
            outcome: "answered",
            named: facts?.named ?? "absent",
            recommended: detail?.recommendation === "recommended",
          }
        : { outcome: "failed", named: null, recommended: null },
      google: googleDone
        ? {
            outcome: google.outcome,
            text: google.outcome === "summary" ? google.text : "",
            references: google.outcome === "summary" ? google.references : [],
            named: google.outcome === "summary" ? google.named : null,
            observed_at: google.observed_at,
          }
        : {
            outcome: "failed",
            text: "",
            references: [],
            named: null,
            observed_at: null,
          },
      chatgptSources: answered && observation ? observation.sources : [],
    };
    return question;
  });

  const chatgptCompleted = questions.filter(
    (q) => q.chatgpt.outcome === "answered",
  );
  const googleCompleted = questions.filter(
    (q) => q.google.outcome !== "failed",
  );
  const summaries = questions.filter((q) => q.google.outcome === "summary");
  const sorted = [...times].sort();
  const otherBusinesses = {
    chatgpt: chatgptBusinesses.slice(0, 10),
    // N-19: Google's own page names, plus any business ChatGPT named that
    // the AI Overview text also names.
    google: [
      ...googleBusinesses,
      ...chatgptBusinesses.filter(
        (name) =>
          !googleBusinesses.includes(name) &&
          googleTexts.some((text) => text.includes(` ${normalized(name)} `)),
      ),
    ].slice(0, 10),
  };
  return {
    version: TWO_SOURCE_REPORT_VERSION,
    subject: setup.subject,
    order_number: input.orderNumber,
    places: {
      google: setup.google,
      chatgpt: { code: INDONESIA_LOCATION_CODE, name: "Indonesia" },
    },
    checked_from: sorted[0] ?? null,
    checked_to: sorted[sorted.length - 1] ?? null,
    search_data_available: searchDataAvailable(setup),
    questions: questions.map((question) => {
      const { chatgptSources, ...rest } = question;
      void chatgptSources;
      return rest;
    }),
    counts: {
      chatgpt: {
        completed: chatgptCompleted.length,
        named: chatgptCompleted.filter((q) => q.chatgpt.named === "named")
          .length,
        recommended: chatgptCompleted.filter((q) => q.chatgpt.recommended)
          .length,
        failed: 10 - chatgptCompleted.length,
      },
      google: {
        completed: googleCompleted.length,
        summaries: summaries.length,
        named: summaries.filter((q) => q.google.named === "named").length,
        failed: 10 - googleCompleted.length,
      },
      failed: 20 - chatgptCompleted.length - googleCompleted.length,
    },
    google_finding: googleCoverageFinding(
      summaries.length,
      googleCompleted.length,
    ),
    topics_missing: topicsMissing(questions),
    other_businesses: otherBusinesses,
    competitors: competitorFacts({
      answers,
      names: [...otherBusinesses.chatgpt, ...otherBusinesses.google],
      ownNames: setup.names,
      isOwn,
    }),
  };
}

/** The listing with the most to show: a rating, then the most reviews. */
function richest(
  listings: readonly BusinessListing[],
): BusinessListing | undefined {
  return [...listings]
    .filter((listing) => listing.rating)
    .sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0))[0];
}

function details(
  listings: readonly BusinessListing[],
): Pick<CompetitorFact, "website" | "rating" | "reviews"> {
  const rated = richest(listings);
  return {
    website: listings.find((listing) => listing.website)?.website ?? null,
    rating: rated?.rating ?? null,
    reviews: rated?.reviews ?? null,
  };
}

/**
 * Spec 021 C-01/C-02: each other business counted by the answers that name
 * it (once per answer, whole words, longest name first, the owner's names
 * matched too; the rule the report highlights names with), the ChatGPT
 * answers that showed it as a business card while naming it, and what the
 * sources' own pages listed about it. The owner's card count and listing
 * details come only from listings under one of its own names exactly; a
 * branch ("Erha Clinic Surabaya") is neither the owner nor a competitor.
 */
export function competitorFacts(input: {
  answers: readonly {
    id: string;
    chatgpt: string;
    google: string;
    listings: { chatgpt: BusinessListing[]; google: BusinessListing[] };
  }[];
  names: readonly string[];
  ownNames: readonly string[];
  isOwn: (name: string) => boolean;
}): NonNullable<TwoSourceReport["competitors"]> {
  const keyOf = (name: string) =>
    name.trim().replace(/\s+/g, " ").toLowerCase();
  const ownKeys = new Set(input.ownNames.map(keyOf).filter(Boolean));
  const byKey = new Map<string, CompetitorFact>();
  for (const name of input.names) {
    const key = keyOf(name);
    if (key && !byKey.has(key) && !ownKeys.has(key))
      byKey.set(key, {
        name: name.trim(),
        chatgpt: [],
        google: [],
        cards: [],
        website: null,
        rating: null,
        reviews: null,
      });
  }
  const others = [...byKey.values()];
  const listed = new Map<string, BusinessListing[]>();
  const own: BusinessListing[] = [];
  const ownCards: string[] = [];
  for (const answer of input.answers) {
    for (const source of ["chatgpt", "google"] as const) {
      const found = new Set(
        findNames(answer[source], [
          ...input.ownNames,
          ...others.map((fact) => fact.name),
        ]).map((match) => keyOf(match.name)),
      );
      for (const key of found) byKey.get(key)?.[source].push(answer.id);
      for (const listing of answer.listings[source]) {
        const key = keyOf(listing.name);
        // A card counts only in an answer that also names the business.
        const carded = listing.card && found.has(key);
        if (ownKeys.has(key)) {
          own.push(listing);
          if (carded && !ownCards.includes(answer.id)) ownCards.push(answer.id);
          continue;
        }
        if (input.isOwn(listing.name)) continue;
        const fact = byKey.get(key);
        if (!fact) continue;
        listed.set(key, [...(listed.get(key) ?? []), listing]);
        if (carded && !fact.cards.includes(answer.id))
          fact.cards.push(answer.id);
      }
    }
  }
  return {
    others: others.map((fact) => ({
      ...fact,
      ...details(listed.get(keyOf(fact.name)) ?? []),
    })),
    own: { ...details(own), cards: ownCards },
  };
}
