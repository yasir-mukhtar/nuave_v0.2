/**
 * Phase 5 real-IntakeState tests (shell-owned answers, validity from state,
 * review projection, fact versions, scope invalidation, remount safety).
 * Offline, no DOM harness: pure transitions assert directly; remount safety
 * goes through `renderToStaticMarkup` sharing one state object across two
 * mounts — the answers must survive because they live outside the screen.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { INTAKE_FIXTURES } from "./fixtures";
import type { IntakeScreenSlotProps } from "./navigation";
import { resolveJourneyPath } from "./navigation";
import { BAB2_SCREENS } from "./screens-bab2";
import { deriveReviewRows } from "./screens-bab2";
import {
  addCompetitor,
  addMarketArea,
  addMultiCustom,
  addSingleCustom,
  applyScopeChange,
  commitScopeOption,
  confirmIntakeScreen,
  createIntakeState,
  deriveReviewRowsFromState,
  isMaterialChange,
  isReviewApprovable,
  isScreenAnswerValid,
  nextUnconfirmedScreen,
  setCategoryAnswer,
  setCategoryCustom,
  setCompetitorsNoDirect,
  setFactsText,
  setMarketKind,
  setScopeAnswer,
  summarizeCommittedAnswers,
  toggleCompetitor,
  toggleMarketArea,
  toggleMultiAnswer,
  withBumpedFactVersion,
  type IntakeState,
} from "./state";

const F1 = INTAKE_FIXTURES["F1"];

const noopEmit = () => {};
const stubNav: IntakeScreenSlotProps["nav"] = {
  onContinue: () => {},
  onBack: () => {},
  onGotoScreen: () => {},
  canContinue: true,
  canGoBack: true,
  continueLabel: "Lanjut",
};

describe("createIntakeState seeding (F1 rich)", () => {
  const state = createIntakeState(F1);

  it("seeds scope committed from the fixture selection", () => {
    expect(state.scope).toBe("brand");
    expect(state.scopeOptionId).toBe("scope-whole-brand");
    expect(state.scopeCommitted).toBe(true);
  });

  it("seeds single-selects, chips, service, market, competitors", () => {
    expect(state.category.selectedId).toBe("category-kedai-susu");
    expect(state.offerings.onIds).toHaveLength(7);
    expect(state.service.onIds).toEqual(["service-location"]);
    expect(state.market.kind).toBe("sekitar");
    // Sekitar is single-select: the seed clamps to one committed area.
    expect(state.market.areaIds).toEqual(["city-1"]);
    expect(state.competitors.keptIds).toHaveLength(4);
    expect(state.competitors.noDirect).toBe(false);
  });

  it("starts facts empty at fact version 1", () => {
    expect(state.facts.text).toBe("");
    expect(state.factVersion).toBe(1);
    expect(state.brandCorrected).toBeNull();
  });
});

describe("createIntakeState seeding (empty stub)", () => {
  const state = createIntakeState({});

  it("leaves every answer unanswered and blocks", () => {
    expect(state.scopeCommitted).toBe(false);
    expect(state.category.selectedId).toBeNull();
    expect(state.market.kind).toBeNull();
    expect(isScreenAnswerValid("s-scope", state)).toBe(false);
    expect(isScreenAnswerValid("s-category", state)).toBe(false);
    expect(isScreenAnswerValid("s-market", state)).toBe(false);
    expect(isScreenAnswerValid("s-competitors", state)).toBe(false);
    expect(isScreenAnswerValid("s-offerings", state)).toBe(false);
  });

  it("keeps optional screens non-blocking", () => {
    expect(isScreenAnswerValid("s-customers", state)).toBe(true);
    expect(isScreenAnswerValid("s-facts", state)).toBe(true);
  });
});

describe("blocking validity from committed answers", () => {
  it("holds the F1 draft fully valid", () => {
    const state = createIntakeState(F1);
    for (const id of [
      "s-brand",
      "s-scope",
      "s-category",
      "s-offerings",
      "s-service",
      "s-market",
      "s-competitors",
    ] as const) {
      expect(isScreenAnswerValid(id, state)).toBe(true);
    }
  });

  it("rejects empty offerings, empty market reach, and empty competitors", () => {
    let state = createIntakeState(F1);
    state = { ...state, offerings: { onIds: [], custom: [] } };
    expect(isScreenAnswerValid("s-offerings", state)).toBe(false);
    state = createIntakeState(F1);
    state = setMarketKind(state, "beberapa");
    expect(isScreenAnswerValid("s-market", state)).toBe(false);
    state = toggleMarketArea(state, "city-1");
    expect(isScreenAnswerValid("s-market", state)).toBe(true);
  });

  it("rejects a custom offering after its chip is deselected", () => {
    let state: IntakeState = {
      ...createIntakeState(F1),
      offerings: { onIds: [], custom: [] },
    };
    state = addMultiCustom(state, "offerings", {
      id: "offering-custom-1",
      label: "Katering kantor",
      on: true,
    });
    expect(isScreenAnswerValid("s-offerings", state)).toBe(true);

    state = toggleMultiAnswer(state, "offerings", "offering-custom-1");

    expect(state.offerings.onIds).toEqual([]);
    expect(isScreenAnswerValid("s-offerings", state)).toBe(false);
  });
});

describe("competitor choice exclusivity", () => {
  it("clears named comparators when no direct comparator is selected", () => {
    const withCustom = addCompetitor(createIntakeState(F1), "Kopi Baru");

    const noDirect = setCompetitorsNoDirect(withCustom, true);

    expect(noDirect.competitors.noDirect).toBe(true);
    expect(noDirect.competitors.keptIds).toEqual([]);
    expect(noDirect.competitors.custom).toEqual([]);
  });

  it("leaves no-direct mode when a named comparator is selected", () => {
    const noDirect = setCompetitorsNoDirect(createIntakeState(F1), true);

    const named = toggleCompetitor(noDirect, "competitor-1");

    expect(named.competitors.keptIds).toEqual(["competitor-1"]);
    expect(named.competitors.noDirect).toBe(false);
  });

  it("leaves no-direct mode when a custom comparator is added", () => {
    const noDirect = setCompetitorsNoDirect(createIntakeState(F1), true);

    const named = addCompetitor(noDirect, "Kopi Baru");

    expect(named.competitors.custom).toEqual(["Kopi Baru"]);
    expect(named.competitors.noDirect).toBe(false);
  });

  it("rejects a contradictory named-plus-no-direct state at validation", () => {
    const contradictory: IntakeState = {
      ...createIntakeState(F1),
      competitors: {
        keptIds: ["competitor-1"],
        custom: [],
        noDirect: true,
      },
    };

    expect(isScreenAnswerValid("s-competitors", contradictory)).toBe(false);
  });
});

describe("review projection from committed state", () => {
  it("matches the fixture projection row-for-row except the market clamp", () => {
    for (const id of ["F1", "F2", "F3", "F4", "F5", "F6"] as const) {
      const fixture = INTAKE_FIXTURES[id];
      const state = createIntakeState(fixture);
      const fromState = deriveReviewRowsFromState(state, fixture);
      const fromFixture = deriveReviewRows(fixture);
      expect(fromState.map((row) => row.key)).toEqual(
        fromFixture.map((row) => row.key),
      );
      for (const row of fromState) {
        if (row.key === "market" || row.key === "competitors") continue;
        // Market reflects the committed (clamped) areas. Competitors expose
        // names only, while the preparation fixture retains descriptors.
        expect({ id, key: row.key, value: row.value }).toEqual({
          id,
          key: row.key,
          value: fromFixture.find((item) => item.key === row.key)?.value,
        });
      }
      for (const row of fromState) {
        const legacy = fromFixture.find((item) => item.key === row.key);
        expect(legacy?.target).toBe(row.target);
      }
    }
  });

  it("projects the committed single market area for F1", () => {
    const rows = deriveReviewRowsFromState(createIntakeState(F1), F1);
    expect(rows.find((row) => row.key === "market")?.value).toBe(
      "Jakarta Selatan",
    );
  });

  it("reflects committed edits, never stale prepared values", () => {
    let state = createIntakeState(F1);
    state = setFactsText(state, "Buka sampai jam 23.00.");
    state = addCompetitor(state, "Kopi Baru");
    const byKey = new Map(
      deriveReviewRowsFromState(state, F1).map((row) => [row.key, row.value]),
    );
    expect(byKey.get("facts")).toBe("Buka sampai jam 23.00.");
    expect(byKey.get("competitors")).toContain("Kopi Baru");
  });

  it("projects comparator names without prepared descriptors", () => {
    const competitors = deriveReviewRowsFromState(
      createIntakeState(F1),
      F1,
    ).find((row) => row.key === "competitors");

    expect(competitors?.value).toBe(
      "Fore Coffee, Kopi Janji Jiwa, Toko Kopi Tuku, Starbucks",
    );
    expect(competitors?.value).not.toContain("—");
  });

  it("projects the selected product as the offering on product routes", () => {
    let state = commitScopeOption(createIntakeState(F1), F1, "scope-product");
    state = addSingleCustom(state, "product", {
      id: "product-custom-1",
      label: "Paket Minum Kantor",
      on: true,
    });
    const productRoute = resolveJourneyPath({
      entry: "read",
      scope: "produk",
      brandNeedsFix: false,
    });

    const offering = deriveReviewRowsFromState(state, F1, productRoute).find(
      (row) => row.key === "offerings",
    );

    expect(offering?.value).toBe("Paket Minum Kantor");
    expect(offering?.target).toBe("s-product");
  });

  it("uses product scope even if a stale branch value is present", () => {
    let state = addSingleCustom(createIntakeState(F1), "branch", {
      id: "branch-custom-1",
      label: "Cabang Lama",
      on: true,
    });
    state = {
      ...state,
      scope: "produk",
      scopeOptionId: "scope-product",
      scopeCommitted: true,
    };
    state = addSingleCustom(state, "product", {
      id: "product-custom-1",
      label: "Paket Minum Kantor",
      on: true,
    });
    const productRoute = resolveJourneyPath({
      entry: "read",
      scope: "produk",
      brandNeedsFix: false,
    });

    const target = deriveReviewRowsFromState(state, F1, productRoute).find(
      (row) => row.key === "target",
    );

    expect(target?.value).toBe("Paket Minum Kantor");
    expect(target?.target).toBe("s-product");
  });

  it("omits the target row on whole-brand active paths", () => {
    const state = createIntakeState(F1);
    const brandRoute = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });
    const rows = deriveReviewRowsFromState(state, F1, brandRoute);
    expect(rows.some((row) => row.key === "target")).toBe(false);
    expect(rows).toHaveLength(9);
  });
});

describe("review approval gate", () => {
  it("does not treat untouched prepared fixture values as confirmed", () => {
    const state = createIntakeState(F1);
    const path = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });
    expect(isReviewApprovable(state, path)).toBe(false);
  });

  it("approves values only after every active answer screen is committed", () => {
    const path = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });
    const state = path.reduce(confirmIntakeScreen, createIntakeState(F1));

    expect(state.confirmedScreens).toEqual([
      "s-brand",
      "s-scope",
      "s-category",
      "s-offerings",
      "s-customers",
      "s-service",
      "s-market",
      "s-competitors",
      "s-facts",
    ]);
    expect(isReviewApprovable(state, path)).toBe(true);
  });

  it("refuses approval while a blocking answer is missing", () => {
    const state = {
      ...createIntakeState(F1),
      offerings: { onIds: [], custom: [] },
    };
    const path = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });
    expect(isReviewApprovable(state, path)).toBe(false);
  });

  it("refuses approval while optional facts contain sensitive data", () => {
    const state = setFactsText(
      createIntakeState(F1),
      "Hubungi pemilik di owner@example.com",
    );
    const path = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });

    expect(isReviewApprovable(state, path)).toBe(false);
  });

  it("ignores the inactive offerings branch on product routes", () => {
    let state = createIntakeState(F1);
    state = {
      ...state,
      scope: "produk",
      scopeOptionId: "scope-product",
      scopeCommitted: true,
      product: { selectedId: "product-1", custom: [] },
      offerings: { onIds: [], custom: [] },
    };
    const path = resolveJourneyPath({
      entry: "read",
      scope: "produk",
      brandNeedsFix: false,
    });
    expect(path).not.toContain("s-offerings");
    expect(path).toContain("s-product");
    state = path.reduce(confirmIntakeScreen, state);
    expect(isReviewApprovable(state, path)).toBe(true);
  });
});

describe("fact-version state and materiality", () => {
  it("ignores staged drafts and empty-to-empty edits", () => {
    const prev = createIntakeState(F1);
    const staged = {
      ...prev,
      brandFixDraft: { name: "X", source: "y" },
    };
    expect(isMaterialChange(prev, staged)).toBe(false);
    expect(isMaterialChange(prev, setFactsText(prev, "   "))).toBe(false);
  });

  it("ignores internal custom-category id churn when the meaning is unchanged", () => {
    const first = setCategoryCustom(createIntakeState(F1), "Warung kopi");
    const second = {
      ...first,
      category: {
        selectedId: "category-custom-2",
        customLabel: "Warung kopi",
      },
    };

    expect(first.category.selectedId).not.toBe(second.category.selectedId);
    expect(isMaterialChange(first, second)).toBe(false);
  });

  it("detects switching from a custom category to a prepared category", () => {
    const custom = setCategoryCustom(createIntakeState(F1), "Warung kopi");

    const prepared = setCategoryAnswer(custom, "category-specialty");

    expect(prepared.category.customLabel).toBeNull();
    expect(isMaterialChange(custom, prepared)).toBe(true);
  });

  it("invalidates category-conditioned confirmations without deleting values", () => {
    const path = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });
    const confirmed = path.reduce(confirmIntakeScreen, createIntakeState(F1));

    const changed = setCategoryAnswer(confirmed, "category-specialty");

    expect(changed.confirmedScreens).not.toContain("s-offerings");
    expect(changed.confirmedScreens).not.toContain("s-customers");
    expect(changed.confirmedScreens).not.toContain("s-competitors");
    expect(changed.offerings).toEqual(confirmed.offerings);
    expect(changed.customers).toEqual(confirmed.customers);
    expect(changed.competitors).toEqual(confirmed.competitors);
  });

  it("ignores product id churn when the selected label is unchanged", () => {
    let first = commitScopeOption(createIntakeState(F1), F1, "scope-product");
    first = addSingleCustom(first, "product", {
      id: "product-custom-1",
      label: "Paket Minum Kantor",
      on: true,
    });
    const second: IntakeState = {
      ...first,
      product: {
        selectedId: "product-custom-2",
        custom: [
          {
            id: "product-custom-2",
            label: "Paket Minum Kantor",
            on: true,
          },
        ],
      },
    };

    expect(isMaterialChange(first, second, F1)).toBe(false);
  });

  it("detects real answer changes and bumps the version once", () => {
    const prev = createIntakeState(F1);
    const next = withBumpedFactVersion(
      toggleMultiAnswer(prev, "offerings", prev.offerings.onIds[0]),
    );
    expect(isMaterialChange(prev, next)).toBe(true);
    expect(next.factVersion).toBe(prev.factVersion + 1);
    expect(summarizeCommittedAnswers(next)).not.toBe(
      summarizeCommittedAnswers(prev),
    );
  });

  it("restores the snapshot byte-identical on cancel", () => {
    const snapshot = createIntakeState(F1);
    const edited = setFactsText(
      setCategoryCustom(snapshot, "Warung kopi"),
      "Buka pagi.",
    );
    expect(isMaterialChange(snapshot, edited)).toBe(true);
    const restored: IntakeState = structuredClone(snapshot);
    expect(isMaterialChange(snapshot, restored)).toBe(false);
    expect(summarizeCommittedAnswers(restored)).toBe(
      summarizeCommittedAnswers(snapshot),
    );
  });
});

describe("scope-change invalidation (journey §8.2)", () => {
  it("invalidates only scope-conditioned confirmations and preserves market edits", () => {
    const brandPath = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });
    let state = brandPath.reduce(confirmIntakeScreen, createIntakeState(F1));
    state = addMarketArea(state, "Depok");

    const changed = commitScopeOption(state, F1, "scope-product");

    expect(changed.confirmedScreens).toEqual([
      "s-brand",
      "s-category",
      "s-customers",
      "s-service",
      "s-market",
      "s-facts",
    ]);
    expect(changed.market.customAreas).toContain("Depok");
  });

  it("queues only the unconfirmed product target and comparator", () => {
    const brandPath = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });
    const productPath = resolveJourneyPath({
      entry: "read",
      scope: "produk",
      brandNeedsFix: false,
    });
    let state = brandPath.reduce(confirmIntakeScreen, createIntakeState(F1));
    state = commitScopeOption(state, F1, "scope-product");
    state = confirmIntakeScreen(state, "s-scope");

    expect(nextUnconfirmedScreen(state, productPath, "s-scope")).toBe(
      "s-product",
    );

    state = addSingleCustom(state, "product", {
      id: "product-custom-1",
      label: "Paket Minum Kantor",
      on: true,
    });
    state = confirmIntakeScreen(state, "s-product");
    expect(nextUnconfirmedScreen(state, productPath, "s-product")).toBe(
      "s-competitors",
    );

    state = confirmIntakeScreen(state, "s-competitors");
    expect(
      nextUnconfirmedScreen(state, productPath, "s-competitors"),
    ).toBeNull();
  });

  it("preserves downstream edits when the committed scope is selected again", () => {
    const edited = addCompetitor(createIntakeState(F1), "Kopi Baru");

    const unchanged = commitScopeOption(edited, F1, "scope-whole-brand");

    expect(unchanged).toBe(edited);
    expect(unchanged.competitors.custom).toEqual(["Kopi Baru"]);
  });

  it("commits a scope option and invalidates conditioned answers atomically", () => {
    const changed = commitScopeOption(
      createIntakeState(F1),
      F1,
      "scope-product",
    );

    expect(changed.scope).toBe("produk");
    expect(changed.scopeOptionId).toBe("scope-product");
    expect(changed.scopeCommitted).toBe(true);
    expect(changed.branch.selectedId).toBeNull();
    expect(changed.product.selectedId).toBeNull();
    expect(changed.offerings).toEqual({ onIds: [], custom: [] });
  });

  it("clears the old target and deactivates offerings toward product", () => {
    let state = createIntakeState(F1);
    state = setScopeAnswer(state, "scope-branch");
    state = applyScopeChange(state, F1, "produk");
    expect(state.scope).toBe("produk");
    expect(state.branch.selectedId).toBeNull();
    expect(state.offerings).toEqual({ onIds: [], custom: [] });
    // Category, customers, service, and facts survive a scope change.
    expect(state.category.selectedId).toBe("category-kedai-susu");
    expect(state.facts.text).toBe("");
  });

  it("preserves market while reseeding comparators for reconfirmation", () => {
    let state = createIntakeState(F1);
    state = addMarketArea(state, "Surabaya");
    state = addCompetitor(state, "Kopi Baru");
    state = applyScopeChange(state, F1, "cabang");
    expect(state.market.customAreas).toEqual(["Surabaya"]);
    expect(state.market.kind).toBe("sekitar");
    expect(state.competitors.custom).not.toContain("Kopi Baru");
  });
});

describe("remount regression: answers live outside the screen", () => {
  function renderMarket(answers: IntakeState): string {
    const MarketSlot = BAB2_SCREENS["s-market"];
    if (!MarketSlot) throw new Error("missing s-market slot");
    return renderToStaticMarkup(
      createElement(MarketSlot, {
        screenId: "s-market",
        fixture: F1,
        nav: stubNav,
        emit: noopEmit,
        answers,
        updateAnswer: () => {},
      }),
    );
  }

  it("preserves committed answers across unmount and remount", () => {
    // First mount: the F1 seed shows one committed area.
    let shared = createIntakeState(F1);
    expect(renderMarket(shared)).toContain(
      'aria-label="Pilih Jakarta Selatan"',
    );

    // The owner switches reach (as the screen dispatches); the screen
    // remounts from scratch, sharing only the state object.
    shared = setMarketKind(shared, "beberapa");
    shared = toggleMarketArea(shared, "city-2");
    const second = renderMarket(shared);
    expect(second).toContain("Beberapa area");
    expect(second).toContain("Tangerang Selatan");

    // Back-navigation equivalent: a third fresh mount still restores.
    expect(renderMarket(shared)).toBe(second);
  });

  it("renders review from the same shared object after edits", () => {
    const ReviewSlot = BAB2_SCREENS["s-review"];
    if (!ReviewSlot) throw new Error("missing s-review slot");
    let shared = setFactsText(createIntakeState(F1), "Susu segar lokal.");
    const html = renderToStaticMarkup(
      createElement(ReviewSlot, {
        screenId: "s-review",
        fixture: F1,
        nav: stubNav,
        emit: noopEmit,
        answers: shared,
        updateAnswer: () => {},
      }),
    );
    expect(html).toContain("Susu segar lokal.");
    expect(html).toContain("Jakarta Selatan");
    shared = withBumpedFactVersion(shared);
    expect(shared.factVersion).toBe(2);
  });
});
