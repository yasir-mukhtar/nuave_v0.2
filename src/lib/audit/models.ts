/**
 * Which AI model does which paid job, in one place. `docs/MODELS.md` says how
 * to switch a model or add one.
 *
 * - Step 3, the paid website reading: `NUAVE_READING_MODEL` (a row of
 *   `OPENAI_MODEL_PRICES`) and `NUAVE_READING_EFFORT`.
 * - Step 7, the report writer: `NUAVE_REPORT_WRITER` (a row of
 *   `CLAUDE_WRITERS`, or unset for the OpenAI writer) and
 *   `NUAVE_REPORT_EFFORT`.
 * - The other OpenAI calls: `OPENAI_AUDIT_MODEL` and
 *   `OPENAI_AUDIT_REASONING_EFFORT` (`openai.ts`).
 *
 * A name with no row here fails closed: the cost guard cannot price it.
 */

export const OPENAI_REASONING_EFFORTS = [
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;
export type OpenAIReasoningEffort = (typeof OPENAI_REASONING_EFFORTS)[number];

type OpenAIRates = {
  input: number;
  cached_input: number;
  cache_write_input: number;
  output: number;
};

/** OpenAI standard prices in USD per million tokens. A request with more
 * input tokens than `long_context_threshold` is priced at `long` as a whole.
 * `max_input_tokens` is what a web-search call reserves for. */
export const OPENAI_MODEL_PRICES = {
  // Read 2026-08-01: developers.openai.com/api/docs/models/gpt-5.6-luna
  "gpt-5.6-luna": {
    max_input_tokens: 922_000,
    long_context_threshold: 272_000,
    short: {
      input: 0.2,
      cached_input: 0.02,
      cache_write_input: 0.25,
      output: 1.2,
    },
    long: {
      input: 0.4,
      cached_input: 0.04,
      cache_write_input: 0.5,
      output: 1.8,
    },
  },
  // Read 2026-10-28: developers.openai.com/api/docs/models/gpt-6-luna
  "gpt-6-luna": {
    max_input_tokens: 922_000,
    long_context_threshold: 272_000,
    short: {
      input: 0.1,
      cached_input: 0.01,
      cache_write_input: 0.125,
      output: 0.5,
    },
    long: {
      input: 0.2,
      cached_input: 0.02,
      cache_write_input: 0.25,
      output: 0.75,
    },
  },
} as const satisfies Record<
  string,
  {
    max_input_tokens: number;
    long_context_threshold: number;
    short: OpenAIRates;
    long: OpenAIRates;
  }
>;
export type PricedOpenAIModel = keyof typeof OPENAI_MODEL_PRICES;

export function isPricedOpenAIModel(model: string): model is PricedOpenAIModel {
  return Object.hasOwn(OPENAI_MODEL_PRICES, model);
}

function openAIEffort(
  variable: string,
  configured: string | undefined,
  fallback: OpenAIReasoningEffort,
) {
  const value = configured?.trim();
  if (!value) return fallback;
  if (!OPENAI_REASONING_EFFORTS.some((effort) => effort === value)) {
    throw new Error(
      `${variable} must be one of: ${OPENAI_REASONING_EFFORTS.join(", ")}.`,
    );
  }
  return value as OpenAIReasoningEffort;
}

/** Step 3's model when the deploy names none: the founder's pick of
 * 2026-10-28 after the step 3 model rounds. */
export const READING_DEFAULT = {
  model: "gpt-5.6-luna",
  effort: "medium",
} as const satisfies {
  model: PricedOpenAIModel;
  effort: OpenAIReasoningEffort;
};

/** Step 3's model. It has its own setting, so `OPENAI_AUDIT_MODEL` and
 * `OPENAI_AUDIT_REASONING_EFFORT` (the other OpenAI calls) never change it. */
export function readingModel(): PricedOpenAIModel {
  const configured =
    process.env.NUAVE_READING_MODEL?.trim() || READING_DEFAULT.model;
  if (!isPricedOpenAIModel(configured)) {
    throw new Error(
      `NUAVE_READING_MODEL="${configured}" has no price in OPENAI_MODEL_PRICES. Priced models: ${Object.keys(OPENAI_MODEL_PRICES).join(", ")}.`,
    );
  }
  return configured;
}

export function readingEffort(): OpenAIReasoningEffort {
  return openAIEffort(
    "NUAVE_READING_EFFORT",
    process.env.NUAVE_READING_EFFORT,
    READING_DEFAULT.effort,
  );
}

/** The other OpenAI calls' effort (`OPENAI_AUDIT_REASONING_EFFORT`). */
export function auditReasoningEffort(fallback: OpenAIReasoningEffort) {
  return openAIEffort(
    "OPENAI_AUDIT_REASONING_EFFORT",
    process.env.OPENAI_AUDIT_REASONING_EFFORT,
    fallback,
  );
}

export const CLAUDE_EFFORTS = [
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;
export type ClaudeEffort = (typeof CLAUDE_EFFORTS)[number];

/** Step 7's Claude writers. Prices are standard tier in USD per million
 * tokens (claude.com/pricing, read 2026-10-28); cache writes cost 1.25
 * times the input price. */
export const CLAUDE_WRITERS = {
  // The reading test: Opus used 12,230 output tokens on its first call.
  "claude-opus-5-5": {
    effort: "medium",
    maxTokens: 24_000,
    usdPerMillion: { input: 4, output: 20, cacheRead: 0.2 },
  },
  // Sonnet at high effort was cut off at 16,000 and used 23,901 at 32,000.
  "claude-sonnet-5-5": {
    effort: "high",
    maxTokens: 32_000,
    usdPerMillion: { input: 2, output: 10, cacheRead: 0.2 },
  },
} as const satisfies Record<
  string,
  {
    effort: ClaudeEffort;
    maxTokens: number;
    usdPerMillion: { input: number; output: number; cacheRead: number };
  }
>;
export type ClaudeWriter = keyof typeof CLAUDE_WRITERS;

/** The writer's effort: `NUAVE_REPORT_EFFORT` when set, else its row's. */
export function reportWriterEffort(writer: ClaudeWriter): ClaudeEffort {
  const configured = process.env.NUAVE_REPORT_EFFORT?.trim();
  if (!configured) return CLAUDE_WRITERS[writer].effort;
  if (!CLAUDE_EFFORTS.some((effort) => effort === configured)) {
    throw new Error(
      `NUAVE_REPORT_EFFORT must be one of: ${CLAUDE_EFFORTS.join(", ")}, or unset.`,
    );
  }
  return configured as ClaudeEffort;
}
