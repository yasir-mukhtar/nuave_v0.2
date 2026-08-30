import { NextResponse } from "next/server";
import {
  SafeSourceFetchError,
  type SourceDestinationRateLimiter,
} from "@/lib/audit/safe-source-fetch";
import { fetchSourceIdentity } from "@/lib/audit/source-identity";
import {
  parseSourceInput,
  INVALID_SOURCE_INPUT_MESSAGE,
} from "@/lib/audit/source-input";
import {
  callerIpFromRequest,
  consumeRateLimit,
  getAuditRateLimitBindings,
  RATE_LIMITED_MESSAGE,
  RATE_LIMIT_UNAVAILABLE_MESSAGE,
} from "@/lib/audit/rate-limit";

export const runtime = "nodejs";

const IDENTITY_SOURCE_ERROR_MESSAGE =
  "Kami tidak dapat membaca sumber publik ini. Periksa URL dan coba lagi.";

const LOCAL_DESTINATION_RATE_LIMITER: SourceDestinationRateLimiter = {
  limit: async () => ({ success: true }),
};

function rateLimitResponse(status = 429) {
  return NextResponse.json(
    {
      error:
        status === 503 ? RATE_LIMIT_UNAVAILABLE_MESSAGE : RATE_LIMITED_MESSAGE,
      code: status === 503 ? "RATE_LIMIT_UNAVAILABLE" : "RATE_LIMITED",
    },
    { status },
  );
}

export async function GET(request: Request) {
  const bindings = getAuditRateLimitBindings();
  if (!bindings.contextAvailable && process.env.NODE_ENV === "production") {
    return rateLimitResponse(503);
  }
  if (bindings.contextAvailable) {
    if (!bindings.identityCaller || !bindings.identityDestination) {
      return rateLimitResponse(503);
    }

    const allowed = await consumeRateLimit(
      bindings.identityCaller,
      callerIpFromRequest(request),
    );
    if (!allowed) return rateLimitResponse();
  }

  const source = new URL(request.url).searchParams.get("source") ?? "";
  const parsedSource = parseSourceInput(source);
  if (!parsedSource) {
    return NextResponse.json(
      {
        error: INVALID_SOURCE_INPUT_MESSAGE,
        code: "INVALID_SOURCE_INPUT",
      },
      { status: 400 },
    );
  }

  try {
    const identity = await fetchSourceIdentity(parsedSource, {
      destinationRateLimiter:
        bindings.identityDestination ?? LOCAL_DESTINATION_RATE_LIMITER,
    });
    return NextResponse.json(identity);
  } catch (error) {
    if (
      error instanceof SafeSourceFetchError &&
      error.code === "RATE_LIMITED"
    ) {
      return rateLimitResponse();
    }
    if (
      error instanceof SafeSourceFetchError &&
      error.code === "RATE_LIMIT_UNAVAILABLE"
    ) {
      return rateLimitResponse(503);
    }
    return NextResponse.json(
      {
        error: IDENTITY_SOURCE_ERROR_MESSAGE,
        code: "SOURCE_UNAVAILABLE",
      },
      { status: 400 },
    );
  }
}
