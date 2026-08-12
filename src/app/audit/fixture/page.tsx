import type { Metadata } from "next";
import Link from "next/link";
import { isFixturePreviewEnabled } from "@/lib/fixture-journey/config";
import FixtureJourney from "./FixtureJourney";
import styles from "./fixture.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fictional preview | Nuave",
  description:
    "Protected fictional preview of the Nuave audit journey using the Northstar Advisory example. No real audit, no payment.",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Server-controlled test configuration that forces the fixture report
 * construction to fail so the recovery path can be exercised locally. Never
 * exposed to the client bundle (`no NEXT_PUBLIC_` prefix) and never
 * customer-selectable; construction failure never falls back to a live API.
 */
function fixtureReportFailureForced(): boolean {
  const raw = process.env.NUAVE_FIXTURE_FORCE_REPORT_FAILURE;
  return raw === "true" || raw === "1";
}

function PreviewUnavailable() {
  return (
    <main className={styles.shell} lang="en">
      <section className={styles.unavailable}>
        <p className={styles.eyebrow}>Fictional product preview</p>
        <h1>The example preview is not available right now.</h1>
        <p>
          The fixture preview is switched off on this server. Return to the
          landing page to see the normal Nuave experience.
        </p>
        <Link href="/" className={styles.primaryAction}>
          Back to the Nuave landing page
        </Link>
      </section>
    </main>
  );
}

export default function FixturePreviewPage() {
  if (!isFixturePreviewEnabled()) {
    return <PreviewUnavailable />;
  }
  return <FixtureJourney forceReportFailure={fixtureReportFailureForced()} />;
}
