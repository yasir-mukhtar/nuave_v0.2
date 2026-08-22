"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SourceHero from "@/app/audit/SourceHero";
import { AUDIT_SOURCE_HANDOFF_STORAGE_KEY } from "@/lib/audit/source-handoff";
import { AUDIT_WORKFLOW_STORAGE_KEY } from "@/lib/audit/workflow-storage";
import {
  VARIANCE_FAILURE_STORAGE_KEY,
  VARIANCE_STORAGE_KEY,
} from "@/lib/audit/variance";
import styles from "./LandingAuditHero.module.css";

export default function LandingAuditHero() {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState("");

  function startAudit(normalizedUrl: string) {
    if (navigating) return;

    setError("");
    setNavigating(true);

    try {
      // The landing only owns the one-shot source handoff. Clear any previous
      // resumable audit so /audit cannot restore an older step and bypass the
      // incoming source. Do not write a partial SavedState object here: that
      // contract is versioned and owned exclusively by AuditWorkflow.
      window.sessionStorage.setItem(
        AUDIT_SOURCE_HANDOFF_STORAGE_KEY,
        normalizedUrl,
      );
      window.sessionStorage.removeItem(AUDIT_WORKFLOW_STORAGE_KEY);
      window.sessionStorage.removeItem(VARIANCE_STORAGE_KEY);
      window.sessionStorage.removeItem(VARIANCE_FAILURE_STORAGE_KEY);
    } catch {
      try {
        window.sessionStorage.removeItem(AUDIT_SOURCE_HANDOFF_STORAGE_KEY);
      } catch {
        // Nothing else to recover when session storage itself is unavailable.
      }
      setNavigating(false);
      setError(
        "Browser tidak dapat menyiapkan sesi audit. Aktifkan penyimpanan sesi lalu coba lagi.",
      );
      return;
    }

    router.push("/audit");
  }

  return (
    <section
      className={`${styles.root} landing-audit-hero`}
      aria-label="Mulai audit visibilitas AI"
    >
      <SourceHero
        initialValue=""
        extracting={navigating}
        error={error}
        onExtract={startAudit}
        exiting={false}
        showLogo={false}
        autoFocus={false}
        consumeHandoff={false}
        contentClassName="mt-20 md:mt-0"
      />
    </section>
  );
}
