/**
 * Spec 021 Part B: the new two-source writer's output, checked by code
 * (B-05, B-06). Facts are never invented here: a check either asks the
 * writer's one revision to fix its words, or, past it, removes what cannot be
 * confirmed. This module has no server imports, so the report page can use it.
 */
import {
  sentences,
  urlDomain,
  type TwoSourceReportFacts,
  type TwoSourceWriterFacts,
} from "./two-source-report";
import {
  HEADLINE_CAPTION_MAX,
  HEADLINE_NUMBER_MAX,
  reportContentSchema,
  type AuditObservation,
  type HeadlineBasis,
  type ReportContent,
} from "./types";

/** Word and character limits of the new writer's fields (B-04). */
export const TWO_SOURCE_WRITING_LIMITS = {
  verdict_characters: 220,
  verdict_sentences: 2,
  conclusion_words: 70,
  finding_title_words: 12,
  finding_words: 80,
  recommendation_title_words: 14,
  recommendation_words: 100,
  reason_words: 20,
  takeaway_title_words: 10,
  takeaway_words: 30,
  plan_words: 35,
  topic_words: 6,
} as const;

/** B-06: a title never starts with these words. */
export const BANNED_TITLE_STARTS = [
  "Periksa",
  "Pertahankan",
  "Pertimbangkan",
  "Pastikan",
] as const;

const BANNED_START = new RegExp(
  `^\\s*(?:${BANNED_TITLE_STARTS.join("|")})(?![\\p{L}\\p{N}])`,
  "iu",
);
/** B-06: "Mengapa:" / "Berdasarkan:" written as a label. */
const LABEL = /(?:^|\n)\s*(?:Mengapa|Berdasarkan)\s*:/i;

const limits = TWO_SOURCE_WRITING_LIMITS;

function words(text: string): number {
  return text.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

/** Spec 021 Part B: the new writer's own text fields, labelled. */
export function twoSourceWritingFields(
  content: Pick<ReportContent, "key_findings" | "two_source_writing">,
): [string, string][] {
  const writing = content.two_source_writing;
  if (!writing) return [];
  return [
    ["Verdict", writing.verdict],
    ...content.key_findings.flatMap((finding, index): [string, string][] =>
      finding.headline
        ? [[`Finding ${index + 1} headline caption`, finding.headline.caption]]
        : [],
    ),
    ...writing.competitor_reasons.map((item, index): [string, string] => [
      `Reason ${index + 1}`,
      item.reason,
    ]),
    ...writing.takeaways.flatMap((item, index): [string, string][] => [
      [`Takeaway ${index + 1} title`, item.title],
      [`Takeaway ${index + 1} text`, item.text],
    ]),
    ...writing.plan.flatMap((step, index): [string, string][] => [
      [`Plan step ${index + 1} title`, step.title],
      [`Plan step ${index + 1} text`, step.text],
    ]),
    ...writing.topic_names.map((item, index): [string, string] => [
      `Topic name ${index + 1}`,
      item.topic,
    ]),
  ];
}

export const VERDICT_MAX = limits.verdict_characters;

/** Sentences, with a ";" clause kept joined to what follows. */
function verdictParts(text: string): string[] {
  return sentences(text.trim()).reduce<string[]>((out, part) => {
    const last = out.at(-1);
    if (last?.endsWith(";")) out[out.length - 1] = `${last} ${part}`;
    else out.push(part);
    return out;
  }, []);
}

/** Whole sentences up to `VERDICT_MAX` characters; a first sentence longer
 * than that is cut at the last word with "…". */
function cutSentences(parts: readonly string[]): string {
  if (!parts.length) return "";
  let verdict = "";
  for (const part of parts) {
    const next = verdict ? `${verdict} ${part}` : part;
    if (next.length > VERDICT_MAX) break;
    verdict = next;
  }
  if (verdict) return verdict;
  const first = parts[0]!;
  const cut = first.slice(0, VERDICT_MAX - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[,;:]$/, "")}…`;
}

/**
 * Spec 021: the verdict for a report written before Part B is the saved
 * conclusion's first sentences up to 220 characters, cut at a sentence end.
 * A first sentence longer than that is cut at the last word with "…".
 */
export function verdictFromConclusion(conclusion: string): string {
  return cutSentences(verdictParts(conclusion));
}

/** B-04: the writer's verdict, at most two sentences and 220 characters. */
export function cutVerdict(verdict: string): string {
  return cutSentences(verdictParts(verdict).slice(0, limits.verdict_sentences));
}

/**
 * B-04, B-06: what the one revision call is asked to fix in the new
 * writer's own words. Counts are checked by `twoSourceWritingViolations`
 * in two-source-report.ts, which reads the verdict and takeaways too.
 */
export function partBWritingViolations(content: ReportContent): string[] {
  const writing = content.two_source_writing;
  if (!writing) return [];
  const out: string[] = [];
  const verdictSentences = verdictParts(writing.verdict).length;
  if (!writing.verdict.trim()) out.push("The verdict is empty.");
  if (
    writing.verdict.length > limits.verdict_characters ||
    verdictSentences > limits.verdict_sentences
  )
    out.push(
      `The verdict must be at most ${limits.verdict_sentences} sentences and ${limits.verdict_characters} characters; it has ${verdictSentences} sentences and ${writing.verdict.length} characters.`,
    );
  const titled: [string, string][] = [
    ...content.key_findings.map((finding, index): [string, string] => [
      `Finding ${index + 1} title`,
      finding.title,
    ]),
    ...content.priorities.map((priority, index): [string, string] => [
      `Recommendation ${index + 1} title`,
      priority.action,
    ]),
    ...writing.plan.map((step, index): [string, string] => [
      `Plan step ${index + 1} title`,
      step.title,
    ]),
  ];
  for (const [label, title] of titled)
    if (BANNED_START.test(title))
      out.push(
        `${label} starts with a word reports never start a title with (${BANNED_TITLE_STARTS.join(", ")}): "${title}". Start with a firm verb or the finding itself.`,
      );
  const texts: [string, string, number][] = [
    ["The conclusion", content.conclusion, limits.conclusion_words],
    ...content.key_findings.flatMap((finding, index) => [
      [
        `Finding ${index + 1} title`,
        finding.title,
        limits.finding_title_words,
      ] as [string, string, number],
      [
        `Finding ${index + 1} paragraph`,
        finding.explanation,
        limits.finding_words,
      ] as [string, string, number],
    ]),
    ...content.priorities.flatMap((priority, index) => [
      [
        `Recommendation ${index + 1} title`,
        priority.action,
        limits.recommendation_title_words,
      ] as [string, string, number],
      [
        `Recommendation ${index + 1} paragraph`,
        priority.why,
        limits.recommendation_words,
      ] as [string, string, number],
    ]),
    ...writing.competitor_reasons.map((item): [string, string, number] => [
      `The reason for ${item.name}`,
      item.reason,
      limits.reason_words,
    ]),
    ...writing.takeaways.flatMap((item, index): [string, string, number][] => [
      [`Takeaway ${index + 1} title`, item.title, limits.takeaway_title_words],
      [`Takeaway ${index + 1} text`, item.text, limits.takeaway_words],
    ]),
    ...writing.plan.map((step, index): [string, string, number] => [
      `Plan step ${index + 1} text`,
      step.text,
      limits.plan_words,
    ]),
  ];
  for (const [label, text, limit] of texts) {
    const count = words(text);
    if (count > limit)
      out.push(`${label} has ${count} words; the limit is ${limit}.`);
    if (LABEL.test(text))
      out.push(
        `${label} uses a "Mengapa:" or "Berdasarkan:" label; write it as plain prose.`,
      );
  }
  return out;
}

/** A title with a banned first word removed: "Pastikan profil lengkap" →
 * "Profil lengkap". */
function withoutBannedStart(title: string): string {
  const rest = title.replace(BANNED_START, "").replace(/^[\s,:;-]+/, "");
  if (!rest) return title;
  return `${rest.charAt(0).toLocaleUpperCase("id-ID")}${rest.slice(1)}`;
}

function withoutLabels(text: string): string {
  return text.replace(/(^|\n)\s*(?:Mengapa|Berdasarkan)\s*:\s*/gi, "$1").trim();
}

function key(name: string): string {
  return name.replace(/\s+/g, " ").trim().toLocaleLowerCase("id-ID");
}

/** The per-question facts a headline may count, one per question basis. */
function questionFacts(
  id: string,
  content: ReportContent,
  facts: TwoSourceReportFacts & { writer: TwoSourceWriterFacts },
): Record<QuestionBasis, boolean> {
  const detail = content.details.find((item) => item.prompt_id === id);
  const question = facts.writer.questions.find((q) => q.prompt_id === id);
  const google = facts.google.find((item) => item.prompt_id === id);
  const reading = content.two_source_writing?.google_readings.find(
    (item) => item.prompt_id === id,
  );
  const answered = detail?.run === "completed";
  const chatgptNamed =
    answered &&
    (question?.named.chatgpt === "named" || detail?.appearance === "mentioned");
  const summary = google?.outcome === "summary";
  const googleNamed = google?.business_named === true;
  return {
    chatgpt_named: chatgptNamed,
    chatgpt_not_named: answered && !chatgptNamed,
    chatgpt_cited_only: answered && question?.named.chatgpt === "source_only",
    chatgpt_recommended: answered && detail?.recommendation === "recommended",
    chatgpt_not_recommended:
      answered && detail?.recommendation !== "recommended",
    google_shown: summary,
    google_not_shown: google?.outcome === "not_shown",
    google_named: googleNamed,
    google_not_named: summary && !googleNamed,
    google_cited_only: summary && question?.named.google === "source_only",
    google_recommended: googleNamed && reading?.recommended === true,
    named_by_either: chatgptNamed || googleNamed,
    named_by_neither: (answered || summary) && !chatgptNamed && !googleNamed,
  };
}

const QUESTION_BASES = [
  "chatgpt_named",
  "chatgpt_not_named",
  "chatgpt_cited_only",
  "chatgpt_recommended",
  "chatgpt_not_recommended",
  "google_shown",
  "google_not_shown",
  "google_named",
  "google_not_named",
  "google_cited_only",
  "google_recommended",
  "named_by_either",
  "named_by_neither",
] as const satisfies readonly HeadlineBasis[];
type QuestionBasis = (typeof QUESTION_BASES)[number];
const isQuestionBasis = (basis: HeadlineBasis): basis is QuestionBasis =>
  (QUESTION_BASES as readonly string[]).includes(basis);

/** The source-wide denominator for a basis: ChatGPT's completed answers,
 * Google's completed checks, or Google's summaries. */
function sourceDenominator(
  basis: QuestionBasis,
  facts: TwoSourceReportFacts,
): number | null {
  const { chatgpt, google } = facts.counts;
  if (basis.startsWith("chatgpt_")) return chatgpt.completed;
  if (basis === "google_shown" || basis === "google_not_shown")
    return google.completed;
  if (basis.startsWith("google_")) return google.summaries;
  return null;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A figure as a whole token of the text: "75+" in "75+ cabang", but never
 * "2" or "000" inside "Rp 250.000". */
function hasToken(text: string, figure: string): boolean {
  return new RegExp(
    `(?<![\\p{L}\\p{N}]|\\p{N}[.,])${escapeRegExp(figure)}(?![\\p{L}\\p{N}]|[.,]\\p{N})`,
    "u",
  ).test(text);
}

/**
 * B-05: whether code can confirm a finding's headline number by the basis
 * the writer named for it; any other count is not checked:
 * - a per-question fact: "X dari Y" where Y is the number of cited
 *   questions and X those with the fact, or Y the source's completed count
 *   and X all questions with it; "N" or "N×" for the cited questions with it;
 * - domains or businesses: "N", the distinct ones in the cited answers;
 * - `verbatim`: the figure is a whole token of a cited answer; two of them
 *   may be set side by side ("70 vs 75+").
 */
export function headlineConfirmed(
  headline: { number: string; basis: HeadlineBasis },
  citedIds: readonly string[],
  content: ReportContent,
  facts: TwoSourceReportFacts & { writer: TwoSourceWriterFacts },
  observations: readonly AuditObservation[],
): boolean {
  const value = headline.number.replace(/\s+/g, " ").trim();
  const { basis } = headline;
  if (!/\d/.test(value)) return false;
  const ids = [...new Set(citedIds)];
  const cited = ids.map((id) => ({
    observation: observations.find((item) => item.prompt_id === id),
    question: facts.writer.questions.find((q) => q.prompt_id === id),
    google: facts.google.find((item) => item.prompt_id === id),
  }));

  if (basis === "verbatim") {
    const texts = [
      ...cited.flatMap(({ observation, question }) => [
        observation?.run_status === "completed" ? observation.raw_answer : "",
        question?.google_text ?? "",
      ]),
      // The reading test: the business's own pages, and the pages the cited
      // questions' answers cited.
      ...(facts.writer.pages ?? [])
        .filter(
          (page) =>
            page.kind === "own" || page.cited_in.some((id) => ids.includes(id)),
        )
        .map((page) => page.text),
    ];
    return value
      .split(/\s+vs\.?\s+/i)
      .every(
        (side) => /\d/.test(side) && texts.some((text) => hasToken(text, side)),
      );
  }

  const whole = /^(\d+)\s*×?$/.exec(value);
  if (isQuestionBasis(basis)) {
    const cites = ids.filter(
      (id) => questionFacts(id, content, facts)[basis],
    ).length;
    const pair = /^(\d+) dari (\d+)$/i.exec(value);
    if (pair) {
      const x = Number(pair[1]);
      const y = Number(pair[2]);
      if (y === ids.length && x === cites) return true;
      const all = content.details.filter(
        (detail) => questionFacts(detail.prompt_id, content, facts)[basis],
      ).length;
      return y > 0 && y === sourceDenominator(basis, facts) && x === all;
    }
    return whole !== null && Number(whole[1]) > 0 && Number(whole[1]) === cites;
  }

  if (!whole) return false;
  const domains = (source: "chatgpt" | "google") =>
    new Set(
      cited.flatMap(({ observation, google }) =>
        source === "chatgpt"
          ? observation?.run_status === "completed"
            ? observation.sources.flatMap((item) => {
                const domain = urlDomain(item.url);
                return domain ? [domain] : [];
              })
            : []
          : (google?.cited_domains ?? []),
      ),
    );
  const businesses = (source: "chatgpt" | "google") =>
    new Set(
      cited.flatMap(({ question }) =>
        (question?.businesses[source] ?? []).map(key),
      ),
    );
  const n = Number(whole[1]);
  const size = {
    chatgpt_cited_domains: () => domains("chatgpt").size,
    google_cited_domains: () => domains("google").size,
    cited_domains: () =>
      new Set([...domains("chatgpt"), ...domains("google")]).size,
    chatgpt_named_businesses: () => businesses("chatgpt").size,
    google_named_businesses: () => businesses("google").size,
    named_businesses: () =>
      new Set([...businesses("chatgpt"), ...businesses("google")]).size,
  }[basis];
  return n > 0 && size() === n;
}

/** A negation in a caption: "tidak", "belum", "tanpa"… */
const NEGATION =
  /(?:^|[^\p{L}])(?:tidak|tak|belum|bukan|tanpa|absen)(?![\p{L}])/iu;

/**
 * A caption must say what its basis counts: a "not" basis (not named, not
 * recommended, not shown, named by neither) needs a negation; any other
 * per-question basis may not have one ("2 dari 2" counted as not named but
 * captioned "menyebut Klinik Anda" is dropped). Cited-only captions may say
 * "tanpa menyebut nama", so they are not checked.
 */
export function captionFitsBasis(headline: {
  caption: string;
  basis: HeadlineBasis;
}): boolean {
  const { basis, caption } = headline;
  if (!isQuestionBasis(basis) || basis.endsWith("_cited_only")) return true;
  const negative = basis.includes("_not_") || basis === "named_by_neither";
  return NEGATION.test(caption) === negative;
}

/** The report as it may be saved: the page refuses one that fails the
 * saved schema, so the new block (and its headlines) goes rather than the
 * whole report. */
export function saveableTwoSourceWriting(content: ReportContent): {
  content: ReportContent;
  dropped: boolean;
} {
  if (reportContentSchema.safeParse(content).success)
    return { content, dropped: false };
  const { two_source_writing, ...rest } = content;
  void two_source_writing;
  return {
    content: {
      ...rest,
      key_findings: rest.key_findings.map(({ headline, ...finding }) => {
        void headline;
        return finding;
      }),
    },
    dropped: true,
  };
}

/** Questions where the business was absent, cited without its name, or not
 * recommended, in either source (the new observed-gap rule). */
function gapIds(
  content: ReportContent,
  facts: TwoSourceReportFacts & { writer: TwoSourceWriterFacts },
): Set<string> {
  return new Set(
    content.details
      .map((detail) => detail.prompt_id)
      .filter((id) => {
        const q = questionFacts(id, content, facts);
        return (
          q.chatgpt_not_named ||
          q.chatgpt_not_recommended ||
          q.google_not_named ||
          (q.google_named && !q.google_recommended)
        );
      }),
  );
}

export type PartBRepair = {
  content: ReportContent;
  diagnostics: (
    | "headline_dropped"
    | "banned_title_repaired"
    | "writing_label_removed"
    | "writing_item_dropped"
    | "verdict_cut"
    | "unsupported_priority_removed"
  )[];
};

/**
 * B-04 to B-06, after the writer's one revision: code removes what it
 * cannot confirm and fixes what the revision left. The report is never
 * failed here (Spec 018 B-4).
 */
export function finishTwoSourceWriting(
  content: ReportContent,
  facts: TwoSourceReportFacts & { writer: TwoSourceWriterFacts },
  observations: readonly AuditObservation[],
): PartBRepair {
  const writing = content.two_source_writing;
  if (!writing) return { content, diagnostics: [] };
  const diagnostics = new Set<PartBRepair["diagnostics"][number]>();
  const title = (text: string) => {
    if (!BANNED_START.test(text)) return text;
    diagnostics.add("banned_title_repaired");
    return withoutBannedStart(text);
  };
  const prose = (text: string) => {
    if (!LABEL.test(text)) return text;
    diagnostics.add("writing_label_removed");
    return withoutLabels(text);
  };

  const key_findings = content.key_findings.map((finding) => {
    const next = {
      ...finding,
      title: title(finding.title),
      explanation: prose(finding.explanation),
    };
    const headline = finding.headline && {
      ...finding.headline,
      number: finding.headline.number.trim(),
      caption: finding.headline.caption.trim(),
    };
    if (
      headline &&
      // The saved schema's bounds: a headline outside them would make the
      // page refuse the report.
      (!headline.number ||
        headline.number.length > HEADLINE_NUMBER_MAX ||
        !headline.caption ||
        headline.caption.length > HEADLINE_CAPTION_MAX ||
        !captionFitsBasis(headline) ||
        !headlineConfirmed(
          headline,
          finding.evidence_prompt_ids,
          content,
          facts,
          observations,
        ))
    ) {
      diagnostics.add("headline_dropped");
      const { headline: dropped, ...rest } = next;
      void dropped;
      return rest;
    }
    return headline ? { ...next, headline } : next;
  });

  // The new observed-gap rule; when no question shows a gap, any cited
  // question passes, so a valid report never fails it.
  const gaps = gapIds(content, facts);
  const supported = content.priorities.filter(
    (priority) =>
      gaps.size === 0 ||
      priority.evidence_prompt_ids.some((id) => gaps.has(id)),
  );
  if (supported.length && supported.length < content.priorities.length)
    diagnostics.add("unsupported_priority_removed");
  // The writer's list stays whole rather than empty: an empty list would
  // bring back the old code-written action or fail the paid order.
  const priorities = (supported.length ? supported : content.priorities).map(
    (priority, index) => ({
      ...priority,
      order: index + 1,
      action: title(priority.action),
      why: prose(priority.why),
    }),
  );

  const questions = new Map(
    facts.writer.questions.map((q) => [q.prompt_id, q]),
  );
  const prompts = new Map(
    observations.map((o) => [o.prompt_id, o.question.trim()]),
  );
  const seenTopics = new Set<string>();
  const topic_names = writing.topic_names.flatMap((item) => {
    const topic = item.topic.replace(/\s+/g, " ").trim();
    const question = questions.get(item.prompt_id);
    const ok =
      question !== undefined &&
      question.topic === null &&
      !seenTopics.has(item.prompt_id) &&
      topic.length > 0 &&
      words(topic) <= limits.topic_words &&
      key(topic) !== key(prompts.get(item.prompt_id) ?? "");
    if (!ok) {
      diagnostics.add("writing_item_dropped");
      return [];
    }
    seenTopics.add(item.prompt_id);
    return [{ prompt_id: item.prompt_id, topic }];
  });

  const listed = new Map(
    facts.writer.businesses.map((name) => [key(name), name]),
  );
  const seenNames = new Set<string>();
  const competitor_reasons = writing.competitor_reasons.flatMap((item) => {
    const name = listed.get(key(item.name));
    const reason = prose(item.reason.trim());
    if (!name || seenNames.has(name) || !reason) {
      diagnostics.add("writing_item_dropped");
      return [];
    }
    seenNames.add(name);
    return [{ name, reason }];
  });

  const named = new Set(
    facts.google
      .filter((item) => item.business_named === true)
      .map((item) => item.prompt_id),
  );
  const seenReadings = new Set<string>();
  const google_readings = writing.google_readings.filter((item) => {
    const ok = named.has(item.prompt_id) && !seenReadings.has(item.prompt_id);
    if (!ok) diagnostics.add("writing_item_dropped");
    seenReadings.add(item.prompt_id);
    return ok;
  });

  let verdict = writing.verdict.trim();
  const cut = cutVerdict(verdict);
  if (cut !== verdict) {
    diagnostics.add("verdict_cut");
    verdict = cut;
  }

  return {
    content: {
      ...content,
      key_findings,
      priorities,
      two_source_writing: {
        ...writing,
        verdict,
        competitor_reasons,
        takeaways: writing.takeaways
          .map((item) => ({
            title: title(item.title.trim()),
            text: prose(item.text.trim()),
          }))
          .filter((item) => item.title && item.text),
        plan: writing.plan.map((step) => ({
          ...step,
          title: title(step.title),
          text: prose(step.text),
        })),
        topic_names,
        google_readings,
      },
    },
    diagnostics: [...diagnostics],
  };
}
