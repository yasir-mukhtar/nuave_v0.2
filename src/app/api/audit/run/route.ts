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
  validateIndonesianQuestionPack,
} from "@/lib/audit/questions-id";
import { productionObservationMethodErrors } from "@/lib/audit/production-observation-method";
import { runAuditObservations } from "@/lib/audit/run-orchestrator";
import { encodeAuditRunEvent, type AuditRunEvent } from "@/lib/audit/stream";

export const runtime = "nodejs";

const requestSchema = z.object({
  client_contract_version: z.literal(AUDIT_CLIENT_CONTRACT_VERSION),
  brief: businessBriefSchema,
  prompts: z.array(promptSchema).length(10),
  safety_identifier: z.string().min(8).max(64),
  // `budget.calls` (this session's running spend ledger) is client-supplied
  // and not independently verified against any server-side store — see
  // `effectiveAuditCarryoverCostUsd` in telemetry.ts for why (O-7, Phase 3
  // fix-round-2 adversarial review). Only `resume_observations`' telemetry
  // below is folded in from a source the route itself validated.
  budget: auditBudgetSchema,
  // Spec 003 R-19 (failure-and-recovery): completed observations from an
  // interrupted run are preserved and resumed; they are never rerun. The
  // route folds their telemetry into the server-side budget (deduped).
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

    assertLiveProviderCredentialsConfigured();
    const input = requestSchema.parse(rawInput);

    // The live run path validates the LOCKED INDONESIAN question pack (Spec
    // 002/003): leakage, unsupported premises, distinctness, and executable
    // questions. The English matrix validator (`validatePromptPack`) is for
    // the deterministic English pack only.
    const minimized = minimizeIndonesianBrief(input.brief);
    const questionErrors = validateIndonesianQuestionPack(
      input.prompts.map((prompt) => prompt.question),
      minimized,
    );
    const blockers = indonesianPackBlockers(
      input.prompts.map((prompt) => prompt.question),
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

    // Resume validation: only completed observations for locked questions,
    // one per question, never duplicated, and only evidence produced by the
    // currently protected OpenCode Go + GPT-5.6 Luna observation method.
    const resume = input.resume_observations ?? [];
    const lockedIds = new Set(input.prompts.map((prompt) => prompt.prompt_id));
    const resumeErrors: string[] = [];
    const resumedIds = new Set<string>();
    for (const observation of resume) {
      if (observation.run_status !== "completed") {
        resumeErrors.push(
          `${observation.prompt_id}: only completed observations can be resumed.`,
        );
      }
      if (!lockedIds.has(observation.prompt_id)) {
        resumeErrors.push(
          `${observation.prompt_id}: not one of the locked questions.`,
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

    // Server-side cost accounting: fold the resumed observations' telemetry
    // into the session budget (deduped by response id) so no call is counted
    // twice and the ceiling guard sees the true spend.
    const seenCalls = new Set<string>();
    const foldedCalls = [
      ...input.budget.calls,
      ...resume.flatMap((o) => o.telemetry),
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
        const send = (event: AuditRunEvent) =>
          controller.enqueue(encoder.encode(encodeAuditRunEvent(event)));
        try {
          // Spec 003 R-17/R-19: targeted 1+2 retry per question under the same
          // locked configuration; every attempt is persisted; a valid result
          // is never rerun (resumed observations are preserved); the ten-of-ten
          // gate decides the terminal event, which carries the complete
          // per-attempt provenance (R-20).
          await runAuditObservations({
            prompts: input.prompts,
            brief: input.brief,
            safety_identifier: input.safety_identifier,
            budget,
            execute: liveExecuteAuditPrompt,
            emit: send,
            resume: { observations: resume },
          });
        } catch (error) {
          send({
            type: "fatal_error",
            message:
              error instanceof Error
                ? error.message
                : "We couldn't run the audit.",
          });
        } finally {
          controller.close();
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
