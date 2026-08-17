import { describe, expect, it } from "vitest";
import {
  KOPI_TAMAN_SENJA_BUSINESS_NAME,
  kopiTamanSenjaEvidence,
} from "../audit/fixtures/fixture-kopi-taman-senja";
import {
  kopiTamanSenjaBrief,
  kopiTamanSenjaObservations,
  kopiTamanSenjaPrompts,
} from "./adapter";
import {
  FixtureJourneyReportError,
  buildFixtureEvidenceExport,
  constructFixtureReport,
} from "./report";

describe("constructFixtureReport", () => {
  const report = constructFixtureReport();

  it("builds through the existing report contract with fixture provenance", () => {
    expect(report.report_version).toBe("nuave-report-v3");
    // The fixture report's authored fields are Indonesian and are checked
    // against the candidate Indonesian calibration, so the report carries
    // the Indonesian writing standard (additive Spec 002 R-38).
    expect(report.writing_standard_version).toBe("plain-id-v1");
    expect(report.provenance.requested_report_model).toBe("gpt-5.6-luna");
    expect(report.provenance.returned_report_model).toBe("gpt-5.6-luna");
    expect(report.provenance.report_call_count).toBe(1);
    expect(report.provenance.language_retry_performed).toBe(false);
  });

  it("keeps all ten details completed with no failed test", () => {
    expect(report.details).toHaveLength(10);
    expect(report.details.every((detail) => detail.run === "completed")).toBe(
      true,
    );
    expect(report.counts.failed).toBe(0);
  });

  it("matches the frozen evidence dimensions for every prompt", () => {
    report.details.forEach((detail, index) => {
      const frozen = kopiTamanSenjaEvidence.observations[index];
      expect(detail.prompt_id).toBe(kopiTamanSenjaPrompts[index].prompt_id);
      // Appearance derives from the visible retained answer: 8 mentioned,
      // 2 absent. Information keeps the frozen value.
      expect(detail.appearance).toBe(frozen.dimensions.appearance);
      expect(detail.information).toBe(frozen.dimensions.information);
      expect(detail.comparison).toBe(frozen.dimensions.comparison);
    });
  });

  it("preserves exact answer excerpts and attached source URLs", () => {
    report.details.forEach((detail, index) => {
      const observation = kopiTamanSenjaEvidence.observations[index];
      expect(detail.answer_excerpt).toBe(
        observation.selected_observation.answer_excerpt,
      );
      expect(detail.source_urls).toEqual(
        observation.selected_observation.sources.map((source) => source.url),
      );
    });
  });

  it("derives the model-level counts from the projected observations", () => {
    expect(report.counts).toEqual({
      unbranded_recommended: 1,
      unbranded_mentioned: 2,
      unbranded_total: 5,
      branded_recognized: 5,
      branded_total: 5,
      failed: 0,
    });
  });

  it("keeps the Indonesian conclusion and derived findings and actions", () => {
    expect(report.conclusion).toContain(KOPI_TAMAN_SENJA_BUSINESS_NAME);
    expect(report.key_findings.length).toBeGreaterThanOrEqual(1);
    expect(report.key_findings.length).toBeLessThanOrEqual(5);
    expect(report.priorities.length).toBeGreaterThanOrEqual(1);
    expect(report.priorities.length).toBeLessThanOrEqual(5);
    expect(report.observed_competitors[0]?.name).toBe(
      kopiTamanSenjaBrief.verified_competitor.name,
    );
  });

  it("throws a typed error when failure is injected", () => {
    expect(() => constructFixtureReport({ forceFailure: true })).toThrow(
      FixtureJourneyReportError,
    );
    expect(() => constructFixtureReport({ forceFailure: true })).toThrow(
      /konfigurasi pengujian/,
    );
  });

  it("constructs successfully again after a forced failure (retry path)", () => {
    expect(() => constructFixtureReport({ forceFailure: true })).toThrow(
      FixtureJourneyReportError,
    );
    const retried = constructFixtureReport();
    expect(retried.details).toHaveLength(10);
    expect(retried.counts.failed).toBe(0);
  });
});

describe("buildFixtureEvidenceExport", () => {
  it("exports the same prompts, observations, and report objects", () => {
    const report = constructFixtureReport();
    const evidence = buildFixtureEvidenceExport(report);
    expect(evidence.prompts).toBe(kopiTamanSenjaPrompts);
    expect(evidence.observations).toBe(kopiTamanSenjaObservations);
    expect(evidence.report).toBe(report);
    expect(evidence.export_version).toBe("nuave-evidence-v4");
  });

  it("carries the kopi brief with no logo data", () => {
    const evidence = buildFixtureEvidenceExport(constructFixtureReport());
    expect(evidence.brief.brand_name).toBe(KOPI_TAMAN_SENJA_BUSINESS_NAME);
    expect(evidence.brief.entity_scope).toBe("Dago, Bandung");
    expect(evidence.brief.agency_logo_data_url).toBe("");
  });
});
