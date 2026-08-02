import { afterEach, describe, expect, it } from "vitest";
import {
  auditObservationSearchTool,
  auditModel,
  auditReasoningEffort,
  extractionDraftOrManualFallback,
  normalizeSourceTitle,
  structuredOutputOrThrow,
} from "./openai";
import {
  extractionDraftSchema,
  SOURCE_TITLE_MAX_LENGTH,
  sourceSchema,
} from "./types";

const originalReasoningEffort = process.env.OPENAI_AUDIT_REASONING_EFFORT;
const originalAuditModel = process.env.OPENAI_AUDIT_MODEL;

afterEach(() => {
  if (originalReasoningEffort === undefined) {
    delete process.env.OPENAI_AUDIT_REASONING_EFFORT;
  } else {
    process.env.OPENAI_AUDIT_REASONING_EFFORT = originalReasoningEffort;
  }
  if (originalAuditModel === undefined) {
    delete process.env.OPENAI_AUDIT_MODEL;
  } else {
    process.env.OPENAI_AUDIT_MODEL = originalAuditModel;
  }
});

describe("audit model", () => {
  it("uses the directly priced Luna model for the private cost-capped run", () => {
    delete process.env.OPENAI_AUDIT_MODEL;
    expect(auditModel()).toBe("gpt-5.6-luna");
  });
});

describe("audit reasoning effort", () => {
  it("preserves the stage default when no override is configured", () => {
    delete process.env.OPENAI_AUDIT_REASONING_EFFORT;
    expect(auditReasoningEffort("none")).toBe("none");
    expect(auditReasoningEffort("low")).toBe("low");
    expect(auditReasoningEffort("medium")).toBe("medium");
  });

  it("uses one valid override for every stage", () => {
    process.env.OPENAI_AUDIT_REASONING_EFFORT = "max";
    expect(auditReasoningEffort("low")).toBe("max");
    expect(auditReasoningEffort("medium")).toBe("max");
  });

  it("rejects an unsupported override before making an API request", () => {
    process.env.OPENAI_AUDIT_REASONING_EFFORT = "extra-high";
    expect(() => auditReasoningEffort("low")).toThrow(
      "OPENAI_AUDIT_REASONING_EFFORT must be one of",
    );
  });
});

describe("audit observation web search", () => {
  it("does not inject an unverified provider location", () => {
    expect(auditObservationSearchTool()).toEqual({
      type: "web_search",
      search_context_size: "medium",
    });
  });
});

describe("website extraction fallback", () => {
  const input = {
    website_url: "https://example.com",
    brand_name: "Founder supplied brand",
    market_context: "Founder supplied market",
    category: "Founder supplied category",
  };

  it("opens a manual brief when a completed response has no parsed output", () => {
    const draft = extractionDraftOrManualFallback(input, {
      status: "completed",
      incomplete_details: null,
      output: [],
      output_parsed: null,
    });

    expect(draft).toMatchObject({
      brand_name: input.brand_name,
      market_context: input.market_context,
      category: input.category,
      official_sources: [input.website_url],
      evidence: [],
    });
    expect(draft.verified_offerings).toEqual([]);
    expect(draft.warnings.join(" ")).toContain(
      "completed without a usable structured draft",
    );
    expect(draft.warnings.join(" ")).toContain(
      "No extracted business facts were retained",
    );
    expect(extractionDraftSchema.parse(draft)).toEqual(draft);
  });

  it("explains an output-limit completion without retrying or retaining partial content", () => {
    const draft = extractionDraftOrManualFallback(input, {
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      output: [],
      output_parsed: null,
    });

    expect(draft.warnings[0]).toContain("reached its output limit");
    expect(draft.evidence).toEqual([]);
    expect(draft.entity_scope).toBe("");
    expect(draft.target_customer).toBe("");
  });

  it("returns a valid parsed draft unchanged", () => {
    const parsed = extractionDraftOrManualFallback(input, {
      status: "completed",
      incomplete_details: null,
      output: [],
      output_parsed: {
        brand_name: "Extracted brand",
        entity_scope: "Extracted entity",
        brand_type: "Extracted type",
        category: "Extracted category",
        market_context: "Extracted market",
        target_customer: "Extracted customer",
        official_sources: [input.website_url],
        verified_offerings: ["Extracted offer"],
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
      },
    });

    expect(parsed.brand_name).toBe("Extracted brand");
    expect(parsed.verified_offerings).toEqual(["Extracted offer"]);
    expect(parsed.warnings).toEqual([]);
  });
});

describe("structured output failures", () => {
  it("explains the provider completion state without retaining its content", () => {
    expect(() =>
      structuredOutputOrThrow(null, "Report generation", {
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
        output: [],
      }),
    ).toThrow(
      "Report generation did not return usable structured data. Provider status: incomplete; incomplete reason: max_output_tokens; no output text was returned.",
    );
  });

  it("returns a parsed value unchanged", () => {
    expect(
      structuredOutputOrThrow({ ok: true }, "Report generation", {
        status: "completed",
        incomplete_details: null,
        output: [],
      }),
    ).toEqual({ ok: true });
  });
});

describe("audit source titles", () => {
  it("preserves a provider title that fits the observation contract", () => {
    expect(
      normalizeSourceTitle("  Example source title  ", "https://example.com"),
    ).toBe("Example source title");
  });

  it("shortens an overlong provider title without changing its URL", () => {
    const url = "https://example.com/source";
    const title = "Source title ".repeat(40);
    const normalized = { url, title: normalizeSourceTitle(title, url) };

    expect(normalized.title.length).toBeLessThanOrEqual(
      SOURCE_TITLE_MAX_LENGTH,
    );
    expect(normalized.title.endsWith("…")).toBe(true);
    expect(normalized.url).toBe(url);
    expect(sourceSchema.parse(normalized)).toEqual(normalized);
  });

  it("uses a contract-safe display title when a long URL has no title", () => {
    const url = `https://example.com/?query=${"a".repeat(400)}`;
    const normalized = { url, title: normalizeSourceTitle(undefined, url) };

    expect(normalized.title.length).toBeLessThanOrEqual(
      SOURCE_TITLE_MAX_LENGTH,
    );
    expect(sourceSchema.parse(normalized).url).toBe(url);
  });
});
