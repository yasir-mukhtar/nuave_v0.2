import { AUDIT_MEASUREMENT_MATRIX } from "../audit/measurement-matrix";
import { validateCanonicalIndonesianQuestionPack } from "../audit/questions-id";
import { describe, expect, it } from "vitest";
import { INTAKE_FIXTURES } from "./fixtures";
import { resolveJourneyPath } from "./navigation";
import {
  canReuseQuestionPreview,
  classifyQuestionPreviewCompletion,
  createQuestionPreviewRequestGate,
  deterministicQuestionPreviewAdapter,
  freezeQuestionPreviewInput,
  questionPreviewAfterMaterialSave,
} from "./question-preview";
import {
  addMultiCustom,
  addSingleCustom,
  commitScopeOption,
  confirmIntakeScreen,
  createIntakeState,
  deriveReviewRowsFromState,
  setCompetitorsNoDirect,
  setFactsText,
  type IntakeState,
} from "./state";

const F1 = INTAKE_FIXTURES.F1;

function confirmPath(
  state: IntakeState,
  path: ReturnType<typeof resolveJourneyPath>,
): IntakeState {
  return path.reduce(confirmIntakeScreen, state);
}

describe("freezeQuestionPreviewInput", () => {
  it("freezes the exact Review projection and only supported minimized meanings", () => {
    const state = setFactsText(
      createIntakeState(F1),
      "Buka sampai pukul 23.00 pada hari Jumat.",
    );
    const path = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });

    const snapshot = freezeQuestionPreviewInput(
      confirmPath(state, path),
      F1,
      path,
    );

    expect(snapshot.factVersion).toBe(1);
    expect(snapshot.review).toEqual(deriveReviewRowsFromState(state, F1, path));
    expect(snapshot.review.find((row) => row.key === "facts")?.value).toBe(
      "Buka sampai pukul 23.00 pada hari Jumat.",
    );
    expect(snapshot.brief).toMatchObject({
      brand_name: "Kopi Sudut",
      brand_name_variants: [],
      scope: "Seluruh brand Kopi Sudut",
      category: "Kedai kopi susu (chain lokal)",
      offerings: [
        "Kopi Susu Sudut",
        "Americano dan espresso",
        "Latte gula aren",
      ],
      customer_needs: [
        "Ngopi enak dekat kantor",
        "Tempat nugas atau kerja yang nyaman",
        "Kopi harian yang rasanya konsisten",
        "Harga masuk akal untuk diminum tiap hari",
      ],
      decision_considerations: [],
      differentiator: "",
      comparison_business: {
        name: "Fore Coffee",
        scope: "",
        source_url: "",
      },
      known_accuracy_questions: [],
      conversion_action: "",
      official_source_urls: ["https://kopisudut.id/"],
    });
    expect(snapshot.brief.customer_context).toBe("");
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.brief)).toBe(true);
    expect(Object.isFrozen(snapshot.brief.offerings)).toBe(true);
  });

  it("maps the selected product as both product scope and offering", () => {
    let state = commitScopeOption(createIntakeState(F1), F1, "scope-product");
    state = addSingleCustom(state, "product", {
      id: "product-custom-1",
      label: "Paket Minum Kantor",
      on: true,
    });
    const path = resolveJourneyPath({
      entry: "read",
      scope: "produk",
      brandNeedsFix: false,
    });

    const snapshot = freezeQuestionPreviewInput(
      confirmPath(state, path),
      F1,
      path,
    );

    expect(snapshot.brief.scope).toBe("Produk: Paket Minum Kantor");
    expect(snapshot.brief.offerings).toEqual(["Paket Minum Kantor"]);
  });

  it("derives the canonical branch scope prefix", () => {
    let state = commitScopeOption(createIntakeState(F1), F1, "scope-branch");
    state = addSingleCustom(state, "branch", {
      id: "branch-custom-1",
      label: "Senopati",
      on: true,
    });
    const path = resolveJourneyPath({
      entry: "read",
      scope: "cabang",
      brandNeedsFix: false,
    });

    const snapshot = freezeQuestionPreviewInput(
      confirmPath(state, path),
      F1,
      path,
    );

    expect(snapshot.brief.scope).toBe("Cabang: Senopati");
  });

  it("keeps no-direct mode explicit and builds a valid category comparison", async () => {
    const state = setCompetitorsNoDirect(createIntakeState(F1), true);
    const path = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });

    const snapshot = freezeQuestionPreviewInput(
      confirmPath(state, path),
      F1,
      path,
    );
    const pack = await deterministicQuestionPreviewAdapter(snapshot);

    expect(snapshot.brief.comparison_business).toBeNull();
    expect(pack.slots).toHaveLength(10);
    expect(pack.slots[8].text).toContain("alternatif lain di kategori");
  });

  it("rejects sensitive optional text before it can be frozen", () => {
    const state = setFactsText(
      createIntakeState(F1),
      "Hubungi owner@example.com",
    );
    const path = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });

    expect(() =>
      freezeQuestionPreviewInput(confirmPath(state, path), F1, path),
    ).toThrow("Intake review is not ready for question preview.");
  });

  it("rejects sensitive text from any mapped add-line", () => {
    const state = addMultiCustom(createIntakeState(F1), "customers", {
      id: "customer-chip-custom-1",
      label: "Hubungi owner@example.com",
      on: true,
    });
    const path = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });

    expect(() =>
      freezeQuestionPreviewInput(confirmPath(state, path), F1, path),
    ).toThrow("Sensitive intake text cannot enter question preview.");
  });

  it("maps the selected prepared category instead of a stale custom label", () => {
    const state = {
      ...createIntakeState(F1),
      category: {
        selectedId: "category-specialty",
        customLabel: "Warung kopi lama",
      },
    };
    const path = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });

    const snapshot = freezeQuestionPreviewInput(
      confirmPath(state, path),
      F1,
      path,
    );

    expect(snapshot.brief.category).toBe("Coffee shop specialty");
  });

  it("keeps set-like offerings stable when their internal order changes", () => {
    const before = createIntakeState(F1);
    const after = {
      ...before,
      offerings: {
        ...before.offerings,
        onIds: [...before.offerings.onIds.slice(1), before.offerings.onIds[0]],
      },
    };
    const path = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });

    const beforeInput = freezeQuestionPreviewInput(
      confirmPath(before, path),
      F1,
      path,
    );
    const afterInput = freezeQuestionPreviewInput(
      confirmPath(after, path),
      F1,
      path,
    );

    expect(afterInput.brief.offerings).toEqual(beforeInput.brief.offerings);
  });

  it("keeps set-like comparators and Review order stable after toggling", () => {
    const before = createIntakeState(F1);
    const after = {
      ...before,
      competitors: {
        ...before.competitors,
        keptIds: [
          ...before.competitors.keptIds.slice(1),
          before.competitors.keptIds[0],
        ],
      },
    };
    const path = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });

    const beforeInput = freezeQuestionPreviewInput(
      confirmPath(before, path),
      F1,
      path,
    );
    const afterInput = freezeQuestionPreviewInput(
      confirmPath(after, path),
      F1,
      path,
    );

    expect(afterInput.review).toEqual(beforeInput.review);
    expect(afterInput.brief.comparison_business).toEqual(
      beforeInput.brief.comparison_business,
    );
  });

  it("keeps every set-like Review row stable under selection reordering", () => {
    const seeded = createIntakeState(F1);
    const before = {
      ...seeded,
      service: { onIds: ["service-location", "service-delivery"] },
      market: {
        kind: "beberapa" as const,
        areaIds: ["city-1", "city-2"],
        customAreas: [],
      },
    };
    const after = {
      ...before,
      offerings: {
        ...before.offerings,
        onIds: [...before.offerings.onIds].reverse(),
      },
      customers: {
        ...before.customers,
        onIds: [...before.customers.onIds].reverse(),
      },
      service: { onIds: [...before.service.onIds].reverse() },
      market: {
        ...before.market,
        areaIds: [...before.market.areaIds].reverse(),
      },
    };
    const path = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });

    const beforeInput = freezeQuestionPreviewInput(
      confirmPath(before, path),
      F1,
      path,
    );
    const afterInput = freezeQuestionPreviewInput(
      confirmPath(after, path),
      F1,
      path,
    );

    expect(afterInput.review).toEqual(beforeInput.review);
    expect(afterInput.brief.offerings).toEqual(beforeInput.brief.offerings);
    expect(afterInput.brief.customer_needs).toEqual(
      beforeInput.brief.customer_needs,
    );
  });

  it("rejects an unresolved comparator id instead of treating it as no-direct", () => {
    const state = {
      ...createIntakeState(F1),
      competitors: { keptIds: ["missing-id"], custom: [], noDirect: false },
    };
    const path = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });

    expect(() =>
      freezeQuestionPreviewInput(confirmPath(state, path), F1, path),
    ).toThrow(
      "A confirmed comparator or explicit no-direct choice is required.",
    );
  });
});

describe("deterministicQuestionPreviewAdapter", () => {
  it("admits only one in-flight request and supersedes invalidated work", () => {
    const gate = createQuestionPreviewRequestGate();

    const first = gate.begin();
    expect(first).toBe(1);
    expect(gate.begin()).toBeNull();

    gate.finish(first!);
    const second = gate.begin();
    expect(second).toBe(2);
    gate.invalidate();
    expect(gate.activeRequestId()).not.toBe(second);
  });

  it("classifies current, stale, and wrong-version completions", () => {
    expect(classifyQuestionPreviewCompletion(2, 1, 1, 1)).toBe("stale");
    expect(classifyQuestionPreviewCompletion(2, 2, 1, 2)).toBe("invalid");
    expect(classifyQuestionPreviewCompletion(2, 2, 1, 1)).toBe("accept");
  });

  it("reuses only a ready pack for the unchanged fact version", async () => {
    const path = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });
    const input = freezeQuestionPreviewInput(
      confirmPath(createIntakeState(F1), path),
      F1,
      path,
    );
    const pack = await deterministicQuestionPreviewAdapter(input);

    expect(canReuseQuestionPreview({ status: "ready", pack }, 1)).toBe(true);
    expect(canReuseQuestionPreview({ status: "ready", pack }, 2)).toBe(false);
    expect(
      canReuseQuestionPreview({ status: "pending", factVersion: 1 }, 1),
    ).toBe(false);
  });

  it("projects the canonical matrix into exactly six unnamed and four named questions", async () => {
    const state = createIntakeState(F1);
    const path = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });
    const input = freezeQuestionPreviewInput(
      confirmPath(state, path),
      F1,
      path,
    );

    const pack = await deterministicQuestionPreviewAdapter(input);

    expect(pack.factVersion).toBe(input.factVersion);
    expect(pack.brandName).toBe("Kopi Sudut");
    expect(pack.slots).toHaveLength(10);
    expect(pack.slots.filter((slot) => slot.unbranded)).toHaveLength(6);
    expect(pack.slots.filter((slot) => !slot.unbranded)).toHaveLength(4);
    expect(pack.slots.map((slot) => slot.intent)).toEqual(
      AUDIT_MEASUREMENT_MATRIX.map((slot) => slot.customerFacingLabel),
    );
    expect(
      validateCanonicalIndonesianQuestionPack(
        pack.slots.map((slot) => slot.text),
        input.brief,
      ),
    ).toEqual([]);
    expect(Object.isFrozen(pack)).toBe(true);
    expect(Object.isFrozen(pack.slots)).toBe(true);
  });

  it("invalidates a ready pack only after a material save", async () => {
    const path = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });
    const input = freezeQuestionPreviewInput(
      confirmPath(createIntakeState(F1), path),
      F1,
      path,
    );
    const pack = await deterministicQuestionPreviewAdapter(input);
    const ready = { status: "ready" as const, pack };

    expect(questionPreviewAfterMaterialSave(ready, false)).toBe(ready);
    expect(questionPreviewAfterMaterialSave(ready, true)).toEqual({
      status: "idle",
    });
  });
});
