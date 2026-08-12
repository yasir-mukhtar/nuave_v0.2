/**
 * Server-controlled fixture-preview configuration.
 *
 * The fixture journey must never be enabled from the client: no query
 * parameter, browser-storage value, form input, or client-side toggle may
 * switch a live journey into a fixture-paid or report-ready state. Only this
 * server-side environment variable turns the protected preview on.
 *
 * It deliberately has no `NEXT_PUBLIC_` prefix so its value never ships to the
 * browser bundle.
 */
export const FIXTURE_PREVIEW_ENV_KEY = "NUAVE_FIXTURE_PREVIEW_ENABLED";

export function isFixturePreviewEnabled(): boolean {
  const raw = process.env[FIXTURE_PREVIEW_ENV_KEY];
  return raw === "true" || raw === "1";
}
