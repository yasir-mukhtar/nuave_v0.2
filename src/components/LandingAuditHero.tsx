"use client";

import { useRouter } from "next/navigation";
import AuditPrePaymentJourney from "./AuditPrePaymentJourney";
import LandingTileReveal from "./LandingTileReveal";
import styles from "./LandingAuditHero.module.css";

const LANDING_TILE_EXPERIMENT_ENABLED = true;

export default function LandingAuditHero() {
  const router = useRouter();

  return (
    <AuditPrePaymentJourney
      ariaLabel="Mulai audit visibilitas AI"
      rootClassName={`${styles.root} landing-audit-hero`}
      sourceHeading="Cek bisnis Anda di AI"
      sourceSubheading="Masukkan sumber resmi untuk melihat pratinjau identitas bisnis Anda."
      sourceSubmitLabel="Cek bisnis saya di AI"
      sourceShowLogo={false}
      sourceAutoFocus={false}
      sourceConsumeHandoff={false}
      sourceContentClassName="mt-20 md:mt-0"
      sourceBackdropClassName={
        LANDING_TILE_EXPERIMENT_ENABLED
          ? styles.experimentalBackdrop
          : styles.legacyBackdrop
      }
      sourceBackdropOverlay={
        LANDING_TILE_EXPERIMENT_ENABLED ? <LandingTileReveal /> : null
      }
      onPaymentComplete={() => router.push("/audit/v2?entry=landing-paid")}
    />
  );
}
