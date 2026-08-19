/**
 * Phase 2 — LIVE Kopi Kenangan audit run (confirmed brief -> questions ->
 * 10 observations -> Indonesian report) through the low-cost OpenCode Go
 * provider.
 *
 * Stages (per the current pipeline wiring in NOW.md):
 *   04 Questions   -> deterministic Indonesian pack, NO API call
 *                      (buildDeterministicIndonesianPack via the boundary's
 *                      fallback path; matches the documented current wiring)
 *   05 Audit Run   -> ten observations through run-orchestrator (1+2 retry,
 *                      10/10 evaluable gate), web search on
 *   06 Report      -> createValidatedAuditReport, language "id"
 *
 * The confirmed BusinessBrief is the founder-approved facts from Phase 1
 * (extraction suggestion + verified comparator). Output is written ONLY to
 * .secrets/kk-live-run-2026-08-19/ (gitignored). No src/ edits, no commits,
 * no publishing.
 *
 * Runtime-only key workaround (same as Phase 1): the OpenAI SDK client reads
 * OPENAI_API_KEY, the working OpenCode Go credential is OPENCODEGO_API_KEY,
 * and OPENAI_BASE_URL already points at the OpenCode Go endpoint.
 *
 * Run: npx --yes tsx scripts/kk/run.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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

// Runtime-only key workaround (see header): route the OpenAI SDK to OpenCode Go
// with the working key. .env.local's OPENAI_API_KEY is invalid against the
// OpenCode endpoint (probe returned 401), so override unconditionally.
if (process.env.OPENCODEGO_API_KEY) {
  process.env.OPENAI_API_KEY = process.env.OPENCODEGO_API_KEY;
}

import type {
  AuditBudget,
  AuditObservation,
  AuditPrompt,
  AuditReport,
  BusinessBrief,
} from "../../src/lib/audit/types";
import type { AuditRunEvent } from "../../src/lib/audit/stream";
import { executeAuditPrompt } from "../../src/lib/audit/provider";
import { runAuditObservations } from "../../src/lib/audit/run-orchestrator";
import {
  buildDeterministicIndonesianPack,
  classifyIndonesianQuestion,
  indonesianPackBlockers,
  minimizeIndonesianBrief,
  validateIndonesianQuestionPack,
  INDONESIAN_SLOT_MATRIX,
} from "../../src/lib/audit/questions-id";
import {
  OBSERVATION_INSTRUCTION_VERSION_NEUTRAL_ID,
  PROMPT_MATRIX,
} from "../../src/lib/audit/contracts";
import { summarizeAuditTelemetry } from "../../src/lib/audit/telemetry";

const RUN_ID = "kk-live-run-2026-08-19";
const ARTIFACTS_DIR = join(process.cwd(), ".secrets", RUN_ID);
const SAFETY_IDENTIFIER = "nuave-private-live-run-2026-08-19-kopi-kenangan";
const LIMIT_USD = 5;

// ---------------------------------------------------------------------------
// Founder-approved confirmed brief (public facts only; Phase 1 extraction
// suggestion + verified comparator Janji Jiwa).
// ---------------------------------------------------------------------------
const KK_BRIEF: BusinessBrief = {
  brand_name: "Kopi Kenangan",
  brand_name_variants: ["Kenangan", "Coffee Memories"],
  entity_scope: "Jaringan kedai kopi grab-and-go nasional di Indonesia",
  brand_type: "Jaringan kedai kopi",
  category: "Jaringan kedai kopi",
  market_context: "Indonesia",
  target_customer:
    "Masyarakat Indonesia yang mencari kopi dan minuman praktis dengan pemesanan mudah via aplikasi atau outlet.",
  official_sources: ["https://kopikenangan.com/"],
  verified_offerings: [
    "kopi dan minuman",
    "Kenangan Beans",
    "pemesanan via aplikasi",
    "layanan pickup dan delivery",
  ],
  verified_customer_needs: [
    "pemesanan praktis via aplikasi atau outlet",
    "promo dan keuntungan membership",
  ],
  verified_decision_criteria: [
    "bahan baku lokal",
    "informasi sourcing dan roasting kopi",
    "sertifikasi halal",
  ],
  verified_competitor: {
    name: "Janji Jiwa",
    scope: "Jaringan kedai kopi grab-and-go nasional di Indonesia",
    source_url: "https://janjijiwa.co.id",
  },
  priority_offering: "kopi dan minuman",
  conversion_action: "pemesanan via aplikasi atau kunjungan outlet",
  customer_supplied_facts: [
    "Market context supplied: Indonesia",
    "Category supplied: Jaringan kedai kopi",
  ],
  known_accuracy_questions: [
    "Outlet dan produk mana yang sedang tersedia di Indonesia saat ini?",
    "Apakah sertifikasi halal yang disebutkan masih berlaku untuk seluruh produk?",
    "Apa syarat dan keuntungan pemesanan via aplikasi saat ini?",
  ],
  usp: "Kopi dari bahan lokal segar dengan pemesanan via aplikasi dan keuntungan membership.",
  regulated_category_notes:
    "Situs resmi menyebut sertifikasi halal; cakupan dan masa berlakunya perlu dikonfirmasi.",
  language: "en-US",
  agency_name: "Nuave",
  agency_logo_data_url: "",
};

// ---------------------------------------------------------------------------
// Deterministic helpers (mirror contracts.ts)
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

// ---------------------------------------------------------------------------
// Build locked AuditPrompt[] from the deterministic pack (NVA-ID-01..10)
// ---------------------------------------------------------------------------
function buildLockedPrompts(
  questions: string[],
  brief: BusinessBrief,
): AuditPrompt[] {
  return questions.map((text, index) => {
    const spec = PROMPT_MATRIX[index];
    const branded = classifyIndonesianQuestion(
      text,
      minimizeIndonesianBrief(brief),
    ) === "menyebut_bisnis_anda";
    const inputs = branded
      ? ["brand_name", "entity_scope", "category", "market_context"]
      : ["category", "market_context", "target_customer"];
    return {
      prompt_id: `NVA-ID-${String(index + 1).padStart(2, "0")}`,
      category: spec[1],
      role: spec[3],
      branded,
      question: text,
      rationale: `${spec[3]}. Built from verified ${inputs.join(", ")}.`,
      inputs_used: inputs,
      review_status: "needs_human_review",
    };
  });
}

function renderReport(report: AuditReport): string {
  const lines: string[] = [];
  lines.push("# AI Visibility Report — Kopi Kenangan (auto pipeline)");
  lines.push("");
  lines.push(
    `> Generated ${report.generated_at} · writing standard ${report.writing_standard_version}`,
  );
  lines.push("");
  const d = report.facts.discovery;
  const recognition = report.facts.recognition;
  const appearedTotal = d.recommended + d.mentioned_not_recommended + recognition.recognized;
  lines.push("## Hasil utama");
  lines.push("");
  lines.push(
    `**Bisnis Anda muncul di ${appearedTotal} dari ${d.recommended + d.mentioned_not_recommended + d.absent + d.failed + recognition.total} pertanyaan**`,
  );
  lines.push("");
  lines.push(
    `- Tanpa menyebut bisnis Anda: ${d.recommended + d.mentioned_not_recommended} dari ${d.recommended + d.mentioned_not_recommended + d.absent}`,
  );
  lines.push(`- Menyebut bisnis Anda: ${recognition.recognized} dari ${recognition.total}`);
  lines.push(
    `- Direkomendasikan: ${d.recommended} · Disebut tanpa rekomendasi: ${d.mentioned_not_recommended} · Tidak muncul: ${d.absent} · Gagal: ${d.failed}`,
  );
  lines.push("");
  lines.push("## Kesimpulan");
  lines.push("");
  lines.push(report.conclusion);
  lines.push("");
  lines.push("## Temuan kunci");
  lines.push("");
  for (const finding of report.key_findings) {
    lines.push(`- **${finding.title}** — ${finding.explanation}`);
  }
  lines.push("");
  lines.push("## Langkah berikutnya");
  lines.push("");
  for (const priority of report.priorities) {
    lines.push(
      `- (${priority.order}) ${priority.action} — ${priority.why} Pemilik: ${priority.owner} · Selesai ketika: ${priority.done_when}`,
    );
  }
  lines.push("");
  lines.push("## Hasil per pertanyaan");
  lines.push("");
  lines.push("| Pertanyaan | Kemunculan | Rekomendasi | Perbandingan | Informasi |");
  lines.push("|---|---|---|---|---|");
  for (const detail of report.details) {
    lines.push(
      `| ${detail.prompt_id} | ${detail.appearance} | ${detail.recommendation} | ${detail.comparison} | ${detail.information} |`,
    );
  }
  lines.push("");
  lines.push("## Metode");
  lines.push("");
  lines.push(report.method_summary);
  return lines.join("\n");
}

async function main() {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  console.log(`Provider: ${process.env.NUAVE_PROVIDER} · Base: ${process.env.OPENAI_BASE_URL}`);
  console.log(`Model: ${process.env.OPENAI_AUDIT_MODEL || "gpt-5.6-luna"}`);

  const record: Record<string, unknown> = {
    run_id: RUN_ID,
    business: { name: KK_BRIEF.brand_name, market_context: KK_BRIEF.market_context },
    provider_lock: {
      observation_and_report: "opencodego (OpenAI Responses API, gpt-5.6-luna)",
      question_generation: "deterministic Indonesian pack (no API call)",
      instruction_version: OBSERVATION_INSTRUCTION_VERSION_NEUTRAL_ID,
    },
    started_at: new Date().toISOString(),
  };

  // ================= 04 — Deterministic Indonesian pack (no API call) ======
  const minimized = minimizeIndonesianBrief(KK_BRIEF);
  const questions = buildDeterministicIndonesianPack(minimized);
  const blockers = indonesianPackBlockers(questions, minimized);
  const issues = validateIndonesianQuestionPack(questions, minimized);
  if (blockers.length) {
    throw new Error(`Question pack blocked: ${blockers.join(" ")}`);
  }
  const classified = questions.map((text, index) => ({
    order: index + 1,
    text,
    classification: classifyIndonesianQuestion(text, minimized),
    suggested_category: INDONESIAN_SLOT_MATRIX[index].suggested_category,
  }));
  writeFileSync(
    join(ARTIFACTS_DIR, "questions.json"),
    JSON.stringify({ source: "fallback_deterministic", blockers, issues, questions: classified }, null, 2),
    "utf8",
  );
  record.questions = {
    source: "deterministic",
    count: questions.length,
    classification: {
      tanpa_menyebut_bisnis_anda: classified.filter((q) => q.classification === "tanpa_menyebut_bisnis_anda").length,
      menyebut_bisnis_anda: classified.filter((q) => q.classification === "menyebut_bisnis_anda").length,
    },
    blockers,
    issues: issues.length,
  };
  console.log("\n=== APPROVED QUESTION PACK (deterministic) ===");
  for (const q of classified) {
    console.log(`${String(q.order).padStart(2, " ")}. [${q.classification}] ${q.text}`);
  }

  // ================= 05 — Ten observations (1+2 retry orchestrator) ========
  const prompts = buildLockedPrompts(questions, KK_BRIEF);
  const budget: AuditBudget = { limit_usd: LIMIT_USD, carryover_cost_usd: 0, calls: [] };
  const events: AuditRunEvent[] = [];
  const runStartedAt = new Date().toISOString();

  const summary = await runAuditObservations({
    prompts,
    brief: KK_BRIEF,
    safety_identifier: SAFETY_IDENTIFIER,
    budget,
    execute: executeAuditPrompt,
    emit: (event) => events.push(event),
  });

  const completed = summary.observations.filter(
    (o) => o.run_status === "completed",
  ).length;
  if (completed !== 10 || summary.failed_prompt_ids.length > 0) {
    throw new Error(
      `Run did not reach 10/10: completed=${completed}, failed=${summary.failed_prompt_ids.join(", ")}, stop=${summary.stop_message}`,
    );
  }

  const brandSignals = brandIdentitySignals(KK_BRIEF);
  const observationsArtifact = summary.observations.map((observation, index) => ({
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
    attempts: (summary.attemptsByPrompt[observation.prompt_id] ?? []).length,
    appearance: containsIdentity(observation.raw_answer, brandSignals) ? "mentioned" : "absent",
    answer_length_chars: observation.raw_answer.length,
    source_count: observation.sources.length,
    raw_answer: observation.raw_answer,
    sources: observation.sources,
  }));
  writeFileSync(
    join(ARTIFACTS_DIR, "observations.json"),
    JSON.stringify(observationsArtifact, null, 2),
    "utf8",
  );

  const observationTelemetry = summary.observations.flatMap((o) => o.telemetry);
const observationsRecord = {
  completed,
  total: summary.observations.length,
  evaluable_gate: "10/10 PASS",
  headline_appearance_count: summary.observations.filter((o) =>
    containsIdentity(o.raw_answer, brandSignals),
  ).length,
  events: events.map((event) => event.type),
};
record.observations = observationsRecord;
console.log(`\n=== OBSERVATIONS === ${completed}/10 completed · headline count ${observationsRecord.headline_appearance_count}`);

  // ================= 06 — Indonesian report pipeline =======================
  const budgetWithObservations: AuditBudget = {
    ...budget,
    calls: [...budget.calls, ...observationTelemetry],
  };
  const { createValidatedAuditReport } = await import("../../src/lib/audit/report-pipeline");
  const report = await createValidatedAuditReport({
    brief: KK_BRIEF,
    prompts,
    observations: summary.observations,
    safety_identifier: SAFETY_IDENTIFIER,
    budget: budgetWithObservations,
    language: "id",
  });
  writeFileSync(
    join(ARTIFACTS_DIR, "report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
  writeFileSync(join(ARTIFACTS_DIR, "report.md"), renderReport(report), "utf8");

  // ================= Telemetry =============================================
  const reportCalls = (report.operational_telemetry as { calls?: unknown[] }).calls ?? [];
  const telemetryArtifact = {
    cost_limit_usd: LIMIT_USD,
    carryover_cost_usd: 0,
    observation_calls: observationTelemetry.length,
    observation_summary: summarizeAuditTelemetry(observationTelemetry, LIMIT_USD, 0),
    report_call_count: report.provenance.report_call_count,
    language_retry_performed: report.provenance.language_retry_performed,
    report_accounted_cost_usd: report.operational_telemetry.accounted_cost_usd,
  };
  writeFileSync(
    join(ARTIFACTS_DIR, "telemetry.json"),
    JSON.stringify(telemetryArtifact, null, 2),
    "utf8",
  );
  record.telemetry = telemetryArtifact;
  record.completed_at = new Date().toISOString();
  writeFileSync(
    join(ARTIFACTS_DIR, "run-record.json"),
    JSON.stringify(record, null, 2),
    "utf8",
  );

  console.log("\n=== RUN RECORD ===");
  console.log(JSON.stringify(record, null, 2));
  console.log(`\nArtifacts: ${ARTIFACTS_DIR}`);
  console.log("PIPELINE PASS");
}

main().catch((error) => {
  console.error("RUN FAILED:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});