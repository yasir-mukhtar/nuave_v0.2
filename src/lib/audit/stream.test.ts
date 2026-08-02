import { describe, expect, it } from "vitest";
import type { AuditObservation } from "./types";
import {
  AuditRunEventParser,
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
      { type: "run_started", total: 10 },
      { type: "prompt_started", index: 0, prompt_id: "prompt-1" },
      {
        type: "prompt_completed",
        index: 0,
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
