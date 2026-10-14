import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { approve, mailbox, makeOrder, T0 } from "../orders/orders.test-helper";
import { runOrders } from "../orders/runner";
import {
  createOrder,
  expireOpenOrders,
  failedOrdersNeedingEmail,
  getOrder,
  orderInState,
  orderStatus,
} from "../orders/store";
import { endOrder, hasCapRoom, usdToUnits } from "../spending/spend-ledger";
import { openFileD1 } from "../spending/sqlite-d1.test-helper";
import { applyRefund, applyStatus } from "./apply";
import { startAttempt, type AttemptRow } from "./attempts";
import { checkAttempt, reconcileDueAttempts, type CheckDeps } from "./check";
import {
  createFakeMidtrans,
  type FakeMidtrans,
} from "./fake-midtrans.test-helper";
import { getStatus } from "./midtrans";

// Spec 017 S4b: the attempt lifecycle, the unpaid-order lifetime, refunds and
// reconciliation, at fixed times, on the real ledger and a fake Midtrans.

const LIMIT = usdToUnits(2);
const DAILY = usdToUnits(5);
const MIN = 60_000;
const HOUR = 60 * MIN;
const at = (ms: number) => new Date(T0.getTime() + ms);

let dir: string;
let d1: ReturnType<typeof openFileD1>;
let fake: FakeMidtrans;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-lifecycle-"));
  d1 = openFileD1(join(dir, "lifecycle.sqlite"));
  fake = createFakeMidtrans();
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
});

const deps = (now: Date): CheckDeps => ({
  db: d1.db,
  now,
  limitUnits: LIMIT,
  dailyLimitUnits: DAILY,
  midtrans: {
    serverKey: fake.serverKey,
    isProduction: false,
    fetch: fake.fetch,
  },
});
const order = (id: string) =>
  d1.query<Record<string, unknown>>(
    `SELECT * FROM orders WHERE id = '${id}'`,
  )[0]!;
const attemptRows = (orderId?: string) =>
  d1.query<AttemptRow>(
    `SELECT * FROM payment_attempts ${orderId ? `WHERE order_id = '${orderId}'` : ""} ORDER BY created_at, attempt_number`,
  );
const notices = () =>
  d1.query<{ kind: string; subject: string; detail_json: string | null }>(
    "SELECT kind, subject, detail_json FROM founder_notices ORDER BY created_at, kind",
  );
const noticeKinds = () => notices().map((n) => n.kind);
const holds = () =>
  d1.query<Record<string, unknown>>(
    "SELECT * FROM provider_spend WHERE kind = 'order_hold'",
  );
const transaction = (id: string) =>
  d1.query<Record<string, unknown>>(
    `SELECT * FROM payment_transactions WHERE transaction_id = '${id}'`,
  )[0]!;

async function unpaid(now = T0, options: { previousOrderId?: unknown } = {}) {
  return makeOrder(d1.db, { mode: "live", payment: "unpaid", now, ...options });
}
/** An open attempt for the order, started at `now`. */
async function begin(
  orderId: string,
  now = T0,
  dailyLimitUnits = DAILY,
): Promise<AttemptRow> {
  const result = await startAttempt(d1.db, {
    orderId,
    environment: "production",
    mode: "live",
    now,
    limitUnits: LIMIT,
    dailyLimitUnits,
  });
  if (result.result !== "started") throw new Error(`start: ${result.result}`);
  return result.attempt;
}
/** Settle a transaction in the fake and apply Midtrans' answer for it. */
async function settle(
  attempt: AttemptRow,
  options: {
    transactionId?: string;
    amount?: string;
    status?: string;
    now?: Date;
  } = {},
) {
  const tx = fake.addTransaction({
    orderId: attempt.midtrans_order_id,
    transactionId: options.transactionId,
    amount: options.amount,
    status: options.status,
  });
  const answer = await getStatus(deps(T0).midtrans, tx.transaction_id);
  if (answer.kind !== "found") throw new Error("fake lost the transaction");
  return {
    tx,
    result: await applyStatus(deps(options.now ?? T0), answer.status),
  };
}

describe("unpaid order lifetime (R-07, AC-12)", () => {
  it("with no attempt an unpaid order ends after 2 hours", async () => {
    const id = await unpaid();
    expect(
      await expireOpenOrders(d1.db, {
        environment: "production",
        mode: "live",
        now: at(2 * HOUR - 1),
        limit: 10,
      }),
    ).toEqual([]);
    expect(
      await expireOpenOrders(d1.db, {
        environment: "production",
        mode: "live",
        now: at(2 * HOUR),
        limit: 10,
      }),
    ).toEqual([id]);
    expect(order(id).state).toBe("expired");
  });

  it("an order with an open attempt never ends, and its status is open ('checking payment') (R-07)", async () => {
    const id = await unpaid();
    await begin(id, at(100 * MIN)); // window ends at +160 min, grace to +190
    const sweep = (ms: number) =>
      expireOpenOrders(d1.db, {
        environment: "production",
        mode: "live",
        now: at(ms),
        limit: 10,
      });
    expect(await sweep(3 * HOUR)).toEqual([]);
    expect(await sweep(24 * HOUR)).toEqual([]);
    const status = await orderStatus(d1.db, {
      orderId: id,
      environment: "production",
      now: at(24 * HOUR),
    });
    expect(status!.state).toBe("open");
    expect(order(id).state).toBe("open");
  });

  it("ends at the later of 2 hours after creation and the window end plus the grace, once the attempt is final", async () => {
    const id = await unpaid();
    const attempt = await begin(id, at(100 * MIN));
    expect(order(id).expires_at).toBe(at(190 * MIN).toISOString());
    d1.query(
      `UPDATE payment_attempts SET status = 'finally_unpaid' WHERE id = '${attempt.id}' RETURNING 1`,
    );
    const sweep = (ms: number) =>
      expireOpenOrders(d1.db, {
        environment: "production",
        mode: "live",
        now: at(ms),
        limit: 10,
      });
    expect(await sweep(190 * MIN - 1)).toEqual([]);
    expect(await sweep(190 * MIN)).toEqual([id]);
    // An attempt started early does not pull the end in before 2 hours.
    const early = await unpaid();
    await begin(early, T0);
    expect(order(early).expires_at).toBe(
      at(90 * MIN > 2 * HOUR ? 90 * MIN : 2 * HOUR).toISOString(),
    );
  });

  it("a paid order uses the 7-day end time, and is refused (not expired by the unpaid sweep) after it", async () => {
    const id = await makeOrder(d1.db, {
      mode: "live",
      payment: "paid",
      now: T0,
    });
    expect(order(id).expires_at).toBe(at(7 * 24 * HOUR).toISOString());
    const gate = (ms: number) =>
      orderInState(d1.db, {
        orderId: id,
        environment: "production",
        mode: "live",
        states: ["open"],
        now: at(ms),
      });
    expect(await gate(6 * 24 * HOUR)).not.toBeNull();
    expect(await gate(7 * 24 * HOUR)).toBeNull();
    // The unpaid sweep never ends a paid order (the 7-day sweep is S4c's).
    expect(
      await expireOpenOrders(d1.db, {
        environment: "production",
        mode: "live",
        now: at(8 * 24 * HOUR),
        limit: 10,
      }),
    ).toEqual([]);
  });

  it("a payment applied just before the ending write keeps the order paid (race, AC-12)", async () => {
    const id = await unpaid();
    const attempt = await begin(id);
    d1.query(
      `UPDATE payment_attempts SET status = 'finally_unpaid' WHERE id = '${attempt.id}' RETURNING 1`,
    );
    // The sweep has read "past its end"; the payment lands; then the ending write.
    const pastEnd = at(3 * HOUR);
    const { result } = await settle(attempt, { now: pastEnd });
    expect(result).toBe("paid");
    const ended = await endOrder(d1.db, {
      orderId: id,
      from: ["open"],
      to: "expired",
      onlyIfUnpaidPastEnd: true,
      now: () => pastEnd,
    });
    expect(ended).toBe(false);
    expect(order(id)).toMatchObject({
      state: "open",
      payment_kind: "midtrans",
    });
    expect(holds()).toHaveLength(1);
  });

  it("the ending write itself refuses an order that still has an open attempt", async () => {
    const id = await unpaid();
    await begin(id);
    expect(
      await endOrder(d1.db, {
        orderId: id,
        from: ["open"],
        to: "expired",
        onlyIfUnpaidPastEnd: true,
        now: () => at(5 * HOUR),
      }),
    ).toBe(false);
  });
});

describe("a late payment (R-11, R-12, AC-12)", () => {
  it("revives an expired, unreplaced unpaid order as paid, with its hold and the 7-day end time", async () => {
    const id = await unpaid();
    const attempt = await begin(id);
    d1.query(
      `UPDATE payment_attempts SET status = 'finally_unpaid' WHERE id = '${attempt.id}' RETURNING 1`,
    );
    await expireOpenOrders(d1.db, {
      environment: "production",
      mode: "live",
      now: at(3 * HOUR),
      limit: 10,
    });
    expect(order(id).state).toBe("expired");
    const { result } = await settle(attempt, { now: at(4 * HOUR) });
    expect(result).toBe("paid");
    expect(order(id)).toMatchObject({
      state: "open",
      ended_at: null,
      failure_code: null,
      payment_kind: "midtrans",
      paid_at: at(4 * HOUR).toISOString(),
      expires_at: at(4 * HOUR + 7 * 24 * HOUR).toISOString(),
    });
    expect(holds()).toHaveLength(1);
    expect(attemptRows(id)[0]!.status).toBe("paid");
    await approve(d1.db, id, { mode: "live", now: at(4 * HOUR + MIN) });
  });

  it("on a replaced order it becomes needs refund and the order stays ended", async () => {
    const id = await unpaid();
    const attempt = await begin(id);
    d1.query(
      `UPDATE payment_attempts SET status = 'finally_unpaid' WHERE id = '${attempt.id}' RETURNING 1`,
    );
    await expireOpenOrders(d1.db, {
      environment: "production",
      mode: "live",
      now: at(3 * HOUR),
      limit: 10,
    });
    await unpaid(at(3 * HOUR + MIN), { previousOrderId: id });
    expect(order(id).replaced_by).not.toBeNull();
    const { result, tx } = await settle(attempt, { now: at(4 * HOUR) });
    expect(result).toBe("needs_refund");
    expect(order(id)).toMatchObject({
      state: "expired",
      payment_kind: "unpaid",
    });
    expect(holds()).toEqual([]);
    expect(notices()).toEqual([
      expect.objectContaining({
        kind: "needs_refund",
        subject: tx.transaction_id,
      }),
    ]);
    expect(JSON.parse(notices()[0]!.detail_json!).reason).toBe(
      "order_replaced",
    );
  });
});

describe("a paid transaction that cannot be applied is needs refund, once (R-12, AC-11)", () => {
  async function expectNeedsRefund(
    prepare: (orderId: string) => void,
    reason: string,
  ) {
    const id = await unpaid();
    const attempt = await begin(id);
    prepare(id);
    const { tx, result } = await settle(attempt);
    expect(result).toBe("needs_refund");
    expect(transaction(tx.transaction_id)).toMatchObject({
      outcome: "needs_refund",
    });
    expect(attemptRows(id)[0]).toMatchObject({
      status: "needs_refund",
      refund_state: "needs_refund",
    });
    // Again, by notification or status check: nothing more.
    const again = await getStatus(deps(T0).midtrans, tx.transaction_id);
    if (again.kind !== "found") throw new Error("lost");
    expect(await applyStatus(deps(at(MIN)), again.status)).toBe("duplicate");
    const mine = notices().filter((n) => n.subject === tx.transaction_id);
    expect(mine).toHaveLength(1);
    expect(JSON.parse(mine[0]!.detail_json!).reason).toBe(reason);
    expect(holds().filter((h) => h.order_id === id)).toEqual([]);
    return id;
  }

  it("a test-pass order", async () => {
    await expectNeedsRefund(
      (id) =>
        d1.query(
          `UPDATE orders SET payment_kind = 'test' WHERE id = '${id}' RETURNING 1`,
        ),
      "test_pass_order",
    );
  });
  it("an order already failed", async () => {
    await expectNeedsRefund(
      (id) =>
        d1.query(
          `UPDATE orders SET state = 'failed', ended_at = 't', failure_code = 'x' WHERE id = '${id}' RETURNING 1`,
        ),
      "order_ended",
    );
  });
  it("an order already delivered", async () => {
    await expectNeedsRefund(
      (id) =>
        d1.query(
          `UPDATE orders SET state = 'delivered', ended_at = 't' WHERE id = '${id}' RETURNING 1`,
        ),
      "order_ended",
    );
  });
  it("an order already refunded", async () => {
    await expectNeedsRefund(
      (id) =>
        d1.query(
          `UPDATE orders SET state = 'failed', failure_code = 'refunded', refunded_at = 't', ended_at = 't' WHERE id = '${id}' RETURNING 1`,
        ),
      "order_ended",
    );
  });

  it("a second paid transaction under the same attempt, and one under another attempt, never change the paid order", async () => {
    const id = await unpaid();
    const first = await begin(id);
    expect((await settle(first, { transactionId: "tx-first" })).result).toBe(
      "paid",
    );
    const paidAt = order(id).paid_at;
    // Same attempt, second transaction.
    expect((await settle(first, { transactionId: "tx-second" })).result).toBe(
      "needs_refund",
    );
    expect(attemptRows(id)[0]!.status).toBe("paid");
    expect(attemptRows(id)[0]!.refund_state).toBe("needs_refund");
    // Another attempt on the same order (only possible if it was started before
    // the payment): its settled transaction is needs refund too.
    d1.query(
      `INSERT INTO payment_attempts (id, order_id, attempt_number, midtrans_order_id, window_start, window_end, status, created_at, updated_at)
       VALUES ('a2', '${id}', 2, 'NV-OTHER1-2', 't', 't', 'open', 't', 't') RETURNING 1`,
    );
    const other = attemptRows(id).find((a) => a.id === "a2")!;
    expect((await settle(other, { transactionId: "tx-third" })).result).toBe(
      "needs_refund",
    );
    expect(order(id)).toMatchObject({
      payment_kind: "midtrans",
      paid_at: paidAt,
      paid_transaction_id: "tx-first",
    });
    expect(holds()).toHaveLength(1);
    expect(notices().map((n) => [n.kind, n.subject])).toEqual([
      ["needs_refund", "tx-second"],
      ["needs_refund", "tx-third"],
    ]);
  });

  it("a settlement whose fraud status is not accept has its own reason", async () => {
    const id = await unpaid();
    const attempt = await begin(id);
    const tx = fake.addTransaction({
      orderId: attempt.midtrans_order_id,
      status: "settlement",
      fraud: "challenge",
    });
    const answer = await getStatus(deps(T0).midtrans, tx.transaction_id);
    if (answer.kind !== "found") throw new Error("lost");
    expect(await applyStatus(deps(T0), answer.status)).toBe("needs_refund");
    expect(JSON.parse(notices()[0]!.detail_json!).reason).toBe(
      "fraud_status_not_accept",
    );
  });

  it("the customer is not asked to pay again on that order", async () => {
    const id = await unpaid();
    const attempt = await begin(id);
    await settle(attempt, { amount: "50000.00" });
    const again = await startAttempt(d1.db, {
      orderId: id,
      environment: "production",
      mode: "live",
      now: at(MIN),
      limitUnits: LIMIT,
      dailyLimitUnits: DAILY,
    });
    expect(again.result).toBe("refused");
  });
});

describe("the daily cap and open attempts (R-10, AC-08, AC-10)", () => {
  it("an attempt open across 00:00 UTC is counted on the new day", async () => {
    const day1 = new Date("2026-10-14T23:50:00.000Z");
    const day2 = new Date("2026-10-15T00:10:00.000Z");
    const a = await unpaid(day1);
    const b = await unpaid(day2);
    const c = await unpaid(day2);
    await begin(a, day1);
    await begin(b, day2); // 2 (a) + 2 (b) = 4 of 5
    const refused = await startAttempt(d1.db, {
      orderId: c,
      environment: "production",
      mode: "live",
      now: day2,
      limitUnits: LIMIT,
      dailyLimitUnits: DAILY,
    });
    expect(refused.result).toBe("cap_full");
    expect(
      await hasCapRoom(d1.db, {
        now: day2,
        limitUnits: LIMIT,
        dailyLimitUnits: DAILY,
      }),
    ).toBe(false);
  });

  it("the hold is reserved at payment, on the UTC day of payment, once (AC-10)", async () => {
    const day1 = new Date("2026-10-14T23:50:00.000Z");
    const day2 = new Date("2026-10-15T00:30:00.000Z");
    const id = await unpaid(day1);
    const attempt = await begin(id, day1);
    expect(holds()).toEqual([]);
    expect((await settle(attempt, { now: day2 })).result).toBe("paid");
    expect(holds()).toHaveLength(1);
    expect(holds()[0]).toMatchObject({
      order_id: id,
      day: "2026-10-15",
      status: "reserved",
      held_units: LIMIT,
    });
  });

  it("a payment confirmed while its attempt is open is already counted: no late notice", async () => {
    const id = await unpaid();
    const attempt = await begin(id);
    await makeOrder(d1.db, { mode: "live", payment: "test", now: T0 }); // 2 held
    await makeOrder(d1.db, { mode: "live", payment: "test", now: T0 }).catch(
      () => {},
    ); // refused: no room
    expect((await settle(attempt)).result).toBe("paid");
    expect(noticeKinds()).toEqual([]);
  });

  it("a payment confirmed after its attempt stopped being open, that passes the cap, records late_payment_over_cap (AC-08)", async () => {
    const id = await unpaid();
    const attempt = await begin(id);
    d1.query(
      `UPDATE payment_attempts SET status = 'finally_unpaid' WHERE id = '${attempt.id}' RETURNING 1`,
    );
    // The room it used was taken by others: 2 + 2 held, then the paid hold of 2.
    await makeOrder(d1.db, { mode: "live", payment: "test", now: T0 });
    await makeOrder(d1.db, { mode: "live", payment: "test", now: T0 });
    const { tx, result } = await settle(attempt, { now: at(3 * HOUR) });
    expect(result).toBe("paid");
    expect(holds()).toHaveLength(3); // the customer has paid: reserved anyway
    expect(notices()).toEqual([
      expect.objectContaining({
        kind: "late_payment_over_cap",
        subject: tx.transaction_id,
      }),
    ]);
  });
});

describe("refunds, partial refunds and chargebacks (R-15, AC-16)", () => {
  async function paidOrder() {
    const id = await unpaid();
    const attempt = await begin(id);
    const { tx } = await settle(attempt);
    return { id, attempt, tx };
  }
  const refundAnswer = async (
    tx: { transaction_id: string },
    word: string,
    now = at(HOUR),
  ) => {
    fake.setStatus(tx.transaction_id, word);
    const answer = await getStatus(deps(now).midtrans, tx.transaction_id);
    if (answer.kind !== "found") throw new Error("lost");
    return applyStatus(deps(now), answer.status);
  };

  it("a full refund of the paying transaction before approval ends the order `refunded`: hold settled, no AI work, no failure email", async () => {
    const { id, tx } = await paidOrder();
    expect(await refundAnswer(tx, "refund")).toBe("refund_recorded");
    expect(order(id)).toMatchObject({
      state: "failed",
      failure_code: "refunded",
      refunded_at: at(HOUR).toISOString(),
    });
    expect(holds()[0]).toMatchObject({ status: "settled", held_units: 0 });
    expect(transaction(tx.transaction_id)).toMatchObject({
      refund_state: "refunded",
      refund_source: "midtrans",
    });
    expect(attemptRows(id)[0]!.refund_state).toBe("refunded");
    // The S3 failure-email sweep skips this code, and the runner sends nothing.
    expect(
      await failedOrdersNeedingEmail(d1.db, {
        environment: "production",
        mode: "live",
        now: at(2 * HOUR),
        limit: 10,
      }),
    ).toEqual([]);
    const mail = mailbox();
    await runOrders({
      db: d1.db,
      environment: "production",
      mode: "live",
      siteOrigin: "https://v2.nuave.test",
      now: () => at(3 * HOUR),
      execute: async () => {
        throw new Error("no AI work for a refunded order");
      },
      generateReport: async () => {
        throw new Error("no AI work for a refunded order");
      },
      sender: mail.sender,
      sleep: async () => {},
    });
    expect(mail.sent).toEqual([]);
    // No paid work either.
    await expect(
      approve(d1.db, id, { mode: "live", now: at(2 * HOUR) }),
    ).rejects.toThrow();
    // Again: nothing changes.
    expect(await refundAnswer(tx, "refund", at(5 * HOUR))).toBe("duplicate");
    expect(order(id).refunded_at).toBe(at(HOUR).toISOString());
  });

  it("a chargeback before approval is treated like a full refund, and tells the founder", async () => {
    const { id, tx } = await paidOrder();
    expect(await refundAnswer(tx, "chargeback")).toBe("refund_recorded");
    expect(order(id)).toMatchObject({
      state: "failed",
      failure_code: "refunded",
    });
    expect(notices()).toEqual([
      expect.objectContaining({
        kind: "chargeback",
        subject: tx.transaction_id,
      }),
    ]);
  });

  it("after approval a full refund is only recorded: the audit keeps running", async () => {
    const { id, tx } = await paidOrder();
    await approve(d1.db, id, { mode: "live", now: at(MIN) });
    expect(await refundAnswer(tx, "refund")).toBe("refund_recorded");
    expect(order(id)).toMatchObject({
      state: "running",
      failure_code: null,
      refunded_at: at(HOUR).toISOString(),
    });
    expect(transaction(tx.transaction_id).refund_state).toBe("refunded");
    expect(holds()[0]!.status).toBe("reserved");
  });

  it("a partial refund is recorded with a notice and changes nothing else", async () => {
    const { id, tx } = await paidOrder();
    expect(await refundAnswer(tx, "partial_refund")).toBe("refund_recorded");
    expect(order(id)).toMatchObject({
      state: "open",
      payment_kind: "midtrans",
      refunded_at: null,
    });
    expect(transaction(tx.transaction_id).refund_state).toBe("partial_refund");
    expect(noticeKinds()).toEqual(["partial_refund"]);
    expect(await refundAnswer(tx, "partial_refund", at(2 * HOUR))).toBe(
      "duplicate",
    );
    expect(noticeKinds()).toEqual(["partial_refund"]);
  });

  it("a partial chargeback is treated like a partial refund: a partial_chargeback notice, the order untouched", async () => {
    const { id, tx } = await paidOrder();
    expect(await refundAnswer(tx, "partial_chargeback")).toBe(
      "refund_recorded",
    );
    expect(order(id)).toMatchObject({
      state: "open",
      payment_kind: "midtrans",
      refunded_at: null,
    });
    expect(transaction(tx.transaction_id).refund_state).toBe("partial_refund");
    expect(notices()).toEqual([
      expect.objectContaining({
        kind: "partial_chargeback",
        subject: tx.transaction_id,
      }),
    ]);
    expect(await refundAnswer(tx, "partial_chargeback", at(2 * HOUR))).toBe(
      "duplicate",
    );
    expect(notices()).toHaveLength(1);
  });

  it("a refund of a needs-refund transaction closes only that case and leaves the paid order running", async () => {
    const { id, attempt } = await paidOrder();
    await approve(d1.db, id, { mode: "live", now: at(MIN) });
    const { tx: second } = await settle(attempt, { transactionId: "tx-dup" });
    expect(transaction("tx-dup").outcome).toBe("needs_refund");
    expect(await refundAnswer(second, "refund")).toBe("refund_recorded");
    expect(transaction("tx-dup")).toMatchObject({
      outcome: "needs_refund",
      refund_state: "refunded",
    });
    expect(attemptRows(id)[0]).toMatchObject({
      status: "paid",
      refund_state: "refunded",
    });
    expect(order(id)).toMatchObject({
      state: "running",
      payment_kind: "midtrans",
      refunded_at: null,
    });
    expect(holds()[0]!.status).toBe("reserved");
  });

  it("the support command's outside refund names a transaction and has the same effect (source support)", async () => {
    const { id, tx } = await paidOrder();
    expect(
      await applyRefund(
        deps(at(HOUR)),
        tx.transaction_id,
        "refunded",
        "support",
      ),
    ).toBe("refund_recorded");
    expect(order(id)).toMatchObject({
      state: "failed",
      failure_code: "refunded",
    });
    expect(transaction(tx.transaction_id)).toMatchObject({
      refund_state: "refunded",
      refund_source: "support",
    });
    expect(
      await applyRefund(deps(at(HOUR)), "unknown-tx", "refunded", "support"),
    ).toBe("unknown_order");
  });

  it("a refund of a transaction that never paid the order does not touch the order", async () => {
    const id = await unpaid();
    const attempt = await begin(id);
    const tx = fake.addTransaction({
      orderId: attempt.midtrans_order_id,
      status: "refund",
    });
    const answer = await getStatus(deps(T0).midtrans, tx.transaction_id);
    if (answer.kind !== "found") throw new Error("lost");
    await applyStatus(deps(T0), answer.status);
    expect(order(id)).toMatchObject({ state: "open", payment_kind: "unpaid" });
  });
});

describe("when an attempt is final (R-06, AC-11, AC-12)", () => {
  it("is not finally unpaid before the window, the grace and the further wait, however Midtrans answers", async () => {
    const id = await unpaid();
    const attempt = await begin(id);
    fake.addTransaction({
      orderId: attempt.midtrans_order_id,
      transactionId: "tx-1",
      status: "expire",
    });
    // The window ends at +60 min; final needs +30 +60 more = +150 min.
    for (const minutes of [61, 100, 149]) {
      expect(
        await checkAttempt(deps(at(minutes * MIN)), attemptRows(id)[0]!),
      ).toBe("answered");
      expect(attemptRows(id)[0]!.status, `${minutes}`).toBe("open");
    }
    await checkAttempt(deps(at(150 * MIN)), attemptRows(id)[0]!);
    expect(attemptRows(id)[0]!).toMatchObject({
      status: "finally_unpaid",
      final_at: at(150 * MIN).toISOString(),
    });
    // It stops counting against the cap and the order may end and be replaced.
    expect(
      await hasCapRoom(d1.db, {
        now: at(150 * MIN),
        limitUnits: LIMIT,
        dailyLimitUnits: DAILY,
      }),
    ).toBe(true);
    expect(
      await expireOpenOrders(d1.db, {
        environment: "production",
        mode: "live",
        now: at(151 * MIN),
        limit: 10,
      }),
    ).toEqual([id]);
    const replacement = await createOrder(d1.db, {
      email: "owner@example.com",
      businessName: "Kopi Nuave",
      website: "https://kopinuave.example/",
      mode: "live",
      environment: "production",
      paymentKind: "unpaid",
      limitUsd: 2,
      dailyLimitUsd: 5,
      previousOrderId: id,
      now: at(152 * MIN),
    });
    expect(replacement.result).toBe("created");
    expect(order(id).replaced_by).toBe(replacement.orderId);
    expect(
      (await begin(replacement.orderId, at(153 * MIN))).attempt_number,
    ).toBe(1);
  });

  it("'not found' for the order_id, with no transaction, is final after the wait (and not before)", async () => {
    const id = await unpaid();
    await begin(id);
    expect(await checkAttempt(deps(at(100 * MIN)), attemptRows(id)[0]!)).toBe(
      "answered",
    );
    expect(attemptRows(id)[0]!.status).toBe("open");
    await checkAttempt(deps(at(150 * MIN)), attemptRows(id)[0]!);
    expect(attemptRows(id)[0]!.status).toBe("finally_unpaid");
  });

  it("a DANA try with no notification yet keeps the attempt open until the wait has passed, then 'not found' is final", async () => {
    const id = await unpaid();
    const attempt = await begin(id);
    // DANA answers by transaction_id only: "not found" by order_id proves nothing.
    fake.addTransaction({
      orderId: attempt.midtrans_order_id,
      transactionId: "tx-dana",
      status: "pending",
      paymentType: "dana",
    });
    await checkAttempt(deps(at(100 * MIN)), attemptRows(id)[0]!);
    expect(attemptRows(id)[0]!.status).toBe("open");
    await checkAttempt(deps(at(149 * MIN)), attemptRows(id)[0]!);
    expect(attemptRows(id)[0]!.status).toBe("open");
    await checkAttempt(deps(at(150 * MIN)), attemptRows(id)[0]!);
    expect(attemptRows(id)[0]!.status).toBe("finally_unpaid");
  });

  it("a transaction that is still pending after the wait keeps the attempt open until Midtrans says expire", async () => {
    const id = await unpaid();
    const attempt = await begin(id);
    const tx = fake.addTransaction({
      orderId: attempt.midtrans_order_id,
      transactionId: "tx-dana",
      status: "pending",
      paymentType: "dana",
    });
    // Learned from a notification (a pending status), as DANA tries are.
    const known = await getStatus(deps(T0).midtrans, tx.transaction_id);
    if (known.kind !== "found") throw new Error("lost");
    await applyStatus(deps(at(5 * MIN)), known.status);
    await checkAttempt(deps(at(151 * MIN)), attemptRows(id)[0]!);
    expect(attemptRows(id)[0]!.status).toBe("open");
    fake.setStatus("tx-dana", "expire");
    await checkAttempt(deps(at(162 * MIN)), attemptRows(id)[0]!);
    expect(attemptRows(id)[0]!.status).toBe("finally_unpaid");
  });

  it("the final answer asks every known transaction; the recovery path asks a bounded number", async () => {
    const id = await unpaid();
    const attempt = await begin(id);
    // Seven transactions stored as pending; the newest-updated one is really settled.
    for (let n = 1; n <= 7; n += 1) {
      fake.addTransaction({
        orderId: attempt.midtrans_order_id,
        transactionId: `tx-${n}`,
        status: n === 7 ? "settlement" : "expire",
      });
      d1.query(
        `INSERT INTO payment_transactions (transaction_id, attempt_id, midtrans_status, outcome, first_seen_at, updated_at)
         VALUES ('tx-${n}', '${attempt.id}', 'pending', 'pending', 't', '2026-10-14T10:0${n}:00.000Z') RETURNING 1`,
      );
    }
    // Before the final time: only 5 are asked, and no order_id.
    await checkAttempt(deps(at(100 * MIN)), attemptRows(id)[0]!);
    expect(fake.statusRequests()).toHaveLength(5);
    expect(order(id).payment_kind).toBe("unpaid");
    // At the final time every one is asked (and the order_id), so the settled one is found.
    fake.requests.length = 0;
    await checkAttempt(deps(at(150 * MIN)), attemptRows(id)[0]!);
    expect(fake.statusRequests()).toHaveLength(8);
    expect(order(id).payment_kind).toBe("midtrans");
    expect(attemptRows(id)[0]!.status).toBe("paid");
  });

  it("a poll's time budget stops further Midtrans calls and counts as unavailable", async () => {
    const id = await unpaid();
    const attempt = await begin(id);
    for (let n = 1; n <= 4; n += 1) {
      fake.addTransaction({
        orderId: attempt.midtrans_order_id,
        transactionId: `tx-${n}`,
        status: "pending",
      });
      d1.query(
        `INSERT INTO payment_transactions (transaction_id, attempt_id, midtrans_status, outcome, first_seen_at, updated_at)
         VALUES ('tx-${n}', '${attempt.id}', 'pending', 'pending', 't', 't${n}') RETURNING 1`,
      );
    }
    const slow = {
      ...deps(at(5 * MIN)),
      timeBudgetMs: 60,
      midtrans: {
        serverKey: fake.serverKey,
        isProduction: false,
        fetch: (async (...args: Parameters<typeof fetch>) => {
          await new Promise((resolve) => setTimeout(resolve, 40));
          return fake.fetch(...args);
        }) as typeof fetch,
      },
    };
    expect(await checkAttempt(slow, attemptRows(id)[0]!)).toBe("unavailable");
    expect(fake.statusRequests().length).toBeGreaterThanOrEqual(1);
    expect(fake.statusRequests().length).toBeLessThan(4);
    expect(attemptRows(id)[0]!.check_failed_at).not.toBeNull();
    // A spent budget asks nothing at all.
    fake.requests.length = 0;
    d1.query("UPDATE payment_attempts SET last_checked_at = NULL RETURNING 1");
    expect(
      await checkAttempt({ ...slow, timeBudgetMs: 0 }, attemptRows(id)[0]!),
    ).toBe("unavailable");
    expect(fake.requests).toEqual([]);
  });

  it("a settled transaction makes the attempt final at once (needs refund), and a paid one marks the order paid", async () => {
    const id = await unpaid();
    const attempt = await begin(id);
    fake.addTransaction({
      orderId: attempt.midtrans_order_id,
      transactionId: "tx-ok",
    });
    await checkAttempt(deps(at(5 * MIN)), attemptRows(id)[0]!);
    expect(order(id).payment_kind).toBe("midtrans");
    expect(attemptRows(id)[0]!.status).toBe("paid");
  });

  it("when Get Status keeps failing the attempt stays open, the founder is told at 24 hours (once), and it closes as unknown at 7 days (AC-12, AC-15)", async () => {
    const id = await unpaid();
    await begin(id);
    fake.statusMode = "http_error";
    const windowEnd = 60 * MIN;
    const check = (ms: number) =>
      checkAttempt(deps(at(ms)), attemptRows(id)[0]!);
    expect(await check(windowEnd + 5 * MIN)).toBe("unavailable");
    expect(attemptRows(id)[0]).toMatchObject({
      status: "open",
      check_failed_at: at(windowEnd + 5 * MIN).toISOString(),
    });
    await check(windowEnd + 5 * HOUR);
    expect(noticeKinds()).toEqual([]);
    await check(windowEnd + 24 * HOUR);
    await check(windowEnd + 48 * HOUR);
    const unknown = notices();
    expect(unknown).toHaveLength(1);
    expect(unknown[0]).toMatchObject({ kind: "payment_unknown" });
    expect(unknown[0]!.subject).toBe(attemptRows(id)[0]!.midtrans_order_id);
    expect(attemptRows(id)[0]!.status).toBe("open");
    // The order still never ends while the attempt is open.
    expect(
      await expireOpenOrders(d1.db, {
        environment: "production",
        mode: "live",
        now: at(windowEnd + 72 * HOUR),
        limit: 10,
      }),
    ).toEqual([]);
    await check(windowEnd + 7 * 24 * HOUR);
    expect(attemptRows(id)[0]).toMatchObject({ status: "closed_unknown" });
    // It stops counting against the cap and no longer blocks the order.
    expect(
      await hasCapRoom(d1.db, {
        now: at(windowEnd + 7 * 24 * HOUR),
        limitUnits: LIMIT,
        dailyLimitUnits: DAILY,
      }),
    ).toBe(true);
    expect(
      await expireOpenOrders(d1.db, {
        environment: "production",
        mode: "live",
        now: at(windowEnd + 7 * 24 * HOUR + MIN),
        limit: 10,
      }),
    ).toEqual([id]);
    expect(noticeKinds()).toEqual(["payment_unknown"]);
  });
});

describe("cron reconciliation (R-14, AC-15)", () => {
  async function endedAttempt(windowEndMsAfterT0: number) {
    const id = await unpaid(at(windowEndMsAfterT0 - HOUR));
    return begin(id, at(windowEndMsAfterT0 - HOUR), usdToUnits(50));
  }

  it("marks the order paid when the notification was lost and the customer never came back", async () => {
    const attempt = await endedAttempt(HOUR);
    fake.addTransaction({
      orderId: attempt.midtrans_order_id,
      transactionId: "tx-lost",
    });
    expect(await reconcileDueAttempts(deps(at(HOUR + 11 * MIN)))).toBe(1);
    expect(order(attempt.order_id)).toMatchObject({
      payment_kind: "midtrans",
      paid_transaction_id: "tx-lost",
    });
    expect(holds()).toHaveLength(1);
  });

  it("checks at most 2 attempts per run, oldest due first, and only after the window has ended", async () => {
    const first = await endedAttempt(HOUR);
    const second = await endedAttempt(HOUR + 10 * MIN);
    const third = await endedAttempt(HOUR + 20 * MIN);
    // Nothing is due while every window is still running.
    expect(await reconcileDueAttempts(deps(at(HOUR - MIN)))).toBe(0);
    const now = at(2 * HOUR);
    expect(await reconcileDueAttempts(deps(now))).toBe(2);
    const checked = () =>
      attemptRows()
        .filter((a) => a.last_checked_at)
        .map((a) => a.id);
    expect(checked()).toEqual([first.id, second.id]);
    // The next run, a minute later, takes the one not yet checked.
    expect(
      await reconcileDueAttempts(deps(new Date(now.getTime() + MIN))),
    ).toBe(1);
    expect(checked()).toContain(third.id);
  });

  it("follows the schedule: every 10 minutes for 2 hours after the window, then hourly, then daily", async () => {
    const attempt = await endedAttempt(HOUR);
    const windowEnd = HOUR;
    // Midtrans cannot answer, so the attempt stays open through the schedule.
    fake.statusMode = "http_error";
    const run = (ms: number) => reconcileDueAttempts(deps(at(ms)));
    expect(await run(windowEnd + MIN)).toBe(1); // first check, never checked before
    expect(await run(windowEnd + 5 * MIN)).toBe(0); // not yet 10 minutes
    expect(await run(windowEnd + 12 * MIN)).toBe(1);
    expect(await run(windowEnd + 119 * MIN)).toBe(1); // still in the first 2 hours
    expect(await run(windowEnd + 130 * MIN)).toBe(0); // now hourly: 11 minutes since the last
    expect(await run(windowEnd + 181 * MIN)).toBe(1);
    expect(await run(windowEnd + 200 * MIN)).toBe(0);
    expect(await run(windowEnd + 5 * HOUR)).toBe(1);
    // After 24 hours: daily.
    expect(await run(windowEnd + 25 * HOUR)).toBe(0); // 20 hours since the last
    expect(await run(windowEnd + 29 * HOUR)).toBe(1);
    expect(await run(windowEnd + 40 * HOUR)).toBe(0);
    expect(await run(windowEnd + 53 * HOUR)).toBe(1);
    expect(attemptRows()[0]!.id).toBe(attempt.id);
  });

  it("a failing check never stops the next attempt, and a recently checked attempt is skipped (30 seconds)", async () => {
    const a = await endedAttempt(HOUR);
    const b = await endedAttempt(HOUR + MIN);
    fake.statusMode = "throw";
    expect(await reconcileDueAttempts(deps(at(2 * HOUR)))).toBe(2);
    expect(attemptRows().every((row) => row.check_failed_at)).toBe(true);
    // A status check by the page 10 seconds after is refused by the 30 s claim.
    expect(
      await checkAttempt(deps(at(2 * HOUR + 10_000)), attemptRows()[0]!),
    ).toBe("skipped");
    expect(a.id).not.toBe(b.id);
  });

  it("does not touch attempts that are no longer open", async () => {
    const attempt = await endedAttempt(HOUR);
    d1.query(
      `UPDATE payment_attempts SET status = 'closed_unknown' WHERE id = '${attempt.id}' RETURNING 1`,
    );
    expect(await reconcileDueAttempts(deps(at(3 * HOUR)))).toBe(0);
    expect(fake.requests).toEqual([]);
  });
});

describe("the order reads as it should while paying (store)", () => {
  it("orderInState refuses an unpaid order (R-18) and getOrder still shows its number", async () => {
    const id = await unpaid();
    await begin(id);
    expect(
      await orderInState(d1.db, {
        orderId: id,
        environment: "production",
        mode: "live",
        states: ["open"],
        now: T0,
      }),
    ).toBeNull();
    expect((await getOrder(d1.db, id))!.order_number).toMatch(/^NV-/);
  });
});
