import { describe, expect, it } from "vitest";
import type { AuditObservation, AuditPrompt, BusinessBrief } from "./types";
import { runAuditObservations } from "./run-orchestrator";
import type { AuditRunEvent } from "./stream";
import { fixtureBudget, fixtureCallTelemetry } from "./fixtures/telemetry";

const brief = {} as BusinessBrief;
const safetyIdentifier = "test-user-123";

function prompts(): AuditPrompt[] {
  return Array.from({ length: 10 }, (_, index) => ({
    prompt_id: `p${index + 1}`,
    category: "need_discovery" as const,
    role: "discovery",
    branded: index >= 5,
    question: `Question ${index + 1}?`,
    rationale: "test rationale",
    inputs_used: ["category"],
    review_status: "needs_human_review" as const,
  }));
}

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
    response_id: `resp_${promptId}`,
    observed_at: "2026-08-17T00:00:00.000Z",
    raw_answer: "Usable answer.",
    sources: [],
    run_status: "completed",
    failure_reason: "",
    telemetry: [
      fixtureCallTelemetry({
        stage: "observation",
        response_id: `resp_${promptId}`,
      }),
    ],
    ...overrides,
  };
}

function failedObservation(promptId: string, reason: string): AuditObservation {
  return observation(promptId, {
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

function run(
  execute: (input: {
    prompt: AuditPrompt;
    brief: BusinessBrief;
    safety_identifier: string;
    budget: { limit_usd: number; carryover_cost_usd: number; calls: unknown[] };
  }) => Promise<AuditObservation>,
) {
  const events: AuditRunEvent[] = [];
  const summaryPromise = runAuditObservations({
    prompts: prompts(),
    brief,
    safety_identifier: safetyIdentifier,
    budget: fixtureBudget,
    execute: execute as never,
    emit: (event) => events.push(event),
    sleep: async () => {},
  });
  return { events, summaryPromise };
}

describe("live run orchestration (Spec 003 R-17/R-19/R-21)", () => {
  it("emits run_completed with exactly ten evaluable observations on a clean run", async () => {
    const { events, summaryPromise } = run(async (input) =>
      observation(input.prompt.prompt_id),
    );
    const summary = await summaryPromise;

    expect(events[0]).toMatchObject({
      type: "run_started",
      total: 10,
      max_attempts_per_question: 3,
      max_automatic_retries: 2,
      observation_stage_max_calls: 30,
    });
    expect(
      events.filter((event) => event.type === "prompt_completed"),
    ).toHaveLength(10);
    expect(events.some((event) => event.type === "prompt_retrying")).toBe(
      false,
    );
    expect(events.some((event) => event.type === "run_unfinished")).toBe(false);
    const terminal = events[events.length - 1];
    expect(terminal.type).toBe("run_completed");
    expect(summary.observations).toHaveLength(10);
    expect(summary.failed_prompt_ids).toEqual([]);
    expect(summary.stop_message).toBe("");
  });

  it("retries failed questions and never reruns evaluable ones", async () => {
    const attemptCounts = new Map<string, number>();
    const { events, summaryPromise } = run(async (input) => {
      const promptId = input.prompt.prompt_id;
      const count = (attemptCounts.get(promptId) ?? 0) + 1;
      attemptCounts.set(promptId, count);
      if (promptId === "p2" || promptId === "p7") {
        // First attempt of these questions fails once, then succeeds.
        if (count === 1)
          return failedObservation(promptId, "Temporary provider failure");
      }
      if (promptId === "p9") {
        // Fails on the first two attempts and succeeds on the third, so the
        // run still reaches 10/10 while exercising both automatic retries.
        if (count < 3)
          return failedObservation(promptId, "Temporary provider failure");
      }
      return observation(promptId);
    });
    const summary = await summaryPromise;

    const started = (promptId: string) =>
      events.filter(
        (event) =>
          event.type === "prompt_started" && event.prompt_id === promptId,
      ).length;
    // Evaluable questions are never rerun; the initial attempt is always one.
    expect(started("p1")).toBe(1);
    expect(started("p2")).toBe(1);
    expect(started("p7")).toBe(1);
    // Retried questions emit attempt_started and prompt_retrying for each
    // automatic retry, and a prompt_completed with the final attempt number.
    const p2Attempts = events.filter(
      (event) => event.type === "attempt_started" && event.prompt_id === "p2",
    );
    expect(p2Attempts).toHaveLength(1);
    expect(p2Attempts[0]).toMatchObject({ attempt: 2, automatic: true });
    const p9Retrying = events.filter(
      (event) => event.type === "prompt_retrying" && event.prompt_id === "p9",
    );
    expect(p9Retrying).toHaveLength(2);
    const p9Completed = events.find(
      (event) =>
        event.type === "prompt_completed" &&
        event.observation.prompt_id === "p9",
    );
    expect(
      p9Completed?.type === "prompt_completed" && p9Completed.attempt,
    ).toBe(3);

    const terminal = events[events.length - 1];
    expect(terminal.type).toBe("run_completed");
    expect(summary.observations).toHaveLength(10);
    expect(summary.failed_prompt_ids).toEqual([]);
    // Persisted attempt trails are available per prompt (R-20).
    expect(summary.attemptsByPrompt["p9"]).toHaveLength(3);
    expect(summary.attemptsByPrompt["p1"]).toHaveLength(1);
  });

  it("never emits a partial report when recovery cannot reach ten of ten", async () => {
    const { events, summaryPromise } = run(async (input) =>
      input.prompt.prompt_id === "p4"
        ? failedObservation("p4", "Temporary provider failure")
        : observation(input.prompt.prompt_id),
    );
    const summary = await summaryPromise;

    // 9 evaluable questions + 3 attempts for the always-failing question.
    expect(events.some((event) => event.type === "run_completed")).toBe(false);
    const terminal = events[events.length - 1];
    expect(terminal.type).toBe("run_unfinished");
    if (terminal.type !== "run_unfinished")
      throw new Error("expected run_unfinished");
    expect(terminal.completed).toBe(9);
    expect(terminal.failed_prompt_ids).toEqual(["p4"]);
    expect(summary.failed_prompt_ids).toEqual(["p4"]);
    // The failed terminal observation is retained with its full attempt trail.
    const p4 = summary.observations.find((item) => item.prompt_id === "p4");
    expect(p4?.run_status).toBe("failed");
    expect(p4?.telemetry.map((call) => call.attempt)).toEqual([1, 2, 3]);
    // No report event of any kind exists: run_completed is the only report
    // trigger and it was never emitted.
    const completedEvents = events.filter(
      (event) => event.type === "run_completed",
    );
    expect(completedEvents).toHaveLength(0);
  });

  it("stops safely and records the state when the cost ceiling is reached", async () => {
    const { events, summaryPromise } = run(async (input) =>
      input.prompt.prompt_id === "p3"
        ? failedObservation(
            "p3",
            "The next observation call could exceed the USD 5.00 audit limit.",
          )
        : observation(input.prompt.prompt_id),
    );
    const summary = await summaryPromise;

    // p1 and p2 complete; p3 hits the binding ceiling and stops the run;
    // p4..p10 are never attempted.
    const started = events.filter((event) => event.type === "prompt_started");
    expect(started).toHaveLength(3);
    expect(summary.failed_prompt_ids).toEqual(["p3"]);
    const terminal = events[events.length - 1];
    expect(terminal.type).toBe("run_unfinished");
    if (terminal.type !== "run_unfinished")
      throw new Error("expected run_unfinished");
    expect(terminal.completed).toBe(2);
    expect(terminal.message).toContain("USD 5.00");
    expect(events.some((event) => event.type === "run_completed")).toBe(false);
  });

  it("refuses to run anything other than exactly ten questions", async () => {
    await expect(
      runAuditObservations({
        prompts: prompts().slice(0, 9),
        brief,
        safety_identifier: safetyIdentifier,
        budget: fixtureBudget,
        execute: (async () => observation("p1")) as never,
        emit: () => {},
      }),
    ).rejects.toThrow("exactly ten questions");
  });
});
