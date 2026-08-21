import { describe, expect, it, vi } from "vitest";
import {
  goldenBrief,
  goldenObservations,
  goldenPrompts,
  goldenReportContent,
} from "./fixtures/report-golden";
import { fixtureBudget, fixtureCallTelemetry } from "./fixtures/telemetry";
import {
  createValidatedAuditReport,
  type ReportGenerator,
} from "./report-pipeline";
import {
  PRODUCTION_OBSERVATION_REQUESTED_MODEL,
  PRODUCTION_OBSERVATION_SYSTEM,
} from "./production-observation-method";
import type { AuditCallTelemetry, AuditObservation } from "./types";

const completedObservations: AuditObservation[] = goldenObservations.map(
  (observation, index) => ({
    ...observation,
    system: PRODUCTION_OBSERVATION_SYSTEM,
    requested_model: PRODUCTION_OBSERVATION_REQUESTED_MODEL,
    run_status: "completed" as const,
    raw_answer:
      observation.raw_answer ||
      "Local advisers differ by focus: some handle logistics, others readiness reviews.",
    failure_reason: "",
    telemetry: [
      fixtureCallTelemetry({
        stage: "observation",
        requested_model: PRODUCTION_OBSERVATION_REQUESTED_MODEL,
        returned_model: observation.returned_model,
        response_id: observation.response_id || `obs-${index + 1}`,
        web_search_calls: 1,
      }),
    ],
  }),
);

describe("report success telemetry handoff", () => {
  it("returns the exact successful report calls to the route without changing the report", async () => {
    const reportCall = fixtureCallTelemetry({
      stage: "report",
      response_id: "report-telemetry-response",
    });
    const generate = vi.fn(async () => ({
      content: goldenReportContent(),
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
