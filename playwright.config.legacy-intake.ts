import { defineConfig } from "@playwright/test";
import { journeyWebServer } from "./tests/e2e/shared-config";

/**
 * Legacy-intake browser suite (Airbnb rebuild quarantine).
 *
 * These specs pin the legacy intake presentation on the complete legacy
 * route (`/audit`, `/audit/v2`): `B1BriefStep` headings/labels/widgets and
 * the post-payment intake journey through them. They are intentionally kept
 * running unchanged so the Phase 1 exit gate ("legacy journey green") stays
 * verifiable while the new intake is built alongside.
 *
 * Quarantined specs (moved here verbatim, not rewritten):
 * - b1-workflow-authority.spec.ts (10 tests, /audit)
 * - e1-postpayment-journey.spec.ts (5 tests, /audit/v2)
 *
 * Engine (live-audit-variance, wave1-workflow-lifecycle) and
 * payment/security-boundary (landing-audit-handoff, e1-runnable-journey)
 * assertions stay in the main suite. Fixture/preview/offline specs keep
 * their own configs. All `/api/audit/*` responses in these specs are
 * stubbed in-test, so nothing here reaches a paid provider.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /(b1-workflow-authority|e1-postpayment-journey)\.spec\.ts/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3300",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: journeyWebServer(3300, { NUAVE_FIXTURE_PREVIEW_ENABLED: "true" }),
});
