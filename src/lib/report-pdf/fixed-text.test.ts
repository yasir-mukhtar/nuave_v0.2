import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as text from "./fixed-text";
import { REPORT_TYPE_MIN, TYPE_TOKEN } from "./type-roles";

// Spec 024 G-05, AC-G4 (the fixed-text file) and F-02 (the type roles).

const FILE = join(process.cwd(), "src/lib/report-pdf/fixed-text.ts");

/** Every string the file can produce, with sample blanks. */
function allStrings(): string[] {
  const name = "Klinik Contoh";
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") out.push(value);
    else if (typeof value === "function") {
      // Functions that take a list are called below with their own blanks.
      if (/pageNames/.test(String(value))) return;
      for (const subject of ["klinik", "bisnis"] as const)
        out.push(
          String((value as (...a: unknown[]) => unknown)(name, subject)),
        );
    } else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object")
      Object.values(value).forEach(walk);
  };
  walk(text.PAGE_NAME);
  walk(text.COVER);
  walk(text.CONTENTS);
  walk(text.HOW_TO_READ);
  walk(text.DIVIDER);
  walk(text.CLOSING);
  walk(text.BACK_COVER);
  walk(text.FRONT_LABEL);
  for (const section of ["01", "02", "03", "04", "05"] as const) {
    out.push(
      text.sectionTitle(section, name),
      text.sectionPageLabel(section, name),
    );
    for (const q of text.SECTION_QUESTIONS[section]) {
      out.push(q.text("klinik", name), q.text("bisnis", name));
    }
  }
  out.push(
    text.HOW_TO_READ.asked(
      "Indonesia",
      "Jakarta",
      text.HOW_TO_READ.betweenDays("5 November 2026", "6 November 2026"),
    ),
    text.HOW_TO_READ.chatgptBase(0),
    text.HOW_TO_READ.chatgptBase(10),
    text.HOW_TO_READ.googleBase(7, 10),
    text.HOW_TO_READ.googleBase(0, 0),
    text.HOW_TO_READ.failed(2),
    text.DIVIDER.lede(["Penutup"]),
    text.CONTENTS.sectionNote(["Rencana", "Langkah", "Penutup"]),
  );
  return out;
}

describe("the fixed-text file (AC-G4)", () => {
  it("holds no em dash, and no en dash outside a range", () => {
    const source = readFileSync(FILE, "utf8");
    expect(source).not.toContain("—");
    // The only allowed en dash is inside a range such as "Minggu 1–2"
    // (VOICE.md §3); this file writes none.
    expect(source).not.toContain("–");
    for (const value of allStrings()) {
      expect(value).not.toMatch(/—/);
      expect(value).not.toMatch(/(?<!\d)–|–(?!\d)/);
      expect(value).not.toMatch(/\s-\s/);
    }
  });

  it("section titles are the approved D-12 titles", () => {
    expect(
      (["01", "02", "03", "04", "05"] as const).map(
        (s) => `${s} ${text.sectionTitle(s, "Ultima")}`,
      ),
    ).toEqual([
      "01 Posisi Ultima hari ini",
      "02 Apa kata AI tentang Ultima",
      "03 Apa yang dibaca AI",
      "04 Rencana delapan minggu",
      "05 Lampiran",
    ]);
  });

  it("lists exactly these placeholders still to be written (PR1_NOTES.md)", () => {
    const ids = [
      text.CONFIDENTIAL_LABEL,
      text.NUMBERS_DATE_LINE,
      text.REAUDIT_ADVICE,
      text.SYNTHETIC_LABEL,
    ].map((value) => {
      expect(text.isPlaceholder(value)).toBe(true);
      return value.slice(text.PLACEHOLDER_MARK.length + 2).split(".")[0];
    });
    expect(ids).toEqual([
      "label-rahasia",
      "tanggal-angka",
      "saran-audit-ulang",
      "label-audit-uji",
    ]);
    // No other string in the file is a placeholder.
    const source = readFileSync(FILE, "utf8");
    expect(source.match(/= placeholder\(/g)).toHaveLength(4);
    expect(allStrings().filter(text.isPlaceholder)).toEqual([]);
  });

  it("joins lists the Indonesian way", () => {
    expect(text.joinList(["A"])).toBe("A");
    expect(text.joinList(["A", "B"])).toBe("A dan B");
    expect(text.joinList(["A", "B", "C"])).toBe("A, B, dan C");
  });

  it("says pasien for a clinic and pelanggan otherwise (AC-20)", () => {
    expect(text.COVER.lede("Jakarta", "klinik")).toContain("calon pasien");
    expect(text.COVER.lede("Bandung", "bisnis")).toContain("calon pelanggan");
    expect(text.CONTENTS.lead("bisnis")).toContain("Bisnis yang tidak disebut");
  });
});

describe("the type roles (F-02, AC-F6)", () => {
  const tokens = readFileSync(
    join(process.cwd(), "src/styles/tokens.css"),
    "utf8",
  );
  const block = tokens.slice(tokens.indexOf(".report-pdf {"));

  it("every role's token in tokens.css is at least its minimum", () => {
    for (const [role, min] of Object.entries(REPORT_TYPE_MIN)) {
      const token = TYPE_TOKEN[role as keyof typeof TYPE_TOKEN];
      const match = block.match(
        new RegExp(`${token}:\\s*(\\d+(?:\\.\\d+)?)px`),
      );
      expect(match, `${role} (${token})`).not.toBeNull();
      expect(Number(match![1]), role).toBeGreaterThanOrEqual(min);
    }
  });

  it("no font loader exists outside src/app/fonts.ts", () => {
    const found = execFileSync(
      "git",
      ["grep", "-l", "-E", "next/font/(local|google)|@font-face", "--", "src"],
      { encoding: "utf8" },
    )
      .trim()
      .split("\n")
      .filter(Boolean);
    expect(found).toEqual(["src/app/fonts.ts"]);
  });
});
