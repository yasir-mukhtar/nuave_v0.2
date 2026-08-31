import type {
  IndonesianGenerationMeta,
  IndonesianProviderOutput,
  IndonesianQuestionPackSuggestion,
  IndonesianQuestionProvider,
  MinimizedIndonesianBrief,
} from "./questions-id";
import {
  INDONESIAN_QUESTION_INSTRUCTION_VERSION,
  INDONESIAN_QUESTION_LANGUAGE,
  generateIndonesianQuestionPack,
} from "./questions-id";
import { AUDIT_MODEL, AUDIT_PRICING_VERSION } from "./telemetry";
import { AUDIT_MEASUREMENT_MATRIX } from "./measurement-matrix";
import {
  OPENCODEGO_BASE_URL,
  assertOpenCodeGoProductionMethodConfigured,
} from "./opencodego";

// Live provider for the Indonesian question-generation boundary (Spec 003,
// work package A). `questions-id.ts` owns the boundary contract, deterministic
// numbered-list parsing, mechanical validation, and the deterministic
// Indonesian fallback; THIS module owns the real bounded no-search provider
// call that the boundary is wired to:
//
//   - provider selection via NUAVE_QUESTION_PROVIDER ("opencodego" default |
//     "openai" | "gemini"), independent from NUAVE_PROVIDER so tests can
//     exercise alternatives while the protected live path remains locked to
//     OpenCode Go (founder decision 2026-08-21);
//   - the versioned question-writer instruction (question-writer-v2, the
//     docs/journey/04 "Suggested generation instruction" substance) as the one
//     authoritative instruction source;
//   - the minimal ten-strings output schema for all Responses-compatible
//     providers and Gemini (R-30);
//   - exact request builders (asserted in tests) that send ONLY the minimized
//     confirmed brief — no email, payment information, provider metadata, or
//     sensitive free text (R-29) — and return no predicted answers, findings,
//     scores, or report content;
//   - no web search tool on the question-writer call (docs/journey/04);
//   - structured-output parsing; when the provider returns plain text instead,
//     the boundary in questions-id.ts deterministically parses the numbered
//     list and otherwise falls back to the deterministic Indonesian pack.
//
// Tests stub the HTTP layer (injected fetch); no test performs a live call.

export const INDONESIAN_QUESTION_PROVIDER_DEFAULT = "opencodego" as const;

export const INDONESIAN_QUESTION_PROVIDER_NAMES = [
  "opencodego",
  "openai",
  "gemini",
] as const;
export type IndonesianQuestionProviderName =
  (typeof INDONESIAN_QUESTION_PROVIDER_NAMES)[number];

export const INDONESIAN_QUESTION_OPENCODEGO_SYSTEM =
  "OpenCode Go Responses API" as const;
export const INDONESIAN_QUESTION_OPENAI_SYSTEM =
  "OpenAI Responses API" as const;
export const INDONESIAN_QUESTION_GEMINI_SYSTEM = "Google Gemini API" as const;

/**
 * Gemini default for the question writer: the five-business evaluation
 * candidate (Spec 003 R-07). Override with GEMINI_AUDIT_MODEL. OpenCode Go and
 * direct OpenAI both reuse AUDIT_MODEL (gpt-5.6-luna) via OPENAI_AUDIT_MODEL.
 */
export const INDONESIAN_QUESTION_GEMINI_DEFAULT_MODEL =
  "gemini-3.5-flash-lite" as const;

export const INDONESIAN_QUESTION_OPENCODEGO_PRICING_VERSION =
  AUDIT_PRICING_VERSION;
export const INDONESIAN_QUESTION_OPENAI_PRICING_VERSION = AUDIT_PRICING_VERSION;
export const INDONESIAN_QUESTION_GEMINI_PRICING_VERSION =
  "gemini-flash-lite-v1" as const;

/** Small output bound: exactly ten question strings in the schema-enforced
 * shape; keeps the call bounded and cheap. */
export const INDONESIAN_QUESTION_MAX_OUTPUT_TOKENS = 2_048 as const;

export const INDONESIAN_QUESTION_OPENAI_ENDPOINT =
  "https://api.openai.com/v1/responses" as const;
export const INDONESIAN_QUESTION_OPENCODEGO_BASE_URL = OPENCODEGO_BASE_URL;

export const INDONESIAN_QUESTION_GEMINI_ENDPOINT_PREFIX =
  "https://generativelanguage.googleapis.com/v1beta/models" as const;

// ---------------------------------------------------------------------------
// Versioned question-writer instruction (question-writer-v2)
// ---------------------------------------------------------------------------

function writerSlotInstruction(
  slot: (typeof AUDIT_MEASUREMENT_MATRIX)[number],
) {
  const brandRule =
    slot.auditedBrandIdentity === "required"
      ? "The audited business must be named."
      : "Do not name the audited business or any known variant.";
  const targetRule =
    slot.comparisonTargetIdentity === "required"
      ? "The comparison target must be named."
      : "Do not name the comparison target.";
  const relationRule =
    "comparisonRelationMarkers" in slot
      ? `Use an explicit comparison relation from the slot's closed markers: ${JSON.stringify(slot.comparisonRelationMarkers)}.`
      : "";
  return `Slot ${slot.order} — category ${slot.category}. Purpose: ${slot.measurementPurpose}. ${slot.generatorSlotDescription} ${brandRule} ${targetRule} ${relationRule}`.trim();
}

/**
 * The canonical, versioned question-writer instruction (docs/journey/04 —
 * "Suggested generation instruction", preserved in substance). Paired with
 * `INDONESIAN_QUESTION_INSTRUCTION_VERSION` ("question-writer-v2") exported by
 * questions-id.ts. Historical frozen fixture records retain their recorded
 * version and are not relabeled. The
 * minimized confirmed brief follows as structured data, not concatenated
 * prose (docs/journey/04). The required output language is id-ID.
 */
export const INDONESIAN_QUESTION_WRITER_INSTRUCTION = [
  "You write questions that plausible Indonesian prospective customers would ask an AI assistant about one business category and one exact business.",
  "Use the confirmed business context below. Write natural Indonesian appropriate to the category and audience. Do not translate fixed English sentence templates. Familiar borrowed words, abbreviations, direct commands, and casual wording are allowed when real customers in this context would use them. Do not force slang where a more formal register is natural.",
  "Write exactly ten independent questions in the fixed slot order below. The slot metadata is code-owned: do not change a slot's category, purpose, identity policy, allowed context, or order.",
  "The fixed composition is six unnamed slots (1-6) and four named slots (7-10).",
  ...AUDIT_MEASUREMENT_MATRIX.map(writerSlotInstruction),
  "Prefer the direct question a customer wants answered over an abstract question about how to evaluate options. Vary the customer job, not merely the wording.",
  "You may ask whether an unknown public fact is true, but do not write as if that fact is already true. Use only confirmed facts as premises. Do not favour the audited business or word a discovery question to reveal it.",
  "Do not include answers, explanations, rationales, citations, scores, findings, or marketing claims. Return only the ten questions in the required output format.",
].join("\n");

// ---------------------------------------------------------------------------
// Minimal ten-strings output schema (R-30)
// ---------------------------------------------------------------------------

/** Responses API strict JSON schema: `{ "questions": [10 strings] }`. */
export const INDONESIAN_QUESTION_STRINGS_JSON_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: { type: "string" },
      minItems: 10,
      maxItems: 10,
    },
  },
  required: ["questions"],
  additionalProperties: false,
} as const;

/** Gemini generateContent responseSchema equivalent (uppercase enums). The
 * code-side length check enforces exactly ten after parsing. */
export const INDONESIAN_QUESTION_STRINGS_GEMINI_SCHEMA = {
  type: "OBJECT",
  properties: {
    questions: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: ["questions"],
} as const;

export const INDONESIAN_QUESTION_STRUCTURED_OUTPUT_NAME =
  "nuave_indonesian_questions" as const;

// ---------------------------------------------------------------------------
// Provider configuration (environment-driven)
// ---------------------------------------------------------------------------

/**
 * The question-writer provider name from NUAVE_QUESTION_PROVIDER. Defaults to
 * "opencodego" when unset or empty; fails closed on any other value (mirroring
 * activeAuditProvider in provider.ts).
 */
export function indonesianQuestionProviderName(): IndonesianQuestionProviderName {
  const value =
    process.env.NUAVE_QUESTION_PROVIDER?.trim().toLocaleLowerCase("en-US");
  if (value === undefined || value === "") {
    return INDONESIAN_QUESTION_PROVIDER_DEFAULT;
  }
  if (INDONESIAN_QUESTION_PROVIDER_NAMES.some((name) => name === value)) {
    return value as IndonesianQuestionProviderName;
  }
  throw new Error(
    `Unrecognized NUAVE_QUESTION_PROVIDER="${process.env.NUAVE_QUESTION_PROVIDER}". Valid values are ${INDONESIAN_QUESTION_PROVIDER_NAMES.map((name) => `"${name}"`).join(", ")}.`,
  );
}

/**
 * Question-writer provider for the protected live path (`/api/audit/prompts`).
 * Fails closed to the founder-approved OpenCode Go transport serving
 * GPT-5.6 Luna (DECISION_LOG 2026-08-21). Other providers are testing-only and
 * require `NUAVE_LIVE_PROVIDER_TESTING=1` outside production.
 */
export function liveIndonesianQuestionProviderName(): IndonesianQuestionProviderName {
  const name = indonesianQuestionProviderName();
  if (name === "opencodego") return "opencodego";
  // R-13 (O-10, Phase 3 fix-round-2 adversarial review): see the identical
  // guard and rationale in `provider.ts`'s `liveAuditProvider`.
  if (
    process.env.NUAVE_LIVE_PROVIDER_TESTING === "1" &&
    process.env.NODE_ENV !== "production"
  ) {
    return name;
  }
  throw new Error(
    `NUAVE_QUESTION_PROVIDER="${name}" is testing-only; the protected live question path fails closed to OpenCode Go (gpt-5.6-luna). Set NUAVE_LIVE_PROVIDER_TESTING=1 only for tests and local runners — it is always ignored when NODE_ENV=production.`,
  );
}

export type IndonesianQuestionProviderConfig = {
  name: IndonesianQuestionProviderName;
  system: string;
  requested_model: string;
  pricing_version: string;
};

/** Resolved provider configuration: system label, requested model, and pricing
 * version for the generation record (provenance, R-33). */
export function indonesianQuestionProviderConfig(): IndonesianQuestionProviderConfig {
  const name = indonesianQuestionProviderName();
  if (name === "opencodego") {
    return {
      name,
      system: INDONESIAN_QUESTION_OPENCODEGO_SYSTEM,
      requested_model: process.env.OPENAI_AUDIT_MODEL?.trim() || AUDIT_MODEL,
      pricing_version: INDONESIAN_QUESTION_OPENCODEGO_PRICING_VERSION,
    };
  }
  if (name === "openai") {
    return {
      name,
      system: INDONESIAN_QUESTION_OPENAI_SYSTEM,
      requested_model: process.env.OPENAI_AUDIT_MODEL?.trim() || AUDIT_MODEL,
      pricing_version: INDONESIAN_QUESTION_OPENAI_PRICING_VERSION,
    };
  }
  return {
    name,
    system: INDONESIAN_QUESTION_GEMINI_SYSTEM,
    requested_model:
      process.env.GEMINI_AUDIT_MODEL?.trim() ||
      INDONESIAN_QUESTION_GEMINI_DEFAULT_MODEL,
    pricing_version: INDONESIAN_QUESTION_GEMINI_PRICING_VERSION,
  };
}

/** Generation-record meta (system/requested_model/pricing_version) resolved
 * from the environment for the boundary's `generationMeta` option. */
export function indonesianQuestionGenerationMeta(): IndonesianGenerationMeta {
  const config = indonesianQuestionProviderConfig();
  return {
    system: config.system,
    requested_model: config.requested_model,
    pricing_version: config.pricing_version,
  };
}

// ---------------------------------------------------------------------------
// Request builders (pure, asserted exactly in tests)
// ---------------------------------------------------------------------------

/**
 * The exact Responses API payload for one bounded no-search question
 * generation call: low reasoning, no tools (no web search), the minimal
 * ten-strings structured-output schema, the versioned developer instruction,
 * and the minimized confirmed brief as the only user content (R-29).
 */
export function buildOpenAIIndonesianQuestionRequest(
  brief: MinimizedIndonesianBrief,
  model: string,
) {
  return {
    model,
    reasoning: { effort: "low" as const },
    store: false as const,
    service_tier: "default" as const,
    max_output_tokens: INDONESIAN_QUESTION_MAX_OUTPUT_TOKENS,
    text: {
      format: {
        type: "json_schema" as const,
        name: INDONESIAN_QUESTION_STRUCTURED_OUTPUT_NAME,
        schema: INDONESIAN_QUESTION_STRINGS_JSON_SCHEMA,
        strict: true as const,
      },
      verbosity: "low" as const,
    },
    input: [
      {
        role: "developer" as const,
        // Responses API: content is a string or an array of content-part
        // objects — a bare string inside an array is rejected
        // ("Invalid type for input[0].content[0]"). The extraction path in
        // openai.ts uses the same joined-string form.
        content: INDONESIAN_QUESTION_WRITER_INSTRUCTION,
      },
      { role: "user" as const, content: JSON.stringify(brief) },
    ],
  };
}

/**
 * The exact Gemini generateContent request for the same bounded no-search
 * call: responseMimeType application/json with the ten-strings schema, the
 * versioned system instruction, the minimized brief as the only user content,
 * and no search tools. The API key header is added by the caller.
 */
export function buildGeminiIndonesianQuestionRequest(
  brief: MinimizedIndonesianBrief,
  model: string,
) {
  return {
    url: `${INDONESIAN_QUESTION_GEMINI_ENDPOINT_PREFIX}/${model}:generateContent`,
    body: {
      systemInstruction: {
        parts: [{ text: INDONESIAN_QUESTION_WRITER_INSTRUCTION }],
      },
      contents: [
        { role: "user" as const, parts: [{ text: JSON.stringify(brief) }] },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: INDONESIAN_QUESTION_MAX_OUTPUT_TOKENS,
        responseMimeType: "application/json" as const,
        responseSchema: INDONESIAN_QUESTION_STRINGS_GEMINI_SCHEMA,
      },
      tools: [],
    },
  };
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

type OpenAIResponseContent = {
  type?: string;
  text?: string;
  parsed?: unknown;
};
type OpenAIResponseItem = {
  type?: string;
  content?: OpenAIResponseContent[];
};
type OpenAIResponseBody = {
  status?: string;
  error?: { message?: string };
  output?: OpenAIResponseItem[];
};

function isTenQuestionStrings(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length === 10 &&
    value.every((item) => typeof item === "string")
  );
}

/**
 * Parses a Responses API body into the provider output contract. Structured
 * output (`output_text.parsed`) yields `kind: "structured"`; otherwise the raw
 * output text is returned so the boundary deterministically parses the
 * numbered list. Refusals, incomplete statuses, and missing output throw so
 * the boundary falls back to the deterministic Indonesian pack.
 */
export function parseOpenAIIndonesianResponse(
  json: OpenAIResponseBody,
): IndonesianProviderOutput {
  if (json.error?.message) {
    throw new Error(
      `Responses API question generation failed: ${json.error.message}`,
    );
  }
  if (json.status && json.status !== "completed") {
    throw new Error(
      `Responses API question generation ended with provider status ${json.status}.`,
    );
  }
  for (const item of json.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type === "refusal") {
        throw new Error(
          "Responses API refused the question-generation request.",
        );
      }
      if (content.type !== "output_text") continue;
      const parsed = content.parsed;
      if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        isTenQuestionStrings((parsed as { questions?: unknown }).questions)
      ) {
        return {
          kind: "structured",
          questions: (parsed as { questions: string[] }).questions,
        };
      }
      if (typeof content.text === "string" && content.text.trim()) {
        // Some Responses API deployments return the structured output as a
        // JSON string inside `text` without populating `parsed` (observed live
        // 2026-08-17 on gpt-5.6-luna with json_schema format). Accept the JSON
        // form when it matches the schema — mirrors parseGeminiIndonesianResponse.
        if (content.parsed == null) {
          try {
            const fromText: unknown = JSON.parse(content.text);
            if (
              fromText !== null &&
              typeof fromText === "object" &&
              !Array.isArray(fromText) &&
              isTenQuestionStrings(
                (fromText as { questions?: unknown }).questions,
              )
            ) {
              return {
                kind: "structured",
                questions: (fromText as { questions: string[] }).questions,
              };
            }
          } catch {
            // Fall through to the text representation for deterministic parsing.
          }
        }
        return { kind: "text", text: content.text };
      }
    }
  }
  throw new Error(
    "Responses API question generation returned no usable output.",
  );
}

type GeminiResponseBody = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string; status?: string };
};

/**
 * Parses a Gemini generateContent body. Structured output is the JSON text of
 * the ten-questions object; when it is missing or unparseable, the raw text is
 * returned so the boundary falls back deterministically. Errors throw.
 */
export function parseGeminiIndonesianResponse(
  json: GeminiResponseBody,
): IndonesianProviderOutput {
  if (json.error?.message) {
    throw new Error(
      `Gemini question generation failed: ${json.error.message}${
        json.error.status ? ` (${json.error.status})` : ""
      }`,
    );
  }
  const text =
    json.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("") ?? "";
  if (!text.trim()) {
    throw new Error("Gemini question generation returned no usable output.");
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      isTenQuestionStrings((parsed as { questions?: unknown }).questions)
    ) {
      return {
        kind: "structured",
        questions: (parsed as { questions: string[] }).questions,
      };
    }
  } catch {
    // Fall through to the text representation for deterministic parsing.
  }
  return { kind: "text", text };
}

// ---------------------------------------------------------------------------
// HTTP clients (injectable fetch for tests; never called live in tests)
// ---------------------------------------------------------------------------

export type IndonesianFetch = typeof fetch;

function responsesEndpoint(provider: "opencodego" | "openai"): string {
  if (provider === "openai") return INDONESIAN_QUESTION_OPENAI_ENDPOINT;
  return `${INDONESIAN_QUESTION_OPENCODEGO_BASE_URL}/responses`;
}

async function responsesGenerate(
  provider: "opencodego" | "openai",
  brief: MinimizedIndonesianBrief,
  model: string,
  fetcher: IndonesianFetch,
): Promise<IndonesianProviderOutput> {
  const variable =
    provider === "opencodego" ? "OPENCODEGO_API_KEY" : "OPENAI_API_KEY";
  const apiKey = process.env[variable]?.trim();
  if (!apiKey) {
    throw new Error(`${variable} is not configured on the Nuave server.`);
  }
  const request = buildOpenAIIndonesianQuestionRequest(brief, model);
  const res = await fetcher(responsesEndpoint(provider), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(request),
  });
  const json = (await res.json().catch(() => ({}))) as OpenAIResponseBody;
  if (!res.ok) {
    const label = provider === "opencodego" ? "OpenCode Go" : "OpenAI";
    throw new Error(
      `${label} question generation failed: ${
        json.error?.message || `provider returned status ${res.status}.`
      }`,
    );
  }
  return parseOpenAIIndonesianResponse(json);
}

async function geminiGenerate(
  brief: MinimizedIndonesianBrief,
  model: string,
  fetcher: IndonesianFetch,
): Promise<IndonesianProviderOutput> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the Nuave server.");
  }
  const request = buildGeminiIndonesianQuestionRequest(brief, model);
  const res = await fetcher(request.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(request.body),
  });
  const json = (await res.json().catch(() => ({}))) as GeminiResponseBody;
  if (!res.ok) {
    throw new Error(
      `Gemini question generation failed: ${
        json.error?.message || `provider returned status ${res.status}.`
      }`,
    );
  }
  return parseGeminiIndonesianResponse(json);
}

// ---------------------------------------------------------------------------
// Factory and boundary wiring
// ---------------------------------------------------------------------------

/**
 * The real IndonesianQuestionProvider for the generation boundary, selected
 * and configured from the environment (NUAVE_QUESTION_PROVIDER plus the model
 * overrides). Pass a `fetchImpl` only in tests to stub the HTTP layer; the
 * default uses the global fetch.
 */
export function createIndonesianQuestionProvider(
  fetchImpl?: IndonesianFetch,
): IndonesianQuestionProvider {
  const config = indonesianQuestionProviderConfig();
  const fetcher: IndonesianFetch = fetchImpl ?? globalThis.fetch;
  return {
    generate: (brief) =>
      config.name === "gemini"
        ? geminiGenerate(brief, config.requested_model, fetcher)
        : responsesGenerate(
            config.name,
            brief,
            config.requested_model,
            fetcher,
          ),
  };
}

/**
 * Wired entry point for the live path: one bounded no-search provider call
 * through the Indonesian generation boundary (Spec 003 work package A), with
 * generation provenance resolved from the environment. The deterministic
 * fallback, parsing, validation, and classification in questions-id.ts are
 * unchanged. Never call this in tests without a stubbed fetch.
 */
export async function generateLiveIndonesianQuestionPack(
  brief: MinimizedIndonesianBrief,
  options: {
    generationMeta?: IndonesianGenerationMeta;
    now?: () => string;
    fetch?: IndonesianFetch;
  } = {},
): Promise<IndonesianQuestionPackSuggestion> {
  // Enforce the same production provider and method lock used by the audit
  // path before the provider factory resolves configuration. Tests can opt
  // into alternative providers with the explicit non-production testing flag.
  const name = liveIndonesianQuestionProviderName();
  if (name === "opencodego") {
    assertOpenCodeGoProductionMethodConfigured();
  }
  const generationMeta =
    options.generationMeta ?? indonesianQuestionGenerationMeta();
  return generateIndonesianQuestionPack(
    brief,
    createIndonesianQuestionProvider(options.fetch),
    { generationMeta, now: options.now },
  );
}

export {
  INDONESIAN_QUESTION_LANGUAGE,
  INDONESIAN_QUESTION_INSTRUCTION_VERSION,
};
