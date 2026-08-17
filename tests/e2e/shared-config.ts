/**
 * Shared web-server configuration for the Spec 002 browser harness.
 *
 * Each Playwright config boots its own `next dev` server with the server-side
 * fixture-preview environment it needs. Ports are distinct so the three modes
 * can never reuse a stray server, and `reuseExistingServer` is disabled so a
 * manually started dev server can never leak into a run.
 */
import type { PlaywrightTestConfig } from "@playwright/test";

/**
 * Fixed access code shared by the e2e harness: the web server runs with
 * `NUAVE_ACCESS_CODE` set to this value and every browser context is given a
 * matching `nuave_access` cookie, so the fixture journey under `/audit` stays
 * reachable while the middleware gate is active.
 */
export const E2E_ACCESS_CODE = "nuave-e2e-test-access-code";

export function journeyWebServer(
  port: number,
  env: Record<string, string> = {},
): PlaywrightTestConfig["webServer"] {
  const mergedEnv: Record<string, string> = {
    ...process.env,
    ...env,
    NUAVE_ACCESS_CODE: E2E_ACCESS_CODE,
  };
  for (const [key, value] of Object.entries(mergedEnv)) {
    if (value !== undefined) mergedEnv[key] = value;
  }
  return {
    command: `npm run dev -- --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: mergedEnv,
  };
}
