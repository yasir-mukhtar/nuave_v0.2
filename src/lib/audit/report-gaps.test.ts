import { describe, expect, it } from "vitest";
import {
  assembleReportContent,
  buildAuditReport,
  validatePromptPack,
  validateReportContent,
} from "./contracts";
import {
  GOLDEN_REPORT_SECTIONS,
  expectedDenominatorLabels,
  expectedDimensionsByPrompt,
  goldenBrief,
  goldenObservations,
  goldenPrompts,
  goldenReportContent,
  goldenReviewCriteria,
} from "./fixtures/report-golden";
import { validateReportLanguage } from "./report-language";
import { reportContentSchema, reportSynthesisSchema } from "./types";
import { AUDIT_MEASUREMENT_MATRIX } from "./measurement-matrix";

describe("privacy-safe report golden fixture", () => {
  it("assembles code-owned evidence fields from a compact synthesis", () => {
    const full = goldenReportContent();
    const synthesis = reportSynthesisSchema.parse({
      conclusion: full.conclusion,
      accuracy_status: full.accuracy_status,
      key_findings: full.key_findings,
      priorities: full.priorities,
      assessments: full.details.map((detail) => ({
        prompt_id: detail.prompt_id,
        recommendation: detail.recommendation,
        comparison: detail.comparison,
        information: detail.information,
      })),
    });

    const assembled = assembleReportContent(
      synthesis,
      goldenObservations,
      goldenBrief,
    );

    expect(assembled.details).toHaveLength(10);
    expect(assembled.details[0]).toMatchObject({
      run: "completed",
      appearance: "absent",
      recommendation: "not_assessed",
      comparison: "not_observed",
      information: "not_assessed",
      answer_excerpt: goldenObservations[0].raw_answer,
      source_urls: goldenObservations[0].sources.map((source) => source.url),
    });
    expect(assembled.observed_competitors).toEqual([
      {
        name: goldenBrief.verified_competitor.name,
        relationship: "client_preferred",
        evidence_prompt_ids: [goldenPrompts[5].prompt_id],
      },
    ]);
    expect(
      validateReportContent(assembled, goldenObservations, goldenBrief),
    ).toEqual([]);
  });

  it("validates the fictional prompt, evidence, and writing contracts", () => {
    const content = goldenReportContent();

    expect(validatePromptPack(goldenPrompts, goldenBrief)).toEqual([]);
    expect(
      validateReportContent(content, goldenObservations, goldenBrief),
    ).toEqual([]);
    expect(validateReportLanguage(content)).toEqual([]);
  });

  it("records the five-section screen and print review contract", () => {
    expect(goldenReviewCriteria.section_sequence).toEqual([
      "Main Result",
      "Key Findings",
      "What to Do Next",
      "Test-by-Test Results",
      "How This Audit Works",
    ]);
    expect(goldenReviewCriteria.section_sequence).toEqual(
      GOLDEN_REPORT_SECTIONS,
    );
    expect(goldenReviewCriteria.screen_and_print_share_one_report).toBe(true);
  });

  it("rejects citation-only brand appearance", () => {
    const content = goldenReportContent();
    content.details[0].appearance = "mentioned";
    content.details[0].recommendation = "recommended";

    expect(
      validateReportContent(content, goldenObservations, goldenBrief).join(" "),
    ).toContain("raw response does not name it");
  });

  it("does not count a brand name that appears only inside a citation URL", () => {
    const observations = structuredClone(goldenObservations);
    observations[0].raw_answer =
      "Several local firms can help. See https://northstar.example/services.";
    const content = goldenReportContent();
    content.details[0].appearance = "mentioned";

    expect(
      validateReportContent(content, observations, goldenBrief).join(" "),
    ).toContain("raw response does not name it");
  });

  it("rejects an absent result when the visible answer names the brand", () => {
    const content = goldenReportContent();
    content.details[6].appearance = "absent";
    content.details[6].information = "not_assessed";

    expect(
      validateReportContent(content, goldenObservations, goldenBrief).join(" "),
    ).toContain("visible raw response names it");
  });

  it("rejects invented excerpts, unattached sources, and hidden failures", () => {
    const content = goldenReportContent();
    content.details[0].answer_excerpt = "Northstar appeared here.";
    content.details[0].source_urls = ["https://unattached.example"];
    content.details[4].run = "completed";

    const errors = validateReportContent(
      content,
      goldenObservations,
      goldenBrief,
    ).join(" ");
    expect(errors).toContain("not copied exactly");
    expect(errors).toContain("not attached to the observation");
    expect(errors).toContain(
      "report run status does not match the retained observation",
    );
  });

  it("requires every failed result dimension to remain unassessed", () => {
    const content = goldenReportContent();
    content.details[4].appearance = "absent";

    expect(
      validateReportContent(content, goldenObservations, goldenBrief).join(" "),
    ).toContain("result dimensions must be not_assessed");
  });

  it("rejects an observed competitor without prompt-level name evidence", () => {
    const content = goldenReportContent();
    content.observed_competitors[0] = {
      ...content.observed_competitors[0],
      name: "Unseen Associates",
    };

    expect(
      validateReportContent(content, goldenObservations, goldenBrief).join(" "),
    ).toContain(
      `Observed competitor Unseen Associates is not named in ${goldenPrompts[5].prompt_id}`,
    );
  });

  it("supports explicit comparison outcomes without collapsing them", () => {
    const content = goldenReportContent();
    content.details[5].comparison = "compared_no_preference";
    content.observed_competitors[0].relationship = "compared_no_preference";

    expect(reportContentSchema.safeParse(content).success).toBe(true);
    expect(content.details[5].comparison).toBe("compared_no_preference");
  });
});

describe("structured result dimensions", () => {
  it("keeps branded factual recognition separate from recommendation", () => {
    const detail = goldenReportContent().details[6];
    expect(detail).toMatchObject(
      expectedDimensionsByPrompt[goldenPrompts[6].prompt_id],
    );
  });

  it("keeps comparison and explicit preference separate from appearance", () => {
    const detail = goldenReportContent().details[5];
    expect(detail).toMatchObject(
      expectedDimensionsByPrompt[goldenPrompts[5].prompt_id],
    );
  });

  it("keeps run failure independent from non-appearance", () => {
    const detail = goldenReportContent().details[4];
    expect(detail).toMatchObject(
      expectedDimensionsByPrompt[goldenPrompts[4].prompt_id],
    );
  });

  it("represents a claim needing confirmation without declaring a correction", () => {
    const content = {
      ...goldenReportContent(),
      accuracy_status: "needs_confirmation",
    };

    expect(reportContentSchema.safeParse(content).success).toBe(true);
  });

  it("accepts up to five immediate priorities (Spec 003 R-25)", () => {
    const content = goldenReportContent();
    content.priorities.push(
      {
        ...content.priorities[2],
        order: 4,
        action: "A fourth synthetic action",
      },
      {
        ...content.priorities[2],
        order: 5,
        action: "A fifth synthetic action",
      },
    );

    expect(reportContentSchema.safeParse(content).success).toBe(true);
  });

  it("rejects more than five immediate priorities", () => {
    const content = goldenReportContent();
    content.priorities.push(
      {
        ...content.priorities[2],
        order: 4,
        action: "A fourth synthetic action",
      },
      {
        ...content.priorities[2],
        order: 5,
        action: "A fifth synthetic action",
      },
      {
        ...content.priorities[2],
        order: 6,
        action: "A sixth synthetic action",
      },
    );

    expect(reportContentSchema.safeParse(content).success).toBe(false);
  });

  it("rejects a report with zero priorities", () => {
    const content = goldenReportContent();
    content.priorities = [];

    expect(reportContentSchema.safeParse(content).success).toBe(false);
  });

  it("rejects a priority supported only by a positive result", () => {
    const content = goldenReportContent();
    content.priorities[0] = {
      ...content.priorities[0],
      action: "Add more service evidence",
      evidence_prompt_ids: [goldenPrompts[6].prompt_id],
    };

    expect(
      validateReportContent(content, goldenObservations, goldenBrief).join(" "),
    ).toContain("observed gap");
  });

  it("provides direct denominators and failed-test context", () => {
    const report = buildAuditReport(goldenReportContent(), goldenObservations);

    expect(report.facts.discovery.recommendation_label).toBe(
      expectedDenominatorLabels.discovery,
    );
    expect(report.facts.recognition.label).toBe(
      expectedDenominatorLabels.recognition,
    );
    expect(report.facts.discovery.total).toBe(
      AUDIT_MEASUREMENT_MATRIX.filter(
        (slot) =>
          !slot.legacyBranded &&
          slot.reportAssessmentClass === "recommendation",
      ).length,
    );
    expect(report.facts.discovery.failed).toBe(1);
    expect(report.facts.coverage).toMatchObject({
      completed: 9,
      total: 10,
      failed: 1,
    });
  });
});
