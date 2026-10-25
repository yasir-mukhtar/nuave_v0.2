import { expect, test, type Page } from "@playwright/test";
import { grantAccess } from "./helpers";
import {
  continueToOrder,
  expectBrandConfirm,
  fillEntry,
  FICTIONAL_BUSINESS,
  ORDER_EMAIL,
  payOrder,
  pressPeriksa,
} from "./journey";

// Spec 019 in a real browser, built with a fake Pixel ID: the notice, the
// choice, the footer link, and the four events. Meta's script address is
// answered with an empty stub; any other outside address is refused.

const META_SCRIPT = "https://connect.facebook.net/en_US/fbevents.js";

function notice(page: Page) {
  return page.getByRole("region", { name: "Cookie untuk iklan" });
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
        body: "/* Meta Pixel stub */",
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

test("before a choice nothing loads from Meta; Setuju loads the Pixel and sends PageView, also after a reload", async ({
  page,
  baseURL,
}) => {
  const meta = await setUp(page, baseURL!);
  await page.goto("/");
  await expect(notice(page)).toBeVisible();
  await expect(notice(page)).toContainText("sebagai kode acak (hash)");
  await expect(
    page.getByRole("button", { name: "Pengaturan cookie" }),
  ).toBeVisible();
  await page.waitForTimeout(300);
  expect(meta).toEqual([]);

  await notice(page).getByRole("button", { name: "Setuju" }).click();
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

test("Tolak loads nothing, now or after a reload; Pengaturan cookie reopens the choice", async ({
  page,
  baseURL,
}) => {
  const meta = await setUp(page, baseURL!);
  await page.goto("/faq");
  await notice(page).getByRole("button", { name: "Tolak" }).click();
  await expect(notice(page)).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(notice(page)).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(meta).toEqual([]);

  await page.getByRole("button", { name: "Pengaturan cookie" }).click();
  await expect(notice(page)).toBeVisible();
  await expect(notice(page)).toContainText("Pilihan Anda sekarang: Tolak");
});

for (const path of ["/r", "/uji"]) {
  test(`${path} never shows the notice or loads the Pixel, even after Setuju`, async ({
    page,
    baseURL,
  }) => {
    const meta = await setUp(page, baseURL!);
    await page.goto("/");
    await notice(page).getByRole("button", { name: "Setuju" }).click();
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
  await page.goto("/");
  await notice(page).getByRole("button", { name: "Setuju" }).click();

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
      ["track", "Purchase", { value: 249000, currency: "IDR" }],
    ]);

  const everything = JSON.stringify(await pixelCalls(page));
  expect(everything).not.toContain(ORDER_EMAIL);
  expect(everything).not.toContain(FICTIONAL_BUSINESS.name);
  expect(everything).not.toContain("kedai-fiksi");
  expect(everything).not.toMatch(/NV-[A-Z0-9]{6}/);

  // A reload of the paid order sends no second Purchase.
  await page.reload();
  await page.waitForTimeout(1_000);
  expect(
    (await tracked(page)).filter((call) => call[1] !== "PageView"),
  ).toEqual([]);
});
