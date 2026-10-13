"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SourceHero from "@/app/audit/SourceHero";
import { AUDIT_SOURCE_HANDOFF_STORAGE_KEY } from "@/lib/audit/source-handoff";
import { INTAKE_TEXT_RESTRICTED_MESSAGE } from "@/lib/audit/types";
import { unsafeSmartSource } from "@/lib/intake/smart-intake-contract";
import LandingTileReveal from "./LandingTileReveal";
import styles from "./LandingAuditHero.module.css";

const LANDING_TILE_EXPERIMENT_ENABLED = true;

/** Spec 010 R-08: the hero keeps its source-step visual but no longer embeds
 * the old identity/checkout journey. A valid source is handed to /audit in
 * session storage; the journey looks it up at once and opens on the brand
 * check — the owner never types the website twice. */
export default function LandingAuditHero() {
  const router = useRouter();
  const [error, setError] = useState("");

  return (
    <section
      className={`${styles.root} landing-audit-hero`}
      aria-label="Mulai audit visibilitas AI"
      lang="id"
    >
      <SourceHero
        initialValue=""
        extracting={false}
        error={error}
        onExtract={(source) => {
          // Sensitive text never leaves the page, not even in a request.
          if (unsafeSmartSource(source)) {
            setError(INTAKE_TEXT_RESTRICTED_MESSAGE);
            return;
          }
          setError("");
          // Handed over in this tab only, never in the address: the journey
          // takes it once and looks it up.
          try {
            window.sessionStorage.setItem(
              AUDIT_SOURCE_HANDOFF_STORAGE_KEY,
              source,
            );
          } catch {
            // Browser storage is blocked: /audit opens on the entry instead.
          }
          router.push("/audit");
        }}
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
