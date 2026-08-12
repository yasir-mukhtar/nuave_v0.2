import { describe, expect, it } from "vitest";
import {
  GOLDEN_REPORT_SECTIONS,
  expectedDenominatorLabels,
  expectedDimensionsByPrompt,
  goldenBrief,
  goldenObservations,
  goldenPrompts,
  goldenReportContent,
} from "../audit/fixtures/report-golden";
import {
  FixtureJourneyReportError,
  buildFixtureEvidenceExport,
  constructFixtureReport,
} from "./report";

describe("constructFixtureReport", () => {
  const report = constructFixtureReport();

  it("builds through the existing report contract with fixture provenance", () => {
    expect(report.report_version).toBe("nuave-report-v3");
    expect(report.provenance.requested_report_model).toBe(
      "fixture-requested-model",
    );
    expect(report.provenance.returned_report_model).toBe(
      "fixture-returned-model",
    );
    expect(report.provenance.report_call_count).toBe(1);
    expect(report.provenance.language_retry_performed).toBe(false);
  });

  it("preserves the golden conclusion and authored sections", () => {
    expect(report.conclusion).toBe(goldenReportContent().conclusion);
    expect(report.key_findings.map((finding) => finding.title)).toEqual(
      goldenReportContent().key_findings.map((finding) => finding.title),
    );
    expect(report.priorities.map((priority) => priority.action)).toEqual(
      goldenReportContent().priorities.map((priority) => priority.action),
    );
    // The five canonical sections are rendered by the view from this payload.
    expect(GOLDEN_REPORT_SECTIONS).toHaveLength(5);
  });

  it("keeps all ten details with nine completed and one failed", () => {
    expect(report.details).toHaveLength(10);
    const failed = report.details.filter((detail) => detail.run === "failed");
    const completed = report.details.filter(
      (detail) => detail.run === "completed",
    );
    expect(failed).toHaveLength(1);
    expect(completed).toHaveLength(9);
    expect(failed[0].prompt_id).toBe(goldenPrompts[4].prompt_id);
    // The failed observation stays failed with no assessed dimension.
    expect(failed[0]).toMatchObject({
      appearance: "not_assessed",
      recommendation: "not_assessed",
      comparison: "not_assessed",
      information: "not_assessed",
      source_urls: [],
    });
  });

  it("matches the fixture's expected result dimensions for every prompt", () => {
    for (const detail of report.details) {
      const expected = expectedDimensionsByPrompt[detail.prompt_id];
      expect(
        expected,
        `expected dimensions for ${detail.prompt_id}`,
      ).toBeDefined();
      expect(detail).toMatchObject({
        run: expected.run,
        appearance: expected.appearance,
        recommendation: expected.recommendation,
        comparison: expected.comparison,
        information: expected.information,
      });
    }
  });

  it("preserves exact answer excerpts and attached source URLs", () => {
    report.details.forEach((detail, index) => {
      const observation = goldenObservations[index];
      expect(detail.prompt_id).toBe(observation.prompt_id);
      if (observation.run_status === "completed") {
        expect(detail.answer_excerpt).toBe(observation.raw_answer);
        expect(detail.source_urls).toEqual(
          observation.sources.map((source) => source.url),
        );
      } else {
        expect(detail.answer_excerpt).toBe("");
        expect(detail.source_urls).toEqual([]);
      }
    });
  });

  it("derives the expected counts and denominator labels", () => {
    expect(report.counts).toEqual({
      unbranded_recommended: 1,
      unbranded_mentioned: 1,
      unbranded_total: 5,
      branded_recognized: 5,
      branded_total: 5,
      failed: 1,
    });
    expect(report.facts.discovery.recommendation_label).toBe(
      expectedDenominatorLabels.discovery,
    );
    expect(report.facts.recognition.label).toBe(
      expectedDenominatorLabels.recognition,
    );
    expect(report.facts.coverage.label).toBe(
      "9 of 10 questions completed; 1 question could not be tested.",
    );
  });

  it("keeps the failed observation from becoming non-appearance or success", () => {
    const failedDetail = report.details.find(
      (detail) => detail.run === "failed",
    );
    const failedObservation = goldenObservations.find(
      (observation) => observation.run_status === "failed",
    );
    expect(failedDetail?.prompt_id).toBe(failedObservation?.prompt_id);
    expect(
      report.details.filter((detail) => detail.run === "failed"),
    ).toHaveLength(1);
    expect(report.counts.failed).toBe(1);
  });

  it("throws a typed error when failure is injected", () => {
    expect(() => constructFixtureReport({ forceFailure: true })).toThrow(
      FixtureJourneyReportError,
    );
    expect(() => constructFixtureReport({ forceFailure: true })).toThrow(
      /test configuration/,
    );
  });

  it("constructs successfully again after a forced failure (retry path)", () => {
    expect(() => constructFixtureReport({ forceFailure: true })).toThrow(
      FixtureJourneyReportError,
    );
    const retried = constructFixtureReport();
    expect(retried.details).toHaveLength(10);
    expect(retried.counts.failed).toBe(1);
  });
});

describe("buildFixtureEvidenceExport", () => {
  it("exports the same prompts, observations, and report objects", () => {
    const report = constructFixtureReport();
    const evidence = buildFixtureEvidenceExport(report);
    expect(evidence.prompts).toBe(goldenPrompts);
    expect(evidence.observations).toBe(goldenObservations);
    expect(evidence.report).toBe(report);
    expect(evidence.export_version).toBe("nuave-evidence-v4");
  });

  it("carries the golden brief with no logo data", () => {
    const evidence = buildFixtureEvidenceExport(constructFixtureReport());
    expect(evidence.brief.brand_name).toBe(goldenBrief.brand_name);
    expect(evidence.brief.entity_scope).toBe(goldenBrief.entity_scope);
    expect(evidence.brief.agency_logo_data_url).toBe("");
  });
});
