import { expect, test } from "@playwright/test";
import { assertNoSideEffects, collectRequests } from "./helpers";
import { entryScreen, expectEmptyEntry, openAuditFromLanding } from "./journey";

/**
 * Spec 010 R-08 / AC-03: `/audit` is the single public audit entry. The
 * landing call-to-action leads straight to it and the journey opens on the
 * empty business name + source step — no fixture business, no old
 * identity/payment steps. The server suite runs `NUAVE_AUDIT_MODE=synthetic`,
 * so the `?fixture=` seed below is the harness-only path; live ignores it.
 */

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

test("landing CTA reaches the new audit journey on the empty business step", async ({
  page,
}) => {
  const requests = collectRequests(page);
  await page.goto("/");
  await openAuditFromLanding(page);
  await expectEmptyEntry(page);
  // No fixture business or fixture-preview wording appears on the entry.
  await expect(
    page.getByText(/Kopi Sudut|Laundry Ceria|contoh fiktif|pratinjau/i),
  ).toHaveCount(0);
  await assertNoSideEffects(page, requests);
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
  await page.goto("/audit");
  await expect(entryScreen(page)).toBeVisible();
  await page.goto("/audit?fixture=F1");
  await expect(entryScreen(page)).toBeVisible();
  await expect(page.getByText("Kopi Sudut")).toHaveCount(0);
});
