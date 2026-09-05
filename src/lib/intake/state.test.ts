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
  applyScopeChange,
  createIntakeState,
  deriveReviewRowsFromState,
  isMaterialChange,
  isReviewApprovable,
  isScreenAnswerValid,
  setCategoryCustom,
  setFactsText,
  setMarketKind,
  setScopeAnswer,
  summarizeCommittedAnswers,
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
        if (row.key === "market") continue;
        // The market row intentionally reflects the committed (clamped)
        // areas, not the fixture's prepared multi-select (journey §8.3).
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
  it("approves the F1 draft on its active path", () => {
    const state = createIntakeState(F1);
    const path = resolveJourneyPath({
      entry: "read",
      scope: "brand",
      brandNeedsFix: false,
    });
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

  it("reseeds market and competitors for reconfirmation", () => {
    let state = createIntakeState(F1);
    state = addMarketArea(state, "Surabaya");
    state = applyScopeChange(state, F1, "cabang");
    expect(state.market.customAreas).toEqual([]);
    expect(state.market.kind).toBe("sekitar");
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
