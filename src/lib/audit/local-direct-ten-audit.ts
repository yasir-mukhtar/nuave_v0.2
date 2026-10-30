import type {
  TwoSourceReportFacts,
  TwoSourceWriterFacts,
} from "./two-source-report";
import { assembleTwoSourceWriting, hasWriterFacts } from "./two-source-writer";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import {
  canonicalLockedDirectTenPack,
  DIRECT_TEN_PROMPT_IDS,
} from "./locked-question-pack";
import { runAuditObservations } from "./run-orchestrator";
import {
  createValidatedAuditReport,
  type ReportGenerator,
} from "./report-pipeline";
import { assembleReportContent } from "./contracts";
import { subjectBrandName } from "./direct-ten-context-v2";
import type { QuestionExecuteInput } from "./retry";
import type { ParsedSourceInput } from "./source-input";
import type { SourceIdentity } from "./source-identity";
import {
  SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
  businessBriefSchema,
  type AuditCallTelemetry,
  type AuditObservation,
  type AuditPrompt,
  type AuditReport,
  type BusinessBrief,
  type ExtractionDraft,
  type ReportSynthesis,
  type TwoSourceWritingSynthesis,
} from "./types";

/**
 * Founder-local direct-ten audit path (Spec 009 Block B).
 *
 * This module connects the retained, founder-approved direct-ten pack to the
 * real audit boundaries — the same lock, the same ten-of-ten observation
 * orchestration, the same validated report pipeline, the same customer
 * evidence export — with every provider call replaced by explicitly labeled
 * synthetic stand-ins. It exists so the complete intake→report→download path
 * can be exercised and verified offline.
 *
 * Honesty contract, enforced in code:
 * - Every observation carries `system: "synthetic-local-fixture"`, a synthetic
 *   model label, and `web_search_calls: 0`. It can never satisfy the protected
 *   production-method check; the pipeline only accepts it through the
 *   server-internal `allow_synthetic_evidence` flag, which additionally
 *   requires the label on every observation.
 * - Synthetic answers never name the audited business, so the report shows
 *   "did not appear" — the fixture demonstrates plumbing, never visibility.
 * - No provider request is built or sent anywhere in this path.
 */

const LOCAL_PACK_DIR_ENV = "NUAVE_LOCAL_AUDIT_PACK_DIR";
// Generic default name; the private retained pack keeps its own directory
// name in ignored local evidence and is also reachable through the env var.
const DEFAULT_PACK_DIR = join(
  process.cwd(),
  ".local-evidence",
  "direct-ten-retained",
);

const acceptanceSchema = z.object({
  accepted: z.literal(true),
  acceptedQuestionCount: z.literal(10),
  method: z.string(),
  orderedQuestionTextsSha256: z.string(),
  nativePackFile: z.string(),
  nativePackSha256: z.string(),
  responseId: z.string().optional(),
  auditOrReportCallsAuthorized: z.literal(false).optional(),
});

const retainedPromptSchema = z.object({
  prompt_id: z.string(),
  question: z.string(),
  review_status: z.literal("needs_human_review"),
});

/** The receipt-bound confirmed intake record carried inside the retained
 * pack (`input.confirmed`) — the only context this path may use. */
const confirmedIntakeSchema = z.object({
  brand: z.object({
    name: z.string().min(1),
    primarySource: z.string().min(1),
  }),
  scope: z.string(),
  target: z.string().nullable(),
  category: z.string().min(1),
  offerings: z.array(z.string()),
  customerReasons: z.array(z.string()),
  serviceChannels: z.array(z.string()),
  market: z.object({
    reach: z.string(),
    areas: z.array(z.string()),
  }),
  comparators: z.object({
    mode: z.string(),
    names: z.array(z.string()),
  }),
  publicFact: z.string(),
});

const retainedPackSchema = z.object({
  input: z.object({
    confirmed: confirmedIntakeSchema,
  }),
  promptPack: z.object({
    method: z.string(),
    language: z.literal("id-ID"),
    prompts: z.array(retainedPromptSchema).length(10),
  }),
});

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export type RetainedDirectTenPack = {
  prompts: {
    prompt_id: string;
    question: string;
    review_status: "needs_human_review";
  }[];
  method: string;
  responseId: string | null;
  confirmed: z.infer<typeof confirmedIntakeSchema>;
  /** The retained pack file verbatim — a LocalQuestionPack the review UI can
   * parse and edit against without re-deriving anything. */
  raw: unknown;
};

/**
 * Loads the retained founder-approved pack and verifies both recorded hashes
 * before anything is locked or run. A changed file fails closed — the
 * acceptance record, not the file on disk, is the authority for what was
 * approved.
 */
export async function loadRetainedDirectTenPack(
  dir: string = process.env[LOCAL_PACK_DIR_ENV] || DEFAULT_PACK_DIR,
): Promise<RetainedDirectTenPack> {
  const [acceptanceRaw, packRaw] = await Promise.all([
    readFile(join(dir, "ACCEPTANCE.json"), "utf8"),
    readFile(join(dir, "accepted-local-pack.json"), "utf8"),
  ]);
  const acceptance = acceptanceSchema.parse(JSON.parse(acceptanceRaw));

  const packHash = sha256Hex(packRaw);
  if (packHash !== acceptance.nativePackSha256) {
    throw new Error(
      `Retained pack hash ${packHash} does not match the accepted record ${acceptance.nativePackSha256}; refusing to run an unapproved pack.`,
    );
  }
  const pack = retainedPackSchema.parse(JSON.parse(packRaw));
  const questions = pack.promptPack.prompts.map((prompt) => prompt.question);
  const orderedHash = sha256Hex(JSON.stringify(questions));
  if (orderedHash !== acceptance.orderedQuestionTextsSha256) {
    throw new Error(
      `Ordered question text hash ${orderedHash} does not match the accepted record ${acceptance.orderedQuestionTextsSha256}; the approved wording changed.`,
    );
  }
  return {
    prompts: pack.promptPack.prompts,
    method: pack.promptPack.method,
    responseId: acceptance.responseId ?? null,
    confirmed: pack.input.confirmed,
    raw: JSON.parse(packRaw) as unknown,
  };
}

/**
 * Honest projection of the receipt-bound confirmed intake record into the
 * verified brief shape the audit boundaries require. Every field derives
 * from `input.confirmed` inside the retained pack — nothing is hardcoded
 * per business. Fields the founder explicitly left unconfirmed stay empty
 * rather than being filled with plausible text.
 */
export function retainedConfirmedBrief(
  confirmed: RetainedDirectTenPack["confirmed"],
): BusinessBrief {
  const unconfirmed = confirmed.publicFact
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.includes("belum dikonfirmasi"));
  const competitorName =
    confirmed.comparators.names[0] ??
    (confirmed.comparators.mode === "category-alternatives"
      ? `alternatif lain di kategori ${confirmed.category}`
      : "");
  return businessBriefSchema.parse({
    brand_name: confirmed.brand.name,
    entity_scope:
      confirmed.scope === "brand"
        ? `Seluruh brand ${confirmed.brand.name}`
        : confirmed.target || confirmed.scope,
    // Derived only from the confirmed category; no legal form is asserted.
    brand_type: confirmed.category.includes("Advisori") ? "Firma advisori" : "",
    category: confirmed.category,
    market_context: confirmed.market.areas.join(", "),
    target_customer: confirmed.customerReasons[0] ?? "",
    official_sources: [confirmed.brand.primarySource],
    verified_offerings: confirmed.offerings,
    verified_customer_needs: confirmed.customerReasons,
    verified_decision_criteria: confirmed.customerReasons.slice(1),
    verified_competitor: {
      name: competitorName,
      scope: "",
      source_url: "",
    },
    brand_name_variants: [],
    priority_offering: "",
    conversion_action: "",
    customer_supplied_facts: confirmed.publicFact ? [confirmed.publicFact] : [],
    known_accuracy_questions: unconfirmed,
    usp: "",
    regulated_category_notes: "",
    language: "en-US",
    agency_name: "",
    agency_logo_data_url: "",
  });
}

/**
 * Labeled identity substitute for the founder-local reading phase. It derives
 * only display-safe fields from the parsed source itself — no fetch, no page
 * read, no claims about what the source contains. `confidence` stays false so
 * downstream code can never read this as a verified identity.
 */
export function syntheticLocalIdentity(
  source: ParsedSourceInput,
): SourceIdentity {
  const url = new URL(source.normalizedUrl);
  const handle = url.pathname.replace(/^\//, "").replace(/\/+$/, "");
  const display =
    source.sourceType === "instagram" && handle
      ? `@${handle}`
      : url.hostname
          .replace(/^www\./, "")
          .split(".")[0]!
          .split(/[-_]/)
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");
  return {
    display_name: display,
    description: "",
    canonical_url: source.normalizedUrl,
    icon_data_url: null,
    source_type: source.sourceType,
    confidence: false,
  };
}

/**
 * Labeled extraction substitute for the founder-local reading phase. The
 * entered identity is carried through honestly and every extracted field
 * stays explicitly empty — nothing is invented and nothing is marked as read
 * from the source. The buyer's review screens supply the facts; the draft's
 * warnings and open questions keep the substitution visible downstream.
 */
export function syntheticLocalExtraction(input: {
  website_url: string;
  brand_name: string;
}): {
  draft: ExtractionDraft;
  returned_model: string;
  response_id: string;
  telemetry: AuditCallTelemetry[];
} {
  const responseId = `synthetic-local-extract-${Date.now().toString(36)}`;
  const draft: ExtractionDraft = {
    brand_name: input.brand_name.trim(),
    entity_scope: "",
    brand_type: "",
    category: "",
    market_context: "",
    service_channels: [],
    market_reach: "",
    market_areas: [],
    // Spec 013 R-24 fields stay empty in the labeled substitute: the default
    // synthetic preparation never invents locations or category suggestions.
    published_locations: [],
    category_suggestions: [],
    offering_category_suggestions: [],
    target_customer: "",
    official_sources: [input.website_url],
    verified_offerings: [],
    verified_customer_needs: [],
    verified_decision_criteria: [],
    similar_businesses: [],
    brand_name_variants: [],
    priority_offering: "",
    conversion_action: "",
    customer_supplied_facts: [],
    known_accuracy_questions: [
      "Fakta bisnis belum diekstraksi — setiap bagian diisi dan dikonfirmasi pendiri lewat layar peninjauan.",
    ],
    usp: "",
    regulated_category_notes: "",
    evidence: [],
    warnings: [
      "Substitusi lokal berlabel: sumber tidak dibaca dan tidak ada fakta yang diekstraksi. Ini bukan hasil pembacaan situs.",
    ],
  };
  return {
    draft,
    returned_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    response_id: responseId,
    telemetry: [
      syntheticTelemetry({
        stage: "extract",
        responseId,
        startedAtMs: Date.now(),
      }),
    ],
  };
}

function syntheticTelemetry(input: {
  stage: "extract" | "observation" | "report";
  responseId: string;
  startedAtMs: number;
}): AuditCallTelemetry {
  const started = new Date(input.startedAtMs).toISOString();
  return {
    stage: input.stage,
    attempt: 1,
    status: "completed",
    started_at: started,
    completed_at: started,
    latency_ms: 0,
    requested_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    returned_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    response_id: input.responseId,
    service_tier: "none",
    usage: {
      input_tokens: 0,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 0,
      reasoning_output_tokens: 0,
      total_tokens: 0,
    },
    // Honest zero: no web search was executed or claimed.
    web_search_calls: 0,
    accounted_cost_usd: 0,
    cost_basis: "provider_usage",
    pricing_version: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    failure_reason: "",
    provider_status: "synthetic",
    incomplete_reason: "",
    output_text_present: true,
    refusal_present: false,
  };
}

/**
 * Labeled synthetic observation executor. It deliberately reads only
 * `input.prompt` — the same boundary the protected provider enforces — so the
 * brief can never leak into an observation, synthetic or otherwise.
 */
export async function executeSyntheticLocalObservation(
  input: QuestionExecuteInput,
): Promise<AuditObservation> {
  const responseId = `synthetic-local-${input.prompt.prompt_id}`;
  return {
    prompt_id: input.prompt.prompt_id,
    category: input.prompt.category,
    branded: input.prompt.branded,
    question: input.prompt.question,
    system: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    requested_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    returned_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    response_id: responseId,
    observed_at: new Date().toISOString(),
    raw_answer:
      "[SINTETIS] Jawaban contoh untuk pengujian alur lokal. Ini bukan respons model, bukan hasil penelusuran web, dan tidak memuat bisnis yang diaudit.",
    sources: [],
    run_status: "completed",
    failure_reason: "",
    telemetry: [
      syntheticTelemetry({
        stage: "observation",
        responseId,
        startedAtMs: Date.now(),
      }),
    ],
  };
}

/**
 * Deterministic labeled synthesis: every dimension stays not assessed because
 * synthetic answers cannot support a finding. The real pipeline then runs its
 * full normalize → repair → validate chain on this content exactly as it would
 * for provider output.
 */
function syntheticDirectTenSynthesis(
  observations: AuditObservation[],
  brandName: string,
  facts?: TwoSourceReportFacts,
): ReportSynthesis {
  const ids = observations.map((observation) => observation.prompt_id);
  // Spec 018: a two-source synthetic report speaks per source and agrees with
  // the code counts, as a live one must.
  const conclusion = facts
    ? `Ini adalah uji alur lokal dengan jawaban sintetis berlabel, bukan bukti visibilitas. Di ChatGPT, jawaban sintetis menyebut ${brandName} di ${facts.counts.chatgpt.named} dari ${facts.counts.chatgpt.completed} pertanyaan; di Google AI Overview, di ${facts.counts.google.named} dari ${facts.counts.google.summaries} ringkasan. Hasil ini tidak menunjukkan apa pun tentang visibilitas ${brandName} yang sebenarnya.`
    : `Ini adalah uji alur lokal dengan jawaban sintetis berlabel, bukan bukti visibilitas. ${brandName} tidak disebut dalam jawaban sintetis mana pun, sebagaimana dirancang; hasil ini tidak menunjukkan apa pun tentang visibilitas ${brandName} yang sebenarnya.`;
  return {
    conclusion,
    accuracy_status: "could_not_assess",
    key_findings: [
      {
        title: "Seluruh jawaban pada sesi ini sintetis",
        explanation: facts
          ? "Di ChatGPT dan Google AI Overview, sepuluh pertanyaan dijalankan melalui jalur audit lokal dengan jawaban contoh berlabel. Tidak ada respons nyata atau penelusuran web, sehingga tidak ada temuan visibilitas yang dapat ditarik."
          : "Sepuluh pertanyaan dijalankan melalui jalur audit lokal dengan jawaban contoh berlabel. Tidak ada respons model atau penelusuran web, sehingga tidak ada temuan visibilitas yang dapat ditarik.",
        evidence_prompt_ids: ids,
      },
    ],
    priorities: [
      {
        order: 1,
        timing: "do_first",
        action:
          "Jalankan audit dengan jawaban nyata yang disetujui sebelum mengambil keputusan apa pun.",
        why: "Setiap pertanyaan dalam sesi ini menghasilkan jawaban sintetis tanpa penelusuran, jadi tidak ada celah visibilitas yang benar-benar teramati.",
        basis: facts
          ? "Sepuluh dari sepuluh jawaban berlabel sintetis."
          : "Sepuluh dari sepuluh jawaban berlabel sintetis dan tidak menyebut bisnis.",
        owner: "business_owner",
        done_when:
          "Satu audit dengan jawaban provider nyata selesai dan lolos validasi.",
        evidence_prompt_ids: [ids[0]!],
        caveat:
          "Prioritas ini menjelaskan langkah verifikasi, bukan tindakan pemasaran.",
      },
    ],
    assessments: observations.map((observation) => ({
      prompt_id: observation.prompt_id,
      recommendation: "not_assessed" as const,
      comparison: "not_observed" as const,
      information: "not_assessed" as const,
    })),
  };
}

/**
 * Spec 021 Part B: the labelled synthetic writer's answer in the new shape,
 * so the journey, the e2e tests and the PDF show every new field. Every
 * number is one code can confirm; nothing claims real visibility.
 */
export function syntheticTwoSourceWriting(
  observations: AuditObservation[],
  brandName: string,
  facts: TwoSourceReportFacts & { writer: TwoSourceWriterFacts },
): TwoSourceWritingSynthesis {
  const base = syntheticDirectTenSynthesis(observations, brandName, facts);
  const ids = observations.map((observation) => observation.prompt_id);
  const { chatgpt, google } = facts.counts;
  const businesses = new Set(
    facts.writer.questions.flatMap((q) =>
      [...q.businesses.chatgpt, ...q.businesses.google].map((name) =>
        name.toLocaleLowerCase("id-ID"),
      ),
    ),
  );
  const first = facts.writer.businesses[0];
  return {
    storyline: {
      main_message: "Uji alur sintetis; bukan bukti visibilitas.",
      support: ["Jawaban contoh berlabel."],
    },
    verdict: `Uji alur sintetis: di ChatGPT, ${brandName} disebut di ${chatgpt.named} dari ${chatgpt.completed} jawaban; ini bukan bukti visibilitas.`,
    conclusion: base.conclusion,
    accuracy_status: base.accuracy_status,
    key_findings: [
      {
        ...base.key_findings[0]!,
        headline:
          chatgpt.completed > 0
            ? {
                number: `${chatgpt.named} dari ${chatgpt.completed}`,
                caption: `jawaban ChatGPT sintetis yang menyebut ${brandName}`,
                basis: "chatgpt_named",
              }
            : null,
      },
      {
        title: "Bisnis lain muncul di jawaban sintetis",
        explanation:
          "Di ChatGPT dan Google AI Overview, jawaban contoh menyebut beberapa bisnis lain. Nama ini fiktif dan hanya menguji tampilan laporan.",
        evidence_prompt_ids: ids,
        headline:
          businesses.size > 0
            ? {
                number: String(businesses.size),
                caption: "bisnis lain yang disebut di jawaban sintetis",
                basis: "named_businesses",
              }
            : null,
      },
      {
        title: "Ringkasan Google sintetis berbeda per pertanyaan",
        explanation: `Google menampilkan AI Overview sintetis di ${google.summaries} dari ${google.completed} pertanyaan. Ini hanya menguji tampilan.`,
        evidence_prompt_ids: ids,
        headline: null,
      },
    ],
    priorities: [
      {
        order: 1,
        action: "Jalankan audit dengan jawaban nyata",
        why: "Jawaban di sesi ini sintetis dan tanpa penelusuran. Jalankan satu audit nyata yang disetujui, lalu baca hasilnya sebelum mengambil keputusan.",
        evidence_prompt_ids: [ids[0]!],
      },
      {
        order: 2,
        action: "Lengkapi profil bisnis contoh",
        why: "Langkah ini hanya menguji tampilan rekomendasi. Pada audit nyata, saran datang dari playbook Nuave yang disetujui.",
        evidence_prompt_ids: [ids[1] ?? ids[0]!],
      },
      {
        order: 3,
        action: "Bandingkan hasil setelah audit ulang",
        why: "Audit ulang dengan sepuluh pertanyaan yang sama membuat hasilnya bisa dibandingkan.",
        evidence_prompt_ids: [ids[2] ?? ids[0]!],
      },
    ],
    assessments: base.assessments,
    competitor_reasons: first
      ? [
          {
            name: first,
            reason: "jawaban sintetis menyebutnya sebagai contoh pilihan lain.",
          },
        ]
      : [],
    takeaways: [
      {
        title: "Semua nama di sini fiktif",
        text: "Jawaban sintetis menyebut bisnis fiktif; tidak ada pola nyata yang bisa dibaca.",
      },
      {
        title: "Bagian ini merangkum kesamaan",
        text: "Pada audit nyata, bagian ini merangkum kesamaan bisnis yang disebut AI.",
      },
    ],
    plan: [
      {
        weeks: "Minggu 1–2",
        title: "Jalankan audit nyata",
        text: "Pesan satu audit dengan jawaban nyata yang disetujui.",
      },
      {
        weeks: "Minggu 3–4",
        title: "Baca rekomendasinya",
        text: "Kerjakan saran yang paling jelas lebih dulu.",
      },
      {
        weeks: "Minggu 5–8",
        title: "Audit ulang",
        text: "Ulangi sepuluh pertanyaan yang sama untuk membandingkan hasil.",
      },
    ],
    topic_names: facts.writer.questions
      .filter((q) => q.topic === null)
      .map((q) => ({ prompt_id: q.prompt_id, topic: "Topik contoh sintetis" })),
    google_readings: facts.google
      .filter((item) => item.business_named === true)
      .map((item) => ({ prompt_id: item.prompt_id, recommended: false })),
  };
}

export const generateSyntheticLocalReport: ReportGenerator = async (input) => {
  const facts = input.two_source_facts;
  const content = hasWriterFacts(facts)
    ? assembleTwoSourceWriting(
        syntheticTwoSourceWriting(
          input.observations,
          subjectBrandName(input.brief),
          facts,
        ),
        input.observations,
        input.brief,
      )
    : assembleReportContent(
        syntheticDirectTenSynthesis(
          input.observations,
          subjectBrandName(input.brief),
          facts,
        ),
        input.observations,
        input.brief,
        undefined,
        "direct-ten",
        "id",
      );
  const responseId = "synthetic-local-report-1";
  return {
    content,
    requested_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    returned_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    response_id: responseId,
    telemetry: [
      syntheticTelemetry({
        stage: "report",
        responseId,
        startedAtMs: Date.now(),
      }),
    ],
  };
};

export type LocalDirectTenAuditResult = {
  report: AuditReport;
  /** The canonical locked prompts — what the evidence export records. */
  prompts: AuditPrompt[];
  observations: AuditObservation[];
  brief: BusinessBrief;
  provenance: {
    synthetic: true;
    pack_method: string;
    pack_response_id: string | null;
    question_method: "direct-ten";
    provider_calls: 0;
  };
};

/**
 * Retained pack → lock → ten labeled synthetic observations → validated
 * report, entirely offline. The shared gates still run: the lock enforces the
 * NUAVE-DT id order and exact approved text, the report gate enforces the
 * ten-of-ten binding, and the pipeline's normalize/validate chain applies
 * unchanged. `allow_synthetic_evidence` is the server-internal flag that
 * admits the labeled fixture — and nothing else.
 */
export async function runLocalDirectTenAudit(
  packDir?: string,
  submittedQuestions?: string[],
): Promise<LocalDirectTenAuditResult> {
  const pack = await loadRetainedDirectTenPack(packDir);
  // When a session submits its approved questions, they must be exactly the
  // retained accepted texts — the demo never runs substitute wording.
  if (submittedQuestions !== undefined) {
    const approved = pack.prompts.map((prompt) => prompt.question);
    const mismatch =
      submittedQuestions.length !== approved.length ||
      submittedQuestions.some(
        (question, index) => question !== approved[index],
      );
    if (mismatch) {
      throw new Error(
        "The submitted questions differ from the accepted pack; this local demo only runs the retained founder-approved wording.",
      );
    }
  }
  const brief = retainedConfirmedBrief(pack.confirmed);
  const locked = canonicalLockedDirectTenPack(pack.prompts, brief);
  if (
    locked.prompts.some(
      (prompt, index) => prompt.prompt_id !== DIRECT_TEN_PROMPT_IDS[index],
    )
  ) {
    throw new Error("Locked prompts lost the NUAVE-DT id order.");
  }

  const summary = await runAuditObservations({
    prompts: locked.prompts,
    brief,
    safety_identifier: "local-direct-ten-fixture",
    budget: { limit_usd: 5, carryover_cost_usd: 0, calls: [] },
    execute: executeSyntheticLocalObservation,
    emit: () => {},
  });
  if (summary.failed_prompt_ids.length) {
    throw new Error(
      `Synthetic local run failed for ${summary.failed_prompt_ids.join(", ")}.`,
    );
  }

  const report = await createValidatedAuditReport(
    {
      brief,
      prompts: locked.prompts,
      observations: summary.observations,
      safety_identifier: "local-direct-ten-fixture",
      budget: { limit_usd: 5, carryover_cost_usd: 0, calls: [] },
      language: "id",
      question_method: "direct-ten",
      allow_synthetic_evidence: true,
    },
    generateSyntheticLocalReport,
  );

  return {
    report,
    prompts: locked.prompts,
    observations: summary.observations,
    brief,
    provenance: {
      synthetic: true,
      pack_method: pack.method,
      pack_response_id: pack.responseId,
      question_method: "direct-ten",
      provider_calls: 0,
    },
  };
}
