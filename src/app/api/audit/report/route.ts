import { NextResponse } from "next/server";
import { z } from "zod";
import {
  auditObservationSchema,
  auditBudgetSchema,
  businessBriefSchema,
  promptSchema,
  type AuditCallTelemetry,
} from "@/lib/audit/types";
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

export const runtime = "nodejs";

const requestSchema = z.object({
  brief: businessBriefSchema,
  prompts: z.array(promptSchema).length(10),
  observations: z.array(auditObservationSchema).length(10),
  safety_identifier: z.string().min(8).max(64),
  budget: auditBudgetSchema,
});

export async function POST(request: Request) {
  let successfulReportCalls: AuditCallTelemetry[] = [];
  try {
    const input = requestSchema.parse(await request.json());
    assertLiveProviderCredentialsConfigured();
    // R-19 is enforced here before synthesis and again inside the pipeline so
    // direct library/script callers cannot bypass the ten-of-ten gate.
    assertReportGenerationGate({ ...input, language: "id" });
    const report = await createValidatedAuditReport(
      { ...input, language: "id" },
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
