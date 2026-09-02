import { describe, expect, it } from "vitest";
import {
  intakeScreenSequence,
  nextIntakeScreen,
  previousIntakeScreen,
} from "./workflow-authority";

describe("E1 applicable intake navigation", () => {
  it("follows the approved post-payment order and skips conditional screens", () => {
    const common = [
      "brand-confirm",
      "scope",
      "category",
      "offerings",
      "customer-reasons",
      "market",
      "comparison-target",
      "facts",
      "review",
    ];

    expect(intakeScreenSequence("whole-brand")).toEqual(common);
    expect(intakeScreenSequence("branch")).toEqual([
      "brand-confirm",
      "scope",
      "branch",
      "category",
      "offerings",
      "customer-reasons",
      "market",
      "comparison-target",
      "facts",
      "review",
    ]);
    expect(intakeScreenSequence("product")).toEqual([
      "brand-confirm",
      "scope",
      "product",
      "category",
      "offerings",
      "customer-reasons",
      "market",
      "comparison-target",
      "facts",
      "review",
    ]);
  });

  it("uses the current applicable screen in both directions", () => {
    expect(nextIntakeScreen("whole-brand", "category")).toBe("offerings");
    expect(previousIntakeScreen("whole-brand", "offerings")).toBe("category");
    expect(nextIntakeScreen("branch", "branch")).toBe("category");
    expect(previousIntakeScreen("branch", "category")).toBe("branch");
    expect(nextIntakeScreen("product", "product")).toBe("category");
    expect(previousIntakeScreen("product", "category")).toBe("product");
  });
});
