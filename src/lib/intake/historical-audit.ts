import { parseLocalQuestionPack } from "./local-questions";
import { LOCAL_INTAKE_STORAGE_KEY, parseLocalSession } from "./local-session";
import {
  LOCAL_AUDIT_STORAGE_KEY,
  localAuditQuestionsKey,
  readLocalAuditRecord,
  type LocalAuditRecord,
} from "./local-audit-session";

/** Read-only v1 preservation check. It never rebuilds a legacy brief or writes
 * either storage key. Started records remain under the founder-approved hold. */
export function readHistoricalAudit(): LocalAuditRecord | null {
  if (typeof window === "undefined") return null;
  const intakeRaw = window.sessionStorage.getItem(LOCAL_INTAKE_STORAGE_KEY);
  const auditRaw = window.sessionStorage.getItem(LOCAL_AUDIT_STORAGE_KEY);
  if (!intakeRaw || !auditRaw) return null;
  const intake = parseLocalSession(intakeRaw);
  if (!intake?.pack || typeof intake.pack !== "object") return null;
  const storedInput = (intake.pack as { input?: unknown }).input;
  const pack = parseLocalQuestionPack(
    intake.pack,
    storedInput as Parameters<typeof parseLocalQuestionPack>[1],
  );
  if (!pack) return null;
  const record = readLocalAuditRecord(
    pack.inputFingerprint,
    localAuditQuestionsKey(pack.promptPack.prompts),
  );
  return record;
}
