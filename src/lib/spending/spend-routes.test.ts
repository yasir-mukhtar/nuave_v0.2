import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
  createValidatedAuditReport: vi.fn(),
}));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));
vi.mock("@/lib/audit/report-pipeline", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/audit/report-pipeline")>()),
  assertReportGenerationGate: () => {}, // evidence gate is not under test
  createValidatedAuditReport: mocks.createValidatedAuditReport,
}));

import { POST as runPOST } from "../../app/api/audit/run/route";
import { POST as reportPOST } from "../../app/api/audit/report/route";
import { POST as glmPOST } from "../../app/api/audit/glm-questions/route";
import { AUDIT_CLIENT_CONTRACT_VERSION } from "../audit/client-contract";
import {
  DIRECT_TEN_CONTEXT_VERSION,
  DIRECT_TEN_REPORT_CONTRACT_VERSION,
  type DirectTenAuditContext,
} from "../audit/direct-ten-context-v2";
import { executeAuditPrompt, generateReportContent } from "../audit/openai";
import {
  goldenBrief,
  goldenObservations,
  goldenPrompts,
} from "../audit/fixtures/report-golden";
import {
  smartFingerprint,
  SMART_INTAKE_INPUT_VERSION,
} from "../intake/smart-intake-contract";
import { SpendCapError } from "./provider-spend";
import { openFileD1 } from "./sqlite-d1.test-helper";

const UNAVAILABLE = "Audit tidak tersedia saat ini.";
const limiter = { limit: async () => ({ success: true }) };
const budget = { limit_usd: 5 as const, carryover_cost_usd: 0, calls: [] };

let dir: string;
let d1: ReturnType<typeof openFileD1>;
let fetchSpy: ReturnType<typeof vi.fn>;
let fetchStatus = 500;

function context(): DirectTenAuditContext {
  return {
    version: DIRECT_TEN_CONTEXT_VERSION,
    identity: {
      name: "Kopi Nuave",
      source: "https://kopinuave.example/",
      sourceOrigin: "owner",
      aliases: ["Nuave Coffee"],
      origin: "owner",
    },
    focus: { value: { kind: "brand" }, origin: "nuave" },
    category: { value: "kedai kopi", origin: "website" },
    offerings: { value: ["kopi"], origin: "website" },
    serviceChannels: { value: ["on_premise"], origin: "website" },
    market: {
      value: { reach: "sekitar", areas: ["Jakarta"] },
      origin: "website",
    },
    comparators: { value: { mode: "unknown" }, origin: "nuave" },
  };
}
const wirePrompts = () =>
  Array.from({ length: 10 }, (_, index) => ({
    prompt_id: `NUAVE-DT-${String(index + 1).padStart(2, "0")}`,
    question: `Apa pilihan coffee shop di Jakarta untuk kebutuhan ${index + 1}?`,
    review_status: "needs_human_review" as const,
  }));
const post = (url: string, body: unknown) =>
  new Request(`https://nuave.test/api/audit/${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-spend-"));
  d1 = openFileD1(join(dir, "spend.sqlite"));
  mocks.getCloudflareContext.mockReturnValue({
    env: {
      SPEND_DB: d1.db,
      AUDIT_RUN_CALLER_RATE_LIMITER: limiter,
      AUDIT_REPORT_CALLER_RATE_LIMITER: limiter,
      GLM_CALLER_RATE_LIMITER: limiter,
    },
  });
  fetchStatus = 500;
  fetchSpy = vi.fn(
    async () =>
      new Response(JSON.stringify({ error: { message: "offline" } }), {
        status: fetchStatus,
        headers: { "Content-Type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "1");
  vi.stubEnv("NUAVE_AUDIT_MODE", "live");
  vi.stubEnv("NUAVE_PROVIDER", "openai");
  vi.stubEnv("OPENAI_API_KEY", "offline-test-key");
  vi.stubEnv("OPENAI_AUDIT_CARRYOVER_COST_USD", "0");
  vi.stubEnv("CHEAPERINFERENCE_API_KEY", "offline-test-key");
  vi.stubEnv("NUAVE_GLM_EVIDENCE_DIR", "");
  vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", "0"); // cap exhausted
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  mocks.createValidatedAuditReport.mockReset();
});

describe("refused calls never reach the provider", () => {
  it("run route: the stream reports the unavailable message, no provider request", async () => {
    const response = await runPOST(
      post("run", {
        client_contract_version: AUDIT_CLIENT_CONTRACT_VERSION,
        question_method: "direct-ten",
        context: context(),
        prompts: wirePrompts(),
        safety_identifier: "offline-spend-run",
        budget,
        resume_observations: [],
      }),
    );
    expect(await response.text()).toContain(UNAVAILABLE);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("report generation: refused before the provider request", async () => {
    await expect(
      generateReportContent({
        brief: goldenBrief,
        prompts: goldenPrompts,
        observations: goldenObservations,
        safety_identifier: "offline-spend-report",
        budget,
      }),
    ).rejects.toBeInstanceOf(SpendCapError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("report route: a spend refusal is the retryable transient failure, not a terminal limit", async () => {
    mocks.createValidatedAuditReport.mockRejectedValue(
      new SpendCapError("limit_reached"),
    );
    const response = await reportPOST(
      post("report", {
        client_contract_version: DIRECT_TEN_REPORT_CONTRACT_VERSION,
        question_method: "direct-ten",
        context: context(),
        prompts: wirePrompts(),
        observations: goldenObservations,
        safety_identifier: "offline-spend-report",
        budget,
      }),
    );
    const json = await response.json();
    expect(json.error).toBe(UNAVAILABLE);
    expect(json.code).toBe("REPORT_TRANSIENT_FAILURE");
    expect(json.error).toBe(UNAVAILABLE);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("GLM question route: the transport is never called and the unavailable copy shows", async () => {
    const base = {
      version: SMART_INTAKE_INPUT_VERSION,
      factVersion: 1,
      context: context(),
    };
    const response = await glmPOST(
      post("glm-questions", {
        method: "direct-ten",
        intake: { ...base, fingerprint: smartFingerprint(base) },
      }),
    );
    const json = await response.json();
    expect(JSON.stringify(json)).toContain(
      "Pembuatan pertanyaan sedang tidak tersedia. Coba lagi nanti.",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("calls rejected before the model ran release their reservation", () => {
  const run = () =>
    executeAuditPrompt({
      prompt: goldenPrompts[0],
      brief: goldenBrief,
      safety_identifier: "offline-release",
      budget,
    });
  const held = () => d1.heldUnitsToday(new Date().toISOString().slice(0, 10));

  it.each([400, 401, 403, 404, 429])(
    "HTTP %s settles the reservation to zero",
    async (status) => {
      vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", "5");
      fetchStatus = status;
      const observation = await run();
      expect(observation.run_status).toBe("failed");
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(held()).toBe(0);
    },
  );

  it.each([500, 503])(
    "HTTP %s keeps the full reservation held (cost unknown)",
    async (status) => {
      vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", "5");
      fetchStatus = status;
      await run();
      expect(held()).toBeGreaterThan(0);
    },
  );

  it("a network error keeps the reservation held", async () => {
    vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", "5");
    fetchSpy.mockRejectedValue(new TypeError("network down"));
    await run();
    expect(held()).toBeGreaterThan(0);
  });
});
