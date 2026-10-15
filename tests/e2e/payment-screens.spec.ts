import { expect, test, type Page } from "@playwright/test";
import {
  confirmFocus,
  E2E_TEST_PASS_CODE,
  expectBrandConfirm,
  expectFocusScreen,
  expectOrderSummaryPrice,
  expectSummary,
  fillEntry,
  INTAKE_SESSION_KEY,
  intakeSession,
  ORDER_EMAIL,
  ORDER_HEADING,
  orderScreen,
  PAID_HEADING,
  PAY_BUTTON,
  payOrder,
  pressLanjut,
  pressPeriksa,
  reviewRow,
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

async function toOrderScreen(page: Page) {
  await fillEntry(page);
  await pressPeriksa(page);
  await expectBrandConfirm(page);
  await pressLanjut(page);
  await expect(orderScreen(page)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: ORDER_HEADING }),
  ).toBeVisible();
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
  await page.getByRole("textbox", { name: /Email/ }).fill(ORDER_EMAIL);
  await page.getByRole("button", { name: PAY_BUTTON }).click();
  await expect(orderScreen(page).getByRole("alert")).toContainText(
    "Pembayaran belum bisa dimulai",
  );
  await page.unroute("**/api/payments/start");
}

test("the order summary shows the price, the promise, the Terms and Privacy links and the pay button; the payment is labelled simulated", async ({
  page,
}) => {
  const calls = track(page);
  await toOrderScreen(page);
  await expectOrderSummaryPrice(page);
  await expect(orderScreen(page)).toContainText("Pembayaran simulasi");
  // Looking at the summary makes no order and no payment.
  expect(calls["POST /api/orders"]).toBeUndefined();
  expect(calls["POST /api/payments/start"]).toBeUndefined();
});

test("pay with the simulated payment: the order number shows, the intake continues, and the website and business are locked", async ({
  page,
}) => {
  const calls = track(page);
  await toOrderScreen(page);
  const number = await payOrder(page);
  expect(number).toMatch(/^NV-[A-Z0-9]{6}$/);
  expect(calls["POST /api/orders"]).toBe(1);
  expect(calls["POST /api/payments/start"]).toBe(1);
  expect(calls["POST /api/audit/extract"]).toBeUndefined();
  expect((await intakeSession(page)).order).toMatchObject({
    paid: true,
    number,
  });
  await pressLanjut(page);
  await expectFocusScreen(page);
  // AC-13: no way back to the business or the website, and none from the review.
  await expect(
    page.getByRole("button", { name: "Kembali", exact: true }),
  ).toHaveCount(0);
  await confirmFocus(page);
  await throughDetailScreens(page);
  await expectSummary(page);
  await expect(
    reviewRow(page, "Bisnis").getByRole("button", { name: "Ubah" }),
  ).toHaveCount(0);
  await expect(
    reviewRow(page, "Bisnis").getByRole("button", { name: "Ubah website" }),
  ).toHaveCount(0);
  // The same on a reload: still locked, still one order.
  await page.reload();
  await expectSummary(page);
  await expect(
    reviewRow(page, "Bisnis").getByRole("button", { name: "Ubah website" }),
  ).toHaveCount(0);
  expect((await intakeSession(page)).order.paid).toBe(true);
  expect(calls["POST /api/orders"]).toBe(1);
});

test("a paid order the server no longer knows shows its number and the support address, never a new order", async ({
  page,
}) => {
  const calls = track(page);
  await toOrderScreen(page);
  const number = await payOrder(page);
  await pressLanjut(page);
  await expectFocusScreen(page);
  await page.route("**/api/orders/status", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
  );
  await page.reload();
  await expect(orderScreen(page)).toContainText(number);
  await expect(
    orderScreen(page).getByRole("link", { name: "support@nuave.ai" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: /Email/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: PAY_BUTTON })).toHaveCount(0);
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
  await page.getByRole("textbox", { name: /Email/ }).fill(ORDER_EMAIL);
  await page.getByRole("button", { name: PAY_BUTTON }).click();
  await expect(orderScreen(page).getByRole("alert")).toHaveText(
    "Kuota audit sedang penuh. Coba lagi dalam beberapa jam.",
  );
  await expect(page.getByRole("heading", { name: PAID_HEADING })).toHaveCount(
    0,
  );
  // The order is kept, so trying again later reuses it.
  await expect(page.getByRole("button", { name: PAY_BUTTON })).toBeVisible();
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
  await expect(page.getByRole("button", { name: PAY_BUTTON })).toHaveCount(0);
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
  await expect(page.getByRole("button", { name: PAY_BUTTON })).toHaveCount(0);
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
    await expect(page.getByRole("button", { name: PAY_BUTTON })).toHaveCount(0);
    await submitOrder(page);
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
    await page.getByRole("textbox", { name: /Email/ }).fill(ORDER_EMAIL);
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
  await expectFocusScreen(page);
  expect((await intakeSession(page)).order.paid).toBeUndefined();
  // A test-pass order can still step back (it is not a paid order).
  await expect(
    page.getByRole("button", { name: "Kembali", exact: true }),
  ).toBeVisible();
});
