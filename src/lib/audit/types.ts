import { z } from "zod";

export const promptCategories = [
  "need_discovery",
  "solution_discovery",
  "comparison",
  "validation",
  "action",
] as const;

export const observationStatuses = [
  "appeared_as_recommendation",
  "mentioned_not_recommended",
  "did_not_appear",
  "incomplete_information",
  "conflicting_information",
  "could_not_be_tested",
] as const;

const requiredText = z.string().trim().min(1).max(2_000);
const sourceUrl = z
  .string()
  .url()
  .max(2_000)
  .refine(
    (value) => value.startsWith("https://") || value.startsWith("http://"),
    "URL must start with http:// or https://.",
  );

export const SOURCE_TITLE_MAX_LENGTH = 300;

export const sourceSchema = z.object({
  url: sourceUrl,
  title: z.string().trim().max(SOURCE_TITLE_MAX_LENGTH),
});

export const businessBriefSchema = z.object({
  brand_name: requiredText.max(160),
  entity_scope: requiredText.max(300),
  brand_type: requiredText.max(160),
  category: requiredText.max(200),
  market_context: requiredText.max(300),
  target_customer: requiredText.max(500),
  official_sources: z.array(sourceUrl).min(1).max(10),
  verified_offerings: z.array(requiredText.max(300)).min(1).max(12),
  verified_customer_needs: z.array(requiredText.max(300)).max(12),
  verified_decision_criteria: z.array(requiredText.max(300)).max(12),
  verified_competitor: z.object({
    name: requiredText.max(160),
    scope: requiredText.max(300),
    source_url: sourceUrl,
  }),
  brand_name_variants: z.array(requiredText.max(160)).max(12),
  priority_offering: z.string().trim().max(300),
  conversion_action: z.string().trim().max(300),
  customer_supplied_facts: z.array(requiredText.max(500)).max(20),
  known_accuracy_questions: z.array(requiredText.max(500)).max(12),
  usp: z.string().trim().max(1_000),
  regulated_category_notes: z.string().trim().max(1_000),
  language: z.literal("en-US"),
  agency_name: z.string().trim().max(160),
  agency_logo_data_url: z
    .string()
    .max(1_500_000)
    .refine(
      (value) => !value || /^data:image\/(png|jpeg);base64,/.test(value),
      "Unsupported logo format.",
    ),
});

export const extractionRequestSchema = z.object({
  website_url: sourceUrl,
  brand_name: z.string().trim().max(160),
  market_context: z.string().trim().max(300),
  category: z.string().trim().max(200),
  safety_identifier: z.string().trim().min(8).max(64),
});

export const extractionDraftSchema = z.object({
  brand_name: z.string(),
  entity_scope: z.string(),
  brand_type: z.string(),
  category: z.string(),
  market_context: z.string(),
  target_customer: z.string(),
  official_sources: z.array(z.string()),
  verified_offerings: z.array(z.string()),
  verified_customer_needs: z.array(z.string()),
  verified_decision_criteria: z.array(z.string()),
  brand_name_variants: z.array(z.string()),
  priority_offering: z.string(),
  conversion_action: z.string(),
  customer_supplied_facts: z.array(z.string()),
  known_accuracy_questions: z.array(z.string()),
  usp: z.string(),
  regulated_category_notes: z.string(),
  evidence: z.array(
    z.object({
      field: z.string(),
      value: z.string(),
      source_url: z.string(),
      note: z.string(),
    }),
  ),
  warnings: z.array(z.string()),
});

export const promptSchema = z.object({
  prompt_id: z.string(),
  category: z.enum(promptCategories),
  role: z.string(),
  branded: z.boolean(),
  question: z.string().trim().min(1).max(700),
  rationale: z.string().trim().min(1).max(700),
  inputs_used: z.array(z.string()).min(1).max(12),
  review_status: z.literal("needs_human_review"),
});

export const promptPackSchema = z.object({
  status: z.literal("draft_for_review"),
  prompt_pack_version: z.string(),
  language: z.literal("en-US"),
  target_product: z.literal("ChatGPT"),
  brand: z.object({
    brand_name: z.string(),
    entity_scope: z.string(),
    brand_type: z.string(),
    category: z.string(),
    market_context: z.string(),
    target_customer: z.string(),
  }),
  summary: z.object({
    total_prompts: z.literal(10),
    unbranded_prompts: z.literal(5),
    branded_prompts: z.literal(5),
  }),
  prompts: z.array(promptSchema).length(10),
  self_check: z.object({
    ten_prompts: z.boolean(),
    two_per_category: z.boolean(),
    five_unbranded: z.boolean(),
    five_branded: z.boolean(),
    no_brand_leakage: z.boolean(),
    verified_inputs_only: z.boolean(),
    verified_competitor_only: z.boolean(),
    single_entity_scope: z.boolean(),
    category_safety_pass: z.boolean(),
    independent_natural_questions: z.boolean(),
  }),
  warnings: z.array(z.string()),
});

export const auditObservationSchema = z.object({
  prompt_id: z.string(),
  category: z.enum(promptCategories),
  branded: z.boolean(),
  question: z.string(),
  system: z.literal("OpenAI Responses API"),
  requested_model: z.string(),
  returned_model: z.string(),
  response_id: z.string(),
  observed_at: z.string(),
  raw_answer: z.string(),
  sources: z.array(sourceSchema),
  run_status: z.enum(["completed", "failed"]),
  failure_reason: z.string(),
});

export const reportDetailSchema = z.object({
  prompt_id: z.string(),
  status: z.enum(observationStatuses),
  finding: z.string(),
  answer_excerpt: z.string(),
  evidence_note: z.string(),
  source_urls: z.array(z.string()),
});

export const reportContentSchema = z.object({
  conclusion: z.string(),
  accuracy_status: z.enum([
    "no_clear_issues",
    "needs_correction",
    "could_not_assess",
  ]),
  key_findings: z
    .array(
      z.object({
        title: z.string(),
        explanation: z.string(),
        evidence_prompt_ids: z.array(z.string()).min(1),
      }),
    )
    .min(1)
    .max(5),
  priorities: z
    .array(
      z.object({
        order: z.number().int().min(1).max(5),
        timing: z.enum(["do_first", "do_next"]),
        action: z.string(),
        why: z.string(),
        basis: z.string(),
        owner: z.enum([
          "business_owner",
          "admin",
          "marketing",
          "web_developer",
        ]),
        done_when: z.string(),
        evidence_prompt_ids: z.array(z.string()).min(1),
        caveat: z.string(),
      }),
    )
    .min(1)
    .max(5),
  details: z.array(reportDetailSchema).length(10),
});

export type Source = z.infer<typeof sourceSchema>;
export type BusinessBrief = z.infer<typeof businessBriefSchema>;
export type ExtractionDraft = z.infer<typeof extractionDraftSchema>;
export type AuditPrompt = z.infer<typeof promptSchema>;
export type PromptPack = z.infer<typeof promptPackSchema>;
export type AuditObservation = z.infer<typeof auditObservationSchema>;
export type ReportDetail = z.infer<typeof reportDetailSchema>;
export type ReportContent = z.infer<typeof reportContentSchema>;

export type AuditReport = ReportContent & {
  report_version: "nuave-report-v2";
  writing_standard_version: "plain-en-v1";
  generated_at: string;
  system_label: string;
  counts: {
    unbranded_recommended: number;
    unbranded_mentioned: number;
    unbranded_total: number;
    branded_recognized: number;
    branded_total: number;
    failed: number;
  };
};
