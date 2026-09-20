import { NextResponse } from "next/server";
import { z } from "zod";
import { extractionRequestSchema, auditBudgetSchema } from "@/lib/audit/types";
import { liveExtractBusinessDraft } from "@/lib/audit/provider";
import {
  auditLiveCredentialsResponse,
  auditMode,
  auditSwitchResponse,
} from "@/lib/audit/deployment-gate";
import {
  AuditBudgetError,
  AuditCallExecutionError,
  configuredAuditCarryoverCostUsd,
} from "@/lib/audit/telemetry";
import {
  INVALID_SOURCE_INPUT_MESSAGE,
  parseSourceInput,
} from "@/lib/audit/source-input";
import {
  callerIpFromRequest,
  consumeRateLimit,
  getAuditRateLimitBindings,
  RATE_LIMITED_MESSAGE,
  RATE_LIMIT_UNAVAILABLE_MESSAGE,
} from "@/lib/audit/rate-limit";
import { syntheticLocalExtraction } from "@/lib/audit/local-direct-ten-audit";

export const runtime = "nodejs";

function extractionRateLimitResponse(status: 429 | 503) {
  return NextResponse.json(
    {
      error:
        status === 503 ? RATE_LIMIT_UNAVAILABLE_MESSAGE : RATE_LIMITED_MESSAGE,
      code: status === 503 ? "RATE_LIMIT_UNAVAILABLE" : "RATE_LIMITED",
      telemetry: [],
    },
    { status },
  );
}

async function enforceExtractionRateLimit(
  request: Request,
): Promise<Response | null> {
  const bindings = getAuditRateLimitBindings();
  if (!bindings.contextAvailable && process.env.NODE_ENV === "production") {
    return extractionRateLimitResponse(503);
  }
  if (!bindings.contextAvailable) return null;
  if (!bindings.extractCaller) return extractionRateLimitResponse(503);

  const rateLimitDecision = await consumeRateLimit(
    bindings.extractCaller,
    callerIpFromRequest(request),
  );
  if (rateLimitDecision === "unavailable") {
    return extractionRateLimitResponse(503);
  }
  return rateLimitDecision === "allowed"
    ? null
    : extractionRateLimitResponse(429);
}

export async function GET(request: Request) {
  // Spec 010 R-01/R-02b: the switch answers 404 before anything else.
  const switchedOff = auditSwitchResponse();
  if (switchedOff) return switchedOff;

  const rateLimitError = await enforceExtractionRateLimit(request);
  if (rateLimitError) return rateLimitError;

  try {
    return NextResponse.json({
      limit_usd: 5,
      carryover_cost_usd: configuredAuditCarryoverCostUsd(),
      calls: [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Pengendali biaya privat tidak tersedia.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  // Spec 010 R-01/R-02b: switch → rate limit → mode/credentials → body
  // validation → provider work.
  const switchedOff = auditSwitchResponse();
  if (switchedOff) return switchedOff;

  const rateLimitError = await enforceExtractionRateLimit(request);
  if (rateLimitError) return rateLimitError;

  // Server-selected mode only — no request parameter can change it. In live
  // mode a missing credential stops the stage before body validation, never
  // falling back to the substitute.
  const mode = auditMode();
  const credentialsError = auditLiveCredentialsResponse("extraction");
  if (credentialsError) return credentialsError;

  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        {
          error: "Periksa data audit yang dikirim dan coba lagi.",
          code: "INVALID_REQUEST",
        },
        { status: 400 },
      );
    }

    const record = body as Record<string, unknown>;
    const normalizedSource = parseSourceInput(
      typeof record.website_url === "string" ? record.website_url : "",
    );
    if (!normalizedSource) {
      return NextResponse.json(
        {
          error: INVALID_SOURCE_INPUT_MESSAGE,
          code: "INVALID_SOURCE_INPUT",
          telemetry: [],
        },
        { status: 400 },
      );
    }

    const input = extractionRequestSchema
      .extend({ budget: auditBudgetSchema })
      .parse({ ...record, website_url: normalizedSource.normalizedUrl });

    // Spec 010 R-02: synthetic mode serves the labeled substitute at this
    // same boundary; live mode runs the real extraction. `preparation_mode`
    // is the response's explicit provenance either way. A legacy `local_mode`
    // field is ignored — the server selects the mode.
    if (mode === "synthetic") {
      return NextResponse.json({
        ...syntheticLocalExtraction(input),
        preparation_mode: "synthetic-local",
      });
    }
    return NextResponse.json({
      ...(await liveExtractBusinessDraft(input)),
      preparation_mode: "live",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Periksa data audit yang dikirim dan coba lagi.",
          code: "INVALID_REQUEST",
          telemetry: [],
        },
        { status: 400 },
      );
    }
    if (error instanceof AuditCallExecutionError) {
      return NextResponse.json(
        { error: error.message, telemetry: error.telemetry },
        { status: error.status },
      );
    }
    if (error instanceof AuditBudgetError) {
      return NextResponse.json(
        { error: error.message, telemetry: [] },
        { status: error.status },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Kami tidak dapat menganalisis sumber ini.",
        telemetry: [],
      },
      { status: 400 },
    );
  }
}
