import type { Metadata } from "next";
import Link from "next/link";
import { isFixturePreviewEnabled } from "@/lib/fixture-journey/config";
import FixtureJourney from "./FixtureJourney";
import styles from "./fixture.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pratinjau fiktif | Nuave",
  description:
    "Pratinjau fiktif yang dilindungi dari perjalanan audit Nuave menggunakan contoh bisnis Kopi Taman Senja. Bukan audit nyata dan tidak ada pembayaran.",
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
    <main className={styles.shell} lang="id">
      <section className={styles.unavailable}>
        <p className={styles.eyebrow}>Pratinjau produk fiktif</p>
        <h1>Pratinjau contoh tidak tersedia saat ini.</h1>
        <p>
          Pratinjau fiktif dimatikan di server ini. Kembali ke halaman utama
          Nuave untuk melihat pengalaman normal.
        </p>
        <Link href="/" className={styles.primaryAction}>
          Kembali ke halaman utama Nuave
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
