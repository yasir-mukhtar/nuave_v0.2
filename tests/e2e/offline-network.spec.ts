import { expect, test } from "@playwright/test";
import { collectRequests, grantAccess } from "./helpers";
import { assertNoUnexpectedExternalRequests } from "./network-guard";

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

// Spec 010 R-09: the archived /audit/fixture and /audit/spec004 preview
// pages are gone — only the public surfaces remain under the network guard.
for (const path of ["/", "/audit"] as const) {
  test(`${path} makes no unexpected third-party request`, async ({ page }) => {
    const requests = collectRequests(page);
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    await assertNoUnexpectedExternalRequests(page, requests);
  });
}

test("mobile nav exposes aria-controls only while its menu target exists", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const hamburger = page.locator(".lp-nav-hamburger");
  const menu = page.locator("#nuave-mobile-menu");
  await expect(hamburger).toBeVisible();
  await expect(hamburger).toHaveAttribute("aria-expanded", "false");
  expect(await hamburger.getAttribute("aria-controls")).toBeNull();
  await expect(menu).toHaveCount(0);

  await hamburger.click();
  await expect(hamburger).toHaveAttribute("aria-expanded", "true");
  await expect(hamburger).toHaveAttribute("aria-controls", "nuave-mobile-menu");
  await expect(menu).toBeVisible();
  await expect(page.locator("#nuave-mobile-menu-first-link")).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(hamburger).toHaveAttribute("aria-expanded", "false");
  expect(await hamburger.getAttribute("aria-controls")).toBeNull();
  await expect(hamburger).toBeFocused();
});
