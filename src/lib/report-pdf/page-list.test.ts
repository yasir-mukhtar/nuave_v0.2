import { describe, expect, it } from "vitest";
import { words } from "@/lib/audit/two-source-writing";
import { FIXTURES, reportFixture, textOfWords } from "./fixtures.test-helper";
import {
  ALL_KINDS,
  BUDGET,
  DARK_KINDS,
  PART_1_TEMPLATES,
  V3_PAGE_ORDER,
  contentsRows,
  longTexts,
  reportPdfPages,
  splitText,
  type PageListInput,
  type PdfPage,
} from "./page-list";

// Spec 024 F-05, F-06, F-07 and F-09's page rules (AC-F2, AC-F3, AC-F11).

const input = (name: keyof typeof FIXTURES): PageListInput => {
  const { report } = FIXTURES[name]();
  return report as PageListInput;
};

/** The position of each page's (section, kind) in the v3 order. */
const orderIndex = (page: PdfPage) =>
  V3_PAGE_ORDER.findIndex(
    (row) => row.section === page.section && row.kind === page.kind,
  );

describe("the page list follows the Report v3 order (AC-F2, plan §5.3 rule 5)", () => {
  it("the order table is Part 0's table", () => {
    expect(V3_PAGE_ORDER.map((row) => `${row.section} ${row.kind}`)).toEqual([
      "front sampul",
      "front daftar_isi",
      "front cara_membaca",
      "front ringkasan",
      "front saat_bertanya",
      "front peta_jawaban",
      "01 divider",
      "01 temuan",
      "01 pesaing",
      "01 celah_topik",
      "02 divider",
      "02 cek_fakta",
      "02 kata_ai",
      "03 divider",
      "03 halaman_mereka",
      "03 situs_dibaca",
      "03 untuk_tim_web",
      "04 divider",
      "04 rencana",
      "04 langkah",
      "04 bahan_siap_pakai",
      "04 lembar_kerja",
      "04 penutup",
      "04 titik_awal",
      "05 divider",
      "05 lampiran_a0",
      "05 lampiran_soal",
      "end sampul_belakang",
    ]);
  });

  for (const name of Object.keys(FIXTURES) as (keyof typeof FIXTURES)[]) {
    it(`${name}: every page is in v3 order, numbered 1..n, back cover last`, () => {
      for (const built of [PART_1_TEMPLATES, ALL_KINDS]) {
        const { pages } = reportPdfPages(input(name), built);
        const indices = pages.map(orderIndex);
        expect(indices.every((i) => i >= 0)).toBe(true);
        expect([...indices].sort((a, b) => a - b)).toEqual(indices);
        expect(pages.map((p) => p.number)).toEqual(pages.map((_, i) => i + 1));
        expect(pages.at(-1)!.kind).toBe("sampul_belakang");
        expect(pages[0]!.kind).toBe("sampul");
        // F-04, D-10: the dark pages are exactly the listed kinds.
        for (const page of pages)
          expect(page.dark).toBe(DARK_KINDS.has(page.kind));
      }
    });
  }

  it("with every template, a full report has the front pages, sections 01, 04 and 05, and pages without data are left out", () => {
    const { pages } = reportPdfPages(input("typical"), ALL_KINDS);
    const kinds = pages.map((p) => `${p.section} ${p.kind}`);
    expect([...new Set(kinds)]).toEqual([
      "front sampul",
      "front daftar_isi",
      "front cara_membaca",
      "front ringkasan",
      "front peta_jawaban",
      "01 divider",
      "01 temuan",
      "01 pesaing",
      "01 celah_topik",
      "04 divider",
      "04 rencana",
      "04 langkah",
      "04 penutup",
      "04 titik_awal",
      "05 divider",
      "05 lampiran_a0",
      "05 lampiran_soal",
      "end sampul_belakang",
    ]);
    // The v3 pages no saved report fills yet are never in the list.
    for (const kind of [
      "saat_bertanya",
      "cek_fakta",
      "kata_ai",
      "halaman_mereka",
      "situs_dibaca",
      "untuk_tim_web",
      "bahan_siap_pakai",
      "lembar_kerja",
    ])
      expect(kinds.some((k) => k.endsWith(` ${kind}`))).toBe(false);
  });

  it("Part 1's PDF: cover, Daftar isi, Cara membaca, the 04 divider, Penutup, back cover", () => {
    const { pages } = reportPdfPages(input("typical"));
    expect(pages.map((p) => [p.kind, p.section, p.label])).toEqual([
      ["sampul", "front", ""],
      ["daftar_isi", "front", "02"],
      ["cara_membaca", "front", "03"],
      ["divider", "04", "04"],
      ["penutup", "04", "05"],
      ["sampul_belakang", "end", ""],
    ]);
  });

  it("one Temuan page per finding plus google_finding's, one Langkah page per recommendation", () => {
    const { pages } = reportPdfPages(input("ten_and_ten"), ALL_KINDS);
    const temuan = pages.filter((p) => p.kind === "temuan");
    expect(temuan).toHaveLength(11);
    expect(temuan.at(-1)!.googleFinding).toBe(true);
    expect(temuan.slice(0, 10).map((p) => p.item)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(
      pages.filter((p) => p.kind === "langkah").map((p) => p.item),
    ).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    // The appendix labels are A0 and A1 to A10.
    expect(
      pages
        .filter((p) => p.section === "05" && p.kind !== "divider")
        .map((p) => p.label),
    ).toEqual([
      "A0",
      "A1",
      "A2",
      "A3",
      "A4",
      "A5",
      "A6",
      "A7",
      "A8",
      "A9",
      "A10",
    ]);
  });

  it("no google_finding page when Google showed an AI Overview for every completed check", () => {
    const { pages } = reportPdfPages(input("named_everywhere"), ALL_KINDS);
    expect(pages.some((p) => p.googleFinding)).toBe(false);
  });
});

describe("continued pages (F-06, AC-F2)", () => {
  it("a text at its budget gets no continued page", () => {
    const { pages } = reportPdfPages(input("at_budget"), ALL_KINDS);
    for (const page of pages) expect(page.part).toEqual({ index: 1, of: 1 });
    expect(longTexts(input("at_budget"))).toBe(0);
  });

  it("a Temuan, Langkah or Penutup text over its budget gets as many continued pages as it needs", () => {
    const report = input("at_budget");
    const finding = report.key_findings[0]!;
    const priority = report.priorities[0]!;
    const plan = report.two_source_writing!.plan;
    const over: PageListInput = {
      ...report,
      // 81 words: two pages; 241: four pages (80 + 80 + 80 + 1).
      key_findings: [
        { ...finding, explanation: textOfWords(81) },
        { ...finding, explanation: textOfWords(241) },
      ],
      priorities: [{ ...priority, why: textOfWords(201) }],
      conclusion: textOfWords(141),
      two_source_writing: {
        ...report.two_source_writing!,
        plan: [{ ...plan[0]!, text: textOfWords(36) }, plan[1]!, plan[2]!],
      },
    };
    const { pages } = reportPdfPages(over, ALL_KINDS);
    const parts = (kind: string, item?: number) =>
      pages
        .filter(
          (p) => p.kind === kind && (item === undefined || p.item === item),
        )
        .map((p) => `${p.part.index}/${p.part.of}`);
    expect(parts("temuan", 0)).toEqual(["1/2", "2/2"]);
    expect(parts("temuan", 1)).toEqual(["1/4", "2/4", "3/4", "4/4"]);
    expect(parts("langkah", 0)).toEqual(["1/3", "2/3", "3/3"]);
    // Conclusion 141 words: three pages; plan step 1 at 36 words: two.
    expect(parts("penutup")).toEqual(["1/3", "2/3", "3/3"]);
    const closing = pages.filter((p) => p.kind === "penutup");
    expect(closing.map((p) => p.plan!.map((s) => s.step))).toEqual([
      [0, 1, 2],
      [0],
      [],
    ]);
    // Nothing is lost and no page holds more than its budget.
    const temuanText = pages
      .filter((p) => p.kind === "temuan" && p.item === 1)
      .map((p) => p.text!);
    expect(temuanText.join(" ")).toBe(over.key_findings[1]!.explanation);
    for (const text of temuanText)
      expect(words(text)).toBeLessThanOrEqual(BUDGET.findingText);
    expect(
      closing
        .map((p) => p.conclusion)
        .join(" ")
        .trim(),
    ).toBe(over.conclusion);
    expect(longTexts(over)).toBe(5);
  });

  it("a title over its budget leaves less room for the text on the first page", () => {
    const report = input("at_budget");
    const finding = report.key_findings[0]!;
    const over: PageListInput = {
      ...report,
      key_findings: [
        { ...finding, title: textOfWords(17), explanation: textOfWords(80) },
      ],
    };
    const temuan = reportPdfPages(over, ALL_KINDS).pages.filter(
      (p) => p.kind === "temuan",
    );
    // 17-word title: 5 words over, so the first page holds at most 70 words
    // of text, cut at the last sentence end before that.
    const counts = temuan.map((p) => words(p.text!));
    expect(counts).toHaveLength(2);
    expect(counts[0]).toBeLessThanOrEqual(70);
    expect(counts[0]! + counts[1]!).toBe(80);
  });

  it("the maximum fixture spreads every long text and counts them", () => {
    const { pages, longTexts: count } = reportPdfPages(
      input("maximum"),
      ALL_KINDS,
    );
    expect(pages.filter((p) => p.part.of > 1).length).toBeGreaterThan(30);
    // 10 finding titles + 10 texts, 10 recommendation titles + 10 texts,
    // the conclusion and three plan steps.
    expect(count).toBe(44);
  });
});

describe("splitText splits at sentence ends (Q-7)", () => {
  it("keeps sentences whole and splits a sentence longer than a page at a word", () => {
    const text =
      "Satu dua tiga. Empat lima enam. Tujuh delapan sembilan sepuluh.";
    expect(splitText(text, [6])).toEqual([
      "Satu dua tiga. Empat lima enam.",
      "Tujuh delapan sembilan sepuluh.",
    ]);
    expect(splitText(text, [3])).toEqual([
      "Satu dua tiga.",
      "Empat lima enam.",
      "Tujuh delapan sembilan",
      "sepuluh.",
    ]);
    expect(splitText("", [5])).toEqual([""]);
    // "Sp.DVE" counts as two words, as the writer counts it.
    expect(splitText("dr. Ayu Sp.DVE praktik.", [10])).toEqual([
      "dr. Ayu Sp.DVE praktik.",
    ]);
  });
});

describe("Daftar isi and dividers (F-09, AC-F3, AC-F11)", () => {
  for (const name of Object.keys(FIXTURES) as (keyof typeof FIXTURES)[]) {
    it(`${name}: each row points at its page; no divider or row for a section without a page`, () => {
      for (const built of [PART_1_TEMPLATES, ALL_KINDS]) {
        const { pages } = reportPdfPages(input(name), built);
        const rows = contentsRows(pages);
        for (const row of rows) {
          const target = pages[row.page - 1]!;
          expect(target.kind).toBe(row.kind);
          if (row.section) expect(target.section).toBe(row.section);
        }
        const dividers = pages.filter((p) => p.kind === "divider");
        for (const divider of dividers) {
          const next = pages[divider.number]!;
          expect(next.section).toBe(divider.section);
          expect(next.kind).not.toBe("divider");
        }
        expect(rows.filter((r) => r.section).map((r) => r.section)).toEqual(
          dividers.map((d) => d.section),
        );
        // Sections 02 and 03 have no page today (Q-4).
        expect(
          dividers.some((d) => d.section === "02" || d.section === "03"),
        ).toBe(false);
      }
    });
  }

  it("with every template the rows are Cara membaca, Ringkasan, 01, 04 and 05; 05 points at the appendix's first page", () => {
    const { pages } = reportPdfPages(input("typical"), ALL_KINDS);
    const rows = contentsRows(pages);
    expect(rows.map((r) => r.section ?? r.kind)).toEqual([
      "cara_membaca",
      "ringkasan",
      "01",
      "04",
      "05",
    ]);
    const lampiran = rows.at(-1)!;
    expect(pages[lampiran.page - 1]!.kind).toBe("divider");
    expect(pages[lampiran.page]!.label).toBe("A0");
  });

  it("a report without recommendations has no Rencana or Langkah, and section 04 still shows for Penutup", () => {
    const base = reportFixture({ recommendations: 1 }).report as PageListInput;
    const none = { ...base, priorities: [] };
    const { pages } = reportPdfPages(none, ALL_KINDS);
    expect(
      pages.some((p) => p.kind === "rencana" || p.kind === "langkah"),
    ).toBe(false);
    expect(pages.filter((p) => p.section === "04").map((p) => p.kind)).toEqual([
      "divider",
      "penutup",
      "titik_awal",
    ]);
  });
});
