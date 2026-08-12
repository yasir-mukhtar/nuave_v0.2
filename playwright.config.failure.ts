import { defineConfig } from "@playwright/test";
import { journeyWebServer } from "./tests/e2e/shared-config";

/**
 * Forced-failure browser suite: the fixture preview is enabled AND the
 * server-only `NUAVE_FIXTURE_FORCE_REPORT_FAILURE` test configuration forces
 * local report construction to fail, exercising the truthful terminal
 * failure state, retry feedback, and confirmed start over.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /forced-failure\.spec\.ts/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3200",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: journeyWebServer(3200, {
    NUAVE_FIXTURE_PREVIEW_ENABLED: "true",
    NUAVE_FIXTURE_FORCE_REPORT_FAILURE: "true",
  }),
});
