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

function packForBrief(brief: BusinessBrief): PromptPack {
  const questions = buildDeterministicIndonesianPack(
    minimizeIndonesianBrief(brief),
  );
  return {
    status: "draft_for_review",
    prompt_pack_version: "intake-preview-e2e-v1",
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
      window.sessionStorage.setItem(sessionKey, "intake-preview-e2e-1234");
    },
    {
      workflowKey: AUDIT_WORKFLOW_STORAGE_KEY,
      sessionKey: AUDIT_SESSION_STORAGE_KEY,
      stateValue: JSON.stringify(state),
    },
  );
}

function bootstrapBudgetRoute(page: Page) {
  return page.route("**/api/audit/extract", async (route) => {
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

function confirmedState() {
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
    meta: { ...base.meta, comparisonStatus: "confirmed" as const },
  };
}

async function expectNewIntakeFrame(page: Page) {
  await expect(
    page.getByRole("list", { name: "Progres persiapan audit" }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("navigation", { name: "Navigasi persiapan audit" }),
  ).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Kembali" })).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Lanjut", exact: true }),
  ).toHaveCount(1);
}

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
  await bootstrapBudgetRoute(page);
});

test.describe("intake preview journey", () => {
  test("walks the converted screens with the drafted values pre-populated and submits the edited brief", async ({
    page,
  }) => {
    await seed(page, confirmedState());
    const promptRequests: Record<string, unknown>[] = [];
    await page.route("**/api/audit/prompts", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }
      const body = route.request().postDataJSON() as { brief: BusinessBrief };
      promptRequests.push(body);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          pack: packForBrief(body.brief),
          telemetry: [],
        }),
      });
    });

    await page.goto("/audit/v2/intake-preview");

    // brand-confirm is not converted yet and falls through to the old screen.
    await expect(
      page.getByRole("heading", { name: "Periksa brief brand Anda." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Lanjut" }).click();

    // S2 scope screen: cards, read-first brand_type, one frame.
    await expect(
      page.getByRole("heading", { name: "Apa yang ingin Anda audit?" }),
    ).toBeVisible();
    await expectNewIntakeFrame(page);
    await expect(
      page.getByRole("radio", { name: /Seluruh brand Example Business/ }),
    ).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("#brand-type")).toHaveCount(0);
    await expect(page.getByText("Family coffee shop")).toBeVisible();

    // A drafted value stays correctable: Ubah reveals the input, prefilled.
    await page.getByRole("button", { name: "Ubah" }).click();
    const brandTypeInput = page.locator("#brand-type");
    await expect(brandTypeInput).toBeVisible();
    await expect(brandTypeInput).toHaveValue("Family coffee shop");
    await brandTypeInput.fill("Specialty coffee shop");
    await page.getByRole("button", { name: "Selesai" }).click();
    await expect(page.getByText("Specialty coffee shop")).toBeVisible();

    await page.getByRole("button", { name: "Lanjut" }).click();

    // category is not converted yet.
    await expect(
      page.getByRole("heading", { name: "Pilih kategori brand." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Lanjut" }).click();

    // S2 offerings screen: chips pre-selected from the draft.
    await expect(
      page.getByRole("heading", { name: "Ini produk Anda. Sudah benar?" }),
    ).toBeVisible();
    const coffeeChip = page.getByRole("button", { name: "Coffee" });
    await expect(coffeeChip).toHaveAttribute("aria-pressed", "true");
    await coffeeChip.click();
    await expect(coffeeChip).toHaveCount(0);
    await page
      .getByLabel("Tambah produk atau layanan")
      .fill("Kopi susu gula aren");
    await page.getByRole("button", { name: "Tambah", exact: true }).click();
    await page.getByRole("button", { name: "Lanjut" }).click();

    // Unconverted middle screens keep the journey runnable. The Lanjut above
    // already landed on customer-reasons, so expect first, then advance.
    for (const heading of [
      "Kenali pelanggan dan alasannya.",
      "Jelaskan konteks pasar.",
      "Pilih bisnis pembanding yang realistis.",
      "Tambahkan fakta opsional.",
    ]) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await page.getByRole("button", { name: "Lanjut" }).click();
    }

    // S2 review readback: styled rows, Ubah routing to the owning screen.
    await expect(
      page.getByRole("heading", { name: "Ini yang akan Nuave audit" }),
    ).toBeVisible();
    await expect(page.getByText("Specialty coffee shop")).toBeVisible();
    await expect(page.getByText("Kopi susu gula aren")).toBeVisible();
    const categoryRowUbah = page
      .getByRole("heading", { name: "Kategori", exact: true })
      .locator("..")
      .getByRole("button", { name: "Ubah" });
    await categoryRowUbah.click();
    await expect(
      page.getByRole("heading", { name: "Pilih kategori brand." }),
    ).toBeVisible();

    // Back after a readback jump follows the state machine's predecessor, so
    // walk Lanjut forward to the review again.
    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(
      page.getByRole("heading", { name: "Ini produk Anda. Sudah benar?" }),
    ).toBeVisible();
    for (const heading of [
      "Kenali pelanggan dan alasannya.",
      "Jelaskan konteks pasar.",
      "Pilih bisnis pembanding yang realistis.",
      "Tambahkan fakta opsional.",
    ]) {
      await page.getByRole("button", { name: "Lanjut" }).click();
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(
      page.getByRole("heading", { name: "Ini yang akan Nuave audit" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Buat pertanyaan audit" }).click();
    await expect(
      page.getByRole("heading", { name: "Periksa pertanyaan audit" }),
    ).toBeVisible();

    expect(promptRequests).toHaveLength(1);
    const submittedBrief = promptRequests[0].brief as BusinessBrief;
    expect(submittedBrief.brand_type).toBe("Specialty coffee shop");
    expect(submittedBrief.verified_offerings).toEqual([
      "Pastries",
      "Kopi susu gula aren",
    ]);

    // S2 question review: read-first cards grouped by the settled labels.
    await expect(
      page.getByText("Tanpa menyebut bisnis Anda").first(),
    ).toBeVisible();
    await expect(page.getByText("Menyebut bisnis Anda").first()).toBeVisible();
    await expect(page.getByText("6 pertanyaan")).toBeVisible();
    await expect(page.getByText("4 pertanyaan")).toBeVisible();
    await expect(page.locator("textarea")).toHaveCount(0);
  });

  test("routes a required-field error to the branch screen and focuses its control", async ({
    page,
  }) => {
    await seed(page, confirmedState());
    await page.goto("/audit/v2/intake-preview");

    await expect(
      page.getByRole("heading", { name: "Periksa brief brand Anda." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Lanjut" }).click();

    await expect(
      page.getByRole("heading", { name: "Apa yang ingin Anda audit?" }),
    ).toBeVisible();
    await page.getByRole("radio", { name: /Satu cabang atau lokasi/ }).click();
    await page.getByRole("button", { name: "Lanjut" }).click();

    // The branch screen opens without a value; pressing Lanjut there surfaces
    // the scopeValue error on this screen and focuses the typed escape hatch
    // (R-17 on the new surface).
    await expect(
      page.getByRole("heading", { name: "Cabang mana yang ingin diaudit?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(
      page
        .getByRole("alert")
        .filter({
          hasText: "Isi nama cabang atau produk yang akan diaudit.",
        })
        .first(),
    ).toBeVisible();
    await expect(page.locator("#scope-value")).toBeFocused();

    await page.locator("#scope-value").fill("Senopati");
    await page.getByRole("button", { name: "Tambah", exact: true }).click();
    await expect(page.getByText("Cabang: Senopati")).toBeVisible();
    await page.getByRole("button", { name: "Lanjut" }).click();

    await expect(
      page.getByRole("heading", { name: "Pilih kategori brand." }),
    ).toBeVisible();
  });
});
