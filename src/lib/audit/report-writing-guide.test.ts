import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REPORT_WRITING_GUIDE } from "./report-writing-guide";
import { twoSourceWriterMessages } from "./two-source-writer";
import { REPORT_PLAYBOOK } from "./report-playbook";

// Names from Nuave orders and test fixtures that must never appear in the
// guide (Spec 023 R-10, AC-07): its examples use placeholders only, so no
// real business, competitor or city can leak into another report. The list
// holds NV-3WDSAY's own name, the businesses its answers named and their
// cities (read 2026-10-28), and the fixture businesses.
const ORDER_NAMES = [
  "Sozo",
  "ERHA",
  "Skinderma",
  "Hagata",
  "Hill Skin",
  "Beauty Medika",
  "MelVal",
  "Glennarda",
  "Wima",
  "Asderma",
  "MALVÉ",
  "K Young",
  "Dermaboost",
  "Putih Skin",
  "Secretome",
  "Venus Glow",
  "Profira",
  "Salsa Beauty",
  "DRW Prime",
  "Katarina",
  "Sardjito",
  "LBC",
  "Innova",
  "PKU",
  "Pronafa",
  "Hafira",
  "Metamorf",
  "Batam",
  "Malang",
  "Pekalongan",
  "Pemalang",
  "Manyar",
  "Yogyakarta",
  "Surakarta",
  "Bangil",
  "Pasuruan",
  "Jakarta",
  "Surabaya",
  "Klinik Fiksi",
  "Kedai Fiksi",
  "Klinik Satu",
  "Klinik Dua",
];

describe("report writing guide (Spec 023 R-10, AC-07)", () => {
  const file = readFileSync(
    join(process.cwd(), "docs/content/report/WRITING_GUIDE.md"),
    "utf8",
  );

  it("is the Markdown file, byte for byte", () => {
    expect(REPORT_WRITING_GUIDE).toBe(file);
  });

  it("names no business, competitor or city from a Nuave order", () => {
    for (const name of ORDER_NAMES)
      expect(file.toLowerCase(), name).not.toContain(name.toLowerCase());
  });

  it("follows its own punctuation rule, stays short, and has its four parts", () => {
    expect(file).not.toMatch(/—|\s–\s|\s-\s/);
    expect(file.split(/\s+/).length).toBeLessThan(2_500);
    for (const part of [
      "## 1. Cara berpikir konsultan",
      "## 2. Cara menulis seperti editor",
      "## 3. Jujur tanpa berbelit",
      "## 4. Contoh",
    ])
      expect(file).toContain(part);
  });

  it("is read by the writer after the playbook", () => {
    const { developer } = twoSourceWriterMessages({
      brief: { name: "x" } as never,
      prompts: [],
      observations: [],
      two_source_facts: {
        counts: {
          chatgpt: { completed: 0, named: 0 },
          google: { completed: 0, summaries: 0, named: 0 },
        },
        google: [],
        writer: { questions: [], businesses: [] },
      },
    });
    expect(developer).toContain(REPORT_WRITING_GUIDE);
    expect(developer.indexOf(REPORT_WRITING_GUIDE)).toBeGreaterThan(
      developer.indexOf(REPORT_PLAYBOOK),
    );
  });
});
