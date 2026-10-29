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
  // A real clinic chain named in NV-3WDSAY's Google AI Overview answers.
  "Bening",
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
    // Whole words only: "ERHA" is inside "terhadap".
    for (const name of ORDER_NAMES)
      expect(file, name).not.toMatch(
        new RegExp(`(?<![\\p{L}\\p{N}])${name}(?![\\p{L}\\p{N}])`, "iu"),
      );
  });

  it("follows its own punctuation rule, keeps a bounded length, and has its parts", () => {
    // List markers ("- ") are not dashes; prose is checked without them.
    const prose = file.replace(/^\s*- /gm, "");
    expect(prose).not.toMatch(/—|\s–\s|\s-\s/);
    // The founder's fourth version (2026-10-29) is longer than the first
    // drafts; it is read with every report, so it stays bounded.
    expect(file.split(/\s+/).length).toBeLessThan(4_500);
    for (const part of [
      "## 1. Baca sampai tahu perkaranya",
      "## 2. Temukan pokok ceritanya",
      "## 7. Jaga batas makna",
      "## 10. Satu bahan, satu laporan yang utuh",
      "## 11. Sunting dengan mata pembaca",
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
