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

  it("B-5: rejects a plain negation about a source that named the business, and a wrong count", () => {
    const ok = finding(
      "Di ChatGPT, klinik lain dipilih",
      "Di ChatGPT, tiga klinik lain disebut.",
    );
    const cases: [string, "conclusion" | "title"][] = [
      ["Di Google AI Overview, bisnis Anda tidak disebut.", "conclusion"],
      ["Di ChatGPT, bisnis Anda tidak muncul", "title"],
      ["Di ChatGPT, jawaban tidak menyebut bisnis Anda.", "conclusion"],
      [
        "Di ChatGPT, bisnis Anda sama sekali tidak disebut (0 dari 9 jawaban).",
        "conclusion",
      ],
      [
        "Kopi Nuave tidak disebut di ChatGPT maupun Google AI Overview.",
        "conclusion",
      ],
    ];
    for (const [sentence, where] of cases) {
      const content =
        where === "conclusion"
          ? { conclusion: sentence, key_findings: [ok] }
          : {
              conclusion:
                "Di ChatGPT, bisnis Anda disebut di 3 dari 9 jawaban.",
              key_findings: [
                finding(
                  sentence,
                  "Di ChatGPT, klinik lain lebih sering dipilih.",
                ),
              ],
            };
      expect(
        twoSourceWritingViolations(content, facts(3, 3)),
        sentence,
      ).not.toEqual([]);
    }
  });

  it("B-5: keeps a negation that carries the source's correct count or is limited", () => {
    expect(
      twoSourceWritingViolations(
        {
          conclusion:
            "Di ChatGPT, bisnis Anda tidak disebut di 6 dari 9 jawaban. Di Google AI Overview, bisnis Anda tidak muncul di 5 dari 8 ringkasan.",
          key_findings: [
            finding("Di ChatGPT, bisnis Anda tidak muncul pada kebutuhan lain"),
            finding(
              "Di Google AI Overview, bisnis Anda belum disebut untuk pertanyaan tentang botox",
            ),
            finding("Di ChatGPT, Anda disebut tetapi tidak direkomendasikan"),
          ],
        },
        facts(3, 3),
      ),
    ).toEqual([]);
  });

  it("B-5: code repairs a plain negation and keeps the sentence's place", () => {
    const { content } = repairTwoSourceWriting(
      {
        conclusion:
          "Di ChatGPT, bisnis Anda tidak disebut; di Google AI Overview, klinik lain lebih sering muncul.",
        key_findings: [
          finding(
            "Di ChatGPT, bisnis Anda tidak muncul",
            "Di ChatGPT, klinik lain lebih sering dipilih.",
          ),
          finding("Ringkasan AI Overview lebih sering menyebut klinik lain"),
        ],
      },
      facts(3, 3),
    );
    expect(content.conclusion).toBe(
      "Di ChatGPT, bisnis Anda disebut di 3 dari 9 jawaban; di Google AI Overview, klinik lain lebih sering muncul.",
    );
    expect(content.key_findings[0]!.title).toBe(
      "Di ChatGPT, bisnis Anda disebut di 3 dari 9 jawaban",
    );
    // "AI Overview" alone names Google (N-26): no "Di ChatGPT:" prefix.
    expect(content.key_findings[1]!.explanation).toBe("");
    expect(twoSourceWritingViolations(content, facts(3, 3))).toEqual([]);
  });

  it("N-26: a source with nothing to count says so instead of 0 dari 0", () => {
    const none: TwoSourceReportFacts = {
      counts: {
        chatgpt: { completed: 9, named: 2 },
        google: { completed: 6, summaries: 0, named: 0 },
      },
      google: [],
    };
    const { content } = repairTwoSourceWriting(
      { conclusion: "Bisnis Anda jarang disebut.", key_findings: [] },
      none,
    );
    expect(content.conclusion).toBe(
      "Di ChatGPT, bisnis Anda disebut di 2 dari 9 jawaban; di Google AI Overview, Google tidak menampilkan AI Overview untuk pertanyaan yang diuji. Bisnis Anda jarang disebut.",
    );
    expect(content.conclusion).not.toMatch(/0 dari 0/);
  });
});
