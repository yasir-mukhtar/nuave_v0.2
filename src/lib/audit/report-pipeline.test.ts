import { afterEach, describe, expect, it, vi } from "vitest";
import {
  goldenBrief,
  goldenObservations,
  goldenPrompts,
  goldenReportContent,
} from "./fixtures/report-golden";
import { fixtureProtectedObservationSet } from "./fixtures/protected-observation";
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
import { liveGenerateReportContent } from "./provider";
import type { ReportContent } from "./types";
import {
  measurementSlotForPromptId,
  type ReportAssessmentClass,
} from "./measurement-matrix";

// The Phase-1 golden record: 9 completed + 1 failed, no attempt telemetry. It
// remains a historical direct-OpenAI fixture and is intentionally NOT mutated
// into current production evidence. Pipeline-pass tests use the protected
// test-only fixture below.
const partialInput = {
  brief: goldenBrief,
  prompts: goldenPrompts,
  observations: goldenObservations,
  safety_identifier: "fixture-user-123",
  budget: fixtureBudget,
};

const goldenCompletedObservations = fixtureProtectedObservationSet(
  goldenPrompts,
  goldenObservations,
);

const input = {
  ...partialInput,
  observations: goldenCompletedObservations,
};

function protectedReportContent(): ReportContent {
  const content = goldenReportContent();
  return {
    ...content,
    details: content.details.map((detail, index) => ({
      ...detail,
      answer_excerpt: goldenCompletedObservations[index].raw_answer,
    })),
  };
}

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
      result(protectedReportContent(), "should-not-run"),
    ) as unknown as ReportGenerator;

    await expect(
      createValidatedAuditReport(
        {
          ...input,
          language: "id",
          observations: goldenCompletedObservations.slice(0, 9),
        },
        generate,
      ),
    ).rejects.toThrow("requires exactly ten observations");
    expect(generate).not.toHaveBeenCalled();
  });

  // R3-6 (Phase 3 fix-round-3 adversarial review): the same gate on the
  // English path. It used to run only for `language: "id"`, so a direct
  // library caller could buy synthesis for a partial evidence set in English
  // — the code comment claimed otherwise.
  it("blocks English synthesis before the provider on incomplete evidence", async () => {
    const generate = vi.fn(async () =>
      result(protectedReportContent(), "should-not-run"),
    ) as unknown as ReportGenerator;

    await expect(
      createValidatedAuditReport(
        { ...input, observations: goldenCompletedObservations.slice(0, 9) },
        generate,
      ),
    ).rejects.toThrow("requires exactly ten observations");
    expect(generate).not.toHaveBeenCalled();
  });

  it("blocks English synthesis on the partial golden record (9 completed + 1 failed)", async () => {
    const generate = vi.fn(async () =>
      result(protectedReportContent(), "should-not-run"),
    ) as unknown as ReportGenerator;

    await expect(
      createValidatedAuditReport(partialInput, generate),
    ).rejects.toThrow(/not evaluable/);
    expect(generate).not.toHaveBeenCalled();
  });

  it("uses one call when current OpenCode evidence and language pass", async () => {
    const generate = vi.fn(async () =>
      result(protectedReportContent(), "response-initial"),
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

  it("rejects a mixed OpenAI + OpenCode observation set before synthesis", async () => {
    const mixed = goldenCompletedObservations.map((observation, index) =>
      index === 0
        ? { ...observation, system: "OpenAI Responses API" as const }
        : observation,
    );
    const generate = vi.fn(async () =>
      result(protectedReportContent(), "should-not-run"),
    ) as unknown as ReportGenerator;

    await expect(
      createValidatedAuditReport({ ...input, observations: mixed }, generate),
    ).rejects.toThrow(
      /recorded system OpenAI Responses API; expected OpenCode Go Responses API/,
    );
    expect(generate).not.toHaveBeenCalled();
  });

  it("rejects ten old direct-OpenAI observations before synthesis", async () => {
    const oldDirectOpenAI = goldenCompletedObservations.map((observation) => ({
      ...observation,
      system: "OpenAI Responses API" as const,
    }));
    const generate = vi.fn(async () =>
      result(protectedReportContent(), "should-not-run"),
    ) as unknown as ReportGenerator;

    await expect(
      createValidatedAuditReport(
        { ...input, observations: oldDirectOpenAI },
        generate,
      ),
    ).rejects.toThrow(
      /recorded system OpenAI Responses API; expected OpenCode Go Responses API/,
    );
    expect(generate).not.toHaveBeenCalled();
  });

  it("rejects returned-model drift from the protected requested model", () => {
    const mismatched = [...goldenCompletedObservations];
    mismatched[0] = {
      ...mismatched[0],
      returned_model: "gpt-5.6-luna-provider-1",
    };

    expect(() =>
      assertReportGenerationGate({ ...input, observations: mismatched }),
    ).toThrow(
      /returned model gpt-5\.6-luna-provider-1; expected gpt-5\.6-luna/,
    );
  });

  it("contains an unsupported priority without a retry", async () => {
    const draft = protectedReportContent();
    const removedEvidenceId = goldenPrompts[6].prompt_id;
    draft.priorities[0].evidence_prompt_ids = [removedEvidenceId];
    const expectedSurvivors = draft.priorities
      .slice(1)
      .map((priority, index) => ({
        ...priority,
        order: index + 1,
      }));
    const generate = vi.fn(async () =>
      result(draft, "response-contained"),
    ) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(input, generate);

    expect(report.priorities).toEqual(expectedSurvivors);
    expect(
      report.priorities.some((priority) =>
        priority.evidence_prompt_ids.includes(removedEvidenceId),
      ),
    ).toBe(false);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("derives competitor evidence links and relationship from retained answers", async () => {
    const draft = protectedReportContent();
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
    const draft = protectedReportContent();
    draft.details[0] = {
      ...draft.details[0],
      appearance: "mentioned",
      recommendation: "recommended",
      comparison: "compared_no_preference",
      information: "confirmed",
      source_urls: ["https://unsupported.example/evidence"],
    };
    const generate = vi.fn(async () =>
      result(draft, "response-derived"),
    ) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(input, generate);

    expect(report.details[0]).toMatchObject({
      run: "completed",
      appearance: "absent",
      recommendation: "not_assessed",
      comparison: "not_observed",
      information: "not_assessed",
      answer_excerpt: goldenObservations[0].raw_answer,
      source_urls: [],
    });
  });

  it("uses one protected retry only for writing violations", async () => {
    const longDraft = protectedReportContent();
    longDraft.conclusion = `${Array.from({ length: 61 }, () => "clear").join(" ")}.`;
    const generate = vi
      .fn()
      .mockResolvedValueOnce(result(longDraft, "response-initial"))
      .mockResolvedValueOnce(
        result(protectedReportContent(), "response-retry"),
      );

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
    const longDraft = protectedReportContent();
    longDraft.conclusion = `${Array.from({ length: 61 }, () => "clear").join(" ")}.`;
    const mutated = protectedReportContent();
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
    const longDraft = protectedReportContent();
    longDraft.conclusion = `${Array.from({ length: 61 }, () => "clear").join(" ")}.`;
    const generate = vi
      .fn()
      .mockResolvedValueOnce(result(longDraft, "response-initial"))
      .mockResolvedValueOnce(
        result(protectedReportContent(), "response-retry"),
      );

    const report = await createValidatedAuditReport(
      input,
      generate as unknown as ReportGenerator,
    );

    expect(generate).toHaveBeenCalledTimes(2);
    expect(report.provenance.language_retry_performed).toBe(true);
    // Answer excerpts, attached sources, evidence prompt IDs, and
    // classifications are identical after a retry that only rewrote language.
    expect(report.details.map((detail) => detail.answer_excerpt)).toEqual(
      goldenCompletedObservations.map((observation) => observation.raw_answer),
    );
    expect(report.details.map((detail) => detail.source_urls)).toEqual(
      // Normalization only drops sources the observation did not return; it
      // never adds one. Question 5's synthesis cites none, so it stays empty
      // even though its backfilled observation carries a source.
      protectedReportContent().details.map((detail) => detail.source_urls),
    );
    expect(
      report.priorities.map((priority) => priority.evidence_prompt_ids),
    ).toEqual(
      protectedReportContent().priorities.map(
        (priority) => priority.evidence_prompt_ids,
      ),
    );
    expect(report.details.map((detail) => detail.recommendation)).toEqual(
      protectedReportContent().details.map((detail) => detail.recommendation),
    );
  });
});

describe("ten-of-ten report generation gate (Spec 003 R-19, enforced before any provider call)", () => {
  it("rejects a partial record (golden: 9 completed + 1 failed) with no provider call", () => {
    const generate = vi.fn();
    expect(() => assertReportGenerationGate(partialInput)).toThrow(
      /not evaluable/,
    );
    expect(generate).not.toHaveBeenCalled();
  });

  it("passes only when every locked prompt has one current-method evaluable observation", () => {
    const allEvaluable = fixtureProtectedObservationSet(
      goldenPrompts,
      goldenObservations,
    );
    expect(() =>
      assertReportGenerationGate({
        ...partialInput,
        observations: allEvaluable,
      }),
    ).not.toThrow();
  });

  it("rejects duplicate locked prompts", () => {
    const duplicatePrompts = goldenPrompts.map((prompt, index) =>
      index === 9
        ? { ...prompt, prompt_id: goldenPrompts[0].prompt_id }
        : prompt,
    );
    expect(() =>
      assertReportGenerationGate({
        ...partialInput,
        prompts: duplicatePrompts,
      }),
    ).toThrow(/unique/);
  });

  it("rejects observations that do not match the locked questions", () => {
    const mismatched = goldenObservations.map((observation, index) =>
      index === 0
        ? { ...observation, prompt_id: "NUAVE-NOT-LOCKED-99" }
        : observation,
    );
    expect(() =>
      assertReportGenerationGate({ ...partialInput, observations: mismatched }),
    ).toThrow(/Missing evaluable observations/);
  });
});

// R3-5: direct-library callers can invoke this pipeline with the default live
// generator without going through /api/audit/report, so the credential guard
// has to be here too.
describe("live provider credential guard on the direct-library path (R3-5)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails before synthesis when OPENCODEGO_API_KEY is missing and the live generator is used", async () => {
    vi.stubEnv("NUAVE_PROVIDER", "opencodego");
    vi.stubEnv("OPENCODEGO_API_KEY", "");

    await expect(
      createValidatedAuditReport(input, liveGenerateReportContent),
    ).rejects.toThrow(/OPENCODEGO_API_KEY is not configured/);
  });

  it("leaves an injected generator alone — no provider call, no credential needed", async () => {
    vi.stubEnv("NUAVE_PROVIDER", "opencodego");
    vi.stubEnv("OPENCODEGO_API_KEY", "");
    const generate = vi.fn(async () =>
      result(protectedReportContent(), "response-injected"),
    ) as unknown as ReportGenerator;

    await expect(
      createValidatedAuditReport(input, generate),
    ).resolves.toMatchObject({ report_version: "nuave-report-v3" });
  });
});

describe("report synthesis integrity (Sozo live-run defect regression, Spec 003 R-19/R-37)", () => {
  const allCompletedInput = input;

  it("accepts not_assessed when a completed recommendation-path answer has no endorsement", async () => {
    const defective = protectedReportContent();
    defective.details[2] = {
      ...defective.details[2],
      recommendation: "not_assessed",
    };
    const generate = vi.fn(async () =>
      result(defective, "response-defective"),
    ) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(
      allCompletedInput,
      generate,
    );
    expect(
      measurementSlotForPromptId(defective.details[2].prompt_id)
        ?.compatibilityReportAssessmentClass,
    ).toBe("recommendation" satisfies ReportAssessmentClass);
    expect(report.details[2].recommendation).toBe("not_assessed");
  });

  it("passes the automatic pipeline end-to-end with a correct synthesis for a 10/10 completed run", async () => {
    const generate = vi.fn(async () =>
      result(protectedReportContent(), "response-correct"),
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
    report.details.forEach((detail) => {
      const slot = measurementSlotForPromptId(detail.prompt_id);
      if (!slot)
        throw new Error(`Missing canonical slot for ${detail.prompt_id}`);
      if (
        slot.compatibilityReportAssessmentClass !== "recommendation" ||
        detail.appearance !== "mentioned"
      ) {
        expect(detail.recommendation).toBe("not_assessed");
      }
      if (
        slot.compatibilityReportAssessmentClass !== "comparison" ||
        detail.appearance !== "mentioned"
      ) {
        expect(detail.comparison).toBe("not_observed");
      }
      if (
        slot.compatibilityReportAssessmentClass !== "information" ||
        detail.appearance !== "mentioned"
      ) {
        expect(detail.information).toBe("not_assessed");
      }
    });
    expect(
      report.priorities.every(
        (priority) => priority.evidence_prompt_ids.length > 0,
      ),
    ).toBe(true);
  });

  it("stamps the Indonesian writing standard and produces Indonesian facts/method copy for language: id (O-2/O-9)", async () => {
    const generate = vi.fn(async () =>
      result(protectedReportContent(), "response-id"),
    ) as unknown as ReportGenerator;
    const gateReadyInput = { ...input, language: "id" as const };

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

  it("keeps a current validation fact on the compatibility information path", async () => {
    const slot = measurementSlotForPromptId(goldenPrompts[6].prompt_id);
    expect(slot?.category).toBe("brand_fit");
    expect(slot?.reportAssessmentClass).toBe("recommendation");
    expect(slot?.compatibilityReportAssessmentClass).toBe("information");
    expect(goldenPrompts[6].category).toBe("validation");
    const content = protectedReportContent();
    content.details[6] = {
      ...content.details[6],
      recommendation: "recommended",
      information: "confirmed",
    };
    const generate = vi.fn(async () =>
      result(content, "response-validation-not-assessed"),
    ) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(input, generate);

    expect(report.details[6].recommendation).toBe("not_assessed");
    expect(report.details[6].information).toBe("confirmed");
  });

  it("preserves a current address-hours conflict instead of future recommendation semantics", async () => {
    const slot = measurementSlotForPromptId(goldenPrompts[7].prompt_id);
    expect(slot?.category).toBe("explicit_recommendation");
    expect(slot?.reportAssessmentClass).toBe("recommendation");
    expect(slot?.compatibilityReportAssessmentClass).toBe("information");
    expect(goldenPrompts[7].category).toBe(slot?.legacyCategory);
    const content = protectedReportContent();
    content.details[7] = {
      ...content.details[7],
      recommendation: "recommended",
      information: "conflicting",
    };
    const generate = vi.fn(async () =>
      result(content, "response-judgment-not-assessed"),
    ) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(input, generate);
    expect(report.details[7].recommendation).toBe("not_assessed");
    expect(report.details[7].information).toBe("conflicting");
    expect(report.measures.information.conflicting).toBeGreaterThan(0);
  });
});
