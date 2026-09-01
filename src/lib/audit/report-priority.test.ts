import { describe, expect, it, vi } from "vitest";
import {
  goldenBrief,
  goldenObservations,
  goldenPrompts,
  goldenReportContent,
} from "./fixtures/report-golden";
import { fixtureProtectedObservationSet } from "./fixtures/protected-observation";
import { fixtureBudget, fixtureCallTelemetry } from "./fixtures/telemetry";
import {
  createValidatedAuditReport,
  type ReportGenerator,
} from "./report-pipeline";
import { sanitizeUnsupportedReportPriorities } from "./report-priority";
import type { ReportContent } from "./types";

const POSITIVE_ONLY_PROMPT_ID = goldenPrompts[6].prompt_id;
const NORTHSTAR_HISTORICAL_FIXTURE_ID = "northstar-report-golden-v1" as const;

function completeGoldenObservations() {
  return fixtureProtectedObservationSet(goldenPrompts, goldenObservations);
}

function reportResult(content: ReportContent) {
  return {
    content,
    requested_model: "fixture-requested-model",
    returned_model: "fixture-returned-model",
    response_id: "response-priority-test",
    telemetry: [
      fixtureCallTelemetry({ response_id: "response-priority-test" }),
    ],
  };
}

describe("unsupported report priority containment", () => {
  it("leaves a supported priority untouched", () => {
    const original = goldenReportContent();
    const result = sanitizeUnsupportedReportPriorities(
      original,
      goldenObservations,
      goldenBrief,
      NORTHSTAR_HISTORICAL_FIXTURE_ID,
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
      NORTHSTAR_HISTORICAL_FIXTURE_ID,
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
      NORTHSTAR_HISTORICAL_FIXTURE_ID,
    );

    expect(
      result.content.priorities.some((priority) =>
        priority.evidence_prompt_ids.includes(POSITIVE_ONLY_PROMPT_ID),
      ),
    ).toBe(false);
  });

  it("drops a priority with an unknown evidence ID", () => {
    const draft = goldenReportContent();
    draft.priorities[0].evidence_prompt_ids = ["UNKNOWN-PROMPT-ID"];

    const result = sanitizeUnsupportedReportPriorities(
      draft,
      goldenObservations,
      goldenBrief,
      NORTHSTAR_HISTORICAL_FIXTURE_ID,
    );

    expect(result.removed_orders).toEqual([1]);
    expect(
      result.content.priorities.some((priority) =>
        priority.evidence_prompt_ids.includes("UNKNOWN-PROMPT-ID"),
      ),
    ).toBe(false);
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
      NORTHSTAR_HISTORICAL_FIXTURE_ID,
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

  it("delivers without priorities when no supported priorities survive", async () => {
    const observations = completeGoldenObservations();
    const draft = goldenReportContent();
    draft.priorities.forEach((priority) => {
      priority.evidence_prompt_ids = [POSITIVE_ONLY_PROMPT_ID];
    });
    const generate = vi.fn(async () =>
      reportResult(draft),
    ) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(
      {
        brief: goldenBrief,
        prompts: goldenPrompts,
        historical_fixture_id: "northstar-report-golden-v1" as const,
        observations,
        safety_identifier: "fixture-user-123",
        budget: fixtureBudget,
      },
      generate,
    );

    expect(report.priorities).toEqual([]);
    expect(generate).toHaveBeenCalledTimes(1);
  });
});
