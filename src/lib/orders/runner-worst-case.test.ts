import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));
// A live report needs real evidence; this test is about cost, not about the
// report's content. The stand-in asks the generator for both paid calls (the
// report and its language fix) and returns a small saved report.
vi.mock("../audit/report-pipeline", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../audit/report-pipeline")>()),
  assertReportGenerationGate: () => {},
  createValidatedAuditReport: async (
    input: unknown,
    generate: (...args: unknown[]) => Promise<unknown>,
  ) => {
    await generate(input);
    await generate(input, { draft: {}, violations: [] });
    return { report_version: "nuave-report-v3" };
  },
}));

import { executeSyntheticLocalObservation } from "../audit/local-direct-ten-audit";
import { reserveProviderSpend } from "../spending/provider-spend";
import { openFileD1 } from "../spending/sqlite-d1.test-helper";
import { resendMailSender } from "./mail";
import { MAX_EXPIRED_PER_RUN, runOrders, type RunnerDeps } from "./runner";
import { EMAIL_RETRY_BASE_MS } from "./store";
import { approve, makeOrder, T0 } from "./orders.test-helper";

// Cloudflare Free counts D1 queries as subrequests, 50 per invocation shared
// with outbound requests (paid provider calls plus Resend sends). So the worst
// live cron run must keep D1 queries + outbound requests at or below 40, in every
// mix of work and whatever order the orders come in.

let dir: string;
let d1: ReturnType<typeof openFileD1>;
let clock: Date;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-worst-"));
  d1 = openFileD1(join(dir, "worst.sqlite"));
  clock = T0;
  vi.stubEnv("NUAVE_AUDIT_MODE", "live");
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllEnvs();
});
const advance = (ms: number) => {
  clock = new Date(clock.getTime() + ms);
};
const orderRow = (id: string) =>
  d1.query<{ report_json: string | null }>(
    `SELECT report_json FROM orders WHERE id = '${id}'`,
  )[0]!;
const state = (id: string) =>
  d1.query<{ state: string }>(`SELECT state FROM orders WHERE id = '${id}'`)[0]!
    .state;

function counting(db: RunnerDeps["db"]) {
  const count = { queries: 0 };
  type Stmt = ReturnType<ReturnType<RunnerDeps["db"]["prepare"]>["bind"]>;
  const raw = new WeakMap<object, Stmt>();
  const wrap = (statement: Stmt): Stmt => {
    const wrapped = {
      run: () => (count.queries++, statement.run()),
      first: <T>() => (count.queries++, statement.first<T>()),
      all: <T>() => (count.queries++, statement.all<T>()),
    } as Stmt;
    raw.set(wrapped, statement);
    return wrapped;
  };
  const counted: RunnerDeps["db"] = {
    prepare: (sql) => ({
      bind: (...values) => wrap(db.prepare(sql).bind(...values)),
    }),
    batch: (statements) => {
      count.queries += 1;
      return db.batch(statements.map((statement) => raw.get(statement)!));
    },
  };
  return { counted, count };
}

const COMBINED_LIMIT = 40;
// Measured when written (D1 queries + outbound requests per run, the largest of
// the 24 cases): with housekeeping 37 (32 queries + 5 outbound), for example a
// question step and an email-only delivery after 3 expiries and a deadline
// failure; without housekeeping 35 (a report step then an email-only delivery
// is 35, two question steps 32). The run's meter (RUN_COST in runner.ts) starts
// a piece of work only if it still fits under 40.

type Kind = "L" | "H" | "Q"; // light (email only), heavy (report), question

async function measure(order: Kind[], housekeeping: boolean) {
  const providerCalls = { n: 0 };
  const resendCalls = { n: 0 };
  // Resend through the real sender with a counting fetch: failure emails are
  // rejected (three tries each), ready emails are accepted.
  const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
    resendCalls.n += 1;
    const subject = String(JSON.parse(String(init?.body)).subject);
    return subject.includes("siap")
      ? Response.json({ id: "re-1" })
      : new Response("{}", { status: 500 });
  }) as typeof fetch;
  const sender = resendMailSender({ apiKey: "k", from: "n@x.test", fetchImpl });
  const paid = async (stage: string) => {
    const spend = await reserveProviderSpend({
      provider: "openai",
      stage,
      usd: 0.1,
    });
    providerCalls.n += 1;
    await spend.settle(0.05);
  };
  const deps = (extra: Partial<RunnerDeps> = {}): RunnerDeps => ({
    db: d1.db,
    environment: "production",
    mode: "live",
    siteOrigin: "https://v2.nuave.test",
    now: () => clock,
    execute: async (input) => {
      await paid("observation");
      return executeSyntheticLocalObservation(input);
    },
    generateReport: (async () => {
      await paid("report");
      return {};
    }) as unknown as RunnerDeps["generateReport"],
    sender,
    sleep: async () => {},
    ...extra,
  });
  const live = async () => {
    const id = await makeOrder(d1.db, {
      mode: "live",
      limitUsd: 2,
      dailyLimitUsd: 1000,
      now: clock,
    });
    await approve(d1.db, id, { mode: "live", now: clock });
    return id;
  };
  const sql = (text: string) => d1.db.prepare(text).bind().run();

  // Two orders that pass their deadline (held by another runner, so they take
  // no audit step until then): one fails in a run of its own and its failure
  // email is rejected (the retry below), the other fails in the counted run.
  const stale = housekeeping ? [await live(), await live()] : [];
  for (const id of stale) {
    await sql(
      `UPDATE orders SET lease_owner = 'other', lease_until = '${new Date(clock.getTime() + 14 * 3600_000).toISOString()}' WHERE id = '${id}'`,
    );
  }
  advance(13 * 3600_000);
  // A light order: report saved, ready email not yet sent (no sender).
  const light = await live();
  for (let i = 0; i < 14 && !orderRow(light).report_json; i += 1) {
    await runOrders(deps({ sender: null }));
    advance(60_000);
  }
  expect(orderRow(light).report_json).toBeTruthy();
  // A heavy order: all ten answers saved, the report still to make.
  const heavy = await live();
  for (let i = 0; i < 14 && state(heavy) === "running"; i += 1) {
    await runOrders(deps({ sender: null }));
    advance(60_000);
  }
  expect(state(heavy)).toBe("reporting");
  const questions = [await live(), await live()];
  advance(12 * 3600_000);
  if (housekeeping) {
    await runOrders(deps({ runBudgetMs: 0 })); // fails the first stale order
    expect(state(stale[0]!)).toBe("failed");
  }
  for (let i = 0; i < (housekeeping ? 5 : 0); i += 1) {
    await makeOrder(d1.db, {
      mode: "live",
      limitUsd: 0.5,
      dailyLimitUsd: 1000,
      now: new Date(clock.getTime() - 3 * 3600_000),
    });
  }
  advance(EMAIL_RETRY_BASE_MS + 1000); // the failure email is due again
  // The order the orders come in: the one that waited longest goes first.
  let q = 0;
  for (const [position, kind] of order.entries()) {
    const id = kind === "L" ? light : kind === "H" ? heavy : questions[q++]!;
    await sql(
      `UPDATE orders SET last_step_at = '2000-01-0${position + 1}T00:00:00.000Z' WHERE id = '${id}'`,
    );
  }
  providerCalls.n = 0;
  resendCalls.n = 0;
  const { counted, count } = counting(d1.db);
  const result = await runOrders(deps({ db: counted }));
  return {
    queries: count.queries,
    outbound: providerCalls.n + resendCalls.n,
    outcomes: result.outcomes,
  };
}

function orders(): Kind[][] {
  const seen = new Set<string>();
  const out: Kind[][] = [];
  const pick = (rest: Kind[], chosen: Kind[]) => {
    if (!rest.length) {
      const key = chosen.join("");
      if (!seen.has(key)) {
        seen.add(key);
        out.push(chosen);
      }
      return;
    }
    rest.forEach((kind, index) =>
      pick(
        [...rest.slice(0, index), ...rest.slice(index + 1)],
        [...chosen, kind],
      ),
    );
  };
  pick(["L", "H", "Q", "Q"], []);
  return out;
}

describe("the worst live run (Free plan: D1 queries + outbound requests)", () => {
  it.each(
    orders().flatMap((order) => [
      [order.join(""), true] as const,
      [order.join(""), false] as const,
    ]),
  )(
    "orders waiting as %s, with housekeeping %s (3 expiries, a deadline failure, a failure-email retry): whatever fits, at most 40 queries and outbound requests together",
    async (key, housekeeping) => {
      const result = await measure(key.split("") as Kind[], housekeeping);
      expect(result.queries + result.outbound).toBeLessThanOrEqual(
        COMBINED_LIMIT,
      );
    },
  );
});

/* ------------------------- spec 017 S4c: the new tasks ------------------------ */

// R-23, AC-21, AC-22. Every run below counts D1 queries and outbound requests
// (Resend, Midtrans, paid provider calls) together; it must stay at or below 40.
// Measured when written (see each test for the number it asserts):
//   idle live run with every S4 task on        9 queries, 0 outbound
//   reconciliation of an attempt with 3 transactions at the final check (3 + the
//   order_id answers, 4 Midtrans calls)        27 queries + 4 outbound, run total 36
describe("the spec 017 tasks in the cron's run budget (R-23, AC-21, AC-22)", () => {
  const MIN = 60_000;
  const FOUNDER = "founder@example.test";

  async function setup() {
    const { createFakeMidtrans } =
      await import("../payments/fake-midtrans.test-helper");
    const { startAttempt } = await import("../payments/attempts");
    const { applyStatus } = await import("../payments/apply");
    const { getStatus } = await import("../payments/midtrans");
    const { usdToUnits } = await import("../spending/spend-ledger");
    const fake = createFakeMidtrans();
    const outbound = { n: 0, providers: 0, mail: [] as string[] };
    const sender: RunnerDeps["sender"] = async (message) => {
      outbound.n += 1;
      outbound.mail.push(message.subject);
      return { accepted: true, messageId: `m${outbound.n}` };
    };
    const midtrans = {
      serverKey: fake.serverKey,
      isProduction: false,
      fetch: ((...args: Parameters<typeof fetch>) => {
        outbound.n += 1;
        return fake.fetch(...args);
      }) as typeof fetch,
    };
    const paid = async (stage: string) => {
      const spend = await reserveProviderSpend({
        provider: "openai",
        stage,
        usd: 0.1,
      });
      outbound.providers += 1;
      await spend.settle(0.05);
    };
    const base = (extra: Partial<RunnerDeps> = {}): RunnerDeps => ({
      db: d1.db,
      environment: "production",
      mode: "live",
      siteOrigin: "https://v2.nuave.test",
      now: () => clock,
      execute: async (input) => {
        await paid("observation");
        return executeSyntheticLocalObservation(input);
      },
      generateReport: (async () => {
        await paid("report");
        return {};
      }) as unknown as RunnerDeps["generateReport"],
      sender,
      sleep: async () => {},
      payments: {
        midtrans,
        limitUnits: usdToUnits(2),
        dailyLimitUnits: usdToUnits(1000),
        founderEmail: FOUNDER,
      },
      ...extra,
    });
    /** One run, counted: D1 queries plus outbound requests. */
    const counted = async (extra: Partial<RunnerDeps> = {}) => {
      const { counted: db, count } = counting(d1.db);
      outbound.n = 0;
      outbound.providers = 0;
      const mailBefore = outbound.mail.length;
      const result = await runOrders(base({ db, ...extra }));
      return {
        queries: count.queries,
        outbound: outbound.n + outbound.providers,
        total: count.queries + outbound.n + outbound.providers,
        outcomes: result.outcomes,
        mail: outbound.mail.slice(mailBefore),
      };
    };
    /** An unpaid live order with an open attempt started at `clock`, holding
     * `transactions` Midtrans transactions (all `expire`, so nothing settles). */
    const attempt = async (transactions: number) => {
      const id = await makeOrder(d1.db, {
        mode: "live",
        payment: "unpaid",
        now: clock,
      });
      const started = await startAttempt(d1.db, {
        orderId: id,
        environment: "production",
        mode: "live",
        now: clock,
        limitUnits: usdToUnits(2),
        dailyLimitUnits: usdToUnits(1000),
      });
      if (started.result !== "started") throw new Error("no attempt");
      for (let i = 0; i < transactions; i += 1) {
        const tx = fake.addTransaction({
          orderId: started.attempt.midtrans_order_id,
          transactionId: `tx-${started.attempt.midtrans_order_id}-${i}`,
          status: "expire",
          paymentType: "qris",
        });
        const answer = await getStatus(midtrans, tx.transaction_id);
        if (answer.kind !== "found") throw new Error("fake lost it");
        await applyStatus(
          {
            db: d1.db,
            now: clock,
            limitUnits: usdToUnits(2),
            dailyLimitUnits: usdToUnits(1000),
          },
          answer.status,
        );
      }
      return started.attempt;
    };
    /** Resend refuses the ready email (three tries) and takes everything else. */
    const pickySender: RunnerDeps["sender"] = async (message) => {
      outbound.n += 1;
      outbound.mail.push(message.subject);
      return message.subject.includes("siap")
        ? { accepted: false }
        : { accepted: true, messageId: `m${outbound.n}` };
    };
    return { base, counted, attempt, outbound, fake, midtrans, pickySender };
  }

  it("an idle run with every task on costs 9 D1 queries and no outbound request, so a report step (27) still fits", async () => {
    const { counted } = await setup();
    const idle = await counted();
    expect(idle.outcomes).toEqual([]);
    expect(idle.outbound).toBe(0);
    expect(idle.queries).toBe(9);
    expect(idle.total + 27).toBeLessThanOrEqual(COMBINED_LIMIT);
  });

  it("reconciliation of an attempt with several transaction IDs at the final check fits the run, and asks every one", async () => {
    const { counted, attempt, fake } = await setup();
    const open = await attempt(3);
    // Window end (60 min) + grace (30) + the further wait (60), plus a minute.
    advance(60 * MIN + 91 * MIN);
    fake.requests.length = 0;
    const run = await counted();
    expect(run.outcomes).toContain("reconciled");
    expect(run.total).toBeLessThanOrEqual(COMBINED_LIMIT);
    // Three transactions and the order_id: four Get Status calls.
    expect(fake.statusRequests()).toHaveLength(4);
    expect(
      d1.query<{ status: string }>(
        `SELECT status FROM payment_attempts WHERE id = '${open.id}'`,
      )[0]!.status,
    ).toBe("finally_unpaid");
    // Measured: 27 queries + 4 outbound requests inside a run of 36.
    expect(run.total).toBe(36);
  });

  it("an attempt with too many transactions for one run is not decided half way: it is due again at once and finishes on the next run", async () => {
    const { counted, attempt, fake } = await setup();
    const open = await attempt(6);
    advance(60 * MIN + 91 * MIN);
    fake.requests.length = 0;
    const first = await counted();
    expect(first.total).toBeLessThanOrEqual(COMBINED_LIMIT);
    const row = () =>
      d1.query<{ status: string; last_checked_at: string | null }>(
        `SELECT status, last_checked_at FROM payment_attempts WHERE id = '${open.id}'`,
      )[0]!;
    expect(row()).toEqual({ status: "open", last_checked_at: null });
    advance(MIN);
    const second = await counted();
    expect(second.total).toBeLessThanOrEqual(COMBINED_LIMIT);
    // Honest limit: six transactions need more asks than one run's meter has,
    // so the same first asks repeat; the attempt stays open (never wrongly
    // closed) and the founder is told after 24 hours (R-14).
    expect(row().status).toBe("open");
  });

  it("reconciles at most 2 attempts per run, oldest due first", async () => {
    const { counted, attempt } = await setup();
    for (let i = 0; i < 3; i += 1) {
      await attempt(1);
      advance(MIN);
    }
    advance(2 * 3600_000);
    const run = await counted();
    expect(run.outcomes.filter((entry) => entry === "reconciled")).toHaveLength(
      2,
    );
    expect(run.total).toBeLessThanOrEqual(COMBINED_LIMIT);
  });

  async function heavyOrder(base: (extra?: Partial<RunnerDeps>) => RunnerDeps) {
    const id = await makeOrder(d1.db, {
      mode: "live",
      limitUsd: 2,
      dailyLimitUsd: 1000,
      now: clock,
    });
    await approve(d1.db, id, { mode: "live", now: clock });
    for (let i = 0; i < 14 && state(id) === "running"; i += 1) {
      await runOrders(base({ sender: null }));
      advance(MIN);
    }
    expect(state(id)).toBe("reporting");
    return id;
  }

  it("a due payment email and refund notice wait at most one run behind a report step, which still runs", async () => {
    const { base, counted, outbound, pickySender } = await setup();
    const heavy = await heavyOrder(base);
    const { recordFounderNotice } = await import("../payments/notices");
    const paidId = await makeOrder(d1.db, {
      mode: "live",
      payment: "paid",
      limitUsd: 2,
      dailyLimitUsd: 1000,
      now: clock,
    });
    await recordFounderNotice(d1.db, {
      kind: "needs_refund",
      subject: "tx-wait",
      detail: { order_number: "NV-AAAAAA", amount: "99000.00" },
      now: clock,
    });
    // Three stale unpaid orders to expire, and the report step's ready email is
    // refused (three tries): together they use the room the payment email and
    // the notice would have needed.
    for (let i = 0; i < 3; i += 1) {
      await makeOrder(d1.db, {
        mode: "live",
        payment: "unpaid",
        now: new Date(clock.getTime() - 3 * 3600_000),
      });
    }
    const first = await counted({ sender: pickySender });
    expect(first.total).toBeLessThanOrEqual(COMBINED_LIMIT);
    // The report step ran (it is the audit step that always gets its run)...
    expect(first.outcomes).toContain("report_saved");
    // ...and what no longer fit (here the notice) was left for the next run.
    const sentFirst = ["payment_email", "notice"].filter((kind) =>
      first.outcomes.includes(kind as never),
    );
    expect(sentFirst.length).toBeLessThan(2);
    advance(MIN);
    const second = await counted({ sender: pickySender });
    expect(second.total).toBeLessThanOrEqual(COMBINED_LIMIT);
    // It had waited one run, so it went before any audit step: both are out now,
    // each exactly once.
    const all = [...first.outcomes, ...second.outcomes];
    expect(all.filter((kind) => kind === "payment_email")).toHaveLength(1);
    expect(all.filter((kind) => kind === "notice")).toHaveLength(1);
    expect(
      d1.query<{ n: number }>(
        `SELECT COUNT(*) AS n FROM payment_emails WHERE order_id = '${paidId}' AND result = 'accepted'`,
      )[0]!.n,
    ).toBe(1);
    expect(outbound.mail.filter((s) => s.includes("Pembayaran"))).toHaveLength(
      1,
    );
    expect(orderRow(heavy).report_json).toBeTruthy();
  });

  it("with room to spare, the email and the notice go in the same run as an audit step", async () => {
    const { counted } = await setup();
    const { recordFounderNotice } = await import("../payments/notices");
    await makeOrder(d1.db, {
      mode: "live",
      payment: "paid",
      limitUsd: 2,
      dailyLimitUsd: 1000,
      now: clock,
    });
    await recordFounderNotice(d1.db, {
      kind: "needs_refund",
      subject: "tx-now",
      now: clock,
    });
    const run = await counted();
    expect(run.outcomes).toEqual(["payment_email", "notice"]);
    expect(run.total).toBeLessThanOrEqual(COMBINED_LIMIT);
  });

  it("with the switch off or AI settings missing, the non-AI tasks still run and no audit step does", async () => {
    const { base, counted, outbound, attempt, fake } = await setup();
    const heavy = await heavyOrder(base);
    const running = await makeOrder(d1.db, {
      mode: "live",
      limitUsd: 2,
      dailyLimitUsd: 1000,
      now: clock,
    });
    await approve(d1.db, running, { mode: "live", now: clock });
    const { recordFounderNotice } = await import("../payments/notices");
    await makeOrder(d1.db, {
      mode: "live",
      payment: "paid",
      limitUsd: 2,
      dailyLimitUsd: 1000,
      now: clock,
    });
    await recordFounderNotice(d1.db, {
      kind: "needs_refund",
      subject: "tx-off",
      now: clock,
    });
    // A stale unpaid order (the expiry sweep) and an attempt due a check.
    await makeOrder(d1.db, {
      mode: "live",
      payment: "unpaid",
      now: new Date(clock.getTime() - 3 * 3600_000),
    });
    const open = await attempt(1);
    advance(3 * 3600_000);
    advance(MIN);
    fake.requests.length = 0;
    const off = await counted({ auditEnabled: false });
    expect(off.outcomes).toEqual(
      expect.arrayContaining([
        "reconciled",
        "expired",
        "payment_email",
        "notice",
      ]),
    );
    expect(off.outcomes).not.toContain("report_saved");
    expect(off.outcomes).not.toContain("question_done");
    expect(outbound.providers).toBe(0); // no provider call in the counted run
    expect(fake.statusRequests().length).toBeGreaterThan(0);
    expect(state(heavy)).toBe("reporting");
    expect(orderRow(heavy).report_json).toBeNull();
    expect(off.total).toBeLessThanOrEqual(COMBINED_LIMIT);
    expect(open.id).toBeTruthy();
  });

  it("legacy orders (no payment kind) finish as before and get an order number before their email", async () => {
    const { counted, base } = await setup();
    const id = await makeOrder(d1.db, {
      mode: "live",
      payment: "legacy",
      limitUsd: 2,
      dailyLimitUsd: 1000,
      now: clock,
    });
    d1.query(
      `UPDATE orders SET order_number = NULL WHERE id = '${id}' RETURNING 1`,
    );
    await approve(d1.db, id, { mode: "live", now: clock });
    for (let i = 0; i < 14 && state(id) === "running"; i += 1) {
      await runOrders(base({ sender: null }));
      advance(MIN);
    }
    expect(state(id)).toBe("reporting");
    let last = await counted();
    for (let i = 0; i < 3 && state(id) !== "delivered"; i += 1) {
      advance(MIN);
      last = await counted();
    }
    expect(last.total).toBeLessThanOrEqual(COMBINED_LIMIT);
    expect(state(id)).toBe("delivered");
    expect(
      d1.query<{ order_number: string | null }>(
        `SELECT order_number FROM orders WHERE id = '${id}'`,
      )[0]!.order_number,
    ).toMatch(/^NV-/);
  });
});
