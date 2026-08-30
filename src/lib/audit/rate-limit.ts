import { getCloudflareContext } from "@opennextjs/cloudflare";

export const IDENTITY_CALLER_RATE_LIMITER = "IDENTITY_CALLER_RATE_LIMITER";
export const IDENTITY_DESTINATION_RATE_LIMITER =
  "IDENTITY_DESTINATION_RATE_LIMITER";
export const EXTRACT_CALLER_RATE_LIMITER = "EXTRACT_CALLER_RATE_LIMITER";

export const RATE_LIMITED_MESSAGE =
  "Permintaan terlalu banyak. Coba lagi dalam beberapa saat.";
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
}

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
    };
  } catch {
    return { contextAvailable: false };
  }
}

export async function consumeRateLimit(
  binding: AuditRateLimitBinding | undefined,
  key: string,
): Promise<boolean> {
  if (!binding) return false;

  try {
    const result = await binding.limit({ key });
    return result?.success === true;
  } catch {
    return false;
  }
}

export function callerIpFromRequest(request: Request): string {
  return request.headers.get("CF-Connecting-IP")?.trim() || "unknown";
}
