import { sentences, type TwoSourceReport } from "@/lib/audit/two-source-report";
import {
  TWO_SOURCE_WRITING_LIMITS,
  words,
} from "@/lib/audit/two-source-writing";
import type { AuditReport } from "@/lib/audit/types";
import { topicGapRows } from "@/app/audit/report/report-v2-data";
import type { SectionNumber } from "./fixed-text";

/**
 * Spec 024 F-05, F-06, G-02: the pure function that turns a saved
 * two-source report into the ordered list of PDF pages. The order is the
 * Report v3 order of Part 0 (`V3_PAGE_ORDER`); a page whose data does not
 * exist is left out, and so is a page whose template is not built yet
 * (Non-scope: "until then such a page or part is left out"). Lists that can
 * grow are spread by count, never by measuring, and a text over its word
 * budget gets continued pages ("lanjutan"), decided here before printing, so
 * Daftar isi's numbers are fixed. Only the appendix (Part 3) splits by
 * measuring, after this list.
 */

export type PageKind =
  | "sampul"
  | "daftar_isi"
  | "cara_membaca"
  | "ringkasan"
  | "saat_bertanya"
  | "peta_jawaban"
  | "divider"
  | "temuan"
  | "pesaing"
  | "celah_topik"
  | "cek_fakta"
  | "kata_ai"
  | "halaman_mereka"
  | "situs_dibaca"
  | "untuk_tim_web"
  | "rencana"
  | "langkah"
  | "bahan_siap_pakai"
  | "lembar_kerja"
  | "penutup"
  | "titik_awal"
  | "lampiran_a0"
  | "lampiran_soal"
  | "sampul_belakang";

export type PageSection = "front" | SectionNumber | "end";

/** Part 0 "Pages and their order": the Report v3 order (plan §5.2). A test
 * asserts the page list follows it (AC-F2, plan §5.3 rule 5). */
export const V3_PAGE_ORDER: readonly {
  section: PageSection;
  kind: PageKind;
}[] = [
  { section: "front", kind: "sampul" },
  { section: "front", kind: "daftar_isi" },
  { section: "front", kind: "cara_membaca" },
  { section: "front", kind: "ringkasan" },
  { section: "front", kind: "saat_bertanya" },
  { section: "front", kind: "peta_jawaban" },
  { section: "01", kind: "divider" },
  { section: "01", kind: "temuan" },
  { section: "01", kind: "pesaing" },
  { section: "01", kind: "celah_topik" },
  { section: "02", kind: "divider" },
  { section: "02", kind: "cek_fakta" },
  { section: "02", kind: "kata_ai" },
  { section: "03", kind: "divider" },
  { section: "03", kind: "halaman_mereka" },
  { section: "03", kind: "situs_dibaca" },
  { section: "03", kind: "untuk_tim_web" },
  { section: "04", kind: "divider" },
  { section: "04", kind: "rencana" },
  { section: "04", kind: "langkah" },
  { section: "04", kind: "bahan_siap_pakai" },
  { section: "04", kind: "lembar_kerja" },
  { section: "04", kind: "penutup" },
  { section: "04", kind: "titik_awal" },
  { section: "05", kind: "divider" },
  { section: "05", kind: "lampiran_a0" },
  { section: "05", kind: "lampiran_soal" },
  { section: "end", kind: "sampul_belakang" },
];

/** The templates built so far. Part 1 builds the always-present pages and
 * the divider template (F-09); later Parts add theirs. */
export const PART_1_TEMPLATES: ReadonlySet<PageKind> = new Set<PageKind>([
  "sampul",
  "daftar_isi",
  "cara_membaca",
  "divider",
  "penutup",
  "sampul_belakang",
]);

/** Every kind, for tests of the whole order and for `long_texts`. */
export const ALL_KINDS: ReadonlySet<PageKind> = new Set(
  V3_PAGE_ORDER.map((row) => row.kind),
);

/** F-04, D-10: the dark pages. All others use the light palette. */
export const DARK_KINDS: ReadonlySet<PageKind> = new Set<PageKind>([
  "sampul",
  "divider",
  "penutup",
  "titik_awal",
  "sampul_belakang",
]);

/** Word budgets (Part 0 "Word budgets"): the Spec 021 B-04 writer limits. */
export const BUDGET = {
  findingTitle: TWO_SOURCE_WRITING_LIMITS.finding_title_words,
  findingText: TWO_SOURCE_WRITING_LIMITS.finding_words,
  recommendationTitle: TWO_SOURCE_WRITING_LIMITS.recommendation_title_words,
  recommendationText: TWO_SOURCE_WRITING_LIMITS.recommendation_words,
  conclusion: TWO_SOURCE_WRITING_LIMITS.conclusion_words,
  planText: TWO_SOURCE_WRITING_LIMITS.plan_words,
} as const;

/** A title over its budget is never split; each of its extra words takes
 * the room of this many text words on the first page (a title is set about
 * two and a half times larger than text). */
const TITLE_WORD_COST = 2;
/** The first page always holds at least this many words of the text. */
const MIN_FIRST_PAGE_WORDS = 20;

export type PlanStepChunk = {
  /** Index of the step in `two_source_writing.plan`. */
  step: number;
  weeks: string;
  title: string;
  text: string;
};

export type PdfPage = {
  kind: PageKind;
  section: PageSection;
  /** 1-based position in the PDF. */
  number: number;
  /** The footer label: "05" on report pages, "A0" and "A3" in the
   * appendix, "" on the covers. */
  label: string;
  dark: boolean;
  /** Continued pages: this page is part `index` (1-based) of `of`. */
  part: { index: number; of: number };
  /** Temuan and Langkah: which saved item (0-based, in shown order). */
  item?: number;
  /** Temuan: `google_finding`'s own page. */
  googleFinding?: boolean;
  /** Appendix: the question's ordinal. */
  question?: number;
  /** Temuan, Langkah: this page's share of the text. */
  text?: string;
  /** Penutup: this page's share of the conclusion and of each plan step. */
  conclusion?: string;
  plan?: PlanStepChunk[];
};

export type PageListInput = Pick<
  AuditReport,
  "key_findings" | "priorities" | "conclusion" | "two_source_writing"
> & { two_source: TwoSourceReport };

export type PageList = {
  pages: PdfPage[];
  /** F-07: texts over their budget (numbers only, for the log line). */
  longTexts: number;
};

/** Sentences, a ";" clause kept with what follows (as the verdict cut). */
function sentenceParts(text: string): string[] {
  return sentences(text.trim()).reduce<string[]>((out, part) => {
    const last = out.at(-1);
    if (last?.endsWith(";")) out[out.length - 1] = `${last} ${part}`;
    else out.push(part);
    return out;
  }, []);
}

/** A sentence longer than `budget` words, split at words. */
function splitAtWords(sentence: string, budget: number): string[] {
  const tokens = sentence.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let current: string[] = [];
  let count = 0;
  for (const token of tokens) {
    const n = words(token);
    if (count + n > budget && current.length) {
      out.push(current.join(" "));
      current = [];
      count = 0;
    }
    current.push(token);
    count += n;
  }
  if (current.length) out.push(current.join(" "));
  return out;
}

/**
 * F-06, Q-7: a text cut into pieces of at most `budgets[i]` words (the last
 * budget repeats), at sentence ends, so no sentence breaks across pages; a
 * single sentence longer than a page splits at a word. Words are counted
 * with the writer's `words()`. An empty text is one empty piece.
 */
export function splitText(text: string, budgets: readonly number[]): string[] {
  const budgetAt = (i: number) => budgets[Math.min(i, budgets.length - 1)]!;
  const pieces: string[] = [];
  let current = "";
  let count = 0;
  for (const sentence of sentenceParts(text)) {
    const n = words(sentence);
    if (count + n <= budgetAt(pieces.length)) {
      current = current ? `${current} ${sentence}` : sentence;
      count += n;
      continue;
    }
    if (current) {
      pieces.push(current);
      current = "";
      count = 0;
    }
    if (n <= budgetAt(pieces.length)) {
      current = sentence;
      count = n;
      continue;
    }
    // One sentence longer than a page: split at words, page by page.
    let rest = sentence;
    while (words(rest) > budgetAt(pieces.length)) {
      const [head, ...tail] = splitAtWords(rest, budgetAt(pieces.length));
      pieces.push(head!);
      rest = tail.join(" ");
    }
    current = rest;
    count = words(rest);
  }
  if (current || !pieces.length) pieces.push(current);
  return pieces;
}

/** A titled text (Temuan, Langkah): the first page's room shrinks when the
 * title is over its budget. */
function titledPieces(
  title: string,
  text: string,
  titleBudget: number,
  textBudget: number,
): string[] {
  const extra = Math.max(0, words(title) - titleBudget);
  const first = Math.max(
    MIN_FIRST_PAGE_WORDS,
    textBudget - extra * TITLE_WORD_COST,
  );
  return splitText(text, [first, textBudget]);
}

/** Penutup: the conclusion and each plan step split by their budgets; page
 * k holds piece k of each (F-06). */
function closingParts(input: PageListInput): {
  conclusion: string;
  plan: PlanStepChunk[];
}[] {
  const conclusion = splitText(input.conclusion, [BUDGET.conclusion]);
  const steps = (input.two_source_writing?.plan ?? []).map((step) =>
    splitText(step.text, [BUDGET.planText]),
  );
  const pages = Math.max(conclusion.length, ...steps.map((s) => s.length));
  const plan = input.two_source_writing?.plan ?? [];
  return Array.from({ length: pages }, (_, k) => ({
    conclusion: conclusion[k] ?? "",
    plan: plan.flatMap((step, i) =>
      steps[i]![k] !== undefined
        ? [
            {
              step: i,
              weeks: step.weeks,
              title: step.title,
              text: steps[i]![k]!,
            },
          ]
        : [],
    ),
  }));
}

/** F-07: how many of the budgeted texts are over their budget. */
export function longTexts(input: PageListInput): number {
  const checks: [string, number][] = [
    [input.conclusion, BUDGET.conclusion],
    ...input.key_findings.flatMap((f): [string, number][] => [
      [f.title, BUDGET.findingTitle],
      [f.explanation, BUDGET.findingText],
    ]),
    ...input.priorities.flatMap((p): [string, number][] => [
      [p.action, BUDGET.recommendationTitle],
      [p.why, BUDGET.recommendationText],
    ]),
    ...(input.two_source_writing?.plan ?? []).map((s): [string, number] => [
      s.text,
      BUDGET.planText,
    ]),
  ];
  return checks.filter(([text, budget]) => words(text) > budget).length;
}

type Draft = Omit<PdfPage, "number" | "label">;

/** The pages of one kind, before numbering; empty when its data does not
 * exist (G-02). */
function pagesOf(
  kind: PageKind,
  section: PageSection,
  input: PageListInput,
): Draft[] {
  const two = input.two_source;
  const one = (extra: Partial<Draft> = {}): Draft => ({
    kind,
    section,
    dark: DARK_KINDS.has(kind),
    part: { index: 1, of: 1 },
    ...extra,
  });
  const parts = (pieces: readonly Partial<Draft>[]): Draft[] =>
    pieces.map((extra, i) =>
      one({ ...extra, part: { index: i + 1, of: pieces.length } }),
    );
  switch (kind) {
    case "sampul":
    case "daftar_isi":
    case "cara_membaca":
    case "ringkasan":
    case "peta_jawaban":
    case "titik_awal":
    case "lampiran_a0":
    case "sampul_belakang":
      return [one()];
    case "temuan": {
      const findings = input.key_findings.flatMap((finding, item) =>
        parts(
          titledPieces(
            finding.title,
            finding.explanation,
            BUDGET.findingTitle,
            BUDGET.findingText,
          ).map((text) => ({ item, text })),
        ),
      );
      return two.google_finding
        ? [...findings, one({ googleFinding: true, text: two.google_finding })]
        : findings;
    }
    case "pesaing":
      return two.other_businesses.chatgpt.length ||
        two.other_businesses.google.length ||
        (two.competitors?.others.length ?? 0) > 0
        ? [one()]
        : [];
    case "celah_topik":
      return topicGapRows(two, [], two.subject).length ? [one()] : [];
    case "rencana":
      return input.priorities.length ? [one()] : [];
    case "langkah":
      return [...input.priorities]
        .sort((a, b) => a.order - b.order)
        .flatMap((priority, item) =>
          parts(
            titledPieces(
              priority.action,
              priority.why,
              BUDGET.recommendationTitle,
              BUDGET.recommendationText,
            ).map((text) => ({ item, text })),
          ),
        );
    case "penutup":
      return parts(closingParts(input));
    case "lampiran_soal":
      return two.questions.map((q) => one({ question: q.ordinal }));
    // v3 packages whose data no saved report holds yet (Part 0, G-02).
    case "saat_bertanya":
    case "cek_fakta":
    case "kata_ai":
    case "halaman_mereka":
    case "situs_dibaca":
    case "untuk_tim_web":
    case "bahan_siap_pakai":
    case "lembar_kerja":
      return [];
    case "divider":
      // Placed below, once its section's pages are known.
      return [];
  }
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * F-05: the ordered page list of a saved two-source report, with the pages
 * whose template is in `built` (Part 1's by default).
 */
export function reportPdfPages(
  input: PageListInput,
  built: ReadonlySet<PageKind> = PART_1_TEMPLATES,
): PageList {
  const drafts: Draft[] = [];
  let pendingDivider: Draft | null = null;
  let section: PageSection | null = null;
  for (const row of V3_PAGE_ORDER) {
    if (row.section !== section) {
      section = row.section;
      pendingDivider = null;
    }
    if (row.kind === "divider") {
      // A section shows its divider only when it has a page (F-09, Q-4).
      if (built.has("divider"))
        pendingDivider = {
          kind: "divider",
          section: row.section,
          dark: true,
          part: { index: 1, of: 1 },
        };
      continue;
    }
    if (!built.has(row.kind)) continue;
    const pages = pagesOf(row.kind, row.section, input);
    if (pages.length && pendingDivider) {
      drafts.push(pendingDivider);
      pendingDivider = null;
    }
    drafts.push(...pages);
  }
  const pages = drafts.map((draft, i): PdfPage => {
    const number = i + 1;
    let label = pad(number);
    if (draft.kind === "sampul" || draft.kind === "sampul_belakang") label = "";
    if (draft.kind === "lampiran_a0") label = "A0";
    if (draft.kind === "lampiran_soal") label = `A${draft.question}`;
    return { ...draft, number, label };
  });
  return { pages, longTexts: longTexts(input) };
}

/** Daftar isi's rows (F-09): Cara membaca laporan and Ringkasan as front
 * rows, then one row per section shown, pointing at its divider (for 05,
 * the appendix's first page). */
export type ContentsRow = {
  section: SectionNumber | null;
  kind: PageKind;
  page: number;
  /** The kinds in the section, in order, without repeats. */
  kinds: PageKind[];
};

export function contentsRows(pages: readonly PdfPage[]): ContentsRow[] {
  const rows: ContentsRow[] = [];
  for (const page of pages) {
    if (
      page.section === "front" &&
      (page.kind === "cara_membaca" || page.kind === "ringkasan")
    ) {
      rows.push({
        section: null,
        kind: page.kind,
        page: page.number,
        kinds: [page.kind],
      });
    }
    if (
      page.kind === "divider" &&
      page.section !== "front" &&
      page.section !== "end"
    ) {
      const kinds = [
        ...new Set(
          pages
            .filter((p) => p.section === page.section && p.kind !== "divider")
            .map((p) => p.kind),
        ),
      ];
      rows.push({
        section: page.section,
        kind: "divider",
        page: page.number,
        kinds,
      });
    }
  }
  return rows;
}
