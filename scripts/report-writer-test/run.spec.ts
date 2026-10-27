/**
 * Runs test B (see harness.ts) on the orders saved under
 * .local-evidence/report-writer-test/raw/.
 *
 * Dry run (default, no provider call):
 *
 *   npx vitest run --config vitest.live-provider.config.ts scripts/report-writer-test/run.spec.ts
 *
 * re-runs each delivered report through the pipeline from its saved evidence
 * (it must come back unchanged), builds every entry's prompt and prints each
 * planned call's worst case against the USD 5 hard stop.
 *
 * Live (only with the founder's go-ahead): add REPORT_TEST_LIVE=1. Needs
 * OPENAI_API_KEY and NUAVE_ANTHROPIC_API_KEY. ORDERS=NV-…,NV-… and
 * ENTRIES=luna-high,… narrow the run. A finished entry is never run again;
 * delete its file under runs/ to redo it.
 *
 * Either way it then writes the blind review pack: review/<order>/<letter>.json
 * for each finished entry, key.json (kept apart; open only after scoring) and
 * scores.csv. review.spec.ts shows the pack on the report page as PDFs.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { expect, it, vi } from "vitest";

// Never reach a Worker context from a test run.
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => {
    throw new Error("no Worker context in the report-writer test");
  },
}));

import {
  assignLetters,
  blindReport,
  claudeWriter,
  deliveredResult,
  ENTRIES,
  EVIDENCE_DIR,
  entryPrompt,
  entryInput,
  Ledger,
  loadEvidence,
  lunaWriter,
  runEntry,
  telltaleIn,
  worstCaseUsd,
  type EntryId,
  type EntryResult,
} from "./harness";
import type { AuditReport } from "../../src/lib/audit/types";

const live = process.env.REPORT_TEST_LIVE === "1";
const savedOrders = existsSync(join(EVIDENCE_DIR, "raw"))
  ? readdirSync(join(EVIDENCE_DIR, "raw"))
      .filter((name) => name.endsWith("-order.json"))
      .map((name) => name.replace(/-order\.json$/, ""))
      .sort()
  : [];
const orders = process.env.ORDERS
  ? process.env.ORDERS.split(",").map((order) => order.trim())
  : savedOrders;
const only = process.env.ENTRIES?.split(",").map((id) => id.trim());
const entries = ENTRIES.filter(
  (entry) => entry.id === "delivered" || !only || only.includes(entry.id),
);

const resultPath = (order: string, entry: EntryId) =>
  join(EVIDENCE_DIR, "runs", order, `${entry}.json`);
const write = (path: string, value: unknown) => {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

/** The writing a founder judges; equal when the pipeline replays faithfully. */
const writing = (report: AuditReport) => ({
  conclusion: report.conclusion,
  accuracy_status: report.accuracy_status,
  key_findings: report.key_findings,
  priorities: report.priorities,
  details: report.details,
  method_summary: report.method_summary,
  two_source: report.two_source,
});

it.skipIf(orders.length === 0)(
  "test B: report writers on saved two-source orders",
  { timeout: 60 * 60 * 1000 },
  async () => {
    const ledger = new Ledger();
    const plan: Record<string, unknown>[] = [];

    for (const order of orders) {
      const evidence = loadEvidence(order);
      const delivered = JSON.parse(evidence.order.report_json) as AuditReport;

      // Entry 1: the delivered report, re-run from its evidence with its own
      // writing. It must come back as it was delivered: proof that every
      // other entry gets the order's real input and checks.
      const replay = await runEntry(evidence, ENTRIES[0]!, null, ledger);
      expect(replay.status, replay.failure ?? "").toBe("ok");
      expect(writing(replay.report!)).toEqual(writing(delivered));
      write(resultPath(order, "delivered"), deliveredResult(replay, delivered));

      for (const entry of entries.slice(1)) {
        const { input } = await entryInput(evidence, entry);
        const { developer, user } = entryPrompt(entry, input);
        const promptChars = developer.length + user.length;
        const done = existsSync(resultPath(order, entry.id));
        plan.push({
          order,
          entry: entry.id,
          prompt_chars: promptChars,
          worst_case_usd_per_call: worstCaseUsd(entry.model!, promptChars),
          done,
        });
        if (!live || done) continue;
        const writer = entry.provider === "openai" ? lunaWriter : claudeWriter;
        const result = await runEntry(evidence, entry, writer, ledger);
        // An entry whose first request was turned away ran nothing: it is
        // not saved, so the next run tries it again.
        if (result.status === "ok" || result.calls.length > 0)
          write(resultPath(order, entry.id), result);
        console.log(
          `${order} ${entry.id}: ${result.status}${result.failure ? ` (${result.failure})` : ""}, USD ${result.cost_usd}; ledger USD ${ledger.spentUsd()}`,
        );
      }
    }

    // A call can be refused by the hard stop: the plan shows each call's
    // worst case, and up to two calls per entry (the report and its wording fix).
    const worst = plan
      .filter((row) => !row.done)
      .reduce(
        (sum, row) => sum + 2 * (row.worst_case_usd_per_call as number),
        0,
      );
    console.table(plan);
    console.log(
      `Mode: ${live ? "LIVE" : "dry run (no provider call)"}. Ledger so far USD ${ledger.spentUsd()} of USD ${ledger.hardStopUsd}. Worst case of the entries still to run (two calls each): USD ${Math.round(worst * 100) / 100}.`,
    );
    write(join(EVIDENCE_DIR, "plan.json"), plan);

    // The blind review pack. An order's letters are drawn only once all five
    // of its entries have run, so no partial pack can show which letter is
    // which; they are then kept. Before that, the delivered report is written
    // unlettered to preview/ to check the report page.
    const keyPath = join(EVIDENCE_DIR, "key.json");
    const key = existsSync(keyPath)
      ? (JSON.parse(readFileSync(keyPath, "utf8")) as ReturnType<
          typeof assignLetters
        >)
      : {};
    const rows = [
      "order,letter,report,evidence_1_5,specific_actions_1_5,natural_indonesian_1_5,clear_to_owner_1_5,send_to_paying_customer_yes_no,notes",
    ];
    for (const order of orders) {
      const evidence = loadEvidence(order);
      const results = new Map(
        ENTRIES.flatMap((entry) =>
          existsSync(resultPath(order, entry.id))
            ? [
                [
                  entry.id,
                  JSON.parse(
                    readFileSync(resultPath(order, entry.id), "utf8"),
                  ) as EntryResult,
                ] as const,
              ]
            : [],
        ),
      );
      const page = (result: EntryResult) => {
        const report = blindReport(
          result.report!,
          (JSON.parse(evidence.order.report_json) as AuditReport).generated_at,
        );
        expect(
          telltaleIn(report),
          `${order} still names its writer`,
        ).toBeNull();
        const intake = JSON.parse(evidence.order.intake_json) as {
          context: unknown;
          prompts: unknown;
          originals?: unknown;
        };
        return {
          report,
          context: intake.context,
          prompts: intake.prompts,
          originals: intake.originals ?? [],
          observations: evidence.rows.flatMap((row) =>
            row.observation_json ? [JSON.parse(row.observation_json)] : [],
          ),
          synthetic: false,
        };
      };
      write(
        join(EVIDENCE_DIR, "preview", `${order}.json`),
        page(results.get("delivered")!),
      );
      if (results.size < ENTRIES.length) continue;
      key[order] ??= assignLetters([order])[order]!;
      for (const [letter, id] of Object.entries(key[order]!)) {
        const result = results.get(id)!;
        rows.push(
          `${order},${letter},${result.report ? "ready" : "no report (writer failed)"},,,,,,`,
        );
        if (result.report)
          write(
            join(EVIDENCE_DIR, "review", order, `${letter}.json`),
            page(result),
          );
      }
    }
    write(keyPath, key);
    writeFileSync(join(EVIDENCE_DIR, "scores.csv"), `${rows.join("\n")}\n`);
  },
);
