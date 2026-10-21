import { expect, test, type Page } from "@playwright/test";
import {
  backButton,
  cancelReviewSheet,
  CONFIRM_BRAND,
  confirmFocus,
  continueToOrder,
  E2E_TEST_PASS_CODE,
  emailInput,
  expectBrandConfirm,
  expectFocusScreen,
  expectIntroBusiness,
  expectOrderScreen,
  expectOrderSummaryPrice,
  expectStepsScreen,
  expectSummary,
  fillEntry,
  INTAKE_SESSION_KEY,
  intakeSession,
  NAME_LOCKED_NOTE,
  openReviewSheet,
  ORDER_EMAIL,
  orderScreen,
  PAID_HEADING,
  paidReadingScreen,
  payButton,
  payOrder,
  pressKembali,
  pressLanjut,
  pressMulai,
  pressPeriksa,
  READ_HEADING,
  READING_HEADING,
  READING_INTERRUPTED_NOTICE,
  stepsScreen,
  submitOrder,
  TEST_PASS_SESSION_KEY,
  throughDetailScreens,
  trackApiCalls as track,
  useTestPass,
} from "./journey";

// Spec 017 S4d: the payment screens in synthetic mode. The real routes make the
// order and the labelled simulated payment; the Midtrans states a simulated
// payment never produces (waiting, checking, finally unpaid) come from a stubbed
// status answer. No Midtrans, no provider and no real email is involved.

const MIDTRANS_PAGE =
  "https://app.sandbox.midtrans.com/snap/v4/redirection/e2e";
const NUMBER = "NV-7K3Q9P";

test.beforeEach(async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Only this app's own origin: the Midtrans address is never visited.
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === new URL(baseURL!).origin
      ? route.continue()
      : route.abort(),
  );
});

/** Entry → free check → business found (J05) → three steps (J06) →
 * checkout (J07). */
async function toOrderScreen(page: Page) {
  await fillEntry(page);
  await pressPeriksa(page);
  await expectBrandConfirm(page);
  await continueToOrder(page);
}

async function stubStatus(
  page: Page,
  payment: Record<string, unknown>,
  state = "open",
) {
  await page.route("**/api/orders/status", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        state,
        completed: 0,
        total: 10,
        questions: [],
        payment,
      }),
    }),
  );
}

/** Make a real order, then leave it unpaid: the start-payment answer is a
 * stub, so the customer stands where a returning payer would. */
async function orderLeftForPayment(page: Page) {
  await page.route("**/api/payments/start", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Pembayaran belum bisa dimulai.",
        code: "PAYMENT_START_FAILED",
      }),
    }),
  );
  await toOrderScreen(page);
  await emailInput(page).fill(ORDER_EMAIL);
  await payButton(page).click();
  await expect(orderScreen(page).getByRole("alert")).toContainText(
    "Pembayaran belum bisa dimulai",
  );
  await page.unroute("**/api/payments/start");
}

test("the order summary shows the price, the promise, the Terms and Privacy links and the pay button; the payment is labelled simulated", async ({
  page,
}) => {
  const calls = track(page);
  await fillEntry(page);
  await pressPeriksa(page);
  await expectBrandConfirm(page);
  // J06 sits between the business check and checkout and says the price.
  await page.getByRole("button", { name: CONFIRM_BRAND, exact: true }).click();
  await expectStepsScreen(page);
  await expect(stepsScreen(page)).toContainText("Rp99.000 untuk satu audit");
  // Its back button returns to the business check.
  await backButton(page).click();
  await expectBrandConfirm(page);
  await continueToOrder(page);
  await expectOrderSummaryPrice(page);
  await expect(orderScreen(page)).toContainText("Pembayaran simulasi");
  // Looking at the steps and the summary makes no order and no payment.
  expect(calls["POST /api/orders"]).toBeUndefined();
  expect(calls["POST /api/payments/start"]).toBeUndefined();
  expect(calls["POST /api/audit/extract"]).toBeUndefined();
});

test("pay with the simulated payment: the order number shows, the paid reading starts by itself once, and the website and business are locked", async ({
  page,
}) => {
  const calls = track(page);
  await toOrderScreen(page);
  const number = await payOrder(page);
  expect(number).toMatch(/^NV-[A-Z0-9]{6}$/);
  // J09: no Lanjut is pressed — the paid reading runs on its own.
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: new RegExp(`^(${READING_HEADING}|${READ_HEADING})$`),
    }),
  ).toBeVisible();
  await expect(paidReadingScreen(page)).toContainText("Yang sudah kami temukan");
  await expectIntroBusiness(page);
  expect(calls["POST /api/orders"]).toBe(1);
  expect(calls["POST /api/payments/start"]).toBe(1);
  expect(calls["POST /api/audit/extract"]).toBe(1);
  expect((await intakeSession(page)).order).toMatchObject({
    paid: true,
    number,
  });
  // AC-13: no way back to the business or the website.
  await expect(
    page.getByRole("button", { name: "Kembali", exact: true }),
  ).toHaveCount(0);
  await expect(backButton(page)).toHaveCount(0);
  // Once per order: a reload reads nothing again.
  await page.reload();
  await expectIntroBusiness(page);
  await pressMulai(page);
  await expectFocusScreen(page);
  // Step 2's Kembali only goes back to its own cover.
  await pressKembali(page);
  await expectIntroBusiness(page);
  await expect(
    page.getByRole("button", { name: "Kembali", exact: true }),
  ).toHaveCount(0);
  await pressMulai(page);
  await confirmFocus(page);
  await throughDetailScreens(page);
  await expectSummary(page);
  // None from the review: the Bisnis sheet says the name and website are
  // locked and offers neither change.
  const sheet = await openReviewSheet(page, "Bisnis");
  await expect(sheet.getByText(NAME_LOCKED_NOTE, { exact: true })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Ubah nama" })).toHaveCount(0);
  await expect(
    sheet.getByRole("button", { name: "Ganti website" }),
  ).toHaveCount(0);
  await cancelReviewSheet(page, "Bisnis");
  // The same on a reload: still locked, still one order and one reading.
  await page.reload();
  await expectSummary(page);
  const again = await openReviewSheet(page, "Bisnis");
  await expect(again.getByText(NAME_LOCKED_NOTE, { exact: true })).toBeVisible();
  await expect(
    again.getByRole("button", { name: "Ganti website" }),
  ).toHaveCount(0);
  await cancelReviewSheet(page, "Bisnis");
  expect((await intakeSession(page)).order.paid).toBe(true);
  expect(calls["POST /api/orders"]).toBe(1);
  expect(calls["POST /api/audit/extract"]).toBe(1);
});

test("a paid reading cut off by a reload waits for Lanjut and is never replayed", async ({
  page,
}) => {
  const calls = track(page);
  // The paid reading never answers, so the reload cuts it off.
  await page.route("**/api/audit/extract", () => new Promise(() => {}));
  await toOrderScreen(page);
  await payOrder(page);
  await expect(
    page.getByRole("heading", { level: 1, name: READING_HEADING }),
  ).toBeVisible();
  expect(calls["POST /api/audit/extract"]).toBe(1);
  await page.unroute("**/api/audit/extract");
  await page.reload();
  await expectOrderScreen(page);
  await expect(
    page.getByRole("status").filter({ hasText: READING_INTERRUPTED_NOTICE }),
  ).toBeVisible();
  // The order is kept and paid: no email field and no new payment.
  await expect(emailInput(page)).toHaveCount(0);
  await expect(payButton(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Lanjut", exact: true }),
  ).toBeEnabled();
  // Give a replay every chance to show up: none comes.
  await page.waitForTimeout(1_500);
  expect(calls["POST /api/audit/extract"]).toBe(1);
  await expect(orderScreen(page)).toBeVisible();
  // The customer's own Lanjut reads again, under the same order.
  await pressLanjut(page);
  await expectIntroBusiness(page);
  expect(calls["POST /api/audit/extract"]).toBe(2);
  expect(calls["POST /api/orders"]).toBe(1);
  expect(calls["POST /api/payments/start"]).toBe(1);
});

test("a paid order the server no longer knows shows its number and the support address, never a new order", async ({
  page,
}) => {
  const calls = track(page);
  await toOrderScreen(page);
  const number = await payOrder(page);
  await expectIntroBusiness(page);
  await page.route("**/api/orders/status", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
  );
  await page.reload();
  await expect(orderScreen(page)).toContainText(number);
  await expect(
    orderScreen(page).getByRole("link", { name: "support@nuave.ai" }),
  ).toBeVisible();
  await expect(emailInput(page)).toHaveCount(0);
  await expect(payButton(page)).toHaveCount(0);
  expect(calls["POST /api/orders"]).toBe(1);
  expect(calls["POST /api/payments/start"]).toBe(1);
});

test("a full cap shows the full message and starts no payment", async ({
  page,
}) => {
  await page.route("**/api/payments/start", (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Kuota audit sedang penuh. Coba lagi dalam beberapa jam.",
        code: "CAP_FULL",
      }),
    }),
  );
  await toOrderScreen(page);
  await emailInput(page).fill(ORDER_EMAIL);
  await payButton(page).click();
  await expect(orderScreen(page).getByRole("alert")).toHaveText(
    "Kuota audit sedang penuh. Coba lagi dalam beberapa jam.",
  );
  await expect(page.getByRole("heading", { name: PAID_HEADING })).toHaveCount(
    0,
  );
  // The order is kept, so trying again later reuses it.
  await expect(payButton(page)).toBeVisible();
});

test("waiting, checking and cannot-check states, with Lihat cara bayar and Cek lagi", async ({
  page,
}) => {
  await orderLeftForPayment(page);
  await stubStatus(page, { state: "waiting", redirect_url: MIDTRANS_PAGE });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Menunggu pembayaran" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Lihat cara bayar" }),
  ).toHaveAttribute("href", MIDTRANS_PAGE);
  await page.unroute("**/api/orders/status");

  await stubStatus(page, { state: "checking" });
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Kami sedang memeriksa pembayaran Anda",
    }),
  ).toBeVisible();
  // No new payment is offered while the attempt has no final answer.
  await expect(
    page.getByRole("link", { name: "Lihat cara bayar" }),
  ).toHaveCount(0);
  await expect(payButton(page)).toHaveCount(0);
  await page.unroute("**/api/orders/status");
  await stubStatus(page, { state: "cannot_check" });
  await page.getByRole("button", { name: "Cek lagi" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Status pembayaran belum dapat diperiksa",
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Cek lagi" })).toBeVisible();
});

test("finally unpaid: Coba bayar lagi returns to the summary and starts a replacement order", async ({
  page,
}) => {
  const orderBodies: Array<Record<string, unknown>> = [];
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname === "/api/orders" &&
      request.method() === "POST"
    )
      orderBodies.push(request.postDataJSON() as Record<string, unknown>);
  });
  await orderLeftForPayment(page);
  const firstId = (await intakeSession(page)).order.id as string;
  await stubStatus(page, { state: "unpaid_final" }, "expired");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Pembayaran tidak kami terima" }),
  ).toBeVisible();
  await page.unroute("**/api/orders/status");
  await page.getByRole("button", { name: "Coba bayar lagi" }).click();
  await expectOrderSummaryPrice(page);
  await submitOrder(page);
  await pressMulai(page);
  await expectFocusScreen(page);
  expect(orderBodies).toHaveLength(2);
  expect(orderBodies[1]).toMatchObject({ previous_order_id: firstId });
  expect((await intakeSession(page)).order.id).not.toBe(firstId);
});

test("an order that needs a refund shows the number and support, with no new payment", async ({
  page,
}) => {
  await orderLeftForPayment(page);
  await stubStatus(
    page,
    { state: "needs_refund", order_number: NUMBER },
    "failed",
  );
  await page.reload();
  await expect(orderScreen(page)).toContainText(NUMBER);
  await expect(
    orderScreen(page).getByRole("link", { name: "support@nuave.ai" }),
  ).toBeVisible();
  await expect(payButton(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Coba bayar lagi" }),
  ).toHaveCount(0);
});

test.describe("/uji, the founder test pass", () => {
  test("is unlinked and noindex", async ({ page }) => {
    await page.goto("/");
    const links = await page
      .locator("a")
      .evaluateAll((anchors) =>
        anchors.map((anchor) => anchor.getAttribute("href")),
      );
    expect(links.filter((href) => href?.includes("/uji"))).toEqual([]);
    await page.goto("/uji");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
  });

  test("keeps the code in session storage only, sends it only in the order body and pays nothing", async ({
    page,
  }) => {
    const urls: string[] = [];
    const orderBodies: string[] = [];
    page.on("request", (request) => {
      urls.push(request.url());
      if (new URL(request.url()).pathname === "/api/orders")
        orderBodies.push(request.postData() ?? "");
    });
    const calls = track(page);
    await page.goto("/uji");
    expect(await page.content()).not.toContain(E2E_TEST_PASS_CODE);
    await page.getByLabel("Kode uji").fill(E2E_TEST_PASS_CODE);
    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(page).toHaveURL(/\/audit$/);
    expect(
      await page.evaluate(
        (key) => sessionStorage.getItem(key),
        TEST_PASS_SESSION_KEY,
      ),
    ).toBe(E2E_TEST_PASS_CODE);
    expect(
      await page.evaluate(() => JSON.stringify({ ...localStorage })),
    ).not.toContain(E2E_TEST_PASS_CODE);
    await toOrderScreen(page);
    // No price and no pay button on a test pass.
    await expect(orderScreen(page)).not.toContainText("Rp99.000");
    await expect(payButton(page)).toHaveCount(0);
    await submitOrder(page);
    await pressMulai(page);
    await expectFocusScreen(page);
    expect(calls["POST /api/payments/start"]).toBeUndefined();
    expect(orderBodies).toHaveLength(1);
    expect(orderBodies[0]).toContain(E2E_TEST_PASS_CODE);
    // The code is in no address and no saved intake.
    expect(urls.filter((url) => url.includes(E2E_TEST_PASS_CODE))).toEqual([]);
    expect(JSON.stringify(await intakeSession(page))).not.toContain(
      E2E_TEST_PASS_CODE,
    );
    expect(
      await page.evaluate(
        (key) => localStorage.getItem(key),
        INTAKE_SESSION_KEY,
      ),
    ).not.toContain(E2E_TEST_PASS_CODE);
    // A second tab of the same browser has no code.
    const other = await page.context().newPage();
    await other.goto("/audit");
    expect(
      await other.evaluate(
        (key) => sessionStorage.getItem(key),
        TEST_PASS_SESSION_KEY,
      ),
    ).toBeNull();
  });

  test("a wrong code gets the neutral answer and no order", async ({
    page,
  }) => {
    await page.addInitScript(
      ([key]) =>
        sessionStorage.setItem(key, "a-wrong-code-of-more-than-24-chars"),
      [TEST_PASS_SESSION_KEY] as const,
    );
    await toOrderScreen(page);
    await emailInput(page).fill(ORDER_EMAIL);
    await pressLanjut(page);
    await expect(orderScreen(page).getByRole("alert")).toHaveText(
      "Audit tidak tersedia saat ini.",
    );
    await expect(orderScreen(page)).toBeVisible();
  });
});

test("useTestPass leaves the order unlocked by a payment", async ({ page }) => {
  await useTestPass(page);
  await toOrderScreen(page);
  await submitOrder(page);
  expect((await intakeSession(page)).order.paid).toBeUndefined();
  // A test-pass order can still step back from the Step 2 cover to the
  // business (it is not a paid order).
  await expect(
    page.getByRole("button", { name: "Kembali", exact: true }),
  ).toBeVisible();
  await pressKembali(page);
  await expectBrandConfirm(page);
});
