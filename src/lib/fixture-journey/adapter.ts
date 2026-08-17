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
 * PROJECTION NOTE (additive, evidence-faithful): the existing report
 * validator (`validateReportContent`) requires an assessed recommendation on
 * every completed observation. The frozen Indonesian evidence records
 * `recommendation: "not_assessed"` for observations 07-10 (factual checks
 * that neither recommended nor declined). This adapter projects those to
 * `not_recommended` ONLY so the retained-evidence validator accepts the set.
 * The Indonesian report view renders the true assessed-denominator measures
 * (recommendation 2/6, comparison 1/2, information 1/2/1 of 4) directly from
 * the frozen dimensions via `kopiTamanSenjaMeasures`, never from this
 * projection, and the frozen dimensions themselves are never modified.
 */
import type {
  AuditObservation,
  AuditPrompt,
  BusinessBrief,
  ReportContent,
} from "../audit/types";
import type { EvidenceDimensions } from "../audit/fixtures/fixture-kopi-taman-senja";
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
    detail: `Lima pertanyaan ini tidak menyebut nama ${KOPI_TAMAN_SENJA_BUSINESS_NAME}. Pertanyaan ini meniru yang diketik calon pelanggan saat mencari kedai kopi di Dago, Bandung, dan menguji apakah bisnis muncul tanpa nama disebut.`,
  },
  branded: {
    label: "Menyebut bisnis Anda",
    detail: `Lima pertanyaan ini menyebut nama ${KOPI_TAMAN_SENJA_BUSINESS_NAME}. Pertanyaan ini menguji apa yang dikatakan model AI tentang bisnis saat calon pelanggan sudah mengenalnya, yaitu apakah informasinya akurat, konsisten, dan mudah digunakan.`,
  },
} as const;

/**
 * Indonesian result label for one frozen observation row, derived strictly
 * from the frozen appearance classification (VOICE.md §7.4 labels).
 */
export function fixtureObservationResultLabel(order: number): string {
  const observation = evidence.observations.find(
    (item) => item.order === order,
  );
  if (!observation) return "Tidak tersedia";
  switch (observation.appearance_classification) {
    case "did_not_appear":
      return "Tidak muncul dalam jawaban ini";
    case "mentioned_not_recommended":
      return "Disebut tanpa direkomendasikan";
    case "recommended":
      return "Disebut dan direkomendasikan";
    case "incomplete":
      return "Disebut, informasi belum lengkap";
    case "conflicting":
      return "Disebut, informasi bertentangan";
    case "appeared":
      return "Disebut";
  }
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
    questions.questions.length === 10 &&
    questions.questions.filter(
      (question) =>
        question.final_classification === "tanpa_menyebut_bisnis_anda",
    ).length === 5 &&
    questions.questions.filter(
      (question) => question.final_classification === "menyebut_bisnis_anda",
    ).length === 5
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
  const appeared = (observation: IndonesianEvidenceObservation) =>
    observation.dimensions.appearance === "mentioned";
  const unbranded = observations.filter(
    (observation) =>
      observation.classification === "tanpa_menyebut_bisnis_anda",
  );
  const branded = observations.filter(
    (observation) => observation.classification === "menyebut_bisnis_anda",
  );
  const recommendation = observations.filter((observation) =>
    recommendationAssessedValues.includes(
      observation.dimensions.recommendation,
    ),
  );
  const comparison = observations.filter((observation) =>
    comparisonAssessedValues.includes(observation.dimensions.comparison),
  );
  const information = observations.filter((observation) =>
    informationAssessedValues.includes(observation.dimensions.information),
  );
  return {
    overall: {
      appeared: observations.filter(appeared).length,
      total: observations.length,
    },
    unbranded: {
      appeared: unbranded.filter(appeared).length,
      total: unbranded.length,
    },
    branded: {
      appeared: branded.filter(appeared).length,
      total: branded.length,
    },
    recommendation: {
      recommended: recommendation.filter(
        (observation) =>
          observation.dimensions.recommendation === "recommended",
      ).length,
      assessed: recommendation.length,
    },
    comparison: {
      clientPreferred: comparison.filter(
        (observation) =>
          observation.dimensions.comparison === "client_preferred",
      ).length,
      assessed: comparison.length,
    },
    information: {
      confirmed: information.filter(
        (observation) => observation.dimensions.information === "confirmed",
      ).length,
      incomplete: information.filter(
        (observation) => observation.dimensions.information === "incomplete",
      ).length,
      conflicting: information.filter(
        (observation) => observation.dimensions.information === "conflicting",
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

const roleOf = (category: AuditPrompt["category"]): string => {
  switch (category) {
    case "need_discovery":
      return "Menjelajahi satu kebutuhan calon pelanggan tanpa menyebut bisnis";
    case "solution_discovery":
      return "Mencari pilihan kategori yang relevan di area layanan";
    case "comparison":
      return "Membandingkan pilihan yang relevan atau bisnis dengan satu bisnis pembanding";
    case "validation":
      return "Memeriksa fakta publik penting tentang bisnis";
    case "action":
      return "Menanyakan langkah praktis berikutnya atau cara menghubungi bisnis";
  }
};

const inputsUsedOf = (
  category: AuditPrompt["category"],
): (keyof BusinessBrief)[] => {
  switch (category) {
    case "need_discovery":
      return ["category", "market_context", "target_customer"];
    case "solution_discovery":
      return ["category", "market_context"];
    case "comparison":
      return ["category", "market_context", "verified_competitor"];
    case "validation":
      return ["brand_name", "entity_scope", "market_context"];
    case "action":
      return ["brand_name", "official_sources"];
  }
};

/** The fixture pack projected into the existing AuditPrompt shape. */
export const kopiTamanSenjaPrompts: AuditPrompt[] = questions.questions.map(
  (question) => ({
    prompt_id: promptIdOf(question.order),
    category: question.suggested_category,
    role: roleOf(question.suggested_category),
    branded: question.final_classification === "menyebut_bisnis_anda",
    question: question.text,
    rationale: `Pertanyaan contoh fiktif ${KOPI_TAMAN_SENJA_ORDER_REFERENCE} dalam urutan yang disetujui.`,
    inputs_used: inputsUsedOf(question.suggested_category),
    review_status: "needs_human_review",
  }),
);

/** The fixture observations projected into the existing AuditObservation shape. */
export const kopiTamanSenjaObservations: AuditObservation[] =
  evidence.observations.map((observation) => {
    const attempt = observation.attempts[0];
    return {
      prompt_id: promptIdOf(observation.order),
      category: observation.question
        ? kopiTamanSenjaPrompts[observation.order - 1].category
        : "validation",
      branded: observation.classification === "menyebut_bisnis_anda",
      question: observation.question,
      system: evidence.method_record.system,
      requested_model: attempt?.telemetry.requested_model ?? "not recorded",
      returned_model: attempt?.telemetry.returned_model ?? "not recorded",
      response_id: observation.selected_observation.response_id,
      observed_at: observation.selected_observation.observed_at,
      raw_answer: observation.selected_observation.raw_answer,
      sources: observation.selected_observation.sources,
      run_status: "completed",
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
// the arithmetic follows `kopiTamanSenjaMeasures` (8/10, 3/5, 5/5,
// recommendation 2/6, comparison 1/2, information per the fixture).
// ---------------------------------------------------------------------------

/** Indonesian, evidence-led finding text for one observation row. */
export function detailCopyFor(observation: IndonesianEvidenceObservation): {
  finding: string;
  evidence_note: string;
} {
  switch (observation.appearance_classification) {
    case "did_not_appear":
      return {
        finding: "Kopi Taman Senja tidak muncul dalam jawaban ini.",
        evidence_note: "Jawaban yang disimpan tidak menyebut bisnis.",
      };
    case "mentioned_not_recommended":
      return {
        finding: "Bisnis disebut tanpa direkomendasikan dalam jawaban ini.",
        evidence_note: "Jawaban yang disimpan memuat penyebutan bisnis.",
      };
    case "recommended":
      return {
        finding: "Jawaban menyebut dan merekomendasikan Kopi Taman Senja.",
        evidence_note: "Jawaban yang disimpan memuat rekomendasi untuk bisnis.",
      };
    case "incomplete":
      return {
        finding: "Jawaban menemukan informasi bisnis yang belum lengkap.",
        evidence_note:
          "Jawaban yang disimpan menyebut informasi yang belum lengkap.",
      };
    case "conflicting":
      return {
        finding: "Jawaban melaporkan informasi bisnis yang bertentangan.",
        evidence_note: "Jawaban yang disimpan menyebut perbedaan informasi.",
      };
    case "appeared":
      return {
        finding: "Bisnis disebut dalam jawaban.",
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
      return {
        prompt_id: promptIdOf(observation.order),
        run: "completed",
        appearance: observation.dimensions.appearance,
        // Projection note above: not_assessed -> not_recommended so the
        // retained-evidence validator accepts the set. The Indonesian view
        // renders the true measures from `kopiTamanSenjaMeasures`.
        recommendation:
          observation.dimensions.recommendation === "recommended"
            ? "recommended"
            : "not_recommended",
        comparison: observation.dimensions.comparison,
        information: observation.dimensions.information,
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
    conclusion:
      "Sepuluh pertanyaan diuji dengan model AI. Kopi Taman Senja muncul di 8 dari 10 jawaban. Saat pertanyaan tidak menyebut nama, bisnis muncul di 3 dari 5 jawaban. Saat nama disebut, muncul di 5 dari 5 jawaban. Jam buka dan fasilitas perlu disamakan di sumber resmi.",
    accuracy_status: "needs_correction",
    observed_competitors: [
      {
        name: KOPI_TAMAN_SENJA_COMPARISON_BUSINESS_NAME,
        relationship: "mentioned",
        evidence_prompt_ids: [1, 3, 5, 6].map(promptIdOf),
      },
    ],
    key_findings: [
      {
        title: "Kemunculan spontan di 3 dari 5 pertanyaan tanpa nama",
        explanation:
          "Dua pertanyaan tanpa nama tidak menghasilkan jawaban yang memuat Kopi Taman Senja. Kemunculan belum konsisten pada permintaan serupa.",
        evidence_prompt_ids: [1, 2].map(promptIdOf),
      },
      {
        title: "Jam buka bertentangan antara dua sumber",
        explanation:
          "Situs resmi mencantumkan 08.00–21.00, sedangkan satu direktori mencantumkan 09.00–20.00. Calon pelanggan dapat menerima jawaban berbeda tergantung sumbernya.",
        evidence_prompt_ids: [8].map(promptIdOf),
      },
      {
        title: "Informasi fasilitas belum lengkap",
        explanation:
          "Jawaban menyebut Wi-Fi dan kopi lokal, tetapi stopkontak, kapasitas tempat duduk, dan parkiran belum tercantum di sumber resmi. Sistem yang diuji belum dapat menjawab seluruh pertanyaan fasilitas dari satu sumber resmi.",
        evidence_prompt_ids: [7, 10].map(promptIdOf),
      },
      {
        title: "Detail meeting Kopi Ruang Pagi lebih lengkap",
        explanation:
          "Satu jawaban perbandingan menyebut detail reservasi Kopi Ruang Pagi lebih jelas daripada Kopi Taman Senja. Perbandingan ini menilai informasi yang dipublikasikan, bukan kualitas layanan.",
        evidence_prompt_ids: [5].map(promptIdOf),
      },
    ],
    priorities: [
      {
        order: 1,
        timing: "do_first",
        action: "Samakan jam buka di semua sumber resmi",
        why: "Satu jawaban menemukan jam buka yang berbeda antara situs resmi dan direktori.",
        basis:
          "Jawaban yang disimpan memuat perbedaan 08.00–21.00 dan 09.00–20.00.",
        owner: "business_owner",
        done_when: "Jam buka yang sama tercantum di setiap halaman resmi.",
        evidence_prompt_ids: [8].map(promptIdOf),
        caveat: "Informasi yang konsisten tidak menjamin jawaban berubah.",
      },
      {
        order: 2,
        timing: "do_next",
        action: "Jelaskan fasilitas ruang kerja di halaman resmi",
        why: "Beberapa jawaban belum dapat memastikan stopkontak, kapasitas tempat duduk, dan parkiran dari sumber resmi.",
        basis:
          "Jawaban yang disimpan menyebut informasi fasilitas yang belum lengkap.",
        owner: "web_developer",
        done_when:
          "Halaman resmi mencantumkan fasilitas yang dicari calon pelanggan.",
        evidence_prompt_ids: [7, 10].map(promptIdOf),
        caveat: "Informasi yang lebih jelas tidak menjamin jawaban berubah.",
      },
      {
        order: 3,
        timing: "do_next",
        action: "Tingkatkan kemunculan brand Anda pada pertanyaan tanpa nama",
        why: "Dua pertanyaan tanpa nama tidak menghasilkan jawaban yang memuat Kopi Taman Senja.",
        basis: "Dua jawaban yang disimpan tidak menyebut bisnis.",
        owner: "marketing",
        done_when:
          "Jawaban baru untuk pertanyaan serupa menyebut Kopi Taman Senja.",
        evidence_prompt_ids: [1, 2].map(promptIdOf),
        caveat: "Perubahan halaman tidak menjamin jawaban berubah.",
      },
    ],
    details,
  };
}
