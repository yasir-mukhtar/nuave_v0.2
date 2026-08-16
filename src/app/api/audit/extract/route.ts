import { NextResponse } from "next/server";
import {
  AUDIT_COST_LIMIT_USD,
  auditBudgetSchema,
  extractionRequestSchema,
} from "@/lib/audit/types";
import { extractBusinessDraft } from "@/lib/audit/provider";
import {
  AuditBudgetError,
  AuditCallExecutionError,
  configuredAuditCarryoverCostUsd,
} from "@/lib/audit/telemetry";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({
      limit_usd: AUDIT_COST_LIMIT_USD,
      carryover_cost_usd: configuredAuditCarryoverCostUsd(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The private cost guard is unavailable.",
      },
      { status: error instanceof AuditBudgetError ? error.status : 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const input = extractionRequestSchema
      .extend({ budget: auditBudgetSchema })
      .parse(await request.json());
    return NextResponse.json(await extractBusinessDraft(input));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "We couldn't analyze this website.",
        telemetry:
          error instanceof AuditCallExecutionError ? error.telemetry : [],
      },
      {
        status:
          error instanceof AuditBudgetError ||
          error instanceof AuditCallExecutionError
            ? error.status
            : 400,
      },
    );
  }
}
