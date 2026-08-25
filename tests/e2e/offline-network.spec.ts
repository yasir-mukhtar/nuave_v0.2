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
