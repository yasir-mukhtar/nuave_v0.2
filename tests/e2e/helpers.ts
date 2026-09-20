import { expect, type Page } from "@playwright/test";
import { E2E_ACCESS_CODE } from "./shared-config";

/**
 * Sets the harness access cookie on the browser context. The public audit
 * journey no longer gates on it (Spec 010 removed the access code), but the
 * suites keep the call so a future gate cannot leak past the harness.
 */
export async function grantAccess(page: Page): Promise<void> {
  await page.context().addCookies([
    {
      name: "nuave_access",
      value: E2E_ACCESS_CODE,
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
}

/**
 * Attaches a request listener that records every request URL the page makes
 * from this point on. Must be called before navigation.
 */
export function collectRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  return urls;
}

/**
 * Returns the recorded URLs that violate the no-side-effect boundary: any
 * `/api/*` request and any request to an external service. ANY same-origin
 * API route — not just
 * `/api/audit/*` — is a violation. This also catches a route the browser
 * check alone cannot see through, such as a same-origin `/api/proxy` that
 * calls an external provider server-side: the browser only observes the
 * request TO that local route, so treating every `/api/*` path as forbidden
 * (rather than allowlisting `/api/audit` only) closes that gap. The only
 * external origins tolerated are the pre-existing landing page's static-asset
 * CDNs (for example the brand-mark SVG in `LandingNav.tsx`/`Footer.tsx`,
 * served from framerusercontent.com) — those are content images, not an
 * AI/search, payment, email, analytics, database, or background-job service,
 * and they predate the fixture journey.
 */
const STATIC_ASSET_CDN_HOSTS = new Set(["framerusercontent.com"]);

export function sideEffectViolations(urls: string[]): string[] {
  const violations: string[] = [];
  for (const url of urls) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    const host = parsed.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1";
    const isViolation =
      parsed.pathname.startsWith("/api/") ||
      (!isLocal && !STATIC_ASSET_CDN_HOSTS.has(host));
    // A URL can trip both checks at once (an external host under /api/); it
    // must still be reported only once.
    if (isViolation) violations.push(url);
  }
  return violations;
}

export async function assertNoSideEffects(
  page: Page,
  urls: string[],
): Promise<void> {
  const violations = sideEffectViolations(urls);
  expect(violations, `side-effect requests: ${violations.join(", ")}`).toEqual(
    [],
  );
  await expect(page).toHaveURL(/http/);
}
