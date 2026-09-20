/**
 * Spec 010 deployment gate for the public audit journey (revision 4).
 *
 * Two server-side configuration values replace the former founder-local
 * flags (NUAVE_GLM_LOCAL_EXPERIMENT, NUAVE_GLM_LIVE_AUTHORIZED,
 * NUAVE_AUDIT_LIVE_AUTHORIZED) and every `NODE_ENV !== "production"`
 * condition on the five audit routes:
 *
 * - `NUAVE_NEW_AUDIT_ENABLED` ("true"/"1") — the single on/off switch for
 *   /api/audit/{identity,extract,glm-questions,run,report} and the journey
 *   pages. Default off: every route answers 404 before any work (R-01).
 * - `NUAVE_AUDIT_MODE` — "live" or "synthetic", chosen by server
 *   configuration only; no request parameter can change it (R-02). Default
 *   "synthetic": the labeled substitutes run. "live" requires the provider
 *   credentials (OPENCODEGO_API_KEY etc. via assertLiveProviderCredentials-
 *   Configured) AND CHEAPERINFERENCE_API_KEY; a missing credential stops the
 *   affected stage with an error naming the stage — never the secret — and
 *   never falls back to synthetic.
 *
 * R-02b check order on every request to the five routes:
 *   switch → method accepted → rate limit → mode/credentials → body
 *   validation → provider work.
 * `auditSwitchResponse` covers step one; `auditLiveCredentialsResponse`
 * covers step four; the rate-limit helpers live in ./rate-limit.
 */
import { NextResponse } from "next/server";
import { assertLiveProviderCredentialsConfigured } from "./provider";

export function newAuditEnabled(): boolean {
  return ["true", "1"].includes(process.env.NUAVE_NEW_AUDIT_ENABLED ?? "");
}

export type AuditMode = "live" | "synthetic";

/** Server-selected execution mode. Any value other than the exact string
 * "live" — including an unset or mistyped variable — stays synthetic, the
 * failure-safe direction. */
export function auditMode(): AuditMode {
  return process.env.NUAVE_AUDIT_MODE?.trim() === "live" ? "live" : "synthetic";
}

/** R-01/R-02b step one: when the switch is off the route answers 404 before
 * body parsing, rate limiting, credentials or provider work. Returns null
 * when the audit is enabled. */
export function auditSwitchResponse(): NextResponse | null {
  return newAuditEnabled()
    ? null
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}

/** True when the GLM credential for question generation is configured. */
export function glmKeyPresent(): boolean {
  const key = process.env.CHEAPERINFERENCE_API_KEY;
  return typeof key === "string" && key.trim().length > 0;
}

/** R-02: in live mode a stage requires the provider credentials and the GLM
 * key. A missing one throws an error naming the stage — never the secret —
 * and the caller must not substitute the synthetic path. */
export function assertLiveAuditStageCredentials(stage: string): void {
  try {
    assertLiveProviderCredentialsConfigured();
  } catch (error) {
    throw new Error(
      `Audit stage "${stage}" cannot run in live mode: ${
        error instanceof Error
          ? error.message
          : "provider credentials are not configured"
      }`,
    );
  }
  if (!glmKeyPresent()) {
    throw new Error(
      `Audit stage "${stage}" cannot run in live mode: CHEAPERINFERENCE_API_KEY is not configured on the Nuave server — the stage stopped before any provider call and did not fall back to the synthetic substitute.`,
    );
  }
}

/** R-02b step four as a response helper: in live mode a missing credential
 * returns a 503 naming the stage; in synthetic mode — or when every
 * credential is present — returns null so the route continues. */
export function auditLiveCredentialsResponse(
  stage: string,
): NextResponse | null {
  if (auditMode() !== "live") return null;
  try {
    assertLiveAuditStageCredentials(stage);
    return null;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : `Audit stage "${stage}" cannot run in live mode.`,
        code: "LIVE_CREDENTIALS_MISSING",
      },
      { status: 503 },
    );
  }
}
