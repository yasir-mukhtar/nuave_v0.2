import { describe, expect, it } from "vitest";
import { extractionModelDraftSchema } from "./openai";
import { goldenBrief } from "./fixtures/report-golden";
import {
  MAX_SIMILAR_BUSINESSES,
  normalizeSimilarBusinessUrl,
  normalizeSimilarBusinesses,
  sanitizeAiSimilarBusinesses,
} from "./similar-businesses";
import { deriveComparisonProposal } from "./workflow-authority";
import { businessBriefSchema } from "./types";

describe("similar-business intake", () => {
  it("requires an explicitly confirmed comparison target", () => {
    const result = businessBriefSchema.safeParse({
      ...goldenBrief,
      verified_competitor: {
        name: "",
        scope: "",
        source_url: "",
      },
      similar_businesses: [],
    });
    expect(result.success).toBe(false);
  });

  it("normalizes URL-only suggestions without deriving a primary target", () => {
    const brief = {
      ...goldenBrief,
      verified_competitor: { name: "", scope: "", source_url: "" },
      similar_businesses: [
        {
          source_url: "amanieadvisors.com",
          origin: "user" as const,
        },
      ],
    };
    const normalized = normalizeSimilarBusinesses(brief.similar_businesses);
    expect(normalized[0]?.source_url).toBe("https://amanieadvisors.com/");
    expect(brief.verified_competitor.name).toBe("");
    expect(deriveComparisonProposal(brief)).toEqual({
      kind: "suggestion",
      name: "amanieadvisors.com",
      scope: "",
      source_url: "https://amanieadvisors.com/",
    });
  });

  it("preserves an AI-supplied name as a proposal until the user acts", () => {
    const brief = {
      ...goldenBrief,
      verified_competitor: { name: "", scope: "", source_url: "" },
      similar_businesses: [
        {
          name: "Amanie Advisors",
          source_url: "https://amanieadvisors.com/",
          origin: "ai" as const,
        },
      ],
    };
    expect(deriveComparisonProposal(brief)).toEqual({
      kind: "suggestion",
      name: "Amanie Advisors",
      scope: "",
      source_url: "https://amanieadvisors.com/",
    });
    expect(brief.verified_competitor.name).toBe("");
  });

  it("deduplicates entries, drops blanks, and caps the list", () => {
    const input = [
      { source_url: "example.com" },
      { source_url: "https://example.com/" },
      { source_url: "" },
      ...Array.from({ length: 8 }, (_, index) => ({
        source_url: `https://peer-${index}.example/`,
      })),
    ];
    const normalized = normalizeSimilarBusinesses(input);
    expect(normalized).toHaveLength(MAX_SIMILAR_BUSINESSES);
    expect(normalized[0]?.source_url).toBe("https://example.com/");
  });

  it("keeps invalid user input visible for validation", () => {
    const invalid = normalizeSimilarBusinessUrl("not a valid url");
    expect(invalid).toBe("not a valid url");
    expect(
      businessBriefSchema.safeParse({
        ...goldenBrief,
        similar_businesses: [{ source_url: invalid, origin: "user" }],
      }).success,
    ).toBe(false);
  });

  it("drops invalid AI suggestions before the editable brief", () => {
    const suggestions = sanitizeAiSimilarBusinesses([
      {
        name: "Valid",
        source_url: "https://valid.example/",
      },
      { name: "Bad", source_url: "javascript:alert(1)" },
      { name: "Name only", source_url: "" },
    ]);
    expect(suggestions).toEqual([
      {
        name: "Valid",
        source_url: "https://valid.example/",
        origin: "ai",
      },
      { name: "Name only", source_url: "", origin: "ai" },
    ]);
  });

  it("extends extraction with similar-business suggestions", () => {
    const draft = extractionModelDraftSchema.parse({
      brand_name: "Contoh",
      entity_scope: "Indonesia",
      brand_type: "Company",
      category: "Consulting",
      market_context: "Indonesia",
      target_customer: "Business owners",
      official_sources: ["https://contoh.example/"],
      verified_offerings: ["Advisory"],
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
      similar_businesses: [
        {
          name: "Peer Business",
          source_url: "https://peer.example/",
        },
      ],
    });
    expect(draft.similar_businesses).toHaveLength(1);
  });
});
