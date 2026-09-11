#!/usr/bin/env node
/**
 * Builds review/data.js — the static data bundle for the standalone review
 * page. The page is opened from disk (file://), so it cannot fetch() sibling
 * files; this script embeds fixtures, instructions, and run records into one
 * classic script.
 *
 *   node experiments/buyer-decision-questions/review/build-data.mjs
 *   node experiments/buyer-decision-questions/review/build-data.mjs --results <dir>   # demo/testing
 *   node experiments/buyer-decision-questions/review/build-data.mjs --out <file>      # v2 snapshot bundle
 *
 * The generated review/data.js is gitignored (it contains raw provider
 * output). Run this again after every live run to refresh the review surface.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXPERIMENT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const DEFAULT_RESULTS = path.join(EXPERIMENT_ROOT, "results");
const DEFAULT_OUT = path.join(EXPERIMENT_ROOT, "review", "data.js");

function parseArgs(argv) {
  let resultsDir = DEFAULT_RESULTS;
  let outFile = DEFAULT_OUT;
  let instructionId = "condition-b-v1";
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--results") {
      resultsDir = argv[index + 1];
      if (!resultsDir) process.exit(2);
      index += 1;
    } else if (argv[index] === "--out") {
      outFile = argv[index + 1];
      if (!outFile) process.exit(2);
      index += 1;
    } else if (argv[index] === "--instruction") {
      instructionId = argv[index + 1];
      if (!instructionId) process.exit(2);
      index += 1;
    }
  }
  return { resultsDir, outFile, instructionId };
}

function readJson(file) {
  if (!existsSync(file)) throw new Error(`Missing file: ${file}`);
  return JSON.parse(readFileSync(file, "utf8"));
}

function safeJs(value) {
  return JSON.stringify(value, null, 1).replace(/</g, "\\u003c");
}

function main() {
  const { resultsDir, outFile, instructionId } = parseArgs(process.argv.slice(2));
  const fixturesManifest = readJson(
    path.join(EXPERIMENT_ROOT, "fixtures", "manifest.json"),
  );
  const fixtures = fixturesManifest.fixtures.map((entry) => {
    const raw = readJson(path.join(EXPERIMENT_ROOT, "fixtures", entry.file));
    return {
      fixture_id: raw.fixture_id,
      role: raw.role,
      fictional: raw.fictional === true,
      version: raw.version,
      frozen_at: raw.frozen_at,
      sha256: entry.sha256,
      review_title: raw.review_title,
      review_summary: raw.review_summary,
      business_summary: raw.business_summary,
      absent_context: raw.absent_context,
      business: raw.business,
    };
  });

  const manifest = readJson(
    path.join(EXPERIMENT_ROOT, "instructions", "manifest.json"),
  );
  const instructionEntry = manifest.instructions.find(
    (item) => item.instruction_id === instructionId,
  ) ?? manifest.instructions[0];
  const instructionFile = path.join(
    EXPERIMENT_ROOT,
    "instructions",
    instructionEntry.file,
  );
  const instruction = readJson(instructionFile);
  const instructionSha256 = createHash("sha256")
    .update(readFileSync(instructionFile))
    .digest("hex");
  const aSnapshotPath = path.join(
    EXPERIMENT_ROOT,
    "instructions",
    "condition-a-snapshot.json",
  );
  const aSnapshot = existsSync(aSnapshotPath)
    ? readJson(aSnapshotPath)
    : null;

  const runs = [];
  if (existsSync(resultsDir)) {
    for (const file of readdirSync(resultsDir)) {
      if (!file.endsWith(".json") || file === "index.json") continue;
      runs.push(readJson(path.join(resultsDir, file)));
    }
  }
  runs.sort((left, right) => (left.run_id < right.run_id ? -1 : 1));

  const reviewMode = instructionId === "condition-b-v2" ? "b-v1-vs-b-v2" : "a-vs-b";
  const reviewPairs = reviewMode === "b-v1-vs-b-v2"
    ? fixtures.map((fixture) => {
        const candidates = runs
          .filter(
            (run) =>
              run.condition === "B" &&
              run.run_kind === "initial" &&
              run.fixture_id === fixture.fixture_id,
          )
          .sort((left, right) => (left.run_id < right.run_id ? -1 : 1));
        return {
          fixture_id: fixture.fixture_id,
          baseline: candidates.filter(
            (run) => run.instruction?.id === "condition-b-v1",
          ).at(-1) ?? null,
          candidate: candidates.filter(
            (run) => run.instruction?.id === "condition-b-v2",
          ).at(-1) ?? null,
        };
      })
    : [];

  const bundle = {
    schema: "nuave-bdq-review-data-v1",
    review_mode: reviewMode,
    review_pairs: reviewPairs,
    built_at: new Date().toISOString(),
    results_dir: resultsDir,
    fixture_role_note:
      "fixture-1-kopi-sudut is development material; its results are not unseen generalization. The two held-out fixtures are fictional.",
    fixtures,
    instruction_b: {
      version: instruction.version,
      frozen_at: instruction.frozen_at,
      sha256: instructionSha256,
      text: instruction.text,
    },
    condition_a_snapshot: aSnapshot
      ? {
          captured_at: aSnapshot.captured_at,
          writer_instruction_sha256: aSnapshot.writer_instruction_sha256,
          versions: aSnapshot.versions,
        }
      : null,
    runs,
  };

  const output = `/* Auto-generated by build-data.mjs — do not edit. */\nwindow.EXPERIMENT_DATA = ${safeJs(bundle)};\n`;
  writeFileSync(outFile, output, "utf8");
  process.stdout.write(
    `Wrote ${outFile} (${fixtures.length} fixtures, ${runs.length} run records, built ${bundle.built_at})\n`,
  );
}

main();
