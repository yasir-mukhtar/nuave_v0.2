/**
 * Run-record model and persistence for the buyer-decision experiment.
 *
 * Records are written once per scheduled generation and are never overwritten
 * or silently regenerated: every rerun is an explicit new run id, and saving
 * to an existing run id throws. Raw provider output is kept before any
 * processing so validation and repairs can always be audited.
 */
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { IndonesianClassificationValue } from "../../../src/lib/audit/questions-id";
import {
  RESULTS_DIR,
  RUN_RECORD_SCHEMA,
  type Condition,
  type CoverageValue,
  type RunKind,
} from "./experiment-config";

export type BValidationRule =
  | "count"
  | "empty"
  | "length"
  | "duplicate"
  | "named_composition"
  | "coverage_tag"
  | "coverage_requirement";

export type BValidationIssue = {
  /** 1-based question index, or null for whole-pack issues. */
  index: number | null;
  rule: BValidationRule;
  message: string;
};

export type ProcessedQuestion = {
  /** 1-based position in the pack. */
  index: number;
  text: string;
  /** A: the suggested text before deterministic slot repair (same as text
   * when the slot was not repaired). */
  original_suggestion?: string;
  /** A: the canonical measurement slot metadata attached to the position. */
  slot?: {
    order: number;
    category: string;
    measurement_purpose: string;
  };
  /** Who produced the final text. */
  generated_by: "model" | "deterministic_slot_repair" | "deterministic_fallback";
  final_classification: IndonesianClassificationValue;
  /** B: declared primary coverage tag (hint only; human pass-2 verifies). */
  coverage?: CoverageValue;
  /** B: declared per-question limitation. */
  limitation?: string;
};

export type RawOutput =
  | { kind: "structured"; questions: string[] }
  | { kind: "b_structured"; questions: unknown[]; limitations: string[] }
  | { kind: "text"; text: string }
  | { kind: "none"; note: string };

export type ExperimentRunRecord = {
  schema: typeof RUN_RECORD_SCHEMA;
  run_id: string;
  run_kind: RunKind;
  condition: Condition;
  fixture_id: string;
  fixture_version: number;
  fixture_sha256: string;
  status: "completed" | "completed_with_deterministic_fallback" | "failed";
  failure_reason: string | null;
  started_at: string;
  completed_at: string;
  latency_ms: number;
  instruction: {
    id: string;
    version: string;
    sha256: string;
    text: string;
    /** "src-question-writer-v2-current" for A (the code at run time) or
     * "frozen-condition-b-v1" for B. */
    source: string;
    /** A only: hash of the frozen informational snapshot taken at experiment
     * freeze; non-null when it differs from the current instruction, so a
     * production drift after freeze is visible. */
    freeze_snapshot_sha256: string | null;
  };
  model: { requested: string; returned: string; response_id: string };
  provider: {
    name: "opencodego";
    endpoint: string;
    credential_var_name: string;
    system: string;
  };
  settings: {
    reasoning_effort: string;
    service_tier: string;
    max_output_tokens: number;
    text_verbosity: string;
    output_schema: string;
    timeout_ms: number;
    web_search_tools: false;
  };
  http: {
    calls_made: number;
    last_status: number | null;
    provider_error: string | null;
    timed_out: boolean;
  };
  input: { kind: "minimized_brief" | "buyer_brief"; payload: unknown };
  raw_output: RawOutput;
  output: {
    /** A: "model" | "parsed" | "fallback". B: "model". */
    source: string;
    warnings: string[];
    questions: ProcessedQuestion[];
    classification: { total: number; unnamed: number; named: number };
    valid: boolean;
    validation_issues: BValidationIssue[];
  };
  provenance_errors: string[];
  notes: string[];
};

function stamp(): string {
  const now = new Date();
  const pad = (value: number, width = 2) => String(value).padStart(width, "0");
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

export function newRunId(runKind: RunKind): string {
  const suffix = randomBytes(3).toString("hex");
  return `${runKind}-${stamp()}-${suffix}`;
}

/** Saves a run record; refuses to overwrite an existing record file. The
 * directory defaults to the experiment results dir and is injectable so
 * offline tests never write into real results. */
export function saveRunRecord(
  record: ExperimentRunRecord,
  directory: string = RESULTS_DIR,
): string {
  if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
  const filePath = path.join(directory, `${record.run_id}.json`);
  if (existsSync(filePath)) {
    throw new Error(
      `A run record already exists for run id ${record.run_id}. Reruns are explicit new runs; the existing result is never overwritten.`,
    );
  }
  writeFileSync(filePath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return filePath;
}

export function loadRunRecords(directory: string = RESULTS_DIR): ExperimentRunRecord[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((file) => file.endsWith(".json") && file !== "index.json")
    .sort()
    .map((file) => {
      const raw = JSON.parse(
        readFileSync(path.join(directory, file), "utf8"),
      ) as ExperimentRunRecord;
      return raw;
    });
}

export function recordFor(
  records: ExperimentRunRecord[],
  runKind: RunKind,
  condition: Condition,
  fixtureId: string,
): ExperimentRunRecord | null {
  return (
    records.find(
      (record) =>
        record.run_kind === runKind &&
        record.condition === condition &&
        record.fixture_id === fixtureId,
    ) ?? null
  );
}
