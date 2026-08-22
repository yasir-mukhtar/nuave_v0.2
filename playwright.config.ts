import { defineConfig } from "@playwright/test";
import { journeyWebServer } from "./tests/e2e/shared-config";

/**
 * Main browser suite: the protected fixture preview is ENABLED, the complete
 * fixture journey remains reachable, and the live landing→audit handoff plus
 * variance regressions use fully stubbed `/api/audit/*` responses so no test
 * reaches a paid provider.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch:
    /(fixture-journey|landing-audit-handoff|live-audit-variance)\.spec\.ts/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: journeyWebServer(3000, { NUAVE_FIXTURE_PREVIEW_ENABLED: "true" }),
});
