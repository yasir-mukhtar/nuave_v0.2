import { expect, test } from "@playwright/test";
import { grantAccess } from "./helpers";

const SOURCE = "https://example.com/";
const IDENTITY_ICON =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function identityPayload() {
  return {
    display_name: "Example Business",
    description: "Kedai kopi untuk bekerja dan bertemu.",
    canonical_url: SOURCE,
    icon_data_url: IDENTITY_ICON,
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
  await expect(
    page.locator('[data-stage="identity-preview"] img[alt=""]'),
  ).toHaveCount(1);
  await expect(page.getByText("Terbaca", { exact: true })).toBeVisible();
  const illustrativeReport = page.getByRole("region", {
    name: "Contoh laporan ilustratif",
  });
  await expect(illustrativeReport).toBeVisible();
  await expect(
    illustrativeReport.getByText("Contoh laporan", { exact: true }),
  ).toBeVisible();
  await expect(
    illustrativeReport.getByText("Ilustrasi", { exact: true }),
  ).toBeVisible();
  const illustrativeResult = illustrativeReport.locator(
    "[data-illustrative-result]",
  );
  await expect(illustrativeResult).toHaveAttribute("aria-hidden", "true");
  await expect(illustrativeResult).toContainText(
    "Bisnis Anda muncul di X dari 10 pertanyaan",
  );
  await expect(illustrativeResult).toContainText(
    "Tanpa menyebut bisnis Anda: …/6",
  );
  await expect(illustrativeResult).toContainText(
    "Menyebut bisnis Anda: …/4",
  );
  await expect(illustrativeResult).not.toContainText("Example Business");
  await expect(illustrativeResult).not.toContainText(SOURCE);
  const resultPresentation = await illustrativeResult.evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return {
      filter: styles.filter,
      pointerEvents: styles.pointerEvents,
      userSelect: styles.userSelect,
    };
  });
  expect(resultPresentation.filter).toMatch(/blur/);
  expect(resultPresentation.pointerEvents).toBe("none");
  expect(resultPresentation.userSelect).toBe("none");
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

test("preview floating pay bar is safe, responsive, and opens order first", async ({
  page,
}) => {
  const calls = await stubPrePaymentApis(page);

  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/audit/v2");
    await page.getByPlaceholder("https://bisnisanda.com").fill("example.com");
    await page.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
    await expect(
      page.getByRole("heading", { name: "Pratinjau identitas bisnis" }),
    ).toBeVisible();

    const payBar = page.getByRole("region", {
      name: "Aksi pembayaran simulasi",
    });
    await expect(payBar).toBeVisible();
    await expect(payBar.getByText("Rp99.000", { exact: true })).toBeVisible();
    await expect(
      payBar.getByText("Simulasi — tidak ada tagihan", { exact: true }),
    ).toBeVisible();
    const payButton = payBar.getByRole("button", { name: "Bayar sekarang" });
    await expect(payButton).toBeVisible();
    const box = await payButton.boundingBox();
    expect(box, `floating pay button on ${viewport.width}px`).not.toBeNull();
    expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(44);
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44);
    expect(calls.extractionPostCalls()).toBe(0);

    await payButton.click();
    await expect(
      page.getByRole("heading", { name: "Ringkasan pesanan" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Simulasi pembayaran" }),
    ).toHaveCount(0);
    expect(calls.extractionPostCalls()).toBe(0);
  }
});
test("identity scan failure and rapid retry stay recoverable without extraction", async ({
  page,
}) => {
  let identityCalls = 0;
  let activeIdentityRequests = 0;
  let maxConcurrentIdentityRequests = 0;
  let extractionPostCalls = 0;
  let releaseFirstIdentityRequest = () => {};
  let releaseSecondIdentityRequest = () => {};
  const firstIdentityRequest = new Promise<void>((resolve) => {
    releaseFirstIdentityRequest = resolve;
  });
  const secondIdentityRequest = new Promise<void>((resolve) => {
    releaseSecondIdentityRequest = resolve;
  });
  await page.route("**/api/audit/identity*", async (route) => {
    identityCalls += 1;
    activeIdentityRequests += 1;
    maxConcurrentIdentityRequests = Math.max(
      maxConcurrentIdentityRequests,
      activeIdentityRequests,
    );
    try {
      if (identityCalls === 1) {
        await firstIdentityRequest;
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
      await secondIdentityRequest;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(identityPayload()),
      });
    } finally {
      activeIdentityRequests -= 1;
    }
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
  const scanStatus = page.locator(
    '[data-stage="identity-scan"] [role="status"]',
  );
  await expect(scanStatus).toHaveAttribute("aria-busy", "true");
  await expect(scanStatus.locator("svg.animate-spin")).toHaveCount(1);
  releaseFirstIdentityRequest();
  await expect(
    page.getByText(
      "Sumber publik belum dapat dibaca. Periksa link lalu coba lagi.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Ubah sumber" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Coba lagi" })).toBeVisible();
  await expect(scanStatus).toHaveAttribute("aria-busy", "false");
  await expect(scanStatus.locator("svg.animate-spin")).toHaveCount(0);
  expect(extractionPostCalls).toBe(0);

  const retryButton = page.getByRole("button", { name: "Coba lagi" });
  await retryButton.evaluate((element) => {
    // Model two rapid native clicks before the pending request resolves.
    const button = element as HTMLButtonElement;
    button.click();
    button.click();
  });
  await expect.poll(() => identityCalls).toBe(2);
  await expect(scanStatus).toHaveAttribute("aria-busy", "true");
  await expect(scanStatus.locator("svg.animate-spin")).toHaveCount(1);
  releaseSecondIdentityRequest();
  await expect(
    page.getByRole("heading", { name: "Pratinjau identitas bisnis" }),
  ).toBeVisible();
  expect(identityCalls).toBe(2);
  expect(maxConcurrentIdentityRequests).toBe(1);
  expect(activeIdentityRequests).toBe(0);
  expect(extractionPostCalls).toBe(0);
});

test("identity scan failure can return to source entry without extraction", async ({
  page,
}) => {
  let identityCalls = 0;
  let extractionPostCalls = 0;

  await page.route("**/api/audit/identity*", async (route) => {
    identityCalls += 1;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Synthetic identity outage.",
        code: "SOURCE_UNAVAILABLE",
      }),
    });
  });
  await page.route("**/api/audit/extract", async (route) => {
    if (route.request().method() === "POST") extractionPostCalls += 1;
    await route.abort();
  });

  await page.goto("/audit/v2");
  await page.getByPlaceholder("https://bisnisanda.com").fill("example.com");
  await page.getByRole("button", { name: "Cek bisnis saya di AI" }).click();

  const scanStage = page.locator('[data-stage="identity-scan"]');
  const scanStatus = scanStage.getByRole("status");
  await expect(
    page.getByText(
      "Sumber publik belum dapat dibaca. Periksa link lalu coba lagi.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(scanStatus).toHaveAttribute("aria-busy", "false");
  await expect(scanStatus.locator("svg.animate-spin")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ubah sumber" })).toBeVisible();

  await page.getByRole("button", { name: "Ubah sumber" }).click();
  await expect(
    page.getByRole("heading", { name: "Cek bisnis Anda di AI" }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("https://bisnisanda.com")).toHaveValue("");
  await expect(
    page.getByText(
      "Sumber publik belum dapat dibaca. Periksa link lalu coba lagi.",
      { exact: true },
    ),
  ).toHaveCount(0);
  await expect(scanStage).toHaveCount(0);
  expect(identityCalls).toBe(1);
  expect(extractionPostCalls).toBe(0);
});
