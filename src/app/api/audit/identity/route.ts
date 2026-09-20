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
import {
  auditLiveCredentialsResponse,
  auditMode,
  auditSwitchResponse,
} from "@/lib/audit/deployment-gate";
import { syntheticLocalIdentity } from "@/lib/audit/local-direct-ten-audit";
import { SYNTHETIC_LOCAL_FIXTURE_SYSTEM } from "@/lib/audit/types";

export const runtime = "nodejs";

const IDENTITY_SOURCE_ERROR_MESSAGE =
  "Kami tidak dapat membaca sumber publik ini. Periksa URL dan coba lagi.";
const IDENTITY_SOURCE_ERROR_CODE = "SOURCE_UNAVAILABLE" as const;

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

function sourceUnavailableResponse() {
  return NextResponse.json(
    {
      error: IDENTITY_SOURCE_ERROR_MESSAGE,
      code: IDENTITY_SOURCE_ERROR_CODE,
    },
    { status: 400 },
  );
}

export async function GET(request: Request) {
  // Spec 010 R-01/R-02b: the switch answers 404 before anything else.
  const switchedOff = auditSwitchResponse();
  if (switchedOff) return switchedOff;

  const bindings = getAuditRateLimitBindings();
  if (!bindings.contextAvailable && process.env.NODE_ENV === "production") {
    return rateLimitResponse(503);
  }
  if (bindings.contextAvailable) {
    if (!bindings.identityCaller || !bindings.identityDestination) {
      return rateLimitResponse(503);
    }

    const rateLimitDecision = await consumeRateLimit(
      bindings.identityCaller,
      callerIpFromRequest(request),
    );
    if (rateLimitDecision === "unavailable") return rateLimitResponse(503);
    if (rateLimitDecision === "limited") return rateLimitResponse();
  }

  // Spec 010 R-02: server-selected mode only — a legacy `local_mode` query
  // parameter is ignored. In live mode a missing credential stops the stage
  // before parameter validation, never falling back to the substitute.
  const mode = auditMode();
  const credentialsError = auditLiveCredentialsResponse("identity");
  if (credentialsError) return credentialsError;

  const params = new URL(request.url).searchParams;
  const source = params.get("source") ?? "";
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

  // Synthetic mode serves the labeled substitute at this same boundary;
  // `preparation_mode` is the response's explicit provenance.
  if (mode === "synthetic") {
    return NextResponse.json({
      ...syntheticLocalIdentity(parsedSource),
      substitute: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
      preparation_mode: "synthetic-local",
    });
  }

  try {
    const identity = await fetchSourceIdentity(parsedSource, {
      destinationRateLimiter:
        bindings.identityDestination ?? LOCAL_DESTINATION_RATE_LIMITER,
    });
    return NextResponse.json({ ...identity, preparation_mode: "live" });
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
    if (error instanceof SafeSourceFetchError && error.code === "HTTP_ERROR") {
      // Never expose the upstream status or error-page title to the client.
      return sourceUnavailableResponse();
    }
    return sourceUnavailableResponse();
  }
}
