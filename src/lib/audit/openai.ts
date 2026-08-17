import { createHash } from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseCreateParamsWithTools } from "openai/lib/ResponsesParser";
import type { Response } from "openai/resources/responses/responses";
import {
  SOURCE_TITLE_MAX_LENGTH,
  extractionDraftSchema,
  reportSynthesisSchema,
  type AuditObservation,
  type AuditBudget,
  type AuditCallTelemetry,
  type AuditPrompt,
  type BusinessBrief,
  type ExtractionDraft,
  type ReportContent,
  type ReportSynthesis,
  type Source,
} from "./types";
import {
  DEFAULT_OBSERVATION_INSTRUCTION_VERSION,
  OBSERVATION_INSTRUCTION_VERSION_LEGACY_EN,
  OBSERVATION_INSTRUCTION_VERSION_NEUTRAL_ID,
  REPORT_SYNTHESIS_PROMPT_VERSION,
  assembleReportContent,
  type ObservationInstructionVersion,
} from "./contracts";
import { reportWritingInstructions } from "./report-language";
import {
  AUDIT_CALL_LIMITS,
  AUDIT_MODEL,
  AuditCallExecutionError,
  completedCallTelemetry,
  failedCallTelemetry,
  providerCompletionDiagnostics,
  reserveAuditCall,
  structuredOutputFailureDetail,
} from "./telemetry";

const DEFAULT_MODEL = AUDIT_MODEL;
const REASONING_EFFORTS = [
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;

type ReasoningEffort = (typeof REASONING_EFFORTS)[number];
type CostControlledResponseParams = ResponseCreateParamsWithTools & {
  max_tool_calls?: number;
};

function client() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured on the Nuave server.");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function auditModel() {
  return process.env.OPENAI_AUDIT_MODEL?.trim() || DEFAULT_MODEL;
}

export function auditReasoningEffort(fallback: ReasoningEffort) {
  const configured = process.env.OPENAI_AUDIT_REASONING_EFFORT?.trim();
  if (!configured) return fallback;
  if (!REASONING_EFFORTS.some((effort) => effort === configured)) {
    throw new Error(
      `OPENAI_AUDIT_REASONING_EFFORT must be one of: ${REASONING_EFFORTS.join(", ")}.`,
    );
  }
  return configured as ReasoningEffort;
}

export function auditObservationSearchTool() {
  return {
    type: "web_search" as const,
    search_context_size: "medium" as const,
  };
}

export function hashSafetyIdentifier(value: string) {
  return createHash("sha256")
    .update(`nuave:${value}`)
    .digest("hex")
    .slice(0, 64);
}

function hostnameFromUrl(value: string) {
  return new URL(value).hostname.replace(/^www\./, "");
}

/**
 * Versioned neutral observation instruction texts (Spec 003 R-14). The live
 * observation request carries exactly one of these as its developer
 * instruction, the exact locked question, and verified location context only
 * when the question itself does not already carry it — never the business
 * brief (R-15).
 */
export const OBSERVATION_INSTRUCTION_TEXTS: Record<
  ObservationInstructionVersion,
  string
> = {
  [OBSERVATION_INSTRUCTION_VERSION_LEGACY_EN]: [
    "Answer the user's question naturally in English as a standalone customer query.",
    "Use live web search. Do not discuss this audit, prompt engineering, scoring, or Nuave.",
    "Do not favor the audited brand. State uncertainty when public information is incomplete or conflicting.",
  ].join("\n"),
  [OBSERVATION_INSTRUCTION_VERSION_NEUTRAL_ID]: [
    "Jawab pertanyaan pengguna secara alami dalam Bahasa Indonesia.",
    "Gunakan pencarian web.",
    "Jangan membahas Nuave, audit, skor, metodologi, atau cara pertanyaan dibuat.",
    "Jangan mengutamakan bisnis tertentu.",
    "Jika informasi publik tidak lengkap atau berbeda, jelaskan ketidakpastiannya.",
  ].join("\n"),
};

export function observationInstructionText(
  version: ObservationInstructionVersion,
) {
  return OBSERVATION_INSTRUCTION_TEXTS[version];
}

export function structuredOutputOrThrow<T>(
  value: T | null,
  label: string,
  response: Pick<Response, "status" | "incomplete_details" | "output">,
): T {
  if (!value) {
    const detail = structuredOutputFailureDetail(
      providerCompletionDiagnostics(response),
    );
    throw new Error(
      `${label} did not return usable structured data.${detail ? ` ${detail}` : ""}`,
    );
  }
  return value;
}

type ExtractionResponseResult = Pick<
  Response,
  "status" | "incomplete_details" | "output"
> & {
  output_parsed: ExtractionDraft | null;
};

type ExtractionFallbackInput = Pick<
  Parameters<typeof extractBusinessDraft>[0],
  "website_url" | "brand_name" | "market_context" | "category"
>;

function missingExtractionWarning(response: ExtractionResponseResult) {
  if (response.incomplete_details?.reason === "max_output_tokens") {
    return "Automatic website extraction reached its output limit before it produced a structured draft.";
  }
  if (response.incomplete_details?.reason === "content_filter") {
    return "Automatic website extraction stopped before it produced a structured draft.";
  }
  const refused = response.output.some(
    (item) =>
      item.type === "message" &&
      item.content.some((content) => content.type === "refusal"),
  );
  if (refused) {
    return "Automatic website extraction did not produce a structured draft.";
  }
  if (response.status && response.status !== "completed") {
    return `Automatic website extraction ended with provider status ${response.status} before it produced a structured draft.`;
  }
  return "Automatic website extraction completed without a usable structured draft.";
}

export function extractionDraftOrManualFallback(
  input: ExtractionFallbackInput,
  response: ExtractionResponseResult,
): ExtractionDraft {
  if (response.output_parsed) return response.output_parsed;

  // The private audit allows one extraction call. Keep the paid telemetry, but
  // discard unparsed content and let the founder finish the brief manually.
  return {
    brand_name: input.brand_name,
    entity_scope: "",
    brand_type: "",
    category: input.category,
    market_context: input.market_context,
    target_customer: "",
    official_sources: [input.website_url],
    verified_offerings: [],
    verified_customer_needs: [],
    verified_decision_criteria: [],
    brand_name_variants: [],
    priority_offering: "",
    conversion_action: "",
    customer_supplied_facts: [],
    known_accuracy_questions: [],
    usp: "",
    regulated_category_notes: "",
    evidence: [],
    warnings: [
      missingExtractionWarning(response),
      "No extracted business facts were retained. Complete and verify every required field manually using the official website before approving the brief.",
    ],
  };
}

export function normalizeSourceTitle(title: string | undefined, url: string) {
  const value = title?.trim() || url;
  if (value.length <= SOURCE_TITLE_MAX_LENGTH) return value;

  let shortened = value.slice(0, SOURCE_TITLE_MAX_LENGTH - 1).trimEnd();
  const finalCodeUnit = shortened.charCodeAt(shortened.length - 1);
  if (finalCodeUnit >= 0xd800 && finalCodeUnit <= 0xdbff) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}…`;
}

export async function extractBusinessDraft(input: {
  website_url: string;
  brand_name: string;
  market_context: string;
  category: string;
  safety_identifier: string;
  budget: AuditBudget;
}): Promise<{
  draft: ExtractionDraft;
  returned_model: string;
  response_id: string;
  telemetry: AuditCallTelemetry[];
}> {
  const websiteDomain = hostnameFromUrl(input.website_url);
  const requestedModel = auditModel();
  const request = {
    model: requestedModel,
    reasoning: { effort: auditReasoningEffort("low") },
    store: false,
    service_tier: "default" as const,
    max_output_tokens: AUDIT_CALL_LIMITS.extract.max_output_tokens,
    max_tool_calls: AUDIT_CALL_LIMITS.extract.max_tool_calls,
    safety_identifier: hashSafetyIdentifier(input.safety_identifier),
    tools: [
      {
        type: "web_search" as const,
        filters: { allowed_domains: [websiteDomain] },
        search_context_size: "medium" as const,
      },
    ],
    tool_choice: "required" as const,
    include: ["web_search_call.action.sources"] as const,
    text: {
      format: zodTextFormat(extractionDraftSchema, "nuave_business_draft"),
      verbosity: "low" as const,
    },
    input: [
      {
        role: "developer" as const,
        content: [
          "Extract a review draft using only public facts supported by the supplied official website.",
          "Do not infer praise, reputation, quality, target demographics, outcomes, or competitor facts.",
          "Write all explanatory text in clear, natural English. Preserve official brand names, product names, and place names as published.",
          "Leave unsupported scalar fields empty and unsupported arrays empty.",
          "For each material extracted value add an evidence record with the exact field, value, source URL, and a short note.",
          "The values are suggestions for human confirmation, not verified facts.",
        ].join("\n"),
      },
      {
        role: "user" as const,
        content: JSON.stringify({
          official_website: input.website_url,
          supplied_brand_name: input.brand_name,
          supplied_market_context: input.market_context,
          supplied_category: input.category,
        }),
      },
    ],
  } satisfies CostControlledResponseParams;
  const reservedCost = reserveAuditCall({
    budget: input.budget,
    stage: "extract",
    request,
    requested_model: requestedModel,
    has_web_search: true,
  });
  const startedAt = Date.now();
  let telemetry: AuditCallTelemetry | undefined;
  try {
    const response = await client().responses.parse(request);
    telemetry = completedCallTelemetry({
      stage: "extract",
      started_at_ms: startedAt,
      requested_model: requestedModel,
      response,
    });
    return {
      draft: extractionDraftOrManualFallback(input, response),
      returned_model: response.model,
      response_id: response.id,
      telemetry: [telemetry],
    };
  } catch (error) {
    const retained =
      telemetry ??
      failedCallTelemetry({
        stage: "extract",
        started_at_ms: startedAt,
        requested_model: requestedModel,
        reserved_cost_usd: reservedCost,
        error,
      });
    throw new AuditCallExecutionError(
      error instanceof Error ? error.message : "Website extraction failed.",
      [retained],
    );
  }
}

// Question generation makes no provider call. See `questions.ts` for the
// deterministic pack built from the verified brief and the fixed matrix.

function collectSources(response: Response): Source[] {
  const found = new Map<string, Source>();
  for (const item of response.output) {
    if (item.type === "message") {
      for (const content of item.content) {
        if (content.type !== "output_text") continue;
        for (const annotation of content.annotations) {
          if (annotation.type !== "url_citation") continue;
          found.set(annotation.url, {
            url: annotation.url,
            title: normalizeSourceTitle(annotation.title, annotation.url),
          });
        }
      }
    }
    if (item.type === "web_search_call" && item.action.type === "search") {
      for (const source of item.action.sources ?? []) {
        if (source.type !== "url") continue;
        found.set(source.url, {
          url: source.url,
          title: normalizeSourceTitle(undefined, source.url),
        });
      }
    }
  }
  return [...found.values()];
}

export async function executeAuditPrompt(input: {
  prompt: AuditPrompt;
  brief: BusinessBrief;
  safety_identifier: string;
  budget: AuditBudget;
}): Promise<AuditObservation> {
  const requestedModel = auditModel();
  const request = {
    model: requestedModel,
    reasoning: { effort: auditReasoningEffort("low") },
    store: false,
    service_tier: "default" as const,
    max_output_tokens: AUDIT_CALL_LIMITS.observation.max_output_tokens,
    max_tool_calls: AUDIT_CALL_LIMITS.observation.max_tool_calls,
    safety_identifier: hashSafetyIdentifier(input.safety_identifier),
    tools: [auditObservationSearchTool()],
    tool_choice: "required" as const,
    include: ["web_search_call.action.sources" as const],
    text: { verbosity: "medium" as const },
    input: [
      {
        role: "developer" as const,
        content: observationInstructionText(
          DEFAULT_OBSERVATION_INSTRUCTION_VERSION,
        ),
      },
      { role: "user" as const, content: input.prompt.question },
    ],
  } satisfies CostControlledResponseParams;
  const reservedCost = reserveAuditCall({
    budget: input.budget,
    stage: "observation",
    request,
    requested_model: requestedModel,
    has_web_search: true,
  });
  const startedAt = Date.now();
  try {
    const response = await client().responses.create(request);
    return {
      prompt_id: input.prompt.prompt_id,
      category: input.prompt.category,
      branded: input.prompt.branded,
      question: input.prompt.question,
      instruction_version: DEFAULT_OBSERVATION_INSTRUCTION_VERSION,
      system: "OpenAI Responses API",
      requested_model: requestedModel,
      returned_model: response.model,
      response_id: response.id,
      observed_at: new Date(response.created_at * 1_000).toISOString(),
      raw_answer: response.output_text,
      sources: collectSources(response),
      run_status: "completed",
      failure_reason: "",
      telemetry: [
        completedCallTelemetry({
          stage: "observation",
          started_at_ms: startedAt,
          requested_model: requestedModel,
          response,
        }),
      ],
    };
  } catch (error) {
    const telemetry = failedCallTelemetry({
      stage: "observation",
      started_at_ms: startedAt,
      requested_model: requestedModel,
      reserved_cost_usd: reservedCost,
      error,
    });
    return {
      prompt_id: input.prompt.prompt_id,
      category: input.prompt.category,
      branded: input.prompt.branded,
      question: input.prompt.question,
      instruction_version: DEFAULT_OBSERVATION_INSTRUCTION_VERSION,
      system: "OpenAI Responses API",
      requested_model: requestedModel,
      returned_model: "",
      response_id: "",
      observed_at: new Date().toISOString(),
      raw_answer: "",
      sources: [],
      run_status: "failed",
      failure_reason: telemetry.failure_reason,
      telemetry: [telemetry],
    };
  }
}

export async function generateReportContent(
  input: {
    brief: BusinessBrief;
    prompts: AuditPrompt[];
    observations: AuditObservation[];
    safety_identifier: string;
    budget: AuditBudget;
  },
  revision?: {
    draft: ReportContent;
    violations: string[];
  },
): Promise<{
  content: ReportContent;
  requested_model: string;
  returned_model: string;
  response_id: string;
  telemetry: AuditCallTelemetry[];
}> {
  const requestedModel = auditModel();
  const request = {
    model: requestedModel,
    reasoning: { effort: auditReasoningEffort("medium") },
    store: false,
    service_tier: "default" as const,
    max_output_tokens: AUDIT_CALL_LIMITS.report.max_output_tokens,
    safety_identifier: hashSafetyIdentifier(input.safety_identifier),
    text: {
      format: zodTextFormat(reportSynthesisSchema, "nuave_audit_report"),
      verbosity: "low" as const,
    },
    input: [
      {
        role: "developer" as const,
        content: [
          "Write an evidence-led Nuave AI Visibility Report in clear, natural English using only the supplied verified brief and test answers.",
          `Use synthesis contract ${REPORT_SYNTHESIS_PROMPT_VERSION}.`,
          ...reportWritingInstructions(),
          "Keep observation, interpretation, recommendation, confidence, and limitation distinct.",
          "Do not claim causation, lost revenue, permanent ranking, consumer ChatGPT equivalence, or guaranteed improvement.",
          "Return one compact assessment for each prompt ID with recommendation, comparison, and information only.",
          "Nuave computes run state, visible brand appearance, excerpts, source links, detail copy, and verified-competitor links in code; do not return those fields.",
          "When a run failed, set recommendation, comparison, and information to not_assessed.",
          "Set recommendation to recommended only for an explicit suggestion or endorsement. A factual answer, contact path, or mention is not a recommendation.",
          "Use client_preferred or competitor_preferred only for explicit preference in that answer. Use compared_no_preference when both are compared without a preference.",
          "Use information confirmed, incomplete, or conflicting only when the answer assesses a public fact about the audited brand; otherwise use not_assessed.",
          "Use needs_confirmation when a supplied claim still needs verification. Use needs_correction only when the answers show a specific conflict or error. Use no_clear_issues only when no specific issue appears; it does not prove all public information is correct.",
          "Every finding and priority must cite one or more supplied prompt IDs. Every action needs an observable completion check.",
          "Return no more than five priorities. Each priority must address a supplied failed, absent, not-recommended discovery, incomplete, conflicting, or competitor-preferred result.",
          "Make the conclusion answer whether the business was discovered and recommended in this tested sample. Do not imply a wider or permanent result.",
          "For each key finding, state what happened and explain what it may mean for the business without claiming cause.",
          "Return exactly one assessment for each of the ten prompt IDs.",
          ...(revision
            ? [
                "This is a language-only revision. Fix only the listed writing violations.",
                "Keep accuracy status, assessment order and classifications, prompt IDs, evidence prompt IDs, priority timing, and owner exactly as supplied in the draft.",
              ]
            : []),
        ].join("\n"),
      },
      {
        role: "user" as const,
        content: JSON.stringify({
          verified_brief: {
            ...input.brief,
            agency_logo_data_url: "[not sent]",
          },
          prompts: input.prompts,
          observations: input.observations.map(
            ({ telemetry, ...observation }) => {
              void telemetry;
              return observation;
            },
          ),
          ...(revision
            ? {
                report_draft: {
                  conclusion: revision.draft.conclusion,
                  accuracy_status: revision.draft.accuracy_status,
                  key_findings: revision.draft.key_findings,
                  priorities: revision.draft.priorities,
                  assessments: revision.draft.details.map((detail) => ({
                    prompt_id: detail.prompt_id,
                    recommendation: detail.recommendation,
                    comparison: detail.comparison,
                    information: detail.information,
                  })),
                },
                writing_violations: revision.violations,
              }
            : {}),
        }),
      },
    ],
  } satisfies CostControlledResponseParams;
  const reservedCost = reserveAuditCall({
    budget: input.budget,
    stage: "report",
    request,
    requested_model: requestedModel,
    has_web_search: false,
  });
  const startedAt = Date.now();
  let telemetry: AuditCallTelemetry | undefined;
  try {
    const response = await client().responses.parse(request);
    telemetry = completedCallTelemetry({
      stage: "report",
      started_at_ms: startedAt,
      requested_model: requestedModel,
      response,
    });
    return {
      content: assembleReportContent(
        structuredOutputOrThrow<ReportSynthesis>(
          response.output_parsed,
          "Report generation",
          response,
        ),
        input.observations,
        input.brief,
      ),
      requested_model: requestedModel,
      returned_model: response.model,
      response_id: response.id,
      telemetry: [telemetry],
    };
  } catch (error) {
    const retained =
      telemetry ??
      failedCallTelemetry({
        stage: "report",
        started_at_ms: startedAt,
        requested_model: requestedModel,
        reserved_cost_usd: reservedCost,
        error,
      });
    throw new AuditCallExecutionError(
      error instanceof Error ? error.message : "Report generation failed.",
      [retained],
    );
  }
}
