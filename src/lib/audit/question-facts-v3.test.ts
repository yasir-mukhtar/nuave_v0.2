import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import snapshots from "./fixtures/intake-g1-snapshots.json";
import { goldenBrief } from "./fixtures/report-golden";
import { businessBriefSchema } from "./types";
import {
  parseQuestionFactsV3,
  isCurrentFactsResponse,
  type QuestionFactsV3,
} from "./question-facts-v3";
import { AUDIT_MEASUREMENT_MATRIX } from "./measurement-matrix";
import {
  buildV3WriterContext,
  projectV3SlotContext,
  hasForbiddenV3Identity,
  V3_CONTEXT_MAP,
} from "./question-context-v3";
import {
  buildDeterministicIndonesianPack,
  minimizeIndonesianBrief,
  INDONESIAN_QUESTION_INSTRUCTION_VERSION,
  categoryComparisonFallbackName,
} from "./questions-id";

const wire = (value: unknown) => JSON.parse(JSON.stringify(value));
const request = (index = 0) => ({
  requestId: "request-1",
  intake: wire(snapshots[index]),
});
function projected(value: unknown): QuestionFactsV3 {
  const result = parseQuestionFactsV3(wire(value));
  expect(result.status).toBe("projected");
  if (result.status !== "projected") throw new Error(JSON.stringify(result));
  return result.facts;
}
const legacy = () => ({
  requestId: "legacy-1",
  factsRevision: 4,
  brief: wire(goldenBrief),
});

describe("G1 actual serialized intake boundary", () => {
  it.each([0, 1, 2])(
    "parses the accepted freezeLocalIntake snapshot %i",
    (index) => {
      const raw = request(index);
      const facts = projected(raw);
      expect(facts.entityScope.kind).toBe(
        ["whole-brand", "branch", "offering"][index],
      );
      expect(facts.binding.factsRevision).toBe(7);
      expect(facts.customerNeeds).toEqual(raw.intake.confirmed.customerReasons);
      expect(facts.serviceChannels).toEqual(["on_premise", "delivery"]);
      expect(facts.identity.comparators).toEqual(["Kedai Pagi", "Kedai Sore"]);
      expect(facts.comparison).toEqual({ kind: "unresolved", name: null });
      expect(JSON.stringify(facts)).not.toContain("reviewRows");
      // The confirmed source survives only as a code-owned guard signal;
      // it never reaches writer context.
      expect(facts.identity.sourceSignals).toContain("kopisudut.id");
      expect(JSON.stringify(buildV3WriterContext(facts))).not.toContain(
        "kopisudut.id",
      );
      expect(facts.binding.factsFingerprint).toMatch(/^[a-f0-9]{64}$/);
      if (index === 1)
        expect(facts.entityScope).toEqual({
          kind: "branch",
          name: "Gerai Selatan",
          address: "Jalan Melati 12, Jakarta Selatan",
          detail: null,
        });
      if (index === 2)
        expect(facts.offerings).toEqual(["Langganan Kopi Sudut"]);
    },
  );
  it("keeps reasons optional and role unknown without inventing required legacy fields", () => {
    const raw = request();
    raw.intake.confirmed.customerReasons = [];
    raw.intake.confirmed.serviceChannels = [];
    const facts = projected(raw);
    expect(facts.customerNeeds).toEqual([]);
    expect(facts.targetCustomer).toBeNull();
    expect(facts.buyerConstraints).toEqual([]);
    expect(facts.entityType).toBeNull();
    expect(facts.serviceChannels).toEqual([]);
    expect(parseQuestionFactsV3(raw)).toMatchObject({
      limitations: [
        "competitive_role_unknown",
        "comparison_relation_unresolved",
      ],
    });
  });
  it.each(["seluruh", "luar"])("drops inactive areas for %s", (reach) => {
    const raw = request();
    raw.intake.confirmed.market = { reach, areas: ["STALE"] };
    expect(projected(raw).marketContext.areas).toEqual([]);
  });
  it("ignores inactive product/branch fields and product general offerings", () => {
    const raw = request();
    raw.intake.confirmed.target = {
      name: "Stale target",
      detail: "Stale address",
    };
    expect(projected(raw).entityScope).toEqual({
      kind: "whole-brand",
      name: null,
      address: null,
      detail: null,
    });
    const product = request(2);
    product.intake.confirmed.offerings = ["Stale offering"];
    expect(projected(product).offerings).toEqual(["Langganan Kopi Sudut"]);
  });
  it("retains category alternatives separately from identity exclusions", () => {
    const raw = request();
    raw.intake.confirmed.comparators = {
      mode: "category-alternatives",
      names: [],
    };
    const facts = projected(raw);
    expect(facts.identity.comparators).toEqual([]);
    expect(facts.comparison.name).toBe(
      categoryComparisonFallbackName(facts.category),
    );
    expect(
      hasForbiddenV3Identity(
        "Bandingkan kedai kopi yang sesuai",
        facts,
        AUDIT_MEASUREMENT_MATRIX[5],
      ),
    ).toBe(false);
  });
  it.each([
    ["category", "", "category", "s-category"],
    ["offerings", [], "offerings", "s-offerings"],
    ["market", { reach: "sekitar", areas: [] }, "marketContext", "s-market"],
    [
      "comparators",
      { mode: "named", names: [] },
      "comparison",
      "s-competitors",
    ],
    [
      "customerReasons",
      ["Email private@example.test"],
      "customerNeeds",
      "s-customers",
    ],
    ["publicFact", "password: synthetic-only", "safeFacts", "s-facts"],
  ])(
    "returns value-free correction ownership for %s",
    (field, value, key, target) => {
      const raw = request();
      raw.intake.confirmed[field as string] = value;
      expect(parseQuestionFactsV3(raw)).toMatchObject({
        status: "INPUT_CORRECTION_REQUIRED",
        issues: expect.arrayContaining([
          expect.objectContaining({ field: key, target }),
        ]),
      });
      expect(JSON.stringify(parseQuestionFactsV3(raw))).not.toContain(
        "synthetic-only",
      );
    },
  );
  it.each([1, 2])(
    "routes missing active target %i to its real owner",
    (index) => {
      const raw = request(index);
      raw.intake.confirmed.target = null;
      expect(parseQuestionFactsV3(raw)).toMatchObject({
        status: "INPUT_CORRECTION_REQUIRED",
        issues: expect.arrayContaining([
          expect.objectContaining({
            target: index === 1 ? "s-branch" : "s-product",
          }),
        ]),
      });
    },
  );
  it("detects invalid source and conflicting branch/product role without defaulting", () => {
    const raw = request();
    raw.intake.confirmed.brand.primarySource = "javascript:alert(1)";
    expect(parseQuestionFactsV3(raw)).toMatchObject({
      status: "INPUT_CORRECTION_REQUIRED",
      issues: expect.arrayContaining([
        { field: "identity", code: "invalid_source", target: "s-brand-fix" },
      ]),
    });
    expect(
      parseQuestionFactsV3({
        ...request(1),
        factsContext: { entityType: "product" },
      }),
    ).toMatchObject({
      status: "INPUT_CORRECTION_REQUIRED",
      issues: expect.arrayContaining([
        { field: "entityScope", code: "conflict", target: "s-scope" },
      ]),
    });
  });
  it("does not let optional metadata overwrite UI-confirmed scope or channels", () => {
    expect(
      parseQuestionFactsV3({
        ...request(),
        factsContext: {
          entityScope: { kind: "branch", name: "Other", address: "Elsewhere" },
        },
      }).status,
    ).toBe("INPUT_CORRECTION_REQUIRED");
    expect(
      parseQuestionFactsV3({
        ...request(),
        factsContext: { serviceChannels: ["online"] },
      }).status,
    ).toBe("INPUT_CORRECTION_REQUIRED");
  });
  it.each([
    null,
    {},
    { requestId: "bad email@example.test" },
    { ...request(), brief: goldenBrief },
  ])(
    "rejects malformed/ambiguous envelopes without echoing contents",
    (raw) => {
      expect(parseQuestionFactsV3(raw)).toEqual({
        status: "INVALID_REQUEST",
        issues: [{ code: "invalid_shape" }],
      });
    },
  );
  it("strips UI/contact/payment/source metadata and keeps safe facts attributed outside writer context", () => {
    const raw = request();
    raw.intake.confirmed.publicFact = "Pintu masuk berada di sisi timur";
    raw.intake.confirmed.contact = "private@example.test";
    raw.intake.confirmed.payment = "synthetic-payment";
    raw.intake.rawHTML = "<div>synthetic html</div>";
    raw.intake.fingerprint = "sensitive legacy fingerprint";
    const facts = projected(raw);
    expect(facts.safeFacts).toEqual([
      {
        text: "Pintu masuk berada di sisi timur",
        provenance: "buyer_supplied",
      },
    ]);
    const writer = JSON.stringify(buildV3WriterContext(facts));
    for (const excluded of [
      "private@example.test",
      "synthetic-payment",
      "synthetic html",
      "sensitive legacy",
      "Pintu masuk",
      "kopisudut.id",
      "reviewRows",
      "Di lokasi bisnis Anda",
    ])
      expect(writer).not.toContain(excluded);
  });
});

describe("G1 legacy boundary and revision binding", () => {
  it("parses an actual BusinessBrief without defaults for structured geography/channels/role", () => {
    const raw = legacy();
    expect(businessBriefSchema.safeParse(raw.brief).success).toBe(true);
    const facts = projected(raw);
    expect(facts.entityScope.kind).toBe("unknown");
    expect(facts.marketContext.reach).toBeNull();
    expect(facts.marketContext.areas).toEqual([]);
    expect(facts.serviceChannels).toBeNull();
    expect(facts.customerNeeds).toEqual(raw.brief.verified_customer_needs);
    expect(facts.buyerConstraints.map((c) => c.text)).toEqual(
      raw.brief.verified_decision_criteria,
    );
    expect(facts.identity.aliases).toEqual(raw.brief.brand_name_variants);
    expect(JSON.stringify(buildV3WriterContext(facts))).not.toContain(
      "https://",
    );
  });
  it("accepts optional confirmed legacy structure through JSON parsing", () => {
    const raw = {
      ...legacy(),
      factsContext: {
        entityScope: {
          kind: "branch",
          name: "Gerai Depok",
          address: "Jalan Mawar 8",
        },
        entityType: "service",
        marketContext: { reach: "local", areas: ["Depok"] },
        serviceChannels: ["on_customer", "online"],
      },
    };
    expect(projected(raw)).toMatchObject({
      entityScope: raw.factsContext.entityScope,
      entityType: "service",
      serviceChannels: ["on_customer", "online"],
      marketContext: { areas: ["Depok"] },
    });
  });
  it("classifies missing required generation facts without weakening the shipped parser", () => {
    const raw = legacy();
    raw.brief.verified_offerings = [];
    raw.brief.priority_offering = "";
    expect(businessBriefSchema.safeParse(raw.brief).success).toBe(false);
    expect(parseQuestionFactsV3(raw)).toMatchObject({
      status: "INPUT_CORRECTION_REQUIRED",
      issues: [
        { field: "offerings", code: "missing", target: "verified_offerings" },
      ],
    });
  });
  it("retains name-only and source-backed comparison names identically", () => {
    const raw = legacy();
    const before = projected(raw).comparison;
    raw.brief.verified_competitor.source_url = "";
    expect(projected(raw).comparison).toEqual(before);
    raw.brief.verified_competitor.name = categoryComparisonFallbackName(
      raw.brief.category,
    );
    expect(projected(raw).comparison.kind).toBe("category-alternatives");
  });
  it("rejects older fact/request responses and binds source and optional-fact changes", () => {
    const raw = request();
    const first = projected(raw).binding;
    expect(
      isCurrentFactsResponse(
        first,
        projected({ ...raw, policyRevision: "new-policy" }).binding,
      ),
    ).toBe(true);
    expect(
      isCurrentFactsResponse(
        first,
        projected({ ...raw, requestId: "request-2" }).binding,
      ),
    ).toBe(false);
    raw.intake.factVersion++;
    expect(isCurrentFactsResponse(first, projected(raw).binding)).toBe(false);
    raw.intake.factVersion--;
    raw.intake.confirmed.brand.primarySource = "https://other.example";
    expect(isCurrentFactsResponse(first, projected(raw).binding)).toBe(false);
    const second = projected(raw).binding;
    raw.intake.confirmed.publicFact = "Pintu masuk sisi timur";
    expect(isCurrentFactsResponse(second, projected(raw).binding)).toBe(false);
  });
});

describe("R5 context permission and dormant dispatch", () => {
  it("supplies Depok/home visit in situation and approved needs in need_fit", () => {
    const raw = request();
    raw.intake.confirmed.market.areas = ["Depok"];
    raw.intake.confirmed.serviceChannels = [{ channel: "on_customer" }];
    raw.intake.confirmed.customerReasons = ["Mencari tempat untuk rapat kecil"];
    const facts = projected(raw);
    const situation = projectV3SlotContext(
      facts,
      AUDIT_MEASUREMENT_MATRIX[1].id,
    );
    expect(situation.context.marketContext).toMatchObject({ areas: ["Depok"] });
    expect(situation.context.serviceChannels).toEqual(["on_customer"]);
    expect(
      projectV3SlotContext(facts, AUDIT_MEASUREMENT_MATRIX[2].id).context
        .customerNeeds,
    ).toEqual(raw.intake.confirmed.customerReasons);
    expect(
      projectV3SlotContext(facts, AUDIT_MEASUREMENT_MATRIX[3].id).context
        .customerNeeds,
    ).toBeUndefined();
  });
  it("does not use general context to smuggle decision criteria or offerings into other slots", () => {
    const facts = projected(legacy());
    expect(
      projectV3SlotContext(facts, AUDIT_MEASUREMENT_MATRIX[2].id).context
        .buyerConstraints,
    ).toBeUndefined();
    expect(
      projectV3SlotContext(facts, AUDIT_MEASUREMENT_MATRIX[1].id).context
        .offerings,
    ).toBeUndefined();
    expect(
      projectV3SlotContext(facts, AUDIT_MEASUREMENT_MATRIX[4].id).context
        .buyerConstraints,
    ).toEqual(facts.buyerConstraints);
  });
  it("keeps forbidden identity guards across every canonical slot", () => {
    const raw = request(1);
    raw.intake.confirmed.customerReasons = [
      "Kopi Sudut cocok untuk rapat",
      "Kedai Sore lebih dekat",
    ];
    const facts = projected(raw);
    for (const slot of AUDIT_MEASUREMENT_MATRIX) {
      const context = JSON.stringify(projectV3SlotContext(facts, slot.id));
      if (slot.auditedBrandIdentity === "forbidden") {
        expect(context).not.toContain("Kopi Sudut");
        expect(context).not.toContain("Gerai Selatan");
        expect(hasForbiddenV3Identity("Coba Gerai Selatan", facts, slot)).toBe(
          true,
        );
      }
      if (slot.comparisonTargetIdentity === "forbidden") {
        expect(context).not.toContain("Kedai Sore");
        expect(hasForbiddenV3Identity("Coba Kedai Sore", facts, slot)).toBe(
          true,
        );
      }
      expect(projectV3SlotContext(facts, slot.id).permissions).toEqual(
        V3_CONTEXT_MAP.find((entry) => entry.slotId === slot.id),
      );
    }
  });
  it("does not mutate matrix metadata or shipped v2 generator behavior", () => {
    const matrix = JSON.stringify(AUDIT_MEASUREMENT_MATRIX);
    const v2 = buildDeterministicIndonesianPack(
      minimizeIndonesianBrief(goldenBrief),
    );
    buildV3WriterContext(projected(request()));
    expect(JSON.stringify(AUDIT_MEASUREMENT_MATRIX)).toBe(matrix);
    expect(
      buildDeterministicIndonesianPack(minimizeIndonesianBrief(goldenBrief)),
    ).toEqual(v2);
    expect(INDONESIAN_QUESTION_INSTRUCTION_VERSION).toBe("question-writer-v2");
  });
  it("has no runtime consumers outside the dormant modules", () => {
    function files(path: string): string[] {
      return readdirSync(path, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? files(join(path, e.name)) : [join(path, e.name)],
      );
    }
    // The dormant set: the v3 facts/context modules plus the dormant GLM
    // prototype and its instruction module. Only they may import each other;
    // tests are the sanctioned consumers and are excluded.
    const dormantModule =
      /question-(?:facts|context)-v3\.ts$|questions-id-glm(?:-instruction)?\.ts$/;
    const importsDormant = (source: string) =>
      /(?:from|import\s*\()[^\n]*question-(?:facts|context)-v3|(?:from|import\s*\()[^\n]*questions-id-glm/.test(
        source,
      );
    const consumers = files("src")
      .filter(
        (p) =>
          /\.(ts|tsx)$/.test(p) &&
          !p.endsWith(".test.ts") &&
          !p.endsWith(".test.tsx") &&
          !dormantModule.test(p),
      )
      .filter((p) => importsDormant(readFileSync(p, "utf8")));
    // The founder-only local experiment names its callers explicitly
    // (LOCAL_FOUNDER_TEST_HANDOFF.md 2026-09-17): the server adapter runs the
    // request builder, the pack store applies the same v3 wording rules, and
    // the Spec 009 direct-ten module reuses the shared transport/provenance
    // mechanics. Any other runtime consumer still fails this guard.
    expect(consumers.sort()).toEqual([
      "src/lib/audit/questions-id-direct-ten.ts",
      "src/lib/intake/glm-local.ts",
      "src/lib/intake/local-questions.ts",
    ]);

    // An external runtime importer of the GLM module or its instruction
    // helper would fail this guard — demonstrated on synthetic import lines.
    expect(
      importsDormant(
        'import { buildCheaperInferenceIndonesianQuestionRequest } from "@/lib/audit/questions-id-glm";',
      ),
    ).toBe(true);
    expect(
      importsDormant(
        'import { GLM_INSTRUCTION_HEAD } from "./questions-id-glm-instruction";',
      ),
    ).toBe(true);
    expect(importsDormant('import { x } from "./questions-id";')).toBe(false);
  });
});

describe("G1 conservative identity and privacy edge cases", () => {
  it("derives Instagram handles without exposing the source URL", () => {
    const raw = request();
    raw.intake.confirmed.brand.primarySource =
      "https://www.instagram.com/kopisudut.id/";
    const facts = projected(raw);
    expect(facts.identity.aliases).toContain("kopisudut.id");
    expect(
      hasForbiddenV3Identity(
        "Coba kopisudut.id",
        facts,
        AUDIT_MEASUREMENT_MATRIX[0],
      ),
    ).toBe(true);
    expect(JSON.stringify(buildV3WriterContext(facts))).not.toContain(
      "instagram.com",
    );
  });
  it("withholds proprietary offering names instead of passing them as unnamed context", () => {
    const facts = projected(request());
    const slot = AUDIT_MEASUREMENT_MATRIX.find(
      (s) => s.category === "offering_use_case",
    )!;
    expect(
      projectV3SlotContext(facts, slot.id).context.offerings,
    ).not.toContain("Kopi Susu Sudut");
    expect(facts.offerings).toContain("Kopi Susu Sudut");
  });
  it.each([
    "<p>synthetic source text</p>",
    "nomor rekening synthetic",
    "data pasien synthetic",
    "token access_token synthetic",
  ])("does not echo unsafe facts: %s", (value) => {
    const raw = request();
    raw.intake.confirmed.publicFact = value;
    const result = parseQuestionFactsV3(raw);
    expect(result.status).toBe("INPUT_CORRECTION_REQUIRED");
    expect(JSON.stringify(result)).not.toContain(value);
  });
  it("preserves safe regulated discovery context without granting identity permission", () => {
    const raw = legacy();
    raw.brief.regulated_category_notes =
      "Hanya penemuan klinik; jangan menilai hasil perawatan Northstar Dental";
    const facts = projected(raw);
    const unnamed = projectV3SlotContext(facts, AUDIT_MEASUREMENT_MATRIX[0].id);
    // Unsafe-to-copy identity-bearing restrictions are withheld, not rewritten.
    expect(JSON.stringify(unnamed)).not.toContain("Northstar Dental");
  });
});

it.each(["official_sources", "verified_competitor", "entity_scope"])(
  "maps absent legacy %s to correction, without changing the runtime schema",
  (field) => {
    const raw = legacy();
    delete raw.brief[field];
    expect(businessBriefSchema.safeParse(raw.brief).success).toBe(false);
    expect(parseQuestionFactsV3(raw).status).toBe("INPUT_CORRECTION_REQUIRED");
  },
);

it("routes legacy source correction to the source control, and flags absent safety editor", () => {
  const raw = legacy();
  raw.brief.official_sources = [];
  expect(parseQuestionFactsV3(raw)).toMatchObject({
    status: "INPUT_CORRECTION_REQUIRED",
    issues: [
      { field: "identity", code: "invalid_source", target: "official_sources" },
    ],
  });
  const restricted = legacy();
  restricted.brief.regulated_category_notes = "data pasien synthetic";
  expect(parseQuestionFactsV3(restricted)).toMatchObject({
    status: "INPUT_CORRECTION_REQUIRED",
    issues: [{ field: "categorySafety", code: "unsafe", target: null }],
  });
});

describe("G1 independent-review regressions", () => {
  it.each([
    "Pembayaran menggunakan 4111-1111-1111-1111",
    "Hasil tes HIV saya positif",
  ])(
    "screens sensitive confirmed text instead of projecting it: %s",
    (value) => {
      const raw = request();
      raw.intake.confirmed.customerReasons = [value];
      const result = parseQuestionFactsV3(raw);
      expect(result.status).toBe("INPUT_CORRECTION_REQUIRED");
      expect(JSON.stringify(result)).not.toContain(value);
    },
  );
  it("screens a source-derived numeric handle before it becomes an alias", () => {
    const raw = request();
    raw.intake.confirmed.brand.primarySource =
      "https://instagram.com/081234567890";
    const result = parseQuestionFactsV3(raw);
    expect(result).toMatchObject({
      status: "INPUT_CORRECTION_REQUIRED",
      issues: [{ field: "identity", code: "unsafe", target: "s-brand-fix" }],
    });
    expect(JSON.stringify(result)).not.toContain("081234567890");
  });
  it("screens a legacy source-derived numeric handle toward the source editor", () => {
    const raw = legacy();
    raw.brief.official_sources = ["https://instagram.com/081234567890"];
    expect(parseQuestionFactsV3(raw)).toMatchObject({
      status: "INPUT_CORRECTION_REQUIRED",
      issues: [
        { field: "identity", code: "unsafe", target: "official_sources" },
      ],
    });
  });
  it("preserves the safe meaning of an identity-bearing safety restriction", () => {
    const raw = legacy();
    raw.brief.category = "Klinik gigi";
    raw.brief.brand_type = "Klinik gigi";
    raw.brief.regulated_category_notes =
      "Northstar Dental: jangan mengasumsikan layanan bedah tersedia";
    const facts = projected(raw);
    const unnamed = projectV3SlotContext(facts, AUDIT_MEASUREMENT_MATRIX[0].id);
    expect(JSON.stringify(unnamed)).toContain(
      "jangan mengasumsikan layanan bedah tersedia",
    );
    expect(JSON.stringify(unnamed)).not.toContain("Northstar");
    const named = projectV3SlotContext(facts, AUDIT_MEASUREMENT_MATRIX[6].id);
    expect(JSON.stringify(named)).toContain("jangan mengasumsikan");
  });
  it("keeps confirmed website domains as guard signals outside writer context", () => {
    const raw = request();
    raw.intake.confirmed.brand.primarySource = "https://sudutmenu.example";
    raw.intake.confirmed.customerReasons = [
      "Melihat menu di sudutmenu.example",
    ];
    const facts = projected(raw);
    expect(facts.identity.sourceSignals).toContain("sudutmenu.example");
    expect(
      hasForbiddenV3Identity(
        "Cari kedai di sudutmenu.example",
        facts,
        AUDIT_MEASUREMENT_MATRIX[0],
      ),
    ).toBe(true);
    expect(
      JSON.stringify(
        projectV3SlotContext(facts, AUDIT_MEASUREMENT_MATRIX[0].id),
      ),
    ).not.toContain("sudutmenu.example");
    expect(JSON.stringify(buildV3WriterContext(facts))).not.toContain(
      "sudutmenu.example",
    );
  });
  it("keeps an ordinary product target usable as the slot-4 offering", () => {
    const raw = request(2);
    raw.intake.confirmed.target = { name: "Pembersihan AC", detail: "" };
    raw.intake.confirmed.category = "Jasa perawatan AC";
    const facts = projected(raw);
    expect(facts.identity.targets).not.toContain("Pembersihan AC");
    expect(
      projectV3SlotContext(facts, AUDIT_MEASUREMENT_MATRIX[3].id).context
        .offerings,
    ).toEqual(["Pembersihan AC"]);
  });
  it("still withholds a brand-identifying product target from unnamed slots", () => {
    const facts = projected(request(2));
    expect(facts.identity.targets).toContain("Langganan Kopi Sudut");
    expect(
      projectV3SlotContext(facts, AUDIT_MEASUREMENT_MATRIX[3].id).context
        .offerings,
    ).not.toContain("Langganan Kopi Sudut");
  });
  it("binds every confirmed source and provenance change, not just the first", () => {
    const raw = legacy();
    raw.brief.official_sources.push("https://before.example");
    const before = projected(raw).binding;
    raw.brief.official_sources[1] = "https://after.example";
    expect(isCurrentFactsResponse(before, projected(raw).binding)).toBe(false);

    const second = legacy();
    const competitorBefore = projected(second).binding;
    second.brief.verified_competitor.source_url = "https://after.example";
    expect(
      isCurrentFactsResponse(competitorBefore, projected(second).binding),
    ).toBe(false);

    const third = legacy();
    third.brief.similar_businesses = [
      {
        name: "Other Co",
        source_url: "https://other.example",
        origin: "user",
      },
    ];
    const similarBefore = projected(third).binding;
    third.brief.similar_businesses[0].source_url = "https://changed.example";
    expect(
      isCurrentFactsResponse(similarBefore, projected(third).binding),
    ).toBe(false);
  });
  it("preserves an active product target's detail in facts and binding, separate from market", () => {
    const raw = request(2);
    raw.intake.confirmed.target = {
      name: "Langganan Kopi Sudut",
      detail: "Kemasan 250 gram",
    };
    const facts = projected(raw);
    expect(facts.entityScope).toMatchObject({
      kind: "offering",
      name: "Langganan Kopi Sudut",
      address: null,
      detail: "Kemasan 250 gram",
    });
    expect(facts.marketContext.areas).not.toContain("Kemasan 250 gram");
    raw.intake.confirmed.target!.detail = "Kemasan 500 gram";
    expect(isCurrentFactsResponse(facts.binding, projected(raw).binding)).toBe(
      false,
    );
  });
  it("points an unsafe legacy alias at the existing alias editor", () => {
    const raw = legacy();
    raw.brief.brand_name_variants = ["private@example.test"];
    expect(parseQuestionFactsV3(raw)).toMatchObject({
      status: "INPUT_CORRECTION_REQUIRED",
      issues: [
        {
          field: "identityAliases",
          code: "unsafe",
          target: "brand-name-variants",
        },
      ],
    });
  });
  it("shares only confirmed safe access/fulfilment constraints with every slot", () => {
    const raw = legacy();
    raw.brief.verified_decision_criteria = [
      "Akses kursi roda",
      "harga termurah",
    ];
    const facts = projected(raw);
    expect(facts.accessConstraints).toEqual([
      { text: "Akses kursi roda", provenance: "buyer_constraint" },
    ]);
    expect(facts.buyerConstraints.map((c) => c.text)).toEqual([
      "Akses kursi roda",
      "harga termurah",
    ]);
    const needFit = projectV3SlotContext(facts, AUDIT_MEASUREMENT_MATRIX[2].id);
    expect(JSON.stringify(needFit)).toContain("Akses kursi roda");
    expect(JSON.stringify(needFit)).not.toContain("harga termurah");
    expect(
      JSON.stringify(
        projectV3SlotContext(facts, AUDIT_MEASUREMENT_MATRIX[4].id),
      ),
    ).toContain("harga termurah");
  });
  it("accepts the typed shared-constraint seam without inventing facts", () => {
    const raw = request();
    const facts = projected({
      ...raw,
      factsContext: { accessConstraints: ["bisa datang ke rumah"] },
    });
    expect(facts.accessConstraints).toEqual([
      { text: "bisa datang ke rumah", provenance: "buyer_constraint" },
    ]);
    expect(
      JSON.stringify(
        projectV3SlotContext(facts, AUDIT_MEASUREMENT_MATRIX[2].id),
      ),
    ).toContain("bisa datang ke rumah");
    expect(projected(raw).accessConstraints).toEqual([]);
  });
  it("keeps multiple confirmed comparators unresolved rather than selecting one", () => {
    const facts = projected(request());
    expect(facts.identity.comparators).toEqual(["Kedai Pagi", "Kedai Sore"]);
    expect(facts.comparison).toEqual({ kind: "unresolved", name: null });
    // Founder decision 2026-09-12: with no designated target, slot 9 runs on
    // the category-alternatives relation — never a selected or joined name.
    expect(
      projectV3SlotContext(facts, AUDIT_MEASUREMENT_MATRIX[8].id).context
        .comparison,
    ).toEqual({
      kind: "category-alternatives",
      name: "alternatif lain di kategori Kedai kopi",
    });
    expect(parseQuestionFactsV3(request())).toMatchObject({
      limitations: expect.arrayContaining([
        "comparison_relation_unresolved",
        "competitive_role_unknown",
      ]),
    });
  });
  it("uses a designated single comparator as the slot-9 target", () => {
    const raw = request();
    raw.intake.confirmed.comparators.names = ["Kedai Pagi"];
    const facts = projected(raw);
    expect(facts.comparison).toEqual({ kind: "named", name: "Kedai Pagi" });
    expect(
      projectV3SlotContext(facts, AUDIT_MEASUREMENT_MATRIX[8].id).context
        .comparison,
    ).toEqual({ kind: "named", name: "Kedai Pagi" });
  });
});
