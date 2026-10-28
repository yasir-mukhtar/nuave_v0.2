import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

import { executeAuditPrompt } from "../audit/openai";
import { goldenBrief, goldenPrompts } from "../audit/fixtures/report-golden";
import { makeOrder } from "../orders/orders.test-helper";
import {
  dailySpendLimitUsd,
  releaseIfRejectedUnrun,
  reserveProviderSpend,
  spendDatabase,
  SpendCapError,
  withOrderSpend,
} from "./provider-spend";
import { usdToUnits } from "./spend-ledger";
import { openFileD1 } from "./sqlite-d1.test-helper";

// Spec 016 R-03, R-09: every paid call in live mode runs for an order. The
// real ledger code on the sqlite D1 helper; the provider is a fetch spy.

let dir: string;
let d1: ReturnType<typeof openFileD1>;
let fetchSpy: ReturnType<typeof vi.fn>;
let fetchStatus = 500;
const budget = { limit_usd: 5 as const, carryover_cost_usd: 0, calls: [] };

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-spend-"));
  d1 = openFileD1(join(dir, "spend.sqlite"));
  mocks.getCloudflareContext.mockReturnValue({ env: { SPEND_DB: d1.db } });
  fetchStatus = 500;
  fetchSpy = vi.fn(
    async () =>
      new Response(JSON.stringify({ error: { message: "offline" } }), {
        status: fetchStatus,
        headers: { "Content-Type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("NUAVE_AUDIT_MODE", "live");
  vi.stubEnv("NUAVE_PROVIDER", "openai");
  vi.stubEnv("OPENAI_API_KEY", "offline-test-key");
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

async function liveOrder(
  state: "open" | "running" | "reporting",
  limitUsd = 2,
) {
  const id = await makeOrder(d1.db, { mode: "live", limitUsd });
  d1.query(
    `UPDATE orders SET state = '${state}' WHERE id = '${id}' RETURNING 1`,
  );
  return id;
}
const callRows = () =>
  d1.query<{ held_units: number; status: string }>(
    "SELECT held_units, status FROM provider_spend WHERE kind = 'order_call'",
  );

describe("reserveProviderSpend", () => {
  it("refuses a paid call outside an order in live mode, before the provider", async () => {
    await expect(reserveProviderSpend(stage)).rejects.toMatchObject({
      reason: "order_refused",
    });
    expect(callRows()).toEqual([]);
  });

  it("refuses an unknown order, a wrong state and a settled hold", async () => {
    const run = (orderId: string, st = stage) =>
      withOrderSpend({ db: d1.db, orderId }, () => reserveProviderSpend(st));
    await expect(run("f".repeat(32))).rejects.toBeInstanceOf(SpendCapError);
    const open = await liveOrder("open");
    await expect(run(open)).rejects.toMatchObject({ reason: "order_refused" });
    await expect(
      run(open, { ...stage, stage: "extract" }),
    ).resolves.toBeDefined();
    const running = await liveOrder("running");
    await run(running);
    d1.query(
      `UPDATE provider_spend SET status = 'settled' WHERE kind = 'order_hold' AND order_id = '${running}' RETURNING 1`,
    );
    await expect(run(running)).rejects.toMatchObject({
      reason: "order_refused",
    });
  });

  it("fails closed when the ledger errors", async () => {
    const id = await liveOrder("running");
    const broken = {
      prepare() {
        throw new Error("D1 down");
      },
      async batch() {
        throw new Error("D1 down");
      },
    };
    await expect(
      withOrderSpend({ db: broken, orderId: id }, () =>
        reserveProviderSpend(stage),
      ),
    ).rejects.toMatchObject({ reason: "unavailable" });
  });

  it("synthetic mode never touches the ledger, with or without an order", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "synthetic");
    mocks.getCloudflareContext.mockImplementation(() => {
      throw new Error("must not be read");
    });
    await reserveProviderSpend(stage);
    expect(mocks.getCloudflareContext).not.toHaveBeenCalled();
    expect(callRows()).toEqual([]);
  });

  it("counts against the order's own hold, not the daily setting", async () => {
    vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", "50");
    const id = await liveOrder("running", 0.05);
    const run = () =>
      withOrderSpend({ db: d1.db, orderId: id }, () =>
        reserveProviderSpend(stage),
      );
    for (let i = 0; i < 5; i += 1) await run();
    await expect(run()).rejects.toMatchObject({ reason: "order_limit" });
    expect(callRows()).toHaveLength(5);
  });
});

describe("daily limit setting", () => {
  it("defaults to 50 and fails closed on a bad value", () => {
    vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", "");
    expect(dailySpendLimitUsd()).toBe(50);
    vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", "0.015");
    expect(dailySpendLimitUsd()).toBe(0.015);
    for (const bad of ["lots", "-1", "NaN"]) {
      vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", bad);
      expect(() => dailySpendLimitUsd()).toThrow(SpendCapError);
    }
  });

  it("reads the D1 binding only when it can run batches", () => {
    expect(spendDatabase()).toBe(d1.db);
    mocks.getCloudflareContext.mockReturnValue({
      env: { SPEND_DB: { prepare: d1.db.prepare } },
    });
    expect(spendDatabase()).toBeNull();
    mocks.getCloudflareContext.mockImplementation(() => {
      throw new Error("no context");
    });
    expect(spendDatabase()).toBeNull();
  });
});

describe("calls rejected before the model ran release their reservation", () => {
  const run = (orderId: string) =>
    withOrderSpend({ db: d1.db, orderId }, () =>
      executeAuditPrompt({
        prompt: goldenPrompts[0],
        brief: goldenBrief,
        safety_identifier: "offline-release",
        budget,
      }),
    );
  const held = () => callRows().reduce((sum, row) => sum + row.held_units, 0);

  it.each([400, 401, 403, 404, 429])(
    "HTTP %s settles the reservation to zero",
    async (status) => {
      const id = await liveOrder("running");
      fetchStatus = status;
      const observation = await run(id);
      expect(observation.run_status).toBe("failed");
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(held()).toBe(0);
    },
  );

  it.each([500, 503])(
    "HTTP %s keeps the full reservation held (cost unknown)",
    async (status) => {
      const id = await liveOrder("running");
      fetchStatus = status;
      await run(id);
      expect(held()).toBeGreaterThan(0);
      expect(callRows().every((row) => row.status === "reserved")).toBe(true);
    },
  );

  it("a network error keeps the reservation held", async () => {
    const id = await liveOrder("running");
    fetchSpy.mockRejectedValue(new TypeError("network down"));
    await run(id);
    expect(held()).toBeGreaterThan(0);
  });

  it("a call refused by the order never reaches the provider", async () => {
    const id = await liveOrder("running", 0.01); // less than one reservation
    await expect(run(id)).rejects.toMatchObject({ reason: "order_limit" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("releaseIfRejectedUnrun leaves unknown errors held", async () => {
    const id = await liveOrder("running");
    const reservation = await withOrderSpend({ db: d1.db, orderId: id }, () =>
      reserveProviderSpend({ ...stage, usd: 0.3 }),
    );
    await releaseIfRejectedUnrun(reservation, new Error("timeout"));
    expect(held()).toBe(usdToUnits(0.3));
  });
});
