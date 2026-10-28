import { defineConfig } from "@playwright/test";
import { journeyWebServer } from "./tests/e2e/shared-config";

/**
 * Meta Pixel suite (Spec 019): the same synthetic journey, built with a test
 * Pixel ID, so the cookie notice, the footer link and the Pixel's events can
 * be checked. Meta's real address is never reached: the suite answers it
 * with a stub. The main suite runs with no ID (the notice stays off).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /meta-pixel\.spec\.ts/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3200",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: journeyWebServer(3200, {
    NUAVE_NEW_AUDIT_ENABLED: "true",
    NUAVE_AUDIT_MODE: "synthetic",
    NEXT_PUBLIC_META_PIXEL_ID: "123456789012345",
  }),
});
