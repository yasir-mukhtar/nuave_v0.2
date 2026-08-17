import { expect, test } from "@playwright/test";
import {
  assertNoSideEffects,
  collectRequests,
  grantAccess,
  seedFixtureState,
  v3ReadyState,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

test.describe("preview disabled", () => {
  test("the fixture route is unavailable even with the furthest v3 fixture state seeded (AC-02)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    // Seed the furthest valid v3 state: no client state may enable the
    // protected preview when the server has it switched off.
    seedFixtureState(page, v3ReadyState());
    await page.goto("/audit/fixture");
    await expect(
      page.getByRole("heading", {
        name: "Pratinjau contoh tidak tersedia saat ini.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Kembali ke halaman utama Nuave" }),
    ).toBeVisible();
    // No fixture journey surface leaks through.
    await expect(
      page.getByRole("heading", {
        name: "Pratinjau pesanan untuk Kopi Taman Senja",
      }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Cek bisnis saya di AI" }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Mulai ulang" })).toHaveCount(
      0,
    );
    await assertNoSideEffects(page, requests);
  });

  test("the landing page keeps its normal actions (AC-02)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Audit bisnis saya" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Cek bisnis saya di AI" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Mulai pratinjau fiktif" }),
    ).toHaveCount(0);
    await assertNoSideEffects(page, requests);
  });
});
