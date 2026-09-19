import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  canonicalLockedDirectTenPack,
  DIRECT_TEN_PROMPT_IDS,
  lockedObservationBindingErrors,
  lockedQuestionPackForMethod,
} from "./locked-question-pack";
import {
  assembleReportContent,
  buildAuditReport,
  reportAssessmentClassesFor,
} from "./contracts";
import { INDONESIAN_AUDIT_REPORT_LABELS } from "./report-language";
import {
  assertReportGenerationGate,
  createValidatedAuditReport,
  ReportPipelineError,
} from "./report-pipeline";
import { protectedObservationRequest } from "./protected-observation-provider";
import {
  loadRetainedDirectTenPack,
  retainedConfirmedBrief,
  runLocalDirectTenAudit,
} from "./local-direct-ten-audit";
import {
  SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
  type AuditCallTelemetry,
  type AuditObservation,
  type AuditPrompt,
  type BusinessBrief,
  type ReportSynthesis,
} from "./types";

function brief(): BusinessBrief {
  return {
    brand_name: "Kopi Nuave",
    entity_scope: "Jakarta",
    brand_type: "coffee shop",
    category: "coffee shop",
    market_context: "Jakarta",
    target_customer: "coffee drinkers",
    official_sources: ["https://kopinuave.example/"],
    verified_offerings: ["coffee"],
    verified_customer_needs: ["find coffee"],
    verified_decision_criteria: ["location"],
    verified_competitor: { name: "", scope: "", source_url: "" },
    similar_businesses: [],
    brand_name_variants: ["Nuave Coffee"],
    priority_offering: "coffee",
    conversion_action: "visit the shop",
    customer_supplied_facts: [],
    known_accuracy_questions: [],
    usp: "",
    regulated_category_notes: "",
    language: "en-US",
    agency_name: "",
    agency_logo_data_url: "",
  };
}

function directTenWire() {
  return DIRECT_TEN_PROMPT_IDS.map((prompt_id, index) => ({
    prompt_id,
    question: `Apa pilihan coffee shop di Jakarta untuk kebutuhan ${index + 1}?`,
    review_status: "needs_human_review" as const,
  }));
}

function locked(): AuditPrompt[] {
  return canonicalLockedDirectTenPack(directTenWire(), brief()).prompts;
}

function syntheticCall(promptId: string): AuditCallTelemetry {
  const at = "2026-09-18T00:00:00.000Z";
  return {
    stage: "observation",
    attempt: 1,
    status: "completed",
    started_at: at,
    completed_at: at,
    latency_ms: 0,
    requested_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    returned_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    response_id: `synthetic-local-${promptId}`,
    service_tier: "none",
    usage: {
      input_tokens: 0,
      cached_input_tokens: 0,
      cache_write_input_tokens: 0,
      output_tokens: 0,
      reasoning_output_tokens: 0,
      total_tokens: 0,
    },
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

function syntheticObservation(prompt: AuditPrompt): AuditObservation {
  return {
    prompt_id: prompt.prompt_id,
    category: prompt.category,
    branded: prompt.branded,
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
    telemetry: [syntheticCall(prompt.prompt_id)],
  };
}

function synthesis(observations: AuditObservation[]): ReportSynthesis {
  const ids = observations.map((observation) => observation.prompt_id);
  return {
    conclusion:
      "Uji alur lokal dengan jawaban sintetis berlabel. Bisnis tidak disebut dalam jawaban sintetis mana pun; ini bukan bukti visibilitas.",
    accuracy_status: "could_not_assess",
    key_findings: [
      {
        title: "Seluruh jawaban pada sesi ini sintetis",
        explanation:
          "Sepuluh pertanyaan dijalankan dengan jawaban contoh berlabel, tanpa respons model atau penelusuran web.",
        evidence_prompt_ids: ids,
      },
    ],
    priorities: [
      {
        order: 1,
        timing: "do_first",
        action:
          "Jalankan audit dengan jawaban nyata yang disetujui sebelum mengambil keputusan.",
        why: "Setiap pertanyaan menghasilkan jawaban sintetis, jadi tidak ada celah yang benar-benar teramati.",
        basis:
          "Sepuluh dari sepuluh jawaban sintetis dan tidak menyebut bisnis.",
        owner: "business_owner",
        done_when:
          "Satu audit dengan jawaban nyata selesai dan lolos validasi.",
        evidence_prompt_ids: [ids[0]!],
        caveat: "Langkah verifikasi, bukan tindakan pemasaran.",
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

async function generateSynthetic(input: {
  observations: AuditObservation[];
  brief: BusinessBrief;
}) {
  const content = assembleReportContent(
    synthesis(input.observations),
    input.observations,
    input.brief,
    undefined,
    "direct-ten",
  );
  return {
    content,
    requested_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    returned_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
    response_id: "synthetic-local-report-1",
    telemetry: [{ ...syntheticCall("report"), stage: "report" as const }],
  };
}

describe("direct-ten locked pack", () => {
  it("locks ten NUAVE-DT ids in order with exact text and honest empty semantics", () => {
    const pack = canonicalLockedDirectTenPack(directTenWire(), brief());
    expect(pack.prompts).toHaveLength(10);
    pack.prompts.forEach((prompt, index) => {
      expect(prompt.prompt_id).toBe(DIRECT_TEN_PROMPT_IDS[index]);
      expect(prompt.question).toBe(directTenWire()[index]!.question);
      expect(prompt.category).toBe("unassigned");
      expect(prompt.role).toBe("");
      expect(prompt.rationale).toBe("");
      expect(prompt.inputs_used).toEqual([]);
      expect(prompt.branded).toBe(false);
      expect(prompt.review_status).toBe("needs_human_review");
    });
  });

  it("honestly classifies a human edit that names the business as branded", () => {
    const wire = directTenWire();
    wire[3] = { ...wire[3]!, question: "Apa kabar Kopi Nuave di Jakarta?" };
    const pack = canonicalLockedDirectTenPack(wire, brief());
    expect(pack.prompts[3]!.branded).toBe(true);
  });

  it("rejects non-NUAVE-DT ids, reorder, duplicates, wrong count and empty text", () => {
    const wrong = directTenWire();
    wrong[0] = { ...wrong[0]!, prompt_id: "NVA-ID-01" };
    expect(() => canonicalLockedDirectTenPack(wrong, brief())).toThrow(
      /NUAVE-DT/,
    );
    const reordered = [...directTenWire()].reverse();
    expect(() => canonicalLockedDirectTenPack(reordered, brief())).toThrow(
      /NUAVE-DT/,
    );
    const dup = directTenWire();
    dup[1] = { ...dup[1]!, prompt_id: dup[0]!.prompt_id };
    expect(() => canonicalLockedDirectTenPack(dup, brief())).toThrow(/unique/);
    expect(() =>
      canonicalLockedDirectTenPack(directTenWire().slice(0, 9), brief()),
    ).toThrow(/exactly ten/);
    const empty = directTenWire();
    empty[4] = { ...empty[4]!, question: "   " };
    expect(() => canonicalLockedDirectTenPack(empty, brief())).toThrow(
      /question text/,
    );
  });

  it("dispatches by explicit method and still locks canonical packs", () => {
    const direct = lockedQuestionPackForMethod({
      prompts: directTenWire(),
      brief: brief(),
      questionMethod: "direct-ten",
    });
    expect(direct.prompts[0]!.prompt_id).toBe("NUAVE-DT-01");
    expect(() =>
      lockedQuestionPackForMethod({
        prompts: directTenWire() as AuditPrompt[],
        brief: brief(),
        questionMethod: "canonical",
      }),
    ).toThrow();
  });

  it("binds observations to the exact locked question text", () => {
    const prompts = locked();
    const observations = prompts.map(syntheticObservation);
    expect(
      lockedObservationBindingErrors({
        prompts,
        observations,
        brief: brief(),
        questionMethod: "direct-ten",
      }),
    ).toEqual([]);
    const altered = observations.map((observation, index) =>
      index === 2
        ? { ...observation, question: "Pertanyaan yang diubah?" }
        : observation,
    );
    const errors = lockedObservationBindingErrors({
      prompts,
      observations: altered,
      brief: brief(),
      questionMethod: "direct-ten",
    });
    expect(errors.join(" ")).toContain("NUAVE-DT-03");
  });
});

describe("protected observation request boundary", () => {
  it("sends only the exact approved question as user content", () => {
    const question = "Apa pilihan coffee shop di Jakarta untuk pembeli baru?";
    const request = protectedObservationRequest({
      question,
      safety_identifier: "test-safety-id",
      requested_model: "gpt-5.6-luna",
    });
    const userMessages = request.input.filter(
      (message) => message.role === "user",
    );
    expect(userMessages).toEqual([{ role: "user", content: question }]);
    // The audited identity, brief fields, comparators and other answers cannot
    // appear anywhere in the request beyond the exact question text — the
    // builder only receives the question, the hashed safety id and the model.
    const requestJson = JSON.stringify(request);
    expect(requestJson).not.toContain("Kopi Nuave");
    expect(requestJson).not.toContain("kopinuave.example");
    expect(requestJson).not.toContain("brand_name");
    expect(requestJson).not.toContain("verified_");
    expect(requestJson).not.toContain("brief");
    // Everything question-derived is exactly the approved text, nothing more.
    expect(requestJson).toContain(JSON.stringify(question));
    expect(request.tool_choice).toBe("required");
  });
});

describe("direct-ten report path", () => {
  it("marks every dimension eligible per answer instead of matrix slots", () => {
    const prompts = locked();
    const observation = syntheticObservation(prompts[0]!);
    expect(
      reportAssessmentClassesFor({
        promptId: "NUAVE-DT-01",
        observation,
        questionMethod: "direct-ten",
      }),
    ).toEqual(["recommendation", "comparison", "information"]);
    expect(
      reportAssessmentClassesFor({
        promptId: "NUAVE-DT-01",
        observation,
      }),
    ).toEqual([]);
  });

  it("rejects labeled synthetic evidence without the server-internal flag", () => {
    const prompts = locked();
    const observations = prompts.map(syntheticObservation);
    expect(() =>
      assertReportGenerationGate({
        brief: brief(),
        prompts,
        observations,
        safety_identifier: "test-safety",
        budget: { limit_usd: 5, carryover_cost_usd: 0, calls: [] },
        question_method: "direct-ten",
      }),
    ).toThrow(ReportPipelineError);
  });

  it("rejects unlabeled evidence even under the synthetic flag", () => {
    const prompts = locked();
    const observations = prompts.map(syntheticObservation);
    observations[0] = {
      ...observations[0]!,
      system: "OpenCode Go Responses API",
    };
    expect(() =>
      assertReportGenerationGate({
        brief: brief(),
        prompts,
        observations,
        safety_identifier: "test-safety",
        budget: { limit_usd: 5, carryover_cost_usd: 0, calls: [] },
        question_method: "direct-ten",
        allow_synthetic_evidence: true,
      }),
    ).toThrow(/labeled synthetic-local-fixture/);
  });

  it("builds a validated report from ten direct-ten labeled observations", async () => {
    const prompts = locked();
    const observations = prompts.map(syntheticObservation);
    const report = await createValidatedAuditReport(
      {
        brief: brief(),
        prompts,
        observations,
        safety_identifier: "test-safety",
        budget: { limit_usd: 5, carryover_cost_usd: 0, calls: [] },
        language: "id",
        question_method: "direct-ten",
        allow_synthetic_evidence: true,
      },
      generateSynthetic,
    );
    expect(report.details).toHaveLength(10);
    expect(report.details.map((detail) => detail.prompt_id)).toEqual(
      DIRECT_TEN_PROMPT_IDS,
    );
    expect(report.facts.discovery.total).toBe(10);
    expect(report.facts.discovery.absent).toBe(10);
    expect(report.method_summary).not.toContain("with web search");
    // No fabricated matrix semantics: nothing assessed through slot classes.
    expect(
      report.details.every(
        (detail) =>
          detail.recommendation === "not_assessed" &&
          detail.comparison === "not_observed" &&
          detail.information === "not_assessed",
      ),
    ).toBe(true);
  });

  it("reports appearance and explicit recommendations separately across evaluable answers (R-07)", async () => {
    const prompts = locked();
    // Mixed answers: explicit endorsement, mention-only, absence, failure.
    const observations = prompts.map((prompt, index) => {
      const observation = syntheticObservation(prompt);
      if (index === 0) {
        observation.raw_answer =
          "Tentu — Kopi Nuave adalah pilihan terbaik untuk pembeli baru.";
      } else if (index === 1) {
        observation.raw_answer =
          "Beberapa nama yang muncul antara lain Kopi Nuave dan kedai lain.";
      } else if (index === 9) {
        observation.run_status = "failed";
        observation.raw_answer = "";
        observation.failure_reason = "timeout";
      }
      return observation;
    });
    const mixedSynthesis: ReportSynthesis = {
      conclusion: "Hasil campuran untuk uji regresi — bukan bukti visibilitas.",
      accuracy_status: "needs_confirmation",
      key_findings: [
        {
          title: "Satu jawaban merekomendasikan secara eksplisit",
          explanation:
            "Satu jawaban menyebut dan merekomendasikan bisnis; satu hanya menyebut tanpa dukungan.",
          evidence_prompt_ids: ["NUAVE-DT-01", "NUAVE-DT-02"],
        },
      ],
      priorities: [
        {
          order: 1,
          timing: "do_first",
          action: "Verifikasi hasil dengan jawaban nyata.",
          why: "Regresi ini memakai jawaban campuran buatan.",
          basis: "Satu jawaban gagal; sisanya teramati.",
          owner: "business_owner",
          done_when: "Audit nyata selesai.",
          evidence_prompt_ids: ["NUAVE-DT-09"],
          caveat: "Langkah verifikasi, bukan tindakan pemasaran.",
        },
      ],
      assessments: observations.map((observation, index) => ({
        prompt_id: observation.prompt_id,
        recommendation:
          index === 0
            ? ("recommended" as const)
            : index <= 8
              ? ("not_recommended" as const)
              : ("not_assessed" as const),
        comparison: "not_observed" as const,
        information: "not_assessed" as const,
      })),
    };
    // The delivery gate requires ten evaluable observations, so the failed
    // case is exercised at the report layer the gate protects — the same
    // normalize + build path the pipeline runs.
    const content = assembleReportContent(
      mixedSynthesis,
      observations,
      brief(),
      undefined,
      "direct-ten",
      "id",
    );
    const report = buildAuditReport(
      content,
      observations,
      {
        requested_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
        returned_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
        response_id: "synthetic-local-report-1",
      },
      INDONESIAN_AUDIT_REPORT_LABELS,
      undefined,
      "direct-ten",
    );
    // Appearance stays a separate observed fact across evaluable answers.
    const detailById = new Map(
      report.details.map((detail) => [detail.prompt_id, detail]),
    );
    expect(detailById.get("NUAVE-DT-01")!.appearance).toBe("mentioned");
    expect(detailById.get("NUAVE-DT-01")!.recommendation).toBe("recommended");
    expect(detailById.get("NUAVE-DT-02")!.appearance).toBe("mentioned");
    expect(detailById.get("NUAVE-DT-02")!.recommendation).toBe(
      "not_recommended",
    );
    // An absent answer still carries its explicit not-recommended judgment.
    expect(detailById.get("NUAVE-DT-03")!.appearance).toBe("absent");
    expect(detailById.get("NUAVE-DT-03")!.recommendation).toBe(
      "not_recommended",
    );
    // A failed answer is unassessed, never evidence of absence.
    expect(detailById.get("NUAVE-DT-10")!.run).toBe("failed");
    expect(detailById.get("NUAVE-DT-10")!.recommendation).toBe("not_assessed");
    // Measures: 9 evaluable answers assessed for recommendation, 1 explicit
    // endorsement; appearance counted separately (2 mentioned).
    expect(report.measures.recommendation.assessed).toBe(9);
    expect(report.measures.recommendation.recommended).toBe(1);
    expect(report.facts.discovery.absent).toBe(7);
    expect(report.facts.discovery.recommended).toBe(1);
    expect(report.facts.discovery.mentioned_not_recommended).toBe(1);
    // Indonesian detail copy in the delivered report.
    expect(report.details[2]!.finding).toContain("tidak muncul");
  });

  it("counts not_assessed judgments in the ten-evaluable recommendation denominator (R-07)", () => {
    // The reproduced counterexample: ten completed answers, one explicit
    // endorsement, nine not_assessed judgments. The headline must read 1/10
    // — a completed answer with an uncertain judgment was still evaluated.
    const prompts = locked();
    const observations = prompts.map((prompt, index) => {
      const observation = syntheticObservation(prompt);
      if (index === 0) {
        observation.raw_answer =
          "Kopi Nuave adalah pilihan yang paling saya rekomendasikan.";
      }
      return observation;
    });
    const synthesis: ReportSynthesis = {
      conclusion:
        "Satu jawaban merekomendasikan; sembilan lainnya tidak menghasilkan penilaian. Bukan bukti visibilitas.",
      accuracy_status: "needs_confirmation",
      key_findings: [
        {
          title: "Satu dukungan eksplisit",
          explanation:
            "Satu dari sepuluh jawaban merekomendasikan bisnis secara eksplisit; sisanya tidak menilai.",
          evidence_prompt_ids: ["NUAVE-DT-01"],
        },
      ],
      priorities: [
        {
          order: 1,
          timing: "do_first",
          action: "Verifikasi dengan jawaban nyata.",
          why: "Regresi denominator — jawaban contoh.",
          basis: "Satu dukungan dari sepuluh jawaban yang dinilai.",
          owner: "business_owner",
          done_when: "Audit nyata selesai.",
          evidence_prompt_ids: ["NUAVE-DT-01"],
          caveat: "Langkah verifikasi, bukan tindakan pemasaran.",
        },
      ],
      assessments: observations.map((observation, index) => ({
        prompt_id: observation.prompt_id,
        recommendation:
          index === 0 ? ("recommended" as const) : ("not_assessed" as const),
        comparison: "not_observed" as const,
        information: "not_assessed" as const,
      })),
    };
    const content = assembleReportContent(
      synthesis,
      observations,
      brief(),
      undefined,
      "direct-ten",
      "id",
    );
    const report = buildAuditReport(
      content,
      observations,
      {
        requested_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
        returned_model: SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
        response_id: "synthetic-local-report-1",
      },
      INDONESIAN_AUDIT_REPORT_LABELS,
      undefined,
      "direct-ten",
    );
    // 1 explicit recommendation across all ten evaluated answers — not 1/1.
    expect(report.measures.recommendation).toEqual({
      recommended: 1,
      assessed: 10,
    });
    // Uncertainty stays honest in the details: the nine absent answers keep
    // their not_assessed outcome rather than pretending a judgment.
    const detailById = new Map(
      report.details.map((detail) => [detail.prompt_id, detail]),
    );
    expect(detailById.get("NUAVE-DT-01")!.recommendation).toBe("recommended");
    expect(detailById.get("NUAVE-DT-05")!.recommendation).toBe("not_assessed");
    expect(detailById.get("NUAVE-DT-05")!.appearance).toBe("absent");
  });

  it("still rejects an altered observation question at the gate", () => {
    const prompts = locked();
    const observations = prompts.map(syntheticObservation);
    observations[5] = { ...observations[5]!, question: "Diubah?" };
    expect(() =>
      assertReportGenerationGate({
        brief: brief(),
        prompts,
        observations,
        safety_identifier: "test-safety",
        budget: { limit_usd: 5, carryover_cost_usd: 0, calls: [] },
        question_method: "direct-ten",
        allow_synthetic_evidence: true,
      }),
    ).toThrow(/does not match the exact locked question/);
  });
});

describe("retained pack loading", () => {
  let dir: string | null = null;
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
    dir = null;
  });

  // Fictional stand-in for the private retained business; the real confirmed
  // intake lives only in ignored local evidence. Field shapes match what the
  // retained pack exercises (brand scope, category alternatives, multi-area
  // market, Indonesian buyer-context note).
  const TEST_CONFIRMED = {
    brand: {
      name: "Advisori Contoh",
      primarySource: "https://advisoricontoh.example",
    },
    scope: "brand",
    target: null,
    category: "Advisori umum untuk usaha kecil",
    offerings: ["Advisori untuk perencanaan dan pengembangan usaha kecil"],
    customerReasons: [
      "Usaha kecil yang ingin menyusun rencana bisnis",
      "Memilih penasihat yang memahami kebutuhan usaha kecil",
      "Mencari pendampingan dari perencanaan sampai pelaksanaan",
      "Mencari penasihat yang memahami operasional usaha sehari-hari",
    ],
    serviceChannels: [],
    market: {
      reach: "beberapa",
      areas: ["Jakarta", "Bandung", "Surabaya"],
    },
    comparators: { mode: "category-alternatives", names: [] },
    publicFact:
      "Konteks disampaikan pendiri. Harga dan pengalaman penasihat belum dikonfirmasi.",
  };

  async function writePack(questions: string[]) {
    dir = await mkdtemp(join(tmpdir(), "nuave-dt-pack-"));
    const prompts = DIRECT_TEN_PROMPT_IDS.map((prompt_id, index) => ({
      prompt_id,
      question: questions[index]!,
      review_status: "needs_human_review" as const,
    }));
    const packBody = JSON.stringify({
      input: { confirmed: TEST_CONFIRMED },
      promptPack: {
        method: "nuave-glm-direct-ten-v1",
        language: "id-ID",
        prompts,
      },
    });
    await writeFile(join(dir, "accepted-local-pack.json"), packBody);
    const acceptance = {
      accepted: true,
      acceptedQuestionCount: 10,
      method: "nuave-glm-direct-ten-v1",
      orderedQuestionTextsSha256: createHash("sha256")
        .update(JSON.stringify(questions), "utf8")
        .digest("hex"),
      nativePackFile: "accepted-local-pack.json",
      nativePackSha256: createHash("sha256")
        .update(packBody, "utf8")
        .digest("hex"),
      responseId: "gen-test",
      auditOrReportCallsAuthorized: false,
    };
    await writeFile(join(dir, "ACCEPTANCE.json"), JSON.stringify(acceptance));
    return questions;
  }

  const TEN = DIRECT_TEN_PROMPT_IDS.map(
    (_, index) => `Pertanyaan uji nomor ${index + 1} untuk alur lokal?`,
  );

  it("verifies both recorded hashes before exposing the pack", async () => {
    await writePack(TEN);
    const pack = await loadRetainedDirectTenPack(dir!);
    expect(pack.prompts).toHaveLength(10);
    expect(pack.prompts[0]!.prompt_id).toBe("NUAVE-DT-01");
  });

  it("refuses a tampered pack file", async () => {
    await writePack(TEN);
    await writeFile(
      join(dir!, "accepted-local-pack.json"),
      JSON.stringify({
        input: { confirmed: TEST_CONFIRMED },
        promptPack: {
          method: "nuave-glm-direct-ten-v1",
          language: "id-ID",
          prompts: DIRECT_TEN_PROMPT_IDS.map((prompt_id, index) => ({
            prompt_id,
            question: `Pertanyaan diganti ${index + 1}?`,
            review_status: "needs_human_review",
          })),
        },
      }),
    );
    await expect(loadRetainedDirectTenPack(dir!)).rejects.toThrow(
      /does not match the accepted record/,
    );
  });

  it("refuses submitted questions that differ from the accepted pack", async () => {
    await writePack(TEN);
    const changed = [...TEN];
    changed[0] = "Pertanyaan lain sama sekali?";
    await expect(runLocalDirectTenAudit(dir!, changed)).rejects.toThrow(
      /differ from the accepted pack/,
    );
  });

  it("runs the full labeled local path end to end", async () => {
    await writePack(TEN);
    const result = await runLocalDirectTenAudit(dir!, TEN);
    expect(result.provenance.synthetic).toBe(true);
    expect(result.provenance.provider_calls).toBe(0);
    expect(result.observations).toHaveLength(10);
    expect(
      result.observations.every(
        (observation) =>
          observation.system === SYNTHETIC_LOCAL_FIXTURE_SYSTEM &&
          observation.telemetry.every((call) => call.web_search_calls === 0),
      ),
    ).toBe(true);
    expect(result.report.details).toHaveLength(10);
    expect(result.brief.brand_name).toBe("Advisori Contoh");
  });

  it("projects only confirmed facts into the brief", () => {
    const projected = retainedConfirmedBrief(TEST_CONFIRMED);
    expect(projected.brand_name).toBe("Advisori Contoh");
    expect(projected.verified_competitor.name).toContain("alternatif");
    expect(projected.customer_supplied_facts).toEqual([
      TEST_CONFIRMED.publicFact,
    ]);
    expect(projected.usp).toBe("");
    expect(projected.known_accuracy_questions[0]).toContain(
      "belum dikonfirmasi",
    );
  });
});
