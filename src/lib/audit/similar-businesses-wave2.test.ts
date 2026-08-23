import { describe, expect, it } from "vitest";
import {
  assertSafeComparisonBusinessUrls,
  isValidSimilarBusinessUrl,
  normalizeSimilarBusinessUrl,
  rebindSimilarBusinessUrl,
  sanitizeAiSimilarBusinesses,
} from "./similar-businesses";
import type { BusinessBrief } from "./types";

const brief: BusinessBrief = {
  brand_name: "Kopi Taman Senja",
  entity_scope: "Depok",
  brand_type: "Kedai kopi",
  category: "Kedai kopi",
  market_context: "Depok",
  target_customer: "Warga Depok",
  official_sources: ["https://kopi.example"],
  verified_offerings: ["kopi"],
  verified_customer_needs: [],
  verified_decision_criteria: [],
  verified_competitor: { name: "", scope: "", source_url: "" },
  similar_businesses: [],
  brand_name_variants: [],
  priority_offering: "kopi",
  conversion_action: "datang ke kedai",
  customer_supplied_facts: [],
  known_accuracy_questions: [],
  usp: "",
  regulated_category_notes: "",
  language: "en-US",
  agency_name: "",
  agency_logo_data_url: "",
};

describe("Wave 2 similar-business URL safety", () => {
  it("keeps malformed user text visible instead of silently deleting it", () => {
    expect(normalizeSimilarBusinessUrl("bukan url bisnis")).toBe("bukan url bisnis");
    expect(isValidSimilarBusinessUrl("bukan url bisnis")).toBe(false);
  });

  it("accepts a profile but rejects Instagram content paths", () => {
    expect(isValidSimilarBusinessUrl("instagram.com/kopilain")).toBe(true);
    expect(isValidSimilarBusinessUrl("instagram.com/p/ABC")).toBe(false);
    expect(isValidSimilarBusinessUrl("instagram.com/reel/ABC")).toBe(false);
  });

  it("allows Google Maps as a comparison source without making it an intake source", () => {
    expect(isValidSimilarBusinessUrl("https://maps.app.goo.gl/example")).toBe(true);
  });

  it("drops invalid AI suggestions", () => {
    expect(
      sanitizeAiSimilarBusinesses([
        { source_url: "bukan url", name: "Salah" },
        { source_url: "https://kopilain.example", name: "Kopi Lain" },
      ]),
    ).toEqual([
      {
        source_url: "https://kopilain.example/",
        name: "Kopi Lain",
        origin: "ai",
      },
    ]);
  });

  it("clears stale AI identity when its URL is edited", () => {
    expect(
      rebindSimilarBusinessUrl(
        { source_url: "https://lama.example", name: "Nama Lama", origin: "ai" },
        "https://baru.example",
      ),
    ).toEqual({ source_url: "https://baru.example", origin: "user" });
  });

  it("blocks invalid user text before the provider brief", () => {
    expect(() =>
      assertSafeComparisonBusinessUrls({
        ...brief,
        similar_businesses: [{ source_url: "bukan url", origin: "user" }],
      }),
    ).toThrow("valid public HTTP or HTTPS URLs");
  });
});
