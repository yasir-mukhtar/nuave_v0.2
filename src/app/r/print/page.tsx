import type { Metadata } from "next";
import { designedPrintOn } from "@/lib/orders/report-pdf";
import SavedReport from "../SavedReport";

// Spec 021 Part P: the page Browser Run prints. Its fragment is a single-use
// print code the PDF route made (never the link secret); the code is spent
// when the report is read, so the address is useless afterwards.
export const metadata: Metadata = {
  title: "Laporan Nuave",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

// Spec 024 F-10: with the designed print on, two-source reports print the
// designed 16:9 pages; with it off, exactly today's print.
export default function ReportPrintPage() {
  return designedPrintOn() ? (
    <SavedReport via="print" designed />
  ) : (
    <SavedReport via="print" />
  );
}
