import { expect, test, type Locator, type Page } from "@playwright/test";
import { AUDIT_SOURCE_HANDOFF_STORAGE_KEY } from "../../src/lib/audit/source-handoff";
import { AUDIT_WORKFLOW_STORAGE_KEY } from "../../src/lib/audit/workflow-storage";
import {
  VARIANCE_FAILURE_STORAGE_KEY,
  VARIANCE_STORAGE_KEY,
} from "../../src/lib/audit/variance";
import {
  expectNoHorizontalScroll,
  expectReadyReport,
  grantAccess,
  seedFixtureState,
  v3ReadyState,
} from "./helpers";

const SOURCE = "https://example.com/";

function extractionDraft(overrides: Record<string, unknown> = {}) {
  return {
    brand_name: "Example Business",
    entity_scope: "Example Business",
    brand_type: "Business",
    category: "Coffee shop",
    market_context: "Indonesia",
    target_customer: "Customers",
    official_sources: [SOURCE],
    verified_offerings: ["Coffee"],
    verified_customer_needs: ["A place to work"],
    verified_decision_criteria: ["Location"],
    similar_businesses: [{ name: "Peer Coffee", source_url: "", origin: "ai" }],
    brand_name_variants: ["Example Business"],
    priority_offering: "Coffee",
    conversion_action: "Visit website",
    customer_supplied_facts: [],
    known_accuracy_questions: [],
    usp: "",
    regulated_category_notes: "",
    evidence: [],
    warnings: [],
    ...overrides,
  };
}

async function stubIdentityAndExtraction(
  page: Page,
  options: { confidence?: boolean; failFirstExtraction?: boolean } = {},
) {
  let identityCalls = 0;
  let identitySource = "";
  let budgetCalls = 0;
  let extractCalls = 0;
  let failNextExtraction = options.failFirstExtraction === true;
  let requestedSource = "";
  let requestedBody: Record<string, unknown> | null = null;

  await page.route("**/api/audit/identity*", async (route) => {
    identityCalls += 1;
    identitySource =
      new URL(route.request().url()).searchParams.get("source") ?? "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        display_name: options.confidence === false ? "" : "Example Business",
        description: "Coffee shop",
        canonical_url: SOURCE,
        icon_data_url: null,
        source_type: "website",
        confidence: options.confidence !== false,
      }),
    });
  });

  await page.route("**/api/audit/extract", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      budgetCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          limit_usd: 5,
          carryover_cost_usd: 0,
          calls: [],
        }),
      });
      return;
    }

    if (method === "POST") {
      extractCalls += 1;
      requestedBody = route.request().postDataJSON() as Record<string, unknown>;
      requestedSource = String(requestedBody.website_url ?? "");
      if (failNextExtraction) {
        failNextExtraction = false;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Synthetic extraction failure.",
            code: "EXTRACTION_TRANSIENT_FAILURE",
            telemetry: [],
          }),
        });
        return;
      }
      const draft =
        options.confidence === false
          ? extractionDraft({ brand_name: "" })
          : extractionDraft();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ draft, telemetry: [] }),
      });
      return;
    }

    await route.abort();
  });

  return {
    identityCalls: () => identityCalls,
    identitySource: () => identitySource,
    budgetCalls: () => budgetCalls,
    extractCalls: () => extractCalls,
    requestedSource: () => requestedSource,
    requestedBody: () => requestedBody,
  };
}

async function stubIdentityFailure(page: Page) {
  let identityCalls = 0;
  let extractCalls = 0;
  await page.route("**/api/audit/identity*", async (route) => {
    identityCalls += 1;
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Kami tidak dapat membaca sumber publik ini.",
        code: "SOURCE_UNAVAILABLE",
      }),
    });
  });
  await page.route("**/api/audit/extract", async (route) => {
    if (route.request().method() === "POST") extractCalls += 1;
    await route.abort();
  });
  return {
    identityCalls: () => identityCalls,
    extractCalls: () => extractCalls,
  };
}

async function expectTouchTarget(locator: Locator, label: string) {
  const box = await locator.boundingBox();
  expect(box, `${label} should be rendered`).not.toBeNull();
  expect(Math.round(box?.width ?? 0), `${label} width`).toBeGreaterThanOrEqual(
    44,
  );
  expect(
    Math.round(box?.height ?? 0),
    `${label} height`,
  ).toBeGreaterThanOrEqual(44);
}

async function completeLandingCheckout(
  page: Page,
  email = "owner@example.com",
) {
  await page
    .getByRole("button", { name: "Lanjut ke ringkasan pesanan" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ringkasan pesanan" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Ringkasan pesanan" })
      .getByText("Rp99.000", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Email penerima laporan*").fill(email);
  await page.getByRole("button", { name: "Lanjut ke pembayaran" }).click();
  await expect(
    page.getByRole("heading", { name: "Simulasi pembayaran" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Selesaikan simulasi pembayaran" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Memproses simulasi pembayaran" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pembayaran simulasi selesai" }),
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await grantAccess(page);
});

test.describe("C1 landing payment boundary", () => {
  test("landing stays side-effect free until the user submits", async ({
    page,
  }) => {
    let auditRequests = 0;
    await page.route("**/api/audit/**", async (route) => {
      auditRequests += 1;
      await route.abort();
    });

    await page.goto("/");
    const hero = page.getByRole("region", {
      name: "Mulai audit visibilitas AI",
    });
    await expect(
      hero.getByRole("heading", {
        name: "Cek bisnis Anda di AI",
      }),
    ).toBeVisible();
    await expect(hero.getByPlaceholder("https://bisnisanda.com")).toBeVisible();
    expect(auditRequests).toBe(0);
  });

  test("invalid input stays on the landing and makes no audit request", async ({
    page,
  }) => {
    let auditRequests = 0;
    await page.route("**/api/audit/**", async (route) => {
      auditRequests += 1;
      await route.abort();
    });

    await page.goto("/");
    const hero = page.getByRole("region", {
      name: "Mulai audit visibilitas AI",
    });
    await hero.getByPlaceholder("https://bisnisanda.com").fill("not a website");
    await hero.getByRole("button", { name: "Cek bisnis saya di AI" }).click();

    await expect(
      hero.getByText(
        "Masukkan link website resmi atau akun Instagram yang valid.",
      ),
    ).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/");
    expect(auditRequests).toBe(0);
  });

  test("valid submission calls identity only and preview back/edit stays pre-payment", async ({
    page,
  }) => {
    const calls = await stubIdentityAndExtraction(page);

    await page.goto("/");
    const hero = page.getByRole("region", {
      name: "Mulai audit visibilitas AI",
    });
    await hero.getByPlaceholder("https://bisnisanda.com").fill("example.com");
    await hero.getByRole("button", { name: "Cek bisnis saya di AI" }).click();

    await expect(
      page.getByRole("heading", { name: "Pratinjau identitas bisnis" }),
    ).toBeVisible();
    await expect(
      page.getByText("Example Business", { exact: true }),
    ).toBeVisible();
    expect(calls.identityCalls()).toBe(1);
    expect(calls.identitySource()).toBe(SOURCE);
    expect(calls.budgetCalls()).toBe(0);
    expect(calls.extractCalls()).toBe(0);
    expect(new URL(page.url()).pathname).toBe("/");
    expect(
      await page.evaluate(
        (key) => window.sessionStorage.getItem(key),
        AUDIT_WORKFLOW_STORAGE_KEY,
      ),
    ).toBeNull();

    await page
      .getByRole("button", { name: "Lanjut ke ringkasan pesanan" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Ringkasan pesanan" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Ringkasan pesanan" })
        .getByText("Rp99.000", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Kembali ke pratinjau" }).click();
    await expect(
      page.getByRole("heading", { name: "Pratinjau identitas bisnis" }),
    ).toBeVisible();
    expect(calls.extractCalls()).toBe(0);
  });

  test("simulated success precedes one authoritative initial extraction", async ({
    page,
  }) => {
    const calls = await stubIdentityAndExtraction(page);
    const requestSequence: string[] = [];
    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname === "/api/audit/identity") {
        requestSequence.push(`identity:${request.method()}`);
      }
      if (pathname === "/api/audit/extract") {
        requestSequence.push(`extract:${request.method()}`);
      }
    });

    await page.goto("/");
    const hero = page.getByRole("region", {
      name: "Mulai audit visibilitas AI",
    });
    await hero.getByPlaceholder("https://bisnisanda.com").fill("example.com");
    await hero.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
    await expect(
      page.getByRole("heading", { name: "Pratinjau identitas bisnis" }),
    ).toBeVisible();
    await completeLandingCheckout(page);
    await expect(
      page.getByText("Pembayaran simulasi selesai. Tidak ada tagihan.", {
        exact: true,
      }),
    ).toBeVisible();

    expect(calls.extractCalls()).toBe(0);
    expect(calls.budgetCalls()).toBe(0);
    expect(
      await page.evaluate(
        (key) => window.sessionStorage.getItem(key),
        AUDIT_WORKFLOW_STORAGE_KEY,
      ),
    ).toBeNull();
    expect(
      await page.evaluate(
        (key) => window.sessionStorage.getItem(key),
        AUDIT_SOURCE_HANDOFF_STORAGE_KEY,
      ),
    ).toBeNull();

    await page.getByRole("button", { name: "Mulai persiapan audit" }).click();
    await expect(page).toHaveURL(/\/audit\/v2\?entry=landing-paid$/);
    await expect
      .poll(() =>
        page.evaluate(
          (key) => window.sessionStorage.getItem(key),
          AUDIT_SOURCE_HANDOFF_STORAGE_KEY,
        ),
      )
      .toBeNull();
    await expect(
      page.getByRole("heading", {
        name: "Periksa brief brand Anda.",
      }),
    ).toBeVisible();
    await expect.poll(calls.extractCalls).toBe(1);
    expect(calls.budgetCalls()).toBeGreaterThanOrEqual(1);
    expect(calls.requestedSource()).toBe(SOURCE);
    expect(calls.requestedBody()).toMatchObject({
      website_url: SOURCE,
      brand_name: "",
      identity_unverified: true,
    });
    await page.waitForTimeout(300);
    expect(calls.extractCalls()).toBe(1);
    expect(requestSequence[0]).toBe("identity:GET");
    const extractEvents = requestSequence.slice(1);
    expect(extractEvents.filter((event) => event === "extract:POST")).toEqual([
      "extract:POST",
    ]);
    expect(
      extractEvents.slice(0, -1).every((event) => event === "extract:GET"),
    ).toBe(true);
  });

  test("post-payment extraction failure retries in the audit workflow without another payment", async ({
    page,
  }) => {
    const calls = await stubIdentityAndExtraction(page, {
      failFirstExtraction: true,
    });
    await page.goto("/");
    const hero = page.getByRole("region", {
      name: "Mulai audit visibilitas AI",
    });
    await hero.getByPlaceholder("https://bisnisanda.com").fill("example.com");
    await page.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
    await expect(
      page.getByRole("heading", { name: "Pratinjau identitas bisnis" }),
    ).toBeVisible();
    await completeLandingCheckout(page);
    await page.getByRole("button", { name: "Mulai persiapan audit" }).click();
    await expect(page).toHaveURL(/\/audit\/v2\?entry=landing-paid$/);

    await expect.poll(calls.extractCalls).toBe(1);
    await expect(
      page.getByText(
        "Sumber bisnis belum dapat dianalisis. Periksa sumber lalu coba lagi.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Selesaikan simulasi pembayaran" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Lanjutkan audit" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Periksa brief brand Anda.",
      }),
    ).toBeVisible();
    await expect.poll(calls.extractCalls).toBe(2);
    expect(calls.budgetCalls()).toBeGreaterThanOrEqual(1);
  });

  test("identity failure stays pre-payment and never reaches extraction", async ({
    page,
  }) => {
    const calls = await stubIdentityFailure(page);
    await page.goto("/");
    const hero = page.getByRole("region", {
      name: "Mulai audit visibilitas AI",
    });
    await hero.getByPlaceholder("https://bisnisanda.com").fill("example.com");
    await hero.getByRole("button", { name: "Cek bisnis saya di AI" }).click();

    await expect(
      hero.getByText(
        "Sumber publik belum dapat dibaca. Periksa link lalu coba lagi.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pratinjau identitas bisnis" }),
    ).toHaveCount(0);
    expect(calls.identityCalls()).toBe(1);
    expect(calls.extractCalls()).toBe(0);
  });

  test("an unconfident identity remains identity-unverified after payment", async ({
    page,
  }) => {
    const calls = await stubIdentityAndExtraction(page, { confidence: false });
    await page.goto("/");
    const hero = page.getByRole("region", {
      name: "Mulai audit visibilitas AI",
    });
    await hero.getByPlaceholder("https://bisnisanda.com").fill("example.com");
    await hero.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
    await expect(
      page.getByRole("heading", { name: "Pratinjau identitas bisnis" }),
    ).toBeVisible();
    await expect(
      page.getByText(/Nama brand belum dapat dipastikan dari sumber ini\./),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Lanjut ke ringkasan pesanan" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Ringkasan pesanan" }),
    ).toBeVisible();
    await page.getByLabel("Email penerima laporan*").fill("owner@example.com");
    await page.getByRole("button", { name: "Lanjut ke pembayaran" }).click();
    await expect(
      page.getByRole("heading", { name: "Simulasi pembayaran" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Selesaikan simulasi pembayaran" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Pembayaran simulasi selesai" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Mulai persiapan audit" }).click();
    await expect(page).toHaveURL(/\/audit\/v2\?entry=landing-paid$/);

    await expect(
      page.getByRole("heading", {
        name: "Periksa brief brand Anda.",
      }),
    ).toBeVisible();
    await expect.poll(calls.extractCalls).toBe(1);
    expect(calls.requestedBody()).toMatchObject({
      identity_unverified: true,
      brand_name: "",
    });
    const saved = await page.evaluate(
      (key) => JSON.parse(window.sessionStorage.getItem(key) || "null"),
      AUDIT_WORKFLOW_STORAGE_KEY,
    );
    expect(saved.factsExtracted).toBe(true);
    expect(saved.meta.identityUnverified).toBe(true);
    expect(saved.brief.brand_name).toBe("");
  });

  test("direct /audit source entry cannot bypass the simulated payment boundary", async ({
    page,
  }) => {
    const calls = await stubIdentityAndExtraction(page);
    await page.goto("/audit");
    await expect.poll(calls.budgetCalls).toBe(1);
    const source = page.getByPlaceholder("https://bisnisanda.com");
    await source.fill("example.com");
    await page.getByRole("button", { name: "Lanjutkan audit" }).click();

    await expect(
      page.getByText(
        "Mulai dari halaman utama untuk melihat pratinjau identitas dan menyelesaikan simulasi pembayaran.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(calls.extractCalls()).toBe(0);
  });

  test("a new landing source clears stale workflow state before payment", async ({
    page,
  }) => {
    const calls = await stubIdentityAndExtraction(page);
    await page.addInitScript(
      ({ workflowKey, varianceKey, failureKey }) => {
        window.sessionStorage.setItem(
          workflowKey,
          JSON.stringify({ stale: true }),
        );
        window.sessionStorage.setItem(
          varianceKey,
          JSON.stringify({ stale: true }),
        );
        window.sessionStorage.setItem(
          failureKey,
          JSON.stringify({ stale: true }),
        );
      },
      {
        workflowKey: AUDIT_WORKFLOW_STORAGE_KEY,
        varianceKey: VARIANCE_STORAGE_KEY,
        failureKey: VARIANCE_FAILURE_STORAGE_KEY,
      },
    );

    await page.goto("/");
    await page
      .getByRole("region", { name: "Mulai audit visibilitas AI" })
      .getByPlaceholder("https://bisnisanda.com")
      .fill("example.com");
    await page
      .getByRole("region", { name: "Mulai audit visibilitas AI" })
      .getByRole("button", { name: "Cek bisnis saya di AI" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Pratinjau identitas bisnis" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        ({ workflowKey, varianceKey, failureKey }) => ({
          workflow: window.sessionStorage.getItem(workflowKey),
          variance: window.sessionStorage.getItem(varianceKey),
          failure: window.sessionStorage.getItem(failureKey),
        }),
        {
          workflowKey: AUDIT_WORKFLOW_STORAGE_KEY,
          varianceKey: VARIANCE_STORAGE_KEY,
          failureKey: VARIANCE_FAILURE_STORAGE_KEY,
        },
      ),
    ).toEqual({ workflow: null, variance: null, failure: null });
    expect(calls.extractCalls()).toBe(0);
  });

  for (const viewport of [
    { name: "mobile", width: 375, height: 812 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1280, height: 800 },
  ]) {
    test(`hero and landing remain horizontally contained at ${viewport.name} width`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto("/");
      const hero = page.getByRole("region", {
        name: "Mulai audit visibilitas AI",
      });
      await expect(hero).toBeVisible();
      await expectNoHorizontalScroll(page);
      await hero
        .getByRole("heading", {
          name: "Cek bisnis Anda di AI",
        })
        .scrollIntoViewIfNeeded();
      await expectNoHorizontalScroll(page);
      await page
        .getByRole("heading", { name: "Pertanyaan umum" })
        .scrollIntoViewIfNeeded();
      await expectNoHorizontalScroll(page);
    });
  }
});

test.describe("C1 mobile touch targets", () => {
  test("identity preview and payment actions remain touch-sized", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const calls = await stubIdentityAndExtraction(page);

    await page.goto("/");
    const hero = page.getByRole("region", {
      name: "Mulai audit visibilitas AI",
    });
    await expectTouchTarget(
      hero.getByRole("button", { name: "Cek bisnis saya di AI" }),
      "source submit",
    );
    await expectTouchTarget(
      page.locator('[data-slot="accordion-trigger"]').first(),
      "FAQ disclosure",
    );

    const menuTrigger = page.getByRole("button", { name: "Buka menu" });
    await expectTouchTarget(menuTrigger, "mobile menu trigger");
    await menuTrigger.click();
    const sheetClose = page.getByRole("button", { name: "Close" });
    await expect(sheetClose).toBeVisible();
    await expectTouchTarget(sheetClose, "Sheet close");
    await page.keyboard.press("Escape");
    await expect(sheetClose).toHaveCount(0);

    await hero.getByPlaceholder("https://bisnisanda.com").fill("example.com");
    await hero.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
    await expect(
      page.getByRole("heading", { name: "Pratinjau identitas bisnis" }),
    ).toBeVisible();
    await expectTouchTarget(
      page.getByRole("button", { name: "Lanjut ke ringkasan pesanan" }),
      "preview continue",
    );
    await page
      .getByRole("button", { name: "Lanjut ke ringkasan pesanan" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Ringkasan pesanan" }),
    ).toBeVisible();
    await page.getByLabel("Email penerima laporan*").fill("owner@example.com");
    await expectTouchTarget(
      page.getByRole("button", { name: "Lanjut ke pembayaran" }),
      "order continue",
    );
    await page.getByRole("button", { name: "Lanjut ke pembayaran" }).click();
    await expect(
      page.getByRole("heading", { name: "Simulasi pembayaran" }),
    ).toBeVisible();
    await expectTouchTarget(
      page.getByRole("button", { name: "Selesaikan simulasi pembayaran" }),
      "simulated payment",
    );
    await page
      .getByRole("button", { name: "Selesaikan simulasi pembayaran" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Pembayaran simulasi selesai" }),
    ).toBeVisible();
    expect(calls.extractCalls()).toBe(0);
  });

  test("fixture and report actions remain touch-sized on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    seedFixtureState(page, v3ReadyState());
    await page.goto("/audit/fixture");
    await expectReadyReport(page);

    await expectTouchTarget(
      page.getByRole("button", { name: "Download PDF" }).first(),
      "fixture PDF action",
    );
    await expectTouchTarget(
      page.getByRole("button", { name: "Unduh JSON" }),
      "report JSON action",
    );
    await expectTouchTarget(
      page.getByRole("button", { name: "Mulai ulang" }).first(),
      "fixture restart action",
    );

    await page.goto("/audit/spec004");
    await expectTouchTarget(
      page.getByRole("button", { name: "kopitamansenja.example" }),
      "Spec004 example action",
    );
  });
});

test("E1 pre-payment actions remain touch-sized on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await stubIdentityAndExtraction(page);
  await page.goto("/");
  const hero = page.getByRole("region", {
    name: "Mulai audit visibilitas AI",
  });
  await hero.getByPlaceholder("https://bisnisanda.com").fill("example.com");
  await hero.getByRole("button", { name: "Cek bisnis saya di AI" }).click();
  await expect(
    page.getByRole("heading", { name: "Pratinjau identitas bisnis" }),
  ).toBeVisible();
  await expectTouchTarget(
    page.getByRole("button", { name: "Lanjut ke ringkasan pesanan" }),
    "desktop preview continue",
  );
  await page
    .getByRole("button", { name: "Lanjut ke ringkasan pesanan" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ringkasan pesanan" }),
  ).toBeVisible();
  await page.getByLabel("Email penerima laporan*").fill("owner@example.com");
  await expectTouchTarget(
    page.getByRole("button", { name: "Lanjut ke pembayaran" }),
    "desktop order continue",
  );
  await page.getByRole("button", { name: "Lanjut ke pembayaran" }).click();
  await expect(
    page.getByRole("heading", { name: "Simulasi pembayaran" }),
  ).toBeVisible();
  await expectTouchTarget(
    page.getByRole("button", { name: "Selesaikan simulasi pembayaran" }),
    "desktop simulated payment",
  );
});
