import { describe, expect, it } from "vitest";
import { parseSourceInput } from "./source-input";
import {
  acceptComparisonTarget,
  applyBriefFieldChange,
  applyScopeSelection,
  createWorkflowMeta,
  deriveComparisonProposal,
  mergeExtractionIntoBrief,
  parseWorkflowStorageState,
  validateBriefForReview,
  WORKFLOW_SCHEMA_VERSION,
  type WorkflowMeta,
} from "./workflow-authority";
import {
  minimizeIndonesianBrief,
  buildDeterministicIndonesianPack,
} from "./questions-id";
import {
  businessBriefSchema,
  type BusinessBrief,
  type ExtractionDraft,
} from "./types";
import { createInitialExtractedAuditWorkflowState } from "./workflow-storage";

const baseBrief: BusinessBrief = {
  brand_name: "Kopi Taman Senja",
  entity_scope: "Seluruh brand Kopi Taman Senja",
  brand_type: "Kedai kopi",
  category: "Kedai kopi",
  market_context: "Bandung, Indonesia",
  target_customer: "Pekerja remote di Bandung",
  official_sources: ["https://kopitamansenja.example/"],
  verified_offerings: ["Kopi lokal", "Ruang kerja"],
  verified_customer_needs: ["tempat untuk bekerja"],
  verified_decision_criteria: ["lokasi", "koneksi internet"],
  verified_competitor: { name: "", scope: "", source_url: "" },
  similar_businesses: [],
  brand_name_variants: [],
  priority_offering: "Kopi lokal",
  conversion_action:
    "Hubungi bisnis melalui sumber resmi untuk informasi lebih lanjut.",
  customer_supplied_facts: [],
  known_accuracy_questions: [],
  usp: "",
  regulated_category_notes: "",
  language: "en-US",
  agency_name: "",
  agency_logo_data_url: "",
};

const extraction: ExtractionDraft = {
  brand_name: "Kopi Taman Senja",
  entity_scope: "Lokasi lama",
  brand_type: "Kedai kopi",
  category: "Kedai kopi",
  market_context: "Bandung, Indonesia",
  target_customer: "Pekerja remote",
  official_sources: ["https://new-source.example/about"],
  verified_offerings: ["Kopi lokal"],
  verified_customer_needs: ["tempat untuk bekerja"],
  verified_decision_criteria: ["lokasi"],
  similar_businesses: [
    { name: "Kopi Pembanding", source_url: "", origin: "ai" },
  ],
  brand_name_variants: [],
  priority_offering: "ignored by authority",
  conversion_action: "ignored by authority",
  customer_supplied_facts: [],
  known_accuracy_questions: ["must be dropped"],
  usp: "",
  regulated_category_notes: "ignored by authority",
  evidence: [],
  warnings: [],
};

function validMeta(brief = baseBrief): WorkflowMeta {
  return createWorkflowMeta(brief);
}

describe("B1 source authority", () => {
  it("accepts official websites and Instagram profiles through parseSourceInput", () => {
    expect(
      parseSourceInput("https://kopitamansenja.example/")?.sourceType,
    ).toBe("website");
    expect(parseSourceInput("@kopitamansenja")).toEqual({
      sourceType: "instagram",
      normalizedUrl: "https://instagram.com/kopitamansenja",
    });
  });

  it.each([
    "Kopi Taman Senja",
    "https://maps.google.com/?q=Kopi+Taman+Senja",
    "https://www.google.com/maps/place/Kopi+Taman+Senja",
  ])("rejects unsupported or brand-only source input: %s", (value) => {
    expect(parseSourceInput(value)).toBeNull();
  });
});

describe("B1 brief contract", () => {
  it.each([
    ["verified_customer_needs", { verified_customer_needs: [] }],
    ["verified_decision_criteria", { verified_decision_criteria: [] }],
    ["verified_competitor.name", { verified_competitor: { name: "" } }],
  ])("requires %s", (_field, override) => {
    const candidate = { ...baseBrief, ...override } as BusinessBrief;
    const competitor = (override as Partial<BusinessBrief>).verified_competitor;
    if (competitor) {
      candidate.verified_competitor = {
        ...baseBrief.verified_competitor,
        ...competitor,
      };
    }
    expect(businessBriefSchema.safeParse(candidate).success).toBe(false);
  });

  it("does not accept Google Maps as an official intake source", () => {
    expect(
      businessBriefSchema.safeParse({
        ...baseBrief,
        official_sources: ["https://maps.google.com/?q=Kopi"],
        verified_competitor: {
          name: "Peer Coffee",
          scope: "",
          source_url: "",
        },
      }).success,
    ).toBe(false);
  });
});

describe("B1 comparison target authority", () => {
  it("turns the first usable suggestion into a proposal without confirming it", () => {
    const brief = {
      ...baseBrief,
      similar_businesses: [
        { name: "", source_url: "", origin: "ai" as const },
        { name: "Kopi Pembanding", source_url: "", origin: "ai" as const },
        {
          name: "Later Business",
          source_url: "https://later.example/",
          origin: "ai" as const,
        },
      ],
    };
    const proposal = deriveComparisonProposal(brief);
    expect(proposal).toEqual({
      kind: "suggestion",
      name: "Kopi Pembanding",
      scope: "",
      source_url: "",
    });
    expect(brief.verified_competitor.name).toBe("");
  });

  it("offers the exact category fallback when there are no usable suggestions", () => {
    const proposal = deriveComparisonProposal(baseBrief);
    expect(proposal).toEqual({
      kind: "category_fallback",
      name: "alternatif lain di kategori Kedai kopi",
      scope: "",
      source_url: "",
    });
    const accepted = acceptComparisonTarget(baseBrief, validMeta(), proposal);
    expect(accepted.brief.verified_competitor).toEqual({
      name: "alternatif lain di kategori Kedai kopi",
      scope: "",
      source_url: "",
    });
  });

  it("writes the target only after explicit customer acceptance", () => {
    const accepted = acceptComparisonTarget(baseBrief, validMeta(), {
      kind: "suggestion",
      name: "Kopi Pembanding",
      scope: "Bandung",
      source_url: "",
    });
    expect(accepted.brief.verified_competitor).toEqual({
      name: "Kopi Pembanding",
      scope: "Bandung",
      source_url: "",
    });
    expect(accepted.meta.comparisonStatus).toBe("confirmed");
  });

  it("preserves a name-only comparator through the A3 Indonesian projection", () => {
    const accepted = acceptComparisonTarget(baseBrief, validMeta(), {
      kind: "replacement",
      name: "Kopi Pembanding",
      scope: "Bandung",
      source_url: "",
    });
    const minimized = minimizeIndonesianBrief(accepted.brief);
    expect(minimized.comparison_business).toEqual({
      name: "Kopi Pembanding",
      scope: "Bandung",
      source_url: "",
    });
    const pack = buildDeterministicIndonesianPack(minimized);
    expect(pack).toHaveLength(10);
    expect(
      pack.slice(0, 6).every((item) => !item.includes("Kopi Taman Senja")),
    ).toBe(true);
  });
});

describe("B1 scope, invalidation, and review routing", () => {
  it("stores branch and product choices only in canonical entity_scope and drops stale names", () => {
    const branch = applyScopeSelection(
      baseBrief,
      validMeta(),
      "branch",
      "Dago",
    );
    expect(branch.brief.entity_scope).toBe("Cabang: Dago");
    const product = applyScopeSelection(
      branch.brief,
      branch.meta,
      "product",
      "Kopi susu",
    );
    expect(product.brief.entity_scope).toBe("Produk: Kopi susu");
    expect(product.brief.entity_scope).not.toContain("Dago");
    expect(product.brief.verified_offerings).toEqual([]);
    expect(product.brief.market_context).toBe("");
    expect(product.meta.marketInvalidated).toBe(true);
  });

  it("invalidates and re-proposes a comparison target after category changes", () => {
    const accepted = acceptComparisonTarget(baseBrief, validMeta(), {
      kind: "replacement",
      name: "Kopi Pembanding",
      scope: "Bandung",
      source_url: "https://peer.example/",
    });
    const changed = applyBriefFieldChange(
      accepted.brief,
      accepted.meta,
      "category",
      "Ruang kerja bersama",
    );
    expect(changed.brief.verified_competitor).toEqual(
      accepted.brief.verified_competitor,
    );
    expect(changed.meta.comparisonStatus).toBe("needs_reconfirmation");
    expect(changed.meta.comparisonProposal?.name).toBe(
      "alternatif lain di kategori Ruang kerja bersama",
    );
    expect(changed.brief.similar_businesses).toEqual([]);
    expect(changed.brief.conversion_action).not.toBe(
      accepted.brief.conversion_action,
    );
  });

  it("routes required validation to real owning screens instead of schema paths", () => {
    const invalid = {
      ...baseBrief,
      verified_offerings: [],
      verified_customer_needs: [],
      verified_decision_criteria: [],
      verified_competitor: { name: "", scope: "", source_url: "" },
    };
    const issues = validateBriefForReview(invalid, {
      ...validMeta(invalid),
      comparisonStatus: "pending",
    });
    expect(issues.map((issue) => issue.screen)).toEqual([
      "customer-reasons",
      "customer-reasons",
      "offerings",
      "comparison-target",
    ]);
    expect(issues.every((issue) => !issue.message.includes("verified_"))).toBe(
      true,
    );
  });

  it("routes nested comparison URL validation to the editable comparison screen", () => {
    const candidate = {
      ...baseBrief,
      verified_competitor: {
        name: "Peer Coffee",
        scope: "Bandung",
        source_url: "not a URL",
      },
    };
    const issues = validateBriefForReview(candidate, validMeta(candidate));
    expect(issues[0]).toEqual({
      field: "verified_competitor.source_url",
      screen: "comparison-target",
      message:
        "Periksa URL bisnis pembanding, atau kosongkan jika Anda hanya memiliki namanya.",
    });
  });

  it("routes a stale entity scope to the scope owner", () => {
    const branch = applyScopeSelection(
      baseBrief,
      validMeta(),
      "branch",
      "Dago",
    );
    const issues = validateBriefForReview(
      { ...branch.brief, entity_scope: "Cabang: Stale location" },
      branch.meta,
    );
    expect(issues[0]).toEqual({
      field: "entity_scope",
      screen: "branch",
      message: "Perbarui cakupan agar sesuai dengan pilihan entitas ini.",
    });
  });
});

describe("B1 persistence and extraction ownership", () => {
  it("accepts only the new workflow schema and rejects old state", () => {
    expect(parseWorkflowStorageState({ version: 7 })).toBeNull();
    expect(
      parseWorkflowStorageState({
        version: WORKFLOW_SCHEMA_VERSION - 1,
        websiteUrl: "",
      }),
    ).toBeNull();
  });

  it("replaces the source draft once while preserving customer-owned fields", () => {
    const current = { ...baseBrief, usp: "Customer fact" };
    const result = mergeExtractionIntoBrief({
      currentBrief: current,
      currentMeta: {
        ...validMeta(current),
        customerEditedFields: ["usp"],
      },
      draft: extraction,
      acceptedSourceUrl: "https://new-source.example/",
    });
    expect(result.brief.official_sources).toEqual([
      "https://new-source.example/",
      "https://new-source.example/about",
    ]);
    expect(result.brief.usp).toBe("Customer fact");
    expect(result.brief.known_accuracy_questions).toEqual([]);
    expect(result.brief.agency_name).toBe("");
    expect(result.meta.comparisonStatus).toBe("pending");
    expect(result.meta.comparisonProposal?.name).toBe("Kopi Pembanding");
  });

  it("rejects v9 state with stale derived fields or malformed metadata", () => {
    const validState = createInitialExtractedAuditWorkflowState({
      websiteUrl: "https://new-source.example/",
      draft: extraction,
      telemetry: [],
    });
    expect(parseWorkflowStorageState(validState)).toEqual(validState);
    expect(
      parseWorkflowStorageState({
        ...validState,
        brief: { ...validState.brief, conversion_action: "stale default" },
      }),
    ).toBeNull();
    expect(
      parseWorkflowStorageState({
        ...validState,
        meta: { ...validState.meta, marketInvalidated: undefined },
      }),
    ).toBeNull();
  });

  it("preserves a customer-owned comparison target for reconfirmation after source replacement", () => {
    const current = {
      ...baseBrief,
      verified_competitor: {
        name: "Customer Chosen",
        scope: "Bandung",
        source_url: "",
      },
    };
    const result = mergeExtractionIntoBrief({
      currentBrief: current,
      currentMeta: {
        ...validMeta(current),
        customerEditedFields: ["verified_competitor"],
      },
      draft: extraction,
      acceptedSourceUrl: "https://new-source.example/",
    });
    expect(result.brief.verified_competitor).toEqual(
      current.verified_competitor,
    );
    expect(result.meta.comparisonStatus).toBe("needs_reconfirmation");
  });
});
