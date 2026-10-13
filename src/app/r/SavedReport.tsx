"use client";

import { useEffect, useState } from "react";
import { AuditNotice } from "@/components/product/AuditNotice";
import { Button } from "@/components/ui/button";
import ReportView from "@/app/audit/ReportView";
import {
  makeSmartCustomerEvidenceExport,
  promptsWithOriginals,
} from "@/lib/audit/customer-evidence-export";
import type { DirectTenAuditContext } from "@/lib/audit/direct-ten-context-v2";
import type {
  AuditObservation,
  AuditPrompt,
  AuditReport,
} from "@/lib/audit/types";

/** What the report-data route returns for a valid link (spec 016 R-26). */
type SavedReportData = {
  report: AuditReport;
  context: DirectTenAuditContext;
  prompts: AuditPrompt[];
  originals: string[];
  observations: AuditObservation[];
  synthetic: boolean;
};

type View =
  | { kind: "loading" }
  | { kind: "ready"; data: SavedReportData }
  | { kind: "unavailable" }
  | { kind: "later" };

/**
 * Spec 016 R-24/R-26: the private report page. It reads the secret from the
 * URL fragment, POSTs it in a body to the report-data route, and shows the same
 * report, PDF (browser print) and JSON buttons as before. Nothing is kept in
 * the browser.
 */
export default function SavedReport() {
  const [view, setView] = useState<View>({ kind: "loading" });

  // Bumped by the retry button to read the page's fragment again.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function open() {
      // A missing or odd fragment is sent as it is: the server answers with the
      // same "not available" it gives for any wrong secret.
      const secret = window.location.hash.replace(/^#/, "");
      try {
        const response = await fetch("/api/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret }),
          cache: "no-store",
          referrerPolicy: "no-referrer",
          signal: controller.signal,
        });
        if (response.status === 404) {
          setView({ kind: "unavailable" });
          return;
        }
        if (!response.ok) {
          setView({ kind: "later" });
          return;
        }
        const data = (await response.json()) as SavedReportData;
        if (
          !data?.report ||
          !data.context ||
          !Array.isArray(data.observations)
        ) {
          setView({ kind: "later" });
          return;
        }
        setView({ kind: "ready", data });
      } catch {
        if (!controller.signal.aborted) setView({ kind: "later" });
      }
    }
    void open();
    return () => controller.abort();
  }, [attempt]);

  if (view.kind === "ready") {
    const { data } = view;
    const downloadJson = () => {
      const originalByPromptId = new Map(
        data.prompts.map((prompt, index) => [
          prompt.prompt_id,
          data.originals[index] ?? prompt.question,
        ]),
      );
      const evidence = makeSmartCustomerEvidenceExport(
        data.context,
        promptsWithOriginals(data.prompts, originalByPromptId),
        data.observations,
        data.report,
        {
          report_context_version: data.context.version,
          question_method: "direct-ten",
          synthetic: data.synthetic,
        },
      );
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(evidence, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "nuave-audit-evidence.json";
      link.click();
      URL.revokeObjectURL(url);
    };
    return (
      <main lang="id" data-saved-report="ready">
        <ReportView
          report={data.report}
          brief={data.context}
          observations={data.observations}
          onDownloadJson={downloadJson}
          previewNotice={
            data.synthetic ? (
              <AuditNotice tone="info" title="Audit uji — jawaban sintetis">
                Laporan ini dihasilkan dari jawaban sintetis berlabel untuk
                menguji alurnya. Ini bukan bukti visibilitas{" "}
                {data.context.identity.name}.
              </AuditNotice>
            ) : null
          }
        />
      </main>
    );
  }

  if (view.kind === "loading") {
    return (
      <main
        lang="id"
        className="mx-auto max-w-3xl px-5 py-14"
        data-saved-report="loading"
      >
        <p role="status" className="type-copy">
          Membuka laporan…
        </p>
      </main>
    );
  }

  if (view.kind === "later") {
    return (
      <main
        lang="id"
        className="mx-auto grid max-w-3xl gap-4 px-5 py-14"
        data-saved-report="later"
      >
        <h1 className="type-heading-lg">Laporan belum bisa dibuka sekarang.</h1>
        <p className="type-copy">Coba lagi dalam beberapa saat.</p>
        <Button
          className="w-fit"
          onClick={() => {
            setView({ kind: "loading" });
            setAttempt((value) => value + 1);
          }}
        >
          Coba lagi
        </Button>
      </main>
    );
  }

  // The not-available page: no business name, no reason (R-27).
  return (
    <main
      lang="id"
      className="mx-auto max-w-3xl px-5 py-14"
      data-saved-report="unavailable"
    >
      <h1 className="type-heading-lg">Laporan ini tidak tersedia.</h1>
    </main>
  );
}
