"use client";

import { useState, useSyncExternalStore } from "react";
import AuditPrePaymentJourney from "@/components/AuditPrePaymentJourney";
import { AUDIT_SOURCE_HANDOFF_STORAGE_KEY } from "@/lib/audit/source-handoff";
import AuditWorkflow from "../AuditWorkflow";

function hasLandingPaymentHandoff() {
  if (typeof window === "undefined") return false;
  const entry = new URLSearchParams(window.location.search).get("entry");
  return (
    entry === "landing-paid" &&
    Boolean(window.sessionStorage.getItem(AUDIT_SOURCE_HANDOFF_STORAGE_KEY))
  );
}

function subscribeToEntry() {
  return () => {};
}

function readClientEntry() {
  return hasLandingPaymentHandoff() ? "post-payment" : "pre-payment";
}

function readServerEntry() {
  return "checking";
}

export default function AuditV2Journey() {
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const entry = useSyncExternalStore(
    subscribeToEntry,
    readClientEntry,
    readServerEntry,
  );

  if (entry === "checking" && !paymentCompleted) {
    return (
      <main lang="id" data-theme="light">
        <p role="status" aria-live="polite">
          Menyiapkan alur audit…
        </p>
      </main>
    );
  }

  if (entry === "post-payment" || paymentCompleted) return <AuditWorkflow />;

  return (
    <main lang="id" data-theme="light">
      <AuditPrePaymentJourney
        onPaymentComplete={() => setPaymentCompleted(true)}
      />
    </main>
  );
}
