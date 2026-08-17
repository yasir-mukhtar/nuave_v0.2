import { afterEach, describe, expect, it } from "vitest";
import type { Response } from "openai/resources/responses/responses";
import {
  AUDIT_CALL_LIMITS,
  AUDIT_MODEL,
  AUDIT_STAGE_CALL_LIMITS,
  AuditBudgetError,
  completedCallTelemetry,
  configuredAuditCarryoverCostUsd,
  effectiveAuditCarryoverCostUsd,
  failedCallTelemetry,
  providerCompletionDiagnostics,
  reserveAuditCall,
  structuredOutputFailureDetail,
  summarizeAuditTelemetry,
} from "./telemetry";
import { fixtureBudget, fixtureCallTelemetry } from "./fixtures/telemetry";

const originalCarryoverCost = process.env.OPENAI_AUDIT_CARRYOVER_COST_USD;

afterEach(() => {
  if (originalCarryoverCost === undefined) {
    delete process.env.OPENAI_AUDIT_CARRYOVER_COST_USD;
  } else {
    process.env.OPENAI_AUDIT_CARRYOVER_COST_USD = originalCarryoverCost;
  }
});

function meteredResponse(overrides: Record<string, unknown> = {}): Response {
  return {
    id: "resp_metered",
    model: AUDIT_MODEL,
    service_tier: "default",
    output: [],
    usage: {
      input_tokens: 1_000,
      input_tokens_details: {
        cached_tokens: 0,
        cache_write_tokens: 0,
      },
      output_tokens: 500,
      output_tokens_details: { reasoning_tokens: 100 },
      total_tokens: 1_500,
    },
    ...overrides,
  } as unknown as Response;
}

describe("private audit cost telemetry", () => {
  it("refuses any paid call for the code-owned question stage", () => {
    expect(AUDIT_CALL_LIMITS.prompts).toEqual({
      max_output_tokens: 0,
      max_tool_calls: 0,
    });
    expect(() =>
      reserveAuditCall({
        budget: fixtureBudget,
        stage: "prompts",
        request: {},
        requested_model: AUDIT_MODEL,
        has_web_search: false,
      }),
    ).toThrow("no longer makes a paid provider call");
  });

  it("retains safe provider completion diagnostics for a structured failure", () => {
    const call = completedCallTelemetry({
      stage: "report",
      started_at_ms: Date.now(),
      requested_model: AUDIT_MODEL,
      response: meteredResponse({
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
        output: [{ type: "reasoning", summary: [] }],
      }),
    });

    expect(call).toMatchObject({
      provider_status: "incomplete",
      incomplete_reason: "max_output_tokens",
      output_text_present: false,
      refusal_present: false,
    });
    expect(call.usage.output_tokens).toBe(500);
    expect(JSON.stringify(call)).not.toContain("private");
    expect(
      structuredOutputFailureDetail(
        providerCompletionDiagnostics(
          meteredResponse({
            status: "incomplete",
            incomplete_details: { reason: "max_output_tokens" },
            output: [],
          }),
        ),
      ),
    ).toBe(
      "Provider status: incomplete; incomplete reason: max_output_tokens; no output text was returned.",
    );
  });

  it("distinguishes a completed refusal from a truncated response", () => {
    const diagnostics = providerCompletionDiagnostics(
      meteredResponse({
        status: "completed",
        incomplete_details: null,
        output: [
          { type: "message", content: [{ type: "refusal", refusal: "no" }] },
        ],
      }),
    );

    expect(diagnostics).toEqual({
      provider_status: "completed",
      incomplete_reason: "",
      output_text_present: false,
      refusal_present: true,
    });
    expect(structuredOutputFailureDetail(diagnostics)).toBe(
      "Provider status: completed; the response was a refusal.",
    );
  });

  it("reserves the full Luna input allowance for each web-search call", () => {
    const reserved = reserveAuditCall({
      budget: fixtureBudget,
      stage: "observation",
      request: { input: "short customer question" },
      requested_model: AUDIT_MODEL,
      has_web_search: true,
    });

    expect(AUDIT_CALL_LIMITS.observation).toEqual({
      max_output_tokens: 3_000,
      max_tool_calls: 1,
    });
    expect(AUDIT_CALL_LIMITS.report).toEqual({
      max_output_tokens: 16_000,
      max_tool_calls: 0,
    });
    expect(reserved).toBeCloseTo(0.3842, 8);
  });

  it("fails closed for an unpriced model or a call that could exceed USD 5", () => {
    expect(() =>
      reserveAuditCall({
        budget: fixtureBudget,
        stage: "report",
        request: {},
        requested_model: "gpt-5.6",
        has_web_search: false,
      }),
    ).toThrow(AuditBudgetError);

    expect(() =>
      reserveAuditCall({
        budget: {
          ...fixtureBudget,
          calls: [fixtureCallTelemetry({ accounted_cost_usd: 4.99 })],
        },
        stage: "report",
        request: {},
        requested_model: AUDIT_MODEL,
        has_web_search: false,
      }),
    ).toThrow("could exceed the USD 5.00 audit limit");
  });

  it("carries historical spend into preflight accounting", () => {
    process.env.OPENAI_AUDIT_CARRYOVER_COST_USD = "0.3483";

    expect(configuredAuditCarryoverCostUsd()).toBe(0.3483);
    expect(effectiveAuditCarryoverCostUsd(fixtureBudget)).toBe(0.3483);
    expect(() =>
      reserveAuditCall({
        budget: {
          ...fixtureBudget,
          carryover_cost_usd: 0,
          calls: [fixtureCallTelemetry({ accounted_cost_usd: 4.3 })],
        },
        stage: "observation",
        request: { input: "short customer question" },
        requested_model: AUDIT_MODEL,
        has_web_search: true,
      }),
    ).toThrow("USD 4.6483 is already accounted for");
    expect(() =>
      reserveAuditCall({
        budget: { ...fixtureBudget, carryover_cost_usd: 4.7 },
        stage: "observation",
        request: { input: "short customer question" },
        requested_model: AUDIT_MODEL,
        has_web_search: true,
      }),
    ).toThrow("USD 4.7000 is already accounted for");
  });

  it("fails closed when configured carry-over is invalid", () => {
    process.env.OPENAI_AUDIT_CARRYOVER_COST_USD = "not-a-price";

    expect(() => configuredAuditCarryoverCostUsd()).toThrow(
      "OPENAI_AUDIT_CARRYOVER_COST_USD must be between 0 and 5",
    );
  });

  it("enforces per-stage call ceilings before another provider call", () => {
    // Spec 003 R-36: the observation stage ceiling is retry-aware (10
    // questions x 3 attempts = 30) while the USD 5 per-session ceiling stays
    // the binding cap.
    expect(AUDIT_STAGE_CALL_LIMITS).toEqual({
      extract: 1,
      prompts: 0,
      observation: 30,
      report: 3,
    });
    expect(() =>
      reserveAuditCall({
        budget: {
          ...fixtureBudget,
          calls: Array.from({ length: 3 }, (_, index) =>
            fixtureCallTelemetry({ response_id: `report-${index + 1}` }),
          ),
        },
        stage: "report",
        request: {},
        requested_model: AUDIT_MODEL,
        has_web_search: false,
      }),
    ).toThrow("reached its 3-call private audit limit");
  });

  it("lets the observation stage absorb the 1+2 retry policy before the ceiling binds", () => {
    // 29 observation calls (within the 30-call retry-aware allowance) plus a
    // fresh reservation must be accepted; the 31st observation call must hit
    // the stage ceiling. The USD 5 ceiling remains the binding cap and is
    // checked separately in the accounting tests above.
    const nearFull = {
      ...fixtureBudget,
      calls: Array.from({ length: 29 }, (_, index) =>
        fixtureCallTelemetry({
          stage: "observation",
          response_id: `observation-${index + 1}`,
        }),
      ),
    };
    expect(() =>
      reserveAuditCall({
        budget: nearFull,
        stage: "observation",
        request: { input: "short customer question" },
        requested_model: AUDIT_MODEL,
        has_web_search: true,
      }),
    ).not.toThrow();

    const full = {
      ...fixtureBudget,
      calls: Array.from({ length: 30 }, (_, index) =>
        fixtureCallTelemetry({
          stage: "observation",
          response_id: `observation-${index + 1}`,
        }),
      ),
    };
    expect(() =>
      reserveAuditCall({
        budget: full,
        stage: "observation",
        request: { input: "short customer question" },
        requested_model: AUDIT_MODEL,
        has_web_search: true,
      }),
    ).toThrow("reached its 30-call private audit limit");
  });

  it("prices long-context provider usage without double-counting cached or cache-write tokens", () => {
    const response = meteredResponse({
      output: [{ type: "web_search_call" }],
      usage: {
        input_tokens: 300_000,
        input_tokens_details: {
          cached_tokens: 10_000,
          cache_write_tokens: 20_000,
        },
        output_tokens: 100_000,
        output_tokens_details: { reasoning_tokens: 50_000 },
        total_tokens: 400_000,
      },
    });
    const call = completedCallTelemetry({
      stage: "observation",
      started_at_ms: Date.now(),
      requested_model: AUDIT_MODEL,
      response,
    });

    expect(call.usage.reasoning_output_tokens).toBe(50_000);
    expect(call.web_search_calls).toBe(1);
    expect(call.accounted_cost_usd).toBeCloseTo(0.3084, 8);
    expect(call.cost_basis).toBe("provider_usage");
  });

  it("rejects unexpected returned models and paid service tiers", () => {
    expect(() =>
      completedCallTelemetry({
        stage: "report",
        started_at_ms: Date.now(),
        requested_model: AUDIT_MODEL,
        response: meteredResponse({ model: "gpt-5.6-sol" }),
      }),
    ).toThrow("cost guard is pinned");

    expect(() =>
      completedCallTelemetry({
        stage: "report",
        started_at_ms: Date.now(),
        requested_model: AUDIT_MODEL,
        response: meteredResponse({ service_tier: "priority" }),
      }),
    ).toThrow("only standard default pricing is allowed");
  });

  it("retains full reservation cost when provider usage is unavailable", () => {
    const failed = failedCallTelemetry({
      stage: "observation",
      started_at_ms: Date.now(),
      requested_model: AUDIT_MODEL,
      reserved_cost_usd: 0.3842,
      error: new Error("Synthetic timeout"),
    });
    const summary = summarizeAuditTelemetry(
      [fixtureCallTelemetry(), failed],
      5,
      0.3483,
    );

    expect(failed.cost_basis).toBe("preflight_reservation");
    expect(summary).toMatchObject({
      call_count: 2,
      failed_call_count: 1,
      carryover_cost_usd: 0.3483,
      accounted_cost_usd: 0.7333,
    });
  });
});
