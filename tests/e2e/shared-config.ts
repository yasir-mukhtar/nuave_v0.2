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
  "NUAVE_NEW_AUDIT_ENABLED",
  "NUAVE_AUDIT_MODE",
  // Spec 017: a fixed fake code, so the test pass can be driven offline.
  "NUAVE_TEST_PASS_CODE",
  // Spec 019: a fake Pixel ID for the Meta Pixel suite.
  "NEXT_PUBLIC_META_PIXEL_ID",
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
    CHEAPERINFERENCE_API_KEY: "",
    OPENCODEGO_API_KEY: "",
    OPENAI_API_KEY: "",
    GEMINI_API_KEY: "",
    GROQ_API_KEY: "",
    OPENROUTER_API_KEY: "",
    // Every NUAVE_* key src/ reads must be named here: a key absent from this
    // environment can still be filled from a developer's .env.local when
    // next dev loads it. Blank counts as unset for these readers, so the
    // offline server behaves as if the keys were never configured instead of
    // inheriting a founder-local evidence or pack directory.
    NUAVE_GLM_EVIDENCE_DIR: "",
    NUAVE_LOCAL_AUDIT_PACK_DIR: "",
    NUAVE_DAILY_SPEND_LIMIT_USD: "",
    // Spec 016: order settings. Blank counts as unset, so the offline server
    // takes its environment label and site address from wrangler.jsonc's
    // `dev` environment, and never inherits a developer's own limit or list.
    NUAVE_ENVIRONMENT: "",
    NUAVE_SITE_URL: "",
    NUAVE_ORDER_SPEND_LIMIT_USD: "",
    NUAVE_ORDER_EMAIL_ALLOWLIST: "",
    // Spec 016 R-25: the real mail sender is never configured offline.
    RESEND_API_KEY: "",
    NUAVE_MAIL_FROM: "",
    // Spec 021 PR 6b: no Claude writer, Anthropic key or Firecrawl key
    // offline; synthetic orders read no pages and call no writer.
    NUAVE_REPORT_WRITER: "",
    NUAVE_REPORT_EFFORT: "",
    // docs/MODELS.md: empty means step 3's defaults (GPT-5.6 Luna, medium).
    NUAVE_READING_MODEL: "",
    NUAVE_READING_EFFORT: "",
    NUAVE_ANTHROPIC_API_KEY: "",
    NUAVE_ANTHROPIC_WORKSPACE_ID: "",
    FIRECRAWL_API_KEY: "",
    // Spec 017 R-17: no Midtrans key, test-pass code or alert address offline;
    // synthetic mode uses the labeled simulated payment.
    MIDTRANS_SERVER_KEY: "",
    MIDTRANS_IS_PRODUCTION: "",
    NUAVE_TEST_PASS_CODE: overrides.NUAVE_TEST_PASS_CODE ?? "",
    NUAVE_FOUNDER_ALERT_EMAIL: "",
    // Spec 010: the public audit journey stays switched off unless a suite
    // enables it; "synthetic" is the failure-safe default and the only mode
    // e2e may run — "live" requires real credentials, all blanked above.
    NUAVE_NEW_AUDIT_ENABLED: overrides.NUAVE_NEW_AUDIT_ENABLED ?? "false",
    NUAVE_AUDIT_MODE: overrides.NUAVE_AUDIT_MODE ?? "synthetic",
    // Spec 019 R-01: no Pixel ID unless the Pixel suite sets its fake one.
    NEXT_PUBLIC_META_PIXEL_ID: overrides.NEXT_PUBLIC_META_PIXEL_ID ?? "",
  };
}

export function journeyWebServer(
  port: number,
  env: Record<string, string> = {},
): PlaywrightTestConfig["webServer"] {
  return {
    // Interface-level founder-local confinement: the preview listens on the
    // IPv4 loopback only, never on a LAN-reachable interface (next dev's
    // default hostname is 0.0.0.0). The local D1 database (orders and the
    // spend ledger, spec 016 R-33) gets its migrations first.
    command: `npm run db:migrate:local && npm run dev -- --port ${port} --hostname 127.0.0.1`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: offlineE2EServerEnv(env),
  };
}
