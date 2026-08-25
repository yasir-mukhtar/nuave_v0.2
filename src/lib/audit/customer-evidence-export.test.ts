import { describe, expect, it } from "vitest";
import { makeCustomerEvidenceExport } from "./customer-evidence-export";
import type {
  AuditObservation,
  AuditPrompt,
  AuditReport,
  BusinessBrief,
} from "./types";

describe("customer evidence export", () => {
  it("keeps validated measures and omits competing legacy denominator projections", () => {
    const report = {
      facts: {
        comparison: { label: "legacy broad denominator" },
      },
      counts: {
        failed: 0,
      },
      measures: {
        overall: { appeared: 4, total: 10 },
        unbranded: { appeared: 1, total: 5 },
        branded: { appeared: 3, total: 5 },
        recommendation: { recommended: 2, assessed: 3 },
        comparison: { client_preferred: 1, assessed: 2 },
        information: {
          confirmed: 1,
          incomplete: 1,
          conflicting: 0,
          assessed: 2,
        },
      },
    } as unknown as AuditReport;

    const exported = makeCustomerEvidenceExport(
      { agency_logo_data_url: "" } as BusinessBrief,
      [] as AuditPrompt[],
      [] as AuditObservation[],
      report,
    );

    expect(exported.report.measures).toEqual(report.measures);
    expect(exported.report).not.toHaveProperty("facts");
    expect(exported.report).not.toHaveProperty("counts");
  });
});
