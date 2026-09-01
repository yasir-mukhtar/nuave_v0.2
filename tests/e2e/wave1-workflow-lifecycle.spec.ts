import { expect, test, type Page } from "@playwright/test";
import {
  goldenBrief,
  goldenPrompts,
} from "../../src/lib/audit/fixtures/report-golden";
import {
  CANONICAL_COMPOSITION_COUNTS,
  measurementSlotForPromptId,
} from "../../src/lib/audit/measurement-matrix";
import {
  buildDeterministicIndonesianPack,
  minimizeIndonesianBrief,
} from "../../src/lib/audit/questions-id";
import type { PromptPack } from "../../src/lib/audit/types";
import {
  AUDIT_SESSION_STORAGE_KEY,
  AUDIT_WORKFLOW_STORAGE_KEY,
  WORKFLOW_SCHEMA_VERSION,
} from "../../src/lib/audit/workflow-storage";
import {
  createWorkflowMeta,
  defaultConversionAction,
  defaultRegulatedCategoryNotes,
  derivePriorityOffering,
} from "../../src/lib/audit/workflow-authority";
import { grantAccess } from "./helpers";

const workflowBrief = {
  ...goldenBrief,
  entity_scope: "Seluruh brand Northstar Advisory",
  priority_offering: derivePriorityOffering(goldenBrief.verified_offerings),
  conversion_action: defaultConversionAction(goldenBrief.category),
  regulated_category_notes: defaultRegulatedCategoryNotes(goldenBrief.category),
  known_accuracy_questions: [],
  agency_name: "",
  agency_logo_data_url: "",
};

const questions = buildDeterministicIndonesianPack(
  minimizeIndonesianBrief(goldenBrief),
);
const questionsByOrder = new Map(
  questions.map((question, index) => [index + 1, question]),
);
const prompts = goldenPrompts.map((prompt) => {
  const slot = measurementSlotForPromptId(prompt.prompt_id);
  if (!slot) throw new Error(`Missing canonical slot for ${prompt.prompt_id}`);
  const question = questionsByOrder.get(slot.order);
  if (!question) throw new Error(`Missing question for slot ${slot.order}`);
  return {
    ...prompt,
    category: slot.category,
    role: slot.generatorSlotDescription,
    branded: slot.auditedBrandIdentity === "required",
    question,
    rationale: "Offline Wave 1 lifecycle regression.",
    inputs_used: [...slot.allowedContextFields],
  };
});
const promptPack: PromptPack = {
  status: "draft_for_review",
  prompt_pack_version: "wave1-lifecycle-v1",
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
    unbranded_prompts: CANONICAL_COMPOSITION_COUNTS.unbranded,
    branded_prompts: CANONICAL_COMPOSITION_COUNTS.branded,
  },
  prompts,
  self_check: {
    ten_prompts: true,
    one_prompt_per_slot: true,
    canonical_composition: true,
    no_brand_leakage: true,
    verified_inputs_only: true,
    verified_competitor_only: true,
    single_entity_scope: true,
    category_safety_pass: true,
    independent_natural_questions: true,
  },
  warnings: [],
};

function seedQuestionsState(page: Page) {
  return page.addInitScript(
    ({ workflowKey, sessionKey, state }) => {
      window.sessionStorage.setItem(workflowKey, JSON.stringify(state));
      window.sessionStorage.setItem(sessionKey, "wave1-lifecycle-session-123");
    },
    {
      workflowKey: AUDIT_WORKFLOW_STORAGE_KEY,
      sessionKey: AUDIT_SESSION_STORAGE_KEY,
      state: {
        version: WORKFLOW_SCHEMA_VERSION,
        websiteUrl: "https://northstar.example",
        extractedSourceUrl: "https://northstar.example",
        brief: workflowBrief,
        meta: createWorkflowMeta(workflowBrief, {
          intakeScreen: "review",
          identityUnverified: false,
          comparisonStatus: "confirmed",
        }),
        factsExtracted: true,
        factsConfirmed: true,
        factsCustomerOwned: false,
        extraction: null,
        promptPack,
        observations: [],
        report: null,
        setupTelemetry: [],
        executionStarted: false,
        postReportBudgetCalls: [],
        reportFailureCode: null,
      },
    },
  );
}

async function stubBudget(page: Page) {
  await page.route("**/api/audit/extract", async (route) => {
    if (route.request().method() !== "GET") {
      await route.abort();
      return;
    }
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
}

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

test("initial run POST rejection keeps the reviewed questions retryable", async ({
  page,
}) => {
  await seedQuestionsState(page);
  await stubBudget(page);
  let runCalls = 0;
  await page.route("**/api/audit/run", async (route) => {
    runCalls += 1;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Synthetic pre-stream rejection." }),
    });
  });

  await page.goto("/audit");
  const runButton = page.getByRole("button", { name: "Run the audit" });
  await expect(runButton).toBeVisible();
  await runButton.click();
  await expect(page.getByText("Synthetic pre-stream rejection.")).toBeVisible();
  await expect(runButton).toBeVisible();
  expect(runCalls).toBe(1);

  await expect
    .poll(() =>
      page.evaluate((key) => {
        const state = JSON.parse(
          window.sessionStorage.getItem(key) || "{}",
        ) as {
          executionStarted?: boolean;
          observations?: unknown[];
          promptPack?: unknown;
        };
        return {
          executionStarted: Boolean(state.executionStarted),
          observations: state.observations?.length ?? 0,
          hasPromptPack: Boolean(state.promptPack),
        };
      }, AUDIT_WORKFLOW_STORAGE_KEY),
    )
    .toEqual({
      executionStarted: false,
      observations: 0,
      hasPromptPack: true,
    });
});
