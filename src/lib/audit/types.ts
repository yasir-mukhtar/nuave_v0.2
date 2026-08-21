import { z } from "zod";

export const promptCategories = [
  "need_discovery",
  "solution_discovery",
  "comparison",
  "validation",
  "action",
] as const;

export const appearanceStatuses = [
  "absent",
  "mentioned",
  "not_assessed",
] as const;

export const recommendationStatuses = [
  "recommended",
  "not_recommended",
  "not_assessed",
] as const;

export const comparisonStatuses = [
  "client_preferred",
  "competitor_preferred",
  "compared_no_preference",
  "not_observed",
  "not_assessed",
] as const;

export const informationStatuses = [
  "confirmed",
  "incomplete",
  "conflicting",
  "not_assessed",
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
  // Spec 002/003: the live path generates the Indonesian pack (id-ID); the
  // deterministic English pack (en-US) remains for legacy/fixture callers.
  language: z.enum(["en-US", "id-ID"]),
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
    unbranded_prompts: z.number().int().min(0).max(10),
    branded_prompts: z.number().int().min(0).max(10),
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
  // Spec 003 R-14/R-20: the versioned neutral instruction used for this
  // observation. Recorded on protected live observations; optional so legacy
  // observations and testing-only providers that predate the versioned
  // instruction remain parseable.
  instruction_version: z.string().optional(),
  system: z.enum([
    "OpenAI Responses API",
    "OpenCode Go Responses API",
    "Google Gemini API",
    "Groq + Tavily",
    "OpenRouter",
  ]),
  requested_model: z.string(),
  returned_model: z.string(),
  response_id: z.string(),
  observed_at: z.string(),
  raw_answer: z.string(),
  sources: z.array(sourceSchema),
  run_status: z.enum(["completed", "failed"]),
  failure_reason: z.string(),
  telemetry: z.array(
    z.object({
      stage: z.enum(["extract", "prompts", "observation", "report"]),
      attempt: z.number().int().min(1),
      status: z.enum(["completed", "failed"]),
      started_at: z.string(),
      completed_at: z.string(),
      latency_ms: z.number().int().nonnegative(),
      requested_model: z.string(),
      returned_model: z.string(),
      response_id: z.string(),
      service_tier: z.string(),
      usage: z.object({
        input_tokens: z.number().int().nonnegative(),
        cached_input_tokens: z.number().int().nonnegative(),
        cache_write_input_tokens: z.number().int().nonnegative(),
        output_tokens: z.number().int().nonnegative(),
        reasoning_output_tokens: z.number().int().nonnegative(),
        total_tokens: z.number().int().nonnegative(),
      }),
      web_search_calls: z.number().int().nonnegative(),
      accounted_cost_usd: z.number().nonnegative(),
      cost_basis: z.enum(["provider_usage", "preflight_reservation"]),
      pricing_version: z.string(),
      failure_reason: z.string(),
      // Safe provider completion diagnostics. These record how a response
      // ended, never any provider-authored content.
      provider_status: z.string().max(60).default(""),
      incomplete_reason: z.string().max(60).default(""),
      output_text_present: z.boolean().default(false),
      refusal_present: z.boolean().default(false),
      // Spec 003 R-20 attempt provenance: whether this telemetry entry is an
      // automatic retry and the safe failure category of a failed attempt.
      // Optional so pre-R-20 records and testing-only providers stay parseable.
      automatic: z.boolean().optional(),
      safe_failure_category: z.string().max(40).optional(),
    }),
  ),
});

export const AUDIT_COST_LIMIT_USD = 5;

export const auditCallTelemetrySchema =
  auditObservationSchema.shape.telemetry.element;

export const auditBudgetSchema = z.object({
  limit_usd: z.literal(AUDIT_COST_LIMIT_USD),
  carryover_cost_usd: z.number().nonnegative().max(AUDIT_COST_LIMIT_USD),
  // Retry-aware accounting (Spec 003 R-36): one extract + one prompt
  // generation + ten initial observations + up to two automatic retries per
  // question (max 30 observation attempts) + up to three report attempts.
  // 40 provides headroom above the theoretical 36-call maximum.
  calls: z.array(auditCallTelemetrySchema).max(40),
});

export const reportDetailSchema = z.object({
  prompt_id: z.string(),
  run: z.enum(["completed", "failed"]),
  appearance: z.enum(appearanceStatuses),
  recommendation: z.enum(recommendationStatuses),
  comparison: z.enum(comparisonStatuses),
  information: z.enum(informationStatuses),
  finding: z.string(),
  answer_excerpt: z.string(),
  source_urls: z.array(sourceUrl),
  competitor_mentions: z.array(
    z.object({
      name: z.string(),
      evidence_excerpt: z.string(),
    }),
  ),
});

export const reportSynthesisAssessmentSchema = z.object({
  prompt_id: z.string(),
  recommendation: z.enum(recommendationStatuses),
  comparison: z.enum(comparisonStatuses),
  information: z.enum(informationStatuses),
});

export const reportSynthesisSchema = z.object({
  conclusion: z.string(),
  accuracy_status: z.enum([
    "needs_correction",
    "needs_confirmation",
    "no_clear_issues",
  ]),
  key_findings: z.array(
    z.object({
      finding: z.string(),
      why_it_matters: z.string(),
      evidence_prompt_ids: z.array(z.string()).min(1),
    }),
  ),
  priorities: z.array(
    z.object({
      priority: z.string(),
      why: z.string(),
      action: z.string(),
      owner: z.string(),
      timing: z.string(),
      evidence_prompt_ids: z.array(z.string()).min(1),
      success_check: z.string(),
    }),
  ),
  assessments: z.array(reportSynthesisAssessmentSchema),
});

export const reportContentSchema = z.object({
  conclusion: z.string(),
  accuracy_status: z.enum([
    "needs_correction",
    "needs_confirmation",
    "no_clear_issues",
  ]),
  key_findings: z.array(
    z.object({
      finding: z.string(),
      why_it_matters: z.string(),
      evidence_prompt_ids: z.array(z.string()).min(1),
    }),
  ),
  priorities: z.array(
    z.object({
      priority: z.string(),
      why: z.string(),
      action: z.string(),
      owner: z.string(),
      timing: z.string(),
      evidence_prompt_ids: z.array(z.string()).min(1),
      success_check: z.string(),
    }),
  ),
  assessments: z.array(reportSynthesisAssessmentSchema),
});

export const reportSchema = z.object({
  report_version: z.string(),
  synthesis_prompt_version: z.string(),
  report_language_contract_version: z.string(),
  buyer: z.object({
    name: z.string(),
    organization: z.string(),
    email: z.string(),
  }),
  business: businessBriefSchema,
  prompts: z.array(promptSchema).length(10),
  observations: z.array(auditObservationSchema).length(10),
  score: z.object({
    appearances: z.number().int().min(0).max(10),
    total: z.literal(10),
  }),
  unbranded_score: z.object({
    appearances: z.number().int().nonnegative(),
    eligible: z.number().int().nonnegative(),
  }),
  branded_score: z.object({
    appearances: z.number().int().nonnegative(),
    eligible: z.number().int().nonnegative(),
  }),
  recommendation_score: z.object({
    recommended: z.number().int().nonnegative(),
    eligible: z.number().int().nonnegative(),
  }),
  comparison_score: z.object({
    favorable: z.number().int().nonnegative(),
    eligible: z.number().int().nonnegative(),
  }),
  information_score: z.object({
    confirmed: z.number().int().nonnegative(),
    eligible: z.number().int().nonnegative(),
  }),
  content: reportContentSchema,
  details: z.array(reportDetailSchema).length(10),
  method: z.object({
    system: z.string(),
    requested_model: z.string(),
    returned_models: z.array(z.string()),
    instruction_version: z.string(),
    observation_count: z.literal(10),
    completed_observation_count: z.number().int().min(0).max(10),
    failed_observation_count: z.number().int().min(0).max(10),
    created_at: z.string(),
    limitations: z.array(z.string()),
  }),
  telemetry: z.array(auditCallTelemetrySchema),
  cost: z.object({
    limit_usd: z.literal(AUDIT_COST_LIMIT_USD),
    accounted_cost_usd: z.number().nonnegative(),
    remaining_usd: z.number(),
  }),
});

export const evidenceExportSchema = z.object({
  evidence_version: z.string(),
  report: reportSchema,
});

export type BusinessBrief = z.infer<typeof businessBriefSchema>;
export type ExtractionDraft = z.infer<typeof extractionDraftSchema>;
export type AuditPrompt = z.infer<typeof promptSchema>;
export type PromptPack = z.infer<typeof promptPackSchema>;
export type AuditObservation = z.infer<typeof auditObservationSchema>;
export type AuditCallTelemetry = z.infer<typeof auditCallTelemetrySchema>;
export type AuditBudget = z.infer<typeof auditBudgetSchema>;
export type ReportDetail = z.infer<typeof reportDetailSchema>;
export type ReportSynthesis = z.infer<typeof reportSynthesisSchema>;
export type ReportContent = z.infer<typeof reportContentSchema>;
export type AuditReport = z.infer<typeof reportSchema>;
export type EvidenceExport = z.infer<typeof evidenceExportSchema>;
