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

// The worst live cron run must stay at or below 40 D1 queries, and its outbound
// requests (paid provider calls plus Resend sends) well under 50 (Free plan).

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

describe("the worst live run", () => {
  it("3 expiries, a deadline failure and a failure-email retry (both emails rejected), one report step with both paid calls and an accepted ready email (it runs alone, so the waiting question step is left for the next run): at most 40 queries and well under 50 outbound requests", async () => {
    const providerCalls = { n: 0 };
    const resendCalls = { n: 0 };
    // Resend through the real sender with a counting fetch: failure emails are
    // rejected (three tries each), the ready email is accepted.
    const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
      resendCalls.n += 1;
      const subject = String(JSON.parse(String(init?.body)).subject);
      return subject.includes("siap")
        ? Response.json({ id: "re-1" })
        : new Response("{}", { status: 500 });
    }) as typeof fetch;
    const sender = resendMailSender({
      apiKey: "k",
      from: "n@x.test",
      fetchImpl,
    });
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

    const stale = [await live(), await live(), await live()];
    for (const id of stale) {
      await d1.db
        .prepare(
          `UPDATE orders SET lease_owner = 'other', lease_until = '2099-01-01T00:00:00.000Z' WHERE id = '${id}'`,
        )
        .bind()
        .run();
    }
    advance(13 * 3600_000);
    // One order gets all ten answers saved (it is the only one stepping).
    const reporting = await live();
    for (let i = 0; i < 12 && state(reporting) === "running"; i += 1) {
      // Question steps only: no report step until the order is `reporting`.
      await runOrders(deps({ sender: null }));
      advance(60_000);
    }
    expect(state(reporting)).toBe("reporting");
    // The report step is left for the counted run: its report attempt is untouched.
    const questioning = await live();
    advance(12 * 3600_000);
    // Runs that fit no audit step: only the deadline failures run.
    await runOrders(deps({ runBudgetMs: 0 }));
    await runOrders(deps({ runBudgetMs: 0 }));
    expect(stale.filter((id) => state(id) === "failed")).toHaveLength(2);
    for (let i = 0; i < 5; i += 1) {
      await makeOrder(d1.db, {
        mode: "live",
        limitUsd: 0.5,
        dailyLimitUsd: 1000,
        now: new Date(clock.getTime() - 3 * 3600_000),
      });
    }
    advance(EMAIL_RETRY_BASE_MS + 1000);

    // The report order has waited longest, so it goes first and runs alone.
    await d1.db
      .prepare(
        `UPDATE orders SET last_step_at = '${clock.toISOString()}' WHERE id = '${questioning}'`,
      )
      .bind()
      .run();
    providerCalls.n = 0;
    resendCalls.n = 0;
    const { counted, count } = counting(d1.db);
    const result = await runOrders(deps({ db: counted }));
    const tally = (outcome: string) =>
      result.outcomes.filter((entry) => entry === outcome).length;
    expect(tally("expired")).toBe(MAX_EXPIRED_PER_RUN);
    expect(tally("failed_deadline")).toBe(1);
    expect(tally("report_saved")).toBe(1);
    expect(tally("question_done")).toBe(0); // the report step runs alone
    expect(tally("waiting")).toBe(1);
    expect(state(reporting)).toBe("delivered");
    expect(state(questioning)).toBe("running");
    // 2 report calls; Resend: 3 + 3 rejected failure emails
    // and 1 accepted ready email.
    expect(providerCalls.n).toBe(2);
    expect(resendCalls.n).toBe(7);
    expect(providerCalls.n + resendCalls.n).toBeLessThanOrEqual(9);
    expect(count.queries).toBeLessThanOrEqual(40);
    // Measured when written: 33 queries, 9 outbound requests (2 provider calls
    // and 7 Resend tries). The other heavy mix, two question steps with two
    // failure emails, is 40 queries (runner.test.ts).
  });
});
