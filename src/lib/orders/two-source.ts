/**
 * Spec 018: the server side of a two-source order. An order approved with a
 * search place asks every question to the ChatGPT app and to Google (R-12),
 * delivers a report when each source completed at least 5 of its 10 checks
 * (R-19), and saves a code-built block beside the model-written report.
 */
import { failedChatGptObservation, type ChatGptFacts } from "../checks/chatgpt";
import type { GoogleCheck } from "../checks/google";
import { visibleAnswerText } from "../checks/named";
import {
  subjectAliases,
  subjectBrandName,
  type DirectTenAuditContext,
} from "../audit/direct-ten-context-v2";
import {
  googleCoverageFinding,
  topicsMissing,
  TWO_SOURCE_REPORT_VERSION,
  type TwoSourceQuestion,
  type TwoSourceReport,
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
  google: { code: number; name: string };
  /** The business name and confirmed aliases (R-16). */
  names: string[];
  origins: QuestionOrigin[] | null;
};

type Intake = {
  context: DirectTenAuditContext;
  prompts: AuditPrompt[];
  checks?: unknown;
  question_origins?: unknown;
};

/** The two-source setup of an approved intake, or null for a one-source order
 * (approved before Spec 018). */
export function twoSourceSetup(intake: Intake): TwoSourceSetup | null {
  if (intake.checks !== TWO_SOURCE_CHECKS) return null;
  const place = contextSearchPlace(intake.context) ?? INDONESIA_SEARCH_PLACE;
  return {
    place,
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
  };
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

function normalized(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim();
}

function namedIn(text: string, name: string): boolean {
  const needle = normalized(name);
  return (
    needle.length > 0 &&
    ` ${normalized(visibleAnswerText(text))} `.includes(` ${needle} `)
  );
}

/** The code-built block saved with a two-source report. */
export function buildTwoSourceReport(input: {
  report: AuditReport;
  rows: readonly OrderQuestionRow[];
  prompts: readonly AuditPrompt[];
  observations: readonly AuditObservation[];
  setup: TwoSourceSetup;
  orderNumber: string | null;
}): TwoSourceReport {
  const { setup } = input;
  const ownNames = new Set(setup.names.map(normalized));
  const chatgptBusinesses: string[] = [];
  const times: string[] = [];
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
        if (
          !ownNames.has(normalized(name)) &&
          !chatgptBusinesses.includes(name)
        )
          chatgptBusinesses.push(name);
    const googleDone = row?.g_status === "done" && google !== null;
    if (googleDone) times.push(google.observed_at);
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
  const googleText = summaries.map((q) => q.google.text).join("\n");
  return {
    version: TWO_SOURCE_REPORT_VERSION,
    order_number: input.orderNumber,
    places: {
      google: setup.google,
      chatgpt: { code: INDONESIA_LOCATION_CODE, name: "Indonesia" },
    },
    checked_from: sorted[0] ?? null,
    checked_to: sorted[sorted.length - 1] ?? null,
    search_data_available: setup.origins
      ? setup.origins.some((origin) => origin.label !== "disusun_dari_profil")
      : false,
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
    other_businesses: {
      chatgpt: chatgptBusinesses.slice(0, 10),
      google: chatgptBusinesses
        .filter((name) => namedIn(googleText, name))
        .slice(0, 10),
    },
  };
}
