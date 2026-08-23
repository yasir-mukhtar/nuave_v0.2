import { describe, expect, it } from "vitest";
import { protectedQuestionGenerationProvenanceError } from "./questions-id-live";
import {
  productionObservationMethodErrors,
  protectedObservationAttemptErrors,
} from "./production-observation-method";
import { createVarianceRecord } from "./variance";
import type { AuditCallTelemetry, AuditObservation } from "./types";

function telemetry(
  overrides: Partial<AuditCallTelemetry> = {},
): AuditCallTelemetry {
  return {
    stage: "observation",
    attempt: 1,
    status: "completed",
    started_at: "2026-08-23T00:00:00.000Z",
    completed_at: "2026-08-23T00:00:01.000Z",
    latency_ms: 1000,
    requested_model: "gpt-5.6-luna",
    returned_model: "gpt-5.6-luna",
    response_id: "resp-1",
    service_tier: "default",
    usage: {
      input_tokens: 10,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 10,
      reasoning_output_tokens: 0,
      total_tokens: 20,
    },
    web_search_calls: 1,
    accounted_cost_usd: 0.01,
    cost_basis: "provider_usage",
    pricing_version: "openai-standard-2026-08-01",
    failure_reason: "",
    provider_status: "completed",
    incomplete_reason: "",
    output_text_present: true,
    refusal_present: false,
    ...overrides,
  };
}

function observation(
  id = "NVA-ID-01",
  overrides: Partial<AuditObservation> = {},
): AuditObservation {
  return {
    prompt_id: id,
    category: "validation",
    branded: false,
    question: `Pertanyaan ${id}`,
    instruction_version: "neutral-response-v1",
    system: "OpenCode Go Responses API",
    requested_model: "gpt-5.6-luna",
    returned_model: "gpt-5.6-luna",
    response_id: `resp-${id}`,
    observed_at: "2026-08-23T00:00:01.000Z",
    raw_answer: "Jawaban yang dapat dievaluasi.",
    sources: [{ url: "https://example.com", title: "Example" }],
    run_status: "completed",
    failure_reason: "",
    telemetry: [telemetry({ response_id: `resp-${id}` })],
    ...overrides,
  };
}

describe("positive protected observation attempt", () => {
  it("accepts one canonical completed protected attempt", () => {
    expect(protectedObservationAttemptErrors(observation())).toEqual([]);
  });

  it("rejects zero completed calls", () => {
    expect(
      protectedObservationAttemptErrors(
        observation("NVA-ID-01", { telemetry: [] }),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/no completed observation-stage provider attempt/i),
      ]),
    );
  });

  it("rejects failed-only calls", () => {
    const failed = telemetry({
      status: "failed",
      returned_model: "",
      response_id: "",
      web_search_calls: 0,
      failure_reason: "network failure",
    });
    expect(
      protectedObservationAttemptErrors(
        observation("NVA-ID-01", { telemetry: [failed] }),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/no completed observation-stage provider attempt/i),
      ]),
    );
  });

  it("rejects a wrong-stage completed call", () => {
    expect(
      protectedObservationAttemptErrors(
        observation("NVA-ID-01", {
          telemetry: [
            telemetry({ stage: "report", response_id: "resp-NVA-ID-01" }),
          ],
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/no completed observation-stage provider attempt/i),
      ]),
    );
  });

  it("rejects a missing protected instruction", () => {
    expect(
      protectedObservationAttemptErrors(
        observation("NVA-ID-01", { instruction_version: undefined }),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/instruction version missing/i),
      ]),
    );
  });

  it("rejects citation evidence without an actual web_search_call", () => {
    const item = observation("NVA-ID-01");
    item.telemetry = [
      telemetry({ response_id: item.response_id, web_search_calls: 0 }),
    ];
    expect(protectedObservationAttemptErrors(item)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/zero actual web_search_call executions/i),
      ]),
    );
  });

  it("rejects missing and mismatched response correspondence", () => {
    const missing = observation("NVA-ID-01", { response_id: "" });
    expect(protectedObservationAttemptErrors(missing)).toEqual(
      expect.arrayContaining([expect.stringMatching(/missing response_id/i)]),
    );

    const mismatch = observation("NVA-ID-02");
    mismatch.telemetry = [telemetry({ response_id: "different-response" })];
    expect(protectedObservationAttemptErrors(mismatch)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/response_id does not match/i),
      ]),
    );
  });

  it("rejects wrong or missing returned model", () => {
    const wrong = observation("NVA-ID-01", { returned_model: "other-model" });
    wrong.telemetry = [
      telemetry({
        response_id: wrong.response_id,
        returned_model: "other-model",
      }),
    ];
    expect(protectedObservationAttemptErrors(wrong)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/returned model other-model/i),
      ]),
    );

    const missing = observation("NVA-ID-02", { returned_model: "" });
    missing.telemetry = [
      telemetry({ response_id: missing.response_id, returned_model: "" }),
    ];
    expect(protectedObservationAttemptErrors(missing)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/returned model missing/i),
      ]),
    );
  });

  it("rejects one provider response being accepted for two prompts", () => {
    const first = observation("NVA-ID-01");
    const second = observation("NVA-ID-02", {
      response_id: first.response_id,
    });
    second.telemetry = [telemetry({ response_id: first.response_id })];
    expect(productionObservationMethodErrors([first, second])).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/already bound to NVA-ID-01/i),
      ]),
    );
  });
});

describe("protected question-generation provenance", () => {
  it("accepts exact returned model and response identity", () => {
    expect(
      protectedQuestionGenerationProvenanceError({
        provider: "opencodego",
        requested_model: "gpt-5.6-luna",
        returned_model: "gpt-5.6-luna",
        response_id: "resp-question",
      }),
    ).toBe("");
  });

  it("rejects wrong or missing returned model", () => {
    expect(
      protectedQuestionGenerationProvenanceError({
        provider: "opencodego",
        requested_model: "gpt-5.6-luna",
        returned_model: "other-model",
        response_id: "resp-question",
      }),
    ).toMatch(/returned other-model/i);
    expect(
      protectedQuestionGenerationProvenanceError({
        provider: "opencodego",
        requested_model: "gpt-5.6-luna",
        returned_model: "",
        response_id: "resp-question",
      }),
    ).toMatch(/no model provenance/i);
  });
});

describe("variance protected completeness", () => {
  it("marks failed or malformed evidence incomplete", () => {
    const first = observation("NVA-ID-01");
    const second = observation("NVA-ID-06");
    second.telemetry = [
      telemetry({
        response_id: second.response_id,
        status: "failed",
        returned_model: "",
        web_search_calls: 0,
      }),
    ];
    const record = createVarianceRecord({
      run_key: "run-1",
      prompt_ids: [first.prompt_id, second.prompt_id],
      observations: [first, second],
    });
    expect(record.complete).toBe(false);
    expect(record.incomplete_reason).toMatch(/protected-attempt invariant/i);
  });

  it("marks an exact pair of valid protected observations complete", () => {
    const first = observation("NVA-ID-01");
    const second = observation("NVA-ID-06");
    const record = createVarianceRecord({
      run_key: "run-2",
      prompt_ids: [first.prompt_id, second.prompt_id],
      observations: [first, second],
    });
    expect(record.complete).toBe(true);
    expect(record.incomplete_reason).toBeUndefined();
  });
});
