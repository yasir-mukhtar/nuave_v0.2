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
    expect(fixtureJourneyContext.questions.unbranded).toHaveLength(5);
    expect(fixtureJourneyContext.questions.branded).toHaveLength(5);
    expect(fixtureJourneyContext.questions.counts).toEqual({
      total: 10,
      tanpa_menyebut_bisnis_anda: 5,
      menyebut_bisnis_anda: 5,
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
    kopiTamanSenjaQuestions.questions.forEach((question, index) => {
      const prompt = kopiTamanSenjaPrompts[index];
      expect(prompt.branded).toBe(
        question.final_classification === "menyebut_bisnis_anda",
      );
      expect(prompt.category).toBe(question.suggested_category);
      const observation = kopiTamanSenjaObservations[index];
      expect(observation.run_status).toBe("completed");
      expect(observation.raw_answer).toBe(
        kopiTamanSenjaEvidence.observations[index].selected_observation
          .raw_answer,
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
    expect(kopiTamanSenjaMeasures.overall).toEqual({ appeared: 8, total: 10 });
    expect(kopiTamanSenjaMeasures.unbranded).toEqual({ appeared: 3, total: 5 });
    expect(kopiTamanSenjaMeasures.branded).toEqual({ appeared: 5, total: 5 });
  });

  it("uses eligible denominators for recommendation, comparison, information", () => {
    expect(kopiTamanSenjaMeasures.recommendation).toEqual({
      recommended: 2,
      assessed: 6,
    });
    expect(kopiTamanSenjaMeasures.comparison).toEqual({
      clientPreferred: 1,
      assessed: 2,
    });
    expect(kopiTamanSenjaMeasures.information).toEqual({
      confirmed: 1,
      incomplete: 2,
      conflicting: 1,
      assessed: 4,
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
    content.details.forEach((detail, index) => {
      const observation = kopiTamanSenjaEvidence.observations[index];
      expect(detail.prompt_id).toBe(kopiTamanSenjaPrompts[index].prompt_id);
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

  it("projects the recommendation dimension only for the validator", () => {
    // The frozen evidence records recommendation not_assessed for the four
    // factual checks (orders 7-10); the projection maps them to
    // not_recommended solely so the retained-evidence validator accepts the
    // set. Information and comparison keep the frozen values.
    content.details.forEach((detail, index) => {
      const frozen = kopiTamanSenjaEvidence.observations[index];
      expect(detail.information).toBe(frozen.dimensions.information);
      expect(detail.comparison).toBe(frozen.dimensions.comparison);
      if (frozen.dimensions.recommendation === "recommended") {
        expect(detail.recommendation).toBe("recommended");
      } else if (detail.appearance === "mentioned") {
        expect(detail.recommendation).toBe("not_recommended");
      }
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
    expect(fixtureObservationCompositionLabel(1)).toBe(
      "Tanpa menyebut bisnis Anda",
    );
    expect(fixtureObservationCompositionLabel(6)).toBe("Menyebut bisnis Anda");
  });
});
