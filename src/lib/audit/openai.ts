import { createHash } from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { Response } from "openai/resources/responses/responses";
import {
  SOURCE_TITLE_MAX_LENGTH,
  extractionDraftSchema,
  promptPackSchema,
  reportContentSchema,
  type AuditObservation,
  type AuditPrompt,
  type BusinessBrief,
  type ExtractionDraft,
  type PromptPack,
  type ReportContent,
  type Source,
} from "./types";
import { PROMPT_CONTRACT_VERSION, PROMPT_MATRIX } from "./contracts";
import { reportWritingInstructions } from "./report-language";

const DEFAULT_MODEL = "gpt-5.6";
const REASONING_EFFORTS = [
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;

type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

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

export function hashSafetyIdentifier(value: string) {
  return createHash("sha256")
    .update(`nuave:${value}`)
    .digest("hex")
    .slice(0, 64);
}

function hostnameFromUrl(value: string) {
  return new URL(value).hostname.replace(/^www\./, "");
}

function parsedOrThrow<T>(value: T | null, label: string): T {
  if (!value)
    throw new Error(`${label} did not return usable structured data.`);
  return value;
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
}): Promise<{
  draft: ExtractionDraft;
  returned_model: string;
  response_id: string;
}> {
  const websiteDomain = hostnameFromUrl(input.website_url);
  const response = await client().responses.parse({
    model: auditModel(),
    reasoning: { effort: auditReasoningEffort("low") },
    store: false,
    safety_identifier: hashSafetyIdentifier(input.safety_identifier),
    tools: [
      {
        type: "web_search",
        filters: { allowed_domains: [websiteDomain] },
        search_context_size: "medium",
      },
    ],
    tool_choice: "required",
    include: ["web_search_call.action.sources"],
    text: {
      format: zodTextFormat(extractionDraftSchema, "nuave_business_draft"),
      verbosity: "low",
    },
    input: [
      {
        role: "developer",
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
        role: "user",
        content: JSON.stringify({
          official_website: input.website_url,
          supplied_brand_name: input.brand_name,
          supplied_market_context: input.market_context,
          supplied_category: input.category,
        }),
      },
    ],
  });

  return {
    draft: parsedOrThrow(response.output_parsed, "Website extraction"),
    returned_model: response.model,
    response_id: response.id,
  };
}

export async function generatePromptPack(
  brief: BusinessBrief,
  safetyIdentifier: string,
): Promise<PromptPack> {
  const matrix = PROMPT_MATRIX.map(([prompt_id, category, branded, role]) => ({
    prompt_id,
    category,
    branded,
    role,
  }));
  const response = await client().responses.parse({
    model: auditModel(),
    reasoning: { effort: auditReasoningEffort("medium") },
    store: false,
    safety_identifier: hashSafetyIdentifier(safetyIdentifier),
    text: {
      format: zodTextFormat(promptPackSchema, "nuave_prompt_pack"),
      verbosity: "low",
    },
    input: [
      {
        role: "developer",
        content: [
          "Generate one reviewable Nuave AI-visibility prompt pack in clear, natural English.",
          "Use exactly the supplied fixed matrix in its exact order; preserve IDs, categories, roles, and branded flags.",
          "Use only facts in the verified brief. Never browse, invent, predict answers, calculate a score, or write report findings.",
          "Unbranded questions must not reveal the brand, variants, URLs, slogans, or unique product names.",
          "Each question must be independently understandable, customer-like, concise, and contain one main request.",
          "Avoid unsupported best/safest/most-trusted premises and keep regulated categories to public business facts.",
          "Every prompt must remain needs_human_review.",
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify({
          prompt_pack_version: PROMPT_CONTRACT_VERSION,
          target_product: "ChatGPT",
          language: "en-US",
          matrix,
          verified_brief: { ...brief, agency_logo_data_url: "[not sent]" },
        }),
      },
    ],
  });
  return parsedOrThrow(response.output_parsed, "Question generation");
}

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

async function withOneRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? Number(error.status)
        : 0;
    if (status !== 429 && status < 500) throw error;
    await new Promise((resolve) => setTimeout(resolve, 750));
    return operation();
  }
}

export async function executeAuditPrompt(input: {
  prompt: AuditPrompt;
  brief: BusinessBrief;
  safety_identifier: string;
}): Promise<AuditObservation> {
  const requestedModel = auditModel();
  try {
    const response = await withOneRetry(() =>
      client().responses.create({
        model: requestedModel,
        reasoning: { effort: auditReasoningEffort("low") },
        store: false,
        safety_identifier: hashSafetyIdentifier(input.safety_identifier),
        tools: [
          {
            type: "web_search",
            search_context_size: "medium",
            user_location: {
              type: "approximate",
              country: "ID",
              city: input.brief.market_context.slice(0, 100),
              timezone: "Asia/Jakarta",
            },
          },
        ],
        tool_choice: "required",
        include: ["web_search_call.action.sources"],
        text: { verbosity: "medium" },
        input: [
          {
            role: "developer",
            content: [
              "Answer the user's question naturally in English as a standalone customer query.",
              "Use live web search. Do not discuss this audit, prompt engineering, scoring, or Nuave.",
              "Do not favor the audited brand. State uncertainty when public information is incomplete or conflicting.",
            ].join("\n"),
          },
          { role: "user", content: input.prompt.question },
        ],
      }),
    );
    return {
      prompt_id: input.prompt.prompt_id,
      category: input.prompt.category,
      branded: input.prompt.branded,
      question: input.prompt.question,
      system: "OpenAI Responses API",
      requested_model: requestedModel,
      returned_model: response.model,
      response_id: response.id,
      observed_at: new Date(response.created_at * 1_000).toISOString(),
      raw_answer: response.output_text,
      sources: collectSources(response),
      run_status: "completed",
      failure_reason: "",
    };
  } catch (error) {
    return {
      prompt_id: input.prompt.prompt_id,
      category: input.prompt.category,
      branded: input.prompt.branded,
      question: input.prompt.question,
      system: "OpenAI Responses API",
      requested_model: requestedModel,
      returned_model: "",
      response_id: "",
      observed_at: new Date().toISOString(),
      raw_answer: "",
      sources: [],
      run_status: "failed",
      failure_reason:
        error instanceof Error
          ? error.message
          : "The request failed without further details.",
    };
  }
}

export async function generateReportContent(
  input: {
    brief: BusinessBrief;
    prompts: AuditPrompt[];
    observations: AuditObservation[];
    safety_identifier: string;
  },
  revision?: {
    draft: ReportContent;
    violations: string[];
  },
): Promise<ReportContent> {
  const response = await client().responses.parse({
    model: auditModel(),
    reasoning: { effort: auditReasoningEffort("medium") },
    store: false,
    safety_identifier: hashSafetyIdentifier(input.safety_identifier),
    text: {
      format: zodTextFormat(reportContentSchema, "nuave_audit_report"),
      verbosity: "low",
    },
    input: [
      {
        role: "developer",
        content: [
          "Write an evidence-led Nuave AI Visibility Report in clear, natural English using only the supplied verified brief and test answers.",
          ...reportWritingInstructions(),
          "Keep observation, interpretation, recommendation, confidence, and limitation distinct.",
          "Do not claim causation, lost revenue, permanent ranking, consumer ChatGPT equivalence, or guaranteed improvement.",
          "Classify each question carefully: recommendation, mention, no appearance, incomplete, conflicting, or could not be tested.",
          "A mention is not a recommendation. A failed observation must be could_not_be_tested.",
          "Use no_clear_issues only when the supplied answers show no specific accuracy problem; do not treat it as proof that all public information is correct.",
          "Choose one relevant answer excerpt for each test, copy it exactly, and use only source URLs attached to that answer.",
          "Every finding and priority must cite one or more supplied prompt IDs. Every action needs an observable completion check.",
          "Return exactly one detail for each of the ten prompt IDs.",
          ...(revision
            ? [
                "This is a language-only revision. Fix only the listed writing violations.",
                "Keep accuracy status, array order, classifications, prompt IDs, evidence prompt IDs, priority timing and owner, answer excerpts, and source URLs exactly as supplied in the draft.",
              ]
            : []),
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify({
          verified_brief: {
            ...input.brief,
            agency_logo_data_url: "[not sent]",
          },
          prompts: input.prompts,
          observations: input.observations,
          ...(revision
            ? {
                report_draft: revision.draft,
                writing_violations: revision.violations,
              }
            : {}),
        }),
      },
    ],
  });
  return parsedOrThrow(response.output_parsed, "Report generation");
}
