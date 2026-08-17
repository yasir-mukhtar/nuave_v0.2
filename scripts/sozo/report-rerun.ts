/**
 * Sozo Dental live-run REPORT RERUN through the fixed automatic pipeline
 * (Spec 003 R-19/R-37, report-synthesis-v4).
 *
 * The first live run (2026-08-17) produced 10/10 evaluable observations but
 * the report synthesis was rejected by its own integrity gate (the model
 * returned not_assessed for completed questions). The synthesis instruction
 * was fixed (openai.ts, report-synthesis-v4). This script re-runs ONLY the
 * report synthesis against the SAVED observations (no new observation spend)
 * through createValidatedAuditReport with the real live provider
 * (fail-closed OpenAI gpt-5.6-luna). Output: .secrets/sozo-live-run-2026-08-17/
 * report-pipeline.md + report-pipeline-telemetry.json (gitignored; never
 * committed). Run with: npx --yes tsx scripts/sozo/report-rerun.ts
 */

// Provider lock BEFORE module evaluation: the protected live path fails
// closed to OpenAI unless NUAVE_LIVE_PROVIDER_TESTING=1 (never set here).
process.env.NUAVE_PROVIDER = "openai";
process.env.NUAVE_QUESTION_PROVIDER = "openai";

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Load .env.local (API key + carryover) before the audit modules read env.
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

import { createValidatedAuditReport } from "../../src/lib/audit/report-pipeline";
import { configuredAuditCarryoverCostUsd } from "../../src/lib/audit/telemetry";
import type {
  AuditBudget,
  AuditObservation,
  AuditPrompt,
  AuditReport,
  BusinessBrief,
} from "../../src/lib/audit/types";

const DIR = join(process.cwd(), ".secrets", "sozo-live-run-2026-08-17");

// Frozen confirmed brief (public facts only) — identical to the evaluation
// runner's CLINICS[0].brief (founder-confirmed Sozo Dental Depok/Margonda).
const sozoBrief: BusinessBrief = {
  brand_name: "Sozo Dental Depok",
  brand_name_variants: [
    "SOZO Dental",
    "Sozo Dental Margonda",
    "Sozo Dental Clinic",
  ],
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

function renderReport(report: AuditReport): string {
  const lines: string[] = [];
  lines.push("# AI Visibility Report — Sozo Dental Depok (auto pipeline)");
  lines.push("");
  lines.push(
    `> Generated ${report.generated_at} · writing standard ${report.writing_standard_version}`,
  );
  lines.push("");
  const d = report.facts.discovery;
  const appearedDiscovery = d.recommended + d.mentioned_not_recommended;
  const recognition = report.facts.recognition;
  const appearedTotal = appearedDiscovery + recognition.recognized;
  lines.push(`## Hasil utama`);
  lines.push("");
  lines.push(
    `**Bisnis Anda muncul di ${appearedTotal} dari ${appearedDiscovery + recognition.total} pertanyaan**`,
  );
  lines.push("");
  lines.push(
    `- Tanpa menyebut bisnis Anda: ${appearedDiscovery} dari ${appearedDiscovery + d.absent}`,
  );
  lines.push(
    `- Menyebut bisnis Anda: ${recognition.recognized} dari ${recognition.total}`,
  );
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
  lines.push(
    "| Pertanyaan | Kemunculan | Rekomendasi | Perbandingan | Informasi |",
  );
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
  lines.push("");
  lines.push("## Proses dan bukti");
  lines.push("");
  lines.push(
    `- Prompt synthesis: ${report.provenance.report_prompt_version} · Contract: ${report.provenance.prompt_contract_version}`,
  );
  lines.push(
    `- Model diminta: ${report.provenance.requested_report_model} · Dikembalikan: ${report.provenance.returned_report_model}`,
  );
  lines.push(
    `- Jumlah panggilan synthesis: ${report.provenance.report_call_count} · Retry bahasa: ${report.provenance.language_retry_performed}`,
  );
  lines.push(
    `- Biaya tercatat: USD ${report.operational_telemetry.accounted_cost_usd} · Panggilan: ${report.operational_telemetry.call_count}`,
  );
  return lines.join("\n");
}

async function main() {
  const observations = JSON.parse(
    readFileSync(join(DIR, "observations.json"), "utf8"),
  ) as AuditObservation[];

  // The report gate (R-19) requires ten unique locked prompts, each with one
  // evaluable observation — the saved run is exactly that.
  const prompts: AuditPrompt[] = observations.map((observation) => ({
    prompt_id: observation.prompt_id,
    category: observation.category,
    role: "Pertanyaan pelanggan",
    branded: observation.branded,
    question: observation.question,
    rationale: "Pertanyaan dari paket Indonesia yang dikunci.",
    inputs_used: ["brand_name"],
    review_status: "needs_human_review",
  }));

  const budget: AuditBudget = {
    limit_usd: 5,
    carryover_cost_usd: configuredAuditCarryoverCostUsd(),
    calls: [],
  };

  console.log(
    `Observations loaded: ${observations.length} (all ${observations.every((o) => o.run_status === "completed") ? "completed" : "NOT ALL COMPLETED"})`,
  );
  const startedAt = Date.now();

  try {
    const report = await createValidatedAuditReport({
      brief: sozoBrief,
      prompts,
      observations,
      safety_identifier: "sozo-rerun-2026-08-17",
      budget,
    });
    const elapsedMs = Date.now() - startedAt;
    writeFileSync(
      join(DIR, "report-pipeline.md"),
      renderReport(report),
      "utf8",
    );
    writeFileSync(
      join(DIR, "report-pipeline-telemetry.json"),
      JSON.stringify(
        {
          passed: true,
          elapsed_ms: elapsedMs,
          provenance: report.provenance,
          operational_telemetry: report.operational_telemetry,
          budget_calls: budget.calls,
          method_summary: report.method_summary,
        },
        null,
        2,
      ),
      "utf8",
    );
    console.log("PIPELINE PASS");
    console.log(
      JSON.stringify(
        {
          elapsed_ms: elapsedMs,
          report_response_id: report.provenance.report_response_id,
          returned_model: report.provenance.returned_report_model,
          call_count: report.provenance.report_call_count,
          accounted_cost_usd: report.operational_telemetry.accounted_cost_usd,
          details: report.details.length,
          priorities: report.priorities.length,
          discovery: report.facts.discovery,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error("PIPELINE REJECTED:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("RERUN FAILED:", error);
  process.exit(1);
});
