import { describe, expect, it } from "vitest";
import { extractionDraftSchema } from "../audit/types";
import { directTenContextSchema } from "../audit/direct-ten-context-v2";
import { projectQuestionFactsV2 } from "../audit/question-facts-v3";
import { buildDirectTenWriterBrief } from "../audit/questions-id-direct-ten";
import {
  confirmSmartSelection,
  initialSmartSelection,
  prepareUnderstanding,
  requiredSmartGaps,
  unsafeSmartSelection,
  unsafeSmartSource,
} from "./smart-intake-contract";

function prepared() {
  return prepareUnderstanding({
    typedName: "Kedai Contoh",
    discoveredName: null,
    canonicalSource: "https://kedai-contoh.example/",
    draft: extractionDraftSchema.parse({
      brand_name: "Kedai Contoh",
      entity_scope: "",
      brand_type: "",
      category: "kedai kopi",
      market_context: "narasi tidak terstruktur",
      service_channels: ["on_premise", "delivery"],
      market_reach: "sekitar",
      market_areas: ["Bandung"],
      target_customer: "pekerja sekitar",
      official_sources: ["https://kedai-contoh.example/"],
      verified_offerings: ["kopi susu", "roti"],
      verified_customer_needs: ["minuman dekat kantor"],
      verified_decision_criteria: ["lokasi"],
      brand_name_variants: [],
      priority_offering: "",
      conversion_action: "",
      customer_supplied_facts: [],
      known_accuracy_questions: [],
      usp: "",
      regulated_category_notes: "",
      evidence: [],
      warnings: [],
    }),
  });
}

describe("smart intake exact confirmed meaning", () => {
  it("screens sensitive source credentials and selected text before persistence", () => {
    expect(unsafeSmartSource("https://kedai-contoh.example/")).toBe(false);
    expect(
      unsafeSmartSource("https://kedai-contoh.example/?token=private"),
    ).toBe(true);
    expect(unsafeSmartSource("https://user:pass@kedai-contoh.example/")).toBe(
      true,
    );
    const selection = initialSmartSelection(prepared());
    selection.publicFact = "nomor rekening 12345";
    expect(unsafeSmartSelection(selection)).toBe(true);
    const context = confirmSmartSelection(
      prepared(),
      initialSmartSelection(prepared()),
      1,
    ).context;
    expect(
      directTenContextSchema.safeParse({
        ...context,
        identity: {
          ...context.identity,
          source: "https://kedai-contoh.example/?token=private",
        },
      }).success,
    ).toBe(false);
    expect(
      directTenContextSchema.safeParse({
        ...context,
        publicFact: { value: "nomor rekening 12345", origin: "owner" },
      }).success,
    ).toBe(false);
  });
  it("confirms the rich case in one step and carries distinct optional meanings to the writer", () => {
    const proposal = prepared();
    const selection = initialSmartSelection(proposal);
    expect(requiredSmartGaps(selection)).toEqual([]);
    expect(selection.serviceChannels).toEqual(["on_premise", "delivery"]);
    expect(selection.marketReach).toBe("sekitar");
    expect(selection.marketAreas).toEqual(["Bandung"]);
    const frozen = confirmSmartSelection(proposal, selection, 1);
    expect(frozen.context.identity).toMatchObject({
      origin: "owner",
      sourceOrigin: "owner",
    });
    expect(frozen.context.comparators.value).toEqual({ mode: "unknown" });
    expect(frozen.context.targetCustomer?.value).toBe("pekerja sekitar");
    expect(frozen.context.decisionConsiderations?.value).toEqual(["lokasi"]);
    const projected = projectQuestionFactsV2({
      context: frozen.context,
      factVersion: 1,
    });
    expect(projected.status).toBe("projected");
    if (projected.status !== "projected") return;
    const writer = JSON.stringify(buildDirectTenWriterBrief(projected.facts));
    expect(writer).toContain("pekerja sekitar");
    expect(writer).toContain("lokasi");
    expect(writer).not.toContain("narasi tidak terstruktur");
    expect(writer).not.toContain("tidak diketahui");
  });

  it("carries the selected differentiator and each recorded origin into writer text", () => {
    const proposal = prepared();
    const selection = initialSmartSelection(proposal);
    selection.differentiator = "Racikan kopi musiman";
    selection.origins.differentiator = "owner";
    const frozen = confirmSmartSelection(proposal, selection, 1);
    const projected = projectQuestionFactsV2({
      context: frozen.context,
      factVersion: 1,
    });
    expect(projected.status).toBe("projected");
    if (projected.status !== "projected") return;
    expect(projected.facts.differentiator).toBe("Racikan kopi musiman");
    const writer = buildDirectTenWriterBrief(projected.facts);
    expect(writer).toContain(
      "Pembeda yang dipilih pelanggan: Racikan kopi musiman [asal: diberikan atau diubah pelanggan]",
    );
    expect(writer).toContain("Pelanggan: pekerja sekitar [asal: saran Nuave]");
    expect(writer).toContain(
      "Kategori: kedai kopi [asal: disiapkan dari sumber publik]",
    );
    expect(writer).toContain("confirmation does not independently verify it");
  });

  it("omits empty optional meaning, freezes product as the only offering, and clears market for a location", () => {
    const proposal = prepared();
    const selection = initialSmartSelection(proposal);
    selection.targetCustomer = "";
    selection.customerNeeds = [];
    selection.decisionConsiderations = [];
    selection.focus = "produk";
    selection.productTarget = "roti";
    const product = confirmSmartSelection(proposal, selection, 2).context;
    expect(product.offerings.value).toEqual(["roti"]);
    expect(product.targetCustomer).toBeUndefined();
    expect(product.customerNeeds).toBeUndefined();
    expect(product.decisionConsiderations).toBeUndefined();
    selection.focus = "cabang";
    selection.locationName = "Cabang Timur";
    selection.locationAddress = "Jl. Contoh 12";
    const location = confirmSmartSelection(proposal, selection, 3).context;
    expect(location.market).toBeNull();
    expect(location.category.value).toBe("kedai kopi");
    expect(location.offerings.value).toEqual(["kopi susu", "roti"]);
  });

  it("does not infer structured channel or area from prose when extraction leaves them empty", () => {
    const rich = prepared();
    const partial = prepareUnderstanding({
      typedName: rich.typedName,
      discoveredName: null,
      canonicalSource: rich.canonicalSource,
      draft: extractionDraftSchema.parse({
        brand_name: "Kedai Contoh",
        entity_scope: "",
        brand_type: "",
        category: "",
        market_context: "melayani sekitar Bandung dan mengantar pesanan",
        target_customer: "",
        official_sources: [rich.canonicalSource],
        verified_offerings: [],
        verified_customer_needs: [],
        verified_decision_criteria: [],
        brand_name_variants: [],
        priority_offering: "",
        conversion_action: "",
        customer_supplied_facts: [],
        known_accuracy_questions: [],
        usp: "",
        regulated_category_notes: "",
        evidence: [],
        warnings: [],
      }),
    });
    const selection = initialSmartSelection(partial);
    expect(selection.serviceChannels).toEqual([]);
    expect(selection.marketReach).toBe("");
    expect(selection.marketAreas).toEqual([]);
    expect(requiredSmartGaps(selection)).toEqual([
      "Kategori",
      "Produk atau layanan utama",
    ]);
  });
});
