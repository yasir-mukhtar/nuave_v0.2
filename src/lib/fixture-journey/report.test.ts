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

  it("carries no Nuave-authored English in the report object or its JSON export (adversarial review Finding 2)", () => {
    // Reproduces the review's counter-example: click "Unduh JSON" on the
    // report step and search for "We tested 10 questions". method_summary
    // and the six facts.*.label strings are computed by buildAuditReport
    // itself, outside ReportContent, so they were invisible to every
    // Indonesian language check and defaulted to English prose.
    expect(report.method_summary).not.toContain("We tested");
    expect(report.method_summary).toContain("Kami menguji");
    expect(report.facts.discovery.recommendation_label).not.toMatch(
      /^Recommended in/,
    );
    expect(report.facts.discovery.recommendation_label).toContain(
      "Direkomendasikan",
    );
    expect(report.facts.discovery.mention_label).not.toMatch(/^Named/);
    expect(report.facts.recognition.label).not.toMatch(/^Recognized in/);
    expect(report.facts.comparison.label).not.toMatch(/^Client preferred/);
    expect(report.facts.information.label).not.toMatch(
      /^\d+ confirmed,/,
    );
    expect(report.facts.coverage.label).toContain("selesai diuji");
    // The prompt pack came from the Indonesian question-writer contract, not
    // the English deterministic matrix.
    expect(report.provenance.prompt_contract_version).toBe(
      "question-writer-v1",
    );

    const exported = buildFixtureEvidenceExport(report);
    const serialized = JSON.stringify(exported);
    expect(serialized).not.toContain("We tested");
    expect(serialized).not.toContain("Recommended in");
    expect(serialized).not.toContain("deterministic-v4-en");
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
      // 2 absent. Information, comparison, and recommendation keep the
      // frozen value verbatim, including "not_assessed" for the factual
      // checks (07-10) that carry no recommendation judgment.
      expect(detail.appearance).toBe(frozen.dimensions.appearance);
      expect(detail.information).toBe(frozen.dimensions.information);
      expect(detail.comparison).toBe(frozen.dimensions.comparison);
      expect(detail.recommendation).toBe(frozen.dimensions.recommendation);
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
