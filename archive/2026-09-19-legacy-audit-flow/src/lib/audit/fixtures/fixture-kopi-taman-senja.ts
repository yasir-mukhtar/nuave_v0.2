import type { Source } from "../types";

/**
 * Frozen Indonesian fixture chain — NVA-FIKTIF-001 (fictional "Kopi Taman Senja").
 *
 * Implements Spec 002 (specs/002-indonesian-audit-contract/SPEC.md) R-02, R-37,
 * R-43 and AC-11: the additive, versioned Indonesian handoff records
 *
 *   NVA-FIKTIF-001.facts.v1      (03 → 04 business facts)
 *     → NVA-FIKTIF-001.questions.v1  (04 → 05 question pack)
 *     → NVA-FIKTIF-001.evidence.v1   (05 → 06 evidence set, 10/10 evaluable)
 *
 * Data source of truth: docs/drafts/00-journey-fixtures.md (reconciled
 * 2026-08-17 per the orchestrator decision). Reconciliation applied:
 *   - one comparison business everywhere: **Kopi Ruang Pagi** (06-sample's
 *     "Kopi Purnama" traces removed from evidence observations 01/03/05);
 *   - one opening-hours pair everywhere: 08.00–21.00 (official website) vs
 *     09.00–20.00 (directory);
 *   - evidence observations 07/08 retained answers literally name the business
 *     so the branded appearance count is 5/5 under the visible-appearance rule.
 *
 * Hard rules (R-43): src/lib/audit/fixtures/report-golden.ts is the protected
 * Phase-1 record and is NOT modified; the live audit engine and its contracts
 * are untouched. This module is additive — the Indonesian records sit beside
 * the English `BusinessBrief` / `PromptPack` / `AuditObservation` types, so
 * the 208-test audit baseline stays green.
 *
 * Everything here is fictional: business names, people, answers, findings,
 * and source URLs are synthetic and use reserved `.example` domains.
 */

export const KOPI_TAMAN_SENJA_ORDER_REFERENCE = "NVA-FIKTIF-001";
export const KOPI_TAMAN_SENJA_FACTS_VERSION_ID = "NVA-FIKTIF-001.facts.v1";
export const KOPI_TAMAN_SENJA_QUESTIONS_VERSION_ID =
  "NVA-FIKTIF-001.questions.v1";
export const KOPI_TAMAN_SENJA_EVIDENCE_VERSION_ID =
  "NVA-FIKTIF-001.evidence.v1";

export const KOPI_TAMAN_SENJA_BUSINESS_NAME = "Kopi Taman Senja";
export const KOPI_TAMAN_SENJA_SCOPE = "Dago, Bandung";
export const KOPI_TAMAN_SENJA_COMPARISON_BUSINESS_NAME = "Kopi Ruang Pagi";

/** The reconciled opening-hours pair: official website vs directory. */
export const KOPI_TAMAN_SENJA_OPENING_HOURS_CONFLICT = {
  official_website: "08.00–21.00",
  directory: "09.00–20.00",
} as const;

// ---------------------------------------------------------------------------
// Additive types (Indonesian handoff records). These sit beside the existing
// English audit types in src/lib/audit/types.ts; no shared type is edited.
// ---------------------------------------------------------------------------

export type ProvenanceLabel =
  | "found_website"
  | "found_google_maps"
  | "found_instagram"
  | "suggestion_nuave"
  | "customer_supplied"
  | "needs_review";

export type FactWarning = {
  kind: "source_conflict";
  field: string;
  message: string;
  versions: { source_url: string; value: string }[];
};

export type IndonesianBusinessFacts = {
  fact_version_id: string;
  order_reference: string;
  status: "facts_confirmed";
  business: {
    name: string;
    scope: string;
    category: {
      value: string;
      suggestions: string[];
      provenance: ProvenanceLabel;
    };
    short_description: string;
    official_sources: {
      url: string;
      type: "website" | "google_maps" | "instagram";
      label: "official";
    }[];
  };
  products_services: {
    value: string;
    selected: boolean;
    provenance: ProvenanceLabel;
  }[];
  customer_context: {
    who: string;
    needs: string;
    considerations: string;
    provenance: ProvenanceLabel;
  };
  differentiator: { value: string; provenance: ProvenanceLabel } | null;
  comparison_business: {
    name: string;
    category: string;
    scope: string;
    source_url: string;
    reason: string;
  } | null;
  changed_or_incorrect: string;
  confirmation: { confirmed: boolean; confirmed_at: string };
  warnings: FactWarning[];
  provenance_status: Record<ProvenanceLabel, string[]>;
};

export type FinalClassification =
  "tanpa_menyebut_bisnis_anda" | "menyebut_bisnis_anda";

export type QuestionCategory =
  | "need_discovery"
  | "solution_discovery"
  | "comparison"
  | "validation"
  | "action";

export type IndonesianQuestion = {
  order: number;
  text: string;
  final_classification: FinalClassification;
  original_suggestion: string;
  suggested_category: QuestionCategory;
  edited: boolean;
};

export type IndonesianQuestionPack = {
  question_pack_version_id: string;
  order_reference: string;
  fact_version_id: string;
  status: "questions_approved";
  language: "id-ID";
  generation: {
    system: "Google Gemini API";
    requested_model: string;
    returned_model: string;
    instruction_version: string;
    generated_at: string;
    fallback_used: boolean;
    telemetry: {
      latency_ms: number;
      input_tokens: number;
      output_tokens: number;
      accounted_cost_usd: number;
      cost_basis: "provider_usage";
      pricing_version: string;
    };
  };
  questions: IndonesianQuestion[];
  edit_record: never[];
  classification_summary: {
    total: 10;
    tanpa_menyebut_bisnis_anda: 5;
    menyebut_bisnis_anda: 5;
  };
  warnings_acknowledged: never[];
  approval: { approved: true; approved_at: string };
  lock: { locked: false; consumed: false; started_at: null };
};

export type AppearanceClassification =
  | "did_not_appear"
  | "appeared"
  | "mentioned_not_recommended"
  | "recommended"
  | "incomplete"
  | "conflicting";

/** Code-level result dimensions; the four enums match src/lib/audit/types.ts. */
export type EvidenceDimensions = {
  appearance: "absent" | "mentioned" | "not_assessed";
  recommendation: "recommended" | "not_recommended" | "not_assessed";
  comparison:
    | "client_preferred"
    | "competitor_preferred"
    | "compared_no_preference"
    | "not_observed"
    | "not_assessed";
  information: "confirmed" | "incomplete" | "conflicting" | "not_assessed";
};

export type EvidenceAttemptTelemetry = {
  attempt: number;
  status: "completed";
  started_at: string;
  completed_at: string;
  telemetry: {
    requested_model: string;
    returned_model: string;
    response_id: string;
    latency_ms: number;
    usage: {
      input_tokens: number;
      cached_input_tokens: number;
      cache_write_input_tokens: number;
      output_tokens: number;
      reasoning_output_tokens: number;
      total_tokens: number;
    };
    web_search_calls: number;
    accounted_cost_usd: number;
    cost_basis: "provider_usage";
    pricing_version: string;
    failure_reason: "";
  };
};

export type IndonesianEvidenceObservation = {
  order: number;
  question: string;
  classification: FinalClassification;
  appearance_classification: AppearanceClassification;
  dimensions: EvidenceDimensions;
  run_status: "completed";
  selected_observation: {
    response_id: string;
    raw_answer: string;
    answer_excerpt: string;
    sources: Source[];
    observed_at: string;
  };
  attempts: EvidenceAttemptTelemetry[];
};

export type IndonesianEvidenceSet = {
  evidence_set_version_id: string;
  order_reference: string;
  fact_version_id: string;
  question_pack_version_id: string;
  status: "evidence_ready";
  method_record: {
    system: "OpenAI Responses API";
    requested_model: string;
    returned_model: string;
    language: "id-ID";
    location: { country: "Indonesia"; city: "Bandung" };
    web_search_required: true;
    reasoning: "low";
    method_version: "audit-method-v1";
    instruction_version: "neutral-response-v1";
  };
  run: {
    started_at: string;
    completed_at: string;
    concurrency: number;
    support_recovery_used: false;
  };
  gate: { total: 10; evaluable: 10; failed: 0; passed: true };
  observations: IndonesianEvidenceObservation[];
};

// ---------------------------------------------------------------------------
// Fixture A — 03 → 04 business facts (NVA-FIKTIF-001.facts.v1)
// ---------------------------------------------------------------------------

export const kopiTamanSenjaFacts: IndonesianBusinessFacts = {
  fact_version_id: KOPI_TAMAN_SENJA_FACTS_VERSION_ID,
  order_reference: KOPI_TAMAN_SENJA_ORDER_REFERENCE,
  status: "facts_confirmed",

  business: {
    name: KOPI_TAMAN_SENJA_BUSINESS_NAME,
    scope: KOPI_TAMAN_SENJA_SCOPE,
    category: {
      value: "Kedai kopi",
      suggestions: ["Kafe", "Ruang kerja bersama"],
      provenance: "suggestion_nuave",
    },
    short_description:
      "Kopi Taman Senja adalah kedai kopi dan ruang kerja di Bandung yang menawarkan kopi lokal, makanan ringan, serta area untuk bekerja dan berkumpul.",
    official_sources: [
      {
        url: "https://kopitamansenja.example",
        type: "website",
        label: "official",
      },
      {
        url: "https://maps.example/kopi-taman-senja",
        type: "google_maps",
        label: "official",
      },
      {
        url: "https://instagram.example/kopitamansenja",
        type: "instagram",
        label: "official",
      },
    ],
  },

  products_services: [
    { value: "Kopi lokal", selected: true, provenance: "suggestion_nuave" },
    { value: "Ruang kerja", selected: true, provenance: "suggestion_nuave" },
    {
      value: "Makanan ringan",
      selected: true,
      provenance: "suggestion_nuave",
    },
  ],

  customer_context: {
    who: "Pekerja remote, mahasiswa, dan komunitas kecil di Bandung.",
    needs:
      "Tempat untuk bekerja atau bertemu dengan Wi-Fi, makanan, dan minuman.",
    considerations: "Lokasi, suasana, fasilitas, harga, dan jam buka.",
    provenance: "suggestion_nuave",
  },

  differentiator: {
    value:
      "Menggunakan kopi dari produsen lokal sekaligus menyediakan area untuk bekerja dan pertemuan kecil.",
    provenance: "suggestion_nuave",
  },

  comparison_business: {
    name: KOPI_TAMAN_SENJA_COMPARISON_BUSINESS_NAME,
    category: "Kedai kopi dan ruang kerja",
    scope: KOPI_TAMAN_SENJA_SCOPE,
    source_url: "https://kopiruangpagi.example",
    reason: "Menawarkan kedai kopi dan area kerja dalam wilayah yang sama.",
  },

  changed_or_incorrect: "",

  confirmation: {
    confirmed: true,
    confirmed_at: "2026-08-17T01:30:00.000Z",
  },

  warnings: [
    {
      kind: "source_conflict",
      field: "opening_hours",
      message:
        "Website mencantumkan jam buka 08.00–21.00, sedangkan simulasi Google Maps mencantumkan 09.00–20.00.",
      versions: [
        {
          source_url: "https://kopitamansenja.example",
          value: KOPI_TAMAN_SENJA_OPENING_HOURS_CONFLICT.official_website,
        },
        {
          source_url: "https://maps.example/kopi-taman-senja",
          value: KOPI_TAMAN_SENJA_OPENING_HOURS_CONFLICT.directory,
        },
      ],
    },
  ],

  provenance_status: {
    found_website: ["business.name", "business.scope", "official_sources.0"],
    found_google_maps: ["official_sources.1"],
    found_instagram: ["official_sources.2"],
    suggestion_nuave: [
      "business.category",
      "business.short_description",
      "products_services",
      "customer_context",
      "differentiator",
      "comparison_business",
    ],
    customer_supplied: [],
    needs_review: ["business.scope"],
  },
};

// ---------------------------------------------------------------------------
// Fixture B — 04 → 05 question pack (NVA-FIKTIF-001.questions.v1)
// ---------------------------------------------------------------------------

const frozenQuestions = [
  {
    text: "Rekomendasikan tempat yang asik untuk ngopi dan WFC di Dago.",
    suggested_category: "need_discovery",
  },
  {
    text: "Tempat rapat kecil di Bandung yang ada makanan, minuman, dan bisa dipakai kerja di mana ya?",
    suggested_category: "need_discovery",
  },
  {
    text: "Kedai kopi apa aja di Dago yang cocok untuk WFC atau meeting?",
    suggested_category: "solution_discovery",
  },
  {
    text: "Di mana ada cafe yang menyediakan kopi lokal dan bisa untuk kerja atau WFC di Bandung?",
    suggested_category: "solution_discovery",
  },
  {
    text: "Bandingkan coffee shop di Bandung yang asik untuk kerja, harganya affordable, dan buka sampai malam.",
    suggested_category: "comparison",
  },
  {
    text: "Bandingin Kopi Taman Senja vs Kopi Ruang Pagi untuk WFC dan meeting di Dago.",
    suggested_category: "comparison",
  },
  {
    text: "Kopi Taman Senja bisa dipakai WFC atau kerja nggak ya? Kopi yang disediakan kopi apa?",
    suggested_category: "validation",
  },
  {
    text: "Di mana alamat Kopi Taman Senja? Buka jam berapa?",
    suggested_category: "validation",
  },
  {
    text: "Cariin kontak Kopi Taman Senja.",
    suggested_category: "action",
  },
  {
    text: "Kopi Taman Senja ada parkiran mobil dan mushollanya nggak?",
    suggested_category: "action",
  },
] as const;

/** Final name/no-name classification is computed from the final text (R-34). */
function finalClassificationOf(text: string): FinalClassification {
  return text.includes(KOPI_TAMAN_SENJA_BUSINESS_NAME)
    ? "menyebut_bisnis_anda"
    : "tanpa_menyebut_bisnis_anda";
}

export const kopiTamanSenjaQuestions: IndonesianQuestionPack = {
  question_pack_version_id: KOPI_TAMAN_SENJA_QUESTIONS_VERSION_ID,
  order_reference: KOPI_TAMAN_SENJA_ORDER_REFERENCE,
  fact_version_id: KOPI_TAMAN_SENJA_FACTS_VERSION_ID,
  status: "questions_approved",
  language: "id-ID",

  generation: {
    system: "Google Gemini API",
    requested_model: "gemini-3.5-flash-lite",
    returned_model: "gemini-3.5-flash-lite",
    instruction_version: "question-writer-v1",
    generated_at: "2026-08-17T01:45:00.000Z",
    fallback_used: false,
    telemetry: {
      latency_ms: 4100,
      input_tokens: 1480,
      output_tokens: 462,
      accounted_cost_usd: 0.0021,
      cost_basis: "provider_usage",
      pricing_version: "gemini-flash-lite-v1",
    },
  },

  questions: frozenQuestions.map((item, index) => ({
    order: index + 1,
    text: item.text,
    final_classification: finalClassificationOf(item.text),
    original_suggestion: item.text,
    suggested_category: item.suggested_category,
    edited: false,
  })),

  edit_record: [],

  classification_summary: {
    total: 10,
    tanpa_menyebut_bisnis_anda: 5,
    menyebut_bisnis_anda: 5,
  },

  warnings_acknowledged: [],

  approval: {
    approved: true,
    approved_at: "2026-08-17T02:00:00.000Z",
  },

  lock: {
    locked: false,
    consumed: false,
    started_at: null,
  },
};

// ---------------------------------------------------------------------------
// Fixture C — 05 → 06 evidence set (NVA-FIKTIF-001.evidence.v1, 10/10 evaluable)
// ---------------------------------------------------------------------------

type ObservationSpec = {
  order: number;
  question: string;
  classification: FinalClassification;
  appearance_classification: AppearanceClassification;
  dimensions: EvidenceDimensions;
  response_id: string;
  raw_answer: string;
  answer_excerpt: string;
  sources: Source[];
  observed_at: string;
  completed_at: string;
  latency_ms: number;
  usage: EvidenceAttemptTelemetry["telemetry"]["usage"];
  accounted_cost_usd: number;
};

const EVIDENCE_MODEL = "gpt-5.6-luna";

/** Build one frozen observation; every field below is fixed literal data. */
function observation(spec: ObservationSpec): IndonesianEvidenceObservation {
  return {
    order: spec.order,
    question: spec.question,
    classification: spec.classification,
    appearance_classification: spec.appearance_classification,
    dimensions: spec.dimensions,
    run_status: "completed",
    selected_observation: {
      response_id: spec.response_id,
      raw_answer: spec.raw_answer,
      answer_excerpt: spec.answer_excerpt,
      sources: spec.sources,
      observed_at: spec.observed_at,
    },
    attempts: [
      {
        attempt: 1,
        status: "completed",
        started_at: spec.observed_at,
        completed_at: spec.completed_at,
        telemetry: {
          requested_model: EVIDENCE_MODEL,
          returned_model: EVIDENCE_MODEL,
          response_id: spec.response_id,
          latency_ms: spec.latency_ms,
          usage: spec.usage,
          web_search_calls: 1,
          accounted_cost_usd: spec.accounted_cost_usd,
          cost_basis: "provider_usage",
          pricing_version: "openai-responses-v1",
          failure_reason: "",
        },
      },
    ],
  };
}

export const kopiTamanSenjaEvidence: IndonesianEvidenceSet = {
  evidence_set_version_id: KOPI_TAMAN_SENJA_EVIDENCE_VERSION_ID,
  order_reference: KOPI_TAMAN_SENJA_ORDER_REFERENCE,
  fact_version_id: KOPI_TAMAN_SENJA_FACTS_VERSION_ID,
  question_pack_version_id: KOPI_TAMAN_SENJA_QUESTIONS_VERSION_ID,
  status: "evidence_ready",

  method_record: {
    system: "OpenAI Responses API",
    requested_model: EVIDENCE_MODEL,
    returned_model: EVIDENCE_MODEL,
    language: "id-ID",
    location: { country: "Indonesia", city: "Bandung" },
    web_search_required: true,
    reasoning: "low",
    method_version: "audit-method-v1",
    instruction_version: "neutral-response-v1",
  },

  run: {
    started_at: "2026-08-17T02:10:00.000Z",
    completed_at: "2026-08-17T02:20:00.000Z",
    concurrency: 2,
    support_recovery_used: false,
  },

  gate: { total: 10, evaluable: 10, failed: 0, passed: true },

  observations: [
    observation({
      order: 1,
      question: frozenQuestions[0].text,
      classification: "tanpa_menyebut_bisnis_anda",
      appearance_classification: "did_not_appear",
      dimensions: {
        appearance: "absent",
        recommendation: "not_recommended",
        comparison: "not_observed",
        information: "not_assessed",
      },
      response_id: "resp-kts-01",
      raw_answer:
        "Untuk ngopi dan WFC di Dago, Ruang Seduh dan Kopi Ruang Pagi adalah dua pilihan dengan Wi-Fi dan menu makanan.",
      answer_excerpt:
        "Untuk ngopi dan WFC di Dago, Ruang Seduh dan Kopi Ruang Pagi adalah dua pilihan dengan Wi-Fi dan menu makanan.",
      sources: [
        {
          url: "https://ruangseduh.example/fasilitas",
          title: "Ruang Seduh — fasilitas",
        },
        {
          url: "https://kopiruangpagi.example/dago",
          title: "Kopi Ruang Pagi — Dago",
        },
      ],
      observed_at: "2026-08-17T02:10:30.000Z",
      completed_at: "2026-08-17T02:10:34.000Z",
      latency_ms: 4100,
      usage: {
        input_tokens: 720,
        cached_input_tokens: 0,
        cache_write_input_tokens: 0,
        output_tokens: 186,
        reasoning_output_tokens: 0,
        total_tokens: 906,
      },
      accounted_cost_usd: 0.0184,
    }),
    observation({
      order: 2,
      question: frozenQuestions[1].text,
      classification: "tanpa_menyebut_bisnis_anda",
      appearance_classification: "did_not_appear",
      dimensions: {
        appearance: "absent",
        recommendation: "not_recommended",
        comparison: "not_observed",
        information: "not_assessed",
      },
      response_id: "resp-kts-02",
      raw_answer:
        "Ruang Seduh mempublikasikan paket meeting untuk kelompok kecil di Bandung.",
      answer_excerpt:
        "Ruang Seduh mempublikasikan paket meeting untuk kelompok kecil di Bandung.",
      sources: [
        {
          url: "https://ruangseduh.example/meetings",
          title: "Ruang Seduh — paket meeting",
        },
      ],
      observed_at: "2026-08-17T02:11:00.000Z",
      completed_at: "2026-08-17T02:11:05.000Z",
      latency_ms: 5200,
      usage: {
        input_tokens: 690,
        cached_input_tokens: 0,
        cache_write_input_tokens: 0,
        output_tokens: 128,
        reasoning_output_tokens: 0,
        total_tokens: 818,
      },
      accounted_cost_usd: 0.0166,
    }),
    observation({
      order: 3,
      question: frozenQuestions[2].text,
      classification: "tanpa_menyebut_bisnis_anda",
      appearance_classification: "mentioned_not_recommended",
      dimensions: {
        appearance: "mentioned",
        recommendation: "not_recommended",
        comparison: "not_observed",
        information: "not_assessed",
      },
      response_id: "resp-kts-03",
      raw_answer:
        "Pilihannya antara lain Ruang Seduh, Kopi Taman Senja, dan Kopi Ruang Pagi, tergantung kebijakan tempat duduk masing-masing.",
      answer_excerpt:
        "Pilihannya antara lain Ruang Seduh, Kopi Taman Senja, dan Kopi Ruang Pagi, tergantung kebijakan tempat duduk masing-masing.",
      sources: [
        {
          url: "https://directory.example/dago-cafes",
          title: "Direktori kafe Dago",
        },
        {
          url: "https://kopitamansenja.example",
          title: "Kopi Taman Senja",
        },
      ],
      observed_at: "2026-08-17T02:11:30.000Z",
      completed_at: "2026-08-17T02:11:36.000Z",
      latency_ms: 6100,
      usage: {
        input_tokens: 810,
        cached_input_tokens: 0,
        cache_write_input_tokens: 0,
        output_tokens: 214,
        reasoning_output_tokens: 0,
        total_tokens: 1024,
      },
      accounted_cost_usd: 0.0212,
    }),
    observation({
      order: 4,
      question: frozenQuestions[3].text,
      classification: "tanpa_menyebut_bisnis_anda",
      appearance_classification: "recommended",
      dimensions: {
        appearance: "mentioned",
        recommendation: "recommended",
        comparison: "not_observed",
        information: "not_assessed",
      },
      response_id: "resp-kts-04",
      raw_answer:
        "Kopi Taman Senja di Dago adalah salah satu pilihan untuk kopi lokal dan bekerja di siang hari.",
      answer_excerpt:
        "Kopi Taman Senja di Dago adalah salah satu pilihan untuk kopi lokal dan bekerja di siang hari.",
      sources: [
        {
          url: "https://kopitamansenja.example/menu",
          title: "Kopi Taman Senja — menu",
        },
      ],
      observed_at: "2026-08-17T02:12:00.000Z",
      completed_at: "2026-08-17T02:12:05.000Z",
      latency_ms: 4700,
      usage: {
        input_tokens: 760,
        cached_input_tokens: 0,
        cache_write_input_tokens: 0,
        output_tokens: 172,
        reasoning_output_tokens: 0,
        total_tokens: 932,
      },
      accounted_cost_usd: 0.0191,
    }),
    observation({
      order: 5,
      question: frozenQuestions[4].text,
      classification: "tanpa_menyebut_bisnis_anda",
      appearance_classification: "mentioned_not_recommended",
      dimensions: {
        appearance: "mentioned",
        recommendation: "not_recommended",
        comparison: "competitor_preferred",
        information: "not_assessed",
      },
      response_id: "resp-kts-05",
      raw_answer:
        "Kopi Ruang Pagi mempublikasikan detail meeting yang lebih jelas, sementara Kopi Taman Senja mencantumkan makanan dan Wi-Fi tetapi detail reservasinya lebih sedikit.",
      answer_excerpt:
        "Kopi Ruang Pagi mempublikasikan detail meeting yang lebih jelas, sementara Kopi Taman Senja mencantumkan makanan dan Wi-Fi tetapi detail reservasinya lebih sedikit.",
      sources: [
        {
          url: "https://kopiruangpagi.example/meetings",
          title: "Kopi Ruang Pagi — meeting",
        },
        {
          url: "https://kopitamansenja.example/fasilitas",
          title: "Kopi Taman Senja — fasilitas",
        },
      ],
      observed_at: "2026-08-17T02:13:00.000Z",
      completed_at: "2026-08-17T02:13:07.000Z",
      latency_ms: 7200,
      usage: {
        input_tokens: 980,
        cached_input_tokens: 0,
        cache_write_input_tokens: 0,
        output_tokens: 262,
        reasoning_output_tokens: 0,
        total_tokens: 1242,
      },
      accounted_cost_usd: 0.026,
    }),
    observation({
      order: 6,
      question: frozenQuestions[5].text,
      classification: "menyebut_bisnis_anda",
      appearance_classification: "recommended",
      dimensions: {
        appearance: "mentioned",
        recommendation: "recommended",
        comparison: "client_preferred",
        information: "not_assessed",
      },
      response_id: "resp-kts-06",
      raw_answer:
        "Kopi Taman Senja lebih cocok untuk fokus kopi lokal, sementara Kopi Ruang Pagi mempublikasikan detail meeting yang lebih lengkap.",
      answer_excerpt:
        "Kopi Taman Senja lebih cocok untuk fokus kopi lokal, sementara Kopi Ruang Pagi mempublikasikan detail meeting yang lebih lengkap.",
      sources: [
        {
          url: "https://kopitamansenja.example/menu",
          title: "Kopi Taman Senja — menu",
        },
        {
          url: "https://kopiruangpagi.example/meetings",
          title: "Kopi Ruang Pagi — meeting",
        },
      ],
      observed_at: "2026-08-17T02:14:00.000Z",
      completed_at: "2026-08-17T02:14:06.000Z",
      latency_ms: 5900,
      usage: {
        input_tokens: 940,
        cached_input_tokens: 0,
        cache_write_input_tokens: 0,
        output_tokens: 236,
        reasoning_output_tokens: 0,
        total_tokens: 1176,
      },
      accounted_cost_usd: 0.0242,
    }),
    observation({
      order: 7,
      question: frozenQuestions[6].text,
      classification: "menyebut_bisnis_anda",
      appearance_classification: "incomplete",
      dimensions: {
        appearance: "mentioned",
        recommendation: "not_assessed",
        comparison: "not_observed",
        information: "incomplete",
      },
      response_id: "resp-kts-07",
      raw_answer:
        "Kopi Taman Senja mencantumkan Wi-Fi dan kopi lokal, tetapi saya belum dapat memastikan ketersediaan stopkontak, kapasitas tempat duduk, atau kebijakan reservasi dari halaman resmi.",
      answer_excerpt:
        "Kopi Taman Senja mencantumkan Wi-Fi dan kopi lokal, tetapi saya belum dapat memastikan ketersediaan stopkontak, kapasitas tempat duduk, atau kebijakan reservasi dari halaman resmi.",
      sources: [
        {
          url: "https://kopitamansenja.example/fasilitas",
          title: "Kopi Taman Senja — fasilitas",
        },
      ],
      observed_at: "2026-08-17T02:15:00.000Z",
      completed_at: "2026-08-17T02:15:06.000Z",
      latency_ms: 6400,
      usage: {
        input_tokens: 860,
        cached_input_tokens: 0,
        cache_write_input_tokens: 0,
        output_tokens: 248,
        reasoning_output_tokens: 0,
        total_tokens: 1108,
      },
      accounted_cost_usd: 0.023,
    }),
    observation({
      order: 8,
      question: frozenQuestions[7].text,
      classification: "menyebut_bisnis_anda",
      appearance_classification: "conflicting",
      dimensions: {
        appearance: "mentioned",
        recommendation: "not_assessed",
        comparison: "not_observed",
        information: "conflicting",
      },
      response_id: "resp-kts-08",
      raw_answer:
        "Situs resmi Kopi Taman Senja mencantumkan jam buka 08.00–21.00, sedangkan satu direktori mencantumkan 09.00–20.00. Konfirmasikan jam buka terkini langsung ke kafenya.",
      answer_excerpt:
        "Situs resmi Kopi Taman Senja mencantumkan jam buka 08.00–21.00, sedangkan satu direktori mencantumkan 09.00–20.00.",
      sources: [
        {
          url: "https://kopitamansenja.example/visit",
          title: "Kopi Taman Senja — kunjungi",
        },
        {
          url: "https://maps.example/kopi-taman-senja",
          title: "Simulasi Google Maps — Kopi Taman Senja",
        },
      ],
      observed_at: "2026-08-17T02:16:00.000Z",
      completed_at: "2026-08-17T02:16:05.000Z",
      latency_ms: 5300,
      usage: {
        input_tokens: 740,
        cached_input_tokens: 0,
        cache_write_input_tokens: 0,
        output_tokens: 206,
        reasoning_output_tokens: 0,
        total_tokens: 946,
      },
      accounted_cost_usd: 0.0195,
    }),
    observation({
      order: 9,
      question: frozenQuestions[8].text,
      classification: "menyebut_bisnis_anda",
      appearance_classification: "appeared",
      dimensions: {
        appearance: "mentioned",
        recommendation: "not_assessed",
        comparison: "not_observed",
        information: "confirmed",
      },
      response_id: "resp-kts-09",
      raw_answer:
        "Kopi Taman Senja mencantumkan nomor WhatsApp untuk pemesanan dan pertanyaan pada halaman kontaknya.",
      answer_excerpt:
        "Kopi Taman Senja mencantumkan nomor WhatsApp untuk pemesanan dan pertanyaan pada halaman kontaknya.",
      sources: [
        {
          url: "https://kopitamansenja.example/contact",
          title: "Kopi Taman Senja — kontak",
        },
      ],
      observed_at: "2026-08-17T02:17:00.000Z",
      completed_at: "2026-08-17T02:17:03.000Z",
      latency_ms: 2800,
      usage: {
        input_tokens: 520,
        cached_input_tokens: 0,
        cache_write_input_tokens: 0,
        output_tokens: 138,
        reasoning_output_tokens: 0,
        total_tokens: 658,
      },
      accounted_cost_usd: 0.0132,
    }),
    observation({
      order: 10,
      question: frozenQuestions[9].text,
      classification: "menyebut_bisnis_anda",
      appearance_classification: "incomplete",
      dimensions: {
        appearance: "mentioned",
        recommendation: "not_assessed",
        comparison: "not_observed",
        information: "incomplete",
      },
      response_id: "resp-kts-10",
      raw_answer:
        "Kopi Taman Senja dikenali, tetapi ketersediaan parkiran mobil dan musholla belum tercantum di sumber resmi yang diperiksa.",
      answer_excerpt:
        "Kopi Taman Senja dikenali, tetapi ketersediaan parkiran mobil dan musholla belum tercantum di sumber resmi yang diperiksa.",
      sources: [
        {
          url: "https://kopitamansenja.example/fasilitas",
          title: "Kopi Taman Senja — fasilitas",
        },
        {
          url: "https://maps.example/kopi-taman-senja",
          title: "Simulasi Google Maps — Kopi Taman Senja",
        },
      ],
      observed_at: "2026-08-17T02:18:00.000Z",
      completed_at: "2026-08-17T02:18:06.000Z",
      latency_ms: 5800,
      usage: {
        input_tokens: 780,
        cached_input_tokens: 0,
        cache_write_input_tokens: 0,
        output_tokens: 192,
        reasoning_output_tokens: 0,
        total_tokens: 972,
      },
      accounted_cost_usd: 0.0199,
    }),
  ],
};

/** The complete frozen chain in one aggregate. */
export const kopiTamanSenjaChain = {
  order_reference: KOPI_TAMAN_SENJA_ORDER_REFERENCE,
  facts: kopiTamanSenjaFacts,
  questions: kopiTamanSenjaQuestions,
  evidence: kopiTamanSenjaEvidence,
} as const;
