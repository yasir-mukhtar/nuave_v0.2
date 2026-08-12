import { expect, type Page } from "@playwright/test";

/** Fixture-journey session key and the live workflow keys it must never touch. */
export const FIXTURE_SESSION_KEY = "nuave.fixtureJourney.v2";
export const LIVE_WORKFLOW_KEYS = [
  "nuave.audit.workflow.v3",
  "nuave.audit.session.v1",
];

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
 * Returns the recorded URLs that violate the fixture journey's no-side-effect
 * boundary: any `/api/audit/*` request and any request to an external
 * service. The only external origins tolerated are the pre-existing landing
 * page's static-asset CDNs (for example the brand-mark SVG in
 * `LandingNav.tsx`/`Footer.tsx`, served from framerusercontent.com) — those
 * are content images, not an AI/search, payment, email, analytics, database,
 * or background-job service, and they predate the fixture journey.
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
    if (parsed.pathname.startsWith("/api/audit")) violations.push(url);
    const host = parsed.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1";
    if (!isLocal && !STATIC_ASSET_CDN_HOSTS.has(host)) {
      violations.push(url);
    }
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

/** Completes the shared confirmation steps: facts checkbox then approve. */
export async function confirmFactsAndApprove(page: Page): Promise<void> {
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Continue to the ten questions" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review the ten example questions" }),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Approve the question pack" }).click();
}

/** Simulates payment and starts the deterministic simulated run. */
export async function simulatePaymentAndStartRun(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: "Simulate payment — no charge" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Simulated payment complete" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start the simulated run" }).click();
}

/** Asserts the ready destination: truthful report with all five sections. */
export async function expectReadyReport(page: Page): Promise<void> {
  await expect(
    page.getByRole("heading", { name: "Example report — fictional preview" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "Northstar Advisory" }),
  ).toBeVisible();
  for (const section of [
    "Main Result",
    "Key Findings",
    "What to Do Next",
    "Test-by-Test Results",
    "How This Audit Works",
  ]) {
    await expect(
      page.getByRole("heading", { name: section, level: 2 }),
    ).toBeVisible();
  }
}

/**
 * Seeds fixture-journey session state before the page's own scripts run.
 * Seeds only when the key is absent, so a later reload keeps the state the
 * app itself persisted instead of re-imposing the seed.
 */
export function seedFixtureState(
  page: Page,
  state: Record<string, unknown>,
): void {
  page.addInitScript(
    ({ key, value }) => {
      if (!window.sessionStorage.getItem(key)) {
        window.sessionStorage.setItem(key, value);
      }
    },
    { key: FIXTURE_SESSION_KEY, value: JSON.stringify(state) },
  );
}

export function freshPaidState(): Record<string, unknown> {
  return {
    version: 2,
    stage: "paid",
    factsConfirmed: true,
    questionsApproved: true,
    checkoutComplete: true,
    processingStage: 0,
    processingCompleted: false,
    reportConstructionFailed: false,
  };
}
