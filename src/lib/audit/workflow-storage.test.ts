import { describe, expect, it } from "vitest";
import {
  goldenBrief,
  goldenObservations,
  goldenReportContent,
} from "./fixtures/report-golden";
import { buildAuditReport, normalizeReportEvidence } from "./contracts";
import {
  AUDIT_SESSION_STORAGE_KEY,
  AUDIT_WORKFLOW_STORAGE_KEY,
  restorableAuditReport,
} from "./workflow-storage";

function currentReport() {
  return buildAuditReport(
    normalizeReportEvidence(
      goldenReportContent(),
      goldenObservations,
      goldenBrief,
    ),
    goldenObservations,
  );
}

describe("live audit workflow session storage", () => {
  it("invalidates stale workflow state while keeping the browser session identity stable", () => {
    // v4 may contain direct-OpenAI observations; v5 may contain a live run from
    // a browser bundle that predates the explicit stream-contract guard. This
    // build reads only v6 so neither stale resumable state can be mixed in.
    expect(AUDIT_WORKFLOW_STORAGE_KEY).toBe("nuave.audit.workflow.v7");
    expect(AUDIT_WORKFLOW_STORAGE_KEY).not.toBe("nuave.audit.workflow.v6");
    expect(AUDIT_WORKFLOW_STORAGE_KEY).not.toBe("nuave.audit.workflow.v5");
    expect(AUDIT_SESSION_STORAGE_KEY).toBe("nuave.audit.session.v1");
  });

  it("restores a report produced by this build", () => {
    const report = currentReport();
    const restored = restorableAuditReport(
      JSON.parse(JSON.stringify(report)) as unknown,
    );

    expect(restored).not.toBeNull();
    expect(restored?.measures.overall.appeared).toBe(
      report.measures.overall.appeared,
    );
  });

  it("drops a report written before measures existed instead of crashing the report screen", () => {
    const previousBuildReport = JSON.parse(
      JSON.stringify(currentReport()),
    ) as Record<string, unknown>;
    delete previousBuildReport.measures;

    expect(restorableAuditReport(previousBuildReport)).toBeNull();
    // The unguarded read the report screen performs on a restored report.
    expect(
      () =>
        (
          previousBuildReport as unknown as {
            measures: { overall: { appeared: number } };
          }
        ).measures.overall.appeared,
    ).toThrow(TypeError);
  });

  it("drops a partially shaped measures block rather than rendering missing numbers", () => {
    const report = JSON.parse(JSON.stringify(currentReport())) as Record<
      string,
      Record<string, unknown>
    >;
    delete report.measures.comparison;
    expect(restorableAuditReport(report)).toBeNull();

    const missingInformationField = JSON.parse(
      JSON.stringify(currentReport()),
    ) as Record<string, Record<string, Record<string, unknown>>>;
    delete missingInformationField.measures.information.assessed;
    expect(restorableAuditReport(missingInformationField)).toBeNull();
  });

  it("drops anything that is not a report at all", () => {
    expect(restorableAuditReport(null)).toBeNull();
    expect(restorableAuditReport(undefined)).toBeNull();
    expect(restorableAuditReport("a report")).toBeNull();
    expect(restorableAuditReport({})).toBeNull();
  });
});
