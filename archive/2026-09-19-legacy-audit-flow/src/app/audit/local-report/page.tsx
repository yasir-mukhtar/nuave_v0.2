import type { Metadata } from "next";
import LocalReportClient from "./local-report.client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Demo audit lokal | Nuave",
  robots: { index: false, follow: false },
};

/**
 * Founder-only local direct-ten audit demo (Spec 009 Block B). Same gate as
 * the GLM experiment: hidden unless NUAVE_GLM_LOCAL_EXPERIMENT is set on a
 * non-production server. The run itself stays server-side in
 * /api/audit/local-audit, which 404s under the same condition — this page can
 * never expose the path in production.
 */
export default function LocalReportPage() {
  const enabled =
    process.env.NODE_ENV !== "production" &&
    ["true", "1"].includes(process.env.NUAVE_GLM_LOCAL_EXPERIMENT ?? "");
  if (!enabled) {
    return (
      <main lang="id">
        <h1 className="type-heading-lg">
          Demo audit lokal tidak tersedia saat ini.
        </h1>
      </main>
    );
  }
  return <LocalReportClient />;
}
