import { describe, expect, it } from "vitest";
import {
  repairTwoSourceWriting,
  twoSourceMethodSentence,
  twoSourceWritingViolations,
  type TwoSourceReportFacts,
} from "./two-source-report";

// Spec 018 R-28 and the Report layout: the written conclusion and findings
// name their source and never contradict the code counts.

const facts = (
  chatgptNamed: number,
  googleNamed: number,
): TwoSourceReportFacts => ({
  counts: {
    chatgpt: { completed: 9, named: chatgptNamed },
    google: { completed: 10, summaries: 8, named: googleNamed },
  },
  google: [],
});

const finding = (title: string, explanation = "") => ({ title, explanation });

describe("two-source writing checks", () => {
  it("accepts a conclusion and findings that name their source and agree with the counts", () => {
    expect(
      twoSourceWritingViolations(
        {
          conclusion:
            "Di ChatGPT, bisnis Anda tidak disebut di pertanyaan yang diuji. Di Google AI Overview, bisnis Anda disebut di 3 dari 8 ringkasan.",
          key_findings: [
            finding("Di Google AI Overview, Anda disebut untuk harga"),
            finding(
              "Belum muncul di ChatGPT",
              "Di ChatGPT, klinik lain dipilih.",
            ),
          ],
        },
        facts(0, 3),
      ),
    ).toEqual([]);
  });

  it("asks for the source when the conclusion or a finding names none", () => {
    const violations = twoSourceWritingViolations(
      {
        conclusion: "Bisnis Anda jarang disebut.",
        key_findings: [finding("Harga sering ditanyakan", "Banyak jawaban.")],
      },
      facts(1, 1),
    );
    expect(violations).toHaveLength(2);
    expect(violations[0]).toMatch(/conclusion must name its source/);
    expect(violations[1]).toMatch(/Key finding 1/);
  });

  it("rejects a sentence that says a source did not name the business when its count is above zero", () => {
    expect(
      twoSourceWritingViolations(
        {
          conclusion:
            "Di Google AI Overview, bisnis Anda tidak disebut sama sekali.",
          key_findings: [finding("Di ChatGPT, Anda belum muncul")],
        },
        facts(0, 3),
      ),
    ).toEqual([
      expect.stringContaining("Google AI Overview named the business in 3"),
    ]);
    expect(
      twoSourceWritingViolations(
        {
          conclusion:
            "Ini uji sintetis. Bisnis tidak disebut dalam jawaban mana pun di ChatGPT dan Google AI Overview.",
          key_findings: [
            finding("Di ChatGPT dan Google AI Overview, semua sintetis"),
          ],
        },
        facts(0, 3),
      ),
    ).toEqual([expect.stringContaining("named in at least one answer")]);
  });

  it("B-4: keeps true sentences that are partial, counted or about recommendation", () => {
    expect(
      twoSourceWritingViolations(
        {
          conclusion:
            "Di ChatGPT, bisnis Anda disebut di 3 dari 9 jawaban, tetapi tidak direkomendasikan. Di Google AI Overview, bisnis Anda disebut di 3 dari 8 ringkasan dan tidak disebut di 5 ringkasan lainnya.",
          key_findings: [
            finding(
              "Di ChatGPT, bisnis Anda tidak muncul untuk pertanyaan tentang harga.",
            ),
            finding("Di ChatGPT, Sozo tidak muncul pada kebutuhan lain"),
          ],
        },
        facts(3, 3),
      ),
    ).toEqual([]);
  });

  it("B-4: code replaces a contradicting sentence and marks a finding without a source", () => {
    const { content, changed } = repairTwoSourceWriting(
      {
        conclusion:
          "Di Google AI Overview, bisnis Anda tidak disebut sama sekali. Di ChatGPT, klinik lain lebih sering dipilih.",
        key_findings: [finding("Harga sering ditanyakan", "Banyak jawaban.")],
      },
      facts(1, 3),
    );
    expect(changed).toBe(true);
    expect(content.conclusion).toBe(
      "Di Google AI Overview, bisnis Anda disebut di 3 dari 8 ringkasan. Di ChatGPT, klinik lain lebih sering dipilih.",
    );
    expect(content.key_findings[0]!.explanation).toBe(
      "Di ChatGPT: Banyak jawaban.",
    );
    expect(twoSourceWritingViolations(content, facts(1, 3))).toEqual([]);
  });

  it("B-4: a conclusion with no source gets both count sentences in front", () => {
    const { content } = repairTwoSourceWriting(
      { conclusion: "Bisnis Anda jarang disebut.", key_findings: [] },
      facts(2, 1),
    );
    expect(content.conclusion).toBe(
      "Di ChatGPT, bisnis Anda disebut di 2 dari 9 jawaban; di Google AI Overview, bisnis Anda disebut di 1 dari 8 ringkasan. Bisnis Anda jarang disebut.",
    );
  });

  it("the method sentence counts both sources and names no internal system", () => {
    const sentence = twoSourceMethodSentence({
      counts: {
        chatgpt: { completed: 9, named: 0, recommended: 0, failed: 1 },
        google: { completed: 8, summaries: 6, named: 2, failed: 2 },
        failed: 3,
      },
    });
    expect(sentence).toBe(
      "Audit ini menanyakan 10 pertanyaan yang sama ke aplikasi ChatGPT dan ke Google AI Overview melalui DataForSEO. 9 dari 10 pemeriksaan ChatGPT dan 8 dari 10 pemeriksaan Google selesai; 3 pemeriksaan tidak dapat diuji.",
    );
    expect(sentence).not.toMatch(/LLM Scraper/);
  });
});
