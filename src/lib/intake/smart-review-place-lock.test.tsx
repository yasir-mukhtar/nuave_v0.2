// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { extractionDraftSchema } from "../audit/types";
import { matchPlace } from "../discovery/places";
import SmartReview from "./SmartReview";
import {
  initialSmartSelection,
  prepareUnderstanding,
} from "./smart-intake-contract";

// Spec 018 R-07 (verification N-24): after discovery ran twice the place is
// locked on the review screen.

function review(searchPlaceLocked: boolean) {
  const prepared = prepareUnderstanding({
    typedName: "Kedai Contoh",
    discoveredName: null,
    canonicalSource: "https://kedai-contoh.example/",
    draft: extractionDraftSchema.parse({
      brand_name: "Kedai Contoh",
      entity_scope: "",
      brand_type: "",
      category: "kedai kopi",
      market_context: "",
      service_channels: ["on_premise"],
      market_reach: "sekitar",
      market_areas: ["Bandung"],
      target_customer: "pekerja sekitar",
      official_sources: ["https://kedai-contoh.example/"],
      verified_offerings: ["kopi susu"],
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
  const bandung = matchPlace("Bandung")!;
  const selection = {
    ...initialSmartSelection(prepared),
    searchPlace: { kind: "place" as const, code: bandung.code, display: bandung.display },
  };
  render(
    <SmartReview
      prepared={prepared}
      selection={selection}
      onChange={() => {}}
      confirmed={false}
      onConfirmedChange={() => {}}
      onEditFocus={() => {}}
      canUndo={false}
      onUndo={() => {}}
      searchPlaceLocked={searchPlaceLocked}
    />,
  );
}

function placeSection() {
  const heading = screen.getByText("Kota untuk pencarian");
  return heading.closest("section") ?? heading.parentElement!.parentElement!;
}

describe("the Kota untuk pencarian lock (R-07)", () => {
  afterEach(cleanup);

  it("a locked place cannot be edited and says so", () => {
    review(true);
    expect(
      screen.queryByText("Kota sudah terkunci untuk pesanan ini."),
    ).not.toBeNull();
    const edit = placeSection().querySelector("button");
    expect(edit).not.toBeNull();
    expect(edit!.disabled).toBe(true);
  });

  it("an unlocked place can still be edited", () => {
    review(false);
    expect(
      screen.queryByText("Kota sudah terkunci untuk pesanan ini."),
    ).toBeNull();
    expect(placeSection().querySelector("button")!.disabled).toBe(false);
  });
});
