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
import type { AuditCallTelemetry } from "./types";

const completedObservations = fixtureProtectedObservationSet(
  goldenPrompts,
  goldenObservations,
);

function protectedReportContent() {
  const content = goldenReportContent();
  return {
    ...content,
    details: content.details.map((detail, index) => ({
      ...detail,
      answer_excerpt: completedObservations[index].raw_answer,
    })),
  };
}

describe("report success telemetry handoff", () => {
  it("returns the exact successful report calls to the route without changing the report", async () => {
    const reportCall = fixtureCallTelemetry({
      stage: "report",
      response_id: "report-telemetry-response",
    });
    const generate = vi.fn(async () => ({
      content: protectedReportContent(),
      requested_model: "gpt-5.6-luna",
      returned_model: "gpt-5.6-luna",
      response_id: "report-telemetry-response",
      telemetry: [reportCall],
    })) as unknown as ReportGenerator;
    const captured: AuditCallTelemetry[][] = [];

    const report = await createValidatedAuditReport(
      {
        brief: goldenBrief,
        prompts: goldenPrompts,
        historical_fixture_id: "northstar-report-golden-v1" as const,
        observations: completedObservations,
        safety_identifier: "fixture-user-123",
        budget: fixtureBudget,
      },
      generate,
      (calls) => captured.push(calls),
    );

    expect(generate).toHaveBeenCalledTimes(1);
    expect(captured).toHaveLength(1);
    expect(captured[0]).toEqual([reportCall]);
    expect(report.provenance.report_response_id).toBe(
      "report-telemetry-response",
    );
    expect(report.details).toHaveLength(10);
  });
});
