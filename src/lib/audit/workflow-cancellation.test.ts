import { describe, expect, it, vi } from "vitest";
import { runQuestionWithRetry } from "./retry";
import { runAuditObservations } from "./run-orchestrator";
import type {
  AuditBudget,
  AuditCallTelemetry,
  AuditObservation,
  AuditPrompt,
  BusinessBrief,
} from "./types";

function prompt(index = 1): AuditPrompt {
  return {
    prompt_id: `NVA-ID-${String(index).padStart(2, "0")}`,
    category: "validation",
    role: "test",
    branded: false,
    question: `Pertanyaan ${index}`,
    rationale: "test",
    inputs_used: [],
    review_status: "needs_human_review",
  };
}

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

function call(status: "completed" | "failed" = "failed"): AuditCallTelemetry {
  return {
    stage: "observation",
    attempt: 1,
    status,
    started_at: "2026-08-23T00:00:00.000Z",
    completed_at: "2026-08-23T00:00:00.100Z",
    latency_ms: 100,
    requested_model: "gpt-5.6-luna",
    returned_model: status === "completed" ? "gpt-5.6-luna" : "",
    response_id: status === "completed" ? "resp" : "",
    service_tier: "default",
    usage: {
      input_tokens: 0,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 0,
      reasoning_output_tokens: 0,
      total_tokens: 0,
    },
    web_search_calls: status === "completed" ? 1 : 0,
    accounted_cost_usd: 0,
    cost_basis: "preflight_reservation",
    pricing_version: "test",
    failure_reason: status === "failed" ? "temporary failure" : "",
    provider_status: status,
    incomplete_reason: "",
    output_text_present: status === "completed",
    refusal_present: false,
  };
}

function failedObservation(p: AuditPrompt): AuditObservation {
  return {
    prompt_id: p.prompt_id,
    category: p.category,
    branded: p.branded,
    question: p.question,
    instruction_version: "neutral-response-v1",
    system: "OpenCode Go Responses API",
    requested_model: "gpt-5.6-luna",
    returned_model: "",
    response_id: "",
    observed_at: "2026-08-23T00:00:00.100Z",
    raw_answer: "",
    sources: [],
    run_status: "failed",
    failure_reason: "temporary failure",
    telemetry: [call("failed")],
  };
}

describe("abort-aware audit execution", () => {
  it("passes the exact AbortSignal to provider execution", async () => {
    const controller = new AbortController();
    const execute = vi.fn(async (input) => failedObservation(input.prompt));
    const sleep = vi.fn(async () => undefined);

    await runQuestionWithRetry({
      prompt: prompt(),
      brief,
      safety_identifier: "safety-id",
      budget,
      execute,
      sleep,
      signal: controller.signal,
    });

    expect(execute).toHaveBeenCalled();
    expect(execute.mock.calls[0][0].signal).toBe(controller.signal);
  });

  it("aborts retry backoff and never schedules the next provider attempt", async () => {
    const controller = new AbortController();
    const execute = vi.fn(async (input) => failedObservation(input.prompt));

    await expect(
      runQuestionWithRetry({
        prompt: prompt(),
        brief,
        safety_identifier: "safety-id",
        budget,
        execute,
        signal: controller.signal,
        onRetryScheduled: () => controller.abort(),
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("request abort stops orchestration before another prompt is scheduled", async () => {
    const controller = new AbortController();
    const execute = vi.fn(async (input) => {
      controller.abort();
      return failedObservation(input.prompt);
    });
    const emitted: string[] = [];

    await expect(
      runAuditObservations({
        prompts: Array.from({ length: 10 }, (_, index) => prompt(index + 1)),
        brief,
        safety_identifier: "safety-id",
        budget,
        execute,
        emit: (event) => emitted.push(event.type),
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(emitted).not.toContain("run_completed");
    expect(emitted).not.toContain("run_unfinished");
  });
});
