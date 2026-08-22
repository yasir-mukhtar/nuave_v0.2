"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SourceHero, {
  AUDIT_SOURCE_HANDOFF_STORAGE_KEY,
} from "@/app/audit/SourceHero";
import { AUDIT_WORKFLOW_STORAGE_KEY } from "@/lib/audit/workflow-storage";
import {
  VARIANCE_FAILURE_STORAGE_KEY,
  VARIANCE_STORAGE_KEY,
} from "@/lib/audit/variance";

export default function LandingAuditHero() {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState("");

  function startAudit(normalizedUrl: string) {
    if (navigating) return;

    setError("");
    setNavigating(true);

    try {
      window.sessionStorage.setItem(
        AUDIT_WORKFLOW_STORAGE_KEY,
        JSON.stringify({ websiteUrl: normalizedUrl }),
      );
      window.sessionStorage.setItem(
        AUDIT_SOURCE_HANDOFF_STORAGE_KEY,
        normalizedUrl,
      );
      window.sessionStorage.removeItem(VARIANCE_STORAGE_KEY);
      window.sessionStorage.removeItem(VARIANCE_FAILURE_STORAGE_KEY);
    } catch {
      setNavigating(false);
      setError(
        "Browser tidak dapat menyiapkan sesi audit. Aktifkan penyimpanan sesi lalu coba lagi.",
      );
      return;
    }

    router.push("/audit");
  }

  return (
    <section aria-label="Mulai audit visibilitas AI">
      <SourceHero
        initialValue=""
        extracting={navigating}
        error={error}
        onExtract={startAudit}
        exiting={false}
        showLogo={false}
        autoFocus={false}
        consumeHandoff={false}
      />
    </section>
  );
}
