/**
 * Condition A runner: the CURRENT production approach, executed exactly as
 * the live boundary runs it — the real versioned writer instruction from
 * src/lib/audit/questions-id-provider.ts, the real minimized-brief input
 * projection, the fixed ten measurement slots, one fresh bounded no-search
 * call per fixture, and the production parsing/repair/fallback semantics.
 *
 * The run record captures the raw provider output (before any repair) from
 * the HTTP layer, the displayed output after the boundary, and per-question
 * provenance (original suggestion vs deterministic slot repair vs full
 * deterministic fallback). Nothing here changes production behavior.
 */
import { AUDIT_MODEL } from "../../../src/lib/audit/telemetry";
import { assertOpenCodeGoProductionMethodConfigured } from "../../../src/lib/audit/opencodego";
import {
  INDONESIAN_QUESTION_INSTRUCTION_VERSION,
  INDONESIAN_QUESTION_STRUCTURED_OUTPUT_NAME,
  INDONESIAN_QUESTION_WRITER_INSTRUCTION,
  createIndonesianQuestionProvider,
  indonesianQuestionGenerationMeta,
  parseOpenAIIndonesianResponse,
  type IndonesianFetch,
} from "../../../src/lib/audit/questions-id-provider";
import {
  INDONESIAN_QUESTION_LANGUAGE,
  generateIndonesianQuestionPack,
  type MinimizedIndonesianBrief,
} from "../../../src/lib/audit/questions-id";
import { protectedQuestionGenerationProvenanceError } from "../../../src/lib/audit/questions-id-live";
import { measurementSlotForOrder } from "../../../src/lib/audit/measurement-matrix";
import { conditionAInput } from "./briefs";
import { OPENCODEGO_CREDENTIAL_VAR, RESPONSES_ENDPOINT, requestTimeoutMs } from "./experiment-config";
import {
  assertLiveRunAllowed,
  extractResponsesUsage,
  instrumentedFetch,
  providerErrorMessage,
  providerSystemLabel,
  type CapturingFetch,
} from "./provider-io";
import type { LoadedFixture } from "./loaders";
import { sha256Hex } from "./loaders";
import {
  newRunId,
  type ExperimentRunRecord,
  type ProcessedQuestion,
  type RawOutput,
} from "./records";

type ConditionAResult = {
  record: ExperimentRunRecord;
  attempts: number;
};

function asIndonesianFetch(fetcher: CapturingFetch): IndonesianFetch {
  return fetcher as unknown as IndonesianFetch;
}

function failedRecord(
  base: Omit<
    ExperimentRunRecord,
    "status" | "failure_reason" | "output" | "raw_output" | "http"
  >,
  reason: string,
  attempts: number,
): ExperimentRunRecord {
  return {
    ...base,
    status: "failed",
    failure_reason: reason,
    http: { calls_made: attempts, last_status: null, provider_error: null, timed_out: false },
    raw_output: { kind: "none", note: "Generation did not start or failed before usable output." },
    output: {
      source: "none",
      warnings: [],
      questions: [],
      classification: { total: 0, unnamed: 0, named: 0 },
      valid: false,
      validation_issues: [],
    },
  };
}

export async function runConditionA(input: {
  fixture: LoadedFixture;
  runKind: "initial";
  fetcher?: CapturingFetch;
  now?: () => string;
}): Promise<ConditionAResult> {
  const { fixture } = input;
  const now = input.now ?? (() => new Date().toISOString());
  const startedAt = Date.now();
  const startedAtIso = new Date(startedAt).toISOString();
  const instrumented = instrumentedFetch(input.fetcher);

  // Preflight guards run OUTSIDE the try: a guard failure (live flag off,
  // missing credential, production method mismatch) throws immediately and
  // never produces a run record, so no non-attempt pollutes the results.
  assertLiveRunAllowed();
  assertOpenCodeGoProductionMethodConfigured();
  if (process.env.NUAVE_QUESTION_PROVIDER?.trim() !== "opencodego") {
    throw new Error(
      "Condition A runs on the opencodego provider; NUAVE_QUESTION_PROVIDER must be opencodego or unset.",
    );
  }

  const base = {
    schema: "nuave-bdq-run-record-v1" as const,
    run_id: newRunId(input.runKind),
    run_kind: input.runKind,
    condition: "A" as const,
    fixture_id: fixture.fixture_id,
    fixture_version: fixture.version,
    fixture_sha256: fixture.sha256,
    started_at: startedAtIso,
    completed_at: "",
    latency_ms: 0,
    instruction: {
      id: "question-writer-v2",
      version: INDONESIAN_QUESTION_INSTRUCTION_VERSION,
      sha256: sha256Hex(INDONESIAN_QUESTION_WRITER_INSTRUCTION),
      text: INDONESIAN_QUESTION_WRITER_INSTRUCTION,
      source: "src-question-writer-v2-current",
      freeze_snapshot_sha256: null,
    },
    model: { requested: "", returned: "", response_id: "" },
    provider: {
      name: "opencodego" as const,
      endpoint: RESPONSES_ENDPOINT,
      credential_var_name: OPENCODEGO_CREDENTIAL_VAR,
      system: providerSystemLabel(),
    },
    settings: {
      reasoning_effort: "low",
      service_tier: "default",
      max_output_tokens: 2_048,
      text_verbosity: "low",
      output_schema: INDONESIAN_QUESTION_STRUCTURED_OUTPUT_NAME,
      timeout_ms: requestTimeoutMs(),
      web_search_tools: false as const,
    },
    input: { kind: "minimized_brief" as const, payload: null },
    provenance_errors: [],
    notes: [],
  };

  try {
    const minimized: MinimizedIndonesianBrief = conditionAInput(fixture.business);
    const provider = createIndonesianQuestionProvider(
      asIndonesianFetch(instrumented.fetcher),
    );
    const suggestion = await generateIndonesianQuestionPack(minimized, provider, {
      generationMeta: indonesianQuestionGenerationMeta(),
      now,
    });

    const latencyMs = Date.now() - startedAt;
    const lastCall = instrumented.calls[instrumented.calls.length - 1] ?? null;
    const usage = lastCall ? extractResponsesUsage(lastCall.body) : null;
    const timedOut = instrumented.calls.some(
      (call) => call.status === 0 && /abort/i.test(call.error ?? ""),
    );
    const providerError =
      providerErrorMessage(lastCall?.body ?? {}) || lastCall?.error || null;
    const requestedModel =
      suggestion.generation.requested_model === "not recorded"
        ? (process.env.OPENAI_AUDIT_MODEL?.trim() ?? AUDIT_MODEL)
        : suggestion.generation.requested_model;

    // Raw provider output, captured before the boundary's processing.
    let rawOutput: RawOutput = { kind: "none", note: "No provider output captured." };
    if (lastCall && lastCall.status === 200) {
      try {
        const providerOutput = parseOpenAIIndonesianResponse(
          lastCall.body as Parameters<typeof parseOpenAIIndonesianResponse>[0],
        );
        rawOutput =
          providerOutput.kind === "structured"
            ? { kind: "structured", questions: providerOutput.questions }
            : { kind: "text", text: providerOutput.text };
      } catch (error) {
        rawOutput = {
          kind: "none",
          note: `Provider body could not be parsed: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    }

    const provenanceCheck = protectedQuestionGenerationProvenanceError({
      provider: "opencodego",
      requested_model: requestedModel,
      returned_model: usage?.model ?? "",
      response_id: usage?.response_id ?? "",
    });
    const provenanceErrors = provenanceCheck ? [provenanceCheck] : [];

    const questions: ProcessedQuestion[] = suggestion.questions.map((item) => {
      const slot = measurementSlotForOrder(item.order);
      const repaired =
        item.original_suggestion !== undefined &&
        item.original_suggestion !== item.text;
      return {
        index: item.order,
        text: item.text,
        original_suggestion: item.original_suggestion,
        slot: slot
          ? {
              order: slot.order,
              category: slot.category,
              measurement_purpose: slot.measurementPurpose,
            }
          : undefined,
        generated_by:
          suggestion.source === "fallback"
            ? "deterministic_fallback"
            : repaired
              ? "deterministic_slot_repair"
              : "model",
        final_classification: item.final_classification,
      };
    });

    const unbranded = questions.filter(
      (item) => item.final_classification === "tanpa_menyebut_bisnis_anda",
    ).length;

    const record: ExperimentRunRecord = {
      ...base,
      completed_at: new Date(startedAt + latencyMs).toISOString(),
      latency_ms: latencyMs,
      status:
        suggestion.source === "fallback"
          ? "completed_with_deterministic_fallback"
          : "completed",
      failure_reason: null,
      model: {
        requested: requestedModel,
        returned: usage?.model ?? "",
        response_id: usage?.response_id ?? "",
      },
      http: {
        calls_made: instrumented.attempts(),
        last_status: lastCall?.status ?? null,
        provider_error: providerError,
        timed_out: timedOut,
      },
      input: { kind: "minimized_brief", payload: minimized },
      raw_output: rawOutput,
      output: {
        source: suggestion.source,
        warnings: suggestion.warnings,
        questions,
        classification: { total: questions.length, unnamed: unbranded, named: questions.length - unbranded },
        valid: suggestion.source !== "fallback",
        validation_issues: [],
      },
      provenance_errors: provenanceErrors,
      notes: [
        `language=${INDONESIAN_QUESTION_LANGUAGE}`,
        suggestion.source === "fallback"
          ? "The deterministic Indonesian fallback replaced the model output; fallback wording is never attributed to the model."
          : suggestion.warnings.length
            ? `Boundary repair warnings: ${suggestion.warnings.join(", ")}`
            : "No repair or fallback was needed.",
      ],
    };
    return { record, attempts: instrumented.attempts() };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Condition A failed without details.";
    const attempts = instrumented.attempts();
    const record = failedRecord(base, reason, attempts);
    record.http = {
      calls_made: attempts,
      last_status: null,
      provider_error: reason,
      timed_out: /abort/i.test(reason),
    };
    record.completed_at = new Date(startedAt + (Date.now() - startedAt)).toISOString();
    record.latency_ms = Date.now() - startedAt;
    return { record, attempts };
  }
}
