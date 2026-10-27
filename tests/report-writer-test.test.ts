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
  extendLetters,
  glmWriter,
  REFERENCE,
  writerFingerprint,
  entryInput,
  evidenceFromD1,
  Ledger,
  NEW_INPUT_INSTRUCTIONS,
  outputAllowance,
  productionSendsGoogleWords,
  replayDelivered,
  runEntry,
  SpendRefused,
  telltaleIn,
  trimGoogleText,
  PAGE_ENTRIES,
  pagesPath,
  readOrderPages,
  blindWriterFingerprint,
  drawPagePairs,
  type OrderEvidence,
} from "../scripts/report-writer-test/harness";
import { mkdirSync, writeFileSync } from "node:fs";

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
      REFERENCE,
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

  it("with Spec 021 Part B the production prompt carries Google's words, so the harness adds none", async () => {
    const exported = await deliveredOrderExport();
    const evidence = evidenceFromD1(exported.order, exported.questions);
    const today = await entryInput(evidence, REFERENCE);
    const fresh = await entryInput(evidence, ENTRIES[1]!);

    // Neither input gets the harness's own field: production sends the words.
    for (const input of [today.input, fresh.input])
      expect(
        input.two_source_facts!.google.some(
          (fact) => "ai_overview_text" in fact,
        ),
      ).toBe(false);
    const questions = fresh.input.two_source_facts!.writer!.questions;
    const summaries = fresh.input.two_source_facts!.google.filter(
      (fact) => fact.outcome === "summary",
    );
    expect(summaries.length).toBeGreaterThan(0);
    for (const fact of summaries) {
      const text = questions.find(
        (q) => q.prompt_id === fact.prompt_id,
      )!.google_text;
      expect(text.length).toBeGreaterThan(0);
      expect(containsPhoneNumber(text)).toBe(false);
    }
    // The counts the source checks use do not change.
    expect(fresh.input.two_source_facts!.counts).toEqual(
      today.input.two_source_facts!.counts,
    );

    // A writer sees the words in its user text, with no harness instruction.
    const seen: string[] = [];
    const spy =
      (): ReportGenerator =>
      async (...args) => {
        const { reportRequest } = await import("../src/lib/audit/openai");
        const request = reportRequest(args[0] as never, args[1]);
        seen.push(request.input[0].content, request.input[1].content);
        return generateSyntheticLocalReport(...args);
      };
    await runEntry(evidence, ENTRIES[1]!, spy, new Ledger(join(dir, "s.json")));
    expect(seen[1]).toContain('"google_text"');
    expect(seen[0]).not.toContain(NEW_INPUT_INSTRUCTIONS);
  });

  it("compares the delivered writing only when today's writer version wrote it", async () => {
    const exported = await deliveredOrderExport();
    const evidence = evidenceFromD1(exported.order, exported.questions);
    const same = await replayDelivered(
      evidence,
      new Ledger(join(dir, "a.json")),
    );
    expect(same.reproduced).toBe(true);

    // A report from an earlier writer version (before Spec 021 Part B, say)
    // is shown as delivered and not compared.
    const report = JSON.parse(evidence.order.report_json) as AuditReport;
    const older: OrderEvidence = {
      ...evidence,
      order: {
        ...evidence.order,
        report_json: JSON.stringify({
          ...report,
          provenance: {
            ...report.provenance,
            report_prompt_version: "report-synthesis-v6",
          },
        }),
      },
    };
    const other = await replayDelivered(older, new Ledger(join(dir, "b.json")));
    expect(other.reproduced).toBeNull();
    expect(other.note).toMatch(/report-synthesis-v6/);
  });

  it("adds Google's words only while the production prompt lacks them", async () => {
    const exported = await deliveredOrderExport();
    const evidence = evidenceFromD1(exported.order, exported.questions);
    const today = await entryInput(evidence, REFERENCE);
    const texts = evidence.rows.flatMap((row) => {
      const check = row.g_result_json
        ? (JSON.parse(row.g_result_json) as { outcome: string; text: string })
        : null;
      return row.g_status === "done" && check?.outcome === "summary"
        ? [trimGoogleText(check.text)]
        : [];
    });
    expect(texts.length).toBeGreaterThan(0);

    // Spec 021 Part B's production prompt carries them: nothing is added.
    expect(productionSendsGoogleWords(today.input, texts)).toBe(true);
    // A prompt without them (the writer before Part B) would get them.
    const before = {
      ...today.input,
      two_source_facts: { ...today.input.two_source_facts!, writer: undefined },
    };
    expect(productionSendsGoogleWords(before, texts)).toBe(false);
  });

  it("tells writers apart by their instructions, not by model or effort", async () => {
    const exported = await deliveredOrderExport();
    const evidence = evidenceFromD1(exported.order, exported.questions);
    const fresh = await entryInput(evidence, ENTRIES[1]!);
    const today = await entryInput(evidence, REFERENCE);

    // The five blind entries share one writer: today's, on the new input.
    const prints = new Set(
      ENTRIES.map((entry) => writerFingerprint(entry, fresh.input)),
    );
    expect(prints.size).toBe(1);
    // The reference is written by the same production writer.
    expect(writerFingerprint(REFERENCE, today.input)).toBe([...prints][0]);
    // Other instructions (the writer before Spec 021 Part B) are another
    // writer.
    const before = {
      ...today.input,
      two_source_facts: { ...today.input.two_source_facts!, writer: undefined },
    };
    expect(writerFingerprint(REFERENCE, before)).not.toBe([...prints][0]);
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
    const create = vi.fn();
    const client = { messages: { create } } as unknown as Anthropic;
    await expect(
      runEntry(
        evidence,
        ENTRIES[3]!,
        (ctx) => claudeWriter(ctx, client),
        new Ledger(join(dir, "spend.json"), 0.01),
      ),
    ).rejects.toThrow(SpendRefused);
    expect(create).not.toHaveBeenCalled();
  });

  it("releases the hold of a request the provider turned away, and keeps it for one that may have run", async () => {
    const exported = await deliveredOrderExport();
    const evidence = evidenceFromD1(exported.order, exported.questions);
    const failing = (error: unknown) =>
      ({
        messages: {
          create: vi.fn(async () => {
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
        create: vi.fn(async () => ({
          id: "msg_test",
          model: "claude-sonnet-5-5",
          stop_reason: "max_tokens",
          content: [],
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

describe("a Claude answer that breaks the report format", () => {
  it("is a failed entry with its cost settled and the reason recorded", async () => {
    const exported = await deliveredOrderExport();
    const evidence = evidenceFromD1(exported.order, exported.questions);
    const client = {
      messages: {
        create: vi.fn(async () => ({
          id: "msg_test",
          model: "claude-haiku-5-5",
          stop_reason: "end_turn",
          content: [{ type: "text", text: '{"conclusion": 3}' }],
          usage: { input_tokens: 30_000, output_tokens: 2_000 },
        })),
      },
    } as unknown as Anthropic;
    const ledger = new Ledger(join(dir, "spend.json"));

    const result = await runEntry(
      evidence,
      ENTRIES[4]!,
      (ctx) => claudeWriter(ctx, client),
      ledger,
    );

    expect(result.status).toBe("failed");
    expect(result.failure).toMatch(/did not match the report schema: .+/);
    expect(result.calls).toHaveLength(1);
    expect(ledger.spentUsd()).toBe(0.004);
  });
});

describe("the output allowance", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is production's unless a run sets one, and the worst case follows it", () => {
    expect(outputAllowance()).toBe(16_000);
    vi.stubEnv("REPORT_TEST_MAX_OUTPUT_TOKENS", "32000");
    expect(outputAllowance()).toBe(32_000);
    vi.stubEnv("REPORT_TEST_MAX_OUTPUT_TOKENS", "lots");
    expect(() => outputAllowance()).toThrow(/whole number/);
  });

  it("is what a Claude call asks for and what its result records", async () => {
    vi.stubEnv("REPORT_TEST_MAX_OUTPUT_TOKENS", "32000");
    const exported = await deliveredOrderExport();
    const evidence = evidenceFromD1(exported.order, exported.questions);
    const create = vi.fn(async () => ({
      id: "msg_test",
      model: "claude-haiku-5-5",
      stop_reason: "max_tokens",
      content: [],
      usage: { input_tokens: 30_000, output_tokens: 32_000 },
    }));
    const result = await runEntry(
      evidence,
      ENTRIES[4]!,
      (ctx) =>
        claudeWriter(ctx, { messages: { create } } as unknown as Anthropic),
      new Ledger(join(dir, "spend.json")),
    );
    expect((create.mock.calls[0] as unknown[])[0]).toMatchObject({
      max_tokens: 32_000,
    });
    expect(result.max_output_tokens).toBe(32_000);
  });
});

describe("the GLM writer (Cheaper Inference)", () => {
  const glmEntry = ENTRIES.find((entry) => entry.id === "glm-low")!;
  const answering = (envelope: unknown) => {
    const call = vi.fn(async (body: unknown) => {
      void body;
      return envelope as never;
    });
    return { call };
  };

  it("asks GLM for the report schema at its production effort, within the output allowance", async () => {
    const exported = await deliveredOrderExport();
    const evidence = evidenceFromD1(exported.order, exported.questions);
    const transport = answering({
      httpStatus: 200,
      body: {
        id: "chatcmpl-1",
        model: "glm-5.3-flash",
        choices: [{ finish_reason: "stop", message: { content: "{}" } }],
        usage: { prompt_tokens: 30_000, completion_tokens: 2_000 },
        billing: { billed_cost_usd: 0.004 },
      },
    });
    const ledger = new Ledger(join(dir, "spend.json"));

    const result = await runEntry(
      evidence,
      glmEntry,
      (ctx) => glmWriter(ctx, transport),
      ledger,
    );

    const body = transport.call.mock.calls[0]![0] as {
      model: string;
      reasoning_effort: string;
      max_tokens: number;
      messages: { role: string; content: string }[];
    };
    expect(body).toMatchObject({
      model: "glm-5.3-flash",
      reasoning_effort: "low",
      max_tokens: 16_000,
    });
    expect(body.messages[0]!.content).toContain("JSON Schema");
    // Spec 021 Part B: the production prompt carries Google's words itself.
    expect(body.messages.map((m) => m.content).join("\n")).toContain(
      '"google_text"',
    );
    // "{}" is not a report: a failed entry, settled at the billed cost.
    expect(result.status).toBe("failed");
    expect(result.failure).toMatch(/did not match the report schema/);
    expect(ledger.spentUsd()).toBe(0.004);
  });

  it("records a cut-off answer, and releases a request the provider turned away", async () => {
    const exported = await deliveredOrderExport();
    const evidence = evidenceFromD1(exported.order, exported.questions);
    const ledger = new Ledger(join(dir, "spend.json"));
    const cut = await runEntry(
      evidence,
      glmEntry,
      (ctx) =>
        glmWriter(
          ctx,
          answering({
            httpStatus: 200,
            body: {
              model: "glm-5.3-flash",
              choices: [{ finish_reason: "length", message: { content: "{" } }],
              usage: { prompt_tokens: 30_000, completion_tokens: 16_000 },
              billing: { billed_cost_usd: 0.01 },
            },
          }),
        ),
      ledger,
    );
    expect(cut.checks.cut_off_answers).toBe(1);
    expect(ledger.spentUsd()).toBe(0.01);

    await runEntry(
      evidence,
      glmEntry,
      (ctx) => glmWriter(ctx, answering({ httpStatus: 429, body: null })),
      ledger,
    );
    expect(ledger.spentUsd()).toBe(0.01);
  });
});

describe("blind review", () => {
  it("gives each order's entries one letter each, from A", () => {
    const key = assignLetters(["NV-AAAAAA", "NV-BBBBBB"]);
    for (const letters of Object.values(key)) {
      expect(Object.keys(letters)).toEqual(
        ["A", "B", "C", "D", "E", "F", "G", "H"].slice(0, ENTRIES.length),
      );
      expect(new Set(Object.values(letters))).toEqual(
        new Set(ENTRIES.map((entry) => entry.id)),
      );
    }
  });

  it("gives an entry added after scoring the next free letter, keeping the scored ones", () => {
    const scored = {
      A: "luna-low",
      B: "sonnet-high",
      C: "sonnet-medium",
      D: "haiku-medium",
      E: "luna-high",
    } as const;
    const extended = extendLetters({ ...scored });
    expect(extended).toMatchObject(scored);
    expect(new Set(Object.values(extended))).toEqual(
      new Set(ENTRIES.map((entry) => entry.id)),
    );
    expect(Object.keys(extended).slice(5).sort()).toEqual(
      ["F", "G", "H"].slice(0, ENTRIES.length - 5),
    );
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

describe("the reading test (founder decision 2026-10-27)", () => {
  it("reads the order's own site and the pages its answers cited, and counts the Firecrawl requests", async () => {
    const exported = await deliveredOrderExport();
    const evidence = evidenceFromD1(exported.order, exported.questions);
    const scraped: string[] = [];
    const read = await readOrderPages(evidence, {
      scrape: async (url) => {
        scraped.push(url);
        return {
          title: "Judul",
          markdown: `Isi ${url}. Hubungi 0812-3456-7890.`,
        };
      },
      map: async () => [],
    });
    expect(read.pages.length).toBeGreaterThan(0);
    // The synthetic answers cite contoh.test; every page keeps the questions
    // that cited it, and no phone number.
    const cited = read.pages.filter((page) => page.kind === "cited");
    expect(cited.length).toBeGreaterThan(0);
    for (const page of cited) expect(page.cited_in.length).toBeGreaterThan(0);
    for (const page of read.pages)
      expect(containsPhoneNumber(page.text)).toBe(false);
    expect(read.firecrawl_requests).toBe(scraped.length + 1);
  });

  it("a page writer reads the saved pages; without them it refuses; its writer differs from its twin's", async () => {
    const exported = await deliveredOrderExport();
    const evidence = evidenceFromD1(exported.order, exported.questions);
    const entry = PAGE_ENTRIES[0]!;
    const twin = ENTRIES.find((item) => item.id === entry.twin)!;
    await expect(entryInput(evidence, entry, dir)).rejects.toThrow(
      /no pages read/,
    );
    const path = pagesPath(evidence.order.order_number, dir);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(
      path,
      JSON.stringify({
        read_at: "2026-10-27T00:00:00.000Z",
        pages: [
          {
            url: "https://hadirr.com/a",
            domain: "hadirr.com",
            title: "Daftar",
            kind: "cited",
            cited_in: [],
            text: "Daftar klinik terbaik.",
          },
        ],
        unread: [],
        firecrawl_requests: 2,
      }),
    );
    const withPages = await entryInput(evidence, entry, dir);
    expect(withPages.input.two_source_facts!.writer!.pages).toHaveLength(1);
    const plain = await entryInput(evidence, twin, dir);
    expect(plain.input.two_source_facts!.writer!.pages).toBeUndefined();
    expect(writerFingerprint(entry, withPages.input)).not.toBe(
      writerFingerprint(twin, plain.input),
    );
    // The blind set is unchanged: the page writers are not in it.
    expect(ENTRIES.some((item) => item.input === "pages")).toBe(false);
    // Pages read again make a new writer, so the old result is redone.
    const reread = {
      ...withPages.input,
      two_source_facts: {
        ...withPages.input.two_source_facts!,
        writer: {
          ...withPages.input.two_source_facts!.writer!,
          pages: [
            {
              ...withPages.input.two_source_facts!.writer!.pages![0]!,
              text: "Daftar klinik, diperbarui.",
            },
          ],
        },
      },
    };
    expect(writerFingerprint(entry, reread)).not.toBe(
      writerFingerprint(entry, withPages.input),
    );
    // The pair differs only by the pages: the rest is the twin's input.
    const { pages, ...rest } = withPages.input.two_source_facts!.writer!;
    void pages;
    expect(rest).toEqual(plain.input.two_source_facts!.writer);
  });

  it("a saved reading with no page is refused, never sent as a copy of the twin", async () => {
    const exported = await deliveredOrderExport();
    const evidence = evidenceFromD1(exported.order, exported.questions);
    const path = pagesPath(evidence.order.order_number, dir);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(
      path,
      JSON.stringify({
        read_at: "",
        pages: [],
        unread: ["x"],
        firecrawl_requests: 1,
      }),
    );
    await expect(entryInput(evidence, PAGE_ENTRIES[0]!, dir)).rejects.toThrow(
      /no pages read/,
    );
  });

  it("the blind set's writer is known without running any blind entry", async () => {
    const exported = await deliveredOrderExport();
    const evidence = evidenceFromD1(exported.order, exported.questions);
    const blind = await blindWriterFingerprint(evidence, dir);
    for (const entry of ENTRIES)
      expect(
        writerFingerprint(
          entry,
          (await entryInput(evidence, entry, dir)).input,
        ),
      ).toBe(blind);
  });

  it("pairs are blind, drawn once, and kept while their writers stay the same", () => {
    const ready = [
      { entry: "luna-high-pages", twin: "luna-high", writers: ["p1", "t1"] },
      {
        entry: "opus-medium-pages",
        twin: "opus-medium",
        writers: ["p2", "t2"],
      },
    ] as const;
    const drawn = drawPagePairs(
      ready.map((pair) => ({
        ...pair,
        writers: [...pair.writers] as [string, string],
      })),
      undefined,
      () => 0,
    );
    expect(Object.keys(drawn).sort()).toEqual(["A", "B"]);
    expect(
      Object.values(drawn)
        .map((pair) => pair.entry)
        .sort(),
    ).toEqual(["luna-high-pages", "opus-medium-pages"]);
    for (const pair of Object.values(drawn))
      expect(["1", "2"]).toContain(pair.with_pages);
    // Drawn again with the same writers: unchanged.
    const again = drawPagePairs(
      ready.map((pair) => ({
        ...pair,
        writers: [...pair.writers] as [string, string],
      })),
      drawn,
      () => 1,
    );
    expect(again).toEqual(drawn);
    // A new twin writer: that pair is drawn again, the other kept.
    const luna = Object.entries(drawn).find(
      ([, p]) => p.entry === "luna-high-pages",
    )!;
    const changed = drawPagePairs(
      [
        { entry: "luna-high-pages", twin: "luna-high", writers: ["p1", "t9"] },
        {
          entry: "opus-medium-pages",
          twin: "opus-medium",
          writers: ["p2", "t2"],
        },
      ],
      drawn,
      () => 0,
    );
    const opus = Object.entries(drawn).find(
      ([, p]) => p.entry === "opus-medium-pages",
    )!;
    expect(changed[opus[0]]).toEqual(opus[1]);
    expect(
      Object.values(changed).find((p) => p.entry === "luna-high-pages")!
        .writers,
    ).toEqual(["p1", "t9"]);
    void luna;
  });
});
