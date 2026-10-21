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

// J01: the mobile header no longer has a menu; its one popup control is
// "Contoh laporan", which opens the example report as a sheet.
test("the mobile header's popup control references its sheet only while it exists, and Escape returns focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const trigger = page
    .getByRole("banner")
    .getByRole("button", { name: "Contoh laporan", exact: true });
  const sheet = page.getByRole("dialog", { name: "Contoh laporan" });
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  expect(await trigger.getAttribute("aria-controls")).toBeNull();
  await expect(sheet).toHaveCount(0);

  await trigger.click();
  await expect(sheet).toBeVisible();
  await expect
    .poll(() => sheet.evaluate((element) => element.contains(document.activeElement)))
    .toBe(true);

  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  expect(await trigger.getAttribute("aria-controls")).toBeNull();
  await expect(trigger).toBeFocused();
});
