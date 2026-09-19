import { defineConfig } from "@playwright/test";
import { journeyWebServer } from "./tests/e2e/shared-config";

/**
 * Main browser suite: the protected fixture preview is ENABLED, the complete
 * fixture journey remains reachable, and the live landing→audit handoff plus
 * variance regressions use fully stubbed `/api/audit/*` responses so no test
 * reaches a paid provider. The offline-network suite additionally rejects
 * unexpected third-party browser requests across active customer surfaces.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch:
    /(fixture-journey|landing-audit-handoff|live-audit-variance|b1-workflow-authority|offline-network|e1-runnable-journey|e1-postpayment-journey|wave1-workflow-lifecycle|intake-preview-journey|intake-screen-contract|new-intake-journey|new-intake-glm)\.spec\.ts/,
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
    NUAVE_FIXTURE_PREVIEW_ENABLED: "true",
    NUAVE_NEW_INTAKE_PREVIEW_ENABLED: "true",
    // Founder-only GLM experiment enabled for the offline stub path; live
    // authorization stays unset (blanked inside offlineE2EServerEnv).
    NUAVE_GLM_LOCAL_EXPERIMENT: "true",
  }),
});
