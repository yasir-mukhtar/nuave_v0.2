#!/usr/bin/env node
/**
 * Test-only generator: writes demo run records (clearly synthetic question
 * strings) into a temp results directory so the review page and the gate CLI
 * can be exercised offline. NEVER points at real results, and the demo
 * strings are never presented as real generation output.
 *
 * Usage: node review/make-demo-data.mjs /tmp/bdq-demo/results
 */
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturesManifest = JSON.parse(
  readFileSync(path.join(root, "fixtures", "manifest.json"), "utf8"),
);

const FIXTURES = fixturesManifest.fixtures.map((entry) => ({
  id: entry.fixture_id,
  role: entry.role,
  sha256: entry.sha256,
  version: entry.version,
  brand: JSON.parse(
    readFileSync(path.join(root, "fixtures", entry.file), "utf8"),
  ).business.brand_name,
}));

const DEMO_A_TEXTS = [
  "Rekomendasi tempat yang cocok di daerah ini apa saja?",
  "Dalam situasi apa calon pelanggan biasanya mencari layanan seperti ini?",
  "Untuk kebutuhan yang saya tulis tadi, pilihan apa yang cocok di daerah ini?",
  "Di mana saya bisa menemukan pilihan yang sesuai di daerah ini?",
  "Pilihan mana yang layak masuk daftar pertimbangan di daerah ini?",
  "Apa perbedaan pilihan yang tersedia di daerah ini?",
  "Apakah BRAND cocok untuk kebutuhan yang saya sebutkan di daerah ini?",
  "Apakah BRAND layak direkomendasikan untuk kebutuhan pelanggan di daerah ini?",
  "Bandingkan BRAND dengan alternatif lain yang tersedia di daerah ini.",
  "Siapa yang cocok memilih BRAND dan siapa yang mungkin kurang cocok?",
];

const DEMO_B_TEXTS = [
  { text: "Rekomendasi tempat yang pas di daerah ini dong?", coverage: "discover_options" },
  { text: "Pilihan apa saja yang ada di daerah ini untuk kebutuhan saya?", coverage: "discover_options" },
  { text: "Di daerah ini cari tempat yang cocok buat kebutuhan saya ke mana ya?", coverage: "find_for_need" },
  { text: "Bisa bandingin beberapa pilihan di daerah ini dari kualitasnya?", coverage: "compare_alternatives" },
  { text: "Pilihan mana di daerah ini yang sering bikin pelanggan kecewa?", coverage: "drawback_check" },
  { text: "Boleh minta saran tempat di daerah ini buat kebutuhan harian?", coverage: "find_for_need" },
  { text: "BRAND di daerah ini recommended nggak?", coverage: "evaluate_business" },
  { text: "Apa bedanya BRAND sama pilihan lain di daerah ini?", coverage: "compare_alternatives" },
  { text: "Apa kekurangan BRAND di daerah ini?", coverage: "drawback_check" },
  { text: "BRAND di daerah ini cocok nggak buat kebutuhan saya?", coverage: "find_for_need" },
];

function classificationFor(text, brand, slotA) {
  const named = slotA ? slotA.order >= 7 : text.includes(brand);
  return named ? "menyebut_bisnis_anda" : "tanpa_menyebut_bisnis_anda";
}

function buildRecord({ runKind, condition, fixture, index }) {
  const brand = fixture.brand;
  const now = new Date("2026-09-06T12:00:00Z");
  now.setMinutes(index);
  const started = now.toISOString();
  const questions =
    condition === "A"
      ? DEMO_A_TEXTS.map((text, position) => ({
          index: position + 1,
          text: text.replace("BRAND", brand),
          generated_by: "model",
          final_classification: classificationFor(text.replace("BRAND", brand), brand, { order: position + 1 }),
          slot: { order: position + 1, category: `category-${position + 1}`, measurement_purpose: `measurement for slot ${position + 1}` },
        }))
      : DEMO_B_TEXTS.map((entry, position) => ({
          index: position + 1,
          text: entry.text.replace("BRAND", brand),
          generated_by: "model",
          final_classification: classificationFor(entry.text.replace("BRAND", brand), brand, null),
          coverage: entry.coverage,
        }));
  const unnamed = questions.filter((q) => q.final_classification === "tanpa_menyebut_bisnis_anda").length;
  return {
    schema: "nuave-bdq-run-record-v1",
    run_id: `${runKind}-demo-${fixture.id}-${condition}`,
    run_kind: runKind,
    condition,
    fixture_id: fixture.id,
    fixture_version: fixture.version,
    fixture_sha256: fixture.sha256,
    status: "completed",
    failure_reason: null,
    started_at: started,
    completed_at: started,
    latency_ms: 1234,
    instruction: condition === "A"
      ? { id: "question-writer-v2", version: "question-writer-v2", sha256: "a".repeat(64), text: "demo", source: "src-question-writer-v2-current", freeze_snapshot_sha256: null }
      : { id: "condition-b-v1", version: "condition-b-v1", sha256: "b".repeat(64), text: "demo", source: "frozen-condition-b-v1", freeze_snapshot_sha256: null },
    model: { requested: "gpt-5.6-luna", returned: "gpt-5.6-luna", response_id: `resp_demo_${index}` },
    provider: { name: "opencodego", endpoint: "https://opencode.ai/zen/go/v1/responses", credential_var_name: "OPENCODEGO_API_KEY", system: "OpenCode Go Responses API" },
    settings: { reasoning_effort: "low", service_tier: "default", max_output_tokens: 2048, text_verbosity: "low", output_schema: condition === "A" ? "nuave_indonesian_questions" : "nuave_buyer_decision_questions", timeout_ms: 180000, web_search_tools: false },
    http: { calls_made: 1, last_status: 200, provider_error: null, timed_out: false },
    input: { kind: condition === "A" ? "minimized_brief" : "buyer_brief", payload: { demo: true } },
    raw_output: { kind: condition === "A" ? "structured" : "b_structured", questions: questions.map((q) => q.text), limitations: [] },
    output: {
      source: "model",
      warnings: [],
      questions,
      classification: { total: 10, unnamed, named: 10 - unnamed },
      valid: true,
      validation_issues: [],
    },
    provenance_errors: [],
    notes: ["DEMO RECORD — synthetic strings for offline UI/CLI verification only"],
  };
}

const outDir = process.argv[2];
if (!outDir) {
  console.error("usage: node make-demo-data.mjs <results-dir>");
  process.exit(2);
}
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

let index = 0;
for (const fixture of FIXTURES) {
  for (const condition of ["A", "B"]) {
    const record = buildRecord({ runKind: "initial", condition, fixture, index });
    writeFileSync(path.join(outDir, `${record.run_id}.json`), `${JSON.stringify(record, null, 1)}\n`);
    index += 1;
  }
}
console.log(`Wrote demo records for ${FIXTURES.length} fixtures × (A+B) into ${outDir}`);
