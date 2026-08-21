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
  ReportPipelineError,
  assertReportGenerationGate,
  createValidatedAuditReport,
} from "@/lib/audit/report-pipeline";
import { assertLiveProviderCredentialsConfigured } from "@/lib/audit/provider";
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
  try {
    assertLiveProviderCredentialsConfigured();
    const input = requestSchema.parse(await request.json());
    // Spec 003 R-19: the ten-of-ten gate runs BEFORE any provider call — no
    // report synthesis begins unless all ten unique locked prompts have one
    // evaluable, structurally valid observation. No partial report exists.
    assertReportGenerationGate(input);
    const telemetry: AuditCallTelemetry[] = [];
    const report = await createValidatedAuditReport(
      { ...input, language: "id" },
      undefined,
      (calls) => telemetry.push(...calls),
    );
    return NextResponse.json({ report, telemetry });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "We couldn't create the report.",
        telemetry:
          error instanceof ReportPipelineError ||
          error instanceof AuditCallExecutionError
            ? error.telemetry
            : [],
      },
      {
        status:
          error instanceof ReportPipelineError ||
          error instanceof AuditBudgetError ||
          error instanceof AuditCallExecutionError
            ? error.status
            : 400,
      },
    );
  }
}
