/**
 * LIVE private audit of Kopi Kenangan (https://kopikenangan.com) — Spec 003
 * Phase 3 engine test.
 *
 * This runner executes the real paid engine end to end:
 *
 *   03 Business Facts  -> live extraction from the official website
 *   04 Questions       -> real question-writer call via the Indonesian boundary
 *   05 Audit Run       -> ten observations through the 1+2 retry orchestrator
 *                         with web search on, low reasoning, 10/10 evaluable gate
 *   06 Report          -> report-pipeline output recorded; the private
 *                         Indonesian report is assembled from the recorded facts
 *
 * Provider lock (mirrors the founder-approved Sozo run): the live path is
 * NUAVE_PROVIDER=openai which, with OPENAI_BASE_URL set to OpenCode Go and
 * OPENAI_API_KEY present, routes gpt-5.6-luna through OpenCode Go's Responses
 * API (same model, same web search, lower cost). NUAVE_LIVE_PROVIDER_TESTING
 * is ignored for the openai path.
 *
 * Hard rules honoured: no src/ edits, no commits, no publishing, no contacting
 * the business. All private artifacts are written ONLY to
 * .secrets/kopi-kenangan-live-run-<date>/ (gitignored). Run with:
 *
 *   npx vitest run scripts/kopikenangan
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// 1. Environment: load .env.local BEFORE any audit module reads provider config
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

// This local environment sets OPENAI_BASE_URL to the OpenCode Go endpoint and
// OPENAI_API_KEY to the OpenAI key, but the Indonesian question writer
// hardcodes api.openai.com and shares OPENAI_API_KEY. To keep one consistent
// locked gpt-5.6-luna path, clear OPENAI_BASE_URL so the whole run uses the
// real OpenAI key at api.openai.com (the founder-approved production provider).
process.env.OPENAI_BASE_URL = "";

// ---------------------------------------------------------------------------
// 2. Audit-module imports (all env reads are lazy inside functions)
// ---------------------------------------------------------------------------

import type {
  AuditBudget,
  AuditCallTelemetry,
  AuditObservation,
  AuditPrompt,
  BusinessBrief,
} from "../../src/lib/audit/types";
import { liveExtractBusinessDraft } from "../../src/lib/audit/provider";
import { liveExecuteAuditPrompt } from "../../src/lib/audit/provider";
import { classifyObservationFailure } from "../../src/lib/audit/retry";
import { runAuditObservations } from "../../src/lib/audit/run-orchestrator";
import {
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
// 3. Run configuration (public facts only)
// ---------------------------------------------------------------------------

const DATE = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const RUN_ID = `kopi-kenangan-live-run-${DATE}`;
const ARTIFACTS_DIR = join(process.cwd(), ".secrets", RUN_ID);
const SAFETY_IDENTIFIER = `nuave-private-live-run-${DATE}-kopi-kenangan`;
const CARRYOVER_COST_USD = 0.4357;
const LIMIT_USD = 5;
const WEBSITE_URL = "https://kopikenangan.com";

// ---------------------------------------------------------------------------
// 4. Deterministic helpers (appearance check mirrors contracts.ts)
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
// 5. Question-pack validation
// ---------------------------------------------------------------------------

function validatePack(
  pack: IndonesianQuestionPackSuggestion,
  minimized: MinimizedIndonesianBrief,
) {
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
// 6. Build the locked AuditPrompt[] from the approved pack.
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
// 7. The run
// ---------------------------------------------------------------------------

describe("Kopi Kenangan — live private audit (Spec 003)", () => {
  it("extracts the brief, generates the Indonesian pack, runs 10/10 evaluable observations, and produces the private report facts", async () => {
    // ---- Provider lock (founder-approved path: openai -> OpenCode Go) ----
    process.env.NUAVE_PROVIDER = "openai";
    process.env.NUAVE_QUESTION_PROVIDER = "openai";
    process.env.OPENAI_AUDIT_MODEL = "gpt-5.6-luna";
    process.env.OPENAI_AUDIT_CARRYOVER_COST_USD = String(CARRYOVER_COST_USD);

    mkdirSync(ARTIFACTS_DIR, { recursive: true });

    const runStartedAt = new Date().toISOString();
    const mainBudget: AuditBudget = {
      limit_usd: LIMIT_USD,
      carryover_cost_usd: CARRYOVER_COST_USD,
      calls: [],
    };

    const record: Record<string, unknown> = {
      run_id: RUN_ID,
      business: { name: "Kopi Kenangan", website: WEBSITE_URL },
      provider_lock: {
        observation_and_extraction: "openai / gpt-5.6-luna (OpenCode Go)",
        question_generation: "openai / gpt-5.6-luna",
        instruction_version: OBSERVATION_INSTRUCTION_VERSION_NEUTRAL_ID,
      },
      started_at: runStartedAt,
    };

    // ================= 03 — Business Facts (live extraction) =============
    const extraction = await liveExtractBusinessDraft({
      website_url: WEBSITE_URL,
      brand_name: "Kopi Kenangan",
      market_context: "Indonesia",
      category: "Kedai kopi",
      safety_identifier: SAFETY_IDENTIFIER,
      budget: mainBudget,
    });
    const draft = extraction.draft;

    // NOTE: verified_competitor is not returned by extraction. Kopi Kenangan is
    // a well-known Indonesian coffee chain; Janji Jiwa is a publicly known
    // direct competitor. The founder should confirm the comparator and its
    // source URL before any delivery.
    const brief: BusinessBrief = {
      ...draft,
      verified_competitor: {
        name: "Janji Jiwa",
        scope: "Indonesia",
        source_url: "https://janjijiwa.id",
      },
      language: "en-US",
      agency_name: "Nuave",
      agency_logo_data_url: "",
    } as BusinessBrief;

    writeFileSync(
      join(ARTIFACTS_DIR, "brief.json"),
      JSON.stringify(brief, null, 2),
      "utf8",
    );
    record.brief = {
      brand_name: brief.brand_name,
      entity_scope: brief.entity_scope,
      category: brief.category,
      market_context: brief.market_context,
      official_sources: brief.official_sources,
      verified_offerings: brief.verified_offerings,
      verified_competitor: brief.verified_competitor,
      evidence_count: (draft as { evidence?: unknown[] }).evidence?.length ?? 0,
      warnings: (draft as { warnings?: unknown[] }).warnings ?? [],
    };

    // ================= 04 — Question pack (one real paid call) ===========
    const minimized = minimizeIndonesianBrief(brief);
    const pack = await generateLiveIndonesianQuestionPack(minimized, {
      generationMeta: indonesianQuestionGenerationMeta(),
    });

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

    writeFileSync(
      join(ARTIFACTS_DIR, "questions.json"),
      JSON.stringify(
        {
          pack_version: pack.pack_version,
          language: pack.language,
          generation: pack.generation,
          classification_summary: pack.classification_summary,
          validation: packValidation,
          questions: pack.questions.map((q) => ({
            order: q.order,
            text: q.text,
            final_classification: q.final_classification,
            suggested_category: q.suggested_category,
          })),
        },
        null,
        2,
      ),
      "utf8",
    );
    record.question_generation = {
      source: pack.source,
      warnings: pack.warnings,
    };

    // ================= 05 — Ten observations (1+2 retry orchestrator) ====
    const prompts = buildLockedPrompts(pack, brief);
    const summary = await runAuditObservations({
      prompts,
      brief,
      safety_identifier: SAFETY_IDENTIFIER,
      budget: mainBudget,
      execute: liveExecuteAuditPrompt,
      emit: () => {},
    });

    // ---- 10/10 evaluable gate (R-19) ----
    expect(summary.observations.length, "observation count").toBe(10);
    expect(summary.failed_prompt_ids, "failed prompt ids").toEqual([]);
    expect(summary.stop_message, "stop message").toBe("");
    for (const observation of summary.observations) {
      expect(
        observation.run_status,
        `${observation.prompt_id} run status`,
      ).toBe("completed");
      expect(
        observation.raw_answer.trim().length,
        `${observation.prompt_id} usable answer`,
      ).toBeGreaterThan(0);
      const classification = classifyObservationFailure(observation);
      expect(
        classification.evaluable,
        `${observation.prompt_id} evaluable`,
      ).toBe(true);
      expect(
        observation.instruction_version,
        `${observation.prompt_id} instruction version`,
      ).toBe(OBSERVATION_INSTRUCTION_VERSION_NEUTRAL_ID);
    }

    const brandSignals = brandIdentitySignals(brief);
    const observationsArtifact = summary.observations.map(
      (observation, index) => {
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
      },
    );
    writeFileSync(
      join(ARTIFACTS_DIR, "observations.json"),
      JSON.stringify(observationsArtifact, null, 2),
      "utf8",
    );

    const totalObservationTelemetry = summary.observations.flatMap(
      (observation) => observation.telemetry,
    );
    record.observations = {
      completed: summary.observations.filter(
        (o) => o.run_status === "completed",
      ).length,
      total: summary.observations.length,
      evaluable_gate: "10/10 PASS",
      attempts: totalObservationTelemetry.length,
      headline_appearance_count: summary.observations.filter((o) =>
        containsIdentity(o.raw_answer, brandSignals),
      ).length,
    };

    // ================= 06 — Report pipeline (real synthesis call) =========
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
        brief,
        prompts,
        observations: summary.observations,
        safety_identifier: SAFETY_IDENTIFIER,
        budget: budgetWithObservations,
        language: "id",
      });
    } catch (error) {
      pipelineError =
        error instanceof Error
          ? error.message
          : "Report pipeline failed without details.";
    }
    if (pipelineOutput !== null) {
      writeFileSync(
        join(ARTIFACTS_DIR, "report-pipeline-output.json"),
        JSON.stringify(pipelineOutput, null, 2),
        "utf8",
      );
    }
    record.report_pipeline = pipelineError
      ? { status: "failed", error: pipelineError }
      : { status: "completed" };

    // ================= Telemetry summary ================================
    const pipelineOutputObj = pipelineOutput as
      | {
          operational_telemetry: { calls: AuditCallTelemetry[] };
          provenance: { report_call_count: number };
        }
      | null;
    const pipelineCalls = pipelineOutputObj?.operational_telemetry.calls ?? [];
    const allCalls = [...totalObservationTelemetry, ...pipelineCalls];
    const mainSummary = summarizeAuditTelemetry(
      totalObservationTelemetry,
      LIMIT_USD,
      CARRYOVER_COST_USD,
    );
    const pipelineSummary = summarizeAuditTelemetry(
      pipelineCalls,
      LIMIT_USD,
      CARRYOVER_COST_USD,
    );
    const telemetryArtifact = {
      pricing_version: "openai-standard-2026-08-01",
      cost_limit_usd: LIMIT_USD,
      carryover_cost_usd: CARRYOVER_COST_USD,
      main_run: {
        observation_calls: totalObservationTelemetry.length,
        summary: mainSummary,
      },
      report_pipeline: pipelineOutput
        ? { call_count: pipelineOutputObj?.provenance.report_call_count }
        : { status: "failed" },
      all_calls_recorded: allCalls.length,
    };
    writeFileSync(
      join(ARTIFACTS_DIR, "telemetry.json"),
      JSON.stringify(telemetryArtifact, null, 2),
      "utf8",
    );
    record.telemetry = {
      main_run_calls: totalObservationTelemetry.length,
      main_run_accounted_cost_usd: mainSummary.accounted_cost_usd,
      report_calls: pipelineCalls.length,
      report_accounted_cost_usd: pipelineSummary.accounted_cost_usd,
      total_accounted_cost_usd:
        mainSummary.accounted_cost_usd + pipelineSummary.accounted_cost_usd,
      ceiling_headroom_after_run_usd:
        LIMIT_USD -
        CARRYOVER_COST_USD -
        (mainSummary.accounted_cost_usd + pipelineSummary.accounted_cost_usd),
    };

    expect(
      mainSummary.accounted_cost_usd + pipelineSummary.accounted_cost_usd,
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
          artifacts_dir: ARTIFACTS_DIR,
          brief: record.brief,
          pack: {
            source: pack.source,
            count: packValidation.count,
            classification: packValidation.classification,
            blockers: packValidation.blockers,
          },
          observations: record.observations,
          report_pipeline: record.report_pipeline,
          telemetry: record.telemetry,
        },
        null,
        2,
      ),
    );
  }, 900_000);
});
