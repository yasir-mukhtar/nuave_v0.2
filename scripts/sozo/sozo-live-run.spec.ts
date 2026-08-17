/**
 * First LIVE private audit of Sozo Dental Depok/Margonda (Spec 003, Phase 3).
 *
 * This runner executes the real paid engine end to end for the founder-approved
 * private pilot run (2026-08-17):
 *
 *   03 Business Facts  -> frozen confirmed brief (reused verbatim from
 *                         scripts/eval/provider-evaluation.spec.ts CLINICS[0].brief)
 *   04 Questions       -> real question-writer call via the wired Indonesian
 *                         boundary (NUAVE_QUESTION_PROVIDER=openai,
 *                         OPENAI_AUDIT_MODEL=gpt-5.6-luna, question-writer-v1)
 *   05 Audit Run       -> ten observations through the targeted 1+2 retry
 *                         orchestrator (run-orchestrator.ts) with the neutral
 *                         Indonesian instruction (neutral-response-v1), web
 *                         search on, low reasoning, 10/10 evaluable gate
 *   06 Report          -> report-pipeline output recorded; the private
 *                         Indonesian report (report.md) is assembled from the
 *                         recorded facts per R-23..R-28
 *
 * Variance re-asks (R-22): 2-3 questions re-asked once each AFTER the main run,
 * recorded separately, never feeding the reported count or denominators.
 *
 * Provider lock (founder-approved 2026-08-17): GPT-5.6 Luna for 03/04.
 * NUAVE_PROVIDER=openai, NUAVE_QUESTION_PROVIDER=openai,
 * OPENAI_AUDIT_MODEL=gpt-5.6-luna.
 *
 * Hard rules honoured: no src/ edits, no commits, no publishing, no contacting
 * the business. All private artifacts (raw answers, evidence, telemetry, the
 * private report) are written ONLY to .secrets/sozo-live-run-2026-08-17/
 * (gitignored). This file lives outside src/ so `npm run test:audit`
 * (`vitest run src/lib/audit`) never picks it up; run it with:
 *
 *   npx vitest run scripts/sozo
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// 1. Environment: load .env.local BEFORE any audit module reads provider
//    configuration. All audit-module env reads are lazy (inside functions),
//    so static imports below are safe; the report pipeline reads
//    NUAVE_PROVIDER at module load, so it is imported dynamically AFTER the
//    env lock is set inside the test.
// ---------------------------------------------------------------------------

function loadEnvLocal(): void {
  const file = join(process.cwd(), ".env.local");
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

// ---------------------------------------------------------------------------
// 2. Audit-module imports (wired paths; all env reads are lazy)
// ---------------------------------------------------------------------------

import type {
  AuditBudget,
  AuditObservation,
  AuditPrompt,
  BusinessBrief,
} from "../../src/lib/audit/types";
import { executeAuditPrompt } from "../../src/lib/audit/openai";
import { classifyObservationFailure } from "../../src/lib/audit/retry";
import { runAuditObservations } from "../../src/lib/audit/run-orchestrator";
import type { AuditRunEvent } from "../../src/lib/audit/stream";
import {
  classifyIndonesianQuestion,
  indonesianPackBlockers,
  minimizeIndonesianBrief,
  validateIndonesianQuestionPack,
  type IndonesianQuestionPackSuggestion,
  type MinimizedIndonesianBrief,
} from "../../src/lib/audit/questions-id";
import {
  generateLiveIndonesianQuestionPack,
  indonesianQuestionGenerationMeta,
} from "../../src/lib/audit/questions-id-provider";
import { summarizeAuditTelemetry } from "../../src/lib/audit/telemetry";
import {
  PROMPT_MATRIX,
  OBSERVATION_INSTRUCTION_VERSION_NEUTRAL_ID,
} from "../../src/lib/audit/contracts";

// ---------------------------------------------------------------------------
// 3. Run configuration (public facts only — frozen 2026-08-17)
// ---------------------------------------------------------------------------

const RUN_ID = "sozo-live-run-2026-08-17";
const ARTIFACTS_DIR = join(process.cwd(), ".secrets", RUN_ID);
const SAFETY_IDENTIFIER = "nuave-private-live-run-2026-08-17-sozo-depok-margonda";
const CARRYOVER_COST_USD = 0.4357;
const LIMIT_USD = 5;

/**
 * The frozen Sozo confirmed brief — reused VERBATIM from
 * scripts/eval/provider-evaluation.spec.ts (CLINICS[0].brief, id "sozo-depok").
 * It encodes the founder-confirmed public facts (Margonda/Beji/Kota Depok,
 * scaling/behel/tambal priorities, WhatsApp conversion, SATU Dental Margonda
 * comparator). Do not edit.
 */
const SOZO_BRIEF: BusinessBrief = {
  brand_name: "Sozo Dental Depok",
  brand_name_variants: ["SOZO Dental", "Sozo Dental Margonda", "Sozo Dental Clinic"],
  entity_scope: "Margonda, Beji, Kota Depok",
  brand_type: "Jaringan klinik gigi",
  category: "Klinik gigi",
  market_context: "Kota Depok, Jawa Barat, Indonesia",
  target_customer:
    "Warga Depok dan sekitarnya yang mencari klinik gigi terdekat dengan harga terjangkau, termasuk keluarga dan karyawan.",
  official_sources: ["https://www.sozodental.com/lokasi/depok/"],
  verified_offerings: ["scaling gigi", "behel gigi", "tambal gigi"],
  verified_customer_needs: [
    "menemukan klinik gigi terdekat",
    "perawatan gigi dengan harga terjangkau",
    "konsultasi dan reservasi mudah via WhatsApp",
  ],
  verified_decision_criteria: [
    "lokasi dekat dan mudah dijangkau",
    "harga dan promo",
    "dokter berpengalaman",
    "jam buka",
  ],
  verified_competitor: {
    name: "SATU Dental Margonda",
    scope: "Margonda, Beji, Kota Depok",
    source_url: "https://www.satudental.com/lokasi/klinik-gigi-margonda/",
  },
  priority_offering: "scaling gigi",
  conversion_action: "reservasi via WhatsApp",
  customer_supplied_facts: [],
  known_accuracy_questions: [],
  usp: "Jaringan dengan 60+ cabang di Indonesia dan dua cabang di Depok (Margonda dan Cinere).",
  regulated_category_notes: "Layanan kesehatan gigi.",
  language: "en-US",
  agency_name: "Nuave",
  agency_logo_data_url: "",
};

// ---------------------------------------------------------------------------
// 4. Telemetry capture helpers (HTTP level, like scripts/eval)
// ---------------------------------------------------------------------------

type CapturedCall = {
  url: string;
  status: number;
  started_at_ms: number;
  completed_at_ms: number;
  latency_ms: number;
  body: unknown;
};

function captureFetch(calls: CapturedCall[]): typeof fetch {
  const original = globalThis.fetch.bind(globalThis);
  const wrapped: typeof fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : String(input);
    const startedAt = Date.now();
    const res = await original(input, init);
    const body = await res
      .clone()
      .json()
      .catch(() => ({}));
    calls.push({
      url,
      status: res.status,
      started_at_ms: startedAt,
      completed_at_ms: Date.now(),
      latency_ms: Date.now() - startedAt,
      body,
    });
    return res;
  };
  return wrapped;
}

function sanitizeHttpBody(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null) return {};
  const record = body as Record<string, unknown>;
  const usage = record.usage as
    | {
        input_tokens?: number;
        output_tokens?: number;
        total_tokens?: number;
      }
    | undefined;
  const error = record.error as { message?: string } | undefined;
  return {
    id: typeof record.id === "string" ? record.id : "",
    model: typeof record.model === "string" ? record.model : "",
    status: typeof record.status === "string" ? record.status : "",
    usage: usage
      ? {
          input_tokens: usage.input_tokens ?? 0,
          output_tokens: usage.output_tokens ?? 0,
          total_tokens: usage.total_tokens ?? 0,
        }
      : null,
    error_message: error?.message ?? "",
  };
}

// ---------------------------------------------------------------------------
// 5. Deterministic helpers (appearance check mirrors contracts.ts)
// ---------------------------------------------------------------------------

function normalize(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim();
}

function visibleIdentityText(value: string) {
  return value
    .replace(/\[([^\]]+)]\(https?:\/\/[^)]+\)/gi, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/gi, " ");
}

function containsIdentity(value: string, identities: string[]) {
  const normalizedValue = ` ${normalize(visibleIdentityText(value))} `;
  return identities.some((identity) =>
    normalizedValue.includes(` ${normalize(identity)} `),
  );
}

function exactAnswerExcerpt(rawAnswer: string) {
  const answer = rawAnswer.replace(/\s+/g, " ").trim();
  if (!answer) return "";
  const firstSentence = answer.match(/^.*?[.!?](?:\s|$)/)?.[0].trim();
  if (firstSentence && firstSentence.length <= 400) return firstSentence;
  if (answer.length <= 400) return answer;
  const clipped = answer.slice(0, 400);
  const lastSpace = clipped.lastIndexOf(" ");
  return clipped.slice(0, lastSpace > 0 ? lastSpace : 400).trim();
}

/** Brand identities as normalized whole tokens (length >= 3 to stay specific). */
function brandIdentitySignals(brief: BusinessBrief) {
  return [brief.brand_name, ...brief.brand_name_variants]
    .map(normalize)
    .filter((value) => value.length >= 3);
}

function competitorIdentitySignals(brief: BusinessBrief) {
  return [brief.verified_competitor.name]
    .map(normalize)
    .filter((value) => value.length >= 3);
}

// ---------------------------------------------------------------------------
// 6. Question-pack validation
// ---------------------------------------------------------------------------

function validatePack(pack: IndonesianQuestionPackSuggestion, minimized: MinimizedIndonesianBrief) {
  const questions = pack.questions.map((q) => q.text);
  const issues = validateIndonesianQuestionPack(questions, minimized);
  const blockers = indonesianPackBlockers(questions, minimized);
  return {
    count: questions.length,
    classification: pack.classification_summary,
    issues,
    blockers,
    warnings: pack.warnings,
    source: pack.source,
  };
}

// ---------------------------------------------------------------------------
// 7. Build the locked AuditPrompt[] from the approved pack.
//    Slot order 1..10 maps to PROMPT_MATRIX order (NUAVE-BRAND-NEED-01 ..
//    NUAVE-BRAND-ACTION-02). branded is computed dynamically from the final
//    question text (R-34), never from the suggested matrix.
// ---------------------------------------------------------------------------

function buildLockedPrompts(
  pack: IndonesianQuestionPackSuggestion,
  brief: BusinessBrief,
): AuditPrompt[] {
  return pack.questions.map((item, index) => {
    const spec = PROMPT_MATRIX[index];
    const branded = item.final_classification === "menyebut_bisnis_anda";
    const inputs = branded
      ? ["brand_name", "entity_scope", "category", "market_context"]
      : ["category", "market_context", "target_customer"];
    return {
      prompt_id: spec[0],
      category: spec[1],
      role: spec[3],
      branded,
      question: item.text,
      rationale: `${spec[3]}. Built from verified ${inputs.join(", ")}.`,
      inputs_used: inputs,
      review_status: "needs_human_review",
    };
  });
}

// ---------------------------------------------------------------------------
// 8. Variance re-ask selection (R-22): questions whose answers show the
//    highest run-to-run variance risk — brand appearing in an unbranded
//    discovery question, a named competitor in the answer, zero sources, or
//    very short answers. At least two, at most three.
// ---------------------------------------------------------------------------

function pickVariancePromptIds(
  observations: AuditObservation[],
  brief: BusinessBrief,
): string[] {
  const brandSignals = brandIdentitySignals(brief);
  const competitorSignals = competitorIdentitySignals(brief);
  const scored = observations.map((observation) => {
    let score = 0;
    if (!observation.branded && containsIdentity(observation.raw_answer, brandSignals)) {
      score += 3; // discovery question revealed the brand: highest variance risk
    }
    if (containsIdentity(observation.raw_answer, competitorSignals)) {
      score += 2; // competitor named: recommendation pattern varies run to run
    }
    if (observation.sources.length === 0) score += 2; // low evidence
    if (observation.raw_answer.trim().length < 200) score += 1; // short answer
    return { prompt_id: observation.prompt_id, branded: observation.branded, score };
  });
  scored.sort((a, b) => b.score - a.score || Number(a.branded) - Number(b.branded));
  const picks = scored.slice(0, 3).filter((item) => item.score > 0);
  if (picks.length < 2) {
    // Fall back to the two lowest-evidence unbranded questions.
    const unbranded = scored.filter((item) => !item.branded).slice(0, 2);
    for (const item of unbranded) {
      if (!picks.some((pick) => pick.prompt_id === item.prompt_id)) picks.push(item);
    }
  }
  return picks.slice(0, 3).map((item) => item.prompt_id);
}

// ---------------------------------------------------------------------------
// 9. The run
// ---------------------------------------------------------------------------

describe("Sozo Dental Depok/Margonda — first live private audit (Spec 003)", () => {
  it(
    "generates the confirmed pack, runs 10/10 evaluable observations with 1+2 retries, records variance re-asks, and produces the private report facts",
    async () => {
      // ---- Provider lock (founder-approved 2026-08-17) ----
      process.env.NUAVE_PROVIDER = "openai";
      process.env.NUAVE_QUESTION_PROVIDER = "openai";
      process.env.OPENAI_AUDIT_MODEL = "gpt-5.6-luna";
      process.env.OPENAI_AUDIT_CARRYOVER_COST_USD = String(CARRYOVER_COST_USD);

      mkdirSync(ARTIFACTS_DIR, { recursive: true });

      const httpCalls: CapturedCall[] = [];
      const previousFetch = globalThis.fetch;
      globalThis.fetch = captureFetch(httpCalls) as typeof fetch;

      const runStartedAt = new Date().toISOString();
      const mainBudget: AuditBudget = {
        limit_usd: LIMIT_USD,
        carryover_cost_usd: CARRYOVER_COST_USD,
        calls: [],
      };

      const record: Record<string, unknown> = {
        run_id: RUN_ID,
        business: {
          name: SOZO_BRIEF.brand_name,
          branch: SOZO_BRIEF.entity_scope,
          market_context: SOZO_BRIEF.market_context,
        },
        provider_lock: {
          observation_and_extraction: "openai / gpt-5.6-luna",
          question_generation: "openai / gpt-5.6-luna",
          instruction_version: OBSERVATION_INSTRUCTION_VERSION_NEUTRAL_ID,
        },
        started_at: runStartedAt,
      };

      try {
        // ================= 04 — Question pack (one real paid call) =========
        const minimized = minimizeIndonesianBrief(SOZO_BRIEF);
        const questionStartedAt = Date.now();
        const pack = await generateLiveIndonesianQuestionPack(minimized, {
          generationMeta: indonesianQuestionGenerationMeta(),
        });
        const questionLatencyMs = Date.now() - questionStartedAt;
        const questionHttp = httpCalls.find(
          (call) => call.url.includes("/v1/responses") && call.started_at_ms >= questionStartedAt - 5_000,
        );

        const packValidation = validatePack(pack, minimized);
        expect(packValidation.count, "pack count").toBe(10);
        expect(
          packValidation.classification.tanpa_menyebut_bisnis_anda,
          "no-name questions",
        ).toBe(5);
        expect(
          packValidation.classification.menyebut_bisnis_anda,
          "name questions",
        ).toBe(5);
        expect(packValidation.blockers, "pack blockers").toEqual([]);
        expect(
          packValidation.issues.filter(
            (issue) =>
              issue.rule === "identity_leakage" ||
              issue.rule === "competitor_leakage" ||
              issue.rule === "unsupported_premise" ||
              issue.rule === "empty" ||
              issue.rule === "unexecutable",
          ),
          "pack safety issues",
        ).toEqual([]);
        expect(pack.source, "pack source").not.toBe("fallback");

        const questionsArtifact = {
          pack_version: pack.pack_version,
          language: pack.language,
          instruction_version: pack.generation.instruction_version,
          generation: {
            system: pack.generation.system,
            requested_model: pack.generation.requested_model,
            returned_model: pack.generation.returned_model,
            generated_at: pack.generation.generated_at,
            fallback_used: pack.generation.fallback_used,
            source: pack.source,
            warnings: pack.warnings,
            latency_ms: questionLatencyMs,
            http_status: questionHttp?.status ?? null,
            http_usage: questionHttp ? sanitizeHttpBody(questionHttp.body).usage : null,
          },
          classification_summary: pack.classification_summary,
          validation: packValidation,
          questions: pack.questions.map((q) => ({
            order: q.order,
            text: q.text,
            final_classification: q.final_classification,
            suggested_category: q.suggested_category,
          })),
        };
        writeFileSync(
          join(ARTIFACTS_DIR, "questions.json"),
          JSON.stringify(questionsArtifact, null, 2),
          "utf8",
        );
        record.question_generation = {
          source: pack.source,
          warnings: pack.warnings,
          latency_ms: questionLatencyMs,
          http_status: questionHttp?.status ?? null,
        };

        // ================= 05 — Ten observations (1+2 retry orchestrator) ==
        const prompts = buildLockedPrompts(pack, SOZO_BRIEF);
        const events: AuditRunEvent[] = [];
        const summary = await runAuditObservations({
          prompts,
          brief: SOZO_BRIEF,
          safety_identifier: SAFETY_IDENTIFIER,
          budget: mainBudget,
          execute: executeAuditPrompt,
          emit: (event) => {
            events.push(event);
          },
        });

        // ---- 10/10 evaluable gate (R-19) ----
        expect(summary.observations.length, "observation count").toBe(10);
        expect(summary.failed_prompt_ids, "failed prompt ids").toEqual([]);
        expect(summary.stop_message, "stop message").toBe("");
        for (const observation of summary.observations) {
          expect(observation.run_status, `${observation.prompt_id} run status`).toBe("completed");
          expect(
            observation.raw_answer.trim().length,
            `${observation.prompt_id} usable answer`,
          ).toBeGreaterThan(0);
          const classification = classifyObservationFailure(observation);
          expect(classification.evaluable, `${observation.prompt_id} evaluable`).toBe(true);
          expect(
            observation.instruction_version,
            `${observation.prompt_id} instruction version`,
          ).toBe(OBSERVATION_INSTRUCTION_VERSION_NEUTRAL_ID);
          expect(observation.system, `${observation.prompt_id} system`).toBe(
            "OpenAI Responses API",
          );
          expect(observation.returned_model, `${observation.prompt_id} returned model`).toBe(
            "gpt-5.6-luna",
          );
        }

        // Per-question verdicts (deterministic appearance + retry counts)
        const brandSignals = brandIdentitySignals(SOZO_BRIEF);
        const observationsArtifact = summary.observations.map((observation, index) => {
          const attempts = summary.attemptsByPrompt[observation.prompt_id] ?? [];
          return {
            order: index + 1,
            prompt_id: observation.prompt_id,
            category: observation.category,
            branded: observation.branded,
            question: observation.question,
            instruction_version: observation.instruction_version,
            system: observation.system,
            requested_model: observation.requested_model,
            returned_model: observation.returned_model,
            response_id: observation.response_id,
            observed_at: observation.observed_at,
            run_status: observation.run_status,
            attempts: attempts.length,
            retried: attempts.length > 1,
            appearance: containsIdentity(observation.raw_answer, brandSignals)
              ? "mentioned"
              : "absent",
            answer_length_chars: observation.raw_answer.length,
            source_count: observation.sources.length,
            raw_answer: observation.raw_answer,
            sources: observation.sources,
            telemetry: observation.telemetry,
          };
        });
        writeFileSync(
          join(ARTIFACTS_DIR, "observations.json"),
          JSON.stringify(observationsArtifact, null, 2),
          "utf8",
        );

        const totalObservationTelemetry = summary.observations.flatMap(
          (observation) => observation.telemetry,
        );
        record.observations = {
          completed: summary.observations.filter((o) => o.run_status === "completed").length,
          total: summary.observations.length,
          evaluable_gate: "10/10 PASS",
          attempts: totalObservationTelemetry.length,
          retries_used: totalObservationTelemetry.filter((call) => (call.attempt ?? 1) > 1).length,
          headline_appearance_count: summary.observations.filter((o) =>
            containsIdentity(o.raw_answer, brandSignals),
          ).length,
          events: events.map((event) => event.type),
        };

        // ================= Variance re-asks (R-22, separate measurement) ===
        const variancePromptIds = pickVariancePromptIds(summary.observations, SOZO_BRIEF);
        expect(variancePromptIds.length, "variance re-ask count").toBeGreaterThanOrEqual(2);
        expect(variancePromptIds.length, "variance re-ask count").toBeLessThanOrEqual(3);

        const varianceBudget: AuditBudget = {
          limit_usd: LIMIT_USD,
          carryover_cost_usd: CARRYOVER_COST_USD,
          calls: [],
        };
        const varianceResults: Array<{
          prompt_id: string;
          question: string;
          branded: boolean;
          reasked_at: string;
          attempts: number;
          run_status: string;
          appearance: "mentioned" | "absent";
          raw_answer: string;
          sources: { url: string; title: string }[];
          telemetry: unknown[];
        }> = [];
        for (const promptId of variancePromptIds) {
          const prompt = prompts.find((item) => item.prompt_id === promptId);
          if (!prompt) continue;
          const observation = await executeAuditPrompt({
            prompt,
            brief: SOZO_BRIEF,
            safety_identifier: SAFETY_IDENTIFIER,
            budget: varianceBudget,
          });
          varianceBudget.calls.push(...observation.telemetry);
          varianceResults.push({
            prompt_id: observation.prompt_id,
            question: observation.question,
            branded: observation.branded,
            reasked_at: observation.observed_at,
            attempts: observation.telemetry.length,
            run_status: observation.run_status,
            appearance: containsIdentity(observation.raw_answer, brandSignals)
              ? "mentioned"
              : "absent",
            raw_answer: observation.raw_answer,
            sources: observation.sources,
            telemetry: observation.telemetry,
          });
        }
        writeFileSync(
          join(ARTIFACTS_DIR, "variance.json"),
          JSON.stringify(
            {
              note: "Variance measurement only (Spec 003 R-22). Never feeds the reported count, denominators, findings, or actions.",
              reasked_prompt_ids: variancePromptIds,
              main_run_headline_count: record.observations,
              results: varianceResults,
            },
            null,
          2,
          ),
          "utf8",
        );
        record.variance = {
          reasked_prompt_ids: variancePromptIds,
          results: varianceResults.map((result) => ({
            prompt_id: result.prompt_id,
            run_status: result.run_status,
            appearance: result.appearance,
            attempts: result.attempts,
          })),
        };

        // ================= 06 — Report pipeline (real synthesis call) ======
        const budgetWithObservations: AuditBudget = {
          ...mainBudget,
          calls: [...mainBudget.calls, ...totalObservationTelemetry],
        };
        let pipelineOutput: unknown = null;
        let pipelineError = "";
        try {
          const { createValidatedAuditReport } = await import(
            "../../src/lib/audit/report-pipeline"
          );
          pipelineOutput = await createValidatedAuditReport({
            brief: SOZO_BRIEF,
            prompts,
            observations: summary.observations,
            safety_identifier: SAFETY_IDENTIFIER,
            budget: budgetWithObservations,
          });
        } catch (error) {
          pipelineError =
            error instanceof Error ? error.message : "Report pipeline failed without details.";
        }
        if (pipelineOutput !== null) {
          writeFileSync(
            join(ARTIFACTS_DIR, "report-pipeline-output.json"),
            JSON.stringify(pipelineOutput, null, 2),
            "utf8",
          );
        }
        record.report_pipeline = pipelineError ? { status: "failed", error: pipelineError } : { status: "completed" };

        // ================= Telemetry summary ===============================
        const allCalls = [
          ...totalObservationTelemetry,
          ...(pipelineOutput && typeof pipelineOutput === "object" && "operational_telemetry" in pipelineOutput
            ? ((pipelineOutput as { operational_telemetry: { calls: unknown[] } }).operational_telemetry.calls as unknown[])
            : []),
        ];
        const telemetryArtifact = {
          pricing_version: "openai-standard-2026-08-01",
          cost_limit_usd: LIMIT_USD,
          carryover_cost_usd: CARRYOVER_COST_USD,
          main_run: {
            observation_calls: totalObservationTelemetry.length,
            summary: summarizeAuditTelemetry(
              totalObservationTelemetry,
              LIMIT_USD,
              CARRYOVER_COST_USD,
            ),
          },
          variance_measurement: {
            calls: varianceBudget.calls.length,
            summary: summarizeAuditTelemetry(
              varianceBudget.calls,
              LIMIT_USD,
              CARRYOVER_COST_USD,
            ),
          },
          report_pipeline: pipelineOutput
            ? {
                call_count: (pipelineOutput as { provenance: { report_call_count: number } }).provenance.report_call_count,
                language_retry_performed: (pipelineOutput as { provenance: { language_retry_performed: boolean } }).provenance.language_retry_performed,
              }
            : { status: "failed" },
          http_calls: httpCalls.map((call) => ({
            url: call.url.replace(/\/v1\/responses.*/, "/v1/responses"),
            status: call.status,
            latency_ms: call.latency_ms,
            started_at: new Date(call.started_at_ms).toISOString(),
            body: sanitizeHttpBody(call.body),
          })),
          all_calls_recorded: allCalls.length,
        };
        writeFileSync(
          join(ARTIFACTS_DIR, "telemetry.json"),
          JSON.stringify(telemetryArtifact, null, 2),
          "utf8",
        );
        record.telemetry = {
          main_run_calls: totalObservationTelemetry.length,
          main_run_accounted_cost_usd:
            telemetryArtifact.main_run.summary.accounted_cost_usd,
          variance_calls: varianceBudget.calls.length,
          variance_accounted_cost_usd:
            telemetryArtifact.variance_measurement.summary.accounted_cost_usd,
          total_accounted_cost_usd:
            telemetryArtifact.main_run.summary.accounted_cost_usd +
            telemetryArtifact.variance_measurement.summary.accounted_cost_usd,
          ceiling_headroom_after_run_usd:
            LIMIT_USD - CARRYOVER_COST_USD - (telemetryArtifact.main_run.summary.accounted_cost_usd + telemetryArtifact.variance_measurement.summary.accounted_cost_usd),
        };

        // Ceiling guard: total accounted cost stays far inside the USD 5 ceiling.
        expect(
          telemetryArtifact.main_run.summary.accounted_cost_usd +
            telemetryArtifact.variance_measurement.summary.accounted_cost_usd,
          "total accounted cost",
        ).toBeLessThan(LIMIT_USD - CARRYOVER_COST_USD);

        record.completed_at = new Date().toISOString();
        writeFileSync(
          join(ARTIFACTS_DIR, "run-record.json"),
          JSON.stringify(record, null, 2),
          "utf8",
        );

        console.log(
          JSON.stringify(
            {
              run_id: RUN_ID,
              pack: {
                source: pack.source,
                count: packValidation.count,
                classification: packValidation.classification,
                blockers: packValidation.blockers,
              },
              observations: record.observations,
              variance: record.variance,
              report_pipeline: record.report_pipeline,
              telemetry: record.telemetry,
            },
            null,
            2,
          ),
        );
      } finally {
        globalThis.fetch = previousFetch;
      }
    },
    900_000,
  );
});
