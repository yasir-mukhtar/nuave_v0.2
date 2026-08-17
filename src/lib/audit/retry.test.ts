import { describe, expect, it, vi } from "vitest";
import type { AuditObservation, AuditPrompt, BusinessBrief } from "./types";
import {
  MAX_ATTEMPTS_PER_QUESTION,
  MAX_AUTOMATIC_RETRIES_PER_QUESTION,
  MAX_RETRY_BACKOFF_MS,
  OBSERVATION_STAGE_MAX_CALLS,
  RETRY_BACKOFF_MS,
  classifyObservationFailure,
  retryBackoffMs,
  runQuestionWithRetry,
  type QuestionExecuteInput,
} from "./retry";
import { AUDIT_STAGE_CALL_LIMITS } from "./telemetry";
import { fixtureBudget, fixtureCallTelemetry } from "./fixtures/telemetry";

const prompt: AuditPrompt = {
  prompt_id: "p1",
  category: "need_discovery",
  role: "discovery",
  branded: false,
  question: "Klinik gigi mana yang direkomendasikan di Depok?",
  rationale: "test rationale",
  inputs_used: ["category"],
  review_status: "needs_human_review",
};

// The retry module treats the brief and safety identifier as opaque locked
// configuration; identity (not content) is what the same-config contract pins.
const brief = {} as BusinessBrief;
const safetyIdentifier = "test-user-123";

function observation(
  promptId: string,
  overrides: Partial<AuditObservation> = {},
): AuditObservation {
  return {
    prompt_id: promptId,
    category: "need_discovery",
    branded: false,
    question: "Question?",
    system: "OpenAI Responses API",
    requested_model: "gpt-5.6-luna",
    returned_model: "gpt-5.6-luna",
    response_id: "resp_test",
    observed_at: "2026-08-17T00:00:00.000Z",
    raw_answer: "Usable answer.",
    sources: [],
    run_status: "completed",
    failure_reason: "",
    telemetry: [fixtureCallTelemetry({ stage: "observation" })],
    ...overrides,
  };
}

function failedObservation(reason: string): AuditObservation {
  return observation("p1", {
    run_status: "failed",
    raw_answer: "",
    returned_model: "",
    response_id: "",
    failure_reason: reason,
    telemetry: [
      fixtureCallTelemetry({
        stage: "observation",
        status: "failed",
        accounted_cost_usd: 0.3842,
        cost_basis: "preflight_reservation",
        failure_reason: reason,
      }),
    ],
  });
}

function run(input: {
  execute: (input: QuestionExecuteInput) => Promise<AuditObservation>;
  sleep?: (ms: number) => Promise<void>;
  onRetryScheduled?: (info: {
    attempt: number;
    next_attempt: number;
    backoff_ms: number;
    failure_reason: string;
    failure_category: string;
  }) => void;
}) {
  return runQuestionWithRetry({
    prompt,
    brief,
    safety_identifier: safetyIdentifier,
    budget: fixtureBudget,
    execute: input.execute,
    sleep: input.sleep ?? (async () => {}),
    onRetryScheduled: input.onRetryScheduled,
  });
}

describe("retry policy (Spec 003 R-17/R-18)", () => {
  it("runs a valid question exactly once and never reruns a valid result", async () => {
    const execute = vi.fn(async () => observation("p1"));
    const outcome = await run({
      execute,
      sleep: async () => {
        throw new Error("A valid result must never wait for a retry.");
      },
    });

    expect(outcome.status).toBe("evaluable");
    expect(execute).toHaveBeenCalledTimes(1);
    expect(outcome.retry_count).toBe(0);
    expect(outcome.attempts).toHaveLength(1);
    expect(outcome.attempts[0].attempt).toBe(1);
    expect(outcome.attempts[0].automatic).toBe(false);
  });

  it("retries at most twice after the initial attempt and then stops", async () => {
    const execute = vi.fn(async () =>
      failedObservation("Temporary provider failure"),
    );
    const outcome = await run({ execute });

    expect(execute).toHaveBeenCalledTimes(3);
    expect(outcome.status).toBe("exhausted");
    expect(outcome.retry_count).toBe(2);
    expect(outcome.attempts.map((attempt) => attempt.attempt)).toEqual([
      1, 2, 3,
    ]);
  });

  it("stops as soon as one evaluable response is saved", async () => {
    let calls = 0;
    const execute = vi.fn(async () => {
      calls += 1;
      return calls < 3
        ? failedObservation("Temporary provider failure")
        : observation("p1");
    });
    const outcome = await run({ execute });

    expect(execute).toHaveBeenCalledTimes(3);
    expect(outcome.status).toBe("evaluable");
    expect(outcome.retry_count).toBe(2);
    expect(outcome.attempts.map((attempt) => attempt.attempt)).toEqual([
      1, 2, 3,
    ]);

    let laterCalls = 0;
    const laterExecute = vi.fn(async () => {
      laterCalls += 1;
      return laterCalls === 1
        ? failedObservation("Temporary provider failure")
        : observation("p1");
    });
    const laterOutcome = await run({ execute: laterExecute });
    expect(laterExecute).toHaveBeenCalledTimes(2);
    expect(laterOutcome.status).toBe("evaluable");
  });

  it("retries with the exact same locked configuration on every attempt", async () => {
    const seen: QuestionExecuteInput[] = [];
    const execute = vi.fn(async (input: QuestionExecuteInput) => {
      seen.push(input);
      return failedObservation("Temporary provider failure");
    });
    await run({ execute });

    expect(seen).toHaveLength(3);
    const [first, second, third] = seen;
    expect(second.prompt).toBe(first.prompt);
    expect(third.prompt).toBe(first.prompt);
    expect(second.brief).toBe(first.brief);
    expect(third.brief).toBe(first.brief);
    expect(second.safety_identifier).toBe(first.safety_identifier);
    expect(third.safety_identifier).toBe(first.safety_identifier);
    expect(second.budget.limit_usd).toBe(first.budget.limit_usd);
    expect(second.budget.carryover_cost_usd).toBe(
      first.budget.carryover_cost_usd,
    );
    // Per-attempt cost accounting: the budget carries prior attempts forward.
    expect(second.budget.calls.length).toBeGreaterThan(
      first.budget.calls.length,
    );
    expect(third.budget.calls.length).toBeGreaterThan(
      second.budget.calls.length,
    );
  });

  it("persists every attempt with attempt order, automatic flags, and stamped telemetry", async () => {
    const execute = vi.fn(async () =>
      failedObservation("Temporary provider failure"),
    );
    const outcome = await run({ execute });

    expect(outcome.attempts).toHaveLength(3);
    expect(outcome.attempts.map((attempt) => attempt.automatic)).toEqual([
      false,
      true,
      true,
    ]);
    expect(outcome.attempts[0].started_at).toBeTruthy();
    expect(outcome.attempts[0].observation.telemetry[0].attempt).toBe(1);
    expect(outcome.attempts[1].observation.telemetry[0].attempt).toBe(2);
    expect(outcome.attempts[2].observation.telemetry[0].attempt).toBe(3);
    // The final observation carries the complete attempt trail (R-20/R-30).
    expect(outcome.observation.telemetry.map((call) => call.attempt)).toEqual([
      1, 2, 3,
    ]);
  });

  it("treats a provider or policy refusal with no usable answer as a failed test and recovers it", async () => {
    let calls = 0;
    const execute = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return observation("p1", {
          raw_answer: "",
          telemetry: [
            fixtureCallTelemetry({
              stage: "observation",
              output_text_present: false,
              refusal_present: true,
            }),
          ],
        });
      }
      return observation("p1");
    });
    const outcome = await run({ execute });

    expect(outcome.status).toBe("evaluable");
    expect(execute).toHaveBeenCalledTimes(2);
    expect(outcome.attempts[0].observation.run_status).toBe("failed");
    expect(outcome.attempts[0].observation.failure_reason).toBe(
      "Provider or policy refusal with no usable answer.",
    );
  });

  it("never retries a substantive answer for a more favorable result", async () => {
    const execute = vi.fn(async () =>
      observation("p1", {
        raw_answer:
          "Saya tidak bisa merekomendasikan klinik tertentu tanpa data lengkap.",
      }),
    );
    const outcome = await run({
      execute,
      sleep: async () => {
        throw new Error("A substantive answer must never be retried.");
      },
    });

    expect(outcome.status).toBe("evaluable");
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("does not retry a non-retryable failure such as the cost ceiling", async () => {
    const execute = vi.fn(async () =>
      failedObservation(
        "The next observation call could exceed the USD 5.00 audit limit.",
      ),
    );
    const outcome = await run({
      execute,
      sleep: async () => {
        throw new Error("A cost-ceiling failure must not be retried.");
      },
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(outcome.status).toBe("exhausted");
    if (outcome.status !== "exhausted") throw new Error("expected exhaustion");
    expect(outcome.failure_category).toBe("non_retryable");
  });

  it("classifies rate limits and applies bounded backoff per safe failure category", async () => {
    const slept: number[] = [];
    const scheduled: string[] = [];
    const execute = vi.fn(async () =>
      failedObservation(
        "Error code: 429 - Rate limit reached for gpt-5.6-luna",
      ),
    );
    const outcome = await run({
      execute,
      sleep: async (ms) => {
        slept.push(ms);
      },
      onRetryScheduled: (info) => {
        scheduled.push(`${info.failure_category}:${info.backoff_ms}`);
      },
    });

    if (outcome.status !== "exhausted") throw new Error("expected exhaustion");
    expect(outcome.failure_category).toBe("rate_limited");
    expect(slept).toEqual([
      RETRY_BACKOFF_MS.rate_limited[0],
      RETRY_BACKOFF_MS.rate_limited[1],
    ]);
    expect(scheduled).toEqual([
      `rate_limited:${RETRY_BACKOFF_MS.rate_limited[0]}`,
      `rate_limited:${RETRY_BACKOFF_MS.rate_limited[1]}`,
    ]);
    expect(Math.max(...slept)).toBeLessThanOrEqual(MAX_RETRY_BACKOFF_MS);
  });

  it("uses shorter backoff for ordinary temporary failures", async () => {
    const slept: number[] = [];
    const execute = vi.fn(async () => failedObservation("fetch failed"));
    await run({
      execute,
      sleep: async (ms) => {
        slept.push(ms);
      },
    });
    expect(slept).toEqual([
      RETRY_BACKOFF_MS.temporary[0],
      RETRY_BACKOFF_MS.temporary[1],
    ]);
  });

  it("never lets a retry backoff exceed the bounded cap", () => {
    for (const category of [
      "rate_limited",
      "temporary",
      "empty_or_unusable",
    ] as const) {
      for (const retry of [1, 2, 99]) {
        const backoff = retryBackoffMs(category, retry);
        expect(backoff).toBeGreaterThanOrEqual(0);
        expect(backoff).toBeLessThanOrEqual(MAX_RETRY_BACKOFF_MS);
      }
    }
  });

  it("classifies an empty completed response as a failed test", () => {
    const empty = observation("p1", {
      raw_answer: "",
      telemetry: [
        fixtureCallTelemetry({
          stage: "observation",
          output_text_present: false,
        }),
      ],
    });
    expect(classifyObservationFailure(empty)).toEqual({
      evaluable: false,
      category: "empty_or_unusable",
    });
  });

  it("classifies a missing required web search as a retryable technical failure (R-16/R-18)", () => {
    // A completed provider call that never executed the required web search
    // is NOT an evaluable non-appearance: it is a temporary technical failure
    // the 1+2 retry policy reruns.
    const noSearch = observation("p1", {
      run_status: "failed",
      raw_answer: "",
      sources: [],
      failure_reason:
        "Required web search did not execute for this observation; the observation is not grounded and will be retried.",
      telemetry: [
        fixtureCallTelemetry({
          stage: "observation",
          status: "failed",
          failure_reason:
            "Required web search did not execute for this observation; the observation is not grounded and will be retried.",
        }),
      ],
    });
    expect(classifyObservationFailure(noSearch)).toEqual({
      evaluable: false,
      category: "temporary",
    });
  });
});

describe("retry-aware observation stage ceiling (Spec 003 R-36)", () => {
  it("accounts for 10 questions x 3 attempts and matches the cost guard", () => {
    expect(MAX_ATTEMPTS_PER_QUESTION).toBe(3);
    expect(MAX_AUTOMATIC_RETRIES_PER_QUESTION).toBe(2);
    expect(OBSERVATION_STAGE_MAX_CALLS).toBe(30);
    expect(OBSERVATION_STAGE_MAX_CALLS).toBe(10 * MAX_ATTEMPTS_PER_QUESTION);
    // The ceiling revision is single-sourced into the live cost guard so the
    // two can never diverge.
    expect(OBSERVATION_STAGE_MAX_CALLS).toBe(
      AUDIT_STAGE_CALL_LIMITS.observation,
    );
  });
});
