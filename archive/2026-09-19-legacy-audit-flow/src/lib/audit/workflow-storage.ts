/**
 * Versioned session storage for the live audit workflow.
 *
 * B1 changes the stored workflow from one monolithic facts screen to a
 * screen-owned intake state. v9 therefore rejects v8 and older records instead
 * of silently interpreting their fields as the new workflow.
 */
import type {
  AuditCallTelemetry,
  AuditReport,
  BusinessBrief,
  ExtractionDraft,
} from "./types";
import {
  WORKFLOW_SCHEMA_VERSION,
  createWorkflowMeta,
  mergeExtractionIntoBrief,
  type WorkflowMeta,
} from "./workflow-authority";
import { sanitizeAiSimilarBusinesses } from "./similar-businesses";

export { WORKFLOW_SCHEMA_VERSION };

export const AUDIT_WORKFLOW_STORAGE_KEY = "nuave.audit.workflow.v9";
export const AUDIT_SESSION_STORAGE_KEY = "nuave.audit.session.v1";

export type AuditWorkflowStorageState = {
  version: typeof WORKFLOW_SCHEMA_VERSION;
  websiteUrl: string;
  extractedSourceUrl: string;
  brief: BusinessBrief;
  meta: WorkflowMeta;
  factsExtracted: boolean;
  factsConfirmed: boolean;
  factsCustomerOwned: boolean;
  extraction: ExtractionDraft | null;
  promptPack: import("./types").PromptPack | null;
  observations: import("./types").AuditObservation[];
  report: AuditReport | null;
  setupTelemetry: AuditCallTelemetry[];
  executionStarted: boolean;
  postReportBudgetCalls: AuditCallTelemetry[];
  reportFailureCode: import("./report-recovery").ReportFailureCode | null;
};

export type InitialExtractedAuditWorkflowState = AuditWorkflowStorageState & {
  factsExtracted: true;
  factsConfirmed: false;
  factsCustomerOwned: false;
  extraction: ExtractionDraft;
  promptPack: null;
  observations: [];
  report: null;
  executionStarted: false;
  postReportBudgetCalls: [];
  reportFailureCode: null;
};

function blankBrief(): BusinessBrief {
  return {
    brand_name: "",
    entity_scope: "",
    brand_type: "",
    category: "",
    market_context: "",
    target_customer: "",
    official_sources: [],
    verified_offerings: [],
    verified_customer_needs: [],
    verified_decision_criteria: [],
    verified_competitor: { name: "", scope: "", source_url: "" },
    similar_businesses: [],
    brand_name_variants: [],
    priority_offering: "",
    conversion_action: "",
    customer_supplied_facts: [],
    known_accuracy_questions: [],
    usp: "",
    regulated_category_notes: "",
    language: "en-US",
    agency_name: "",
    agency_logo_data_url: "",
  };
}

/**
 * Complete v9 workflow state created after a successful source extraction. The
 * comparison suggestion is kept as a proposal in `meta`; no suggestion is
 * written into `brief.verified_competitor` until a customer action.
 */
export function createInitialExtractedAuditWorkflowState(input: {
  websiteUrl: string;
  draft: ExtractionDraft;
  telemetry: AuditCallTelemetry[];
}): InitialExtractedAuditWorkflowState {
  const similarBusinesses = sanitizeAiSimilarBusinesses(
    input.draft.similar_businesses ?? [],
  );
  const extraction: ExtractionDraft = {
    ...input.draft,
    similar_businesses: similarBusinesses,
    known_accuracy_questions: [],
  };
  const initialBrief = blankBrief();
  const merged = mergeExtractionIntoBrief({
    currentBrief: initialBrief,
    currentMeta: createWorkflowMeta(initialBrief),
    draft: extraction,
    acceptedSourceUrl: input.websiteUrl,
  });
  const meta: WorkflowMeta = {
    ...merged.meta,
    intakeScreen: "brand-confirm",
    identityUnverified: !input.draft.brand_name.trim(),
    customerEditedFields: [],
  };

  return {
    version: WORKFLOW_SCHEMA_VERSION,
    websiteUrl: input.websiteUrl,
    extractedSourceUrl: input.websiteUrl,
    brief: merged.brief,
    meta,
    factsExtracted: true,
    factsConfirmed: false,
    factsCustomerOwned: false,
    extraction,
    promptPack: null,
    observations: [],
    report: null,
    setupTelemetry: [...input.telemetry],
    executionStarted: false,
    postReportBudgetCalls: [],
    reportFailureCode: null,
  };
}

function isCount(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

function hasMeasures(measures: unknown): boolean {
  if (!measures || typeof measures !== "object") return false;
  const m = measures as Record<string, Record<string, unknown> | undefined>;
  const appearedGroups = ["overall", "unbranded", "branded"];
  for (const group of appearedGroups) {
    const value = m[group];
    if (!value || !isCount(value.appeared) || !isCount(value.total)) {
      return false;
    }
  }
  if (
    !m.recommendation ||
    !isCount(m.recommendation.recommended) ||
    !isCount(m.recommendation.assessed)
  ) {
    return false;
  }
  if (
    !m.comparison ||
    !isCount(m.comparison.client_preferred) ||
    !isCount(m.comparison.assessed)
  ) {
    return false;
  }
  if (
    !m.information ||
    !isCount(m.information.confirmed) ||
    !isCount(m.information.incomplete) ||
    !isCount(m.information.conflicting) ||
    !isCount(m.information.assessed)
  ) {
    return false;
  }
  return true;
}

/**
 * Returns the restored report only when it carries the fields the report
 * screen reads without guarding; otherwise null, so the workflow reopens at
 * the previous step instead of crashing on a stale shape.
 */
export function restorableAuditReport(report: unknown): AuditReport | null {
  if (!report || typeof report !== "object") return null;
  const candidate = report as Partial<AuditReport>;
  if (!hasMeasures(candidate.measures)) return null;
  if (!candidate.counts || typeof candidate.counts !== "object") return null;
  if (!candidate.facts || typeof candidate.facts !== "object") return null;
  if (!Array.isArray(candidate.details)) return null;
  return candidate as AuditReport;
}
