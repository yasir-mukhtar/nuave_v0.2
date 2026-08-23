import { NextResponse } from "next/server";
import { z } from "zod";
import { extractionRequestSchema, auditBudgetSchema } from "@/lib/audit/types";
import {
  assertLiveProviderCredentialsConfigured,
  liveExtractBusinessDraft,
} from "@/lib/audit/provider";
import {
  AuditBudgetError,
  AuditCallExecutionError,
  configuredAuditCarryoverCostUsd,
} from "@/lib/audit/telemetry";
import {
  INVALID_SOURCE_INPUT_MESSAGE,
  parseSourceInput,
} from "@/lib/audit/source-input";

export const runtime = "nodejs";

export async function GET() {
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

    // Validate the complete request before touching the protected provider
    // boundary. Invalid source/input requests therefore make zero calls.
    assertLiveProviderCredentialsConfigured();
    return NextResponse.json(await liveExtractBusinessDraft(input));
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
