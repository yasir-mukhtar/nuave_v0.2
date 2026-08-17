import { createHash } from "node:crypto";
import { z } from "zod";
import {
  extractionDraftSchema,
  reportSynthesisSchema,
  type AuditBudget,
  type AuditCallTelemetry,
  type AuditObservation,
  type AuditPrompt,
  type BusinessBrief,
  type ExtractionDraft,
  type ReportContent,
  type ReportSynthesis,
  type Source,
} from "./types";
import {
  REPORT_SYNTHESIS_PROMPT_VERSION,
  assembleReportContent,
  normalizeReportEvidence,
} from "./contracts";
import { reportWritingInstructions } from "./report-language";
import { AuditCallExecutionError, failedCallTelemetry } from "./telemetry";

// Free-tier Google Gemini provider for local testing. No credit card, and the
// 2.5 Flash free tier includes Google Search grounding (Google's hosted web
// search, the equivalent of OpenAI's `web_search` tool). The Nuave Gemini build
// is disabled unless NUAVE_PROVIDER=gemini, so the OpenAI path stays the default
// and nothing changes for paid runs.
//
// This file mirrors the three OpenAI Responses API functions in openai.ts:
// extractBusinessDraft, executeAuditPrompt, and generateReportContent. The
// signatures, returned shapes, and Zod contracts are shared so the provider is
// a drop-in swap.

export const GEMINI_AUDIT_SYSTEM = "Google Gemini API" as const;

// Free model with Google Search grounding. gemini-2.5-flash was retired for new
// API keys; gemini-3.1-flash-lite is the current free-tier Flash that serves the
// legacy generateContent endpoint with googleSearch. Override with
// GEMINI_AUDIT_MODEL if you have a key that can use another model.
const DEFAULT_MODEL = "gemini-3.1-flash-lite";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";
// Grounding turns stored thinking off automatically on Flash; we omit
// thinkingConfig so the request validates on the v1beta endpoint for all models.
const GEMINI_PRICING_VERSION = "gemini-free-2026-08";

function apiKey() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured on the Nuave server.");
  }
  return key;
}

export function auditModel() {
  return process.env.GEMINI_AUDIT_MODEL?.trim() || DEFAULT_MODEL;
}

export function hashSafetyIdentifier(value: string) {
  return createHash("sha256")
    .update(`nuave:${value}`)
    .digest("hex")
    .slice(0, 64);
}

export function normalizeSourceTitle(title: string | undefined, url: string) {
  const value = title?.trim() || url;
  if (value.length <= 300) return value;
  const shortened = value.slice(0, 299).trimEnd();
  const finalCodeUnit = shortened.charCodeAt(shortened.length - 1);
  if (finalCodeUnit >= 0xd800 && finalCodeUnit <= 0xdbff) {
    return `${shortened.slice(0, -1)}…`;
  }
  return `${shortened}…`;
}

// ---- Gemini REST types ----------------------------------------------------

type GeminiPart = { text?: string };
type GeminiCandidate = {
  content?: { parts?: GeminiPart[]; role?: string };
  finishReason?: string;
  citationMetadata?: { citationSources?: { uri?: string; title?: string }[] };
  groundingMetadata?: {
    groundingChunks?: { web?: { uri?: string; title?: string } }[];
  };
};
type GeminiResponse = {
  candidates?: GeminiCandidate[];
  modelVersion?: string;
  responseId?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { code?: number; message?: string; status?: string };
};

async function geminiGenerate(params: {
  model: string;
  systemInstruction: string;
  userContent: string;
  useSearch: boolean;
  jsonSchema?: Record<string, unknown>;
  maxOutputTokens?: number;
  temperature?: number;
}): Promise<{ text: string; response: GeminiResponse }> {
  const url = `${GEMINI_ENDPOINT}/${params.model}:generateContent`;
  // Pass the API key via the x-goog-api-key header rather than the URL query
  // string so it is not recorded in request logs.
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-goog-api-key": apiKey(),
  };
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: params.systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: params.userContent }] }],
    generationConfig: {
      temperature: params.temperature ?? 0.2,
      maxOutputTokens: params.maxOutputTokens ?? 4096,
      ...(params.jsonSchema
        ? {
            responseMimeType: "application/json",
            responseSchema: params.jsonSchema,
          }
        : {}),
    },
    tools: params.useSearch ? [{ googleSearch: {} }] : [],
  };

  // The free tier is rate-limited; retry transient 429/5xx with backoff so a
  // single busy minute does not fail the audit. Hard errors (4xx except 429)
  // throw immediately.
  const maxAttempts = 4;
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as GeminiResponse;
    if (res.ok && !data.error) {
      const text =
        data.candidates?.[0]?.content?.parts
          ?.map((p) => p.text || "")
          .join("") ?? "";
      return { text, response: data };
    }
    const status = res.status;
    const message =
      data.error?.message || `Gemini request failed with status ${status}.`;
    lastError = new Error(message);
    if (status === 429 || status >= 500) {
      const delayMs = 800 * attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }
    throw lastError;
  }
  throw lastError ?? new Error("Gemini request failed after retries.");
}

export function collectSources(response: GeminiResponse): Source[] {
  const found = new Map<string, Source>();
  for (const candidate of response.candidates ?? []) {
    for (const source of candidate.citationMetadata?.citationSources ?? []) {
      if (source.uri && !found.has(source.uri)) {
        found.set(source.uri, {
          url: source.uri,
          title: normalizeSourceTitle(source.title, source.uri),
        });
      }
    }
    for (const chunk of candidate.groundingMetadata?.groundingChunks ?? []) {
      const uri = chunk.web?.uri;
      if (uri && !found.has(uri)) {
        found.set(uri, {
          url: uri,
          title: normalizeSourceTitle(chunk.web?.title, uri),
        });
      }
    }
  }
  return [...found.values()];
}

// Keep only usable absolute URLs. Gemini grounding chunks are occasionally
// redirect or Google redirect URLs; Nuave stores them verbatim rather than
// resolving them, mirroring how OpenAI URL citations are retained.
function cleanSources(sources: Source[]): Source[] {
  return sources.filter((s) => {
    try {
      return s.url.startsWith("http://") || s.url.startsWith("https://");
    } catch {
      return false;
    }
  });
}

function geminiCompletedTelemetry(input: {
  stage: AuditCallTelemetry["stage"];
  started_at_ms: number;
  requested_model: string;
  returned_model: string;
  response_id: string;
  web_search_calls: number;
}): AuditCallTelemetry {
  const completedAt = Date.now();
  return {
    stage: input.stage,
    attempt: 1,
    status: "completed",
    started_at: new Date(input.started_at_ms).toISOString(),
    completed_at: new Date(completedAt).toISOString(),
    latency_ms: Math.max(0, completedAt - input.started_at_ms),
    requested_model: input.requested_model,
    returned_model: input.returned_model,
    response_id: input.response_id,
    service_tier: "free",
    usage: {
      input_tokens: 0,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 0,
      reasoning_output_tokens: 0,
      total_tokens: 0,
    },
    web_search_calls: input.web_search_calls,
    accounted_cost_usd: 0,
    cost_basis: "provider_usage",
    pricing_version: GEMINI_PRICING_VERSION,
    failure_reason: "",
    provider_status: "",
    incomplete_reason: "",
    output_text_present: true,
    refusal_present: false,
  };
}

// ---- Extraction -----------------------------------------------------------

export async function extractBusinessDraft(input: {
  website_url: string;
  brand_name: string;
  market_context: string;
  category: string;
  safety_identifier: string;
  budget: AuditBudget;
}): Promise<{
  draft: ExtractionDraft;
  returned_model: string;
  response_id: string;
  telemetry: AuditCallTelemetry[];
}> {
  const requestedModel = auditModel();
  const systemInstruction = [
    "Extract a review draft using only public facts supported by the supplied official website.",
    "Do not infer praise, reputation, quality, target demographics, outcomes, or competitor facts.",
    "Write all explanatory text in clear, natural English. Preserve official brand names, product names, and place names as published.",
    "Leave unsupported scalar fields empty and unsupported arrays empty.",
    "For each material extracted value add an evidence record with the exact field, value, source URL, and a short note.",
    "The values are suggestions for human confirmation, not verified facts.",
    "Return the result strictly as JSON matching the supplied schema.",
  ].join("\n");
  const userContent = JSON.stringify({
    official_website: input.website_url,
    supplied_brand_name: input.brand_name,
    supplied_market_context: input.market_context,
    supplied_category: input.category,
  });

  const startedAt = Date.now();
  try {
    const { text, response } = await geminiGenerate({
      model: requestedModel,
      systemInstruction,
      userContent,
      useSearch: true,
      jsonSchema: zodSchemaToGemini(extractionDraftSchema),
      maxOutputTokens: 4096,
    });
    const parsed = safeJson<ExtractionDraft>(text);
    const draft = parsed
      ? normalizeExtraction(parsed, input.website_url)
      : null;
    const telemetry = geminiCompletedTelemetry({
      stage: "extract",
      started_at_ms: startedAt,
      requested_model: requestedModel,
      returned_model: response.modelVersion || requestedModel,
      response_id: response.responseId || "",
      web_search_calls: 1,
    });
    const finalDraft =
      draft ?? extractionManualFallback(input, parsed === null);
    return {
      draft: finalDraft,
      returned_model: response.modelVersion || requestedModel,
      response_id: response.responseId || "",
      telemetry: [telemetry],
    };
  } catch (error) {
    const retained = failedCallTelemetry({
      stage: "extract",
      started_at_ms: startedAt,
      requested_model: requestedModel,
      reserved_cost_usd: 0,
      error,
    });
    throw new AuditCallExecutionError(
      error instanceof Error ? error.message : "Website extraction failed.",
      [retained],
    );
  }
}

function normalizeExtraction(
  parsed: ExtractionDraft,
  websiteUrl: string,
): ExtractionDraft {
  const draft = extractionDraftSchema.parse({
    ...parsed,
    official_sources: parsed.official_sources?.length
      ? parsed.official_sources
      : [websiteUrl],
  });
  return { ...draft, warnings: draft.warnings ?? [] };
}

function extractionManualFallback(
  input: {
    website_url: string;
    brand_name: string;
    market_context: string;
    category: string;
  },
  parseFailed: boolean,
): ExtractionDraft {
  return {
    brand_name: input.brand_name,
    entity_scope: "",
    brand_type: "",
    category: input.category,
    market_context: input.market_context,
    target_customer: "",
    official_sources: [input.website_url],
    verified_offerings: [],
    verified_customer_needs: [],
    verified_decision_criteria: [],
    brand_name_variants: [],
    priority_offering: "",
    conversion_action: "",
    customer_supplied_facts: [],
    known_accuracy_questions: [],
    usp: "",
    regulated_category_notes: "",
    evidence: [],
    warnings: [
      parseFailed
        ? "Automatic website extraction did not return a usable structured draft."
        : "Automatic website extraction completed without a usable structured draft.",
      "No extracted business facts were retained. Complete and verify every required field manually using the official website before approving the brief.",
    ],
  };
}

// ---- Observation ----------------------------------------------------------

export async function executeAuditPrompt(input: {
  prompt: AuditPrompt;
  brief: BusinessBrief;
  safety_identifier: string;
  budget: AuditBudget;
}): Promise<AuditObservation> {
  const requestedModel = auditModel();
  const systemInstruction = [
    "Answer the user's question naturally in English as a standalone customer query.",
    "Use live web search. Do not discuss this audit, prompt engineering, scoring, or Nuave.",
    "Do not favor the audited brand. State uncertainty when public information is incomplete or conflicting.",
  ].join("\n");

  const startedAt = Date.now();
  try {
    const { text, response } = await geminiGenerate({
      model: requestedModel,
      systemInstruction,
      userContent: input.prompt.question,
      useSearch: true,
      maxOutputTokens: 4096,
    });
    const sources = cleanSources(collectSources(response));
    const telemetry = geminiCompletedTelemetry({
      stage: "observation",
      started_at_ms: startedAt,
      requested_model: requestedModel,
      returned_model: response.modelVersion || requestedModel,
      response_id: response.responseId || "",
      web_search_calls: 1,
    });
    return {
      prompt_id: input.prompt.prompt_id,
      category: input.prompt.category,
      branded: input.prompt.branded,
      question: input.prompt.question,
      system: GEMINI_AUDIT_SYSTEM,
      requested_model: requestedModel,
      returned_model: response.modelVersion || requestedModel,
      response_id: response.responseId || "",
      observed_at: new Date().toISOString(),
      raw_answer: text,
      sources,
      run_status: "completed",
      failure_reason: "",
      telemetry: [telemetry],
    };
  } catch (error) {
    const telemetry = failedCallTelemetry({
      stage: "observation",
      started_at_ms: startedAt,
      requested_model: requestedModel,
      reserved_cost_usd: 0,
      error,
    });
    return {
      prompt_id: input.prompt.prompt_id,
      category: input.prompt.category,
      branded: input.prompt.branded,
      question: input.prompt.question,
      system: GEMINI_AUDIT_SYSTEM,
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

// ---- Report synthesis -----------------------------------------------------

export async function generateReportContent(
  input: {
    brief: BusinessBrief;
    prompts: AuditPrompt[];
    observations: AuditObservation[];
    safety_identifier: string;
    budget: AuditBudget;
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
  const requestedModel = auditModel();
  const systemInstruction = [
    "Write an evidence-led Nuave AI Visibility Report in clear, natural English using only the supplied verified brief and test answers.",
    `Use synthesis contract ${REPORT_SYNTHESIS_PROMPT_VERSION}.`,
    ...reportWritingInstructions(),
    "Keep observation, interpretation, recommendation, confidence, and limitation distinct.",
    "Do not claim causation, lost revenue, permanent ranking, consumer ChatGPT equivalence, or guaranteed improvement.",
    "Return one compact assessment for each prompt ID with recommendation, comparison, and information only.",
    "Nuave computes run state, visible brand appearance, excerpts, source links, detail copy, and verified-competitor links in code; do not return those fields.",
    "When a run failed, set recommendation, comparison, and information to not_assessed.",
    "Set recommendation to recommended only for an explicit suggestion or endorsement. A factual answer, contact path, or mention is not a recommendation.",
    "Use client_preferred or competitor_preferred only for explicit preference in that answer. Use compared_no_preference when both are compared without a preference.",
    "Use information confirmed, incomplete, or conflicting only when the answer assesses a public fact about the audited brand; otherwise use not_assessed.",
    "Use needs_confirmation when a supplied claim still needs verification. Use needs_correction only when the answers show a specific conflict or error. Use no_clear_issues only when no specific issue appears; it does not prove all public information is correct.",
    "Every finding and priority must cite one or more supplied prompt IDs. Every action needs an observable completion check.",
    "Return no more than five priorities. Each priority must address a supplied failed, absent, not-recommended discovery, incomplete, conflicting, or competitor-preferred result.",
    "Make the conclusion answer whether the business was discovered and recommended in this tested sample. Do not imply a wider or permanent result.",
    "For each key finding, state what happened and explain what it may mean for the business without claiming cause.",
    "Return exactly one assessment for each of the ten prompt IDs.",
    ...(revision
      ? [
          "This is a language-only revision. Fix only the listed writing violations.",
          "Keep accuracy status, assessment order and classifications, prompt IDs, evidence prompt IDs, priority timing, and owner exactly as supplied in the draft.",
        ]
      : []),
    "Return the result strictly as JSON matching the supplied schema.",
  ].join("\n");

  const userContent = JSON.stringify({
    verified_brief: { ...input.brief, agency_logo_data_url: "[not sent]" },
    prompts: input.prompts,
    observations: input.observations.map(({ telemetry, ...observation }) => {
      void telemetry;
      return observation;
    }),
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
  });

  const startedAt = Date.now();
  try {
    const { text, response } = await geminiGenerate({
      model: requestedModel,
      systemInstruction,
      userContent,
      useSearch: false,
      jsonSchema: zodSchemaToGemini(reportSynthesisSchema),
      maxOutputTokens: 16384,
    });
    const parsed = safeJson<ReportSynthesis>(text);
    if (!parsed) {
      throw new Error(
        "Report generation did not return usable structured data.",
      );
    }
    const synthesis = reportSynthesisSchema.parse(parsed);
    const telemetry = geminiCompletedTelemetry({
      stage: "report",
      started_at_ms: startedAt,
      requested_model: requestedModel,
      returned_model: response.modelVersion || requestedModel,
      response_id: response.responseId || "",
      web_search_calls: 0,
    });
    const content = normalizeReportEvidence(
      assembleReportContent(synthesis, input.observations, input.brief),
      input.observations,
      input.brief,
    );
    return {
      content,
      requested_model: requestedModel,
      returned_model: response.modelVersion || requestedModel,
      response_id: response.responseId || "",
      telemetry: [telemetry],
    };
  } catch (error) {
    const retained = failedCallTelemetry({
      stage: "report",
      started_at_ms: startedAt,
      requested_model: requestedModel,
      reserved_cost_usd: 0,
      error,
    });
    throw new AuditCallExecutionError(
      error instanceof Error ? error.message : "Report generation failed.",
      [retained],
    );
  }
}

// ---- Helpers --------------------------------------------------------------

function safeJson<T>(text: string): T | null {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match) {
      try {
        return JSON.parse(match[1]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Map a Zod schema to Gemini's responseSchema JSON shape. Gemini enforces the
// shape at generation time; we re-validate with the real Zod schema afterwards,
// so a coarse structural map is enough.
function zodSchemaToGemini(schema: z.ZodType): Record<string, unknown> {
  return { type: "OBJECT", properties: geminiProperties(schema) };
}

function geminiProperties(schema: z.ZodType): Record<string, unknown> {
  const def = schema._def as { shape?: Record<string, z.ZodType> };
  const shape = def?.shape;
  if (!shape) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(shape)) {
    out[key] = geminiField(value);
  }
  return out;
}

function geminiField(schema: z.ZodType): Record<string, unknown> {
  const def = schema._def as { typeName?: string };
  switch (def?.typeName) {
    case "ZodString":
      return { type: "STRING", nullable: true };
    case "ZodNumber":
      return { type: "NUMBER", nullable: true };
    case "ZodBoolean":
      return { type: "BOOLEAN", nullable: true };
    case "ZodArray":
      return { type: "ARRAY", items: { type: "STRING" }, nullable: true };
    case "ZodObject":
      return {
        type: "OBJECT",
        properties: geminiProperties(schema),
        nullable: true,
      };
    case "ZodEnum":
    case "ZodLiteral":
      return { type: "STRING", nullable: true };
    default:
      return { type: "STRING", nullable: true };
  }
}
