import type {
  BusinessBrief,
  CanonicalPromptCategory,
  LegacyPromptCategory,
} from "./types";

export const IDENTITY_POLICIES = ["forbidden", "required"] as const;
export type IdentityPolicy = (typeof IDENTITY_POLICIES)[number];

export const REPORT_ASSESSMENT_CLASSES = [
  "recommendation",
  "comparison",
  "information",
  "none",
] as const;
export type ReportAssessmentClass = (typeof REPORT_ASSESSMENT_CLASSES)[number];

/**
 * The closed relation vocabulary for the direct-comparison slot (R-10).
 * Matching is performed on complete normalized tokens; these are not
 * free-form synonyms. The property is attached to slot 9 only below.
 */
export const COMPARISON_RELATION_MARKERS = {
  direct: [
    "bandingkan",
    "dibandingkan",
    "membandingkan",
    "perbandingan",
    "dibanding",
    "banding",
    "versus",
    "vs",
    "daripada",
    "perbedaan",
    "berbeda",
    "membedakan",
    "beda",
    "bedanya",
  ],
  identityChoice: ["atau"],
  bracketed: ["antara", "lebih"],
} as const;

export type ComparisonRelationMarkers = typeof COMPARISON_RELATION_MARKERS;

export type PromptMeasurementSlot = {
  id: string;
  order: number;
  category: CanonicalPromptCategory;
  auditedBrandIdentity: IdentityPolicy;
  comparisonTargetIdentity: IdentityPolicy;
  measurementPurpose: string;
  customerFacingLabel: string;
  reportAssessmentClass: ReportAssessmentClass;
  generatorSlotDescription: string;
  /**
   * Compatibility projection for the still-running pre-A3 5/5 questions.
   * These fields describe the question that is actually executed today;
   * canonical R-01 fields above remain the A3 target semantics.
   */
  compatibilityCustomerFacingLabel: string;
  compatibilityMeasurementPurpose: string;
  compatibilityReportAssessmentClass: ReportAssessmentClass;
  allowedContextFields: readonly (keyof BusinessBrief)[];
  /**
   * Compatibility metadata for the still-running pre-A3 5/5 path. It is a
   * derived view of the old contract, not a second measurement authority.
   */
  legacyCategory: LegacyPromptCategory;
  legacyBranded: boolean;
  legacyAuditedBrandIdentity: IdentityPolicy;
  legacyComparisonTargetIdentity: IdentityPolicy;
  legacyRole: string;
  legacyAllowedContextFields: readonly (keyof BusinessBrief)[];
} & (
  | { comparisonRelationMarkers: ComparisonRelationMarkers }
  | { comparisonRelationMarkers?: never }
);

/**
 * Canonical ten-slot measurement definition (R-01/R-02).
 *
 * The first-class fields describe the approved V1 model: six unnamed slots,
 * four named slots, and one direct comparison slot that requires both parties
 * plus an explicit comparison relation. The `compatibility*` and `legacy*`
 * fields are bounded compatibility projections for the current 5/5
 * implementation while A2/A3 migrate its consumers and flip the composition.
 * They are kept in this same object so no policy is duplicated in a parallel
 * positional table.
 */
export const AUDIT_MEASUREMENT_MATRIX = [
  {
    id: "NUAVE-BRAND-NEED-01",
    order: 1,
    category: "category_recommendation",
    auditedBrandIdentity: "forbidden",
    comparisonTargetIdentity: "forbidden",
    measurementPurpose: "Which options exist in this category and context",
    customerFacingLabel: "Rekomendasi kategori",
    reportAssessmentClass: "recommendation",
    generatorSlotDescription:
      "Ask which options exist in the category and context without naming the audited business.",
    compatibilityCustomerFacingLabel: "Kebutuhan pelanggan",
    compatibilityMeasurementPurpose:
      "Which customer needs or category options the business could appear for before its name is mentioned",
    compatibilityReportAssessmentClass: "recommendation",
    allowedContextFields: [
      "category",
      "market_context",
      "target_customer",
      "verified_customer_needs",
    ],
    legacyCategory: "need_discovery",
    legacyBranded: false,
    legacyAuditedBrandIdentity: "forbidden",
    legacyComparisonTargetIdentity: "forbidden",
    legacyRole: "Explore one verified need without naming a brand",
    legacyAllowedContextFields: [
      "category",
      "market_context",
      "target_customer",
      "verified_customer_needs",
    ],
  },
  {
    id: "NUAVE-BRAND-NEED-02",
    order: 2,
    category: "situation",
    auditedBrandIdentity: "forbidden",
    comparisonTargetIdentity: "forbidden",
    measurementPurpose: "A real occasion that leads someone to look",
    customerFacingLabel: "Situasi pelanggan",
    reportAssessmentClass: "none",
    generatorSlotDescription:
      "Ask about a real customer situation or occasion without naming the audited business.",
    compatibilityCustomerFacingLabel: "Kebutuhan pelanggan",
    compatibilityMeasurementPurpose:
      "Which customer situations or needs prompt someone to look for category options before the business name is mentioned",
    compatibilityReportAssessmentClass: "recommendation",
    allowedContextFields: [
      "category",
      "target_customer",
      "verified_customer_needs",
      "verified_decision_criteria",
    ],
    legacyCategory: "need_discovery",
    legacyBranded: false,
    legacyAuditedBrandIdentity: "forbidden",
    legacyComparisonTargetIdentity: "forbidden",
    legacyRole: "Explore a different verified need without naming a brand",
    legacyAllowedContextFields: [
      "category",
      "target_customer",
      "verified_customer_needs",
      "verified_decision_criteria",
    ],
  },
  {
    id: "NUAVE-BRAND-SOLUTION-01",
    order: 3,
    category: "need_fit",
    auditedBrandIdentity: "forbidden",
    comparisonTargetIdentity: "forbidden",
    measurementPurpose: "A specific need and what suits it",
    customerFacingLabel: "Kesesuaian kebutuhan",
    reportAssessmentClass: "recommendation",
    generatorSlotDescription:
      "Ask which category options fit a specific verified customer need without naming the audited business.",
    compatibilityCustomerFacingLabel: "Pilihan layanan",
    compatibilityMeasurementPurpose:
      "Which category options fit a specific customer need before the business name is mentioned",
    compatibilityReportAssessmentClass: "recommendation",
    allowedContextFields: ["category", "market_context", "target_customer"],
    legacyCategory: "solution_discovery",
    legacyBranded: false,
    legacyAuditedBrandIdentity: "forbidden",
    legacyComparisonTargetIdentity: "forbidden",
    legacyRole: "Find relevant category options in the market context",
    legacyAllowedContextFields: [
      "category",
      "market_context",
      "target_customer",
    ],
  },
  {
    id: "NUAVE-BRAND-SOLUTION-02",
    order: 4,
    category: "offering_use_case",
    auditedBrandIdentity: "forbidden",
    comparisonTargetIdentity: "forbidden",
    measurementPurpose: "One concrete offering or use case",
    customerFacingLabel: "Penggunaan penawaran",
    reportAssessmentClass: "information",
    generatorSlotDescription:
      "Ask where a customer can find one concrete offering or use case without naming the audited business.",
    compatibilityCustomerFacingLabel: "Pilihan layanan",
    compatibilityMeasurementPurpose:
      "Where a customer can find a verified offering or use case before the business name is mentioned",
    compatibilityReportAssessmentClass: "recommendation",
    allowedContextFields: [
      "category",
      "market_context",
      "verified_offerings",
      "priority_offering",
    ],
    legacyCategory: "solution_discovery",
    legacyBranded: false,
    legacyAuditedBrandIdentity: "forbidden",
    legacyComparisonTargetIdentity: "forbidden",
    legacyRole: "Find options for one verified offering or use case",
    legacyAllowedContextFields: [
      "category",
      "market_context",
      "verified_offerings",
      "priority_offering",
    ],
  },
  {
    id: "NUAVE-BRAND-COMPARISON-01",
    order: 5,
    category: "shortlist",
    auditedBrandIdentity: "forbidden",
    comparisonTargetIdentity: "forbidden",
    measurementPurpose: "A short list a customer would consider",
    customerFacingLabel: "Daftar pilihan",
    reportAssessmentClass: "recommendation",
    generatorSlotDescription:
      "Ask which unnamed options belong on a realistic customer shortlist.",
    compatibilityCustomerFacingLabel: "Perbandingan",
    compatibilityMeasurementPurpose:
      "How relevant category options differ for the customer's criteria before the business name is mentioned",
    compatibilityReportAssessmentClass: "comparison",
    allowedContextFields: [
      "category",
      "market_context",
      "verified_decision_criteria",
    ],
    legacyCategory: "comparison",
    legacyBranded: false,
    legacyAuditedBrandIdentity: "forbidden",
    legacyComparisonTargetIdentity: "forbidden",
    legacyRole: "Compare unnamed category options using verified criteria",
    legacyAllowedContextFields: [
      "category",
      "market_context",
      "verified_decision_criteria",
    ],
  },
  {
    id: "NUAVE-BRAND-COMPARISON-02",
    order: 6,
    category: "open_comparison",
    auditedBrandIdentity: "forbidden",
    comparisonTargetIdentity: "forbidden",
    measurementPurpose: "Comparison among realistic unnamed options",
    customerFacingLabel: "Perbandingan terbuka",
    reportAssessmentClass: "comparison",
    generatorSlotDescription:
      "Ask the model to compare realistic unnamed options without naming either business.",
    compatibilityCustomerFacingLabel: "Perbandingan",
    compatibilityMeasurementPurpose:
      "How the audited business compares with one verified competitor for the customer's criteria",
    compatibilityReportAssessmentClass: "comparison",
    allowedContextFields: [
      "category",
      "market_context",
      "verified_decision_criteria",
    ],
    legacyCategory: "comparison",
    legacyBranded: true,
    legacyAuditedBrandIdentity: "required",
    legacyComparisonTargetIdentity: "required",
    legacyRole: "Compare the brand with one verified competitor",
    legacyAllowedContextFields: [
      "brand_name",
      "entity_scope",
      "category",
      "market_context",
      "verified_competitor",
      "verified_decision_criteria",
    ],
  },
  {
    id: "NUAVE-BRAND-VALIDATION-01",
    order: 7,
    category: "brand_fit",
    auditedBrandIdentity: "required",
    comparisonTargetIdentity: "forbidden",
    measurementPurpose: "Whether the business suits a stated need",
    customerFacingLabel: "Kesesuaian bisnis",
    reportAssessmentClass: "recommendation",
    generatorSlotDescription:
      "Ask whether the audited business fits a stated need, offering, or use case.",
    compatibilityCustomerFacingLabel: "Fakta bisnis",
    compatibilityMeasurementPurpose:
      "Whether the business provides a verified offering or fits the stated use case",
    compatibilityReportAssessmentClass: "information",
    allowedContextFields: [
      "brand_name",
      "entity_scope",
      "category",
      "verified_offerings",
      "priority_offering",
    ],
    legacyCategory: "validation",
    legacyBranded: true,
    legacyAuditedBrandIdentity: "required",
    legacyComparisonTargetIdentity: "forbidden",
    legacyRole: "Verify category fit, offering, or an important public fact",
    legacyAllowedContextFields: [
      "brand_name",
      "entity_scope",
      "category",
      "verified_offerings",
      "priority_offering",
    ],
  },
  {
    id: "NUAVE-BRAND-VALIDATION-02",
    order: 8,
    category: "explicit_recommendation",
    auditedBrandIdentity: "required",
    comparisonTargetIdentity: "forbidden",
    measurementPurpose: "Whether the model recommends the business",
    customerFacingLabel: "Rekomendasi langsung",
    reportAssessmentClass: "recommendation",
    generatorSlotDescription:
      "Ask directly whether the model recommends the audited business for the customer's need.",
    compatibilityCustomerFacingLabel: "Fakta bisnis",
    compatibilityMeasurementPurpose:
      "Whether the business identity, scope, location, opening hours, or other public facts are consistent",
    compatibilityReportAssessmentClass: "information",
    allowedContextFields: [
      "brand_name",
      "entity_scope",
      "category",
      "market_context",
      "official_sources",
      "regulated_category_notes",
    ],
    legacyCategory: "validation",
    legacyBranded: true,
    legacyAuditedBrandIdentity: "required",
    legacyComparisonTargetIdentity: "forbidden",
    legacyRole: "Verify identity, scope, market, or information consistency",
    legacyAllowedContextFields: [
      "brand_name",
      "entity_scope",
      "market_context",
      "official_sources",
      "known_accuracy_questions",
      "regulated_category_notes",
    ],
  },
  {
    id: "NUAVE-BRAND-ACTION-01",
    order: 9,
    category: "direct_comparison",
    auditedBrandIdentity: "required",
    comparisonTargetIdentity: "required",
    measurementPurpose: "The business against the comparison target",
    customerFacingLabel: "Perbandingan langsung",
    reportAssessmentClass: "comparison",
    generatorSlotDescription:
      "Compare the audited business with the supplied comparison target using an explicit relation.",
    allowedContextFields: [
      "brand_name",
      "entity_scope",
      "category",
      "market_context",
      "verified_competitor",
      "verified_decision_criteria",
    ],
    comparisonRelationMarkers: COMPARISON_RELATION_MARKERS,
    compatibilityCustomerFacingLabel: "Langkah berikutnya",
    compatibilityMeasurementPurpose:
      "How a customer can take the next practical step or contact the business",
    compatibilityReportAssessmentClass: "information",
    legacyCategory: "action",
    legacyBranded: true,
    legacyAuditedBrandIdentity: "required",
    legacyComparisonTargetIdentity: "forbidden",
    legacyRole: "Ask about a practical next step or access path",
    legacyAllowedContextFields: [
      "brand_name",
      "conversion_action",
      "official_sources",
    ],
  },
  {
    id: "NUAVE-BRAND-ACTION-02",
    order: 10,
    category: "fit_misfit",
    auditedBrandIdentity: "required",
    comparisonTargetIdentity: "forbidden",
    measurementPurpose: "Who it suits, who it does not, trade-offs",
    customerFacingLabel: "Kesesuaian dan ketidaksesuaian",
    reportAssessmentClass: "recommendation",
    generatorSlotDescription:
      "Ask who the audited business suits, who it may not suit, and what trade-offs matter.",
    compatibilityCustomerFacingLabel: "Langkah berikutnya",
    compatibilityMeasurementPurpose:
      "Whether another practical offering, facility, or selection detail is available",
    compatibilityReportAssessmentClass: "information",
    allowedContextFields: [
      "brand_name",
      "entity_scope",
      "category",
      "target_customer",
      "verified_offerings",
      "verified_decision_criteria",
    ],
    legacyCategory: "action",
    legacyBranded: true,
    legacyAuditedBrandIdentity: "required",
    legacyComparisonTargetIdentity: "forbidden",
    legacyRole: "Ask about another verified decision or conversion detail",
    legacyAllowedContextFields: [
      "brand_name",
      "priority_offering",
      "verified_decision_criteria",
      "conversion_action",
    ],
  },
] as const satisfies readonly PromptMeasurementSlot[];

export type CanonicalMeasurementSlot =
  (typeof AUDIT_MEASUREMENT_MATRIX)[number];

/** Slot lookup by order is an ordering operation, not a policy definition. */
export function measurementSlotForOrder(order: number) {
  return AUDIT_MEASUREMENT_MATRIX.find((slot) => slot.order === order);
}

export function measurementSlotForId(id: string) {
  return AUDIT_MEASUREMENT_MATRIX.find((slot) => slot.id === id);
}

/**
 * Resolve the transport identifiers used by the current English, Indonesian,
 * and fixture paths to their canonical measurement slot. The identifier format
 * is an adapter detail; measurement meaning always comes from the resolved
 * matrix row.
 */
export function measurementSlotForPromptId(promptId: string) {
  const normalized = promptId.trim();
  const direct = measurementSlotForId(normalized);
  if (direct) return direct;

  const transportMatch = /^(?:NVA-ID-(\d{2})|NVA-FIKTIF-\d+-Q(\d{2}))$/.exec(
    normalized,
  );
  if (!transportMatch) return undefined;

  return measurementSlotForOrder(
    Number(transportMatch[1] ?? transportMatch[2]),
  );
}

/** Slots grouped by their matrix-owned report interpretation path. */
export function measurementSlotsForAssessmentClass(
  assessmentClass: ReportAssessmentClass,
) {
  return AUDIT_MEASUREMENT_MATRIX.filter(
    (slot) => slot.reportAssessmentClass === assessmentClass,
  );
}

/** Slots grouped by their matrix-owned pre-A3 compatibility interpretation. */
export function measurementSlotsForCompatibilityAssessmentClass(
  assessmentClass: ReportAssessmentClass,
) {
  return AUDIT_MEASUREMENT_MATRIX.filter(
    (slot) => slot.compatibilityReportAssessmentClass === assessmentClass,
  );
}

/**
 * Temporary composition counts for the pre-A3 compatibility path. These are
 * derived from the matrix's compatibility projection and intentionally remain
 * five unnamed plus five named until A3 changes the supported pack.
 */
export const COMPATIBILITY_COMPOSITION_COUNTS = {
  unbranded: AUDIT_MEASUREMENT_MATRIX.filter((slot) => !slot.legacyBranded)
    .length,
  branded: AUDIT_MEASUREMENT_MATRIX.filter((slot) => slot.legacyBranded).length,
} as const;

export type LegacyPromptMatrixRow = readonly [
  id: string,
  category: LegacyPromptCategory,
  branded: boolean,
  role: string,
];

/**
 * Temporary compatibility projection for callers that still consume the old
 * four-item tuple. It is derived exclusively from the canonical matrix and is
 * not a place to define policy.
 */
export const PROMPT_MATRIX = AUDIT_MEASUREMENT_MATRIX.map(
  (slot) =>
    [
      slot.id,
      slot.legacyCategory,
      slot.legacyBranded,
      slot.legacyRole,
    ] as const,
) as readonly LegacyPromptMatrixRow[];
