export const OPENCODEGO_BASE_URL = "https://opencode.ai/zen/go/v1" as const;
export const OPENCODEGO_AUDIT_MODEL = "gpt-5.6-luna" as const;
export const OPENCODEGO_REASONING_EFFORT = "low" as const;

function normalizedBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * Establishes the complete founder-approved OpenCode Go production method
 * before the OpenAI-compatible adapter is allowed to see the OpenCode
 * credential. Conflicting non-empty configuration fails closed instead of
 * being silently rewritten.
 */
export function assertOpenCodeGoProductionMethodConfigured(): void {
  const apiKey = process.env.OPENCODEGO_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENCODEGO_API_KEY is not configured on the Nuave server; the protected live path fails closed before making any provider call.",
    );
  }

  const configuredBaseUrl = process.env.OPENAI_BASE_URL?.trim();
  if (
    configuredBaseUrl &&
    normalizedBaseUrl(configuredBaseUrl) !== OPENCODEGO_BASE_URL
  ) {
    throw new Error(
      `OPENAI_BASE_URL must be ${OPENCODEGO_BASE_URL} for the protected OpenCode Go live path; refusing to send OPENCODEGO_API_KEY to "${configuredBaseUrl}".`,
    );
  }

  const configuredModel = process.env.OPENAI_AUDIT_MODEL?.trim();
  if (configuredModel !== OPENCODEGO_AUDIT_MODEL) {
    throw new Error(
      `OPENAI_AUDIT_MODEL must be ${OPENCODEGO_AUDIT_MODEL} for the protected OpenCode Go live path.`,
    );
  }

  const configuredReasoning = process.env.OPENAI_AUDIT_REASONING_EFFORT?.trim();
  if (configuredReasoning !== OPENCODEGO_REASONING_EFFORT) {
    throw new Error(
      `OPENAI_AUDIT_REASONING_EFFORT must be ${OPENCODEGO_REASONING_EFFORT} for the protected OpenCode Go live path.`,
    );
  }

  // The OpenAI SDK reads these compatibility variables. Only establish them
  // after every production invariant above has passed.
  process.env.OPENAI_API_KEY = apiKey;
  process.env.OPENAI_BASE_URL = OPENCODEGO_BASE_URL;
}
