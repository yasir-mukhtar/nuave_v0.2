"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import {
  AUDIT_SESSION_STORAGE_KEY,
  AUDIT_WORKFLOW_STORAGE_KEY,
  createInitialExtractedAuditWorkflowState,
} from "@/lib/audit/workflow-storage";

const DEMO_SOURCE = "https://example.com/";

/**
 * One fictional confirmed intake draft for manual review of this preview-only
 * page. Same shape the e2e specs seed; no real business data.
 */
function demoWorkflowState() {
  const base = createInitialExtractedAuditWorkflowState({
    websiteUrl: DEMO_SOURCE,
    draft: {
      brand_name: "Example Business",
      entity_scope: "Seluruh brand Example Business",
      brand_type: "Family coffee shop",
      category: "Coffee shop",
      market_context: "Indonesia",
      target_customer: "Remote workers",
      official_sources: [DEMO_SOURCE],
      verified_offerings: ["Coffee", "Pastries"],
      verified_customer_needs: ["A place to work"],
      verified_decision_criteria: ["Location"],
      similar_businesses: [
        { name: "Peer Coffee", source_url: "", origin: "ai" as const },
      ],
      brand_name_variants: [],
      priority_offering: "Coffee",
      conversion_action: "ignored",
      customer_supplied_facts: [],
      known_accuracy_questions: [],
      usp: "",
      regulated_category_notes: "",
      evidence: [],
      warnings: [],
    },
    telemetry: [],
  });
  return {
    ...base,
    brief: {
      ...base.brief,
      verified_competitor: { name: "Peer Coffee", scope: "", source_url: "" },
    },
    meta: { ...base.meta, comparisonStatus: "confirmed" as const },
  };
}

function subscribeNoop() {
  return () => {};
}

/**
 * Client snapshot: seed the workflow session before the child mounts, so
 * `/audit/v2/intake-preview?demo=1` lands inside the intake screens without
 * calling the identity/extraction APIs. Seeds only when the key is absent —
 * the same guard the e2e helpers use — so a reload keeps whatever the app
 * itself persisted and the flow is refresh-durable. "Mulai ulang" in the UI
 * resets it.
 */
function readClientReady() {
  if (typeof window === "undefined") return false;
  if (!window.sessionStorage.getItem(AUDIT_WORKFLOW_STORAGE_KEY)) {
    window.sessionStorage.setItem(
      AUDIT_WORKFLOW_STORAGE_KEY,
      JSON.stringify(demoWorkflowState()),
    );
    window.sessionStorage.setItem(
      AUDIT_SESSION_STORAGE_KEY,
      "intake-preview-demo",
    );
  }
  return true;
}

function readServerReady() {
  return false;
}

export default function IntakePreviewDemoSeed({
  children,
}: {
  children: ReactNode;
}) {
  const ready = useSyncExternalStore(
    subscribeNoop,
    readClientReady,
    readServerReady,
  );
  if (!ready) {
    return (
      <main lang="id" data-theme="light">
        <p role="status" aria-live="polite">
          Menyiapkan pratinjau…
        </p>
      </main>
    );
  }
  return children;
}
