import { createHash } from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { Response } from "openai/resources/responses/responses";
import {
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

const DEFAULT_MODEL = "gpt-5.6";

function client() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY belum dikonfigurasi pada server Nuave.");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function auditModel() {
  return process.env.OPENAI_AUDIT_MODEL?.trim() || DEFAULT_MODEL;
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
    throw new Error(
      `${label} tidak menghasilkan data terstruktur yang dapat digunakan.`,
    );
  return value;
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
    reasoning: { effort: "low" },
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
          "Use natural Indonesian. Leave unsupported scalar fields empty and unsupported arrays empty.",
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
    draft: parsedOrThrow(response.output_parsed, "Ekstraksi website"),
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
    reasoning: { effort: "medium" },
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
          "Generate one reviewable Nuave AI-visibility prompt pack in natural Bahasa Indonesia.",
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
          language: "id-ID",
          matrix,
          verified_brief: { ...brief, agency_logo_data_url: "[not sent]" },
        }),
      },
    ],
  });
  return parsedOrThrow(response.output_parsed, "Pembuatan pertanyaan");
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
            title: annotation.title || annotation.url,
          });
        }
      }
    }
    if (item.type === "web_search_call" && item.action.type === "search") {
      for (const source of item.action.sources ?? []) {
        if (source.type !== "url") continue;
        found.set(source.url, { url: source.url, title: source.url });
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
        reasoning: { effort: "low" },
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
              "Answer the user's question naturally in Bahasa Indonesia as a standalone customer query.",
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
          : "Permintaan gagal tanpa detail.",
    };
  }
}

export async function generateReportContent(input: {
  brief: BusinessBrief;
  prompts: AuditPrompt[];
  observations: AuditObservation[];
  safety_identifier: string;
}): Promise<ReportContent> {
  const response = await client().responses.parse({
    model: auditModel(),
    reasoning: { effort: "medium" },
    store: false,
    safety_identifier: hashSafetyIdentifier(input.safety_identifier),
    text: {
      format: zodTextFormat(reportContentSchema, "nuave_audit_report"),
      verbosity: "medium",
    },
    input: [
      {
        role: "developer",
        content: [
          "Write an evidence-led Indonesian Nuave AI Visibility Report using only the supplied verified brief and API observations.",
          "Keep observation, interpretation, recommendation, confidence, and limitation distinct.",
          "Do not claim causation, lost revenue, permanent ranking, consumer ChatGPT equivalence, or guaranteed improvement.",
          "Classify each question carefully: recommendation, mention, no appearance, incomplete, conflicting, or could not be tested.",
          "A mention is not a recommendation. A failed observation must be could_not_be_tested.",
          "Use a clearly identified relevant excerpt, not a rewritten quote. Use only source URLs attached to that observation.",
          "Every finding and priority must cite one or more supplied prompt IDs. Every action needs an observable completion check.",
          "Return exactly one detail for each of the ten prompt IDs.",
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
        }),
      },
    ],
  });
  return parsedOrThrow(response.output_parsed, "Pembuatan laporan");
}
