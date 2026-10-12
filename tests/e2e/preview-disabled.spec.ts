import { expect, test } from "@playwright/test";
import {
  assertNoSideEffects,
  collectRequests,
  grantAccess,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

test.describe("preview disabled", () => {
  test("the audit entry is unavailable without the server switch (AC-01)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    // The former preview path redirects to the single public entry, which is
    // safely unavailable while NUAVE_NEW_AUDIT_ENABLED is off.
    await page.goto("/audit/new-intake?fixture=F1&demo=1");
    await expect(page).toHaveURL(/\/audit(\?|$)/);
    await expect(
      page.getByRole("heading", {
        name: "Audit tidak tersedia saat ini.",
      }),
    ).toBeVisible();
    await expect(page.locator("[data-new-intake-shell]")).toHaveCount(0);
    // The direct entry is equally unavailable.
    await page.goto("/audit");
    await expect(
      page.getByRole("heading", {
        name: "Audit tidak tersedia saat ini.",
      }),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });
  test("the archived legacy routes are gone — 404 whether or not the switch is on (AC-09)", async ({
    page,
    request,
  }) => {
    const requests = collectRequests(page);
    // The old intake/question/variance flow no longer exists as routes.
    for (const path of [
      "/audit/v2",
      "/audit/v2/intake-preview",
      "/audit/fixture",
      "/audit/spec004",
      "/audit/local-report",
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} must be gone`).toBe(404);
    }
    // The archived API routes answer 404 as well.
    for (const path of [
      "/api/audit/prompts",
      "/api/audit/variance",
      "/api/audit/local-audit",
    ]) {
      const response = await request.post(path, { data: {} });
      expect(response.status(), `${path} must be gone`).toBe(404);
    }
    await assertNoSideEffects(page, requests);
  });

  test("the landing page keeps its normal actions (AC-02)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Cek bisnis saya di AI" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Audit bisnis saya" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Mulai pratinjau fiktif" }),
    ).toHaveCount(0);
    await assertNoSideEffects(page, requests);
  });
});
