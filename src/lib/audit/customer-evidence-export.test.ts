import { describe, expect, it } from "vitest";
import { makeCustomerEvidenceExport } from "./customer-evidence-export";
import type {
  AuditObservation,
  AuditPrompt,
  AuditReport,
  BusinessBrief,
} from "./types";

describe("customer evidence export", () => {
  it("keeps validated measures and observable evidence while omitting competing/internal projections", () => {
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
      operational_telemetry: {
        call_count: 12,
        calls: [{ response_id: "internal-call" }],
      },
    } as unknown as AuditReport;
    const observations = [
      {
        prompt_id: "NUAVE-BRAND-NEED-01",
        question: "Pertanyaan pelanggan?",
        raw_answer: "Jawaban yang diamati.",
        failure_reason: "provider stack detail",
        telemetry: [{ response_id: "internal-observation-call" }],
      },
    ] as unknown as AuditObservation[];

    const exported = makeCustomerEvidenceExport(
      { agency_logo_data_url: "" } as BusinessBrief,
      [] as AuditPrompt[],
      observations,
      report,
    );

    expect(exported.report.measures).toEqual(report.measures);
    expect(exported.report).not.toHaveProperty("facts");
    expect(exported.report).not.toHaveProperty("counts");
    expect(exported.report).not.toHaveProperty("operational_telemetry");
    expect(exported.observations[0]).toMatchObject({
      prompt_id: "NUAVE-BRAND-NEED-01",
      question: "Pertanyaan pelanggan?",
      raw_answer: "Jawaban yang diamati.",
    });
    expect(exported.observations[0]).not.toHaveProperty("failure_reason");
    expect(exported.observations[0]).not.toHaveProperty("telemetry");
  });
});
