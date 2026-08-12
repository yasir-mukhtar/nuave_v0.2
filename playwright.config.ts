import { defineConfig } from "@playwright/test";
import { journeyWebServer } from "./tests/e2e/shared-config";

/**
 * Main browser suite: the protected fixture preview is ENABLED, so the
 * landing page shows the fictional-preview entry and the complete fixture
 * journey is reachable.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /fixture-journey\.spec\.ts/,
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
