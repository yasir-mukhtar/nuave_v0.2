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
import {
  canonicalLockedQuestionPack,
  lockedObservationBindingErrors,
} from "@/lib/audit/locked-question-pack";
import { assertSafeComparisonBusinessUrls } from "@/lib/audit/similar-businesses";
import { productionObservationMethodErrors } from "@/lib/audit/production-observation-method";
import { runAuditObservations } from "@/lib/audit/run-orchestrator";
import { encodeAuditRunEvent, type AuditRunEvent } from "@/lib/audit/stream";

export const runtime = "nodejs";

const requestSchema = z.object({
  client_contract_version: z.literal(AUDIT_CLIENT_CONTRACT_VERSION),
  brief: businessBriefSchema,
  prompts: z.array(promptSchema).length(10),
  safety_identifier: z.string().min(8).max(64),
  budget: auditBudgetSchema,
  resume_observations: z.array(auditObservationSchema).max(10).optional(),
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

    const input = requestSchema.parse(rawInput);
    assertSafeComparisonBusinessUrls(input.brief);

    // Lock identity and exact text before credentials or any paid provider work.
    const lockedPack = canonicalLockedQuestionPack(input.prompts, input.brief);
    const lockedPrompts = lockedPack.prompts;
    const minimized = minimizeIndonesianBrief(input.brief);
    const questionErrors = validateCanonicalIndonesianQuestionPack(
      lockedPrompts.map((prompt) => prompt.question),
      minimized,
    );
    const blockers = indonesianPackBlockers(
      lockedPrompts.map((prompt) => prompt.question),
      minimized,
    );
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

    assertLiveProviderCredentialsConfigured();

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
    resumeErrors.push(
      ...lockedObservationBindingErrors({
        prompts: lockedPrompts,
        observations: resume,
        brief: input.brief,
      }),
      ...productionObservationMethodErrors(
        resume.filter((observation) => observation.run_status === "completed"),
      ),
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
            execute: liveExecuteAuditPrompt,
            emit: send,
            resume: { observations: resume },
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
