import {
  OPENCODEGO_AUDIT_MODEL,
  OPENCODEGO_SYSTEM,
} from "./opencodego";
import type { AuditObservation } from "./types";

/**
 * Spec 003 production observation lock. `returned_model` is deliberately not
 * pinned to the requested model because the provider may return a canonical or
 * versioned identifier. We preserve that exact provenance and only require it
 * to agree with the completed observation telemetry.
 */
export const PRODUCTION_OBSERVATION_SYSTEM = OPENCODEGO_SYSTEM;
export const PRODUCTION_OBSERVATION_REQUESTED_MODEL = OPENCODEGO_AUDIT_MODEL;

export function productionObservationMethodErrors(
  observations: AuditObservation[],
): string[] {
  const errors: string[] = [];

  for (const observation of observations) {
    if (observation.system !== PRODUCTION_OBSERVATION_SYSTEM) {
      errors.push(
        `${observation.prompt_id}: observation system must be ${PRODUCTION_OBSERVATION_SYSTEM}; received ${observation.system}.`,
      );
    }

    if (
      observation.requested_model !== PRODUCTION_OBSERVATION_REQUESTED_MODEL
    ) {
      errors.push(
        `${observation.prompt_id}: requested observation model must be ${PRODUCTION_OBSERVATION_REQUESTED_MODEL}; received ${observation.requested_model}.`,
      );
    }

    const observationCalls = observation.telemetry.filter(
      (call) => call.stage === "observation",
    );
    for (const call of observationCalls) {
      if (call.requested_model !== PRODUCTION_OBSERVATION_REQUESTED_MODEL) {
        errors.push(
          `${observation.prompt_id}: observation telemetry requested model must be ${PRODUCTION_OBSERVATION_REQUESTED_MODEL}; received ${call.requested_model}.`,
        );
      }
    }

    if (observation.run_status === "completed") {
      if (!observation.returned_model.trim()) {
        errors.push(
          `${observation.prompt_id}: completed observation is missing returned-model provenance.`,
        );
      }

      const completedCalls = observationCalls.filter(
        (call) => call.status === "completed",
      );
      for (const call of completedCalls) {
        if (call.returned_model !== observation.returned_model) {
          errors.push(
            `${observation.prompt_id}: returned-model provenance does not match its completed observation telemetry.`,
          );
        }
      }
    }
  }

  return errors;
}
