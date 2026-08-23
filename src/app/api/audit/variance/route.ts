import { NextResponse } from "next/server";
import { z } from "zod";
import {
  auditBudgetSchema,
  auditObservationSchema,
  businessBriefSchema,
  promptSchema,
} from "@/lib/audit/types";
import {
  OPENCODEGO_SYSTEM,
  assertLiveProviderCredentialsConfigured,
  liveExecuteAuditPrompt,
} from "@/lib/audit/provider";
import { runQuestionWithRetry } from "@/lib/audit/retry";
import {
  completedLockedObservationSetErrors,
  designatedVariancePrompts,
  variancePromptBindingErrors,
} from "@/lib/audit/locked-question-pack";
import { assertSafeComparisonBusinessUrls } from "@/lib/audit/similar-businesses";
import { productionObservationMethodErrors } from "@/lib/audit/production-observation-method";
import {
  VARIANCE_MAX_QUESTIONS,
  VARIANCE_MIN_QUESTIONS,
  createVarianceRecord,
  validateVarianceRequest,
} from "@/lib/audit/variance";

export const runtime = "nodejs";

const requestSchema = z.object({
  brief: businessBriefSchema,
  /** Complete locked pack and its completed 10/10 evidence travel together. */
  locked_prompts: z.array(promptSchema).length(10),
  completed_observations: z.array(auditObservationSchema).length(10),
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
    const input = requestSchema.parse(await request.json());
    assertSafeComparisonBusinessUrls(input.brief);

    // The request-carried proof must represent the exact completed locked run,
    // not merely a syntactically valid pack. This stays Phase-3-compatible:
    // there is no durable server job/state, but stale or arbitrary variance
    // prompts cannot detach from the ten completed protected observations.
    const completedRunErrors = [
      ...completedLockedObservationSetErrors({
        prompts: input.locked_prompts,
        observations: input.completed_observations,
        brief: input.brief,
      }),
      ...productionObservationMethodErrors(input.completed_observations),
    ];
    if (completedRunErrors.length) {
      return NextResponse.json(
        { error: completedRunErrors.join(" ") },
        { status: 422 },
      );
    }

    // Prove designation and exact prompt identity before any credential check
    // or provider work. The provider receives the server-canonical designated
    // subset, never arbitrary request prompts.
    const bindingErrors = variancePromptBindingErrors({
      locked_prompts: input.locked_prompts,
      requested_prompts: input.prompts,
      brief: input.brief,
    });
    if (bindingErrors.length) {
      return NextResponse.json(
        { error: bindingErrors.join(" ") },
        { status: 422 },
      );
    }
    const prompts = designatedVariancePrompts(
      input.locked_prompts,
      input.brief,
    );
    const prompt_ids = prompts.map((prompt) => prompt.prompt_id);
    const varianceErrors = validateVarianceRequest({ prompt_ids });
    if (varianceErrors.length) {
      return NextResponse.json(
        { error: varianceErrors.join(" ") },
        { status: 422 },
      );
    }

    assertLiveProviderCredentialsConfigured();

    let budget = input.budget;
    const observations: z.infer<typeof auditObservationSchema>[] = [];
    let incomplete_reason: string | undefined;

    for (const prompt of prompts) {
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
        incomplete_reason =
          incomplete_reason ||
          `Variance re-ask for ${prompt.prompt_id} did not produce an evaluable observation after automatic retries: ${outcome.failure_reason}`;
      }
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

    const expectedIds = prompts.map((prompt) => prompt.prompt_id);
    const producedIds = observations.map(
      (observation) => observation.prompt_id,
    );
    const missingAfterStop = expectedIds.filter(
      (id) => !producedIds.includes(id),
    );

    if (missingAfterStop.length) {
      for (const missingId of missingAfterStop) {
        const prompt = prompts.find(
          (candidate) => candidate.prompt_id === missingId,
        )!;
        observations.push({
          prompt_id: prompt.prompt_id,
          category: prompt.category,
          branded: prompt.branded,
          question: prompt.question,
          instruction_version: "neutral-id-v1",
          system: OPENCODEGO_SYSTEM,
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
