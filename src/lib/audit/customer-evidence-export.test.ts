import { describe, expect, it } from "vitest";
import {
  auditSessionProvenance,
  makeCustomerEvidenceExport,
  makeSmartCustomerEvidenceExport,
  promptsWithOriginals,
  type GenerationAttemptRecord,
  type GenerationProvenance,
} from "./customer-evidence-export";
import {
  SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
  type AuditCallTelemetry,
  type AuditObservation,
  type AuditPrompt,
  type AuditReport,
  type BusinessBrief,
} from "./types";
import {
  DIRECT_TEN_CONTEXT_VERSION,
  type DirectTenAuditContext,
} from "./direct-ten-context-v2";

describe("customer evidence export", () => {
  it("exports v5 with exact confirmed context and no legacy brief or operational diagnostics", () => {
    const context: DirectTenAuditContext = {
      version: DIRECT_TEN_CONTEXT_VERSION,
      identity: {
        name: "Toko Fiksi",
        source: "https://toko-fiksi.example/",
        sourceOrigin: "owner",
        aliases: [],
        origin: "owner",
      },
      focus: { value: { kind: "brand" }, origin: "nuave" },
      category: { value: "toko", origin: "website" },
      offerings: { value: ["barang fiksi"], origin: "website" },
      serviceChannels: { value: ["delivery"], origin: "website" },
      market: { value: { reach: "seluruh", areas: [] }, origin: "owner" },
      comparators: { value: { mode: "unknown" }, origin: "nuave" },
    };
    const report = {
      facts: { legacy: true },
      counts: { legacy: true },
      operational_telemetry: { private: true },
      measures: { overall: { appeared: 0, total: 10 } },
    } as unknown as AuditReport;
    const observations = [
      {
        prompt_id: "NUAVE-DT-01",
        question: "Pertanyaan?",
        telemetry: [{ response_id: "private" }],
        failure_reason: "private",
      },
    ] as unknown as AuditObservation[];
    const exported = makeSmartCustomerEvidenceExport(
      context,
      [],
      observations,
      report,
      { accounted_cost_usd: 0 },
    );
    expect(exported.export_version).toBe("nuave-evidence-v5");
    expect(exported.context).toEqual(context);
    expect(exported).not.toHaveProperty("brief");
    expect(JSON.stringify(exported)).not.toContain("private");
    expect(exported.report).not.toHaveProperty("facts");
    expect(exported.report).not.toHaveProperty("counts");
  });
  it("keeps validated measures and observable evidence while omitting competing/internal projections", () => {
    const report = {
      facts: {
        comparison: { label: "legacy broad denominator" },
      },
      counts: {
        failed: 0,
      },
      measures: {
        overall: { appeared: 4, total: 10 },
        unbranded: { appeared: 1, total: 5 },
        branded: { appeared: 3, total: 5 },
        recommendation: { recommended: 2, assessed: 3 },
        comparison: { client_preferred: 1, assessed: 2 },
        information: {
          confirmed: 1,
          incomplete: 1,
          conflicting: 0,
          assessed: 2,
        },
      },
      operational_telemetry: {
        call_count: 12,
        calls: [{ response_id: "internal-call" }],
      },
    } as unknown as AuditReport;
    const observations = [
      {
        prompt_id: "NUAVE-BRAND-NEED-01",
        question: "Pertanyaan pelanggan?",
        raw_answer: "Jawaban yang diamati.",
        failure_reason: "provider stack detail",
        telemetry: [{ response_id: "internal-observation-call" }],
      },
    ] as unknown as AuditObservation[];

    const exported = makeCustomerEvidenceExport(
      { agency_logo_data_url: "" } as BusinessBrief,
      [] as AuditPrompt[],
      observations,
      report,
    );

    expect(exported.report.measures).toEqual(report.measures);
    expect(exported.report).not.toHaveProperty("facts");
    expect(exported.report).not.toHaveProperty("counts");
    expect(exported.report).not.toHaveProperty("operational_telemetry");
    expect(exported.observations[0]).toMatchObject({
      prompt_id: "NUAVE-BRAND-NEED-01",
      question: "Pertanyaan pelanggan?",
      raw_answer: "Jawaban yang diamati.",
    });
    expect(exported.observations[0]).not.toHaveProperty("failure_reason");
    expect(exported.observations[0]).not.toHaveProperty("telemetry");
  });
});

/** Spec 010 R-07 / AC-08 — the session's generation-attempt ledger folded
 * into the export provenance. */
describe("auditSessionProvenance (R-07 totals)", () => {
  const call = (
    stage: AuditCallTelemetry["stage"],
    cost: number,
    synthetic = false,
  ): AuditCallTelemetry =>
    ({
      stage,
      attempt: 1,
      status: "completed",
      started_at: "2026-09-19T00:00:00.000Z",
      completed_at: "2026-09-19T00:00:01.000Z",
      latency_ms: 1000,
      requested_model: synthetic ? SYNTHETIC_LOCAL_FIXTURE_SYSTEM : "gpt-5.6",
      returned_model: synthetic ? SYNTHETIC_LOCAL_FIXTURE_SYSTEM : "gpt-5.6",
      response_id: `resp-${stage}-${cost}`,
      service_tier: "default",
      usage: {
        input_tokens: 10,
        cached_input_tokens: 0,
        cache_write_input_tokens: 0,
        output_tokens: 5,
        reasoning_output_tokens: 0,
        total_tokens: 15,
      },
      web_search_calls: 0,
      accounted_cost_usd: cost,
      cost_basis: "provider_usage",
      pricing_version: "test",
      failure_reason: "",
    }) as AuditCallTelemetry;

  // One extraction + ten observations + one report = the 2026-09-19 shape
  // whose export wrongly read 12 before the GLM call was counted.
  const stageCalls = [
    call("extract", 0.05),
    ...Array.from({ length: 10 }, () => call("observation", 0.01)),
    call("report", 0.02),
  ];
  const stageCost = 0.05 + 10 * 0.01 + 0.02; // 0.17

  const attempt = (
    outcome: GenerationAttemptRecord["outcome"],
    execution: GenerationAttemptRecord["execution"],
    cost_usd: number | null,
  ): GenerationAttemptRecord => ({
    started_at: "2026-09-19T00:00:00.000Z",
    outcome,
    execution,
    cost_usd,
  });

  const liveGeneration: GenerationProvenance = {
    requested_model: "glm-5.3-flash",
    returned_model: "glm-5.3-flash",
    response_id: "chatcmpl-live-1",
    transport: "cheaper-inference",
    billed_cost_usd: 0.0005,
    model_mismatch: false,
  };

  it("AC-08a: a failed GLM attempt with cost then a success counts both attempts and both costs", () => {
    const attempts = [
      attempt("failed", "confirmed", 0.001),
      attempt("succeeded", "confirmed", 0.0005),
    ];
    const provenance = auditSessionProvenance({
      calls: stageCalls,
      attempts,
      generation: liveGeneration,
    });
    expect(provenance.provider_calls).toBe(12 + 2);
    expect(provenance.accounted_cost_usd).toBeCloseTo(stageCost + 0.0015, 6);
    expect(provenance.generation_attempts).toHaveLength(2);
    expect(provenance.generation_attempts[0]).toMatchObject({
      outcome: "failed",
      execution: "confirmed",
      cost_usd: 0.001,
    });
    expect(provenance.generation_attempts[1]).toMatchObject({
      outcome: "succeeded",
      execution: "confirmed",
      cost_usd: 0.0005,
    });
    expect(provenance.uncertain_attempts).toBe(0);
    expect(provenance.unknown_cost_attempts).toBe(0);
    expect(provenance.generation).toEqual(liveGeneration);
  });

  it("AC-08b: a dropped response is uncertain — excluded from provider_calls, the confirmed retry counts", () => {
    const attempts = [
      attempt("interrupted", "unknown", null),
      attempt("succeeded", "confirmed", 0.0005),
    ];
    const provenance = auditSessionProvenance({
      calls: stageCalls,
      attempts,
      generation: liveGeneration,
    });
    expect(provenance.provider_calls).toBe(12 + 1);
    expect(provenance.uncertain_attempts).toBe(1);
    expect(provenance.unknown_cost_attempts).toBe(1);
    expect(provenance.accounted_cost_usd).toBeCloseTo(stageCost + 0.0005, 6);
  });

  it("AC-08c: a rate-limited (429) request records no attempt — zero calls and zero cost from generation", () => {
    const provenance = auditSessionProvenance({
      calls: stageCalls,
      attempts: [],
      generation: liveGeneration,
    });
    expect(provenance.provider_calls).toBe(12);
    expect(provenance.accounted_cost_usd).toBeCloseTo(stageCost, 6);
    expect(provenance.generation_attempts).toEqual([]);
    expect(provenance.uncertain_attempts).toBe(0);
    expect(provenance.unknown_cost_attempts).toBe(0);
  });

  it("synthetic-stub sessions never count GLM attempts as provider calls and omit `generation`", () => {
    const syntheticCalls = [
      call("extract", 0, true),
      ...Array.from({ length: 10 }, () => call("observation", 0, true)),
      call("report", 0, true),
    ];
    const provenance = auditSessionProvenance({
      calls: syntheticCalls,
      // The labeled stub still records its attempt (cost null, confirmed).
      attempts: [attempt("succeeded", "confirmed", null)],
      generation: null,
    });
    expect(provenance.provider_calls).toBe(0);
    expect(provenance.accounted_cost_usd).toBe(0);
    expect(provenance).not.toHaveProperty("generation");
    expect(provenance.unknown_cost_attempts).toBe(1);
  });

  it("the export carries the new provenance keys and per-prompt original/edited markers", () => {
    const brief = { agency_logo_data_url: "" } as BusinessBrief;
    const prompts = [
      {
        prompt_id: "NUAVE-DT-01",
        category: "unassigned",
        role: "",
        branded: false,
        question: "Pertanyaan yang disetujui setelah diubah?",
        rationale: "",
        inputs_used: [],
        review_status: "needs_human_review",
      },
      {
        prompt_id: "NUAVE-DT-02",
        category: "unassigned",
        role: "",
        branded: false,
        question: "Pertanyaan yang tidak berubah?",
        rationale: "",
        inputs_used: [],
        review_status: "needs_human_review",
      },
    ] as AuditPrompt[];
    const provenance = auditSessionProvenance({
      calls: stageCalls,
      attempts: [attempt("succeeded", "confirmed", 0.0005)],
      generation: liveGeneration,
    });
    const exported = makeCustomerEvidenceExport(
      brief,
      promptsWithOriginals(
        prompts,
        new Map([
          ["NUAVE-DT-01", "Pertanyaan asli yang dihasilkan?"],
          ["NUAVE-DT-02", "Pertanyaan yang tidak berubah?"],
        ]),
      ),
      [] as AuditObservation[],
      {} as AuditReport,
      provenance,
    );
    const exportedPrompts = exported.prompts as (AuditPrompt & {
      original_question: string;
      edited: boolean;
    })[];
    expect(exportedPrompts[0]).toMatchObject({
      question: "Pertanyaan yang disetujui setelah diubah?",
      original_question: "Pertanyaan asli yang dihasilkan?",
      edited: true,
    });
    expect(exportedPrompts[1]).toMatchObject({
      question: "Pertanyaan yang tidak berubah?",
      original_question: "Pertanyaan yang tidak berubah?",
      edited: false,
    });
    expect(exported.provenance).toMatchObject({
      provider_calls: 13,
      uncertain_attempts: 0,
      unknown_cost_attempts: 0,
      generation: liveGeneration,
    });
    expect(exported.provenance?.generation_attempts).toHaveLength(1);
    expect(exported.provenance?.accounted_cost_usd).toBeCloseTo(
      stageCost + 0.0005,
      6,
    );
  });
});
