export const AUDIT_CLIENT_CONTRACT_VERSION = "live-audit-stream-v1" as const;

export const AUDIT_CLIENT_UPDATE_REQUIRED_CODE =
  "AUDIT_CLIENT_UPDATE_REQUIRED" as const;

export const AUDIT_CLIENT_UPDATE_REQUIRED_MESSAGE =
  "Versi halaman audit ini sudah lama. Muat ulang halaman sebelum menjalankan audit." as const;

/**
 * Browser/server wire-contract guard for the live NDJSON audit stream. Bump
 * this value whenever a deployed client could no longer parse a new live-run
 * payload. The server rejects stale clients before any observation call.
 */
export function isCurrentAuditClientContract(value: unknown): boolean {
  return value === AUDIT_CLIENT_CONTRACT_VERSION;
}
