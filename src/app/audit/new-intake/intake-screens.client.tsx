"use client";

import IntakeJourney from "@/lib/intake/IntakeJourney";
import type { IntakeFixture } from "@/lib/intake/fixtures";

/** A whole local journey boundary; no payment, authentication, or provider calls. */
export default function IntakePreviewClient({
  fixture,
  failQuestionsOnce = false,
}: {
  fixture: IntakeFixture;
  failQuestionsOnce?: boolean;
}) {
  return (
    <IntakeJourney
      fixtureOverride={fixture}
      failQuestionsOnce={failQuestionsOnce}
    />
  );
}
