import { NextResponse } from "next/server";
import { z } from "zod";
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
import { runQuestionWithRetry } from "@/lib/audit/retry";
import {
  VARIANCE_MAX_QUESTIONS,
  VARIANCE_MIN_QUESTIONS,
  createVarianceRecord,
  validateVarianceRequest,
} from "@/lib/audit/variance";

export const runtime = "nodejs";

/**
 * POST /api/audit/variance — Spec 003 R-22 variance re-ask.
 *
 * After the main 10/10 run, 2–3 designated questions are re-asked separately,
 * one independent observation each, under the same locked method (same provider,
 * model, neutral Indonesian instruction, web search, verified location context).
 *
 * Results are stored in a separate variance record keyed to the run and never
 * fed into counts/denominators/findings/actions, full telemetry. The caller is
 * responsible for keeping the variance record separate; this route enforces the
 * 2–3 question bound and the 1+2 retry contract per question, with full
 * per-attempt telemetry (R-20) and server-side budget enforcement (R-36).
 */

const requestSchema = z.object({
  brief: businessBriefSchema,
  prompts: z
    .array(promptSchema)
    .min(VARIANCE_MIN_QUESTIONS)
    .max(VARIANCE_MAX_QUESTIONS),
  safety_identifier: z.string().min(8).max(64),
  budget: auditBudgetSchema,
  run_key: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  try {
    assertLiveProviderCredentialsConfigured();
    const input = requestSchema.parse(await request.json());

    const prompt_ids = input.prompts.map((p) => p.prompt_id);
    const varianceErrors = validateVarianceRequest({ prompt_ids });
    if (varianceErrors.length) {
      return NextResponse.json(
        { error: varianceErrors.join(" ") },
        { status: 422 },
      );
    }
    // Uniqueness is already checked by validateVarianceRequest, but also ensure
    // the supplied prompts themselves have unique ids.
    if (new Set(prompt_ids).size !== prompt_ids.length) {
      return NextResponse.json(
        { error: "Variance prompts must have unique prompt_id." },
        { status: 422 },
      );
    }

    // Run each designated question separately under the same locked method.
    // Reuses the 1+2 retry contract (runQuestionWithRetry) so every attempt is
    // persisted with full telemetry and the USD 5 ceiling is enforced server-side
    // via the budget that is carried forward attempt by attempt.
    let budget = input.budget;
    const observations: z.infer<typeof auditObservationSchema>[] = [];
    let incomplete_reason: string | undefined;

    for (const prompt of input.prompts) {
      const outcome = await runQuestionWithRetry({
        prompt,
        brief: input.brief,
        safety_identifier: input.safety_identifier,
        budget,
        execute: liveExecuteAuditPrompt,
      });
      budget = {
        ...budget,
        calls: [...budget.calls, ...outcome.observation.telemetry],
      };
      observations.push(outcome.observation);
      if (outcome.status === "exhausted") {
        // Failure matrix: variance re-ask fails → main run unchanged, variance
        // record marked incomplete, never blended. We continue to produce a
        // record for the other designated questions rather than failing the
        // whole request, so the caller gets the completed re-asks plus the
        // failure reason.
        incomplete_reason =
          incomplete_reason ||
          `Variance re-ask for ${prompt.prompt_id} did not produce an evaluable observation after automatic retries: ${outcome.failure_reason}`;
      }
      // Non-retryable category (e.g. cost ceiling) would have exhausted with
      // category non_retryable — stop further variance calls safely.
      if (
        outcome.status === "exhausted" &&
        outcome.failure_category === "non_retryable"
      ) {
        incomplete_reason =
          incomplete_reason ||
          outcome.failure_reason ||
          "Variance stopped on a non-retryable failure.";
        break;
      }
    }

    // If fewer observations than prompts due to non_retryable early stop, the
    // variance record must reflect the gap explicitly so the quality-gate review
    // can note it. We pad with a synthetic incomplete marker via incomplete_reason
    // and let createVarianceRecord validate the expected prompt_ids; to avoid
    // throwing on the length mismatch we only create the record for the
    // questions that actually produced an observation.
    // Instead: if we stopped early, report the partial set with incomplete flag.
    const expectedIds = input.prompts.map((p) => p.prompt_id);
    const producedIds = observations.map((o) => o.prompt_id);
    const missingAfterStop = expectedIds.filter(
      (id) => !producedIds.includes(id),
    );

    // Build the variance record. If we stopped early, we treat missing prompts
    // as failed variance questions and include them as incomplete entries via
    // the incomplete_reason, but we still need observations for each designated
    // prompt to satisfy the 1:1 check. So synthesize failed observations for
    // the missing ids only to satisfy the record shape, marking them as failed.
    if (missingAfterStop.length) {
      for (const missingId of missingAfterStop) {
        const prompt = input.prompts.find((p) => p.prompt_id === missingId)!;
        observations.push({
          prompt_id: prompt.prompt_id,
          category: prompt.category,
          branded: prompt.branded,
          question: prompt.question,
          instruction_version: "neutral-id-v1",
          system: "OpenAI Responses API",
          requested_model: "gpt-5.6-luna",
          returned_model: "",
          response_id: "",
          observed_at: new Date().toISOString(),
          raw_answer: "",
          sources: [],
          run_status: "failed",
          failure_reason:
            incomplete_reason ||
            "Variance re-ask stopped early on a non-retryable failure.",
          telemetry: [
            {
              stage: "observation",
              attempt: 1,
              status: "failed",
              started_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
              latency_ms: 0,
              requested_model: "gpt-5.6-luna",
              returned_model: "",
              response_id: "",
              service_tier: "default",
              usage: {
                input_tokens: 0,
                cached_input_tokens: 0,
                cache_write_input_tokens: 0,
                output_tokens: 0,
                reasoning_output_tokens: 0,
                total_tokens: 0,
              },
              web_search_calls: 0,
              accounted_cost_usd: 0,
              cost_basis: "preflight_reservation",
              pricing_version: "openai-standard-2026-08-01",
              failure_reason:
                incomplete_reason ||
                "Variance re-ask stopped early on a non-retryable failure.",
              provider_status: "",
              incomplete_reason: "",
              output_text_present: false,
              refusal_present: false,
            },
          ],
        });
      }
    }

    const record = createVarianceRecord({
      run_key: input.run_key,
      prompt_ids: expectedIds,
      observations,
      ...(incomplete_reason ? { incomplete_reason } : {}),
    });

    return NextResponse.json({ variance: record, budget });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "We couldn't run the variance re-ask.",
      },
      { status: 400 },
    );
  }
}
