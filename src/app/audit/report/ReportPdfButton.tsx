"use client";

import { useCallback, useRef, useState } from "react";
import { IconDownload, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DownloadPdf } from "./report-pdf";
import styles from "./report-v2.module.css";

/** Which of the two "Unduh PDF" buttons was pressed. */
export type PdfPlace = "top" | "end";

/**
 * Spec 021 Part P: the state both "Unduh PDF" buttons share. Without a
 * server PDF (`download` missing, or the server says to print) the button
 * prints, as before.
 */
export function useReportPdf(download?: DownloadPdf) {
  const [busy, setBusy] = useState(false);
  const [failedAt, setFailedAt] = useState<PdfPlace | null>(null);
  // A second press while one is being made does nothing.
  const running = useRef(false);
  const run = useCallback(
    async (place: PdfPlace) => {
      if (!download) {
        window.print();
        return;
      }
      if (running.current) return;
      running.current = true;
      setBusy(true);
      setFailedAt(null);
      const outcome = await download().catch(() => "failed" as const);
      running.current = false;
      setBusy(false);
      if (outcome === "print") window.print();
      else if (outcome === "failed") setFailedAt(place);
    },
    [download],
  );
  return { busy, failedAt, run };
}

export type ReportPdf = ReturnType<typeof useReportPdf>;

export function PdfButton({ pdf, place }: { pdf: ReportPdf; place: PdfPlace }) {
  return (
    <Button
      type="button"
      variant="ink"
      size="sm"
      className="rounded-chip px-4"
      aria-busy={pdf.busy || undefined}
      onClick={() => void pdf.run(place)}
      data-pdf-button={place}
    >
      {pdf.busy ? (
        <IconLoader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <IconDownload aria-hidden="true" />
      )}
      Unduh PDF
    </Button>
  );
}

/** "PDF belum bisa dibuat. Coba lagi." next to the button that was pressed;
 * the report itself is unaffected (Spec 021 "PDF"). */
export function PdfFailed({
  pdf,
  place,
  className,
}: {
  pdf: ReportPdf;
  place: PdfPlace;
  className?: string;
}) {
  if (pdf.failedAt !== place) return null;
  return (
    <p className={cn(styles.pdfFailed, className)} role="alert" data-pdf-failed>
      PDF belum bisa dibuat.{" "}
      <button type="button" onClick={() => void pdf.run(place)}>
        Coba lagi
      </button>
    </p>
  );
}
