import {
  extractBusinessDraft as openaiExtract,
  executeAuditPrompt as openaiExecute,
  generateReportContent as openaiGenerate,
} from "./openai";
import {
  extractBusinessDraft as geminiExtract,
  executeAuditPrompt as geminiExecute,
  generateReportContent as geminiGenerate,
} from "./gemini";
import {
  extractBusinessDraft as groqExtract,
  executeAuditPrompt as groqExecute,
  generateReportContent as groqGenerate,
} from "./groq";
import {
  extractBusinessDraft as openrouterExtract,
  executeAuditPrompt as openrouterExecute,
  generateReportContent as openrouterGenerate,
} from "./openrouter";
import {
  assertOpenCodeGoProductionMethodConfigured,
  OPENCODEGO_SYSTEM,
} from "./opencodego";

export { OPENCODEGO_BASE_URL, OPENCODEGO_SYSTEM } from "./opencodego";

// Provider selection for the audit pipeline.
//
// Production lock: OpenCode Go's OpenAI-compatible Responses API serving
// gpt-5.6-luna with web search (founder decision 2026-08-21).
// Local/testing alternatives:
//   NUAVE_PROVIDER=openai -> direct OpenAI Responses API
//   NUAVE_PROVIDER=gemini -> Google Gemini free tier (web search grounding)
//   NUAVE_PROVIDER=groq   -> Groq (LLM) + Tavily (search), both free tiers
//   NUAVE_PROVIDER=openrouter -> OpenRouter `:free` models, NO web search
//                            (pipeline testing only; observations are
//                            ungrounded — see the header of openrouter.ts)
// All implementations share the same function signatures and Zod contracts, so
// flipping the env variable is the only change needed and there is no code path
// that mixes providers mid-run.

export type AuditProviderName =
  "openai" | "gemini" | "groq" | "openrouter" | "opencodego";

/**
 * The three audit-stage functions for one provider, typed against the OpenAI
 * module because that is the contract every provider implements. Declaring it
 * (rather than the previous `unknown`) makes the `satisfies` below a real
 * check: a provider whose signature drifts from the shared contract now fails
 * to compile instead of failing at runtime on the live path.
 */
type LiveProviderBindings = {
  extract: typeof openaiExtract;
  execute: typeof openaiExecute;
  generate: typeof openaiGenerate;
};

/**
 * The three audit-stage functions for one provider. Every provider module
 * implements the same signatures and Zod contracts, so a provider is a whole
 * row of this table and no code path can mix providers mid-run.
 */
const PROVIDER_BINDINGS = {
  openai: {
    extract: openaiExtract,
    execute: openaiExecute,
    generate: openaiGenerate,
  },
  gemini: {
    extract: geminiExtract,
    execute: geminiExecute,
    generate: geminiGenerate,
  },
  groq: { extract: groqExtract, execute: groqExecute, generate: groqGenerate },
  openrouter: {
    extract: openrouterExtract,
    execute: openrouterExecute,
    generate: openrouterGenerate,
  },
  opencodego: {
    extract: openaiExtract,
    execute: openaiExecute,
    generate: openaiGenerate,
  },
} as const satisfies Record<AuditProviderName, LiveProviderBindings>;

const PROVIDER_NAMES = Object.keys(
  PROVIDER_BINDINGS,
) as readonly AuditProviderName[];

function providerBindings(name: AuditProviderName): LiveProviderBindings {
  return PROVIDER_BINDINGS[name];
}

export function activeAuditProvider(): AuditProviderName {
  const value = process.env.NUAVE_PROVIDER?.trim().toLocaleLowerCase("en-US");
  if (value === undefined || value === "") return "openai";
  const match = PROVIDER_NAMES.find((name) => name === value);
  if (match) return match;
  throw new Error(
    `Unrecognized NUAVE_PROVIDER="${process.env.NUAVE_PROVIDER}". Valid values are ${PROVIDER_NAMES.map((name) => `"${name}"`).join(", ")}.`,
  );
}

/**
 * Provider selection for the protected live path (the `/api/audit/*` routes
 * and the report pipeline). Fails closed to the founder-approved production
 * transport: OpenCode Go serving GPT-5.6 Luna (DECISION_LOG 2026-08-21).
 * Direct OpenAI, Gemini, Groq and OpenRouter remain available for tests and
 * local runners only; they require `NUAVE_LIVE_PROVIDER_TESTING=1` and are
 * always rejected when NODE_ENV=production.
 */
export function liveAuditProvider(): AuditProviderName {
  const name = activeAuditProvider();
  if (name === "opencodego") return "opencodego";
  if (
    process.env.NUAVE_LIVE_PROVIDER_TESTING === "1" &&
    process.env.NODE_ENV !== "production"
  ) {
    return name;
  }
  throw new Error(
    `NUAVE_PROVIDER="${name}" is testing-only; the protected live path fails closed to OpenCode Go (gpt-5.6-luna). Set NUAVE_LIVE_PROVIDER_TESTING=1 only for tests and local runners — it is always ignored when NODE_ENV=production.`,
  );
}

const active = providerBindings(activeAuditProvider());
export const extractBusinessDraft = active.extract;
export const executeAuditPrompt = active.execute;
export const generateReportContent = active.generate;

/**
 * The credential each provider's audit-stage calls read. Keeping this beside
 * PROVIDER_BINDINGS means a new provider cannot be added without deciding what
 * its missing-key failure looks like — the whole point of the guard.
 */
const PROVIDER_CREDENTIAL_ENV: Record<AuditProviderName, string> = {
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  opencodego: "OPENCODEGO_API_KEY",
};

export function assertLiveProviderCredentialsConfigured(): void {
  const name = liveAuditProvider();
  if (name === "opencodego") {
    assertOpenCodeGoProductionMethodConfigured();
    return;
  }

  const variable = PROVIDER_CREDENTIAL_ENV[name];
  const apiKey = process.env[variable]?.trim();
  if (!apiKey) {
    throw new Error(
      `${variable} is not configured on the Nuave server; the protected live path fails closed before making any provider call.`,
    );
  }
}

// Protected live path: fail-closed to OpenCode Go (gpt-5.6-luna) —
// DECISION_LOG 2026-08-21. These are the only bindings the API routes and the
// report pipeline may use; the env-selectable bindings above stay for tests and
// local runners only. They resolve lazily so `next build` can import route
// modules without executing the provider lock.
//
// Every wrapper also performs the credential assertion itself. Route-level and
// orchestrator guards remain intentionally redundant: no future call site can
// invoke a protected provider wrapper without first establishing the complete
// OpenCode Go production method and SDK compatibility alias.
export const liveExtractBusinessDraft: LiveProviderBindings["extract"] = async (
  input,
) => {
  const name = liveAuditProvider();
  assertLiveProviderCredentialsConfigured();
  return providerBindings(name).extract(input);
};

export const liveExecuteAuditPrompt: LiveProviderBindings["execute"] = async (
  input,
) => {
  const name = liveAuditProvider();
  assertLiveProviderCredentialsConfigured();
  const observation = await providerBindings(name).execute(input);
  // The OpenAI module is intentionally reused as the protocol adapter for
  // OpenCode Go. Correct its transport provenance at the protected boundary so
  // evidence never claims a direct OpenAI API call when OpenCode Go carried it.
  return name === "opencodego"
    ? { ...observation, system: OPENCODEGO_SYSTEM }
    : observation;
};

export const liveGenerateReportContent: LiveProviderBindings["generate"] =
  async (input, revision) => {
    const name = liveAuditProvider();
    assertLiveProviderCredentialsConfigured();
    return providerBindings(name).generate(input, revision);
  };

/**
 * True when `fn` is a real provider binding rather than a caller-injected
 * test double. The orchestrator and report pipeline use this to assert live
 * credentials before provider work while unit tests with injected doubles stay
 * offline.
 */
export function isLiveProviderCall(fn: unknown): boolean {
  if (fn === liveExecuteAuditPrompt || fn === liveGenerateReportContent) {
    return true;
  }
  return PROVIDER_NAMES.some(
    (name) =>
      fn === providerBindings(name).execute ||
      fn === providerBindings(name).generate,
  );
}
