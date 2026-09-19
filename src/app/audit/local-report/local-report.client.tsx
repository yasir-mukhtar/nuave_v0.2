"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AuditNotice } from "@/components/product/AuditNotice";
import ReportView from "@/app/audit/ReportView";
import { makeCustomerEvidenceExport } from "@/lib/audit/customer-evidence-export";
import { canonicalLockedDirectTenPack } from "@/lib/audit/locked-question-pack";
import { AuditRunEventParser } from "@/lib/audit/stream";
import { AUDIT_CLIENT_CONTRACT_VERSION } from "@/lib/audit/client-contract";
import {
  parseLocalQuestionPack,
  updateLocalQuestion,
  type LocalQuestionPack,
} from "@/lib/intake/local-questions";
import { LocalQuestionsScreen } from "@/lib/intake/questions-screen";
import {
  AUDIT_COST_LIMIT_USD,
  SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
  type AuditCallTelemetry,
  type AuditObservation,
  type AuditPrompt,
  type AuditReport,
  type BusinessBrief,
} from "@/lib/audit/types";

type LocalAuditResult = {
  report: AuditReport;
  prompts: AuditPrompt[];
  observations: AuditObservation[];
  brief: BusinessBrief;
  provenance: {
    synthetic: boolean;
    live_authorized: boolean;
    pack_method: string;
    pack_response_id: string | null;
    question_method: string;
    provider_calls: number;
  };
};

type PackResponse = {
  pack: unknown;
  brief: BusinessBrief;
  provenance: {
    pack_method: string;
    pack_response_id: string | null;
    question_method: string;
    live_authorized: boolean;
  };
};

const STORAGE_KEY = "nuave.localAudit.retainedPackEdits.v1";

/**
 * Founder-local demo surface for Spec 009 Block B: the retained, accepted
 * pack (the real business's identity stays in ignored private evidence)
 * loads through the real review UI — edits persist in this
 * browser session across Back/reload, any change marks the wording as no
 * longer the approved pack, and only the exact accepted texts may run. The
 * run then goes through the real lock → observation → report → export
 * boundaries with labeled synthetic execution.
 *
 * Sends: GET reads local evidence only; POST happens solely on the explicit
 * run action. Mount, reload and Back perform zero provider calls.
 */
export default function LocalReportClient() {
  const [pack, setPack] = useState<LocalQuestionPack | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [runState, setRunState] = useState<
    "idle" | "running" | "done" | "failed"
  >("idle");
  const [result, setResult] = useState<LocalAuditResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [provenance, setProvenance] = useState<PackResponse["provenance"]>();
  const [brief, setBrief] = useState<BusinessBrief | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/audit/local-audit")
      .then(async (res) => {
        const data = (await res.json()) as PackResponse & { error?: string };
        if (!res.ok) {
          throw new Error(data.error || "Paket lokal tidak dapat dimuat.");
        }
        return data;
      })
      .then((data) => {
        const raw = data.pack as LocalQuestionPack;
        const parsed = parseLocalQuestionPack(raw, raw.input);
        if (!parsed || parsed.generation.kind !== "glm-direct-ten-local") {
          throw new Error(
            "Paket lokal yang tersimpan tidak lolos validasi paket.",
          );
        }
        if (cancelled) return;
        // Restore this session's edits through the real update path — the
        // same validation that guards a live edit applies on restore.
        let restored = parsed;
        try {
          const stored = sessionStorage.getItem(STORAGE_KEY);
          if (stored) {
            const edits = JSON.parse(stored) as Record<string, string>;
            for (const prompt of parsed.promptPack.prompts) {
              const wording = edits[prompt.prompt_id];
              if (wording && wording !== prompt.question) {
                const updated = updateLocalQuestion(
                  restored,
                  prompt.prompt_id,
                  wording,
                );
                if (updated.ok) restored = updated.pack;
              }
            }
          }
        } catch {
          // A malformed stored edit is dropped, never trusted.
        }
        setProvenance(data.provenance);
        setBrief(data.brief);
        setPack(restored);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Paket lokal tidak dapat dimuat.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePackChange = (next: LocalQuestionPack) => {
    setPack(next);
    const edits: Record<string, string> = {};
    next.promptPack.prompts.forEach((prompt, index) => {
      if (prompt.question !== next.originals[index]) {
        edits[prompt.prompt_id] = prompt.question;
      }
    });
    try {
      if (Object.keys(edits).length) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Persistence is best-effort; the in-memory pack still governs.
    }
  };

  const resetEdits = () => {
    setPack((current) => {
      if (!current) return current;
      let restored = current;
      current.promptPack.prompts.forEach((prompt, index) => {
        const original = current.originals[index];
        if (original && prompt.question !== original) {
          const updated = updateLocalQuestion(
            restored,
            prompt.prompt_id,
            original,
          );
          if (updated.ok) restored = updated.pack;
        }
      });
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage failures on reset.
      }
      return restored;
    });
  };

  const editsPresent = Boolean(
    pack &&
    pack.promptPack.prompts.some(
      (prompt, index) => prompt.question !== pack.originals[index],
    ),
  );
  // The founder's recorded approval covers exactly the accepted texts. Any
  // edited wording is honestly unapproved — the run stays locked until the
  // original wording is restored, and the server re-checks verbatim anyway.
  const approved = Boolean(pack && !editsPresent && !editing);

  const run = async () => {
    if (runState === "running" || !pack || !brief || !approved) return;
    setRunState("running");
    setRunError(null);
    try {
      const wirePrompts = pack.promptPack.prompts.map((prompt) => ({
        prompt_id: prompt.prompt_id,
        question: prompt.question,
        review_status: "needs_human_review" as const,
      }));
      // The same real boundaries the live audit uses: POST /api/audit/run
      // locks + executes the approved questions independently, POST
      // /api/audit/report synthesizes the validated report. In local mode the
      // server substitutes the labeled synthetic providers; a live run is the
      // identical flow after explicit authorization.
      const runRes = await fetch("/api/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_contract_version: AUDIT_CLIENT_CONTRACT_VERSION,
          question_method: "direct-ten",
          brief,
          prompts: wirePrompts,
          safety_identifier: "local-direct-ten-fixture",
          budget: {
            limit_usd: AUDIT_COST_LIMIT_USD,
            carryover_cost_usd: 0,
            calls: [],
          },
          resume_observations: [],
        }),
      });
      if (!runRes.ok) {
        const data = (await runRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          data.error || "Demo audit lokal tidak dapat dijalankan.",
        );
      }
      if (!runRes.body) throw new Error("Aliran audit tidak tersedia.");
      const reader = runRes.body.getReader();
      const decoder = new TextDecoder();
      const parser = new AuditRunEventParser();
      let observations: AuditObservation[] | null = null;
      let streamError: string | null = null;
      while (true) {
        const { value, done } = await reader.read();
        for (const event of parser.push(
          decoder.decode(value, { stream: !done }),
        )) {
          if (event.type === "run_completed") {
            observations = event.observations;
          } else if (event.type === "run_unfinished") {
            streamError = event.message;
          } else if (event.type === "fatal_error") {
            streamError = event.message;
          }
        }
        if (done) break;
      }
      for (const event of parser.finish()) {
        if (event.type === "run_completed") observations = event.observations;
        if (event.type === "run_unfinished") streamError = event.message;
        if (event.type === "fatal_error") streamError = event.message;
      }
      if (streamError) throw new Error(streamError);
      if (!observations) {
        throw new Error("Aliran audit selesai tanpa hasil yang dapat dibaca.");
      }

      const runCalls = observations.flatMap(
        (observation) => observation.telemetry ?? [],
      );
      const reportRes = await fetch("/api/audit/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_contract_version: AUDIT_CLIENT_CONTRACT_VERSION,
          question_method: "direct-ten",
          brief,
          prompts: wirePrompts,
          observations,
          safety_identifier: "local-direct-ten-fixture",
          budget: {
            limit_usd: AUDIT_COST_LIMIT_USD,
            carryover_cost_usd: 0,
            calls: runCalls,
          },
        }),
      });
      const reportData = (await reportRes.json().catch(() => ({}))) as {
        report?: AuditReport;
        telemetry?: AuditCallTelemetry[];
        error?: string;
      };
      if (!reportRes.ok || !reportData.report) {
        throw new Error(
          reportData.error || "Laporan audit lokal tidak dapat dibuat.",
        );
      }
      const allCalls = [...runCalls, ...(reportData.telemetry ?? [])];
      const providerCalls = allCalls.filter(
        (call) => call.requested_model !== SYNTHETIC_LOCAL_FIXTURE_SYSTEM,
      ).length;
      setResult({
        report: reportData.report,
        prompts: canonicalLockedDirectTenPack(wirePrompts, brief).prompts,
        observations,
        brief,
        provenance: {
          synthetic: !(provenance?.live_authorized ?? false),
          live_authorized: provenance?.live_authorized ?? false,
          pack_method: provenance?.pack_method ?? "nuave-glm-direct-ten-v1",
          pack_response_id: provenance?.pack_response_id ?? null,
          question_method: "direct-ten",
          provider_calls: providerCalls,
        },
      });
      setRunState("done");
    } catch (error) {
      setRunError(
        error instanceof Error
          ? error.message
          : "Demo audit lokal tidak dapat dijalankan.",
      );
      setRunState("failed");
    }
  };

  const downloadJson = () => {
    if (!result) return;
    const { brief, prompts, observations, report } = result;
    const evidence = makeCustomerEvidenceExport(
      brief,
      prompts,
      observations,
      report,
      {
        pack_method: result.provenance.pack_method,
        pack_response_id: result.provenance.pack_response_id,
        question_method: result.provenance.question_method,
        synthetic: result.provenance.synthetic,
        live_authorized: result.provenance.live_authorized,
        provider_calls: result.provenance.provider_calls,
      },
    );
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(evidence, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "nuave-local-audit-evidence.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main lang="id">
      <section className="mx-auto grid max-w-3xl gap-4 px-6 py-10 print:hidden">
        <h1 className="type-heading-lg">
          Demo audit lokal — paket audit tersimpan
        </h1>
        <p className="type-copy">
          Paket sepuluh pertanyaan yang disetujui pendiri pada 18 September 2026
          dimuat dari penyimpanan bukti lokal. Menjalankannya memanggil batas
          nyata /api/audit/run dan /api/audit/report — dengan penyedia sintetis
          berlabel sampai izin live diberikan secara eksplisit. Memuat ulang
          atau kembali tidak mengirim apa pun; mode sintetis membuktikan
          alurnya, bukan visibilitas.
        </p>
        {loadError && (
          <p role="alert" className="type-copy text-destructive">
            {loadError}
          </p>
        )}
        {!pack && !loadError && (
          <p className="type-copy text-muted-foreground">Memuat paket…</p>
        )}
      </section>
      {pack && (
        <section className="mx-auto grid max-w-3xl gap-4 px-6 pb-10 print:hidden">
          <AuditNotice
            tone="info"
            title="Paket diterima — respons nyata tersimpan"
          >
            Paket {provenance?.pack_method ?? "nuave-glm-direct-ten-v1"}
            {provenance?.pack_response_id
              ? ` · respons ${provenance.pack_response_id}`
              : ""}
            . Pertanyaan adalah keluaran GLM nyata yang disimpan, bukan
            sintetis; jawaban dan laporan di bawah tetap sintetis berlabel.
          </AuditNotice>
          <LocalQuestionsScreen
            pack={pack}
            onPackChange={handlePackChange}
            onEditingChange={setEditing}
          />
          <div className="grid gap-3 border-t border-border pt-4">
            {editsPresent ? (
              <p className="type-copy-sm text-destructive" role="alert">
                Kata-kata yang diubah bukan lagi paket yang disetujui pendiri —
                jalankan hanya dapat menggunakan teks yang diterima. Pulihkan
                teks asli atau simpan kembali kata-kata semula.
              </p>
            ) : (
              <p className="type-copy-sm text-muted-foreground">
                Sepuluh teks tidak berubah — persetujuan pendiri yang tercatat
                tetap berlaku.
              </p>
            )}
            {runError && (
              <p role="alert" className="type-copy text-destructive">
                {runError}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={!approved || runState === "running"}
                onClick={run}
                data-local-audit-run="start"
              >
                {runState === "running"
                  ? "Menjalankan demo…"
                  : runState === "done"
                    ? "Jalankan ulang demo"
                    : "Jalankan demo audit lokal"}
              </Button>
              {editsPresent && (
                <Button
                  variant="ghost"
                  onClick={resetEdits}
                  data-local-audit-reset="edits"
                >
                  Pulihkan teks yang disetujui
                </Button>
              )}
            </div>
            {runState === "done" && result && (
              <p className="type-copy-sm text-muted-foreground">
                {result.provenance.synthetic
                  ? "Batas nyata /run + /report · penyedia sintetis berlabel · panggilan provider nyata: "
                  : "Batas nyata /run + /report · panggilan provider nyata: "}
                {result.provenance.provider_calls}
              </p>
            )}
          </div>
        </section>
      )}
      {runState === "done" && result && (
        <ReportView
          report={result.report}
          brief={result.brief}
          observations={result.observations}
          onDownloadJson={downloadJson}
          previewNotice={
            result.provenance.synthetic ? (
              <AuditNotice tone="info" title="Demo lokal — jawaban sintetis">
                Laporan ini dihasilkan dari jawaban sintetis berlabel melalui
                jalur /api/audit/run + /api/audit/report yang sama. Ini
                membuktikan alurnya — bukan bukti visibilitas bisnis yang
                diaudit.
              </AuditNotice>
            ) : (
              <AuditNotice tone="info" title="Audit lokal — panggilan nyata">
                Laporan ini dihasilkan dari panggilan provider nyata melalui
                jalur audit yang sama, atas izin eksplisit pendiri.
              </AuditNotice>
            )
          }
        />
      )}
    </main>
  );
}
