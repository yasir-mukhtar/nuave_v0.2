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
import { protectedObservationAttemptErrors } from "./production-observation-method";

export { OPENCODEGO_BASE_URL, OPENCODEGO_SYSTEM } from "./opencodego";

export type AuditProviderName =
  "openai" | "gemini" | "groq" | "openrouter" | "opencodego";

type LiveProviderBindings = {
  extract: typeof openaiExtract;
  execute: typeof openaiExecute;
  generate: typeof openaiGenerate;
};

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
  const corrected =
    name === "opencodego"
      ? { ...observation, system: OPENCODEGO_SYSTEM }
      : observation;

  // A transport-level success is not automatically an evaluable protected
  // observation. Convert apparent successes that fail the one reusable
  // positive-attempt invariant into technical failures so retry.ts can recover
  // under the same locked method.
  if (name === "opencodego" && corrected.run_status === "completed") {
    const errors = protectedObservationAttemptErrors(corrected);
    if (errors.length) {
      return {
        ...corrected,
        run_status: "failed" as const,
        raw_answer: "",
        failure_reason: `Protected observation attempt rejected: ${errors.join(" ")}`,
      };
    }
  }
  return corrected;
};

export const liveGenerateReportContent: LiveProviderBindings["generate"] =
  async (input, revision) => {
    const name = liveAuditProvider();
    assertLiveProviderCredentialsConfigured();
    return providerBindings(name).generate(input, revision);
  };

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
