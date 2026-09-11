/**
 * Buyer-decision question experiment — core configuration.
 *
 * Frozen, additive, offline-safe by default. Live generation happens only in
 * the explicit `live/*.live.spec.ts` runners and requires
 * EXPERIMENT_BDQ_LIVE=1 plus the existing OpenCode Go credential
 * (OPENCODEGO_API_KEY). Nothing here reads or writes secret values; the
 * credential variable name is recorded, never its value.
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import { AUDIT_MODEL } from "../../../src/lib/audit/telemetry";
import { OPENCODEGO_BASE_URL } from "../../../src/lib/audit/opencodego";
import { INDONESIAN_QUESTION_MAX_OUTPUT_TOKENS } from "../../../src/lib/audit/questions-id-provider";

/** Absolute root of this experiment (…/experiments/buyer-decision-questions). */
export const EXPERIMENT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export const RESULTS_DIR = path.join(EXPERIMENT_ROOT, "results");
export const FIXTURES_DIR = path.join(EXPERIMENT_ROOT, "fixtures");
export const INSTRUCTIONS_DIR = path.join(EXPERIMENT_ROOT, "instructions");

export const FIXTURES_MANIFEST_FILE = "manifest.json";
export const INSTRUCTIONS_MANIFEST_FILE = "manifest.json";

export const RUN_RECORD_SCHEMA = "nuave-bdq-run-record-v1";

export const RUN_KINDS = ["initial", "confirmation", "challenger"] as const;
export type RunKind = (typeof RUN_KINDS)[number];

export const CONDITIONS = ["A", "B"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const COVERAGE_VALUES = [
  "discover_options",
  "find_for_need",
  "evaluate_business",
  "compare_alternatives",
  "drawback_check",
] as const;
export type CoverageValue = (typeof COVERAGE_VALUES)[number];

/** Live-run guard: generation is only allowed when this env flag is "1". */
export const LIVE_ENV_FLAG = "EXPERIMENT_BDQ_LIVE";

/** Credential mechanism: the existing production OpenCode Go variable. */
export const OPENCODEGO_CREDENTIAL_VAR = "OPENCODEGO_API_KEY";

/** Request timeout, configurable so tests can shrink it. No retries ever. */
export const REQUEST_TIMEOUT_ENV = "EXPERIMENT_BDQ_TIMEOUT_MS";
export const DEFAULT_REQUEST_TIMEOUT_MS = 180_000;

/** Both conditions use the same model identifier (production Luna model). */
export const LUNA_MODEL = AUDIT_MODEL;

/** Challenger model default; may be overridden with EXPERIMENT_BDQ_TERRA_MODEL.
 * The returned model identifier is always recorded and must match the
 * requested one — the challenger never silently substitutes another model. */
export const TERRA_MODEL_DEFAULT = "gpt-5.6-terra";
export const TERRA_MODEL_ENV = "EXPERIMENT_BDQ_TERRA_MODEL";

/** Responses API endpoint used by both conditions (same as the live path). */
export const RESPONSES_ENDPOINT = `${OPENCODEGO_BASE_URL}/responses`;

export const B_STRUCTURED_OUTPUT_NAME = "nuave_buyer_decision_questions";

export const B_OUTPUT_MAX_TOKENS = INDONESIAN_QUESTION_MAX_OUTPUT_TOKENS;

/** B composition contract: six unnamed + four named requests. */
export const B_COMPOSITION = { unnamed: 6, named: 4 } as const;

/** Soft mechanical coverage floor over declared coverage tags. The declared
 * tags are hints only; human pass-2 judgment verifies real coverage. */
export const B_MIN_COVERAGE = {
  discover_options: 1,
  find_for_need: 1,
  evaluate_business: 1,
  compare_alternatives: 2,
  drawback_check: 1,
} as const;

export function requestTimeoutMs(): number {
  const raw = process.env[REQUEST_TIMEOUT_ENV]?.trim();
  if (!raw) return DEFAULT_REQUEST_TIMEOUT_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `${REQUEST_TIMEOUT_ENV} must be a positive number of milliseconds.`,
    );
  }
  return parsed;
}

/** The exact B output JSON schema (strict, closed vocabulary, minimal
 * metadata: one coverage tag per question plus limitation notes). */
export const B_OUTPUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          coverage: {
            type: "string",
            enum: [...COVERAGE_VALUES],
          },
          limitation: { type: "string" },
        },
        required: ["text", "coverage", "limitation"],
        additionalProperties: false,
      },
      minItems: 10,
      maxItems: 10,
    },
    limitations: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["questions", "limitations"],
  additionalProperties: false,
} as const;
