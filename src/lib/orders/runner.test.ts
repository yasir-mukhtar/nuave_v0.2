import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

import {
  executeSyntheticLocalObservation,
  generateSyntheticLocalReport,
} from "../audit/local-direct-ten-audit";
import { ReportPipelineError } from "../audit/report-pipeline";
import { AuditCallExecutionError, AuditBudgetError } from "../audit/telemetry";
import type { QuestionExecuteInput } from "../audit/retry";
import type { AuditObservation } from "../audit/types";
import { reserveProviderSpend } from "../spending/provider-spend";
import { usdToUnits } from "../spending/spend-ledger";
import { openFileD1 } from "../spending/sqlite-d1.test-helper";
import {
  claimOrderLease,
  renewOrderLease,
  EMAIL_RETRY_BASE_MS,
  EMAIL_RETRY_MAX_MS,
  emailRetryDelayMs,
  ORDER_DEADLINE_MS,
  ORDER_OPEN_MS,
  orderStatus,
  getOrder,
} from "./store";
import {
  runOrders,
  OBSERVATION_STEP_MS,
  REPORT_STEP_MS,
  sha256Hex,
  type RunnerDeps,
} from "./runner";
import {
  approve,
  makeOrder,
  mailbox,
  secretIn,
  T0,
} from "./orders.test-helper";

// Spec 016 R-15..R-23, AC-06..AC-08, AC-10, AC-12, AC-13: the real runner, the
// real ledger code and the real migrations on the sqlite D1 helper, with a fake
// paid provider and a fake mailbox. No network, no provider call.

let dir: string;
let file: string;
let d1: ReturnType<typeof openFileD1>;
let clock: Date;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-runner-"));
  file = join(dir, "orders.sqlite");
  d1 = openFileD1(file);
  clock = T0;
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

const advance = (ms: number) => {
  clock = new Date(clock.getTime() + ms);
};
const minute = () => advance(60_000);
/** Longer than the longest email retry delay, so a retry is due. */
const pastBackoff = () => advance(EMAIL_RETRY_MAX_MS + 1000);

function deps(overrides: Partial<RunnerDeps> = {}): RunnerDeps & {
  calls: string[];
  mail: ReturnType<typeof mailbox>;
  reports: { n: number };
} {
  const calls: string[] = [];
  const reports = { n: 0 };
  const mail = mailbox();
  return {
    db: d1.db,
    environment: "production",
    mode: "synthetic",
    siteOrigin: "https://v2.nuave.test",
    now: () => clock,
    execute: async (input: QuestionExecuteInput) => {
      calls.push(input.prompt.prompt_id);
      return executeSyntheticLocalObservation(input);
    },
    generateReport: async (...args) => {
      reports.n += 1;
      return generateSyntheticLocalReport(...args);
    },
    sender: mail.sender,
    sleep: async () => {},
    calls,
    mail,
    reports,
    ...overrides,
  };
}

const rows = (sql: string) => d1.query<Record<string, unknown>>(sql);
const orderRow = (id: string) =>
  rows(`SELECT * FROM orders WHERE id = '${id}'`)[0];

async function runningOrder(
  options: { mode?: "live" | "synthetic"; limitUsd?: number } = {},
) {
  const mode = options.mode ?? "synthetic";
  const id = await makeOrder(d1.db, {
    mode,
    limitUsd: options.limitUsd,
    now: clock,
  });
  await approve(d1.db, id, { mode, now: clock });
  return id;
}

describe("synthetic order, whole path (R-16..R-23)", () => {
  it("does one audit step per order per run, saves each result, writes the report and delivers after the email is accepted", async () => {
    const id = await runningOrder();
    const d = deps();
    // R-16: one question per run.
    const first = await runOrders(d);
    expect(first.outcomes).toEqual(["question_done"]);
    expect(d.calls).toHaveLength(1);
    expect(
      rows("SELECT COUNT(*) AS n FROM order_questions WHERE status = 'done'")[0]
        .n,
    ).toBe(1);

    for (let i = 0; i < 9; i += 1) {
      minute();
      await runOrders(d);
    }
    // Ten saved results: the order moved to `reporting` (R-20).
    expect(orderRow(id).state).toBe("reporting");
    expect(d.calls).toEqual(
      Array.from(
        { length: 10 },
        (_, i) => `NUAVE-DT-${String(i + 1).padStart(2, "0")}`,
      ),
    );

    minute();
    expect((await runOrders(d)).outcomes).toEqual(["report_saved"]);
    const delivered = orderRow(id);
    expect(delivered.state).toBe("delivered");
    expect(delivered.report_json).toBeTruthy();
    expect(delivered.completed_at).toBe(clock.toISOString());
    // The link works 12 months after completion (R-24).
    expect(delivered.link_expires_at).toBe("2027-10-12T10:10:00.000Z");
    // One ready email, link on the fixed site address, only the hash stored.
    expect(d.mail.sent).toHaveLength(1);
    const secret = secretIn(d.mail.sent[0]);
    expect(d.mail.sent[0].text).toContain(`https://v2.nuave.test/r#${secret}`);
    expect(d.mail.sent[0].to).toBe("owner@example.com");
    expect(JSON.stringify(delivered)).not.toContain(secret);
    expect(delivered.link_hash).toMatch(/^[0-9a-f]{64}$/);
    // Synthetic: no ledger rows at all.
    expect(rows("SELECT * FROM provider_spend")).toEqual([]);
    // Nothing more happens to a finished order.
    minute();
    expect((await runOrders(d)).outcomes).toEqual([]);
    expect(d.reports.n).toBe(1);
  });

  it("the status shows the state and question progress only", async () => {
    const id = await runningOrder();
    const d = deps();
    await runOrders(d);
    const status = await orderStatus(d1.db, {
      orderId: id,
      environment: "production",
      now: clock,
    });
    expect(status?.state).toBe("running");
    expect(status?.completed).toBe(1);
    expect(status?.questions[0]).toEqual({
      prompt_id: "NUAVE-DT-01",
      status: "completed",
    });
    const text = JSON.stringify(status);
    expect(text).not.toContain("example.com");
    expect(text).not.toContain("report");
    expect(text).not.toContain("secret");
  });

  it("start time and deadline are set once and never change", async () => {
    const id = await runningOrder();
    const before = orderRow(id);
    expect(before.started_at).toBe(T0.toISOString());
    expect(before.deadline_at).toBe(
      new Date(T0.getTime() + ORDER_DEADLINE_MS).toISOString(),
    );
    const d = deps();
    for (let i = 0; i < 4; i += 1) {
      minute();
      await runOrders(d);
    }
    const after = orderRow(id);
    expect(after.started_at).toBe(before.started_at);
    expect(after.deadline_at).toBe(before.deadline_at);
    expect(after.intake_json).toBe(before.intake_json);
  });
});

describe("one runner at a time, restarts (R-18, AC-10)", () => {
  it("a stopped and restarted run (new database connection) never calls a saved question again", async () => {
    const id = await runningOrder();
    const first = deps();
    for (let i = 0; i < 4; i += 1) {
      await runOrders(first);
      minute();
    }
    expect(first.calls).toHaveLength(4);
    // "Restart": a fresh connection and a fresh runner with no memory.
    d1.close();
    d1 = openFileD1(file);
    const second = deps({ db: d1.db });
    for (let i = 0; i < 8; i += 1) {
      await runOrders(second);
      minute();
    }
    expect(orderRow(id).state).toBe("delivered");
    const all = [...first.calls, ...second.calls];
    expect(all).toHaveLength(10);
    expect(new Set(all).size).toBe(10);
  });

  it("two runners started together never call the same question at once", async () => {
    await runningOrder();
    let inFlight = 0;
    let maxInFlight = 0;
    const seen: string[] = [];
    const slow = async (input: QuestionExecuteInput) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      seen.push(input.prompt.prompt_id);
      await new Promise((resolve) => setTimeout(resolve, 20));
      inFlight -= 1;
      return executeSyntheticLocalObservation(input);
    };
    const other = openFileD1(file);
    const a = deps({ execute: slow });
    const b = deps({ execute: slow, db: other.db });
    const [ra, rb] = await Promise.all([runOrders(a), runOrders(b)]);
    other.close();
    expect(maxInFlight).toBe(1);
    expect(seen).toEqual(["NUAVE-DT-01"]);
    expect([...ra.outcomes, ...rb.outcomes].sort()).toEqual([
      "question_done",
      "skipped",
    ]);
  });

  it("a question cut off mid-call counts as an attempt and never gets more than three", async () => {
    const id = await runningOrder();
    const { claimOrderLease, claimQuestion } = await import("./store");
    // Attempt 1 is cut off: claimed, never finished (the runner died).
    expect(
      await claimOrderLease(d1.db, {
        orderId: id,
        owner: "dead",
        now: clock,
        leaseMs: 1000,
      }),
    ).toBe(true);
    expect(
      await claimQuestion(d1.db, {
        orderId: id,
        promptId: "NUAVE-DT-01",
        owner: "dead",
        now: clock,
        claimMs: 1000,
      }),
    ).toBe(1);
    // While the dead claim is fresh, nobody else takes it.
    const failing = deps({
      execute: async () => {
        throw new Error("provider timed out");
      },
    });
    // (An order another runner holds is not even picked for a step.)
    expect((await runOrders(failing)).outcomes).toEqual([]);
    expect(failing.calls).toEqual([]);
    // Its claim and lease have expired: attempts 2 and 3 are the runner's.
    advance(10 * 60_000);
    expect((await runOrders(failing)).outcomes).toEqual(["question_retry"]);
    advance(10 * 60_000);
    expect((await runOrders(failing)).outcomes).toEqual(["question_failed"]);
    const row = rows(
      "SELECT attempts, status FROM order_questions WHERE prompt_id = 'NUAVE-DT-01'",
    )[0];
    expect(row).toEqual({ attempts: 3, status: "exhausted" });
    expect(orderRow(id).state).toBe("failed");
    // R-23: one failure email.
    expect(failing.mail.sent).toHaveLength(1);
    expect(failing.mail.sent[0].subject).toContain("belum bisa diselesaikan");
  });

  it("a third attempt cut off mid-call is spent: the order fails, nothing is called again", async () => {
    const id = await runningOrder();
    d1.query(
      "UPDATE order_questions SET attempts = 3, claim_owner = 'dead', claim_until = '2026-10-12T10:01:00.000Z' WHERE prompt_id = 'NUAVE-DT-01' RETURNING 1",
    );
    advance(10 * 60_000);
    const d = deps();
    await runOrders(d);
    expect(d.calls).toEqual([]);
    expect(orderRow(id).state).toBe("failed");
  });

  it("retries a failed question after its backoff and keeps the failed attempt's telemetry", async () => {
    const id = await runningOrder();
    let n = 0;
    const flaky = deps({
      execute: async (input) => {
        n += 1;
        if (n === 1) {
          return {
            ...(await executeSyntheticLocalObservation(input)),
            run_status: "failed" as const,
            raw_answer: "",
            failure_reason: "temporary upstream error",
            telemetry: [],
          } as AuditObservation;
        }
        return executeSyntheticLocalObservation(input);
      },
    });
    expect((await runOrders(flaky)).outcomes).toEqual(["question_retry"]);
    // Its backoff (2-5 s) is not over: the next run does the next question.
    expect((await runOrders(flaky)).outcomes).toEqual(["question_done"]);
    expect(flaky.calls).toEqual([]);
    advance(10_000);
    // The backoff is over: the failed question is tried again, once.
    expect((await runOrders(flaky)).outcomes).toEqual(["question_done"]);
    expect(n).toBe(3);
    expect(
      rows(
        "SELECT prompt_id, attempts, status FROM order_questions ORDER BY position LIMIT 2",
      ),
    ).toEqual([
      { prompt_id: "NUAVE-DT-01", attempts: 2, status: "done" },
      { prompt_id: "NUAVE-DT-02", attempts: 1, status: "done" },
    ]);
    expect(orderRow(id).state).toBe("running");
  });
});

describe("environment and mode (R-15, AC-11)", () => {
  it("never runs an order whose mode or environment differs from its own", async () => {
    const synthetic = await runningOrder();
    const previewId = await makeOrder(d1.db, {
      environment: "preview",
      now: clock,
    });
    await approve(d1.db, previewId, { environment: "preview", now: clock });
    const live = deps({ mode: "live" });
    expect((await runOrders(live)).outcomes).toEqual([]);
    expect(live.calls).toEqual([]);
    const production = deps({ environment: "production" });
    await runOrders(production);
    expect(production.calls).toHaveLength(1); // only the production order
    expect(orderRow(synthetic).state).toBe("running");
    expect(orderRow(previewId).state).toBe("running");
    expect(
      rows(
        `SELECT COUNT(*) AS n FROM order_questions WHERE order_id = '${previewId}' AND status = 'done'`,
      )[0].n,
    ).toBe(0);
  });

  it("stops starting new work when the time budget would be passed", async () => {
    await runningOrder();
    const d = deps({ runBudgetMs: OBSERVATION_STEP_MS - 1 });
    expect((await runOrders(d)).outcomes).toEqual(["waiting"]);
    expect(d.calls).toEqual([]);
  });
});

describe("expiry and deadline (R-22, R-23, AC-12)", () => {
  it("an open order becomes expired 2 hours after creation, not before", async () => {
    const id = await makeOrder(d1.db, { now: clock });
    const d = deps();
    advance(ORDER_OPEN_MS - 1000);
    expect((await runOrders(d)).outcomes).toEqual([]);
    expect(orderRow(id).state).toBe("open");
    advance(1000);
    expect((await runOrders(d)).outcomes).toEqual(["expired"]);
    expect(orderRow(id).state).toBe("expired");
    // The status reads expired too, and a paid call would be refused.
    expect(d.calls).toEqual([]);
    expect(d.mail.sent).toEqual([]); // no email for an unstarted order
  });

  it("a live open order that expires gives its hold back", async () => {
    const id = await makeOrder(d1.db, { mode: "live", now: clock });
    expect(d1.heldUnitsToday("2026-10-12")).toBe(usdToUnits(2));
    advance(ORDER_OPEN_MS);
    const d = deps({ mode: "live" });
    await runOrders(d);
    expect(orderRow(id).state).toBe("expired");
    expect(d1.heldUnitsToday("2026-10-12")).toBe(0);
  });

  it("a running order with no accepted ready email is failed at its deadline, with one failure email", async () => {
    const id = await runningOrder();
    // The ready email is never accepted; the failure email is.
    const mail = mailbox((message) => !message.subject.includes("siap"));
    const d = deps({ sender: mail.sender });
    for (let i = 0; i < 12; i += 1) {
      await runOrders(d);
      minute();
    }
    expect(orderRow(id).state).toBe("reporting");
    expect(orderRow(id).report_json).toBeTruthy();
    for (let i = 0; i < 3; i += 1) {
      pastBackoff(); // email retries back off, so a retry is due only later
      await runOrders(d);
    }
    // Each later run is a new send with a new secret; only the newest hash stays.
    const ready = mail.sent.filter((m) => m.subject.includes("siap"));
    const attempts = new Set(ready.map((m) => m.idempotencyKey));
    expect(attempts.size).toBeGreaterThan(1);
    // Retries inside one attempt reuse key, secret and body; each later
    // attempt has a new key and a new secret.
    for (const key of attempts) {
      const same = ready.filter((m) => m.idempotencyKey === key);
      expect(new Set(same.map(secretIn)).size).toBe(1);
      expect(new Set(same.map((m) => m.text)).size).toBe(1);
    }
    expect(new Set(ready.map(secretIn)).size).toBe(attempts.size);
    expect(orderRow(id).link_hash).toBeTruthy();
    const reportsBefore = d.reports.n;

    advance(ORDER_DEADLINE_MS);
    expect((await runOrders(d)).outcomes).toEqual(["failed_deadline"]);
    expect(orderRow(id).state).toBe("failed");
    expect(orderRow(id).failure_code).toBe("deadline");
    const failure = mail.sent.filter((m) => m.subject.includes("belum bisa"));
    expect(failure).toHaveLength(1);
    // Later runs do not fail it again or resend an accepted failure email.
    minute();
    await runOrders(d);
    expect(
      mail.sent.filter((m) => m.subject.includes("belum bisa")),
    ).toHaveLength(1);
    // Retrying an email never reruns the audit or rewrites the report (D3).
    expect(d.reports.n).toBe(reportsBefore);
  });

  it("the failure email is retried for 24 hours after the failure, then stops", async () => {
    const id = await runningOrder();
    const failureKeys = new Set<string>();
    const mail = mailbox((message) => {
      if (message.subject.includes("belum bisa")) {
        failureKeys.add(message.idempotencyKey);
        return message.idempotencyKey.endsWith("failure-3");
      }
      return true;
    });
    const d = deps({ sender: mail.sender });
    advance(ORDER_DEADLINE_MS);
    await runOrders(d); // fails the order; failure email attempt 1 not accepted
    expect(failureKeys.size).toBe(1);
    pastBackoff();
    await runOrders(d); // attempt 2
    pastBackoff();
    await runOrders(d); // attempt 3 accepted
    expect(failureKeys.size).toBe(3);
    pastBackoff();
    await runOrders(d);
    expect(failureKeys.size).toBe(3); // accepted: no more sends
    expect(orderRow(id).state).toBe("failed");
    // A second order whose failure email never gets through stops after 24h.
    const id2 = await runningOrder();
    const never = deps({ sender: mailbox(() => false).sender });
    advance(ORDER_DEADLINE_MS);
    await runOrders(never);
    expect(orderRow(id2).state).toBe("failed");
    const sentBefore = never.mail.sent.length;
    advance(25 * 3600_000);
    await runOrders(never);
    expect(never.mail.sent.length).toBe(sentBefore);
  });

  it("an order is delivered only after the send is accepted", async () => {
    const id = await runningOrder();
    let accept = false;
    const mail = mailbox(() => accept);
    const d = deps({ sender: mail.sender });
    for (let i = 0; i < 11; i += 1) {
      await runOrders(d);
      minute();
    }
    expect(orderRow(id).state).toBe("reporting");
    accept = true;
    pastBackoff();
    await runOrders(d);
    expect(orderRow(id).state).toBe("delivered");
  });
});

describe("report failure (R-19, AC-13)", () => {
  async function reportingOrder(generate: RunnerDeps["generateReport"]) {
    const id = await runningOrder();
    const d = deps({ generateReport: generate });
    for (let i = 0; i < 10; i += 1) {
      await runOrders(d);
      minute();
    }
    expect(orderRow(id).state).toBe("reporting");
    return { id, d };
  }

  it("a report that classifyReportRecovery marks final fails the order with no more report calls", async () => {
    let calls = 0;
    const { id, d } = await reportingOrder(async () => {
      calls += 1;
      throw new ReportPipelineError(
        "integrity",
        422,
        [],
        "REPORT_INTEGRITY_FAILURE",
      );
    });
    expect((await runOrders(d)).outcomes).toEqual(["report_failed"]);
    expect(orderRow(id).state).toBe("failed");
    expect(orderRow(id).failure_code).toBe("report_integrity_failure");
    minute();
    await runOrders(d);
    expect(calls).toBe(1);
    expect(d.mail.sent).toHaveLength(1); // the failure email
  });

  it("a transient report failure is retried up to three attempts, counted in D1", async () => {
    let calls = 0;
    const { id, d } = await reportingOrder(async () => {
      calls += 1;
      throw new AuditCallExecutionError("upstream", []);
    });
    expect((await runOrders(d)).outcomes).toEqual(["report_retry"]);
    minute();
    expect((await runOrders(d)).outcomes).toEqual(["report_retry"]);
    minute();
    expect((await runOrders(d)).outcomes).toEqual(["report_failed"]);
    expect(calls).toBe(3);
    expect(orderRow(id).report_attempts).toBe(3);
    expect(orderRow(id).state).toBe("failed");
    minute();
    await runOrders(d);
    expect(calls).toBe(3);
  });

  it("a restart does not reset the report attempt count", async () => {
    let calls = 0;
    const { id } = await reportingOrder(async () => {
      calls += 1;
      throw new AuditCallExecutionError("upstream", []);
    });
    const throwing = async () => {
      calls += 1;
      throw new AuditCallExecutionError("upstream", []);
    };
    await runOrders(deps({ generateReport: throwing }));
    minute();
    d1.close();
    d1 = openFileD1(file);
    await runOrders(deps({ db: d1.db, generateReport: throwing }));
    minute();
    await runOrders(deps({ db: d1.db, generateReport: throwing }));
    expect(calls).toBe(3);
    expect(orderRow(id).state).toBe("failed");
  });

  it("a budget refusal inside the report is a limit failure", async () => {
    const { id, d } = await reportingOrder(async () => {
      throw new AuditBudgetError("The next report call could exceed the limit");
    });
    expect((await runOrders(d)).outcomes).toEqual(["report_failed"]);
    expect(orderRow(id).failure_code).toBe("report_limit_exhausted");
  });
});

describe("live order and its own limit (R-09..R-11, AC-06, AC-07)", () => {
  /** A fake paid provider that goes through the real ledger. */
  function paid(settleUsd: number | null, reserveUsd = 0.4) {
    const calls: string[] = [];
    const execute = async (input: QuestionExecuteInput) => {
      const spend = await reserveProviderSpend({
        provider: "openai",
        stage: "observation",
        usd: reserveUsd,
      });
      calls.push(input.prompt.prompt_id);
      if (settleUsd === null) throw new Error("connection dropped"); // unknown cost
      await spend.settle(settleUsd);
      return executeSyntheticLocalObservation(input);
    };
    return { calls, execute };
  }

  beforeEach(() => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
  });

  it("a call that would pass the order's hold is not sent and the order ends failed", async () => {
    const id = await runningOrder({ mode: "live", limitUsd: 1 });
    const provider = paid(null);
    const d = deps({ mode: "live", execute: provider.execute });
    const outcomes: string[] = [];
    for (let i = 0; i < 5 && orderRow(id).state === "running"; i += 1) {
      outcomes.push(...(await runOrders(d)).outcomes);
      advance(30_000);
    }
    // 1.00 hold: two unknown-cost 0.40 calls fit; the third is refused unsent.
    expect(provider.calls).toHaveLength(2);
    expect(outcomes).toEqual(["question_retry", "question_retry", "failed"]);
    const order = orderRow(id);
    expect(order.state).toBe("failed");
    expect(order.failure_code).toBe("order_limit");
    expect(d.mail.sent).toHaveLength(1);
    // The hold was settled to the two held calls; the rest is back in the cap.
    expect(
      rows(
        "SELECT status, held_units FROM provider_spend WHERE kind = 'order_hold'",
      )[0],
    ).toEqual({ status: "settled", held_units: usdToUnits(0.8) });
    expect(d1.heldUnitsToday("2026-10-12")).toBe(usdToUnits(0.8));
  });

  it("still finishes the questions when other spend fills the daily cap and the UTC day changes", async () => {
    const id = await runningOrder({ mode: "live", limitUsd: 2 });
    d1.query(
      `INSERT INTO provider_spend (id, day, status, provider, stage, reserved_units, held_units, created_at)
       VALUES ('fill', '2026-10-12', 'reserved', 'openai', 'x', 1, ${usdToUnits(3)}, 't') RETURNING id`,
    );
    expect(d1.heldUnitsToday("2026-10-12")).toBe(usdToUnits(5));
    // Start just before midnight UTC so the run crosses the day change.
    clock = new Date("2026-10-12T23:58:30.000Z");
    const provider = paid(0.05, 0.1);
    const d = deps({ mode: "live", execute: provider.execute });
    for (let i = 0; i < 6; i += 1) {
      await runOrders(d);
      advance(60_000);
    }
    expect(provider.calls.length).toBe(6);
    expect(orderRow(id).state).toBe("running");
    expect(d1.heldUnitsToday("2026-10-13")).toBe(0); // the new day is untouched
    expect(
      rows(
        "SELECT DISTINCT day FROM provider_spend WHERE kind = 'order_call' ORDER BY day",
      ).map((r) => r.day),
    ).toEqual(["2026-10-12", "2026-10-13"]);
  });

  it("a SpendCapError from an unavailable ledger gives the attempt back", async () => {
    const id = await runningOrder({ mode: "live", limitUsd: 1 });
    // Break the call insert: no `orders` table row is needed, so drop the hold.
    d1.query(
      `DELETE FROM provider_spend WHERE kind = 'order_hold' AND order_id = '${id}' RETURNING 1`,
    );
    const provider = paid(0.05, 0.1);
    const d = deps({ mode: "live", execute: provider.execute });
    // No hold row: the call is refused (order_refused) and nothing is called.
    expect((await runOrders(d)).outcomes).toEqual(["skipped"]);
    expect(provider.calls).toEqual([]);
  });

  it("settles the hold when the order is delivered and flags an overrun", async () => {
    const id = await runningOrder({ mode: "live", limitUsd: 2 });
    const provider = paid(0.1, 0.2);
    const d = deps({ mode: "live", execute: provider.execute });
    for (let i = 0; i < 10; i += 1) {
      await runOrders(d);
      minute();
    }
    // The report stage in live mode needs real observations; end the order here.
    const { endOrder } = await import("../spending/spend-ledger");
    expect(
      await endOrder(d1.db, {
        orderId: id,
        from: ["reporting"],
        to: "failed",
        now: () => clock,
      }),
    ).toBe(true);
    expect(
      rows(
        "SELECT status, held_units FROM provider_spend WHERE kind = 'order_hold'",
      )[0],
    ).toEqual({ status: "settled", held_units: usdToUnits(1.0) });
    expect(orderRow(id).overrun).toBe(0);
  });
});

describe("getOrder helper", () => {
  it("rejects anything that is not a server-made id", async () => {
    expect(await getOrder(d1.db, "x' OR '1'='1")).toBeNull();
  });
});

describe("limits per run (Free plan: 50 D1 queries)", () => {
  /** A D1 handle that counts every query the runner sends: each statement
   * run on its own is one query, and a batch is one query for all of its
   * statements (a batch is one round trip). */
  function counting(db: RunnerDeps["db"]) {
    const count = { queries: 0, statements: 0 };
    type Stmt = ReturnType<ReturnType<RunnerDeps["db"]["prepare"]>["bind"]>;
    const raw = new WeakMap<object, Stmt>();
    const wrap = (statement: Stmt): Stmt => {
      const wrapped: Stmt = {
        run: () => {
          count.queries += 1;
          count.statements += 1;
          return statement.run();
        },
        first: <T>() => {
          count.queries += 1;
          count.statements += 1;
          return statement.first<T>();
        },
        all: <T>() => {
          count.queries += 1;
          count.statements += 1;
          return statement.all<T>();
        },
      };
      raw.set(wrapped, statement);
      return wrapped;
    };
    const counted: RunnerDeps["db"] = {
      prepare: (sql) => ({
        bind: (...values) => wrap(db.prepare(sql).bind(...values)),
      }),
      batch: (statements) => {
        count.queries += 1;
        count.statements += statements.length;
        return db.batch(statements.map((statement) => raw.get(statement)!));
      },
    };
    return { counted, count };
  }

  it("one live run with every cap reached: 3 expired, 1 deadline failure, 2 audit steps with ledger reserve and settle, and failure emails due, at most 40 queries", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    const rejecting = mailbox(() => false);
    const order = async () => {
      const id = await makeOrder(d1.db, {
        mode: "live",
        limitUsd: 0.5,
        dailyLimitUsd: 1000,
        now: clock,
      });
      await approve(d1.db, id, { mode: "live", now: clock });
      return id;
    };
    // The fake paid provider goes through the real ledger: one reservation and
    // one settlement per call.
    const execute = async (input: QuestionExecuteInput) => {
      const spend = await reserveProviderSpend({
        provider: "openai",
        stage: "observation",
        usd: 0.1,
      });
      await spend.settle(0.05);
      return executeSyntheticLocalObservation(input);
    };
    const live = (extra: Partial<RunnerDeps> = {}) =>
      deps({ mode: "live", execute, sender: rejecting.sender, ...extra });
    // Orders approved now reach their deadline in 24 hours.
    const stale = [];
    for (let i = 0; i < 4; i += 1) stale.push(await order());
    advance(25 * 3600_000);
    // Runs A: one order per run fails at the deadline; the failure emails are
    // not accepted, so they stay due for a retry.
    await runOrders(live());
    await runOrders(live());
    expect(stale.filter((id) => orderRow(id).state === "failed")).toHaveLength(
      2,
    );

    // Run B (counted): five open orders past their time, two more orders past
    // their deadline, two fresh running orders, two failure emails due. The
    // failure emails back off, so the clock moves past the first delay.
    advance(EMAIL_RETRY_BASE_MS + 1000);
    for (let i = 0; i < 5; i += 1) {
      await makeOrder(d1.db, {
        mode: "live",
        limitUsd: 0.5,
        dailyLimitUsd: 1000,
        now: new Date(clock.getTime() - 3 * 3600_000),
      });
    }
    const fresh = [await order(), await order()];
    const callsBefore = rows(
      "SELECT id FROM provider_spend WHERE kind = 'order_call'",
    ).length;
    const emailsBefore = rejecting.sent.length;
    const { counted, count } = counting(d1.db);
    const result = await runOrders(live({ db: counted }));
    const tally = (outcome: string) =>
      result.outcomes.filter((entry) => entry === outcome).length;
    expect(tally("expired")).toBe(3);
    expect(tally("failed_deadline")).toBe(1);
    expect(tally("question_done")).toBe(2);
    // Two failure emails were tried (the new failure's, and one retry that
    // was due), each as one attempt of three tries.
    expect(rejecting.sent.length - emailsBefore).toBe(6);
    expect(count.queries).toBeLessThanOrEqual(40);
    // Left for the next run: two open orders, nothing lost.
    expect(d1.query("SELECT id FROM orders WHERE state = 'open'")).toHaveLength(
      2,
    );
    for (const id of fresh) expect(orderRow(id).state).toBe("running");
    expect(
      rows("SELECT id FROM provider_spend WHERE kind = 'order_call'").length -
        callsBefore,
    ).toBe(2);
    // Measured when written: 40 queries (48 statements), live mode.
  });

  it("one run with emails in it: 3 expired, 1 deadline failure with its email, 1 report saved, emailed and delivered (one report step per run), and a failure email retry, at most 40 queries", async () => {
    // Synthetic mode (a live report needs real evidence): no ledger rows, so
    // the paid-call ledger statements are measured separately, below.
    const accepting = mailbox();
    const rejecting = mailbox(() => false);
    const make = async () => {
      const id = await makeOrder(d1.db, { now: clock });
      await approve(d1.db, id, { now: clock });
      return id;
    };
    const stale = [await make(), await make(), await make()];
    // Held by another runner (so they take no audit step) until they fail.
    for (const id of stale) {
      await d1.db
        .prepare(
          `UPDATE orders SET lease_owner = 'other', lease_until = '2099-01-01T00:00:00.000Z' WHERE id = '${id}'`,
        )
        .bind()
        .run();
    }
    advance(13 * 3600_000);
    const reporting = [await make(), await make()];
    for (let i = 0; i < 12; i += 1) {
      await runOrders(deps({ sender: rejecting.sender }));
      if (reporting.every((id) => orderRow(id).state !== "running")) break;
      minute();
    }
    advance(12 * 3600_000);
    // Two runs that fit no audit step: only the deadline failures run, and
    // their emails are rejected and stay due.
    await runOrders(deps({ sender: rejecting.sender, runBudgetMs: 0 }));
    await runOrders(deps({ sender: rejecting.sender, runBudgetMs: 0 }));
    expect(stale.filter((id) => orderRow(id).state === "failed")).toHaveLength(
      2,
    );
    for (let i = 0; i < 5; i += 1) {
      await makeOrder(d1.db, {
        now: new Date(clock.getTime() - 3 * 3600_000),
      });
    }
    advance(EMAIL_RETRY_BASE_MS + 1000);
    const { counted, count } = counting(d1.db);
    const result = await runOrders(
      deps({ db: counted, sender: accepting.sender }),
    );
    const tally = (outcome: string) =>
      result.outcomes.filter((entry) => entry === outcome).length;
    expect(tally("expired")).toBe(3);
    expect(tally("failed_deadline")).toBe(1);
    expect(tally("report_saved")).toBe(1);
    expect(tally("waiting")).toBe(1);
    expect(tally("failure_email")).toBe(1);
    expect(
      reporting.filter((id) => orderRow(id).state === "delivered"),
    ).toHaveLength(1);
    expect(
      accepting.sent.filter((m) => m.subject.includes("siap")),
    ).toHaveLength(1);
    expect(count.queries).toBeLessThanOrEqual(40);
    // The worst live mix (a report step with both paid calls) is measured in
    // runner-worst-case.test.ts.
  });

  it("at most two orders get an audit step in one run, oldest first; the rest wait for the next run", async () => {
    const ids = [];
    for (let i = 0; i < 4; i += 1) {
      ids.push(await runningOrder());
      advance(1000);
    }
    const d = deps();
    const result = await runOrders(d);
    expect(result.outcomes).toEqual(["question_done", "question_done"]);
    expect(d.calls).toHaveLength(2);
    expect(
      d1.query(
        "SELECT DISTINCT order_id FROM order_questions WHERE status = 'done'",
      ),
    ).toHaveLength(2);
  });
});

describe("the report's second call (R-18)", () => {
  const LONG = Array.from({ length: 26 }, () => "kopi").join(" ") + ".";

  async function reportingNow(generate: RunnerDeps["generateReport"]) {
    const id = await runningOrder();
    const d = deps({ generateReport: generate });
    for (let i = 0; i < 10; i += 1) {
      await runOrders(d);
      minute();
    }
    expect(orderRow(id).state).toBe("reporting");
    return { id, d };
  }

  /** A first draft with a language problem, then a language-only revision. */
  function twoCalls(onSecond: () => void) {
    const seen = { calls: 0 };
    const generate: RunnerDeps["generateReport"] = async (...args) => {
      seen.calls += 1;
      const first = await generateSyntheticLocalReport(args[0]);
      if (args[1] === undefined) {
        return { ...first, content: { ...first.content, conclusion: LONG } };
      }
      onSecond();
      return first;
    };
    return { seen, generate };
  }

  it("renews the order's lease before the language-fix call, so the call is not made on a lapsed lease", async () => {
    let leaseAtSecond = "";
    let clockAtSecond = 0;
    let id = "";
    const { seen, generate } = twoCalls(() => {
      leaseAtSecond = String(orderRow(id).lease_until);
      clockAtSecond = clock.getTime();
    });
    const wrapped: RunnerDeps["generateReport"] = async (...args) => {
      // The first call takes longer than the original lease.
      const result = await generate(...args);
      if (args[1] === undefined) advance(REPORT_STEP_MS + 60_000);
      return result;
    };
    const reporting = await reportingNow(wrapped);
    id = reporting.id;
    await runOrders(reporting.d);
    expect(seen.calls).toBe(2);
    expect(Date.parse(leaseAtSecond)).toBeGreaterThan(clockAtSecond);
  });

  it("does not make the language-fix call when the lease is no longer this runner's, and saves nothing", async () => {
    let id = "";
    const { seen, generate } = twoCalls(() => {});
    const wrapped: RunnerDeps["generateReport"] = async (...args) => {
      const result = await generate(...args);
      if (args[1] === undefined) {
        d1.query(
          `UPDATE orders SET lease_owner = 'someone-else' WHERE id = '${id}' RETURNING 1`,
        );
      }
      return result;
    };
    const reporting = await reportingNow(wrapped);
    id = reporting.id;
    await runOrders(reporting.d);
    expect(seen.calls).toBe(1);
    expect(orderRow(id).report_json).toBeNull();
  });
});

describe("safety identifier (R-04)", () => {
  it("every provider call carries nuave-order- and 32 hex characters of the id's SHA-256, never the order id", async () => {
    const id = await runningOrder();
    const seen: string[] = [];
    const d = deps({
      execute: async (input) => {
        seen.push(String(input.safety_identifier));
        return executeSyntheticLocalObservation(input);
      },
      generateReport: async (...args) => {
        seen.push(String(args[0].safety_identifier));
        return generateSyntheticLocalReport(...args);
      },
    });
    for (let i = 0; i < 12; i += 1) {
      await runOrders(d);
      minute();
    }
    expect(seen).toHaveLength(11);
    const digest = await sha256Hex(id);
    for (const value of seen) {
      expect(value).toBe(`nuave-order-${digest.slice(0, 32)}`);
      expect(value).not.toContain(id);
      expect(value).toMatch(/^nuave-order-[0-9a-f]{32}$/);
    }
  });
});

describe("overdue orders and fair rotation (R-15, R-23)", () => {
  it("two orders past their deadline in the same run: no provider call for either, the second fails on the next run", async () => {
    const first = await runningOrder();
    const second = await runningOrder();
    advance(ORDER_DEADLINE_MS + 1000);
    const d = deps();
    expect((await runOrders(d)).outcomes).toEqual(["failed_deadline"]);
    expect(d.calls).toEqual([]);
    expect(d.reports.n).toBe(0);
    const states = [first, second].map((id) => orderRow(id).state).sort();
    expect(states).toEqual(["failed", "running"]);
    minute();
    expect((await runOrders(d)).outcomes).toEqual(["failed_deadline"]);
    expect(d.calls).toEqual([]);
    expect([first, second].map((id) => orderRow(id).state)).toEqual([
      "failed",
      "failed",
    ]);
  });

  it("a lease cannot be claimed on an order past its deadline", async () => {
    const id = await runningOrder();
    advance(ORDER_DEADLINE_MS);
    expect(
      await claimOrderLease(d1.db, {
        orderId: id,
        owner: "x",
        now: clock,
        leaseMs: 1000,
      }),
    ).toBe(false);
  });

  it("two older orders held by other runners do not stop a newer order from getting its step", async () => {
    const held = [await runningOrder(), await runningOrder()];
    advance(1000);
    const newer = await runningOrder();
    for (const id of held) {
      d1.query(
        `UPDATE orders SET lease_owner = 'other', lease_until = '2026-10-12T11:00:00.000Z' WHERE id = '${id}' RETURNING 1`,
      );
    }
    const d = deps();
    expect((await runOrders(d)).outcomes).toEqual(["question_done"]);
    expect(
      rows(
        `SELECT DISTINCT order_id FROM order_questions WHERE status = 'done'`,
      ),
    ).toEqual([{ order_id: newer }]);
  });

  it("two older orders waiting on a retry delay rotate behind a newer order; nothing starves", async () => {
    const waiting = [await runningOrder(), await runningOrder()];
    const failing = deps({
      execute: async () => {
        throw new Error("provider timed out");
      },
    });
    // Both older orders take a step and fail (retry delay), so both go to the back.
    expect((await runOrders(failing)).outcomes).toEqual([
      "question_retry",
      "question_retry",
    ]);
    advance(1000);
    const newer = await runningOrder();
    const d = deps();
    const outcomes = (await runOrders(d)).outcomes;
    expect(outcomes).toContain("question_done");
    expect(
      rows(
        `SELECT DISTINCT order_id FROM order_questions WHERE status = 'done'`,
      ).map((row) => row.order_id),
    ).toContain(newer);
    // Over a few runs every order gets steps.
    for (let i = 0; i < 4; i += 1) {
      advance(10 * 60_000);
      await runOrders(d);
    }
    const stepped = new Set(
      rows(`SELECT order_id FROM order_questions WHERE attempts > 0`).map(
        (row) => row.order_id,
      ),
    );
    for (const id of [...waiting, newer]) expect(stepped.has(id)).toBe(true);
  });

  it("failure emails rotate by last attempt, so one failing email cannot block the others", async () => {
    const ids = [];
    for (let i = 0; i < 3; i += 1) {
      ids.push(await runningOrder());
      advance(1000);
    }
    const rejecting = mailbox(() => false);
    advance(ORDER_DEADLINE_MS);
    // Three orders fail at their deadline over three runs; every email is rejected.
    for (let i = 0; i < 3; i += 1) {
      await runOrders(deps({ sender: rejecting.sender }));
      minute();
    }
    expect(ids.map((id) => orderRow(id).state)).toEqual([
      "failed",
      "failed",
      "failed",
    ]);
    // Now one email retry per run: three more runs reach every order.
    const counts = () =>
      Object.fromEntries(
        rows(
          "SELECT order_id, COUNT(*) AS n FROM order_emails WHERE kind = 'failure' GROUP BY order_id",
        ).map((row) => [row.order_id, Number(row.n)]),
      );
    const before = counts();
    expect(Object.keys(before)).toHaveLength(3);
    for (let i = 0; i < 3; i += 1) {
      pastBackoff(); // every retry is due; the oldest last attempt goes first
      await runOrders(deps({ sender: rejecting.sender }));
    }
    const after = counts();
    for (const id of ids) expect(after[id]).toBe(before[id] + 1);
  });

  it("the lease cannot be renewed at or after the deadline", async () => {
    const id = await runningOrder();
    expect(
      await claimOrderLease(d1.db, {
        orderId: id,
        owner: "x",
        now: clock,
        leaseMs: 1000,
      }),
    ).toBe(true);
    const deadline = Date.parse(String(orderRow(id).deadline_at));
    const renew = (at: number) =>
      renewOrderLease(d1.db, {
        orderId: id,
        owner: "x",
        now: new Date(at),
        leaseMs: 1000,
      });
    expect(await renew(deadline - 1000)).toBe(true);
    expect(await renew(deadline)).toBe(false);
  });

  it("a report claimed one second before the deadline makes its first call but not the language-fix call", async () => {
    const LONG = Array.from({ length: 26 }, () => "kopi").join(" ") + ".";
    const calls = { n: 0 };
    const id = await runningOrder();
    const d = deps({
      generateReport: async (...args) => {
        calls.n += 1;
        const first = await generateSyntheticLocalReport(args[0]);
        if (args[1] !== undefined) return first;
        advance(2000); // the deadline passes during the first call
        return { ...first, content: { ...first.content, conclusion: LONG } };
      },
    });
    for (let i = 0; i < 10; i += 1) {
      await runOrders(d);
      minute();
    }
    expect(orderRow(id).state).toBe("reporting");
    clock = new Date(Date.parse(String(orderRow(id).deadline_at)) - 1000);
    await runOrders(d);
    expect(calls.n).toBe(1);
  });
});

describe("email retries back off (R-25)", () => {
  it("the delay grows 2, 4, 8, 16, 32 and then stays at 60 minutes", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 20].map(emailRetryDelayMs)).toEqual(
      [2, 4, 8, 16, 32, 60, 60, 60].map((minutes) => minutes * 60_000),
    );
    expect(emailRetryDelayMs(0)).toBe(0);
    expect(EMAIL_RETRY_BASE_MS).toBe(120_000);
  });

  /** After each failed attempt, a run one second early sends nothing and a run
   * on time sends exactly one new attempt. */
  async function expectGrowingDelays(
    id: string,
    d: ReturnType<typeof deps>,
    mail: ReturnType<typeof mailbox>,
    subject: string,
    firstAttempts: number,
  ) {
    const attempts = () =>
      new Set(
        mail.sent
          .filter((m) => m.subject.includes(subject))
          .map((m) => m.idempotencyKey),
      ).size;
    expect(attempts()).toBe(firstAttempts);
    for (let failed = firstAttempts; failed <= 7; failed += 1) {
      const before = attempts();
      advance(emailRetryDelayMs(failed) - 1000);
      await runOrders(d);
      expect(attempts(), `early after ${failed} failed`).toBe(before);
      advance(1000);
      await runOrders(d);
      expect(attempts(), `on time after ${failed} failed`).toBe(before + 1);
    }
    return id;
  }

  it("a ready email that keeps failing is retried at growing delays, one attempt at a time, and never reruns the audit", async () => {
    const id = await runningOrder();
    const mail = mailbox(() => false);
    const d = deps({ sender: mail.sender });
    for (let i = 0; i < 11; i += 1) {
      await runOrders(d);
      minute();
    }
    expect(orderRow(id).state).toBe("reporting");
    const reports = d.reports.n;
    // Run 11 saved the report and made attempt 1; the clock moved 1 minute since.
    advance(-60_000);
    await expectGrowingDelays(id, d, mail, "siap", 1);
    expect(d.reports.n).toBe(reports);
    expect(orderRow(id).state).toBe("reporting");
  });

  it("a waiting retry makes no new secret: the stored link stays as it is", async () => {
    const id = await runningOrder();
    const mail = mailbox(() => false);
    const d = deps({ sender: mail.sender });
    for (let i = 0; i < 11; i += 1) {
      await runOrders(d);
      minute();
    }
    const hash = orderRow(id).link_hash;
    expect(hash).toBeTruthy();
    await runOrders(d); // 1 minute after attempt 1: still waiting
    expect(orderRow(id).link_hash).toBe(hash);
  });

  it("a failure email that keeps failing is retried at growing delays", async () => {
    const id = await runningOrder();
    const mail = mailbox(() => false);
    const d = deps({ sender: mail.sender });
    advance(ORDER_DEADLINE_MS);
    await runOrders(d); // fails the order; attempt 1
    expect(orderRow(id).state).toBe("failed");
    await expectGrowingDelays(id, d, mail, "belum bisa", 1);
  });

  it("an accepted ready email already on record (a founder resend) finishes delivery with no second email", async () => {
    const id = await runningOrder();
    const mail = mailbox(() => false);
    const d = deps({ sender: mail.sender });
    for (let i = 0; i < 11; i += 1) {
      await runOrders(d);
      minute();
    }
    expect(orderRow(id).state).toBe("reporting");
    d1.query(
      `INSERT INTO order_emails (id, order_id, kind, attempt, idempotency_key, result, created_at)
       VALUES ('manual-1', '${id}', 'ready', 9, 'nuave-order-${id}-ready-9', 'accepted', '${clock.toISOString()}') RETURNING id`,
    );
    const sent = mail.sent.length;
    const hash = orderRow(id).link_hash;
    await runOrders(d);
    expect(orderRow(id).state).toBe("delivered");
    expect(mail.sent).toHaveLength(sent);
    expect(orderRow(id).link_hash).toBe(hash);
  });
});

describe("the ready email never harms a saved report", () => {
  /** A D1 handle whose first insert into order_emails throws (the record of a
   * send is lost), as a database error right after Resend accepted would. */
  function lossyRecord() {
    let thrown = false;
    const wrapped: RunnerDeps["db"] = {
      prepare: (sql) => ({
        bind: (...values) => {
          if (!thrown && /INSERT INTO order_emails/.test(sql)) {
            thrown = true;
            throw new Error("D1 unavailable");
          }
          return d1.db.prepare(sql).bind(...values);
        },
      }),
      batch: (statements) => d1.db.batch(statements),
    };
    return wrapped;
  }

  async function reportingOrder(d: ReturnType<typeof deps>) {
    const id = await runningOrder();
    for (let i = 0; i < 10; i += 1) {
      await runOrders(d);
      minute();
    }
    expect(orderRow(id).state).toBe("reporting");
    return id;
  }

  it("a database error while recording the ready email keeps the order reporting with its report; the next run finishes it, with no failure email", async () => {
    const mail = mailbox();
    const d = deps({ sender: mail.sender });
    const id = await reportingOrder(d);
    const lossy = deps({ sender: mail.sender, db: lossyRecord() });
    const outcome = await runOrders(lossy);
    expect(outcome.outcomes).toEqual(["report_saved"]);
    expect(orderRow(id).state).toBe("reporting");
    expect(orderRow(id).report_json).toBeTruthy();
    expect(orderRow(id).failure_code).toBeNull();
    const reports = d.reports.n;
    minute();
    await runOrders(deps({ sender: mail.sender }));
    expect(orderRow(id).state).toBe("delivered");
    expect(mail.sent.filter((m) => m.subject.includes("belum bisa"))).toEqual(
      [],
    );
    // The lost record means a second send, with its own secret and its own key
    // (Resend would refuse the same key with another body). Only it works.
    const ready = mail.sent.filter((m) => m.subject.includes("siap"));
    expect(ready).toHaveLength(2);
    expect(ready[0]!.idempotencyKey).not.toBe(ready[1]!.idempotencyKey);
    expect(secretIn(ready[0]!)).not.toBe(secretIn(ready[1]!));
    expect(d.reports.n).toBe(reports); // the report was not made again
  });

  it("an order that only waits for its email retry does not take the report slot", async () => {
    let accept = false;
    const mail = mailbox(() => accept);
    const d = deps({ sender: mail.sender });
    const waiting = await reportingOrder(d);
    await runOrders(d); // report saved, ready email rejected
    expect(orderRow(waiting).report_json).toBeTruthy();
    const needs = await runningOrder();
    for (let i = 0; i < 12 && orderRow(needs).state === "running"; i += 1) {
      await runOrders(d);
      minute();
    }
    expect(orderRow(needs).state).toBe("reporting");
    expect(orderRow(needs).report_json).toBeNull();
    accept = true;
    pastBackoff();
    // The email-only order has waited longest, so it goes first.
    await d1.db
      .prepare(
        `UPDATE orders SET last_step_at = '2000-01-01T00:00:00.000Z' WHERE id = '${waiting}'`,
      )
      .bind()
      .run();
    const result = await runOrders(d);
    expect(result.outcomes).toEqual(["delivered", "report_saved"]);
    expect(orderRow(waiting).state).toBe("delivered");
    expect(orderRow(needs).report_json).toBeTruthy();
  });

  it("a deadline failure with no accepted ready email clears the link, so it opens nothing", async () => {
    const mail = mailbox((message) => !message.subject.includes("siap"));
    const d = deps({ sender: mail.sender });
    const id = await reportingOrder(d);
    await runOrders(d); // report saved, ready email rejected, link stored
    expect(orderRow(id).link_hash).toBeTruthy();
    const hash = String(orderRow(id).link_hash);
    advance(ORDER_DEADLINE_MS);
    expect((await runOrders(d)).outcomes).toContain("failed_deadline");
    expect(orderRow(id).state).toBe("failed");
    expect(orderRow(id).link_hash).toBeNull();
    expect(orderRow(id).report_json).toBeTruthy(); // kept for the founder
    const { reportForLink } = await import("./store");
    expect(
      await reportForLink(d1.db, {
        linkHash: hash,
        environment: "production",
        now: clock,
      }),
    ).toBeNull();
  });

  it("failure emails due are chosen in SQL: six waiting orders do not hide a due one", async () => {
    const { failedOrdersNeedingEmail } = await import("./store");
    const failed = async (tries: number, lastMinutesAgo: number) => {
      const id = await runningOrder();
      await d1.db
        .prepare(
          `UPDATE orders SET state = 'failed', ended_at = '${new Date(clock.getTime() - 3600_000).toISOString()}' WHERE id = '${id}'`,
        )
        .bind()
        .run();
      for (let n = 1; n <= tries; n += 1) {
        const at = new Date(clock.getTime() - lastMinutesAgo * 60_000);
        await d1.db
          .prepare(
            `INSERT INTO order_emails (id, order_id, kind, attempt, idempotency_key, result, created_at)
             VALUES ('${id}-${n}', '${id}', 'failure', ${n}, 'k-${id}-${n}', 'failed', '${at.toISOString()}')`,
          )
          .bind()
          .run();
      }
      return id;
    };
    // Six orders on their sixth try, 30 minutes ago: not due for 60 minutes,
    // and older than the due order, so they sort first.
    for (let i = 0; i < 6; i += 1) await failed(6, 30);
    const due = await failed(1, 5); // first try 5 minutes ago: due after 2
    const ids = await failedOrdersNeedingEmail(d1.db, {
      environment: "production",
      mode: "synthetic",
      now: clock,
      limit: 1,
    });
    expect(ids).toEqual([due]);
  });
});
