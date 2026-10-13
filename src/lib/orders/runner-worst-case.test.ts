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
