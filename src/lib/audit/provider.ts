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
