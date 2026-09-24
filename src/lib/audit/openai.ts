import { createHash } from "node:crypto";
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseCreateParamsWithTools } from "openai/lib/ResponsesParser";
import type { Response } from "openai/resources/responses/responses";
import {
  SOURCE_TITLE_MAX_LENGTH,
  extractionDraftSchema,
  publicSourceDataSchema,
  type PublicSourceData,
  reportSynthesisSchema,
  type AuditObservation,
  type AuditBudget,
  type AuditCallTelemetry,
  type AuditPrompt,
  type BusinessBrief,
  type ExtractionDraft,
  type ReportContent,
  type ReportSynthesis,
  type Source,
} from "./types";
import {
  DEFAULT_OBSERVATION_INSTRUCTION_VERSION,
  OBSERVATION_INSTRUCTION_VERSION_LEGACY_EN,
  OBSERVATION_INSTRUCTION_VERSION_NEUTRAL_ID,
  REPORT_SYNTHESIS_PROMPT_VERSION,
  REPORT_SYNTHESIS_PROMPT_VERSION_V2,
  assembleReportContent,
  type ObservationInstructionVersion,
} from "./contracts";
import {
  reportAssessmentInstructions,
  reportPromptMeasurements,
} from "./report-prompt-contract";
import { reportWritingInstructions } from "./report-language";
import { contextForReportModel } from "./direct-ten-context-v2";
import { isOpenCodeGoBaseUrl, opencodeGoTransportHeaders } from "./opencodego";
import type { HistoricalPromptPackId } from "./measurement-matrix";
import type { AuditQuestionMethod } from "./locked-question-pack";
import {
  AUDIT_CALL_LIMITS,
  AUDIT_MODEL,
  AuditCallExecutionError,
  completedCallTelemetry,
  failedCallTelemetry,
  providerCompletionDiagnostics,
  reserveAuditCall,
  structuredOutputFailureDetail,
} from "./telemetry";

const DEFAULT_MODEL = AUDIT_MODEL;
const REASONING_EFFORTS = [
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;

type ReasoningEffort = (typeof REASONING_EFFORTS)[number];
type CostControlledResponseParams = ResponseCreateParamsWithTools & {
  max_tool_calls?: number;
};

function client() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured on the Nuave server.");
  }
  const baseURL = process.env.OPENAI_BASE_URL?.trim() || undefined;
  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
    // OpenCode Go rejects requests without its routing session header; the
    // protected path sets OPENAI_BASE_URL to the OpenCode Go endpoint.
    ...(isOpenCodeGoBaseUrl(baseURL)
      ? { defaultHeaders: opencodeGoTransportHeaders() }
      : {}),
  });
}

export function auditModel() {
  return process.env.OPENAI_AUDIT_MODEL?.trim() || DEFAULT_MODEL;
}

export function auditReasoningEffort(fallback: ReasoningEffort) {
  const configured = process.env.OPENAI_AUDIT_REASONING_EFFORT?.trim();
  if (!configured) return fallback;
  if (!REASONING_EFFORTS.some((effort) => effort === configured)) {
    throw new Error(
      `OPENAI_AUDIT_REASONING_EFFORT must be one of: ${REASONING_EFFORTS.join(", ")}.`,
    );
  }
  return configured as ReasoningEffort;
}

export function auditObservationSearchTool() {
  return {
    type: "web_search" as const,
    search_context_size: "medium" as const,
  };
}

export function hashSafetyIdentifier(value: string) {
  return createHash("sha256")
    .update(`nuave:${value}`)
    .digest("hex")
    .slice(0, 64);
}

function hostnameFromUrl(value: string) {
  return new URL(value).hostname.replace(/^www\./, "");
}

/**
 * Versioned neutral observation instruction texts (Spec 003 R-14). The live
 * observation request carries exactly one of these as its developer
 * instruction, the exact locked question, and verified location context only
 * when the question itself does not already carry it — never the business
 * brief (R-15).
 */
export const OBSERVATION_INSTRUCTION_TEXTS: Record<
  ObservationInstructionVersion,
  string
> = {
  [OBSERVATION_INSTRUCTION_VERSION_LEGACY_EN]: [
    "Answer the user's question naturally in English as a standalone customer query.",
    "Use live web search. Do not discuss this audit, prompt engineering, scoring, or Nuave.",
    "Do not favor the audited brand. State uncertainty when public information is incomplete or conflicting.",
  ].join("\n"),
  [OBSERVATION_INSTRUCTION_VERSION_NEUTRAL_ID]: [
    "Jawab pertanyaan pengguna secara alami dalam Bahasa Indonesia.",
    "Gunakan pencarian web.",
    "Jangan membahas Nuave, audit, skor, metodologi, atau cara pertanyaan dibuat.",
    "Jangan mengutamakan bisnis tertentu.",
    "Jika informasi publik tidak lengkap atau berbeda, jelaskan ketidakpastiannya.",
  ].join("\n"),
};

export function observationInstructionText(
  version: ObservationInstructionVersion,
) {
  return OBSERVATION_INSTRUCTION_TEXTS[version];
}

export function structuredOutputOrThrow<T>(
  value: T | null,
  label: string,
  response: Pick<Response, "status" | "incomplete_details" | "output">,
): T {
  if (!value) {
    const detail = structuredOutputFailureDetail(
      providerCompletionDiagnostics(response),
    );
    throw new Error(
      `${label} did not return usable structured data.${detail ? ` ${detail}` : ""}`,
    );
  }
  return value;
}

export const extractionModelDraftSchema = extractionDraftSchema.extend({
  similar_businesses: z
    .array(
      z.object({
        name: z.string().trim().max(160),
        source_url: z.string().trim().max(2_000),
      }),
    )
    .max(3),
});

type ExtractionResponseResult = Pick<
  Response,
  "status" | "incomplete_details" | "output"
> & {
  output_parsed: ExtractionDraft | null;
};

type ExtractionFallbackInput = {
  website_url: string;
  brand_name: string;
  market_context: string;
  category: string;
};

function missingExtractionWarning(response: ExtractionResponseResult) {
  if (response.incomplete_details?.reason === "max_output_tokens") {
    return "Automatic website extraction reached its output limit before it produced a structured draft.";
  }
  if (response.incomplete_details?.reason === "content_filter") {
    return "Automatic website extraction stopped before it produced a structured draft.";
  }
  const refused = response.output.some(
    (item) =>
      item.type === "message" &&
      item.content.some((content) => content.type === "refusal"),
  );
  if (refused) {
    return "Automatic website extraction did not produce a structured draft.";
  }
  if (response.status && response.status !== "completed") {
    return `Automatic website extraction ended with provider status ${response.status} before it produced a structured draft.`;
  }
  return "Automatic website extraction completed without a usable structured draft.";
}

export function extractionDraftOrManualFallback(
  input: ExtractionFallbackInput,
  response: ExtractionResponseResult,
  attempts = 1,
): ExtractionDraft {
  if (response.output_parsed) return response.output_parsed;

  // The private audit allows one extraction retry. Keep the paid telemetry, but
  // discard unparsed content and let the founder finish the brief manually.
  return {
    brand_name: input.brand_name,
    entity_scope: "",
    brand_type: "",
    category: input.category,
    market_context: input.market_context,
    service_channels: [],
    market_reach: "",
    market_areas: [],
    target_customer: "",
    official_sources: [input.website_url],
    verified_offerings: [],
    verified_customer_needs: [],
    verified_decision_criteria: [],
    similar_businesses: [],
    brand_name_variants: [],
    priority_offering: "",
    conversion_action: "",
    customer_supplied_facts: [],
    known_accuracy_questions: [],
    usp: "",
    regulated_category_notes: "",
    evidence: [],
    warnings: [
      missingExtractionWarning(response),
      ...(attempts > 1
        ? [
            "Nuave retried the automatic extraction once and the retry did not produce a structured draft either.",
          ]
        : []),
      "No extracted business facts were retained. Complete and verify every required field manually using the official website before approving the brief.",
    ],
  };
}

export function normalizeSourceTitle(title: string | undefined, url: string) {
  const value = title?.trim() || url;
  if (value.length <= SOURCE_TITLE_MAX_LENGTH) return value;

  let shortened = value.slice(0, SOURCE_TITLE_MAX_LENGTH - 1).trimEnd();
  const finalCodeUnit = shortened.charCodeAt(shortened.length - 1);
  if (finalCodeUnit >= 0xd800 && finalCodeUnit <= 0xdbff) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}…`;
}

type ExtractionInput = {
  website_url: string;
  brand_name: string;
  market_context: string;
  category: string;
  identity_unverified?: boolean;
  safety_identifier: string;
  budget: AuditBudget;
  public_source_data?: PublicSourceData;
};

/**
 * Bounds on the drafted object. `extractionDraftSchema` has no array ceiling
 * (OpenAI structured outputs ignores `maxItems`), so the only place the draft
 * length can be constrained is the instruction itself. Without these the
 * evidence array grows with the size of the website and can run the response
 * past its output allowance, which discards the whole paid draft.
 */
const EXTRACTION_LENGTH_INSTRUCTIONS = [
  "Return at most eight items in any list.",
  "Return at most three similar_businesses suggestions.",
  "Return at most twelve evidence records, covering the most material values only.",
  "Keep every evidence note to one short clause.",
];

const EXTRACTION_RETRY_BREVITY_INSTRUCTION =
  "The previous attempt ran past its output limit. Return a shorter draft: at most four items per list except market_areas, at most six evidence records, and no note longer than eight words. For market_areas preserve a faithful description of up to eight supported geographic areas without shortening it to four; national/international presence still has no active areas.";

function extractionRequest(
  input: Omit<ExtractionInput, "budget">,
  requestedModel: string,
  extraInstructions: string[],
) {
  const websiteDomain = hostnameFromUrl(input.website_url);
  const sourceData =
    input.public_source_data === undefined
      ? undefined
      : publicSourceDataSchema.parse(input.public_source_data);
  if (sourceData) {
    const url = new URL(sourceData.source_url);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      hostnameFromUrl(sourceData.source_url) !== websiteDomain
    ) {
      throw new Error(
        "Source data must belong to the supplied official domain.",
      );
    }
  }
  return {
    model: requestedModel,
    reasoning: { effort: auditReasoningEffort("low") },
    store: false,
    service_tier: "default" as const,
    max_output_tokens: AUDIT_CALL_LIMITS.extract.max_output_tokens,
    max_tool_calls: AUDIT_CALL_LIMITS.extract.max_tool_calls,
    safety_identifier: hashSafetyIdentifier(input.safety_identifier),
    tools: [
      {
        type: "web_search" as const,
        filters: { allowed_domains: [websiteDomain] },
        search_context_size: "medium" as const,
      },
    ],
    tool_choice: "required" as const,
    include: ["web_search_call.action.sources"] as const,
    text: {
      format: zodTextFormat(extractionModelDraftSchema, "nuave_business_draft"),
      verbosity: "low" as const,
    },
    input: [
      {
        role: "developer" as const,
        content: [
          "Extract a review draft using only public facts supported by the supplied official website.",
          "Do not infer praise, reputation, quality, target demographics, or outcomes.",
          "All ordinary business facts must be supported by the official website. similar_businesses is the only exception: it is an optional suggestion list for human review, not a verified fact.",
          "Suggest at most three genuinely comparable businesses only when you can supply a specific public website or Instagram profile URL with high confidence from existing model knowledge. Never include the audited business itself. Never guess or fabricate a business or URL; return an empty list when uncertain.",
          "Do not add similar_businesses items to evidence, and do not claim they were found on the official website unless the website actually supports that.",
          "Web search remains restricted to the supplied official domain; do not imply that competitor URLs were web-verified by this extraction call.",
          "Tulis semua teks penjelasan secara ringkas dan alami dalam Bahasa Indonesia. Pertahankan nama resmi, nama produk, nama tempat, URL, dan kutipan bukti persis seperti sumbernya.",
          "Gunakan bukti halaman awal terlebih dahulu. Jika jangkauan saat ini belum didukung atau ambigu, arahkan pencarian domain resmi yang sudah tersedia ke bukti lokasi operasional atau area layanan resmi dengan identitas/domain yang diberikan dan maksud pencarian lokasi/area layanan umum; jangan menebak path atau URL khusus bisnis.",
          "Pilih paling banyak satu halaman relevan pada host kanonis URL yang diberikan (www dianggap setara): direktori lokasi untuk kehadiran di tempat usaha, pernyataan cakupan untuk klaim pengiriman. Gunakan URL bukti yang benar-benar ditemukan, bukan tautan buatan. Jika pilihan di antara beberapa kandidat ambigu atau halaman tidak dapat dibaca, biarkan makna yang belum didukung tetap kosong. Jangan gabungkan daftar parsial, telusuri cabang satu per satu, gunakan direktori eksternal/domain lain, atau meminta pengambilan halaman maupun pemanggilan model tambahan.",
          "Isi service_channels hanya dengan cara pelanggan menerima produk atau layanan yang dinyatakan situs: on_premise di tempat usaha, on_customer di lokasi pelanggan, delivery dikirim ke pelanggan, online diterima/digunakan secara online. Pemesanan online saja bukan penggunaan layanan secara online. Kosongkan bila tidak didukung. Kehadiran nasional tidak berarti pengiriman ke setiap alamat; cakupan pengiriman memerlukan bukti tersendiri dan tidak boleh diperluas dari lokasi gerai.",
          "Untuk seluruh brand, market_reach menggambarkan kehadiran geografis bisnis melalui saluran yang dinyatakan, bukan inventaris semua gerai atau batas pengiriman setiap saluran. Gunakan sekitar untuk kehadiran berpusat pada satu area lokal yang didukung; beberapa untuk kota/wilayah bernama tanpa dukungan kehadiran nasional; seluruh untuk pernyataan ketersediaan nasional saat ini atau jaringan operasional domestik yang tersebar secara geografis dan terdokumentasi; luar untuk bukti kehadiran saat ini di Indonesia dan luar negeri. Jika klasifikasi tidak didukung, gunakan string kosong. Jangan simpulkan dari kategori umum atau market_context.",
          "Alamat kontak, aspirasi ekspansi, jumlah gerai tanpa penjelasan geografis, nama yang terdengar asing, dan daftar yang melebihi batas saja tidak membuktikan jangkauan lebih luas. Tidak ada ambang jumlah gerai untuk seluruh atau luar. Lokasi operasional yang dipublikasikan mendukung kehadiran di tempat usaha; lokasi kontak saja bukan cakupan layanan.",
          "Isi market_areas dengan paling banyak delapan nama area geografis yang diterbitkan bisnis, mempertahankan ejaannya. Untuk sekitar, gunakan satu area lokal yang didukung. Untuk beberapa, gunakan deskripsi geografis yang setia pada bukti; banyak gerai dapat berada dalam sedikit area. Gunakan deskripsi wilayah yang lebih luas hanya bila secara eksplisit diterbitkan dan setia pada bukti. Untuk seluruh atau luar, market_areas harus kosong; ukuran atau paginasi direktori saja tidak membuat kehadiran nasional yang didukung menjadi tidak diketahui. Tidak wajib merinci semua gerai atau membuktikan kelengkapan direktori.",
          "Jika kehadiran yang benar-benar regional tidak dapat diwakili secara setia dalam delapan area yang didukung dan tidak ada deskripsi wilayah lebih luas yang diterbitkan, pertahankan jangkauan yang didukung dan kosongkan market_areas agar pelanggan dapat melengkapinya. Jangan memilih delapan kota pertama atau terbesar, mengarang pengelompokan wilayah, menaikkan jangkauan untuk lolos validasi, atau mengubah fokus audit.",
          "Leave unsupported scalar fields empty and unsupported arrays empty.",
          ...(input.identity_unverified
            ? [
                "The supplied brand name is unverified. Do not present it as confirmed; if the official source does not provide a confident name, leave brand_name empty.",
              ]
            : []),
          "For each material extracted value add an evidence record with the exact field, value, source URL, and a short note.",
          ...EXTRACTION_LENGTH_INSTRUCTIONS,
          ...extraInstructions,
          "The values are suggestions for human confirmation, not verified facts.",
        ].join("\n"),
      },
      {
        role: "user" as const,
        content: JSON.stringify({
          official_website: input.website_url,
          supplied_brand_name: input.brand_name,
          supplied_market_context: input.market_context,
          supplied_category: input.category,
          supplied_brand_name_unverified: Boolean(input.identity_unverified),
          ...(sourceData ? { public_source_data: sourceData } : {}),
        }),
      },
    ],
  } satisfies CostControlledResponseParams;
}

export async function extractBusinessDraft(input: ExtractionInput): Promise<{
  draft: ExtractionDraft;
  returned_model: string;
  response_id: string;
  telemetry: AuditCallTelemetry[];
}> {
  const requestedModel = auditModel();
  const calls: AuditCallTelemetry[] = [];

  // Each attempt reserves against the running ledger — the caller's budget plus
  // this call's own earlier attempt — so the retry cannot spend headroom the
  // first attempt already consumed.
  async function attempt(attemptNumber: number, extraInstructions: string[]) {
    const request = extractionRequest(input, requestedModel, extraInstructions);
    const reservedCost = reserveAuditCall({
      budget: { ...input.budget, calls: [...input.budget.calls, ...calls] },
      stage: "extract",
      request,
      requested_model: requestedModel,
      has_web_search: true,
    });
    const startedAt = Date.now();
    try {
      const response = await client().responses.parse(request);
      calls.push(
        completedCallTelemetry({
          stage: "extract",
          attempt: attemptNumber,
          started_at_ms: startedAt,
          requested_model: requestedModel,
          response,
        }),
      );
      return response;
    } catch (error) {
      calls.push(
        failedCallTelemetry({
          stage: "extract",
          attempt: attemptNumber,
          started_at_ms: startedAt,
          requested_model: requestedModel,
          reserved_cost_usd: reservedCost,
          error,
        }),
      );
      throw error;
    }
  }

  let response;
  try {
    response = await attempt(1, []);
  } catch (error) {
    throw new AuditCallExecutionError(
      error instanceof Error ? error.message : "Website extraction failed.",
      calls,
    );
  }

  // `docs/journey/03-business-facts.md`: an invalid or empty structured output
  // is retried once when the cost and method stay within the preparation
  // allowance, and only then falls back to manual entry. A truncated response
  // parses to nothing, so without this one retry a single overlong draft costs
  // the founder every extracted field.
  if (!response.output_parsed) {
    try {
      const retried = await attempt(
        2,
        response.incomplete_details?.reason === "max_output_tokens"
          ? [EXTRACTION_RETRY_BREVITY_INSTRUCTION]
          : [],
      );
      response = retried;
    } catch {
      // Best effort. The retry's own telemetry is already retained in `calls`;
      // the founder gets the manual brief with the first attempt's diagnosis
      // rather than an error banner and no draft at all.
    }
  }

  return {
    draft: extractionDraftOrManualFallback(input, response, calls.length),
    returned_model: response.model,
    response_id: response.id,
    telemetry: calls,
  };
}

// Question generation makes no provider call. See `questions.ts` for the
// deterministic pack built from the verified brief and the fixed matrix.

function collectSources(response: Response): Source[] {
  const found = new Map<string, Source>();
  for (const item of response.output) {
    if (item.type === "message") {
      for (const content of item.content) {
        if (content.type !== "output_text") continue;
        for (const annotation of content.annotations) {
          if (annotation.type !== "url_citation") continue;
          found.set(annotation.url, {
            url: annotation.url,
            title: normalizeSourceTitle(annotation.title, annotation.url),
          });
        }
      }
    }
    if (item.type === "web_search_call" && item.action.type === "search") {
      for (const source of item.action.sources ?? []) {
        if (source.type !== "url") continue;
        found.set(source.url, {
          url: source.url,
          title: normalizeSourceTitle(undefined, source.url),
        });
      }
    }
  }
  return [...found.values()];
}

export async function executeAuditPrompt(input: {
  prompt: AuditPrompt;
  brief:
    BusinessBrief | import("./direct-ten-context-v2").DirectTenAuditContext;
  safety_identifier: string;
  budget: AuditBudget;
}): Promise<AuditObservation> {
  const requestedModel = auditModel();
  const request = {
    model: requestedModel,
    reasoning: { effort: auditReasoningEffort("low") },
    store: false,
    service_tier: "default" as const,
    max_output_tokens: AUDIT_CALL_LIMITS.observation.max_output_tokens,
    max_tool_calls: AUDIT_CALL_LIMITS.observation.max_tool_calls,
    safety_identifier: hashSafetyIdentifier(input.safety_identifier),
    tools: [auditObservationSearchTool()],
    tool_choice: "required" as const,
    include: ["web_search_call.action.sources" as const],
    text: { verbosity: "medium" as const },
    input: [
      {
        role: "developer" as const,
        content: observationInstructionText(
          DEFAULT_OBSERVATION_INSTRUCTION_VERSION,
        ),
      },
      { role: "user" as const, content: input.prompt.question },
    ],
  } satisfies CostControlledResponseParams;
  const reservedCost = reserveAuditCall({
    budget: input.budget,
    stage: "observation",
    request,
    requested_model: requestedModel,
    has_web_search: true,
  });
  const startedAt = Date.now();
  try {
    const response = await client().responses.create(request);
    // Spec 003 R-16/R-18: web search is REQUIRED for every observation. If
    // the tool did not actually execute (no web_search_call item and no
    // grounded sources), the response is not a grounded observation — treat
    // it as a technical failure so the targeted retry policy reruns the same
    // locked question (the failure reason classifies as "temporary", never
    // as an evaluable non-appearance).
    const searchExecuted =
      response.output.some(
        (item) =>
          item.type === "web_search_call" &&
          item.action?.type === "search" &&
          (item.action.sources?.length ?? 0) > 0,
      ) || collectSources(response).length > 0;
    if (!searchExecuted) {
      throw new Error(
        "Required web search did not execute for this observation; the observation is not grounded and will be retried.",
      );
    }
    return {
      prompt_id: input.prompt.prompt_id,
      category: input.prompt.category,
      branded: input.prompt.branded,
      question: input.prompt.question,
      instruction_version: DEFAULT_OBSERVATION_INSTRUCTION_VERSION,
      system: "OpenAI Responses API",
      requested_model: requestedModel,
      returned_model: response.model,
      response_id: response.id,
      observed_at: new Date(response.created_at * 1_000).toISOString(),
      raw_answer: response.output_text,
      sources: collectSources(response),
      run_status: "completed",
      failure_reason: "",
      telemetry: [
        completedCallTelemetry({
          stage: "observation",
          started_at_ms: startedAt,
          requested_model: requestedModel,
          response,
        }),
      ],
    };
  } catch (error) {
    const telemetry = failedCallTelemetry({
      stage: "observation",
      started_at_ms: startedAt,
      requested_model: requestedModel,
      reserved_cost_usd: reservedCost,
      error,
    });
    return {
      prompt_id: input.prompt.prompt_id,
      category: input.prompt.category,
      branded: input.prompt.branded,
      question: input.prompt.question,
      instruction_version: DEFAULT_OBSERVATION_INSTRUCTION_VERSION,
      system: "OpenAI Responses API",
      requested_model: requestedModel,
      returned_model: "",
      response_id: "",
      observed_at: new Date().toISOString(),
      raw_answer: "",
      sources: [],
      run_status: "failed",
      failure_reason: telemetry.failure_reason,
      telemetry: [telemetry],
    };
  }
}

export async function generateReportContent(
  input: {
    brief: import("./direct-ten-context-v2").AuditSubject;
    prompts: AuditPrompt[];
    observations: AuditObservation[];
    safety_identifier: string;
    budget: AuditBudget;
    language?: "en" | "id";
    historical_fixture_id?: HistoricalPromptPackId;
    question_method?: AuditQuestionMethod;
  },
  revision?: {
    draft: ReportContent;
    violations: string[];
  },
): Promise<{
  content: ReportContent;
  requested_model: string;
  returned_model: string;
  response_id: string;
  telemetry: AuditCallTelemetry[];
}> {
  const v2Context = "version" in input.brief ? input.brief : null;
  const requestedModel = auditModel();
  const request = {
    model: requestedModel,
    reasoning: { effort: auditReasoningEffort("medium") },
    store: false,
    service_tier: "default" as const,
    max_output_tokens: AUDIT_CALL_LIMITS.report.max_output_tokens,
    safety_identifier: hashSafetyIdentifier(input.safety_identifier),
    text: {
      format: zodTextFormat(reportSynthesisSchema, "nuave_audit_report"),
      verbosity: "low" as const,
    },
    input: [
      {
        role: "developer" as const,
        content: [
          input.language === "id"
            ? v2Context
              ? "Tulis laporan visibilitas AI Nuave yang berbasis bukti dalam Bahasa Indonesia yang alami dan jelas, hanya dari konteks pilihan pelanggan yang dikonfirmasi beserta asal tiap makna, dan jawaban pengujian. Konfirmasi pelanggan tidak memverifikasi klaim secara independen."
              : "Tulis laporan visibilitas AI Nuave yang berbasis bukti dalam Bahasa Indonesia yang alami dan jelas, hanya dari brief terverifikasi dan jawaban pengujian yang diberikan."
            : v2Context
              ? "Write an evidence-led Nuave AI Visibility Report in clear, natural English using only the customer-confirmed context, its field origins, and the tested answers. Confirmation does not independently verify a claim."
              : "Write an evidence-led Nuave AI Visibility Report in clear, natural English using only the supplied verified brief and test answers.",
          `Use synthesis contract ${v2Context ? REPORT_SYNTHESIS_PROMPT_VERSION_V2 : REPORT_SYNTHESIS_PROMPT_VERSION}.`,
          ...reportWritingInstructions(),
          "Keep observation, interpretation, recommendation, confidence, and limitation distinct.",
          "Do not claim causation, lost revenue, permanent ranking, consumer ChatGPT equivalence, or guaranteed improvement.",
          "Return one compact assessment for each prompt ID with recommendation, comparison, and information only.",
          "Nuave computes run state, visible brand appearance, excerpts, source links, detail copy, and verified-competitor links in code; do not return those fields.",
          ...reportAssessmentInstructions(input.question_method),
          "Use needs_confirmation when a supplied claim still needs verification. Use needs_correction only when the answers show a specific conflict or error. Use no_clear_issues only when no specific issue appears; it does not prove all public information is correct.",
          "Every finding and priority must cite one or more supplied prompt IDs. Every action needs an observable completion check.",
          "Return no more than five priorities. Each priority's evidence_prompt_ids must include at least one observed gap: a failed test, an answer where the audited brand was absent, incomplete or conflicting public information, a competitor preferred over the audited brand, or an unbranded discovery question that did not recommend the audited brand.",
          "Make the conclusion answer whether the business was discovered and recommended in this tested sample. Do not imply a wider or permanent result.",
          "For each key finding, state what happened and explain what it may mean for the business without claiming cause.",
          "Return exactly one assessment for each of the ten prompt IDs.",
          ...(revision
            ? [
                "This is a language-only revision. Fix only the listed writing violations.",
                "Keep accuracy status, assessment order and classifications, prompt IDs, evidence prompt IDs, priority timing, and owner exactly as supplied in the draft.",
              ]
            : []),
        ].join("\n"),
      },
      {
        role: "user" as const,
        content: JSON.stringify({
          ...(v2Context
            ? { confirmed_context: contextForReportModel(v2Context) }
            : {
                verified_brief: {
                  ...input.brief,
                  agency_logo_data_url: "[not sent]",
                },
              }),
          prompts: input.prompts,
          // Direct-ten prompt IDs own no matrix definitions; sending any
          // would fabricate semantics the method does not have.
          ...(input.question_method === "direct-ten"
            ? {}
            : {
                measurement_definitions: reportPromptMeasurements(
                  input.prompts,
                ),
              }),
          observations: input.observations.map(
            ({ telemetry, ...observation }) => {
              void telemetry;
              return observation;
            },
          ),
          ...(revision
            ? {
                report_draft: {
                  conclusion: revision.draft.conclusion,
                  accuracy_status: revision.draft.accuracy_status,
                  key_findings: revision.draft.key_findings,
                  priorities: revision.draft.priorities,
                  assessments: revision.draft.details.map((detail) => ({
                    prompt_id: detail.prompt_id,
                    recommendation: detail.recommendation,
                    comparison: detail.comparison,
                    information: detail.information,
                  })),
                },
                writing_violations: revision.violations,
              }
            : {}),
        }),
      },
    ],
  } satisfies CostControlledResponseParams;
  const reservedCost = reserveAuditCall({
    budget: input.budget,
    stage: "report",
    request,
    requested_model: requestedModel,
    has_web_search: false,
  });
  const startedAt = Date.now();
  let telemetry: AuditCallTelemetry | undefined;
  try {
    const response = await client().responses.parse(request);
    telemetry = completedCallTelemetry({
      stage: "report",
      started_at_ms: startedAt,
      requested_model: requestedModel,
      response,
    });
    return {
      content: assembleReportContent(
        structuredOutputOrThrow<ReportSynthesis>(
          response.output_parsed,
          "Report generation",
          response,
        ),
        input.observations,
        input.brief,
        input.historical_fixture_id,
        input.question_method,
        input.language,
      ),
      requested_model: requestedModel,
      returned_model: response.model,
      response_id: response.id,
      telemetry: [telemetry],
    };
  } catch (error) {
    const retained =
      telemetry ??
      failedCallTelemetry({
        stage: "report",
        started_at_ms: startedAt,
        requested_model: requestedModel,
        reserved_cost_usd: reservedCost,
        error,
      });
    throw new AuditCallExecutionError(
      error instanceof Error ? error.message : "Report generation failed.",
      [retained],
    );
  }
}
