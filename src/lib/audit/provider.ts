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

// Provider selection for the audit pipeline.
//
// Default: OpenAI Responses API (paid, gpt-5.6-luna with hosted web search).
// Local free testing (no credit card):
//   NUAVE_PROVIDER=gemini -> Google Gemini free tier (web search grounding)
//   NUAVE_PROVIDER=groq   -> Groq (LLM) + Tavily (search), both free tiers
// All implementations share the same function signatures and Zod contracts, so
// flipping the env variable is the only change needed and there is no code path
// that mixes providers mid-run.

export type AuditProviderName = "openai" | "gemini" | "groq";

export function activeAuditProvider(): AuditProviderName {
  const value = process.env.NUAVE_PROVIDER?.trim().toLocaleLowerCase("en-US");
  if (value === "gemini") return "gemini";
  if (value === "groq") return "groq";
  if (value === undefined || value === "" || value === "openai")
    return "openai";
  throw new Error(
    `Unrecognized NUAVE_PROVIDER="${process.env.NUAVE_PROVIDER}". Valid values are "openai", "gemini", or "groq".`,
  );
}

/**
 * Provider selection for the PROTECTED LIVE path (the `/api/audit/*` routes
 * and the report pipeline). Fails closed to the founder-approved production
 * provider (OpenAI, gpt-5.6-luna — DECISION_LOG 2026-08-17). Gemini and Groq
 * remain available for testing only: a non-OpenAI `NUAVE_PROVIDER` is
 * rejected on the live path unless `NUAVE_LIVE_PROVIDER_TESTING=1` is
 * explicitly set (tests and local runner scripts only; never in production).
 */
export function liveAuditProvider(): AuditProviderName {
  const name = activeAuditProvider();
  if (name === "openai") return "openai";
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
    `NUAVE_PROVIDER="${name}" is testing-only; the protected live path fails closed to OpenAI (gpt-5.6-luna). Set NUAVE_LIVE_PROVIDER_TESTING=1 only for tests and local runners — it is always ignored when NODE_ENV=production.`,
  );
}

export const extractBusinessDraft =
  activeAuditProvider() === "gemini"
    ? geminiExtract
    : activeAuditProvider() === "groq"
      ? groqExtract
      : openaiExtract;
export const executeAuditPrompt =
  activeAuditProvider() === "gemini"
    ? geminiExecute
    : activeAuditProvider() === "groq"
      ? groqExecute
      : openaiExecute;
export const generateReportContent =
  activeAuditProvider() === "gemini"
    ? geminiGenerate
    : activeAuditProvider() === "groq"
      ? groqGenerate
      : openaiGenerate;

// Protected live path: fail-closed to OpenAI (gpt-5.6-luna) — DECISION_LOG
// 2026-08-17. These are the only bindings the API routes and the report
// pipeline may use; the env-selectable bindings above stay for tests and
// local runners only.
function resolveLive<K extends AuditProviderName>(live: K) {
  return live === "gemini"
    ? {
        extract: geminiExtract,
        execute: geminiExecute,
        generate: geminiGenerate,
      }
    : live === "groq"
      ? { extract: groqExtract, execute: groqExecute, generate: groqGenerate }
      : {
          extract: openaiExtract,
          execute: openaiExecute,
          generate: openaiGenerate,
        };
}
const live = resolveLive(liveAuditProvider());
export const liveExtractBusinessDraft = live.extract;
export const liveExecuteAuditPrompt = live.execute;
export const liveGenerateReportContent = live.generate;

/**
 * Fails fast, once, before any provider call (O-10, Phase 3 fix-round-2
 * adversarial review; R-13 "startup or deployment fails closed when the
 * intended production credential is missing"). Call this at the top of a
 * live route's handler. Without it, a missing `OPENAI_API_KEY` was only
 * discovered deep inside `executeAuditPrompt`'s per-attempt try/catch
 * (`openai.ts`'s `client()`), where a generic `Error` gets the same targeted
 * retry treatment as a transient provider failure — burning the full 1+2
 * retry policy across all ten questions (up to 30 guaranteed-failing
 * attempts) before the run ever surfaces the real, unrecoverable cause.
 */
/**
 * True when `fn` is a real provider binding rather than a caller-injected
 * test double. R3-5 (Phase 3 fix-round-3 adversarial review): the credential
 * guard was reachable only from the three HTTP handlers, and the live run has
 * never gone through them — `scripts/sozo/sozo-live-run.spec.ts` and
 * `scripts/sozo/report-rerun.ts` call `runAuditObservations` /
 * `createValidatedAuditReport` directly, so the 30-guaranteed-failing-attempt
 * burn on a missing `OPENAI_API_KEY` was still reachable there. The
 * orchestrator and the pipeline now assert too, but only when the work they
 * are about to do actually reaches a provider: unit tests that inject their
 * own `execute`/`generate` make no provider call and need no credential.
 */
export function isLiveProviderCall(fn: unknown): boolean {
  return (
    fn === openaiExecute ||
    fn === geminiExecute ||
    fn === groqExecute ||
    fn === openaiGenerate ||
    fn === geminiGenerate ||
    fn === groqGenerate
  );
}

export function assertLiveProviderCredentialsConfigured(): void {
  if (liveAuditProvider() === "openai" && !process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not configured on the Nuave server; the protected live path fails closed before making any provider call.",
    );
  }
}
