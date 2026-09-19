import { NextResponse } from "next/server";
import { z } from "zod";
import {
  auditObservationSchema,
  auditBudgetSchema,
  businessBriefSchema,
  promptSchema,
  type AuditCallTelemetry,
  type AuditPrompt,
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
import { parseAuditQuestionMethod } from "@/lib/audit/locked-question-pack";
import {
  auditLiveExecutionAuthorized,
  glmExperimentEnabled,
} from "@/lib/intake/glm-local";
import { generateSyntheticLocalReport } from "@/lib/audit/local-direct-ten-audit";

export const runtime = "nodejs";

const sharedRequestFields = {
  brief: businessBriefSchema,
  observations: z.array(auditObservationSchema).length(10),
  safety_identifier: z.string().min(8).max(64),
  budget: auditBudgetSchema,
} as const;

const canonicalRequestSchema = z.object({
  ...sharedRequestFields,
  question_method: z.literal("canonical").default("canonical"),
  prompts: z.array(promptSchema).length(10),
});

/** Spec 009 direct-ten wire shape — only the locating id, the exact approved
 * text, and the human-review marker travel the boundary. */
const directTenPromptSchema = z.object({
  prompt_id: z.string(),
  question: z.string().trim().min(1).max(700),
  review_status: z.literal("needs_human_review"),
});

const directTenRequestSchema = z.object({
  ...sharedRequestFields,
  question_method: z.literal("direct-ten"),
  prompts: z.array(directTenPromptSchema).length(10),
});

type DiagnosticAuditCallTelemetry = AuditCallTelemetry & {
  report_diagnostics?: string[];
};

function reportDiagnostics(calls: AuditCallTelemetry[]) {
  return [
    ...new Set(
      calls.flatMap((call) => {
        const value = (call as DiagnosticAuditCallTelemetry).report_diagnostics;
        return Array.isArray(value) ? value : [];
      }),
    ),
  ];
}

export async function POST(request: Request) {
  let successfulReportCalls: AuditCallTelemetry[] = [];
  try {
    const rawInput = (await request.json()) as unknown;
    const rawMethod =
      rawInput && typeof rawInput === "object" && !Array.isArray(rawInput)
        ? ((rawInput as Record<string, unknown>).question_method ?? "canonical")
        : "canonical";
    const questionMethod = parseAuditQuestionMethod(rawMethod);
    if (!questionMethod) {
      return NextResponse.json(
        { error: "Unrecognized question_method." },
        { status: 422 },
      );
    }
    // Spec 009 R-08: direct-ten is founder-local only — outside the local
    // experiment flag on a non-production server it fails closed before
    // schema work, credentials, or any provider call. Canonical unaffected.
    if (questionMethod === "direct-ten" && !glmExperimentEnabled()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Spec 009 local mode: same substitute rule as /api/audit/run — the
    // labeled synthetic generator drives the real pipeline until
    // NUAVE_AUDIT_LIVE_AUTHORIZED switches this flow to live provider calls.
    const substituteProvider =
      questionMethod === "direct-ten" && !auditLiveExecutionAuthorized();
    const input = (
      questionMethod === "direct-ten"
        ? directTenRequestSchema
        : canonicalRequestSchema
    ).parse(rawInput);
    if (!substituteProvider) assertLiveProviderCredentialsConfigured();
    // R-19 is enforced here before synthesis and again inside the pipeline so
    // direct library/script callers cannot bypass the ten-of-ten gate.
    // The method dispatcher inside the lock boundary owns final interpretation;
    // direct-ten wire prompts are deliberately thin (id/question/review_status).
    const lockedInput = {
      ...input,
      prompts: input.prompts as AuditPrompt[],
      language: "id" as const,
      question_method: questionMethod,
      // Server-internal only: the substitute's observations carry the
      // synthetic fixture label, which the evidence gate admits solely under
      // this flag — never by client request.
      ...(substituteProvider ? { allow_synthetic_evidence: true } : {}),
    };
    assertReportGenerationGate(lockedInput);
    const report = await createValidatedAuditReport(
      lockedInput,
      substituteProvider
        ? generateSyntheticLocalReport
        : liveGenerateReportContent,
      (calls) => {
        successfulReportCalls = calls;
      },
    );
    return NextResponse.json({
      report,
      // The real /audit client carries this exact server-produced report
      // telemetry into the immediately following variance request. It is not
      // trusted for method assertions, but it preserves the same-session cost
      // ledger without rerunning completed observations. Recoverable internal
      // report diagnostics ride on report-stage telemetry so browser-session
      // evidence keeps them after the network request is gone.
      telemetry: successfulReportCalls,
      diagnostics: reportDiagnostics(successfulReportCalls),
    });
  } catch (error) {
    if (error instanceof ReportPipelineError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          telemetry: error.telemetry,
          diagnostics: error.diagnostics,
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
          diagnostics: [],
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
          diagnostics: [],
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
        diagnostics: ["unrecoverable_report_failure"],
      },
      { status: 400 },
    );
  }
}
