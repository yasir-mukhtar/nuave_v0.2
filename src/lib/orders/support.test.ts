import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

import { POST as reportPOST } from "../../app/api/report/route";
import {
  executeSyntheticLocalObservation,
  generateSyntheticLocalReport,
} from "../audit/local-direct-ten-audit";
import {
  savedReportEvidence,
  type SavedReportData,
} from "../audit/customer-evidence-export";
import { applyRefund, applyStatus } from "../payments/apply";
import { paymentView, startAttempt } from "../payments/attempts";
import { createFakeMidtrans } from "../payments/fake-midtrans.test-helper";
import { getStatus } from "../payments/midtrans";
import { reserveOrderCall, usdToUnits } from "../spending/spend-ledger";
import { openFileD1 } from "../spending/sqlite-d1.test-helper";
import { runOrders, type RunnerDeps } from "./runner";
import { createOrder, getOrder } from "./store";
import {
  approve,
  makeOrder,
  mailbox,
  secretIn,
  T0,
} from "./orders.test-helper";
import {
  d1ThroughWrangler,
  runSupport,
  sqlLiteral,
  SUPPORT_USAGE,
  type SupportDeps,
} from "./support";

// Spec 016 R-32, AC-17, and the `show` part of AC-09: the support commands on a
// test database with a fake sender. The same logic runs in the founder's script
// against D1 through wrangler.

const EMAIL = "owner@example.com";
const SITE = "https://v2.nuave.test";
let dir: string;
let d1: ReturnType<typeof openFileD1>;
let clock: Date;
let fetchSpy: ReturnType<typeof vi.fn>;
let output: string[];
let sqlSeen: string[];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-support-"));
  d1 = openFileD1(join(dir, "support.sqlite"));
  clock = T0;
  output = [];
  sqlSeen = [];
  fetchSpy = vi.fn(async () => new Response("{}", { status: 500 }));
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubEnv("NUAVE_ENVIRONMENT", "production");
  mocks.getCloudflareContext.mockReturnValue({
    env: {
      SPEND_DB: d1.db,
      REPORT_DATA_CALLER_RATE_LIMITER: {
        limit: async () => ({ success: true }),
      },
    },
  });
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  mocks.getCloudflareContext.mockReset();
});

const advance = (ms: number) => {
  clock = new Date(clock.getTime() + ms);
};

/** A delivered order (synthetic run), switched to `live` so `resend` may send
 * (the sender here is a fake mailbox). */
async function deliveredOrder(mode: "live" | "synthetic" = "live") {
  const id = await makeOrder(d1.db, { email: EMAIL, now: clock });
  await approve(d1.db, id, { now: clock });
  const mail = mailbox();
  const deps: RunnerDeps = {
    db: d1.db,
    environment: "production",
    mode: "synthetic",
    siteOrigin: SITE,
    now: () => clock,
    execute: async (input) => executeSyntheticLocalObservation(input),
    generateReport: async (...args) => generateSyntheticLocalReport(...args),
    sender: mail.sender,
  };
  for (let i = 0; i < 12; i += 1) {
    await runOrders(deps);
    advance(60_000);
  }
  if (mode === "live") {
    await d1.db
      .prepare(`UPDATE orders SET mode = 'live' WHERE id = '${id}'`)
      .bind()
      .run();
  }
  return { id, firstSecret: secretIn(mail.sent[0]!) };
}

function support(
  overrides: Partial<SupportDeps> & {
    sender?: ReturnType<typeof mailbox>;
  } = {},
) {
  const sender = overrides.sender ?? mailbox();
  const makeSender = vi.fn(async () => sender.sender);
  const deps: SupportDeps = {
    db: d1.db,
    makeSender,
    siteOrigin: SITE,
    now: () => clock,
    sleep: async () => {},
    out: (line) => output.push(line),
    ...overrides,
  };
  return {
    sender,
    makeSender,
    run: (...args: string[]) => runSupport(args, deps),
  };
}

const openLink = (secret: string) =>
  reportPOST(
    new Request("https://nuave.test/api/report", {
      method: "POST",
      body: JSON.stringify({ secret }),
    }),
  );
const order = (id: string) =>
  d1.query<Record<string, unknown>>(
    `SELECT * FROM orders WHERE id = '${id}'`,
  )[0]!;

describe("resend (AC-17)", () => {
  it("makes the old link fail and the new one work, to the same address, without changing the report or the state", async () => {
    const { id, firstSecret } = await deliveredOrder();
    expect((await openLink(firstSecret)).status).toBe(200);
    const reportBefore = order(id).report_json;
    const s = support();
    expect(await s.run("resend", id)).toBe(0);
    expect(s.sender.sent).toHaveLength(1);
    const mail = s.sender.sent[0]!;
    expect(mail.to).toBe(EMAIL);
    expect(mail.text).toContain(`${SITE}/r#`);
    const newSecret = secretIn(mail);
    expect(newSecret).not.toBe(firstSecret);
    expect((await openLink(firstSecret)).status).toBe(404);
    expect((await openLink(newSecret)).status).toBe(200);
    expect(order(id).report_json).toBe(reportBefore);
    expect(order(id).state).toBe("delivered");
    // A new idempotency key per send, and a send record.
    // R-03: the key names the order number, never the internal order ID.
    expect(mail.idempotencyKey).toMatch(
      new RegExp(
        `^nuave-order-${order(id).order_number}-ready-2-[0-9a-f]{12}$`,
      ),
    );
    expect(mail.idempotencyKey).not.toContain(id);
    expect(mail.text).toContain(`Nomor pesanan: ${order(id).order_number}`);
    expect(
      d1.query("SELECT attempt, result FROM order_emails ORDER BY attempt"),
    ).toEqual([
      { attempt: 1, result: "accepted" },
      { attempt: 2, result: "accepted" },
    ]);
    // The secret is never printed, and neither is the address.
    const printed = output.join("\n");
    expect(printed).not.toContain(newSecret);
    expect(printed).not.toContain(EMAIL);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("a sender that cannot be made (no key file) fails before anything changes: the old link still works and no send is recorded", async () => {
    const { id, firstSecret } = await deliveredOrder();
    const hash = order(id).link_hash;
    await expect(
      runSupport(["resend", id], {
        db: d1.db,
        makeSender: async () => {
          throw new Error("no key file");
        },
        siteOrigin: SITE,
        now: () => clock,
        sleep: async () => {},
        out: (line) => output.push(line),
      }),
    ).rejects.toThrow("no key file");
    expect(order(id).link_hash).toBe(hash);
    expect((await openLink(firstSecret)).status).toBe(200);
    expect(d1.query("SELECT id FROM order_emails")).toHaveLength(1); // only the first send
  });

  it("a send Resend does not accept still stops the old link, says so, and leaves a failed record", async () => {
    const { id, firstSecret } = await deliveredOrder();
    const s = support({ sender: mailbox(() => false) });
    expect(await s.run("resend", id)).toBe(1);
    expect(output.join("\n")).toContain("did not accept");
    expect((await openLink(firstSecret)).status).toBe(404);
    expect(
      d1
        .query("SELECT attempt, result FROM order_emails ORDER BY attempt")
        .at(-1),
    ).toEqual({ attempt: 2, result: "failed" });
  });

  it("an unknown or badly formed order ID sends nothing and makes no sender", async () => {
    await deliveredOrder();
    const s = support();
    for (const bad of [
      "",
      "abc",
      "F".repeat(32),
      "g".repeat(32),
      `${"a".repeat(31)}'`,
      "a".repeat(33),
      "x' OR '1'='1",
    ]) {
      expect(await s.run("resend", bad), bad).toBe(2);
    }
    expect(await s.run("resend", "f".repeat(32))).toBe(1); // well formed, unknown
    expect(output.join("\n")).toContain("No order with that ID or number.");
    expect(s.sender.sent).toEqual([]);
    expect(s.makeSender).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses unknown commands, extra arguments and flags, and takes no address", async () => {
    const { id } = await deliveredOrder();
    const s = support();
    for (const args of [
      ["send", id],
      ["resend"],
      [],
      ["resend", id, "other@example.com"],
      ["resend", id, "--to=other@example.com"],
      ["off", id, "--email"],
    ]) {
      expect(await s.run(...args), args.join(" ")).toBe(2);
    }
    expect(output).toContain(SUPPORT_USAGE);
    expect(s.sender.sent).toEqual([]);
  });

  it("sends nothing for a synthetic order, an order with no saved report, or a link period that ended", async () => {
    const synthetic = await deliveredOrder("synthetic");
    const s = support();
    expect(await s.run("resend", synthetic.id)).toBe(1);
    expect(output.at(-1)).toContain("Synthetic orders never send real email");

    const open = await makeOrder(d1.db, { mode: "live", now: clock });
    expect(await s.run("resend", open)).toBe(1);
    expect(output.at(-1)).toContain("no saved report");

    const live = await deliveredOrder("live");
    await d1.db
      .prepare(
        `UPDATE orders SET link_expires_at = '2026-10-12T00:00:00.000Z' WHERE id = '${live.id}'`,
      )
      .bind()
      .run();
    expect(await s.run("resend", live.id)).toBe(1);
    expect(output.at(-1)).toContain("12-month");
    expect(s.sender.sent).toEqual([]);
  });

  it("an accepted resend on an order whose ready email never got through lets the runner finish delivery with no second email", async () => {
    const id = await makeOrder(d1.db, { email: EMAIL, now: clock });
    await approve(d1.db, id, { now: clock });
    const failing = mailbox(() => false);
    const deps: RunnerDeps = {
      db: d1.db,
      environment: "production",
      mode: "synthetic",
      siteOrigin: SITE,
      now: () => clock,
      execute: async (input) => executeSyntheticLocalObservation(input),
      generateReport: async (...args) => generateSyntheticLocalReport(...args),
      sender: failing.sender,
    };
    for (let i = 0; i < 12; i += 1) {
      await runOrders(deps);
      advance(60_000);
    }
    expect(order(id).state).toBe("reporting");
    await d1.db
      .prepare(`UPDATE orders SET mode = 'live' WHERE id = '${id}'`)
      .bind()
      .run();
    const s = support();
    expect(await s.run("resend", id)).toBe(0);
    const sentBefore = failing.sent.length;
    await d1.db
      .prepare(`UPDATE orders SET mode = 'synthetic' WHERE id = '${id}'`)
      .bind()
      .run();
    advance(2 * 3600_000);
    await runOrders(deps);
    expect(order(id).state).toBe("delivered");
    expect(failing.sent).toHaveLength(sentBefore); // no second email
    expect((await openLink(secretIn(s.sender.sent[0]!))).status).toBe(200);
  });
});

describe("off (AC-17)", () => {
  it("gives the neutral page and keeps the order state; a later resend switches it on with a new secret", async () => {
    const { id, firstSecret } = await deliveredOrder();
    const s = support();
    expect(await s.run("off", id)).toBe(0);
    expect(order(id).state).toBe("delivered");
    expect(order(id).link_off).toBe(1);
    const off = await openLink(firstSecret);
    const random = await openLink("A".repeat(32));
    expect(off.status).toBe(404);
    expect(await off.text()).toBe(await random.text());
    expect(s.sender.sent).toEqual([]);
    // Off again is harmless.
    expect(await s.run("off", id)).toBe(0);
    // An explicit resend is the only way back on, and the old secret stays dead.
    expect(await s.run("resend", id)).toBe(0);
    expect((await openLink(firstSecret)).status).toBe(404);
    expect((await openLink(secretIn(s.sender.sent[0]!))).status).toBe(200);
  });
});

describe("show (AC-17, AC-09)", () => {
  it("hides the email unless asked, shows state, times, costs, saved answers and never a secret or hash", async () => {
    const { id, firstSecret } = await deliveredOrder();
    const s = support();
    expect(await s.run("show", id)).toBe(0);
    let printed = output.join("\n");
    expect(printed).not.toContain(EMAIL);
    expect(printed).toContain("hidden (add --email to show)");
    expect(printed).toContain("State: delivered");
    expect(printed).toContain("Saved answers: 10 questions");
    expect(printed).toContain("NUAVE-DT-01 done");
    expect(printed).toContain("Answer: ");
    expect(printed).toContain("Emails sent: 1");
    expect(printed).toContain("ready #1 accepted");
    expect(printed).toMatch(/Link: active until /);
    expect(printed).not.toContain(firstSecret);
    expect(printed).not.toContain(String(order(id).link_hash));
    expect(printed).not.toContain("OVERRUN");

    output.length = 0;
    expect(await s.run("show", id, "--email")).toBe(0);
    printed = output.join("\n");
    expect(printed).toContain(`Email: ${EMAIL}`);
    expect(printed).not.toContain(firstSecret);
    expect(printed).not.toContain(String(order(id).link_hash));
    expect(s.makeSender).not.toHaveBeenCalled();
  });

  it("flags an order whose actual cost passed its hold, and shows the costs (AC-09)", async () => {
    const live = await makeOrder(d1.db, {
      mode: "live",
      limitUsd: 1,
      dailyLimitUsd: 5,
      now: clock,
    });
    await approve(d1.db, live, { mode: "live", now: clock });
    const big = await reserveOrderCall(d1.db, {
      orderId: live,
      provider: "openai",
      stage: "observation",
      usd: 0.9,
      now: () => clock,
    });
    await big.settle(1.3); // the provider charged more than the hold
    const s = support();
    await s.run("show", live);
    const printed = output.join("\n");
    expect(printed).toContain("OVERRUN: the cost passed the order's hold.");
    expect(printed).toContain("Cost: USD 1.3000 over 1 calls; hold USD 1.0000");
    expect(printed).toContain("Mode: live, production");
  });

  it("an order that never cost anything shows no hold", async () => {
    const { id } = await deliveredOrder("synthetic");
    const s = support();
    await s.run("show", id);
    expect(output.join("\n")).toContain("Cost: none held");
  });
});

describe("the database through wrangler", () => {
  it("writes only plain tokens into SQL text: an email can never reach it", () => {
    expect(sqlLiteral("abc123")).toBe("'abc123'");
    expect(sqlLiteral("2026-10-12T10:00:00.000Z")).toBe(
      "'2026-10-12T10:00:00.000Z'",
    );
    expect(sqlLiteral(null)).toBe("NULL");
    expect(sqlLiteral(7)).toBe("7");
    for (const bad of [
      EMAIL,
      "a'b",
      "x; DROP TABLE orders",
      "a\nb",
      'Kopi "Nuave"',
    ]) {
      expect(() => sqlLiteral(bad), bad).toThrow();
    }
  });

  it("the whole resend flow, sent through a statement runner, never has the email or the secret in SQL text", async () => {
    const { id } = await deliveredOrder();
    // A runner that records each statement and runs it on the test database.
    const execute = async (sql: string) => {
      sqlSeen.push(sql);
      const statement = d1.db.prepare(sql).bind();
      if (/^\s*select|\breturning\b/i.test(sql)) {
        const { results } = await statement.all();
        return [{ results }];
      }
      return [{ meta: (await statement.run()).meta }];
    };
    const s = support({ db: d1ThroughWrangler(execute) });
    expect(await s.run("resend", id)).toBe(0);
    const newSecret = secretIn(s.sender.sent[0]!);
    expect(await s.run("show", id, "--email")).toBe(0);
    expect(sqlSeen.length).toBeGreaterThan(3);
    for (const sql of sqlSeen) {
      expect(sql).not.toContain(EMAIL);
      expect(sql).not.toContain(newSecret);
      expect(sql).not.toContain("@");
    }
    expect(sqlSeen.some((sql) => sql.includes(id))).toBe(true);
    // The command made a real change through that path.
    expect((await openLink(newSecret)).status).toBe(200);
    expect(output.join("\n")).toContain(`Email: ${EMAIL}`);
  });
});

describe("payment support (spec 017 R-24, AC-05)", () => {
  const LIMIT = usdToUnits(2);
  const DAILY = usdToUnits(50);
  const fake = createFakeMidtrans();
  const midtrans = {
    serverKey: fake.serverKey,
    isProduction: false,
    fetch: fake.fetch,
  };
  const q = (sql: string) => d1.query<Record<string, unknown>>(sql);
  const text = () => output.join("\n");

  async function orderWithAttempt(payment: "unpaid" | "test" = "unpaid") {
    const id = await makeOrder(d1.db, {
      mode: "live",
      payment,
      now: clock,
      dailyLimitUsd: 100,
    });
    const started = await startAttempt(d1.db, {
      orderId: id,
      environment: "production",
      mode: "live",
      now: clock,
      limitUnits: LIMIT,
      dailyLimitUnits: DAILY,
    });
    if (started.result !== "started") throw new Error("no attempt");
    return { id, attempt: started.attempt };
  }
  async function pay(
    attempt: { midtrans_order_id: string },
    options: { transactionId: string; amount?: string; method?: string },
  ) {
    const tx = fake.addTransaction({
      orderId: attempt.midtrans_order_id,
      transactionId: options.transactionId,
      amount: options.amount,
      paymentType: options.method ?? "qris",
    });
    const answer = await getStatus(midtrans, tx.transaction_id);
    if (answer.kind !== "found") throw new Error("fake lost it");
    await applyStatus(
      { db: d1.db, now: clock, limitUnits: LIMIT, dailyLimitUnits: DAILY },
      answer.status,
    );
  }

  it("finds an order by its internal ID, its order number or a Midtrans order_id, and show prints the payment lines", async () => {
    const { id, attempt } = await orderWithAttempt();
    await pay(attempt, { transactionId: "tx-show-1" });
    const number = String(
      q(`SELECT order_number FROM orders WHERE id = '${id}'`)[0]!.order_number,
    );
    for (const reference of [id, number, attempt.midtrans_order_id]) {
      output.length = 0;
      expect(await support().run("show", reference)).toBe(0);
      const shown = text();
      expect(shown).toContain(`Order number: ${number}`);
      expect(shown).toContain("Payment kind: midtrans");
      expect(shown).toMatch(/Paid: 2026-10-12T10:00:00/);
      expect(shown).toContain("Payment attempts: 1");
      expect(shown).toContain(`${attempt.midtrans_order_id} paid`);
      expect(shown).toContain("transaction tx-show-1: settlement, paid");
      expect(shown).toContain("Test pass: no");
      expect(shown).not.toContain("owner@example.com");
    }
  });

  it("show marks a founder test pass, and a needs-refund transaction", async () => {
    const test = await orderWithAttempt("test").catch(() => null);
    expect(test).toBeNull(); // R-05: no payment starts on a test pass
    const id = await makeOrder(d1.db, {
      mode: "live",
      payment: "test",
      now: clock,
    });
    expect(await support().run("show", id)).toBe(0);
    expect(text()).toContain("Test pass: yes (test)");
    expect(text()).toContain("Payment kind: test");
    output.length = 0;
    const { attempt } = await orderWithAttempt();
    await pay(attempt, { transactionId: "tx-wrong", amount: "50000.00" });
    expect(await support().run("show", attempt.midtrans_order_id)).toBe(0);
    expect(text()).toContain("(NEEDS REFUND)");
    expect(text()).toContain("refund needs_refund");
  });

  it("an unknown number or order_id finds nothing; a badly formed one is bad usage; the number unlocks nothing", async () => {
    expect(await support().run("show", "NV-AAAAAA")).toBe(1);
    expect(await support().run("show", "NV-AAAAAA-1")).toBe(1);
    for (const bad of ["NV-AAAAA", "nv-aaaaaa", "NV-OOOOOO", "NV-AAAAAA-x"]) {
      expect(await support().run("show", bad), bad).toBe(2);
    }
    const { id } = await orderWithAttempt();
    const number = String(
      q(`SELECT order_number FROM orders WHERE id = '${id}'`)[0]!.order_number,
    );
    // `resend` by number still needs a saved report: the number proves nothing.
    expect(await support().run("resend", number)).toBe(1);
  });

  it("refunds lists every open refund case: needs-refund transactions, paid orders that ended, and attempts with no final answer", async () => {
    expect(await support().run("refunds")).toBe(0);
    expect(text()).toContain("Open refund cases: 0");
    // 1: a settled transaction that cannot be applied.
    const wrong = await orderWithAttempt();
    await pay(wrong.attempt, { transactionId: "tx-wrong", amount: "50000.00" });
    // 2: a paid order that ended (not started).
    const ended = await orderWithAttempt();
    await pay(ended.attempt, { transactionId: "tx-ended" });
    q(
      `UPDATE orders SET state = 'failed', failure_code = 'paid_not_started', ended_at = '2026-10-19T10:00:00.000Z' WHERE id = '${ended.id}' RETURNING 1`,
    );
    // 3: an attempt closed as unknown, and an open one with a payment_unknown notice.
    const unknownOne = await orderWithAttempt();
    q(
      `UPDATE payment_attempts SET status = 'closed_unknown' WHERE id = '${unknownOne.attempt.id}' RETURNING 1`,
    );
    const unknownTwo = await orderWithAttempt();
    q(
      `INSERT INTO founder_notices (id, kind, subject, status, created_at) VALUES ('n1', 'payment_unknown', '${unknownTwo.attempt.midtrans_order_id}', 'sent', '2026-10-13T10:00:00.000Z') RETURNING 1`,
    );
    // Not cases: an ordinary paid order that is running, and a plain open attempt.
    const fine = await orderWithAttempt();
    await pay(fine.attempt, { transactionId: "tx-fine" });
    await orderWithAttempt();
    output.length = 0;
    expect(await support().run("refunds")).toBe(0);
    const shown = text();
    expect(shown).toContain("Open refund cases: 4");
    expect(shown).toContain("NEEDS REFUND");
    expect(shown).toContain("tx-wrong");
    expect(shown).toContain("PAID ORDER ENDED (paid_not_started)");
    expect(shown).toContain("tx-ended");
    expect(shown).toContain(unknownOne.attempt.midtrans_order_id);
    expect(shown).toContain(unknownTwo.attempt.midtrans_order_id);
    expect(shown).not.toContain("tx-fine");
    expect(shown).toContain("three business days");
  });

  it("refunded records an outside refund by transaction, like a Midtrans refund of it: a needs-refund case closes and the paid order keeps running", async () => {
    const { id, attempt } = await orderWithAttempt();
    await pay(attempt, { transactionId: "tx-paid" });
    await pay(attempt, { transactionId: "tx-second" }); // a second payment: needs refund
    expect(
      q(
        `SELECT outcome FROM payment_transactions WHERE transaction_id = 'tx-second'`,
      )[0]!.outcome,
    ).toBe("needs_refund");
    expect(await support().run("refunded", "tx-second")).toBe(0);
    expect(
      q(
        `SELECT refund_state, refund_source FROM payment_transactions WHERE transaction_id = 'tx-second'`,
      ),
    ).toEqual([{ refund_state: "refunded", refund_source: "support" }]);
    expect(
      q(`SELECT state, failure_code FROM orders WHERE id = '${id}'`),
    ).toEqual([{ state: "open", failure_code: null }]);
    output.length = 0;
    await support().run("refunds");
    expect(text()).toContain("Open refund cases: 0");
    // Again: nothing changes.
    expect(await support().run("refunded", "tx-second")).toBe(0);
    expect(text()).toContain("already recorded");
  });

  it("refunded on the paying transaction before approval ends the order as refunded, through the wrangler path too", async () => {
    const { id, attempt } = await orderWithAttempt();
    await pay(attempt, { transactionId: "tx-pays" });
    // The wrangler path: each command (a batch is several statements) is one
    // call to the runner; the test runs them in order on the test database.
    const execute = async (sql: string) => {
      sqlSeen.push(sql);
      const results = [];
      for (const part of sql.split(";\n")) {
        const statement = d1.db.prepare(part).bind();
        if (/^\s*select/i.test(part)) {
          results.push({ results: (await statement.all()).results });
        } else {
          results.push({ meta: (await statement.run()).meta });
        }
      }
      return results;
    };
    const s = support({ db: d1ThroughWrangler(execute) });
    expect(await s.run("refunded", "tx-pays")).toBe(0);
    expect(
      q(`SELECT state, failure_code FROM orders WHERE id = '${id}'`),
    ).toEqual([{ state: "failed", failure_code: "refunded" }]);
    expect(
      q(
        `SELECT refund_state, refund_source FROM payment_transactions WHERE transaction_id = 'tx-pays'`,
      ),
    ).toEqual([{ refund_state: "refunded", refund_source: "support" }]);
    for (const sql of sqlSeen) expect(sql).not.toContain("@");
    // It is no longer an open case.
    output.length = 0;
    await support().run("refunds");
    expect(text()).toContain("Open refund cases: 0");
    expect(await support().run("refunded", "tx-nope-1")).toBe(1);
    expect(await support().run("refunded", "bad id")).toBe(2);
  });

  it("a chargeback of the paying transaction before approval ends the order and is not listed as a refund to make", async () => {
    const { id, attempt } = await orderWithAttempt();
    await pay(attempt, { transactionId: "tx-cb" });
    await applyRefund(
      { db: d1.db, now: clock, limitUnits: LIMIT, dailyLimitUnits: DAILY },
      "tx-cb",
      "chargeback",
      "midtrans",
    );
    expect(
      q(`SELECT state, failure_code FROM orders WHERE id = '${id}'`),
    ).toEqual([{ state: "failed", failure_code: "refunded" }]);
    output.length = 0;
    await support().run("refunds");
    expect(text()).toContain("Open refund cases: 0");
  });

  it("a refund that stops half way through wrangler stays listed in refunds, says it is safe to repeat, and the repeat finishes it", async () => {
    const { id, attempt } = await orderWithAttempt();
    await pay(attempt, { transactionId: "tx-half" });
    let fail = true;
    const execute = async (sql: string) => {
      // The batch that writes the transaction row is the last step.
      if (fail && sql.includes("UPDATE payment_transactions")) {
        throw new Error("wrangler d1 execute failed");
      }
      const results = [];
      for (const part of sql.split(";\n")) {
        const statement = d1.db.prepare(part).bind();
        results.push(
          /^\s*select/i.test(part)
            ? { results: (await statement.all()).results }
            : { meta: (await statement.run()).meta },
        );
      }
      return results;
    };
    const s = support({ db: d1ThroughWrangler(execute) });
    expect(await s.run("refunded", "tx-half")).toBe(1);
    expect(text()).toContain("safe to run the same command again");
    // The order already ended; the transaction row is not written.
    expect(
      q(`SELECT state, failure_code FROM orders WHERE id = '${id}'`),
    ).toEqual([{ state: "failed", failure_code: "refunded" }]);
    output.length = 0;
    await support().run("refunds");
    expect(text()).toContain("Open refund cases: 1");
    expect(text()).toContain("tx-half");
    fail = false;
    output.length = 0;
    expect(await s.run("refunded", "tx-half")).toBe(0);
    await support().run("refunds");
    expect(text()).toContain("Open refund cases: 0");
  });

  it("close ends an open attempt by its Midtrans order_id: unknown stays on refunds, unpaid takes it off", async () => {
    const { attempt } = await orderWithAttempt();
    const id = attempt.midtrans_order_id;
    expect(await support().run("close", id, "unknown")).toBe(0);
    expect(
      q(
        `SELECT status FROM payment_attempts WHERE midtrans_order_id = '${id}'`,
      )[0]!.status,
    ).toBe("closed_unknown");
    output.length = 0;
    await support().run("refunds");
    expect(text()).toContain(id);
    expect(await support().run("close", id, "unpaid")).toBe(0);
    expect(
      q(
        `SELECT status FROM payment_attempts WHERE midtrans_order_id = '${id}'`,
      )[0]!.status,
    ).toBe("finally_unpaid");
    output.length = 0;
    await support().run("refunds");
    expect(text()).toContain("Open refund cases: 0");
    // It no longer counts against the cap.
    expect(
      q("SELECT COUNT(*) AS n FROM payment_attempts WHERE status = 'open'")[0]!
        .n,
    ).toBe(0);
  });

  it("an earlier try closed as unknown makes a finally unpaid latest try read as support-only; closing it as unpaid brings back unpaid_final (Q18)", async () => {
    const { id, attempt } = await orderWithAttempt();
    const first = attempt.midtrans_order_id;
    expect(await support().run("close", first, "unknown")).toBe(0);
    const second = await startAttempt(d1.db, {
      orderId: id,
      environment: "production",
      mode: "live",
      now: clock,
      limitUnits: LIMIT,
      dailyLimitUnits: DAILY,
    });
    if (second.result !== "started") throw new Error("no second attempt");
    expect(
      await support().run("close", second.attempt.midtrans_order_id, "unpaid"),
    ).toBe(0);
    const view = async () =>
      paymentView(d1.db, (await getOrder(d1.db, id))!, clock);
    const number = order(id).order_number as string;
    // The page and the Q14 guard agree: no replacement while one try is unknown.
    const replace = () =>
      createOrder(d1.db, {
        email: "owner@example.com",
        businessName: "Pengganti",
        website: "https://pengganti.example",
        mode: "live",
        environment: "production",
        paymentKind: "unpaid",
        limitUsd: 2,
        dailyLimitUsd: 100,
        previousOrderId: id,
        now: clock,
      });
    expect(await view()).toEqual({
      state: "closed_unknown",
      order_number: number,
    });
    expect((await replace()).result).toBe("previous_active");
    expect(await support().run("close", first, "unpaid")).toBe(0);
    expect(await view()).toEqual({ state: "unpaid_final" });
    expect((await replace()).result).toBe("created");
  });

  it("close refuses a settled attempt, an unknown order_id and a bad word, and changes nothing", async () => {
    const { attempt } = await orderWithAttempt();
    await pay(attempt, { transactionId: "tx-settled" });
    expect(
      await support().run("close", attempt.midtrans_order_id, "unpaid"),
    ).toBe(1);
    expect(
      q(`SELECT status FROM payment_attempts WHERE id = '${attempt.id}'`)[0]!
        .status,
    ).toBe("paid");
    expect(await support().run("close", "NV-ZZZZZZ-1", "unknown")).toBe(1);
    expect(
      await support().run("close", attempt.midtrans_order_id, "maybe"),
    ).toBe(2);
    expect(await support().run("close", attempt.midtrans_order_id)).toBe(2);
    expect(await support().run("refunds", "extra")).toBe(2);
    expect(output).toContain(SUPPORT_USAGE);
  });

  it("norefund closes a money refund case without a refund, with its reason: it leaves refunds and show records it", async () => {
    // A needs-refund transaction (a second payment).
    const paid = await orderWithAttempt();
    await pay(paid.attempt, { transactionId: "tx-one" });
    await pay(paid.attempt, { transactionId: "tx-two" });
    // A paid order that ended failed, not refunded.
    const ended = await orderWithAttempt();
    await pay(ended.attempt, { transactionId: "tx-ended-2" });
    q(
      `UPDATE orders SET state = 'failed', failure_code = 'paid_not_started', ended_at = '2026-10-19T10:00:00.000Z' WHERE id = '${ended.id}' RETURNING 1`,
    );
    await support().run("refunds");
    expect(text()).toContain("Open refund cases: 2");

    output.length = 0;
    expect(await support().run("norefund", paid.id, "declined")).toBe(0);
    expect(text()).toContain("closed without a refund (declined)");
    expect(
      await support().run(
        "norefund",
        ended.attempt.midtrans_order_id,
        "delivered",
      ),
    ).toBe(0);
    expect(
      q(
        `SELECT order_id, kind, transaction_id, reason FROM refund_closures ORDER BY reason`,
      ),
    ).toEqual([
      {
        order_id: paid.id,
        kind: "payment",
        transaction_id: "tx-two",
        reason: "declined",
      },
      {
        order_id: ended.id,
        kind: "paid_order",
        transaction_id: "",
        reason: "delivered",
      },
    ]);
    output.length = 0;
    await support().run("refunds");
    expect(text()).toContain("Open refund cases: 0");
    // The transaction itself is not marked refunded: no money moved.
    expect(
      q(
        `SELECT refund_state FROM payment_transactions WHERE transaction_id = 'tx-two'`,
      )[0]!.refund_state,
    ).toBe("none");
    output.length = 0;
    await support().run("show", ended.id);
    expect(text()).toContain(
      "Refund case closed without refund: paid order, delivered,",
    );
    // Closed once: a second close finds no open case.
    expect(await support().run("norefund", paid.id, "settled")).toBe(1);
    expect(q(`SELECT COUNT(*) AS n FROM refund_closures`)[0]!.n).toBe(2);
  });

  it("norefund closes only the cases open now: a later payment on the same order, and other orders, stay listed", async () => {
    const one = await orderWithAttempt();
    await pay(one.attempt, { transactionId: "tx-a1" });
    await pay(one.attempt, { transactionId: "tx-a2" });
    const other = await orderWithAttempt();
    await pay(other.attempt, { transactionId: "tx-b1" });
    await pay(other.attempt, { transactionId: "tx-b2" });
    expect(await support().run("norefund", one.id, "declined")).toBe(0);
    output.length = 0;
    await support().run("refunds");
    expect(text()).toContain("Open refund cases: 1");
    expect(text()).toContain("tx-b2");
    // A third payment on the closed order is a new case.
    await pay(one.attempt, { transactionId: "tx-a3" });
    output.length = 0;
    await support().run("refunds");
    expect(text()).toContain("Open refund cases: 2");
    expect(text()).toContain("tx-a3");
    expect(text()).not.toContain("tx-a2");
  });

  it("norefund refuses a bad reason, an order with no money case, and a payment with no final answer", async () => {
    const plain = await orderWithAttempt();
    expect(await support().run("norefund", plain.id, "maybe")).toBe(2);
    expect(await support().run("norefund", plain.id)).toBe(2);
    expect(await support().run("norefund", plain.id, "declined")).toBe(1);
    const unknownOne = await orderWithAttempt();
    q(
      `UPDATE payment_attempts SET status = 'closed_unknown' WHERE id = '${unknownOne.attempt.id}' RETURNING 1`,
    );
    output.length = 0;
    expect(await support().run("norefund", unknownOne.id, "settled")).toBe(1);
    expect(text()).toContain("closed with close");
    expect(q(`SELECT COUNT(*) AS n FROM refund_closures`)[0]!.n).toBe(0);
  });
});

describe("email (founder decision 2026-10-25)", () => {
  const NEW_EMAIL = "pemilik.baru@example.com";

  it("replaces the email, stops the old link and sends a new link to the new address only", async () => {
    const { id, firstSecret } = await deliveredOrder();
    const s = support();
    expect(await s.run("email", id, `  ${NEW_EMAIL} `)).toBe(0);
    expect(order(id).email).toBe(NEW_EMAIL);
    expect(order(id).email_changed_at).toBe(clock.toISOString());
    expect(s.sender.sent).toHaveLength(1);
    expect(s.sender.sent[0]!.to).toBe(NEW_EMAIL);
    const newSecret = secretIn(s.sender.sent[0]!);
    expect((await openLink(firstSecret)).status).not.toBe(200);
    expect((await openLink(newSecret)).status).toBe(200);
    expect(output.join("\n")).toContain("The email on the order is changed.");
    output.length = 0;
    await s.run("show", id);
    expect(output.join("\n")).toContain("Email changed:");
  });

  it("an order still running keeps going: its ready email goes to the new address", async () => {
    const id = await makeOrder(d1.db, { email: EMAIL, now: clock });
    await approve(d1.db, id, { now: clock });
    await d1.db
      .prepare(`UPDATE orders SET mode = 'live' WHERE id = '${id}'`)
      .bind()
      .run();
    const s = support();
    expect(await s.run("email", id, NEW_EMAIL)).toBe(0);
    expect(s.makeSender).not.toHaveBeenCalled();
    expect(output.join("\n")).toContain("Its email will go to the new address");
    await d1.db
      .prepare(`UPDATE orders SET mode = 'synthetic' WHERE id = '${id}'`)
      .bind()
      .run();
    const mail = mailbox();
    const deps: RunnerDeps = {
      db: d1.db,
      environment: "production",
      mode: "synthetic",
      siteOrigin: SITE,
      now: () => clock,
      execute: async (input) => executeSyntheticLocalObservation(input),
      generateReport: async (...args) => generateSyntheticLocalReport(...args),
      sender: mail.sender,
    };
    for (let i = 0; i < 12; i += 1) {
      await runOrders(deps);
      advance(60_000);
    }
    expect(mail.sent.map((message) => message.to)).toEqual([NEW_EMAIL]);
  });

  it("changes nothing for a bad address, the same address, a synthetic or anonymised order, or a missing key file", async () => {
    const { id, firstSecret } = await deliveredOrder();
    const s = support();
    expect(await s.run("email", id, "not-an-email")).toBe(2);
    expect(await s.run("email", id, "a@b")).toBe(2);
    expect(await s.run("email", id)).toBe(2);
    const failing = support({
      makeSender: async () => {
        throw new Error("no key file");
      },
    });
    await expect(failing.run("email", id, NEW_EMAIL)).rejects.toThrow();
    expect(order(id).email).toBe(EMAIL);
    expect((await openLink(firstSecret)).status).toBe(200);
    const synthetic = await deliveredOrder("synthetic");
    expect(await s.run("email", synthetic.id, NEW_EMAIL)).toBe(1);
    await d1.db
      .prepare(
        `UPDATE orders SET purged_at = '2026-11-01T00:00:00.000Z' WHERE id = '${id}'`,
      )
      .bind()
      .run();
    expect(await s.run("email", id, NEW_EMAIL)).toBe(1);
    expect(order(id).email).toBe(EMAIL);
    expect(s.sender.sent).toEqual([]);
    expect(s.makeSender).not.toHaveBeenCalled();
  });

  it("through wrangler the new address is written as bytes, never as readable text", async () => {
    const { id } = await deliveredOrder();
    const execute = async (sql: string) => {
      sqlSeen.push(sql);
      const statement = d1.db.prepare(sql).bind();
      if (/^\s*select|\breturning\b/i.test(sql)) {
        const { results } = await statement.all();
        return [{ results }];
      }
      return [{ meta: (await statement.run()).meta }];
    };
    const s = support({ db: d1ThroughWrangler(execute) });
    expect(await s.run("email", id, NEW_EMAIL)).toBe(0);
    expect(order(id).email).toBe(NEW_EMAIL);
    expect(typeof order(id).email).toBe("string");
    for (const sql of sqlSeen) {
      expect(sql).not.toContain("@");
      expect(sql).not.toContain("pemilik");
    }
    expect(sqlLiteral(new TextEncoder().encode("a@b.co"))).toBe(
      "X'6140622e636f'",
    );
    expect(s.sender.sent[0]!.to).toBe(NEW_EMAIL);
  });

  it("a report saved while the command runs gets a new link at the new address; the old one stops", async () => {
    const { id, firstSecret } = await deliveredOrder();
    const saved = order(id).report_json;
    await d1.db
      .prepare(
        `UPDATE orders SET report_json = NULL, state = 'reporting' WHERE id = ?1`,
      )
      .bind(id)
      .run();
    // The runner finishes between the command's read and its write.
    const racing = {
      ...d1.db,
      prepare: (sql: string) => {
        if (/^\s*UPDATE orders SET email/.test(sql))
          d1.query(
            `UPDATE orders SET report_json = '${String(saved).replace(/'/g, "''")}', state = 'delivered' WHERE id = '${id}' RETURNING 1`,
          );
        return d1.db.prepare(sql);
      },
    };
    const s = support({ db: racing as typeof d1.db });
    expect(await s.run("email", id, NEW_EMAIL)).toBe(0);
    expect(s.sender.sent.map((message) => message.to)).toEqual([NEW_EMAIL]);
    expect((await openLink(firstSecret)).status).not.toBe(200);
    expect((await openLink(secretIn(s.sender.sent[0]!))).status).toBe(200);
  });

  it("waits while the runner holds the order, and refuses an unpaid order", async () => {
    const { id } = await deliveredOrder();
    await d1.db
      .prepare(
        `UPDATE orders SET lease_owner = 'runner', lease_until = ?2 WHERE id = ?1`,
      )
      .bind(id, new Date(clock.getTime() + 60_000).toISOString())
      .run();
    const s = support();
    expect(await s.run("email", id, NEW_EMAIL)).toBe(1);
    expect(output.join("\n")).toContain("being worked on right now");
    expect(order(id).email).toBe(EMAIL);
    expect(s.sender.sent).toEqual([]);
    const unpaid = await makeOrder(d1.db, {
      email: EMAIL,
      mode: "live",
      payment: "unpaid",
      now: clock,
    });
    expect(await s.run("email", unpaid, NEW_EMAIL)).toBe(1);
    expect(order(unpaid).email).toBe(EMAIL);
  });

  it("a send that fails after the change has already stopped the old link; running it again finishes", async () => {
    const { id, firstSecret } = await deliveredOrder();
    const refusing = support({ sender: mailbox(() => false) });
    expect(await refusing.run("email", id, NEW_EMAIL)).toBe(1);
    expect(order(id).email).toBe(NEW_EMAIL);
    expect((await openLink(firstSecret)).status).not.toBe(200);
    const s = support();
    output.length = 0;
    expect(await s.run("email", id, NEW_EMAIL)).toBe(0);
    expect(output.join("\n")).toContain("already the email on the order");
    expect(s.sender.sent.map((message) => message.to)).toEqual([NEW_EMAIL]);
    expect((await openLink(secretIn(s.sender.sent[0]!))).status).toBe(200);
  });

  it("the old link stops in the same write as the new address: a failure right after it leaves no working old link", async () => {
    const { id, firstSecret } = await deliveredOrder();
    let changed = false;
    const breaking = {
      ...d1.db,
      prepare: (sql: string) => {
        if (changed) throw new Error("wrangler did not answer");
        if (/^\s*UPDATE orders SET email/.test(sql)) changed = true;
        return d1.db.prepare(sql);
      },
    };
    const s = support({ db: breaking as typeof d1.db });
    await expect(s.run("email", id, NEW_EMAIL)).rejects.toThrow();
    expect(order(id).email).toBe(NEW_EMAIL);
    expect(s.sender.sent).toEqual([]);
    expect((await openLink(firstSecret)).status).not.toBe(200);
    const again = support();
    expect(await again.run("email", id, NEW_EMAIL)).toBe(0);
    expect(again.sender.sent.map((message) => message.to)).toEqual([NEW_EMAIL]);
    expect((await openLink(secretIn(again.sender.sent[0]!))).status).toBe(200);
  });

  it("refuses an order that was never paid, also once it expired", async () => {
    const unpaid = await makeOrder(d1.db, {
      email: EMAIL,
      mode: "live",
      payment: "unpaid",
      now: clock,
    });
    await d1.db
      .prepare(
        `UPDATE orders SET state = 'expired', ended_at = ?2 WHERE id = ?1`,
      )
      .bind(unpaid, clock.toISOString())
      .run();
    expect(await support().run("email", unpaid, NEW_EMAIL)).toBe(1);
    expect(order(unpaid).email).toBe(EMAIL);
  });
});

describe("export (spec 021 A-08)", () => {
  it("saves the same evidence JSON the report page builds from its link, and prints none of it", async () => {
    const { id, firstSecret } = await deliveredOrder();
    const files = new Map<string, string>();
    const s = support({
      saveEvidence: async (fileName, text) => {
        files.set(fileName, text);
        return `.local-evidence/${fileName}`;
      },
    });
    const number = String(order(id).order_number);
    expect(await s.run("export", number)).toBe(0);
    const saved = files.get(`${number}-evidence.json`);
    expect(saved).toBeDefined();
    const fromLink = savedReportEvidence(
      (await (await openLink(firstSecret)).json()) as SavedReportData,
    );
    const exported = JSON.parse(saved!) as typeof fromLink;
    expect({ ...exported, exported_at: "" }).toEqual({
      ...JSON.parse(JSON.stringify(fromLink)),
      exported_at: "",
    });
    expect(exported.observations).toHaveLength(10);
    const printed = output.join("\n");
    expect(printed).toContain(`.local-evidence/${number}-evidence.json`);
    expect(printed).not.toContain(EMAIL);
    expect(printed).not.toContain(firstSecret);
    expect(printed).not.toContain(exported.observations[0]!.raw_answer);
    expect(s.makeSender).not.toHaveBeenCalled();
  });

  it("saves nothing for an anonymised order, a bad reference or extra arguments", async () => {
    const { id } = await deliveredOrder();
    const files = new Map<string, string>();
    const s = support({
      saveEvidence: async (fileName, text) => {
        files.set(fileName, text);
        return fileName;
      },
    });
    expect(await s.run("export")).toBe(2);
    expect(await s.run("export", id, "extra")).toBe(2);
    expect(await s.run("export", "abc")).toBe(2);
    await d1.db
      .prepare(`UPDATE orders SET report_json = NULL WHERE id = '${id}'`)
      .bind()
      .run();
    expect(await s.run("export", id)).toBe(1);
    expect(output.join("\n")).toContain("no saved report");
    expect(files.size).toBe(0);
  });
});
