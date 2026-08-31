import { describe, expect, it } from "vitest";
import {
  INDONESIAN_QUESTION_INSTRUCTION_VERSION,
  INDONESIAN_QUESTION_PACK_VERSION,
  IndonesianApprovalBlockedError,
  approveIndonesianQuestionPack,
  applyIndonesianQuestionEdits,
  buildDeterministicIndonesianPack,
  generateIndonesianQuestionPack,
  hasIndonesianComparisonRelation,
  validateCanonicalIndonesianQuestionPack,
  type IndonesianQuestionProvider,
  type MinimizedIndonesianBrief,
} from "./questions-id";
import {
  AUDIT_MEASUREMENT_MATRIX,
  CANONICAL_COMPOSITION_COUNTS,
} from "./measurement-matrix";
import { INDONESIAN_QUESTION_WRITER_INSTRUCTION } from "./questions-id-provider";

const brief: MinimizedIndonesianBrief = {
  brand_name: "Kopi Taman Senja",
  brand_name_variants: ["Taman Senja"],
  scope: "Dago, Bandung",
  category: "Kedai kopi",
  offerings: ["kopi lokal", "ruang kerja"],
  customer_context: "pekerja remote dan mahasiswa",
  customer_needs: ["tempat untuk bekerja"],
  decision_considerations: ["lokasi", "suasana", "jam buka"],
  differentiator: "",
  comparison_business: {
    name: "Kopi Ruang Pagi",
    scope: "Dago, Bandung",
    source_url: "https://kopiruangpagi.example",
  },
  known_accuracy_questions: [],
  conversion_action: "datang ke kedai",
  official_source_urls: ["https://kopitamansenja.example"],
};

const canonicalQuestions = [
  "Rekomendasi kedai kopi di Dago, Bandung untuk pekerja remote apa saja?",
  "Dalam situasi apa pekerja remote biasanya mencari kedai kopi di Dago?",
  "Untuk tempat bekerja, kedai kopi apa yang cocok di Dago, Bandung?",
  "Di mana saya bisa menemukan kopi lokal untuk bekerja di Dago, Bandung?",
  "Kedai kopi mana yang layak masuk daftar pilihan berdasarkan lokasi dan jam buka?",
  "Apa perbedaan pilihan kedai kopi di Dago untuk bekerja dan bertemu?",
  "Apakah Kopi Taman Senja cocok untuk kebutuhan tempat bekerja?",
  "Apakah Kopi Taman Senja layak direkomendasikan untuk pekerja remote?",
  "Bandingkan Kopi Taman Senja dengan Kopi Ruang Pagi untuk bekerja di Dago?",
  "Siapa yang cocok memilih Kopi Taman Senja, siapa yang mungkin kurang cocok, dan apa trade-offnya?",
];

function providerFor(questions: string[]): IndonesianQuestionProvider {
  return { generate: async () => ({ kind: "structured", questions }) };
}

describe("A3 canonical composition", () => {
  it("accepts exactly six unnamed and four named questions", () => {
    expect(CANONICAL_COMPOSITION_COUNTS).toEqual({
      unbranded: 6,
      branded: 4,
    });
    expect(
      validateCanonicalIndonesianQuestionPack(canonicalQuestions, brief),
    ).toEqual([]);
  });

  it("rejects the old five-and-five composition", () => {
    const fiveAndFive = canonicalQuestions.slice();
    fiveAndFive[0] =
      "Rekomendasi Kopi Taman Senja untuk pekerja remote apa saja?";

    expect(validateCanonicalIndonesianQuestionPack(fiveAndFive, brief)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slot: null, rule: "composition" }),
      ]),
    );
  });

  it("rejects six unnamed plus three named because the pack is not ten questions", () => {
    expect(
      validateCanonicalIndonesianQuestionPack(
        canonicalQuestions.slice(0, 9),
        brief,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slot: null, rule: "count" }),
      ]),
    );
  });

  it("derives all ten slot policies from the matrix", () => {
    const unnamed = AUDIT_MEASUREMENT_MATRIX.filter(
      (slot) => slot.auditedBrandIdentity === "forbidden",
    );
    const named = AUDIT_MEASUREMENT_MATRIX.filter(
      (slot) => slot.auditedBrandIdentity === "required",
    );
    expect(unnamed.map((slot) => slot.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(named.map((slot) => slot.order)).toEqual([7, 8, 9, 10]);
  });
});

describe("A3 deterministic Indonesian fallback", () => {
  it("implements every canonical measurement purpose", () => {
    const questions = buildDeterministicIndonesianPack(brief);
    expect(questions).toHaveLength(10);
    expect(validateCanonicalIndonesianQuestionPack(questions, brief)).toEqual(
      [],
    );
    expect(
      questions
        .slice(0, 6)
        .every(
          (question) =>
            !/kopi taman senja|taman senja|kopi ruang pagi/i.test(question),
        ),
    ).toBe(true);
    expect(
      questions
        .slice(6)
        .every((question) => /kopi taman senja/i.test(question)),
    ).toBe(true);
    expect(questions[8]).toMatch(/kopi taman senja/i);
    expect(questions[8]).toMatch(/kopi ruang pagi/i);
    expect(hasIndonesianComparisonRelation(questions[8], brief)).toBe(true);
  });

  it("keeps slot 6 as a realistic unnamed comparison", () => {
    const slotSix = buildDeterministicIndonesianPack(brief)[5];
    expect(slotSix).not.toMatch(
      /kopi taman senja|taman senja|kopi ruang pagi/i,
    );
    expect(slotSix).toMatch(/perbedaan|bandingkan|pilihan/i);
  });

  it("derives slot context from canonical allowed fields", () => {
    const openComparison = AUDIT_MEASUREMENT_MATRIX[5];
    const directComparison = AUDIT_MEASUREMENT_MATRIX[8];

    expect(openComparison.allowedContextFields).not.toContain("brand_name");
    expect(openComparison.allowedContextFields).not.toContain(
      "verified_competitor",
    );
    expect(directComparison.allowedContextFields).toContain(
      "verified_competitor",
    );
  });
});

describe("A3 writer contract and edit boundary", () => {
  it("uses the bumped instruction version and canonical slot descriptions", () => {
    expect(INDONESIAN_QUESTION_INSTRUCTION_VERSION).toBe("question-writer-v2");
    expect(INDONESIAN_QUESTION_PACK_VERSION).toBe(
      "indonesian-question-pack-v1",
    );
    AUDIT_MEASUREMENT_MATRIX.forEach((slot) => {
      expect(INDONESIAN_QUESTION_WRITER_INSTRUCTION).toContain(
        slot.generatorSlotDescription,
      );
      expect(INDONESIAN_QUESTION_WRITER_INSTRUCTION).toContain(slot.category);
    });
    expect(INDONESIAN_QUESTION_WRITER_INSTRUCTION).not.toMatch(
      /five|5\/5|two questions per category|two per category/i,
    );
  });

  it("blocks a forbidden identity on approval but allows wording drift to proceed", async () => {
    const suggestion = await generateIndonesianQuestionPack(
      brief,
      providerFor(canonicalQuestions),
    );
    const invalid = applyIndonesianQuestionEdits(suggestion, brief, [
      {
        order: 1,
        new_text: "Rekomendasi Kopi Taman Senja untuk pekerja remote apa?",
      },
    ]);
    expect(() =>
      approveIndonesianQuestionPack(invalid, brief, {
        pack_version_id: "a3-invalid",
        order_reference: "order-a3-invalid",
        fact_version_id: "facts-a3",
      }),
    ).toThrow(IndonesianApprovalBlockedError);

    const drifted = applyIndonesianQuestionEdits(suggestion, brief, [
      {
        order: 1,
        new_text: "Apa yang perlu saya ketahui sebelum memilih kedai kopi?",
      },
    ]);
    expect(() =>
      approveIndonesianQuestionPack(drifted, brief, {
        pack_version_id: "a3-drift",
        order_reference: "order-a3-drift",
        fact_version_id: "facts-a3",
      }),
    ).not.toThrow();
  });

  it("blocks metadata tampering even when the edited wording is valid", async () => {
    const suggestion = await generateIndonesianQuestionPack(
      brief,
      providerFor(canonicalQuestions),
    );
    suggestion.questions[0].category = "brand_fit";

    expect(() =>
      approveIndonesianQuestionPack(suggestion, brief, {
        pack_version_id: "a3-metadata-invalid",
        order_reference: "order-a3-metadata-invalid",
        fact_version_id: "facts-a3",
      }),
    ).toThrow(IndonesianApprovalBlockedError);
  });
});
