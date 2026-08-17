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
  if (process.env.NUAVE_LIVE_PROVIDER_TESTING === "1") return name;
  throw new Error(
    `NUAVE_PROVIDER="${name}" is testing-only; the protected live path fails closed to OpenAI (gpt-5.6-luna). Set NUAVE_LIVE_PROVIDER_TESTING=1 only for tests and local runners.`,
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
