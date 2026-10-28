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
import { blindReport } from "./harness";

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

/** The report as the founder reads it: the harness's blinding, plus the
 * prompt version (Spec 023 R-12 changes it, so it would tell the writers
 * apart). */
export function blindStyleReport(
  report: AuditReport,
  deliveredAt: string,
): AuditReport {
  const blind = blindReport(report, deliveredAt);
  return {
    ...blind,
    provenance: { ...blind.provenance, report_prompt_version: "hidden" },
  };
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

/** Whole-word, case-insensitive occurrences of a phrase. */
function occurrences(text: string, phrase: string): number {
  return (
    text.match(
      new RegExp(
        `(?<![\\p{L}\\p{N}])${escapeRegExp(phrase)}(?![\\p{L}\\p{N}])`,
        "giu",
      ),
    )?.length ?? 0
  );
}

/** The writer's own prose, by part (code-built blocks are left out). */
export function writerProse(report: AuditReport) {
  const writing = report.two_source_writing;
  return {
    verdict: writing?.verdict ?? "",
    conclusion: report.conclusion,
    findings: report.key_findings.flatMap((f) => [f.title, f.explanation]),
    rest: [
      ...report.priorities.flatMap((p) => [p.action, p.why]),
      ...(writing?.competitor_reasons.map((r) => r.reason) ?? []),
      ...(writing?.takeaways.flatMap((t) => [t.title, t.text]) ?? []),
      ...(writing?.plan.flatMap((s) => [s.title, s.text]) ?? []),
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
 * The metrics of one report's writing (Spec 023 R-14 and AC-12). `names` are
 * the owner's confirmed name and aliases; `examples` is the guide's example
 * text, whose six-word runs must not reappear in a report.
 */
export function styleMetrics(
  report: AuditReport,
  names: readonly string[],
  examples = "",
): StyleMetrics {
  const prose = writerProse(report);
  const fields = [
    prose.verdict,
    prose.conclusion,
    ...prose.findings,
    ...prose.rest,
  ].filter((text) => text.trim());
  const text = fields.join("\n");
  const lengths = fields
    .flatMap((field) => sentences(field))
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
  // A count ("3 dari 10") said in more than one of the verdict, the
  // conclusion and the findings.
  const parts = [prose.verdict, prose.conclusion, prose.findings.join(" ")];
  const countsIn = parts.map(
    (part) => new Set(part.match(/\b\d+\s+dari\s+\d+\b/gi) ?? []),
  );
  const repeated = [...new Set(countsIn.flatMap((set) => [...set]))].filter(
    (pair) => countsIn.filter((set) => set.has(pair)).length > 1,
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
  const owned = names.filter((name) => name.trim().length > 1);
  return {
    sentences: lengths.length,
    mean_sentence_words: round2(mean),
    sentence_words_spread: round2(spread),
    share_over_30_words: lengths.length
      ? round2(lengths.filter((n) => n > 30).length / lengths.length)
      : 0,
    typical_phrases: count(TYPICAL_PHRASES),
    dashes:
      (text.match(/—/g)?.length ?? 0) + (text.match(/\s[–-]\s/g)?.length ?? 0),
    brand_name: owned.reduce((sum, name) => sum + occurrences(text, name), 0),
    klinik_ini: occurrences(text, "klinik ini"),
    klinik_or_bisnis_anda:
      occurrences(text, "klinik Anda") + occurrences(text, "bisnis Anda"),
    anda: occurrences(text, "Anda"),
    repeated_counts: repeated,
    cause_markers: count(CAUSE_MARKERS),
    example_overlaps: overlaps,
  };
}
