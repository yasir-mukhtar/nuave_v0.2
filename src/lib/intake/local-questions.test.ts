import { describe, expect, it } from "vitest";
import { AUDIT_MEASUREMENT_MATRIX } from "../audit/measurement-matrix";
import { parseSourceInput } from "../audit/source-input";
import { validateCanonicalIndonesianQuestionPack } from "../audit/questions-id";
import type { PromptPack } from "../audit/types";
import { INTAKE_FIXTURES } from "./fixtures";
import { resolveJourneyPath } from "./navigation";
import { prepareGlmQuestionsForIntake } from "./glm-local";
import {
  createLocalStartHandoff,
  DIRECT_TEN_METHOD_VERSION,
  DIRECT_TEN_PROMPT_IDS,
  freezeLocalIntake,
  isLocalQuestionPackCurrent,
  parseLocalQuestionPack,
  prepareGlmLocalPack,
  prepareLocalQuestions,
  updateLocalQuestion,
  type DirectTenPromptPack,
  type GlmQuestionsOutcome,
  type LocalQuestionPack,
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
      expect(
        (pack.promptPack as PromptPack).prompts.map(
          (prompt) => prompt.category,
        ),
      ).toEqual(AUDIT_MEASUREMENT_MATRIX.map((slot) => slot.category));
      expect(
        (pack.promptPack as PromptPack).prompts.filter(
          (prompt) => !prompt.branded,
        ),
      ).toHaveLength(6);
      expect(
        (pack.promptPack as PromptPack).prompts.filter(
          (prompt) => prompt.branded,
        ),
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
          (pack.promptPack as PromptPack).prompts
            .filter((prompt) => prompt.branded)
            .every((prompt) =>
              prompt.question.includes("Langganan Kopi Sudut"),
            ),
        ).toBe(true);
        expect(
          (pack.promptPack as PromptPack).prompts
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
          (pack.promptPack as PromptPack).prompts
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
      (first.promptPack as PromptPack).prompts
        .filter((item) => item.branded)
        .every((item) => item.question.includes("Jalan Melati 12")),
    ).toBe(true);
    expect(
      (second.promptPack as PromptPack).prompts
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
        (value.promptPack as PromptPack).prompts[0].category =
          "direct_comparison";
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
      (pack.promptPack as PromptPack).prompts
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

/* ------------------------------------------------------------------ */
/* GLM experimental pack — the founder-only local path applies the same */
/* v3 rules to generated text and edits.                                */
/* ------------------------------------------------------------------ */

function frozenGlm() {
  const glmFixture = INTAKE_FIXTURES.GLM;
  const state = setScopeAnswer(
    createIntakeState(glmFixture),
    "scope-whole-brand",
  );
  return freezeLocalIntake(
    state,
    glmFixture,
    resolveJourneyPath({
      entry: "read",
      scope: state.scope,
      brandNeedsFix: false,
    }),
  );
}

async function glmOutcome(): Promise<
  Extract<GlmQuestionsOutcome, { status: "ok" }>
> {
  const outcome = await prepareGlmQuestionsForIntake({
    intake: frozenGlm(),
    method: "glm-slots",
  });
  if (outcome.status !== "ok")
    throw new Error(`stub outcome: ${outcome.status}`);
  return outcome;
}

describe("GLM experimental local pack", () => {
  it("builds a pack from the labeled stub outcome and omits self_check per the v3 contract", async () => {
    const input = frozenGlm();
    const outcome = await glmOutcome();
    const pack = prepareGlmLocalPack(input, outcome);
    expect(pack.generation).toMatchObject({
      kind: "glm-experimental-local",
      providerCalls: 0,
      auditExecuted: false,
    });
    if (pack.generation.kind !== "glm-experimental-local") return;
    expect(pack.generation.provenance.transport).toBe("synthetic-stub");
    expect(pack.generation.facts.identity.brand).toBe("Laundry Ceria");
    expect(pack.originals).toEqual(outcome.questions);
    // Mechanical checks cannot prove the self_check claims for model output —
    // the object is absent, never stamped with unearned booleans.
    expect("self_check" in pack.promptPack).toBe(false);
    expect(pack.promptPack.warnings[0]).toContain("respons sintetis");
    expect(pack.promptPack.prompts).toHaveLength(10);
  });

  it("keeps the deterministic pack's legacy self_check unchanged", () => {
    const pack = prepareLocalQuestions(frozen());
    expect(pack.generation.kind).toBe("deterministic-local");
    expect(
      (pack.promptPack as PromptPack).self_check.independent_natural_questions,
    ).toBe(true);
  });

  it("saves a founder-style multi-sentence edit under v3 punctuation", async () => {
    const input = frozenGlm();
    const pack = prepareGlmLocalPack(input, await glmOutcome());
    const slot = AUDIT_MEASUREMENT_MATRIX[0];
    const wording =
      "Lagi cari laundry kiloan buat rutinitas keluarga. Yang bisa antar-jemput di Jakarta Selatan lebih enak dipakai.";
    const edit = updateLocalQuestion(pack, slot.id, wording);
    expect(edit.ok).toBe(true);
    if (!edit.ok) return;
    expect(edit.pack.promptPack.prompts[0].question).toBe(wording);
    // Original wording stays separately retained; the edit never overwrites it.
    expect(edit.pack.originals[0]).toBe(pack.originals[0]);
  });

  it("blocks a GLM edit that leaks the brand into an unnamed slot", async () => {
    const input = frozenGlm();
    const pack = prepareGlmLocalPack(input, await glmOutcome());
    const before = JSON.stringify(pack);
    const edit = updateLocalQuestion(
      pack,
      AUDIT_MEASUREMENT_MATRIX[0].id,
      "Apakah Laundry Ceria cocok untuk cucian keluarga?",
    );
    expect(edit.ok).toBe(false);
    if (edit.ok) return;
    expect(edit.issues.join(" ")).toContain("tidak boleh menyebut bisnis Anda");
    expect(JSON.stringify(pack)).toBe(before);
  });

  it("restores exact edited wording and provenance, and invalidates on facts change", async () => {
    const input = frozenGlm();
    const pack = prepareGlmLocalPack(input, await glmOutcome());
    const edit = updateLocalQuestion(
      pack,
      AUDIT_MEASUREMENT_MATRIX[1].id,
      "Kalau buru-buru, laundry kiloan mana di Jakarta Selatan yang bisa antar-jemput?",
    );
    expect(edit.ok).toBe(true);
    if (!edit.ok) return;
    const restored = parseLocalQuestionPack(
      JSON.parse(JSON.stringify(edit.pack)),
      input,
    );
    expect(restored).not.toBeNull();
    expect(restored?.revision).toBe(1);
    expect(restored?.promptPack.prompts[1].question).toBe(
      "Kalau buru-buru, laundry kiloan mana di Jakarta Selatan yang bisa antar-jemput?",
    );
    expect(restored?.generation.kind).toBe("glm-experimental-local");
    // B2: the generated originals survive the edit — they must not be
    // rebuilt from the edited wording on restore.
    expect(restored?.originals[1]).toBe(pack.originals[1]);
    expect(restored?.originals[1]).not.toBe(
      restored?.promptPack.prompts[1].question,
    );
    expect("self_check" in restored!.promptPack).toBe(false);
    // A facts edit (new fingerprint/factVersion) drops the stored pack.
    const glmFixture = INTAKE_FIXTURES.GLM;
    const changedState = {
      ...setScopeAnswer(createIntakeState(glmFixture), "scope-whole-brand"),
      facts: { text: "Melayani antar-jemput setiap hari." },
      factVersion: 2,
    };
    const changed = freezeLocalIntake(
      changedState,
      glmFixture,
      resolveJourneyPath({
        entry: "read",
        scope: changedState.scope,
        brandNeedsFix: false,
      }),
    );
    expect(isLocalQuestionPackCurrent(restored, changed)).toBe(false);
  });

  it("keeps the handoff honestly labeled and never executes an audit", async () => {
    const input = frozenGlm();
    const pack = prepareGlmLocalPack(input, await glmOutcome());
    const handoff = createLocalStartHandoff(pack, input);
    expect(handoff.mode).toBe("glm-experimental-local");
    expect(handoff.auditExecuted).toBe(false);
    expect(handoff.providerCalls).toBe(0);
  });

  it("rejects a stored pack whose generation record was tampered with", async () => {
    const input = frozenGlm();
    const pack = prepareGlmLocalPack(input, await glmOutcome());
    const stored = JSON.parse(JSON.stringify(pack)) as LocalQuestionPack;
    (
      stored.generation as { provenance: { transport: string } }
    ).provenance.transport = "cheaper-inference";
    expect(parseLocalQuestionPack(stored, input)).toBeNull();
    const mismatch = JSON.parse(JSON.stringify(pack)) as LocalQuestionPack;
    (
      mismatch.generation as { provenance: { returnedModel: string } }
    ).provenance.returnedModel = "zai/glm-5.3-flash";
    // modelMismatch flag now inconsistent with the identifiers → rejected.
    expect(parseLocalQuestionPack(mismatch, input)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Spec 009 direct-ten pack — ten purpose-free unnamed texts under the  */
/* flat boundary; no matrix metadata, purposes, or composition gates.   */
/* ------------------------------------------------------------------ */

async function directTenOutcome(): Promise<
  Extract<GlmQuestionsOutcome, { status: "ok" }>
> {
  const outcome = await prepareGlmQuestionsForIntake({
    intake: frozenGlm(),
    method: "direct-ten",
  });
  if (outcome.status !== "ok")
    throw new Error(`stub outcome: ${outcome.status}`);
  return outcome;
}

describe("direct-ten local pack (Spec 009)", () => {
  it("builds a flat pack: stable IDs, no legacy metadata, honest synthetic warning", async () => {
    const input = frozenGlm();
    const outcome = await directTenOutcome();
    const pack = prepareGlmLocalPack(input, outcome);
    expect(pack.generation).toMatchObject({
      kind: "glm-direct-ten-local",
      providerCalls: 0,
      auditExecuted: false,
    });
    if (pack.generation.kind !== "glm-direct-ten-local") return;
    expect(pack.generation.provenance.method).toBe("direct-ten");
    expect(pack.generation.provenance.transport).toBe("synthetic-stub");
    expect(pack.originals).toEqual(outcome.questions);
    const promptPack = pack.promptPack as DirectTenPromptPack;
    expect(promptPack.method).toBe(DIRECT_TEN_METHOD_VERSION);
    expect(promptPack.summary).toEqual({
      total_prompts: 10,
      unbranded_prompts: 10,
      branded_prompts: 0,
    });
    // No self_check and no matrix fields anywhere on the new contract.
    expect("self_check" in promptPack).toBe(false);
    for (const prompt of promptPack.prompts) {
      expect(Object.keys(prompt).sort()).toEqual([
        "prompt_id",
        "question",
        "review_status",
      ]);
    }
    expect(promptPack.prompts.map((prompt) => prompt.prompt_id)).toEqual(
      DIRECT_TEN_PROMPT_IDS,
    );
    expect(promptPack.warnings[0]).toContain("respons sintetis");
    expect(promptPack.warnings[0]).toContain("bukan keluaran provider");
  });

  it("saves a multi-sentence edit, marks it changed, and preserves the original", async () => {
    const input = frozenGlm();
    const pack = prepareGlmLocalPack(input, await directTenOutcome());
    const wording =
      "Lagi cari laundry kiloan buat rutinitas keluarga. Yang bisa antar-jemput di Jakarta Selatan lebih enak dipakai.";
    const edit = updateLocalQuestion(pack, DIRECT_TEN_PROMPT_IDS[0]!, wording);
    expect(edit.ok).toBe(true);
    if (!edit.ok) return;
    expect(edit.pack.promptPack.prompts[0].question).toBe(wording);
    expect(edit.pack.originals[0]).toBe(pack.originals[0]);
    expect(edit.pack.originals[0]).not.toBe(wording);
    // A legacy matrix slot ID cannot locate a direct-ten text.
    expect(
      updateLocalQuestion(pack, AUDIT_MEASUREMENT_MATRIX[0].id, wording).ok,
    ).toBe(false);
  });

  it("rejects an edit naming the audited business at any position", async () => {
    const input = frozenGlm();
    const pack = prepareGlmLocalPack(input, await directTenOutcome());
    const before = JSON.stringify(pack);
    const edit = updateLocalQuestion(
      pack,
      DIRECT_TEN_PROMPT_IDS[7]!,
      "Apakah Laundry Ceria cocok untuk cucian keluarga?",
    );
    expect(edit.ok).toBe(false);
    if (edit.ok) return;
    expect(edit.issues.join(" ")).toContain("tidak boleh menyebut bisnis Anda");
    expect(JSON.stringify(pack)).toBe(before);
  });

  it("restores edited wording and originals, then invalidates on a facts change", async () => {
    const input = frozenGlm();
    const pack = prepareGlmLocalPack(input, await directTenOutcome());
    const edit = updateLocalQuestion(
      pack,
      DIRECT_TEN_PROMPT_IDS[1]!,
      "Kalau buru-buru, laundry kiloan mana di Jakarta Selatan yang bisa antar-jemput?",
    );
    expect(edit.ok).toBe(true);
    if (!edit.ok) return;
    const restored = parseLocalQuestionPack(
      JSON.parse(JSON.stringify(edit.pack)),
      input,
    );
    expect(restored).not.toBeNull();
    expect(restored?.generation.kind).toBe("glm-direct-ten-local");
    expect(restored?.revision).toBe(1);
    expect(restored?.promptPack.prompts[1].question).toBe(
      "Kalau buru-buru, laundry kiloan mana di Jakarta Selatan yang bisa antar-jemput?",
    );
    expect(restored?.originals[1]).toBe(pack.originals[1]);
    expect(restored?.originals[1]).not.toBe(
      restored?.promptPack.prompts[1].question,
    );
    expect("self_check" in restored!.promptPack).toBe(false);
    const glmFixture = INTAKE_FIXTURES.GLM;
    const changedState = {
      ...setScopeAnswer(createIntakeState(glmFixture), "scope-whole-brand"),
      facts: { text: "Melayani antar-jemput setiap hari." },
      factVersion: 2,
    };
    const changed = freezeLocalIntake(
      changedState,
      glmFixture,
      resolveJourneyPath({
        entry: "read",
        scope: changedState.scope,
        brandNeedsFix: false,
      }),
    );
    expect(isLocalQuestionPackCurrent(restored, changed)).toBe(false);
  });

  it("rejects a stored pack whose method/kind do not agree", async () => {
    const input = frozenGlm();
    const pack = prepareGlmLocalPack(input, await directTenOutcome());
    const stored = JSON.parse(JSON.stringify(pack)) as LocalQuestionPack;
    (
      stored.generation as { provenance: { method: string } }
    ).provenance.method = "glm-slots";
    expect(parseLocalQuestionPack(stored, input)).toBeNull();
    // A matrix-shaped promptPack is not a direct-ten pack.
    const matrixShaped = JSON.parse(JSON.stringify(pack)) as LocalQuestionPack;
    matrixShaped.promptPack = prepareLocalQuestions(frozen()).promptPack;
    expect(parseLocalQuestionPack(matrixShaped, input)).toBeNull();
  });

  it("labels the handoff as the direct-ten mode and never executes an audit", async () => {
    const input = frozenGlm();
    const pack = prepareGlmLocalPack(input, await directTenOutcome());
    const handoff = createLocalStartHandoff(pack, input);
    expect(handoff.mode).toBe("glm-direct-ten-local");
    expect(handoff.auditExecuted).toBe(false);
    expect(handoff.providerCalls).toBe(0);
  });
});

describe("sessionConfirmedBrief (Spec 009 brief projection)", () => {
  it("projects only confirmed facts into the audit brief shape", async () => {
    const { sessionConfirmedBrief } = await import("./local-questions");
    const input = frozen();
    const brief = sessionConfirmedBrief(input.confirmed);
    expect(brief.brand_name).toBe(input.confirmed.brand.name);
    // The brief carries the normalized public URL, never the raw typed text.
    expect(brief.official_sources).toEqual([
      expect.stringMatching(/^https?:\/\//),
    ]);
    expect(brief.official_sources[0]).toBe(
      parseSourceInput(input.confirmed.brand.primarySource)!.normalizedUrl,
    );
    expect(brief.category).toBe(input.confirmed.category);
    expect(brief.verified_offerings.length).toBeGreaterThan(0);
    // Buyer-supplied facts are labeled, never merged into observed fields.
    if (input.confirmed.publicFact)
      expect(brief.customer_supplied_facts).toEqual([
        input.confirmed.publicFact,
      ]);
    // Nothing the buyer never confirmed is invented.
    expect(brief.agency_name).toBe("");
    expect(brief.usp).toBe("");
    expect(brief.conversion_action).toBe("");
    expect(brief.language).toBe("en-US");
  });

  it("keeps unconfirmed comparator knowledge as a category-level placeholder", async () => {
    const { sessionConfirmedBrief } = await import("./local-questions");
    const input = frozen();
    const brief = sessionConfirmedBrief({
      ...input.confirmed,
      comparators: { mode: "category-alternatives", names: [] },
    });
    expect(brief.verified_competitor.name).toContain("alternatif");
    expect(brief.verified_competitor.name).toContain(input.confirmed.category);
    expect(brief.verified_competitor.source_url).toBe("");
  });
});
