import { expect, test } from "@playwright/test";
import { collectRequests, grantAccess } from "./helpers";
import { assertNoUnexpectedExternalRequests } from "./network-guard";

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

// Spec 010 R-09: the archived /audit/fixture and /audit/spec004 preview
// pages are gone — only the public surfaces remain under the network guard.
for (const path of ["/", "/audit", "/faq"] as const) {
  test(`${path} makes no unexpected third-party request`, async ({ page }) => {
    const requests = collectRequests(page);
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    await assertNoUnexpectedExternalRequests(page, requests);
    // Spec 019 R-01: without a Pixel ID there is no cookie notice or link,
    // also once the page is running in the browser.
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("region", { name: "Cookie?" })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Pengaturan cookie" }),
    ).toHaveCount(0);
  });
}

// J01: the mobile header no longer has a menu; its one popup control is
// "Contoh laporan", which opens the example report as a sheet. It may name
// the sheet in `aria-controls` only while the sheet exists.
test("the mobile header's popup control never points at a missing sheet, and Escape returns focus", async ({
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
  // The open modal sheet hides the page behind it from role queries.
  const controls = await page
    .getByRole("banner", { includeHidden: true })
    .getByRole("button", {
      name: "Contoh laporan",
      exact: true,
      includeHidden: true,
    })
    .getAttribute("aria-controls");
  if (controls !== null) expect(controls).toBe(await sheet.getAttribute("id"));
  await expect
    .poll(() =>
      sheet.evaluate((element) => element.contains(document.activeElement)),
    )
    .toBe(true);

  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  expect(await trigger.getAttribute("aria-controls")).toBeNull();
  await expect(trigger).toBeFocused();
});
