import { defineConfig } from "@playwright/test";
import { journeyWebServer } from "./tests/e2e/shared-config";

/**
 * Main browser suite (Spec 010): the public audit journey is ENABLED in
 * synthetic mode, so `/audit` serves the direct-ten intake and the landing
 * call-to-action hands off to it. The offline-network suite additionally
 * rejects unexpected third-party browser requests across active customer
 * surfaces. The old `/audit/v2`, `/audit/fixture`, `/audit/spec004` and
 * canonical/variance suites were archived with the legacy flow (R-09).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch:
    /(audit-entry|offline-network|new-intake-journey|new-intake-glm|smart-intake|payment-screens)\.spec\.ts/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${process.env.NUAVE_E2E_PORT ?? "3000"}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: journeyWebServer(Number(process.env.NUAVE_E2E_PORT ?? "3000"), {
    // Spec 010: the public audit journey is on, running its synthetic
    // substitutes — live credentials stay blanked inside
    // offlineE2EServerEnv.
    NUAVE_NEW_AUDIT_ENABLED: "true",
    NUAVE_AUDIT_MODE: "synthetic",
    // Spec 017 R-20: a fake test-pass code (at least 24 characters) for the
    // `/uji` specs. Mirrors `E2E_TEST_PASS_CODE` in tests/e2e/journey.ts.
    NUAVE_TEST_PASS_CODE: "e2e-test-pass-code-not-a-secret-0001",
  }),
});
