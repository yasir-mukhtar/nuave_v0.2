import { describe, expect, it } from "vitest";
import {
  extractionDraftSchema,
  type ExtractionDraft,
  type AuditReport,
} from "../audit/types";
import {
  directTenContextSchema,
  contextForReportModel,
} from "../audit/direct-ten-context-v2";
import { makeSmartCustomerEvidenceExport } from "../audit/customer-evidence-export";
import { projectQuestionFactsV2 } from "../audit/question-facts-v3";
import { buildDirectTenWriterBrief } from "../audit/questions-id-direct-ten";
import {
  confirmSmartSelection,
  initialSmartSelection,
  prepareUnderstanding,
  parseFrozenSmartIntake,
  selectSmartFocus,
  smartLocationReady,
  smartProductReady,
  unsafeSmartName,
  requiredSmartGaps,
  unsafeSmartSelection,
  unsafeSmartSource,
  usablePublishedLocations,
} from "./smart-intake-contract";

function prepared(overrides: Partial<ExtractionDraft> = {}) {
  return prepareUnderstanding({
    typedName: "Kedai Contoh",
    discoveredName: null,
    canonicalSource: "https://kedai-contoh.example/",
    draft: extractionDraftSchema.parse({ ...preparedBase(), ...overrides }),
  });
}

describe("smart intake exact confirmed meaning", () => {
  it.each([
    "Hasil panen petani lokal untuk keluarga Indonesia.",
    "Menu sehat keluarga, baik untuk jantung.",
    "Kontes foto untuk saya dan keluarga.",
    "Keluarga kami membuka kedai di jantung kota.",
  ])(
    "R3 safe wording survives preparation and every confirmed-text boundary: %s",
    (text) => {
      const proposal = prepared({ verified_offerings: [text] });
      expect(proposal.offerings).toEqual({
        proposed: [text],
        origin: "website",
      });
      for (const ownerEdit of [false, true]) {
        const selection = initialSmartSelection(proposal);
        if (ownerEdit) {
          selection.offerings = [text];
          selection.origins.offerings = "owner";
        }
        expect(unsafeSmartName(text)).toBe(false);
        expect(unsafeSmartSelection(selection)).toBe(false);
        const frozen = confirmSmartSelection(proposal, selection, 1);
        expect(
          parseFrozenSmartIntake(JSON.parse(JSON.stringify(frozen))),
        ).toEqual(frozen);
        const context = directTenContextSchema.parse(frozen.context);
        expect(context.offerings).toEqual({
          value: [text],
          origin: ownerEdit ? "owner" : "website",
        });
        const projection = projectQuestionFactsV2({ context, factVersion: 1 });
        expect(projection.status).toBe("projected");
        if (projection.status !== "projected")
          throw new Error("Expected projection");
        expect(buildDirectTenWriterBrief(projection.facts)).toContain(text);
        expect(contextForReportModel(context).confirmed_context).toEqual(
          context,
        );
        expect(
          makeSmartCustomerEvidenceExport(context, [], [], {} as AuditReport)
            .context,
        ).toEqual(context);
      }
    },
  );
  it.each([
    "Hasil tes darah keluarga saya menunjukkan anemia.",
    "Keluarga kami menyajikan menu sehat untuk jantung.",
    "Keluarga kami menyajikan kopi sejak 1990, positif dan hangat.",
  ])("stops later proposal, owner selection and forged context: %s", (text) => {
    expect(() => prepared({ verified_offerings: [text] })).toThrow(
      "Persiapan audit belum dapat dilanjutkan. Ada teks yang mungkin berisi informasi sensitif. Gunakan hanya informasi publik tentang brand Anda, tanpa data pribadi atau akses akun.",
    );
    const proposal = prepared();
    const selection = initialSmartSelection(proposal);
    selection.offerings = [text];
    expect(unsafeSmartSelection(selection)).toBe(true);
    expect(() => confirmSmartSelection(proposal, selection, 1)).toThrow();
    const context = confirmSmartSelection(
      proposal,
      initialSmartSelection(proposal),
      1,
    ).context;
    const forged = {
      ...context,
      offerings: { value: [text], origin: "owner" as const },
    };
    expect(directTenContextSchema.safeParse(forged).success).toBe(false);
    expect(
      projectQuestionFactsV2({ context: forged, factVersion: 1 }).status,
    ).toBe("INVALID_REQUEST");
  });

  it.each(["seluruh", "luar"] as const)(
    "preserves %s presence separately from delivery through writer, report context and export",
    (reach) => {
      const proposal = prepared({
        market_reach: reach,
        market_areas: [],
        target_customer: "",
        verified_customer_needs: [],
        verified_decision_criteria: [],
      });
      const selection = initialSmartSelection(proposal);
      const { context } = confirmSmartSelection(proposal, selection, 1);
      expect(context.market).toEqual({
        value: { reach, areas: [] },
        origin: "website",
      });
      expect(context.serviceChannels).toEqual({
        value: ["on_premise", "delivery"],
        origin: "website",
      });
      expect(context.focus).toEqual({
        value: { kind: "brand" },
        origin: "nuave",
      });
      expect(context.targetCustomer).toBeUndefined();
      const projection = projectQuestionFactsV2({ context, factVersion: 1 });
      expect(projection.status).toBe("projected");
      if (projection.status !== "projected")
        throw new Error("Expected projected context");
      expect(projection.facts.marketContext).toMatchObject({
        reach: reach === "seluruh" ? "national" : "international",
        areas: [],
      });
      expect(projection.facts.serviceChannels).toEqual([
        "on_premise",
        "delivery",
      ]);
      const writer = buildDirectTenWriterBrief(projection.facts);
      expect(writer).toContain(
        `Area layanan: ${reach === "seluruh" ? "seluruh Indonesia" : "Indonesia dan luar negeri"} [asal: disiapkan dari sumber publik]`,
      );
      expect(writer).toContain(
        "Saluran layanan: layanan di lokasi bisnis; pengiriman ke pelanggan [asal: disiapkan dari sumber publik]",
      );
      expect(writer).not.toMatch(
        /pengiriman (?:ke seluruh|nasional|internasional|ke setiap alamat)/i,
      );
      expect(contextForReportModel(context).confirmed_context).toEqual(context);
      const exported = makeSmartCustomerEvidenceExport(
        context,
        [],
        [],
        {} as AuditReport,
      );
      expect(exported.context).toEqual(context);
      expect(JSON.stringify(exported)).not.toContain("universal");
      expect(exported).not.toHaveProperty("brief");
    },
  );

  it("keeps an unrepresentable regional proposal unresolved until an owner supplies the required area", () => {
    const proposal = prepared({
      market_reach: "beberapa",
      market_areas: [],
      target_customer: "",
    });
    const selection = initialSmartSelection(proposal);
    expect(selection.focus).toBe("brand");
    expect(selection.marketReach).toBe("beberapa");
    expect(requiredSmartGaps(selection)).toEqual(["Area layanan"]);
    expect(() => confirmSmartSelection(proposal, selection, 1)).toThrow(
      "Lengkapi: Area layanan.",
    );
    selection.marketAreas = ["Wilayah pilihan pemilik"];
    selection.origins.market = "owner";
    const { context } = confirmSmartSelection(proposal, selection, 1);
    expect(context.market).toEqual({
      value: { reach: "beberapa", areas: ["Wilayah pilihan pemilik"] },
      origin: "owner",
    });
    expect(proposal.marketAreas.proposed).toEqual([]);
    expect(proposal.marketReach.origin).toBe("website");
  });

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
      "Cara layanan",
      "Jangkauan pasar",
    ]);
  });
});

describe("Spec 013 J3 preparation additions", () => {
  const locations = [
    {
      name: "Kedai Contoh Dago",
      address: "Jl. Contoh No. 10, Bandung",
      source_url: "https://kedai-contoh.example/lokasi",
    },
    {
      name: "Kedai Contoh Cimahi",
      address: "Jl. Fiksi No. 2, Cimahi",
      // A www.-equivalent page on the same host is still the business's own
      // source (PR #98 M2, applied in J4).
      source_url: "https://www.kedai-contoh.example/lokasi",
    },
    {
      name: "Kedai Contoh Dago",
      address: "JL. CONTOH NO. 10, BANDUNG",
      source_url: "https://kedai-contoh.example/lokasi",
    },
  ];

  it("carries published locations and Nuave category suggestions as prepared proposals", () => {
    const proposal = prepared({
      published_locations: locations,
      category_suggestions: ["kedai kopi", "Kafe Fiksi", "kedai kopi"],
      offering_category_suggestions: [
        { offering: "kopi susu", category: "minuman kopi siap minum" },
        { offering: "KOPI SUSU", category: "duplikat terlambat" },
        { offering: "menu tidak tercantum", category: "misteri" },
        { offering: "roti", category: "roti dan camilan" },
      ],
    });
    // Case-insensitive name+address duplicates are dropped; every kept row
    // carries the page on the canonical host that publishes the address.
    expect(proposal.locations).toEqual({
      proposed: [
        {
          name: "Kedai Contoh Dago",
          address: "Jl. Contoh No. 10, Bandung",
          sourceUrl: "https://kedai-contoh.example/lokasi",
        },
        {
          name: "Kedai Contoh Cimahi",
          address: "Jl. Fiksi No. 2, Cimahi",
          sourceUrl: "https://www.kedai-contoh.example/lokasi",
        },
      ],
      origin: "website",
    });
    expect(proposal.categorySuggestions).toEqual({
      proposed: ["kedai kopi", "Kafe Fiksi"],
      origin: "nuave",
    });
    // One suggestion per offering, bound to the offering's exact text;
    // duplicates and unknown offerings cannot drift in.
    expect(proposal.offeringCategorySuggestions).toEqual({
      proposed: [
        { offering: "kopi susu", category: "minuman kopi siap minum" },
        { offering: "roti", category: "roti dan camilan" },
      ],
      origin: "nuave",
    });
    // The prepared main category keeps its existing "Dari website Anda" label.
    expect(proposal.category).toEqual({
      proposed: "kedai kopi",
      origin: "website",
    });
  });

  it("freezes identical confirmed context with or without the new prepared values", () => {
    const plain = confirmSmartSelection(
      prepared(),
      initialSmartSelection(prepared()),
      1,
    );
    const rich = confirmSmartSelection(
      prepared({
        published_locations: locations.slice(0, 2),
        category_suggestions: ["kedai kopi", "kafe"],
        offering_category_suggestions: [
          { offering: "roti", category: "roti dan camilan" },
        ],
      }),
      initialSmartSelection(prepared()),
      1,
    );
    expect(rich).toEqual(plain);
  });

  it("leaves every new field empty for a draft that does not carry them", () => {
    const proposal = prepared({
      published_locations: undefined,
      category_suggestions: undefined,
      offering_category_suggestions: undefined,
    });
    expect(proposal.locations).toEqual({ proposed: [], origin: "website" });
    expect(proposal.categorySuggestions).toEqual({
      proposed: [],
      origin: "nuave",
    });
    expect(proposal.offeringCategorySuggestions).toEqual({
      proposed: [],
      origin: "nuave",
    });
  });

  it("drops malformed rows that survive outside the schema boundary", () => {
    const proposal = prepareUnderstanding({
      typedName: "Kedai Contoh",
      discoveredName: null,
      canonicalSource: "https://kedai-contoh.example/",
      draft: {
        ...preparedBase(),
        published_locations: [
          "bukan objek",
          { name: "Gerai Fiksi", address: "Jl. Fiksi 1" },
          { name: "Gerai Fiksi", address: "Jl. Fiksi 1", source_url: 7 },
          {
            name: "Gerai Fiksi",
            address: "Jl. Fiksi 1",
            source_url: "https://kedai-contoh.example/gerai",
          },
        ],
        offering_category_suggestions: [
          null,
          { offering: "roti" },
          { offering: "roti", category: "roti dan camilan" },
        ],
        category_suggestions: ["kafe", 42],
      } as unknown as ExtractionDraft,
    });
    expect(proposal.locations.proposed).toEqual([
      {
        name: "Gerai Fiksi",
        address: "Jl. Fiksi 1",
        sourceUrl: "https://kedai-contoh.example/gerai",
      },
    ]);
    expect(proposal.offeringCategorySuggestions.proposed).toEqual([
      { offering: "roti", category: "roti dan camilan" },
    ]);
    expect(proposal.categorySuggestions.proposed).toEqual(["kafe"]);
  });

  it("drops a published location whose address carries a phone, email or link — the clean sibling still prepares", () => {
    // A real Indonesian branch listing often prints WA/email/site on the
    // address line. The sensitive item must never reach the session, but it
    // must also never block the whole preparation (review B1).
    for (const address of [
      "Jl. Fiksi No. 3, Bandung (WA 0812-3456-7890)",
      "Jl. Fiksi No. 3, Bandung · halo@kedai-contoh.example",
      "Jl. Fiksi No. 3, Bandung — www.kedai-contoh.example",
    ]) {
      const proposal = prepared({
        published_locations: [
          { name: "Kedai Contoh Kota", address, source_url: "" },
          locations[0]!,
        ],
      });
      expect(proposal.locations.proposed).toEqual([
        {
          name: "Kedai Contoh Dago",
          address: "Jl. Contoh No. 10, Bandung",
          sourceUrl: "https://kedai-contoh.example/lokasi",
        },
      ]);
      expect(JSON.stringify(proposal)).not.toContain(address.slice(0, 20));
    }
  });

  it.each<[string, { name: string; address: string; source_url: string }]>([
    [
      "location name",
      {
        name: "Hasil tes darah saya menunjukkan anemia",
        address: "Jl. Contoh 1",
        source_url: "",
      },
    ],
    [
      "location address",
      {
        name: "Gerai Fiksi",
        address: "nomor rekening 1234567890123",
        source_url: "",
      },
    ],
    [
      "location source",
      {
        name: "Gerai Fiksi",
        address: "Jl. Contoh 1",
        source_url: "https://kedai-contoh.example/?token=private",
      },
    ],
  ])(
    "drops only the %s that fails screening — nothing from it is stored",
    (_label, location) => {
      const proposal = prepared({
        published_locations: [location, locations[0]!],
      });
      expect(proposal.locations.proposed).toEqual([
        {
          name: "Kedai Contoh Dago",
          address: "Jl. Contoh No. 10, Bandung",
          sourceUrl: "https://kedai-contoh.example/lokasi",
        },
      ]);
      expect(JSON.stringify(proposal.locations)).not.toContain("tes darah");
      expect(JSON.stringify(proposal.locations)).not.toContain("rekening");
      expect(JSON.stringify(proposal.locations)).not.toContain("token=");
    },
  );

  it.each<[string, Partial<ExtractionDraft>]>([
    [
      "brand category suggestion",
      { category_suggestions: ["nomor rekening 1234567890123"] },
    ],
    [
      "offering suggestion's offering",
      {
        offering_category_suggestions: [
          { offering: "nomor rekening 1234567890123", category: "camilan" },
        ],
      },
    ],
    [
      "offering suggestion's category",
      {
        offering_category_suggestions: [
          { offering: "roti", category: "nomor rekening 1234567890123" },
        ],
      },
    ],
  ])(
    "drops only the %s that fails screening — nothing from it is stored",
    (_label, overrides) => {
      const proposal = prepared(overrides);
      expect(proposal.categorySuggestions.proposed).toEqual([]);
      expect(proposal.offeringCategorySuggestions.proposed).toEqual([]);
      // The rest of the preparation is untouched.
      expect(proposal.offerings.proposed).toEqual(["kopi susu", "roti"]);
      expect(JSON.stringify(proposal)).not.toContain("rekening");
    },
  );

  it("schema bounds reject over-limit or malformed new fields", () => {
    const base = preparedBase();
    const tooMany = (key: string, count: number, item: unknown) =>
      extractionDraftSchema.safeParse({
        ...base,
        [key]: Array.from({ length: count }, () => item),
      });
    expect(
      tooMany("published_locations", 9, {
        name: "Gerai",
        address: "Jl. Contoh",
        source_url: "",
      }).success,
    ).toBe(false);
    expect(tooMany("category_suggestions", 4, "kafe").success).toBe(false);
    expect(
      tooMany("offering_category_suggestions", 13, {
        offering: "roti",
        category: "camilan",
      }).success,
    ).toBe(false);
    // A malformed record (missing address) fails the whole draft.
    expect(
      extractionDraftSchema.safeParse({
        ...base,
        published_locations: [{ name: "Gerai tanpa alamat" }],
      }).success,
    ).toBe(false);
    // Missing keys fill their defaults — an older draft still parses.
    expect(extractionDraftSchema.parse(base)).toMatchObject({
      published_locations: [],
      category_suggestions: [],
      offering_category_suggestions: [],
    });
  });
});

describe("Spec 013 J4 published-location source check and focus targets", () => {
  it("keeps a location only when its source page sits on the canonical host", () => {
    const at = (name: string, source_url: string) => ({
      name,
      address: "Jl. Fiksi 1",
      source_url,
    });
    const proposal = prepared({
      published_locations: [
        at("Gerai Pusat", "https://kedai-contoh.example/lokasi"),
        at("Gerai Www", "https://www.kedai-contoh.example/gerai"),
        at("Gerai Asing", "https://aggregator.example/listing/1"),
        at("Gerai Tiruan", "https://kedai-contoh.example.evil.example/x"),
        at("Gerai Subdomain", "https://sub.kedai-contoh.example/gerai"),
        at("Gerai Tanpa Sumber", ""),
        at("Gerai Aneh", "javascript:alert(1)"),
      ],
    });
    expect(proposal.locations.proposed).toEqual([
      {
        name: "Gerai Pusat",
        address: "Jl. Fiksi 1",
        sourceUrl: "https://kedai-contoh.example/lokasi",
      },
      {
        name: "Gerai Www",
        address: "Jl. Fiksi 1",
        sourceUrl: "https://www.kedai-contoh.example/gerai",
      },
    ]);
  });

  it("an Instagram canonical accepts only the profile page itself", () => {
    const proposal = prepareUnderstanding({
      typedName: "Kedai Contoh",
      discoveredName: null,
      canonicalSource: "@kedaicontoh",
      draft: extractionDraftSchema.parse({
        ...preparedBase(),
        published_locations: [
          {
            name: "Profil",
            address: "Jl. Fiksi 1",
            source_url: "https://instagram.com/kedaicontoh",
          },
          {
            name: "Profil Lain",
            address: "Jl. Fiksi 2",
            source_url: "https://instagram.com/kedailain",
          },
          {
            name: "Post",
            address: "Jl. Fiksi 3",
            source_url: "https://instagram.com/p/abc123",
          },
        ],
      }),
    });
    expect(proposal.locations.proposed).toEqual([
      {
        name: "Profil",
        address: "Jl. Fiksi 1",
        sourceUrl: "https://instagram.com/kedaicontoh",
      },
    ]);
  });

  it("usablePublishedLocations re-screens a restored or hand-edited record", () => {
    const proposal = prepared({ published_locations: [] });
    const tampered = {
      ...proposal,
      locations: {
        origin: "website" as const,
        proposed: [
          {
            name: "Aman",
            address: "Jl. Fiksi 1",
            sourceUrl: "https://kedai-contoh.example/a",
          },
          {
            name: "Asing",
            address: "Jl. Fiksi 2",
            sourceUrl: "https://aggregator.example/x",
          },
          { name: "Bukan URL", address: "Jl. Fiksi 3", sourceUrl: 42 },
          { name: "Tanpa URL", address: "Jl. Fiksi 4" },
        ],
      },
    };
    expect(usablePublishedLocations(tampered as typeof proposal)).toEqual([
      {
        name: "Aman",
        address: "Jl. Fiksi 1",
        sourceUrl: "https://kedai-contoh.example/a",
      },
    ]);
    expect(usablePublishedLocations(proposal)).toEqual([]);
  });

  it("selectSmartFocus clears incompatible targets and restores the brand market after a cabang detour", () => {
    const proposal = prepared();
    const selection = initialSmartSelection(proposal);
    selection.productTarget = "kopi susu";
    const cabang = selectSmartFocus(proposal, selection, "cabang");
    expect(cabang).toMatchObject({
      focus: "cabang",
      productTarget: "",
      marketReach: "",
      marketAreas: [],
      retainedBrandReach: "sekitar",
      retainedBrandAreas: ["Bandung"],
    });
    expect(cabang.origins.focus).toBe("owner");
    const brand = selectSmartFocus(proposal, cabang, "brand");
    expect(brand).toMatchObject({
      focus: "brand",
      locationName: "",
      locationAddress: "",
      marketReach: "sekitar",
      marketAreas: ["Bandung"],
    });
  });

  it("selectSmartFocus leaves an unchanged pick untouched", () => {
    const proposal = prepared();
    const selection = initialSmartSelection(proposal);
    expect(selectSmartFocus(proposal, selection, "brand")).toBe(selection);
  });

  it("the target screens' Lanjut gates match the contract's focus requirements", () => {
    const selection = initialSmartSelection(prepared());
    expect(smartLocationReady(selection)).toBe(false);
    expect(smartProductReady(selection)).toBe(false);
    selection.locationName = "Gerai";
    expect(smartLocationReady(selection)).toBe(false);
    selection.locationAddress = "Jl. Fiksi 1";
    expect(smartLocationReady(selection)).toBe(true);
    selection.productTarget = "  roti  ";
    expect(smartProductReady(selection)).toBe(true);
  });
});

function preparedBase() {
  return {
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
  };
}
