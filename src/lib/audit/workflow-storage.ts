/**
 * Session-storage keys and the restore guard for the live audit workflow.
 *
 * R3-4 (Phase 3 fix-round-3 adversarial review): `AuditReport.measures` is a
 * required field added in this phase. `AuditWorkflow` restores its saved
 * state with an unchecked `JSON.parse(saved) as SavedState`, so a report
 * written by the previous build — which has no `measures` — used to restore
 * cleanly and then throw during render
 * (`report.measures.overall.appeared` on `undefined`), taking out the report
 * screen for a completed audit. The `try/catch` around the restore does not
 * help: the crash happens later, during render.
 *
 * Two things close it, and both are here because both are pure logic:
 *  1. the storage key is versioned with the saved shape (v3 -> v4), and
 *  2. a restored report is structurally checked and dropped if it does not
 *     carry the fields the report screen reads.
 *
 * Optional chaining at the render call sites was rejected deliberately: it
 * would silently render a report with missing numbers.
 */
import type { AuditReport } from "./types";

/** Bump whenever the persisted `SavedState` shape changes. */
export const AUDIT_WORKFLOW_STORAGE_KEY = "nuave.audit.workflow.v4";
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
