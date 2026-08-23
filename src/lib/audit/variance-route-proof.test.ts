import { beforeEach, describe, expect, it, vi } from "vitest";
import { fixtureBudget, fixtureCallTelemetry } from "./fixtures/telemetry";
import {
  canonicalLockedQuestionPack,
  designatedVariancePrompts,
} from "./locked-question-pack";
import type { AuditObservation, AuditPrompt, BusinessBrief } from "./types";

const routeMocks = vi.hoisted(() => ({
  assertCredentials: vi.fn(),
  runQuestion: vi.fn(),
}));

vi.mock("@/lib/audit/provider", () => ({
  OPENCODEGO_SYSTEM: "OpenCode Go Responses API",
  assertLiveProviderCredentialsConfigured: routeMocks.assertCredentials,
  liveExecuteAuditPrompt: vi.fn(),
}));

vi.mock("@/lib/audit/retry", () => ({
  runQuestionWithRetry: routeMocks.runQuestion,
}));

import { POST } from "@/app/api/audit/variance/route";

const categories = [
  "need_discovery",
  "need_discovery",
  "solution_discovery",
  "solution_discovery",
  "comparison",
  "comparison",
  "validation",
  "validation",
  "action",
  "action",
] as const;

function brief(): BusinessBrief {
  return {
    brand_name: "Kopi Nuave",
    entity_scope: "Jakarta",
    brand_type: "coffee shop",
    category: "coffee shop",
    market_context: "Jakarta",
    target_customer: "coffee drinkers",
    official_sources: ["https://kopinuave.example/"],
    verified_offerings: ["coffee"],
    verified_customer_needs: ["find coffee"],
    verified_decision_criteria: ["location"],
    verified_competitor: { name: "", scope: "", source_url: "" },
    similar_businesses: [],
    brand_name_variants: ["Nuave Coffee"],
    priority_offering: "coffee",
    conversion_action: "visit the shop",
    customer_supplied_facts: [],
    known_accuracy_questions: [],
    usp: "",
    regulated_category_notes: "",
    language: "en-US",
    agency_name: "",
    agency_logo_data_url: "",
  };
}

function rawPrompts(): AuditPrompt[] {
  return categories.map((category, index) => {
    const branded = index >= 5;
    return {
      prompt_id: `NVA-ID-${String(index + 1).padStart(2, "0")}`,
      category,
      role: "test",
      branded,
      question: branded
        ? `Apa yang perlu diketahui tentang Kopi Nuave untuk keputusan ${index + 1}?`
        : `Apa pilihan coffee shop di Jakarta untuk kebutuhan ${index + 1}?`,
      rationale: "test",
      inputs_used: ["brand_name"],
      review_status: "needs_human_review",
    };
  });
}

function protectedObservation(
  prompt: AuditPrompt,
  responseId = `resp-${prompt.prompt_id}`,
): AuditObservation {
  return {
    prompt_id: prompt.prompt_id,
    category: prompt.category,
    branded: prompt.branded,
    question: prompt.question,
    instruction_version: "neutral-response-v1",
    system: "OpenCode Go Responses API",
    requested_model: "gpt-5.6-luna",
    returned_model: "gpt-5.6-luna",
    response_id: responseId,
    observed_at: "2026-08-23T00:00:01.000Z",
    raw_answer: "Jawaban yang dapat dievaluasi.",
    sources: [{ url: "https://example.com", title: "Example" }],
    run_status: "completed",
    failure_reason: "",
    telemetry: [
      fixtureCallTelemetry({
        stage: "observation",
        requested_model: "gpt-5.6-luna",
        returned_model: "gpt-5.6-luna",
        response_id: responseId,
        web_search_calls: 1,
      }),
    ],
  };
}

function requestBody() {
  const businessBrief = brief();
  const locked = canonicalLockedQuestionPack(
    rawPrompts(),
    businessBrief,
  ).prompts;
  return {
    brief: businessBrief,
    locked_prompts: locked,
    completed_observations: locked.map((prompt) =>
      protectedObservation(prompt),
    ),
    prompts: designatedVariancePrompts(locked, businessBrief),
    safety_identifier: "wave1-test-session",
    budget: fixtureBudget,
    run_key: "resp-report-wave1",
  };
}

function requestFrom(body: Record<string, unknown>) {
  return new Request("http://localhost/api/audit/variance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function post(body: Record<string, unknown>) {
  return POST(requestFrom(body));
}

beforeEach(() => {
  routeMocks.assertCredentials.mockReset();
  routeMocks.runQuestion.mockReset();
  routeMocks.runQuestion.mockImplementation(async ({ prompt }) => {
    const observation = protectedObservation(
      prompt as AuditPrompt,
      `resp-variance-${(prompt as AuditPrompt).prompt_id}`,
    );
    return {
      status: "evaluable",
      observation,
      attempts: [],
      retry_count: 0,
    };
  });
});

describe("variance completed-run proof route boundary", () => {
  it("rejects a request without completed_observations before provider work", async () => {
    const body = requestBody() as Record<string, unknown>;
    delete body.completed_observations;

    const response = await post(body);

    expect(response.status).toBe(400);
    expect(routeMocks.assertCredentials).not.toHaveBeenCalled();
    expect(routeMocks.runQuestion).not.toHaveBeenCalled();
  });

  it("rejects fewer than ten completed observations before provider work", async () => {
    const body = requestBody();
    body.completed_observations = body.completed_observations.slice(0, 9);

    const response = await post(body);

    expect(response.status).toBe(400);
    expect(routeMocks.assertCredentials).not.toHaveBeenCalled();
    expect(routeMocks.runQuestion).not.toHaveBeenCalled();
  });

  it("rejects an observation whose question does not match the locked pack", async () => {
    const body = requestBody();
    body.completed_observations[0] = {
      ...body.completed_observations[0],
      question: "Pertanyaan berbeda dengan ID yang sama",
    };

    const response = await post(body);

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      error: expect.stringMatching(/does not match the exact locked question/i),
    });
    expect(routeMocks.assertCredentials).not.toHaveBeenCalled();
    expect(routeMocks.runQuestion).not.toHaveBeenCalled();
  });

  it("rejects failed or wrong-method evidence inside the ten", async () => {
    const failedBody = requestBody();
    failedBody.completed_observations[0] = {
      ...failedBody.completed_observations[0],
      run_status: "failed",
      raw_answer: "",
      failure_reason: "synthetic failure",
    };
    const failedResponse = await post(failedBody);
    expect(failedResponse.status).toBe(422);

    const wrongMethodBody = requestBody();
    wrongMethodBody.completed_observations[0] = {
      ...wrongMethodBody.completed_observations[0],
      system: "OpenAI Responses API",
    };
    const wrongMethodResponse = await post(wrongMethodBody);
    expect(wrongMethodResponse.status).toBe(422);

    expect(routeMocks.assertCredentials).not.toHaveBeenCalled();
    expect(routeMocks.runQuestion).not.toHaveBeenCalled();
  });

  it("rejects arbitrary structurally valid variance prompts", async () => {
    const body = requestBody();
    body.prompts = [body.locked_prompts[1], body.locked_prompts[6]];

    const response = await post(body);

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      error: expect.stringMatching(/not the exact designated locked question/i),
    });
    expect(routeMocks.assertCredentials).not.toHaveBeenCalled();
    expect(routeMocks.runQuestion).not.toHaveBeenCalled();
  });

  it("accepts exact locked 10/10 proof and the exact designated subset using stubs only", async () => {
    const response = await post(requestBody());
    const payload = (await response.json()) as {
      variance: { complete: boolean; prompt_ids: string[] };
    };

    expect(response.status).toBe(200);
    expect(routeMocks.assertCredentials).toHaveBeenCalledTimes(1);
    expect(routeMocks.runQuestion).toHaveBeenCalledTimes(2);
    expect(payload.variance.complete).toBe(true);
    expect(payload.variance.prompt_ids).toEqual(
      requestBody().prompts.map((prompt) => prompt.prompt_id),
    );
  });
});
