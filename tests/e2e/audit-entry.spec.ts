import { expect, test } from "@playwright/test";
import { assertNoSideEffects, collectRequests } from "./helpers";
import {
  BRAND_HEADING,
  entryScreen,
  expectEmptyEntry,
  openAuditFromLanding,
  trackApiCalls,
} from "./journey";

/**
 * Spec 010 R-08 / AC-03: `/audit` is the single public audit entry. The
 * landing call-to-action carries the website it took, so the journey looks it
 * up at once and opens on the brand check — the owner never types the website
 * a second time. Opened directly, `/audit` still starts on the empty business
 * step. No fixture business, no old identity/payment steps. The server suite
 * runs `NUAVE_AUDIT_MODE=synthetic`, so the `?fixture=` seed below is the
 * harness-only path; live ignores it.
 */

test.beforeEach(async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Same external isolation as the deterministic intake spec: only the free
  // website lookup is answered (by a stub); every other API route or
  // third-party request is refused.
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (
      url.origin !== new URL(baseURL!).origin ||
      url.pathname.startsWith("/api/")
    )
      return route.abort();
    return route.continue();
  });
  await page.route("**/api/audit/identity?**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        canonical_url: "https://example.com/",
        display_name: "Contoh Usaha",
        preparation_mode: "synthetic-local",
      }),
    }),
  );
});

test("landing CTA looks up the website and opens on the brand check", async ({
  page,
}) => {
  const requests = trackApiCalls(page);
  await page.goto("/");
  await openAuditFromLanding(page);
  await expect(
    page.getByRole("heading", { name: BRAND_HEADING }),
  ).toBeVisible();
  await expect(entryScreen(page)).toHaveCount(0);
  await expect(page.getByRole("radio", { name: /Contoh Usaha/ })).toBeChecked();
  // Only the free lookup ran: no order, no paid reading.
  expect(requests).toEqual({ "GET /api/audit/identity": 1 });
  // No fixture business or fixture-preview wording appears.
  await expect(
    page.getByText(/Kopi Sudut|Laundry Ceria|contoh fiktif|pratinjau/i),
  ).toHaveCount(0);
});

test("opened directly, /audit starts on the empty business step", async ({
  page,
}) => {
  const requests = collectRequests(page);
  await page.goto("/audit");
  await expectEmptyEntry(page);
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
