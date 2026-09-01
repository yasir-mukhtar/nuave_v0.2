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
  type Source,
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

// Free-tier audit provider: Groq (LLM) + Tavily (web search). Both have free
// tiers with no credit card. Groq serves an OpenAI-compatible chat endpoint and
// supports JSON-mode structured output. Tavily provides web search results that
// we inject as explicit context, then map to Nuave Source[] for honest
// provenance (Groq itself does not return citations like OpenAI/Gemini do).
//
// This file mirrors the three OpenAI Responses API functions in openai.ts:
// extractBusinessDraft, executeAuditPrompt, and generateReportContent. The
// signatures, returned shapes, and Zod contracts are shared so the provider is
// a drop-in swap selected by NUAVE_PROVIDER=groq.

export const GROQ_AUDIT_SYSTEM = "Groq + Tavily" as const;

const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const TAVILY_ENDPOINT = "https://api.tavily.com/search";
const GROQ_PRICING_VERSION = "groq-free-2026-08";

// Groq's free tier is bound by a per-day token budget (TPD, 100,000 tokens/day
// on the free tier). TPD is the real constraint: once it is exhausted, every
// request is rejected with a 429 whose body names "tokens per day (TPD)" and a
// retry-after of ~25+ minutes. That state can never clear inside one request,
// so groqChat() fails fast on it instead of sleeping (see the retry block).
// TPM (input tokens per minute) is a softer ceiling; GROQ_MAX_INPUT_CHARS is a
// safety net that keeps a single request's input well under it.
const GROQ_MAX_INPUT_CHARS = 28000; // ~7,000 tokens; safety net under TPM
const TAVILY_CONTEXT_CAP = 4000; // chars of search context injected per call
const OBSERVATION_ANSWER_CAP = 1500; // chars of raw answer sent to report synthesis
const CONTEXT_FLOOR_CHARS = 500; // never truncate a user message below this
// Hard ceiling on a single raw fetch. A stalled connection must abort rather
// than hang the request. Override per-process with GROQ_REQUEST_TIMEOUT_MS.
// Read lazily so a test can shrink it via env without a restart.
function groqRequestTimeoutMs(): number {
  return Number(process.env.GROQ_REQUEST_TIMEOUT_MS) || 60_000;
}
// Never honor a provider-supplied retry-after beyond this. A larger value means
// the limit is a quota (TPD), not a short window, and is handled separately.
const GROQ_MAX_RETRY_AFTER_MS = 60_000;
// Default max output tokens per stage when a caller does not override it. The
// free tier is 100,000 tokens/day; keep each stage to what it actually needs so
// a full run is repeatable (see the brief's estimated-tokens-per-run note).
const GROQ_MAX_OUTPUT_TOKENS = 2048;
// Base backoff for a short-window (TPM/RPM) rate limit; grows by attempt number
// and is always bounded below GROQ_MAX_RETRY_AFTER_MS.
const GROQ_RETRY_BASE_MS = 4_000;

export function truncateToChars(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

// Final safety net: if the combined request input still exceeds the budget,
// shrink the longest user message (free-form text tolerates this) while keeping
// the system prompt (schema + instructions) intact. Runs at most a few times.
function capRequestInput(messages: GroqMessage[]): GroqMessage[] {
  const working = messages.map((m) => ({ ...m }));
  const totalChars = () => working.reduce((s, m) => s + m.content.length, 0);
  let guard = 0;
  while (totalChars() > GROQ_MAX_INPUT_CHARS && guard < 20) {
    guard++;
    const longest = working
      .filter((m) => m.role === "user")
      .reduce<GroqMessage | null>(
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

function groqKey() {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    throw new Error("GROQ_API_KEY is not configured on the Nuave server.");
  }
  return key;
}

function tavilyKey(): string | undefined {
  return process.env.TAVILY_API_KEY?.trim() || undefined;
}

export function auditModel() {
  return process.env.GROQ_AUDIT_MODEL?.trim() || DEFAULT_MODEL;
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

// Groq does not return citations, so we map the [n] markers the audit prompt
// instructs the model to emit back onto the injected Tavily sources (source i is
// marker i+1). Only sources the answer actually cites are kept, so the
// observation's `sources` means the same thing as on the OpenAI path: evidence
// the answer relied on, not the full result set that was merely available.
export function citedGroqSources(answer: string, sources: Source[]): Source[] {
  const markers = new Set<number>();
  const match = answer.match(/\[(\d+)\]/g);
  if (match) {
    for (const token of match) {
      const n = Number(token.slice(1, -1));
      if (Number.isInteger(n) && n >= 1 && n <= sources.length) {
        markers.add(n);
      }
    }
  }
  return [...markers].sort((a, b) => a - b).map((n) => sources[n - 1]);
}

// ---- Tavily search ---------------------------------------------------------

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
};

type TavilyResponse = {
  results?: TavilyResult[];
  error?: string;
};

async function tavilySearch(
  query: string,
  apiKey: string,
): Promise<{ sources: Source[]; context: string }> {
  const res = await fetch(TAVILY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      max_results: 6,
      include_answer: false,
    }),
    signal: AbortSignal.timeout(groqRequestTimeoutMs()),
  });
  const data = (await res.json().catch(() => ({}))) as TavilyResponse;
  if (!res.ok || data.error) {
    throw new Error(
      data.error || `Tavily request failed with status ${res.status}.`,
    );
  }
  const sources: Source[] = [];
  const seen = new Set<string>();
  const blocks: string[] = [];
  for (const r of data.results ?? []) {
    const url = r.url?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const title = normalizeSourceTitle(r.title, url);
    sources.push({ url, title });
    const snippet = truncateToChars((r.content || "").trim(), 700);
    blocks.push(`[${sources.length}] ${title}\n${url}\n${snippet}`);
  }
  const context = blocks.join("\n\n");
  return { sources, context: truncateToChars(context, TAVILY_CONTEXT_CAP) };
}

// ---- Groq chat -------------------------------------------------------------

type GroqMessage = { role: "system" | "user" | "assistant"; content: string };

type GroqResponse = {
  choices?: { message?: { content?: string } }[];
  model?: string;
  error?: { message?: string };
};

export async function groqChat(params: {
  model: string;
  messages: GroqMessage[];
  jsonMode?: boolean;
  maxOutputTokens?: number;
  temperature?: number;
}): Promise<{ text: string; returnedModel: string }> {
  const maxAttempts = 6;
  let lastError: Error | null = null;
  const messages = capRequestInput(params.messages);
  // Read the credential once, before the retry loop. A missing or invalid key
  // is a configuration error, not a network fault, so it must fail fast and
  // must never be retried or backed off (the key will not appear on retry).
  const authKey = groqKey();
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authKey}`,
        },
        body: JSON.stringify({
          model: params.model,
          messages: messages,
          temperature: params.temperature ?? 0.2,
          max_tokens: params.maxOutputTokens ?? GROQ_MAX_OUTPUT_TOKENS,
          response_format: params.jsonMode
            ? { type: "json_object" }
            : undefined,
        }),
        signal: AbortSignal.timeout(groqRequestTimeoutMs()),
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
      lastError = new Error(`Groq request failed: ${message}`);
      if (isAbort) throw lastError;
      if (attempt < maxAttempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, GROQ_RETRY_BASE_MS * attempt),
        );
        continue;
      }
      throw lastError;
    }
    const data = (await res.json().catch(() => ({}))) as GroqResponse;
    if (res.ok && !data.error) {
      const text = data.choices?.[0]?.message?.content ?? "";
      return { text, returnedModel: data.model || params.model };
    }
    const message =
      data.error?.message || `Groq request failed with status ${res.status}.`;
    lastError = new Error(message);
    // Groq sometimes returns rate limits as an in-body error with a 200 status
    // (e.g. TPM exceeded). Treat those like 429 and retry with backoff.
    const isRateLimit =
      res.status === 429 ||
      res.status >= 500 ||
      /rate limit|too many requests|RESOURCE_EXHAUSTED|429/i.test(message);
    if (!isRateLimit) {
      throw lastError;
    }
    // A per-day-token (TPD) quota can never clear inside one request lifetime,
    // so sleeping on it is always wrong. Detect it two ways: (1) the provider's
    // own message names a per-day limit, or (2) the suggested retry-after is so
    // large it can only be a quota window. In both cases fail immediately and
    // surface Groq's text so the operator sees the real cause.
    const retryAfterHeader = Number(res.headers.get("retry-after"));
    const retryAfterMs =
      Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
        ? retryAfterHeader * 1000
        : 0;
    const isQuotaLimit =
      /tokens per day|per day|TPD|daily/i.test(message) ||
      retryAfterMs > GROQ_MAX_RETRY_AFTER_MS;
    if (isQuotaLimit) {
      throw new Error(
        `Groq daily token quota reached and cannot be retried within this request. ${message}`,
      );
    }
    // Short-window limit (TPM/RPM): worth one or two retries, but the backoff is
    // always bounded — we never honor a provider-supplied duration unbounded.
    const delayMs =
      retryAfterMs > 0
        ? Math.min(retryAfterMs, GROQ_MAX_RETRY_AFTER_MS)
        : GROQ_RETRY_BASE_MS * attempt;
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }
    throw lastError;
  }
  throw lastError ?? new Error("Groq request failed after retries.");
}

// ---- Shared helpers (mirror openai.ts / gemini.ts) -------------------------

function parseJsonObject(raw: string): Record<string, unknown> {
  const value = JSON.parse(raw);
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
  webSearchCalls: number;
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
    web_search_calls: input.webSearchCalls,
    accounted_cost_usd: 0,
    cost_basis: "preflight_reservation",
    pricing_version: GROQ_PRICING_VERSION,
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
  try {
    const apiKey = tavilyKey();
    const query = `What does ${input.brand_name} (${input.website_url}) offer? official products, services, customer needs, competitors in ${input.market_context}.`;
    let searchContext = "";
    if (apiKey) {
      const search = await tavilySearch(query, apiKey);
      searchContext = search.context;
    }
    const system = `You are a meticulous business analyst extracting a structured dossier from public web information. Use ONLY the supplied search context. If the context is missing or thin, say so in warnings rather than inventing facts. Output JSON matching the requested schema.`;
    const user = `Brand: ${input.brand_name}
Website: ${input.website_url}
Category: ${input.category}
Market context: ${input.market_context}

${
  searchContext
    ? `Public web search context (cite by [n] when used):\n${searchContext}`
    : "No web search context was available."
}

Return a JSON object with: brand_name (string), entity_scope (string), brand_type (string), category (string), market_context (string), target_customer (string), official_sources (array of URLs actually seen), verified_offerings (array of strings), verified_customer_needs (array of strings), verified_decision_criteria (array of strings), verified_competitor (object with name, scope, source_url), brand_name_variants (array of strings), priority_offering (string), conversion_action (string), customer_supplied_facts (empty array), known_accuracy_questions (array of strings about uncertain claims), usp (string), regulated_category_notes (string), language (string, e.g. "en-US"), agency_name (string, empty if none), agency_logo_data_url (string, empty).

Use the search context to fill verified_offerings, verified_customer_needs, verified_decision_criteria, verified_competitor, and official_sources. Keep factual claims grounded in the context.`;

    const { text, returnedModel } = await groqChat({
      model: auditModel(),
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
      agency_name: parsed.agency_name ?? "",
      agency_logo_data_url: parsed.agency_logo_data_url ?? "",
      evidence: parsed.evidence ?? [],
      warnings: parsed.warnings ?? [],
    });

    const telemetry = completedTelemetry({
      stage: "extract",
      startedAtMs,
      model: auditModel(),
      returnedModel,
      responseId: "",
      webSearchCalls: apiKey ? 1 : 0,
    });

    return {
      draft,
      returned_model: returnedModel,
      response_id: "",
      telemetry: [telemetry],
    };
  } catch (error) {
    const retained = new AuditCallExecutionError(
      error instanceof Error
        ? error.message
        : "Website extraction failed for an unknown reason.",
      [
        failTelemetry({
          stage: "extract",
          startedAtMs,
          model: auditModel(),
          reserved,
          error,
        }),
      ],
    );
    throw retained;
  }
}

// ---- executeAuditPrompt ----------------------------------------------------

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
    const apiKey = tavilyKey();
    const query = `${input.prompt.question} ${input.brief.brand_name} ${input.brief.category} ${input.brief.market_context}`;
    let searchContext = "";
    let sources: Source[] = [];
    if (apiKey) {
      const search = await tavilySearch(query, apiKey);
      searchContext = search.context;
      sources = search.sources;
    }

    const briefJson = JSON.stringify(input.brief, null, 2);
    const system = `You are an AI visibility auditor. Answer the audit question using ONLY the supplied public web search context, and cite sources by their [n] marker. If the context does not support an answer, say so plainly. End with a short "Sources used:" line listing the [n] markers you relied on.`;
    const user = `Audit question (${input.prompt.category}): ${input.prompt.question}

Brand brief:
${briefJson}

${
  searchContext
    ? `Public web search context:\n${searchContext}`
    : "No web search context was available."
}`;

    const { text, returnedModel } = await groqChat({
      model: requestedModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      maxOutputTokens: 1500,
    });

    return {
      prompt_id: input.prompt.prompt_id,
      category: input.prompt.category,
      branded: input.prompt.branded,
      question: input.prompt.question,
      system: GROQ_AUDIT_SYSTEM,
      requested_model: requestedModel,
      returned_model: returnedModel,
      response_id: "",
      observed_at: new Date().toISOString(),
      raw_answer: text,
      sources: citedGroqSources(text, sources),
      run_status: "completed",
      failure_reason: "",
      telemetry: [
        completedTelemetry({
          stage: "observation",
          startedAtMs,
          model: requestedModel,
          returnedModel,
          responseId: "",
          webSearchCalls: apiKey ? 1 : 0,
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
      system: GROQ_AUDIT_SYSTEM,
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
        // to judge appearance/recommendation, and full answers blow the TPM cap.
        return {
          ...rest,
          raw_answer: truncateToChars(rest.raw_answer, OBSERVATION_ANSWER_CAP),
          sources: rest.sources.map((source) => source.url),
        };
      }),
      null,
      2,
    );
    const promptsJson = JSON.stringify(input.prompts, null, 2);
    const system = [
      "You are a senior analyst writing Nuave AI Visibility Reports.",
      ...reportWritingInstructions(),
      ...reportAssessmentInstructions(),
    ].join("\n");
    const user = `Brand brief:
${JSON.stringify(input.brief, null, 2)}

Audit prompts:
${promptsJson}

Matrix-owned measurement definitions:
${JSON.stringify(reportPromptMeasurements(input.prompts), null, 2)}

Audit observations:
${observationsJson}

${
  revision
    ? `This is a language-only revision. Fix only these writing violations:\n${revision.violations.join("\n")}\nKeep accuracy status, assessment order and classifications, prompt IDs, evidence prompt IDs, priority timing, and owner exactly as supplied.`
    : ""
}

Synthesize into a Nuave AI Visibility Report. Return JSON matching this schema:
{
  "conclusion": string,
  "accuracy_status": "no_clear_issues" | "needs_confirmation" | "needs_correction" | "could_not_assess",
  "key_findings": array of { title: string, explanation: string, evidence_prompt_ids: string[] },
  "priorities": array of { order: number, timing: "do_first"|"do_next", action: string, why: string, basis: string, owner: "business_owner"|"admin"|"marketing"|"web_developer", done_when: string, evidence_prompt_ids: string[], caveat: string },
  "assessments": array of { prompt_id: string, recommendation: "recommended"|"not_recommended"|"not_assessed", comparison: "client_preferred"|"competitor_preferred"|"compared_no_preference"|"not_assessed", information: "confirmed"|"incomplete"|"conflicting"|"not_assessed" }
}

Base every claim on the observation sources. Keep the writing plain and decisive.`;

    const { text, returnedModel } = await groqChat({
      model: requestedModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      jsonMode: true,
      maxOutputTokens: 2048,
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
    const telemetry = completedTelemetry({
      stage: "report",
      startedAtMs,
      model: requestedModel,
      returnedModel,
      responseId: "",
      webSearchCalls: 0,
    });
    return {
      content,
      requested_model: requestedModel,
      returned_model: returnedModel,
      response_id: "",
      telemetry: [telemetry],
    };
  } catch (error) {
    const retained = new AuditCallExecutionError(
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
    throw retained;
  }
}
