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
import { reserveProviderSpend, SpendCapError } from "./provider-spend";
import { openFileD1 } from "./sqlite-d1.test-helper";

let dir: string;
let d1: ReturnType<typeof openFileD1>;
let fetchSpy: ReturnType<typeof vi.fn>;
const limiter = { limit: async () => ({ success: true }) };

function bind(env: Record<string, unknown>) {
  mocks.getCloudflareContext.mockReturnValue({
    env: {
      EXTRACT_CALLER_RATE_LIMITER: limiter,
      IDENTITY_DESTINATION_RATE_LIMITER: limiter,
      ...env,
    },
  });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-spend-"));
  d1 = openFileD1(join(dir, "spend.sqlite"));
  fetchSpy = vi.fn(async () => new Response("{}", { status: 500 }));
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "1");
  vi.stubEnv("NUAVE_AUDIT_MODE", "live");
  vi.stubEnv("NUAVE_PROVIDER", "openai");
  vi.stubEnv("OPENAI_API_KEY", "offline-test-key");
  vi.stubEnv("CHEAPERINFERENCE_API_KEY", "offline-test-key");
  vi.stubEnv("OPENAI_AUDIT_CARRYOVER_COST_USD", "0");
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  mocks.getCloudflareContext.mockReset();
});

const stage = { provider: "openai", stage: "observation", usd: 0.01 };

describe("reserveProviderSpend", () => {
  it("fails closed in live mode when the D1 binding is missing", async () => {
    bind({});
    await expect(reserveProviderSpend(stage)).rejects.toBeInstanceOf(
      SpendCapError,
    );
  });

  it("fails closed in live mode outside a Worker context", async () => {
    mocks.getCloudflareContext.mockImplementation(() => {
      throw new Error("no context");
    });
    await expect(reserveProviderSpend(stage)).rejects.toBeInstanceOf(
      SpendCapError,
    );
  });

  it("synthetic mode never touches the ledger, even without a binding", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "synthetic");
    mocks.getCloudflareContext.mockImplementation(() => {
      throw new Error("must not be read");
    });
    await reserveProviderSpend(stage);
    expect(mocks.getCloudflareContext).not.toHaveBeenCalled();
  });

  it("uses a server-env limit (default 5) and fails closed on a bad value", async () => {
    bind({ SPEND_DB: d1.db });
    vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", "0.015");
    await reserveProviderSpend(stage);
    await expect(reserveProviderSpend(stage)).rejects.toBeInstanceOf(
      SpendCapError,
    );
    vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", "lots");
    bind({ SPEND_DB: { prepare: d1.db.prepare } });
    await expect(reserveProviderSpend(stage)).rejects.toBeInstanceOf(
      SpendCapError,
    );
  });
});

const body = (carryover: number) =>
  JSON.stringify({
    website_url: "https://kopi.example/",
    brand_name: "Kopi Taman Senja",
    market_context: "Jakarta",
    category: "kedai kopi",
    safety_identifier: "offline-safety-id",
    budget: { limit_usd: 5, carryover_cost_usd: carryover, calls: [] },
  });
const post = (carryover: number) =>
  extractPOST(
    new Request("https://nuave.test/api/audit/extract", {
      method: "POST",
      body: body(carryover),
    }),
  );

describe("extract route spend cap", () => {
  it("a refused call never reaches the provider and shows the unavailable copy", async () => {
    bind({ SPEND_DB: d1.db });
    vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", "0.3"); // below one extract reserve
    const response = await post(0); // client claims no prior spend
    const json = await response.json();
    expect(JSON.stringify(json)).toContain("Audit tidak tersedia saat ini.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("missing binding in live mode refuses before the provider", async () => {
    bind({});
    const response = await post(0);
    expect(JSON.stringify(await response.json())).toContain(
      "Audit tidak tersedia saat ini.",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("ignores client-reported spend: a 4.99 carryover does not block, and the call is recorded", async () => {
    bind({ SPEND_DB: d1.db });
    await post(4.99);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const today = new Date().toISOString().slice(0, 10);
    expect(d1.heldUnitsToday(today)).toBeGreaterThan(0);
  });

  it("the server ledger blocks the next call after the limit", async () => {
    bind({ SPEND_DB: d1.db });
    vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", "0.5"); // fits one reserve (~0.41)
    await post(0);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    await post(0);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // second refused, never sent
  });
});
