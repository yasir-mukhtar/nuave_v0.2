/**
 * Condition B runner: the buyer-decision approach.
 *
 * One fresh, bounded, no-search call per fixture with the frozen B
 * instruction and a short normalized buyer brief (values drawn only from the
 * condition A projection). Structured output carries the ten requests plus
 * minimal internal metadata (one coverage tag per request and limitation
 * notes). B is validated against its own contract only and is NEVER repaired
 * with the old deterministic fallback: failures are exposed in the record,
 * never silently replaced.
 */
import {
  INDONESIAN_QUESTION_STRUCTURED_OUTPUT_NAME,
} from "../../../src/lib/audit/questions-id-provider";
import {
  classifyIndonesianQuestion,
} from "../../../src/lib/audit/questions-id";
import { conditionAInput, conditionBInput } from "./briefs";
import {
  B_STRUCTURED_OUTPUT_NAME,
  B_OUTPUT_JSON_SCHEMA,
  LUNA_MODEL,
  OPENCODEGO_CREDENTIAL_VAR,
  RESPONSES_ENDPOINT,
  requestTimeoutMs,
} from "./experiment-config";
import {
  assertLiveRunAllowed,
  extractResponsesUsage,
  instrumentedFetch,
  postResponses,
  providerErrorMessage,
  providerSystemLabel,
  type CapturingFetch,
} from "./provider-io";
import type { LoadedFixture, LoadedInstruction } from "./loaders";
import { newRunId, type ExperimentRunRecord, type ProcessedQuestion } from "./records";
import { parseBResponseBody, validateBPack } from "./validate-b";

type ConditionBResult = {
  record: ExperimentRunRecord;
  attempts: number;
};

function failedRecord(
  base: Omit<
    ExperimentRunRecord,
    "status" | "failure_reason" | "output" | "raw_output" | "http"
  >,
  reason: string,
  attempts: number,
  rawNote: string,
): ExperimentRunRecord {
  return {
    ...base,
    status: "failed",
    failure_reason: reason,
    http: { calls_made: attempts, last_status: null, provider_error: null, timed_out: false },
    raw_output: { kind: "none", note: rawNote },
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

function assertLunaEnvironment(): void {
  const configured = process.env.OPENAI_AUDIT_MODEL?.trim();
  if (configured && configured !== LUNA_MODEL) {
    throw new Error(
      `Condition B (${LUNA_MODEL}) refuses to run while OPENAI_AUDIT_MODEL="${configured}" is set; ` +
        `the initial comparison and confirmation must use the same Luna model identifier as condition A.`,
    );
  }
}

export async function runConditionB(input: {
  fixture: LoadedFixture;
  instruction: LoadedInstruction;
  model: string;
  runKind: "initial" | "confirmation" | "challenger";
  fetcher?: CapturingFetch;
  now?: () => string;
}): Promise<ConditionBResult> {
  const { fixture, instruction, model } = input;
  const startedAt = Date.now();
  const startedAtIso = new Date(startedAt).toISOString();
  const instrumented = instrumentedFetch(input.fetcher);

  // Preflight guards run OUTSIDE the try: guard failures (live flag off,
  // missing credential, model-identifier mismatch) throw immediately and
  // never produce a run record, so no non-attempt pollutes the results.
  assertLiveRunAllowed();
  if (model === LUNA_MODEL) {
    // Same model identifier as condition A for the initial comparison and
    // confirmation runs.
    assertLunaEnvironment();
  }
  // Challenger path (model !== LUNA_MODEL): the requested identifier is
  // explicit and recorded. The returned identifier must match the requested
  // one — any mismatch lands in provenance_errors and never silently
  // substitutes another model.

  const base = {
    schema: "nuave-bdq-run-record-v1" as const,
    run_id: newRunId(input.runKind),
    run_kind: input.runKind,
    condition: "B" as const,
    fixture_id: fixture.fixture_id,
    fixture_version: fixture.version,
    fixture_sha256: fixture.sha256,
    started_at: startedAtIso,
    completed_at: "",
    latency_ms: 0,
    instruction: {
      id: instruction.instruction_id,
      version: instruction.version,
      sha256: instruction.sha256,
      text: instruction.text,
      source: `frozen-${instruction.instruction_id}`,
      freeze_snapshot_sha256: null,
    },
    model: { requested: model, returned: "", response_id: "" },
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
      output_schema: B_STRUCTURED_OUTPUT_NAME,
      timeout_ms: requestTimeoutMs(),
      web_search_tools: false as const,
    },
    input: { kind: "buyer_brief" as const, payload: null },
    provenance_errors: [],
    notes: [],
  };

  try {
    const minimized = conditionAInput(fixture.business);
    const buyerBrief = conditionBInput(fixture.business);
    const payload = {
      model,
      reasoning: { effort: "low" as const },
      store: false as const,
      service_tier: "default" as const,
      max_output_tokens: 2_048,
      text: {
        format: {
          type: "json_schema" as const,
          name: B_STRUCTURED_OUTPUT_NAME,
          schema: B_OUTPUT_JSON_SCHEMA,
          strict: true as const,
        },
        verbosity: "low" as const,
      },
      input: [
        {
          role: "developer" as const,
          content: instruction.text,
        },
        {
          role: "user" as const,
          content: JSON.stringify({ buyer_brief: buyerBrief }),
        },
      ],
    };

    const { body, http_status } = await postResponses(payload, instrumented.fetcher);
    const latencyMs = Date.now() - startedAt;
    const usage = extractResponsesUsage(body);
    const parsed = parseBResponseBody(body);

    if (parsed.kind === "error") {
      const attempts = instrumented.attempts();
      // Keep any raw text the provider did return so the unresolved attempt
      // can be inspected; it is never used as output.
      let rawText = "";
      const rawRecord = body as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };
      for (const item of rawRecord.output ?? []) {
        for (const part of item.content ?? []) {
          if (part.type === "output_text" && typeof part.text === "string") {
            rawText = part.text;
          }
        }
      }
      const record = failedRecord(
        {
          ...base,
          completed_at: new Date(startedAt + latencyMs).toISOString(),
          latency_ms: latencyMs,
        },
        parsed.reason,
        attempts,
        `Provider call status ${http_status}; no usable B output.`,
      );
      record.http = {
        calls_made: attempts,
        last_status: http_status,
        provider_error: providerErrorMessage(body) || parsed.reason,
        timed_out: instrumented.calls.some(
          (call) => call.status === 0 && /abort/i.test(call.error ?? ""),
        ),
      };
      if (rawText) {
        record.raw_output = { kind: "text", text: rawText };
      }
      record.model.returned = usage?.model ?? "";
      record.model.response_id = usage?.response_id ?? "";
      if (usage && usage.model && usage.model !== model) {
        record.provenance_errors.push(
          `Provider returned model ${usage.model}; requested ${model}.`,
        );
      }
      return { record, attempts };
    }

    const { pack } = parsed;
    const validationIssues = validateBPack(pack, minimized);
    const questions: ProcessedQuestion[] = pack.questions.map((question, position) => ({
      index: position + 1,
      text: question.text,
      generated_by: "model" as const,
      final_classification: classifyIndonesianQuestion(question.text, minimized),
      coverage: question.coverage,
      limitation: question.limitation,
    }));
    const unbranded = questions.filter(
      (item) => item.final_classification === "tanpa_menyebut_bisnis_anda",
    ).length;
    const provenanceErrors: string[] = [];
    if (usage) {
      if (usage.model && usage.model !== model) {
        provenanceErrors.push(`Provider returned model ${usage.model}; requested ${model}.`);
      }
      if (!usage.response_id) {
        provenanceErrors.push("Provider returned no response identity.");
      }
    } else {
      provenanceErrors.push("No usage metadata returned; model identity could not be verified.");
    }

    const record: ExperimentRunRecord = {
      ...base,
      completed_at: new Date(startedAt + latencyMs).toISOString(),
      latency_ms: latencyMs,
      status: "completed",
      failure_reason: null,
      model: {
        requested: model,
        returned: usage?.model ?? "",
        response_id: usage?.response_id ?? "",
      },
      http: {
        calls_made: instrumented.attempts(),
        last_status: http_status,
        provider_error: providerErrorMessage(body) || null,
        timed_out: instrumented.calls.some(
          (call) => call.status === 0 && /abort/i.test(call.error ?? ""),
        ),
      },
      input: { kind: "buyer_brief", payload: { buyer_brief: buyerBrief } },
      raw_output: {
        kind: "b_structured",
        questions: pack.questions,
        limitations: pack.limitations,
      },
      output: {
        source: "model",
        warnings: [],
        questions,
        classification: { total: questions.length, unnamed: unbranded, named: questions.length - unbranded },
        valid: validationIssues.length === 0,
        validation_issues: validationIssues,
      },
      provenance_errors: provenanceErrors,
      notes: [
        `declared limitations: ${pack.limitations.length ? pack.limitations.join(" | ") : "(none)"}`,
        validationIssues.length
          ? "Condition B contract issues are exposed in validation_issues; no repair or fallback was applied."
          : "Condition B contract checks passed; human review still decides naturalness, grounding, and coverage.",
      ],
    };
    return { record, attempts: instrumented.attempts() };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Condition B failed without details.";
    const attempts = instrumented.attempts();
    const record = failedRecord(base, reason, attempts, "Generation did not start.");
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

/** Re-exported so tests can assert B's settings match A's exactly. */
export const B_REQUEST_SIGNATURE = {
  output_schema_name: B_STRUCTURED_OUTPUT_NAME,
  reasoning_effort: "low",
  service_tier: "default",
  verbosity: "low",
  max_output_tokens: 2_048,
  a_output_schema_name: INDONESIAN_QUESTION_STRUCTURED_OUTPUT_NAME,
} as const;
