/**
 * Offline test helpers: canned provider responses, valid mock packs, and a
 * live-guard environment. Everything here is a TEST DOUBLE for machinery —
 * the canned question strings are never presented as real generation output.
 */
import { vi } from "vitest";
import type { BusinessBrief } from "../../../src/lib/audit/types";
import {
  AUDIT_MODEL,
} from "../../../src/lib/audit/telemetry";
import {
  deterministicIndonesianQuestion,
  minimizeIndonesianBrief,
  type MinimizedIndonesianBrief,
} from "../../../src/lib/audit/questions-id";
import {
  B_STRUCTURED_OUTPUT_NAME,
  LUNA_MODEL,
  OPENCODEGO_CREDENTIAL_VAR,
  LIVE_ENV_FLAG,
  type CoverageValue,
} from "../src/experiment-config";
import type { ExperimentBusiness } from "../src/loaders";

export const OPENCODEGO_BASE = "https://opencode.ai/zen/go/v1";

/** Sets the guarded live environment with a dummy credential. Restore with
 * vi.unstubAllEnvs() in afterEach. */
export function stubLiveEnv(): void {
  vi.stubEnv(LIVE_ENV_FLAG, "1");
  vi.stubEnv(OPENCODEGO_CREDENTIAL_VAR, "dummy-experiment-key");
  vi.stubEnv("OPENAI_API_KEY", "dummy-experiment-key");
  vi.stubEnv("OPENAI_BASE_URL", OPENCODEGO_BASE);
  vi.stubEnv("OPENAI_AUDIT_MODEL", LUNA_MODEL);
  vi.stubEnv("OPENAI_AUDIT_REASONING_EFFORT", "low");
  vi.stubEnv("NUAVE_QUESTION_PROVIDER", "opencodego");
  vi.stubEnv("EXPERIMENT_BDQ_TIMEOUT_MS", "5000");
}

export type OpenAIResponsesBody = {
  id: string;
  model: string;
  status: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  output: Array<{
    type: string;
    content: Array<{ type: string; parsed?: unknown; text?: string }>;
  }>;
};

export function responsesBody(parsed: unknown): OpenAIResponsesBody {
  return {
    id: "resp_test_001",
    model: AUDIT_MODEL,
    status: "completed",
    usage: { input_tokens: 120, output_tokens: 340, total_tokens: 460 },
    output: [
      {
        type: "message",
        content: [
          { type: "output_text", parsed, text: JSON.stringify(parsed) },
        ],
      },
    ],
  };
}

export function okFetch(body: unknown): typeof fetch {
  return async () =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
}

/** A canonical-valid ten-question mock pack for condition A (the deterministic
 * slot templates pass the canonical validator by construction). */
export function aPackTexts(
  business: ExperimentBusiness,
): { minimized: MinimizedIndonesianBrief; texts: string[] } {
  const minimized = minimizeIndonesianBrief(business as BusinessBrief);
  const texts = Array.from({ length: 10 }, (_, index) =>
    deterministicIndonesianQuestion(minimized, index + 1),
  );
  return { minimized, texts };
}

export type MockBQuestion = { text: string; coverage: CoverageValue };

/**
 * A valid condition-B mock pack for the given fixture: six unnamed and four
 * named requests with the required coverage mix. Texts are generic Indonesian
 * requests built around the fixture's brand/scope and a per-fixture noun.
 */
export function bPackFor(
  business: ExperimentBusiness,
): { pack: { questions: MockBQuestion[]; limitations: string[] } } {
  const brand = business.brand_name;
  const scope = business.entity_scope.trim() || business.market_context;
  const noun =
    business.category.toLowerCase().includes("laundry")
      ? "jasa laundry"
      : "tempat ngopi";
  const named = [
    {
      text: `${brand} di ${scope} recommended nggak?`,
      coverage: "evaluate_business" as const,
    },
    {
      text: `Apa bedanya ${brand} sama ${noun} lain di ${scope}?`,
      coverage: "compare_alternatives" as const,
    },
    {
      text: `Apa kekurangan ${brand} di ${scope}?`,
      coverage: "drawback_check" as const,
    },
    {
      text: `${brand} di ${scope} cocok nggak buat kebutuhan saya?`,
      coverage: "find_for_need" as const,
    },
  ];
  const unnamed = [
    {
      text: `Rekomendasi ${noun} enak di ${scope} dong?`,
      coverage: "discover_options" as const,
    },
    {
      text: `${noun} apa saja yang tersedia di ${scope}?`,
      coverage: "discover_options" as const,
    },
    {
      text: `Di ${scope} cari ${noun} yang bagus itu ke mana ya?`,
      coverage: "find_for_need" as const,
    },
    {
      text: `Bisa bandingin beberapa ${noun} di ${scope} dari kualitasnya?`,
      coverage: "compare_alternatives" as const,
    },
    {
      text: `${noun} mana di ${scope} yang sering bikin pelanggan kecewa?`,
      coverage: "drawback_check" as const,
    },
    {
      text: `Boleh minta saran ${noun} di ${scope} buat kebutuhan harian?`,
      coverage: "find_for_need" as const,
    },
  ];
  const questions = [...unnamed, ...named];
  if (questions.length !== 10) {
    throw new Error("mock B pack must contain exactly ten questions");
  }
  return {
    pack: {
      questions,
      limitations: ["Mock pack: fakta terbatas; kedekatan lokasi tidak diuji."],
    },
  };
}

export function bBody(business: ExperimentBusiness): OpenAIResponsesBody {
  const { pack } = bPackFor(business);
  return responsesBody(pack);
}

export const B_SCHEMA_NAME = B_STRUCTURED_OUTPUT_NAME;
