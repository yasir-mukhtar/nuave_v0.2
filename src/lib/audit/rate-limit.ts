import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

export const IDENTITY_CALLER_RATE_LIMITER = "IDENTITY_CALLER_RATE_LIMITER";
export const IDENTITY_DESTINATION_RATE_LIMITER =
  "IDENTITY_DESTINATION_RATE_LIMITER";
export const EXTRACT_CALLER_RATE_LIMITER = "EXTRACT_CALLER_RATE_LIMITER";
export const GLM_CALLER_RATE_LIMITER = "GLM_CALLER_RATE_LIMITER";
export const AUDIT_RUN_CALLER_RATE_LIMITER = "AUDIT_RUN_CALLER_RATE_LIMITER";
export const AUDIT_REPORT_CALLER_RATE_LIMITER =
  "AUDIT_REPORT_CALLER_RATE_LIMITER";

export const RATE_LIMITED_MESSAGE =
  "Permintaan terlalu banyak. Coba lagi dalam beberapa saat.";
/** Spec 010 R-03: the caller-facing message for the new paid-stage limiters
 * (question generation, run, report). */
export const AUDIT_CALLER_RATE_LIMITED_MESSAGE =
  "Terlalu banyak permintaan, coba lagi dalam beberapa menit.";
export const RATE_LIMIT_UNAVAILABLE_MESSAGE =
  "Perlindungan akses sedang tidak tersedia. Coba lagi nanti.";

export interface AuditRateLimitBinding {
  limit(input: { key: string }): Promise<{ success: boolean }>;
}

export interface AuditRateLimitBindings {
  contextAvailable: boolean;
  identityCaller?: AuditRateLimitBinding;
  identityDestination?: AuditRateLimitBinding;
  extractCaller?: AuditRateLimitBinding;
  glmCaller?: AuditRateLimitBinding;
  runCaller?: AuditRateLimitBinding;
  reportCaller?: AuditRateLimitBinding;
}

export type AuditRateLimitDecision = "allowed" | "limited" | "unavailable";

type WorkerEnvironment = Record<string, unknown>;

function asRateLimitBinding(value: unknown): AuditRateLimitBinding | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    !("limit" in value) ||
    typeof value.limit !== "function"
  ) {
    return undefined;
  }
  return value as AuditRateLimitBinding;
}

/**
 * OpenNext supplies Worker bindings only inside a request context. Native
 * Node/Vitest has no such context, so it is reported as unavailable rather than
 * leaking the adapter's runtime exception into an API response.
 */
export function getAuditRateLimitBindings(): AuditRateLimitBindings {
  try {
    const context = getCloudflareContext();
    const env = context.env as unknown as WorkerEnvironment;
    return {
      contextAvailable: true,
      identityCaller: asRateLimitBinding(env[IDENTITY_CALLER_RATE_LIMITER]),
      identityDestination: asRateLimitBinding(
        env[IDENTITY_DESTINATION_RATE_LIMITER],
      ),
      extractCaller: asRateLimitBinding(env[EXTRACT_CALLER_RATE_LIMITER]),
      glmCaller: asRateLimitBinding(env[GLM_CALLER_RATE_LIMITER]),
      runCaller: asRateLimitBinding(env[AUDIT_RUN_CALLER_RATE_LIMITER]),
      reportCaller: asRateLimitBinding(env[AUDIT_REPORT_CALLER_RATE_LIMITER]),
    };
  } catch {
    return { contextAvailable: false };
  }
}

export async function consumeRateLimit(
  binding: AuditRateLimitBinding | undefined,
  key: string,
): Promise<AuditRateLimitDecision> {
  if (!binding) return "unavailable";

  try {
    const result = await binding.limit({ key });
    if (result?.success === true) return "allowed";
    if (result?.success === false) return "limited";
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

export function callerIpFromRequest(request: Request): string {
  return request.headers.get("CF-Connecting-IP")?.trim() || "unknown";
}

function auditCallerRateLimitResponse(status: 429 | 503) {
  return NextResponse.json(
    {
      error:
        status === 503
          ? RATE_LIMIT_UNAVAILABLE_MESSAGE
          : AUDIT_CALLER_RATE_LIMITED_MESSAGE,
      code: status === 503 ? "RATE_LIMIT_UNAVAILABLE" : "RATE_LIMITED",
    },
    { status },
  );
}

let loggedMissingRateLimitContext = false;

/** Spec 010 R-03: shared per-IP limiter step for the paid audit stages
 * (glm-questions, run, report). Fails closed with 503 when the binding or
 * the Worker request context is unavailable in production; without a
 * context outside production (local `next dev`, offline tests) the limiter
 * is a no-op that logs once. Keyed by CF-Connecting-IP like `extract`. */
export async function enforceAuditCallerRateLimit(
  request: Request,
  select: (
    bindings: AuditRateLimitBindings,
  ) => AuditRateLimitBinding | undefined,
): Promise<NextResponse | null> {
  const bindings = getAuditRateLimitBindings();
  if (!bindings.contextAvailable) {
    if (process.env.NODE_ENV === "production") {
      return auditCallerRateLimitResponse(503);
    }
    if (!loggedMissingRateLimitContext) {
      loggedMissingRateLimitContext = true;
      console.warn(
        "audit rate-limit bindings unavailable outside the Worker request context — caller limiter is a no-op",
      );
    }
    return null;
  }
  const binding = select(bindings);
  if (!binding) return auditCallerRateLimitResponse(503);
  const decision = await consumeRateLimit(
    binding,
    callerIpFromRequest(request),
  );
  if (decision === "unavailable") return auditCallerRateLimitResponse(503);
  return decision === "allowed" ? null : auditCallerRateLimitResponse(429);
}
