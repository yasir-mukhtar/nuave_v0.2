"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SourceHero from "@/app/audit/SourceHero";
import { customerAuditErrorMessage } from "@/lib/audit/customer-error";
import { AUDIT_SOURCE_HANDOFF_STORAGE_KEY } from "@/lib/audit/source-handoff";
import {
  AUDIT_SESSION_STORAGE_KEY,
  AUDIT_WORKFLOW_STORAGE_KEY,
  createInitialExtractedAuditWorkflowState,
} from "@/lib/audit/workflow-storage";
import {
  AUDIT_COST_LIMIT_USD,
  type AuditBudget,
  type AuditCallTelemetry,
  type ExtractionDraft,
} from "@/lib/audit/types";
import {
  VARIANCE_FAILURE_STORAGE_KEY,
  VARIANCE_STORAGE_KEY,
} from "@/lib/audit/variance";
import styles from "./LandingAuditHero.module.css";

type ExtractResponse = {
  draft?: ExtractionDraft;
  telemetry?: AuditCallTelemetry[];
  error?: string;
  code?: string;
};

export default function LandingAuditHero() {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState("");
  const inFlightRef = useRef(false);
  const extractionTelemetryRef = useRef<AuditCallTelemetry[]>([]);

  async function startAudit(normalizedUrl: string) {
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    setError("");
    setNavigating(true);

    let safetyIdentifier = "";
    try {
      // A new landing submission replaces any previous resumable audit before
      // provider work starts. The source-only handoff is also removed so /audit
      // cannot replay the legacy navigate-then-extract path.
      window.sessionStorage.removeItem(AUDIT_SOURCE_HANDOFF_STORAGE_KEY);
      window.sessionStorage.removeItem(AUDIT_WORKFLOW_STORAGE_KEY);
      window.sessionStorage.removeItem(VARIANCE_STORAGE_KEY);
      window.sessionStorage.removeItem(VARIANCE_FAILURE_STORAGE_KEY);

      safetyIdentifier =
        window.sessionStorage.getItem(AUDIT_SESSION_STORAGE_KEY) ||
        crypto.randomUUID();
      window.sessionStorage.setItem(AUDIT_SESSION_STORAGE_KEY, safetyIdentifier);
    } catch {
      inFlightRef.current = false;
      setNavigating(false);
      setError(
        "Browser tidak dapat menyiapkan sesi audit. Aktifkan penyimpanan sesi lalu coba lagi.",
      );
      return;
    }

    let stage: "bootstrap" | "extract" = "bootstrap";
    let failureCode: string | undefined;
    try {
      const budgetResponse = await fetch("/api/audit/extract", {
        method: "GET",
        cache: "no-store",
      });
      const budget = (await budgetResponse.json()) as Partial<AuditBudget> & {
        error?: string;
      };
      if (
        !budgetResponse.ok ||
        budget.limit_usd !== AUDIT_COST_LIMIT_USD ||
        typeof budget.carryover_cost_usd !== "number" ||
        budget.carryover_cost_usd < 0 ||
        budget.carryover_cost_usd > AUDIT_COST_LIMIT_USD
      ) {
        throw new Error("Budget bootstrap failed.");
      }

      stage = "extract";
      const extractResponse = await fetch("/api/audit/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website_url: normalizedUrl,
          brand_name: "",
          market_context: "",
          category: "",
          safety_identifier: safetyIdentifier,
          budget: {
            limit_usd: AUDIT_COST_LIMIT_USD,
            carryover_cost_usd: budget.carryover_cost_usd,
            calls: extractionTelemetryRef.current,
          },
        }),
      });
      const result = (await extractResponse.json()) as ExtractResponse;
      failureCode = result.code;
      const responseTelemetry = result.telemetry ?? [];

      if (!extractResponse.ok || !result.draft) {
        if (responseTelemetry.length) {
          extractionTelemetryRef.current = [
            ...extractionTelemetryRef.current,
            ...responseTelemetry,
          ];
        }
        throw new Error("Extraction failed.");
      }

      const allTelemetry = [
        ...extractionTelemetryRef.current,
        ...responseTelemetry,
      ];
      // Account the completed provider attempt before client-side state
      // construction/storage. If either later step fails, a same-page retry
      // still carries the already-spent extraction call in its budget ledger.
      extractionTelemetryRef.current = allTelemetry;

      const workflowState = createInitialExtractedAuditWorkflowState({
        websiteUrl: normalizedUrl,
        draft: result.draft,
        telemetry: allTelemetry,
      });

      try {
        window.sessionStorage.setItem(
          AUDIT_WORKFLOW_STORAGE_KEY,
          JSON.stringify(workflowState),
        );
      } catch {
        inFlightRef.current = false;
        setNavigating(false);
        setError(
          "Browser tidak dapat menyimpan hasil analisis. Aktifkan penyimpanan sesi lalu coba lagi.",
        );
        return;
      }

      router.push("/audit?entry=landing-extracted");
    } catch {
      inFlightRef.current = false;
      setNavigating(false);
      setError(customerAuditErrorMessage(stage, failureCode));
    }
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
