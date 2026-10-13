import { expect, test } from "@playwright/test";
import {
  fillEntry,
  INTAKE_SESSION_KEY,
  SENSITIVE_INPUT_NOTICE,
} from "./journey";

test("sensitive entry text retains the last safe draft without a provider request", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/audit/"))
      calls.push(request.url());
  });
  await fillEntry(page, { url: "https://kedai-fiksi.example/?token=private" });
  await expect(
    page.getByText(SENSITIVE_INPUT_NOTICE, { exact: true }),
  ).toBeVisible();
  const saved = await page.evaluate(
    (key) => localStorage.getItem(key),
    INTAKE_SESSION_KEY,
  );
  expect(saved).not.toContain("token=private");
  expect(saved).toContain("Kedai Fiksi");
  expect(calls).toEqual([]);
});
