import { describe, expect, it } from "vitest";
import {
  chapterFills,
  chapterOf,
  continueLabelFor,
  createFunnelSessionId,
  DEFAULT_STUB_ANSWERS,
  isBareScreen,
  isBlockingScreen,
  nextScreenInPath,
  normalizeStubAnswers,
  prevScreenInPath,
  resolveJourneyPath,
} from "./navigation";

/**
 * Shell-phase graph + progress contract (ledger §1, deck §6).
 * Pure navigation logic: no rendering, no network, no fixtures.
 */

describe("resolveJourneyPath", () => {
  it("walks the default read/brand happy path in ledger order", () => {
    expect(resolveJourneyPath(DEFAULT_STUB_ANSWERS)).toEqual([
      "s-crawl",
      "s-brand",
      "s-scope",
      "s-category",
      "s-offerings",
      "s-customers",
      "s-service",
      "s-market",
      "s-competitors",
      "s-facts",
      "s-review",
      "s-questions",
    ]);
  });

  it("resolves the branch/product XOR (at most one entity screen)", () => {
    const branch = resolveJourneyPath(
      normalizeStubAnswers({ scope: "cabang" }),
    );
    expect(branch).toContain("s-branch");
    expect(branch).not.toContain("s-product");

    const product = resolveJourneyPath(
      normalizeStubAnswers({ scope: "produk" }),
    );
    expect(product).toContain("s-product");
    expect(product).not.toContain("s-branch");

    const brand = resolveJourneyPath(normalizeStubAnswers({ scope: "brand" }));
    expect(brand).not.toContain("s-branch");
    expect(brand).not.toContain("s-product");
  });

  it("enters the manual path at s-scope with no crawl/brand screens", () => {
    const path = resolveJourneyPath(normalizeStubAnswers({ entry: "manual" }));
    expect(path[0]).toBe("s-scope");
    expect(path).not.toContain("s-crawl");
    expect(path).not.toContain("s-brand");
    expect(path).not.toContain("s-brand-fix");
    expect(path[path.length - 1]).toBe("s-questions");
  });

  it("inserts exactly one brand-fix loop (fix → re-read → corrected brand)", () => {
    const path = resolveJourneyPath(
      normalizeStubAnswers({ brandNeedsFix: true }),
    );
    expect(path.slice(0, 6)).toEqual([
      "s-brand-fix",
      "s-crawl",
      "s-brand",
      "s-scope",
      "s-category",
      "s-offerings",
    ]);
  });

  it("always shows s-market and s-service on every route (no skip state)", () => {
    for (const answers of [
      DEFAULT_STUB_ANSWERS,
      normalizeStubAnswers({ entry: "manual" }),
      normalizeStubAnswers({ scope: "produk" }),
      normalizeStubAnswers({ scope: "cabang" }),
    ]) {
      const path = resolveJourneyPath(answers);
      expect(path).toContain("s-market");
      expect(path).toContain("s-service");
      expect(nextScreenInPath(path, "s-customers")).toBe("s-service");
      expect(nextScreenInPath(path, "s-service")).toBe("s-market");
    }
  });

  it("normalizes unknown stub values to safe defaults", () => {
    expect(
      normalizeStubAnswers({
        entry: "other" as never,
        scope: "other" as never,
      }),
    ).toEqual(DEFAULT_STUB_ANSWERS);
  });
});

describe("Back/Continue adjacency", () => {
  it("backs from s-category into the owning scope screen", () => {
    const product = resolveJourneyPath(
      normalizeStubAnswers({ scope: "produk" }),
    );
    expect(prevScreenInPath(product, "s-category")).toBe("s-product");

    const branch = resolveJourneyPath(
      normalizeStubAnswers({ scope: "cabang" }),
    );
    expect(prevScreenInPath(branch, "s-category")).toBe("s-branch");

    const brand = resolveJourneyPath(normalizeStubAnswers({ scope: "brand" }));
    expect(prevScreenInPath(brand, "s-category")).toBe("s-scope");
  });

  it("enters the brand-fix path at s-brand-fix (wrong identity comes first)", () => {
    const fixPath = resolveJourneyPath(
      normalizeStubAnswers({ brandNeedsFix: true }),
    );
    expect(fixPath[0]).toBe("s-brand-fix");
    expect(prevScreenInPath(fixPath, "s-crawl")).toBe("s-brand-fix");
    expect(prevScreenInPath(fixPath, "s-brand")).toBe("s-crawl");
  });

  it("has no previous screen at journey start and no next screen at the end", () => {
    const path = resolveJourneyPath(DEFAULT_STUB_ANSWERS);
    expect(prevScreenInPath(path, path[0])).toBeNull();
    expect(nextScreenInPath(path, "s-questions")).toBeNull();
  });

  it("returns null for screens outside the resolved path", () => {
    const manual = resolveJourneyPath(
      normalizeStubAnswers({ entry: "manual" }),
    );
    expect(nextScreenInPath(manual, "s-brand")).toBeNull();
    expect(prevScreenInPath(manual, "s-brand")).toBeNull();
  });
});

describe("chapter progress model", () => {
  it("maps every screen into exactly 4 chapters", () => {
    expect(chapterOf("s-crawl")).toBe(0);
    expect(chapterOf("s-brand-fix")).toBe(0);
    expect(chapterOf("s-scope")).toBe(1);
    expect(chapterOf("s-customers")).toBe(1);
    expect(chapterOf("s-market")).toBe(2);
    expect(chapterOf("s-competitors")).toBe(2);
    expect(chapterOf("s-facts")).toBe(3);
    expect(chapterOf("s-review")).toBe(3);
    expect(chapterOf("s-questions")).toBe(3);
  });

  it("fills fractionally within the chapter and completes past chapters", () => {
    const path = resolveJourneyPath(DEFAULT_STUB_ANSWERS);
    const fills = chapterFills(path, "s-scope");
    expect(fills).toHaveLength(4);
    expect(fills[0]).toBe(1);
    // Chapter 1 visible: scope, category, offerings, customers, service → 1/5.
    expect(fills[1]).toBeCloseTo(0.2);
    expect(fills[2]).toBe(0);
    expect(fills[3]).toBe(0);
    for (const fill of fills) {
      expect(fill).toBeGreaterThanOrEqual(0);
      expect(fill).toBeLessThanOrEqual(1);
    }
  });

  it("reads full on the final screen and advances with the XOR branch", () => {
    const path = resolveJourneyPath(DEFAULT_STUB_ANSWERS);
    expect(chapterFills(path, "s-questions")).toEqual([1, 1, 1, 1]);

    const branch = resolveJourneyPath(
      normalizeStubAnswers({ scope: "cabang" }),
    );
    // Chapter 1 visible: scope, branch, category, offerings, customers, service → 2/6.
    expect(chapterFills(branch, "s-branch")[1]).toBeCloseTo(1 / 3);
  });

  it("completes the empty chapter 0 on the manual path", () => {
    const manual = resolveJourneyPath(
      normalizeStubAnswers({ entry: "manual" }),
    );
    expect(chapterFills(manual, "s-scope")[0]).toBe(1);
  });
});

describe("shell copy lookups (deck §6)", () => {
  it("pins the settled Continue labels", () => {
    expect(continueLabelFor("s-scope")).toBe("Lanjut");
    expect(continueLabelFor("s-review")).toBe("Buat pertanyaan audit");
    expect(continueLabelFor("s-questions")).toBe("Mulai audit");
  });

  it("marks s-crawl bare and the seven blocking screens", () => {
    expect(isBareScreen("s-crawl")).toBe(true);
    expect(isBareScreen("s-brand")).toBe(false);
    for (const id of [
      "s-brand",
      "s-brand-fix",
      "s-scope",
      "s-branch",
      "s-product",
      "s-category",
      "s-service",
    ] as const) {
      expect(isBlockingScreen(id)).toBe(true);
    }
    expect(isBlockingScreen("s-offerings")).toBe(false);
    expect(isBlockingScreen("s-review")).toBe(false);
  });
});

describe("funnel session ids", () => {
  it("mints non-empty, unique single-tab session ids", () => {
    const first = createFunnelSessionId();
    const second = createFunnelSessionId();
    expect(first.length).toBeGreaterThan(0);
    expect(second.length).toBeGreaterThan(0);
    expect(first).not.toBe(second);
  });
});
