"use client";

import { useRouter } from "next/navigation";
import SourceHero from "@/app/audit/SourceHero";
import LandingTileReveal from "./LandingTileReveal";
import styles from "./LandingAuditHero.module.css";

const LANDING_TILE_EXPERIMENT_ENABLED = true;

/** Spec 010 R-08: the hero keeps its source-step visual but no longer embeds
 * the old identity/checkout journey. A valid source travels to /audit, which
 * looks it up at once and opens on the brand check — the owner never types
 * the website twice. */
export default function LandingAuditHero() {
  const router = useRouter();

  return (
    <section
      className={`${styles.root} landing-audit-hero`}
      aria-label="Mulai audit visibilitas AI"
      lang="id"
    >
      <SourceHero
        initialValue=""
        extracting={false}
        error=""
        onExtract={(source) =>
          router.push(`/audit?source=${encodeURIComponent(source)}`)
        }
        exiting={false}
        showLogo={false}
        autoFocus={false}
        consumeHandoff={false}
        contentClassName="mt-20 md:mt-0"
        backdropClassName={
          LANDING_TILE_EXPERIMENT_ENABLED
            ? styles.experimentalBackdrop
            : styles.legacyBackdrop
        }
        backdropOverlay={
          LANDING_TILE_EXPERIMENT_ENABLED ? <LandingTileReveal /> : null
        }
        heading="Cek bisnis Anda di AI"
        subheading="Masukkan sumber resmi untuk melihat pratinjau identitas bisnis Anda."
        submitLabel="Cek bisnis saya di AI"
      />
    </section>
  );
}
