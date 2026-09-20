import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AUDIT_CLIENT_CONTRACT_VERSION,
  AUDIT_CLIENT_UPDATE_REQUIRED_CODE,
  AUDIT_CLIENT_UPDATE_REQUIRED_MESSAGE,
  isCurrentAuditClientContract,
} from "@/lib/audit/client-contract";
import {
  auditBudgetSchema,
  auditObservationSchema,
  businessBriefSchema,
} from "@/lib/audit/types";
import { liveExecuteAuditPrompt } from "@/lib/audit/provider";
import {
  auditLiveCredentialsResponse,
  auditMode,
  auditSwitchResponse,
} from "@/lib/audit/deployment-gate";
import { enforceAuditCallerRateLimit } from "@/lib/audit/rate-limit";
import { minimizeIndonesianBrief } from "@/lib/audit/questions-id";
import { validateDirectTenQuestions } from "@/lib/audit/questions-id-direct-ten";
import {
  lockedObservationBindingErrors,
  lockedQuestionPackForMethod,
  parseAuditQuestionMethod,
} from "@/lib/audit/locked-question-pack";
import { assertSafeComparisonBusinessUrls } from "@/lib/audit/similar-businesses";
import {
  productionObservationMethodErrors,
  syntheticLocalObservationMethodErrors,
} from "@/lib/audit/production-observation-method";
import { runAuditObservations } from "@/lib/audit/run-orchestrator";
import { encodeAuditRunEvent, type AuditRunEvent } from "@/lib/audit/stream";
import { executeSyntheticLocalObservation } from "@/lib/audit/local-direct-ten-audit";

export const runtime = "nodejs";

const sharedRequestFields = {
  client_contract_version: z.literal(AUDIT_CLIENT_CONTRACT_VERSION),
  brief: businessBriefSchema,
  safety_identifier: z.string().min(8).max(64),
  budget: auditBudgetSchema,
  resume_observations: z.array(auditObservationSchema).max(10).optional(),
} as const;

/** Spec 009 direct-ten wire shape: the pack boundary carries only the stable
 * locating id, the exact approved text, and the human-review marker. No slot
 * metadata exists to send, and none may be fabricated client-side. */
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

export async function POST(request: Request) {
  // Spec 010 R-01/R-02b: the switch answers 404 before the body is read.
  const switchedOff = auditSwitchResponse();
  if (switchedOff) return switchedOff;
  try {
    const rawInput = (await request.json()) as unknown;

    // R-02a: the public run boundary accepts only "direct-ten". An omitted
    // method no longer defaults to canonical; canonical, glm-slots and any
    // unknown value are 400 before schema work, rate limiting, credentials
    // or provider work. The legacy canonical branch was archived with the
    // old flow (R-09).
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

    // R-03: per-IP burst protection on the run boundary.
    const rateLimited = await enforceAuditCallerRateLimit(
      request,
      (bindings) => bindings.runCaller,
    );
    if (rateLimited) return rateLimited;

    // R-02: server-selected mode. In live mode a missing credential stops the
    // stage before body validation — never a silent synthetic fallback.
    const credentialsError = auditLiveCredentialsResponse("observations");
    if (credentialsError) return credentialsError;
    const substituteProvider = auditMode() === "synthetic";

    const clientContractVersion =
      rawInput && typeof rawInput === "object" && !Array.isArray(rawInput)
        ? (rawInput as Record<string, unknown>).client_contract_version
        : undefined;
    if (!isCurrentAuditClientContract(clientContractVersion)) {
      return NextResponse.json(
        {
          error: AUDIT_CLIENT_UPDATE_REQUIRED_MESSAGE,
          code: AUDIT_CLIENT_UPDATE_REQUIRED_CODE,
        },
        { status: 409 },
      );
    }

    const input = directTenRequestSchema.parse(rawInput);
    assertSafeComparisonBusinessUrls(input.brief);

    // Lock identity and exact text before credentials or any paid provider work.
    const lockedPack = lockedQuestionPackForMethod({
      prompts: input.prompts,
      brief: input.brief,
      questionMethod,
    });
    const lockedPrompts = lockedPack.prompts;
    const minimized = minimizeIndonesianBrief(input.brief);
    const questions = lockedPrompts.map((prompt) => prompt.question);
    const questionErrors = validateDirectTenQuestions(questions, {
      brief: minimized,
      comparators: minimized.comparison_business
        ? [minimized.comparison_business.name]
        : [],
    });
    if (questionErrors.length) {
      return NextResponse.json(
        { error: questionErrors.map((issue) => issue.message).join(" ") },
        { status: 422 },
      );
    }

    const resume = input.resume_observations ?? [];
    const resumeErrors: string[] = [];
    const resumedIds = new Set<string>();
    for (const observation of resume) {
      if (observation.run_status !== "completed") {
        resumeErrors.push(
          `${observation.prompt_id}: only completed observations can be resumed.`,
        );
      }
      if (resumedIds.has(observation.prompt_id)) {
        resumeErrors.push(
          `${observation.prompt_id}: duplicate resume observation.`,
        );
      }
      resumedIds.add(observation.prompt_id);
    }
    const completedResume = resume.filter(
      (observation) => observation.run_status === "completed",
    );
    resumeErrors.push(
      ...lockedObservationBindingErrors({
        prompts: lockedPrompts,
        observations: resume,
        brief: input.brief,
        questionMethod,
      }),
      // The resume-evidence method gate matches the execution mode: the
      // founder-local substitute path accepts only labeled synthetic-local
      // observations; live and canonical keep the protected production gate.
      ...(substituteProvider
        ? syntheticLocalObservationMethodErrors(completedResume)
        : productionObservationMethodErrors(completedResume)),
    );
    if (resumeErrors.length) {
      return NextResponse.json(
        { error: resumeErrors.join(" ") },
        { status: 422 },
      );
    }

    const seenCalls = new Set<string>();
    const foldedCalls = [
      ...input.budget.calls,
      ...resume.flatMap((observation) => observation.telemetry),
    ].filter((call) => {
      const key =
        call.response_id || `${call.stage}:${call.attempt}:${call.started_at}`;
      if (seenCalls.has(key)) return false;
      seenCalls.add(key);
      return true;
    });
    const budget = { ...input.budget, calls: foldedCalls };

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: AuditRunEvent) => {
          if (request.signal.aborted) return;
          controller.enqueue(encoder.encode(encodeAuditRunEvent(event)));
        };
        try {
          await runAuditObservations({
            prompts: lockedPrompts,
            brief: input.brief,
            safety_identifier: input.safety_identifier,
            budget,
            execute: substituteProvider
              ? executeSyntheticLocalObservation
              : liveExecuteAuditPrompt,
            emit: send,
            resume: {
              observations: resume,
              allowSynthetic: substituteProvider,
            },
            signal: request.signal,
          });
        } catch (error) {
          if (!request.signal.aborted) {
            send({
              type: "fatal_error",
              message:
                error instanceof Error
                  ? error.message
                  : "We couldn't run the audit.",
            });
          }
        } finally {
          try {
            controller.close();
          } catch {
            // The browser may already have cancelled the response stream.
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "We couldn't run the audit.",
      },
      { status: 400 },
    );
  }
}
