import { expect, test, type Page } from "@playwright/test";
import { assertNoSideEffects, collectRequests } from "./helpers";

async function continueFrom(page: Page, screenId: string, label = "Lanjut") {
  const shell = page.locator("[data-new-intake-shell]");
  await expect(shell).toHaveAttribute("data-new-intake-shell", screenId);
  const button = page.getByRole("button", { name: label, exact: true });
  await expect(button).not.toHaveAttribute("aria-disabled", "true");
  await button.click();
}

test("rich review freezes into the canonical offline 6/4 question preview", async ({
  page,
}) => {
  const requests = collectRequests(page);
  await page.goto("/audit/new-intake?fixture=F1", { waitUntil: "load" });

  await expect(page.locator("[data-new-intake-shell]")).toHaveAttribute(
    "data-new-intake-shell",
    "s-brand",
    { timeout: 5_000 },
  );
  for (const screenId of [
    "s-brand",
    "s-scope",
    "s-category",
    "s-offerings",
    "s-customers",
    "s-service",
    "s-market",
    "s-competitors",
    "s-facts",
  ]) {
    await continueFrom(page, screenId);
  }
  await continueFrom(page, "s-review", "Buat pertanyaan audit");

  const questionScreen = page.locator('[data-bab23="s-questions"]');
  await expect(questionScreen).toBeVisible();
  await expect(questionScreen).toHaveAttribute(
    "data-question-preview-version",
    "1",
  );
  await expect(questionScreen.getByRole("listitem")).toHaveCount(10);
  await expect(
    questionScreen.getByText("6 pertanyaan", { exact: true }),
  ).toBeVisible();
  await expect(
    questionScreen.getByText("4 pertanyaan", { exact: true }),
  ).toBeVisible();
  await expect(
    questionScreen.getByText("4 · Penggunaan penawaran", { exact: true }),
  ).toBeVisible();
  await expect(questionScreen.getByRole("listitem").first()).toContainText(
    "Rekomendasi Kedai kopi susu",
  );
  await expect(questionScreen).not.toContainText(
    "Pertanyaan 1 (Rekomendasi kategori)",
  );

  await page.getByRole("button", { name: "Kembali", exact: true }).click();
  await expect(page.locator("[data-new-intake-shell]")).toHaveAttribute(
    "data-new-intake-shell",
    "s-review",
  );
  await page.locator('[data-correction-target="s-category"]').click();
  await page
    .getByRole("radio", { name: "Coffee shop specialty", exact: true })
    .click();
  await continueFrom(page, "s-category");
  await continueFrom(page, "s-offerings");
  await continueFrom(page, "s-customers");
  await continueFrom(page, "s-competitors");
  await continueFrom(page, "s-review", "Buat pertanyaan audit");

  await expect(questionScreen.getByRole("listitem").first()).toContainText(
    "Rekomendasi Coffee shop specialty",
  );
  await expect(questionScreen.getByRole("listitem").first()).not.toContainText(
    "Kedai kopi susu",
  );
  await expect(questionScreen).toHaveAttribute(
    "data-question-preview-version",
    "2",
  );

  await page.getByRole("button", { name: "Kembali", exact: true }).click();
  await expect(page.locator("[data-new-intake-shell]")).toHaveAttribute(
    "data-new-intake-shell",
    "s-review",
  );
  await page.getByRole("button", { name: "Kembali", exact: true }).click();
  await expect(page.locator("[data-new-intake-shell]")).toHaveAttribute(
    "data-new-intake-shell",
    "s-facts",
  );
  await page
    .getByRole("textbox", { name: "Satu fakta yang wajib benar" })
    .fill("Buka setiap hari pukul 07.00.");
  await continueFrom(page, "s-facts");
  await continueFrom(page, "s-review", "Buat pertanyaan audit");
  await expect(questionScreen).toHaveAttribute(
    "data-question-preview-version",
    "3",
  );

  await questionScreen
    .getByRole("button", { name: "Ubah pertanyaan 1", exact: true })
    .click();
  await questionScreen
    .getByRole("textbox", { name: "Pertanyaan 1", exact: true })
    .fill("Apakah Kopi-Sudut cocok?");
  await questionScreen
    .getByRole("button", { name: "Simpan", exact: true })
    .click();
  await expect(questionScreen.getByRole("alert")).toContainText(
    "Pertanyaan 1 tidak boleh menyebut bisnis Anda.",
  );
  const auditButton = page.getByRole("button", {
    name: "Mulai audit",
    exact: true,
  });
  await expect(auditButton).toHaveAttribute("aria-disabled", "true");

  await questionScreen
    .getByRole("button", { name: "Batal", exact: true })
    .click();
  await questionScreen
    .getByRole("button", { name: "Ubah pertanyaan 7", exact: true })
    .click();
  await questionScreen
    .getByRole("textbox", { name: "Pertanyaan 7", exact: true })
    .fill("Apakah Kopi Sudut bisa dihubungi di owner@example.com?");
  await questionScreen
    .getByRole("button", { name: "Simpan", exact: true })
    .click();
  await expect(questionScreen.getByRole("alert")).toContainText(
    "Pertanyaan ini berisi data pribadi atau rahasia",
  );
  await expect(
    page.getByRole("button", { name: "Mulai audit", exact: true }),
  ).toHaveAttribute("aria-disabled", "true");

  await questionScreen
    .getByRole("button", { name: "Batal", exact: true })
    .click();
  await questionScreen
    .getByRole("button", { name: "Ubah pertanyaan 7", exact: true })
    .click();
  await questionScreen
    .getByRole("textbox", { name: "Pertanyaan 7", exact: true })
    .fill("Apakah Kopi Sudut meminta nomor paspor pelanggan?");
  await questionScreen
    .getByRole("button", { name: "Simpan", exact: true })
    .click();
  await expect(questionScreen.getByRole("alert")).toContainText(
    "Pertanyaan ini meminta atau menampilkan data pribadi",
  );
  await expect(
    page.getByRole("button", { name: "Mulai audit", exact: true }),
  ).toHaveAttribute("aria-disabled", "true");

  await assertNoSideEffects(page, requests);
});

test("scope save visits only the new target and invalid comparators", async ({
  page,
}) => {
  await page.goto("/audit/new-intake?fixture=F1", { waitUntil: "load" });
  await expect(page.locator("[data-new-intake-shell]")).toHaveAttribute(
    "data-new-intake-shell",
    "s-brand",
    { timeout: 10_000 },
  );

  for (const screen of [
    "s-brand",
    "s-scope",
    "s-category",
    "s-offerings",
    "s-customers",
    "s-service",
    "s-market",
    "s-competitors",
    "s-facts",
  ]) {
    await continueFrom(page, screen);
  }

  await page.locator('[data-correction-target="s-scope"]').click();
  await page.getByRole("radio", { name: /Satu produk atau layanan/ }).click();
  await continueFrom(page, "s-scope");

  await page
    .getByRole("textbox", { name: "Nama produk atau layanan" })
    .fill("Paket Minum Kantor");
  await page.getByRole("button", { name: "Tambah", exact: true }).click();
  await continueFrom(page, "s-product");

  await expect(page.locator("[data-new-intake-shell]")).toHaveAttribute(
    "data-new-intake-shell",
    "s-competitors",
  );
  await continueFrom(page, "s-competitors");
  await expect(page.locator("[data-new-intake-shell]")).toHaveAttribute(
    "data-new-intake-shell",
    "s-review",
  );
});

test("scope-edit cancel restores the snapshot and returns to Review by identity", async ({
  page,
}) => {
  await page.goto("/audit/new-intake?fixture=F1", { waitUntil: "load" });
  await expect(page.locator("[data-new-intake-shell]")).toHaveAttribute(
    "data-new-intake-shell",
    "s-brand",
    { timeout: 5_000 },
  );
  for (const screenId of [
    "s-brand",
    "s-scope",
    "s-category",
    "s-offerings",
    "s-customers",
    "s-service",
    "s-market",
    "s-competitors",
    "s-facts",
  ]) {
    await continueFrom(page, screenId);
  }

  const review = page.locator('[data-bab23="s-review"]');
  await review.locator('[data-correction-target="s-scope"]').click();
  await page.getByRole("radio", { name: /Satu lokasi/ }).click();
  await continueFrom(page, "s-scope");
  await expect(page.locator("[data-new-intake-shell]")).toHaveAttribute(
    "data-new-intake-shell",
    "s-branch",
  );
  await page.getByRole("button", { name: "Kembali", exact: true }).click();

  await expect(page.locator("[data-new-intake-shell]")).toHaveAttribute(
    "data-new-intake-shell",
    "s-review",
  );
  await expect(review).toContainText("Seluruh brand Kopi Sudut");
  await expect(review.getByText("Target audit", { exact: true })).toHaveCount(
    0,
  );
});

test("product review maps the selected product without reviving general offerings", async ({
  page,
}) => {
  const requests = collectRequests(page);
  await page.goto("/audit/new-intake?fixture=F1&scope=produk", {
    waitUntil: "load",
  });

  await expect(page.locator("[data-new-intake-shell]")).toHaveAttribute(
    "data-new-intake-shell",
    "s-brand",
    { timeout: 5_000 },
  );
  await continueFrom(page, "s-brand");
  await expect(page.locator("[data-new-intake-shell]")).toHaveAttribute(
    "data-new-intake-shell",
    "s-scope",
  );
  await page.getByRole("radio", { name: /Satu produk atau layanan/ }).click();
  await continueFrom(page, "s-scope");

  await expect(page.locator("[data-new-intake-shell]")).toHaveAttribute(
    "data-new-intake-shell",
    "s-product",
  );
  await page
    .getByRole("textbox", { name: "Nama produk atau layanan" })
    .fill("Paket Minum Kantor");
  await page.getByRole("button", { name: "Tambah", exact: true }).click();
  await continueFrom(page, "s-product");

  for (const screenId of [
    "s-category",
    "s-customers",
    "s-service",
    "s-market",
    "s-competitors",
    "s-facts",
  ]) {
    await continueFrom(page, screenId);
  }

  const review = page.locator('[data-bab23="s-review"]');
  await expect(review).toContainText("Paket Minum Kantor");
  await expect(
    review.locator('[data-correction-target="s-product"]'),
  ).toHaveCount(2);
  await expect(
    review.locator('[data-correction-target="s-offerings"]'),
  ).toHaveCount(0);
  await continueFrom(page, "s-review", "Buat pertanyaan audit");

  const questionScreen = page.locator('[data-bab23="s-questions"]');
  await expect(questionScreen.getByRole("listitem")).toHaveCount(10);
  await expect(questionScreen).toContainText("Paket Minum Kantor");
  await expect(questionScreen).not.toContainText("Kopi Susu Sudut");

  await assertNoSideEffects(page, requests);
});
