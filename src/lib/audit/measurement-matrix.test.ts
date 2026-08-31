import { describe, expect, it } from "vitest";
import {
  AUDIT_MEASUREMENT_MATRIX,
  COMPATIBILITY_COMPOSITION_COUNTS,
  COMPARISON_RELATION_MARKERS,
  PROMPT_MATRIX,
  measurementSlotForPromptId,
  measurementSlotsForAssessmentClass,
  measurementSlotsForCompatibilityAssessmentClass,
} from "./measurement-matrix";
import { generatedSuggestionGuardIssues } from "./question-suggestion-guards";
import {
  categoryComparisonFallbackName,
  hasIndonesianComparisonRelation,
  isCategoryComparisonFallback,
  minimizeIndonesianBrief,
  validateCanonicalIndonesianQuestionPack,
  validateIndonesianQuestionPack,
  type MinimizedIndonesianBrief,
} from "./questions-id";

const brief: MinimizedIndonesianBrief = {
  brand_name: "Kopi Taman Senja",
  brand_name_variants: [],
  scope: "Depok",
  category: "Kedai kopi",
  offerings: ["kopi susu", "manual brew"],
  customer_context: "Warga Depok",
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

const canonicalQuestions = [
  "Kedai kopi apa yang tersedia di Depok?",
  "Untuk situasi apa warga Depok biasanya mencari tempat ngopi?",
  "Pilihan kedai kopi mana yang cocok untuk kebutuhan warga Depok?",
  "Di mana saya bisa menemukan kopi susu di Depok?",
  "Kedai kopi mana yang masuk daftar pilihan berdasarkan lokasi dan jam buka?",
  "Apa perbedaan pilihan kedai kopi di Depok untuk kebutuhan ini?",
  "Apakah Kopi Taman Senja cocok untuk kebutuhan warga Depok?",
  "Apakah Kopi Taman Senja layak direkomendasikan untuk warga Depok?",
  "Bandingkan Kopi Taman Senja dengan Kopi Pesaing untuk warga Depok.",
  "Siapa yang cocok memilih Kopi Taman Senja dan apa pertimbangannya?",
];

const legacyQuestions = [
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

function errorsWithQuestion(
  questions: string[],
  order: number,
  text: string,
  input = brief,
) {
  const changed = questions.slice();
  changed[order - 1] = text;
  return validateCanonicalIndonesianQuestionPack(changed, input);
}

describe("canonical measurement matrix", () => {
  it("contains the ten R-01 slots and only slot 9 declares relation markers", () => {
    expect(AUDIT_MEASUREMENT_MATRIX).toHaveLength(10);
    expect(AUDIT_MEASUREMENT_MATRIX.map((slot) => slot.order)).toEqual(
      Array.from({ length: 10 }, (_, index) => index + 1),
    );
    expect(AUDIT_MEASUREMENT_MATRIX.map((slot) => slot.category)).toEqual([
      "category_recommendation",
      "situation",
      "need_fit",
      "offering_use_case",
      "shortlist",
      "open_comparison",
      "brand_fit",
      "explicit_recommendation",
      "direct_comparison",
      "fit_misfit",
    ]);

    const comparisonSlots = AUDIT_MEASUREMENT_MATRIX.filter((slot) =>
      Object.hasOwn(slot, "comparisonRelationMarkers"),
    );
    expect(comparisonSlots).toHaveLength(1);
    expect(comparisonSlots[0].order).toBe(9);
    const comparisonSlot = comparisonSlots[0];
    if (!("comparisonRelationMarkers" in comparisonSlot)) {
      throw new Error(
        "The direct-comparison slot must declare relation markers.",
      );
    }
    expect(comparisonSlot.comparisonRelationMarkers).toEqual(
      COMPARISON_RELATION_MARKERS,
    );
    expect(
      AUDIT_MEASUREMENT_MATRIX.filter(
        (slot) => !Object.hasOwn(slot, "comparisonRelationMarkers"),
      ).every((slot) => !Object.hasOwn(slot, "comparisonRelationMarkers")),
    ).toBe(true);
  });

  it("keeps canonical input ownership aligned with identity policy", () => {
    const unnamedSlots = AUDIT_MEASUREMENT_MATRIX.filter(
      (slot) => slot.auditedBrandIdentity === "forbidden",
    );
    expect(
      unnamedSlots.every(
        (slot) =>
          !(slot.allowedContextFields as readonly string[]).includes(
            "brand_name",
          ) &&
          !(slot.allowedContextFields as readonly string[]).includes(
            "entity_scope",
          ),
      ),
    ).toBe(true);

    const directComparison = AUDIT_MEASUREMENT_MATRIX.find(
      (slot) => slot.category === "direct_comparison",
    );
    const openComparison = AUDIT_MEASUREMENT_MATRIX.find(
      (slot) => slot.category === "open_comparison",
    );
    if (!directComparison || !openComparison) {
      throw new Error("The canonical comparison slots are missing.");
    }
    expect(directComparison?.allowedContextFields).toContain(
      "verified_competitor",
    );
    expect(openComparison?.allowedContextFields).not.toContain(
      "verified_competitor",
    );
    AUDIT_MEASUREMENT_MATRIX.forEach((slot) => {
      expect(slot.measurementPurpose).toBeTruthy();
      expect(slot.customerFacingLabel).toBeTruthy();
      expect(slot.reportAssessmentClass).toBeTruthy();
      expect(slot.generatorSlotDescription).toBeTruthy();
      expect(slot.compatibilityCustomerFacingLabel).toBeTruthy();
      expect(slot.compatibilityMeasurementPurpose).toBeTruthy();
      expect(slot.compatibilityReportAssessmentClass).toBeTruthy();
    });
  });

  it("keeps the old tuple API as a derived 5/5 compatibility projection", () => {
    expect(PROMPT_MATRIX).toEqual(
      AUDIT_MEASUREMENT_MATRIX.map((slot) => [
        slot.id,
        slot.legacyCategory,
        slot.legacyBranded,
        slot.legacyRole,
      ]),
    );
    expect(
      AUDIT_MEASUREMENT_MATRIX.filter((slot) => !slot.legacyBranded),
    ).toHaveLength(5);
    expect(
      AUDIT_MEASUREMENT_MATRIX.filter((slot) => slot.legacyBranded),
    ).toHaveLength(5);
  });

  it("derives the pre-A3 compatibility report paths without changing R-01 fields", () => {
    expect(
      measurementSlotsForCompatibilityAssessmentClass("recommendation").map(
        (slot) => slot.order,
      ),
    ).toEqual([1, 2, 3, 4]);
    expect(
      measurementSlotsForCompatibilityAssessmentClass("comparison").map(
        (slot) => slot.order,
      ),
    ).toEqual([5, 6]);
    expect(
      measurementSlotsForCompatibilityAssessmentClass("information").map(
        (slot) => slot.order,
      ),
    ).toEqual([7, 8, 9, 10]);

    const slotFor = (order: number) => {
      const slot = AUDIT_MEASUREMENT_MATRIX.find(
        (candidate) => candidate.order === order,
      );
      if (!slot) throw new Error(`Missing matrix slot ${order}`);
      return slot;
    };
    expect(slotFor(6)).toMatchObject({
      category: "open_comparison",
      auditedBrandIdentity: "forbidden",
      comparisonTargetIdentity: "forbidden",
      reportAssessmentClass: "comparison",
      compatibilityCustomerFacingLabel: "Perbandingan",
      compatibilityMeasurementPurpose:
        "How the audited business compares with one verified competitor for the customer's criteria",
      compatibilityReportAssessmentClass: "comparison",
    });
    expect(slotFor(6).compatibilityMeasurementPurpose).not.toContain("unnamed");
    expect(slotFor(8)).toMatchObject({
      category: "explicit_recommendation",
      reportAssessmentClass: "recommendation",
      compatibilityCustomerFacingLabel: "Fakta bisnis",
      compatibilityMeasurementPurpose:
        "Whether the business identity, scope, location, opening hours, or other public facts are consistent",
      compatibilityReportAssessmentClass: "information",
    });
    expect(slotFor(8).compatibilityMeasurementPurpose).not.toContain(
      "recommends",
    );
    expect(slotFor(9)).toMatchObject({
      category: "direct_comparison",
      reportAssessmentClass: "comparison",
      compatibilityCustomerFacingLabel: "Langkah berikutnya",
      compatibilityMeasurementPurpose:
        "How a customer can take the next practical step or contact the business",
      compatibilityReportAssessmentClass: "information",
    });
    expect(slotFor(9).compatibilityMeasurementPurpose).not.toContain(
      "compares",
    );
    expect(slotFor(10)).toMatchObject({
      category: "fit_misfit",
      reportAssessmentClass: "recommendation",
      compatibilityCustomerFacingLabel: "Langkah berikutnya",
      compatibilityMeasurementPurpose:
        "Whether another practical offering, facility, or selection detail is available",
      compatibilityReportAssessmentClass: "information",
    });
    expect(slotFor(10).compatibilityMeasurementPurpose).not.toContain("suits");
  });

  it("resolves every supported prompt identifier to one matrix-owned slot", () => {
    AUDIT_MEASUREMENT_MATRIX.forEach((slot) => {
      expect(measurementSlotForPromptId(slot.id)).toBe(slot);
      expect(
        measurementSlotForPromptId(
          `NVA-ID-${String(slot.order).padStart(2, "0")}`,
        ),
      ).toBe(slot);
      expect(
        measurementSlotForPromptId(
          `NVA-FIKTIF-001-Q${String(slot.order).padStart(2, "0")}`,
        ),
      ).toBe(slot);
    });
    expect(
      measurementSlotForPromptId("not-a-canonical-prompt"),
    ).toBeUndefined();
  });

  it("gives every slot exactly one report assessment path while keeping 5/5 compatibility", () => {
    expect(COMPATIBILITY_COMPOSITION_COUNTS).toEqual({
      unbranded: 5,
      branded: 5,
    });
    expect(
      AUDIT_MEASUREMENT_MATRIX.every((slot) =>
        measurementSlotsForAssessmentClass(slot.reportAssessmentClass).some(
          (candidate) => candidate.id === slot.id,
        ),
      ),
    ).toBe(true);
    expect(
      AUDIT_MEASUREMENT_MATRIX.flatMap((slot) =>
        measurementSlotsForAssessmentClass(slot.reportAssessmentClass).filter(
          (candidate) => candidate.id === slot.id,
        ),
      ),
    ).toHaveLength(AUDIT_MEASUREMENT_MATRIX.length);
  });
});

describe("R-10 comparison relation predicate", () => {
  it.each([
    "Bandingkan Kopi Taman Senja dengan Kopi Pesaing.",
    "Apa perbedaan Kopi Taman Senja dan Kopi Pesaing?",
    "Apa bedanya Kopi Taman Senja dan Kopi Pesaing?",
    "Mana yang lebih nyaman untuk meeting, Kopi Taman Senja atau Kopi Pesaing?",
    "Kalau buat nongkrong lama, mending Kopi Taman Senja atau Kopi Pesaing?",
    "Antara Kopi Taman Senja dan Kopi Pesaing, mana yang lebih cocok?",
  ])("accepts a relation form: %s", (question) => {
    expect(hasIndonesianComparisonRelation(question, brief)).toBe(true);
  });

  it.each([
    "Apakah Kopi Taman Senja dan Kopi Pesaing buka lebih dari 8 jam?",
    "Di mana alamat Kopi Taman Senja dan Kopi Pesaing?",
    "Apakah Kopi Taman Senja buka lebih dari 8 jam atau tidak, dan di mana alamat Kopi Pesaing?",
  ])("rejects a non-relation form: %s", (question) => {
    expect(hasIndonesianComparisonRelation(question, brief)).toBe(false);
  });
});

describe("R-06 canonical identity agreement", () => {
  it("accepts a complete 6/4 pack", () => {
    expect(
      validateCanonicalIndonesianQuestionPack(canonicalQuestions, brief),
    ).toEqual([]);
  });

  it("rejects audited-brand identity in every matrix-forbidden slot", () => {
    AUDIT_MEASUREMENT_MATRIX.filter(
      (slot) => slot.auditedBrandIdentity === "forbidden",
    ).forEach((slot) => {
      const errors = errorsWithQuestion(
        canonicalQuestions,
        slot.order,
        `Apakah Kopi Taman Senja cocok untuk ${brief.category}?`,
      );
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            slot: slot.order,
            rule: "identity_leakage",
          }),
        ]),
      );
    });
  });

  it("rejects a missing audited-brand identity in every required slot", () => {
    AUDIT_MEASUREMENT_MATRIX.filter(
      (slot) => slot.auditedBrandIdentity === "required",
    ).forEach((slot) => {
      const errors = errorsWithQuestion(
        canonicalQuestions,
        slot.order,
        "Apa yang cocok untuk kebutuhan warga Depok?",
      );
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            slot: slot.order,
            rule: "identity_requirement",
          }),
        ]),
      );
    });
  });

  it("rejects comparison-target leakage outside slot 9 and omission in slot 9", () => {
    const firstForbiddenTargetSlot = AUDIT_MEASUREMENT_MATRIX.find(
      (slot) => slot.comparisonTargetIdentity === "forbidden",
    );
    const directComparison = AUDIT_MEASUREMENT_MATRIX.find(
      (slot) => slot.category === "direct_comparison",
    );
    if (!firstForbiddenTargetSlot || !directComparison) {
      throw new Error("The canonical comparison slots are missing.");
    }
    const leaked = errorsWithQuestion(
      canonicalQuestions,
      firstForbiddenTargetSlot.order,
      "Kopi Pesaing cocok untuk kebutuhan warga Depok?",
    );
    expect(leaked).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slot: firstForbiddenTargetSlot.order,
          rule: "competitor_leakage",
        }),
      ]),
    );

    const missing = errorsWithQuestion(
      canonicalQuestions,
      directComparison.order,
      "Bandingkan Kopi Taman Senja dengan pilihan lain untuk warga Depok.",
    );
    expect(missing).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slot: directComparison.order,
          rule: "identity_requirement",
        }),
        expect.objectContaining({
          slot: directComparison.order,
          rule: "comparison_relation",
        }),
      ]),
    );
  });

  it("rejects the comparison target in every matrix-forbidden slot", () => {
    AUDIT_MEASUREMENT_MATRIX.filter(
      (slot) => slot.comparisonTargetIdentity === "forbidden",
    ).forEach((slot) => {
      const errors = errorsWithQuestion(
        canonicalQuestions,
        slot.order,
        "Kopi Pesaing cocok untuk kebutuhan warga Depok?",
      );
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            slot: slot.order,
            rule: "competitor_leakage",
          }),
        ]),
      );
    });
  });

  it("rejects a known audited-brand variant in a forbidden slot", () => {
    const firstForbiddenBrandSlot = AUDIT_MEASUREMENT_MATRIX.find(
      (slot) => slot.auditedBrandIdentity === "forbidden",
    );
    if (!firstForbiddenBrandSlot) {
      throw new Error("The canonical forbidden-brand slots are missing.");
    }
    const variantBrief = { ...brief, brand_name_variants: ["Taman Senja"] };
    const errors = errorsWithQuestion(
      canonicalQuestions,
      firstForbiddenBrandSlot.order,
      "Apakah Taman Senja cocok untuk kebutuhan warga Depok?",
      variantBrief,
    );
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slot: firstForbiddenBrandSlot.order,
          rule: "identity_leakage",
        }),
      ]),
    );
  });

  it("rejects slot 6 when either forbidden identity is present", () => {
    const openComparison = AUDIT_MEASUREMENT_MATRIX.find(
      (slot) => slot.category === "open_comparison",
    );
    if (!openComparison)
      throw new Error("The open-comparison slot is missing.");
    const errors = errorsWithQuestion(
      canonicalQuestions,
      openComparison.order,
      "Bandingkan Kopi Taman Senja dengan Kopi Pesaing?",
    );
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slot: openComparison.order,
          rule: "identity_leakage",
        }),
        expect.objectContaining({
          slot: openComparison.order,
          rule: "competitor_leakage",
        }),
      ]),
    );
  });

  it("rejects a pack whose final text is not the matrix's 6/4 composition", () => {
    const sevenUnnamed = canonicalQuestions.map((question, index) =>
      index === 9
        ? "Apa yang perlu diketahui sebelum memilih kedai kopi?"
        : question,
    );
    expect(
      validateCanonicalIndonesianQuestionPack(sevenUnnamed, brief),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slot: null, rule: "composition" }),
      ]),
    );
  });

  it.todo(
    "R-06 rule 6(b): a slot-9 fallback question satisfies target and relation after A3 flips the composition",
  );
});

describe("R-13 comparison-target projection", () => {
  it("keeps a name-only category fallback and its empty URL", () => {
    const fallbackName = categoryComparisonFallbackName(brief.category);
    const fallbackBrief = {
      ...brief,
      comparison_business: { name: fallbackName, scope: "", source_url: "" },
    };
    const minimized = minimizeIndonesianBrief({
      brand_name: brief.brand_name,
      entity_scope: brief.scope,
      brand_type: "Kedai kopi",
      category: brief.category,
      market_context: brief.scope,
      target_customer: brief.customer_context,
      official_sources: brief.official_source_urls,
      verified_offerings: brief.offerings,
      verified_customer_needs: brief.customer_needs,
      verified_decision_criteria: brief.decision_considerations,
      verified_competitor: fallbackBrief.comparison_business,
      brand_name_variants: brief.brand_name_variants,
      priority_offering: brief.offerings[0],
      conversion_action: brief.conversion_action,
      customer_supplied_facts: [],
      known_accuracy_questions: [],
      usp: brief.differentiator,
      regulated_category_notes: "",
      language: "en-US",
      agency_name: "",
      agency_logo_data_url: "",
    });

    expect(minimized.comparison_business).toEqual({
      name: fallbackName,
      scope: "",
      source_url: "",
    });
    expect(isCategoryComparisonFallback(minimized)).toBe(true);

    const legacyWithFallback = legacyQuestions.slice();
    legacyWithFallback[0] =
      "Ada alternatif lain di kategori Kedai kopi untuk warga Depok?";
    legacyWithFallback[5] =
      "Bandingkan Kopi Taman Senja dengan alternatif lain di kategori Kedai kopi di Depok.";
    expect(
      validateIndonesianQuestionPack(legacyWithFallback, minimized),
    ).toEqual([]);
    expect(
      generatedSuggestionGuardIssues(legacyWithFallback, minimized),
    ).not.toContain("compact_competitor_leakage:1");
  });

  it("preserves a URL-backed target exactly", () => {
    const projected = minimizeIndonesianBrief({
      brand_name: brief.brand_name,
      entity_scope: brief.scope,
      brand_type: "Kedai kopi",
      category: brief.category,
      market_context: brief.scope,
      target_customer: brief.customer_context,
      official_sources: brief.official_source_urls,
      verified_offerings: brief.offerings,
      verified_customer_needs: brief.customer_needs,
      verified_decision_criteria: brief.decision_considerations,
      verified_competitor: brief.comparison_business!,
      brand_name_variants: brief.brand_name_variants,
      priority_offering: brief.offerings[0],
      conversion_action: brief.conversion_action,
      customer_supplied_facts: [],
      known_accuracy_questions: [],
      usp: brief.differentiator,
      regulated_category_notes: "",
      language: "en-US",
      agency_name: "",
      agency_logo_data_url: "",
    }).comparison_business;
    if (!projected) throw new Error("The URL-backed target was not projected.");
    expect(projected).toEqual(brief.comparison_business);
  });
});
