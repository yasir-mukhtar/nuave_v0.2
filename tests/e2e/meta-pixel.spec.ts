import { expect, test, type Page } from "@playwright/test";
import { grantAccess } from "./helpers";
import {
  continueToOrder,
  emailInput,
  expectBrandConfirm,
  fillEntry,
  FICTIONAL_BUSINESS,
  ORDER_EMAIL,
  payButton,
  payOrder,
  pressPeriksa,
} from "./journey";

// Spec 019 in a real browser, built with a fake Pixel ID: the notice, the
// choice, the footer link, and the four events. Meta's script address is
// answered with an empty stub; any other outside address is refused.

const META_SCRIPT = "https://connect.facebook.net/en_US/fbevents.js";

function notice(page: Page) {
  return page.getByRole("region", { name: "🍪 Allow ad cookies?" });
}

async function setUp(page: Page, baseURL: string) {
  await grantAccess(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const meta: string[] = [];
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (new URL(url).origin === new URL(baseURL).origin)
      return route.continue();
    meta.push(url);
    if (url === META_SCRIPT)
      return route.fulfill({
        status: 200,
        contentType: "application/javascript",
        // Records the page address each later call sees, as Meta's script
        // sends it with every event.
        body: "window.__pixelHrefs = []; window.fbq.callMethod = function () { window.__pixelHrefs.push(location.href); window.fbq.queue.push(Array.prototype.slice.call(arguments)); };",
      });
    return route.abort();
  });
  return meta;
}

/** Every call the page made to the Pixel, in order. */
function pixelCalls(page: Page) {
  return page.evaluate(
    () =>
      ((window as unknown as { fbq?: { queue: unknown[][] } }).fbq?.queue ??
        []) as unknown[][],
  );
}

async function tracked(page: Page) {
  return (await pixelCalls(page)).filter((call) => call[0] === "track");
}

test("before a choice nothing loads from Meta; Allow loads the Pixel and sends PageView, also after a reload", async ({
  page,
  baseURL,
}) => {
  const meta = await setUp(page, baseURL!);
  await page.goto("/");
  await expect(notice(page)).toBeVisible();
  await expect(notice(page)).toContainText(
    "Your report and answers are never shared.",
  );
  await expect(
    page.getByRole("button", { name: "Pengaturan cookie" }),
  ).toBeVisible();
  await page.waitForTimeout(300);
  expect(meta).toEqual([]);

  await notice(page)
    .getByRole("button", { name: "Allow", exact: true })
    .click();
  await expect(notice(page)).toHaveCount(0);
  await expect.poll(() => meta).toEqual([META_SCRIPT]);
  expect(await pixelCalls(page)).toEqual([
    ["set", "autoConfig", false, "123456789012345"],
    ["init", "123456789012345"],
    ["track", "PageView"],
  ]);

  await page.reload();
  await expect(notice(page)).toHaveCount(0);
  await expect.poll(() => tracked(page)).toEqual([["track", "PageView"]]);
});

test("Don't allow loads nothing, now or after a reload; Pengaturan cookie reopens the choice", async ({
  page,
  baseURL,
}) => {
  const meta = await setUp(page, baseURL!);
  await page.goto("/faq");
  await notice(page).getByRole("button", { name: "Don't allow" }).click();
  await expect(notice(page)).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(notice(page)).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(meta).toEqual([]);

  await page.getByRole("button", { name: "Pengaturan cookie" }).click();
  await expect(notice(page)).toBeVisible();
  await expect(notice(page)).toContainText("Your choice now: Don't allow");
});

for (const path of ["/r", "/uji"]) {
  test(`${path} never shows the notice or loads the Pixel, even after Allow`, async ({
    page,
    baseURL,
  }) => {
    const meta = await setUp(page, baseURL!);
    await page.goto("/");
    await notice(page)
      .getByRole("button", { name: "Allow", exact: true })
      .click();
    await expect.poll(() => meta).toEqual([META_SCRIPT]);
    meta.length = 0;

    await page.goto(path);
    await page.waitForTimeout(500);
    await expect(notice(page)).toHaveCount(0);
    expect(meta).toEqual([]);
    expect(await pixelCalls(page)).toEqual([]);
  });
}

test("the journey sends Lead, InitiateCheckout and Purchase once each, with value and currency only", async ({
  page,
  baseURL,
}) => {
  await setUp(page, baseURL!);
  // Spec 022 AC-07: the paid screen asks the server for the Purchase once,
  // in the background.
  const serverAsks: unknown[] = [];
  await page.route("**/api/meta/purchase", async (route) => {
    serverAsks.push(route.request().postDataJSON());
    await route.continue();
  });
  const paidAnswers: Array<{ purchase_event_id?: string }> = [];
  page.on("response", async (response) => {
    if (!response.url().endsWith("/api/orders/status")) return;
    const body = (await response.json().catch(() => null)) as {
      payment?: { state?: string; purchase_event_id?: string };
    } | null;
    if (body?.payment?.state === "paid") paidAnswers.push(body.payment);
  });
  await page.goto("/");
  await notice(page)
    .getByRole("button", { name: "Allow", exact: true })
    .click();

  await fillEntry(page);
  await pressPeriksa(page);
  await expectBrandConfirm(page);
  await continueToOrder(page);
  await payOrder(page);

  await expect
    .poll(async () =>
      (await tracked(page)).filter((call) => call[1] !== "PageView"),
    )
    .toEqual([
      ["track", "Lead"],
      ["track", "InitiateCheckout", { value: 249000, currency: "IDR" }],
      [
        "track",
        "Purchase",
        { value: 249000, currency: "IDR" },
        { eventID: expect.stringMatching(/^[0-9a-f-]{36}$/) },
      ],
    ]);
  // The Pixel's event code is the one the server gave for this order.
  const purchase = (await tracked(page)).find(
    (call) => call[1] === "Purchase",
  )!;
  const eventId = (purchase[3] as { eventID: string }).eventID;
  expect(paidAnswers.at(-1)?.purchase_event_id).toBe(eventId);
  await expect.poll(() => serverAsks.length).toBe(1);
  expect(serverAsks[0]).toEqual({
    order_id: expect.stringMatching(/^[0-9a-f]{32}$/),
    consent_version: expect.any(String),
  });

  const everything = JSON.stringify(await pixelCalls(page));
  expect(everything).not.toContain(ORDER_EMAIL);
  expect(everything).not.toContain(FICTIONAL_BUSINESS.name);
  expect(everything).not.toContain("kedai-fiksi");
  expect(everything).not.toMatch(/NV-[A-Z0-9]{6}/);

  // A reload of the paid order sends no second Purchase: once the page has
  // asked the server for the order again, nothing more was sent.
  const statusAsked = page.waitForResponse("**/api/orders/status");
  await page.reload();
  await statusAsked;
  await page.waitForTimeout(500);
  expect(
    (await tracked(page)).filter((call) => call[1] !== "PageView"),
  ).toEqual([]);
  expect(serverAsks).toHaveLength(1);
});

test("Spec 022 AC-07: a server call that hangs never holds up the paid screen or the next step", async ({
  page,
  baseURL,
}) => {
  await setUp(page, baseURL!);
  let asked = 0;
  // The call never answers.
  await page.route("**/api/meta/purchase", () => {
    asked += 1;
  });
  await page.goto("/");
  await notice(page)
    .getByRole("button", { name: "Allow", exact: true })
    .click();
  await fillEntry(page);
  await pressPeriksa(page);
  await expectBrandConfirm(page);
  await continueToOrder(page);
  await payOrder(page);
  await expect.poll(() => asked).toBe(1);
  // The journey carries on to the next step while the call still hangs.
  await expect(
    page.getByRole("heading", { level: 1, name: "Ceritakan bisnis Anda" }),
  ).toBeVisible();
});

test("Spec 022 AC-08: with Don't allow the paid screen asks the server nothing", async ({
  page,
  baseURL,
}) => {
  await setUp(page, baseURL!);
  let asked = 0;
  await page.route("**/api/meta/purchase", (route) => {
    asked += 1;
    return route.fulfill({ status: 204 });
  });
  await page.goto("/");
  await notice(page).getByRole("button", { name: "Don't allow" }).click();
  await fillEntry(page);
  await pressPeriksa(page);
  await expectBrandConfirm(page);
  await continueToOrder(page);
  await payOrder(page);
  const statusAsked = page.waitForResponse("**/api/orders/status");
  await page.reload();
  await statusAsked;
  await page.waitForTimeout(500);
  expect(asked).toBe(0);
});

for (const size of [
  { name: "a phone", width: 390, height: 844 },
  { name: "a laptop", width: 1280, height: 800 },
]) {
  test(`the notice links to the privacy page's cookie section on ${size.name}, with both choices still tappable and nothing from Meta`, async ({
    page,
    baseURL,
  }) => {
    const meta = await setUp(page, baseURL!);
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto("/audit");
    await expect(
      notice(page).getByRole("link", { name: "Privacy policy" }),
    ).toHaveAttribute("href", "/privacy#cookie");
    for (const name of ["Allow", "Don't allow"]) {
      const button = notice(page).getByRole("button", { name, exact: true });
      await expect(button).toBeInViewport();
    }
    await page.waitForTimeout(300);
    expect(meta).toEqual([]);
    await notice(page)
      .getByRole("button", { name: "Don't allow" })
      .click({ trial: true });
  });
}

test("back from Midtrans, the order number leaves the address before the Pixel sees it", async ({
  page,
  baseURL,
}) => {
  const meta = await setUp(page, baseURL!);
  await page.goto("/");
  await notice(page)
    .getByRole("button", { name: "Allow", exact: true })
    .click();
  await expect.poll(() => meta).toEqual([META_SCRIPT]);

  await page.goto(
    "/audit?order_id=NV-ABC123-1&status_code=200&transaction_status=settlement&utm_source=meta",
  );
  await expect.poll(() => tracked(page)).toEqual([["track", "PageView"]]);
  expect(new URL(page.url()).search).toBe("?utm_source=meta");
  // The queued PageView was made after the address was cleaned, and every
  // call since sees the clean address. Wait for the stand-in Meta script
  // first: a call made before it runs only joins the queue.
  await page.waitForFunction(() =>
    Array.isArray(
      (window as unknown as { __pixelHrefs?: unknown }).__pixelHrefs,
    ),
  );
  await page.evaluate(() =>
    (window as unknown as { fbq: (...args: unknown[]) => void }).fbq(
      "track",
      "Probe",
    ),
  );
  const hrefs = await page.evaluate(
    () => (window as unknown as { __pixelHrefs: string[] }).__pixelHrefs,
  );
  expect(hrefs.length).toBeGreaterThan(0);
  expect(hrefs.join(" ")).not.toContain("NV-");
});

// R-14 on a long page (/faq) and a short one (/), whose last controls need
// the room at the page's end to scroll clear of the notice.
for (const path of ["/faq", "/"]) {
  test(`on a phone, Tab never leaves a focused control on ${path} behind the open notice (R-14)`, async ({
    page,
    baseURL,
  }) => {
    await setUp(page, baseURL!);
    await page.goto(path);
    await expect(notice(page)).toBeVisible();
    for (let stop = 1; stop <= 30; stop += 1) {
      await page.keyboard.press("Tab");
      const hidden = await page.evaluate(() => {
        const focused = document.activeElement;
        const box = document.querySelector("[data-cookie-notice]");
        if (!(focused instanceof HTMLElement) || !box || box.contains(focused))
          return null;
        return focused.getBoundingClientRect().top >=
          box.getBoundingClientRect().top
          ? (focused.textContent ?? "").trim() || focused.tagName
          : null;
      });
      expect(hidden, `Tab stop ${stop}`).toBeNull();
    }
  });
}

test("on /audit the notice sits above the journey's bottom bar, so its buttons stay usable (R-14)", async ({
  page,
  baseURL,
}) => {
  await setUp(page, baseURL!);
  await fillEntry(page);
  await expect(notice(page)).toBeVisible();
  await pressPeriksa(page);
  await expectBrandConfirm(page);
  // No choice made yet: the bar's buttons are still in view and tappable.
  await continueToOrder(page);
  await expect(payButton(page)).toBeVisible();
  const { payTop, cardBottom } = await page.evaluate(() => ({
    payTop: [...document.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("Bayar Rp249.000"))!
      .getBoundingClientRect().top,
    cardBottom: document
      .querySelector("[data-cookie-notice] > div")!
      .getBoundingClientRect().bottom,
  }));
  expect(payTop).toBeGreaterThanOrEqual(cardBottom);
});

// A touch screen with no on-screen keyboard (a tablet with a keyboard case):
// the keyboard bar floats over the page instead of riding on a keyboard.
test.describe("on a touch screen", () => {
  test.use({ hasTouch: true, isMobile: true });

  test("on /audit the keyboard bar floats above the open notice, so its buttons stay usable (R-14)", async ({
    page,
    baseURL,
  }) => {
    await setUp(page, baseURL!);
    await fillEntry(page);
    await expect(notice(page)).toBeVisible();
    await pressPeriksa(page);
    await expectBrandConfirm(page);
    await continueToOrder(page);
    await emailInput(page).tap();
    const bar = page.getByRole("group", { name: "Bantuan mengetik email" });
    const bayar = bar.getByRole("button", { name: "Bayar", exact: true });
    await expect(bayar).toBeVisible();
    // Once its entrance has settled, the bar sits wholly above the notice,
    // and a tap on its Bayar reaches Bayar.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document
              .querySelector(
                '[role="group"][aria-label="Bantuan mengetik email"]',
              )!
              .getBoundingClientRect().bottom <=
            document
              .querySelector("[data-cookie-notice] > div")!
              .getBoundingClientRect().top,
        ),
      )
      .toBe(true);
    await bayar.tap({ trial: true, timeout: 2_000 });
  });
});

test("on a phone the landing's sticky bar waits until the notice is answered (Spec 020)", async ({
  page,
  baseURL,
}) => {
  await setUp(page, baseURL!);
  await page.goto("/");
  await page.locator("#cara-kerja").scrollIntoViewIfNeeded();
  const bar = page.locator("[data-sticky-bar]");
  // Past the hero form the bar is due, but the notice holds the bottom.
  await expect(bar).toHaveAttribute("data-shown");
  await expect(bar).toBeHidden();
  await notice(page).getByRole("button", { name: "Don't allow" }).click();
  await expect(bar).toBeVisible();
});
