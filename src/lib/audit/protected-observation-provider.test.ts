import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createResponse = vi.hoisted(() => vi.fn());

vi.mock("openai", () => ({
  default: class MockOpenAI {
    responses = { create: createResponse };
  },
}));

import { executeAbortableProtectedObservation } from "./protected-observation-provider";
import type { AuditBudget, AuditPrompt, BusinessBrief } from "./types";

const prompt: AuditPrompt = {
  prompt_id: "NVA-ID-01",
  category: "validation",
  role: "test",
  branded: false,
  question: "Apa pilihan bisnis untuk kebutuhan ini?",
  rationale: "test",
  inputs_used: [],
  review_status: "needs_human_review",
};

const brief = {
  brand_name: "Nuave",
  entity_scope: "Jakarta",
  brand_type: "service",
  category: "service",
  market_context: "Jakarta",
  target_customer: "customer",
  official_sources: ["https://example.com"],
  verified_offerings: ["service"],
  verified_customer_needs: ["need"],
  verified_decision_criteria: ["criteria"],
  verified_competitor: { name: "", scope: "", source_url: "" },
  similar_businesses: [],
  brand_name_variants: [],
  priority_offering: "service",
  conversion_action: "contact",
  customer_supplied_facts: [],
  known_accuracy_questions: [],
  usp: "",
  regulated_category_notes: "",
  language: "en-US",
  agency_name: "",
  agency_logo_data_url: "",
} satisfies BusinessBrief;

const budget: AuditBudget = {
  limit_usd: 5,
  carryover_cost_usd: 0,
  calls: [],
};

describe("abortable protected observation provider", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "offline-test-key";
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_AUDIT_MODEL;
    delete process.env.OPENAI_AUDIT_REASONING_EFFORT;
    createResponse.mockReset();
    createResponse.mockResolvedValue({
      id: "resp-1",
      model: "gpt-5.6-luna",
      created_at: 1_788_000_000,
      service_tier: "default",
      status: "completed",
      incomplete_details: null,
      output_text: "Jawaban",
      output: [
        {
          type: "web_search_call",
          action: { type: "search", sources: [] },
        },
      ],
      usage: {
        input_tokens: 10,
        output_tokens: 10,
        total_tokens: 20,
        input_tokens_details: { cached_tokens: 0 },
        output_tokens_details: { reasoning_tokens: 0 },
      },
    });
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it("passes the request AbortSignal into the OpenAI-compatible SDK call", async () => {
    const controller = new AbortController();
    await executeAbortableProtectedObservation({
      prompt,
      brief,
      safety_identifier: "offline-safety-id",
      budget,
      signal: controller.signal,
    });

    expect(createResponse).toHaveBeenCalledTimes(1);
    expect(createResponse.mock.calls[0][1]).toEqual({
      signal: controller.signal,
    });
  });
});
