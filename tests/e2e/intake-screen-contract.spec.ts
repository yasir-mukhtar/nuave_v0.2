import { expect, test, type Page } from "@playwright/test";
import { createInitialExtractedAuditWorkflowState } from "../../src/lib/audit/workflow-storage";
import {
  AUDIT_SESSION_STORAGE_KEY,
  AUDIT_WORKFLOW_STORAGE_KEY,
} from "../../src/lib/audit/workflow-storage";
import {
  AUDIT_MEASUREMENT_MATRIX,
  measurementSlotForOrder,
} from "../../src/lib/audit/measurement-matrix";
import {
  buildDeterministicIndonesianPack,
  minimizeIndonesianBrief,
} from "../../src/lib/audit/questions-id";
import type { BusinessBrief, PromptPack } from "../../src/lib/audit/types";
import { grantAccess } from "./helpers";

const SOURCE = "https://example.com/";

/**
 * Interaction-model contract for the recovered intake surface (recovery plan
 * §8), scoped in S2 to the screens implemented so far and widened each slice.
 * Seeded directly onto /audit/v2/intake-preview.
 */

function draft(overrides: Record<string, unknown> = {}) {
  return {
    brand_name: "Example Business",
    entity_scope: "Seluruh brand Example Business",
    brand_type: "Family coffee shop",
    category: "Coffee shop",
    market_context: "Indonesia",
    target_customer: "Remote workers",
    official_sources: [SOURCE],
    verified_offerings: ["Coffee", "Pastries"],
    verified_customer_needs: ["A place to work"],
    verified_decision_criteria: ["Location"],
    similar_businesses: [
      { name: "Peer Coffee", source_url: "", origin: "ai" as const },
    ],
    brand_name_variants: [],
    priority_offering: "Coffee",
    conversion_action: "ignored",
    customer_supplied_facts: [],
    known_accuracy_questions: [],
    usp: "",
    regulated_category_notes: "",
    evidence: [],
    warnings: [],
    ...overrides,
  };
}

function confirmedState(screenOverrides: Record<string, unknown> = {}) {
  const base = createInitialExtractedAuditWorkflowState({
    websiteUrl: SOURCE,
    draft: draft(),
    telemetry: [],
  });
  return {
    ...base,
    brief: {
      ...base.brief,
      verified_competitor: { name: "Peer Coffee", scope: "", source_url: "" },
    },
    meta: {
      ...base.meta,
      comparisonStatus: "confirmed" as const,
      ...screenOverrides,
    },
  };
}

function packForBrief(brief: BusinessBrief): PromptPack {
  const questions = buildDeterministicIndonesianPack(
    minimizeIndonesianBrief(brief),
  );
  return {
    status: "draft_for_review",
    prompt_pack_version: "intake-contract-e2e-v1",
    language: "id-ID",
    target_product: "ChatGPT",
    brand: {
      brand_name: brief.brand_name,
      entity_scope: brief.entity_scope,
      brand_type: brief.brand_type,
      category: brief.category,
      market_context: brief.market_context,
      target_customer: brief.target_customer,
    },
    summary: {
      total_prompts: 10,
      unbranded_prompts: 6,
      branded_prompts: 4,
    },
    prompts: questions.map((question, index) => {
      const slot = measurementSlotForOrder(index + 1);
      return {
        prompt_id: `NVA-ID-${String(index + 1).padStart(2, "0")}`,
        category: slot?.category ?? AUDIT_MEASUREMENT_MATRIX[0].category,
        role: "e2e role",
        branded: slot?.auditedBrandIdentity === "required",
        question,
        rationale: "e2e rationale",
        inputs_used: ["brand_name"],
        review_status: "needs_human_review" as const,
      };
    }),
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
}

async function seed(page: Page, state: unknown) {
  await page.addInitScript(
    ({ workflowKey, sessionKey, stateValue }) => {
      window.sessionStorage.setItem(workflowKey, stateValue);
      window.sessionStorage.setItem(sessionKey, "intake-contract-e2e-1234");
    },
    {
      workflowKey: AUDIT_WORKFLOW_STORAGE_KEY,
      sessionKey: AUDIT_SESSION_STORAGE_KEY,
      stateValue: JSON.stringify(state),
    },
  );
}

async function bootstrapBudget(page: Page) {
  await page.route("**/api/audit/extract", async (route) => {
    if (route.request().method() !== "GET") {
      await route.abort();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ limit_usd: 5, carryover_cost_usd: 0, calls: [] }),
    });
  });
}

const PROHIBITED_PHRASES = [
  "saran dari ekstraksi",
  "Draft dari ekstraksi",
  "Terima saran Nuave",
  "Differentiator",
  "Konteks pasar",
  "Penawaran utama",
  "Pertimbangan keputusan",
];

async function expectNoProhibitedPhrases(page: Page) {
  const bodyText = await page.locator("body").innerText();
  for (const phrase of PROHIBITED_PHRASES) {
    expect(bodyText, `prohibited phrase: ${phrase}`).not.toContain(phrase);
  }
}

async function expectOneFrame(page: Page) {
  await expect(
    page.getByRole("list", { name: "Progres persiapan audit" }),
  ).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Kembali" })).toHaveCount(1);
}

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
  await bootstrapBudget(page);
});

test.describe("intake screen contract", () => {
  test("scope is a single choice by cards with no primary text input", async ({
    page,
  }) => {
    await seed(page, confirmedState({ intakeScreen: "scope" }));
    await page.goto("/audit/v2/intake-preview");

    await expect(
      page.getByRole("heading", { name: "Apa yang ingin Anda audit?" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("radiogroup", { name: "Cakupan audit" })
        .getByRole("radio"),
    ).toHaveCount(3);
    // The drafted brand_type is read-first: no input until Ubah is pressed.
    await expect(page.locator("#brand-type")).toHaveCount(0);
    await expect(page.locator("input[type='text']")).toHaveCount(0);
    await expectOneFrame(page);
    await expectNoProhibitedPhrases(page);
  });

  test("offerings exposes selected removable chips", async ({ page }) => {
    await seed(page, confirmedState({ intakeScreen: "offerings" }));
    await page.goto("/audit/v2/intake-preview");

    await expect(
      page.getByRole("heading", { name: "Ini produk Anda. Sudah benar?" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Coffee" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(
      page.getByRole("button", { name: "Pastries" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expectNoProhibitedPhrases(page);
  });

  test("the readback is read-first with an Ubah link per row", async ({
    page,
  }) => {
    await seed(page, confirmedState({ intakeScreen: "review" }));
    await page.goto("/audit/v2/intake-preview");

    await expect(
      page.getByRole("heading", { name: "Ini yang akan Nuave audit" }),
    ).toBeVisible();
    await expect(page.locator("textarea")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ubah" })).toHaveCount(13);
    await expect(page.getByText("Coffee shop", { exact: true })).toBeVisible();
    await expect(page.getByText("Peer Coffee")).toBeVisible();
    await expectOneFrame(page);
    await expectNoProhibitedPhrases(page);
  });

  test("question review is read-first and refuses a duplicate save at the card", async ({
    page,
  }) => {
    const state = confirmedState();
    const pack = packForBrief(state.brief);
    await seed(page, { ...state, promptPack: pack, factsConfirmed: true });
    await page.goto("/audit/v2/intake-preview");

    await expect(
      page.getByRole("heading", { name: "Periksa pertanyaan audit" }),
    ).toBeVisible();
    await expect(page.locator("textarea")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ubah" })).toHaveCount(10);

    // Edit slot 1 into a copy of slot 5: the validator blames slot 5, the
    // card must still refuse the save in Indonesian, with no English copy.
    await page.getByRole("button", { name: "Ubah" }).first().click();
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();
    await textarea.fill(pack.prompts[4].question);
    await page.getByRole("button", { name: "Simpan" }).click();

    await expect(
      page.getByRole("alert").filter({
        hasText:
          "Pertanyaan ini sama dengan pertanyaan lain dalam paket. Setiap pertanyaan harus berbeda.",
      }),
    ).toBeVisible();
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toContain("duplicates another question");
    expect(bodyText).not.toContain("Question 5");

    // The rejected save leaves the pack untouched.
    const storedPack = await page.evaluate(
      (key) =>
        JSON.parse(window.sessionStorage.getItem(key) || "null")?.promptPack,
      AUDIT_WORKFLOW_STORAGE_KEY,
    );
    expect(storedPack.prompts[0].question).toBe(pack.prompts[0].question);
    await expect(textarea).toBeVisible();

    // Batal discards the local draft and restores the read-only card.
    await page.getByRole("button", { name: "Batal" }).click();
    await expect(page.locator("textarea")).toHaveCount(0);
    await expectNoProhibitedPhrases(page);
  });

  test("a valid edit saves, clears downstream state, and shows the non-blocking drift warning", async ({
    page,
  }) => {
    const state = confirmedState();
    const pack = packForBrief(state.brief);
    await seed(page, { ...state, promptPack: pack, factsConfirmed: true });
    await page.goto("/audit/v2/intake-preview");

    await page.getByRole("button", { name: "Ubah" }).first().click();
    const textarea = page.locator("textarea");
    await textarea.fill(
      "Kedai kopi dengan ruang kerja nyaman di Jakarta mana saja ya?",
    );
    await page.getByRole("button", { name: "Simpan" }).click();

    await expect(page.locator("textarea")).toHaveCount(0);
    await expect(
      page.getByText(
        "Tujuan pertanyaan ditetapkan oleh Nuave. Perubahan wording dapat membuat pertanyaan tidak lagi mengukur tujuan tersebut, tetapi tidak menghalangi Anda melanjutkan jika pemeriksaan mekanis lulus.",
      ),
    ).toBeVisible();
    // Lanjut stays reachable: the drift warning does not block (R-10).
    await expect(
      page.getByRole("button", { name: "Jalankan audit" }),
    ).toBeEnabled();

    const storedPack = await page.evaluate(
      (key) =>
        JSON.parse(window.sessionStorage.getItem(key) || "null")?.promptPack,
      AUDIT_WORKFLOW_STORAGE_KEY,
    );
    expect(storedPack.prompts[0].question).toBe(
      "Kedai kopi dengan ruang kerja nyaman di Jakarta mana saja ya?",
    );
  });
});
