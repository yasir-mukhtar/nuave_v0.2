import { DEFAULT_OBSERVATION_INSTRUCTION_VERSION } from "./contracts";
import { OPENCODEGO_AUDIT_MODEL, OPENCODEGO_SYSTEM } from "./opencodego";
import type { AuditObservation } from "./types";

export const PRODUCTION_OBSERVATION_SYSTEM = OPENCODEGO_SYSTEM;
export const PRODUCTION_OBSERVATION_REQUESTED_MODEL = OPENCODEGO_AUDIT_MODEL;
export const PRODUCTION_OBSERVATION_INSTRUCTION_VERSION =
  DEFAULT_OBSERVATION_INSTRUCTION_VERSION;

function prefix(observation: AuditObservation, message: string) {
  return `${observation.prompt_id}: ${message}`;
}

/**
 * Positive protected-attempt invariant.
 *
 * A completed observation is accepted only when it positively contains an
 * actual successful observation-stage attempt under the locked production
 * method. The validator never treats the absence of a bad call as proof of a
 * good call.
 */
export function protectedObservationAttemptErrors(
  observation: AuditObservation,
): string[] {
  const errors: string[] = [];

  if (observation.system !== PRODUCTION_OBSERVATION_SYSTEM) {
    errors.push(
      prefix(
        observation,
        `recorded system ${observation.system}; expected ${PRODUCTION_OBSERVATION_SYSTEM}.`,
      ),
    );
  }
  if (
    observation.requested_model !== PRODUCTION_OBSERVATION_REQUESTED_MODEL
  ) {
    errors.push(
      prefix(
        observation,
        `requested model ${observation.requested_model}; expected ${PRODUCTION_OBSERVATION_REQUESTED_MODEL}.`,
      ),
    );
  }

  if (observation.run_status !== "completed") return errors;

  if (
    observation.instruction_version !==
    PRODUCTION_OBSERVATION_INSTRUCTION_VERSION
  ) {
    errors.push(
      prefix(
        observation,
        `instruction version ${observation.instruction_version || "missing"}; expected ${PRODUCTION_OBSERVATION_INSTRUCTION_VERSION}.`,
      ),
    );
  }
  if (!observation.raw_answer.trim()) {
    errors.push(
      prefix(observation, "completed observation has no usable answer."),
    );
  }
  if (!observation.response_id.trim()) {
    errors.push(
      prefix(observation, "completed observation is missing response_id."),
    );
  }
  if (
    observation.returned_model !== PRODUCTION_OBSERVATION_REQUESTED_MODEL
  ) {
    errors.push(
      prefix(
        observation,
        `returned model ${observation.returned_model || "missing"}; expected ${PRODUCTION_OBSERVATION_REQUESTED_MODEL}.`,
      ),
    );
  }

  const completedObservationCalls = observation.telemetry.filter(
    (call) => call.stage === "observation" && call.status === "completed",
  );
  const matchingAttempts = completedObservationCalls.filter(
    (call) =>
      call.requested_model === PRODUCTION_OBSERVATION_REQUESTED_MODEL &&
      call.returned_model === observation.returned_model &&
      Boolean(call.response_id) &&
      call.response_id === observation.response_id &&
      call.web_search_calls > 0,
  );

  if (completedObservationCalls.length === 0) {
    errors.push(
      prefix(
        observation,
        "has no completed observation-stage provider attempt.",
      ),
    );
  }
  if (matchingAttempts.length === 0) {
    errors.push(
      prefix(
        observation,
        "has no completed protected attempt matching model, response_id, and an actual web_search_call.",
      ),
    );
  }
  if (matchingAttempts.length > 1) {
    errors.push(
      prefix(
        observation,
        "contains duplicate completed protected attempts for the accepted response.",
      ),
    );
  }

  for (const call of completedObservationCalls) {
    if (call.requested_model !== PRODUCTION_OBSERVATION_REQUESTED_MODEL) {
      errors.push(
        prefix(
          observation,
          `completed observation telemetry requested ${call.requested_model}; expected ${PRODUCTION_OBSERVATION_REQUESTED_MODEL}.`,
        ),
      );
    }
    if (call.returned_model !== observation.returned_model) {
      errors.push(
        prefix(
          observation,
          "completed observation telemetry returned_model does not match the accepted observation.",
        ),
      );
    }
    if (call.response_id !== observation.response_id) {
      errors.push(
        prefix(
          observation,
          "completed observation telemetry response_id does not match the accepted observation.",
        ),
      );
    }
    if (call.web_search_calls < 1) {
      errors.push(
        prefix(
          observation,
          "completed observation telemetry records zero actual web_search_call executions.",
        ),
      );
    }
  }

  return errors;
}

export function productionObservationMethodErrors(
  observations: AuditObservation[],
): string[] {
  const errors = observations.flatMap(protectedObservationAttemptErrors);
  const responseOwners = new Map<string, string>();

  for (const observation of observations) {
    if (observation.run_status !== "completed" || !observation.response_id) {
      continue;
    }
    const prior = responseOwners.get(observation.response_id);
    if (prior && prior !== observation.prompt_id) {
      errors.push(
        `${observation.prompt_id}: accepted response_id ${observation.response_id} is already bound to ${prior}.`,
      );
    } else {
      responseOwners.set(observation.response_id, observation.prompt_id);
    }
  }

  return errors;
}
