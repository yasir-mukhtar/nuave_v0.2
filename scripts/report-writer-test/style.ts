/**
 * Spec 023 R-14: the report-writing-quality test's before/after pairs and
 * metrics. Pure helpers; style.spec.ts runs the writers and writes files.
 *
 * Each order and run has two reports, the writer before Spec 023 and the
 * writer after it. The founder reads them as "Pasangan <run> - 1" and "- 2"
 * in random order; the key and the metrics (which name before and after) are
 * kept apart until scoring is done.
 */
import { randomInt } from "node:crypto";
import { sentences } from "../../src/lib/audit/two-source-report";
import type { AuditReport } from "../../src/lib/audit/types";
import { blindReport, costUsd } from "./harness";

/** Spec 023's round stops here, in its own fresh ledger (founder,
 * 2026-10-28, D-6 and Q-4). Test B's own ledger keeps HARD_STOP_USD. */
export const STYLE_HARD_STOP_USD = 10;

/** Production's Claude writer allowance (CLAUDE_WRITERS in models.ts). */
export const STYLE_OUTPUT_TOKENS = 24_000;

/** A revision's prompt also carries the first draft: counted at this many
 * characters on top of the first prompt, more than a report draft holds. */
export const STYLE_DRAFT_CHARS = 40_000;

/** One report's worst case before it is sent: the report and its one
 * language revision, at production's output allowance whatever the run's
 * own setting, every prompt character counted as a token. */
export function styleWorstCaseUsd(model: string, promptChars: number) {
  return (
    costUsd(model, promptChars, STYLE_OUTPUT_TOKENS) +
    costUsd(model, promptChars + STYLE_DRAFT_CHARS, STYLE_OUTPUT_TOKENS)
  );
}

export type StyleLabel = "before" | "after";

/** One pair's key: which number is the after writer's report, and the two
 * writers it was drawn for (a pair is redrawn when either changes). */
export type StylePairKey = {
  after: "1" | "2";
  writers: { before: string; after: string };
};

/** The pair's numbers, drawn once and kept while both writers stay. */
export function drawStylePair(
  writers: StylePairKey["writers"],
  previous: StylePairKey | undefined,
  pick: (n: number) => number = (n) => randomInt(n),
): StylePairKey {
  if (
    previous &&
    previous.writers.before === writers.before &&
    previous.writers.after === writers.after
  )
    return previous;
  return { after: pick(2) === 0 ? "1" : "2", writers };
}

/** The report as the founder reads it: the harness's blinding, plus what
 * would tell the writers apart (Spec 023 changes the prompt version, the
 * before writer's revision names the 25-word rule, and the guide makes the
 * after writer's input longer). */
export function blindStyleReport(
  report: AuditReport,
  deliveredAt: string,
): AuditReport {
  const blind = blindReport(report, deliveredAt);
  return {
    ...blind,
    provenance: {
      ...blind.provenance,
      report_prompt_version: "hidden",
      report_call_count: 1,
      language_retry_performed: false,
      language_retry_violations: [],
    },
    operational_telemetry: {
      ...blind.operational_telemetry,
      carryover_cost_usd: 0,
      call_count: 0,
      failed_call_count: 0,
      latency_ms: 0,
      input_tokens: 0,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 0,
      reasoning_output_tokens: 0,
      total_tokens: 0,
      web_search_calls: 0,
      accounted_cost_usd: 0,
      calls: [],
    },
  };
}

/** The guide's examples (its "Contoh" part), the only text a report must
 * not copy from (R-14). Empty when the guide has none. */
export function guideExamples(guide: string): string {
  const lines = guide.split("\n");
  const start = lines.findIndex((line) => /^#{2,3}\s.*contoh/i.test(line));
  if (start < 0) return "";
  const level = lines[start]!.match(/^#+/)![0].length;
  const end = lines.findIndex(
    (line, i) =>
      i > start && /^#+\s/.test(line) && line.match(/^#+/)![0].length <= level,
  );
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n");
}

/** Phrases that read as machine-translated Indonesian (Spec 023 R-14):
 * counted, never removed. */
export const TYPICAL_PHRASES = [
  "hal ini menunjukkan",
  "perlu dicatat",
  "selain itu",
  "secara signifikan",
  "signifikan",
  "memastikan",
  "komprehensif",
  "holistik",
  "krusial",
  "lanskap",
  "memanfaatkan",
  "melakukan optimalisasi",
  "bukan hanya",
  "tidak hanya",
  "secara keseluruhan",
  "dapat disimpulkan",
] as const;

/** Words that may claim a cause, a guarantee or the sample as the market
 * (Spec 023 R-09): counted for the safety review, never removed. */
export const CAUSE_MARKERS = [
  "karena",
  "dipilih",
  "lebih percaya",
  "dijamin",
  "pasti",
  "paling dicari",
] as const;

const WORD = /[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu;
const words = (text: string) => text.match(WORD) ?? [];

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word, case-insensitive occurrences of any of the phrases, the
 * longest tried first, so a name and an alias inside it count once. */
function occurrences(text: string, ...phrases: string[]): number {
  const list = phrases
    .map((phrase) => phrase.trim())
    .filter((phrase) => phrase.length > 1)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  if (!list.length) return 0;
  return (
    text.match(
      new RegExp(
        `(?<![\\p{L}\\p{N}])(?:${list.join("|")})(?![\\p{L}\\p{N}])`,
        "giu",
      ),
    )?.length ?? 0
  );
}

/** Sentences ended by . ! or ? only: the shared splitter also splits at
 * ";", which would turn "Di ChatGPT …; di Google …" into two. */
function fullSentences(text: string): string[] {
  const out: string[] = [];
  for (const part of sentences(text)) {
    if (out.length && out[out.length - 1]!.endsWith(";"))
      out[out.length - 1] = `${out[out.length - 1]} ${part}`;
    else out.push(part);
  }
  return out;
}

/** The writer's own prose (code-built blocks are left out): its paragraphs
 * and its titles, by part. */
export function writerProse(report: AuditReport) {
  const writing = report.two_source_writing;
  return {
    verdict: writing?.verdict ?? "",
    conclusion: report.conclusion,
    findings: report.key_findings.map((f) => f.explanation),
    paragraphs: [
      ...report.priorities.map((p) => p.why),
      ...(writing?.competitor_reasons.map((r) => r.reason) ?? []),
      ...(writing?.takeaways.map((t) => t.text) ?? []),
      ...(writing?.plan.map((s) => s.text) ?? []),
    ],
    titles: [
      ...report.key_findings.map((f) => f.title),
      ...report.priorities.map((p) => p.action),
      ...(writing?.takeaways.map((t) => t.title) ?? []),
      ...(writing?.plan.map((s) => s.title) ?? []),
    ],
  };
}

export type StyleMetrics = {
  sentences: number;
  mean_sentence_words: number;
  sentence_words_spread: number;
  share_over_30_words: number;
  typical_phrases: Record<string, number>;
  dashes: number;
  brand_name: number;
  klinik_ini: number;
  klinik_or_bisnis_anda: number;
  anda: number;
  repeated_counts: string[];
  cause_markers: Record<string, number>;
  example_overlaps: string[];
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * The metrics of one report's writing (Spec 023 R-14 and AC-12).
 * - `names`: the owner's confirmed name and aliases.
 * - `examples`: the guide's examples (`guideExamples`), whose six-word runs
 *   must not reappear in a report.
 * - `businesses`: the other businesses the answers name; a dash inside a
 *   business name is not counted.
 * Sentence lengths are measured on paragraphs only, not titles.
 */
export function styleMetrics(
  report: AuditReport,
  names: readonly string[],
  examples = "",
  businesses: readonly string[] = [],
): StyleMetrics {
  const prose = writerProse(report);
  const paragraphs = [
    prose.verdict,
    prose.conclusion,
    ...prose.findings,
    ...prose.paragraphs,
  ].filter((text) => text.trim());
  const text = [...paragraphs, ...prose.titles].join("\n");
  const lengths = paragraphs
    .flatMap((field) => fullSentences(field))
    .map((sentence) => words(sentence).length)
    .filter((count) => count > 0);
  const mean = lengths.length
    ? lengths.reduce((sum, n) => sum + n, 0) / lengths.length
    : 0;
  const spread = lengths.length
    ? Math.sqrt(
        lengths.reduce((sum, n) => sum + (n - mean) ** 2, 0) / lengths.length,
      )
    : 0;
  const count = (list: readonly string[]) =>
    Object.fromEntries(
      list
        .map((phrase) => [phrase, occurrences(text, phrase)] as const)
        .filter(([, n]) => n > 0),
    );
  // A count ("3 dari 10") said more than once in the verdict, the
  // conclusion and the findings, within one part or across them.
  const said = [prose.verdict, prose.conclusion, ...prose.findings]
    .join("\n")
    .match(/\b\d+\s+dari\s+\d+\b/gi)
    ?.map((pair) => pair.replace(/\s+/g, " ").toLowerCase());
  const repeated = [...new Set(said ?? [])].filter(
    (pair) => said!.filter((other) => other === pair).length > 1,
  );
  // Six-word runs shared with the guide's examples.
  const run = (list: string[]) =>
    list
      .slice(0, Math.max(0, list.length - 5))
      .map((_, i) => list.slice(i, i + 6).join(" "));
  const exampleRuns = new Set(run(words(examples.toLowerCase())));
  const overlaps = [
    ...new Set(
      run(words(text.toLowerCase())).filter((r) => exampleRuns.has(r)),
    ),
  ];
  // Dashes, leaving out the ones inside a business name.
  const unnamed = [...names, ...businesses]
    .filter((name) => /\s[–-]\s/.test(name))
    .reduce((rest, name) => rest.split(name).join(" "), text);
  return {
    sentences: lengths.length,
    mean_sentence_words: round2(mean),
    sentence_words_spread: round2(spread),
    share_over_30_words: lengths.length
      ? round2(lengths.filter((n) => n > 30).length / lengths.length)
      : 0,
    typical_phrases: count(TYPICAL_PHRASES),
    dashes:
      (unnamed.match(/—/g)?.length ?? 0) +
      (unnamed.match(/\s[–-]\s/g)?.length ?? 0),
    brand_name: occurrences(text, ...names),
    klinik_ini: occurrences(text, "klinik ini"),
    klinik_or_bisnis_anda: occurrences(text, "klinik Anda", "bisnis Anda"),
    anda: occurrences(text, "Anda"),
    repeated_counts: repeated,
    cause_markers: count(CAUSE_MARKERS),
    example_overlaps: overlaps,
  };
}
