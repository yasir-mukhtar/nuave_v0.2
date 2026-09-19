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
  promptSchema,
} from "@/lib/audit/types";
import {
  assertLiveProviderCredentialsConfigured,
  liveExecuteAuditPrompt,
} from "@/lib/audit/provider";
import {
  indonesianPackBlockers,
  minimizeIndonesianBrief,
  validateCanonicalIndonesianQuestionPack,
} from "@/lib/audit/questions-id";
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
import {
  auditLiveExecutionAuthorized,
  glmExperimentEnabled,
} from "@/lib/intake/glm-local";
import { executeSyntheticLocalObservation } from "@/lib/audit/local-direct-ten-audit";

export const runtime = "nodejs";

const sharedRequestFields = {
  client_contract_version: z.literal(AUDIT_CLIENT_CONTRACT_VERSION),
  brief: businessBriefSchema,
  safety_identifier: z.string().min(8).max(64),
  budget: auditBudgetSchema,
  resume_observations: z.array(auditObservationSchema).max(10).optional(),
} as const;

const canonicalRequestSchema = z.object({
  ...sharedRequestFields,
  // Absent = historical canonical client; an explicit "canonical" is the
  // same method named deliberately.
  question_method: z.literal("canonical").default("canonical"),
  prompts: z.array(promptSchema).length(10),
});

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
  try {
    const rawInput = (await request.json()) as unknown;
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

    // Explicit method dispatch — never inferred. An absent value is the
    // historical canonical pack; an unknown value fails closed before any
    // parse, credential check, or provider work.
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
    // Spec 009 R-08: the direct-ten method is founder-local only. Outside the
    // local experiment flag on a non-production server it fails closed —
    // before schema work, credentials, or any provider call. Canonical is
    // unaffected.
    if (questionMethod === "direct-ten" && !glmExperimentEnabled()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Spec 009 local mode: direct-ten runs the labeled synthetic substitute at
    // this same boundary until the founder explicitly authorizes live provider
    // execution (NUAVE_AUDIT_LIVE_AUTHORIZED). The substitute needs no
    // credentials; the live path asserts them as usual.
    const substituteProvider =
      questionMethod === "direct-ten" && !auditLiveExecutionAuthorized();
    const input = (
      questionMethod === "direct-ten"
        ? directTenRequestSchema
        : canonicalRequestSchema
    ).parse(rawInput);
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
    const questionErrors =
      questionMethod === "direct-ten"
        ? validateDirectTenQuestions(questions, {
            brief: minimized,
            comparators: minimized.comparison_business
              ? [minimized.comparison_business.name]
              : [],
          })
        : validateCanonicalIndonesianQuestionPack(questions, minimized);
    const blockers =
      questionMethod === "direct-ten"
        ? []
        : indonesianPackBlockers(questions, minimized);
    if (questionErrors.length || blockers.length) {
      return NextResponse.json(
        {
          error: [
            ...questionErrors.map((issue) => issue.message),
            ...blockers,
          ].join(" "),
        },
        { status: 422 },
      );
    }

    if (!substituteProvider) assertLiveProviderCredentialsConfigured();

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
