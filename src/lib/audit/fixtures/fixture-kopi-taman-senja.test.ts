import { describe, expect, it } from "vitest";
import {
  KOPI_TAMAN_SENJA_BUSINESS_NAME,
  KOPI_TAMAN_SENJA_COMPARISON_BUSINESS_NAME,
  KOPI_TAMAN_SENJA_EVIDENCE_VERSION_ID,
  KOPI_TAMAN_SENJA_FACTS_VERSION_ID,
  KOPI_TAMAN_SENJA_OPENING_HOURS_CONFLICT,
  KOPI_TAMAN_SENJA_ORDER_REFERENCE,
  KOPI_TAMAN_SENJA_QUESTIONS_VERSION_ID,
  kopiTamanSenjaChain,
  kopiTamanSenjaEvidence,
  kopiTamanSenjaFacts,
  kopiTamanSenjaQuestions,
} from "./fixture-kopi-taman-senja";
import type { IndonesianQuestion } from "./fixture-kopi-taman-senja";
import {
  AUDIT_MEASUREMENT_MATRIX,
  COMPATIBILITY_COMPOSITION_COUNTS,
  measurementSlotForOrder,
} from "../measurement-matrix";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

const UNSUPPORTED_PREMISE_PATTERN =
  /\b(?:best|safest|most trusted|top[- ]rated|number one)\b/i;

const BUSINESS_IDENTITY_SIGNALS = [
  "kopi taman senja",
  "taman senja",
  "kts",
] as const;

function appearsIn(text: string) {
  const normalized = text.toLocaleLowerCase("id-ID");
  return BUSINESS_IDENTITY_SIGNALS.some((signal) =>
    normalized.includes(signal),
  );
}

function allSourceUrls(evidence = kopiTamanSenjaEvidence) {
  const urls: string[] = [];
  for (const observation of evidence.observations) {
    for (const source of observation.selected_observation.sources) {
      urls.push(source.url);
    }
  }
  return urls;
}

function allFixtureStrings() {
  const facts = kopiTamanSenjaFacts;
  const questions = kopiTamanSenjaQuestions;
  const evidence = kopiTamanSenjaEvidence;
  const strings: string[] = [
    facts.fact_version_id,
    facts.order_reference,
    facts.status,
    facts.business.name,
    facts.business.scope,
    facts.business.category.value,
    ...facts.business.category.suggestions,
    facts.business.short_description,
    ...facts.business.official_sources
      .map((source) => [source.url, source.type, source.label])
      .flat(),
    ...facts.products_services
      .map((item) => [item.value, item.provenance])
      .flat(),
    facts.customer_context.who,
    facts.customer_context.needs,
    facts.customer_context.considerations,
    facts.differentiator?.value ?? "",
    facts.comparison_business?.name ?? "",
    facts.comparison_business?.category ?? "",
    facts.comparison_business?.scope ?? "",
    facts.comparison_business?.source_url ?? "",
    facts.comparison_business?.reason ?? "",
    ...facts.warnings.flatMap((warning) => [
      warning.kind,
      warning.field,
      warning.message,
      ...warning.versions.flatMap((version) => [
        version.source_url,
        version.value,
      ]),
    ]),
    ...Object.values(facts.provenance_status).flat(),
    questions.question_pack_version_id,
    questions.order_reference,
    questions.fact_version_id,
    questions.status,
    questions.language,
    questions.generation.system,
    questions.generation.requested_model,
    questions.generation.returned_model,
    questions.generation.instruction_version,
    questions.generation.telemetry.pricing_version,
    ...questions.questions.flatMap((question) => [
      question.text,
      question.original_suggestion,
      question.suggested_category,
      question.final_classification,
    ]),
    evidence.evidence_set_version_id,
    evidence.order_reference,
    evidence.fact_version_id,
    evidence.question_pack_version_id,
    evidence.status,
    evidence.method_record.system,
    evidence.method_record.requested_model,
    evidence.method_record.returned_model,
    evidence.method_record.language,
    evidence.method_record.location.country,
    evidence.method_record.location.city,
    evidence.method_record.method_version,
    evidence.method_record.instruction_version,
    ...evidence.observations.flatMap((observation) => [
      observation.question,
      observation.classification,
      observation.appearance_classification,
      observation.selected_observation.raw_answer,
      observation.selected_observation.answer_excerpt,
      ...observation.selected_observation.sources.flatMap((source) => [
        source.url,
        source.title,
      ]),
    ]),
  ];
  return strings.filter(Boolean);
}

// ---------------------------------------------------------------------------
// Chain identity and versioning (R-43)
// ---------------------------------------------------------------------------

describe("fixture chain identity (NVA-FIKTIF-001)", () => {
  it("chains facts.v1 → questions.v1 → evidence.v1 under one order reference", () => {
    expect(kopiTamanSenjaChain.order_reference).toBe(
      KOPI_TAMAN_SENJA_ORDER_REFERENCE,
    );
    expect(kopiTamanSenjaFacts.fact_version_id).toBe(
      KOPI_TAMAN_SENJA_FACTS_VERSION_ID,
    );
    expect(kopiTamanSenjaQuestions.question_pack_version_id).toBe(
      KOPI_TAMAN_SENJA_QUESTIONS_VERSION_ID,
    );
    expect(kopiTamanSenjaQuestions.fact_version_id).toBe(
      kopiTamanSenjaFacts.fact_version_id,
    );
    expect(kopiTamanSenjaEvidence.evidence_set_version_id).toBe(
      KOPI_TAMAN_SENJA_EVIDENCE_VERSION_ID,
    );
    expect(kopiTamanSenjaEvidence.fact_version_id).toBe(
      kopiTamanSenjaFacts.fact_version_id,
    );
    expect(kopiTamanSenjaEvidence.question_pack_version_id).toBe(
      kopiTamanSenjaQuestions.question_pack_version_id,
    );
  });

  it("keeps the same order reference across all three records", () => {
    expect(kopiTamanSenjaFacts.order_reference).toBe(
      KOPI_TAMAN_SENJA_ORDER_REFERENCE,
    );
    expect(kopiTamanSenjaQuestions.order_reference).toBe(
      KOPI_TAMAN_SENJA_ORDER_REFERENCE,
    );
    expect(kopiTamanSenjaEvidence.order_reference).toBe(
      KOPI_TAMAN_SENJA_ORDER_REFERENCE,
    );
  });
});

// ---------------------------------------------------------------------------
// Evidence gate — 10/10 evaluable, none failed (AC-11, R-41)
// ---------------------------------------------------------------------------

describe("evidence gate — 10/10 evaluable", () => {
  it("has exactly ten observations with no failed test", () => {
    expect(kopiTamanSenjaEvidence.observations).toHaveLength(10);
    for (const observation of kopiTamanSenjaEvidence.observations) {
      expect(observation.run_status, `observation ${observation.order}`).toBe(
        "completed",
      );
      expect(observation.attempts.length).toBeGreaterThanOrEqual(1);
      for (const attempt of observation.attempts) {
        expect(attempt.status).toBe("completed");
        expect(attempt.telemetry.failure_reason).toBe("");
      }
    }
  });

  it("declares the 10/10 gate deterministically", () => {
    expect(kopiTamanSenjaEvidence.gate).toEqual({
      total: 10,
      evaluable: 10,
      failed: 0,
      passed: true,
    });
  });

  it("records one successful attempt per observation with cost/usage telemetry", () => {
    for (const observation of kopiTamanSenjaEvidence.observations) {
      expect(observation.attempts).toHaveLength(1);
      const attempt = observation.attempts[0];
      expect(attempt.telemetry.requested_model).toBe("gpt-5.6-luna");
      expect(attempt.telemetry.returned_model).toBe("gpt-5.6-luna");
      expect(attempt.telemetry.response_id).toBe(
        observation.selected_observation.response_id,
      );
      expect(attempt.telemetry.usage.total_tokens).toBeGreaterThan(0);
      expect(attempt.telemetry.accounted_cost_usd).toBeGreaterThanOrEqual(0);
      expect(attempt.telemetry.cost_basis).toBe("provider_usage");
    }
  });

  it("keeps every observation inside the recorded run window", () => {
    const { run } = kopiTamanSenjaEvidence;
    for (const observation of kopiTamanSenjaEvidence.observations) {
      const observedAt = Date.parse(
        observation.selected_observation.observed_at,
      );
      expect(observedAt).toBeGreaterThanOrEqual(Date.parse(run.started_at));
      expect(observedAt).toBeLessThanOrEqual(Date.parse(run.completed_at));
    }
  });
});

// ---------------------------------------------------------------------------
// AC-11 appearance counts — 8/10, 3/5, 5/5
// ---------------------------------------------------------------------------

describe("AC-11 appearance counts", () => {
  it("yields exactly 8/10 overall appearance", () => {
    const appeared = kopiTamanSenjaEvidence.observations.filter(
      (observation) => observation.dimensions.appearance === "mentioned",
    );
    expect(appeared).toHaveLength(8);

    const byClassification = kopiTamanSenjaEvidence.observations.filter(
      (observation) =>
        observation.appearance_classification !== "did_not_appear",
    );
    expect(byClassification).toHaveLength(8);
  });

  it("yields exactly 3/5 for Tanpa menyebut bisnis Anda", () => {
    const unbranded = kopiTamanSenjaEvidence.observations.filter(
      (observation) =>
        observation.classification === "tanpa_menyebut_bisnis_anda",
    );
    expect(unbranded).toHaveLength(COMPATIBILITY_COMPOSITION_COUNTS.unbranded);
    const appeared = unbranded.filter(
      (observation) => observation.dimensions.appearance === "mentioned",
    );
    expect(appeared).toHaveLength(3);
  });

  it("yields exactly 5/5 for Menyebut bisnis Anda", () => {
    const branded = kopiTamanSenjaEvidence.observations.filter(
      (observation) => observation.classification === "menyebut_bisnis_anda",
    );
    expect(branded).toHaveLength(COMPATIBILITY_COMPOSITION_COUNTS.branded);
    const appeared = branded.filter(
      (observation) => observation.dimensions.appearance === "mentioned",
    );
    expect(appeared).toHaveLength(5);
  });

  it("matches appearance classification to the visible retained answer", () => {
    for (const observation of kopiTamanSenjaEvidence.observations) {
      const raw = observation.selected_observation.raw_answer;
      const namePresent = appearsIn(raw);
      if (
        observation.dimensions.appearance === "mentioned" ||
        observation.appearance_classification !== "did_not_appear"
      ) {
        expect(
          namePresent,
          `observation ${observation.order} claims appearance but the retained answer does not visibly name the business`,
        ).toBe(true);
      } else {
        expect(
          namePresent,
          `observation ${observation.order} claims absence but the retained answer visibly names the business`,
        ).toBe(false);
      }
    }
  });

  it("matches report arithmetic through matrix-owned assessment classes (C.4)", () => {
    const records = kopiTamanSenjaEvidence.observations.map((observation) => {
      const slot = measurementSlotForOrder(observation.order);
      if (!slot)
        throw new Error(`Missing canonical slot for ${observation.order}`);
      return { observation, slot };
    });
    const recordsFor = (
      assessmentClass: "recommendation" | "comparison" | "information",
    ) =>
      records.filter(
        ({ observation, slot }) =>
          slot.compatibilityReportAssessmentClass === assessmentClass &&
          observation.dimensions.appearance === "mentioned",
      );
    const recommendationAssessed = recordsFor("recommendation").filter(
      ({ observation }) =>
        observation.dimensions.recommendation === "recommended" ||
        observation.dimensions.recommendation === "not_recommended",
    );
    expect(recommendationAssessed).toHaveLength(2);
    expect(
      recommendationAssessed.filter(
        ({ observation }) =>
          observation.dimensions.recommendation === "recommended",
      ),
    ).toHaveLength(1);

    const comparisonAssessed = recordsFor("comparison").filter(
      ({ observation }) =>
        observation.dimensions.comparison === "client_preferred" ||
        observation.dimensions.comparison === "competitor_preferred" ||
        observation.dimensions.comparison === "compared_no_preference",
    );
    expect(comparisonAssessed).toHaveLength(2);
    expect(
      comparisonAssessed.filter(
        ({ observation }) =>
          observation.dimensions.comparison === "client_preferred",
      ),
    ).toHaveLength(1);

    const informationAssessed = recordsFor("information").filter(
      ({ observation }) =>
        observation.dimensions.information === "confirmed" ||
        observation.dimensions.information === "incomplete" ||
        observation.dimensions.information === "conflicting",
    );
    expect(informationAssessed).toHaveLength(4);
  });

  it("keeps current slot text and evidence on compatibility paths", () => {
    const byOrder = new Map(
      kopiTamanSenjaEvidence.observations.map((observation) => [
        observation.order,
        observation,
      ]),
    );
    const slotFor = (order: number) => {
      const slot = measurementSlotForOrder(order);
      if (!slot) throw new Error(`Missing matrix slot ${order}`);
      return slot;
    };

    const comparisonSlot = slotFor(6);
    expect(comparisonSlot).toMatchObject({
      category: "open_comparison",
      reportAssessmentClass: "comparison",
      compatibilityReportAssessmentClass: "comparison",
    });
    expect(byOrder.get(6)?.question).toContain("vs Kopi Ruang Pagi");
    expect(byOrder.get(6)?.dimensions.comparison).toBe("client_preferred");

    const hoursSlot = slotFor(8);
    expect(hoursSlot).toMatchObject({
      category: "explicit_recommendation",
      reportAssessmentClass: "recommendation",
      compatibilityReportAssessmentClass: "information",
    });
    expect(byOrder.get(8)?.question).toContain("Buka jam berapa");
    expect(byOrder.get(8)?.dimensions.information).toBe("conflicting");

    const contactSlot = slotFor(9);
    expect(contactSlot).toMatchObject({
      category: "direct_comparison",
      reportAssessmentClass: "comparison",
      compatibilityReportAssessmentClass: "information",
    });
    expect(byOrder.get(9)?.question).toContain("kontak");
    expect(byOrder.get(9)?.dimensions.information).toBe("confirmed");

    const facilitySlot = slotFor(10);
    expect(facilitySlot).toMatchObject({
      category: "fit_misfit",
      reportAssessmentClass: "recommendation",
      compatibilityReportAssessmentClass: "information",
    });
    expect(byOrder.get(10)?.question).toContain("parkiran");
    expect(byOrder.get(10)?.dimensions.information).toBe("incomplete");
  });
});

// ---------------------------------------------------------------------------
// Question pack compliance (R-37) — distinctness, identity leakage, premises
// ---------------------------------------------------------------------------

describe("question pack compliance (R-37)", () => {
  it("holds exactly ten distinct questions in final order", () => {
    const texts = kopiTamanSenjaQuestions.questions.map(
      (question) => question.text,
    );
    expect(texts).toHaveLength(10);
    expect(new Set(texts).size).toBe(10);
    expect(kopiTamanSenjaQuestions.questions.map((q) => q.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  it("classifies from final text using the matrix-derived 5/5 compatibility counts", () => {
    const { questions } = kopiTamanSenjaQuestions;
    const unbranded = questions.filter(
      (question) =>
        question.final_classification === "tanpa_menyebut_bisnis_anda",
    );
    const branded = questions.filter(
      (question) => question.final_classification === "menyebut_bisnis_anda",
    );
    expect(unbranded).toHaveLength(COMPATIBILITY_COMPOSITION_COUNTS.unbranded);
    expect(branded).toHaveLength(COMPATIBILITY_COMPOSITION_COUNTS.branded);
    expect(
      unbranded.every(
        (question) =>
          question.final_classification === "tanpa_menyebut_bisnis_anda",
      ),
    ).toBe(true);
    expect(
      branded.every(
        (question) => question.final_classification === "menyebut_bisnis_anda",
      ),
    ).toBe(true);
    for (const question of questions) {
      const mentionsBusiness = question.text.includes(
        KOPI_TAMAN_SENJA_BUSINESS_NAME,
      );
      expect(question.final_classification).toBe(
        mentionsBusiness
          ? "menyebut_bisnis_anda"
          : "tanpa_menyebut_bisnis_anda",
      );
    }
    expect(kopiTamanSenjaQuestions.classification_summary).toEqual({
      total: 10,
      tanpa_menyebut_bisnis_anda: COMPATIBILITY_COMPOSITION_COUNTS.unbranded,
      menyebut_bisnis_anda: COMPATIBILITY_COMPOSITION_COUNTS.branded,
    });
  });

  it("leaks no business identity in the five unbranded questions", () => {
    for (const question of kopiTamanSenjaQuestions.questions.filter(
      (q) => q.final_classification === "tanpa_menyebut_bisnis_anda",
    )) {
      expect(
        appearsIn(question.text),
        `unbranded question leaks the business identity: ${question.text}`,
      ).toBe(false);
      expect(
        question.text
          .toLocaleLowerCase("id-ID")
          .includes(
            KOPI_TAMAN_SENJA_COMPARISON_BUSINESS_NAME.toLocaleLowerCase(
              "id-ID",
            ),
          ),
        `unbranded question names the comparison business: ${question.text}`,
      ).toBe(false);
    }
  });

  it("contains no unsupported-premise wording", () => {
    for (const question of kopiTamanSenjaQuestions.questions) {
      expect(
        UNSUPPORTED_PREMISE_PATTERN.test(question.text),
        `unsupported premise in question ${question.order}: ${question.text}`,
      ).toBe(false);
    }
  });

  it("replays the exact approved pack verbatim into the evidence", () => {
    const packQuestions = kopiTamanSenjaQuestions.questions;
    expect(kopiTamanSenjaEvidence.observations).toHaveLength(
      packQuestions.length,
    );
    kopiTamanSenjaEvidence.observations.forEach((observation, index) => {
      const packQuestion: IndonesianQuestion = packQuestions[index];
      expect(observation.order).toBe(packQuestion.order);
      expect(observation.question).toBe(packQuestion.text);
      expect(observation.classification).toBe(
        packQuestion.final_classification,
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Source URLs — reserved .example domains only
// ---------------------------------------------------------------------------

describe("source URLs", () => {
  it("uses only .example domains across the whole chain", () => {
    const urls = allSourceUrls();
    expect(urls.length).toBeGreaterThanOrEqual(10);
    for (const url of urls) {
      const parsed = new URL(url);
      expect(parsed.protocol).toBe("https:");
      expect(parsed.hostname.endsWith(".example")).toBe(true);
    }
    for (const source of kopiTamanSenjaFacts.business.official_sources) {
      expect(new URL(source.url).hostname.endsWith(".example")).toBe(true);
    }
    expect(
      new URL(
        kopiTamanSenjaFacts.comparison_business!.source_url,
      ).hostname.endsWith(".example"),
    ).toBe(true);
    for (const warning of kopiTamanSenjaFacts.warnings) {
      for (const version of warning.versions) {
        expect(new URL(version.source_url).hostname.endsWith(".example")).toBe(
          true,
        );
      }
    }
  });

  it("attaches at least one source to every retained answer", () => {
    for (const observation of kopiTamanSenjaEvidence.observations) {
      expect(
        observation.selected_observation.sources.length,
        `observation ${observation.order} has no sources`,
      ).toBeGreaterThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Evidence exactness — excerpts copied verbatim from the retained answer
// ---------------------------------------------------------------------------

describe("evidence exactness", () => {
  it("copies every answer excerpt exactly from its raw answer", () => {
    for (const observation of kopiTamanSenjaEvidence.observations) {
      const raw = normalizeWhitespace(
        observation.selected_observation.raw_answer,
      );
      const excerpt = normalizeWhitespace(
        observation.selected_observation.answer_excerpt,
      );
      expect(
        raw.includes(excerpt),
        `observation ${observation.order} excerpt is not an exact substring of the raw answer`,
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Reconciled fiction — one comparison business, one hours pair (AC-11)
// ---------------------------------------------------------------------------

describe("reconciled fiction", () => {
  it("uses Kopi Ruang Pagi as the one comparison business everywhere", () => {
    expect(kopiTamanSenjaFacts.comparison_business?.name).toBe(
      KOPI_TAMAN_SENJA_COMPARISON_BUSINESS_NAME,
    );
    expect(kopiTamanSenjaFacts.comparison_business?.scope).toBe(
      "Dago, Bandung",
    );
    expect(kopiTamanSenjaFacts.comparison_business?.source_url).toBe(
      "https://kopiruangpagi.example",
    );

    const comparisonSlot = AUDIT_MEASUREMENT_MATRIX.find(
      (slot) => slot.legacyComparisonTargetIdentity === "required",
    );
    if (!comparisonSlot)
      throw new Error("Missing compatibility comparison slot.");
    const comparisonQuestion = kopiTamanSenjaQuestions.questions.find(
      (question) => question.order === comparisonSlot.order,
    );
    if (!comparisonQuestion) throw new Error("Missing comparison question.");
    expect(comparisonQuestion.text).toContain(
      KOPI_TAMAN_SENJA_COMPARISON_BUSINESS_NAME,
    );

    const comparisonAnswer = kopiTamanSenjaEvidence.observations.find(
      (observation) => observation.order === comparisonSlot.order,
    )?.selected_observation.raw_answer;
    if (!comparisonAnswer) throw new Error("Missing comparison observation.");
    expect(comparisonAnswer).toContain(
      KOPI_TAMAN_SENJA_COMPARISON_BUSINESS_NAME,
    );

    // The superseded 06-sample comparator name must not appear anywhere.
    for (const value of allFixtureStrings()) {
      expect(value).not.toContain("Kopi Purnama");
      expect(value).not.toContain("kopipurnama");
    }
  });

  it("uses the reconciled hours pair 08.00–21.00 vs 09.00–20.00", () => {
    expect(KOPI_TAMAN_SENJA_OPENING_HOURS_CONFLICT).toEqual({
      official_website: "08.00–21.00",
      directory: "09.00–20.00",
    });

    const warning = kopiTamanSenjaFacts.warnings.find(
      (item) =>
        item.kind === "source_conflict" && item.field === "opening_hours",
    );
    expect(warning).toBeDefined();
    expect(warning!.versions).toHaveLength(2);
    expect(warning!.versions[0]).toEqual({
      source_url: "https://kopitamansenja.example",
      value: "08.00–21.00",
    });
    expect(warning!.versions[1]).toEqual({
      source_url: "https://maps.example/kopi-taman-senja",
      value: "09.00–20.00",
    });
    expect(warning!.message).toContain("08.00–21.00");
    expect(warning!.message).toContain("09.00–20.00");

    const hoursAnswer =
      kopiTamanSenjaEvidence.observations[7].selected_observation.raw_answer;
    expect(hoursAnswer).toContain("08.00–21.00");
    expect(hoursAnswer).toContain("09.00–20.00");

    // Superseded 06-sample hours must not appear anywhere.
    for (const value of allFixtureStrings()) {
      expect(value).not.toContain("08:00");
      expect(value).not.toContain("22:00");
    }
  });

  it("names the audited business consistently across the chain", () => {
    expect(kopiTamanSenjaFacts.business.name).toBe(
      KOPI_TAMAN_SENJA_BUSINESS_NAME,
    );
    expect(kopiTamanSenjaFacts.business.scope).toBe("Dago, Bandung");
    const mentionsBusiness = kopiTamanSenjaEvidence.observations.filter(
      (observation) => observation.dimensions.appearance === "mentioned",
    );
    for (const observation of mentionsBusiness) {
      expect(observation.selected_observation.raw_answer).toContain(
        KOPI_TAMAN_SENJA_BUSINESS_NAME,
      );
    }
  });
});
