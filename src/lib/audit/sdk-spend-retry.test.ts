import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractBusinessDraft } from "./openai";
import { executeAbortableProtectedObservation } from "./protected-observation-provider";
import { AuditCallExecutionError } from "./telemetry";
import { goldenBrief, goldenPrompts } from "./fixtures/report-golden";
import type { AuditBudget } from "./types";

// S2 transport groundwork: the OpenAI SDK (7.x) retries retryable HTTP
// statuses twice by default, so one application call silently costs three
// provider HTTP attempts. Those nested attempts are not application-counted,
// so the SDK retry policy is disabled (`maxRetries: 0`) and every provider
// attempt must be an explicit application call. These tests pin that contract
// against the REAL SDK: global fetch is stubbed with a fresh 503 each time
// and the real SDK performs the request itself. No live network is used.

const offline503 = () =>
  new Response(
    JSON.stringify({
      error: {
        message: "offline transient failure",
        type: "server_error",
        code: "offline_server_error",
      },
    }),
    {
      status: 503,
      headers: { "Content-Type": "application/json", "Retry-After": "0" },
    },
  );

const budget: AuditBudget = {
  limit_usd: 5,
  carryover_cost_usd: 0,
  calls: [],
};

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // The SDK resolves the global fetch inside `new OpenAI(...)`, which
  // `client()` constructs on each call — stubbing here is enough.
  fetchSpy = vi.fn(async () => offline503());
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("OPENAI_API_KEY", "offline-test-key");
  vi.stubEnv("OPENAI_BASE_URL", "https://api.openai.com/v1");
  vi.stubEnv("OPENAI_AUDIT_MODEL", "gpt-5.6-luna");
  vi.stubEnv("OPENAI_AUDIT_REASONING_EFFORT", "low");
  vi.stubEnv("OPENAI_AUDIT_CARRYOVER_COST_USD", "0");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("extraction transport (openai.ts client)", () => {
  it("makes exactly one HTTP attempt per application call", async () => {
    let caught: unknown;
    try {
      await extractBusinessDraft({
        website_url: "https://fixture.example/",
        brand_name: "Fictional Cafe",
        market_context: "Jakarta",
        category: "cafe",
        safety_identifier: "offline-sdk-retry",
        budget: { ...budget, calls: [] },
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AuditCallExecutionError);
    const telemetry = (caught as AuditCallExecutionError).telemetry;
    expect(telemetry).toHaveLength(1);
    expect(telemetry[0].stage).toBe("extract");
    expect(telemetry[0].status).toBe("failed");
    // One application invocation must equal one outbound HTTP request; the
    // SDK's implicit retry loop is disabled at the transport level.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("protected observation transport (protected-observation-provider.ts client)", () => {
  it("makes exactly one HTTP attempt per application call", async () => {
    const observation = await executeAbortableProtectedObservation({
      prompt: goldenPrompts[0],
      brief: goldenBrief,
      safety_identifier: "offline-sdk-retry",
      budget: { ...budget, calls: [] },
    });
    expect(observation.run_status).toBe("failed");
    expect(observation.telemetry).toHaveLength(1);
    expect(observation.telemetry[0].stage).toBe("observation");
    expect(observation.telemetry[0].status).toBe("failed");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("still allows an explicit second application invocation", async () => {
    // Application-owned retries are deliberate and remain permitted; only the
    // SDK's hidden per-call retries are disabled. Two explicit invocations
    // must produce exactly two HTTP attempts and two failed results.
    const first = await executeAbortableProtectedObservation({
      prompt: goldenPrompts[0],
      brief: goldenBrief,
      safety_identifier: "offline-sdk-retry",
      budget: { ...budget, calls: [] },
    });
    const second = await executeAbortableProtectedObservation({
      prompt: goldenPrompts[0],
      brief: goldenBrief,
      safety_identifier: "offline-sdk-retry",
      budget: { ...budget, calls: [] },
    });
    expect(first.run_status).toBe("failed");
    expect(second.run_status).toBe("failed");
    expect(first.telemetry).toHaveLength(1);
    expect(second.telemetry).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
