import { describe, expect, it } from "vitest";
import { generatedSuggestionGuardIssues } from "./question-suggestion-guards";
import {
  applyIndonesianQuestionEdits,
  generateIndonesianQuestionPack,
  indonesianPackBlockers,
  validateIndonesianQuestionPack,
  type IndonesianQuestionProvider,
  type MinimizedIndonesianBrief,
} from "./questions-id";

const brief: MinimizedIndonesianBrief = {
  brand_name: "Kopi Taman Senja",
  brand_name_variants: [],
  scope: "Depok",
  category: "Kedai kopi",
  offerings: ["kopi susu", "manual brew"],
  customer_context: "Warga Depok yang mencari tempat ngopi",
  customer_needs: ["tempat ngopi"],
  decision_considerations: ["lokasi", "jam buka"],
  differentiator: "",
  comparison_business: {
    name: "Kopi Pesaing",
    scope: "Depok",
    source_url: "https://kopipesaing.example",
  },
  known_accuracy_questions: [],
  conversion_action: "datang ke kedai",
  official_source_urls: ["https://kopitamansenja.example"],
};

const validQuestions = [
  "Ada rekomendasi kedai kopi di Depok?",
  "Saya cari tempat ngopi yang nyaman di Depok.",
  "Kedai kopi apa saja yang tersedia di Depok?",
  "Di mana ada kopi susu di Depok?",
  "Bandingkan pilihan kedai kopi di Depok.",
  "Bandingkan Kopi Taman Senja dengan Kopi Pesaing di Depok.",
  "Apa saja yang disediakan Kopi Taman Senja?",
  "Di mana alamat Kopi Taman Senja dan buka jam berapa?",
  "Bagaimana cara datang ke Kopi Taman Senja?",
  "Apakah Kopi Taman Senja menyediakan manual brew?",
];

function providerFor(questions: string[]): IndonesianQuestionProvider {
  return {
    generate: async () => ({ kind: "structured", questions }),
  };
}

describe("Wave 3 final comparison-business identity boundary", () => {
  it.each([
    "Kopi Pesaing",
    "Kopi-Pesaing",
    "Kopi.Pesaing",
    "Kopi_Pesaing",
    "KopiPesaing",
  ])("rejects comparison identity outside slot 6: %s", (identity) => {
    const questions = validQuestions.slice();
    questions[0] = `Ada rekomendasi kedai kopi seperti ${identity} di Depok?`;

    expect(validateIndonesianQuestionPack(questions, brief)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slot: 1,
          rule: "competitor_leakage",
        }),
      ]),
    );
  });

  it(
    "keeps intended comparison-business use valid in designated slot 6",
    () => {
      expect(validateIndonesianQuestionPack(validQuestions, brief)).toEqual([]);
    },
  );

  it("rejects compact comparison identity after a customer edit", async () => {
    const suggestion = await generateIndonesianQuestionPack(
      brief,
      providerFor(validQuestions),
    );
    const edited = applyIndonesianQuestionEdits(suggestion, brief, [
      {
        order: 2,
        new_text:
          "Ada pilihan kedai kopi seperti KopiPesaing untuk tempat ngopi di Depok?",
      },
    ]);

    expect(
      validateIndonesianQuestionPack(
        edited.questions.map((question) => question.text),
        brief,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slot: 2,
          rule: "competitor_leakage",
        }),
      ]),
    );
  });
});

describe("Wave 3 default-language guard stays suggestion-only", () => {
  it(
    "allows safe customer language edits under the final locked-pack rules",
    async () => {
      const suggestion = await generateIndonesianQuestionPack(
        brief,
        providerFor(validQuestions),
      );
      const englishEdits = [
        "What coffee shop is recommended near Depok?",
        "Where can I find coffee near Depok?",
        "Which coffee shops are available in Depok?",
        "Where can I get milk coffee near Depok?",
        "How do I compare coffee shop options in Depok?",
        "How does Kopi Taman Senja compare with Kopi Pesaing in Depok?",
      ];
      const edited = applyIndonesianQuestionEdits(
        suggestion,
        brief,
        englishEdits.map((new_text, index) => ({ order: index + 1, new_text })),
      );
      const finalTexts = edited.questions.map((question) => question.text);

      expect(generatedSuggestionGuardIssues(finalTexts, brief)).toContain(
        "clearly_non_indonesian_output",
      );
      expect(validateIndonesianQuestionPack(finalTexts, brief)).toEqual([]);
      expect(indonesianPackBlockers(finalTexts, brief)).toEqual([]);
    },
  );
});
