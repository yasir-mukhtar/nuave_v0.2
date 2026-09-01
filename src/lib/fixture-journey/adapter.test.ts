import { describe, expect, it } from "vitest";
import {
  KOPI_TAMAN_SENJA_BUSINESS_NAME,
  KOPI_TAMAN_SENJA_COMPARISON_BUSINESS_NAME,
  KOPI_TAMAN_SENJA_ORDER_REFERENCE,
  kopiTamanSenjaEvidence,
  kopiTamanSenjaFacts,
  kopiTamanSenjaQuestions,
} from "../audit/fixtures/fixture-kopi-taman-senja";
import {
  COMPATIBILITY_COMPOSITION_COUNTS,
  measurementSlotForOrder,
  measurementSlotForPromptId,
  measurementSlotsForCompatibilityAssessmentClass,
} from "../audit/measurement-matrix";
import {
  FIXTURE_BUSINESS_NAME,
  FIXTURE_ORDER_REFERENCE,
  detailCopyFor,
  fixtureJourneyContext,
  fixtureObservationCompositionLabel,
  fixtureObservationResultLabel,
  kopiTamanSenjaBrief,
  kopiTamanSenjaMeasures,
  kopiTamanSenjaMethod,
  kopiTamanSenjaObservations,
  kopiTamanSenjaPrompts,
  kopiTamanSenjaReportContent,
  provenanceLabelText,
  questionClassExplanations,
  questionPackIsBalanced,
} from "./adapter";

describe("fixture journey adapter — business identity", () => {
  it("derives business identity from the frozen kopi chain, not a second fixture", () => {
    expect(FIXTURE_BUSINESS_NAME).toBe(KOPI_TAMAN_SENJA_BUSINESS_NAME);
    expect(FIXTURE_ORDER_REFERENCE).toBe(KOPI_TAMAN_SENJA_ORDER_REFERENCE);
    expect(fixtureJourneyContext.business.name).toBe(
      kopiTamanSenjaFacts.business.name,
    );
    expect(fixtureJourneyContext.business.scope).toBe(
      kopiTamanSenjaFacts.business.scope,
    );
    expect(fixtureJourneyContext.business.category).toBe(
      kopiTamanSenjaFacts.business.category.value,
    );
    expect(fixtureJourneyContext.business.shortDescription).toBe(
      kopiTamanSenjaFacts.business.short_description,
    );
    expect(fixtureJourneyContext.business.officialSources).toEqual(
      kopiTamanSenjaFacts.business.official_sources,
    );
    expect(fixtureJourneyContext.business.comparisonBusiness?.name).toBe(
      KOPI_TAMAN_SENJA_COMPARISON_BUSINESS_NAME,
    );
    expect(fixtureJourneyContext.business.factVersionId).toBe(
      kopiTamanSenjaFacts.fact_version_id,
    );
  });

  it("exposes the offer facts derived from the fixture state", () => {
    expect(fixtureJourneyContext.offer.totalLabel).toBe("Rp99.000");
    expect(fixtureJourneyContext.offer.totalNumeric).toBe(99_000);
    expect(fixtureJourneyContext.offer.quoteDays).toBe(30);
    expect(fixtureJourneyContext.offer.scopeLabel).toBe("Satu audit");
  });

  it("maps every provenance label to the settled Indonesian label", () => {
    expect(provenanceLabelText.found_website).toBe("Ditemukan di website");
    expect(provenanceLabelText.found_google_maps).toBe(
      "Ditemukan di Google Maps",
    );
    expect(provenanceLabelText.found_instagram).toBe("Ditemukan di Instagram");
    expect(provenanceLabelText.suggestion_nuave).toBe("Saran Nuave");
    expect(provenanceLabelText.customer_supplied).toBe("Ditambahkan oleh Anda");
    expect(provenanceLabelText.needs_review).toBe("Perlu diperiksa");
  });
});

describe("fixture journey adapter — question pack", () => {
  it("keeps all ten frozen questions in final order", () => {
    expect(fixtureJourneyContext.questions.all).toHaveLength(10);
    expect(fixtureJourneyContext.questions.all.map((q) => q.text)).toEqual(
      kopiTamanSenjaQuestions.questions.map((q) => q.text),
    );
    expect(fixtureJourneyContext.questions.all.map((q) => q.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  it("splits exactly five without-name and five with-name questions", () => {
    expect(questionPackIsBalanced()).toBe(true);
    expect(fixtureJourneyContext.questions.unbranded).toHaveLength(
      COMPATIBILITY_COMPOSITION_COUNTS.unbranded,
    );
    expect(fixtureJourneyContext.questions.branded).toHaveLength(
      COMPATIBILITY_COMPOSITION_COUNTS.branded,
    );
    expect(fixtureJourneyContext.questions.counts).toEqual({
      total: 10,
      tanpa_menyebut_bisnis_anda: COMPATIBILITY_COMPOSITION_COUNTS.unbranded,
      menyebut_bisnis_anda: COMPATIBILITY_COMPOSITION_COUNTS.branded,
    });
  });

  it("explains both question classes with the settled labels", () => {
    expect(questionClassExplanations.unbranded.label).toBe(
      "Tanpa menyebut bisnis Anda",
    );
    expect(questionClassExplanations.branded.label).toBe(
      "Menyebut bisnis Anda",
    );
    expect(questionClassExplanations.unbranded.detail).toContain(
      KOPI_TAMAN_SENJA_BUSINESS_NAME,
    );
    expect(questionClassExplanations.branded.detail).toContain(
      KOPI_TAMAN_SENJA_BUSINESS_NAME,
    );
  });
});

describe("fixture journey adapter — report projections", () => {
  it("projects the frozen chain into the existing report model shapes", () => {
    expect(kopiTamanSenjaPrompts).toHaveLength(10);
    expect(kopiTamanSenjaObservations).toHaveLength(10);
    expect(kopiTamanSenjaPrompts.map((p) => p.question)).toEqual(
      kopiTamanSenjaQuestions.questions.map((q) => q.text),
    );
    kopiTamanSenjaQuestions.questions.forEach((question) => {
      const slot = measurementSlotForOrder(question.order);
      if (!slot)
        throw new Error(`Missing canonical slot for ${question.order}`);
      const prompt = kopiTamanSenjaPrompts.find(
        (item) =>
          item.prompt_id ===
          `NVA-FIKTIF-001-Q${String(question.order).padStart(2, "0")}`,
      );
      if (!prompt)
        throw new Error(`Missing projected prompt for ${question.order}`);
      expect(prompt.branded).toBe(
        question.final_classification === "menyebut_bisnis_anda",
      );
      expect(prompt.category).toBe(slot.legacyCategory);
      const observation = kopiTamanSenjaObservations.find(
        (item) => item.prompt_id === prompt.prompt_id,
      );
      if (!observation)
        throw new Error(`Missing observation for ${prompt.prompt_id}`);
      expect(observation.run_status).toBe("completed");
      const frozen = kopiTamanSenjaEvidence.observations.find(
        (item) => item.order === question.order,
      );
      if (!frozen)
        throw new Error(`Missing frozen observation for ${question.order}`);
      expect(observation.raw_answer).toBe(
        frozen.selected_observation.raw_answer,
      );
    });
  });

  it("keeps the projected brief schema-compatible with the existing brief", () => {
    expect(kopiTamanSenjaBrief.brand_name).toBe(KOPI_TAMAN_SENJA_BUSINESS_NAME);
    expect(kopiTamanSenjaBrief.entity_scope).toBe("Dago, Bandung");
    expect(kopiTamanSenjaBrief.category).toBe("Kedai kopi");
    expect(kopiTamanSenjaBrief.official_sources).toHaveLength(3);
    expect(kopiTamanSenjaBrief.verified_competitor.name).toBe(
      KOPI_TAMAN_SENJA_COMPARISON_BUSINESS_NAME,
    );
    // The existing BusinessBrief schema pins language to "en-US"; the
    // Indonesian records carry their own id-ID language fields.
    expect(kopiTamanSenjaBrief.language).toBe("en-US");
  });

  it("uses only reserved .example domains in the projection", () => {
    const urls = [
      ...kopiTamanSenjaBrief.official_sources,
      kopiTamanSenjaBrief.verified_competitor.source_url,
      ...kopiTamanSenjaObservations.flatMap((o) => o.sources.map((s) => s.url)),
    ];
    expect(urls.length).toBeGreaterThanOrEqual(10);
    for (const url of urls) {
      expect(new URL(url).hostname.endsWith(".example")).toBe(true);
    }
  });
});

describe("fixture journey adapter — assessed-denominator measures", () => {
  it("matches the frozen arithmetic exactly (8/10, 3/5, 5/5)", () => {
    expect(kopiTamanSenjaMeasures.overall).toEqual({
      appeared: 8,
      total: kopiTamanSenjaQuestions.questions.length,
    });
    expect(kopiTamanSenjaMeasures.unbranded).toEqual({
      appeared: 3,
      total: COMPATIBILITY_COMPOSITION_COUNTS.unbranded,
    });
    expect(kopiTamanSenjaMeasures.branded).toEqual({
      appeared: 5,
      total: COMPATIBILITY_COMPOSITION_COUNTS.branded,
    });
  });

  it("uses eligible denominators for recommendation, comparison, information", () => {
    const records = kopiTamanSenjaEvidence.observations.map((observation) => {
      const slot = measurementSlotForOrder(observation.order);
      if (!slot) {
        throw new Error(
          `Missing canonical slot for fixture order ${observation.order}`,
        );
      }
      return { observation, slot };
    });
    const expectedFor = (
      assessmentClass: "recommendation" | "comparison" | "information",
    ) => {
      const slotIds = new Set(
        measurementSlotsForCompatibilityAssessmentClass(assessmentClass).map(
          (slot) => slot.id,
        ),
      );
      return records.filter(
        ({ observation, slot }) =>
          slotIds.has(slot.id) &&
          observation.dimensions.appearance === "mentioned" &&
          observation.dimensions[assessmentClass] !== "not_assessed" &&
          observation.dimensions[assessmentClass] !== "not_observed",
      );
    };
    const expectedRecommendation = expectedFor("recommendation");
    const expectedComparison = expectedFor("comparison");
    const expectedInformation = expectedFor("information");

    expect(kopiTamanSenjaMeasures.recommendation).toEqual({
      recommended: expectedRecommendation.filter(
        ({ observation }) =>
          observation.dimensions.recommendation === "recommended",
      ).length,
      assessed: expectedRecommendation.length,
    });
    expect(kopiTamanSenjaMeasures.comparison).toEqual({
      clientPreferred: expectedComparison.filter(
        ({ observation }) =>
          observation.dimensions.comparison === "client_preferred",
      ).length,
      assessed: expectedComparison.length,
    });
    expect(kopiTamanSenjaMeasures.information).toEqual({
      confirmed: expectedInformation.filter(
        ({ observation }) => observation.dimensions.information === "confirmed",
      ).length,
      incomplete: expectedInformation.filter(
        ({ observation }) =>
          observation.dimensions.information === "incomplete",
      ).length,
      conflicting: expectedInformation.filter(
        ({ observation }) =>
          observation.dimensions.information === "conflicting",
      ).length,
      assessed: expectedInformation.length,
    });
  });
});

describe("fixture journey adapter — method facts (R-42)", () => {
  it("derives the method section from the recorded run facts", () => {
    expect(kopiTamanSenjaMethod.system).toBe("OpenAI Responses API");
    expect(kopiTamanSenjaMethod.returnedModel).toBe("gpt-5.6-luna");
    expect(kopiTamanSenjaMethod.language).toBe("id-ID");
    expect(kopiTamanSenjaMethod.location).toEqual({
      country: "Indonesia",
      city: "Bandung",
    });
    expect(kopiTamanSenjaMethod.webSearchRequired).toBe(true);
    expect(kopiTamanSenjaMethod.methodVersion).toBe("audit-method-v1");
    expect(kopiTamanSenjaMethod.retries).toBe(0);
    expect(kopiTamanSenjaMethod.questionGeneration.system).toBe(
      "Google Gemini API",
    );
    expect(kopiTamanSenjaMethod.questionGeneration.model).toBe(
      "gemini-3.5-flash-lite",
    );
  });
});

describe("fixture journey adapter — derived report content (additive export)", () => {
  const content = kopiTamanSenjaReportContent();

  it("builds one to five evidence-led findings and actions", () => {
    expect(content.key_findings.length).toBeGreaterThanOrEqual(1);
    expect(content.key_findings.length).toBeLessThanOrEqual(5);
    expect(content.priorities.length).toBeGreaterThanOrEqual(1);
    expect(content.priorities.length).toBeLessThanOrEqual(5);
    expect(content.observed_competitors[0]?.name).toBe(
      KOPI_TAMAN_SENJA_COMPARISON_BUSINESS_NAME,
    );
  });

  it("references only prompt ids that exist in the frozen evidence", () => {
    const ids = new Set(kopiTamanSenjaPrompts.map((p) => p.prompt_id));
    expect(ids.size).toBe(10);
    for (const finding of content.key_findings) {
      for (const id of finding.evidence_prompt_ids) {
        expect(ids.has(id)).toBe(true);
      }
    }
    for (const priority of content.priorities) {
      for (const id of priority.evidence_prompt_ids) {
        expect(ids.has(id)).toBe(true);
      }
    }
  });

  it("keeps every detail excerpt exact and source-attached", () => {
    expect(content.details).toHaveLength(10);
    content.details.forEach((detail) => {
      const slot = measurementSlotForPromptId(detail.prompt_id);
      if (!slot)
        throw new Error(`Missing canonical slot for ${detail.prompt_id}`);
      const observation = kopiTamanSenjaEvidence.observations.find(
        (item) => item.order === slot.order,
      );
      if (!observation)
        throw new Error(`Missing frozen observation for ${detail.prompt_id}`);
      expect(detail.prompt_id).toBe(
        kopiTamanSenjaPrompts.find(
          (item) => item.prompt_id === detail.prompt_id,
        )?.prompt_id,
      );
      expect(detail.answer_excerpt).toBe(
        observation.selected_observation.answer_excerpt,
      );
      expect(detail.source_urls).toEqual(
        observation.selected_observation.sources.map((s) => s.url),
      );
      // The frozen excerpt is an exact substring of the retained raw answer.
      expect(
        observation.selected_observation.raw_answer.includes(
          observation.selected_observation.answer_excerpt,
        ),
      ).toBe(true);
    });
  });

  it("projects only the pre-A3 compatibility assessment dimension from frozen evidence", () => {
    // The projection keeps only the dimension declared by the pre-A3
    // compatibility class; canonical R-01 fields remain independently tested
    // in the matrix suite.
    content.details.forEach((detail) => {
      const slot = measurementSlotForPromptId(detail.prompt_id);
      if (!slot)
        throw new Error(`Missing canonical slot for ${detail.prompt_id}`);
      const frozen = kopiTamanSenjaEvidence.observations.find(
        (item) => item.order === slot.order,
      );
      if (!frozen)
        throw new Error(`Missing frozen observation for ${detail.prompt_id}`);
      expect(detail.information).toBe(
        slot.compatibilityReportAssessmentClass === "information" &&
          frozen.dimensions.appearance === "mentioned"
          ? frozen.dimensions.information
          : "not_assessed",
      );
      expect(detail.comparison).toBe(
        slot.compatibilityReportAssessmentClass === "comparison" &&
          frozen.dimensions.appearance === "mentioned"
          ? frozen.dimensions.comparison
          : "not_observed",
      );
      expect(detail.recommendation).toBe(
        slot.compatibilityReportAssessmentClass === "recommendation" &&
          frozen.dimensions.appearance === "mentioned"
          ? frozen.dimensions.recommendation
          : "not_assessed",
      );
    });
  });

  it("writes detail copy deterministically from the frozen classification", () => {
    for (const observation of kopiTamanSenjaEvidence.observations) {
      const copy = detailCopyFor(observation);
      expect(copy.finding.length).toBeGreaterThan(0);
      expect(copy.evidence_note.length).toBeGreaterThan(0);
    }
    expect(fixtureObservationResultLabel(1)).toBe(
      "Tidak muncul dalam jawaban ini",
    );
    expect(fixtureObservationResultLabel(4)).toBe(
      "Disebut dan direkomendasikan",
    );
    expect(fixtureObservationResultLabel(8)).toBe(
      "Disebut, informasi bertentangan",
    );
    expect(fixtureObservationResultLabel(9)).toBe(
      "Disebut, informasi terkonfirmasi",
    );
    expect(fixtureObservationResultLabel(10)).toBe(
      "Disebut, informasi belum lengkap",
    );
    expect(fixtureObservationCompositionLabel(1)).toBe(
      "Tanpa menyebut bisnis Anda",
    );
    expect(fixtureObservationCompositionLabel(6)).toBe("Menyebut bisnis Anda");
  });
});
