import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));

import type Anthropic from "@anthropic-ai/sdk";
import { generateSyntheticLocalReport } from "../src/lib/audit/local-direct-ten-audit";
import type { ReportGenerator } from "../src/lib/audit/report-pipeline";
import type { AuditReport } from "../src/lib/audit/types";
import { containsPhoneNumber } from "../src/lib/checks/phones";
import { syntheticCheckSend } from "../src/lib/checks/synthetic";
import { runOrders, type RunnerDeps } from "../src/lib/orders/runner";
import {
  approveTwoSource,
  mailbox,
  makeOrder,
  T0,
} from "../src/lib/orders/orders.test-helper";
import { openFileD1 } from "../src/lib/spending/sqlite-d1.test-helper";
import {
  assignLetters,
  blindReport,
  claudeWriter,
  ENTRIES,
  entryInput,
  evidenceFromD1,
  Ledger,
  NEW_INPUT_INSTRUCTIONS,
  runEntry,
  SpendRefused,
  telltaleIn,
  trimGoogleText,
  type OrderEvidence,
} from "../scripts/report-writer-test/harness";

// The test B harness (scripts/report-writer-test), offline: a synthetic
// two-source order is delivered by the real runner on the sqlite D1 helper,
// exported in the D1 answer shape, and run through the harness. No provider.

let dir: string;
let d1: ReturnType<typeof openFileD1>;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "report-writer-test-"));
  d1 = openFileD1(join(dir, "orders.sqlite"));
});
afterEach(() => {
  d1.close();
  rmSync(dir, { recursive: true, force: true });
});

/** A delivered synthetic two-source order, as `wrangler d1 execute --json`
 * would export it. */
async function deliveredOrderExport() {
  let clock = T0;
  const id = await makeOrder(d1.db, { now: clock });
  await approveTwoSource(d1.db, id, { now: clock });
  await d1.db
    .prepare("UPDATE orders SET order_number = 'NV-TEST01' WHERE id = ?")
    .bind(id)
    .run();
  const deps: RunnerDeps = {
    db: d1.db,
    environment: "production",
    mode: "synthetic",
    siteOrigin: "https://v2.nuave.test",
    now: () => clock,
    execute: async () => {
      throw new Error("no one-source path");
    },
    generateReport: generateSyntheticLocalReport,
    checks: {
      send: async (input) => syntheticCheckSend({ ...input, now: clock }),
    },
    sender: mailbox().sender,
    sleep: async () => {},
  };
  for (let i = 0; i < 40; i += 1) {
    await runOrders(deps);
    clock = new Date(clock.getTime() + 60_000);
  }
  const order = d1.query(
    `SELECT id, order_number, mode, state, intake_json, report_json FROM orders WHERE id = '${id}'`,
  );
  expect(order[0]?.state).toBe("delivered");
  const questions = d1.query(
    `SELECT * FROM order_questions WHERE order_id = '${id}' ORDER BY position`,
  );
  return {
    order: [{ results: order, success: true }],
    questions: [{ results: questions, success: true }],
  };
}

describe("test B harness", () => {
  it("re-runs the delivered report from its exported evidence unchanged", async () => {
    const exported = await deliveredOrderExport();
    const evidence = evidenceFromD1(exported.order, exported.questions);
    const delivered = JSON.parse(evidence.order.report_json) as AuditReport;

    const result = await runEntry(
      evidence,
      ENTRIES[0]!,
      null,
      new Ledger(join(dir, "spend.json")),
    );

    expect(result.status, result.failure ?? "").toBe("ok");
    for (const key of [
      "conclusion",
      "key_findings",
      "priorities",
      "details",
      "method_summary",
      "two_source",
    ] as const)
      expect(result.report![key]).toEqual(delivered[key]);
  });

  it("gives new-input writers Google's words and the instruction, and today's writer neither", async () => {
    const exported = await deliveredOrderExport();
    const evidence = evidenceFromD1(exported.order, exported.questions);
    const today = await entryInput(evidence, ENTRIES[0]!);
    const fresh = await entryInput(evidence, ENTRIES[1]!);

    const todayGoogle = today.input.two_source_facts!.google;
    const freshGoogle = fresh.input.two_source_facts!.google as {
      outcome: string;
      ai_overview_text?: string;
    }[];
    expect(todayGoogle.some((fact) => "ai_overview_text" in fact)).toBe(false);
    const summaries = freshGoogle.filter((fact) => fact.outcome === "summary");
    expect(summaries.length).toBeGreaterThan(0);
    for (const fact of summaries) {
      expect(fact.ai_overview_text?.length).toBeGreaterThan(0);
      expect(containsPhoneNumber(fact.ai_overview_text!)).toBe(false);
    }
    expect(
      freshGoogle
        .filter((fact) => fact.outcome !== "summary")
        .every((fact) => !fact.ai_overview_text),
    ).toBe(true);
    // The counts the source checks use do not change.
    expect(fresh.input.two_source_facts!.counts).toEqual(
      today.input.two_source_facts!.counts,
    );

    // A writer sees the words in its user text and the instruction in its
    // developer text.
    const seen: string[] = [];
    const spy =
      (): ReportGenerator =>
      async (...args) => {
        const { reportRequest } = await import("../src/lib/audit/openai");
        const request = reportRequest(args[0] as never, args[1]);
        seen.push(request.input[1].content);
        return generateSyntheticLocalReport(...args);
      };
    await runEntry(evidence, ENTRIES[1]!, spy, new Ledger(join(dir, "s.json")));
    expect(seen[0]).toContain("ai_overview_text");
    expect(NEW_INPUT_INSTRUCTIONS).toContain("ai_overview_text");
  });

  it("refuses an order approved before Spec 018", async () => {
    const exported = await deliveredOrderExport();
    const rows = (
      exported.questions[0]!.results as Record<string, unknown>[]
    ).map((row) => ({ ...row, g_status: null }));
    expect(() =>
      evidenceFromD1(exported.order, [{ results: rows, success: true }]),
    ).toThrow(/before Spec 018/);
  });

  it("shortens long Google answers at a sentence and removes phone numbers", () => {
    const long = `${"Klinik ini menawarkan facial. ".repeat(150)}Hubungi 0812-3456-7890.`;
    const trimmed = trimGoogleText(long, 300);
    expect(trimmed.length).toBeLessThanOrEqual(302);
    expect(trimmed.endsWith(". …")).toBe(true);
    expect(
      containsPhoneNumber(trimGoogleText("Telepon 0812-3456-7890 sekarang.")),
    ).toBe(false);
  });
});

describe("the USD 5 ledger", () => {
  it("refuses a call whose worst case would pass the hard stop, and counts an unsettled call at its worst case", () => {
    const ledger = new Ledger(join(dir, "spend.json"), 1);
    const first = {
      order: "NV-TEST01",
      entry: "sonnet-high" as const,
      model: "claude-sonnet-5-5",
      reserved_usd: 0.6,
    };
    ledger.reserve(first).settle(0.1);
    expect(ledger.spentUsd()).toBe(0.1);
    ledger.reserve(first); // never settled: still counted at 0.6
    expect(ledger.spentUsd()).toBe(0.7);
    expect(() => ledger.reserve({ ...first, reserved_usd: 0.31 })).toThrow(
      SpendRefused,
    );
    expect(ledger.calls()).toHaveLength(2);
  });

  it("stops a live entry before sending when the ledger is full", async () => {
    const exported = await deliveredOrderExport();
    const evidence: OrderEvidence = evidenceFromD1(
      exported.order,
      exported.questions,
    );
    const parse = vi.fn();
    const client = { messages: { parse } } as unknown as Anthropic;
    await expect(
      runEntry(
        evidence,
        ENTRIES[3]!,
        (ctx) => claudeWriter(ctx, client),
        new Ledger(join(dir, "spend.json"), 0.01),
      ),
    ).rejects.toThrow(SpendRefused);
    expect(parse).not.toHaveBeenCalled();
  });

  it("releases the hold of a request the provider turned away, and keeps it for one that may have run", async () => {
    const exported = await deliveredOrderExport();
    const evidence = evidenceFromD1(exported.order, exported.questions);
    const failing = (error: unknown) =>
      ({
        messages: {
          parse: vi.fn(async () => {
            throw error;
          }),
        },
      }) as unknown as Anthropic;
    const ledger = new Ledger(join(dir, "spend.json"));
    const run = (client: Anthropic) =>
      runEntry(
        evidence,
        ENTRIES[3]!,
        (ctx) => claudeWriter(ctx, client),
        ledger,
      );

    await run(
      failing(Object.assign(new Error("bad request"), { status: 400 })),
    );
    expect(ledger.spentUsd()).toBe(0);
    await run(
      failing(Object.assign(new Error("server error"), { status: 500 })),
    );
    expect(ledger.spentUsd()).toBeGreaterThan(0);
  });

  it("records a Claude answer cut off at the output limit as a failed entry and settles its cost", async () => {
    const exported = await deliveredOrderExport();
    const evidence = evidenceFromD1(exported.order, exported.questions);
    const client = {
      messages: {
        parse: vi.fn(async () => ({
          id: "msg_test",
          model: "claude-sonnet-5-5",
          stop_reason: "max_tokens",
          parsed_output: null,
          usage: { input_tokens: 30_000, output_tokens: 16_000 },
        })),
      },
    } as unknown as Anthropic;
    const ledger = new Ledger(join(dir, "spend.json"));

    const result = await runEntry(
      evidence,
      ENTRIES[3]!,
      (ctx) => claudeWriter(ctx, client),
      ledger,
    );

    expect(result.status).toBe("failed");
    expect(result.checks.cut_off_answers).toBe(1);
    expect(result.cost_usd).toBe(0.22);
    expect(ledger.spentUsd()).toBe(0.22);
  });
});

describe("blind review", () => {
  it("gives each order's five entries the letters A–E once each", () => {
    const key = assignLetters(["NV-AAAAAA", "NV-BBBBBB"]);
    for (const letters of Object.values(key)) {
      expect(Object.keys(letters)).toEqual(["A", "B", "C", "D", "E"]);
      expect(new Set(Object.values(letters))).toEqual(
        new Set(ENTRIES.map((entry) => entry.id)),
      );
    }
  });

  it("hides the writer and dates every entry like the delivered report", async () => {
    const exported = await deliveredOrderExport();
    const evidence = evidenceFromD1(exported.order, exported.questions);
    const report = JSON.parse(evidence.order.report_json) as AuditReport;
    const named = {
      ...report,
      provenance: {
        ...report.provenance,
        requested_report_model: "claude-sonnet-5-5",
        returned_report_model: "claude-sonnet-5-5",
        report_response_id: "msg_123",
      },
    };
    expect(telltaleIn(named)).not.toBeNull();
    const blind = blindReport(named, "2026-10-26T02:59:26.100Z");
    expect(telltaleIn(blind)).toBeNull();
    expect(blind.generated_at).toBe("2026-10-26T02:59:26.100Z");
    expect(blind.conclusion).toBe(report.conclusion);
  });
});
