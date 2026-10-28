/**
 * Spec 023 R-14 and R-15: the report-writing-quality test. Claude Opus 5.5
 * medium with pages, the writer before Spec 023 against the writer after it,
 * on the same saved orders and the same pages, from one ledger.
 *
 * One shared folder (REPORT_TEST_SHARED_DIR, an absolute path) holds the
 * exported evidence (raw/), the pages (pages/<order>.json, read once) and the
 * one ledger (spend.json). Each writer writes only its own results folder
 * (REPORT_TEST_RESULTS_DIR): the "before" writer from a git worktree of main
 * before the writer change, the "after" writer from that change's frozen
 * commit. Run one writer at a time, pair by pair.
 *
 * 1. Write (dry run by default; no provider call):
 *
 *   REPORT_TEST_SHARED_DIR=/abs/shared REPORT_TEST_RESULTS_DIR=/abs/before \
 *   REPORT_TEST_LABEL=before ORDERS=NV-3WDSAY RUN=1 \
 *   npx vitest run --config vitest.live-provider.config.ts scripts/report-writer-test/style.spec.ts
 *
 *   Live, with the founder's go: add REPORT_TEST_LIVE=1 and
 *   REPORT_TEST_MAX_OUTPUT_TOKENS=24000 (production's Claude allowance; the
 *   run refuses any other). Needs NUAVE_ANTHROPIC_API_KEY, and
 *   FIRECRAWL_API_KEY the first time an order's pages are read.
 *
 * 2. Pairs (no provider call): REPORT_TEST_SHARED_DIR plus
 *   REPORT_TEST_BEFORE_DIR and REPORT_TEST_AFTER_DIR. Writes
 *   style-review/<order>/"Pasangan <run> - 1.json" and "- 2.json" in random
 *   order and a blank scores.csv; style-key/key.json and metrics.csv (which
 *   name before and after) are kept apart until scoring is done.
 *   review.spec.ts prints the pairs as PDFs, from the after writer's build.
 */
import { execSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join } from "node:path";
import { expect, it, vi } from "vitest";

// Never reach a Worker context from a test run.
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => {
    throw new Error("no Worker context in the report-writer test");
  },
}));

import {
  claudeWriter,
  entryInput,
  entryPrompt,
  HARD_STOP_USD,
  Ledger,
  loadEvidence,
  outputAllowance,
  PAGE_ENTRIES,
  pagesPath,
  patientFetch,
  readOrderPages,
  runEntry,
  telltaleIn,
  worstCaseUsd,
  writerFingerprint,
  type EntryResult,
} from "./harness";
import {
  blindStyleReport,
  drawStylePair,
  styleMetrics,
  type StyleLabel,
  type StylePairKey,
} from "./style";
import { CLAUDE_WRITERS } from "../../src/lib/audit/models";
import type { AuditReport } from "../../src/lib/audit/types";
import { firecrawlFetcher } from "../../src/lib/reading/page-reader";

const env = (name: string) => process.env[name]?.trim() || undefined;
const absolute = (name: string) => {
  const value = env(name);
  if (value && !isAbsolute(value))
    throw new Error(`${name} must be an absolute path.`);
  return value;
};
const SHARED = absolute("REPORT_TEST_SHARED_DIR");
const RESULTS = absolute("REPORT_TEST_RESULTS_DIR");
const BEFORE = absolute("REPORT_TEST_BEFORE_DIR");
const AFTER = absolute("REPORT_TEST_AFTER_DIR");
const LABEL = env("REPORT_TEST_LABEL") as StyleLabel | undefined;
if (LABEL && LABEL !== "before" && LABEL !== "after")
  throw new Error('REPORT_TEST_LABEL must be "before" or "after".');
const live = env("REPORT_TEST_LIVE") === "1";
const RUN = Number(env("RUN") ?? "1");
if (!Number.isInteger(RUN) || RUN < 1 || RUN > 5)
  throw new Error("RUN must be a whole number from 1 to 5.");

/** The live writer: Claude Opus 5.5, medium effort, with pages read. */
const ENTRY = PAGE_ENTRIES.find((entry) => entry.id === "opus-medium-pages")!;

const savedOrders = (dir: string) =>
  existsSync(join(dir, "raw"))
    ? readdirSync(join(dir, "raw"))
        .filter((name) => name.endsWith("-order.json"))
        .map((name) => name.replace(/-order\.json$/, ""))
        .sort()
    : [];
const ordersIn = (dir: string) =>
  env("ORDERS")
    ? env("ORDERS")!
        .split(",")
        .map((order) => order.trim())
    : savedOrders(dir);

const write = (path: string, value: unknown) => {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
const readJson = <T>(path: string): T | null =>
  existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : null;
const resultPath = (dir: string, order: string, run: number) =>
  join(dir, "runs", order, `run-${run}.json`);

/** The commit this writer runs from, recorded with every result. */
function commit() {
  const run = (command: string) => execSync(command, { encoding: "utf8" });
  return {
    commit: run("git rev-parse HEAD").trim(),
    dirty: run("git status --porcelain --untracked-files=no").trim() !== "",
  };
}

type StyleResult = EntryResult & {
  run: number;
  style_label: StyleLabel;
  commit: { commit: string; dirty: boolean };
};

it.skipIf(!SHARED || !RESULTS || !LABEL)(
  "Spec 023: one writer's reports on the saved orders",
  { timeout: 60 * 60 * 1000 },
  async () => {
    if (
      live &&
      outputAllowance() !== CLAUDE_WRITERS["claude-opus-5-5"].maxTokens
    )
      throw new Error(
        `A live run uses production's output allowance: set REPORT_TEST_MAX_OUTPUT_TOKENS=${CLAUDE_WRITERS["claude-opus-5-5"].maxTokens}.`,
      );
    const ledger = new Ledger(
      join(SHARED!, "spend.json"),
      HARD_STOP_USD,
      LABEL,
    );
    const at = commit();
    write(join(RESULTS!, "commit.json"), { label: LABEL, ...at });
    const plan: Record<string, unknown>[] = [];

    for (const order of ordersIn(SHARED!)) {
      const evidence = loadEvidence(order, SHARED!);
      // Firecrawl reads an order's pages once, on the first live run; both
      // writers then read the same file.
      if (live && !existsSync(pagesPath(order, SHARED!))) {
        const key = process.env.FIRECRAWL_API_KEY;
        if (!key) throw new Error("FIRECRAWL_API_KEY is needed to read pages.");
        const read = await readOrderPages(
          evidence,
          firecrawlFetcher(key, patientFetch()),
        );
        if (!read.pages.length)
          throw new Error(`${order}: Firecrawl read no page; nothing kept.`);
        write(pagesPath(order, SHARED!), read);
        console.log(
          `${order} pages: ${read.pages.length} read, ${read.firecrawl_requests} Firecrawl requests`,
        );
      }
      if (!existsSync(pagesPath(order, SHARED!))) {
        plan.push({
          order,
          run: RUN,
          label: LABEL,
          note: "pages not read yet",
        });
        continue;
      }
      const { input } = await entryInput(evidence, ENTRY, SHARED!);
      const { developer, user } = entryPrompt(ENTRY, input);
      const promptChars = developer.length + user.length;
      const writer = writerFingerprint(ENTRY, input);
      const path = resultPath(RESULTS!, order, RUN);
      const saved = readJson<StyleResult>(path);
      const done = saved?.writer === writer;
      plan.push({
        order,
        run: RUN,
        label: LABEL,
        writer,
        prompt_chars: promptChars,
        // The report and, at worst, its one language revision.
        worst_case_usd: 2 * worstCaseUsd(ENTRY.model!, promptChars),
        done,
      });
      if (!live || done) continue;
      if (saved) {
        const aside = join(
          RESULTS!,
          "runs",
          order,
          "superseded",
          `run-${RUN}-${saved.writer}.json`,
        );
        mkdirSync(join(aside, ".."), { recursive: true });
        renameSync(path, aside);
      }
      const result = await runEntry(
        evidence,
        ENTRY,
        claudeWriter,
        ledger,
        SHARED!,
      );
      appendFileSync(
        join(RESULTS!, "attempts.jsonl"),
        `${JSON.stringify({
          at: new Date().toISOString(),
          order,
          run: RUN,
          label: LABEL,
          writer,
          status: result.status,
          failure: result.failure,
          calls: result.calls,
          cost_usd: result.cost_usd,
        })}\n`,
      );
      if (result.status === "ok" || result.calls.length > 0)
        write(path, {
          ...result,
          run: RUN,
          style_label: LABEL!,
          commit: at,
        } satisfies StyleResult);
      console.log(
        `${order} run ${RUN} ${LABEL}: ${result.status}${result.failure ? ` (${result.failure})` : ""}, USD ${result.cost_usd}; ledger USD ${ledger.spentUsd()} of ${ledger.hardStopUsd}`,
      );
    }

    write(join(RESULTS!, `plan-run-${RUN}.json`), plan);
    console.table(plan);
    const worst = plan
      .filter((row) => row.done === false)
      .reduce((sum, row) => sum + (row.worst_case_usd as number), 0);
    console.log(
      `Mode: ${live ? "LIVE" : "dry run (no provider call)"}. ${LABEL} writer at ${at.commit}${at.dirty ? " (uncommitted changes)" : ""}. Ledger USD ${ledger.spentUsd()} of USD ${ledger.hardStopUsd}. Worst case still to run for this writer: USD ${Math.round(worst * 100) / 100}.`,
    );
  },
);

it.skipIf(!SHARED || !BEFORE || !AFTER)(
  "Spec 023: blind before/after pairs, the metrics and the scoring sheet",
  { timeout: 10 * 60 * 1000 },
  async () => {
    const review = join(SHARED!, "style-review");
    const keyDir = join(SHARED!, "style-key");
    const stored =
      readJson<Record<string, Record<string, StylePairKey>>>(
        join(keyDir, "key.json"),
      ) ?? {};
    const key: Record<string, Record<string, StylePairKey>> = { ...stored };
    const guide = existsSync("docs/content/report/WRITING_GUIDE.md")
      ? readFileSync("docs/content/report/WRITING_GUIDE.md", "utf8")
      : "";
    const metricsRows: string[] = [
      [
        "order",
        "run",
        "label",
        "pair_number",
        "writer",
        "commit",
        "status",
        "revision_ran",
        "diagnostics",
        "cost_usd",
        "seconds",
        "sentences",
        "mean_sentence_words",
        "sentence_words_spread",
        "share_over_30_words",
        "typical_phrases",
        "dashes",
        "brand_name",
        "klinik_ini",
        "klinik_or_bisnis_anda",
        "anda",
        "repeated_counts",
        "cause_markers",
        "guide_overlaps",
      ].join(","),
    ];
    const cell = (value: unknown) =>
      `"${(typeof value === "string" ? value : JSON.stringify(value)).replace(/"/g, '""')}"`;
    const pairs: string[] = [];

    for (const order of ordersIn(SHARED!)) {
      const evidence = loadEvidence(order, SHARED!);
      const deliveredAt = (
        JSON.parse(evidence.order.report_json) as AuditReport
      ).generated_at;
      const intake = JSON.parse(evidence.order.intake_json) as {
        context: unknown;
        prompts: unknown;
        originals?: unknown;
      };
      const names = existsSync(pagesPath(order, SHARED!))
        ? ((await entryInput(evidence, ENTRY, SHARED!)).input.two_source_facts
            ?.names ?? [])
        : [];
      const runs = existsSync(join(AFTER!, "runs", order))
        ? readdirSync(join(AFTER!, "runs", order))
            .map((name) => /^run-(\d+)\.json$/.exec(name)?.[1])
            .filter((run): run is string => Boolean(run))
            .sort()
        : [];
      for (const run of runs) {
        const results = {
          before: readJson<StyleResult>(
            resultPath(BEFORE!, order, Number(run)),
          ),
          after: readJson<StyleResult>(resultPath(AFTER!, order, Number(run))),
        };
        if (!results.before?.report || !results.after?.report) continue;
        const pair = drawStylePair(
          { before: results.before.writer, after: results.after.writer },
          stored[order]?.[run],
        );
        key[order] = { ...key[order], [run]: pair };
        const numbers: Record<StyleLabel, "1" | "2"> = {
          after: pair.after,
          before: pair.after === "1" ? "2" : "1",
        };
        for (const label of ["before", "after"] as const) {
          const result = results[label]!;
          const report = blindStyleReport(result.report!, deliveredAt);
          expect(
            telltaleIn(report),
            `${order} run ${run} ${label} still names its writer`,
          ).toBeNull();
          write(
            join(review, order, `Pasangan ${run} - ${numbers[label]}.json`),
            {
              report,
              context: intake.context,
              prompts: intake.prompts,
              originals: intake.originals ?? [],
              observations: evidence.rows.flatMap((row) =>
                row.observation_json ? [JSON.parse(row.observation_json)] : [],
              ),
              synthetic: false,
            },
          );
          const m = styleMetrics(result.report!, names, guide);
          const seconds =
            (result.report!.operational_telemetry?.calls ?? []).reduce(
              (sum, call) => sum + (call.latency_ms ?? 0),
              0,
            ) / 1000;
          metricsRows.push(
            [
              order,
              run,
              label,
              numbers[label],
              result.writer,
              result.commit?.commit ?? "",
              result.status,
              result.checks.language_fix_call,
              cell(result.checks.diagnostics),
              result.cost_usd,
              Math.round(seconds),
              m.sentences,
              m.mean_sentence_words,
              m.sentence_words_spread,
              m.share_over_30_words,
              cell(m.typical_phrases),
              m.dashes,
              m.brand_name,
              m.klinik_ini,
              m.klinik_or_bisnis_anda,
              m.anda,
              cell(m.repeated_counts),
              cell(m.cause_markers),
              cell(m.example_overlaps),
            ].join(","),
          );
        }
        pairs.push(`${order},${run}`);
      }
    }

    write(join(keyDir, "key.json"), key);
    writeFileSync(join(keyDir, "metrics.csv"), `${metricsRows.join("\n")}\n`);
    // The founder's sheet: for each pair, which report does better (1, 2 or
    // sama), the overall pick, and the safety gate for each report. An
    // existing sheet is never overwritten.
    const scores = join(review, "scores.csv");
    if (!existsSync(scores) && pairs.length) {
      mkdirSync(review, { recursive: true });
      writeFileSync(
        scores,
        `${[
          "order,pair,main_message_after_first_paragraph_1_2_sama,every_finding_answers_so_what_1_2_sama,editor_would_change_less_1_2_sama,overall_pick_1_2,safety_fail_1_ya_tidak,safety_fail_2_ya_tidak,notes",
          ...pairs.map((pair) => `${pair},,,,,,,`),
        ].join("\n")}\n`,
      );
    }
    // Both writers' worst cases, from their dry runs.
    const planned = [BEFORE!, AFTER!].flatMap((dir) =>
      existsSync(dir)
        ? readdirSync(dir)
            .filter((name) => /^plan-run-\d+\.json$/.test(name))
            .flatMap(
              (name) =>
                readJson<{ worst_case_usd?: number; done?: boolean }[]>(
                  join(dir, name),
                ) ?? [],
            )
        : [],
    );
    const worst = planned
      .filter((row) => row.done === false)
      .reduce((sum, row) => sum + (row.worst_case_usd ?? 0), 0);
    console.log(
      `${pairs.length} pairs written to ${review}; key and metrics in ${keyDir} (open only after scoring). Both writers' worst case still to run: USD ${Math.round(worst * 100) / 100} (hard stop USD ${HARD_STOP_USD}).`,
    );
  },
);
