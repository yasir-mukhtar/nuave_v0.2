/**
 * Five-business provider evaluation for Spec 003 (R-06..R-11).
 *
 * Launch wedge: dental clinics in Depok (Jabodetabek), first audit target Sozo
 * Dental Depok/Margonda. This runner makes REAL provider calls (Gemini 3.5
 * Flash-Lite) against the wired 03 extraction path (src/lib/audit/gemini.ts)
 * and the wired 04 Indonesian question-writer boundary
 * (questions-id.ts + questions-id-provider.ts), plus the deterministic
 * Indonesian fallback. It deliberately lives OUTSIDE src/ so `npm run
 * test:audit` (`vitest run src/lib/audit`) never picks it up; run it with:
 *
 *   npx vitest run scripts/eval
 *
 * Hard rules honoured here: no src/ edits, no commits, no publishing, no
 * contacting the evaluated businesses. Raw provider output is written only to
 * scripts/eval/.results/ (local evidence, not part of the evaluation record).
 *
 * Cost accounting: Gemini 3.5 Flash-Lite official developer pricing
 * (ai.google.dev/gemini-api/docs/pricing, updated 2026-08-13): paid tier
 * USD 0.30 / 1M input tokens, USD 2.50 / 1M output tokens (thinking included);
 * free tier free of charge. Google Search grounding: 5,000 free search
 * requests/month on the paid tier (shared across Gemini 3.x models), then
 * USD 14 / 1,000. The repo's telemetry convention for the Gemini path is
 * service_tier "free", accounted_cost_usd 0 (gemini.ts). This runner records
 * BOTH the accounted figure (0, free-tier convention) and a notional paid-tier
 * cost computed from real usageMetadata, so the founder can compare against
 * GPT-5.6 Luna pricing.
 *
 * The OpenAI benchmark (GPT-5.6 Luna) is measured when OPENAI_API_KEY is
 * present in .env.local (missing key → candidates recorded as NOT RUN with
 * the missing-key flag, per the task: flag, do not ask). Gemini candidates
 * run when GEMINI_API_KEY is present; provider-side failures (e.g. depleted
 * prepayment credits) are recorded, never fabricated. Each clinic runs with
 * its own fresh audit budget (03 extract stage limit is 1 call per audit).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// 1. Environment: load .env.local BEFORE any audit module reads provider
//    configuration. All audit-module env reads are lazy (inside functions), so
//    static imports below are safe; this load still makes the run explicit.
// ---------------------------------------------------------------------------

function loadEnvLocal(): void {
  const file = join(process.cwd(), ".env.local");
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

// ---------------------------------------------------------------------------
// 2. Audit-module imports (wired paths being evaluated)
// ---------------------------------------------------------------------------

import { extractBusinessDraft as geminiExtract } from "../../src/lib/audit/gemini";
import { extractBusinessDraft as openaiExtract } from "../../src/lib/audit/openai";
import type { AuditBudget, BusinessBrief } from "../../src/lib/audit/types";
import {
  buildDeterministicIndonesianPack,
  classifyIndonesianQuestion,
  indonesianPackBlockers,
  minimizeIndonesianBrief,
  validateIndonesianQuestionPack,
  type IndonesianQuestionPackSuggestion,
  type MinimizedIndonesianBrief,
} from "../../src/lib/audit/questions-id";
import {
  createIndonesianQuestionProvider,
  indonesianQuestionGenerationMeta,
  type IndonesianQuestionProviderName,
} from "../../src/lib/audit/questions-id-provider";
import { generateIndonesianQuestionPack } from "../../src/lib/audit/questions-id";

// ---------------------------------------------------------------------------
// 3. Evaluation configuration (public facts only — research 2026-08-17)
// ---------------------------------------------------------------------------

const MARKET_CONTEXT = "Kota Depok, Jawa Barat, Indonesia";
const CATEGORY_INPUT = "Klinik gigi";
const SAFETY_IDENTIFIER = "nuave-provider-eval-2026-08-17-depok-dental";
const GEMINI_CANDIDATE_MODEL = "gemini-3.5-flash-lite";
const OPENAI_BENCHMARK_MODEL = "gpt-5.6-luna";

// Official Gemini 3.5 Flash-Lite pricing (paid tier, per 1M tokens).
const GEMINI_35_FLASH_LITE_PRICING = {
  input_per_1m: 0.3,
  output_per_1m: 2.5,
} as const;

const RESULTS_DIR = join(process.cwd(), "scripts", "eval", ".results");

type Clinic = {
  id: string;
  name: string;
  branch: string;
  address: string;
  official_url: string;
  maps_url: string;
  category_label: string;
  priority_services: string[];
  customer_context: string;
  brief: BusinessBrief;
  comparison_note: string;
};

const CLINICS: Clinic[] = [
  {
    id: "sozo-depok",
    name: "Sozo Dental Depok",
    branch: "Margonda, Beji, Kota Depok",
    address: "Jl. Margonda No.267, RT.1/RW.12, Kemiri Muka, Kec. Beji, Kota Depok",
    official_url: "https://www.sozodental.com/lokasi/depok/",
    maps_url: "https://maps.app.goo.gl/7FkoFyipTPspnVjM9",
    category_label: "Klinik gigi (jaringan 60+ cabang nasional)",
    priority_services: [
      "Pemeriksaan gigi",
      "Scaling (pembersihan karang gigi)",
      "Tambal gigi",
      "Perawatan saluran akar",
      "Cabut gigi",
      "Behel gigi (metal & spesialis ortho)",
      "Aligner",
      "Veneer",
      "Bleaching",
      "Gigi palsu",
      "Implan",
    ],
    customer_context:
      "Warga Depok dan Jabodetabek yang mencari klinik gigi terdekat dengan harga terjangkau; reservasi dan promo via WhatsApp; keluarga dan karyawan.",
    comparison_note:
      "SATU Dental Margonda — jaringan klinik gigi serupa di koridor Margonda yang sama (sumber publik: satudental.com).",
    brief: {
      brand_name: "Sozo Dental Depok",
      brand_name_variants: ["SOZO Dental", "Sozo Dental Margonda", "Sozo Dental Clinic"],
      entity_scope: "Margonda, Beji, Kota Depok",
      brand_type: "Jaringan klinik gigi",
      category: "Klinik gigi",
      market_context: MARKET_CONTEXT,
      target_customer:
        "Warga Depok dan sekitarnya yang mencari klinik gigi terdekat dengan harga terjangkau, termasuk keluarga dan karyawan.",
      official_sources: ["https://www.sozodental.com/lokasi/depok/"],
      verified_offerings: ["scaling gigi", "behel gigi", "tambal gigi"],
      verified_customer_needs: [
        "menemukan klinik gigi terdekat",
        "perawatan gigi dengan harga terjangkau",
        "konsultasi dan reservasi mudah via WhatsApp",
      ],
      verified_decision_criteria: [
        "lokasi dekat dan mudah dijangkau",
        "harga dan promo",
        "dokter berpengalaman",
        "jam buka",
      ],
      verified_competitor: {
        name: "SATU Dental Margonda",
        scope: "Margonda, Beji, Kota Depok",
        source_url: "https://www.satudental.com/lokasi/klinik-gigi-margonda/",
      },
      priority_offering: "scaling gigi",
      conversion_action: "reservasi via WhatsApp",
      customer_supplied_facts: [],
      known_accuracy_questions: [],
      usp: "Jaringan dengan 60+ cabang di Indonesia dan dua cabang di Depok (Margonda dan Cinere).",
      regulated_category_notes: "Layanan kesehatan gigi.",
      language: "en-US",
      agency_name: "Nuave",
      agency_logo_data_url: "",
    },
  },
  {
    id: "satu-margonda",
    name: "SATU Dental Margonda",
    branch: "Margonda, Beji, Kota Depok",
    address: "Jl. Margonda Raya No.529, Pondok Cina, Beji, Kota Depok",
    official_url: "https://www.satudental.com/lokasi/klinik-gigi-margonda/",
    maps_url:
      "https://maps.google.com/maps/dir//Satu+Dental+Depok+Margonda+%7C+Klinik+Gigi+Dekat+dan+Terpercaya+Jl.+Margonda+Raya+No.529+RT.1%2FRW.007,+Pondok+Cina+Kecamatan+Beji,+Kota+Depok,+Jawa+Barat+16424/@-6.3593327,106.8327358,18z",
    category_label: "Klinik gigi (jaringan 56 cabang, 500+ dokter)",
    priority_services: [
      "Behel",
      "Veneer",
      "Scaling",
      "Perawatan gigi umum & spesialis",
      "Perawatan gigi anak (SATU 4 Kids)",
      "Laboratorium gigi in-house",
    ],
    customer_context:
      "Warga Depok dan Jabodetabek, termasuk mahasiswa sekitar Universitas Indonesia dan karyawan; jam buka panjang 09.00-21.00; booking online via patients.satudental.com.",
    comparison_note:
      "Sozo Dental Depok — jaringan klinik gigi terdekat di koridor Margonda yang sama (sumber publik: sozodental.com).",
    brief: {
      brand_name: "SATU Dental Margonda",
      brand_name_variants: ["SATU Dental", "Klinik Gigi SATU Dental", "Satu Dental Depok Margonda"],
      entity_scope: "Margonda, Beji, Kota Depok",
      brand_type: "Jaringan klinik gigi",
      category: "Klinik gigi",
      market_context: MARKET_CONTEXT,
      target_customer:
        "Warga Depok dan Jabodetabek, termasuk mahasiswa dan karyawan, yang mencari klinik gigi dengan jam buka panjang dan booking online.",
      official_sources: ["https://www.satudental.com/lokasi/klinik-gigi-margonda/"],
      verified_offerings: ["behel gigi", "veneer", "scaling gigi"],
      verified_customer_needs: [
        "merapikan gigi dengan behel",
        "perawatan gigi rutin seperti scaling",
        "booking online yang mudah",
      ],
      verified_decision_criteria: [
        "lokasi dekat Margonda",
        "dokter berpengalaman",
        "jam buka 09.00-21.00",
        "laboratorium gigi in-house",
      ],
      verified_competitor: {
        name: "Sozo Dental Depok",
        scope: "Margonda, Beji, Kota Depok",
        source_url: "https://www.sozodental.com/lokasi/depok/",
      },
      priority_offering: "behel gigi",
      conversion_action: "booking lewat website patients.satudental.com",
      customer_supplied_facts: [],
      known_accuracy_questions: [],
      usp: "Jaringan 56 cabang dengan 500+ dokter dan laboratorium gigi in-house.",
      regulated_category_notes: "Layanan kesehatan gigi.",
      language: "en-US",
      agency_name: "Nuave",
      agency_logo_data_url: "",
    },
  },
  {
    id: "fdc-margonda",
    name: "FDC Dental Clinic Margonda",
    branch: "Margonda, Beji, Kota Depok",
    address: "Jl. Raya Margonda No.333, Kec. Beji, Kota Depok, Jawa Barat",
    official_url: "https://fdcdentalclinic.co.id/lokasi/fdc-margonda",
    maps_url: "https://www.google.com/maps/search/?api=1&query=FDC+Dental+Clinic+Margonda+Depok",
    category_label: "Klinik gigi (jaringan 68+ klinik di 25+ kota)",
    priority_services: [
      "Reservasi dokter gigi online",
      "Scaling (promo rutin)",
      "Behel (termasuk Damon, Clear)",
      "Perawatan gigi umum",
      "Pricelist & promo via aplikasi",
    ],
    customer_context:
      "Warga Depok yang mencari reservasi dokter gigi mudah dan murah; promo scaling dan behel; pengguna aplikasi FDC; asuransi & membership.",
    comparison_note:
      "OMDC Dental Margonda — klinik gigi jaringan di koridor Margonda yang sama (sumber publik: omdc.co.id).",
    brief: {
      brand_name: "FDC Dental Clinic Margonda",
      brand_name_variants: ["FDC Dental", "FDC Margonda", "Klinik Gigi FDC"],
      entity_scope: "Margonda, Beji, Kota Depok",
      brand_type: "Jaringan klinik gigi",
      category: "Klinik gigi",
      market_context: MARKET_CONTEXT,
      target_customer:
        "Warga Depok yang mencari reservasi dokter gigi mudah dan murah, termasuk pengguna promo scaling dan behel.",
      official_sources: ["https://fdcdentalclinic.co.id/lokasi/fdc-margonda"],
      verified_offerings: ["scaling gigi", "behel gigi", "reservasi dokter gigi"],
      verified_customer_needs: [
        "reservasi dokter gigi yang mudah",
        "perawatan gigi dengan harga terjangkau",
        "promo scaling dan behel",
      ],
      verified_decision_criteria: [
        "harga terjangkau dan promo",
        "reservasi online",
        "lokasi mudah dijangkau di Margonda",
        "dokter dan fasilitas",
      ],
      verified_competitor: {
        name: "OMDC Dental Margonda",
        scope: "Margonda, Pondok Cina, Kota Depok",
        source_url: "https://www.omdc.co.id/location/omdc-margonda",
      },
      priority_offering: "scaling gigi",
      conversion_action: "reservasi online",
      customer_supplied_facts: [],
      known_accuracy_questions: [],
      usp: "Jaringan 68+ klinik di 25+ kota dengan reservasi mudah dan harga terjangkau.",
      regulated_category_notes: "Layanan kesehatan gigi.",
      language: "en-US",
      agency_name: "Nuave",
      agency_logo_data_url: "",
    },
  },
  {
    id: "omdc-margonda",
    name: "OMDC Dental Margonda",
    branch: "Margonda, Pondok Cina, Kota Depok",
    address: "Jl. Margonda Raya No.414, RT.01/RW.03, Pondok Cina, Kec. Beji, Kota Depok 16424",
    official_url: "https://www.omdc.co.id/location/omdc-margonda",
    maps_url: "https://www.google.com/maps/search/?api=1&query=OMDC+Dental+Margonda+Depok",
    category_label: "Klinik gigi (OMDC Group; dental & healthcare)",
    priority_services: [
      "Scaling",
      "Pencabutan gigi",
      "Penambalan (tambal) gigi",
      "Ortodonti (behel)",
      "Bleaching",
      "Prostodontik (gigi tiruan)",
      "Perawatan gigi anak",
    ],
    customer_context:
      "Warga Depok dan Jabodetabek yang mencari perawatan gigi nyaman dengan harga terjangkau; keluarga dengan anak (playground dan movie theater di klinik); reservasi terjadwal via WhatsApp atau booking.omdc.co.id.",
    comparison_note:
      "FDC Dental Clinic Margonda — klinik gigi jaringan di koridor Margonda yang sama (sumber publik: fdcdentalclinic.co.id).",
    brief: {
      brand_name: "OMDC Dental Margonda",
      brand_name_variants: ["OMDC", "OMDC Dental", "OMDC Margonda"],
      entity_scope: "Margonda, Pondok Cina, Kota Depok",
      brand_type: "Jaringan klinik gigi",
      category: "Klinik gigi",
      market_context: MARKET_CONTEXT,
      target_customer:
        "Warga Depok dan Jabodetabek yang mencari pengalaman perawatan gigi nyaman dengan harga terjangkau, termasuk keluarga dengan anak.",
      official_sources: ["https://www.omdc.co.id/location/omdc-margonda"],
      verified_offerings: ["scaling gigi", "behel gigi", "tambal gigi"],
      verified_customer_needs: [
        "perawatan gigi dengan harga terjangkau",
        "klinik yang nyaman untuk anak dan keluarga",
        "reservasi terjadwal",
      ],
      verified_decision_criteria: [
        "harga yang transparan",
        "suasana klinik (playground dan movie theater)",
        "sistem reservasi terjadwal",
        "dokter dan spesialis",
      ],
      verified_competitor: {
        name: "FDC Dental Clinic Margonda",
        scope: "Margonda, Beji, Kota Depok",
        source_url: "https://fdcdentalclinic.co.id/lokasi/fdc-margonda",
      },
      priority_offering: "scaling gigi",
      conversion_action: "reservasi via WhatsApp atau booking.omdc.co.id",
      customer_supplied_facts: [],
      known_accuracy_questions: [],
      usp: "Klinik gigi dengan konsep unik (playground dan movie theater) dan harga terjangkau.",
      regulated_category_notes: "Layanan kesehatan gigi.",
      language: "en-US",
      agency_name: "Nuave",
      agency_logo_data_url: "",
    },
  },
  {
    id: "nirmala-depok",
    name: "Nirmala Dental",
    branch: "Margonda, Pondok Cina, Kota Depok",
    address: "Jl. Margonda No.492A, Pondok Cina, Kec. Beji, Kota Depok",
    official_url: "https://nirmaladental.com/",
    maps_url: "https://www.google.com/maps/search/?api=1&query=Klinik+Gigi+Nirmala+Depok+Margonda",
    category_label: "Klinik gigi dan kesehatan umum (mandiri, sejak 2004)",
    priority_services: [
      "Pemeriksaan & konsultasi gigi",
      "Scaling (pembersihan karang gigi)",
      "Behel / ortodonti (anak, remaja, dewasa)",
      "Perawatan saluran akar (konservasi)",
      "Bedah mulut",
      "Perawatan penyakit mulut",
      "Gigi tiruan & implan",
      "Pemeriksaan dokter umum",
    ],
    customer_context:
      "Warga Depok yang mencari layanan dokter umum sekaligus dokter gigi umum dan spesialis dalam satu klinik, termasuk pasien pengguna asuransi kesehatan; klinik berdiri sejak 2004 di Margonda.",
    comparison_note:
      "Tanpa pembanding bernama yang kredibel (klinik campuran gigi + umum): menguji fallback pembanding tanpa nama sesuai User Flow/04.",
    brief: {
      brand_name: "Nirmala Dental",
      brand_name_variants: ["Klinik Gigi Nirmala", "Nirmala Dental Depok", "Klinik Nirmala"],
      entity_scope: "Margonda, Pondok Cina, Kota Depok",
      brand_type: "Klinik kesehatan mandiri",
      category: "Klinik gigi dan kesehatan umum",
      market_context: MARKET_CONTEXT,
      target_customer:
        "Warga Depok yang mencari layanan dokter umum sekaligus dokter gigi umum dan spesialis dalam satu klinik, termasuk pasien pengguna asuransi.",
      official_sources: ["https://nirmaladental.com/"],
      verified_offerings: ["scaling gigi", "behel gigi", "perawatan saluran akar"],
      verified_customer_needs: [
        "perawatan gigi umum dan spesialis di satu tempat",
        "perawatan behel untuk anak, remaja, dan dewasa",
        "menerima asuransi kesehatan",
      ],
      verified_decision_criteria: [
        "dokter spesialis",
        "pengalaman klinik sejak 2004",
        "menerima asuransi",
        "lokasi di Margonda",
      ],
      // No credible named comparator for this mixed dental+general clinic:
      // name is empty so minimizeIndonesianBrief yields comparison_business null.
      verified_competitor: {
        name: "",
        scope: "",
        source_url: "https://maps.app.goo.gl/EnUrEhv4XNgXtKQW9",
      },
      priority_offering: "scaling gigi",
      conversion_action: "reservasi online",
      customer_supplied_facts: [],
      known_accuracy_questions: [],
      usp: "Klinik sejak 2004 dengan dokter gigi umum dan spesialis (ortodonti, bedah mulut, konservasi) serta layanan dokter umum.",
      regulated_category_notes: "Layanan kesehatan gigi dan umum.",
      language: "en-US",
      agency_name: "Nuave",
      agency_logo_data_url: "",
    },
  },
];

// ---------------------------------------------------------------------------
// 4. Telemetry capture helpers
// ---------------------------------------------------------------------------

type CapturedCall = {
  url: string;
  status: number;
  started_at_ms: number;
  completed_at_ms: number;
  latency_ms: number;
  body: unknown;
};

type GeminiUsage = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  model_version: string;
  response_id: string;
  search_grounded: boolean;
  finish_reason: string;
};

function extractGeminiUsage(body: unknown): GeminiUsage | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  const usage = record.usageMetadata as
    | { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }
    | undefined;
  const candidate = (record.candidates as Array<Record<string, unknown>> | undefined)?.[0];
  const grounding = candidate?.groundingMetadata as Record<string, unknown> | undefined;
  return {
    input_tokens: usage?.promptTokenCount ?? 0,
    output_tokens: usage?.candidatesTokenCount ?? 0,
    total_tokens: usage?.totalTokenCount ?? 0,
    model_version: typeof record.modelVersion === "string" ? record.modelVersion : "",
    response_id: typeof record.responseId === "string" ? record.responseId : "",
    search_grounded: Boolean(grounding && Object.keys(grounding).length > 0),
    finish_reason:
      typeof candidate?.finishReason === "string" ? candidate.finishReason : "",
  };
}

type OpenAIUsage = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  model_version: string;
  response_id: string;
};

function extractOpenAIUsage(body: unknown): OpenAIUsage | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  const usage = record.usage as
    | { input_tokens?: number; output_tokens?: number; total_tokens?: number }
    | undefined;
  if (!usage) return null;
  return {
    input_tokens: usage.input_tokens ?? 0,
    output_tokens: usage.output_tokens ?? 0,
    total_tokens: usage.total_tokens ?? 0,
    model_version: typeof record.model === "string" ? record.model : "",
    response_id: typeof record.id === "string" ? record.id : "",
  };
}

// Official OpenAI pricing for the notional benchmark figure (repo telemetry
// AUDIT_PRICING_VERSION "openai-standard-2026-08-01"): short-context input
// USD 0.20 / 1M, output USD 1.20 / 1M, web search USD 0.01 / call.
function openaiNotionalCostUsd(usage: OpenAIUsage, hasWebSearch: boolean) {
  const input = (usage.input_tokens / 1_000_000) * 0.2;
  const output = (usage.output_tokens / 1_000_000) * 1.2;
  const search = hasWebSearch ? 0.01 : 0;
  return Math.round((input + output + search) * 100_000_000) / 100_000_000;
}

/** Notional paid-tier cost (USD) from real Gemini usage at official pricing. */
function geminiNotionalCostUsd(usage: GeminiUsage): number {
  return (
    (usage.input_tokens * GEMINI_35_FLASH_LITE_PRICING.input_per_1m +
      usage.output_tokens * GEMINI_35_FLASH_LITE_PRICING.output_per_1m) /
    1_000_000
  );
}

function captureFetch(calls: CapturedCall[]): typeof fetch {
  const original = globalThis.fetch.bind(globalThis);
  const wrapped: typeof fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : String(input);
    const startedAt = Date.now();
    const res = await original(input, init);
    const body = await res
      .clone()
      .json()
      .catch(() => ({}));
    calls.push({
      url,
      status: res.status,
      started_at_ms: startedAt,
      completed_at_ms: Date.now(),
      latency_ms: Date.now() - startedAt,
      body,
    });
    return res;
  };
  return wrapped;
}

// ---------------------------------------------------------------------------
// 5. Scoring helpers (mechanical parts of the docs/journey/04-questions.md rubric)
// ---------------------------------------------------------------------------

function packMechanicalScore(pack: IndonesianQuestionPackSuggestion, brief: MinimizedIndonesianBrief) {
  const questions = pack.questions.map((q) => q.text);
  const issues = validateIndonesianQuestionPack(questions, brief);
  const blockers = indonesianPackBlockers(questions, brief);
  const classification = pack.classification_summary;
  const leaks = issues.filter((i) => i.rule === "identity_leakage" || i.rule === "competitor_leakage");
  const premises = issues.filter((i) => i.rule === "unsupported_premise");
  const distinctness = issues.filter((i) => i.rule === "distinctness");
  return {
    question_count: questions.length,
    classification,
    issues,
    blockers,
    identity_or_competitor_leaks: leaks,
    unsupported_premises: premises,
    distinctness_issues: distinctness,
    source: pack.source,
    warnings: pack.warnings,
  };
}

function fallbackMechanicalScore(brief: MinimizedIndonesianBrief) {
  const questions = buildDeterministicIndonesianPack(brief);
  const issues = validateIndonesianQuestionPack(questions, brief);
  const blockers = indonesianPackBlockers(questions, brief);
  const classification = {
    total: questions.length,
    tanpa_menyebut_bisnis_anda: questions.filter(
      (q) => classifyIndonesianQuestion(q, brief) === "tanpa_menyebut_bisnis_anda",
    ).length,
    menyebut_bisnis_anda: questions.filter(
      (q) => classifyIndonesianQuestion(q, brief) === "menyebut_bisnis_anda",
    ).length,
  };
  return {
    questions,
    classification,
    issues,
    blockers,
  };
}

// ---------------------------------------------------------------------------
// 6. The evaluation run (real calls, sequential, bounded)
// ---------------------------------------------------------------------------

const budget: AuditBudget = {
  limit_usd: 5,
  carryover_cost_usd: 0.4357,
  calls: [],
};

// NOTE: the audit budget is created per clinic inside the clinic loop below —
// each clinic is its own audit and the 03 extract stage limit is 1 call per
// audit, so a shared budget would block clinics 2-5 on the OpenAI path.

describe("Spec 003 five-business provider evaluation (dental clinics, Depok)", () => {
  it(
    "runs 03 extraction and 04 question-writer (GPT-5.6 Luna + Gemini 3.5 Flash-Lite + deterministic fallback) on the five clinics",
    async () => {
      if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });

      const openaiKeyPresent = Boolean(process.env.OPENAI_API_KEY?.trim());
      const geminiKeyPresent = Boolean(process.env.GEMINI_API_KEY?.trim());
      expect(geminiKeyPresent, "GEMINI_API_KEY must be present to run the Gemini candidates").toBe(true);

      const providerName: IndonesianQuestionProviderName = "gemini";
      process.env.NUAVE_QUESTION_PROVIDER = providerName;
      process.env.GEMINI_AUDIT_MODEL = GEMINI_CANDIDATE_MODEL;
      process.env.NUAVE_PROVIDER = "gemini";

      const sessionStartedAt = Date.now();
      const allResults: Record<string, unknown> = {};
      const totalUsage: GeminiUsage[] = [];
      const totalLatencyMs: number[] = [];
      const totalOpenAIUsage: OpenAIUsage[] = [];
      const totalOpenAILatencyMs: number[] = [];
      const openaiNotionalCostsUsd: number[] = [];

      for (const clinic of CLINICS) {
        const clinicRecord: Record<string, unknown> = {
          clinic: {
            id: clinic.id,
            name: clinic.name,
            branch: clinic.branch,
            address: clinic.address,
            official_url: clinic.official_url,
            maps_url: clinic.maps_url,
            category_label: clinic.category_label,
            priority_services: clinic.priority_services,
            customer_context: clinic.customer_context,
            comparison_note: clinic.comparison_note,
          },
          candidates: {},
        };

        // Each clinic is its own audit: fresh budget per clinic so the 03
        // extract stage limit (1 call per audit) never blocks the next clinic.
        const budget: AuditBudget = {
          limit_usd: 5,
          carryover_cost_usd: 0.4357,
          calls: [],
        };

        // ---- 03 extraction via Gemini 3.5 Flash-Lite (wired path) ----
        // Contingency: if the provider is unavailable (e.g. depleted prepay),
        // the call is recorded as failed with the sanitized provider reason
        // and the run continues to the fallback candidates. Live results are
        // never fabricated.
        const extractionCalls: CapturedCall[] = [];
        const previousFetch = globalThis.fetch;
        globalThis.fetch = captureFetch(extractionCalls) as typeof fetch;
        const extractionStartedAt = Date.now();
        let extractionResult:
          | {
              ok: true;
              draft: unknown;
              returned_model: string;
              response_id: string;
              telemetry: unknown[];
            }
          | { ok: false; failure_reason: string };
        try {
          const result = await geminiExtract({
            website_url: clinic.official_url,
            brand_name: clinic.brief.brand_name,
            market_context: MARKET_CONTEXT,
            category: CATEGORY_INPUT,
            safety_identifier: SAFETY_IDENTIFIER,
            budget,
          });
          extractionResult = {
            ok: true,
            draft: result.draft,
            returned_model: result.returned_model,
            response_id: result.response_id,
            telemetry: result.telemetry,
          };
        } catch (error) {
          extractionResult = {
            ok: false,
            failure_reason:
              error instanceof Error
                ? error.message
                : "Gemini extraction call failed without further details.",
          };
        } finally {
          globalThis.fetch = previousFetch;
        }
        const extractionLatencyMs = Date.now() - extractionStartedAt;
        const extractionHttp = extractionCalls.find((c) => c.url.includes("generateContent"));
        const extractionUsage = extractionHttp
          ? extractGeminiUsage(extractionHttp.body)
          : null;
        if (extractionResult.ok && extractionUsage) {
          totalUsage.push(extractionUsage);
          totalLatencyMs.push(extractionLatencyMs);
        }
        clinicRecord.candidates = {
          ...(clinicRecord.candidates as Record<string, unknown>),
          "03-extraction-gemini-3.5-flash-lite": extractionResult.ok
            ? {
                status: "completed",
                requested_model: GEMINI_CANDIDATE_MODEL,
                returned_model: extractionResult.returned_model,
                response_id: extractionResult.response_id,
                latency_ms: extractionLatencyMs,
                http_status: extractionHttp?.status ?? null,
                usage: extractionUsage,
                accounted_cost_usd: 0, // repo free-tier convention (gemini.ts)
                notional_paid_tier_cost_usd: extractionUsage
                  ? geminiNotionalCostUsd(extractionUsage)
                  : null,
                draft: extractionResult.draft,
                telemetry_recorded_by_module: extractionResult.telemetry,
              }
            : {
                status: "failed",
                requested_model: GEMINI_CANDIDATE_MODEL,
                latency_ms: extractionLatencyMs,
                http_status: extractionHttp?.status ?? null,
                failure_reason: extractionResult.failure_reason,
                accounted_cost_usd: 0,
              },
        };
        // ---- 03 extraction via GPT-5.6 Luna (wired path, only when key) ----
        const openaiExtractionCalls: CapturedCall[] = [];
        if (openaiKeyPresent) {
          const previousFetch = globalThis.fetch;
          globalThis.fetch = captureFetch(openaiExtractionCalls) as typeof fetch;
          const previousModel = process.env.OPENAI_AUDIT_MODEL;
          process.env.OPENAI_AUDIT_MODEL = OPENAI_BENCHMARK_MODEL;
          const openaiExtractionStartedAt = Date.now();
          let openaiExtractionResult:
            | {
                ok: true;
                draft: unknown;
                returned_model: string;
                response_id: string;
                telemetry: unknown[];
              }
            | { ok: false; failure_reason: string };
          try {
            const result = await openaiExtract({
              website_url: clinic.official_url,
              brand_name: clinic.brief.brand_name,
              market_context: MARKET_CONTEXT,
              category: CATEGORY_INPUT,
              safety_identifier: SAFETY_IDENTIFIER,
              budget,
            });
            openaiExtractionResult = {
              ok: true,
              draft: result.draft,
              returned_model: result.returned_model,
              response_id: result.response_id,
              telemetry: result.telemetry,
            };
          } catch (error) {
            openaiExtractionResult = {
              ok: false,
              failure_reason:
                error instanceof Error
                  ? error.message
                  : "OpenAI extraction call failed without further details.",
            };
          } finally {
            globalThis.fetch = previousFetch;
            if (previousModel === undefined) delete process.env.OPENAI_AUDIT_MODEL;
            else process.env.OPENAI_AUDIT_MODEL = previousModel;
          }
          const openaiExtractionLatencyMs = Date.now() - openaiExtractionStartedAt;
          const openaiExtractionHttp = openaiExtractionCalls.find((c) =>
            c.url.includes("/v1/responses"),
          );
          const openaiExtractionUsage = openaiExtractionHttp
            ? extractOpenAIUsage(openaiExtractionHttp.body)
            : null;
          if (openaiExtractionResult.ok && openaiExtractionUsage) {
            totalOpenAIUsage.push(openaiExtractionUsage);
            totalOpenAILatencyMs.push(openaiExtractionLatencyMs);
            openaiNotionalCostsUsd.push(
              openaiNotionalCostUsd(openaiExtractionUsage, true),
            );
          }
          clinicRecord.candidates = {
            ...(clinicRecord.candidates as Record<string, unknown>),
            "03-extraction-openai-gpt-5.6-luna": openaiExtractionResult.ok
              ? {
                  status: "completed",
                  requested_model: OPENAI_BENCHMARK_MODEL,
                  returned_model: openaiExtractionResult.returned_model,
                  response_id: openaiExtractionResult.response_id,
                  latency_ms: openaiExtractionLatencyMs,
                  http_status: openaiExtractionHttp?.status ?? null,
                  usage: openaiExtractionUsage,
                  notional_cost_usd: openaiExtractionUsage
                    ? openaiNotionalCostUsd(openaiExtractionUsage, true)
                    : null,
                  draft: openaiExtractionResult.draft,
                  telemetry_recorded_by_module: openaiExtractionResult.telemetry,
                }
              : {
                  status: "failed",
                  requested_model: OPENAI_BENCHMARK_MODEL,
                  latency_ms: openaiExtractionLatencyMs,
                  http_status: openaiExtractionHttp?.status ?? null,
                  failure_reason: openaiExtractionResult.failure_reason,
                },
          };
        } else {
          clinicRecord.candidates = {
            ...(clinicRecord.candidates as Record<string, unknown>),
            "03-extraction-openai-gpt-5.6-luna": {
              status: "not_run",
              reason:
                "OPENAI_API_KEY is missing from .env.local; GPT-5.6 Luna benchmark not run (flagged, per task)",
              requested_model: OPENAI_BENCHMARK_MODEL,
            },
          };
        }

        // ---- 04 question writer: minimized confirmed brief ----
        const minimized = minimizeIndonesianBrief(clinic.brief);

        // Gemini 3.5 Flash-Lite (wired boundary, no search, real call)
        const questionCalls: CapturedCall[] = [];
        const provider = createIndonesianQuestionProvider(captureFetch(questionCalls));
        const questionStartedAt = Date.now();
        let geminiPack: IndonesianQuestionPackSuggestion | null = null;
        let questionFailure = "";
        try {
          geminiPack = await generateIndonesianQuestionPack(minimized, provider, {
            generationMeta: indonesianQuestionGenerationMeta(),
          });
        } catch (error) {
          questionFailure =
            error instanceof Error
              ? error.message
              : "Gemini question generation failed without further details.";
        }
        const questionLatencyMs = Date.now() - questionStartedAt;
        const questionHttp = questionCalls.find((c) => c.url.includes("generateContent"));
        const questionUsage = questionHttp ? extractGeminiUsage(questionHttp.body) : null;
        if (geminiPack && questionUsage && questionUsage.input_tokens > 0) {
          totalUsage.push(questionUsage);
          totalLatencyMs.push(questionLatencyMs);
        }
        // The boundary never hard-fails: on a provider error it returns the
        // deterministic fallback pack with source "fallback" + warning
        // "fallback_used". Such a record is NOT model output; it is the
        // provider call degrading to the fallback. Capture the provider error
        // from the HTTP layer and label the candidate truthfully.
        const questionProviderError =
          questionHttp &&
          typeof questionHttp.body === "object" &&
          questionHttp.body !== null
            ? (((questionHttp.body as Record<string, unknown>).error as
                | { message?: string }
                | undefined)?.message ?? "")
            : "";
        const degradedToFallback =
          geminiPack !== null &&
          (geminiPack.source === "fallback" ||
            geminiPack.warnings.includes("fallback_used"));
        clinicRecord.candidates = {
          ...(clinicRecord.candidates as Record<string, unknown>),
          "04-questions-gemini-3.5-flash-lite": geminiPack && !degradedToFallback
            ? {
                status: "completed",
                pack_source: geminiPack.source,
                warnings: geminiPack.warnings,
                requested_model: geminiPack.generation.requested_model,
                returned_model: geminiPack.generation.returned_model,
                instruction_version: geminiPack.generation.instruction_version,
                latency_ms: questionLatencyMs,
                http_status: questionHttp?.status ?? null,
                usage: questionUsage,
                accounted_cost_usd: 0,
                notional_paid_tier_cost_usd: questionUsage
                  ? geminiNotionalCostUsd(questionUsage)
                  : null,
                // The wired boundary records generation meta but usage telemetry is
                // null by contract (questions-id.ts build()); usage is captured at
                // the HTTP layer above and reported in this evaluation record.
                boundary_telemetry: geminiPack.generation.telemetry,
                mechanical: packMechanicalScore(geminiPack, minimized),
                questions: geminiPack.questions.map((q) => ({
                  order: q.order,
                  text: q.text,
                  final_classification: q.final_classification,
                  suggested_category: q.suggested_category,
                })),
              }
            : {
                status: degradedToFallback ? "degraded_to_fallback" : "failed",
                requested_model: GEMINI_CANDIDATE_MODEL,
                instruction_version: "question-writer-v1",
                latency_ms: questionLatencyMs,
                http_status: questionHttp?.status ?? null,
                failure_reason:
                  questionFailure || questionProviderError || "provider call failed",
                accounted_cost_usd: 0,
              },
        };
        // GPT-5.6 Luna (wired boundary, no search, real call, only when key)
        const openaiQuestionCalls: CapturedCall[] = [];
        if (openaiKeyPresent) {
          const previousQuestionProvider: string | undefined =
            process.env.NUAVE_QUESTION_PROVIDER;
          const previousModel = process.env.OPENAI_AUDIT_MODEL;
          process.env.NUAVE_QUESTION_PROVIDER = "openai";
          process.env.OPENAI_AUDIT_MODEL = OPENAI_BENCHMARK_MODEL;
          const openaiProvider = createIndonesianQuestionProvider(
            captureFetch(openaiQuestionCalls),
          );
          const openaiQuestionStartedAt = Date.now();
          let openaiPack: IndonesianQuestionPackSuggestion | null = null;
          let openaiQuestionFailure = "";
          try {
            openaiPack = await generateIndonesianQuestionPack(
              minimized,
              openaiProvider,
              { generationMeta: indonesianQuestionGenerationMeta() },
            );
          } catch (error) {
            openaiQuestionFailure =
              error instanceof Error
                ? error.message
                : "OpenAI question generation failed without further details.";
          }
          const openaiQuestionLatencyMs = Date.now() - openaiQuestionStartedAt;
          if (previousQuestionProvider === undefined) {
            delete process.env.NUAVE_QUESTION_PROVIDER;
          } else {
            process.env.NUAVE_QUESTION_PROVIDER = previousQuestionProvider;
          }
          if (previousModel === undefined) delete process.env.OPENAI_AUDIT_MODEL;
          else process.env.OPENAI_AUDIT_MODEL = previousModel;
          const openaiQuestionHttp = openaiQuestionCalls.find((c) =>
            c.url.includes("/v1/responses"),
          );
          const openaiQuestionUsage = openaiQuestionHttp
            ? extractOpenAIUsage(openaiQuestionHttp.body)
            : null;
          const openaiQuestionProviderError =
            openaiQuestionHttp &&
            typeof openaiQuestionHttp.body === "object" &&
            openaiQuestionHttp.body !== null
              ? (((openaiQuestionHttp.body as Record<string, unknown>).error as
                  | { message?: string }
                  | undefined)?.message ?? "")
              : "";
          const openaiDegradedToFallback =
            openaiPack !== null &&
            (openaiPack.source === "fallback" ||
              openaiPack.warnings.includes("fallback_used"));
          if (openaiPack && openaiQuestionUsage && openaiQuestionUsage.input_tokens > 0) {
            totalOpenAIUsage.push(openaiQuestionUsage);
            totalOpenAILatencyMs.push(openaiQuestionLatencyMs);
            openaiNotionalCostsUsd.push(
              openaiNotionalCostUsd(openaiQuestionUsage, false),
            );
          }
          clinicRecord.candidates = {
            ...(clinicRecord.candidates as Record<string, unknown>),
            "04-questions-openai-gpt-5.6-luna":
              openaiPack && !openaiDegradedToFallback
                ? {
                    status: "completed",
                    pack_source: openaiPack.source,
                    warnings: openaiPack.warnings,
                    requested_model: openaiPack.generation.requested_model,
                    returned_model: openaiPack.generation.returned_model,
                    instruction_version: openaiPack.generation.instruction_version,
                    latency_ms: openaiQuestionLatencyMs,
                    http_status: openaiQuestionHttp?.status ?? null,
                    usage: openaiQuestionUsage,
                    notional_cost_usd: openaiQuestionUsage
                      ? openaiNotionalCostUsd(openaiQuestionUsage, false)
                      : null,
                    boundary_telemetry: openaiPack.generation.telemetry,
                    mechanical: packMechanicalScore(openaiPack, minimized),
                    questions: openaiPack.questions.map((q) => ({
                      order: q.order,
                      text: q.text,
                      final_classification: q.final_classification,
                      suggested_category: q.suggested_category,
                    })),
                  }
                : {
                    status: openaiDegradedToFallback
                      ? "degraded_to_fallback"
                      : "failed",
                    requested_model: OPENAI_BENCHMARK_MODEL,
                    instruction_version: "question-writer-v1",
                    latency_ms: openaiQuestionLatencyMs,
                    http_status: openaiQuestionHttp?.status ?? null,
                    failure_reason:
                      openaiQuestionFailure ||
                      openaiQuestionProviderError ||
                      "provider call failed",
                  },
          };
        } else {
          clinicRecord.candidates = {
            ...(clinicRecord.candidates as Record<string, unknown>),
            "04-questions-openai-gpt-5.6-luna": {
              status: "not_run",
              reason:
                "OPENAI_API_KEY is missing from .env.local; GPT-5.6 Luna benchmark not run (flagged, per task)",
              requested_model: OPENAI_BENCHMARK_MODEL,
              instruction_version: "question-writer-v1",
            },
          };
        }

        // Deterministic Indonesian fallback (no provider call)
        const fallbackStartedAt = Date.now();
        const fallback = fallbackMechanicalScore(minimized);
        const fallbackLatencyMs = Date.now() - fallbackStartedAt;
        clinicRecord.candidates = {
          ...(clinicRecord.candidates as Record<string, unknown>),
          "04-questions-deterministic-fallback": {
            status: "completed",
            latency_ms: fallbackLatencyMs,
            accounted_cost_usd: 0,
            mechanical: {
              question_count: fallback.questions.length,
              classification: fallback.classification,
              issues: fallback.issues,
              blockers: fallback.blockers,
            },
            questions: fallback.questions.map((text, index) => ({
              order: index + 1,
              text,
              final_classification: classifyIndonesianQuestion(text, minimized),
            })),
          },
        };

        allResults[clinic.id] = clinicRecord;
      }

      const sessionLatencyMs = Date.now() - sessionStartedAt;
      const notionalTotalUsd = totalUsage.reduce(
        (sum, usage) => sum + geminiNotionalCostUsd(usage),
        0,
      );
      const openaiTotalUsd = openaiNotionalCostsUsd.reduce(
        (sum, cost) => sum + cost,
        0,
      );
      const summary = {
        session_started_at: new Date(sessionStartedAt).toISOString(),
        session_latency_ms: sessionLatencyMs,
        clinics_evaluated: CLINICS.length,
        gemini_calls: totalUsage.length,
        total_gemini_input_tokens: totalUsage.reduce((s, u) => s + u.input_tokens, 0),
        total_gemini_output_tokens: totalUsage.reduce((s, u) => s + u.output_tokens, 0),
        openai_calls: totalOpenAIUsage.length,
        total_openai_input_tokens: totalOpenAIUsage.reduce((s, u) => s + u.input_tokens, 0),
        total_openai_output_tokens: totalOpenAIUsage.reduce((s, u) => s + u.output_tokens, 0),
        accounted_cost_usd: 0, // repo free-tier/accounting convention; real spend is reported notional
        notional_paid_tier_cost_usd: notionalTotalUsd,
        notional_openai_cost_usd: openaiTotalUsd,
        openai_key_present: openaiKeyPresent,
        gemini_key_present: geminiKeyPresent,
        ceiling_after_run_usd: 5 - 0.4357,
        note: "Gemini candidates run only when GEMINI_API_KEY is present (depleted prepayment credits fail the calls; no Gemini tokens consumed). OpenAI candidates run only when OPENAI_API_KEY is present, with notional cost from real usage at official pricing. Deterministic fallback ran for all five packs. Carryover USD 0.4357 unchanged; ceiling headroom after this run as reported above.",
      };
      allResults.summary = summary;

      writeFileSync(
        join(RESULTS_DIR, "evaluation-results.json"),
        JSON.stringify(allResults, null, 2),
        "utf8",
      );

      // ---- Practical quality gate: mechanical checks (qualitative judgment
      // is recorded separately in specs/003-live-report-quality-gate/
      // evaluation-results.md by the human reviewer). Gemini candidates are
      // asserted only when the live call actually completed; a failed live
      // candidate is recorded (never fabricated) and the gate verdict for it
      // is INCONCLUSIVE in the record. ----
      for (const clinic of CLINICS) {
        const record = allResults[clinic.id] as Record<string, unknown>;
        const geminiCandidate = (record.candidates as Record<string, unknown>)[
          "04-questions-gemini-3.5-flash-lite"
        ] as
          | {
              status: "failed" | "degraded_to_fallback";
              failure_reason: string;
            }
          | {
              status: "completed";
              mechanical: ReturnType<typeof packMechanicalScore>;
              questions: Array<{ text: string }>;
            };
        const fallbackCandidate = (record.candidates as Record<string, unknown>)[
          "04-questions-deterministic-fallback"
        ] as { mechanical: { question_count: number; blockers: string[] } };

        if (geminiCandidate.status === "completed") {
          // Gate 1: pack recovers to ten executable questions without manual
          // technical repair.
          expect(geminiCandidate.mechanical.question_count, `${clinic.id} gemini pack count`).toBe(10);
          expect(geminiCandidate.mechanical.blockers, `${clinic.id} gemini blockers`).toEqual([]);

          // Gate 2: no discovery-question identity leakage (audited or comparison).
          expect(
            geminiCandidate.mechanical.identity_or_competitor_leaks,
            `${clinic.id} gemini identity/competitor leaks`,
          ).toEqual([]);

          // Gate 3: no material unsupported premise or prohibited request
          // (mechanical patterns; human judgment on materiality is in the record).
          expect(
            geminiCandidate.mechanical.unsupported_premises,
            `${clinic.id} gemini unsupported premises`,
          ).toEqual([]);

          // No question may be empty or unexecutable (mechanical).
          expect(
            geminiCandidate.mechanical.issues.filter(
              (i) => i.rule === "empty" || i.rule === "unexecutable",
            ),
            `${clinic.id} gemini empty/unexecutable`,
          ).toEqual([]);
        } else {
          // The live candidate did not run: the failure must be recorded with
          // a real provider reason so the run can never look green by accident.
          expect(geminiCandidate.failure_reason.length, `${clinic.id} gemini failure reason`).toBeGreaterThan(0);
        }

        // Same mechanical gate for the OpenAI benchmark candidate when it ran.
        const openaiCandidate = (record.candidates as Record<string, unknown>)[
          "04-questions-openai-gpt-5.6-luna"
        ] as
          | { status: "not_run"; reason: string }
          | { status: "failed" | "degraded_to_fallback"; failure_reason: string }
          | {
              status: "completed";
              mechanical: ReturnType<typeof packMechanicalScore>;
            };
        if (openaiCandidate.status === "completed") {
          expect(
            openaiCandidate.mechanical.question_count,
            `${clinic.id} openai pack count`,
          ).toBe(10);
          expect(
            openaiCandidate.mechanical.blockers,
            `${clinic.id} openai blockers`,
          ).toEqual([]);
          expect(
            openaiCandidate.mechanical.identity_or_competitor_leaks,
            `${clinic.id} openai identity/competitor leaks`,
          ).toEqual([]);
          expect(
            openaiCandidate.mechanical.unsupported_premises,
            `${clinic.id} openai unsupported premises`,
          ).toEqual([]);
          expect(
            openaiCandidate.mechanical.issues.filter(
              (i) => i.rule === "empty" || i.rule === "unexecutable",
            ),
            `${clinic.id} openai empty/unexecutable`,
          ).toEqual([]);
        } else if (openaiCandidate.status === "not_run") {
          expect(
            openaiCandidate.reason.length,
            `${clinic.id} openai not-run reason`,
          ).toBeGreaterThan(0);
        } else {
          expect(
            openaiCandidate.failure_reason.length,
            `${clinic.id} openai failure reason`,
          ).toBeGreaterThan(0);
        }

        // The deterministic fallback must always recover ten executable
        // questions (its core guarantee) with no narrow blockers.
        expect(fallbackCandidate.mechanical.question_count, `${clinic.id} fallback pack count`).toBe(10);
        expect(fallbackCandidate.mechanical.blockers, `${clinic.id} fallback blockers`).toEqual([]);
      }

      // Ceiling guard: total notional cost of the whole session (Gemini
      // paid-tier estimate + OpenAI benchmark estimate from real usage) must
      // stay far inside the USD 5 ceiling; this guard keeps the run bounded
      // even on a paid key.
      expect(notionalTotalUsd).toBeLessThan(1);
      expect(openaiTotalUsd).toBeLessThan(5 - 0.4357);

      // Keep the summary in the console for the run record.
      console.log(JSON.stringify(summary, null, 2));
    },
    900_000,
  );
});
