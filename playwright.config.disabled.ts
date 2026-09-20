import { defineConfig } from "@playwright/test";
import { journeyWebServer } from "./tests/e2e/shared-config";

/**
 * Switch-off browser suite (Spec 010 AC-01/AC-09): NUAVE_NEW_AUDIT_ENABLED
 * stays unset, so `/audit` renders "Audit tidak tersedia saat ini.", the
 * archived legacy routes answer 404, and the landing page keeps its normal
 * actions. No client input can enable the public audit journey.
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
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: journeyWebServer(3100),
});
