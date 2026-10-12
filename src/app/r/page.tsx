import type { Metadata } from "next";
import SavedReport from "./SavedReport";

// Spec 016 R-26: the private report page. Search engines skip it, and the
// browser sends no Referer from it. The secret is in the URL fragment, which
// the server never sees, so this page is the same for every visitor; the
// report arrives only through the rate-limited data route.
export const metadata: Metadata = {
  title: "Laporan Nuave",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

// Never prerendered or cached as a static page.
export const dynamic = "force-dynamic";

export default function ReportPage() {
  return <SavedReport />;
}
