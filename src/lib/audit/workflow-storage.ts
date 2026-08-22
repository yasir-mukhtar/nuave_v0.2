/**
 * Session-storage keys and the restore guard for the live audit workflow.
 *
 * The workflow key is versioned for persisted-state compatibility. Spec 003's
 * OpenCode Go migration changes the meaning of a resumable observation even
 * though its TypeScript shape is unchanged: pre-migration v4 state may contain
 * direct-OpenAI observations, and silently restoring those would allow a mixed
 * provider audit. v5 therefore invalidates all pre-migration workflow state.
 *
 * The report-shape guard remains as a second line of defense for required
 * fields read without optional chaining by the report screen.
 */
import type { AuditReport } from "./types";

/** Bump whenever the persisted `SavedState` shape or resumable method changes. */
export const AUDIT_WORKFLOW_STORAGE_KEY = "nuave.audit.workflow.v6";
export const AUDIT_SESSION_STORAGE_KEY = "nuave.audit.session.v1";

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
