import { expect, test } from "@playwright/test";
import {
  completeSyntheticSummary,
  confirmSummary,
  downloadEvidenceJson,
  expectAuditDone,
  expectQuestionReview,
  expectTenQuestions,
  fillEntry,
  reportLocator,
  SENSITIVE_INPUT_NOTICE,
  startAudit,
  toSummary,
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
  const saved = await page.evaluate(() =>
    sessionStorage.getItem("nuave.localIntake.v2"),
  );
  expect(saved).not.toContain("token=private");
  expect(saved).toContain("Kedai Fiksi");
  expect(calls).toEqual([]);
});

test("v2 synthetic intake reaches ten observations, report, JSON and print", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/audit/"))
      calls.push(`${request.method()} ${url.pathname}`);
  });
  await page.addInitScript(() => {
    (window as unknown as { __printCount: number }).__printCount = 0;
    window.print = () => {
      (window as unknown as { __printCount: number }).__printCount++;
    };
  });
  await toSummary(page);
  await completeSyntheticSummary(page);
  await confirmSummary(page);
  await expectQuestionReview(page);
  await expectTenQuestions(page);
  await page.reload();
  await expectTenQuestions(page);
  await startAudit(page);
  await expectAuditDone(page);
  const retained = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("nuave.localIntakeAudit.v2")!),
  );
  const report = reportLocator(page);
  await expect(report.locator("[data-answer-body]")).toHaveCount(10);
  for (let index = 1; index <= 10; index++) {
    const observation = retained.observations[index - 1];
    expect(observation.prompt_id).toBe(
      `NUAVE-DT-${String(index).padStart(2, "0")}`,
    );
    expect(await page.locator(`#report-question-${index}`).textContent()).toBe(
      observation.question,
    );
  }
  await page.emulateMedia({ media: "print" });
  for (const answer of await report.locator("[data-answer-body]").all())
    await expect(answer).toBeVisible();
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: "Download PDF" }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { __printCount: number }).__printCount,
    ),
  ).toBe(1);
  const { json: evidence } = await downloadEvidenceJson(page, /Unduh.*JSON/i);
  expect(evidence.export_version).toBe("nuave-evidence-v5");
  expect(evidence.context).toMatchObject({
    version: "nuave-direct-ten-context-v2",
    identity: { name: "Kedai Fiksi" },
    category: { value: "kedai kopi", origin: "owner" },
    offerings: { value: ["kopi susu"], origin: "owner" },
    comparators: { value: { mode: "unknown" } },
  });
  expect(evidence).not.toHaveProperty("brief");
  expect(evidence.prompts).toHaveLength(10);
  expect(evidence.observations).toHaveLength(10);
  expect(evidence.report).toBeTruthy();
  expect(
    calls.filter((call) => call === "GET /api/audit/identity"),
  ).toHaveLength(1);
  expect(
    calls.filter((call) => call === "POST /api/audit/extract"),
  ).toHaveLength(1);
  expect(
    calls.filter((call) => call === "POST /api/audit/glm-questions"),
  ).toHaveLength(1);
  expect(calls.filter((call) => call === "POST /api/audit/run")).toHaveLength(
    1,
  );
  expect(
    calls.filter((call) => call === "POST /api/audit/report"),
  ).toHaveLength(1);
});
