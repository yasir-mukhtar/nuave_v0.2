import type { PlaywrightTestConfig } from "@playwright/test";

export const E2E_ACCESS_CODE = "nuave-e2e-test-access-code";

const SAFE_INHERITED_ENV_KEYS = [
  "PATH",
  "Path",
  "HOME",
  "USERPROFILE",
  "TMPDIR",
  "TMP",
  "TEMP",
  "CI",
  "NODE_OPTIONS",
  "npm_config_cache",
  "NPM_CONFIG_CACHE",
] as const;

const ALLOWED_SERVER_OVERRIDES = new Set([
  "NUAVE_FIXTURE_PREVIEW_ENABLED",
  "NUAVE_FIXTURE_FORCE_REPORT_FAILURE",
  "NUAVE_NEW_INTAKE_PREVIEW_ENABLED",
  "NUAVE_GLM_LOCAL_EXPERIMENT",
]);

/**
 * Explicit offline server environment. Provider credentials and live-testing
 * switches are overwritten even if the developer shell contains real values.
 */
export function offlineE2EServerEnv(
  overrides: Record<string, string> = {},
): Record<string, string> {
  for (const key of Object.keys(overrides)) {
    if (!ALLOWED_SERVER_OVERRIDES.has(key)) {
      throw new Error(`Unsupported Playwright server env override: ${key}`);
    }
  }

  const inherited: Record<string, string> = {};
  for (const key of SAFE_INHERITED_ENV_KEYS) {
    const value = process.env[key];
    if (value) inherited[key] = value;
  }

  return {
    ...inherited,
    ...overrides,
    NUAVE_ACCESS_CODE: E2E_ACCESS_CODE,
    NUAVE_PROVIDER: "opencodego",
    NUAVE_QUESTION_PROVIDER: "opencodego",
    NUAVE_LIVE_PROVIDER_TESTING: "0",
    // The GLM experiment can never reach a live transport in e2e.
    NUAVE_GLM_LIVE_AUTHORIZED: "0",
    // The audit run/report boundaries can never execute a live provider call
    // in e2e — the labeled synthetic substitute is the only transport.
    NUAVE_AUDIT_LIVE_AUTHORIZED: "0",
    CHEAPERINFERENCE_API_KEY: "",
    OPENCODEGO_API_KEY: "",
    OPENAI_API_KEY: "",
    GEMINI_API_KEY: "",
    GROQ_API_KEY: "",
    OPENROUTER_API_KEY: "",
    NUAVE_FIXTURE_PREVIEW_ENABLED:
      overrides.NUAVE_FIXTURE_PREVIEW_ENABLED ?? "false",
    NUAVE_FIXTURE_FORCE_REPORT_FAILURE:
      overrides.NUAVE_FIXTURE_FORCE_REPORT_FAILURE ?? "false",
  };
}

export function journeyWebServer(
  port: number,
  env: Record<string, string> = {},
): PlaywrightTestConfig["webServer"] {
  return {
    // Interface-level founder-local confinement: the preview listens on the
    // IPv4 loopback only, never on a LAN-reachable interface (next dev's
    // default hostname is 0.0.0.0).
    command: `npm run dev -- --port ${port} --hostname 127.0.0.1`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: offlineE2EServerEnv(env),
  };
}
