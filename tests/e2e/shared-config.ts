/**
 * Shared web-server configuration for the Spec 001 browser harness.
 *
 * Each Playwright config boots its own `next dev` server with the server-side
 * fixture-preview environment it needs. Ports are distinct so the three modes
 * can never reuse a stray server, and `reuseExistingServer` is disabled so a
 * manually started dev server can never leak into a run.
 */
import type { PlaywrightTestConfig } from "@playwright/test";

export function journeyWebServer(
  port: number,
  env: Record<string, string> = {},
): PlaywrightTestConfig["webServer"] {
  const mergedEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries({ ...process.env, ...env })) {
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
