import { describe, expect, it } from "vitest";
import { z } from "zod";
import { businessBriefSchema, type BusinessBrief } from "./types";
import { AUDIT_MEASUREMENT_MATRIX } from "./measurement-matrix";
import {
  V3_CONTEXT_MAP_VERSION,
  V3_FACTS_ADAPTER_VERSION,
  V3_INPUT_CORRECTION_REQUIRED,
  classifyPromptsBriefParseFailure,
  effectiveV3Context,
  projectV3ConfirmedFacts,
  v3FactsDeficiencies,
  v3FactsFingerprint,
  v3FactsRevisionChanged,
  type V3ContextField,
} from "./questions-id-v3-context";

// ---------------------------------------------------------------------------
// G1 fixtures: fictional Depok laundry service (NVA-G1-FIKTIF-001) and sparse
// variants. All names, URLs, and facts are fictional.
// ---------------------------------------------------------------------------

function makeBrief(overrides: Partial<BusinessBrief> = {}): BusinessBrief {
  return {
    brand_name: "Laundry Bersih Kilat",
    entity_scope: "Seluruh brand Laundry Bersih Kilat",
    brand_type: "jasa laundry",
    category: "Jasa laundry kiloan",
    market_context: "Kota Depok dan sekitarnya",
    target_customer: "Keluarga dan pekerja kantoran di Depok",
    official_sources: ["https://laundrybersihkilat.example"],
    verified_offerings: ["Cuci kiloan", "Cuci satuan", "Antar jemput"],
    verified_customer_needs: [
      "Pakaian bersih tanpa repot",
      "Hemat waktu di hari kerja",
    ],
    verified_decision_criteria: [
      "Bisa antar jemput ke rumah",
      "Harga per kilo jelas",
    ],
    verified_competitor: {
      name: "Laundry Melati",
      scope: "Depok",
      source_url: "",
    },
    brand_name_variants: ["LBK"],
    priority_offering: "Cuci kiloan",
    conversion_action: "Hubungi laundry melalui telepon atau WhatsApp resmi.",
    customer_supplied_facts: [],
    known_accuracy_questions: [],
    usp: "Antar jemput gratis untuk area Depok",
    regulated_category_notes: "",
    language: "en-US",
    agency_name: "",
    agency_logo_data_url: "",
    service_areas: ["Depok", "Beji", "Margonda"],
    service_channels: ["Antar jemput ke rumah", "Datang ke outlet"],
    ...overrides,
  };
}

const depokBrief = makeBrief();

const fieldValues = (slotOrder: number, brief = depokBrief) => {
  const context = effectiveV3Context(projectV3ConfirmedFacts(brief), slotOrder);
  return new Map(context.items.map((item) => [item.field, item]));
};

const suppliedValue = (
  slotOrder: number,
  field: V3ContextField,
  brief = depokBrief,
) => fieldValues(slotOrder, brief).get(field);

// ---------------------------------------------------------------------------
// §3.1 adapter — projection shape
// ---------------------------------------------------------------------------

describe("§3.1 facts adapter — projection", () => {
  it("projects the confirmed brief into the versioned v3 representation", () => {
    const facts = projectV3ConfirmedFacts(depokBrief);
    expect(facts.adapterVersion).toBe(V3_FACTS_ADAPTER_VERSION);
    expect(facts.entityType).toBe("service");
    expect(facts.category).toBe("Jasa laundry kiloan");
    expect(facts.businessType).toBe("jasa laundry");
    expect(facts.offerings).toContain("Cuci kiloan");
    expect(facts.targetCustomer).toContain("Depok");
    expect(facts.customerNeeds).toContain("Pakaian bersih tanpa repot");
    expect(facts.marketContext.description).toBe("Kota Depok dan sekitarnya");
    expect(facts.marketContext.servedAreas).toEqual([
      "Depok",
      "Beji",
      "Margonda",
    ]);
    expect(facts.serviceChannels).toContain("Antar jemput ke rumah");
    expect(facts.comparator).toEqual({
      name: "Laundry Melati",
      scope: "Depok",
      sourceUrl: "",
    });
    expect(facts.identity.primaryName).toBe("Laundry Bersih Kilat");
    expect(facts.identity.aliases).toEqual(["LBK"]);
    expect(facts.identity.sourceHosts).toEqual(["laundrybersihkilat.example"]);
    expect(facts.excludedSensitiveFacts).toBe(0);
  });

  it("keeps entityScope separate from identity across all three scope kinds", () => {
    expect(projectV3ConfirmedFacts(depokBrief).entityScope).toEqual({
      kind: "whole_brand",
      value: "",
    });
    expect(
      projectV3ConfirmedFacts(
        makeBrief({ entity_scope: "Cabang: Depok Timur" }),
      ).entityScope,
    ).toEqual({ kind: "single_location", value: "Depok Timur" });
    expect(
      projectV3ConfirmedFacts(
        makeBrief({ entity_scope: "Produk: Cuci kiloan" }),
      ).entityScope,
    ).toEqual({ kind: "offering", value: "Cuci kiloan" });
  });

  it("types buyer constraints and marks only the access/fulfilment subset", () => {
    const facts = projectV3ConfirmedFacts(depokBrief);
    const homeVisit = facts.buyerConstraints.find((constraint) =>
      constraint.value.includes("antar jemput"),
    );
    const price = facts.buyerConstraints.find((constraint) =>
      constraint.value.includes("Harga"),
    );
    expect(homeVisit).toMatchObject({
      provenance: "confirmed_abstraction",
      accessFulfilment: true,
    });
    expect(price).toMatchObject({
      provenance: "confirmed_abstraction",
      accessFulfilment: false,
    });
  });

  it("derives the market entity type conservatively and stays unknown otherwise", () => {
    expect(
      projectV3ConfirmedFacts(
        makeBrief({ brand_type: "kedai kopi", category: "Kedai kopi" }),
      ).entityType,
    ).toBe("venue");
    expect(
      projectV3ConfirmedFacts(
        makeBrief({ brand_type: "konsultan", category: "Konsultan pajak" }),
      ).entityType,
    ).toBe("professional");
    expect(
      projectV3ConfirmedFacts(
        makeBrief({ brand_type: "???", category: "Blorf mencap xyzzy" }),
      ).entityType,
    ).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// §3.2 effectiveV3Context — the versioned slot context map
// ---------------------------------------------------------------------------

describe("§3.2 effectiveV3Context", () => {
  it("gives slot 2 the confirmed Depok locality and home-visit channel", () => {
    const marketContext = suppliedValue(2, "marketContext");
    const channels = suppliedValue(2, "serviceChannels");
    expect(marketContext).toMatchObject({
      supplied: true,
      value: expect.objectContaining({
        description: "Kota Depok dan sekitarnya",
        servedAreas: expect.arrayContaining(["Depok"]),
      }),
    });
    expect(channels).toMatchObject({
      supplied: true,
      value: expect.arrayContaining(["Antar jemput ke rumah"]),
    });
    // Slot 2 also keeps its legacy occasion fields and shared scope.
    expect(suppliedValue(2, "customerNeeds")?.supplied).toBe(true);
    expect(suppliedValue(2, "entityScope")?.layers).toContain("shared");
  });

  it("gives slot 3 the approved verified customer need via slot addition", () => {
    const needs = suppliedValue(3, "customerNeeds");
    expect(needs).toMatchObject({
      supplied: true,
      layers: ["slot"],
      value: expect.arrayContaining(["Pakaian bersih tanpa repot"]),
    });
  });

  it("gives slots 1 and 4–10 no slot-specific additions", () => {
    for (const order of [1, 4, 5, 6, 7, 8, 9, 10]) {
      const withSlotLayer = fieldValues(order)
        .values()
        .filter((item) => item.layers.includes("slot"))
        .map((item) => item.field);
      expect([...withSlotLayer]).toEqual([]);
    }
  });

  it("keeps absent channels absent and invents no defaults", () => {
    const brief = makeBrief({
      service_areas: undefined,
      service_channels: undefined,
    });
    for (let order = 1; order <= 10; order += 1) {
      const channels = suppliedValue(order, "serviceChannels", brief);
      expect(channels?.layers).toContain("shared");
      expect(channels?.supplied).toBe(false);
      expect(channels?.value).toBeUndefined();
    }
    const facts = projectV3ConfirmedFacts(brief);
    expect(facts.serviceChannels).toEqual([]);
    expect(facts.marketContext.servedAreas).toEqual([]);
  });

  it("shares only the access/fulfilment subset of buyer constraints", () => {
    // Slot 1 lacks verified_decision_criteria in its legacy allowlist, so it
    // sees constraints only through the shared layer — access/fulfilment only.
    const shared = suppliedValue(1, "buyerConstraints");
    expect(shared?.layers).toEqual(["shared"]);
    expect((shared?.value as { value: string }[]).map((c) => c.value)).toEqual([
      "Bisa antar jemput ke rumah",
    ]);
    // Slot 5's legacy allowlist carries the field — it sees every constraint.
    const legacy = suppliedValue(5, "buyerConstraints");
    expect(legacy?.layers).toContain("legacy");
    expect((legacy?.value as { value: string }[]).length).toBe(2);
  });

  it("permits identity only on named slots and the comparator only on slot 9", () => {
    for (let order = 1; order <= 10; order += 1) {
      const items = fieldValues(order);
      const named = order >= 7;
      expect(items.has("identity")).toBe(named);
      expect(items.has("comparator")).toBe(order === 9);
    }
    const comparator = suppliedValue(9, "comparator");
    expect(comparator?.value).toEqual({
      name: "Laundry Melati",
      scope: "Depok",
    });
  });

  it("never carries URLs, agency fields, target signals, or free text into context", () => {
    const brief = makeBrief({
      verified_competitor: {
        name: "Laundry Melati",
        scope: "Depok",
        source_url: "https://laundrymelati.example",
      },
      customer_supplied_facts: ["Pelanggan sering tanya soal weekend"],
      usp: "Berbeda dari yang lain",
      agency_name: "Agency X",
      agency_logo_data_url: "data:image/png;base64,AAAA",
    });
    for (let order = 1; order <= 10; order += 1) {
      const context = effectiveV3Context(projectV3ConfirmedFacts(brief), order);
      const serialized = JSON.stringify(context.items);
      expect(serialized).not.toContain("http");
      expect(serialized).not.toContain("data:image");
      expect(serialized).not.toContain("Agency X");
      expect(serialized).not.toContain("Berbeda dari yang lain");
      expect(serialized).not.toContain("Pelanggan sering tanya");
      for (const field of [
        "customer_supplied_facts",
        "similar_businesses",
        "usp",
        "conversion_action",
        "agency_name",
      ]) {
        expect(context.items.some((item) => item.field === field)).toBe(false);
      }
    }
  });

  it("keeps slot order, category, report class, and identity policy matrix-owned", () => {
    for (const slot of AUDIT_MEASUREMENT_MATRIX) {
      const context = effectiveV3Context(
        projectV3ConfirmedFacts(depokBrief),
        slot.order,
      );
      expect(context.mapVersion).toBe(V3_CONTEXT_MAP_VERSION);
      expect(context.slotId).toBe(slot.id);
      expect(context.category).toBe(slot.category);
      expect(context.reportAssessmentClass).toBe(slot.reportAssessmentClass);
      expect(context.auditedBrandIdentity).toBe(slot.auditedBrandIdentity);
      expect(context.comparisonTargetIdentity).toBe(
        slot.comparisonTargetIdentity,
      );
      expect(context.denials).toContain("unnamed_identity_leakage");
      expect(context.denials).toContain("unauthorized_comparator");
      expect(context.denials).toContain("target_fingerprinting");
      expect(context.denials).toContain("category_safety");
    }
  });

  it("supplies category-safety notes only on slots whose allowlist carries them", () => {
    const brief = makeBrief({
      category: "Klinik gigi",
      brand_type: "klinik",
      regulated_category_notes:
        "Kategori kesehatan: hindari klaim medis atau diagnosis.",
    });
    expect(suppliedValue(8, "categorySafety", brief)?.supplied).toBe(true);
    expect(suppliedValue(1, "categorySafety", brief)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Identity/privacy boundary
// ---------------------------------------------------------------------------

describe("identity and privacy", () => {
  it("drops sensitive customer-supplied free text from the projection", () => {
    const brief = makeBrief({
      customer_supplied_facts: [
        "Pelanggan menghubungi 081234567890 untuk pesanan",
        "Pelanggan sering bertanya soal jadwal",
      ],
    });
    const facts = projectV3ConfirmedFacts(brief);
    expect(facts.customerFacts).toEqual([
      {
        value: "Pelanggan sering bertanya soal jadwal",
        provenance: "customer_supplied",
      },
    ]);
    expect(facts.excludedSensitiveFacts).toBe(1);
  });

  it("keeps customer-supplied facts out of every slot context", () => {
    const brief = makeBrief({
      customer_supplied_facts: ["Jam sibuk biasanya Jumat malam"],
    });
    const facts = projectV3ConfirmedFacts(brief);
    expect(facts.customerFacts).toHaveLength(1);
    for (let order = 1; order <= 10; order += 1) {
      const context = effectiveV3Context(facts, order);
      expect(
        context.items.some(
          (item) =>
            typeof item.value === "string" && item.value.includes("Jam sibuk"),
        ),
      ).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Facts revision / fingerprint binding
// ---------------------------------------------------------------------------

describe("facts revision and fingerprint binding", () => {
  it("is stable for identical facts and changes on any fact change", () => {
    const fingerprint = v3FactsFingerprint(depokBrief);
    expect(v3FactsFingerprint(makeBrief())).toBe(fingerprint);
    expect(
      v3FactsRevisionChanged(
        depokBrief,
        makeBrief({ verified_offerings: ["Cuci kiloan"] }),
      ),
    ).toBe(true);
    expect(
      v3FactsRevisionChanged(
        depokBrief,
        makeBrief({ service_channels: ["Datang ke outlet"] }),
      ),
    ).toBe(true);
    expect(
      v3FactsRevisionChanged(
        depokBrief,
        makeBrief({
          verified_competitor: {
            ...depokBrief.verified_competitor,
            name: "Laundry Cempaka",
          },
        }),
      ),
    ).toBe(true);
    expect(
      v3FactsRevisionChanged(
        depokBrief,
        makeBrief({ entity_scope: "Cabang: Margonda" }),
      ),
    ).toBe(true);
  });

  it("does not churn on excluded non-facts", () => {
    expect(
      v3FactsRevisionChanged(
        depokBrief,
        makeBrief({
          agency_name: "Agency X",
          agency_logo_data_url: "data:image/png;base64,AAAA",
        }),
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §6.1 correction outcomes — post-parse sufficiency
// ---------------------------------------------------------------------------

describe("§6.1 sufficiency deficiencies", () => {
  it("reports no deficiencies on a sufficient confirmed brief", () => {
    expect(v3FactsDeficiencies(projectV3ConfirmedFacts(depokBrief))).toEqual(
      [],
    );
  });

  it("flags an offering scope whose value no confirmed offering covers", () => {
    const facts = projectV3ConfirmedFacts(
      makeBrief({ entity_scope: "Produk: Krim malam" }),
    );
    const deficiency = v3FactsDeficiencies(facts).find(
      (item) => item.kind === "scope_offering_conflict",
    );
    expect(deficiency).toMatchObject({
      outcome: V3_INPUT_CORRECTION_REQUIRED,
      screen: "product",
      field: "scopeValue",
    });
  });

  it("flags a location scope on a product-level entity as a conflict", () => {
    const facts = projectV3ConfirmedFacts(
      makeBrief({
        entity_scope: "Cabang: Kemang",
        brand_type: "produk skincare",
        category: "Produk skincare",
      }),
    );
    const deficiency = v3FactsDeficiencies(facts).find(
      (item) => item.kind === "role_scope_conflict",
    );
    expect(deficiency).toMatchObject({
      outcome: V3_INPUT_CORRECTION_REQUIRED,
      screen: "scope",
      field: "entity_scope",
    });
  });

  it("flags a confirmed home-visit channel with no known locality", () => {
    const facts = projectV3ConfirmedFacts(
      makeBrief({
        market_context: "Online di Indonesia",
        service_areas: undefined,
        service_channels: ["Teknisi datang ke rumah"],
      }),
    );
    const deficiency = v3FactsDeficiencies(facts).find(
      (item) => item.kind === "missing_locality",
    );
    expect(deficiency).toMatchObject({
      outcome: V3_INPUT_CORRECTION_REQUIRED,
      screen: "market",
      field: "market_context",
    });
  });

  it("does not flag missing locality for a product-level online brand", () => {
    const facts = projectV3ConfirmedFacts(
      makeBrief({
        brand_type: "produk skincare",
        category: "Produk skincare",
        market_context: "Online di Indonesia",
        service_areas: undefined,
        service_channels: undefined,
      }),
    );
    expect(
      v3FactsDeficiencies(facts).some(
        (item) => item.kind === "missing_locality",
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §6.1 / F-01 — correctable fact deficiency versus malformed transport
// ---------------------------------------------------------------------------

const requestSchema = z.object({ brief: businessBriefSchema });

describe("F-01 prompts-request classification", () => {
  const parseFailure = (input: unknown) => {
    const result = requestSchema.safeParse(input);
    expect(result.success).toBe(false);
    return result.error!;
  };

  it("maps a correctable missing-offering failure to the offerings screen", () => {
    const classification = classifyPromptsBriefParseFailure(
      parseFailure({
        brief: { ...depokBrief, verified_offerings: [] },
      }),
    );
    expect(classification.outcome).toBe(V3_INPUT_CORRECTION_REQUIRED);
    if (classification.outcome !== V3_INPUT_CORRECTION_REQUIRED) return;
    expect(classification.targets).toEqual([
      expect.objectContaining({
        field: "verified_offerings",
        screen: "offerings",
      }),
    ]);
  });

  it("maps a bad official-source URL to the brand-confirm screen", () => {
    const classification = classifyPromptsBriefParseFailure(
      parseFailure({
        brief: { ...depokBrief, official_sources: ["bukan url"] },
      }),
    );
    expect(classification.outcome).toBe(V3_INPUT_CORRECTION_REQUIRED);
    if (classification.outcome !== V3_INPUT_CORRECTION_REQUIRED) return;
    expect(classification.targets).toEqual([
      expect.objectContaining({
        field: "official_sources",
        screen: "brand-confirm",
      }),
    ]);
  });

  it("routes a nested competitor failure to the comparison-target screen", () => {
    const classification = classifyPromptsBriefParseFailure(
      parseFailure({
        brief: {
          ...depokBrief,
          verified_competitor: { name: "", scope: "Depok", source_url: "" },
        },
      }),
    );
    expect(classification.outcome).toBe(V3_INPUT_CORRECTION_REQUIRED);
    if (classification.outcome !== V3_INPUT_CORRECTION_REQUIRED) return;
    expect(classification.targets).toEqual([
      expect.objectContaining({
        field: "verified_competitor.name",
        screen: "comparison-target",
      }),
    ]);
  });

  it("keeps malformed transport on the generic failure path", () => {
    for (const input of [
      { brief: { ...depokBrief, verified_offerings: "bukan array" } },
      { brief: { ...depokBrief, language: "id-ID" } },
      { brief: null },
      {},
    ]) {
      const classification = classifyPromptsBriefParseFailure(
        parseFailure(input),
      );
      expect(classification.outcome).toBe("malformed_request");
    }
  });
});
