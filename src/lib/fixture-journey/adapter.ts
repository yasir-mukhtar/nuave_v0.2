/**
 * Thin presentation projection of the frozen Indonesian fixture chain
 * (NVA-FIKTIF-001, fictional "Kopi Taman Senja").
 *
 * Every displayed identity, fact, question, evidence value, and report
 * measure comes from the frozen chain in
 * `../audit/fixtures/fixture-kopi-taman-senja.ts` (Spec 002 R-02, R-43).
 * This adapter is the only place that arranges those values for the
 * fixture-journey screens and report; page components must not keep a second
 * hand-copied business, question, or report fixture. Facts and questions
 * remain read-only in this phase.
 *
 * The report model (`AuditReport`) is built through the existing audited
 * report contracts (see `../fixture-journey/report.ts`). The frozen chain
 * uses the additive Indonesian handoff records, so this adapter projects
 * them into the existing English report model shapes:
 *
 *   - `kopiTamanSenjaBrief`        -> BusinessBrief (schema-compatible;
 *                                     `language` stays "en-US" because that
 *                                     literal is part of the existing schema)
 *   - `kopiTamanSenjaPrompts`      -> AuditPrompt[]
 *   - `kopiTamanSenjaObservations` -> AuditObservation[]
 *   - `kopiTamanSenjaReportContent`-> ReportContent with evidence-led
 *                                     Indonesian conclusion, findings, and
 *                                     actions derived strictly from the
 *                                     frozen evidence (the additive export;
 *                                     see the note below)
 *
 * PROJECTION NOTE: the frozen Indonesian evidence records
 * `recommendation: "not_assessed"` for observations 07-10. Those values pass
 * through unchanged. Report aggregation resolves each observation to its
 * matrix slot and counts only the dimension declared by that slot's
 * `reportAssessmentClass`; the frozen dimensions themselves are never
 * modified.
 */
import type {
  AuditObservation,
  AuditPrompt,
  BusinessBrief,
  ReportContent,
} from "../audit/types";
import type { EvidenceDimensions } from "../audit/fixtures/fixture-kopi-taman-senja";
import {
  AUDIT_MEASUREMENT_MATRIX,
  COMPATIBILITY_COMPOSITION_COUNTS,
  measurementSlotForOrder,
  measurementSlotsForAssessmentClass,
} from "../audit/measurement-matrix";
import {
  KOPI_TAMAN_SENJA_BUSINESS_NAME,
  KOPI_TAMAN_SENJA_COMPARISON_BUSINESS_NAME,
  KOPI_TAMAN_SENJA_ORDER_REFERENCE,
  kopiTamanSenjaEvidence,
  kopiTamanSenjaFacts,
  kopiTamanSenjaQuestions,
  type IndonesianEvidenceObservation,
  type ProvenanceLabel,
} from "../audit/fixtures/fixture-kopi-taman-senja";

export { KOPI_TAMAN_SENJA_BUSINESS_NAME as FIXTURE_BUSINESS_NAME };
export { KOPI_TAMAN_SENJA_ORDER_REFERENCE as FIXTURE_ORDER_REFERENCE };

// ---------------------------------------------------------------------------
// Provenance labels (VOICE.md §7.2 exact labels)
// ---------------------------------------------------------------------------

export const provenanceLabelText: Record<ProvenanceLabel, string> = {
  found_website: "Ditemukan di website",
  found_google_maps: "Ditemukan di Google Maps",
  found_instagram: "Ditemukan di Instagram",
  suggestion_nuave: "Saran Nuave",
  customer_supplied: "Ditambahkan oleh Anda",
  needs_review: "Perlu diperiksa",
};

// ---------------------------------------------------------------------------
// Journey context for the fixture screens (one fixture source only)
// ---------------------------------------------------------------------------

const facts = kopiTamanSenjaFacts;
const questions = kopiTamanSenjaQuestions;
const evidence = kopiTamanSenjaEvidence;

export const fixtureJourneyContext = {
  orderReference: KOPI_TAMAN_SENJA_ORDER_REFERENCE,
  business: {
    name: facts.business.name,
    scope: facts.business.scope,
    category: facts.business.category.value,
    categorySuggestions: facts.business.category.suggestions,
    shortDescription: facts.business.short_description,
    officialSources: facts.business.official_sources,
    productsServices: facts.products_services,
    customerContext: facts.customer_context,
    differentiator: facts.differentiator,
    comparisonBusiness: facts.comparison_business,
    warnings: facts.warnings,
    provenanceStatus: facts.provenance_status,
    factVersionId: facts.fact_version_id,
  },
  offer: {
    /** The one approved total, with no added tax or fee (R-08/R-09). */
    totalLabel: "Rp99.000",
    totalNumeric: 99_000,
    quoteDays: 30,
    scopeLabel: "Satu audit",
  },
  questions: {
    all: questions.questions,
    unbranded: questions.questions.filter(
      (question) =>
        question.final_classification === "tanpa_menyebut_bisnis_anda",
    ),
    branded: questions.questions.filter(
      (question) => question.final_classification === "menyebut_bisnis_anda",
    ),
    counts: questions.classification_summary,
    versionId: questions.question_pack_version_id,
    generation: {
      system: questions.generation.system,
      model: questions.generation.returned_model,
    },
  },
  evidence: {
    observations: evidence.observations,
    methodRecord: evidence.method_record,
    run: evidence.run,
    gate: evidence.gate,
    versionId: evidence.evidence_set_version_id,
  },
} as const;

/** Plain-language explanation of the two question classes (Indonesian). */
export const questionClassExplanations = {
  unbranded: {
    label: "Tanpa menyebut bisnis Anda",
    detail: `${COMPATIBILITY_COMPOSITION_COUNTS.unbranded} pertanyaan ini tidak menyebut nama ${KOPI_TAMAN_SENJA_BUSINESS_NAME}. Pertanyaan ini meniru yang diketik calon pelanggan saat mencari kedai kopi di Dago, Bandung, dan menguji apakah bisnis muncul tanpa nama disebut.`,
  },
  branded: {
    label: "Menyebut bisnis Anda",
    detail: `${COMPATIBILITY_COMPOSITION_COUNTS.branded} pertanyaan ini menyebut nama ${KOPI_TAMAN_SENJA_BUSINESS_NAME}. Pertanyaan ini menguji apa yang dikatakan model AI tentang bisnis saat calon pelanggan sudah mengenalnya, yaitu apakah informasinya akurat, konsisten, dan mudah digunakan.`,
  },
} as const;

/**
 * Project the frozen dimensions onto the one assessment path declared by the
 * canonical matrix. Raw evidence remains available above; this projection is
 * the report/UI boundary and prevents a legacy category from deciding which
 * dimension is customer-facing.
 */
function reportDimensionsForObservation(
  observation: IndonesianEvidenceObservation,
): EvidenceDimensions {
  const slot = measurementSlotForFixtureOrder(observation.order);
  const { appearance } = observation.dimensions;
  switch (slot.reportAssessmentClass) {
    case "recommendation":
      return {
        appearance,
        recommendation:
          appearance === "mentioned"
            ? observation.dimensions.recommendation
            : "not_assessed",
        comparison: "not_observed",
        information: "not_assessed",
      };
    case "comparison":
      return {
        appearance,
        recommendation: "not_assessed",
        comparison:
          appearance === "mentioned"
            ? observation.dimensions.comparison
            : "not_observed",
        information: "not_assessed",
      };
    case "information":
      return {
        appearance,
        recommendation: "not_assessed",
        comparison: "not_observed",
        information:
          appearance === "mentioned"
            ? observation.dimensions.information
            : "not_assessed",
      };
    case "none":
      return {
        appearance,
        recommendation: "not_assessed",
        comparison: "not_observed",
        information: "not_assessed",
      };
  }
}

function resultLabelForObservation(
  observation: IndonesianEvidenceObservation,
): string {
  const dimensions = reportDimensionsForObservation(observation);
  if (dimensions.appearance === "absent")
    return "Tidak muncul dalam jawaban ini";
  const slot = measurementSlotForFixtureOrder(observation.order);
  switch (slot.reportAssessmentClass) {
    case "recommendation":
      if (dimensions.recommendation === "recommended")
        return "Disebut dan direkomendasikan";
      if (dimensions.recommendation === "not_recommended")
        return "Disebut tanpa direkomendasikan";
      return "Disebut, tanpa penilaian rekomendasi";
    case "comparison":
      if (dimensions.comparison === "client_preferred")
        return "Diunggulkan dalam perbandingan";
      if (dimensions.comparison === "competitor_preferred")
        return "Bisnis lain diunggulkan dalam perbandingan";
      if (dimensions.comparison === "compared_no_preference")
        return "Dibandingkan tanpa pilihan unggulan";
      return "Disebut, tanpa penilaian perbandingan";
    case "information":
      if (dimensions.information === "confirmed")
        return "Disebut, informasi terkonfirmasi";
      if (dimensions.information === "incomplete")
        return "Disebut, informasi belum lengkap";
      if (dimensions.information === "conflicting")
        return "Disebut, informasi bertentangan";
      return "Disebut, tanpa penilaian informasi";
    case "none":
      return "Disebut";
  }
}

/** Indonesian result label for one frozen observation row. */
export function fixtureObservationResultLabel(order: number): string {
  const observation = evidence.observations.find(
    (item) => item.order === order,
  );
  return observation
    ? resultLabelForObservation(observation)
    : "Tidak tersedia";
}

/** Composition label (settled exact label) for a frozen observation. */
export function fixtureObservationCompositionLabel(order: number): string {
  const observation = evidence.observations.find(
    (item) => item.order === order,
  );
  if (!observation) return "Tanpa menyebut bisnis Anda";
  return observation.classification === "menyebut_bisnis_anda"
    ? "Menyebut bisnis Anda"
    : "Tanpa menyebut bisnis Anda";
}

export function questionPackIsBalanced(): boolean {
  return (
    questions.questions.length === AUDIT_MEASUREMENT_MATRIX.length &&
    questions.questions.filter(
      (question) =>
        question.final_classification === "tanpa_menyebut_bisnis_anda",
    ).length === COMPATIBILITY_COMPOSITION_COUNTS.unbranded &&
    questions.questions.filter(
      (question) => question.final_classification === "menyebut_bisnis_anda",
    ).length === COMPATIBILITY_COMPOSITION_COUNTS.branded
  );
}

// ---------------------------------------------------------------------------
// Assessed-denominator measures, derived from the frozen dimensions only
// (AC-11, AC-26: eligible denominators; empty denominator renders "Tidak diuji")
// ---------------------------------------------------------------------------

const recommendationAssessedValues: EvidenceDimensions["recommendation"][] = [
  "recommended",
  "not_recommended",
];
const comparisonAssessedValues: EvidenceDimensions["comparison"][] = [
  "client_preferred",
  "competitor_preferred",
  "compared_no_preference",
];
const informationAssessedValues: EvidenceDimensions["information"][] = [
  "confirmed",
  "incomplete",
  "conflicting",
];

export const kopiTamanSenjaMeasures = (() => {
  const observations = evidence.observations;
  const records = observations.map((observation) => ({
    observation,
    slot: measurementSlotForFixtureOrder(observation.order),
  }));
  const appeared = (observation: IndonesianEvidenceObservation) =>
    observation.dimensions.appearance === "mentioned";
  const unbranded = records.filter(
    ({ observation }) =>
      observation.classification === "tanpa_menyebut_bisnis_anda",
  );
  const branded = records.filter(
    ({ observation }) => observation.classification === "menyebut_bisnis_anda",
  );
  const recommendationSlotIds = new Set(
    measurementSlotsForAssessmentClass("recommendation").map((slot) => slot.id),
  );
  const comparisonSlotIds = new Set(
    measurementSlotsForAssessmentClass("comparison").map((slot) => slot.id),
  );
  const informationSlotIds = new Set(
    measurementSlotsForAssessmentClass("information").map((slot) => slot.id),
  );
  const recommendation = records.filter(
    ({ observation, slot }) =>
      recommendationSlotIds.has(slot.id) &&
      appeared(observation) &&
      recommendationAssessedValues.includes(
        observation.dimensions.recommendation,
      ),
  );
  const comparison = records.filter(
    ({ observation, slot }) =>
      comparisonSlotIds.has(slot.id) &&
      appeared(observation) &&
      comparisonAssessedValues.includes(observation.dimensions.comparison),
  );
  const information = records.filter(
    ({ observation, slot }) =>
      informationSlotIds.has(slot.id) &&
      appeared(observation) &&
      informationAssessedValues.includes(observation.dimensions.information),
  );
  return {
    overall: {
      appeared: records.filter(({ observation }) => appeared(observation))
        .length,
      total: observations.length,
    },
    unbranded: {
      appeared: unbranded.filter(({ observation }) => appeared(observation))
        .length,
      total: unbranded.length,
    },
    branded: {
      appeared: branded.filter(({ observation }) => appeared(observation))
        .length,
      total: branded.length,
    },
    recommendation: {
      recommended: recommendation.filter(
        ({ observation }) =>
          observation.dimensions.recommendation === "recommended",
      ).length,
      assessed: recommendation.length,
    },
    comparison: {
      clientPreferred: comparison.filter(
        ({ observation }) =>
          observation.dimensions.comparison === "client_preferred",
      ).length,
      assessed: comparison.length,
    },
    information: {
      confirmed: information.filter(
        ({ observation }) => observation.dimensions.information === "confirmed",
      ).length,
      incomplete: information.filter(
        ({ observation }) =>
          observation.dimensions.information === "incomplete",
      ).length,
      conflicting: information.filter(
        ({ observation }) =>
          observation.dimensions.information === "conflicting",
      ).length,
      assessed: information.length,
    },
  };
})();

/** Recorded run facts used by the method section (R-42). */
export const kopiTamanSenjaMethod = {
  system: evidence.method_record.system,
  requestedModel: evidence.method_record.requested_model,
  returnedModel: evidence.method_record.returned_model,
  language: evidence.method_record.language,
  location: evidence.method_record.location,
  webSearchRequired: evidence.method_record.web_search_required,
  methodVersion: evidence.method_record.method_version,
  runStartedAt: evidence.run.started_at,
  runCompletedAt: evidence.run.completed_at,
  retries: evidence.observations
    .flatMap((observation) => observation.attempts)
    .filter((attempt) => attempt.attempt > 1).length,
  questionGeneration: {
    system: questions.generation.system,
    model: questions.generation.returned_model,
  },
} as const;

// ---------------------------------------------------------------------------
// Projection into the existing report model shapes
// ---------------------------------------------------------------------------

const promptIdOf = (order: number) =>
  `${KOPI_TAMAN_SENJA_ORDER_REFERENCE}-Q${String(order).padStart(2, "0")}`;

function measurementSlotForFixtureOrder(order: number) {
  const slot = measurementSlotForOrder(order);
  if (!slot) {
    throw new Error(
      `Fixture question ${order} has no canonical measurement slot.`,
    );
  }
  return slot;
}

/** The fixture pack projected into the existing AuditPrompt shape. */
export const kopiTamanSenjaPrompts: AuditPrompt[] = questions.questions.map(
  (question) => {
    const slot = measurementSlotForFixtureOrder(question.order);
    return {
      prompt_id: promptIdOf(question.order),
      // AuditPrompt remains a legacy-shaped compatibility record until A3;
      // all report meaning below comes from the canonical slot.
      category: slot.legacyCategory,
      role: slot.generatorSlotDescription,
      branded: question.final_classification === "menyebut_bisnis_anda",
      question: question.text,
      rationale: slot.measurementPurpose,
      inputs_used: [...slot.allowedContextFields],
      review_status: "needs_human_review",
    };
  },
);

/** The fixture observations projected into the existing AuditObservation shape. */
export const kopiTamanSenjaObservations: AuditObservation[] =
  evidence.observations.map((observation) => {
    const attempt = observation.attempts[0];
    const slot = measurementSlotForFixtureOrder(observation.order);
    return {
      prompt_id: promptIdOf(observation.order),
      category: slot.legacyCategory,
      branded: observation.classification === "menyebut_bisnis_anda",
      question: observation.question,
      system: evidence.method_record.system,
      requested_model: attempt?.telemetry.requested_model ?? "not recorded",
      returned_model: attempt?.telemetry.returned_model ?? "not recorded",
      response_id: observation.selected_observation.response_id,
      observed_at: observation.selected_observation.observed_at,
      raw_answer: observation.selected_observation.raw_answer,
      sources: observation.selected_observation.sources,
      // Projected from the frozen record, not hardcoded, so a future frozen
      // fixture that records a failed test is never silently converted into
      // a success (adversarial review Finding 11).
      run_status: observation.run_status,
      failure_reason: "",
      telemetry: [],
    };
  });

/** The fixture facts projected into the existing BusinessBrief shape. */
export const kopiTamanSenjaBrief: BusinessBrief = {
  brand_name: facts.business.name,
  entity_scope: facts.business.scope,
  brand_type: `${facts.business.category.value} dan ruang kerja`,
  category: facts.business.category.value,
  market_context: "Bandung",
  target_customer: facts.customer_context.who,
  official_sources: facts.business.official_sources.map((source) => source.url),
  verified_offerings: facts.products_services.map((item) => item.value),
  verified_customer_needs: [facts.customer_context.needs],
  verified_decision_criteria: [facts.customer_context.considerations],
  verified_competitor: {
    name: facts.comparison_business?.name ?? "",
    scope: facts.comparison_business?.scope ?? "",
    source_url:
      facts.comparison_business?.source_url ?? "https://example.invalid",
  },
  brand_name_variants: [],
  priority_offering: facts.products_services[0]?.value ?? "",
  conversion_action: "",
  customer_supplied_facts: [],
  known_accuracy_questions: facts.warnings.map((warning) => warning.message),
  usp: facts.differentiator?.value ?? "",
  regulated_category_notes: "",
  language: "en-US",
  agency_name: "",
  agency_logo_data_url: "",
};

// ---------------------------------------------------------------------------
// Evidence-led Indonesian report content (the additive export)
// ---------------------------------------------------------------------------
//
// The frozen chain does not export conclusion/findings/actions, so they are
// derived here, STRICTLY from the frozen evidence: no invented claims, no
// superiority/ranking/guarantee/forecast language, no praise. Every finding
// and action references the exact frozen observations that support it, and
// the arithmetic follows `kopiTamanSenjaMeasures`; composition totals remain
// the matrix-derived 5/5 compatibility projection until A3.
// ---------------------------------------------------------------------------

/** Indonesian, evidence-led finding text for one observation row. */
export function detailCopyFor(observation: IndonesianEvidenceObservation): {
  finding: string;
  evidence_note: string;
} {
  const dimensions = reportDimensionsForObservation(observation);
  if (dimensions.appearance === "absent") {
    return {
      finding: "Kopi Taman Senja tidak muncul dalam jawaban ini.",
      evidence_note: "Jawaban yang disimpan tidak menyebut bisnis.",
    };
  }
  switch (
    measurementSlotForFixtureOrder(observation.order).reportAssessmentClass
  ) {
    case "recommendation":
      if (dimensions.recommendation === "recommended") {
        return {
          finding: "Jawaban menyebut dan merekomendasikan Kopi Taman Senja.",
          evidence_note:
            "Jawaban yang disimpan memuat rekomendasi untuk bisnis.",
        };
      }
      if (dimensions.recommendation === "not_recommended") {
        return {
          finding: "Bisnis disebut tanpa direkomendasikan dalam jawaban ini.",
          evidence_note: "Jawaban yang disimpan memuat penyebutan bisnis.",
        };
      }
      return {
        finding:
          "Bisnis disebut, tetapi rekomendasi belum dapat dinilai dari jawaban ini.",
        evidence_note:
          "Jawaban yang disimpan tidak memuat penilaian rekomendasi.",
      };
    case "comparison":
      if (dimensions.comparison === "client_preferred") {
        return {
          finding:
            "Perbandingan dalam jawaban ini mengunggulkan Kopi Taman Senja.",
          evidence_note:
            "Jawaban yang disimpan membandingkan bisnis dengan target perbandingan.",
        };
      }
      if (dimensions.comparison === "competitor_preferred") {
        return {
          finding: "Perbandingan dalam jawaban ini mengunggulkan bisnis lain.",
          evidence_note:
            "Jawaban yang disimpan membandingkan bisnis dengan target perbandingan.",
        };
      }
      if (dimensions.comparison === "compared_no_preference") {
        return {
          finding:
            "Jawaban membandingkan pilihan tanpa menetapkan pilihan unggulan.",
          evidence_note:
            "Jawaban yang disimpan memuat perbandingan tanpa preferensi.",
        };
      }
      return {
        finding:
          "Bisnis disebut, tetapi penilaian perbandingan belum tersedia.",
        evidence_note:
          "Jawaban yang disimpan tidak memuat penilaian perbandingan.",
      };
    case "information":
      if (dimensions.information === "confirmed") {
        return {
          finding: "Jawaban memuat informasi publik yang terkonfirmasi.",
          evidence_note:
            "Jawaban yang disimpan mendukung informasi publik tersebut.",
        };
      }
      if (dimensions.information === "incomplete") {
        return {
          finding: "Jawaban menemukan informasi publik yang belum lengkap.",
          evidence_note:
            "Jawaban yang disimpan memuat informasi yang belum lengkap.",
        };
      }
      if (dimensions.information === "conflicting") {
        return {
          finding: "Jawaban melaporkan informasi publik yang bertentangan.",
          evidence_note: "Jawaban yang disimpan menyebut perbedaan informasi.",
        };
      }
      return {
        finding: "Bisnis disebut, tetapi informasi publik belum dapat dinilai.",
        evidence_note:
          "Jawaban yang disimpan tidak memuat penilaian informasi.",
      };
    case "none":
      return {
        finding: "Bisnis disebut dalam jawaban ini.",
        evidence_note: "Jawaban yang disimpan memuat penyebutan bisnis.",
      };
  }
}

/**
 * The frozen evidence projected into the existing ReportContent shape.
 * Deterministic: no timestamp, model, or provider involvement.
 */
export function kopiTamanSenjaReportContent(): ReportContent {
  const details: ReportContent["details"] = evidence.observations.map(
    (observation) => {
      const copy = detailCopyFor(observation);
      const dimensions = reportDimensionsForObservation(observation);
      return {
        prompt_id: promptIdOf(observation.order),
        run: observation.run_status,
        ...dimensions,
        finding: copy.finding,
        answer_excerpt: observation.selected_observation.answer_excerpt,
        evidence_note: copy.evidence_note,
        source_urls: observation.selected_observation.sources.map(
          (source) => source.url,
        ),
      };
    },
  );

  return {
    conclusion: `Sepuluh pertanyaan diuji dengan model AI. Kopi Taman Senja muncul di ${kopiTamanSenjaMeasures.overall.appeared} dari ${kopiTamanSenjaMeasures.overall.total} jawaban. Saat pertanyaan tidak menyebut nama, bisnis muncul di ${kopiTamanSenjaMeasures.unbranded.appeared} dari ${kopiTamanSenjaMeasures.unbranded.total} jawaban. Saat nama disebut, muncul di ${kopiTamanSenjaMeasures.branded.appeared} dari ${kopiTamanSenjaMeasures.branded.total} jawaban. Dari slot yang memang menguji rekomendasi, bisnis direkomendasikan di ${kopiTamanSenjaMeasures.recommendation.recommended} dari ${kopiTamanSenjaMeasures.recommendation.assessed} penilaian.`,
    accuracy_status: "no_clear_issues",
    observed_competitors: [
      {
        name: KOPI_TAMAN_SENJA_COMPARISON_BUSINESS_NAME,
        relationship: "mentioned",
        evidence_prompt_ids: [1, 3, 5, 6].map(promptIdOf),
      },
    ],
    key_findings: [
      {
        title: `Kemunculan tanpa nama di ${kopiTamanSenjaMeasures.unbranded.appeared} dari ${kopiTamanSenjaMeasures.unbranded.total} pertanyaan`,
        explanation: `${kopiTamanSenjaMeasures.unbranded.total - kopiTamanSenjaMeasures.unbranded.appeared} pertanyaan tanpa nama tidak menghasilkan jawaban yang memuat Kopi Taman Senja. Kemunculan belum konsisten pada permintaan serupa.`,
        evidence_prompt_ids: [1, 2, 3, 4, 5].map(promptIdOf),
      },
      {
        title: `Rekomendasi tercatat di ${kopiTamanSenjaMeasures.recommendation.recommended} dari ${kopiTamanSenjaMeasures.recommendation.assessed} penilaian`,
        explanation: `Dari slot yang memiliki jalur rekomendasi dan dapat dinilai, ${kopiTamanSenjaMeasures.recommendation.recommended} merekomendasikan Kopi Taman Senja. Angka ini tidak memasukkan slot perbandingan atau informasi.`,
        evidence_prompt_ids: [3, 5].map(promptIdOf),
      },
      {
        title: "Satu perbandingan langsung memiliki pilihan unggulan",
        explanation: `Pada ${kopiTamanSenjaMeasures.comparison.assessed} penilaian perbandingan yang tersedia, Kopi Taman Senja diunggulkan ${kopiTamanSenjaMeasures.comparison.clientPreferred} kali.`,
        evidence_prompt_ids: [6].map(promptIdOf),
      },
      {
        title: `Pertanyaan bernama bisnis menghasilkan ${kopiTamanSenjaMeasures.branded.appeared} kemunculan`,
        explanation: `${kopiTamanSenjaMeasures.branded.total} pertanyaan yang menyebut nama bisnis menghasilkan ${kopiTamanSenjaMeasures.branded.appeared} jawaban yang memuat Kopi Taman Senja. Ini adalah hasil pengamatan pada pertanyaan yang diuji, bukan penilaian kualitas layanan.`,
        evidence_prompt_ids: [6, 7, 8, 9, 10].map(promptIdOf),
      },
    ],
    priorities: [
      {
        order: 1,
        timing: "do_first",
        action: "Perjelas kecocokan bisnis untuk kebutuhan pelanggan",
        why: "Dua penilaian rekomendasi pada pertanyaan tanpa nama tidak merekomendasikan Kopi Taman Senja.",
        basis:
          "Jawaban yang disimpan menyebut bisnis tanpa rekomendasi pada jalur yang memang menguji rekomendasi.",
        owner: "business_owner",
        done_when:
          "Halaman resmi menjelaskan kebutuhan yang dapat dilayani dan bukti pendukungnya.",
        evidence_prompt_ids: [3, 5].map(promptIdOf),
        caveat: "Perubahan halaman tidak menjamin jawaban berubah.",
      },
      {
        order: 2,
        timing: "do_next",
        action: "Periksa kembali pertanyaan tanpa nama",
        why: `${kopiTamanSenjaMeasures.unbranded.total - kopiTamanSenjaMeasures.unbranded.appeared} pertanyaan tanpa nama tidak menghasilkan jawaban yang memuat Kopi Taman Senja.`,
        basis:
          "Jawaban yang disimpan tidak menyebut bisnis pada pertanyaan tanpa nama.",
        owner: "web_developer",
        done_when:
          "Pertanyaan serupa diuji ulang dan hasilnya ditinjau dengan bukti yang sama.",
        evidence_prompt_ids: [1, 2].map(promptIdOf),
        caveat: "Pengujian ulang dapat menghasilkan jawaban yang berbeda.",
      },
      {
        order: 3,
        timing: "do_next",
        action: "Tambahkan bukti untuk kebutuhan yang belum direkomendasikan",
        why: "Dua slot rekomendasi tanpa nama yang dapat dinilai belum merekomendasikan Kopi Taman Senja.",
        basis:
          "Jawaban yang disimpan memuat penyebutan tanpa rekomendasi pada slot tersebut.",
        owner: "marketing",
        done_when:
          "Sumber resmi menjelaskan kecocokan penawaran dengan kebutuhan yang diuji.",
        evidence_prompt_ids: [3, 5].map(promptIdOf),
        caveat: "Perubahan halaman tidak menjamin jawaban berubah.",
      },
    ],
    details,
  };
}
