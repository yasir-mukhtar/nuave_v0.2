#!/usr/bin/env node
/**
 * Builds the calibration record for the buyer-decision experiment.
 *
 * The founder and the earlier AI review are stored separately in
 * experiments/buyer-decision-questions/evidence/ and are NEVER averaged or
 * merged. This script matches each reviewed question by (run_id, question
 * index) against the immutable run records in results/, then emits:
 *
 *   evidence/calibration.json  — machine-readable rows
 *   evidence/calibration.md    — human-readable table
 *
 * Usage:
 *   node experiments/buyer-decision-questions/review/build-calibration.mjs
 *   node ... --results <dir> --founder <file> --ai <file>
 *
 * The four founder-reviewed packs and their run ids (as of the 2026-09-06
 * review round):
 *   Kopi Sudut A (initial):            initial-20260906-223719-8b7d69
 *   Kopi Sudut B (initial):            initial-20260906-223724-3348d1
 *   Coffee confirmation B (held-out):  confirmation-20260906-223854-5e825a
 *   Laundry confirmation B (held-out): confirmation-20260906-223902-fe3597
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXPERIMENT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const DEFAULT_RESULTS = path.join(EXPERIMENT_ROOT, "results");
const DEFAULT_FOUNDER = path.join(
  EXPERIMENT_ROOT,
  "evidence",
  "founder-review-2026-09-06.json",
);
const DEFAULT_AI = path.join(
  EXPERIMENT_ROOT,
  "evidence",
  "ai-review-2026-09-06.json",
);

const PACKS = [
  { key: "kopi-sudut-a", label: "Kopi Sudut · A (initial, ten questions)", fixtureId: "fixture-1-kopi-sudut", runId: "initial-20260906-223719-8b7d69" },
  { key: "kopi-sudut-b", label: "Kopi Sudut · B (initial, questions 1–9; Q10 unreviewed)", fixtureId: "fixture-1-kopi-sudut", runId: "initial-20260906-223724-3348d1" },
  { key: "coffee-confirmation-b", label: "Coffee held-out · B confirmation (ten questions)", fixtureId: "fixture-2-kopi-bukit-biru", runId: "confirmation-20260906-223854-5e825a" },
  { key: "laundry-confirmation-b", label: "Laundry held-out · B confirmation (ten questions)", fixtureId: "fixture-3-laundry-segar-kilat", runId: "confirmation-20260906-223902-fe3597" },
];

function parseArgs(argv) {
  let resultsDir = DEFAULT_RESULTS;
  let founder = DEFAULT_FOUNDER;
  let ai = DEFAULT_AI;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--results") resultsDir = argv[++index];
    else if (arg === "--founder") founder = argv[++index];
    else if (arg === "--ai") ai = argv[++index];
  }
  return { resultsDir, founder, ai };
}

function readJson(file, label) {
  if (!existsSync(file)) {
    throw new Error(`Missing ${label}: ${file}`);
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

/** Flatten an export (comparison{a,b} + extra_b_packs) into
 * { runId -> { packKey, marks: [{question_index, mark, replace_reason, note}], pass2 } } */
function flattenReview(review, reviewerLabel) {
  const out = new Map();
  const addRun = (runId, runIdByCondition, marks, pass2) => {
    const existing = out.get(runId) || { runId, marks: [], pass2: null, reviewer: reviewerLabel };
    existing.marks.push(...marks);
    existing.pass2 = pass2 || existing.pass2;
    out.set(runId, existing);
  };
  for (const fixtureReview of Object.values(review.comparison || {})) {
    const runIds = fixtureReview.run_ids || {};
    for (const condition of ["a", "b"]) {
      const pack = fixtureReview[condition];
      if (!pack) continue;
      addRun(pack.run_id, runIds[condition.toUpperCase()], pack.marks || [], pack.pass2 || null);
    }
  }
  for (const pack of review.extra_b_packs || []) {
    addRun(pack.run_id, null, pack.marks || [], pack.pass2 || null);
  }
  return out;
}

/** Both reviewers key marks by print index (1..10) of the ORIGINAL record,
 * which is what "question_index" means in the exports and what the review
 * surface displays as #N. Question N in the record output.questions[N-1]. */
function questionTextAt(record, index) {
  const questions = (record && record.output && record.output.questions) || [];
  const q = questions[index - 1];
  return q ? q.text : null;
}

const KNOWN_SEMANTIC_CASES = [
  { match: (packKey, text) => /dekat kantor/i.test(text) && /WFC|cocok buat/i.test(text), note: "\"dekat kantor\" still needs an office area; \"cocok buat WFC\" adds a scenario absent from the sparse brief." },
  { match: (packKey, text) => /vs Starbucks/i.test(text), note: "Introduces a comparator and changes an unnamed question into a named one — cannot replace B Q5 under the 6/4 allocation." },
  { match: (packKey, text) => /manual brew/i.test(text), note: "Turns a comparative work-fit question into a taste question (different measurement)." },
  { match: (packKey, text) => /Berapa biaya Laundry Segar Kilat/i.test(text), note: "Removes the hidden-fee subquestion from the original." },
  { match: (packKey, text) => /laundry ini/i.test(text), note: "\"laundry ini\" needs a named referent to work as a standalone request." },
  { match: (packKey, text) => /rumah\/kosan|kosan/i.test(text), note: "Pickup/delivery to boarding house adds geography the fixture does not confirm." },
].map((entry) => ({ ...entry, label: entry.note }));

function semanticFlags(packKey, text) {
  if (!text) return [];
  return KNOWN_SEMANTIC_CASES.filter((entry) => entry.match(packKey, text)).map((entry) => entry.note);
}

/** Reasonable disagreement hypotheses, labeled as AI-side inference and
 * grounded in the reviewer notes where possible. Never stated by the founder. */
function disagreementReason(founderMark, aiMark) {
  if (founderMark === aiMark) return "Agree";
  if (!founderMark || !aiMark) return "Only one reviewer marked this question.";
  if (founderMark === "keep" && aiMark === "replace") {
    return "Founder kept it; AI judged it substantially revision-worthy (AI tendency: strict on scope/wording).";
  }
  if (founderMark === "replace" && aiMark === "keep") {
    return "AI called it plausible as an audit question; founder judged it unlike what a customer would type or asking for the wrong decision.";
  }
  if (founderMark === "replace" && aiMark === "light") {
    return "Founder wanted a real rewrite; AI saw a small edit. Founder's standard — \"would a customer type this unchanged?\" — is stricter than AI's plausibility standard.";
  }
  if (founderMark === "light" && aiMark === "keep") {
    return "AI considered it already customer-like; founder wanted a wording/context trim.";
  }
  if (founderMark === "light" && aiMark === "replace") {
    return "Founder kept the decision and asked for a small edit; AI wanted a larger revision.";
  }
  if (founderMark === "keep" && aiMark === "light") {
    return "Founder accepted as-is; AI suggested a small polish (example: the multi-criteria WiFi/outlet/quiet/price request).";
  }
  return `Founder ${founderMark} vs AI ${aiMark}.`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const founderRaw = readJson(args.founder, "founder review");
  const aiRaw = readJson(args.ai, "AI review");
  const founder = flattenReview(founderRaw, "founder");
  const ai = flattenReview(aiRaw, "ai");

  const unknownRuns = [];
  const rows = [];
  for (const pack of PACKS) {
    const recordPath = path.join(args.resultsDir, `${pack.runId}.json`);
    const record = existsSync(recordPath) ? readJson(recordPath, `run record ${pack.runId}`) : null;
    if (!record) unknownRuns.push(pack.runId);

    const founderPack = founder.get(pack.runId);
    const aiPack = ai.get(pack.runId);
    const founderByIndex = new Map((founderPack?.marks || []).map((m) => [Number(m.question_index), m]));
    const aiByIndex = new Map((aiPack?.marks || []).map((m) => [Number(m.question_index), m]));

    for (let index = 1; index <= 10; index += 1) {
      const f = founderByIndex.get(index);
      const a = aiByIndex.get(index);
      if (!f && !a) continue;
      const text = questionTextAt(record, index);
      rows.push({
        pack: pack.key,
        pack_label: pack.label,
        fixture_id: pack.fixtureId,
        run_id: pack.runId,
        question_index: index,
        question_text: text,
        founder_mark: f?.mark ?? null,
        founder_note: f?.note ?? null,
        founder_replace_reason: f?.replace_reason ?? null,
        ai_mark: a?.mark ?? null,
        ai_note: a?.note ?? null,
        ai_replace_reason: a?.replace_reason ?? null,
        disagreement: disagreementReason(f?.mark, a?.mark),
        disagreement_is_inference: f?.mark !== a?.mark,
        semantic_flags: semanticFlags(pack.key, f?.note ?? a?.note ?? text),
        notes: [],
      });
    }
  }

  const reviewerName = (raw) => {
    const value = raw?.reviewer;
    if (value === null || value === undefined) return null;
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      return value.name || value.role || value.kind || "unknown";
    }
    return String(value);
  };
  const founderPerson = reviewerName(founderRaw) || "founder";
  const aiPerson = reviewerName(aiRaw) || "ai";
  const calibration = {
    schema: "nuave-bdq-calibration-v1",
    built_at: new Date().toISOString(),
    sources: {
      founder_review: {
        file: path.basename(args.founder),
        reviewer: founderPerson,
        exported_at: founderRaw.exported_at || null,
      },
      ai_review: {
        file: path.basename(args.ai),
        reviewer: aiPerson,
        exported_at: aiRaw.exported_at || null,
      },
      run_records: args.resultsDir,
      note: "Reviews are stored separately and never averaged. AI marks are an AI judgment, not founder acceptance. Disagreement reasons are inferred from the two reviews, not stated by the founder.",
    },
    packs: PACKS.map((pack) => pack.key),
    reviewed_question_count: rows.filter((row) => row.founder_mark).length,
    rows,
    missing_run_records: unknownRuns,
  };
  writeFileSync(
    path.join(EXPERIMENT_ROOT, "evidence", "calibration.json"),
    JSON.stringify(calibration, null, 2) + "\n",
  );

  // Human-readable markdown
  const md = [];
  md.push("# Buyer-decision question experiment — calibration record (2026-09-06)");
  md.push("");
  md.push(`Founder: **${founderPerson}** · AI: **${aiPerson}** · run records: \`${args.resultsDir}\``);
  md.push("");
  md.push("Reviews are kept **separate** — never averaged, AI marks never substitute for founder acceptance.");
  md.push("Alignment is by `(run_id, question index)` (index = print index #N of the original pack).");
  md.push("");
  md.push(`Founder-reviewed questions: **${calibration.reviewed_question_count}**.`);
  if (unknownRuns.length) {
    md.push("");
    md.push(`⚠ Missing run records (rows below show question text as \`[record missing]\`): ${unknownRuns.join(", ")}`);
  }
  md.push("");
  md.push("| Pack | # | Question (original) | Founder | AI | Notes (founder → AI) | Flag |");
  md.push("|---|---|---|---|---|---|---|");
  for (const row of rows) {
    const text = row.question_text || "[record missing]";
    const fNote = row.founder_note ? ` → ${row.founder_note}` : "";
    const aNote = row.ai_note ? ` → ${row.ai_note}` : "";
    const flag = row.semantic_flags.length
      ? row.semantic_flags.join("; ")
      : row.founder_mark !== row.ai_mark
        ? "disagreement (AI-side inference)"
        : "";
    const esc = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
    md.push(`| ${row.pack} | ${row.question_index} | ${esc(text)} | ${row.founder_mark ?? "—"} | ${row.ai_mark ?? "—"} | ${esc(fNote)} ${esc(aNote)} | ${esc(flag)} |`);
  }
  md.push("");
  md.push("## Pack-level counts (same reviewed questions only)");
  md.push("");
  md.push("| Pack | Founder Keep/Light/Replace | AI Keep/Light/Replace |");
  md.push("|---|---|---|");
  for (const pack of PACKS) {
    // Counts must cover the SAME reviewed questions: only rows the founder
    // actually marked (cf. Kopi Sudut B Q10 was reviewed by AI only).
    const packRows = rows.filter((row) => row.pack === pack.key && row.founder_mark);
    const count = (marker, reviewer) => packRows.filter((row) => row[`${reviewer}_mark`] === marker).length;
    md.push(
      `| ${pack.label} | ${count("keep", "founder")} / ${count("light", "founder")} / ${count("replace", "founder")} | ${count("keep", "ai")} / ${count("light", "ai")} / ${count("replace", "ai")} |`,
    );
  }
  md.push("");
  md.push("## Semantic-change flags on founder-suggested rewrites");
  md.push("");
  md.push("- \u201cDekat kantor\u201d still needs an office area; \u201cKopi Sudut cocok buat WFC ngga?\u201d adds a scenario absent from the sparse Kopi Sudut brief.");
  md.push("- \u201cBandingin Kopi Sudut vs Starbucks di Depok\u201d introduces a comparator and changes an unnamed question into a named one — cannot replace B Q5 under the 6/4 allocation.");
  md.push("- \u201cManual brew Kopi Bukit Biru enak ngga?\u201d changes a comparative work-fit question into a taste question.");
  md.push("- \u201cBerapa biaya Laundry Segar Kilat?\u201d removes the hidden-fee subquestion.");
  md.push("- \u201cLaundry ini\u201d requires a named referent.");
  md.push("- \u201cPickup/delivery ke rumah/kosan\u201d should not introduce boarding-house geography as a new confirmed fact.");
  md.push("");
  md.push("Some edits labeled Light also remove criteria or broaden categories. The label is preserved as recorded; flags above are separate semantic-change notices, not reinterpretations of the label.");
  md.push("");
  writeFileSync(path.join(EXPERIMENT_ROOT, "evidence", "calibration.md"), md.join("\n"));

  process.stdout.write(
    `Wrote calibration (${rows.length} rows, ${calibration.reviewed_question_count} founder-reviewed, ${unknownRuns.length} missing run records)\n`,
  );
}

main();