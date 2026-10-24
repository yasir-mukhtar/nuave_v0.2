import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

import { generateSyntheticLocalReport } from "../audit/local-direct-ten-audit";
import type { AuditReport } from "../audit/types";
import { makeSmartCustomerEvidenceExport } from "../audit/customer-evidence-export";
import { buildReportPresentation } from "../audit/report-presentation";
import { containsPhoneNumber } from "../checks/phones";
import type { CheckSend } from "../checks/send";
import { syntheticCheckSend } from "../checks/synthetic";
import { openFileD1 } from "../spending/sqlite-d1.test-helper";
import { runOrders, type CheckCallInput, type RunnerDeps } from "./runner";
import { orderStatus } from "./store";
import {
  approveTwoSource,
  makeOrder,
  mailbox,
  T0,
  TWO_SOURCE_PROMPTS,
} from "./orders.test-helper";

// Spec 018 PR 2: the real runner, ledger and migrations on the sqlite D1
// helper, with the check calls answered offline (labelled synthetic answers
// or scripted DataForSEO-shaped answers). No network, no provider call.

let dir: string;
let d1: ReturnType<typeof openFileD1>;
let clock: Date;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "nuave-two-source-"));
  d1 = openFileD1(join(dir, "orders.sqlite"));
  clock = T0;
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

const minute = () => {
  clock = new Date(clock.getTime() + 60_000);
};
const rows = <T = Record<string, unknown>>(sql: string) => d1.query<T>(sql);
const orderRow = (id: string) =>
  rows<Record<string, string | null>>(
    `SELECT * FROM orders WHERE id = '${id}'`,
  )[0]!;

type Call = CheckCallInput & { at: number };

function deps(
  send: (input: CheckCallInput, now: Date) => CheckSend = (input, now) =>
    syntheticCheckSend({ ...input, now }),
  overrides: Partial<RunnerDeps> = {},
) {
  const calls: Call[] = [];
  const reportInputs: unknown[] = [];
  const mail = mailbox();
  let runs = 0;
  const d: RunnerDeps = {
    db: d1.db,
    environment: "production",
    mode: "synthetic",
    siteOrigin: "https://v2.nuave.test",
    now: () => clock,
    execute: async () => {
      throw new Error("a two-source order never calls the one-source path");
    },
    generateReport: async (...args) => {
      reportInputs.push(args[0]);
      return generateSyntheticLocalReport(...args);
    },
    checks: {
      send: async (input) => {
        calls.push({ ...input, at: runs });
        return send(input, clock);
      },
    },
    sender: mail.sender,
    sleep: async () => {},
    ...overrides,
  };
  return {
    d,
    calls,
    mail,
    reportInputs,
    run: async () => {
      runs += 1;
      return runOrders(d);
    },
  };
}

async function runUntilEnded(t: ReturnType<typeof deps>, id: string) {
  for (let i = 0; i < 40; i += 1) {
    const state = orderRow(id).state;
    if (state === "delivered" || state === "failed") return;
    await t.run();
    minute();
  }
  throw new Error(`order still ${orderRow(id).state}`);
}

describe("a two-source order, synthetic, whole path (R-12..R-20, AC-02, AC-06, AC-07, AC-09, AC-11, AC-16)", () => {
  it("asks both sources in one step, retries only the failed source, and delivers the report with per-source counts", async () => {
    const id = await makeOrder(d1.db, { now: clock });
    await approveTwoSource(d1.db, id, { now: clock });
    const t = deps();

    // The first step asks question 1 to both sources, in the same run (R-15).
    await t.run();
    expect(t.calls.map((c) => `${c.source}:${c.ordinal}:${c.at}`)).toEqual([
      "chatgpt:1:1",
      "google:1:1",
    ]);
    minute();
    await runUntilEnded(t, id);
    expect(orderRow(id).state).toBe("delivered");

    // AC-06: every check got the approved text, byte for byte; ChatGPT from
    // Indonesia (AC-02), Google from Surabaya.
    for (const call of t.calls) {
      expect(call.body.keyword).toBe(
        TWO_SOURCE_PROMPTS[call.ordinal - 1]!.question,
      );
      expect(call.body.location_code).toBe(
        call.source === "chatgpt" ? 2360 : 1007715,
      );
    }
    // A retry asks only the source that failed: question 3's empty AI
    // Overview is asked again alone, question 7's ChatGPT check alone.
    const byRun = new Map<number, string[]>();
    for (const call of t.calls)
      byRun.set(call.at, [
        ...(byRun.get(call.at) ?? []),
        `${call.source}:${call.ordinal}`,
      ]);
    const retries = [...byRun.values()].filter(
      (sources) => sources.length === 1,
    );
    expect(retries).toEqual(
      expect.arrayContaining([["google:3"], ["chatgpt:7"], ["chatgpt:7"]]),
    );
    expect(
      t.calls.filter((c) => c.source === "chatgpt" && c.ordinal === 7),
    ).toHaveLength(3);
    expect(
      t.calls.filter((c) => c.source === "google" && c.ordinal === 3),
    ).toHaveLength(2);
    // A completed answer is never asked again.
    expect(
      t.calls.filter((c) => c.source === "chatgpt" && c.ordinal === 1),
    ).toHaveLength(1);

    const report = JSON.parse(orderRow(id).report_json!) as AuditReport;
    const two = report.two_source!;
    expect(two.places).toEqual({
      google: { code: 1007715, name: "Surabaya" },
      chatgpt: { code: 2360, name: "Indonesia" },
    });
    // R-19 denominators: N = 9 (question 7 failed), M = 10, Z = 8 (question 3
    // empty twice and question 5 not shown), W = summaries naming the
    // business (odd questions 1, 7, 9), K = 1.
    expect(two.counts).toEqual({
      chatgpt: { completed: 9, named: 0, recommended: 0, failed: 1 },
      google: { completed: 10, summaries: 8, named: 3, failed: 0 },
      failed: 1,
    });
    // AC-07: an element empty twice is "not shown", with no text.
    expect(two.questions[2]!.google).toMatchObject({
      outcome: "not_shown",
      text: "",
    });
    expect(two.questions[6]!.chatgpt).toEqual({
      outcome: "failed",
      named: null,
      recommended: null,
    });
    // AC-11: the Q-3 finding with the right counts.
    expect(two.google_finding).toBe(
      "Google tidak menampilkan AI Overview untuk 2 dari 10 pertanyaan ini.",
    );
    // R-18: questions with an answer and no mention, by demand (question 1
    // and 7 are named by Google; question 1 also has the lowest number).
    expect(two.topics_missing.map((row) => row.ordinal)).toEqual([
      2, 3, 4, 5, 6,
    ]);
    expect(two.topics_missing[0]).toMatchObject({
      topic: "coffee shop",
      volume: 12_000,
      domains: ["contoh.test"],
    });
    expect(two.questions[0]).toMatchObject({
      label_text: "Dicari di Google",
      topic_line:
        "Topik: coffee shop surabaya · ±2.400 pencarian/bulan di Google, seluruh Indonesia (data September 2026)",
    });
    expect(two.search_data_available).toBe(true);
    expect(two.other_businesses.chatgpt).toEqual(["Klinik Sintesa Contoh"]);

    // The model's details keep the failed record (R-20); the report measures
    // count only completed answers.
    expect(report.details[6]!.run).toBe("failed");
    expect(report.measures.recommendation.assessed).toBe(9);

    // AC-09: one checks_failed notice with the order number.
    const notices = rows<{
      kind: string;
      subject: string;
      detail_json: string;
    }>("SELECT kind, subject, detail_json FROM founder_notices");
    expect(notices.filter((n) => n.kind === "checks_failed")).toHaveLength(1);
    expect(
      JSON.parse(notices.find((n) => n.kind === "checks_failed")!.detail_json),
    ).toMatchObject({
      failed: "pertanyaan 7 ChatGPT",
    });

    // AC-12: no phone number anywhere the browser or the report model sees.
    // The synthetic answers hold "0812-3456-7890" and "+62 812 3456 7890".
    // The whole stored JSON is checked for those exact numbers (its random
    // ids and hashes can look like a phone number to the general detector,
    // which is used on the answer texts).
    const hasPhone = (text: string) =>
      /3456[\s-]?7890/.test(text) ||
      (JSON.parse(text || "null")?.raw_answer !== undefined &&
        containsPhoneNumber(String(JSON.parse(text).raw_answer)));
    const saved = rows<{
      observation_json: string | null;
      g_result_json: string | null;
    }>(
      `SELECT observation_json, g_result_json FROM order_questions WHERE order_id = '${id}'`,
    );
    for (const row of saved) {
      expect(hasPhone(row.observation_json ?? "")).toBe(false);
      expect(hasPhone(row.g_result_json ?? "")).toBe(false);
      const google = JSON.parse(row.g_result_json ?? "null") as {
        text?: string;
      } | null;
      expect(containsPhoneNumber(google?.text ?? "")).toBe(false);
    }
    expect(hasPhone(orderRow(id).report_json!)).toBe(false);
    expect(hasPhone(JSON.stringify(t.reportInputs))).toBe(false);
    // The page can show it: the observations the report link returns (one
    // per question, the failed ChatGPT record included) bind to the report.
    expect(
      buildReportPresentation(
        report,
        saved.map((row) => JSON.parse(row.observation_json!)),
      ).status,
    ).toBe("ready");
    // The JSON export built from the same data (R-28, R-29): its own version,
    // no phone number and nothing of the raw DataForSEO response.
    const intake = JSON.parse(orderRow(id).intake_json!) as {
      context: Parameters<typeof makeSmartCustomerEvidenceExport>[0];
      prompts: Parameters<typeof makeSmartCustomerEvidenceExport>[1];
    };
    const exported = JSON.stringify(
      makeSmartCustomerEvidenceExport(
        intake.context,
        intake.prompts,
        saved.map((row) => JSON.parse(row.observation_json!)),
        report,
      ),
    );
    expect(JSON.parse(exported).export_version).toBe(
      "nuave-evidence-two-source-v1",
    );
    expect(hasPhone(exported)).toBe(false);
    for (const seen of [
      exported,
      orderRow(id).report_json!,
      JSON.stringify(t.reportInputs),
      ...saved.map((row) => row.observation_json ?? ""),
    ]) {
      expect(seen).not.toMatch(
        /chat_gpt_local_businesses|brand_entities|"phone"|ai_overview_element/,
      );
    }
    // The ready email went out once.
    expect(t.mail.sent.filter((m) => m.subject.includes("siap"))).toHaveLength(
      1,
    );
  });

  it("progress counts a question once both its checks are final", async () => {
    const id = await makeOrder(d1.db, { now: clock });
    await approveTwoSource(d1.db, id, { now: clock });
    const t = deps();
    await t.run();
    const status = await orderStatus(d1.db, {
      orderId: id,
      environment: "production",
      now: clock,
    });
    expect(status?.total).toBe(10);
    expect(status?.questions[0]).toEqual({
      prompt_id: "NUAVE-DT-01",
      status: "completed",
    });
    expect(status?.completed).toBe(1);
  });
});

/** An answer for every question (no planned failure), each with its own
 * DataForSEO task id. */
const ok = (input: CheckCallInput, now: Date): CheckSend => ({
  ...syntheticCheckSend({ ...input, ordinal: 1, now }),
  taskId: `task-${input.source}-${input.ordinal}-${input.attempt}`,
});
const refused = (statusCode: number, now: Date): CheckSend => ({
  outcome:
    statusCode === 50301
      ? "retry"
      : statusCode >= 40100 && statusCode <= 40210
        ? "unavailable"
        : "failed",
  statusCode,
  result: null,
  costUsd: 0,
  taskId: "",
  startedAt: now,
  completedAt: now,
  transportError: null,
});

describe("the report gate and failures (R-14, R-19, R-21, AC-10, AC-13)", () => {
  it("AC-10: with 6 failed ChatGPT checks no report is made; the order fails as today with one paid_order_failed notice", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    const id = await makeOrder(d1.db, {
      mode: "live",
      payment: "paid",
      dailyLimitUsd: 100,
      now: clock,
    });
    await approveTwoSource(d1.db, id, { mode: "live", now: clock });
    const t = deps(
      (input, now) =>
        input.source === "chatgpt" && input.ordinal <= 6
          ? refused(40501, now) // an unknown code: one failed attempt, no retry
          : ok(input, now),
      { mode: "live" },
    );
    await runUntilEnded(t, id);
    const order = orderRow(id);
    expect(order.state).toBe("failed");
    expect(order.failure_code).toBe("checks_below_gate");
    expect(order.report_json).toBeNull();
    expect(t.reportInputs).toHaveLength(0);
    // An unknown code is not retried: six ChatGPT calls for questions 1–6.
    expect(
      t.calls.filter((c) => c.source === "chatgpt" && c.ordinal <= 6),
    ).toHaveLength(6);
    const notices = rows<{ kind: string }>("SELECT kind FROM founder_notices");
    expect(notices.filter((n) => n.kind === "paid_order_failed")).toHaveLength(
      1,
    );
    expect(notices.filter((n) => n.kind === "checks_failed")).toHaveLength(0);
    expect(t.mail.sent.some((m) => m.subject.includes("belum bisa"))).toBe(
      true,
    );
  });

  it("AC-13: credentials or balance errors are not retried and raise one dataforseo_unavailable notice per day; 50301 is retried", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    const id = await makeOrder(d1.db, {
      mode: "live",
      payment: "paid",
      dailyLimitUsd: 100,
      now: clock,
    });
    await approveTwoSource(d1.db, id, { mode: "live", now: clock });
    let google = 0;
    const t = deps(
      (input, now) => {
        if (input.source === "chatgpt" && input.ordinal === 2)
          return refused(40210, now);
        if (input.source === "chatgpt" && input.ordinal === 3)
          return refused(40100, now);
        if (input.source === "google" && input.ordinal === 4 && google++ === 0)
          return refused(50301, now);
        return ok(input, now);
      },
      { mode: "live" },
    );
    await runUntilEnded(t, id);
    expect(orderRow(id).failure_code).toBeNull();
    expect(orderRow(id).state).toBe("delivered");
    expect(
      t.calls.filter((c) => c.source === "chatgpt" && c.ordinal === 2),
    ).toHaveLength(1);
    expect(
      t.calls.filter((c) => c.source === "google" && c.ordinal === 4),
    ).toHaveLength(2);
    const unavailable = rows<{ kind: string }>(
      "SELECT kind FROM founder_notices WHERE kind = 'dataforseo_unavailable'",
    );
    expect(unavailable).toHaveLength(1);
    const report = JSON.parse(orderRow(id).report_json!) as AuditReport;
    expect(report.two_source!.counts.chatgpt.failed).toBe(2);
    expect(report.two_source!.counts.google.failed).toBe(0);
  });

  it("AC-13: when the order's hold would be passed, no DataForSEO call is sent", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "live");
    const id = await makeOrder(d1.db, {
      mode: "live",
      payment: "paid",
      limitUsd: 0.005,
      dailyLimitUsd: 100,
      now: clock,
    });
    await approveTwoSource(d1.db, id, { mode: "live", now: clock });
    const sent: string[] = [];
    const t = deps(
      (input, now) => {
        sent.push(input.source);
        return ok(input, now);
      },
      { mode: "live" },
    );
    // The send function the runner calls reserves first (sendCheck); this
    // stand-in reserves the same way the live sender does.
    t.d.checks = {
      send: async (input) => {
        const { reserveProviderSpend } =
          await import("../spending/provider-spend");
        await reserveProviderSpend({
          provider: "dataforseo",
          stage: "observation",
          usd: 0.006,
        });
        sent.push(input.source);
        return ok(input, clock);
      },
    };
    await t.run();
    expect(sent).toEqual([]);
    expect(orderRow(id).state).toBe("failed");
    expect(orderRow(id).failure_code).toBe("order_limit");
  });
});
