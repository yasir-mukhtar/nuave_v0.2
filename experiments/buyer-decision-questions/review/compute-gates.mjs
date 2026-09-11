#!/usr/bin/env node
/**
 * Gate CLI for the buyer-decision question experiment.
 *
 * Reads exported founder reviews (from the review page) plus the run records
 * written by the live specs and prints per-pack gates and the decision
 * summary:
 *
 *   node experiments/buyer-decision-questions/review/compute-gates.mjs \
 *       <review-export.json> [more-review-files...]
 *
 * Options:
 *   --results <dir>   results directory (default: experiments/.../results)
 *
 * Exit codes: 0 = all decided gates pass; 1 = at least one gate fails;
 * 2 = at least one review is incomplete (never auto-passed).
 *
 * Gates are decision rules for the founder review, not statistical proof.
 * Language quality and audit validity stay separate: a strong language score
 * never masks an invalid context or reduced coverage, and an incomplete
 * review is never reported as passing.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decisionGate, gateBPack, recordPackSanity } from "./gate-logic.mjs";

const EXPERIMENT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const DEFAULT_RESULTS = path.join(EXPERIMENT_ROOT, "results");

function usage() {
  process.stderr.write(
    "usage: node compute-gates.mjs [--results <dir>] <review-export.json> [more.json ...]\n",
  );
  process.exit(2);
}

function parseArgs(argv) {
  const files = [];
  let resultsDir = DEFAULT_RESULTS;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--results") {
      resultsDir = argv[index + 1];
      if (!resultsDir) usage();
      index += 1;
    } else {
      files.push(arg);
    }
  }
  return { files, resultsDir };
}

function loadRecords(resultsDir) {
  if (!existsSync(resultsDir)) return [];
  return readdirSync(resultsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) =>
      JSON.parse(readFileSync(path.join(resultsDir, file), "utf8")),
    )
    .filter((record) => record && typeof record.run_id === "string");
}

function loadReview(file) {
  if (!existsSync(file)) {
    process.stderr.write(`Review file not found: ${file}\n`);
    process.exit(2);
  }
  const raw = JSON.parse(readFileSync(file, "utf8"));
  if (raw.schema !== "nuave-bdq-review-export-v1") {
    process.stderr.write(
      `${file} is not a buyer-decision review export (schema ${raw.schema}).\n`,
    );
    process.exit(2);
  }
  return raw;
}

function marksFor(marks, runId, record) {
  const byIndex = {};
  const bindingErrors = [];
  for (const entry of marks || []) {
    if (entry.run_id !== runId) continue;
    const question = (record.output?.questions || []).find(
      (candidate) => candidate.index === entry.question_index,
    );
    if (!question || entry.question_text !== question.text) {
      bindingErrors.push(
        `Question ${entry.question_index} mark is not bound to the exact text in run ${runId}; refusing to use it.`,
      );
      continue;
    }
    byIndex[String(entry.question_index)] = entry;
  }
  return { byIndex, bindingErrors };
}

function itemsFor(packReview) {
  return (packReview && packReview.pass2 && packReview.pass2.items) || {};
}

function gateOnePack({ label, packReview, record, lines, applyGates = true }) {
  const runId = packReview.run_id;
  lines.push(`  ${label} (run ${runId}, ${record.run_kind}, ${record.condition})`);
  const sanity = recordPackSanity(record);
  for (const problem of sanity) lines.push(`    RECORD: ${problem}`);
  const { byIndex: marks, bindingErrors } = marksFor(packReview.marks, runId, record);
  for (const error of bindingErrors) lines.push(`    BINDING: ${error}`);
  if (bindingErrors.length > 0) {
    lines.push("    review binding: INCOMPLETE (marks must include exact question text)");
    return { verdict: "incomplete" };
  }
  if (applyGates && packReview.pass2?.reviewed_run_id !== runId) {
    lines.push("    review binding: INCOMPLETE (pass-2 answers are not bound to this run)");
    return { verdict: "incomplete" };
  }
  const markValues = Object.values(marks)
    .map((entry) => entry && entry.mark)
    .filter(Boolean);
  const counts = {
    keep: markValues.filter((mark) => mark === "keep").length,
    light: markValues.filter((mark) => mark === "light").length,
    replace: markValues.filter((mark) => mark === "replace").length,
    answered: markValues.length,
  };
  if (!applyGates) {
    // Per-pack quality gates are defined for condition B. A packs are the
    // current production behavior; their marks are summarized for the record
    // but no gate verdict is attached.
    lines.push(
      `    mark summary (no gate — A is the current approach): Keep ${counts.keep}, Light ${counts.light}, Replace ${counts.replace}, answered ${counts.answered}/10`,
    );
    return { verdict: "informational" };
  }
  const items = itemsFor(packReview);
  const gate = gateBPack({
    questions: (record.output && record.output.questions) || [],
    marksByIndex: marks,
    items,
    record,
  });
  const summary =
    gate.verdict === "pass"
      ? `PASS (Keep ${gate.counts.keep}, Light ${gate.counts.light}, Replace ${gate.counts.replace})`
      : gate.verdict.toUpperCase();
  lines.push(`    per-pack quality gates: ${summary}`);
  for (const reason of gate.reasons) lines.push(`      - ${reason}`);
  for (const warning of gate.warnings || []) lines.push(`      ~ ${warning} (informational)`);
  return { verdict: gate.verdict };
}

function main() {
  const { files, resultsDir } = parseArgs(process.argv.slice(2));
  if (files.length === 0) usage();
  const records = loadRecords(resultsDir);
  const recordByRunId = new Map(records.map((record) => [record.run_id, record]));
  const loadedExports = files.map(loadReview);
  // AI reviews remain useful evidence, but never participate in founder
  // acceptance or comparison decisions. Unknown provenance is excluded too.
  const exports = loadedExports.filter(
    (exportFile) => exportFile.reviewer?.type === "founder",
  );
  const lines = [];
  let anyFail = false;
  let anyIncomplete = false;

  lines.push("BUYER-DECISION EXPERIMENT — GATE SUMMARY");
  lines.push("========================================");
  lines.push(`Reviews: ${files.join(", ")}`);
  for (const exportFile of loadedExports) {
    const reviewer = exportFile.reviewer;
    if (reviewer) {
      const who =
        typeof reviewer === "string" ? reviewer : reviewer.name || reviewer.type || "unknown";
      const isFounder = who.toLowerCase().includes("founder");
      lines.push(
        `  - ${exportFile.exported_at || "?"} — reviewer: ${who}${isFounder ? "" : " (NOT founder marks — do not treat as product acceptance)"}`,
      );
    }
  }
  lines.push(
    `Results directory: ${resultsDir} (${records.length} run records)`,
  );
  for (const excluded of loadedExports.filter((exportFile) => !exports.includes(exportFile))) {
    const reviewer = excluded.reviewer;
    const who = typeof reviewer === "string"
      ? reviewer
      : reviewer?.name || reviewer?.type || "unknown";
    lines.push(`  - EXCLUDED reviewer: ${who} — not founder acceptance evidence`);
  }
  lines.push("");

  const comparison = {}; // fixture_id -> { fixture, aPack, bPack, preference }
  const extraPacks = [];
  for (const exportFile of exports) {
    const comparisonBlock = exportFile.comparison || {};
    for (const [fixtureId, fixtureReview] of Object.entries(comparisonBlock)) {
      comparison[fixtureId] = fixtureReview;
    }
    for (const pack of exportFile.extra_b_packs || []) {
      extraPacks.push(pack);
    }
  }

  const qualityByPack = {};

  lines.push("INITIAL COMPARISON — per-fixture packs");
  for (const [fixtureId, fixtureReview] of Object.entries(comparison)) {
    lines.push(`Fixture: ${fixtureId} (${fixtureReview.role || "unknown role"})`);
    for (const condition of ["A", "B"]) {
      const packReview = fixtureReview[condition.toLowerCase()];
      if (!packReview) {
        lines.push(`  [${condition}] not reviewed (incomplete).`);
        anyIncomplete = true;
        continue;
      }
      const record = recordByRunId.get(packReview.run_id);
      if (!record) {
        lines.push(
          `  [${condition}] run ${packReview.run_id} is not in the results directory — ` +
            "review does not match current results; refusing to compute gates.",
        );
        anyIncomplete = true;
        continue;
      }
      const gate = gateOnePack({
        label: `[${condition}]`,
        packReview,
        record,
        lines,
        applyGates: condition === "B",
      });
      if (condition === "B") {
        qualityByPack[`${fixtureId}::B`] = gate;
      }
      if (gate.verdict === "fail") anyFail = true;
      if (gate.verdict === "incomplete") anyIncomplete = true;
    }
    const preference = fixtureReview.preference ?? null;
    lines.push(
      `  overall pack preference: ${
        preference === null
          ? "NOT RECORDED (incomplete)"
          : preference === "tie"
            ? "tie"
            : `prefers ${preference}`
      }`,
    );
    if (preference === null) anyIncomplete = true;
    const expectedPreferenceBinding = {
      A: fixtureReview.a?.run_id || null,
      B: fixtureReview.b?.run_id || null,
    };
    if (
      preference !== null &&
      JSON.stringify(fixtureReview.preference_binding || null) !== JSON.stringify(expectedPreferenceBinding)
    ) {
      lines.push("  preference binding: INCOMPLETE (preference is not bound to both reviewed runs)");
      anyIncomplete = true;
    }
    lines.push("");
  }

  const fixtureIds = Object.keys(comparison);
  if (fixtureIds.length === 0) {
    lines.push("No initial-comparison fixture reviews found in the exports.");
    anyIncomplete = true;
  }

  if (extraPacks.length > 0) {
    lines.push("ADDITIONAL B PACKS (confirmation / challenger)");
    for (const packReview of extraPacks) {
      const record = recordByRunId.get(packReview.run_id);
      if (!record) {
        lines.push(
          `  run ${packReview.run_id} is not in the results directory — refusing to compute gates.`,
        );
        anyIncomplete = true;
        continue;
      }
      const gate = gateOnePack({
        label: `[B]`,
        packReview,
        record,
        lines,
      });
      if (gate.verdict === "fail") anyFail = true;
      if (gate.verdict === "incomplete") anyIncomplete = true;
    }
    lines.push("");
  }

  const fixtureReviews = Object.entries(comparison).map(
    ([fixtureId, fixtureReview]) => ({
      fixture_id: fixtureId,
      role: fixtureReview.role,
      preference: fixtureReview.preference ?? null,
    }),
  );
  const decision = decisionGate({
    fixtureReviews,
    qualityByPack,
  });
  lines.push(
    `DECISION (initial comparison): ${decision.verdict.toUpperCase()}${
      decision.reasons.length
        ? ""
        : " — founder prefers B on 2+ fixtures including a held-out fixture; B quality gates pass everywhere."
    }`,
  );
  for (const reason of decision.reasons) lines.push(`  - ${reason}`);
  for (const note of decision.notes || []) lines.push(`  * ${note}`);
  if (decision.verdict === "does_not_support_b") anyFail = true;
  if (decision.verdict === "incomplete") anyIncomplete = true;

  lines.push("");
  lines.push("Caution: gates are decision rules over founder marks, not statistical");
  lines.push("proof. Semantic checks (naturalness, grounding, coverage) remain human");
  lines.push("judgment; mechanical checks only assist. Counts and fallback provenance");
  lines.push("come from the run records listed above.");

  const out = lines.join("\n");
  process.stdout.write(`${out}\n`);
  process.exit(anyFail ? 1 : anyIncomplete ? 2 : 0);
}

main();
