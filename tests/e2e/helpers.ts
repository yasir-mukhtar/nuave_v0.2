import { expect, type Locator, type Page } from "@playwright/test";
import { E2E_ACCESS_CODE } from "./shared-config";

/**
 * Grants the middleware access cookie to the browser context. Must run before
 * any navigation to a gated route (`/audit` and `/api/audit/*`).
 */
export async function grantAccess(page: Page): Promise<void> {
  await page.context().addCookies([
    {
      name: "nuave_access",
      value: E2E_ACCESS_CODE,
      domain: "localhost",
      path: "/",
    },
  ]);
}

/** Fixture-journey session key (Spec 002 v3) and the live keys it never touches. */
export const FIXTURE_SESSION_KEY = "nuave.fixtureJourney.v3";
export const FIXTURE_STATE_VERSION = 3;
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

// ---------------------------------------------------------------------------
// v3 fixture-journey state factories (Spec 002 R-23 gate order)
// ---------------------------------------------------------------------------

export function freshV3State(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    version: FIXTURE_STATE_VERSION,
    stage: "preview",
    simulatedPaid: false,
    factsConfirmed: false,
    questionsApproved: false,
    runStarted: false,
    processingStage: 0,
    processingCompleted: false,
    reportConstructionFailed: false,
    ...overrides,
  };
}

/** Simulated payment completed; the facts and question screens are unlocked. */
export function v3PaidState(): Record<string, unknown> {
  return freshV3State({ stage: "payment", simulatedPaid: true });
}

/** Facts screen before the explicit confirmation. */
export function v3FactsState(): Record<string, unknown> {
  return freshV3State({ stage: "facts", simulatedPaid: true });
}

/** Ten-question pack approved; the run is available via its explicit action. */
export function v3QuestionsApprovedState(): Record<string, unknown> {
  return freshV3State({
    stage: "questions",
    simulatedPaid: true,
    factsConfirmed: true,
    questionsApproved: true,
  });
}

/** The report destination with a completed simulated run. */
export function v3ReadyState(): Record<string, unknown> {
  return freshV3State({
    stage: "ready",
    simulatedPaid: true,
    factsConfirmed: true,
    questionsApproved: true,
    runStarted: true,
    processingStage: 3,
    processingCompleted: true,
  });
}

/** A restored mid-run state that must be paused and resumed explicitly. */
export function v3RunPausedState(processingStage = 2): Record<string, unknown> {
  return freshV3State({
    stage: "run",
    simulatedPaid: true,
    factsConfirmed: true,
    questionsApproved: true,
    runStarted: true,
    processingStage,
  });
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

// ---------------------------------------------------------------------------
// Journey steps (exact labels from the realigned implementation)
// ---------------------------------------------------------------------------

/** 02 — completes the simulated payment from the revealed Order Preview. */
export async function completeSimulatedPayment(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Bayar Rp99.000" }).click();
  await expect(
    page.getByRole("heading", { name: "Simulasi pembayaran" }),
  ).toBeVisible();
  await expect(
    page.getByText("Simulasi pembayaran — tidak ada tagihan", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Selesaikan simulasi pembayaran" })
    .click();
  await expect(
    page.getByText("Pembayaran simulasi selesai. Tidak ada tagihan.", {
      exact: true,
    }),
  ).toBeVisible();
}

/** 03 → 04 — confirms the fixture facts and approves the ten-question pack. */
export async function confirmFactsAndApprove(page: Page): Promise<void> {
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Buat pertanyaan audit" }).click();
  await expect(
    page.getByRole("heading", { name: "Periksa pertanyaan audit" }),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Setujui pertanyaan" }).click();
  await expect(
    page.getByText("10 pertanyaan siap dijalankan", { exact: true }),
  ).toBeVisible();
}

/** 05 — starts the simulated run through the explicit confirmation dialog. */
export async function startSimulatedRun(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Jalankan audit" }).click();
  await expect(
    page.getByRole("dialog", { name: "Mulai audit sekarang?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mulai audit sekarang" }).click();
  await expect(
    page.getByRole("heading", { name: "Simulasi audit berjalan" }),
  ).toBeVisible();
}

/** 06 — asserts the ready destination with all five canonical report sections. */
export async function expectReadyReport(page: Page): Promise<void> {
  await expect(
    page.getByRole("heading", { name: "AI Visibility Report (contoh fiktif)" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "Kopi Taman Senja", level: 1 }),
  ).toBeVisible();
  for (const section of [
    "Hasil Utama",
    "Temuan",
    "Yang Dapat Dilakukan",
    "Hasil Tes per Pertanyaan",
    "Cara Audit Ini Bekerja",
  ]) {
    await expect(
      page.getByRole("heading", { name: section, level: 2 }),
    ).toBeVisible();
  }
  await expect(
    page.getByRole("button", { name: "Download PDF" }).first(),
  ).toBeVisible();
}

/** Asserts the page fits the viewport width (no horizontal scrolling). */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(fits).toBe(true);
}

/**
 * Drives focus with the keyboard alone (repeated Tab) until the target
 * locator is focused, within a bounded walk.
 */
export async function tabUntilFocused(
  page: Page,
  locator: Locator,
  maxTabs = 30,
): Promise<void> {
  for (let i = 0; i < maxTabs; i += 1) {
    const focused = await locator.evaluate(
      (element) => element === document.activeElement,
    );
    if (focused) return;
    await page.keyboard.press("Tab");
    await page.waitForTimeout(25);
  }
  await expect(locator).toBeFocused();
}

/** Asserts the element is focused and carries a visible focus outline. */
export async function expectVisibleFocus(
  page: Page,
  locator: Locator,
): Promise<void> {
  await expect(locator).toBeFocused();
  const outline = await locator.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return `${style.outlineStyle} ${style.outlineWidth}`;
  });
  expect(outline).not.toMatch(/^none/);
}
