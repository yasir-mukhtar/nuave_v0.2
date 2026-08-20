/**
 * Spec 003 R-22 — Variance measurement.
 *
 * After the main 10/10 run completes, 2–3 designated questions are re-asked
 * separately, one independent observation each, under the same locked method.
 * Repeats are recorded as variance measurement only: they never change the
 * reported count, any denominator, any finding, or any action, and they are
 * not shown as additional observations in the test-by-test rows.
 *
 * Implementation notes:
 * - This module is pure logic. The HTTP route (`/api/audit/variance`) owns
 *   the provider call and budget guard; this module owns the shape and the
 *   separation invariant.
 * - A variance record is keyed to the originating run (safety_identifier +
 *   report response id or similar) and stores only its own observations with
 *   full per-attempt telemetry (R-20). It is never fed into
 *   `buildAuditReport`, `makeEvidenceExport`, counts, denominators, findings,
 *   or actions.
 * - The failure matrix's "Variance re-ask fails" row: main run unchanged,
 *   variance record marked incomplete, quality-gate review notes it.
 */

import type { AuditObservation } from "./types";

export const VARIANCE_STORAGE_KEY = "nuave.audit.variance.v1";

export const VARIANCE_MIN_QUESTIONS = 2;
export const VARIANCE_MAX_QUESTIONS = 3;

export type VarianceRecord = {
  /** Key to the originating run. The producer sets this; consumers treat it as opaque. */
  run_key: string;
  created_at: string;
  /** The designated prompt ids that were re-asked (2–3). */
  prompt_ids: string[];
  /** One observation per designated prompt, with full per-attempt telemetry (R-20). May contain failed entries. */
  observations: AuditObservation[];
  /** Whether the variance set is complete (all designated questions got an observation) */
  complete: boolean;
  /** Human-readable note when complete is false (e.g. provider failure, budget ceiling). */
  incomplete_reason?: string;
};

export function validateVarianceRequest(input: {
  prompt_ids: string[];
}): string[] {
  const errors: string[] = [];
  if (
    input.prompt_ids.length < VARIANCE_MIN_QUESTIONS ||
    input.prompt_ids.length > VARIANCE_MAX_QUESTIONS
  ) {
    errors.push(
      `Variance re-ask requires ${VARIANCE_MIN_QUESTIONS}–${VARIANCE_MAX_QUESTIONS} designated questions; received ${input.prompt_ids.length}.`,
    );
  }
  if (new Set(input.prompt_ids).size !== input.prompt_ids.length) {
    errors.push("Variance prompt_ids must be unique.");
  }
  return errors;
}

export function createVarianceRecord(input: {
  run_key: string;
  prompt_ids: string[];
  observations: AuditObservation[];
  incomplete_reason?: string;
}): VarianceRecord {
  const validation = validateVarianceRequest({ prompt_ids: input.prompt_ids });
  if (validation.length) {
    throw new Error(validation.join(" "));
  }
  // The observations must correspond 1:1 to the designated prompt_ids; extra or
  // missing observations would be a blending risk (never feed into counts).
  const observedIds = new Set(input.observations.map((o) => o.prompt_id));
  const missing = input.prompt_ids.filter((id) => !observedIds.has(id));
  const extra = [...observedIds].filter((id) => !input.prompt_ids.includes(id));
  if (missing.length || extra.length) {
    throw new Error(
      `Variance observations must match the designated prompt_ids exactly. Missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"}.`,
    );
  }
  const complete =
    input.observations.length === input.prompt_ids.length &&
    input.observations.every((o) => o.telemetry.length > 0) &&
    !input.incomplete_reason;

  return {
    run_key: input.run_key,
    created_at: new Date().toISOString(),
    prompt_ids: [...input.prompt_ids],
    observations: [...input.observations],
    complete,
    ...(input.incomplete_reason
      ? { incomplete_reason: input.incomplete_reason }
      : {}),
  };
}

/**
 * Separation invariant check: a variance record must never be used as the
 * main observation set for report generation. This helper asserts that the
 * variance prompt_ids are not being counted toward the 10/10 gate.
 *
 * It is a pure check; the report pipeline itself never accepts a variance
 * record — this exists for tests and for the quality-gate review to assert
 * the invariant explicitly.
 */
export function assertVarianceNotBlended(input: {
  mainObservations: AuditObservation[];
  variance: VarianceRecord;
}): void {
  // Blending is when variance observations are concatenated onto the main set
  // (11+ entries) or fed into measures. Duplicate prompt_id is expected —
  // variance re-asks the SAME prompt_ids by definition — so length is the
  // invariant, not id overlap.
  if (input.mainObservations.length > 10) {
    throw new Error(
      "Variance observations must never be blended into the main 10/10 observation set.",
    );
  }
}
