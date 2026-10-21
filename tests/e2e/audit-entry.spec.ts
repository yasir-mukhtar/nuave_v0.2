import { expect, test } from "@playwright/test";
import {
  assertNoSideEffects,
  collectRequests,
  sideEffectViolations,
} from "./helpers";
import {
  entryScreen,
  expectBrandConfirm,
  expectEmptyEntry,
  openAuditFromLanding,
} from "./journey";

/**
 * Spec 010 R-08 / AC-03: `/audit` is the single public audit entry. The
 * landing website form (J01) leads straight to it: the website goes along
 * once through this tab's session storage and `/audit` starts the free check
 * at once — no fixture business, no old identity/payment steps. A direct
 * visit opens on the empty website step. The server suite runs
 * `NUAVE_AUDIT_MODE=synthetic`, so the `?fixture=` seed below is the
 * harness-only path; live ignores it.
 */

/** Mirrors `AUDIT_SOURCE_HANDOFF_STORAGE_KEY` in `src/lib/audit/source-handoff.ts`. */
const SOURCE_HANDOFF_KEY = "nuave:audit-source-handoff-v1";

test.beforeEach(async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Same external isolation as the deterministic intake spec: no API route
  // or third-party request is needed to render the entry.
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (
      url.origin !== new URL(baseURL!).origin ||
      url.pathname.startsWith("/api/")
    )
      return route.abort();
    return route.continue();
  });
});

test("the landing website form reaches the new audit journey and starts only the free check", async ({
  page,
}) => {
  // The one request this path may make: the free lookup (J02), answered by
  // the synthetic identity. No order, payment or paid reading.
  await page.route("**/api/audit/identity?**", (route) => route.continue());
  const requests = collectRequests(page);
  await page.goto("/");
  await openAuditFromLanding(page);
  // The business name is read from the website, not typed.
  await expectBrandConfirm(page, "Example");
  await expect(
    page.getByRole("button", { name: "Ya, ini bisnis saya", exact: true }),
  ).toBeEnabled();
  // The website came from the landing page once and left session storage.
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), SOURCE_HANDOFF_KEY),
  ).toBeNull();
  // No fixture business or fixture-preview wording appears on the way.
  await expect(
    page.getByText(/Kopi Sudut|Laundry Ceria|contoh fiktif|pratinjau/i),
  ).toHaveCount(0);
  const identity = `/api/audit/identity?source=${encodeURIComponent("https://example.com/")}`;
  expect(
    requests.filter((url) => new URL(url).pathname.startsWith("/api/")),
  ).toEqual([new URL(identity, page.url()).href]);
  expect(sideEffectViolations(requests)).toEqual([
    new URL(identity, page.url()).href,
  ]);
});

test("the former preview path redirects to /audit without seeding old fixture facts", async ({
  page,
}) => {
  await page.goto("/audit/new-intake?fixture=GLM&glm=1");
  await expect(page).toHaveURL(/\/audit\?fixture=GLM&glm=1$/);
  await expect(entryScreen(page)).toBeVisible();
  await expect(page.getByText("Laundry Ceria")).toHaveCount(0);
});

test("an old fixture parameter still opens empty v2 entry", async ({
  page,
}) => {
  const requests = collectRequests(page);
  await page.goto("/audit");
  await expectEmptyEntry(page);
  await page.goto("/audit?fixture=F1");
  await expectEmptyEntry(page);
  await expect(page.getByText("Kopi Sudut")).toHaveCount(0);
  // A direct visit makes no API or third-party request.
  await assertNoSideEffects(page, requests);
});
