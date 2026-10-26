import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  executeSyntheticLocalObservation,
  generateSyntheticLocalReport,
} from "../audit/local-direct-ten-audit";
import { applyStatus } from "../payments/apply";
import { ORDER_GROSS_AMOUNT_TEXT } from "../payments/midtrans";
import { openFileD1 } from "../spending/sqlite-d1.test-helper";
import { makeOrder, mailbox, markPaidForTest, T0 } from "./orders.test-helper";
import {
  ordersDueForPurge,
  purgeOldSpendRows,
  purgeOrder,
  RETENTION_MINUTE,
} from "./retention";
import { runOrders } from "./runner";
import { runSupport, type SupportDeps } from "./support";

// Record lifetimes (privacy page section 9, Spec 016 Q3): an order past its
// lifetime is made anonymous; payment records stay; a support hold, a lease
// or an open refund case keeps the order.

const DAY = 86_400_000;
let dir: string;
let d1: ReturnType<typeof openFileD1>;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-retention-"));
  d1 = openFileD1(join(dir, "retention.sqlite"));
});

afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
});

type Row = Record<string, unknown>;
const orderRow = (id: string) =>
  d1.query<Row>("SELECT * FROM orders WHERE id = ?", id)[0]!;

async function sql(statement: string, ...values: unknown[]) {
  await d1.db
    .prepare(statement)
    .bind(...values)
    .run();
}

/** An order that ended in `state` at `at`, with the rows a real order has. */
async function endedOrder(
  state: "delivered" | "failed" | "expired",
  at: Date,
  options: Parameters<typeof makeOrder>[1] = {},
) {
  const id = await makeOrder(d1.db, options);
  await sql(
    `UPDATE orders SET state = ?2, ended_at = ?3, intake_json = '{"x":1}',
       report_json = ?4, completed_at = ?5, link_hash = 'hash',
       questions_json = '[]', prepared_json = '{}', discovery_json = '{}'
     WHERE id = ?1`,
    id,
    state,
    at.toISOString(),
    state === "delivered" ? '{"report":1}' : null,
    state === "delivered" ? at.toISOString() : null,
  );
  await sql(
    `INSERT INTO order_questions (order_id, prompt_id, position, observation_json)
     VALUES (?1, 'NUAVE-DT-01', 1, '{"answer":"Kopi Nuave"}')`,
    id,
  );
  await sql(
    `INSERT INTO order_emails (id, order_id, kind, attempt, idempotency_key,
       result, created_at)
     VALUES (?2, ?1, 'ready', 1, 'key', 'accepted', ?3)`,
    id,
    `mail-${id}`,
    at.toISOString(),
  );
  return id;
}

/** A Midtrans payment attempt for the order, in `status`. */
async function attempt(
  orderId: string,
  status: string,
  number = "NV-ABCDEF-1",
) {
  await sql(
    `INSERT INTO payment_attempts (id, order_id, attempt_number,
       midtrans_order_id, window_start, window_end, status, created_at,
       updated_at)
     VALUES (?3, ?1, 1, ?3, ?2, ?2, ?4, ?2, ?2)`,
    orderId,
    T0.toISOString(),
    number,
    status,
  );
}

const due = (now: Date) =>
  ordersDueForPurge(d1.db, {
    environment: "production",
    mode: "synthetic",
    now,
    limit: 50,
  });

describe("which orders are due", () => {
  it("a delivered order after 12 months, not before", async () => {
    const id = await endedOrder("delivered", T0);
    expect(await due(new Date(T0.getTime() + 360 * DAY))).toEqual([]);
    expect(await due(new Date(T0.getTime() + 367 * DAY))).toEqual([id]);
  });

  it("a failed or expired order after 30 days, not before", async () => {
    const failed = await endedOrder("failed", T0);
    const expired = await endedOrder("expired", T0);
    expect(await due(new Date(T0.getTime() + 29 * DAY))).toEqual([]);
    expect((await due(new Date(T0.getTime() + 31 * DAY))).sort()).toEqual(
      [failed, expired].sort(),
    );
  });

  it("never an order still open or running", async () => {
    const open = await makeOrder(d1.db);
    await sql(
      `UPDATE orders SET expires_at = ?2 WHERE id = ?1`,
      open,
      T0.toISOString(),
    );
    const running = await makeOrder(d1.db);
    await sql(`UPDATE orders SET state = 'running' WHERE id = ?1`, running);
    expect(await due(new Date(T0.getTime() + 800 * DAY))).toEqual([]);
  });

  it("keeps a paid failed order until its refund is recorded", async () => {
    const id = await endedOrder("failed", T0);
    await markPaidForTest(d1.db, id, { kind: "midtrans", now: T0 });
    const later = new Date(T0.getTime() + 60 * DAY);
    expect(await due(later)).toEqual([]);
    await sql(
      `INSERT INTO payment_transactions (transaction_id, attempt_id,
         midtrans_status, outcome, refund_state, first_seen_at, updated_at)
       VALUES ('tx-1', 'attempt-1', 'settlement', 'paid', 'refunded', ?1, ?1)`,
      T0.toISOString(),
    );
    await sql(
      `UPDATE orders SET paid_transaction_id = 'tx-1' WHERE id = ?1`,
      id,
    );
    expect(await due(later)).toEqual([id]);
  });

  it("keeps an order with a payment that has no final answer", async () => {
    const id = await endedOrder("expired", T0);
    await attempt(id, "closed_unknown");
    expect(await due(new Date(T0.getTime() + 60 * DAY))).toEqual([]);
  });

  it("keeps an order with a payment attempt still open", async () => {
    const id = await endedOrder("expired", T0);
    await attempt(id, "open");
    expect(await due(new Date(T0.getTime() + 60 * DAY))).toEqual([]);
  });

  it("keeps an order with a settled payment not yet refunded", async () => {
    const id = await endedOrder("expired", T0);
    await attempt(id, "needs_refund");
    await sql(
      `INSERT INTO payment_transactions (transaction_id, attempt_id,
         midtrans_status, outcome, refund_state, first_seen_at, updated_at)
       VALUES ('tx-late', 'NV-ABCDEF-1', 'settlement', 'needs_refund',
         'none', ?1, ?1)`,
      T0.toISOString(),
    );
    const later = new Date(T0.getTime() + 60 * DAY);
    expect(await due(later)).toEqual([]);
    expect(await purgeOrder(d1.db, { orderId: id, now: later })).toBe(false);
  });

  it("a refund case closed without a refund (support norefund) lets the cleanup reach the order", async () => {
    const failed = await endedOrder("failed", T0);
    await markPaidForTest(d1.db, failed, { kind: "midtrans", now: T0 });
    const late = await endedOrder("expired", T0);
    await attempt(late, "needs_refund");
    await sql(
      `INSERT INTO payment_transactions (transaction_id, attempt_id,
         midtrans_status, outcome, refund_state, first_seen_at, updated_at)
       VALUES ('tx-late', 'NV-ABCDEF-1', 'settlement', 'needs_refund',
         'none', ?1, ?1)`,
      T0.toISOString(),
    );
    const later = new Date(T0.getTime() + 60 * DAY);
    expect(await due(later)).toEqual([]);
    await sql(
      `INSERT INTO refund_closures (order_id, kind, transaction_id, reason, closed_at)
       VALUES (?1, 'paid_order', '', 'declined', ?2)`,
      failed,
      T0.toISOString(),
    );
    // Closing the order's other kind of case does not close this one.
    await sql(
      `INSERT INTO refund_closures (order_id, kind, transaction_id, reason, closed_at)
       VALUES (?1, 'paid_order', '', 'declined', ?2)`,
      late,
      T0.toISOString(),
    );
    expect(await due(later)).toEqual([failed]);
    await sql(
      `INSERT INTO refund_closures (order_id, kind, transaction_id, reason, closed_at)
       VALUES (?1, 'payment', 'tx-late', 'declined', ?2)`,
      late,
      T0.toISOString(),
    );
    expect((await due(later)).sort()).toEqual([failed, late].sort());
  });

  it("a closed refund case still waits for a payment with no final answer", async () => {
    const id = await endedOrder("expired", T0);
    await attempt(id, "closed_unknown");
    await sql(
      `INSERT INTO refund_closures (order_id, kind, transaction_id, reason, closed_at)
       VALUES (?1, 'paid_order', '', 'settled', ?2)`,
      id,
      T0.toISOString(),
    );
    expect(await due(new Date(T0.getTime() + 60 * DAY))).toEqual([]);
  });

  it("never an order still reporting", async () => {
    const id = await endedOrder("failed", T0);
    await sql(
      `UPDATE orders SET state = 'reporting', completed_at = ?2 WHERE id = ?1`,
      id,
      T0.toISOString(),
    );
    const later = new Date(T0.getTime() + 800 * DAY);
    expect(await due(later)).toEqual([]);
    expect(await purgeOrder(d1.db, { orderId: id, now: later })).toBe(false);
  });

  it("skips a held or leased order, and other environments or modes", async () => {
    const held = await endedOrder("failed", T0);
    await sql(
      `UPDATE orders SET hold_until = ?2 WHERE id = ?1`,
      held,
      new Date(T0.getTime() + 90 * DAY).toISOString(),
    );
    const leased = await endedOrder("failed", T0);
    await sql(
      `UPDATE orders SET lease_until = ?2 WHERE id = ?1`,
      leased,
      new Date(T0.getTime() + 61 * DAY).toISOString(),
    );
    await endedOrder("failed", T0, { environment: "preview" });
    await endedOrder("failed", T0, { mode: "live", payment: "test" });
    expect(await due(new Date(T0.getTime() + 60 * DAY))).toEqual([]);
    expect(await due(new Date(T0.getTime() + 91 * DAY))).toEqual([
      held,
      leased,
    ]);
  });
});

describe("making an order anonymous", () => {
  it("removes personal data and keeps the bare order and payment link", async () => {
    const id = await endedOrder("delivered", T0, { payment: "paid" });
    await sql(
      `INSERT INTO payment_emails (id, order_id, attempt, idempotency_key,
         result, created_at)
       VALUES ('pay-mail', ?1, 1, 'key', 'accepted', ?2)`,
      id,
      T0.toISOString(),
    );
    await attempt(id, "paid");
    await sql(
      `INSERT INTO payment_transactions (transaction_id, attempt_id,
         midtrans_status, outcome, refund_state, first_seen_at, updated_at)
       VALUES ('tx-paid', 'NV-ABCDEF-1', 'settlement', 'paid', 'none', ?1, ?1)`,
      T0.toISOString(),
    );
    // Spec 021: a server Purchase was sent for this order.
    await sql(
      `UPDATE orders SET meta_sent_at = ?2, meta_consent_version = '1.4',
         meta_outcome = 'sent' WHERE id = ?1`,
      id,
      T0.toISOString(),
    );
    const spendRows = d1.query("SELECT id FROM provider_spend").length;
    const before = orderRow(id);
    expect(before.meta_event_id).toBeTruthy();
    const now = new Date(T0.getTime() + 400 * DAY);
    expect(await purgeOrder(d1.db, { orderId: id, now })).toBe(true);
    const row = orderRow(id);
    expect(row).toMatchObject({
      email: "",
      business_name: "",
      website: "",
      intake_json: null,
      prepared_json: null,
      discovery_json: null,
      questions_json: null,
      report_json: null,
      link_hash: null,
      link_off: 1,
      // Spec 021 R-21 (AC-10): the event code goes; the send record stays.
      meta_event_id: null,
      meta_sent_at: T0.toISOString(),
      meta_consent_version: "1.4",
      meta_outcome: "sent",
      purged_at: now.toISOString(),
      // Kept: the order number, state, dates and payment link.
      order_number: before.order_number,
      state: "delivered",
      paid_at: before.paid_at,
      payment_kind: "midtrans",
    });
    expect(
      d1.query("SELECT * FROM order_questions WHERE order_id = ?", id),
    ).toEqual([]);
    expect(
      d1.query("SELECT * FROM order_emails WHERE order_id = ?", id),
    ).toEqual([]);
    expect(
      d1.query("SELECT * FROM payment_emails WHERE order_id = ?", id),
    ).toEqual([]);
    // Payment and cost records stay.
    expect(
      d1.query("SELECT * FROM payment_attempts WHERE order_id = ?", id),
    ).toHaveLength(1);
    expect(d1.query("SELECT * FROM payment_transactions")).toHaveLength(1);
    expect(d1.query("SELECT id FROM provider_spend")).toHaveLength(spendRows);
    expect(JSON.stringify(row)).not.toContain("owner@example.com");
    expect(JSON.stringify(row)).not.toContain("Kopi Nuave");
    // A second purge does nothing.
    expect(await purgeOrder(d1.db, { orderId: id, now })).toBe(false);
  });

  it("does nothing to an order a hold or a lease claimed in between", async () => {
    const id = await endedOrder("failed", T0);
    const now = new Date(T0.getTime() + 60 * DAY);
    await sql(
      `UPDATE orders SET hold_until = ?2 WHERE id = ?1`,
      id,
      new Date(now.getTime() + DAY).toISOString(),
    );
    expect(await purgeOrder(d1.db, { orderId: id, now })).toBe(false);
    expect(orderRow(id).email).toBe("owner@example.com");
    expect(
      d1.query("SELECT * FROM order_questions WHERE order_id = ?", id),
    ).toHaveLength(1);

    await sql(`UPDATE orders SET hold_until = NULL WHERE id = ?1`, id);
    await sql(
      `UPDATE orders SET lease_until = ?2 WHERE id = ?1`,
      id,
      new Date(now.getTime() + 60_000).toISOString(),
    );
    expect(await purgeOrder(d1.db, { orderId: id, now })).toBe(false);
    expect(orderRow(id).email).toBe("owner@example.com");
  });

  it("a late payment never revives an anonymised order", async () => {
    const id = await endedOrder("expired", T0, {
      mode: "live",
      payment: "unpaid",
    });
    await attempt(id, "finally_unpaid");
    const later = new Date(T0.getTime() + 60 * DAY);
    const due = await ordersDueForPurge(d1.db, {
      environment: "production",
      mode: "live",
      now: later,
      limit: 10,
    });
    expect(due).toEqual([id]);
    expect(await purgeOrder(d1.db, { orderId: id, now: later })).toBe(true);
    const result = await applyStatus(
      {
        db: d1.db,
        now: later,
        limitUnits: 200_000_000,
        dailyLimitUnits: 500_000_000,
      },
      {
        transaction_id: "tx-after-purge",
        order_id: "NV-ABCDEF-1",
        transaction_status: "settlement",
        fraud_status: "accept",
        gross_amount: ORDER_GROSS_AMOUNT_TEXT,
        currency: "IDR",
        payment_type: "qris",
      },
    );
    expect(result).toBe("needs_refund");
    expect(orderRow(id)).toMatchObject({
      state: "expired",
      paid_at: null,
      email: "",
    });
  });
});

describe("cost records", () => {
  it("removes settled rows older than 24 months only", async () => {
    const insert = (id: string, at: Date, settled: boolean) =>
      sql(
        `INSERT INTO provider_spend (id, day, status, provider, stage,
           reserved_units, held_units, created_at, settled_at)
         VALUES (?1, ?2, 'settled', 'openai', 'observation', 1, 1, ?3, ?4)`,
        id,
        at.toISOString().slice(0, 10),
        at.toISOString(),
        settled ? at.toISOString() : null,
      );
    await insert("old-settled", T0, true);
    await insert("old-open", T0, false);
    await insert("recent", new Date(T0.getTime() + 400 * DAY), true);
    const removed = await purgeOldSpendRows(d1.db, {
      now: new Date(T0.getTime() + 740 * DAY),
      limit: 200,
    });
    expect(removed).toBe(1);
    expect(
      d1
        .query<{ id: string }>("SELECT id FROM provider_spend ORDER BY id")
        .map((row) => row.id),
    ).toEqual(["old-open", "recent"]);
  });
});

describe("the hourly run", () => {
  const runAt = (minute: number) => {
    const now = new Date(T0.getTime() + 400 * DAY);
    now.setUTCMinutes(minute);
    return runOrders({
      db: d1.db,
      environment: "production",
      mode: "synthetic",
      siteOrigin: "https://v2.nuave.test",
      now: () => now,
      execute: executeSyntheticLocalObservation,
      generateReport: generateSyntheticLocalReport,
      sender: mailbox().sender,
      sleep: async () => {},
    });
  };

  it("cleans up only in the run at the retention minute", async () => {
    const id = await endedOrder("delivered", T0);
    expect((await runAt(RETENTION_MINUTE + 1)).outcomes).not.toContain(
      "purged",
    );
    expect(orderRow(id).purged_at).toBeNull();
    expect((await runAt(RETENTION_MINUTE)).outcomes).toContain("purged");
    expect(orderRow(id).email).toBe("");
  });
});

describe("support hold", () => {
  const support = (args: string[], now: Date) => {
    const output: string[] = [];
    const deps: SupportDeps = {
      db: d1.db,
      makeSender: async () => mailbox().sender,
      siteOrigin: "https://v2.nuave.test",
      now: () => now,
      out: (line) => output.push(line),
    };
    return runSupport(args, deps).then((code) => ({ code, output }));
  };

  it("keeps an order past its lifetime, and 0 releases it", async () => {
    const id = await endedOrder("failed", T0);
    const number = orderRow(id).order_number as string;
    const { code } = await support(["hold", number, "90"], T0);
    expect(code).toBe(0);
    expect(await due(new Date(T0.getTime() + 60 * DAY))).toEqual([]);
    expect((await support(["hold", number, "0"], T0)).code).toBe(0);
    expect(await due(new Date(T0.getTime() + 60 * DAY))).toEqual([id]);
  });

  it("refuses bad days and an order already made anonymous", async () => {
    const id = await endedOrder("failed", T0);
    const number = orderRow(id).order_number as string;
    expect((await support(["hold", number, "400"], T0)).code).toBe(2);
    expect((await support(["hold", number, "abc"], T0)).code).toBe(2);
    expect((await support(["hold", number], T0)).code).toBe(2);
    await purgeOrder(d1.db, {
      orderId: id,
      now: new Date(T0.getTime() + 60 * DAY),
    });
    expect((await support(["hold", number, "30"], T0)).code).toBe(1);
    const shown = await support(["show", number], T0);
    expect(shown.output.join("\n")).toContain("Made anonymous");
  });
});
