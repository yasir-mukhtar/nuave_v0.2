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
  auditLiveExecutionAuthorized,
  glmExperimentEnabled,
} from "@/lib/intake/glm-local";
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

  // Spec 009 founder-local reading phase: `local_mode` marks the local
  // session and the SERVER selects the preparation mode — "synthetic" pins
  // the labeled substitute; "auto" takes the real source fetch only under
  // the explicit live authorization and stays offline otherwise. The mode
  // exists only inside the local experiment flag; any other value — or the
  // flag off — fails closed before any fetch. `preparation_mode` in the
  // response is the explicit provenance of whichever path served.
  const localMode = params.get("local_mode");
  if (localMode !== null) {
    if (
      !glmExperimentEnabled() ||
      (localMode !== "auto" && localMode !== "synthetic")
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const live = localMode === "auto" && auditLiveExecutionAuthorized();
    if (!live) {
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
      return sourceUnavailableResponse();
    }
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
    if (error instanceof SafeSourceFetchError && error.code === "HTTP_ERROR") {
      // Never expose the upstream status or error-page title to the client.
      return sourceUnavailableResponse();
    }
    return sourceUnavailableResponse();
  }
}
