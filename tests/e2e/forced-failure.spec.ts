import { expect, test, type Page } from "@playwright/test";
import {
  assertNoSideEffects,
  collectRequests,
  grantAccess,
  seedFixtureState,
  v3QuestionsApprovedState,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

async function reachTerminalFailure(page: Page) {
  seedFixtureState(page, v3QuestionsApprovedState());
  await page.goto("/audit/fixture");
  await page.getByRole("button", { name: "Jalankan audit" }).click();
  await page.getByRole("button", { name: "Mulai audit sekarang" }).click();
  await expect(
    page.getByRole("heading", { name: "Laporan contoh tidak dapat dibuat" }),
  ).toBeVisible({ timeout: 20_000 });
}

test.describe("forced construction failure (preview enabled + server-forced failure)", () => {
  test("the terminal failure is truthful: no success representations (AC-18)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await reachTerminalFailure(page);
    await expect(
      page.getByRole("heading", { name: "Pembuatan laporan contoh gagal" }),
    ).toBeVisible();
    await expect(
      page.getByText(/Tidak ada panggilan audit langsung yang dilakukan/),
    ).toBeVisible();
    const body = await page.locator("body").innerText();
    // No success representation anywhere: no report headline, count, article,
    // or run-completion language.
    expect(body).not.toContain("Bisnis Anda muncul di 8 dari 10 pertanyaan");
    expect(body).not.toContain("8/10");
    expect(body).not.toContain("AI Visibility Report");
    expect(body).not.toContain("Laporan siap");
    // No download controls and no report-exists claim.
    await expect(
      page.getByRole("button", { name: "Download PDF" }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Unduh JSON" })).toHaveCount(
      0,
    );
    // Retry and start over remain available for the local fixture only.
    await expect(
      page.getByRole("button", { name: "Coba buat laporan contoh lagi" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Mulai ulang" }).first(),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });

  test("a failed retry produces perceivable alert feedback (AC-18)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await reachTerminalFailure(page);
    await page
      .getByRole("button", { name: "Coba buat laporan contoh lagi" })
      .click();
    const alert = page.getByText(
      /Percobaan ulang gagal: pembuatan lokal masih belum dapat membuat laporan contoh/,
    );
    await expect(alert).toBeVisible();
    await expect(alert).toBeFocused();
    // Still the terminal failure state, never a report.
    await expect(
      page.getByRole("heading", { name: "Laporan contoh tidak dapat dibuat" }),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });

  test("start over from the terminal failure requires confirmation (AC-18)", async ({
    page,
  }) => {
    const requests = collectRequests(page);
    await reachTerminalFailure(page);
    const failurePanel = page.getByLabel("Laporan contoh tidak dapat dibuat");
    // The failure panel's own start over must still require confirmation.
    await failurePanel.getByRole("button", { name: "Mulai ulang" }).click();
    await expect(
      page.getByRole("button", { name: "Konfirmasi mulai ulang" }),
    ).toBeVisible();
    // Keeping the preview stays on the terminal failure.
    await page.getByRole("button", { name: "Tetap di pratinjau" }).click();
    await expect(
      page.getByRole("heading", { name: "Laporan contoh tidak dapat dibuat" }),
    ).toBeVisible();
    // A confirmed start over returns safely to the fixture entry.
    await failurePanel.getByRole("button", { name: "Mulai ulang" }).click();
    await page.getByRole("button", { name: "Konfirmasi mulai ulang" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Pratinjau pesanan untuk Kopi Taman Senja",
      }),
    ).toBeVisible();
    await assertNoSideEffects(page, requests);
  });
});
