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

/** OpenCode Go's OpenAI-compatible Responses API base URL. */
export const OPENCODEGO_BASE_URL = "https://opencode.ai/zen/go/v1" as const;

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
  // R-13 (O-10, Phase 3 fix-round-2 adversarial review): a testing-only
  // provider "cannot be selected for a live protected run" — full stop. The
  // NODE_ENV check below closes the gap the review found: previously this
  // escape hatch trusted NUAVE_LIVE_PROVIDER_TESTING=1 alone, with nothing
  // stopping it from being set (by mistake or misconfiguration) in a real
  // production deployment.
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

const active = PROVIDER_BINDINGS[activeAuditProvider()];
export const extractBusinessDraft = active.extract;
export const executeAuditPrompt = active.execute;
export const generateReportContent = active.generate;

// Protected live path: fail-closed to OpenCode Go (gpt-5.6-luna) —
// DECISION_LOG 2026-08-21. These are the only bindings the API routes and the
// report pipeline may use; the env-selectable bindings above stay for tests and
// local runners only.
//
// They resolve LAZILY, on the call. Resolving at module load meant a
// deployment whose NUAVE_PROVIDER was a testing-only value could not be built
// at all: `next build` imports every route module to collect page data, so the
// fail-closed throw came out of module evaluation and failed the whole build
// ("Failed to collect page data for /api/audit/extract") instead of failing
// the one request that should be refused. Checking on the call is also
// strictly stronger than checking at import — the policy is re-evaluated for
// every live call rather than once per process.
function liveBindings(): LiveProviderBindings {
  return PROVIDER_BINDINGS[liveAuditProvider()];
}

// `async` is load-bearing, not decoration: these are typed as returning a
// promise, so a fail-closed rejection must arrive as a REJECTION. A plain
// arrow would throw synchronously out of `liveBindings()`, before any promise
// exists, and blow past a caller's `.catch()`.
export const liveExtractBusinessDraft: LiveProviderBindings["extract"] = async (
  input,
) => liveBindings().extract(input);
export const liveExecuteAuditPrompt: LiveProviderBindings["execute"] = async (
  input,
) => liveBindings().execute(input);
export const liveGenerateReportContent: LiveProviderBindings["generate"] =
  async (input, revision) => liveBindings().generate(input, revision);

/**
 * True when `fn` is a real provider binding rather than a caller-injected
 * test double. R3-5 (Phase 3 fix-round-3 adversarial review): the credential
 * guard was reachable only from the three HTTP handlers, and the live run has
 * never gone through them — `scripts/sozo/sozo-live-run.spec.ts` and
 * `scripts/sozo/report-rerun.ts` call `runAuditObservations` /
 * `createValidatedAuditReport` directly, so the 30-guaranteed-failing-attempt
 * burn on a missing provider credential was still reachable there. The
 * orchestrator and the pipeline now assert too, but only when the work they
 * are about to do actually reaches a provider: unit tests that inject their
 * own `execute`/`generate` make no provider call and need no credential.
 */
export function isLiveProviderCall(fn: unknown): boolean {
  // The lazy live wrappers must match too: `run/route.ts` and
  // `report-pipeline.ts` hand THOSE to the orchestrator, so omitting them
  // would silently skip the credential assert on the one path that most needs
  // it.
  if (fn === liveExecuteAuditPrompt || fn === liveGenerateReportContent) {
    return true;
  }
  return PROVIDER_NAMES.some(
    (name) =>
      fn === PROVIDER_BINDINGS[name].execute ||
      fn === PROVIDER_BINDINGS[name].generate,
  );
}

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

/**
 * OpenCode Go implements the Responses API behind the OpenAI SDK. The SDK
 * itself still reads `OPENAI_API_KEY`, while Nuave deliberately names the real
 * server credential `OPENCODEGO_API_KEY`. Bridge those variables only after
 * the live provider has been selected and its own credential has passed the
 * fail-closed check. The deploy workflow also writes the alias at build time
 * because OpenNext inlines server env from `.env.production.local`.
 */
function configureOpenCodeGoCompatibility(apiKey: string): void {
  process.env.OPENAI_API_KEY = apiKey;
  if (!process.env.OPENAI_BASE_URL?.trim()) {
    process.env.OPENAI_BASE_URL = OPENCODEGO_BASE_URL;
  }
}

export function assertLiveProviderCredentialsConfigured(): void {
  const name = liveAuditProvider();
  const variable = PROVIDER_CREDENTIAL_ENV[name];
  const apiKey = process.env[variable]?.trim();
  if (!apiKey) {
    throw new Error(
      `${variable} is not configured on the Nuave server; the protected live path fails closed before making any provider call.`,
    );
  }
  if (name === "opencodego") {
    configureOpenCodeGoCompatibility(apiKey);
  }
}
