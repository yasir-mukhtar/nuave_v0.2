import { describe, expect, it } from "vitest";
import { INTAKE_FIXTURES } from "./fixtures";
import {
  deriveContextFixture,
  prepareBoundaryIdentity,
  prepareLocalIdentity,
  reconcileOnCommit,
} from "./preparation";
import {
  addMultiCustom,
  createIntakeState,
  deriveReviewRowsFromState,
  setCategoryCustom,
  setScopeAnswer,
  setSingleAnswer,
} from "./state";

const base = INTAKE_FIXTURES.F1;
function target(scope: "scope-branch" | "scope-product", id: string) {
  const initial = createIntakeState(base);
  const scoped = reconcileOnCommit(
    initial,
    setScopeAnswer(initial, scope),
    base,
    "s-scope",
  ).state;
  const owner = scope === "scope-branch" ? "branch" : "product";
  return reconcileOnCommit(
    scoped,
    setSingleAnswer(scoped, owner, id),
    base,
    `s-${owner}`,
  ).state;
}

describe("local scope-conditioned preparation", () => {
  it("offers all three targets from the same initial entry without selecting scope", () => {
    const state = createIntakeState(base);
    const fixture = deriveContextFixture(base, state);
    expect(state.scopeCommitted).toBe(false);
    expect(fixture.screens["s-branch"].prepared).toHaveLength(3);
    expect(fixture.screens["s-product"].prepared).toHaveLength(3);
  });

  it("changes exact-location catalogue, customers, and area", () => {
    const senopati = target("scope-branch", "branch-1");
    const bsd = target("scope-branch", "branch-2");
    const first = deriveContextFixture(base, senopati);
    const second = deriveContextFixture(base, bsd);
    expect(first.screens["s-offerings"].prepared).not.toEqual(
      second.screens["s-offerings"].prepared,
    );
    expect(first.screens["s-customers"].prepared).not.toEqual(
      second.screens["s-customers"].prepared,
    );
    expect(
      deriveReviewRowsFromState(bsd, second).find((row) => row.key === "market")
        ?.value,
    ).toBe("Sekitar satu area · Tangerang Selatan");
  });

  it("uses the product itself, its category and channels, with no general offerings", () => {
    const subscription = target("scope-product", "product-1");
    const drink = target("scope-product", "product-3");
    expect(subscription.service.onIds).toEqual(["service-delivery"]);
    expect(subscription.market.kind).toBe("seluruh");
    expect(drink.service.onIds).toEqual(["service-location"]);
    expect(drink.market.kind).toBe("sekitar");
    expect(subscription.offerings.onIds).toEqual([]);
    expect(
      deriveReviewRowsFromState(
        subscription,
        deriveContextFixture(base, subscription),
      ).some((row) => row.key === "offerings"),
    ).toBe(false);
  });

  it("does not inherit coffee facts for an unknown manually entered target", () => {
    const initial = createIntakeState(base);
    const scoped = reconcileOnCommit(
      initial,
      setScopeAnswer(initial, "scope-product"),
      base,
      "s-scope",
    ).state;
    const manual = {
      ...scoped,
      product: {
        selectedId: "product-custom-1",
        custom: [{ id: "product-custom-1", label: "Kelas merajut", on: true }],
      },
    };
    const { state, reconfirm } = reconcileOnCommit(
      scoped,
      manual,
      base,
      "s-product",
    );
    const fixture = deriveContextFixture(base, state);
    expect(state.category.selectedId).toBeNull();
    expect(state.customers.onIds).toEqual([]);
    expect(state.competitors.keptIds).toEqual([]);
    expect(fixture.screens["s-category"].prepared).toEqual([]);
    expect(reconfirm).toEqual([
      "s-category",
      "s-customers",
      "s-service",
      "s-market",
      "s-competitors",
    ]);
  });

  it("clears the inactive target when changing scope and supplies ordered reconfirmation", () => {
    const previous = target("scope-branch", "branch-1");
    const { state, reconfirm } = reconcileOnCommit(
      previous,
      setScopeAnswer(previous, "scope-product"),
      base,
      "s-scope",
    );
    expect(state.branch).toEqual({ selectedId: null, custom: [] });
    expect(state.product.selectedId).toBeNull();
    expect(state.offerings.onIds).toEqual([]);
    expect(reconfirm).toEqual([
      "s-product",
      "s-category",
      "s-customers",
      "s-service",
      "s-market",
      "s-competitors",
    ]);
  });

  it("category corrections preserve customer additions for explicit reconfirmation", () => {
    const previous = addMultiCustom(createIntakeState(base), "offerings", {
      id: "offering-custom-1",
      label: "Kelas seduh",
      on: true,
    });
    const next = setCategoryCustom(previous, "Kursus menyeduh kopi");
    const { state, reconfirm } = reconcileOnCommit(
      previous,
      next,
      base,
      "s-category",
    );
    expect(state.offerings.onIds).toEqual(["offering-custom-1"]);
    expect(state.offerings.custom).toEqual(previous.offerings.custom);
    expect(state.customers.onIds).toEqual([]);
    expect(reconfirm).toEqual(["s-offerings", "s-customers", "s-competitors"]);
  });

  it("target changes keep buyer additions available without silently selecting them", () => {
    const previous = addMultiCustom(
      target("scope-branch", "branch-1"),
      "customers",
      { id: "customer-custom-1", label: "Ruang membaca", on: true },
    );
    const { state, reconfirm } = reconcileOnCommit(
      previous,
      setSingleAnswer(previous, "branch", "branch-2"),
      base,
      "s-branch",
    );
    expect(state.customers.custom).toEqual(previous.customers.custom);
    expect(state.customers.onIds).not.toContain("customer-custom-1");
    expect(reconfirm).toContain("s-customers");
  });

  it("a no-op commit keeps all current answers and requests no reconfirmation", () => {
    const previous = target("scope-branch", "branch-2");
    const { state, reconfirm } = reconcileOnCommit(
      previous,
      previous,
      base,
      "s-category",
    );
    expect(state).toEqual(previous);
    expect(reconfirm).toEqual([]);
  });
});

describe("local identity correction", () => {
  it("validates the existing public-source contract without making requests", () => {
    expect(() =>
      prepareLocalIdentity(base, "Usaha Baru", "http://localhost:3000"),
    ).toThrow();
    expect(() => prepareLocalIdentity(base, "Usaha Baru", "")).toThrow();
    expect(() => prepareLocalIdentity(base, "", "example.com")).toThrow();
    expect(() =>
      prepareLocalIdentity(
        base,
        "Usaha Baru",
        "https://user:password@example.com",
      ),
    ).toThrow();
  });

  it("unknown identities retain user identity only, with no stale public candidates", () => {
    const fixture = prepareLocalIdentity(base, "Studio Benang", "example.com");
    expect(fixture.screens["s-brand"].prepared[0]).toMatchObject({
      label: "Studio Benang",
      detail: "https://example.com/",
    });
    for (const screen of [
      "s-category",
      "s-offerings",
      "s-customers",
      "s-competitors",
      "s-branch",
      "s-product",
    ] as const)
      expect(fixture.screens[screen].prepared).toEqual([]);
    expect(fixture.screens["s-brand"].note).not.toContain("Kedai kopi");
  });

  it("correcting the known sample restores only its matched local example", () => {
    const fixture = prepareLocalIdentity(
      INTAKE_FIXTURES.F4,
      "Kopi Sudut",
      "kopisudut.id",
    );
    expect(fixture.screens["s-offerings"].prepared).toHaveLength(7);
    const wrongSource = prepareLocalIdentity(
      base,
      "Kopi Sudut",
      "different.example.com",
    );
    expect(wrongSource.screens["s-offerings"].prepared).toEqual([]);
  });
});

describe("prepareBoundaryIdentity (Spec 009 entered-business reading)", () => {
  it("keeps only the entered identity when the boundary draft carries no facts", () => {
    const fixture = prepareBoundaryIdentity(
      base,
      "Batik Laras",
      {
        canonicalUrl: "https://batiklaras.example/",
        displayName: "Batik Laras",
      },
      null,
    );
    expect(fixture.entry).toBe("s-crawl");
    expect(fixture.screens["s-brand"].prepared[0]).toMatchObject({
      label: "Batik Laras",
      detail: "https://batiklaras.example/",
    });
    // Nothing is invented: every context screen asks the buyer directly.
    for (const screen of [
      "s-category",
      "s-offerings",
      "s-customers",
      "s-competitors",
      "s-branch",
      "s-product",
    ] as const)
      expect(fixture.screens[screen].prepared).toEqual([]);
    // A known fixture's rich example is never presented as the entered
    // business's facts.
    expect(fixture.screens["s-brand"].note).not.toContain("Kedai kopi");
  });

  it("prepares candidates only from fields the boundary draft evidences", () => {
    const fixture = prepareBoundaryIdentity(
      base,
      "Batik Laras",
      {
        canonicalUrl: "https://batiklaras.example/",
        displayName: "Batik Laras",
      },
      {
        category: "Batik tulis",
        verified_offerings: ["Kain batik", "Batik seragam"],
        verified_customer_needs: ["Hadiah resmi"],
        similar_businesses: [{ name: "Batik Contoh" }],
      },
    );
    expect(
      fixture.screens["s-category"].prepared.map((item) => item.label),
    ).toEqual(["Batik tulis"]);
    expect(
      fixture.screens["s-offerings"].prepared.map((item) => item.label),
    ).toEqual(["Kain batik", "Batik seragam"]);
    expect(
      fixture.screens["s-customers"].prepared.map((item) => item.label),
    ).toEqual(["Hadiah resmi"]);
    expect(
      fixture.screens["s-competitors"].prepared.map((item) => item.label),
    ).toEqual(["Batik Contoh"]);
    // Prepared candidates stay unselected until the buyer confirms.
    expect(fixture.screens["s-category"].selected).toEqual([]);
    expect(fixture.screens["s-offerings"].selected).toEqual([]);
  });

  it("fails closed on a missing name or unparseable source", () => {
    expect(() =>
      prepareBoundaryIdentity(
        base,
        "   ",
        { canonicalUrl: "https://batiklaras.example/", displayName: "" },
        null,
      ),
    ).toThrow();
    expect(() =>
      prepareBoundaryIdentity(
        base,
        "Batik Laras",
        { canonicalUrl: "bukan-url", displayName: "" },
        null,
      ),
    ).toThrow();
  });
});
