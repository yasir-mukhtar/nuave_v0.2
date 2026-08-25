"use client";

import { useEffect } from "react";
import AuditWorkflow from "./AuditWorkflow";

const LANDING_ENTRY_CLASS = "audit-landing-extracted-entry";

export default function AuditEntryShell({
  landingExtracted,
}: {
  landingExtracted: boolean;
}) {
  useEffect(() => {
    if (!landingExtracted) return;
    if (window.location.pathname !== "/audit") return;

    // The query marker exists only long enough for the server-rendered audit
    // entry shell to suppress the empty source step. Keep the public URL clean
    // once the client has mounted; the shell keeps its transition class until
    // AuditWorkflow restores the extracted brief and unmounts SourceHero.
    window.history.replaceState(window.history.state, "", "/audit");
  }, [landingExtracted]);

  if (!landingExtracted) return <AuditWorkflow />;

  return (
    <div className={LANDING_ENTRY_CLASS} style={{ display: "contents" }}>
      <style>{`.${LANDING_ENTRY_CLASS} .audit-source-hero { visibility: hidden; }`}</style>
      <AuditWorkflow />
    </div>
  );
}
