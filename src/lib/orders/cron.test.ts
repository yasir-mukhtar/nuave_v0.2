import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
  liveExecute: vi.fn(),
  liveReport: vi.fn(),
}));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));
vi.mock("@/lib/audit/provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/audit/provider")>()),
  liveExecuteAuditPrompt: mocks.liveExecute,
  liveGenerateReportContent: mocks.liveReport,
}));

import { POST as internalCronPOST } from "../../app/api/internal/cron/route";
import { POST as devTriggerPOST } from "../../app/api/dev/run-cron/route";
import { openFileD1 } from "../spending/sqlite-d1.test-helper";
import { runScheduledOrders } from "./cron";
import { approve, makeOrder } from "./orders.test-helper";

// Spec 016 R-15, R-33, AC-11: what one cron run does, and when it does nothing.
// The real cron entry, the real runner, the real ledger and migrations on the
// sqlite D1 helper; synthetic providers and the fake sender only.

let dir: string;
let d1: ReturnType<typeof openFileD1>;
const INTERNAL_KEY = Symbol.for("nuave.internal-call-token");

function bind(env: Record<string, unknown> | "none" = {}) {
  if (env === "none") {
    mocks.getCloudflareContext.mockImplementation(() => {
      throw new Error("no worker context");
    });
    return;
  }
  mocks.getCloudflareContext.mockReturnValue({
    env: { SPEND_DB: d1.db, ...env },
  });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-cron-"));
  d1 = openFileD1(join(dir, "cron.sqlite"));
  bind();
  mocks.liveExecute.mockReset();
  mocks.liveReport.mockReset();
  vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "true");
  vi.stubEnv("NUAVE_AUDIT_MODE", "synthetic");
  vi.stubEnv("NUAVE_ENVIRONMENT", "production");
  vi.stubEnv("NUAVE_SITE_URL", "https://v2.nuave.test");
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllEnvs();
  delete (globalThis as Record<symbol, unknown>)[INTERNAL_KEY];
});

/** An approved synthetic order that is due a step (its time is now). */
async function dueOrder() {
  const id = await makeOrder(d1.db, { now: new Date() });
  await approve(d1.db, id, { now: new Date() });
  return id;
}
const done = () =>
  d1.query<{ n: number }>(
    "SELECT COUNT(*) AS n FROM order_questions WHERE status = 'done'",
  )[0].n;

describe("runScheduledOrders (R-15)", () => {
  it("runs one step for an order when everything it needs is set", async () => {
    await dueOrder();
    const result = await runScheduledOrders();
    expect(result).toEqual({ ran: true, outcomes: ["question_done"] });
    expect(done()).toBe(1);
  });

  it("does nothing when the audit switch is off or missing", async () => {
    await dueOrder();
    for (const value of ["", "false", "0", "no"]) {
      vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", value);
      expect(await runScheduledOrders()).toEqual({
        ran: false,
        reason: "switch_off",
      });
    }
    vi.unstubAllEnvs();
    expect((await runScheduledOrders()).ran).toBe(false);
    expect(done()).toBe(0);
  });

  it("does nothing when the mode is missing or unclear", async () => {
    await dueOrder();
    for (const value of ["", "Live", "synthetik", "true", " "]) {
      vi.stubEnv("NUAVE_AUDIT_MODE", value);
      expect(await runScheduledOrders()).toEqual({
        ran: false,
        reason: "mode_unclear",
      });
    }
    expect(done()).toBe(0);
  });

  it("does nothing when the database, the worker context or the site address is missing", async () => {
    await dueOrder();
    bind({ SPEND_DB: undefined });
    expect(await runScheduledOrders()).toEqual({
      ran: false,
      reason: "database_missing",
    });
    bind("none");
    expect((await runScheduledOrders()).ran).toBe(false);
    bind();
    for (const value of [
      "",
      "not a url",
      "ftp://v2.nuave.test",
      "http://v2.nuave.ai",
    ]) {
      vi.stubEnv("NUAVE_SITE_URL", value);
      expect(await runScheduledOrders()).toEqual({
        ran: false,
        reason: "site_missing",
      });
    }
    expect(done()).toBe(0);
  });

  it("runs only on the production environment (the dev trigger may run a local one)", async () => {
    await dueOrder();
    for (const value of ["", "preview", "staging"]) {
      vi.stubEnv("NUAVE_ENVIRONMENT", value);
      expect(await runScheduledOrders()).toEqual({
        ran: false,
        reason: "environment",
      });
    }
    expect(done()).toBe(0);
  });

  it("live mode with a provider key or the question-writer key missing does nothing and calls no provider", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    vi.stubEnv("NUAVE_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "offline-test-key");
    expect(await runScheduledOrders()).toEqual({
      ran: false,
      reason: "credentials_missing",
    });
    vi.stubEnv("OPENAI_API_KEY", "offline-test-key");
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "");
    expect((await runScheduledOrders()).ran).toBe(false);
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "offline-test-key");
    vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", "lots");
    expect((await runScheduledOrders()).ran).toBe(false);
    expect(mocks.liveExecute).not.toHaveBeenCalled();
    expect(mocks.liveReport).not.toHaveBeenCalled();
  });

  function liveSettings(resend = true) {
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    vi.stubEnv("NUAVE_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "offline-test-key");
    vi.stubEnv("CHEAPERINFERENCE_API_KEY", "offline-test-key");
    vi.stubEnv("RESEND_API_KEY", resend ? "offline-test-resend-key" : "");
    vi.stubEnv("NUAVE_MAIL_FROM", resend ? "Nuave <laporan@nuave.test>" : "");
  }

  it("never runs an order whose stored mode differs from its own", async () => {
    await dueOrder(); // a synthetic order
    liveSettings();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await runScheduledOrders()).toEqual({ ran: true, outcomes: [] });
    expect(done()).toBe(0);
    expect(mocks.liveExecute).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled(); // no Resend call either
    vi.unstubAllGlobals();
  });

  it("live mode without the Resend key or the from address does nothing, and touches no order", async () => {
    const live = await makeOrder(d1.db, { mode: "live", now: new Date() });
    await approve(d1.db, live, { mode: "live", now: new Date() });
    const before = JSON.stringify(d1.query("SELECT * FROM orders ORDER BY id"));
    liveSettings(false);
    expect(await runScheduledOrders()).toEqual({
      ran: false,
      reason: "sender_missing",
    });
    vi.stubEnv("RESEND_API_KEY", "offline-test-resend-key"); // from address still missing
    expect((await runScheduledOrders()).ran).toBe(false);
    expect(JSON.stringify(d1.query("SELECT * FROM orders ORDER BY id"))).toBe(
      before,
    );
    expect(mocks.liveExecute).not.toHaveBeenCalled();
    expect(mocks.liveReport).not.toHaveBeenCalled();
  });

  it("live mode with every credential and the Resend settings runs the live order (the real sender is wired in)", async () => {
    const live = await makeOrder(d1.db, { mode: "live", now: new Date() });
    await approve(d1.db, live, { mode: "live", now: new Date() });
    liveSettings();
    // The fake paid provider fails: the point here
    // is that the cron reaches it, with a Resend key present and no email sent.
    mocks.liveExecute.mockRejectedValue(new Error("offline provider failure"));
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await runScheduledOrders();
    expect(result.ran).toBe(true);
    expect(mocks.liveExecute).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("delivers a synthetic order through the fake sender with no network", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("network forbidden");
      }),
    );
    const id = await dueOrder();
    for (let i = 0; i < 12; i += 1) await runScheduledOrders();
    const [row] = d1.query<{ state: string }>(
      `SELECT state FROM orders WHERE id = '${id}'`,
    );
    expect(row.state).toBe("delivered");
    expect(d1.query("SELECT kind, result FROM order_emails")).toEqual([
      { kind: "ready", result: "accepted" },
    ]);
    vi.unstubAllGlobals();
  });
});

describe("the entries to the cron", () => {
  const post = (headers: Record<string, string> = {}) =>
    new Request("https://nuave.test/api/internal/cron", {
      method: "POST",
      headers,
    });

  it("the internal cron route answers 404 to a web request: no key, a guess, or a copy of nothing", async () => {
    await dueOrder();
    expect((await internalCronPOST(post())).status).toBe(404);
    expect(
      (await internalCronPOST(post({ "x-nuave-internal": "guess" }))).status,
    ).toBe(404);
    // Even once the isolate has a key, the wrong value is refused.
    (globalThis as Record<symbol, unknown>)[INTERNAL_KEY] = crypto.randomUUID();
    expect(
      (await internalCronPOST(post({ "x-nuave-internal": "guess" }))).status,
    ).toBe(404);
    expect(done()).toBe(0);
  });

  it("the internal cron route runs when it is given the isolate's own key", async () => {
    await dueOrder();
    const key = crypto.randomUUID();
    (globalThis as Record<symbol, unknown>)[INTERNAL_KEY] = key;
    const response = await internalCronPOST(post({ "x-nuave-internal": key }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ran: true,
      outcomes: ["question_done"],
    });
  });

  it("the development trigger answers 404 unless NODE_ENV is development and the mode is synthetic", async () => {
    await dueOrder();
    // Vitest runs with NODE_ENV=test; a production build has "production".
    for (const nodeEnv of ["test", "production"]) {
      vi.stubEnv("NODE_ENV", nodeEnv);
      expect((await devTriggerPOST()).status).toBe(404);
    }
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    expect((await devTriggerPOST()).status).toBe(404);
    expect(done()).toBe(0);
    vi.stubEnv("NUAVE_AUDIT_MODE", "synthetic");
    const response = await devTriggerPOST();
    expect(response.status).toBe(200);
    expect((await response.json()).ran).toBe(true);
    expect(done()).toBe(1);
  });

  it("the development trigger may run a local (non-production) environment", async () => {
    await dueOrder();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NUAVE_ENVIRONMENT", "preview");
    // Due now, like `dueOrder`: a fixed date passes the 24-hour deadline.
    const order = await makeOrder(d1.db, {
      environment: "preview",
      now: new Date(),
    });
    await approve(d1.db, order, { environment: "preview", now: new Date() });
    const response = await devTriggerPOST();
    expect((await response.json()).ran).toBe(true);
    // Only the preview order was touched.
    expect(
      d1.query<{ state: string; n: number }>(
        `SELECT COUNT(*) AS n, state FROM orders o JOIN order_questions q ON q.order_id = o.id
         WHERE q.status = 'done' AND o.environment = 'preview'`,
      )[0].n,
    ).toBe(1);
  });
});
