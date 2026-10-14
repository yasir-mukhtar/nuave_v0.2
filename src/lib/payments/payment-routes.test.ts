import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

import { POST as startPOST } from "../../app/api/payments/start/route";
import { POST as notificationPOST } from "../../app/api/payments/midtrans/notification/route";
import { POST as statusPOST } from "../../app/api/orders/status/route";
import { openFileD1 } from "../spending/sqlite-d1.test-helper";
import { approve, makeOrder, mailbox } from "../orders/orders.test-helper";
import { runOrders } from "../orders/runner";
import {
  liveExecuteAuditPrompt,
  liveGenerateReportContent,
} from "../audit/provider";
import {
  createFakeMidtrans,
  type FakeMidtrans,
} from "./fake-midtrans.test-helper";

// Spec 017 S4b at the route level: start payment, the Midtrans notification and
// the status answer, on the real routes, the real ledger and a fake Midtrans.

const allow = { limit: async () => ({ success: true }) };
const deny = { limit: async () => ({ success: false }) };
const UNAVAILABLE = "Audit tidak tersedia saat ini.";
const CAP_FULL = "Kuota audit sedang penuh. Coba lagi dalam beberapa jam.";

let dir: string;
let d1: ReturnType<typeof openFileD1>;
let fake: FakeMidtrans;
let limiters: Record<string, unknown>;
let logs: string[];

function bind() {
  mocks.getCloudflareContext.mockReturnValue({
    env: { SPEND_DB: d1.db, ...limiters },
  });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-payments-"));
  d1 = openFileD1(join(dir, "payments.sqlite"));
  limiters = {
    PAYMENT_START_CALLER_RATE_LIMITER: allow,
    ORDER_STATUS_CALLER_RATE_LIMITER: allow,
  };
  bind();
  fake = createFakeMidtrans();
  vi.stubGlobal("fetch", fake.fetch);
  logs = [];
  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });
  }
  vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "true");
  vi.stubEnv("NUAVE_AUDIT_MODE", "live");
  vi.stubEnv("NUAVE_ENVIRONMENT", "production");
  vi.stubEnv("NUAVE_SITE_URL", "https://v2.nuave.test");
  vi.stubEnv("NUAVE_PROVIDER", "openai");
  vi.stubEnv("OPENAI_API_KEY", "offline-test-key");
  vi.stubEnv("CHEAPERINFERENCE_API_KEY", "offline-test-key");
  vi.stubEnv("OPENAI_AUDIT_CARRYOVER_COST_USD", "0");
  vi.stubEnv(
    "NUAVE_ORDER_EMAIL_ALLOWLIST",
    "Owner@Example.com, other@example.com",
  );
  vi.stubEnv("RESEND_API_KEY", "offline-test-resend-key");
  vi.stubEnv("NUAVE_MAIL_FROM", "Nuave <laporan@nuave.test>");
  vi.stubEnv("NUAVE_ORDER_SPEND_LIMIT_USD", "");
  vi.stubEnv("NUAVE_DAILY_SPEND_LIMIT_USD", "");
  vi.stubEnv("NUAVE_TEST_PASS_CODE", "test-pass-code-of-at-least-24-chars");
  vi.stubEnv("MIDTRANS_SERVER_KEY", fake.serverKey);
  vi.stubEnv("MIDTRANS_IS_PRODUCTION", "false");
  vi.stubEnv("NUAVE_FOUNDER_ALERT_EMAIL", "hello@nuave.test");
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  mocks.getCloudflareContext.mockReset();
});

const request = (path: string, body: unknown) =>
  new Request(`https://nuave.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const start = (orderId: unknown) =>
  startPOST(request("/api/payments/start", { order_id: orderId }));
const notify = (body: string) =>
  notificationPOST(request("/api/payments/midtrans/notification", body));
const status = (body: Record<string, unknown>) =>
  statusPOST(request("/api/orders/status", body));

const unpaidOrder = (options: Parameters<typeof makeOrder>[1] = {}) =>
  makeOrder(d1.db, {
    mode: "live",
    payment: "unpaid",
    now: new Date(),
    ...options,
  });
const order = (id: string) =>
  d1.query<Record<string, unknown>>(
    `SELECT * FROM orders WHERE id = '${id}'`,
  )[0]!;
const attempts = () =>
  d1.query<Record<string, unknown>>(
    "SELECT * FROM payment_attempts ORDER BY created_at, attempt_number",
  );
const notices = () =>
  d1.query<Record<string, unknown>>(
    "SELECT kind, subject, status, detail_json FROM founder_notices ORDER BY created_at",
  );
const holds = () =>
  d1.query<Record<string, unknown>>(
    "SELECT * FROM provider_spend WHERE kind = 'order_hold'",
  );
const number = (id: string) => String(order(id).order_number);

/** Start a payment and let the fake Midtrans settle it with a transaction. */
async function payFor(
  id: string,
  options: { status?: string; amount?: string; transactionId?: string } = {},
) {
  const response = await start(id);
  expect(response.status).toBe(200);
  const midtransOrderId = `${number(id)}-1`;
  const transaction = fake.addTransaction({
    orderId: midtransOrderId,
    transactionId: options.transactionId,
    status: options.status,
    amount: options.amount,
  });
  return transaction;
}

describe("start payment (R-05, AC-01, AC-07, AC-10, AC-11)", () => {
  it("writes one attempt, calls Snap with exactly the R-05 request, and returns only the redirect URL", async () => {
    const id = await unpaidOrder();
    const response = await start(id);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Object.keys(body)).toEqual(["redirect_url"]);
    expect(body.redirect_url).toBe(
      "https://app.sandbox.midtrans.com/snap/v3/redirection/snap-token-1",
    );
    const [attempt] = attempts();
    expect(attempt).toMatchObject({
      order_id: id,
      attempt_number: 1,
      midtrans_order_id: `${number(id)}-1`,
      status: "open",
      snap_token: "snap-token-1",
      redirect_url: body.redirect_url,
    });
    expect(
      new Date(String(attempt!.window_end)).getTime() -
        new Date(String(attempt!.window_start)).getTime(),
    ).toBe(60 * 60 * 1000);
    const [snap] = fake.snapRequests();
    const sent = JSON.parse(snap!.body!);
    expect(sent.transaction_details).toEqual({
      order_id: `${number(id)}-1`,
      gross_amount: 99000,
    });
    expect(sent.customer_details).toEqual({ email: "owner@example.com" });
    expect(sent.callbacks.finish).toBe("https://v2.nuave.test/audit");
    expect(snap!.headers["X-Override-Notification"]).toBe(
      "https://v2.nuave.test/api/payments/midtrans/notification",
    );
    // AC-10: an unpaid order holds nothing, not even with an attempt open.
    expect(holds()).toEqual([]);
    // R-07: the order lives to the window end plus the 30-minute grace at least.
    expect(String(order(id).expires_at) >= String(attempt!.window_end)).toBe(
      true,
    );
  });

  it("refuses a second start while an attempt is open, and returns the same page (AC-11)", async () => {
    const id = await unpaidOrder();
    const first = await (await start(id)).json();
    const second = await start(id);
    expect(second.status).toBe(409);
    expect(await second.json()).toMatchObject({
      code: "PAYMENT_ALREADY_OPEN",
      redirect_url: first.redirect_url,
    });
    expect(attempts()).toHaveLength(1);
    expect(fake.snapRequests()).toHaveLength(1);
  });

  it("a denied, cancelled or expired try leaves the attempt open and no new attempt starts (AC-11)", async () => {
    const id = await unpaidOrder();
    await start(id);
    for (const word of ["deny", "cancel", "expire", "failure"]) {
      const tx = fake.addTransaction({
        orderId: `${number(id)}-1`,
        transactionId: "tx-try",
        status: word,
      });
      expect((await notify(fake.notification(tx.transaction_id))).status).toBe(
        200,
      );
      expect(attempts()[0]!.status).toBe("open");
      expect((await start(id)).status).toBe(409);
    }
    expect(attempts()).toHaveLength(1);
    expect(order(id).payment_kind).toBe("unpaid");
  });

  it("a failed Snap call voids its attempt, holds no cap, and the retry makes a new attempt (R-05, AC-11)", async () => {
    const id = await unpaidOrder();
    fake.snapMode = "http_error";
    const failed = await start(id);
    expect(failed.status).toBe(502);
    expect(await failed.json()).toMatchObject({ code: "PAYMENT_START_FAILED" });
    expect(attempts()[0]).toMatchObject({ status: "void", redirect_url: null });
    // R-07: a void attempt does not push the order's end out.
    expect(String(order(id).expires_at)).toBe(
      new Date(
        new Date(String(order(id).created_at)).getTime() + 2 * 3600_000,
      ).toISOString(),
    );
    fake.snapMode = "throw";
    expect((await start(id)).status).toBe(502);
    fake.snapMode = "ok";
    expect((await start(id)).status).toBe(200);
    expect(attempts().map((row) => [row.attempt_number, row.status])).toEqual([
      [1, "void"],
      [2, "void"],
      [3, "open"],
    ]);
    expect(attempts()[2]!.midtrans_order_id).toBe(`${number(id)}-3`);
  });

  it("refuses a test pass, a legacy order, a replaced order, an ended order and a paid order", async () => {
    const testPass = await makeOrder(d1.db, {
      mode: "live",
      payment: "test",
      now: new Date(),
    });
    const legacy = await makeOrder(d1.db, {
      mode: "live",
      payment: "legacy",
      now: new Date(),
    });
    const paid = await makeOrder(d1.db, {
      mode: "live",
      payment: "paid",
      now: new Date(),
    });
    const replaced = await unpaidOrder();
    await unpaidOrder({ previousOrderId: replaced });
    const ended = await unpaidOrder({
      now: new Date(Date.now() - 3 * 3600_000),
    });
    for (const id of [testPass, legacy, paid, replaced, ended]) {
      const response = await start(id);
      expect(response.status, id).toBe(409);
      expect(await response.json()).toMatchObject({
        code: "PAYMENT_NOT_AVAILABLE",
      });
    }
    expect(attempts()).toEqual([]);
    expect(fake.requests).toEqual([]);
  });

  it("an unknown order or a bad id is a 404; another environment's order is too", async () => {
    expect((await start("0".repeat(32))).status).toBe(404);
    expect((await start("not-an-id")).status).toBe(404);
    expect((await start(undefined)).status).toBe(404);
    const preview = await makeOrder(d1.db, {
      mode: "live",
      payment: "unpaid",
      environment: "preview",
      now: new Date(),
    });
    expect((await start(preview)).status).toBe(404);
    expect(fake.requests).toEqual([]);
  });

  it("obeys the emergency switch, its rate limit, the email list and the settings, before any write (AC-07, AC-20, AC-23)", async () => {
    const id = await unpaidOrder();
    vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "false");
    expect((await start(id)).status).toBe(404);
    vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "true");

    limiters.PAYMENT_START_CALLER_RATE_LIMITER = deny;
    bind();
    expect((await start(id)).status).toBe(429);
    limiters.PAYMENT_START_CALLER_RATE_LIMITER = allow;
    bind();

    // No limiter binding at all fails closed in production.
    delete limiters.PAYMENT_START_CALLER_RATE_LIMITER;
    bind();
    expect((await start(id)).status).toBe(503);
    limiters.PAYMENT_START_CALLER_RATE_LIMITER = allow;
    bind();

    vi.stubEnv("NUAVE_ORDER_EMAIL_ALLOWLIST", "someone-else@example.com");
    const unlisted = await start(id);
    expect(unlisted.status).toBe(503);
    expect((await unlisted.json()).error).toBe(UNAVAILABLE);
    vi.stubEnv("NUAVE_ORDER_EMAIL_ALLOWLIST", "owner@example.com");
    // AC-23: the list applies with the production switch set either way.
    vi.stubEnv("MIDTRANS_IS_PRODUCTION", "true");
    vi.stubEnv("NUAVE_ORDER_EMAIL_ALLOWLIST", "someone-else@example.com");
    expect((await start(id)).status).toBe(503);
    vi.stubEnv("MIDTRANS_IS_PRODUCTION", "false");
    vi.stubEnv("NUAVE_ORDER_EMAIL_ALLOWLIST", "owner@example.com");

    for (const missing of [
      "MIDTRANS_SERVER_KEY",
      "MIDTRANS_IS_PRODUCTION",
      "NUAVE_FOUNDER_ALERT_EMAIL",
    ]) {
      const original = process.env[missing];
      vi.stubEnv(missing, "");
      const response = await start(id);
      expect(response.status, missing).toBe(503);
      expect((await response.json()).error).toBe(UNAVAILABLE);
      vi.stubEnv(missing, original ?? "");
    }
    vi.stubEnv("MIDTRANS_IS_PRODUCTION", "maybe");
    expect((await start(id)).status).toBe(503);
    expect(attempts()).toEqual([]);
    expect(fake.requests).toEqual([]);
  });

  it("synthetic mode never calls Midtrans and refuses cleanly (the seam for S4d)", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "synthetic");
    const id = await makeOrder(d1.db, {
      mode: "synthetic",
      payment: "unpaid",
      now: new Date(),
    });
    const response = await start(id);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      code: "SIMULATED_PAYMENT_UNAVAILABLE",
    });
    expect(fake.requests).toEqual([]);
    expect(attempts()).toEqual([]);
  });

  it("with no room, starts nothing, shows the full message and records one cap_full notice per day (AC-07)", async () => {
    // Two test orders hold 2 + 2 of the USD 5 cap: no room for one more 2.
    await makeOrder(d1.db, { mode: "live", payment: "test", now: new Date() });
    await makeOrder(d1.db, { mode: "live", payment: "test", now: new Date() });
    const id = await unpaidOrder();
    for (let i = 0; i < 3; i += 1) {
      const response = await start(id);
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: CAP_FULL,
        code: "CAP_FULL",
      });
    }
    expect(attempts()).toEqual([]);
    expect(fake.requests).toEqual([]);
    expect(notices().map((n) => [n.kind, n.subject, n.status])).toEqual([
      ["cap_full", new Date().toISOString().slice(0, 10), "pending"],
    ]);
    // The order is unpaid and untouched.
    expect(order(id).state).toBe("open");
  });

  it("three listed customers starting at once with a USD 5 cap get at most two attempts (AC-08)", async () => {
    const ids = [await unpaidOrder(), await unpaidOrder(), await unpaidOrder()];
    const responses = await Promise.all(ids.map((id) => start(id)));
    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([200, 200, 409]);
    expect(attempts()).toHaveLength(2);
    expect(fake.snapRequests()).toHaveLength(2);
    expect(notices().filter((n) => n.kind === "cap_full")).toHaveLength(1);
  });

  it("an open attempt counts against a test pass too, and a void attempt does not (R-10)", async () => {
    const a = await unpaidOrder();
    const b = await unpaidOrder();
    await start(a);
    await start(b);
    // Two open attempts = 4 of 5: a test pass (2) no longer fits.
    const response = await (
      await import("../../app/api/orders/route")
    ).POST(
      request("/api/orders", {
        email: "owner@example.com",
        business_name: "Kopi Nuave",
        website: "https://kopinuave.example/",
        test_pass_code: "test-pass-code-of-at-least-24-chars",
      }),
    );
    expect(response.status).toBe(503);
  });
});

describe("the Midtrans notification (R-08, R-09, R-11, AC-01, AC-02, AC-03)", () => {
  it("marks the order paid only after a good signature and a Get Status answer, then the intake continues (AC-01)", async () => {
    const id = await unpaidOrder();
    const tx = await payFor(id);
    // Before the notification nothing is paid, and the paid work is refused.
    expect(order(id).payment_kind).toBe("unpaid");
    await expect(approve(d1.db, id, { mode: "live" })).rejects.toThrow();

    const before = Date.now();
    const response = await notify(fake.notification(tx.transaction_id));
    expect(response.status).toBe(200);
    const row = order(id);
    expect(row).toMatchObject({
      payment_kind: "midtrans",
      paid_transaction_id: tx.transaction_id,
      paid_attempt_id: attempts()[0]!.id,
      state: "open",
    });
    // Nuave's own clock at the write, and the 7-day end time (R-11, R-13).
    const paidAt = new Date(String(row.paid_at)).getTime();
    expect(paidAt).toBeGreaterThanOrEqual(before);
    expect(new Date(String(row.expires_at)).getTime() - paidAt).toBe(
      7 * 24 * 3600_000,
    );
    expect(attempts()[0]).toMatchObject({
      status: "paid",
      amount: "99000.00",
      currency: "IDR",
    });
    expect(
      d1.query(
        "SELECT outcome FROM payment_transactions WHERE transaction_id = ?",
        tx.transaction_id,
      ),
    ).toEqual([{ outcome: "paid" }]);
    // One hold, on the UTC day of payment, even though nothing else was held.
    expect(holds()).toHaveLength(1);
    expect(holds()[0]).toMatchObject({
      order_id: id,
      day: new Date(paidAt).toISOString().slice(0, 10),
    });
    // The intake continues: the paid order can be approved.
    await approve(d1.db, id, { mode: "live" });
    expect(order(id).state).toBe("running");
    // The status says paid, with the order number.
    const answer = await (await status({ order_id: id })).json();
    expect(answer.payment).toEqual({ state: "paid", order_number: number(id) });
  });

  it("is idempotent: the same notification or a status check again changes nothing (AC-02)", async () => {
    const id = await unpaidOrder();
    const tx = await payFor(id);
    await notify(fake.notification(tx.transaction_id));
    const snapshot = () =>
      JSON.stringify([
        order(id),
        attempts(),
        holds(),
        notices(),
        d1.query("SELECT * FROM payment_transactions"),
      ]);
    const first = snapshot();
    for (let i = 0; i < 3; i += 1) {
      expect((await notify(fake.notification(tx.transaction_id))).status).toBe(
        200,
      );
    }
    await status({ order_id: id });
    expect(snapshot()).toBe(first);
    expect(holds()).toHaveLength(1);
    expect(d1.query("SELECT * FROM payment_emails")).toEqual([]);
    expect(notices()).toEqual([]);
  });

  it("two copies of the notification at once still pay the order once (AC-02)", async () => {
    const id = await unpaidOrder();
    const tx = await payFor(id);
    const results = await Promise.all([
      notify(fake.notification(tx.transaction_id)),
      notify(fake.notification(tx.transaction_id)),
      notify(fake.notification(tx.transaction_id)),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(holds()).toHaveLength(1);
    expect(notices()).toEqual([]);
    expect(order(id).payment_kind).toBe("midtrans");
  });

  it("decides only from the Get Status answer, not from the notification's own words", async () => {
    const id = await unpaidOrder();
    const tx = await payFor(id, { status: "pending" });
    // The notification claims settlement; Midtrans says pending.
    const lying = JSON.parse(fake.notification(tx.transaction_id));
    lying.transaction_status = "settlement";
    const response = await notify(JSON.stringify(lying));
    expect(response.status).toBe(200);
    expect(order(id).payment_kind).toBe("unpaid");
    expect(attempts()[0]!.status).toBe("open");
  });

  it("capture counts as paid only with fraud_status accept; a challenge does not", async () => {
    const id = await unpaidOrder();
    const tx = await payFor(id, { status: "capture" });
    fake.addTransaction({
      orderId: tx.order_id,
      transactionId: tx.transaction_id,
      status: "capture",
      fraud: "challenge",
    });
    await notify(fake.notification(tx.transaction_id));
    expect(order(id).payment_kind).toBe("unpaid");
    fake.setStatus(tx.transaction_id, "capture", "accept");
    await notify(fake.notification(tx.transaction_id));
    expect(order(id).payment_kind).toBe("midtrans");
  });

  it("a good signature with an unknown order_id is 200 and changes nothing (AC-03)", async () => {
    fake.addTransaction({ orderId: "NV-ZZZZZZ-1", transactionId: "tx-x" });
    const response = await notify(fake.notification("tx-x"));
    expect(response.status).toBe(200);
    expect(d1.query("SELECT * FROM payment_transactions")).toEqual([]);
    expect(notices()).toEqual([]);
    expect(fake.statusRequests()).toEqual([]);
  });

  it("a settled transaction with a wrong amount or currency becomes needs refund with a notice (AC-03)", async () => {
    for (const [amount, currency] of [
      ["98000.00", "IDR"],
      ["99000.00", "USD"],
    ] as const) {
      const id = await unpaidOrder();
      await start(id);
      const tx = fake.addTransaction({
        orderId: `${number(id)}-1`,
        status: "settlement",
        amount,
        currency,
      });
      expect((await notify(fake.notification(tx.transaction_id))).status).toBe(
        200,
      );
      expect(order(id).payment_kind).toBe("unpaid");
      expect(holds()).toEqual([]);
      expect(
        d1.query(
          "SELECT outcome FROM payment_transactions WHERE transaction_id = ?",
          tx.transaction_id,
        ),
      ).toEqual([{ outcome: "needs_refund" }]);
      expect(attempts().at(-1)).toMatchObject({
        status: "needs_refund",
        refund_state: "needs_refund",
      });
      const mine = notices().filter((n) => n.subject === tx.transaction_id);
      expect(mine).toHaveLength(1);
      expect(mine[0]!.kind).toBe("needs_refund");
      expect(JSON.parse(String(mine[0]!.detail_json))).toMatchObject({
        order_number: number(id),
        reason: "wrong_amount_or_currency",
      });
      // The customer is never asked to pay again on that order.
      expect((await start(id)).status).toBe(409);
    }
  });

  it("a bad signature or a missing server key is 503 with one notification_rejected notice per day (AC-03)", async () => {
    const id = await unpaidOrder();
    const tx = await payFor(id);
    const bad = fake.notification(tx.transaction_id, { badSignature: true });
    expect((await notify(bad)).status).toBe(503);
    expect((await notify(bad)).status).toBe(503);
    expect(
      (await notify(fake.notification(tx.transaction_id, { key: "other" })))
        .status,
    ).toBe(503);
    expect((await notify("not json")).status).toBe(503);
    expect(
      notices().filter((n) => n.kind === "notification_rejected"),
    ).toHaveLength(1);
    expect(order(id).payment_kind).toBe("unpaid");
    // A missing key is rejected the same way (a new day would record again).
    d1.query("DELETE FROM founder_notices RETURNING 1");
    vi.stubEnv("MIDTRANS_SERVER_KEY", "");
    expect((await notify(fake.notification(tx.transaction_id))).status).toBe(
      503,
    );
    expect(notices().map((n) => n.kind)).toEqual(["notification_rejected"]);
    expect(order(id).payment_kind).toBe("unpaid");
    expect(fake.statusRequests()).toEqual([]);
  });

  it("a Midtrans or database error is 503, so Midtrans retries (AC-03)", async () => {
    const id = await unpaidOrder();
    const tx = await payFor(id);
    for (const mode of [
      "http_error",
      "throw",
      "unauthorized",
      "bad_json",
    ] as const) {
      fake.statusMode = mode;
      expect(
        (await notify(fake.notification(tx.transaction_id))).status,
        mode,
      ).toBe(503);
    }
    // A transaction Midtrans says does not exist is retried too.
    fake.statusMode = "ok";
    fake.transactions.length = 0;
    expect(
      (
        await notify(
          fake.notification("tx-gone", { orderId: `${number(id)}-1` }),
        )
      ).status,
    ).toBe(503);
    expect(order(id).payment_kind).toBe("unpaid");
    // The database failing.
    fake.addTransaction({ orderId: `${number(id)}-1`, transactionId: "tx-db" });
    mocks.getCloudflareContext.mockReturnValue({
      env: {
        SPEND_DB: {
          prepare() {
            throw new Error("database down");
          },
          batch: async () => {
            throw new Error("database down");
          },
        },
      },
    });
    expect((await notify(fake.notification("tx-db"))).status).toBe(503);
  });

  it("works with the emergency switch off: the payment is recorded, no AI work starts (AC-03)", async () => {
    const id = await unpaidOrder();
    const tx = await payFor(id);
    vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "false");
    expect((await notify(fake.notification(tx.transaction_id))).status).toBe(
      200,
    );
    expect(order(id).payment_kind).toBe("midtrans");
    expect(
      d1.query("SELECT * FROM provider_spend WHERE kind = 'order_call'"),
    ).toEqual([]);
  });

  it("ignores a notification whose order_id differs from the transaction Midtrans reports", async () => {
    const a = await unpaidOrder();
    const b = await unpaidOrder();
    await start(a);
    await start(b);
    const tx = fake.addTransaction({
      orderId: `${number(b)}-1`,
      transactionId: "tx-b",
    });
    // Signed for a's order_id, but the transaction is b's.
    const response = await notify(
      fake.notification(tx.transaction_id, { orderId: `${number(a)}-1` }),
    );
    expect(response.status).toBe(200);
    expect(order(a).payment_kind).toBe("unpaid");
    expect(order(b).payment_kind).toBe("unpaid");
  });

  it("logs nothing personal: no email, key, signature or internal order ID (R-08)", async () => {
    const id = await unpaidOrder();
    const tx = await payFor(id);
    const good = fake.notification(tx.transaction_id);
    await notify(good);
    await notify(fake.notification(tx.transaction_id, { badSignature: true }));
    fake.statusMode = "throw";
    await notify(good);
    const signature = JSON.parse(good).signature_key as string;
    const everything = logs.join("\n");
    for (const secret of [id, "owner@example.com", fake.serverKey, signature]) {
      expect(everything).not.toContain(secret);
    }
  });
});

describe("the internal order ID never reaches Midtrans (R-03, AC-06)", () => {
  it("is absent from every Snap body, header and URL and every Get Status URL", async () => {
    const ids = [await unpaidOrder(), await unpaidOrder()];
    for (const id of ids) {
      await start(id);
      const tx = fake.addTransaction({
        orderId: `${number(id)}-1`,
        status: "pending",
        paymentType: "dana",
      });
      await notify(fake.notification(tx.transaction_id));
      await status({ order_id: id });
      fake.setStatus(tx.transaction_id, "settlement");
      await status({ order_id: id });
      await notify(fake.notification(tx.transaction_id));
    }
    expect(fake.snapRequests().length).toBeGreaterThanOrEqual(2);
    expect(fake.statusRequests().length).toBeGreaterThanOrEqual(2);
    for (const id of ids) {
      expect(fake.everything()).not.toContain(id);
      expect(logs.join("\n")).not.toContain(id);
    }
    // What Midtrans does get: the order number plus the attempt number.
    for (const request of fake.snapRequests()) {
      expect(JSON.parse(request.body!).transaction_details.order_id).toMatch(
        /^NV-[23456789A-HJKMNP-Z]{6}-1$/,
      );
    }
  });
});

describe("the internal order ID never reaches a live AI provider request (R-03, AC-06)", () => {
  it("a paid live order's provider calls carry no order ID in the URL, headers or body", async () => {
    const id = await unpaidOrder();
    const tx = await payFor(id);
    await notify(fake.notification(tx.transaction_id));
    await approve(d1.db, id, { mode: "live", now: new Date() });
    const before = fake.requests.length;
    const mail = mailbox();
    await runOrders({
      db: d1.db,
      environment: "production",
      mode: "live",
      siteOrigin: "https://v2.nuave.test",
      now: () => new Date(),
      execute: liveExecuteAuditPrompt,
      generateReport: liveGenerateReportContent,
      sender: mail.sender,
      sleep: async () => {},
    });
    // The fake answers every provider URL with an error; the request is what counts.
    const provider = fake.requests
      .slice(before)
      .filter((request) => !request.url.includes("midtrans.com"));
    expect(provider.length).toBeGreaterThanOrEqual(1);
    for (const request of provider) {
      expect(JSON.stringify(request)).not.toContain(id);
    }
    expect(logs.join("\n")).not.toContain(id);
  });
});

describe("the status answer (R-14, AC-12, AC-15; shapes for S4d)", () => {
  it("shows unpaid, then waiting with the Snap page, then a failed try with the same page", async () => {
    const id = await unpaidOrder();
    expect((await (await status({ order_id: id })).json()).payment).toEqual({
      state: "unpaid",
    });
    const { redirect_url } = await (await start(id)).json();
    const waiting = await (await status({ order_id: id })).json();
    expect(waiting.state).toBe("open");
    expect(waiting.payment).toEqual({ state: "waiting", redirect_url });
    fake.addTransaction({
      orderId: `${number(id)}-1`,
      transactionId: "tx-1",
      status: "deny",
    });
    // 30 seconds apart in real life; the claim is cleared to ask again now.
    d1.query("UPDATE payment_attempts SET last_checked_at = NULL RETURNING 1");
    const failed = await (await status({ order_id: id })).json();
    expect(failed.payment).toEqual({
      state: "try_failed",
      last_try: "denied",
      redirect_url,
    });
    // Never the internal order ID in the answer, nor a secret.
    expect(JSON.stringify(failed)).not.toContain(id);
    expect(JSON.stringify(failed)).not.toContain(fake.serverKey);
  });

  it("marks the order paid when the notification was lost: by order_id, then by transaction_id (DANA) (AC-15)", async () => {
    const id = await unpaidOrder();
    await start(id);
    fake.addTransaction({
      orderId: `${number(id)}-1`,
      transactionId: "tx-card",
      status: "settlement",
    });
    const answer = await (await status({ order_id: id })).json();
    expect(answer.payment).toEqual({ state: "paid", order_number: number(id) });
    expect(order(id).payment_kind).toBe("midtrans");

    // DANA: Midtrans answers by transaction_id only. A first check by order_id
    // finds nothing; once a notification-less transaction is known it is asked by id.
    const dana = await unpaidOrder();
    await start(dana);
    const tx = fake.addTransaction({
      orderId: `${number(dana)}-1`,
      transactionId: "tx-dana",
      status: "pending",
      paymentType: "dana",
    });
    await status({ order_id: dana });
    expect(order(dana).payment_kind).toBe("unpaid");
    // Learned from a notification (pending), then settled with no second one.
    await notify(fake.notification(tx.transaction_id));
    fake.setStatus(tx.transaction_id, "settlement");
    d1.query("UPDATE payment_attempts SET last_checked_at = NULL RETURNING 1");
    await status({ order_id: dana });
    expect(order(dana).payment_kind).toBe("midtrans");
    const asked = fake.statusRequests().map((r) => r.url);
    expect(asked.some((url) => url.endsWith("/v2/tx-dana/status"))).toBe(true);
  });

  it("asks Midtrans at most once per attempt per 30 seconds (AC-15)", async () => {
    const id = await unpaidOrder();
    await start(id);
    for (let i = 0; i < 5; i += 1) await status({ order_id: id });
    expect(fake.statusRequests()).toHaveLength(1);
    d1.query(
      `UPDATE payment_attempts SET last_checked_at = '${new Date(Date.now() - 31_000).toISOString()}' RETURNING 1`,
    );
    await status({ order_id: id });
    expect(fake.statusRequests()).toHaveLength(2);
  });

  it("ignores return-URL status words and anything else the browser sends (AC-15)", async () => {
    const id = await unpaidOrder();
    await start(id);
    const answer = await (
      await status({
        order_id: id,
        transaction_status: "settlement",
        status_code: "200",
        transaction_id: "tx-forged",
        payment: "paid",
      })
    ).json();
    expect(order(id).payment_kind).toBe("unpaid");
    expect(answer.payment.state).toBe("waiting");
    expect(
      fake.statusRequests().every((r) => !r.url.includes("tx-forged")),
    ).toBe(true);
  });

  it("after the window shows 'checking'; when Midtrans cannot answer, 'cannot_check'; the order never ends (AC-12, AC-15)", async () => {
    const id = await unpaidOrder();
    await start(id);
    const ago = new Date(Date.now() - 2 * 3600_000).toISOString();
    d1.query(
      `UPDATE payment_attempts SET window_start = '${ago}', window_end = '${new Date(Date.now() - 600_000).toISOString()}', last_checked_at = NULL RETURNING 1`,
    );
    d1.query(
      `UPDATE orders SET expires_at = '${new Date(Date.now() - 60_000).toISOString()}' RETURNING 1`,
    );
    const checking = await (await status({ order_id: id })).json();
    // The order is past its old end time but has an open attempt: not expired.
    expect(checking.state).toBe("open");
    expect(checking.payment).toEqual({ state: "checking" });
    fake.statusMode = "http_error";
    d1.query("UPDATE payment_attempts SET last_checked_at = NULL RETURNING 1");
    expect((await (await status({ order_id: id })).json()).payment).toEqual({
      state: "cannot_check",
    });
    // The state is kept: the next poll inside 30 seconds still says so.
    expect((await (await status({ order_id: id })).json()).payment.state).toBe(
      "cannot_check",
    );
    expect(attempts()[0]!.status).toBe("open");
  });

  it("test-pass and legacy orders have no payment to show; other environments' orders are not found", async () => {
    const testPass = await makeOrder(d1.db, {
      mode: "live",
      payment: "test",
      now: new Date(),
    });
    expect(
      (await (await status({ order_id: testPass })).json()).payment,
    ).toEqual({
      state: "not_required",
    });
    expect((await status({ order_id: "0".repeat(32) })).status).toBe(404);
  });
});
