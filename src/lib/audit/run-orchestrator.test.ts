import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuditObservation, AuditPrompt, BusinessBrief } from "./types";
import { runAuditObservations } from "./run-orchestrator";
import type { AuditRunEvent } from "./stream";
import { fixtureBudget, fixtureCallTelemetry } from "./fixtures/telemetry";
import { executeAuditPrompt, liveExecuteAuditPrompt } from "./provider";
import {
  PRODUCTION_OBSERVATION_REQUESTED_MODEL,
  PRODUCTION_OBSERVATION_SYSTEM,
} from "./production-observation-method";

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
    system: PRODUCTION_OBSERVATION_SYSTEM,
    requested_model: PRODUCTION_OBSERVATION_REQUESTED_MODEL,
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

// ---------------------------------------------------------------------------
// R3-5 (Phase 3 fix-round-3 adversarial review): the credential guard used to
// live only in the three HTTP handlers, and the live run has never gone
// through them. `scripts/sozo/sozo-live-run.spec.ts` drives this orchestrator
// directly with the env-selected `executeAuditPrompt`, so a missing production
// credential must fail before the retry loop starts.
// ---------------------------------------------------------------------------
describe("live provider credential guard on the script path (R3-5)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails before the first question when OPENCODEGO_API_KEY is missing and a real provider binding is passed", async () => {
    vi.stubEnv("NUAVE_PROVIDER", "opencodego");
    vi.stubEnv("OPENCODEGO_API_KEY", "");
    const events: AuditRunEvent[] = [];

    await expect(
      runAuditObservations({
        prompts: prompts(),
        brief,
        safety_identifier: safetyIdentifier,
        budget: fixtureBudget,
        execute: liveExecuteAuditPrompt,
        emit: (event) => events.push(event),
        sleep: async () => {},
      }),
    ).rejects.toThrow(/OPENCODEGO_API_KEY is not configured/);
    // Nothing was emitted: the run never started, so no attempt was spent.
    expect(events).toEqual([]);
  });

  it("covers the env-selected binding the Sozo runner actually uses", async () => {
    vi.stubEnv("NUAVE_PROVIDER", "opencodego");
    vi.stubEnv("OPENCODEGO_API_KEY", "");
    const events: AuditRunEvent[] = [];

    await expect(
      runAuditObservations({
        prompts: prompts(),
        brief,
        safety_identifier: safetyIdentifier,
        budget: fixtureBudget,
        execute: executeAuditPrompt,
        emit: (event) => events.push(event),
        sleep: async () => {},
      }),
    ).rejects.toThrow(/OPENCODEGO_API_KEY is not configured/);
    expect(events).toEqual([]);
  });

  it("leaves an injected test double alone — no provider call, no credential needed", async () => {
    vi.stubEnv("NUAVE_PROVIDER", "opencodego");
    vi.stubEnv("OPENCODEGO_API_KEY", "");
    const { summaryPromise } = run(async (input) =>
      observation(input.prompt.prompt_id),
    );

    await expect(summaryPromise).resolves.toMatchObject({
      failed_prompt_ids: [],
    });
  });
});

describe("live run orchestration (Spec 003 R-17/R-19/R-21)", () => {
  it("accepts ten fresh OpenCode Go observations and emits run_completed", async () => {
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
    expect(
      summary.observations.every(
        (item) => item.system === PRODUCTION_OBSERVATION_SYSTEM,
      ),
    ).toBe(true);
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

  it("resumes completed OpenCode Go observations without rerunning them (R-19)", async () => {
    const executed: string[] = [];
    const resumedThree = [
      observation("p1"),
      observation("p2"),
      observation("p3"),
    ];
    const events: AuditRunEvent[] = [];
    const summary = await runAuditObservations({
      prompts: prompts(),
      brief,
      safety_identifier: safetyIdentifier,
      budget: fixtureBudget,
      execute: async (input) => {
        executed.push(input.prompt.prompt_id);
        return observation(input.prompt.prompt_id);
      },
      emit: (event) => events.push(event),
      sleep: async () => {},
      resume: { observations: resumedThree },
    });

    // Only the seven uncompleted questions execute; the resumed three are
    // preserved verbatim and never rerun.
    expect(executed).toHaveLength(7);
    expect(executed).not.toContain("p1");
    expect(executed).not.toContain("p2");
    expect(executed).not.toContain("p3");
    expect(summary.observations).toHaveLength(10);
    expect(
      events.filter((event) => event.type === "prompt_completed"),
    ).toHaveLength(10);
    // The resumed observations are the ORIGINAL records (same response ids),
    // not fresh executions.
    const resumed = summary.observations
      .filter((item) => ["p1", "p2", "p3"].includes(item.prompt_id))
      .map((item) => item.response_id);
    expect(resumed).toEqual(["resp_p1", "resp_p2", "resp_p3"]);
    const terminal = events[events.length - 1];
    expect(terminal.type).toBe("run_completed");
  });

  it("rejects a resumed direct-OpenAI observation before any new observation executes", async () => {
    const execute = vi.fn(async (input: { prompt: AuditPrompt }) =>
      observation(input.prompt.prompt_id),
    );
    const events: AuditRunEvent[] = [];

    await expect(
      runAuditObservations({
        prompts: prompts(),
        brief,
        safety_identifier: safetyIdentifier,
        budget: fixtureBudget,
        execute: execute as never,
        emit: (event) => events.push(event),
        sleep: async () => {},
        resume: {
          observations: [
            observation("p1", { system: "OpenAI Responses API" }),
          ],
        },
      }),
    ).rejects.toThrow(/current protected production observation method/);

    expect(execute).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it("rejects a resumed OpenCode observation with the wrong requested model", async () => {
    const execute = vi.fn(async (input: { prompt: AuditPrompt }) =>
      observation(input.prompt.prompt_id),
    );
    const events: AuditRunEvent[] = [];

    await expect(
      runAuditObservations({
        prompts: prompts(),
        brief,
        safety_identifier: safetyIdentifier,
        budget: fixtureBudget,
        execute: execute as never,
        emit: (event) => events.push(event),
        sleep: async () => {},
        resume: {
          observations: [
            observation("p1", {
              requested_model: "gpt-5.5",
              telemetry: [
                fixtureCallTelemetry({
                  stage: "observation",
                  requested_model: "gpt-5.5",
                  response_id: "resp_p1",
                }),
              ],
            }),
          ],
        },
      }),
    ).rejects.toThrow(/requested observation model must be gpt-5.6-luna/);

    expect(execute).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it("carries the complete per-attempt provenance on the terminal event (R-20)", async () => {
    const attemptCounts = new Map<string, number>();
    const { events, summaryPromise } = run(async (input) => {
      const promptId = input.prompt.prompt_id;
      const count = (attemptCounts.get(promptId) ?? 0) + 1;
      attemptCounts.set(promptId, count);
      if (promptId === "p5" && count === 1) {
        return failedObservation(promptId, "Temporary provider failure");
      }
      return observation(promptId);
    });
    const summary = await summaryPromise;

    const terminal = events[events.length - 1];
    expect(terminal.type).toBe("run_completed");
    if (terminal.type !== "run_completed")
      throw new Error("expected run_completed");
    const p5Attempts = terminal.attempts_by_prompt?.["p5"] ?? [];
    expect(p5Attempts).toHaveLength(2);
    expect(p5Attempts[0]).toMatchObject({
      attempt: 1,
      automatic: false,
      status: "failed",
    });
    expect(p5Attempts[0].failure_reason).toContain("Temporary");
    expect(p5Attempts[1]).toMatchObject({
      attempt: 2,
      automatic: true,
      status: "completed",
    });
    expect(Object.keys(terminal.attempts_by_prompt ?? {})).toHaveLength(10);

    // The final observation's telemetry carries the per-attempt stamps
    // (attempt order, automatic flag, safe failure category).
    const p5 = summary.observations.find((item) => item.prompt_id === "p5");
    expect(p5?.telemetry.map((call) => call.attempt)).toEqual([1, 2]);
    expect(p5?.telemetry.map((call) => call.automatic)).toEqual([false, true]);
    expect(p5?.telemetry[0].safe_failure_category).toBe("temporary");
    expect(p5?.telemetry[1].safe_failure_category).toBeUndefined();
  });

  it("preserves the partial record on run_unfinished (R-19/R-20)", async () => {
    const { events, summaryPromise } = run(async (input) =>
      input.prompt.prompt_id === "p4"
        ? failedObservation("p4", "Temporary provider failure")
        : observation(input.prompt.prompt_id),
    );
    const summary = await summaryPromise;

    const terminal = events[events.length - 1];
    expect(terminal.type).toBe("run_unfinished");
    if (terminal.type !== "run_unfinished")
      throw new Error("expected run_unfinished");
    // The interrupted state carries the completed observations so no
    // evidence is lost, plus the attempt provenance for every prompt.
    expect(terminal.observations).toHaveLength(10);
    expect(
      (terminal.observations ?? []).filter(
        (item) => item.run_status === "completed",
      ),
    ).toHaveLength(9);
    expect(terminal.attempts_by_prompt?.["p4"]).toHaveLength(3);
    expect(summary.observations).toHaveLength(10);
  });
});
