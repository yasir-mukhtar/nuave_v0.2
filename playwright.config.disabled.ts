import { defineConfig } from "@playwright/test";
import { journeyWebServer } from "./tests/e2e/shared-config";

/**
 * Preview-disabled browser suite: neither fixture flag is set, so the
 * fixture route must render the safe unavailable state even when fixture
 * session state is present, and the landing page must keep its normal
 * actions. No client input can enable the protected preview.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /preview-disabled\.spec\.ts/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: journeyWebServer(3100),
});
