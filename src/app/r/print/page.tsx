import type { Metadata } from "next";
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

export default function ReportPrintPage() {
  return <SavedReport via="print" />;
}
