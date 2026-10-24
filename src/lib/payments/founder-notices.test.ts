import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  executeSyntheticLocalObservation,
  generateSyntheticLocalReport,
} from "../audit/local-direct-ten-audit";
import { approve, mailbox, makeOrder, T0 } from "../orders/orders.test-helper";
import { runOrders, type RunnerDeps } from "../orders/runner";
import { ORDER_PAID_MS } from "../orders/store";
import { usdToUnits } from "../spending/spend-ledger";
import { openFileD1 } from "../spending/sqlite-d1.test-helper";
import { noticeEmail, recordCapAlerts } from "./founder-notices";
import { recordFounderNotice } from "./notices";

// Spec 017 S4c: founder notices (R-21, AC-18), the payment-received email (R-22,
// AC-19), the 7-day sweep (R-13, AC-14) and the privacy of every new email and
// key (AC-06), on the real runner, the real ledger and the fake mailbox.

const FOUNDER = "founder@example.test";
const CUSTOMER = "customer@example.test";
const DAILY = usdToUnits(10);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

let dir: string;
let d1: ReturnType<typeof openFileD1>;
let clock: Date;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-notices-"));
  d1 = openFileD1(join(dir, "notices.sqlite"));
  clock = T0;
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
});
const advance = (ms: number) => {
  clock = new Date(clock.getTime() + ms);
};

function deps(
  sender: RunnerDeps["sender"],
  extra: Partial<RunnerDeps> = {},
): RunnerDeps {
  return {
    db: d1.db,
    environment: "production",
    mode: "live",
    siteOrigin: "https://v2.nuave.test",
    now: () => clock,
    execute: async (input) => executeSyntheticLocalObservation(input),
    generateReport: async (...args) => generateSyntheticLocalReport(...args),
    sender,
    sleep: async () => {},
    payments: {
      midtrans: null,
      limitUnits: usdToUnits(2),
      dailyLimitUnits: DAILY,
      founderEmail: FOUNDER,
    },
    ...extra,
  };
}
const run = (sender: RunnerDeps["sender"], extra: Partial<RunnerDeps> = {}) =>
  runOrders(deps(sender, extra));
const notices = () =>
  d1.query<{ kind: string; subject: string; status: string }>(
    "SELECT kind, subject, status FROM founder_notices ORDER BY kind",
  );
const toFounder = (mail: ReturnType<typeof mailbox>) =>
  mail.sent.filter((message) => message.to === FOUNDER);
const toCustomer = (mail: ReturnType<typeof mailbox>) =>
  mail.sent.filter((message) => message.to === CUSTOMER);
const orderNumberOf = (id: string) =>
  d1.query<{ order_number: string }>(
    `SELECT order_number FROM orders WHERE id = '${id}'`,
  )[0]!.order_number;

/** A paid live order holding `limitUsd` of today's cap. */
const paid = (limitUsd = 2, email = CUSTOMER) =>
  makeOrder(d1.db, {
    mode: "live",
    payment: "paid",
    limitUsd,
    dailyLimitUsd: 100,
    email,
    now: clock,
  });

describe("cap alerts (R-21, AC-18)", () => {
  it("80%, 90% and 100% each send one email per UTC day, also after a restart and with two overlapping runs", async () => {
    const mail = mailbox();
    const emails = () => toFounder(mail).map((message) => message.subject);
    for (let i = 0; i < 3; i += 1) await paid(2); // USD 6 of 10
    await run(mail.sender);
    expect(emails()).toEqual([]);
    await paid(2); // USD 8: 80%
    await Promise.all([run(mail.sender), run(mail.sender)]); // overlapping runs
    expect(emails()).toHaveLength(1);
    expect(emails()[0]).toContain("80%");
    advance(5 * 60_000);
    await run(mail.sender); // a restart: the claim is in the table
    expect(emails()).toHaveLength(1);
    await paid(1); // USD 9: 90%
    await run(mail.sender);
    await paid(1); // USD 10: 100%
    await run(mail.sender);
    advance(5 * 60_000);
    await run(mail.sender);
    expect(emails().map((subject) => /(\d+)%/.exec(subject)![1])).toEqual([
      "80",
      "90",
      "100",
    ]);
    expect(notices().map((row) => `${row.kind}:${row.status}`)).toEqual([
      "cap_100:sent",
      "cap_80:sent",
      "cap_90:sent",
    ]);
  });

  it("two levels passed at once send one email naming the highest and record both", async () => {
    const mail = mailbox();
    for (let i = 0; i < 4; i += 1) await paid(2);
    await paid(1.2); // USD 9.2 at the first look: 80% and 90%
    await run(mail.sender);
    expect(toFounder(mail)).toHaveLength(1);
    expect(toFounder(mail)[0]!.subject).toContain("90%");
    expect(notices().map((row) => row.kind)).toEqual(["cap_80", "cap_90"]);
    expect(notices().every((row) => row.status === "sent")).toBe(true);
  });

  it("a lower level an overlapping run left pending is set to sent: only the highest is ever sent", async () => {
    const mail = mailbox();
    for (let i = 0; i < 4; i += 1) await paid(2); // USD 8: 80%
    // A run that saw only 80% recorded it and has not sent it yet.
    await recordCapAlerts(d1.db, { now: clock, dailyLimitUnits: DAILY });
    expect(notices()).toEqual([
      { kind: "cap_80", subject: "2026-10-12", status: "pending" },
    ]);
    await paid(1.2); // USD 9.2: 90% too, before the first email went out
    await run(mail.sender);
    expect(toFounder(mail)).toHaveLength(1);
    expect(toFounder(mail)[0]!.subject).toContain("90%");
    expect(notices().map((row) => `${row.kind}:${row.status}`)).toEqual([
      "cap_80:sent",
      "cap_90:sent",
    ]);
  });

  it("the next UTC day starts again from nothing", async () => {
    const mail = mailbox();
    for (let i = 0; i < 4; i += 1) await paid(2);
    await run(mail.sender);
    expect(toFounder(mail)).toHaveLength(1);
    advance(DAY);
    await run(mail.sender);
    expect(toFounder(mail)).toHaveLength(1); // a new day with nothing spent yet
    for (let i = 0; i < 4; i += 1) await paid(2);
    await run(mail.sender);
    expect(toFounder(mail)).toHaveLength(2);
    expect(notices().filter((row) => row.kind === "cap_80")).toHaveLength(2);
  });

  it("says how to raise the cap: ci.yml and a deploy, not the dashboard alone", async () => {
    const mail = mailbox();
    for (let i = 0; i < 4; i += 1) await paid(2);
    await recordFounderNotice(d1.db, {
      kind: "cap_full",
      subject: "2026-10-12",
      now: clock,
    });
    await run(mail.sender);
    await run(mail.sender);
    const bodies = toFounder(mail).map((message) => message.text);
    expect(bodies).toHaveLength(2);
    for (const body of bodies) {
      expect(body).toContain("NUAVE_DAILY_SPEND_LIMIT_USD");
      expect(body).toContain("ci.yml");
      expect(body).toContain("overwritten by the next deploy");
    }
  });
});

describe("per-subject notices (R-21, AC-18)", () => {
  it("each is sent once ever, never again on a later day", async () => {
    const mail = mailbox();
    const write = () =>
      recordFounderNotice(d1.db, {
        kind: "chargeback",
        subject: "tx-1",
        detail: {
          order_number: "NV-AAAAAA",
          amount: "249000.00",
          method: "qris",
        },
        now: clock,
      });
    expect(await write()).toBe(true);
    await run(mail.sender);
    expect(toFounder(mail)).toHaveLength(1);
    advance(2 * DAY);
    expect(await write()).toBe(false);
    await run(mail.sender);
    expect(toFounder(mail)).toHaveLength(1);
  });

  it("a notice recorded in a web request waits for the cron: nothing is sent when it is written", async () => {
    const mail = mailbox();
    await recordFounderNotice(d1.db, {
      kind: "cap_full",
      subject: "2026-10-12",
      now: clock,
    });
    expect(mail.sent).toEqual([]);
    await run(mail.sender);
    expect(toFounder(mail)).toHaveLength(1);
  });

  it("refund-case notices keep retrying until sent; the others stop after 24 hours", async () => {
    let accept = false;
    const mail = mailbox(() => accept);
    await recordFounderNotice(d1.db, {
      kind: "needs_refund",
      subject: "tx-9",
      detail: {
        order_number: "NV-BBBBBB",
        amount: "249000.00",
        method: "dana",
      },
      now: clock,
    });
    await recordFounderNotice(d1.db, {
      kind: "cap_full",
      subject: "2026-10-12",
      now: clock,
    });
    for (let i = 0; i < 6; i += 1) {
      await run(mail.sender);
      advance(HOUR);
    }
    advance(2 * DAY);
    await run(mail.sender);
    // Three days later the refund case still waits; the cap notice was dropped.
    expect(notices().map((row) => `${row.kind}:${row.status}`)).toEqual([
      "cap_full:pending",
      "needs_refund:pending",
    ]);
    const tries = mail.sent.length;
    accept = true;
    advance(2 * HOUR); // past the retry backoff
    await run(mail.sender);
    await run(mail.sender);
    expect(mail.sent.length).toBe(tries + 1);
    expect(notices().map((row) => `${row.kind}:${row.status}`)).toEqual([
      "cap_full:pending",
      "needs_refund:sent",
    ]);
  });

  it("every try is a new idempotency key, one try keeps its own; no order or customer detail is in a key", async () => {
    const mail = mailbox(() => false);
    await recordFounderNotice(d1.db, {
      kind: "needs_refund",
      subject: "tx-7",
      detail: { order_number: "NV-CCCCCC" },
      now: clock,
    });
    await run(mail.sender);
    advance(HOUR);
    await run(mail.sender);
    const keys = new Set(mail.sent.map((message) => message.idempotencyKey));
    expect(keys.size).toBe(2); // three sends inside a try share one key
    for (const key of keys) {
      expect(key).toMatch(/^nuave-notice-[0-9a-f-]{36}-\d+$/);
    }
  });
});

describe("paid orders that fail (R-21, AC-18) and the 7-day sweep (R-13, AC-14)", () => {
  it.each(["refunded", "chargeback"])(
    "no paid_order_failed notice when the paying transaction was already %s after approval",
    async (refundState) => {
      const mail = mailbox();
      const id = await paid(2);
      await approve(d1.db, id, { mode: "live", now: clock });
      d1.query(`INSERT INTO payment_attempts
        (id, order_id, attempt_number, midtrans_order_id, window_start, window_end, status, created_at, updated_at)
        VALUES ('att1', '${id}', 1, 'NV-TEST01-1', '${clock.toISOString()}', '${clock.toISOString()}', 'paid', '${clock.toISOString()}', '${clock.toISOString()}')`);
      d1.query(`INSERT INTO payment_transactions
        (transaction_id, attempt_id, midtrans_status, outcome, refund_state, first_seen_at, updated_at)
        VALUES ('tx1', 'att1', 'settlement', 'paid', '${refundState}', '${clock.toISOString()}', '${clock.toISOString()}')`);
      d1.query(
        `UPDATE orders SET paid_transaction_id = 'tx1', paid_attempt_id = 'att1' WHERE id = '${id}'`,
      );
      advance(25 * HOUR);
      await run(mail.sender, { auditEnabled: true });
      expect(
        d1.query<{ state: string }>(
          `SELECT state FROM orders WHERE id = '${id}'`,
        )[0]!.state,
      ).toBe("failed");
      expect(
        notices().filter((row) => row.kind === "paid_order_failed"),
      ).toEqual([]);
    },
  );

  it("a paid order that ends failed records one paid_order_failed notice with its order number, amount and method", async () => {
    const mail = mailbox();
    const id = await paid(2);
    await approve(d1.db, id, { mode: "live", now: clock });
    const number = orderNumberOf(id);
    // The 24-hour deadline passes before any audit step ran (no AI at all).
    advance(25 * HOUR);
    await run(mail.sender, { auditEnabled: true });
    expect(notices().filter((row) => row.kind === "paid_order_failed")).toEqual(
      [{ kind: "paid_order_failed", subject: number, status: "sent" }],
    );
    const founder = toFounder(mail).find((message) =>
      message.subject.includes(number),
    )!;
    expect(founder.text).toContain(`Order number: ${number}`);
    expect(founder.text).toContain("Rp249.000");
    expect(founder.text).toContain("three business days");
    // The customer got the S3 failure email with the number.
    const failure = toCustomer(mail).find((message) =>
      message.subject.includes("belum bisa"),
    )!;
    expect(failure.text).toContain(number);
    // Another run, another day: still one notice and one email.
    advance(DAY);
    await run(mail.sender);
    expect(toFounder(mail)).toHaveLength(1);
  });

  it("a test pass or legacy order that fails records no notice; a refund ending records none", async () => {
    const mail = mailbox();
    for (const payment of ["test", "legacy"] as const) {
      const id = await makeOrder(d1.db, {
        mode: "live",
        payment,
        email: CUSTOMER,
        now: clock,
        dailyLimitUsd: 100,
      });
      await approve(d1.db, id, { mode: "live", now: clock });
    }
    advance(25 * HOUR);
    const result = await run(mail.sender);
    expect(result.outcomes.filter((o) => o === "failed_deadline")).toHaveLength(
      1,
    );
    await run(mail.sender);
    expect(notices().filter((row) => row.kind.startsWith("paid_"))).toEqual([]);
  });

  it("a simulated payment took no money: its failure or 7-day end records no refund notice", async () => {
    const mail = mailbox();
    const failing = await makeOrder(d1.db, {
      payment: "simulated",
      email: CUSTOMER,
      now: clock,
      dailyLimitUsd: 100,
    });
    await approve(d1.db, failing, { now: clock });
    await makeOrder(d1.db, {
      payment: "simulated",
      email: CUSTOMER,
      now: clock,
      dailyLimitUsd: 100,
    });
    advance(25 * HOUR);
    await run(mail.sender, { mode: "synthetic" });
    advance(8 * DAY);
    await run(mail.sender, { mode: "synthetic" });
    const states = d1.query<{ state: string; failure_code: string }>(
      "SELECT state, failure_code FROM orders ORDER BY created_at",
    );
    expect(states.map((row) => row.state)).toEqual(["failed", "failed"]);
    expect(notices().filter((row) => row.kind.startsWith("paid_"))).toEqual([]);
  });

  it("a paid order not approved within 7 days ends paid_not_started: hold returned, failure email with the number, one notice", async () => {
    const mail = mailbox();
    const id = await paid(2);
    const number = orderNumberOf(id);
    advance(7 * DAY - 1000);
    await run(mail.sender);
    expect(
      d1.query<{ state: string }>(
        `SELECT state FROM orders WHERE id = '${id}'`,
      )[0]!.state,
    ).toBe("open");
    advance(2000);
    const result = await run(mail.sender);
    expect(result.outcomes).toContain("paid_not_started");
    const row = d1.query<{ state: string; failure_code: string }>(
      `SELECT state, failure_code FROM orders WHERE id = '${id}'`,
    )[0]!;
    expect(row).toEqual({ state: "failed", failure_code: "paid_not_started" });
    // The hold is settled to what the order spent (nothing): returned.
    expect(
      d1.query<{ status: string; held_units: number }>(
        `SELECT status, held_units FROM provider_spend WHERE order_id = '${id}' AND kind = 'order_hold'`,
      ),
    ).toEqual([{ status: "settled", held_units: 0 }]);
    const failure = toCustomer(mail).filter((message) =>
      message.subject.includes("belum bisa"),
    );
    expect(failure).toHaveLength(1);
    expect(failure[0]!.text).toContain(number);
    expect(notices().filter((n) => n.kind === "paid_not_started")).toEqual([
      { kind: "paid_not_started", subject: number, status: "sent" },
    ]);
    expect(notices().filter((n) => n.kind === "paid_order_failed")).toEqual([]);
    const founder = toFounder(mail).find((message) =>
      message.subject.includes(number),
    )!;
    expect(founder.text).toContain("three business days");
    // Once only, however many runs follow.
    for (let i = 0; i < 3; i += 1) {
      advance(DAY);
      await run(mail.sender);
    }
    expect(
      toCustomer(mail).filter((message) =>
        message.subject.includes("belum bisa"),
      ),
    ).toHaveLength(1);
    expect(
      toFounder(mail).filter((m) => m.subject.includes(number)),
    ).toHaveLength(1);
  });

  it("an approved paid order is not swept at 7 days, and a test pass keeps the 2-hour rule", async () => {
    const mail = mailbox();
    const approved = await paid(2);
    await approve(d1.db, approved, { mode: "live", now: clock });
    const test = await makeOrder(d1.db, {
      mode: "live",
      payment: "test",
      email: CUSTOMER,
      now: clock,
      dailyLimitUsd: 100,
    });
    advance(2 * HOUR);
    await run(mail.sender, { auditEnabled: false });
    const state = (id: string) =>
      d1.query<{ state: string }>(
        `SELECT state FROM orders WHERE id = '${id}'`,
      )[0]!.state;
    expect(state(test)).toBe("expired");
    expect(state(approved)).toBe("running");
    advance(ORDER_PAID_MS);
    await run(mail.sender, { auditEnabled: false });
    expect(state(approved)).toBe("running"); // the 24-hour deadline, not 7 days
  });
});

describe("the payment-received email (R-22, AC-19)", () => {
  it("is sent once after payment, with the number, amount, promise and same-browser line, and no link or secret", async () => {
    const mail = mailbox();
    const id = await paid(2);
    const number = orderNumberOf(id);
    await run(mail.sender);
    const sent = toCustomer(mail);
    expect(sent).toHaveLength(1);
    const message = sent[0]!;
    expect(message.subject).toBe("Pembayaran Nuave Anda sudah diterima");
    expect(message.text).toContain("Kopi Nuave");
    expect(message.text).toContain(`Nomor pesanan: ${number}`);
    expect(message.text).toContain("Rp249.000");
    expect(message.text).toContain(
      "Laporan siap dalam 15 menit setelah audit dimulai. Jika ada bagian yang gagal diperiksa, tim kami membantu menyelesaikannya; jika tidak dapat diselesaikan, kami kembalikan uang Anda.",
    );
    expect(message.text).toContain(
      "Lanjutkan di browser yang sama untuk mengisi data bisnis Anda",
    );
    expect(message.text).toContain("support@nuave.ai");
    expect(message.text + message.html).not.toMatch(/https?:|\/r#|<a /);
    expect(message.idempotencyKey).toBe(`nuave-order-${number}-payment-1`);
    expect(d1.query("SELECT result FROM payment_emails")).toEqual([
      { result: "accepted" },
    ]);
    // A later run sends nothing more (a duplicate notification changes nothing).
    advance(HOUR);
    await run(mail.sender);
    expect(toCustomer(mail)).toHaveLength(1);
  });

  it("a rejected send is tried again later with its own key, and stops once accepted", async () => {
    let accept = false;
    const mail = mailbox(() => accept);
    const id = await paid(2);
    await run(mail.sender);
    advance(5 * 60_000);
    await run(mail.sender);
    accept = true;
    advance(HOUR);
    await run(mail.sender);
    await run(mail.sender);
    const keys = [...new Set(toCustomer(mail).map((m) => m.idempotencyKey))];
    expect(keys).toEqual([
      `nuave-order-${orderNumberOf(id)}-payment-1`,
      `nuave-order-${orderNumberOf(id)}-payment-2`,
      `nuave-order-${orderNumberOf(id)}-payment-3`,
    ]);
    expect(
      d1
        .query<{ result: string }>(
          "SELECT result FROM payment_emails ORDER BY attempt",
        )
        .map((row) => row.result),
    ).toEqual(["failed", "failed", "accepted"]);
  });

  it("goes out with the emergency switch off and AI settings missing, and never for a test pass or a refunded order", async () => {
    const mail = mailbox();
    await paid(2);
    await makeOrder(d1.db, {
      mode: "live",
      payment: "test",
      email: "other@example.test",
      now: clock,
      dailyLimitUsd: 100,
    });
    const refunded = await paid(2, "refunded@example.test");
    d1.query(
      `UPDATE orders SET state = 'failed', failure_code = 'refunded' WHERE id = '${refunded}' RETURNING 1`,
    );
    const result = await run(mail.sender, { auditEnabled: false });
    expect(result.outcomes).toContain("payment_email");
    expect(mail.sent.map((message) => message.to)).toEqual([CUSTOMER]);
  });

  it("gives an order made by S3 code its number before the email", async () => {
    const mail = mailbox();
    const id = await paid(2);
    d1.query(
      `UPDATE orders SET order_number = NULL WHERE id = '${id}' RETURNING 1`,
    );
    await run(mail.sender);
    const number = orderNumberOf(id);
    expect(number).toMatch(/^NV-/);
    expect(toCustomer(mail)[0]!.text).toContain(number);
  });
});

describe("no internal order ID, customer email or secret in a new email, key or log (AC-06)", () => {
  it("every message, key and console line of the new tasks is free of the order ID and of the customer's email in a founder notice", async () => {
    const logs: string[] = [];
    const original = {
      log: console.log,
      warn: console.warn,
      error: console.error,
    };
    console.log = (...args) => void logs.push(args.join(" "));
    console.warn = (...args) => void logs.push(args.join(" "));
    console.error = (...args) => void logs.push(args.join(" "));
    try {
      const mail = mailbox();
      const ids = [await paid(2), await paid(2)];
      await approve(d1.db, ids[0]!, { mode: "live", now: clock });
      advance(25 * HOUR); // one fails at the deadline: paid_order_failed
      await run(mail.sender);
      advance(8 * DAY); // the other is not started in 7 days
      await run(mail.sender);
      await run(mail.sender);
      expect(mail.sent.length).toBeGreaterThan(3);
      const everything = JSON.stringify(mail.sent) + logs.join("\n");
      for (const id of ids) expect(everything).not.toContain(id);
      for (const message of toFounder(mail)) {
        expect(JSON.stringify(message)).not.toContain(CUSTOMER);
      }
    } finally {
      Object.assign(console, original);
    }
  });

  it("the notice rows hold no internal order ID either", async () => {
    const mail = mailbox();
    const id = await paid(2);
    advance(8 * DAY);
    await run(mail.sender);
    expect(
      JSON.stringify(d1.query("SELECT * FROM founder_notices")),
    ).not.toContain(id);
  });
});

describe("the founder email for each kind (R-21)", () => {
  const detail = JSON.stringify({
    order_number: "NV-7K3Q9P",
    midtrans_order_id: "NV-7K3Q9P-1",
    amount: "249000.00",
    method: "bank_transfer",
    reason: "wrong_amount_or_currency",
  });
  it.each([
    "paid_order_failed",
    "paid_not_started",
    "needs_refund",
    "payment_unknown",
  ])(
    "%s: what happened, the order number, the amount and method, and the refund deadline",
    (kind) => {
      const mail = noticeEmail({ kind, subject: "tx-1", detail_json: detail });
      expect(mail.text).toContain("Order number: NV-7K3Q9P");
      expect(mail.text).toContain("Rp249.000");
      expect(mail.text).toContain("bank_transfer");
      expect(mail.text).toContain("three business days");
      expect(mail.subject).toContain("NV-7K3Q9P");
    },
  );
  it.each([
    "partial_refund",
    "partial_chargeback",
    "chargeback",
    "late_payment_over_cap",
    "notification_rejected",
    "cap_full",
  ])("%s has a body that says what to do", (kind) => {
    const mail = noticeEmail({
      kind,
      subject: "2026-10-12",
      detail_json: detail,
    });
    expect(mail.text.split("\n").length).toBeGreaterThanOrEqual(2);
    expect(mail.html).toContain("<p>");
  });
  it("escapes what it shows in the html", () => {
    const mail = noticeEmail({
      kind: "needs_refund",
      subject: "x",
      detail_json: JSON.stringify({ order_number: "<b>NV</b>" }),
    });
    expect(mail.html).not.toContain("<b>");
  });
});
