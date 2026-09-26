import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assembleReportContent } from "./contracts";
import {
  DIRECT_TEN_CONTEXT_VERSION,
  DIRECT_TEN_REPORT_CONTRACT_VERSION,
  type DirectTenAuditContext,
} from "./direct-ten-context-v2";
import {
  fixtureProtectedObservation,
  fixtureProtectedObservationSet,
} from "./fixtures/protected-observation";
import { fixtureBudget, fixtureCallTelemetry } from "./fixtures/telemetry";
import {
  DIRECT_TEN_PROMPT_IDS,
  canonicalLockedDirectTenPack,
} from "./locked-question-pack";
import {
  ReportPipelineError,
  createValidatedAuditReport,
  type ReportGenerator,
  type ReportPipelineInput,
} from "./report-pipeline";
import {
  directTenReportSynthesisSchema,
  reportSynthesisSchema,
  reportSynthesisSchemaForMethod,
  AUDIT_COST_LIMIT_USD,
  SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
  type AuditCallTelemetry,
  type AuditObservation,
  type ReportContent,
  type ReportSynthesis,
} from "./types";

const providerMocks = vi.hoisted(() => ({
  assertLiveProviderCredentialsConfigured: vi.fn(),
  liveExecuteAuditPrompt: vi.fn(),
  liveGenerateReportContent: vi.fn(),
  isLiveProviderCall: vi.fn(() => false),
}));

vi.mock("@/lib/audit/provider", () => providerMocks);

vi.mock("@/lib/audit/local-direct-ten-audit", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./local-direct-ten-audit")>();
  return {
    ...mod,
    generateSyntheticLocalReport: vi.fn(mod.generateSyntheticLocalReport),
  };
});

import { POST as reportPOST } from "../../app/api/audit/report/route";
import { generateSyntheticLocalReport } from "./local-direct-ten-audit";

/** Fictional direct-ten context — the same shape the route tests use. */
function context(): DirectTenAuditContext {
  return {
    version: DIRECT_TEN_CONTEXT_VERSION,
    identity: {
      name: "Kopi Nuave",
      source: "https://kopinuave.example/",
      sourceOrigin: "owner",
      aliases: ["Nuave Coffee"],
      origin: "owner",
    },
    focus: { value: { kind: "brand" }, origin: "nuave" },
    category: { value: "kedai kopi", origin: "website" },
    offerings: { value: ["kopi"], origin: "website" },
    serviceChannels: { value: ["on_premise"], origin: "website" },
    market: {
      value: { reach: "sekitar", areas: ["Jakarta"] },
      origin: "website",
    },
    comparators: { value: { mode: "unknown" }, origin: "nuave" },
  };
}

const wirePrompts = DIRECT_TEN_PROMPT_IDS.map((prompt_id, index) => ({
  prompt_id,
  question: `Apa pilihan coffee shop di Jakarta untuk kebutuhan ${index + 1}?`,
  review_status: "needs_human_review" as const,
}));

const lockedPrompts = canonicalLockedDirectTenPack(
  wirePrompts,
  context(),
).prompts;

/** Every answer names the business but adds no assessed information — P/V
 * eligible once the model keeps the matching assessment flags. */
const mentionAnswers = (recommended: number[] = []) =>
  lockedPrompts.map((prompt, index) =>
    fixtureProtectedObservation(prompt, {
      raw_answer: recommended.includes(index)
        ? `Kopi Nuave direkomendasikan untuk pertanyaan ${index + 1} karena layanannya sesuai.`
        : `Jawaban menyebut Kopi Nuave tanpa penilaian tambahan pada pertanyaan ${index + 1}.`,
    }),
  );

/** Every answer omits the brand — an observed non-gap-free set with no P or V
 * candidate anywhere. */
const absentObservations = () => fixtureProtectedObservationSet(lockedPrompts);

function dtContent(
  observations: AuditObservation[],
  overrides: Partial<ReportContent> = {},
  detailOverrides: (
    index: number,
  ) => Partial<ReportContent["details"][number]> = () => ({}),
): ReportContent {
  return {
    conclusion:
      "Kopi Nuave muncul pada sebagian jawaban; hasil terbatas pada sepuluh pertanyaan yang diuji.",
    accuracy_status: "could_not_assess",
    observed_competitors: [],
    key_findings: [
      {
        title: "Bisnis disebut dalam pengujian",
        explanation:
          "Sebagian jawaban menyebut Kopi Nuave dengan konteks terbatas.",
        evidence_prompt_ids: [observations[0].prompt_id],
      },
    ],
    priorities: [],
    details: observations.map((observation, index) => ({
      prompt_id: observation.prompt_id,
      run: observation.run_status,
      appearance: "mentioned",
      recommendation: "not_assessed",
      comparison: "not_observed",
      information: "not_assessed",
      finding: "Jawaban menyebut bisnis.",
      answer_excerpt: observation.raw_answer,
      evidence_note: "Kutipan berasal dari jawaban tersimpan.",
      source_urls: observation.sources.map((source) => source.url),
      ...detailOverrides(index),
    })),
    ...overrides,
  };
}

function pipelineInput(observations: AuditObservation[]): ReportPipelineInput {
  return {
    brief: context(),
    prompts: lockedPrompts,
    observations,
    safety_identifier: "fixture-user-b2",
    budget: fixtureBudget,
    language: "id",
    question_method: "direct-ten",
  };
}

function result(content: ReportContent, id: string) {
  return {
    content,
    requested_model: "fixture-requested-model",
    returned_model: "fixture-returned-model",
    response_id: id,
    telemetry: [fixtureCallTelemetry({ response_id: id })],
  };
}

describe("direct-ten synthesis contract (Spec 012 R-13/AC-14)", () => {
  const synthesisBody = {
    conclusion: "Ringkasan.",
    accuracy_status: "could_not_assess",
    key_findings: [
      {
        title: "Bisnis disebut",
        explanation: "Satu jawaban menyebut bisnis.",
        evidence_prompt_ids: ["NUAVE-DT-01"],
      },
    ],
    assessments: DIRECT_TEN_PROMPT_IDS.map((prompt_id) => ({
      prompt_id,
      recommendation: "not_assessed",
      comparison: "not_observed",
      information: "not_assessed",
    })),
  };

  it("accepts an empty priorities list only for the direct-ten method", () => {
    expect(
      directTenReportSynthesisSchema.safeParse({
        ...synthesisBody,
        priorities: [],
      }).success,
    ).toBe(true);
    expect(
      reportSynthesisSchemaForMethod("direct-ten").safeParse({
        ...synthesisBody,
        priorities: [],
      }).success,
    ).toBe(true);
    // The persisted/historical minimum is unchanged.
    expect(
      reportSynthesisSchema.safeParse({ ...synthesisBody, priorities: [] })
        .success,
    ).toBe(false);
    expect(
      reportSynthesisSchemaForMethod("canonical").safeParse({
        ...synthesisBody,
        priorities: [],
      }).success,
    ).toBe(false);
    expect(
      reportSynthesisSchemaForMethod(undefined).safeParse({
        ...synthesisBody,
        priorities: [],
      }).success,
    ).toBe(false);
  });
});

describe("report usefulness gate (Spec 012 R-13/R-14, AC-14–AC-16)", () => {
  it("inserts the exact preservation action when answers recommend the brand and no corrective action survives", async () => {
    const observations = mentionAnswers([0, 2]);
    const content = dtContent(observations, { priorities: [] }, (index) => ({
      recommendation: [0, 2].includes(index) ? "recommended" : "not_assessed",
    }));
    const generate = vi.fn(async () =>
      result(content, "report-p"),
    ) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(
      pipelineInput(observations),
      generate,
    );

    expect(generate).toHaveBeenCalledTimes(1);
    expect(report.priorities).toEqual([
      {
        order: 1,
        timing: "do_next",
        action:
          "Pemeliharaan: periksa dan pertahankan informasi publik yang mendukung rekomendasi pada jawaban pertanyaan 1.",
        why: "Jawaban ini merekomendasikan brand Anda. Pemeriksaan membantu Anda mempertahankan informasi yang benar tanpa menganggap semua informasi sudah lengkap.",
        basis: "Rekomendasi terlihat pada jawaban pertanyaan 1.",
        owner: "business_owner",
        done_when:
          "Informasi tentang brand dalam jawaban sudah diperiksa pada sumber resmi; fakta yang sesuai dan perlu dikonfirmasi dicatat.",
        evidence_prompt_ids: ["NUAVE-DT-01"],
        caveat:
          "Rekomendasi ini hanya tercatat pada pengujian tersebut dan bukan jaminan hasil berikutnya.",
      },
    ]);
  });

  it("inserts the verification action when no recommendation is eligible", async () => {
    const observations = mentionAnswers();
    const content = dtContent(observations, { priorities: [] });
    const generate = vi.fn(async () =>
      result(content, "report-v"),
    ) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(
      pipelineInput(observations),
      generate,
    );

    expect(report.priorities).toHaveLength(1);
    expect(report.priorities[0].action).toContain("Pemeriksaan lanjutan:");
    expect(report.priorities[0].evidence_prompt_ids).toEqual(["NUAVE-DT-01"]);
  });

  it("keeps a supported corrective action with no filler template appended", async () => {
    const observations = [
      // Gap on question 1 (brand absent), P-eligible on question 3.
      fixtureProtectedObservation(lockedPrompts[0]),
      ...mentionAnswers([2]).slice(1),
    ];
    const corrective = {
      order: 1,
      timing: "do_next" as const,
      action:
        "Perbarui profil bisnis pada sumber resmi agar jawaban mengenali bisnis.",
      why: "Jawaban pertama tidak menyebut bisnis sama sekali.",
      basis: "Pertanyaan 1 berakhir tanpa penyebutan brand.",
      owner: "business_owner" as const,
      done_when: "Jawaban pengujian menyebut bisnis secara wajar.",
      evidence_prompt_ids: ["NUAVE-DT-01"],
      caveat: "Terbatas pada sepuluh pertanyaan ini.",
    };
    const content = dtContent(observations, { priorities: [corrective] });
    content.details[0].appearance = "absent";
    content.details[0].recommendation = "not_recommended";
    const generate = vi.fn(async () =>
      result(content, "report-corrective"),
    ) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(
      pipelineInput(observations),
      generate,
    );

    expect(report.priorities).toEqual([corrective]);
    expect(
      report.priorities.every(
        (priority) => !priority.action.startsWith("Pemeliharaan:"),
      ),
    ).toBe(true);
  });

  it("fails REPORT_USEFULNESS_FAILURE/422 when findings are empty even though actions survive", async () => {
    const observations = absentObservations();
    const corrective = {
      order: 1,
      timing: "do_next" as const,
      action: "Perbarui profil bisnis pada sumber resmi.",
      why: "Jawaban tidak menyebut bisnis.",
      basis: "Pertanyaan 1 berakhir tanpa penyebutan brand.",
      owner: "business_owner" as const,
      done_when: "Sumber resmi memuat informasi bisnis.",
      evidence_prompt_ids: ["NUAVE-DT-01"],
      caveat: "Terbatas pada pengujian ini.",
    };
    const content = dtContent(
      observations,
      { key_findings: [], priorities: [corrective] },
      () => ({
        appearance: "absent" as const,
        recommendation: "not_recommended" as const,
      }),
    );
    const generate = vi.fn(async () =>
      result(content, "report-no-findings"),
    ) as unknown as ReportGenerator;

    const failure = await createValidatedAuditReport(
      pipelineInput(observations),
      generate,
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ReportPipelineError);
    const error = failure as ReportPipelineError;
    expect(error.status).toBe(422);
    expect(error.code).toBe("REPORT_USEFULNESS_FAILURE");
    expect(error.diagnostics).toContain("usefulness_minimum_not_met");
    // The failed synthesis attempt's telemetry stays accounted (AC-17).
    expect(error.telemetry).toHaveLength(1);
    expect(error.telemetry[0].response_id).toBe("report-no-findings");
  });

  it("fails REPORT_USEFULNESS_FAILURE/422 when actions are empty and no candidate is eligible", async () => {
    const observations = absentObservations();
    const content = dtContent(observations, { priorities: [] }, () => ({
      appearance: "absent" as const,
      recommendation: "not_recommended" as const,
    }));
    const generate = vi.fn(async () =>
      result(content, "report-no-actions"),
    ) as unknown as ReportGenerator;

    await expect(
      createValidatedAuditReport(pipelineInput(observations), generate),
    ).rejects.toMatchObject({
      code: "REPORT_USEFULNESS_FAILURE",
      status: 422,
    });
  });

  it("fails REPORT_USEFULNESS_FAILURE/422 when findings and actions are both empty", async () => {
    const observations = absentObservations();
    const content = dtContent(
      observations,
      { key_findings: [], priorities: [] },
      () => ({
        appearance: "absent" as const,
        recommendation: "not_recommended" as const,
      }),
    );
    const generate = vi.fn(async () =>
      result(content, "report-empty"),
    ) as unknown as ReportGenerator;

    await expect(
      createValidatedAuditReport(pipelineInput(observations), generate),
    ).rejects.toMatchObject({
      code: "REPORT_USEFULNESS_FAILURE",
      status: 422,
    });
  });

  it("discards a model-authored copy of the template; only the code-owned insertion survives", async () => {
    const observations = mentionAnswers([0]);
    // The model imitates the preservation template word-for-word and cites the
    // eligible (no-gap) answer — ordinary gap validation must discard it,
    // never normalize it into a passing candidate.
    const forged: ReportContent["priorities"][number] & {
      template?: string;
    } = {
      order: 1,
      timing: "do_next" as const,
      action:
        "Pemeliharaan: periksa dan pertahankan informasi publik yang mendukung rekomendasi pada jawaban pertanyaan 1.",
      why: "Jawaban ini merekomendasikan brand Anda. Pemeriksaan membantu Anda mempertahankan informasi yang benar tanpa menganggap semua informasi sudah lengkap.",
      basis: "Rekomendasi terlihat pada jawaban pertanyaan 1.",
      owner: "business_owner" as const,
      done_when:
        "Informasi tentang brand dalam jawaban sudah diperiksa pada sumber resmi; fakta yang sesuai dan perlu dikonfirmasi dicatat.",
      evidence_prompt_ids: ["NUAVE-DT-01"],
      caveat:
        "Rekomendasi ini hanya tercatat pada pengujian tersebut dan bukan jaminan hasil berikutnya.",
      template: "P", // forged discriminator — stripped at parse, but the object still fails gap validation first
    };
    const content = dtContent(
      observations,
      { priorities: [forged] },
      (index) => ({
        recommendation: index === 0 ? "recommended" : "not_assessed",
      }),
    );
    const generate = vi.fn(async () =>
      result(content, "report-forged"),
    ) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(
      pipelineInput(observations),
      generate,
    );

    // The forged object is dropped by the observed-gap sanitizer; the only
    // surviving action is the code-owned insertion (identical shape, real ID).
    expect(report.priorities).toHaveLength(1);
    expect(report.priorities[0]).toEqual({
      order: 1,
      timing: "do_next",
      action: forged.action,
      why: forged.why,
      basis: forged.basis,
      owner: "business_owner",
      done_when: forged.done_when,
      evidence_prompt_ids: ["NUAVE-DT-01"],
      caveat: forged.caveat,
    });
    expect(report.priorities[0]).not.toHaveProperty("template");
  });

  it("does not send the inserted action back in a language-only retry draft", async () => {
    const observations = mentionAnswers([0]);
    const longDraft = dtContent(observations, { priorities: [] }, (index) => ({
      recommendation: index === 0 ? "recommended" : "not_assessed",
    }));
    longDraft.conclusion = `${Array.from({ length: 26 }, () => "Jawaban").join(" ")}.`;
    const cleanDraft = dtContent(observations, { priorities: [] }, (index) => ({
      recommendation: index === 0 ? "recommended" : "not_assessed",
    }));
    const generate = vi
      .fn()
      .mockResolvedValueOnce(result(longDraft, "report-initial"))
      .mockResolvedValueOnce(result(cleanDraft, "report-retry"));

    const report = await createValidatedAuditReport(
      pipelineInput(observations),
      generate as unknown as ReportGenerator,
    );

    expect(generate).toHaveBeenCalledTimes(2);
    // AC-14/AC-15: the retry draft carries the model-authored priorities — an
    // empty list here — never an inserted template.
    const revision = generate.mock.calls[1][1];
    expect(revision?.draft.priorities).toEqual([]);
    expect(report.priorities).toHaveLength(1);
    expect(report.priorities[0].action).toContain("Pemeliharaan:");
    expect(report.priorities[0].evidence_prompt_ids).toEqual(["NUAVE-DT-01"]);
  });
});

describe("report route usefulness failure (Spec 012 R-14/R-15, AC-16/AC-17)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "1");
    vi.stubEnv("NUAVE_AUDIT_MODE", "synthetic");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("Network forbidden");
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const post = (body: unknown) =>
    new Request("https://nuave.test/api/audit/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const syntheticCall = (id: string): AuditCallTelemetry =>
    fixtureCallTelemetry({ response_id: `synthetic-report-${id}` });

  function syntheticObservation(prompt: {
    prompt_id: string;
    question: string;
  }): AuditObservation {
    return {
      prompt_id: prompt.prompt_id,
      category: "unassigned",
      branded: false,
      question: prompt.question,
      system: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
      requested_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
      returned_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
      response_id: `synthetic-local-${prompt.prompt_id}`,
      observed_at: "2026-09-18T00:00:00.000Z",
      raw_answer:
        "[SINTETIS] Jawaban contoh untuk pengujian alur lokal; bukan respons model.",
      sources: [],
      run_status: "completed",
      failure_reason: "",
      telemetry: [fixtureCallTelemetry({ response_id: prompt.prompt_id })],
    };
  }

  const reportBody = () => ({
    question_method: "direct-ten",
    prompts: wirePrompts,
    safety_identifier: "local-direct-ten-fixture",
    budget: {
      limit_usd: AUDIT_COST_LIMIT_USD,
      carryover_cost_usd: 0,
      calls: [],
    },
    client_contract_version: DIRECT_TEN_REPORT_CONTRACT_VERSION,
    context: context(),
    observations: wirePrompts.map(syntheticObservation),
  });

  /** Synthetic report that retains ten answers but offers no action at all —
   * every assessment is absent, so no P/V candidate is eligible either. */
  const uselessReport: ReportGenerator = async (input) => {
    const synthesis: ReportSynthesis = {
      conclusion:
        "Sepuluh jawaban tersimpan; tidak ada tindakan yang didukung bukti.",
      accuracy_status: "could_not_assess",
      key_findings: [],
      priorities: [],
      assessments: input.observations.map((observation) => ({
        prompt_id: observation.prompt_id,
        recommendation: "not_assessed" as const,
        comparison: "not_observed" as const,
        information: "not_assessed" as const,
      })),
    };
    return {
      content: assembleReportContent(
        synthesis,
        input.observations,
        input.brief,
        undefined,
        "direct-ten",
        "id",
      ),
      requested_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
      returned_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
      response_id: "synthetic-report-useless",
      telemetry: [syntheticCall("useless")],
    };
  };

  it("returns 422 REPORT_USEFULNESS_FAILURE with retained telemetry, then succeeds on retry", async () => {
    const generate = vi.mocked(generateSyntheticLocalReport);
    generate.mockImplementationOnce(uselessReport);

    const failed = await reportPOST(post(reportBody()));
    expect(failed.status).toBe(422);
    const failure = await failed.json();
    expect(failure.code).toBe("REPORT_USEFULNESS_FAILURE");
    expect(failure.report).toBeUndefined();
    expect(failure.telemetry).toHaveLength(1);
    expect(failure.telemetry[0].response_id).toBe("synthetic-report-useless");
    expect(failure.diagnostics).toContain("usefulness_minimum_not_met");

    // The recovery retry replays the retained observations — same body.
    const retried = await reportPOST(post(reportBody()));
    expect(retried.status).toBe(200);
    const success = await retried.json();
    expect(success.report).toBeDefined();
    expect(success.report.details).toHaveLength(10);
    expect(success.report.priorities.length).toBeGreaterThanOrEqual(1);
    expect(providerMocks.liveGenerateReportContent).not.toHaveBeenCalled();
  });
});
