import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeWebsiteInput } from "./website-input";
import { classifyReportRecovery } from "./report-recovery";
import { buildLiveIndonesianPromptPack } from "./questions-id-live";
import {
  createValidatedAuditReport,
  type ReportGenerator,
} from "./report-pipeline";
import {
  goldenBrief,
  goldenObservations,
  goldenPrompts,
  goldenReportContent,
} from "./fixtures/report-golden";
import { fixtureBudget, fixtureCallTelemetry } from "./fixtures/telemetry";
import {
  PRODUCTION_OBSERVATION_REQUESTED_MODEL,
  PRODUCTION_OBSERVATION_SYSTEM,
} from "./production-observation-method";
import type {
  AuditObservation,
  BusinessBrief,
  ReportContent,
} from "./types";

const BRAND = "Klinik Gigi Sehat";

const dentalBrief: BusinessBrief = {
  brand_name: BRAND,
  entity_scope: "Cabang Margonda, Kota Depok",
  brand_type: "Klinik gigi",
  category: "Klinik gigi",
  market_context: "Kota Depok, Jawa Barat, Indonesia",
  target_customer: "Warga Depok yang mencari klinik gigi terjangkau.",
  official_sources: ["https://klinikgigisehat.example"],
  verified_offerings: ["scaling gigi", "behel gigi", "tambal gigi"],
  verified_customer_needs: ["klinik gigi terdekat", "harga terjangkau"],
  verified_decision_criteria: ["lokasi", "harga", "jam buka"],
  verified_competitor: {
    name: "Klinik Gigi Lain",
    scope: "Margonda",
    source_url: "https://klinikgigilain.example",
  },
  brand_name_variants: [],
  priority_offering: "scaling gigi",
  conversion_action: "reservasi via WhatsApp",
  customer_supplied_facts: [],
  known_accuracy_questions: [],
  usp: "",
  regulated_category_notes: "Layanan kesehatan gigi.",
  language: "en-US",
  agency_name: "Nuave",
  agency_logo_data_url: "",
};

function validQuestions() {
  return [
    "Di mana saya bisa menemukan klinik gigi terdekat di Depok untuk scaling?",
    "Klinik gigi mana di sekitar Margonda yang bisa menangani tambal gigi?",
    "Apa saja pilihan klinik gigi di area Margonda yang menyediakan behel dan scaling?",
    "Berapa jam buka klinik gigi di Depok dan bagaimana cara reservasinya?",
    "Bagaimana perbandingan klinik gigi di Margonda dari segi lokasi dan harga?",
    `Apakah ${BRAND} menyediakan scaling gigi di cabang Margonda?`,
    `Berapa jam operasional ${BRAND}?`,
    `Bagaimana cara reservasi di ${BRAND} melalui WhatsApp?`,
    `Apakah ${BRAND} melayani perawatan behel untuk anak?`,
    `Apa saja layanan unggulan ${BRAND} untuk tambal gigi?`,
  ];
}

function stubOpenCodeGo() {
  vi.stubEnv("OPENCODEGO_API_KEY", "test-dummy-key");
  vi.stubEnv("OPENAI_API_KEY", "test-compatibility-key");
  vi.stubEnv("NUAVE_QUESTION_PROVIDER", "opencodego");
  vi.stubEnv("OPENAI_BASE_URL", "https://opencode.ai/zen/go/v1");
  vi.stubEnv("OPENAI_AUDIT_MODEL", "gpt-5.6-luna");
  vi.stubEnv("OPENAI_AUDIT_REASONING_EFFORT", "low");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const completedObservations: AuditObservation[] = goldenObservations.map(
  (observation, index) => ({
    ...observation,
    system: PRODUCTION_OBSERVATION_SYSTEM,
    requested_model: PRODUCTION_OBSERVATION_REQUESTED_MODEL,
    ...(index === 4
      ? {
          run_status: "completed" as const,
          raw_answer:
            "Local advisers differ by focus: some handle logistics, others readiness reviews.",
          failure_reason: "",
          sources: [
            {
              url: "https://northstar.example/evidence-5",
              title: "Fictional source 5",
            },
          ],
        }
      : {}),
    telemetry: observation.telemetry.length
      ? observation.telemetry
      : [
          fixtureCallTelemetry({
            stage: "observation",
            requested_model: PRODUCTION_OBSERVATION_REQUESTED_MODEL,
            returned_model: observation.returned_model,
            response_id: observation.response_id,
          }),
        ],
  }),
);

const reportInput = {
  brief: goldenBrief,
  prompts: goldenPrompts,
  observations: completedObservations,
  safety_identifier: "fixture-user-123",
  budget: fixtureBudget,
};

function reportResult(content: ReportContent) {
  return {
    content,
    requested_model: "fixture-requested-model",
    returned_model: "fixture-returned-model",
    response_id: "response-founder-failure",
    telemetry: [fixtureCallTelemetry({ response_id: "response-founder-failure" })],
  };
}

describe("founder-observed Phase 3 failures — fail-first regression pins", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("normalizes a normal bare domain before extraction", () => {
    expect(normalizeWebsiteInput("  masryef.com  ")).toEqual({
      ok: true,
      url: "https://masryef.com",
    });
  });

  it("falls back when Question 3 is structurally valid but semantically unrelated", async () => {
    stubOpenCodeGo();
    const questions = validQuestions();
    questions[2] = "Bagaimana cara merawat tanaman monstera di dalam rumah?";
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        id: "resp_semantic_failure",
        model: "gpt-5.6-luna",
        status: "completed",
        usage: {
          input_tokens: 1_000,
          output_tokens: 500,
          total_tokens: 1_500,
        },
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: JSON.stringify({ questions }),
              },
            ],
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await buildLiveIndonesianPromptPack({ brief: dentalBrief });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.generation.source).toBe("fallback");
    expect(result.generation.warnings).toContain("fallback_used");
    expect(result.pack.warnings).toContain("fallback_used");
    expect(result.pack.prompts.map((prompt) => prompt.question).join(" ")).not.toContain(
      "monstera",
    );
    expect(result.telemetry).toHaveLength(1);
  });

  it("contains one positive-only report priority instead of rejecting the whole report", async () => {
    const draft = goldenReportContent();
    draft.priorities[0].evidence_prompt_ids = [goldenPrompts[6].prompt_id];
    const generate = vi.fn(async () => reportResult(draft)) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(reportInput, generate);

    expect(generate).toHaveBeenCalledTimes(1);
    expect(report.priorities.length).toBeGreaterThan(0);
    expect(report.priorities).not.toContainEqual(
      expect.objectContaining({
        evidence_prompt_ids: [goldenPrompts[6].prompt_id],
      }),
    );
    expect(report.priorities.map((priority) => priority.order)).toEqual(
      report.priorities.map((_, index) => index + 1),
    );
  });

  it("treats deterministic report-integrity failure as terminal, not generically retryable", () => {
    expect(classifyReportRecovery("REPORT_INTEGRITY_FAILURE", 1)).toEqual({
      kind: "terminal_integrity",
      can_retry: false,
    });
  });
});
