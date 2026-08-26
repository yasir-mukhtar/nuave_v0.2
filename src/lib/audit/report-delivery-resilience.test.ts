import { describe, expect, it, vi } from "vitest";
import {
  goldenBrief,
  goldenObservations,
  goldenPrompts,
  goldenReportContent,
} from "./fixtures/report-golden";
import {
  fixtureProtectedObservationSet,
} from "./fixtures/protected-observation";
import { fixtureBudget, fixtureCallTelemetry } from "./fixtures/telemetry";
import {
  createValidatedAuditReport,
  type ReportGenerator,
} from "./report-pipeline";
import { exactAnswerExcerpt } from "./report-excerpt";
import type { AuditObservation, ReportContent } from "./types";

const protectedObservations = fixtureProtectedObservationSet(
  goldenPrompts,
  goldenObservations,
);

const input = {
  brief: goldenBrief,
  prompts: goldenPrompts,
  observations: protectedObservations,
  safety_identifier: "report-resilience-fixture",
  budget: fixtureBudget,
};

function protectedReportContent(
  observations: AuditObservation[] = protectedObservations,
): ReportContent {
  const content = goldenReportContent();
  return {
    ...content,
    details: content.details.map((detail, index) => ({
      ...detail,
      answer_excerpt: observations[index].raw_answer,
    })),
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

function diagnosticsFrom(
  report: Awaited<ReturnType<typeof createValidatedAuditReport>>,
) {
  return report.operational_telemetry.calls.flatMap((call) => {
    const diagnosticCall = call as typeof call & {
      report_diagnostics?: string[];
    };
    return diagnosticCall.report_diagnostics ?? [];
  });
}

function longSentence(word: string) {
  return `${Array.from({ length: 61 }, () => word).join(" ")}.`;
}

describe("literal answer excerpts", () => {
  it.each([
    ["newline", "Baris pertama:\n\n- butir satu\n- butir dua"],
    [
      "multiple spaces",
      "Jawaban dengan   beberapa   spasi yang dipertahankan.",
    ],
    ["bullet list", "Pilihan:\n- Alpha\n- Beta\n- Gamma"],
    ["CRLF", "Baris pertama:\r\n\r\n- Alpha\r\n- Beta"],
    ["simple line", "Satu kalimat sederhana yang berakhir di sini."],
  ])("keeps %s formatting as a literal substring", (_label, rawAnswer) => {
    const excerpt = exactAnswerExcerpt(rawAnswer);
    expect(rawAnswer.includes(excerpt)).toBe(true);
  });

  it("keeps long truncation literal and bounded", () => {
    const rawAnswer = `Pembuka tanpa titik ${Array.from(
      { length: 100 },
      (_, index) => `bagian-${index}`,
    ).join(" ")}`;
    const excerpt = exactAnswerExcerpt(rawAnswer);
    expect(excerpt.length).toBeLessThanOrEqual(320);
    expect(rawAnswer.includes(excerpt)).toBe(true);
  });

  it("repairs production-shaped newline collapse", async () => {
    const rawAnswer = [
      "Bisa—kalau kantor Anda di AS, pilihan paling praktis biasanya:",
      "",
      "- DoorDash untuk pengantaran cepat",
      "- Pilihan lain untuk kebutuhan berbeda",
    ].join("\n");
    const observations = protectedObservations.map((observation, index) =>
      index === 0 ? { ...observation, raw_answer: rawAnswer } : observation,
    );
    const draft = protectedReportContent(observations);
    draft.details[0].answer_excerpt = rawAnswer.replace(/\s+/g, " ").trim();
    const generate = vi.fn(
      async () => result(draft, "response-production-shaped"),
    ) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(
      { ...input, observations },
      generate,
    );

    expect(rawAnswer.includes(report.details[0].answer_excerpt)).toBe(true);
    expect(report.details[0].answer_excerpt).toContain("\n");
    expect(diagnosticsFrom(report)).toContain("excerpt_repaired");
  });
});

describe("recoverable report quality", () => {
  it("delivers after removing all unsupported priorities", async () => {
    const draft = protectedReportContent();
    const unsupportedPromptId = goldenPrompts[6].prompt_id;
    draft.priorities = draft.priorities.map((priority) => ({
      ...priority,
      evidence_prompt_ids: [unsupportedPromptId],
    }));
    const generate = vi.fn(
      async () => result(draft, "response-no-priorities"),
    ) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(input, generate);

    expect(report.priorities).toEqual([]);
    expect(diagnosticsFrom(report)).toEqual(
      expect.arrayContaining([
        "unsupported_priority_removed",
        "minimum_report_fallback_used",
      ]),
    );
  });

  it("drops invalid source and unsupported competitor", async () => {
    const draft = protectedReportContent();
    draft.details[0].source_urls = ["https://unsupported.example/evidence"];
    draft.observed_competitors = [
      {
        name: "Unsupported Example",
        relationship: "mentioned",
        evidence_prompt_ids: [goldenPrompts[0].prompt_id],
      },
    ];
    const generate = vi.fn(
      async () => result(draft, "response-contained-evidence"),
    ) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(input, generate);

    expect(report.details[0].source_urls).toEqual([]);
    expect(report.observed_competitors).toEqual([]);
    expect(diagnosticsFrom(report)).toEqual(
      expect.arrayContaining([
        "invalid_source_removed",
        "unsupported_competitor_removed",
      ]),
    );
  });

  it("warns on a persistent style violation", async () => {
    const initial = protectedReportContent();
    initial.conclusion = longSentence("clear");
    const retry = protectedReportContent();
    retry.conclusion = longSentence("plain");
    const generate = vi
      .fn()
      .mockResolvedValueOnce(result(initial, "response-style-initial"))
      .mockResolvedValueOnce(result(retry, "response-style-retry"));

    const report = await createValidatedAuditReport(
      input,
      generate as unknown as ReportGenerator,
    );

    expect(generate).toHaveBeenCalledTimes(2);
    expect(report.provenance.language_retry_performed).toBe(true);
    expect(diagnosticsFrom(report)).toContain("language_warning");
  });

  it("removes a prohibited model-authored claim", async () => {
    const draft = protectedReportContent();
    draft.conclusion = "Nuave guarantees this change will increase sales.";
    const generate = vi.fn(
      async () => result(draft, "response-dangerous-claim"),
    ) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(input, generate);

    expect(report.conclusion).not.toMatch(/guarantee|increase sales/i);
    expect(report.conclusion).toContain(goldenBrief.brand_name);
    expect(diagnosticsFrom(report)).toContain("prohibited_claim_removed");
  });
});

describe("protected observation integrity remains hard", () => {
  it("blocks incomplete evidence before report synthesis", async () => {
    const generate = vi.fn(
      async () => result(protectedReportContent(), "should-not-run"),
    ) as unknown as ReportGenerator;

    await expect(
      createValidatedAuditReport(
        { ...input, observations: protectedObservations.slice(0, 9) },
        generate,
      ),
    ).rejects.toMatchObject({
      diagnostics: expect.arrayContaining(["observation_gate_failure"]),
    });
    expect(generate).not.toHaveBeenCalled();
  });
});
