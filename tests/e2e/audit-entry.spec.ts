import { expect, test } from "@playwright/test";
import { assertNoSideEffects, collectRequests } from "./helpers";

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
  const hero = page.getByRole("region", { name: "Mulai audit visibilitas AI" });
  await expect(
    hero.getByRole("heading", { name: "Cek bisnis Anda di AI" }),
  ).toBeVisible();
  await hero.getByPlaceholder("https://bisnisanda.com").fill("example.com");
  await hero.getByRole("button", { name: "Cek bisnis saya di AI" }).click();

  await expect(page).toHaveURL(/\/audit$/);
  const shell = page.locator("[data-new-intake-shell]");
  await expect(shell).toHaveAttribute("data-new-intake-shell", "s-brand-fix");
  await expect(
    page.getByRole("textbox", { name: "Nama brand", exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("textbox", { name: "Link website", exact: true }),
  ).toHaveValue("");
  // No fixture business or fixture-preview wording appears on the entry.
  await expect(
    page.getByText(/Kopi Sudut|Laundry Ceria|contoh fiktif|pratinjau/i),
  ).toHaveCount(0);
  await assertNoSideEffects(page, requests);
});

test("the former preview path redirects to /audit and keeps harness parameters", async ({
  page,
}) => {
  await page.goto("/audit/new-intake?fixture=GLM&glm=1");
  await expect(page).toHaveURL(/\/audit\?fixture=GLM&glm=1$/);
  const shell = page.locator("[data-new-intake-shell]");
  await expect(shell).toHaveAttribute("data-new-intake-shell", "s-brand");
  await expect(
    page.getByRole("heading", { name: "Laundry Ceria", exact: true }),
  ).toBeVisible();
});

test("the fixture seed is only reachable through the harness parameter", async ({
  page,
}) => {
  const shell = page.locator("[data-new-intake-shell]");
  // The public default — even in synthetic mode — starts on empty fields.
  await page.goto("/audit");
  await expect(shell).toHaveAttribute("data-new-intake-shell", "s-brand-fix");
  // An explicit synthetic fixture seed opens the seeded brand card.
  await page.goto("/audit?fixture=F1");
  await expect(shell).toHaveAttribute("data-new-intake-shell", "s-brand");
  await expect(
    page.getByRole("heading", { name: "Kopi Sudut", exact: true }),
  ).toBeVisible();
});
