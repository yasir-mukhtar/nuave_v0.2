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
  // observation. Recorded on the live path (OpenAI Responses API); optional so
  // legacy observations and testing-only providers that predate the versioned
  // instruction remain parseable.
  instruction_version: z.string().optional(),
  system: z.enum([
    "OpenAI Responses API",
    "Google Gemini API",
    "Groq + Tavily",
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
  evidence_note: z.string(),
  source_urls: z.array(z.string()),
});

export const observedCompetitorSchema = z.object({
  name: z.string().trim().min(1).max(160),
  relationship: z.enum([
    "client_preferred",
    "competitor_preferred",
    "compared_no_preference",
    "mentioned",
  ]),
  evidence_prompt_ids: z.array(z.string()).min(1).max(10),
});

export const reportContentSchema = z.object({
  conclusion: z.string(),
  accuracy_status: z.enum([
    "no_clear_issues",
    "needs_confirmation",
    "needs_correction",
    "could_not_assess",
  ]),
  observed_competitors: z.array(observedCompetitorSchema).max(20),
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

export const reportSynthesisSchema = reportContentSchema
  .pick({
    conclusion: true,
    accuracy_status: true,
    key_findings: true,
    priorities: true,
  })
  .extend({
    assessments: z
      .array(
        z.object({
          prompt_id: z.string(),
          recommendation: z.enum(recommendationStatuses),
          comparison: z.enum(comparisonStatuses),
          information: z.enum(informationStatuses),
        }),
      )
      .length(10),
  });

export type Source = z.infer<typeof sourceSchema>;
export type BusinessBrief = z.infer<typeof businessBriefSchema>;
export type ExtractionDraft = z.infer<typeof extractionDraftSchema>;
export type AuditPrompt = z.infer<typeof promptSchema>;
export type PromptPack = z.infer<typeof promptPackSchema>;
export type AuditObservation = z.infer<typeof auditObservationSchema>;
export type AuditCallTelemetry = z.infer<typeof auditCallTelemetrySchema>;
export type AuditBudget = z.infer<typeof auditBudgetSchema>;
export type ReportDetail = z.infer<typeof reportDetailSchema>;
export type ObservedCompetitor = z.infer<typeof observedCompetitorSchema>;
export type ReportContent = z.infer<typeof reportContentSchema>;
export type ReportSynthesis = z.infer<typeof reportSynthesisSchema>;

export type AuditReport = ReportContent & {
  report_version: "nuave-report-v3";
  // The live route uses plain-id-v1; plain-en-v1 remains supported for the
  // legacy English contract and its tests.
  writing_standard_version: "plain-en-v1" | "plain-id-v1";
  generated_at: string;
  system_label: string;
  provenance: {
    report_prompt_version: string;
    prompt_contract_version: string;
    requested_report_model: string;
    returned_report_model: string;
    report_response_id: string;
    initial_report_response_id: string;
    report_call_count: number;
    language_retry_performed: boolean;
    language_retry_violations: string[];
  };
  method_summary: string;
  facts: {
    discovery: {
      recommended: number;
      mentioned_not_recommended: number;
      absent: number;
      completed: number;
      total: number;
      failed: number;
      recommendation_label: string;
      mention_label: string;
    };
    recognition: {
      recognized: number;
      completed: number;
      total: number;
      failed: number;
      label: string;
    };
    comparison: {
      client_preferred: number;
      competitor_preferred: number;
      compared_no_preference: number;
      label: string;
    };
    information: {
      confirmed: number;
      incomplete: number;
      conflicting: number;
      label: string;
    };
    coverage: {
      completed: number;
      total: number;
      failed: number;
      label: string;
    };
  };
  counts: {
    unbranded_recommended: number;
    unbranded_mentioned: number;
    unbranded_total: number;
    branded_recognized: number;
    branded_total: number;
    failed: number;
  };
  /**
   * Appeared/assessed-denominator measures (AC-17): "appeared" counts
   * appearance === "mentioned" regardless of recommendation status;
   * "assessed" counts exclude "not_assessed" (and, for comparison,
   * "not_observed") rather than using the raw question total.
   */
  measures: {
    overall: { appeared: number; total: number };
    unbranded: { appeared: number; total: number };
    branded: { appeared: number; total: number };
    recommendation: { recommended: number; assessed: number };
    comparison: { client_preferred: number; assessed: number };
    information: {
      confirmed: number;
      incomplete: number;
      conflicting: number;
      assessed: number;
    };
  };
  operational_telemetry: {
    pricing_version: string;
    cost_limit_usd: number;
    carryover_cost_usd: number;
    call_count: number;
    failed_call_count: number;
    latency_ms: number;
    input_tokens: number;
    cached_input_tokens: number;
    cache_write_input_tokens: number;
    output_tokens: number;
    reasoning_output_tokens: number;
    total_tokens: number;
    web_search_calls: number;
    accounted_cost_usd: number;
    calls: AuditCallTelemetry[];
  };
};
