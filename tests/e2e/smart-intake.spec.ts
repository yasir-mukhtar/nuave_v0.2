import { expect, test, type Page } from "@playwright/test";
import {
  CONFIRM_BRAND,
  CONTINUE_WITH_NAME,
  entryScreen,
  expectBrandConfirm,
  expectOrderScreen,
  expectStepsScreen,
  fillEntry,
  fillWebsite,
  FICTIONAL_BUSINESS,
  holdAnswers,
  INTAKE_SESSION_KEY,
  intakeSession,
  LOOKUP_HEADING,
  LOOKUP_INTERRUPTED_NOTICE,
  LOOKUP_LONG_HEADING,
  LOOKUP_WAY_OUT_HEADING,
  orderScreen,
  pressKembali,
  pressPeriksa,
  readingScreen,
  SENSITIVE_INPUT_NOTICE,
  TO_PAYMENT,
  trackApiCalls,
  websiteInput,
} from "./journey";

test("sensitive entry text retains the last safe draft without a provider request", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/audit/"))
      calls.push(request.url());
  });
  // J01 has one field: the safe website is kept, the token-like one refused.
  await fillEntry(page);
  await fillWebsite(page, "https://kedai-fiksi.example/?token=private");
  await expect(
    page.getByText(SENSITIVE_INPUT_NOTICE, { exact: true }),
  ).toBeVisible();
  await expect(websiteInput(page)).toHaveValue(FICTIONAL_BUSINESS.url);
  const saved = await page.evaluate(
    (key) => localStorage.getItem(key),
    INTAKE_SESSION_KEY,
  );
  expect(saved).not.toContain("token=private");
  expect(saved).toContain("kedai-fiksi.example");
  expect(calls).toEqual([]);
});

test("a slow free check offers the J04 way out with the name guessed from the address", async ({
  page,
}) => {
  // The page clock jumps the wait forward; it would also stall animation
  // frames, so this customer prefers reduced motion (screens swap at once).
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  const calls = trackApiCalls(page);
  // The free check never answers.
  await page.route("**/api/audit/identity?**", () => new Promise(() => {}));
  await fillEntry(page);
  await pressPeriksa(page);
  const heading = (name: string) =>
    page.getByRole("heading", { level: 1, name, exact: true });
  await expect(readingScreen(page)).toBeVisible();
  await expect(heading(LOOKUP_HEADING)).toBeVisible();
  // While checking, the found-business action waits.
  await expect(
    page.getByRole("button", { name: CONFIRM_BRAND, exact: true }),
  ).toBeDisabled();
  await page.clock.fastForward(10_500);
  await expect(heading(LOOKUP_LONG_HEADING)).toBeVisible();
  await page.clock.fastForward(20_000);
  await expect(heading(LOOKUP_WAY_OUT_HEADING)).toBeVisible();
  const name = readingScreen(page).getByRole("textbox", {
    name: "Nama bisnis",
    exact: true,
  });
  await expect(name).toHaveValue(FICTIONAL_BUSINESS.name);
  // "Tunggu sebentar lagi" hides the way out for a while.
  await page
    .getByRole("button", { name: "Tunggu sebentar lagi", exact: true })
    .click();
  await expect(heading(LOOKUP_LONG_HEADING)).toBeVisible();
  await page.clock.fastForward(20_500);
  await expect(heading(LOOKUP_WAY_OUT_HEADING)).toBeVisible();
  await page
    .getByRole("button", { name: CONTINUE_WITH_NAME, exact: true })
    .click();
  // The guessed name carries on to the three steps and checkout.
  await expectStepsScreen(page);
  const saved = await intakeSession(page);
  expect(saved.brand).toEqual({
    name: FICTIONAL_BUSINESS.name,
    origin: "owner",
  });
  expect(saved.identity).toMatchObject({
    inputName: FICTIONAL_BUSINESS.name,
    inputSource: FICTIONAL_BUSINESS.url,
    canonicalUrl: FICTIONAL_BUSINESS.url,
    displayName: null,
  });
  await page.getByRole("button", { name: TO_PAYMENT, exact: true }).click();
  await expectOrderScreen(page);
  await expect(orderScreen(page)).toContainText(
    `${FICTIONAL_BUSINESS.name} · 10 pertanyaan`,
  );
  // One free check was asked; looking at checkout orders nothing.
  expect(calls).toEqual({ "GET /api/audit/identity": 1 });
});

test("Kembali cancels the free check, and a check cut off by a reload is never replayed", async ({
  page,
}) => {
  const calls = trackApiCalls(page);
  await fillEntry(page);
  // A slow website: the free checks stay unanswered until the reload.
  await holdAnswers(page, "/api/audit/identity");
  await pressPeriksa(page);
  await expect(
    page.getByRole("heading", { level: 1, name: LOOKUP_HEADING }),
  ).toBeVisible();
  // Kembali returns to the entry with the website kept.
  await pressKembali(page);
  await expect(entryScreen(page)).toBeVisible();
  await expect(websiteInput(page)).toHaveValue(FICTIONAL_BUSINESS.url);
  await pressPeriksa(page);
  await expect(
    page.getByRole("heading", { level: 1, name: LOOKUP_HEADING }),
  ).toBeVisible();
  expect(calls).toEqual({ "GET /api/audit/identity": 2 });
  await page.reload();
  await expect(entryScreen(page)).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: LOOKUP_INTERRUPTED_NOTICE }),
  ).toBeVisible();
  await expect(websiteInput(page)).toHaveValue(FICTIONAL_BUSINESS.url);
  // Give a replay every chance to show up: none comes.
  await page.waitForTimeout(1_000);
  expect(calls).toEqual({ "GET /api/audit/identity": 2 });
});

/** The free check read the site but its name labels were unclear. */
async function stubUnsureIdentity(page: Page) {
  await page.route("**/api/audit/identity?**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        canonical_url: FICTIONAL_BUSINESS.url,
        display_name: "Kedai Fiksi Terdekat",
        description: "",
        icon_data_url: null,
        confidence: false,
        preparation_mode: "live",
      }),
    }),
  );
}

test("an unsure business name is checked by the owner before going on", async ({
  page,
}) => {
  await stubUnsureIdentity(page);
  await fillEntry(page);
  await pressPeriksa(page);
  await expectBrandConfirm(page, "Kedai Fiksi Terdekat");
  await expect(
    page.getByText(
      "Website Anda tidak menyebut namanya dengan jelas. Pastikan nama bisnis di bawah benar sebelum lanjut.",
      { exact: true },
    ),
  ).toBeVisible();
  // The usual confirm is replaced by a check of the name.
  await expect(
    page.getByRole("button", { name: CONFIRM_BRAND, exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Periksa nama bisnis", exact: true })
    .click();
  const sheet = page.getByRole("dialog", { name: "Pastikan nama bisnis" });
  const field = sheet.getByRole("textbox", {
    name: "Nama bisnis",
    exact: true,
  });
  await expect(field).toHaveValue("Kedai Fiksi Terdekat");
  await field.fill(FICTIONAL_BUSINESS.name);
  await sheet.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await expectBrandConfirm(page);
  // Saved once, the name is the owner's: the usual confirm returns.
  await page.getByRole("button", { name: CONFIRM_BRAND, exact: true }).click();
  await expectStepsScreen(page);
  expect((await intakeSession(page))?.brand).toEqual({
    name: FICTIONAL_BUSINESS.name,
    origin: "owner",
  });
});

test("a tap on Periksa nama bisnis while the screen slides in still opens the sheet", async ({
  page,
}) => {
  await stubUnsureIdentity(page);
  await fillEntry(page);
  await pressPeriksa(page);
  const check = page.getByRole("button", {
    name: "Periksa nama bisnis",
    exact: true,
  });
  await expect(check).toHaveAttribute("aria-haspopup", "dialog");
  const sheet = page.getByRole("dialog", { name: "Pastikan nama bisnis" });
  await check.click();
  await sheet.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(sheet).toHaveCount(0);
  // Back to the entry and the same check again: the button is pressed the
  // moment it shows, before the found screen has finished sliding in.
  await pressKembali(page);
  await pressPeriksa(page);
  await check.click();
  await expect(sheet).toBeVisible();
});

test("an unsure name kept as it is still counts as checked", async ({
  page,
}) => {
  await stubUnsureIdentity(page);
  await fillEntry(page);
  await pressPeriksa(page);
  await page
    .getByRole("button", { name: "Periksa nama bisnis", exact: true })
    .click();
  const sheet = page.getByRole("dialog", { name: "Pastikan nama bisnis" });
  await sheet.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(sheet).toHaveCount(0);
  // A reload keeps the check done.
  await page.reload();
  await expectBrandConfirm(page, "Kedai Fiksi Terdekat");
  await page.getByRole("button", { name: CONFIRM_BRAND, exact: true }).click();
  await expectStepsScreen(page);
});

test("a sure business name keeps the usual one-tap confirm", async ({
  page,
}) => {
  await page.route("**/api/audit/identity?**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        canonical_url: FICTIONAL_BUSINESS.url,
        display_name: FICTIONAL_BUSINESS.name,
        confidence: true,
        preparation_mode: "live",
      }),
    }),
  );
  await fillEntry(page);
  await pressPeriksa(page);
  await expectBrandConfirm(page);
  await page.getByRole("button", { name: CONFIRM_BRAND, exact: true }).click();
  await expectStepsScreen(page);
});
