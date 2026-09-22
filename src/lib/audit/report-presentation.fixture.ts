/** Fictional, offline report-reader fixtures; never imported by product code. */
import { buildAuditReport } from "./contracts";
import { goldenBrief } from "./fixtures/report-golden";
import { fixtureCallTelemetry } from "./fixtures/telemetry";
import type { AuditObservation, ReportContent } from "./types";

export function presentationFixture() {
  const ids = [
    "q-z",
    "q-a",
    "q-10",
    "q-2",
    "q-é",
    "q/6",
    "q 7",
    "q_8",
    "q-9",
    "q-end",
  ];
  const observations: AuditObservation[] = ids.map((prompt_id, i) => ({
    prompt_id,
    category: "unassigned",
    branded: false,
    question: `Pertanyaan ${i + 1}: café  lokal — pilihan apa?\r\nApa batasnya?`,
    raw_answer: `Ya.\r\n\r\nJawaban  lengkap ${i + 1} — café, 日本語.\r\n\r\nNamun, keterangan terakhir ${i + 1} perlu dikonfirmasi.`,
    system: "synthetic-local-fixture",
    requested_model: "fictional-answer-requested",
    returned_model: `fictional-answer-${i % 2}`,
    response_id: `fictional-${i}`,
    observed_at: `2026-09-${i === 0 ? "21" : "22"}T03:04:05.000Z`,
    sources: [{ title: "Sumber contoh", url: "https://source.example/" }],
    run_status: "completed",
    failure_reason: "",
    telemetry: [fixtureCallTelemetry({ stage: "observation" })],
  }));
  const content: ReportContent = {
    conclusion:
      "Ini contoh fiktif untuk menguji pembacaan bukti, bukan hasil bisnis nyata.",
    accuracy_status: "could_not_assess",
    details: observations.map((o, i) => ({
      prompt_id: o.prompt_id,
      run: "completed",
      appearance: i === 0 ? "mentioned" : "absent",
      recommendation: i === 0 ? "recommended" : "not_assessed",
      comparison: "not_observed",
      information: "not_assessed",
      finding: "Analisis per pertanyaan tidak boleh diulang.",
      evidence_note: "Catatan berulang tidak ditampilkan.",
      answer_excerpt: "Ya.",
      source_urls: o.sources.map((s) => s.url),
    })),
    key_findings: [
      {
        title: "Temuan fiktif",
        explanation: "Keterangan perlu dibaca bersama batasannya.",
        evidence_prompt_ids: ids.slice(0, 2),
      },
    ],
    priorities: [
      {
        order: 1,
        timing: "do_first",
        action: "Periksa keterangan contoh.",
        why: "Ada batasan yang harus diperiksa.",
        basis: "Dua jawaban contoh menyertakan batasan.",
        owner: "business_owner",
        done_when: "Keterangan telah diperiksa.",
        caveat: "Bukan diagnosis penyebab.",
        evidence_prompt_ids: ids.slice(0, 2),
      },
    ],
    observed_competitors: [
      {
        name: "Usaha Contoh",
        relationship: "mentioned",
        evidence_prompt_ids: ids.slice(0, 2),
      },
    ],
  };
  const report = buildAuditReport(
    content,
    observations,
    {
      requested_model: "fictional-synthesis",
      returned_model: "fictional-synthesis",
      response_id: "fictional-report",
    },
    undefined,
    undefined,
    "direct-ten",
  );
  report.generated_at = "2026-09-23T00:00:00.000Z";
  return { report, observations, brief: { ...goldenBrief } };
}
