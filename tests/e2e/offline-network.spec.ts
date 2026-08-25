import { expect, test } from "@playwright/test";
import { collectRequests, grantAccess } from "./helpers";
import { assertNoUnexpectedExternalRequests } from "./network-guard";

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

for (const path of ["/", "/audit", "/audit/fixture"] as const) {
  test(`${path} makes no unexpected third-party request`, async ({ page }) => {
    const requests = collectRequests(page);
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    await assertNoUnexpectedExternalRequests(page, requests);
  });
}

test("/audit/spec004 is a hard-offline preview with no audit API request", async ({
  page,
}) => {
  const requests = collectRequests(page);
  await page.goto("/audit/spec004", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByText(/Pratinjau offline Spec 004/),
  ).toBeVisible();
  await page.waitForTimeout(300);

  await assertNoUnexpectedExternalRequests(page, requests);
  const auditApiRequests = requests.filter((url) => {
    try {
      return new URL(url).pathname.startsWith("/api/audit/");
    } catch {
      return false;
    }
  });
  expect(auditApiRequests).toEqual([]);
});

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
