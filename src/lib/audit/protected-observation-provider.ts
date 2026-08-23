import OpenAI from "openai";
import type { ResponseCreateParamsWithTools } from "openai/lib/ResponsesParser";
import type { Response } from "openai/resources/responses/responses";
import { DEFAULT_OBSERVATION_INSTRUCTION_VERSION } from "./contracts";
import {
  auditModel,
  auditObservationSearchTool,
  auditReasoningEffort,
  hashSafetyIdentifier,
  normalizeSourceTitle,
  observationInstructionText,
} from "./openai";
import { OPENCODEGO_SYSTEM } from "./opencodego";
import {
  AUDIT_CALL_LIMITS,
  completedCallTelemetry,
  failedCallTelemetry,
  reserveAuditCall,
} from "./telemetry";
import { throwIfAuditAborted, type QuestionExecuteInput } from "./retry";
import type { AuditObservation, Source } from "./types";

type CostControlledResponseParams = ResponseCreateParamsWithTools & {
  max_tool_calls?: number;
};

function client() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured on the Nuave server.");
  }
  const baseURL = process.env.OPENAI_BASE_URL?.trim() || undefined;
  return new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
}

function collectSources(response: Response): Source[] {
  const found = new Map<string, Source>();
  for (const item of response.output) {
    if (item.type === "message") {
      for (const content of item.content) {
        if (content.type !== "output_text") continue;
        for (const annotation of content.annotations) {
          if (annotation.type !== "url_citation") continue;
          found.set(annotation.url, {
            url: annotation.url,
            title: normalizeSourceTitle(annotation.title, annotation.url),
          });
        }
      }
    }
    if (item.type === "web_search_call" && item.action.type === "search") {
      for (const source of item.action.sources ?? []) {
        if (source.type !== "url") continue;
        found.set(source.url, {
          url: source.url,
          title: normalizeSourceTitle(undefined, source.url),
        });
      }
    }
  }
  return [...found.values()];
}

/**
 * Protected OpenCode-Go observation call with request cancellation threaded to
 * the OpenAI-compatible SDK. This is deliberately observation-only: extraction
 * and report generation are not long-running browser streams in Wave 1.
 */
export async function executeAbortableProtectedObservation(
  input: QuestionExecuteInput,
): Promise<AuditObservation> {
  throwIfAuditAborted(input.signal);
  const requestedModel = auditModel();
  const request = {
    model: requestedModel,
    reasoning: { effort: auditReasoningEffort("low") },
    store: false,
    service_tier: "default" as const,
    max_output_tokens: AUDIT_CALL_LIMITS.observation.max_output_tokens,
    max_tool_calls: AUDIT_CALL_LIMITS.observation.max_tool_calls,
    safety_identifier: hashSafetyIdentifier(input.safety_identifier),
    tools: [auditObservationSearchTool()],
    tool_choice: "required" as const,
    include: ["web_search_call.action.sources" as const],
    text: { verbosity: "medium" as const },
    input: [
      {
        role: "developer" as const,
        content: observationInstructionText(
          DEFAULT_OBSERVATION_INSTRUCTION_VERSION,
        ),
      },
      { role: "user" as const, content: input.prompt.question },
    ],
  } satisfies CostControlledResponseParams;
  const reservedCost = reserveAuditCall({
    budget: input.budget,
    stage: "observation",
    request,
    requested_model: requestedModel,
    has_web_search: true,
  });
  const startedAt = Date.now();

  try {
    const response = await client().responses.create(
      request,
      input.signal ? { signal: input.signal } : undefined,
    );
    throwIfAuditAborted(input.signal);
    const searchExecuted = response.output.some(
      (item) =>
        item.type === "web_search_call" && item.action?.type === "search",
    );
    if (!searchExecuted) {
      throw new Error(
        "Required web_search_call did not execute for this observation; citation annotations alone are not execution evidence.",
      );
    }
    return {
      prompt_id: input.prompt.prompt_id,
      category: input.prompt.category,
      branded: input.prompt.branded,
      question: input.prompt.question,
      instruction_version: DEFAULT_OBSERVATION_INSTRUCTION_VERSION,
      system: OPENCODEGO_SYSTEM,
      requested_model: requestedModel,
      returned_model: response.model,
      response_id: response.id,
      observed_at: new Date(response.created_at * 1_000).toISOString(),
      raw_answer: response.output_text,
      sources: collectSources(response),
      run_status: "completed",
      failure_reason: "",
      telemetry: [
        completedCallTelemetry({
          stage: "observation",
          started_at_ms: startedAt,
          requested_model: requestedModel,
          response,
        }),
      ],
    };
  } catch (error) {
    throwIfAuditAborted(input.signal);
    const call = failedCallTelemetry({
      stage: "observation",
      started_at_ms: startedAt,
      requested_model: requestedModel,
      reserved_cost_usd: reservedCost,
      error,
    });
    return {
      prompt_id: input.prompt.prompt_id,
      category: input.prompt.category,
      branded: input.prompt.branded,
      question: input.prompt.question,
      instruction_version: DEFAULT_OBSERVATION_INSTRUCTION_VERSION,
      system: OPENCODEGO_SYSTEM,
      requested_model: requestedModel,
      returned_model: "",
      response_id: "",
      observed_at: new Date().toISOString(),
      raw_answer: "",
      sources: [],
      run_status: "failed",
      failure_reason: call.failure_reason,
      telemetry: [call],
    };
  }
}
