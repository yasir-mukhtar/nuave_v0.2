import { describe, expect, it, vi } from "vitest";
import {
  goldenBrief,
  goldenObservations,
  goldenPrompts,
  goldenReportContent,
} from "./fixtures/report-golden";
import { fixtureBudget, fixtureCallTelemetry } from "./fixtures/telemetry";
import {
  INDONESIAN_PROMPT_CONTRACT_VERSION,
  INDONESIAN_REPORT_WRITING_STANDARD_VERSION,
  REPORT_WRITING_STANDARD_VERSION,
} from "./report-language";
import {
  assertReportGenerationGate,
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
  it("blocks Indonesian synthesis before the provider on incomplete evidence", async () => {
    const generate = vi.fn(async () =>
      result(goldenReportContent(), "should-not-run"),
    ) as unknown as ReportGenerator;

    await expect(
      createValidatedAuditReport(
        {
          ...input,
          language: "id",
          observations: goldenObservations.slice(0, 9),
        },
        generate,
      ),
    ).rejects.toThrow("requires exactly ten observations");
    expect(generate).not.toHaveBeenCalled();
  });

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

  it("keeps evidence-protected fields unchanged across a language-only retry (Spec 003 R-28)", async () => {
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
    expect(report.provenance.language_retry_performed).toBe(true);
    // Answer excerpts, attached sources, evidence prompt IDs, and
    // classifications are identical after a retry that only rewrote language.
    expect(report.details.map((detail) => detail.answer_excerpt)).toEqual(
      goldenObservations.map((observation) => observation.raw_answer),
    );
    expect(report.details.map((detail) => detail.source_urls)).toEqual(
      goldenObservations.map((observation) =>
        observation.sources.map((source) => source.url),
      ),
    );
    expect(
      report.priorities.map((priority) => priority.evidence_prompt_ids),
    ).toEqual(
      goldenReportContent().priorities.map(
        (priority) => priority.evidence_prompt_ids,
      ),
    );
    expect(report.details.map((detail) => detail.recommendation)).toEqual(
      goldenReportContent().details.map((detail) => detail.recommendation),
    );
  });
});

describe("ten-of-ten report generation gate (Spec 003 R-19, enforced before any provider call)", () => {
  it("rejects a partial record (golden: 9 completed + 1 failed) with no provider call", () => {
    const generate = vi.fn();
    expect(() => assertReportGenerationGate(input)).toThrow(/not evaluable/);
    // The gate throws before generation: the provider is never called.
    expect(generate).not.toHaveBeenCalled();
  });

  it("passes only when every locked prompt has one evaluable observation", () => {
    const allEvaluable = goldenObservations.map((observation) => ({
      ...observation,
      run_status: "completed" as const,
      raw_answer: observation.raw_answer || "Usable answer.",
      telemetry:
        observation.telemetry.length > 0
          ? observation.telemetry
          : [fixtureCallTelemetry({ stage: "observation" })],
    }));
    expect(() =>
      assertReportGenerationGate({ ...input, observations: allEvaluable }),
    ).not.toThrow();
  });

  it("rejects duplicate locked prompts", () => {
    const duplicatePrompts = goldenPrompts.map((prompt, index) =>
      index === 9
        ? { ...prompt, prompt_id: goldenPrompts[0].prompt_id }
        : prompt,
    );
    expect(() =>
      assertReportGenerationGate({ ...input, prompts: duplicatePrompts }),
    ).toThrow(/unique/);
  });

  it("rejects observations that do not match the locked questions", () => {
    const mismatched = goldenObservations.map((observation, index) =>
      index === 0
        ? { ...observation, prompt_id: "NUAVE-NOT-LOCKED-99" }
        : observation,
    );
    expect(() =>
      assertReportGenerationGate({ ...input, observations: mismatched }),
    ).toThrow(/Missing evaluable observations/);
  });
});

describe("report synthesis integrity (Sozo live-run defect regression, Spec 003 R-19/R-37)", () => {
  const allCompletedInput = {
    ...input,
    observations: goldenObservations.map((observation, index) =>
      index === 4
        ? {
            ...observation,
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
            telemetry: [fixtureCallTelemetry({ stage: "observation" })],
          }
        : observation,
    ),
  };

  it("rejects a synthesis that marks a completed, mentioned observation not_assessed (the Sozo defect)", async () => {
    const defective = goldenReportContent();
    // Question 3 is completed and the raw answer names the brand, so the code
    // keeps the model's recommendation — not_assessed here is exactly what the
    // Sozo run produced and the integrity gate must reject it.
    defective.details[2] = {
      ...defective.details[2],
      recommendation: "not_assessed",
    };
    const generate = vi.fn(async () =>
      result(defective, "response-defective"),
    ) as unknown as ReportGenerator;

    await expect(
      createValidatedAuditReport(allCompletedInput, generate),
    ).rejects.toThrow(
      /completed, so appearance and recommendation must be assessed/,
    );
  });

  it("passes the automatic pipeline end-to-end with a correct synthesis for a 10/10 completed run", async () => {
    const generate = vi.fn(async () =>
      result(goldenReportContent(), "response-correct"),
    ) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(
      allCompletedInput,
      generate,
    );

    expect(generate).toHaveBeenCalledTimes(1);
    expect(report.details).toHaveLength(10);
    expect(report.details.every((detail) => detail.run === "completed")).toBe(
      true,
    );
    // The formerly failed question is now assessed (absent → not_recommended),
    // and every completed detail carries an assessed appearance+recommendation.
    expect(
      report.details.some((detail) => detail.recommendation === "not_assessed"),
    ).toBe(false);
    expect(
      report.priorities.every(
        (priority) => priority.evidence_prompt_ids.length > 0,
      ),
    ).toBe(true);
  });

  it("stamps the Indonesian writing standard and produces Indonesian facts/method copy for language: id (O-2/O-9)", async () => {
    const generate = vi.fn(async () =>
      result(goldenReportContent(), "response-id"),
    ) as unknown as ReportGenerator;
    // The Indonesian path enforces the ten-of-ten gate (R-19), which requires
    // attempt telemetry on every observation — not only the one
    // `allCompletedInput` backfills for the English-path regression test.
    const gateReadyInput = {
      ...allCompletedInput,
      observations: allCompletedInput.observations.map((observation) => ({
        ...observation,
        telemetry: observation.telemetry.length
          ? observation.telemetry
          : [fixtureCallTelemetry({ stage: "observation" })],
      })),
      language: "id" as const,
    };

    const report = await createValidatedAuditReport(gateReadyInput, generate);

    expect(generate).toHaveBeenCalledTimes(1);
    expect(report.writing_standard_version).toBe(
      INDONESIAN_REPORT_WRITING_STANDARD_VERSION,
    );
    expect(report.writing_standard_version).not.toBe(
      REPORT_WRITING_STANDARD_VERSION,
    );
    expect(report.provenance.prompt_contract_version).toBe(
      INDONESIAN_PROMPT_CONTRACT_VERSION,
    );
    expect(report.method_summary).toContain("Kami menguji");
    expect(report.facts.coverage.label).toContain("pertanyaan selesai diuji");
    expect(report.facts.recognition.label).toContain("Dikenali di");
  });

  it("accepts not_assessed on a completed validation observation's recommendation (the permissive branch)", async () => {
    // goldenPrompts[6] is NUAVE-BRAND-VALIDATION-01: a validation question,
    // completed and mentioned, asks for a fact rather than a judgment, so
    // recommendation: not_assessed is its honest completed value.
    expect(goldenPrompts[6].category).toBe("validation");
    const content = goldenReportContent();
    content.details[6] = {
      ...content.details[6],
      recommendation: "not_assessed",
    };
    const generate = vi.fn(async () =>
      result(content, "response-validation-not-assessed"),
    ) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(input, generate);

    expect(report.details[6].recommendation).toBe("not_assessed");
  });

  it("still rejects not_assessed on a completed judgment-category observation's recommendation", async () => {
    // goldenPrompts[3] is NUAVE-BRAND-SOLUTION-02: a solution_discovery
    // question, completed and mentioned, asks the model to judge a
    // recommendation, so not_assessed there must still be rejected.
    expect(goldenPrompts[3].category).toBe("solution_discovery");
    const content = goldenReportContent();
    content.details[3] = {
      ...content.details[3],
      recommendation: "not_assessed",
    };
    const generate = vi.fn(async () =>
      result(content, "response-judgment-not-assessed"),
    ) as unknown as ReportGenerator;

    await expect(createValidatedAuditReport(input, generate)).rejects.toThrow(
      /completed, so appearance and recommendation must be assessed/,
    );
  });
});
