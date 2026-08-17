import { describe, expect, it } from "vitest";
import type { AuditObservation } from "./types";
import {
  AuditRunEventParser,
  auditRunEventSchema,
  deriveAuditStep,
  encodeAuditRunEvent,
  mergeObservation,
  runWithConcurrency,
  type AuditRunEvent,
} from "./stream";

function observation(
  promptId: string,
  status: "completed" | "failed" = "completed",
): AuditObservation {
  return {
    prompt_id: promptId,
    category: "need_discovery",
    branded: false,
    question: "Test question?",
    system: "OpenAI Responses API",
    requested_model: "gpt-5.6",
    returned_model: status === "completed" ? "gpt-5.6" : "",
    response_id: status === "completed" ? `resp_${promptId}` : "",
    observed_at: "2026-08-01T00:00:00.000Z",
    raw_answer: status === "completed" ? "Answer" : "",
    sources: [],
    run_status: status,
    failure_reason: status === "failed" ? "Observation failed" : "",
    telemetry: [],
  };
}

describe("audit NDJSON stream", () => {
  it("parses events when JSON lines are split across arbitrary chunks", () => {
    const events: AuditRunEvent[] = [
      {
        type: "run_started",
        total: 10,
        max_attempts_per_question: 3,
        max_automatic_retries: 2,
        observation_stage_max_calls: 30,
      },
      {
        type: "prompt_started",
        index: 0,
        prompt_id: "prompt-1",
        attempt: 1,
        is_retry: false,
      },
      {
        type: "prompt_completed",
        index: 0,
        attempt: 1,
        observation: observation("prompt-1"),
      },
    ];
    const payload = events.map(encodeAuditRunEvent).join("");
    const parser = new AuditRunEventParser();
    const parsed = [
      ...parser.push(payload.slice(0, 17)),
      ...parser.push(payload.slice(17, 63)),
      ...parser.push(payload.slice(63)),
      ...parser.finish(),
    ];
    expect(parsed).toEqual(events);
  });

  it("keeps canonical result order while completion events arrive out of order", async () => {
    const completionOrder: number[] = [];
    let active = 0;
    let peakActive = 0;
    const results = await runWithConcurrency({
      items: [35, 5, 20, 1],
      limit: 2,
      onStart() {
        active += 1;
        peakActive = Math.max(peakActive, active);
      },
      async work(delay, index) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return `result-${index}`;
      },
      onComplete(_result, index) {
        completionOrder.push(index);
        active -= 1;
      },
    });
    expect(peakActive).toBe(2);
    expect(completionOrder).not.toEqual([0, 1, 2, 3]);
    expect(results).toEqual(["result-0", "result-1", "result-2", "result-3"]);
  });

  it("replaces a repeated prompt observation without duplicating evidence", () => {
    const first = observation("prompt-1");
    const failed = observation("prompt-1", "failed");
    expect(mergeObservation([first], failed)).toEqual([failed]);
  });

  it("parses the retry lifecycle events additively", () => {
    const events: AuditRunEvent[] = [
      {
        type: "attempt_started",
        index: 0,
        prompt_id: "prompt-1",
        attempt: 2,
        automatic: true,
      },
      {
        type: "prompt_retrying",
        index: 0,
        prompt_id: "prompt-1",
        attempt: 1,
        next_attempt: 2,
        backoff_ms: 2_000,
        failure_reason: "Temporary provider failure",
      },
      {
        type: "prompt_failed",
        index: 0,
        prompt_id: "prompt-1",
        attempts: 3,
        failure_reason: "Temporary provider failure",
      },
      {
        type: "run_unfinished",
        completed: 9,
        failed_prompt_ids: ["prompt-1"],
        message: "Ten evaluable observations could not be reached.",
      },
    ];
    const payload = events.map(encodeAuditRunEvent).join("");
    const parser = new AuditRunEventParser();
    expect([...parser.push(payload), ...parser.finish()]).toEqual(events);
  });

  it("records the retry policy and retry-aware ceiling on the run record", () => {
    const parsed = auditRunEventSchema.parse({
      type: "run_started",
      total: 10,
    });
    expect(parsed).toMatchObject({
      type: "run_started",
      total: 10,
      max_attempts_per_question: 3,
      max_automatic_retries: 2,
      observation_stage_max_calls: 30,
    });
  });

  it("rejects a run_completed event with fewer than ten observations (no partial report)", () => {
    const nine = Array.from({ length: 9 }, (_, index) =>
      observation(`prompt-${index}`),
    );
    expect(() =>
      auditRunEventSchema.parse({ type: "run_completed", observations: nine }),
    ).toThrow();
  });

  it("rejects a run_unfinished event that claims ten completed observations", () => {
    expect(() =>
      auditRunEventSchema.parse({
        type: "run_unfinished",
        completed: 10,
        failed_prompt_ids: [],
        message: "invalid",
      }),
    ).toThrow();
  });
});

describe("audit stage derivation", () => {
  it("prioritizes report, execution, questions, and facts in that order", () => {
    expect(
      deriveAuditStep({
        hasReport: false,
        executionStarted: false,
        hasPromptPack: false,
        factsExtracted: false,
      }),
    ).toBe(0);
    expect(
      deriveAuditStep({
        hasReport: false,
        executionStarted: false,
        hasPromptPack: false,
        factsExtracted: true,
      }),
    ).toBe(1);
    expect(
      deriveAuditStep({
        hasReport: false,
        executionStarted: false,
        hasPromptPack: true,
        factsExtracted: true,
      }),
    ).toBe(2);
    expect(
      deriveAuditStep({
        hasReport: false,
        executionStarted: true,
        hasPromptPack: true,
        factsExtracted: true,
      }),
    ).toBe(3);
    expect(
      deriveAuditStep({
        hasReport: true,
        executionStarted: true,
        hasPromptPack: true,
        factsExtracted: true,
      }),
    ).toBe(4);
  });
});
