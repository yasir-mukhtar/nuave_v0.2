"use client";

import type { ReactNode } from "react";
import { IconDownload } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReportToolbarProps = {
  onDownloadPdf: () => void;
  onDownloadJson: () => void;
  pdfLabel?: ReactNode;
  jsonLabel?: ReactNode;
  className?: string;
};

/** Shared report actions used by live and deterministic fixture reports. */
export function ReportToolbar({
  onDownloadPdf,
  onDownloadJson,
  pdfLabel = "Cetak / simpan PDF",
  jsonLabel = "Unduh bukti JSON",
  className,
}: ReportToolbarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button type="button" variant="default" size="sm" onClick={onDownloadPdf}>
        <IconDownload aria-hidden="true" />
        {pdfLabel}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onDownloadJson}>
        <IconDownload aria-hidden="true" />
        {jsonLabel}
      </Button>
    </div>
  );
}

export function ReportSectionHeading({
  number,
  children,
  className,
}: {
  number: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline gap-3", className)}>
      <span aria-hidden="true">{number}</span>
      <h2>{children}</h2>
    </div>
  );
}
