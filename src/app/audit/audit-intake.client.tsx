"use client";

import SmartIntakeJourney from "@/lib/intake/SmartIntakeJourney";

/** The public journey always begins from customer-entered identity. */
export default function AuditIntakeClient({
  live = false,
  glmStubBehavior,
}: {
  live?: boolean;
  glmStubBehavior?: string;
}) {
  return <SmartIntakeJourney live={live} glmStubBehavior={glmStubBehavior} />;
}
