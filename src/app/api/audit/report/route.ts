import { NextResponse } from "next/server";
import { auditBudgetSchema, reportRequestSchema } from "@/lib/audit/types";
import {
  assertReportGenerationGate,
  createValidatedAuditReport,
  ReportPipelineError,
} from "@/lib/audit/report-pipeline";
import {
  assertLiveProviderCredentialsConfigured,
  liveGenerateReportContent,
} from "@/lib/audit/provider";
import {
  AuditBudgetError,
  AuditCallExecutionError,
} from "@/lib/audit/telemetry";
import type { AuditCallTelemetry } from "@/lib/audit/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let successfulReportCalls: AuditCallTelemetry[] = [];
  try {
    const input = reportRequestSchema
      .extend({ budget: auditBudgetSchema })
      .parse(await request.json());
    assertLiveProviderCredentialsConfigured();
    // R-19 is enforced here before synthesis and again inside the pipeline so
    // direct library/script callers cannot bypass the ten-of-ten gate.
    assertReportGenerationGate(input);
    const report = await createValidatedAuditReport(
      input,
      liveGenerateReportContent,
      (calls) => {
        successfulReportCalls = calls;
      },
    );
    return NextResponse.json({
      report,
      // The real /audit client carries this exact server-produced report
      // telemetry into the immediately following variance request. It is not
      // trusted for method assertions, but it preserves the same-session cost
      // ledger without rerunning completed observations.
      telemetry: successfulReportCalls,
    });
  } catch (error) {
    if (error instanceof ReportPipelineError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          telemetry: error.telemetry,
        },
        { status: error.status },
      );
    }
    if (error instanceof AuditCallExecutionError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "REPORT_TRANSIENT_FAILURE",
          telemetry: error.telemetry,
        },
        { status: error.status },
      );
    }
    if (error instanceof AuditBudgetError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "REPORT_LIMIT_EXHAUSTED",
          telemetry: [],
        },
        { status: error.status },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Kami tidak dapat membuat laporan audit.",
        code: "REPORT_INTEGRITY_FAILURE",
        telemetry: [],
      },
      { status: 400 },
    );
  }
}
