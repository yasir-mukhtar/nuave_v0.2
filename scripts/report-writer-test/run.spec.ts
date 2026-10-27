/**
 * Runs test B (see harness.ts) on the orders saved under
 * .local-evidence/report-writer-test/raw/.
 *
 * Dry run (default, no provider call):
 *
 *   npx vitest run --config vitest.live-provider.config.ts scripts/report-writer-test/run.spec.ts
 *
 * keeps each delivered report as the labelled reference (re-running its writing
 * through today's pipeline, which must give it back unchanged when today's
 * writer wrote it), builds every entry's prompt and prints each planned call's
 * worst case against the USD 5 hard stop.
 *
 * Live (only with the founder's go-ahead): add REPORT_TEST_LIVE=1. Needs
 * OPENAI_API_KEY and NUAVE_ANTHROPIC_API_KEY. ORDERS=NV-…,NV-… and
 * ENTRIES=luna-high,… narrow the run. An entry already written by today's
 * writer is never run again (delete its file under runs/ to redo it); one
 * written by an earlier writer (before Spec 021 Part B, say) is moved to
 * runs/<order>/superseded/ and written again.
 *
 * Either way it then writes the review pack: review/<order>/reference.json
 * (the delivered report, labelled) and, once every entry exists from the
 * same writer, review/<order>/<letter>.json for each, key.json (kept apart;
 * open only after scoring) and scores.csv. review.spec.ts prints the pack
 * from the report page as PDFs.
 */
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
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
  extendLetters,
  glmWriter,
  replayDelivered,
  ENTRIES,
  EVIDENCE_DIR,
  PAGE_ENTRIES,
  pagesPath,
  readOrderPages,
  entryPrompt,
  entryInput,
  Ledger,
  loadEvidence,
  lunaWriter,
  runEntry,
  telltaleIn,
  worstCaseUsd,
  writerFingerprint,
  type EntryId,
  type EntryKey,
  type EntryResult,
} from "./harness";
import type { AuditReport } from "../../src/lib/audit/types";
import { firecrawlFetcher } from "../../src/lib/reading/page-reader";

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
// The reading test's writers run only when named in ENTRIES.
const entries = [
  ...ENTRIES.filter((entry) => !only || only.includes(entry.id)),
  ...PAGE_ENTRIES.filter((entry) => only?.includes(entry.id)),
];

const resultPath = (order: string, entry: EntryKey) =>
  join(EVIDENCE_DIR, "runs", order, `${entry}.json`);
const readResult = (order: string, entry: EntryKey) =>
  existsSync(resultPath(order, entry))
    ? (JSON.parse(
        readFileSync(resultPath(order, entry), "utf8"),
      ) as EntryResult)
    : null;
const write = (path: string, value: unknown) => {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

/** An order's letters, drawn for one full set of results from one writer. */
type OrderKey = { writer: string; letters: Record<string, EntryId> };

it.skipIf(orders.length === 0)(
  "test B: report writers on saved two-source orders",
  { timeout: 60 * 60 * 1000 },
  async () => {
    const ledger = new Ledger();
    const plan: Record<string, unknown>[] = [];
    const writers = new Map<string, string>();

    for (const order of orders) {
      const evidence = loadEvidence(order);
      const delivered = JSON.parse(evidence.order.report_json) as AuditReport;

      // The reference: the delivered report, as saved. Its writing is re-run
      // through today's pipeline; with the same writer version it must come
      // back unchanged (see replayDelivered).
      const replay = await replayDelivered(evidence, ledger);
      expect(replay.reproduced, replay.note).not.toBe(false);
      write(
        resultPath(order, "reference"),
        deliveredResult(replay.result, delivered, replay.note),
      );
      console.log(`${order} reference (delivered report): ${replay.note}`);

      // The reading test: Firecrawl reads the order's pages once, on the
      // first live run that names a page writer; later runs reuse the file.
      if (
        live &&
        entries.some((entry) => entry.input === "pages") &&
        !existsSync(pagesPath(order))
      ) {
        const key = process.env.FIRECRAWL_API_KEY;
        if (!key) throw new Error("FIRECRAWL_API_KEY is needed to read pages.");
        const read = await readOrderPages(evidence, firecrawlFetcher(key));
        write(pagesPath(order), read);
        console.log(
          `${order} pages: ${read.pages.length} read, ${read.unread.length} unread, ${read.firecrawl_requests} Firecrawl requests`,
        );
      }

      for (const entry of entries) {
        if (entry.input === "pages" && !existsSync(pagesPath(order))) {
          plan.push({
            order,
            entry: entry.id,
            worst_case_usd_per_call: 0,
            done: false,
            note: "pages not read yet",
          });
          continue;
        }
        const { input } = await entryInput(evidence, entry);
        const { developer, user } = entryPrompt(entry, input);
        const promptChars = developer.length + user.length;
        const writer = writerFingerprint(entry, input);
        // The blind set's writer; the reading test's writers are compared
        // apart.
        if (entry.input !== "pages") writers.set(order, writer);
        const saved = readResult(order, entry.id);
        const done = saved?.writer === writer;
        plan.push({
          order,
          entry: entry.id,
          writer,
          prompt_chars: promptChars,
          worst_case_usd_per_call: worstCaseUsd(entry.model!, promptChars),
          done,
          earlier_writer: saved && !done ? (saved.writer ?? "unknown") : null,
        });
        if (!live || done) continue;
        // A result from an earlier writer is kept aside, never overwritten.
        if (saved) {
          const aside = join(
            EVIDENCE_DIR,
            "runs",
            order,
            "superseded",
            `${entry.id}-${saved.writer ?? "unknown"}.json`,
          );
          mkdirSync(join(aside, ".."), { recursive: true });
          renameSync(resultPath(order, entry.id), aside);
        }
        const result = await runEntry(
          evidence,
          entry,
          entry.provider === "openai"
            ? lunaWriter
            : entry.provider === "cheaper-inference"
              ? glmWriter
              : claudeWriter,
          ledger,
        );
        // Every attempt is logged (test output is not shown). An entry whose
        // first request failed before an answer came back is not saved, so
        // the next run tries it again.
        appendFileSync(
          join(EVIDENCE_DIR, "attempts.jsonl"),
          `${JSON.stringify({
            at: new Date().toISOString(),
            order,
            entry: entry.id,
            writer,
            status: result.status,
            failure: result.failure,
            calls: result.calls,
            cost_usd: result.cost_usd,
          })}\n`,
        );
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

    // The review pack. The reference is always written, labelled. An order's
    // letters are drawn only once every entry exists from today's writer,
    // so no partial or mixed pack can show which letter is which; they are
    // kept until the writer changes, when the old pack is removed.
    const keyPath = join(EVIDENCE_DIR, "key.json");
    const stored = existsSync(keyPath)
      ? (JSON.parse(readFileSync(keyPath, "utf8")) as Record<string, unknown>)
      : {};
    const key: Record<string, OrderKey> = {};
    const header =
      "order,letter,report,evidence_1_5,specific_actions_1_5,natural_indonesian_1_5,clear_to_owner_1_5,send_to_paying_customer_yes_no,notes";
    const rows = [header];
    // The founder's scores are kept while an order's letters stay the same;
    // a sheet whose letters are redrawn is kept aside, never overwritten.
    const scoresPath = join(EVIDENCE_DIR, "scores.csv");
    const scored = new Map<string, string>();
    if (existsSync(scoresPath))
      for (const line of readFileSync(scoresPath, "utf8")
        .split("\n")
        .slice(1)) {
        const [order, letter, , ...rest] = line.split(",");
        if (order && letter && rest.some((cell) => cell.trim()))
          scored.set(`${order},${letter}`, rest.join(","));
      }
    let scoresDropped = false;
    for (const order of orders) {
      const evidence = loadEvidence(order);
      const intake = JSON.parse(evidence.order.intake_json) as {
        context: unknown;
        prompts: unknown;
        originals?: unknown;
      };
      const page = (report: AuditReport) => ({
        report,
        context: intake.context,
        prompts: intake.prompts,
        originals: intake.originals ?? [],
        observations: evidence.rows.flatMap((row) =>
          row.observation_json ? [JSON.parse(row.observation_json)] : [],
        ),
        synthetic: false,
      });
      const dir = join(EVIDENCE_DIR, "review", order);
      const writer = writers.get(order)!;
      const results = ENTRIES.map((entry) => readResult(order, entry.id));
      const complete = results.every((result) => result?.writer === writer);
      const previous = stored[order] as OrderKey | undefined;
      const kept =
        previous?.writer === writer && previous.letters ? previous : null;
      if (!kept) {
        rmSync(dir, { recursive: true, force: true });
        scoresDropped ||= [...scored.keys()].some((k) =>
          k.startsWith(`${order},`),
        );
      }
      write(
        join(dir, "reference.json"),
        page(readResult(order, "reference")!.report!),
      );
      if (!complete && !kept) continue;
      // An entry added after scoring gets the next free letter once it has
      // run; the scored letters keep their meaning.
      key[order] = kept
        ? complete
          ? { ...kept, letters: extendLetters(kept.letters) }
          : kept
        : { writer, letters: assignLetters([order])[order]! };
      const deliveredAt = (
        JSON.parse(evidence.order.report_json) as AuditReport
      ).generated_at;
      for (const [letter, id] of Object.entries(key[order]!.letters)) {
        const found = readResult(order, id);
        const result = found?.writer === writer ? found : null;
        rows.push(
          `${order},${letter},${!result ? "not run" : result.report ? "ready" : "no report (writer failed)"},${(kept && scored.get(`${order},${letter}`)) || ",,,,,"}`,
        );
        if (!result?.report) continue;
        const report = blindReport(result.report, deliveredAt);
        expect(
          telltaleIn(report),
          `${order} ${letter} still names its writer`,
        ).toBeNull();
        write(join(dir, `${letter}.json`), page(report));
      }
    }
    write(keyPath, key);

    // The reading test, labelled (not blind): each page writer beside its
    // twin, printed by review.spec.ts as "Bandingkan - <writer>.pdf".
    for (const order of orders) {
      const evidence = loadEvidence(order);
      const intake = JSON.parse(evidence.order.intake_json) as {
        context: unknown;
        prompts: unknown;
        originals?: unknown;
      };
      const deliveredAt = (
        JSON.parse(evidence.order.report_json) as AuditReport
      ).generated_at;
      for (const entry of PAGE_ENTRIES) {
        for (const id of [entry.twin, entry.id]) {
          const result = readResult(order, id);
          if (!result?.report) continue;
          write(join(EVIDENCE_DIR, "review", order, `compare-${id}.json`), {
            report: blindReport(result.report, deliveredAt),
            context: intake.context,
            prompts: intake.prompts,
            originals: intake.originals ?? [],
            observations: evidence.rows.flatMap((row) =>
              row.observation_json ? [JSON.parse(row.observation_json)] : [],
            ),
            synthetic: false,
          });
        }
      }
    }
    if (scoresDropped && existsSync(scoresPath))
      renameSync(
        scoresPath,
        join(EVIDENCE_DIR, `scores-superseded-${Date.now()}.csv`),
      );
    writeFileSync(scoresPath, `${rows.join("\n")}\n`);
  },
);
