import { describe, expect, it } from "vitest";
import { AUDIT_MEASUREMENT_MATRIX } from "../audit/measurement-matrix";
import { validateCanonicalIndonesianQuestionPack } from "../audit/questions-id";
import { INTAKE_FIXTURES } from "./fixtures";
import { resolveJourneyPath } from "./navigation";
import {
  createLocalStartHandoff,
  freezeLocalIntake,
  isLocalQuestionPackCurrent,
  parseLocalQuestionPack,
  prepareLocalQuestions,
  updateLocalQuestion,
} from "./local-questions";
import {
  createIntakeState,
  deriveReviewRowsFromState,
  setCategoryCustom,
  setScopeAnswer,
  type IntakeState,
} from "./state";

const fixture = INTAKE_FIXTURES.F1;
function answered(scope: IntakeState["scope"] = "brand"): IntakeState {
  const seeded = setScopeAnswer(
    createIntakeState(fixture),
    {
      brand: "scope-whole-brand",
      cabang: "scope-branch",
      produk: "scope-product",
    }[scope],
  );
  return {
    ...setCategoryCustom(
      seeded,
      scope === "produk" ? "Langganan kopi bulanan" : "Kedai kopi",
    ),
    branch:
      scope === "cabang"
        ? {
            selectedId: "custom-branch",
            custom: [
              {
                id: "custom-branch",
                label: "Gerai Selatan",
                detail: "Jalan Melati 12, Jakarta Selatan",
                on: true,
              },
            ],
          }
        : { selectedId: null, custom: [] },
    product:
      scope === "produk"
        ? {
            selectedId: "custom-product",
            custom: [
              { id: "custom-product", label: "Langganan Kopi Sudut", on: true },
            ],
          }
        : { selectedId: null, custom: [] },
    offerings:
      scope === "produk" ? { onIds: [], custom: [] } : seeded.offerings,
    competitors: {
      keptIds: [],
      custom: ["Kedai Pagi", "Kedai Sore"],
      noDirect: false,
    },
    service: { onIds: ["service-location", "service-delivery"] },
    factVersion: 7,
  };
}
function frozen(state = answered()) {
  return freezeLocalIntake(
    state,
    fixture,
    resolveJourneyPath({
      entry: "read",
      scope: state.scope,
      brandNeedsFix: false,
    }),
  );
}

describe("local question and start handoff", () => {
  it.each(["brand", "cabang", "produk"] as const)(
    "freezes exact active Review and prepares a valid 6/4 pack for %s",
    (scope) => {
      const state = answered(scope);
      const input = frozen(state);
      const pack = prepareLocalQuestions(input);
      expect(input.reviewRows).toEqual(
        deriveReviewRowsFromState(
          state,
          fixture,
          resolveJourneyPath({ entry: "read", scope, brandNeedsFix: false }),
        ),
      );
      expect(
        validateCanonicalIndonesianQuestionPack(
          pack.promptPack.prompts.map((prompt) => prompt.question),
          pack.generationInput,
        ),
      ).toEqual([]);
      expect(pack.promptPack.prompts.map((prompt) => prompt.category)).toEqual(
        AUDIT_MEASUREMENT_MATRIX.map((slot) => slot.category),
      );
      expect(
        pack.promptPack.prompts.filter((prompt) => !prompt.branded),
      ).toHaveLength(6);
      expect(
        pack.promptPack.prompts.filter((prompt) => prompt.branded),
      ).toHaveLength(4);
      expect(createLocalStartHandoff(pack, input)).toMatchObject({
        mode: "local-simulation",
        auditExecuted: false,
        providerCalls: 0,
        input,
      });
      expect(input.confirmed.scope).toBe(scope);
      if (scope === "produk") {
        expect(input.confirmed.offerings).toEqual([]);
        expect(input.reviewRows.some((row) => row.key === "offerings")).toBe(
          false,
        );
        expect(
          pack.promptPack.prompts
            .filter((prompt) => prompt.branded)
            .every((prompt) =>
              prompt.question.includes("Langganan Kopi Sudut"),
            ),
        ).toBe(true);
        expect(
          pack.promptPack.prompts
            .filter((prompt) => !prompt.branded)
            .every(
              (prompt) => !prompt.question.includes("Langganan Kopi Sudut"),
            ),
        ).toBe(true);
      }
      if (scope === "cabang") {
        expect(input.confirmed.target?.detail).toBe(
          "Jalan Melati 12, Jakarta Selatan",
        );
        expect(
          pack.promptPack.prompts
            .filter((prompt) => prompt.branded)
            .every((prompt) => prompt.question.includes("Gerai Selatan")),
        ).toBe(true);
      }
    },
  );

  it("preserves every selected service channel, reason, offering, comparator, and public fact", () => {
    const state = {
      ...answered(),
      facts: { text: "Tersedia ukuran kemasan 250 gram." },
    };
    const input = frozen(state);
    const pack = prepareLocalQuestions(input);
    expect(input.confirmed.serviceChannels.map((item) => item.channel)).toEqual(
      ["on_premise", "delivery"],
    );
    expect(input.confirmed.customerReasons).toHaveLength(
      state.customers.onIds.length,
    );
    expect(input.confirmed.offerings).toHaveLength(
      state.offerings.onIds.length,
    );
    expect(pack.generationInput.offerings).toEqual(input.confirmed.offerings);
    expect(pack.generationInput.customer_needs).toEqual(
      input.confirmed.customerReasons,
    );
    expect(input.confirmed.comparators.names).toEqual([
      "Kedai Pagi",
      "Kedai Sore",
    ]);
    expect(input.confirmed.publicFact).toBe(state.facts.text);
    expect(pack.promptPack.prompts[8].question).toContain(
      "Kedai Pagi dan Kedai Sore",
    );
    expect(pack.promptPack.prompts[1].question).toContain(
      "layanan di lokasi bisnis atau pengiriman ke pelanggan",
    );
    expect(Object.isFrozen(input.confirmed.customerReasons)).toBe(true);
    expect(Object.isFrozen(pack.promptPack.prompts)).toBe(true);
  });

  it("keeps optional reasons empty without inventing decision criteria", () => {
    const input = frozen({
      ...answered(),
      customers: { onIds: [], custom: [] },
    });
    const pack = prepareLocalQuestions(input);
    expect(input.confirmed.customerReasons).toEqual([]);
    expect(pack.generationInput.customer_needs).toEqual([]);
    expect(pack.generationInput.decision_considerations).toEqual([]);
  });

  it("retains the distinguishing manual branch address in named questions and scope", () => {
    const state = answered("cabang");
    const first = prepareLocalQuestions(frozen(state));
    const changed = {
      ...state,
      branch: {
        ...state.branch,
        custom: state.branch.custom.map((item) => ({
          ...item,
          detail: "Jalan Kenanga 80, Jakarta Selatan",
        })),
      },
    };
    const second = prepareLocalQuestions(frozen(changed));
    expect(first.promptPack.brand.entity_scope).toContain("Jalan Melati 12");
    expect(second.promptPack.brand.entity_scope).toContain("Jalan Kenanga 80");
    expect(
      first.promptPack.prompts
        .filter((item) => item.branded)
        .every((item) => item.question.includes("Jalan Melati 12")),
    ).toBe(true);
    expect(
      second.promptPack.prompts
        .filter((item) => item.branded)
        .every((item) => item.question.includes("Jalan Kenanga 80")),
    ).toBe(true);
  });

  it("supports explicit category alternatives and removes inactive areas and offerings", () => {
    const input = frozen({
      ...answered("produk"),
      market: { kind: "seluruh", areaIds: [], customAreas: [] },
      competitors: { noDirect: true, keptIds: [], custom: [] },
    });
    const pack = prepareLocalQuestions(input);
    expect(input.confirmed.market.areas).toEqual([]);
    expect(input.confirmed.comparators.names).toEqual([]);
    expect(pack.promptPack.prompts[8].question).toContain(
      "alternatif lain di kategori Langganan kopi bulanan",
    );
    expect(
      pack.promptPack.prompts.some((prompt) =>
        prompt.question.includes("Jakarta Selatan"),
      ),
    ).toBe(false);
  });

  it("is sensitive to committed category, target, channel and geography", () => {
    const brand = prepareLocalQuestions(frozen());
    const product = prepareLocalQuestions(frozen(answered("produk")));
    expect(
      product.promptPack.prompts.map((prompt) => prompt.question),
    ).not.toEqual(brand.promptPack.prompts.map((prompt) => prompt.question));
    const national = prepareLocalQuestions(
      frozen({
        ...answered(),
        market: { kind: "seluruh", areaIds: [], customAreas: [] },
        service: { onIds: ["service-online"] },
      }),
    );
    expect(national.promptPack.prompts[0].question).toContain(
      "seluruh Indonesia",
    );
    expect(national.promptPack.prompts[1].question).toContain(
      "penggunaan secara online",
    );
  });

  it("rejects stale fact versions, changed meanings even with an unchanged version, and modified stored snapshots", () => {
    const state = answered();
    const input = frozen(state);
    const pack = prepareLocalQuestions(input);
    for (const next of [
      frozen({ ...state, factVersion: 8 }),
      frozen({ ...state, facts: { text: "Kemasan ukuran 500 gram." } }),
    ]) {
      expect(isLocalQuestionPackCurrent(pack, next)).toBe(false);
      expect(() => createLocalStartHandoff(pack, next)).toThrow(
        "sudah berubah",
      );
    }
    const corrupt = JSON.parse(JSON.stringify(pack));
    corrupt.input.confirmed.category = "Jenis bisnis berbeda";
    expect(() => createLocalStartHandoff(corrupt, input)).toThrow(
      "sudah berubah",
    );
  });

  it("preserves valid wording edits through JSON restore and the exact local start", () => {
    const input = frozen();
    const pack = prepareLocalQuestions(input);
    const wording = "Pilihan kedai kopi apa yang cocok di Jakarta Selatan?";
    const edit = updateLocalQuestion(
      pack,
      AUDIT_MEASUREMENT_MATRIX[0].id,
      wording,
    );
    expect(edit.ok).toBe(true);
    if (!edit.ok) return;
    expect(pack.promptPack.prompts[0].question).not.toBe(wording);
    const restored = parseLocalQuestionPack(
      JSON.parse(JSON.stringify(edit.pack)),
      input,
    );
    expect(restored?.revision).toBe(1);
    expect(restored?.promptPack.prompts[0].question).toBe(wording);
    expect(
      createLocalStartHandoff(restored!, input).questions.promptPack.prompts[0]
        .question,
    ).toBe(wording);
  });

  it.each([
    [0, "Apakah KOPI—SUDUT cocok untuk minum kopi?"],
    [0, "Apakah Kedai Pagi cocok untuk minum kopi?"],
    [6, "Kedai kopi mana yang cocok untuk bekerja?"],
    [8, "Di mana alamat Kopi Sudut dan Kedai Pagi dan Kedai Sore?"],
    [0, ""],
    [0, "Rekomendasi kedai kopi di Jakarta Selatan"],
    [0, `${"a".repeat(701)}?`],
  ])(
    "blocks a mechanically invalid slot %i edit without changing the pack",
    (index, wording) => {
      const pack = prepareLocalQuestions(frozen());
      const before = JSON.stringify(pack);
      const edit = updateLocalQuestion(
        pack,
        AUDIT_MEASUREMENT_MATRIX[index].id,
        wording,
      );
      expect(edit.ok).toBe(false);
      expect(JSON.stringify(pack)).toBe(before);
    },
  );

  it("screens branded product wording and rejects corrupt session metadata", () => {
    const input = frozen(answered("produk"));
    const pack = prepareLocalQuestions(input);
    expect(
      updateLocalQuestion(
        pack,
        AUDIT_MEASUREMENT_MATRIX[0].id,
        "Di mana bisa membeli Langganan Kopi Sudut?",
      ).ok,
    ).toBe(false);
    for (const mutate of [
      (value: typeof pack) => {
        value.promptPack.brand.brand_name = "Unrelated brand";
      },
      (value: typeof pack) => {
        value.promptPack.brand.entity_scope = "Seluruh brand lain";
      },
      (value: typeof pack) => {
        value.promptPack.brand.category = "Kategori berbeda";
      },
      (value: typeof pack) => {
        value.promptPack.prompts[0].category = "direct_comparison";
      },
      (value: typeof pack) => {
        value.promptPack.prompts[0].question = "Di mana Kopi Sudut berada?";
      },
      (value: typeof pack) => {
        value.promptPack.summary.branded_prompts = 5;
      },
      (value: typeof pack) => {
        value.revision = -1;
      },
    ]) {
      const corrupt = JSON.parse(JSON.stringify(pack));
      mutate(corrupt);
      expect(parseLocalQuestionPack(corrupt, input)).toBeNull();
    }
    expect(parseLocalQuestionPack(null, input)).toBeNull();
    expect(
      parseLocalQuestionPack(
        pack,
        frozen({ ...answered("produk"), factVersion: 8 }),
      ),
    ).toBeNull();
  });

  it("screens an Instagram source handle that differs from the confirmed name", () => {
    const state = {
      ...answered(),
      brandCorrected: {
        name: "Kopi Sudut",
        source: "https://instagram.com/sudut.daily",
      },
    };
    const pack = prepareLocalQuestions(frozen(state));
    expect(pack.generationInput.brand_name_variants).toContain("sudut.daily");
    expect(
      updateLocalQuestion(
        pack,
        AUDIT_MEASUREMENT_MATRIX[0].id,
        "Apakah sudut.daily cocok untuk minum kopi?",
      ).ok,
    ).toBe(false);
    expect(
      pack.input.reviewRows.some((row) => /alias|nama lain/i.test(row.label)),
    ).toBe(false);
  });

  it("never leaks a branded offering whose word order differs from the brand", () => {
    const pack = prepareLocalQuestions(frozen());
    expect(pack.generationInput.brand_name_variants).toContain(
      "Kopi Susu Sudut",
    );
    expect(
      pack.promptPack.prompts
        .filter((item) => !item.branded)
        .every((item) => !item.question.includes("Kopi Susu Sudut")),
    ).toBe(true);
    expect(
      updateLocalQuestion(
        pack,
        AUDIT_MEASUREMENT_MATRIX[3].id,
        "Di mana saya bisa menemukan Kopi Susu Sudut?",
      ).ok,
    ).toBe(false);
  });
});
