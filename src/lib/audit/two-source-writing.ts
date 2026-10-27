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
import type { AuditObservation, ReportContent } from "./types";

/** Word and character limits of the new writer's fields (B-04). */
export const TWO_SOURCE_WRITING_LIMITS = {
  verdict_characters: 220,
  verdict_sentences: 2,
  conclusion_words: 70,
  finding_title_words: 12,
  finding_words: 70,
  recommendation_title_words: 12,
  recommendation_words: 80,
  reason_words: 20,
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
    ...writing.takeaways.map((text, index): [string, string] => [
      `Takeaway ${index + 1}`,
      text,
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
    ...writing.takeaways.map((text, index): [string, string, number] => [
      `Takeaway ${index + 1}`,
      text,
      limits.takeaway_words,
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

/** Per-question facts a headline count may be taken from. */
function questionFacts(
  id: string,
  content: ReportContent,
  facts: TwoSourceReportFacts & { writer: TwoSourceWriterFacts },
) {
  const detail = content.details.find((item) => item.prompt_id === id);
  const question = facts.writer.questions.find((q) => q.prompt_id === id);
  const google = facts.google.find((item) => item.prompt_id === id);
  const reading = content.two_source_writing?.google_readings.find(
    (item) => item.prompt_id === id,
  );
  const answered = detail?.run === "completed";
  const chatgptNamed =
    question?.named.chatgpt === "named" || detail?.appearance === "mentioned";
  const summary = google?.outcome === "summary";
  const googleNamed = google?.business_named === true;
  return {
    chatgpt_answered: answered,
    chatgpt_named: answered && chatgptNamed,
    chatgpt_not_named: answered && !chatgptNamed,
    chatgpt_cited_only: answered && question?.named.chatgpt === "source_only",
    chatgpt_recommended: answered && detail?.recommendation === "recommended",
    chatgpt_not_recommended:
      answered && detail?.recommendation !== "recommended",
    chatgpt_failed: !answered,
    google_summary: summary,
    google_not_shown: google?.outcome === "not_shown",
    google_named: googleNamed,
    google_not_named: summary && !googleNamed,
    google_cited_only: summary && question?.named.google === "source_only",
    google_recommended: googleNamed && reading?.recommended === true,
    google_failed: google?.outcome === "failed" || google === undefined,
    any_named: (answered && chatgptNamed) || googleNamed,
    none_named: !(answered && chatgptNamed) && !googleNamed,
  };
}

/**
 * B-05: whether code can confirm a finding's headline number:
 * - "X dari Y" over the cited questions (Y their number, X a count of them
 *   by one per-question fact), or over a source's completed checks;
 * - a whole number of distinct cited domains or named other businesses in
 *   the cited answers;
 * - a figure that appears verbatim in a cited answer.
 */
export function headlineConfirmed(
  number: string,
  citedIds: readonly string[],
  content: ReportContent,
  facts: TwoSourceReportFacts & { writer: TwoSourceWriterFacts },
  observations: readonly AuditObservation[],
): boolean {
  const value = number.replace(/\s+/g, " ").trim();
  if (!/\d/.test(value)) return false;
  const ids = [...new Set(citedIds)];
  const pair = /^(\d+) dari (\d+)$/i.exec(value);
  if (pair) {
    const x = Number(pair[1]);
    const y = Number(pair[2]);
    if (y === ids.length) {
      const rows = ids.map((id) => questionFacts(id, content, facts));
      const keys = Object.keys(rows[0] ?? {}) as (keyof (typeof rows)[0])[];
      if (keys.some((k) => rows.filter((row) => row[k]).length === x))
        return true;
    }
    const { chatgpt, google } = facts.counts;
    const recommended = content.details.filter(
      (detail) => detail.recommendation === "recommended",
    ).length;
    const googleRecommended =
      content.two_source_writing?.google_readings.filter((r) => r.recommended)
        .length ?? 0;
    const sourcePairs = [
      [chatgpt.named, chatgpt.completed],
      [chatgpt.completed - chatgpt.named, chatgpt.completed],
      [recommended, chatgpt.completed],
      [chatgpt.completed - recommended, chatgpt.completed],
      [google.named, google.summaries],
      [google.summaries - google.named, google.summaries],
      [googleRecommended, google.summaries],
      [google.summaries, google.completed],
      [google.completed - google.summaries, google.completed],
      [google.named, google.completed],
    ];
    if (sourcePairs.some(([a, b]) => a === x && b === y && b > 0)) return true;
  }
  const cited = ids.map((id) => ({
    observation: observations.find((item) => item.prompt_id === id),
    question: facts.writer.questions.find((q) => q.prompt_id === id),
    google: facts.google.find((item) => item.prompt_id === id),
  }));
  if (/^\d+$/.test(value)) {
    const n = Number(value);
    const chatgptDomains = new Set(
      cited.flatMap(({ observation }) =>
        observation?.run_status === "completed"
          ? observation.sources.flatMap((source) => {
              const domain = urlDomain(source.url);
              return domain ? [domain] : [];
            })
          : [],
      ),
    );
    const googleDomains = new Set(
      cited.flatMap(({ google }) => google?.cited_domains ?? []),
    );
    const chatgptNames = new Set(
      cited.flatMap(({ question }) =>
        (question?.businesses.chatgpt ?? []).map(key),
      ),
    );
    const googleNames = new Set(
      cited.flatMap(({ question }) =>
        (question?.businesses.google ?? []).map(key),
      ),
    );
    const sizes = [
      chatgptDomains.size,
      googleDomains.size,
      new Set([...chatgptDomains, ...googleDomains]).size,
      chatgptNames.size,
      googleNames.size,
      new Set([...chatgptNames, ...googleNames]).size,
    ];
    if (n > 0 && sizes.includes(n)) return true;
  }
  return cited.some(
    ({ observation, question }) =>
      (observation?.run_status === "completed" &&
        observation.raw_answer.includes(value)) ||
      (question?.google_text ?? "").includes(value),
  );
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
    diagnostics.add("banned_title_repaired");
    return withoutLabels(text);
  };

  const key_findings = content.key_findings.map((finding) => {
    const next = {
      ...finding,
      title: title(finding.title),
      explanation: prose(finding.explanation),
    };
    if (
      finding.headline &&
      !headlineConfirmed(
        finding.headline.number,
        finding.evidence_prompt_ids,
        content,
        facts,
        observations,
      )
    ) {
      diagnostics.add("headline_dropped");
      const { headline, ...rest } = next;
      void headline;
      return rest;
    }
    return next;
  });

  // The new observed-gap rule; when no question shows a gap, any cited
  // question passes, so a valid report never fails it.
  const gaps = gapIds(content, facts);
  const priorities = content.priorities
    .filter((priority) => {
      const ok =
        gaps.size === 0 ||
        priority.evidence_prompt_ids.some((id) => gaps.has(id));
      if (!ok) diagnostics.add("unsupported_priority_removed");
      return ok;
    })
    .map((priority, index) => ({
      ...priority,
      order: index + 1,
      action: title(priority.action),
      why: prose(priority.why),
    }));

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
          .map((text) => prose(text.trim()))
          .filter(Boolean),
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
