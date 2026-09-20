"use client";

import IntakeJourney from "@/lib/intake/IntakeJourney";
import LocalAuditStage from "./LocalAuditStage";
import type { IntakeFixture } from "@/lib/intake/fixtures";

/** The public audit journey boundary (Spec 010 R-08). The page picks the
 * start: `blank` opens on empty business fields for real entries — the live
 * deployment always starts this way; a fixture seed exists only for the
 * synthetic-mode test harness. */
export default function AuditIntakeClient({
  fixture,
  blank = false,
  live = false,
  failQuestionsOnce = false,
  glmExperiment = false,
  glmStubBehavior,
}: {
  fixture?: IntakeFixture;
  blank?: boolean;
  live?: boolean;
  failQuestionsOnce?: boolean;
  glmExperiment?: boolean;
  glmStubBehavior?: string;
}) {
  return (
    <IntakeJourney
      fixtureOverride={fixture}
      blank={blank}
      live={live}
      failQuestionsOnce={failQuestionsOnce}
      glmExperiment={glmExperiment}
      glmStubBehavior={glmStubBehavior}
      AuditStage={LocalAuditStage}
    />
  );
}
