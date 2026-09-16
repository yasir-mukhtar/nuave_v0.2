/**
 * One-shot Kopi Sudut question-writer measurement.
 *
 * Founder-authorized 2026-09-06: ONE OpenCode Go / GPT-5.6 Luna call against
 * the existing question-writer-v2 boundary, plus the local deterministic
 * fallback. No src/ change. No web search. No second retry.
 *
 * Run from repo root:
 *   npx vite-node scripts/eval/kopi-sudut-writer-once.ts
 *
 * Writes scripts/eval/.results/kopi-sudut-writer-once.json (gitignored).
 * Never prints credentials.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BusinessBrief } from "../../src/lib/audit/types";
import {
  buildDeterministicIndonesianPack,
  classifyIndonesianQuestion,
  generateIndonesianQuestionPack,
  INDONESIAN_QUESTION_INSTRUCTION_VERSION,
  indonesianPackBlockers,
  minimizeIndonesianBrief,
  validateCanonicalIndonesianQuestionPack,
  type MinimizedIndonesianBrief,
} from "../../src/lib/audit/questions-id";
import {
  createIndonesianQuestionProvider,
  indonesianQuestionGenerationMeta,
} from "../../src/lib/audit/questions-id-provider";
import { assertOpenCodeGoProductionMethodConfigured } from "../../src/lib/audit/opencodego";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const RESULTS_DIR = join(ROOT, "scripts", "eval", ".results");
const RESULT_PATH = join(RESULTS_DIR, "kopi-sudut-writer-once.json");

function loadEnvLocal() {
  const file = join(ROOT, ".env.local");
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

process.env.NUAVE_QUESTION_PROVIDER = "opencodego";
process.env.NUAVE_LIVE_PROVIDER_TESTING = "0";
process.env.OPENAI_AUDIT_MODEL = "gpt-5.6-luna";
process.env.OPENAI_AUDIT_REASONING_EFFORT = "low";
process.env.OPENAI_BASE_URL = "https://opencode.ai/zen/go/v1";

const SLOT_PURPOSES = [
  "1 Category options — broad discovery in the confirmed category and market",
  "2 Situation — ask from within a supplied occasion, not about customers",
  "3 Need fit — options that meet one supplied need",
  "4 Offering / use case — locate a generic offering; no branded lookup",
  "5 Shortlist — narrow to a few candidates",
  "6 Open comparison — identify and compare options in the same request",
  "7 Brand fit — does the named business suit a supplied need",
  "8 Explicit recommendation — ask whether to recommend the named business",
  "9 Comparison — named head-to-head, or honest category comparison if none",
  "10 Fit boundaries — who it suits, who should look elsewhere, trade-offs",
];

/** Sparse Kopi Sudut sample that started this work. Confirmed facts only. */
const kopiSudutBrief: BusinessBrief = {
  brand_name: "Kopi Sudut",
  entity_scope: "Cabang: Depok",
  brand_type: "local cafe",
  category: "Kedai kopi susu (chain lokal)",
  market_context: "Depok",
  target_customer: "",
  official_sources: ["https://kopisudut.id"],
  verified_offerings: ["Kopi Susu Sudut"],
  verified_customer_needs: ["Ngopi enak dekat kantor"],
  verified_decision_criteria: [],
  verified_competitor: { name: "", scope: "", source_url: "" },
  brand_name_variants: [],
  priority_offering: "Kopi Susu Sudut",
  conversion_action: "",
  customer_supplied_facts: [],
  known_accuracy_questions: [],
  usp: "",
  regulated_category_notes: "",
  language: "en-US",
  agency_name: "",
  agency_logo_data_url: "",
};

function mechanical(questions: string[], brief: MinimizedIndonesianBrief) {
  const issues = validateCanonicalIndonesianQuestionPack(questions, brief);
  const block = indonesianPackBlockers(questions, brief);
  return {
    question_count: questions.length,
    issues,
    blockers: block,
    composition: {
      unbranded: questions.filter(
        (q) => classifyIndonesianQuestion(q, brief) === "tanpa_menyebut_bisnis_anda",
      ).length,
      branded: questions.filter(
        (q) => classifyIndonesianQuestion(q, brief) === "menyebut_bisnis_anda",
      ).length,
    },
    leaks: issues.filter(
      (i) => i.rule === "identity_leakage" || i.rule === "competitor_leakage",
    ),
    unsupported_premises: issues.filter((i) => i.rule === "unsupported_premise"),
    question_form: issues.filter((i) => i.rule === "question_form"),
  };
}

if (!process.env.OPENCODEGO_API_KEY?.trim()) {
  console.error(
    "OPENCODEGO_API_KEY is not set in the environment or .env.local. Refusing to call.",
  );
  process.exit(1);
}

assertOpenCodeGoProductionMethodConfigured();

const minimized = minimizeIndonesianBrief(kopiSudutBrief);
const fallbackQuestions = buildDeterministicIndonesianPack(minimized);
const fallbackScore = mechanical(fallbackQuestions, minimized);

type CapturedCall = {
  url: string;
  status: number;
  latency_ms: number;
  model: string | null;
  id: string | null;
  usage: {
    input_tokens: number | null;
    output_tokens: number | null;
    total_tokens: number | null;
  } | null;
};

const captured: CapturedCall[] = [];
const originalFetch = globalThis.fetch.bind(globalThis);
const capturingFetch: typeof fetch = async (input, init) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : String(input);
  const started = Date.now();
  const res = await originalFetch(input, init);
  const body = (await res.clone().json().catch(() => ({}))) as {
    model?: string;
    id?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
    };
  };
  captured.push({
    url,
    status: res.status,
    latency_ms: Date.now() - started,
    model: typeof body.model === "string" ? body.model : null,
    id: typeof body.id === "string" ? body.id : null,
    usage: body.usage
      ? {
          input_tokens: body.usage.input_tokens ?? null,
          output_tokens: body.usage.output_tokens ?? null,
          total_tokens: body.usage.total_tokens ?? null,
        }
      : null,
  });
  return res;
};

const startedAt = new Date().toISOString();
const suggestion = await generateIndonesianQuestionPack(
  minimized,
  createIndonesianQuestionProvider(capturingFetch),
  {
    generationMeta: indonesianQuestionGenerationMeta(),
    now: () => startedAt,
  },
);
const writerQuestions = suggestion.questions.map((q) => q.text);
const writerScore = mechanical(writerQuestions, minimized);

const record = {
  authorized_by: "founder",
  authorized_at: "2026-09-06",
  brief_id: "kopi-sudut-sparse-v1",
  instruction_version: INDONESIAN_QUESTION_INSTRUCTION_VERSION,
  provider: "opencodego",
  requested_model: "gpt-5.6-luna",
  call_count: captured.length,
  captured,
  minimized_brief: minimized,
  writer: {
    source: suggestion.source,
    warnings: suggestion.warnings,
    generation: suggestion.generation,
    questions: writerQuestions,
    mechanical: writerScore,
  },
  fallback: {
    questions: fallbackQuestions,
    mechanical: fallbackScore,
  },
  slot_purposes: SLOT_PURPOSES,
};

if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
writeFileSync(RESULT_PATH, `${JSON.stringify(record, null, 2)}\n`);

console.log("Kopi Sudut one-shot writer measurement");
console.log(`instruction: ${INDONESIAN_QUESTION_INSTRUCTION_VERSION}`);
console.log("provider: opencodego / gpt-5.6-luna");
console.log(`HTTP calls: ${captured.length}`);
console.log(
  `writer source: ${suggestion.source}  warnings: ${suggestion.warnings.join(", ") || "none"}`,
);
console.log(
  `writer mechanical issues: ${writerScore.issues.length}  blockers: ${writerScore.blockers.length}  6/4: ${writerScore.composition.unbranded}/${writerScore.composition.branded}`,
);
console.log(
  `fallback mechanical issues: ${fallbackScore.issues.length}  blockers: ${fallbackScore.blockers.length}`,
);
console.log("");
console.log("WRITER PACK");
writerQuestions.forEach((q, i) => console.log(`${i + 1}. ${q}`));
console.log("");
console.log("FALLBACK PACK");
fallbackQuestions.forEach((q, i) => console.log(`${i + 1}. ${q}`));
console.log("");
console.log(`Wrote ${RESULT_PATH}`);
