import { expect, test, type Page } from "@playwright/test";
import { buildAuditReport } from "../../src/lib/audit/contracts";
import {
  goldenBrief,
  goldenPrompts,
  goldenReportContent,
} from "../../src/lib/audit/fixtures/report-golden";
import { fixtureCallTelemetry } from "../../src/lib/audit/fixtures/telemetry";
import {
  buildDeterministicIndonesianPack,
  minimizeIndonesianBrief,
} from "../../src/lib/audit/questions-id";
import {
  PRODUCTION_OBSERVATION_REQUESTED_MODEL,
  PRODUCTION_OBSERVATION_SYSTEM,
} from "../../src/lib/audit/production-observation-method";
import { INDONESIAN_AUDIT_REPORT_LABELS } from "../../src/lib/audit/report-language";
import type {
  AuditBudget,
  AuditCallTelemetry,
  AuditObservation,
  PromptPack,
} from "../../src/lib/audit/types";
import {
  VARIANCE_FAILURE_STORAGE_KEY,
  VARIANCE_STORAGE_KEY,
  createVarianceRecord,
  selectVariancePrompts,
} from "../../src/lib/audit/variance";
import {
  AUDIT_SESSION_STORAGE_KEY,
  AUDIT_WORKFLOW_STORAGE_KEY,
} from "../../src/lib/audit/workflow-storage";
import { grantAccess } from "./helpers";

const SAFETY_IDENTIFIER = "live-e2e-session-123456";
const REPORT_RESPONSE_ID = "resp-live-e2e-report";

const minimizedBrief = minimizeIndonesianBrief(goldenBrief);
const questions = buildDeterministicIndonesianPack(minimizedBrief);
const lockedPrompts = goldenPrompts.map((prompt, index) => ({
  ...prompt,
  question: questions[index],
  rationale: "Offline live-workflow regression fixture.",
  inputs_used: ["category"],
}));

const promptPack: PromptPack = {
  status: "draft_for_review",
  prompt_pack_version: "live-e2e-locked-pack-v1",
  language: "id-ID",
  target_product: "ChatGPT",
  brand: {
    brand_name: goldenBrief.brand_name,
    entity_scope: goldenBrief.entity_scope,
    brand_type: goldenBrief.brand_type,
    category: goldenBrief.category,
    market_context: goldenBrief.market_context,
    target_customer: goldenBrief.target_customer,
  },
  summary: {
    total_prompts: 10,
    unbranded_prompts: 5,
    branded_prompts: 5,
  },
  prompts: lockedPrompts,
  self_check: {
    ten_prompts: true,
    two_per_category: true,
    five_unbranded: true,
    five_branded: true,
    no_brand_leakage: true,
    verified_inputs_only: true,
    verified_competitor_only: true,
    single_entity_scope: true,
    category_safety_pass: true,
    independent_natural_questions: true,
  },
  warnings: [],
};

function observationTelemetry(
  responseId: string,
  stage: AuditCallTelemetry["stage"] = "observation",
): AuditCallTelemetry {
  return fixtureCallTelemetry({
    stage,
    requested_model: PRODUCTION_OBSERVATION_REQUESTED_MODEL,
    returned_model: PRODUCTION_OBSERVATION_REQUESTED_MODEL,
    response_id: responseId,
    web_search_calls: stage === "observation" ? 1 : 0,
  });
}

const mainObservations: AuditObservation[] = lockedPrompts.map(
  (prompt, index) => ({
    prompt_id: prompt.prompt_id,
    category: prompt.category,
    branded: prompt.branded,
    question: prompt.question,
    instruction_version: "neutral-response-v1",
    system: PRODUCTION_OBSERVATION_SYSTEM,
    requested_model: PRODUCTION_OBSERVATION_REQUESTED_MODEL,
    returned_model: PRODUCTION_OBSERVATION_REQUESTED_MODEL,
    response_id: `resp-live-e2e-main-${index + 1}`,
    observed_at: "2026-08-21T00:00:00.000Z",
    raw_answer: prompt.branded
      ? `${goldenBrief.brand_name} appears in this synthetic answer.`
      : "Several synthetic category options appear in this answer.",
    sources: [],
    run_status: "completed",
    failure_reason: "",
    telemetry: [observationTelemetry(`resp-live-e2e-main-${index + 1}`)],
  }),
);

const reportTelemetry = observationTelemetry(REPORT_RESPONSE_ID, "report");
const report = buildAuditReport(
  goldenReportContent(),
  mainObservations,
  {
    requested_model: PRODUCTION_OBSERVATION_REQUESTED_MODEL,
    returned_model: PRODUCTION_OBSERVATION_REQUESTED_MODEL,
    response_id: REPORT_RESPONSE_ID,
    initial_response_id: REPORT_RESPONSE_ID,
    call_count: 1,
    language_retry_performed: false,
    language_retry_violations: [],
  },
  INDONESIAN_AUDIT_REPORT_LABELS,
);

function liveState(overrides: Record<string, unknown> = {}) {
  return {
    websiteUrl: "https://northstar.example",
    brief: goldenBrief,
    factsExtracted: true,
    factsConfirmed: true,
    extraction: null,
    promptPack,
    observations: [],
    report: null,
    setupTelemetry: [],
    executionStarted: false,
    postReportBudgetCalls: [],
    ...overrides,
  };
}

function seedLiveState(
  page: Page,
  state: Record<string, unknown>,
  variance?: unknown,
) {
  page.addInitScript(
    ({ workflowKey, sessionKey, varianceKey, stateValue, varianceValue }) => {
      window.sessionStorage.setItem(workflowKey, stateValue);
      window.sessionStorage.setItem(sessionKey, "live-e2e-session-123456");
      if (varianceValue) {
        window.sessionStorage.setItem(varianceKey, varianceValue);
      }
    },
    {
      workflowKey: AUDIT_WORKFLOW_STORAGE_KEY,
      sessionKey: AUDIT_SESSION_STORAGE_KEY,
      varianceKey: VARIANCE_STORAGE_KEY,
      stateValue: JSON.stringify(state),
      varianceValue: variance ? JSON.stringify(variance) : "",
    },
  );
}

async function stubBudgetGet(page: Page) {
  let calls = 0;
  await page.route("**/api/audit/extract", async (route) => {
    if (route.request().method() !== "GET") {
      await route.abort();
      return;
    }
    calls += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        limit_usd: 5,
        carryover_cost_usd: 0,
        calls: [],
      }),
    });
  });
  return () => calls;
}

async function stubRun(page: Page, sequence: string[]) {
  let calls = 0;
  await page.route("**/api/audit/run", async (route) => {
    calls += 1;
    sequence.push("run");
    const request = route.request().postDataJSON() as {
      prompts: PromptPack["prompts"];
    };
    expect(request.prompts.map((prompt) => prompt.prompt_id)).toEqual(
      lockedPrompts.map((prompt) => prompt.prompt_id),
    );
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: `${JSON.stringify({
        type: "run_completed",
        observations: mainObservations,
      })}\n`,
    });
  });
  return () => calls;
}

async function stubReport(
  page: Page,
  sequence: string[],
  capture: { request?: Record<string, unknown> },
) {
  let calls = 0;
  await page.route("**/api/audit/report", async (route) => {
    calls += 1;
    sequence.push("report");
    capture.request = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ report, telemetry: [reportTelemetry] }),
    });
  });
  return () => calls;
}

async function waitForStorage(page: Page, key: string) {
  await expect
    .poll(() =>
      page.evaluate(
        (storageKey) => window.sessionStorage.getItem(storageKey),
        key,
      ),
    )
    .not.toBeNull();
}

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

test.describe("live audit variance orchestration (Spec 003 R-22)", () => {
  test("successful product journey runs report then variance exactly once and keeps the main denominator at ten", async ({
    page,
  }) => {
    const sequence: string[] = [];
    const reportCapture: { request?: Record<string, unknown> } = {};
    const varianceCapture: { request?: Record<string, unknown> } = {};
    seedLiveState(page, liveState());
    const budgetCalls = await stubBudgetGet(page);
    const runCalls = await stubRun(page, sequence);
    const reportCalls = await stubReport(page, sequence, reportCapture);
    let varianceCalls = 0;
    await page.route("**/api/audit/variance", async (route) => {
      varianceCalls += 1;
      sequence.push("variance");
      const request = route.request().postDataJSON() as {
        locked_prompts: PromptPack["prompts"];
        completed_observations: AuditObservation[];
        prompts: PromptPack["prompts"];
        run_key: string;
        budget: AuditBudget;
      };
      varianceCapture.request = request as unknown as Record<string, unknown>;
      const selectedIds = request.prompts.map((prompt) => prompt.prompt_id);
      const varianceObservations = request.prompts.map((prompt, index) => ({
        ...mainObservations.find(
          (observation) => observation.prompt_id === prompt.prompt_id,
        )!,
        response_id: `resp-live-e2e-variance-${index + 1}`,
        telemetry: [
          observationTelemetry(`resp-live-e2e-variance-${index + 1}`),
        ],
      }));
      const variance = createVarianceRecord({
        run_key: request.run_key,
        prompt_ids: selectedIds,
        observations: varianceObservations,
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          variance,
          budget: {
            ...request.budget,
            calls: [
              ...request.budget.calls,
              ...varianceObservations.flatMap(
                (observation) => observation.telemetry,
              ),
            ],
          },
        }),
      });
    });

    await page.goto("/audit");
    await expect.poll(budgetCalls).toBe(1);
    await page.getByRole("button", { name: "Run the audit" }).click();
    await waitForStorage(page, VARIANCE_STORAGE_KEY);
    await expect(
      page.getByRole("button", { name: "Download PDF" }).first(),
    ).toBeVisible();

    expect(runCalls()).toBe(1);
    expect(reportCalls()).toBe(1);
    expect(varianceCalls).toBe(1);
    expect(sequence).toEqual(["run", "report", "variance"]);

    const reportRequest = reportCapture.request as {
      observations: AuditObservation[];
    };
    expect(reportRequest.observations).toHaveLength(10);
    expect(reportRequest.observations.map((item) => item.prompt_id)).toEqual(
      mainObservations.map((item) => item.prompt_id),
    );

    const varianceRequest = varianceCapture.request as {
      locked_prompts: PromptPack["prompts"];
      completed_observations: AuditObservation[];
      prompts: PromptPack["prompts"];
      run_key: string;
      budget: AuditBudget;
    };
    const selectedIds = varianceRequest.prompts.map(
      (prompt) => prompt.prompt_id,
    );
    expect(varianceRequest.locked_prompts).toEqual(lockedPrompts);
    expect(varianceRequest.completed_observations).toEqual(
      reportRequest.observations,
    );
    expect(varianceRequest.completed_observations).toEqual(mainObservations);
    expect(selectedIds).toHaveLength(2);
    expect(new Set(selectedIds).size).toBe(2);
    const lockedIds = new Set(lockedPrompts.map((prompt) => prompt.prompt_id));
    expect(selectedIds.every((id) => lockedIds.has(id))).toBe(true);
    expect(selectedIds).toEqual(
      selectVariancePrompts(lockedPrompts).map((prompt) => prompt.prompt_id),
    );
    expect(varianceRequest.run_key).toBe(REPORT_RESPONSE_ID);
    expect(
      varianceRequest.budget.calls.some(
        (call) => call.response_id === REPORT_RESPONSE_ID,
      ),
    ).toBe(true);

    await expect
      .poll(() =>
        page.evaluate((key) => {
          const saved = JSON.parse(
            window.sessionStorage.getItem(key) || "{}",
          ) as { observations?: unknown[]; report?: unknown };
          return {
            observations: saved.observations?.length ?? 0,
            hasReport: Boolean(saved.report),
          };
        }, AUDIT_WORKFLOW_STORAGE_KEY),
      )
      .toEqual({ observations: 10, hasReport: true });

    const storedVariance = await page.evaluate(
      (key) => JSON.parse(window.sessionStorage.getItem(key) || "{}"),
      VARIANCE_STORAGE_KEY,
    );
    expect(storedVariance.observations).toHaveLength(2);
    expect(storedVariance.complete).toBe(true);
    expect(reportRequest.observations).toHaveLength(10);
  });

  test("variance failure preserves the completed report and does not restart report or main run", async ({
    page,
  }) => {
    const sequence: string[] = [];
    const reportCapture: { request?: Record<string, unknown> } = {};
    seedLiveState(page, liveState());
    const budgetCalls = await stubBudgetGet(page);
    const runCalls = await stubRun(page, sequence);
    const reportCalls = await stubReport(page, sequence, reportCapture);
    let varianceCalls = 0;
    await page.route("**/api/audit/variance", async (route) => {
      varianceCalls += 1;
      sequence.push("variance");
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Synthetic variance outage." }),
      });
    });

    await page.goto("/audit");
    await expect.poll(budgetCalls).toBe(1);
    await page.getByRole("button", { name: "Run the audit" }).click();
    await waitForStorage(page, VARIANCE_FAILURE_STORAGE_KEY);

    expect(runCalls()).toBe(1);
    expect(reportCalls()).toBe(1);
    expect(varianceCalls).toBe(1);
    expect(sequence).toEqual(["run", "report", "variance"]);
    await expect(
      page.getByText(/Laporan sudah selesai dan tetap valid/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download PDF" }).first(),
    ).toBeVisible();

    const restoredMain = await page.evaluate((key) => {
      const saved = JSON.parse(window.sessionStorage.getItem(key) || "{}") as {
        observations?: unknown[];
        report?: { provenance?: { report_response_id?: string } };
      };
      return {
        observationCount: saved.observations?.length ?? 0,
        reportResponseId: saved.report?.provenance?.report_response_id,
      };
    }, AUDIT_WORKFLOW_STORAGE_KEY);
    expect(restoredMain).toEqual({
      observationCount: 10,
      reportResponseId: REPORT_RESPONSE_ID,
    });

    const failure = await page.evaluate(
      (key) => JSON.parse(window.sessionStorage.getItem(key) || "{}"),
      VARIANCE_FAILURE_STORAGE_KEY,
    );
    expect(failure).toMatchObject({
      run_key: REPORT_RESPONSE_ID,
      complete: false,
      incomplete_reason: "Synthetic variance outage.",
    });
    expect(
      (reportCapture.request as { observations: unknown[] }).observations,
    ).toHaveLength(10);
  });

  test("restoring a report with incomplete main evidence never launches variance", async ({
    page,
  }) => {
    seedLiveState(
      page,
      liveState({
        observations: mainObservations.slice(0, 9),
        report,
        executionStarted: true,
        postReportBudgetCalls: [
          ...mainObservations.flatMap((observation) => observation.telemetry),
          reportTelemetry,
        ],
      }),
    );
    const budgetCalls = await stubBudgetGet(page);
    let varianceCalls = 0;
    await page.route("**/api/audit/variance", async (route) => {
      varianceCalls += 1;
      await route.abort();
    });

    await page.goto("/audit");
    await expect.poll(budgetCalls).toBe(1);
    await waitForStorage(page, VARIANCE_FAILURE_STORAGE_KEY);
    await page.waitForTimeout(100);

    expect(varianceCalls).toBe(0);
    const failure = await page.evaluate(
      (key) => JSON.parse(window.sessionStorage.getItem(key) || "{}"),
      VARIANCE_FAILURE_STORAGE_KEY,
    );
    expect(failure).toMatchObject({
      run_key: REPORT_RESPONSE_ID,
      complete: false,
      incomplete_reason: expect.stringMatching(/bukti observasi 10\/10 tidak valid/i),
    });
  });

  test("restoring completed variance for the report never posts variance again", async ({
    page,
  }) => {
    const selected = selectVariancePrompts(lockedPrompts);
    const restoredVariance = createVarianceRecord({
      run_key: REPORT_RESPONSE_ID,
      prompt_ids: selected.map((prompt) => prompt.prompt_id),
      observations: selected.map((prompt, index) => ({
        ...mainObservations.find(
          (observation) => observation.prompt_id === prompt.prompt_id,
        )!,
        response_id: `resp-restored-variance-${index + 1}`,
        telemetry: [
          observationTelemetry(`resp-restored-variance-${index + 1}`),
        ],
      })),
    });
    seedLiveState(
      page,
      liveState({
        observations: mainObservations,
        report,
        executionStarted: true,
        postReportBudgetCalls: [
          ...mainObservations.flatMap((observation) => observation.telemetry),
          reportTelemetry,
        ],
      }),
      restoredVariance,
    );
    const budgetCalls = await stubBudgetGet(page);
    let varianceCalls = 0;
    await page.route("**/api/audit/variance", async (route) => {
      varianceCalls += 1;
      await route.abort();
    });

    await page.goto("/audit");
    await expect.poll(budgetCalls).toBe(1);
    await expect(
      page.getByRole("button", { name: "Download PDF" }).first(),
    ).toBeVisible();
    await page.waitForTimeout(250);

    expect(varianceCalls).toBe(0);
    const storedMainCount = await page.evaluate((key) => {
      const saved = JSON.parse(window.sessionStorage.getItem(key) || "{}") as {
        observations?: unknown[];
      };
      return saved.observations?.length ?? 0;
    }, AUDIT_WORKFLOW_STORAGE_KEY);
    expect(storedMainCount).toBe(10);
  });
});
