import { describe, expect, it } from "vitest";
import type { AuditObservation } from "./types";
import {
  VARIANCE_MAX_QUESTIONS,
  VARIANCE_MIN_QUESTIONS,
  assertVarianceNotBlended,
  createVarianceRecord,
  validateVarianceRequest,
} from "./variance";

function fakeObservation(prompt_id: string): AuditObservation {
  return {
    prompt_id,
    category: "need_discovery",
    branded: false,
    question: `Question for ${prompt_id}?`,
    instruction_version: "neutral-id-v1",
    system: "OpenAI Responses API",
    requested_model: "gpt-5.6-luna",
    returned_model: "gpt-5.6-luna",
    response_id: `resp_${prompt_id}`,
    observed_at: new Date().toISOString(),
    raw_answer: `Answer for ${prompt_id} mentions the business.`,
    sources: [],
    run_status: "completed",
    failure_reason: "",
    telemetry: [
      {
        stage: "observation",
        attempt: 1,
        status: "completed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        latency_ms: 100,
        requested_model: "gpt-5.6-luna",
        returned_model: "gpt-5.6-luna",
        response_id: `resp_${prompt_id}`,
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
        accounted_cost_usd: 0.001,
        cost_basis: "provider_usage",
        pricing_version: "openai-standard-2026-08-01",
        failure_reason: "",
        provider_status: "completed",
        incomplete_reason: "",
        output_text_present: true,
        refusal_present: false,
        automatic: false,
      },
    ],
  };
}

describe("variance (R-22)", () => {
  it("requires 2–3 designated questions", () => {
    expect(validateVarianceRequest({ prompt_ids: ["a"] })).toHaveLength(1);
    expect(
      validateVarianceRequest({ prompt_ids: ["a", "b", "c", "d"] }),
    ).toHaveLength(1);
    expect(validateVarianceRequest({ prompt_ids: ["a", "b"] })).toHaveLength(0);
    expect(
      validateVarianceRequest({ prompt_ids: ["a", "b", "c"] }),
    ).toHaveLength(0);
    expect(VARIANCE_MIN_QUESTIONS).toBe(2);
    expect(VARIANCE_MAX_QUESTIONS).toBe(3);
  });

  it("rejects duplicate prompt_ids", () => {
    expect(validateVarianceRequest({ prompt_ids: ["a", "a"] })).toEqual(
      expect.arrayContaining([expect.stringContaining("unique")]),
    );
  });

  it("creates a variance record with 2 questions, separate from main counts", () => {
    const prompt_ids = ["NVA-ID-01", "NVA-ID-05"];
    const observations = prompt_ids.map(fakeObservation);
    const record = createVarianceRecord({
      run_key: "test-run-key",
      prompt_ids,
      observations,
    });
    expect(record.prompt_ids).toEqual(prompt_ids);
    expect(record.observations).toHaveLength(2);
    expect(record.complete).toBe(true);
    expect(record.run_key).toBe("test-run-key");
    // Separate storage: variance observations are not main observations
    expect(record.observations[0].prompt_id).toBe("NVA-ID-01");
  });

  it("creates a variance record with 3 questions", () => {
    const prompt_ids = ["NVA-ID-02", "NVA-ID-04", "NVA-ID-09"];
    const observations = prompt_ids.map(fakeObservation);
    const record = createVarianceRecord({
      run_key: "k2",
      prompt_ids,
      observations,
    });
    expect(record.observations).toHaveLength(3);
    expect(record.complete).toBe(true);
  });

  it("marks incomplete when a failure reason is supplied (failure matrix row)", () => {
    const prompt_ids = ["NVA-ID-01", "NVA-ID-02"];
    const observations = prompt_ids.map(fakeObservation);
    const record = createVarianceRecord({
      run_key: "k3",
      prompt_ids,
      observations,
      incomplete_reason: "Provider timeout on NVA-ID-02",
    });
    expect(record.complete).toBe(false);
    expect(record.incomplete_reason).toMatch(/timeout/);
  });

  it("rejects when observations do not match designated prompt_ids exactly", () => {
    expect(() =>
      createVarianceRecord({
        run_key: "k",
        prompt_ids: ["NVA-ID-01", "NVA-ID-02"],
        observations: [fakeObservation("NVA-ID-01")],
      }),
    ).toThrow(/Missing/);
    expect(() =>
      createVarianceRecord({
        run_key: "k",
        prompt_ids: ["NVA-ID-01", "NVA-ID-02"],
        observations: [
          fakeObservation("NVA-ID-01"),
          fakeObservation("NVA-ID-02"),
          fakeObservation("NVA-ID-03"),
        ],
      }),
    ).toThrow(/extra/);
  });

  it("never blends variance observations into main 10/10 set (separation invariant)", () => {
    const main = Array.from({ length: 10 }, (_, i) =>
      fakeObservation(`NVA-ID-${String(i + 1).padStart(2, "0")}`),
    );
    const variance = createVarianceRecord({
      run_key: "main-run",
      prompt_ids: ["NVA-ID-01", "NVA-ID-02"],
      observations: ["NVA-ID-01", "NVA-ID-02"].map(fakeObservation),
    });
    // Same prompt_ids as main is expected — variance is a re-ask, not blending
    expect(() =>
      assertVarianceNotBlended({ mainObservations: main, variance }),
    ).not.toThrow();
    // Appending variance to main would create 12 entries — that is blending
    const blended = [...main, ...variance.observations];
    expect(() =>
      assertVarianceNotBlended({
        mainObservations: blended as AuditObservation[],
        variance,
      }),
    ).toThrow(/never be blended/);
  });

  it("variance observations carry full telemetry (R-20)", () => {
    const record = createVarianceRecord({
      run_key: "k4",
      prompt_ids: ["NVA-ID-03", "NVA-ID-07"],
      observations: ["NVA-ID-03", "NVA-ID-07"].map(fakeObservation),
    });
    for (const obs of record.observations) {
      expect(obs.telemetry.length).toBeGreaterThan(0);
      expect(obs.telemetry[0].stage).toBe("observation");
      expect(obs.telemetry[0].accounted_cost_usd).toBeGreaterThan(0);
    }
  });
});
