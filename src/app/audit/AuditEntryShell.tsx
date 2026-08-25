"use client";

import { useEffect, useState } from "react";
import AuditWorkflow from "./AuditWorkflow";

const LANDING_ENTRY_CLASS = "audit-landing-extracted-entry";

export default function AuditEntryShell({
  landingExtracted,
}: {
  landingExtracted: boolean;
}) {
  const [suppressSourceHero, setSuppressSourceHero] =
    useState(landingExtracted);

  useEffect(() => {
    if (!landingExtracted) return;
    if (window.location.pathname === "/audit") {
      window.history.replaceState(window.history.state, "", "/audit");
    }

    // AuditWorkflow restores session state after mount. Keep the empty source
    // hero hidden only for that initial restore window; once the extracted
    // brief (stage 2) exists, release the guard so an intentional later
    // "Change website" action can show SourceHero normally.
    const releaseWhenBriefRestored = () => {
      if (!document.getElementById("stage-2")) return false;
      setSuppressSourceHero(false);
      return true;
    };

    if (releaseWhenBriefRestored()) return;

    const observer = new MutationObserver(() => {
      if (releaseWhenBriefRestored()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [landingExtracted]);

  if (!landingExtracted) return <AuditWorkflow />;

  return (
    <div
      className={suppressSourceHero ? LANDING_ENTRY_CLASS : undefined}
      style={{ display: "contents" }}
    >
      {suppressSourceHero ? (
        <style>
          {`.${LANDING_ENTRY_CLASS} .audit-source-hero { visibility: hidden; }`}
        </style>
      ) : null}
      <AuditWorkflow />
    </div>
  );
}
