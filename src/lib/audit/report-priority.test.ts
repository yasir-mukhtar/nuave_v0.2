import { describe, expect, it, vi } from "vitest";
import { validateReportContent } from "./contracts";
import {
  goldenBrief,
  goldenObservations,
  goldenPrompts,
  goldenReportContent,
} from "./fixtures/report-golden";
import { fixtureBudget, fixtureCallTelemetry } from "./fixtures/telemetry";
import {
  createValidatedAuditReport,
  ReportPipelineError,
  type ReportGenerator,
} from "./report-pipeline";
import { sanitizeUnsupportedReportPriorities } from "./report-priority";
import {
  PRODUCTION_OBSERVATION_REQUESTED_MODEL,
  PRODUCTION_OBSERVATION_SYSTEM,
} from "./production-observation-method";
import type { AuditObservation, ReportContent } from "./types";

const POSITIVE_ONLY_PROMPT_ID = goldenPrompts[6].prompt_id;

function completeGoldenObservations(): AuditObservation[] {
  return goldenObservations.map((observation, index) => ({
    ...observation,
    system: PRODUCTION_OBSERVATION_SYSTEM,
    requested_model: PRODUCTION_OBSERVATION_REQUESTED_MODEL,
    ...(index === 4
      ? {
          run_status: "completed" as const,
          raw_answer:
            "Local advisers differ by focus: some handle logistics, others readiness reviews.",
          failure_reason: "",
          sources: [
            {
              url: "https://northstar.example/evidence-5",
              title: "Fictional source 5",
            },
          ],
        }
      : {}),
    telemetry: observation.telemetry.length
      ? observation.telemetry
      : [
          fixtureCallTelemetry({
            stage: "observation",
            requested_model: PRODUCTION_OBSERVATION_REQUESTED_MODEL,
            returned_model: observation.returned_model,
            response_id: observation.response_id,
          }),
        ],
  }));
}

function reportResult(content: ReportContent) {
  return {
    content,
    requested_model: "fixture-requested-model",
    returned_model: "fixture-returned-model",
    response_id: "response-priority-test",
    telemetry: [fixtureCallTelemetry({ response_id: "response-priority-test" })],
  };
}

describe("unsupported report priority containment", () => {
  it("leaves a supported priority untouched", () => {
    const original = goldenReportContent();
    const result = sanitizeUnsupportedReportPriorities(
      original,
      goldenObservations,
      goldenBrief,
    );

    expect(result.removed_orders).toEqual([]);
    expect(result.content.priorities).toEqual(original.priorities);
  });

  it("removes multiple unsupported priorities and renumbers survivors", () => {
    const draft = goldenReportContent();
    draft.priorities[0].evidence_prompt_ids = [POSITIVE_ONLY_PROMPT_ID];
    draft.priorities[2].evidence_prompt_ids = [POSITIVE_ONLY_PROMPT_ID];

    const result = sanitizeUnsupportedReportPriorities(
      draft,
      goldenObservations,
      goldenBrief,
    );

    expect(result.removed_orders).toEqual([1, 3]);
    expect(result.content.priorities).toHaveLength(1);
    expect(result.content.priorities[0]).toEqual({
      ...draft.priorities[1],
      order: 1,
    });
  });

  it("never delivers a positive-only corrective priority", () => {
    const draft = goldenReportContent();
    draft.priorities[0].evidence_prompt_ids = [POSITIVE_ONLY_PROMPT_ID];

    const result = sanitizeUnsupportedReportPriorities(
      draft,
      goldenObservations,
      goldenBrief,
    );

    expect(
      result.content.priorities.some((priority) =>
        priority.evidence_prompt_ids.includes(POSITIVE_ONLY_PROMPT_ID),
      ),
    ).toBe(false);
  });

  it("does not silently repair an unknown evidence ID", () => {
    const draft = goldenReportContent();
    draft.priorities[0].evidence_prompt_ids = ["UNKNOWN-PROMPT-ID"];

    const result = sanitizeUnsupportedReportPriorities(
      draft,
      goldenObservations,
      goldenBrief,
    );

    expect(result.content.priorities[0].evidence_prompt_ids).toEqual([
      "UNKNOWN-PROMPT-ID",
    ]);
    expect(
      validateReportContent(result.content, goldenObservations, goldenBrief),
    ).toContain("Priority references an unknown question: UNKNOWN-PROMPT-ID.");
  });

  it("does not mutate result classifications or retained observations", () => {
    const draft = goldenReportContent();
    draft.priorities[0].evidence_prompt_ids = [POSITIVE_ONLY_PROMPT_ID];
    const dimensionsBefore = draft.details.map((detail) => ({
      prompt_id: detail.prompt_id,
      recommendation: detail.recommendation,
      comparison: detail.comparison,
      information: detail.information,
    }));
    const observationsBefore = structuredClone(goldenObservations);

    const result = sanitizeUnsupportedReportPriorities(
      draft,
      goldenObservations,
      goldenBrief,
    );

    expect(
      result.content.details.map((detail) => ({
        prompt_id: detail.prompt_id,
        recommendation: detail.recommendation,
        comparison: detail.comparison,
        information: detail.information,
      })),
    ).toEqual(dimensionsBefore);
    expect(goldenObservations).toEqual(observationsBefore);
  });

  it("returns a typed integrity failure with zero extra provider calls when no priorities survive", async () => {
    const observations = completeGoldenObservations();
    const draft = goldenReportContent();
    draft.priorities.forEach((priority) => {
      priority.evidence_prompt_ids = [POSITIVE_ONLY_PROMPT_ID];
    });
    const generate = vi.fn(async () => reportResult(draft)) as unknown as ReportGenerator;

    await expect(
      createValidatedAuditReport(
        {
          brief: goldenBrief,
          prompts: goldenPrompts,
          observations,
          safety_identifier: "fixture-user-123",
          budget: fixtureBudget,
        },
        generate,
      ),
    ).rejects.toMatchObject<Partial<ReportPipelineError>>({
      code: "REPORT_INTEGRITY_FAILURE",
      status: 422,
    });
    expect(generate).toHaveBeenCalledTimes(1);
  });
});
