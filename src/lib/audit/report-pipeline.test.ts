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
import type { ReportContent } from "./types";

const input = {
  brief: goldenBrief,
  prompts: goldenPrompts,
  observations: goldenObservations,
  safety_identifier: "fixture-user-123",
  budget: fixtureBudget,
};

function result(content: ReportContent, id: string) {
  return {
    content,
    requested_model: "fixture-requested-model",
    returned_model: "fixture-returned-model",
    response_id: id,
    telemetry: [fixtureCallTelemetry({ response_id: id })],
  };
}

describe("validated report pipeline", () => {
  it("uses one call when evidence and language pass", async () => {
    const generate = vi.fn(async () =>
      result(goldenReportContent(), "response-initial"),
    ) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(input, generate);

    expect(generate).toHaveBeenCalledTimes(1);
    expect(report.provenance).toMatchObject({
      report_call_count: 1,
      language_retry_performed: false,
      language_retry_violations: [],
      initial_report_response_id: "response-initial",
      report_response_id: "response-initial",
    });
    expect(report.operational_telemetry).toMatchObject({
      call_count: 1,
      accounted_cost_usd: 0.0008,
    });
  });

  it("blocks evidence errors without a retry", async () => {
    const invalid = goldenReportContent();
    invalid.priorities[0].evidence_prompt_ids = [goldenPrompts[6].prompt_id];
    const generate = vi.fn(async () =>
      result(invalid, "response-invalid"),
    ) as unknown as ReportGenerator;

    await expect(
      createValidatedAuditReport(input, generate),
    ).rejects.toMatchObject({ status: 422, telemetry: expect.any(Array) });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("derives competitor evidence links and relationship from retained answers", async () => {
    const draft = goldenReportContent();
    draft.observed_competitors[0] = {
      name: "Meridian Partners",
      relationship: "competitor_preferred",
      evidence_prompt_ids: [
        goldenPrompts[2].prompt_id,
        goldenPrompts[5].prompt_id,
      ],
    };
    const generate = vi.fn(async () =>
      result(draft, "response-normalized"),
    ) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(input, generate);

    expect(report.observed_competitors).toEqual([
      {
        name: "Meridian Partners",
        relationship: "client_preferred",
        evidence_prompt_ids: [goldenPrompts[5].prompt_id],
      },
    ]);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("derives observable states, exact excerpts, and attached sources", async () => {
    const draft = goldenReportContent();
    draft.details[0] = {
      ...draft.details[0],
      appearance: "mentioned",
      recommendation: "recommended",
      comparison: "compared_no_preference",
      information: "confirmed",
      answer_excerpt: "A paraphrase that is not retained evidence.",
      source_urls: ["https://unsupported.example/evidence"],
    };
    const generate = vi.fn(async () =>
      result(draft, "response-derived"),
    ) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(input, generate);

    expect(report.details[0]).toMatchObject({
      run: "completed",
      appearance: "absent",
      recommendation: "not_recommended",
      comparison: "not_observed",
      information: "not_assessed",
      answer_excerpt: goldenObservations[0].raw_answer,
      source_urls: [],
    });
  });

  it("uses one protected retry only for writing violations", async () => {
    const longDraft = goldenReportContent();
    longDraft.conclusion = `${Array.from({ length: 61 }, () => "clear").join(" ")}.`;
    const generate = vi
      .fn()
      .mockResolvedValueOnce(result(longDraft, "response-initial"))
      .mockResolvedValueOnce(result(goldenReportContent(), "response-retry"));

    const report = await createValidatedAuditReport(
      input,
      generate as unknown as ReportGenerator,
    );

    expect(generate).toHaveBeenCalledTimes(2);
    expect(report.provenance.report_call_count).toBe(2);
    expect(report.provenance.language_retry_performed).toBe(true);
    expect(report.provenance.language_retry_violations.join(" ")).toContain(
      "the limit is 60",
    );
    expect(report.provenance.initial_report_response_id).toBe(
      "response-initial",
    );
    expect(report.provenance.report_response_id).toBe("response-retry");
    expect(report.operational_telemetry.call_count).toBe(2);
    expect(generate.mock.calls[1][0].budget.calls).toHaveLength(1);
    expect(generate.mock.calls[1][0].budget.calls[0].response_id).toBe(
      "response-initial",
    );
  });

  it("blocks a protected-field mutation after the retry", async () => {
    const longDraft = goldenReportContent();
    longDraft.conclusion = `${Array.from({ length: 61 }, () => "clear").join(" ")}.`;
    const mutated = goldenReportContent();
    mutated.details[2].recommendation = "recommended";
    const generate = vi
      .fn()
      .mockResolvedValueOnce(result(longDraft, "response-initial"))
      .mockResolvedValueOnce(
        result(mutated, "response-retry"),
      ) as unknown as ReportGenerator;

    await expect(createValidatedAuditReport(input, generate)).rejects.toThrow(
      "protected classifications or evidence",
    );
    expect(generate).toHaveBeenCalledTimes(2);
  });
});
