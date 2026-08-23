import {
  PRODUCTION_OBSERVATION_INSTRUCTION_VERSION,
  PRODUCTION_OBSERVATION_REQUESTED_MODEL,
  PRODUCTION_OBSERVATION_SYSTEM,
} from "../production-observation-method";
import type {
  AuditCallTelemetry,
  AuditObservation,
  AuditPrompt,
} from "../types";
import { fixtureCallTelemetry } from "./telemetry";

type ProtectedObservationOverrides = Partial<
  Omit<
    AuditObservation,
    "prompt_id" | "category" | "branded" | "question" | "telemetry"
  >
> & {
  telemetry?: AuditCallTelemetry[];
};

/**
 * Canonical TEST-ONLY protected observation.
 *
 * Identity always comes from the locked prompt. Callers may layer answer/source
 * content or deliberately override one protected field for an adversarial
 * regression. When telemetry is not supplied it is derived from the resulting
 * observation identity so a passing fixture proves one completed protected
 * observation attempt with an actual web-search execution.
 */
export function fixtureProtectedObservation(
  prompt: AuditPrompt,
  overrides: ProtectedObservationOverrides = {},
): AuditObservation {
  const responseId = overrides.response_id ?? `resp_${prompt.prompt_id}`;
  const requestedModel =
    overrides.requested_model ?? PRODUCTION_OBSERVATION_REQUESTED_MODEL;
  const returnedModel =
    overrides.returned_model ?? PRODUCTION_OBSERVATION_REQUESTED_MODEL;

  const observationWithoutTelemetry: Omit<AuditObservation, "telemetry"> = {
    prompt_id: prompt.prompt_id,
    category: prompt.category,
    branded: prompt.branded,
    question: prompt.question,
    instruction_version:
      overrides.instruction_version ??
      PRODUCTION_OBSERVATION_INSTRUCTION_VERSION,
    system: overrides.system ?? PRODUCTION_OBSERVATION_SYSTEM,
    requested_model: requestedModel,
    returned_model: returnedModel,
    response_id: responseId,
    observed_at: overrides.observed_at ?? "2026-08-23T00:00:00.000Z",
    raw_answer: overrides.raw_answer ?? `Usable answer for ${prompt.prompt_id}.`,
    sources: overrides.sources ?? [
      {
        url: `https://example.com/${prompt.prompt_id}`,
        title: "Fixture source",
      },
    ],
    run_status: overrides.run_status ?? "completed",
    failure_reason: overrides.failure_reason ?? "",
  };

  return {
    ...observationWithoutTelemetry,
    telemetry: overrides.telemetry ?? [
      fixtureCallTelemetry({
        stage: "observation",
        requested_model: requestedModel,
        returned_model: returnedModel,
        response_id: responseId,
        web_search_calls: 1,
      }),
    ],
  };
}

/** Build a gate-ready protected set while preserving only evidence content. */
export function fixtureProtectedObservationSet(
  prompts: AuditPrompt[],
  content: AuditObservation[] = [],
): AuditObservation[] {
  return prompts.map((prompt, index) => {
    const prior = content[index];
    return fixtureProtectedObservation(prompt, {
      observed_at: prior?.observed_at,
      raw_answer:
        prior?.raw_answer ||
        "Local advisers differ by focus: some handle logistics, others readiness reviews.",
      sources: prior?.sources?.length
        ? prior.sources
        : [
            {
              url: `https://example.com/${prompt.prompt_id}`,
              title: "Fixture source",
            },
          ],
    });
  });
}
