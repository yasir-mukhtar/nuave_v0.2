"use client";

import IntakeJourney from "@/lib/intake/IntakeJourney";
import LocalAuditStage from "../LocalAuditStage";
import type { IntakeFixture } from "@/lib/intake/fixtures";

/** A whole local journey boundary; no payment, authentication, or provider calls. */
export default function IntakePreviewClient({
  fixture,
  failQuestionsOnce = false,
  glmExperiment = false,
  glmStubBehavior,
}: {
  fixture: IntakeFixture;
  failQuestionsOnce?: boolean;
  glmExperiment?: boolean;
  glmStubBehavior?: string;
}) {
  return (
    <IntakeJourney
      fixtureOverride={fixture}
      failQuestionsOnce={failQuestionsOnce}
      glmExperiment={glmExperiment}
      glmStubBehavior={glmStubBehavior}
      AuditStage={LocalAuditStage}
    />
  );
}
