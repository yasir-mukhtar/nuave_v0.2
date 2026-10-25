import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));
vi.mock("@/lib/audit/source-excerpt", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/audit/source-excerpt")>()),
  fetchWebsiteExcerpt: async () => null,
}));

import { POST as extractPOST } from "../../app/api/audit/extract/route";
import { POST as glmPOST } from "../../app/api/audit/glm-questions/route";
import { generateReportContent } from "../audit/openai";
import {
  goldenBrief,
  goldenObservations,
  goldenPrompts,
} from "../audit/fixtures/report-golden";
import {
  smartFingerprint,
  SMART_INTAKE_INPUT_VERSION,
} from "../intake/smart-intake-contract";
import { CONTEXT, makeOrder } from "../orders/orders.test-helper";
import { SpendCapError } from "./provider-spend";
import { openFileD1 } from "./sqlite-d1.test-helper";

// Spec 016 R-09: a paid call the order cannot hold is refused before the
// provider, in every paid route. The cost-limit mechanics are in
// spend-ledger.test.ts and runner.test.ts.

const UNAVAILABLE = "Audit tidak tersedia saat ini.";
const limiter = { limit: async () => ({ success: true }) };
const budget = { limit_usd: 5 as const, carryover_cost_usd: 0, calls: [] };

let dir: string;
let d1: ReturnType<typeof openFileD1>;
let fetchSpy: ReturnType<typeof vi.fn>;

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
      EXTRACT_CALLER_RATE_LIMITER: limiter,
      IDENTITY_DESTINATION_RATE_LIMITER: limiter,
      GLM_CALLER_RATE_LIMITER: limiter,
    },
  });
  fetchSpy = vi.fn(async () => new Response("{}", { status: 500 }));
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "1");
  vi.stubEnv("NUAVE_AUDIT_MODE", "live");
  vi.stubEnv("NUAVE_ENVIRONMENT", "production");
  vi.stubEnv("NUAVE_PROVIDER", "openai");
  vi.stubEnv("OPENAI_API_KEY", "offline-test-key");
  vi.stubEnv("OPENAI_AUDIT_CARRYOVER_COST_USD", "0");
  vi.stubEnv("CHEAPERINFERENCE_API_KEY", "offline-test-key");
  vi.stubEnv("NUAVE_GLM_EVIDENCE_DIR", "");
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** An open live order that holds less than one call reservation. */
const smallOrder = () =>
  makeOrder(d1.db, { mode: "live", limitUsd: 0.01, now: new Date() });

describe("refused calls never reach the provider", () => {
  it("extract route: the order cannot hold the call, so the unavailable copy shows and nothing is sent", async () => {
    const id = await smallOrder();
    const response = await extractPOST(post("extract", { order_id: id }));
    expect(JSON.stringify(await response.json())).toContain(UNAVAILABLE);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("report generation outside an order is refused before the provider request", async () => {
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

  it("GLM question route: the transport is never called and the order-limit copy shows", async () => {
    const id = await smallOrder();
    const base = {
      version: SMART_INTAKE_INPUT_VERSION,
      factVersion: 1,
      context: CONTEXT,
    };
    const response = await glmPOST(
      post("glm-questions", {
        method: "direct-ten",
        order_id: id,
        intake: { ...base, fingerprint: smartFingerprint(base) },
      }),
    );
    // The order's own limit cannot recover with time, so the customer is sent
    // to support rather than told to try later (Spec 018 N-18).
    expect(JSON.stringify(await response.json())).toContain(
      "Pertanyaan untuk pesanan ini belum dapat dibuat lagi. Email support@nuave.ai, kami bantu menyelesaikannya.",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
