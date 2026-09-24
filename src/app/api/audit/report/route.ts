import { NextResponse } from "next/server";
import { z } from "zod";
import {
  auditObservationSchema,
  auditBudgetSchema,
  type AuditCallTelemetry,
  type AuditPrompt,
} from "@/lib/audit/types";
import {
  DIRECT_TEN_REPORT_CONTRACT_VERSION,
  directTenContextSchema,
} from "@/lib/audit/direct-ten-context-v2";
import {
  assertReportGenerationGate,
  createValidatedAuditReport,
  ReportPipelineError,
} from "@/lib/audit/report-pipeline";
import { liveGenerateReportContent } from "@/lib/audit/provider";
import {
  auditLiveCredentialsResponse,
  auditMode,
  auditSwitchResponse,
} from "@/lib/audit/deployment-gate";
import { enforceAuditCallerRateLimit } from "@/lib/audit/rate-limit";
import {
  AuditBudgetError,
  AuditCallExecutionError,
} from "@/lib/audit/telemetry";
import { parseAuditQuestionMethod } from "@/lib/audit/locked-question-pack";
import { generateSyntheticLocalReport } from "@/lib/audit/local-direct-ten-audit";

export const runtime = "nodejs";

const sharedRequestFields = {
  client_contract_version: z.literal(DIRECT_TEN_REPORT_CONTRACT_VERSION),
  context: directTenContextSchema,
  observations: z.array(auditObservationSchema).length(10),
  safety_identifier: z.string().min(8).max(64),
  budget: auditBudgetSchema,
} as const;

/** Spec 009 direct-ten wire shape — only the locating id, the exact approved
 * text, and the human-review marker travel the boundary. */
const directTenPromptSchema = z.object({
  prompt_id: z.string(),
  question: z.string().trim().min(1).max(700),
  review_status: z.literal("needs_human_review"),
});

const directTenRequestSchema = z
  .object({
    ...sharedRequestFields,
    question_method: z.literal("direct-ten"),
    prompts: z.array(directTenPromptSchema).length(10),
  })
  .strict();

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
  // Spec 010 R-01/R-02b: the switch answers 404 before the body is read.
  const switchedOff = auditSwitchResponse();
  if (switchedOff) return switchedOff;
  let successfulReportCalls: AuditCallTelemetry[] = [];
  try {
    const rawInput = (await request.json()) as unknown;
    // R-02a: only "direct-ten" is accepted — an omitted method no longer
    // defaults to canonical, and canonical/unknown values are 400 before
    // schema work, rate limiting, credentials or provider work.
    const rawMethod =
      rawInput && typeof rawInput === "object" && !Array.isArray(rawInput)
        ? (rawInput as Record<string, unknown>).question_method
        : undefined;
    const questionMethod = parseAuditQuestionMethod(rawMethod);
    if (questionMethod !== "direct-ten") {
      return NextResponse.json(
        {
          error:
            'Unrecognized question_method — the audit accepts only "direct-ten".',
        },
        { status: 400 },
      );
    }

    // R-03: per-IP burst protection on the report boundary.
    const rateLimited = await enforceAuditCallerRateLimit(
      request,
      (bindings) => bindings.reportCaller,
    );
    if (rateLimited) return rateLimited;

    // R-02: server-selected mode; a missing live credential stops the stage
    // before body validation — never a silent synthetic fallback.
    const credentialsError = auditLiveCredentialsResponse("report generation");
    if (credentialsError) return credentialsError;
    const substituteProvider = auditMode() === "synthetic";

    const input = directTenRequestSchema.parse(rawInput);
    // R-19 is enforced here before synthesis and again inside the pipeline so
    // direct library/script callers cannot bypass the ten-of-ten gate.
    // The method dispatcher inside the lock boundary owns final interpretation;
    // direct-ten wire prompts are deliberately thin (id/question/review_status).
    const lockedInput = {
      ...input,
      brief: input.context,
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
      // The real /audit client folds this exact server-produced report
      // telemetry into the same-session evidence ledger. It is not
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
