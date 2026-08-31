import { createHash } from "node:crypto";
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
} from "./types";
import {
  REPORT_SYNTHESIS_PROMPT_VERSION,
  assembleReportContent,
  normalizeReportEvidence,
} from "./contracts";
import {
  reportAssessmentInstructions,
  reportPromptMeasurements,
} from "./report-prompt-contract";
import { reportWritingInstructions } from "./report-language";
import { AuditCallExecutionError, failedCallTelemetry } from "./telemetry";

// Free-tier audit provider: OpenRouter (`:free` model slugs), NO web search.
//
// OpenRouter serves an OpenAI-compatible /chat/completions endpoint, so this
// file mirrors the three functions in openai.ts / gemini.ts / groq.ts —
// extractBusinessDraft, executeAuditPrompt, generateReportContent — with the
// same signatures, returned shapes, and Zod contracts. Flipping
// NUAVE_PROVIDER=openrouter is the only change needed and no code path mixes
// providers mid-run.
//
// DELIBERATE LIMITATION — observations are UNGROUNDED. OpenRouter's own web
// plugin is paid (per-result billing) and `:free` models have no hosted
// search, so this path answers from model weights alone and every observation
// returns `sources: []` with `web_search_calls: 0`. That makes it suitable for
// exercising the pipeline (contracts, retry policy, report assembly, journey
// states) at zero cost — and NOT suitable for judging real AI visibility or
// report quality, which needs live search. Use NUAVE_PROVIDER=groq (Groq +
// Tavily, both free) when the answers themselves must be grounded, or the
// locked OpenAI path for a real run.

export const OPENROUTER_AUDIT_SYSTEM = "OpenRouter" as const;

// Free slugs verified against https://openrouter.ai/api/v1/models AND probed
// live on 2026-08-19. Nemotron 3 Super is the default: it advertises both
// `response_format` and `structured_outputs` (which the extraction and report
// stages need) and was the slug actually serving requests when the others
// returned "temporarily rate-limited upstream". See
// OPENROUTER_FREE_MODEL_NOTES for alternatives and what to avoid.
const DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_PRICING_VERSION = "openrouter-free-2026-08";

/**
 * Free OpenRouter slugs that support JSON-mode output. Not code — a
 * maintenance note so the default can be swapped without re-probing when a
 * slug is retired or its upstream capacity dries up.
 *
 * Any `:free` slug can return `429 "Provider returned error"` with
 * `metadata.raw` saying "temporarily rate-limited upstream": free capacity is
 * shared across every OpenRouter user, so a slug that worked an hour ago can
 * be unavailable now. That is the normal failure mode here, not a bug —
 * switch OPENROUTER_AUDIT_MODEL to another entry below and rerun.
 *
 * AVOID `dots-studio/dots-3-note-preview:free`: it is a reasoning model that
 * returns `content: null` with the whole allowance spent in `reasoning`, so
 * every stage sees an empty completion.
 */
export const OPENROUTER_FREE_MODEL_NOTES = [
  "nvidia/nemotron-3-super-120b-a12b:free", // default; served live on 2026-08-19
  "z-ai/glm-5.2:free",
  "google/gemma-4-26b-a4b-it:free",
  "openai/gpt-oss-20b:free",
] as const;

// OpenRouter's free tier is bounded by requests, not tokens: ~20 requests per
// minute, and a per-day cap on `:free` models (50/day under 10 lifetime
// credits, 1000/day at or above). A full audit is ~12 calls before retries, so
// the daily cap is the real constraint. It can never clear inside one request,
// so a daily-cap 429 fails fast instead of sleeping (see the retry block).
const OPENROUTER_MAX_INPUT_CHARS = 48000; // free contexts are large; this only guards runaway briefs
const OBSERVATION_ANSWER_CAP = 1500; // chars of raw answer sent to report synthesis
const CONTEXT_FLOOR_CHARS = 500; // never truncate a user message below this
const OPENROUTER_MAX_OUTPUT_TOKENS = 2048;
const OPENROUTER_RETRY_BASE_MS = 6_000; // the per-minute window is 60s; back off into the next one
const OPENROUTER_MAX_RETRY_AFTER_MS = 60_000;

// Hard ceiling on a single raw fetch. A stalled connection must abort rather
// than hang the request. Override per-process with OPENROUTER_REQUEST_TIMEOUT_MS.
// Read lazily so a test can shrink it via env without a restart.
function openrouterRequestTimeoutMs(): number {
  return Number(process.env.OPENROUTER_REQUEST_TIMEOUT_MS) || 90_000;
}

export function truncateToChars(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

// Final safety net: if the combined request input still exceeds the budget,
// shrink the longest user message (free-form text tolerates this) while keeping
// the system prompt (schema + instructions) intact. Runs at most a few times.
function capRequestInput(messages: ChatMessage[]): ChatMessage[] {
  const working = messages.map((m) => ({ ...m }));
  const totalChars = () => working.reduce((s, m) => s + m.content.length, 0);
  let guard = 0;
  while (totalChars() > OPENROUTER_MAX_INPUT_CHARS && guard < 20) {
    guard++;
    const longest = working
      .filter((m) => m.role === "user")
      .reduce<ChatMessage | null>(
        (acc, m) => (!acc || m.content.length > acc.content.length ? m : acc),
        null,
      );
    if (!longest || longest.content.length <= CONTEXT_FLOOR_CHARS) break;
    const nextLen = Math.max(
      CONTEXT_FLOOR_CHARS,
      Math.floor(longest.content.length / 2),
    );
    longest.content = truncateToChars(longest.content, nextLen);
  }
  return working;
}

function openrouterKey() {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured on the Nuave server.",
    );
  }
  return key;
}

export function auditModel() {
  return process.env.OPENROUTER_AUDIT_MODEL?.trim() || DEFAULT_MODEL;
}

export function hashSafetyIdentifier(value: string) {
  return createHash("sha256")
    .update(`nuave:${value}`)
    .digest("hex")
    .slice(0, 64);
}

/**
 * True when a 429 names OpenRouter's per-DAY free-model cap rather than the
 * per-minute window. A daily cap cannot clear inside one request lifetime, so
 * sleeping on it is always wrong: fail immediately and surface the provider's
 * own text so the operator sees the real cause.
 */
export function isDailyQuotaMessage(message: string): boolean {
  return /per[- ]?day|daily|free-models-per-day|day limit|add \d+ credits/i.test(
    message,
  );
}

/**
 * True for provider errors that retrying cannot fix: an unknown or retired
 * model slug, a model with no available endpoint, or a rejected credential.
 */
export function isNonRetryableProviderMessage(message: string): boolean {
  return /no endpoints found|not a valid model|no allowed providers|invalid api key|user not found|no auth credentials/i.test(
    message,
  );
}

// ---- OpenRouter chat -------------------------------------------------------

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type ChatResponse = {
  choices?: {
    finish_reason?: string;
    message?: { content?: string | null; reasoning?: string | null };
  }[];
  model?: string;
  id?: string;
  error?: { message?: string; code?: number; metadata?: { raw?: unknown } };
};

/**
 * OpenRouter reports an upstream provider's own failure as the opaque
 * `"Provider returned error"`, and puts the sentence that actually explains it
 * ("… is temporarily rate-limited upstream", a model-side refusal, a context
 * overflow) in `error.metadata.raw`. Folding the two together is the
 * difference between a diagnosable failure and a mystery in the telemetry.
 */
export function providerErrorMessage(
  error: { message?: string; metadata?: { raw?: unknown } } | undefined,
  status: number,
): string {
  const headline =
    error?.message?.trim() ||
    `OpenRouter request failed with status ${status}.`;
  const raw = error?.metadata?.raw;
  const detail = typeof raw === "string" ? raw.trim() : "";
  if (!detail || headline.includes(detail)) return headline;
  return `${headline} ${detail}`;
}

export async function openrouterChat(params: {
  model: string;
  messages: ChatMessage[];
  jsonMode?: boolean;
  maxOutputTokens?: number;
  temperature?: number;
}): Promise<{ text: string; returnedModel: string; responseId: string }> {
  const maxAttempts = 5;
  let lastError: Error | null = null;
  const messages = capRequestInput(params.messages);
  // Read the credential once, before the retry loop. A missing or invalid key
  // is a configuration error, not a network fault, so it must fail fast and
  // must never be retried or backed off (the key will not appear on retry).
  const authKey = openrouterKey();
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(OPENROUTER_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authKey}`,
          // Optional OpenRouter attribution headers. Harmless when unset.
          "HTTP-Referer": "https://v2.nuave.ai",
          "X-Title": "Nuave AI Visibility Audit (local test)",
        },
        body: JSON.stringify({
          model: params.model,
          messages,
          temperature: params.temperature ?? 0.2,
          max_tokens: params.maxOutputTokens ?? OPENROUTER_MAX_OUTPUT_TOKENS,
          response_format: params.jsonMode
            ? { type: "json_object" }
            : undefined,
        }),
        signal: AbortSignal.timeout(openrouterRequestTimeoutMs()),
      });
    } catch (error) {
      const isAbort =
        error instanceof Error &&
        (error.name === "AbortError" ||
          /abort|timeout|timed out/i.test(error.message));
      // A timeout (aborted signal) means the connection stalled. That is a
      // hard failure for this request: retrying only re-hangs, so surface it
      // immediately rather than sleeping and re-attempting up to maxAttempts.
      const message = error instanceof Error ? error.message : "network error";
      lastError = new Error(`OpenRouter request failed: ${message}`);
      if (isAbort) throw lastError;
      if (attempt < maxAttempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, OPENROUTER_RETRY_BASE_MS * attempt),
        );
        continue;
      }
      throw lastError;
    }

    const data = (await res.json().catch(() => ({}))) as ChatResponse;
    if (res.ok && !data.error) {
      const choice = data.choices?.[0];
      const text = choice?.message?.content ?? "";
      // A free model can return an empty assistant message. Two causes, and
      // they need different fixes, so name which one happened: upstream
      // capacity returned nothing, or a reasoning model spent its whole output
      // allowance thinking and never emitted content. Either way the response
      // is unusable, not a success — surface it so the caller's targeted retry
      // policy reruns the same locked question.
      if (!text.trim()) {
        const spentOnReasoning =
          Boolean(choice?.message?.reasoning) &&
          choice?.finish_reason === "length";
        lastError = new Error(
          spentOnReasoning
            ? `OpenRouter model ${data.model || params.model} returned an empty completion: it spent its whole output allowance on reasoning. Raise max_tokens or set OPENROUTER_AUDIT_MODEL to a non-reasoning free slug.`
            : "OpenRouter returned an empty completion; the response is unusable and will be retried.",
        );
        // A reasoning model that cannot fit an answer in its allowance will do
        // the same thing on every attempt, so retrying only burns the day's
        // free requests. Fail now and name the fix.
        if (spentOnReasoning) throw lastError;
        if (attempt < maxAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, OPENROUTER_RETRY_BASE_MS * attempt),
          );
          continue;
        }
        throw lastError;
      }
      return {
        text,
        returnedModel: data.model || params.model,
        responseId: data.id || "",
      };
    }

    const message = providerErrorMessage(data.error, res.status);
    lastError = new Error(message);
    if (isNonRetryableProviderMessage(message)) {
      throw lastError;
    }
    // OpenRouter can report a rate limit as an in-body error with a 200 status.
    // Treat those like 429 and retry with bounded backoff.
    const statusCode = data.error?.code ?? res.status;
    const isRateLimit =
      statusCode === 429 ||
      statusCode >= 500 ||
      /rate limit|too many requests|429/i.test(message);
    if (!isRateLimit) {
      throw lastError;
    }
    if (isDailyQuotaMessage(message)) {
      throw new Error(
        `OpenRouter free-model daily limit reached and cannot be retried within this request. ${message}`,
      );
    }
    const retryAfterHeader = Number(res.headers.get("retry-after"));
    const retryAfterMs =
      Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
        ? retryAfterHeader * 1000
        : 0;
    // Short-window (per-minute) limit: worth a few retries, but the backoff is
    // always bounded — we never honor a provider-supplied duration unbounded.
    const delayMs =
      retryAfterMs > 0
        ? Math.min(retryAfterMs, OPENROUTER_MAX_RETRY_AFTER_MS)
        : OPENROUTER_RETRY_BASE_MS * attempt;
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }
    throw lastError;
  }
  throw lastError ?? new Error("OpenRouter request failed after retries.");
}

// ---- Shared helpers (mirror openai.ts / gemini.ts / groq.ts) ---------------

/**
 * JSON-mode output from a free model is not always a bare object: some wrap it
 * in a ```json fence despite `response_format`. Strip the fence before parsing
 * rather than discarding an otherwise-usable draft.
 */
export function parseJsonObject(raw: string): Record<string, unknown> {
  const fenced = raw.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const value = JSON.parse(fenced ? fenced[1] : raw);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Model returned JSON that was not an object.");
  }
  return value as Record<string, unknown>;
}

function reservedBudget(budget: AuditBudget): number {
  return budget.limit_usd - budget.carryover_cost_usd;
}

function failTelemetry(input: {
  stage: AuditCallTelemetry["stage"];
  startedAtMs: number;
  model: string;
  reserved: number;
  error: unknown;
}): AuditCallTelemetry {
  return failedCallTelemetry({
    stage: input.stage,
    started_at_ms: input.startedAtMs,
    requested_model: input.model,
    reserved_cost_usd: input.reserved,
    error: input.error,
  });
}

function completedTelemetry(input: {
  stage: AuditCallTelemetry["stage"];
  startedAtMs: number;
  model: string;
  returnedModel: string;
  responseId: string;
}): AuditCallTelemetry {
  const completedAt = Date.now();
  return {
    stage: input.stage,
    attempt: 1,
    status: "completed",
    started_at: new Date(input.startedAtMs).toISOString(),
    completed_at: new Date(completedAt).toISOString(),
    latency_ms: Math.max(0, completedAt - input.startedAtMs),
    requested_model: input.model,
    returned_model: input.returnedModel,
    response_id: input.responseId,
    service_tier: "default",
    usage: {
      input_tokens: 0,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 0,
      reasoning_output_tokens: 0,
      total_tokens: 0,
    },
    // Always zero: this path never calls a search tool (see the file header).
    web_search_calls: 0,
    accounted_cost_usd: 0,
    cost_basis: "preflight_reservation",
    pricing_version: OPENROUTER_PRICING_VERSION,
    failure_reason: "",
    provider_status: "",
    incomplete_reason: "",
    output_text_present: true,
    refusal_present: false,
  };
}

// ---- extractBusinessDraft --------------------------------------------------

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
  const startedAtMs = Date.now();
  const reserved = reservedBudget(input.budget);
  const requestedModel = auditModel();
  try {
    // No search on this path, so the model cannot read the website. The draft
    // is explicitly a prompt for human confirmation, never verified fact — the
    // instruction says so and every returned draft carries the warning below.
    const system = `You are a meticulous business analyst preparing a draft dossier for HUMAN VERIFICATION. You have NO web access and cannot read the supplied website. Fill only what the supplied inputs already state; leave every unsupported scalar field as an empty string and every unsupported array empty. Never invent offerings, competitors, prices, addresses, reputation, or outcomes. Output JSON matching the requested schema.`;
    const user = `Brand: ${input.brand_name}
Website: ${input.website_url}
Category: ${input.category}
Market context: ${input.market_context}

Return a JSON object with: brand_name (string), entity_scope (string), brand_type (string), category (string), market_context (string), target_customer (string), official_sources (array of URLs), verified_offerings (array of strings), verified_customer_needs (array of strings), verified_decision_criteria (array of strings), brand_name_variants (array of strings), priority_offering (string), conversion_action (string), customer_supplied_facts (empty array), known_accuracy_questions (array of strings naming the facts a human must check), usp (string), regulated_category_notes (string), evidence (empty array), warnings (array of strings).

Put every field you could not support from the inputs into known_accuracy_questions instead of guessing at it.`;

    const { text, returnedModel, responseId } = await openrouterChat({
      model: requestedModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      jsonMode: true,
      maxOutputTokens: 2048,
    });

    const parsed = parseJsonObject(text);
    const draft = extractionDraftSchema.parse({
      ...parsed,
      brand_name: parsed.brand_name ?? input.brand_name,
      category: parsed.category ?? input.category,
      market_context: parsed.market_context ?? input.market_context,
      official_sources: parsed.official_sources ?? [input.website_url],
      customer_supplied_facts: [],
      // No search ran, so nothing in this draft is source-backed. Keeping the
      // evidence array empty is the honest record; a fabricated source_url
      // would read as verification the run never performed.
      evidence: [],
      warnings: [
        "This draft was produced by a free OpenRouter model with NO web access; nothing in it is verified against the official website.",
        ...(Array.isArray(parsed.warnings)
          ? (parsed.warnings as string[])
          : []),
      ],
    });

    return {
      draft,
      returned_model: returnedModel,
      response_id: responseId,
      telemetry: [
        completedTelemetry({
          stage: "extract",
          startedAtMs,
          model: requestedModel,
          returnedModel,
          responseId,
        }),
      ],
    };
  } catch (error) {
    throw new AuditCallExecutionError(
      error instanceof Error
        ? error.message
        : "Website extraction failed for an unknown reason.",
      [
        failTelemetry({
          stage: "extract",
          startedAtMs,
          model: requestedModel,
          reserved,
          error,
        }),
      ],
    );
  }
}

// ---- executeAuditPrompt ----------------------------------------------------

/**
 * The neutral observation instruction, minus the web-search line the OpenAI
 * path carries (Spec 003 R-14). Telling a model with no search tool to "use
 * web search" invites it to narrate a search it never ran. As on the live
 * path, the audited brief is NEVER sent with the question (R-15): the model
 * sees the locked question and nothing else.
 */
export const OPENROUTER_OBSERVATION_INSTRUCTION = [
  "Jawab pertanyaan pengguna secara alami dalam Bahasa Indonesia.",
  "Anda tidak memiliki akses pencarian web. Jawab hanya dari pengetahuan Anda sendiri.",
  "Jangan membahas Nuave, audit, skor, metodologi, atau cara pertanyaan dibuat.",
  "Jangan mengutamakan bisnis tertentu.",
  "Jika Anda tidak yakin atau tidak mengetahui informasinya, katakan demikian dengan jelas dan jangan mengarang nama, alamat, harga, atau tautan.",
].join("\n");

export async function executeAuditPrompt(input: {
  prompt: AuditPrompt;
  brief: BusinessBrief;
  safety_identifier: string;
  budget: AuditBudget;
}): Promise<AuditObservation> {
  const startedAtMs = Date.now();
  const reserved = reservedBudget(input.budget);
  const requestedModel = auditModel();
  try {
    const { text, returnedModel, responseId } = await openrouterChat({
      model: requestedModel,
      messages: [
        { role: "system", content: OPENROUTER_OBSERVATION_INSTRUCTION },
        { role: "user", content: input.prompt.question },
      ],
      maxOutputTokens: 1500,
      temperature: 0.4,
    });

    return {
      prompt_id: input.prompt.prompt_id,
      category: input.prompt.category,
      branded: input.prompt.branded,
      question: input.prompt.question,
      system: OPENROUTER_AUDIT_SYSTEM,
      requested_model: requestedModel,
      returned_model: returnedModel,
      response_id: responseId,
      observed_at: new Date().toISOString(),
      raw_answer: text,
      // Always empty: no search ran, so the answer cites nothing. See header.
      sources: [],
      run_status: "completed",
      failure_reason: "",
      telemetry: [
        completedTelemetry({
          stage: "observation",
          startedAtMs,
          model: requestedModel,
          returnedModel,
          responseId,
        }),
      ],
    };
  } catch (error) {
    const telemetry = failTelemetry({
      stage: "observation",
      startedAtMs,
      model: requestedModel,
      reserved,
      error,
    });
    return {
      prompt_id: input.prompt.prompt_id,
      category: input.prompt.category,
      branded: input.prompt.branded,
      question: input.prompt.question,
      system: OPENROUTER_AUDIT_SYSTEM,
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

// ---- generateReportContent -------------------------------------------------

export async function generateReportContent(
  input: {
    brief: BusinessBrief;
    prompts: AuditPrompt[];
    observations: AuditObservation[];
    safety_identifier: string;
    budget: AuditBudget;
    language?: "en" | "id";
  },
  revision?: { draft: ReportContent; violations: string[] },
): Promise<{
  content: ReportContent;
  requested_model: string;
  returned_model: string;
  response_id: string;
  telemetry: AuditCallTelemetry[];
}> {
  const startedAtMs = Date.now();
  const reserved = reservedBudget(input.budget);
  const requestedModel = auditModel();
  try {
    const observationsJson = JSON.stringify(
      input.observations.map(({ telemetry, ...rest }) => {
        void telemetry;
        // Trim the answer text before sending: the synthesis only needs enough
        // to judge appearance/recommendation, and full answers inflate a free
        // model's context past what it handles reliably.
        return {
          ...rest,
          raw_answer: truncateToChars(rest.raw_answer, OBSERVATION_ANSWER_CAP),
          sources: rest.sources.map((source) => source.url),
        };
      }),
      null,
      2,
    );
    const system = [
      "You are a senior analyst writing Nuave AI Visibility Reports.",
      ...reportWritingInstructions(),
      ...reportAssessmentInstructions(),
    ].join("\n");
    const user = `Brand brief:
${JSON.stringify({ ...input.brief, agency_logo_data_url: "[not sent]" }, null, 2)}

Audit prompts:
${JSON.stringify(input.prompts, null, 2)}

Matrix-owned measurement definitions:
${JSON.stringify(reportPromptMeasurements(input.prompts), null, 2)}

Audit observations:
${observationsJson}

${
  revision
    ? `This is a language-only revision. Fix only these writing violations:\n${revision.violations.join("\n")}\nKeep accuracy status, assessment order and classifications, prompt IDs, evidence prompt IDs, priority timing, and owner exactly as supplied.`
    : ""
}

Synthesize into a Nuave AI Visibility Report using contract ${REPORT_SYNTHESIS_PROMPT_VERSION}. Return JSON matching this schema:
{
  "conclusion": string,
  "accuracy_status": "no_clear_issues" | "needs_confirmation" | "needs_correction" | "could_not_assess",
  "key_findings": array of { title: string, explanation: string, evidence_prompt_ids: string[] },
  "priorities": array of { order: number, timing: "do_first"|"do_next", action: string, why: string, basis: string, owner: "business_owner"|"admin"|"marketing"|"web_developer", done_when: string, evidence_prompt_ids: string[], caveat: string },
  "assessments": array of { prompt_id: string, recommendation: "recommended"|"not_recommended"|"not_assessed", comparison: "client_preferred"|"competitor_preferred"|"compared_no_preference"|"not_assessed", information: "confirmed"|"incomplete"|"conflicting"|"not_assessed" }
}

Return exactly one assessment for each supplied prompt ID. Return no more than five priorities. These observations were produced WITHOUT web search, so treat every one of them as a model-knowledge sample, never as evidence about the live web. Keep the writing plain and decisive.`;

    const { text, returnedModel, responseId } = await openrouterChat({
      model: requestedModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      jsonMode: true,
      maxOutputTokens: 4096,
    });

    const parsed = parseJsonObject(text);
    const synthesis = reportSynthesisSchema.parse({
      ...parsed,
      prompt_version: REPORT_SYNTHESIS_PROMPT_VERSION,
    });
    const content = normalizeReportEvidence(
      assembleReportContent(synthesis, input.observations, input.brief),
      input.observations,
      input.brief,
    );
    return {
      content,
      requested_model: requestedModel,
      returned_model: returnedModel,
      response_id: responseId,
      telemetry: [
        completedTelemetry({
          stage: "report",
          startedAtMs,
          model: requestedModel,
          returnedModel,
          responseId,
        }),
      ],
    };
  } catch (error) {
    throw new AuditCallExecutionError(
      error instanceof Error
        ? error.message
        : "Report synthesis failed for an unknown reason.",
      [
        failTelemetry({
          stage: "report",
          startedAtMs,
          model: requestedModel,
          reserved,
          error,
        }),
      ],
    );
  }
}
