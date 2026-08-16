import { expect, test } from "@playwright/test";
import {
  assertNoSideEffects,
  collectRequests,
  freshPaidState,
  grantAccess,
  seedFixtureState,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

test.describe("preview disabled", () => {
  test("the fixture route is unavailable even with fixture session state present", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    // Seed the furthest possible fixture state: no client state may enable
    // the protected preview when the server has it switched off.
    seedFixtureState(page, {
      ...freshPaidState(),
      processingCompleted: true,
      stage: "ready",
    });
    await page.goto("/audit/fixture");
    await expect(
      page.getByRole("heading", {
        name: "The example preview is not available right now.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Start with the fixed example business",
      }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Start over" })).toHaveCount(
      0,
    );
    await assertNoSideEffects(page, requests);
  });

  test("the landing page keeps its normal actions", async ({ page }) => {
    const requests = collectRequests(page);
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Mulai pratinjau fiktif" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Audit brand Anda — Gratis" }).first(),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });
});
