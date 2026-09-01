import { expect, test } from "@playwright/test";
import { grantAccess } from "./helpers";

const SOURCE = "https://example.com/";

function identityPayload() {
  return {
    display_name: "Example Business",
    description: "Kedai kopi untuk bekerja dan bertemu.",
    canonical_url: SOURCE,
    icon_data_url: null,
    source_type: "website",
    confidence: true,
  };
}

async function stubPrePaymentApis(page: Parameters<typeof grantAccess>[0]) {
  let identityCalls = 0;
  let extractionPostCalls = 0;

  await page.route("**/api/audit/identity*", async (route) => {
    identityCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 100));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(identityPayload()),
    });
  });

  await page.route("**/api/audit/extract", async (route) => {
    if (route.request().method() === "POST") {
      extractionPostCalls += 1;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Pre-payment extraction was called." }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ limit_usd: 5, carryover_cost_usd: 0, calls: [] }),
    });
  });

  return {
    identityCalls: () => identityCalls,
    extractionPostCalls: () => extractionPostCalls,
  };
}

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

test("Gate 1 runs /audit/v2 through identity, order, and simulated checkout without extraction", async ({
  page,
}) => {
  const calls = await stubPrePaymentApis(page);
  await page.goto("/audit/v2");

  await expect(
    page.getByRole("heading", { name: "Cek bisnis Anda di AI" }),
  ).toBeVisible();
  await page
    .getByPlaceholder("https://bisnisanda.com")
    .fill("example.com");
  await page
    .getByRole("button", { name: "Cek bisnis saya di AI" })
    .click();

  await expect(
    page.getByRole("heading", { name: "Membaca identitas bisnis" }),
  ).toBeVisible();
  await expect(
    page.getByText("Memeriksa sumber publik", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pratinjau identitas bisnis" }),
  ).toBeVisible();
  await expect(
    page.getByText("Example Business", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Kedai kopi untuk bekerja dan bertemu.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(SOURCE, { exact: true })).toBeVisible();
  await expect(page.getByText("Bisnis Anda muncul di X dari 10 pertanyaan")).toHaveCount(0);
  await expect(page.getByText("Skor Visibilitas AI")).toHaveCount(0);
  expect(calls.identityCalls()).toBe(1);
  expect(calls.extractionPostCalls()).toBe(0);

  await page.getByRole("button", { name: "Ubah sumber" }).click();
  await expect(
    page.getByRole("heading", { name: "Cek bisnis Anda di AI" }),
  ).toBeVisible();
  expect(calls.extractionPostCalls()).toBe(0);

  await page
    .getByPlaceholder("https://bisnisanda.com")
    .fill("example.com");
  await page
    .getByRole("button", { name: "Cek bisnis saya di AI" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pratinjau identitas bisnis" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Lanjut ke ringkasan pesanan" })
    .click();

  await expect(
    page.getByRole("heading", { name: "Ringkasan pesanan" }),
  ).toBeVisible();
  await expect(page.getByText("Rp99.000", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Tidak ada biaya tambahan Nuave.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Harga ini berlaku selama 30 hari\./),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Syarat dan Ketentuan" })).toHaveAttribute(
    "href",
    "/terms",
  );
  await expect(page.getByRole("link", { name: "Kebijakan Privasi" })).toHaveAttribute(
    "href",
    "/privacy",
  );

  const email = page.getByLabel("Email penerima laporan*");
  await email.fill("not-an-email");
  await page
    .getByRole("button", { name: "Lanjut ke pembayaran" })
    .click();
  await expect(
    page.getByText("Masukkan alamat email yang valid.", { exact: true }),
  ).toBeVisible();
  await expect(email).toBeFocused();
  expect(calls.extractionPostCalls()).toBe(0);

  await email.fill("owner@example.com");
  await page
    .getByRole("button", { name: "Lanjut ke pembayaran" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Simulasi pembayaran" }),
  ).toBeVisible();
  await expect(
    page.getByText("Ini bukan pembayaran nyata. Tidak ada tagihan.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(calls.extractionPostCalls()).toBe(0);

  await page
    .getByRole("button", { name: "Kembali ke ringkasan pesanan" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ringkasan pesanan" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Lanjut ke pembayaran" })
    .click();

  await page
    .getByRole("button", { name: "Selesaikan simulasi pembayaran" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Memproses simulasi pembayaran" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pembayaran simulasi selesai" }),
  ).toBeVisible();
  await expect(
    page.getByText("Pembayaran simulasi selesai. Tidak ada tagihan.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(calls.extractionPostCalls()).toBe(0);
});

test("identity scan failure stays recoverable and still does not call extraction", async ({
  page,
}) => {
  let identityCalls = 0;
  let extractionPostCalls = 0;
  await page.route("**/api/audit/identity*", async (route) => {
    identityCalls += 1;
    if (identityCalls === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Synthetic identity outage.",
          code: "SOURCE_UNAVAILABLE",
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(identityPayload()),
    });
  });
  await page.route("**/api/audit/extract", async (route) => {
    if (route.request().method() === "POST") extractionPostCalls += 1;
    await route.abort();
  });

  await page.goto("/audit/v2");
  await page.getByPlaceholder("https://bisnisanda.com").fill("example.com");
  await page.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
  await expect(
    page.getByRole("heading", { name: "Membaca identitas bisnis" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Sumber publik belum dapat dibaca. Periksa link lalu coba lagi.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Coba lagi" })).toBeVisible();
  expect(extractionPostCalls).toBe(0);

  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(
    page.getByRole("heading", { name: "Pratinjau identitas bisnis" }),
  ).toBeVisible();
  expect(identityCalls).toBe(2);
  expect(extractionPostCalls).toBe(0);
});
