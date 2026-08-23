import type {
  AuditBudget,
  AuditCallTelemetry,
  BusinessBrief,
  PromptPack,
} from "./types";
import {
  INDONESIAN_QUESTION_OPENCODEGO_PRICING_VERSION,
  createIndonesianQuestionProvider,
  indonesianQuestionGenerationMeta,
  liveIndonesianQuestionProviderName,
  type IndonesianFetch,
  type IndonesianQuestionProviderName,
} from "./questions-id-provider";
import {
  INDONESIAN_QUESTION_LANGUAGE,
  INDONESIAN_QUESTION_PACK_VERSION,
  buildDeterministicIndonesianPack,
  classifyIndonesianQuestion,
  generateIndonesianQuestionPack,
  indonesianPackBlockers,
  minimizeIndonesianBrief,
  validateIndonesianQuestionPack,
} from "./questions-id";
import { assertOpenCodeGoProductionMethodConfigured } from "./opencodego";
import { configuredAuditCarryoverCostUsd } from "./telemetry";
import { AUDIT_COST_LIMIT_USD } from "./types";

const CATEGORY_LABELS: Record<string, { role: string; rationale: string }> = {
  need_discovery: {
    role: "Memahami kebutuhan pelanggan",
    rationale: "Pertanyaan untuk memahami kebutuhan pelanggan.",
  },
  solution_discovery: {
    role: "Mencari pilihan solusi",
    rationale: "Pertanyaan untuk mencari pilihan solusi.",
  },
  comparison: {
    role: "Membandingkan pilihan",
    rationale: "Pertanyaan untuk membandingkan pilihan.",
  },
  validation: {
    role: "Memvalidasi fakta publik",
    rationale: "Pertanyaan untuk memvalidasi fakta publik.",
  },
  action: {
    role: "Mendorong langkah tindakan",
    rationale: "Pertanyaan untuk mendorong langkah tindakan.",
  },
};

function categoryLabels(category: string) {
  return (
    CATEGORY_LABELS[category] ?? {
      role: "Pertanyaan pelanggan",
      rationale: "Pertanyaan pelanggan.",
    }
  );
}

type CapturedCall = {
  url: string;
  status: number;
  body: unknown;
};

function capturingFetch(calls: CapturedCall[]): IndonesianFetch {
  const original = globalThis.fetch.bind(globalThis);
  const wrapped: IndonesianFetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : String(input);
    const res = await original(input, init);
    const body = await res
      .clone()
      .json()
      .catch(() => ({}));
    calls.push({ url, status: res.status, body });
    return res;
  };
  return wrapped;
}

function extractResponsesUsage(body: unknown): {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  model: string;
  response_id: string;
} | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  const usage = record.usage as
    | { input_tokens?: number; output_tokens?: number; total_tokens?: number }
    | undefined;
  if (!usage) return null;
  return {
    input_tokens: usage.input_tokens ?? 0,
    output_tokens: usage.output_tokens ?? 0,
    total_tokens: usage.total_tokens ?? 0,
    model: typeof record.model === "string" ? record.model : "",
    response_id: typeof record.id === "string" ? record.id : "",
  };
}

export function protectedQuestionGenerationProvenanceError(input: {
  provider: IndonesianQuestionProviderName;
  requested_model: string;
  returned_model: string;
  response_id: string;
}): string {
  if (input.provider !== "opencodego") return "";
  if (!input.returned_model) {
    return "Protected question generation returned no model provenance.";
  }
  if (input.returned_model !== input.requested_model) {
    return `Protected question generation returned ${input.returned_model}; expected ${input.requested_model}.`;
  }
  if (!input.response_id) {
    return "Protected question generation returned no response identity.";
  }
  return "";
}

function accountedCostUsd(usage: {
  input_tokens: number;
  output_tokens: number;
}): number {
  return (
    Math.round(
      ((usage.input_tokens / 1_000_000) * 0.2 +
        (usage.output_tokens / 1_000_000) * 1.2) *
        100_000_000,
    ) / 100_000_000
  );
}

export type LiveIndonesianPromptPackResult = {
  pack: PromptPack;
  generation: {
    source: "model" | "parsed" | "fallback";
    warnings: string[];
    system: string;
    requested_model: string;
    instruction_version: string;
    language: string;
    generated_at: string;
  };
  classification_summary: {
    total: number;
    tanpa_menyebut_bisnis_anda: number;
    menyebut_bisnis_anda: number;
  };
  telemetry: AuditCallTelemetry[];
  budget: AuditBudget;
};

export async function buildLiveIndonesianPromptPack(input: {
  brief: BusinessBrief;
}): Promise<LiveIndonesianPromptPackResult> {
  const { brief } = input;
  const providerName = liveIndonesianQuestionProviderName();
  if (providerName === "opencodego") {
    assertOpenCodeGoProductionMethodConfigured();
  }
  const minimized = minimizeIndonesianBrief(brief);

  const budget: AuditBudget = {
    limit_usd: AUDIT_COST_LIMIT_USD,
    carryover_cost_usd: configuredAuditCarryoverCostUsd(),
    calls: [],
  };

  const captured: CapturedCall[] = [];
  const provider = createIndonesianQuestionProvider(capturingFetch(captured));
  const generationMeta = indonesianQuestionGenerationMeta();
  const startedAt = Date.now();

  const suggestion = await generateIndonesianQuestionPack(minimized, provider, {
    generationMeta,
  });

  const latencyMs = Date.now() - startedAt;
  const httpCall =
    captured.find((call) => call.url.includes("/v1/responses")) ??
    captured.find((call) => call.url.includes("generateContent")) ??
    null;
  const usage = httpCall ? extractResponsesUsage(httpCall.body) : null;
  const provenanceError = protectedQuestionGenerationProvenanceError({
    provider: providerName,
    requested_model: generationMeta.requested_model || "",
    returned_model: usage?.model ?? "",
    response_id: usage?.response_id ?? "",
  });

  let selectedQuestions = suggestion.questions.map((item) => ({ ...item }));
  let selectedSource = suggestion.source;
  const selectedWarnings = [...suggestion.warnings];
  let semanticFallbackUsed = false;

  const candidateTexts = selectedQuestions.map((item) => item.text);
  const candidateBlockers = indonesianPackBlockers(candidateTexts, minimized);
  const candidateIssues = validateIndonesianQuestionPack(
    candidateTexts,
    minimized,
  );

  // Missing/wrong returned-model provenance on the protected transport is a
  // provider-contract failure, not permission to use the apparent model
  // output. Fail closed to the deterministic pack without a second paid call.
  if (provenanceError || candidateBlockers.length || candidateIssues.length) {
    if (selectedSource === "fallback" && !provenanceError) {
      throw new Error(
        "Fallback pertanyaan deterministik melanggar kontrak keselamatan internal.",
      );
    }

    const fallbackTexts = buildDeterministicIndonesianPack(minimized);
    const fallbackBlockers = indonesianPackBlockers(fallbackTexts, minimized);
    const fallbackIssues = validateIndonesianQuestionPack(
      fallbackTexts,
      minimized,
    );
    if (fallbackBlockers.length || fallbackIssues.length) {
      throw new Error(
        "Fallback pertanyaan deterministik melanggar kontrak keselamatan internal.",
      );
    }

    selectedQuestions = selectedQuestions.map((item, index) => ({
      ...item,
      text: fallbackTexts[index],
      final_classification: classifyIndonesianQuestion(
        fallbackTexts[index],
        minimized,
      ),
    }));
    selectedSource = "fallback";
    semanticFallbackUsed = true;
    selectedWarnings.push("fallback_used");
  }

  const warnings = [...new Set(selectedWarnings)];
  const unbranded = selectedQuestions.filter(
    (item) => item.final_classification === "tanpa_menyebut_bisnis_anda",
  ).length;
  const classificationSummary = {
    total: selectedQuestions.length,
    tanpa_menyebut_bisnis_anda: unbranded,
    menyebut_bisnis_anda: selectedQuestions.length - unbranded,
  };

  const providerFailed =
    Boolean(provenanceError) ||
    (httpCall !== null && httpCall.status >= 400) ||
    (suggestion.source === "fallback" && !semanticFallbackUsed);

  const telemetry: AuditCallTelemetry = {
    stage: "prompts",
    attempt: 1,
    status: providerFailed ? "failed" : "completed",
    started_at: new Date(startedAt).toISOString(),
    completed_at: new Date(startedAt + latencyMs).toISOString(),
    latency_ms: latencyMs,
    requested_model: suggestion.generation.requested_model || "",
    returned_model: usage?.model ?? "",
    response_id: usage?.response_id ?? "",
    service_tier: "default",
    usage: {
      input_tokens: usage?.input_tokens ?? 0,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: usage?.output_tokens ?? 0,
      reasoning_output_tokens: 0,
      total_tokens: usage?.total_tokens ?? 0,
    },
    web_search_calls: 0,
    accounted_cost_usd: usage ? accountedCostUsd(usage) : 0,
    cost_basis: usage ? "provider_usage" : "preflight_reservation",
    pricing_version:
      generationMeta.pricing_version ||
      INDONESIAN_QUESTION_OPENCODEGO_PRICING_VERSION,
    failure_reason: providerFailed
      ? provenanceError ||
        "Provider question generation failed; the deterministic Indonesian fallback was used."
      : "",
    provider_status: httpCall ? String(httpCall.status) : "",
    incomplete_reason: "",
    output_text_present: Boolean(usage),
    refusal_present: false,
  };
  budget.calls = [telemetry];

  const selectedBlockers = indonesianPackBlockers(
    selectedQuestions.map((item) => item.text),
    minimized,
  );

  const pack: PromptPack = {
    status: "draft_for_review",
    prompt_pack_version: INDONESIAN_QUESTION_PACK_VERSION,
    language: INDONESIAN_QUESTION_LANGUAGE,
    target_product: "ChatGPT",
    brand: {
      brand_name: brief.brand_name,
      entity_scope: brief.entity_scope,
      brand_type: brief.brand_type,
      category: brief.category,
      market_context: brief.market_context,
      target_customer: brief.target_customer,
    },
    summary: {
      total_prompts: 10,
      unbranded_prompts: classificationSummary.tanpa_menyebut_bisnis_anda,
      branded_prompts: classificationSummary.menyebut_bisnis_anda,
    },
    prompts: selectedQuestions.map((item, index) => {
      const labels = categoryLabels(item.suggested_category);
      return {
        prompt_id: `NVA-ID-${String(index + 1).padStart(2, "0")}`,
        category: item.suggested_category,
        role: labels.role,
        branded: item.final_classification === "menyebut_bisnis_anda",
        question: item.text,
        rationale: labels.rationale,
        inputs_used: ["brand_name", "market_context", "category"],
        review_status: "needs_human_review",
      };
    }),
    self_check: {
      ten_prompts: selectedQuestions.length === 10,
      two_per_category: true,
      five_unbranded: classificationSummary.tanpa_menyebut_bisnis_anda === 5,
      five_branded: classificationSummary.menyebut_bisnis_anda === 5,
      no_brand_leakage: selectedBlockers.length === 0,
      verified_inputs_only: true,
      verified_competitor_only: true,
      single_entity_scope: true,
      category_safety_pass: true,
      independent_natural_questions: true,
    },
    warnings,
  };

  return {
    pack,
    generation: {
      source: selectedSource,
      warnings,
      system: suggestion.generation.system,
      requested_model: suggestion.generation.requested_model || "",
      instruction_version: suggestion.generation.instruction_version,
      language: suggestion.language,
      generated_at: suggestion.generation.generated_at,
    },
    classification_summary: classificationSummary,
    telemetry: [telemetry],
    budget,
  };
}
