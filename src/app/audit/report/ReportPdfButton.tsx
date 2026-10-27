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
  // The button that is making a PDF, or the one whose PDF failed.
  const [busyAt, setBusyAt] = useState<PdfPlace | null>(null);
  const [failedAt, setFailedAt] = useState<PdfPlace | null>(null);
  // A second press while one is being made does nothing.
  const running = useRef(false);
  const buttons = useRef<Partial<Record<PdfPlace, HTMLButtonElement | null>>>(
    {},
  );
  const run = useCallback(
    async (place: PdfPlace) => {
      if (!download) {
        window.print();
        return;
      }
      if (running.current) return;
      running.current = true;
      // "Coba lagi" disappears now: keep focus on the button it retries.
      if (failedAt === place) buttons.current[place]?.focus();
      setBusyAt(place);
      setFailedAt(null);
      const outcome = await download().catch(() => "failed" as const);
      running.current = false;
      setBusyAt(null);
      if (outcome === "print") window.print();
      else if (outcome === "failed") setFailedAt(place);
    },
    [download, failedAt],
  );
  const buttonRef = useCallback(
    (place: PdfPlace) => (element: HTMLButtonElement | null) => {
      buttons.current[place] = element;
    },
    [],
  );
  return { busy: busyAt !== null, busyAt, failedAt, run, buttonRef };
}

export type ReportPdf = ReturnType<typeof useReportPdf>;

export function PdfButton({ pdf, place }: { pdf: ReportPdf; place: PdfPlace }) {
  const making = pdf.busyAt === place;
  return (
    <>
      <Button
        type="button"
        variant="ink"
        size="sm"
        className="rounded-chip px-4"
        ref={pdf.buttonRef(place)}
        aria-busy={making || undefined}
        onClick={() => void pdf.run(place)}
        data-pdf-button={place}
      >
        {making ? (
          <IconLoader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <IconDownload aria-hidden="true" />
        )}
        Unduh PDF
      </Button>
      {/* Said to screen readers while the PDF is being made. */}
      <span className="sr-only" role="status">
        {making ? "PDF sedang dibuat…" : ""}
      </span>
    </>
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
