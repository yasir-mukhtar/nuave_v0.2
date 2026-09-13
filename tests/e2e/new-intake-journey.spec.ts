import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { readFile } from "node:fs/promises";

const shell = (page: Page) => page.locator("[data-new-intake-shell]");
const current = (page: Page) =>
  shell(page).getAttribute("data-new-intake-shell");
const primary = (page: Page) =>
  page.locator("footer").getByRole("button").last();
const back = (page: Page) =>
  page.locator("footer").getByRole("button", { name: /Kembali|Batal/ });
const scopeNames = {
  brand: "Brand secara keseluruhan",
  cabang: "Satu lokasi",
  produk: "Satu produk atau layanan",
} as const;

async function shot(page: Page, info: TestInfo, name: string) {
  await page.screenshot({
    path: info.outputPath(`${name}.png`),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

async function entry(page: Page, scope: keyof typeof scopeNames, suffix = "") {
  await page.goto(`/audit/new-intake${suffix}`);
  await expect(shell(page)).toHaveAttribute("data-new-intake-shell", "s-brand");
  await primary(page).click();
  await expect(shell(page)).toHaveAttribute("data-new-intake-shell", "s-scope");
  await expect(primary(page)).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("radio", { name: scopeNames[scope] }).click();
  await primary(page).click();
  await expect(shell(page)).toHaveAttribute(
    "data-new-intake-shell",
    scope === "brand"
      ? "s-category"
      : scope === "cabang"
        ? "s-branch"
        : "s-product",
  );
}

async function completeOwner(page: Page, state: string) {
  if (["s-branch", "s-product", "s-category"].includes(state)) {
    const selected = page.getByRole("radio", { checked: true });
    if (!(await selected.count()))
      await page.getByRole("radio").first().click();
  }
  if (
    state === "s-service" &&
    !(await page.getByRole("checkbox", { checked: true }).count())
  )
    await page.getByRole("checkbox").first().click();
  if (state === "s-market")
    await page.getByRole("radio", { name: "Seluruh Indonesia" }).click();
  if (
    state === "s-competitors" &&
    !(await page.getByRole("checkbox", { checked: true }).count())
  )
    await page
      .getByRole("checkbox", {
        name: "Tidak ada pesaing langsung yang saya tahu",
        exact: true,
      })
      .click();
}

async function toReview(page: Page, info?: TestInfo, prefix = "journey") {
  const visited: string[] = [];
  for (let count = 0; count < 15; count++) {
    const state = await current(page);
    if (state === "s-review") return visited;
    if (!state) throw new Error("Intake shell is missing");
    visited.push(state);
    await completeOwner(page, state);
    if (info)
      await shot(
        page,
        info,
        `${prefix}-${String(count).padStart(2, "0")}-${state}`,
      );
    await expect(primary(page)).toHaveAttribute("aria-disabled", "false");
    await primary(page).click();
    await expect(shell(page)).not.toHaveAttribute(
      "data-new-intake-shell",
      state,
    );
  }
  throw new Error("The normal controls did not reach Review");
}

async function questions(page: Page) {
  await expect(shell(page)).toHaveAttribute(
    "data-new-intake-shell",
    "s-review",
  );
  await primary(page).click();
  await expect(
    page.getByRole("heading", {
      name: "Periksa pertanyaan audit",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("[data-question-slot]")).toHaveCount(10);
}

async function downloadHandoff(page: Page) {
  await primary(page).click();
  await expect(
    page.getByRole("heading", { name: "Serah terima lokal siap", exact: true }),
  ).toBeVisible();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Unduh serah terima", exact: true })
    .click();
  const downloaded = await pending;
  const path = await downloaded.path();
  return JSON.parse(await readFile(path!, "utf8"));
}

test.beforeEach(async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (
      url.origin !== new URL(baseURL!).origin ||
      url.pathname.startsWith("/api/")
    )
      return route.abort();
    return route.continue();
  });
});

for (const scope of ["brand", "cabang", "produk"] as const) {
  test(`normal controls complete the ${scope} route and exact local handoff`, async ({
    page,
  }, info) => {
    const requests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/"))
        requests.push(request.url());
    });
    await entry(page, scope);
    const visited = await toReview(page, info, scope);
    expect(visited.includes("s-branch")).toBe(scope === "cabang");
    expect(visited.includes("s-product")).toBe(scope === "produk");
    expect(visited.includes("s-offerings")).toBe(scope !== "produk");
    await expect(
      page.getByText("Pratinjau lima layar", { exact: true }),
    ).toHaveCount(0);
    const reviewText = await shell(page).innerText();
    await shot(page, info, `${scope}-review`);
    await questions(page);
    await shot(page, info, `${scope}-questions`);
    const handoff = await downloadHandoff(page);
    expect(handoff).toMatchObject({
      mode: "local-simulation",
      auditExecuted: false,
      providerCalls: 0,
    });
    expect(handoff.input.confirmed.scope).toBe(scope);
    expect(handoff.questions.inputFingerprint).toBe(handoff.input.fingerprint);
    expect(handoff.questions.factVersion).toBe(handoff.input.factVersion);
    expect(handoff.questions.promptPack.prompts).toHaveLength(10);
    for (const row of handoff.input.reviewRows)
      expect(reviewText).toContain(row.value);
    expect(handoff.input.confirmed.market).toEqual({
      reach: "seluruh",
      areas: [],
    });
    expect(requests).toEqual([]);
    await shot(page, info, `${scope}-start`);
  });
}

test("saved question edits survive Back, Next and refresh; intake changes replace stale questions", async ({
  page,
}) => {
  await entry(page, "brand");
  await toReview(page);
  await questions(page);
  const wording =
    "Pilihan kedai kopi apa yang cocok untuk pelanggan di seluruh Indonesia?";
  await page
    .getByRole("button", { name: "Ubah pertanyaan 1", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Pertanyaan 1", exact: true })
    .fill(wording);
  await expect(primary(page)).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await back(page).click();
  await questions(page);
  await expect(page.locator('[data-question-slot="1"]')).toContainText(wording);
  await page.reload();
  await expect(page.locator('[data-question-slot="1"]')).toContainText(wording);
  await back(page).click();
  await page
    .getByRole("button", { name: "Ubah Hal yang wajib benar", exact: true })
    .click();
  await page
    .getByRole("textbox")
    .fill("Kemasan biji kopi tersedia dalam ukuran 250 gram.");
  await primary(page).click();
  await expect(shell(page)).toHaveAttribute(
    "data-new-intake-shell",
    "s-review",
  );
  await questions(page);
  await expect(page.locator('[data-question-slot="1"]')).not.toContainText(
    wording,
  );
  const handoff = await downloadHandoff(page);
  expect(handoff.input.confirmed.publicFact).toBe(
    "Kemasan biji kopi tersedia dalam ukuran 250 gram.",
  );
  expect(handoff.questions.inputFingerprint).toBe(handoff.input.fingerprint);
});

test("every Review owner supports unchanged Save and Cancel; scope edits reconfirm only dependents", async ({
  page,
}) => {
  await entry(page, "cabang");
  await toReview(page);
  const owners = await page
    .getByRole("button", { name: /^Ubah / })
    .allTextContents();
  const labels = await page
    .getByRole("button", { name: /^Ubah / })
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("aria-label")!),
    );
  expect(owners.length).toBeGreaterThanOrEqual(10);
  for (const label of labels) {
    const original = await shell(page).innerText();
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(shell(page)).not.toHaveAttribute(
      "data-new-intake-shell",
      "s-review",
    );
    await back(page).click();
    await expect(shell(page)).toHaveAttribute(
      "data-new-intake-shell",
      "s-review",
    );
    expect(await shell(page).innerText()).toBe(original);
    await page.getByRole("button", { name: label, exact: true }).click();
    await primary(page).click();
    await expect(shell(page)).toHaveAttribute(
      "data-new-intake-shell",
      "s-review",
    );
    expect(await shell(page).innerText()).toBe(original);
  }
  await page
    .getByRole("button", { name: "Ubah Fokus audit", exact: true })
    .click();
  await page.getByRole("radio", { name: scopeNames.produk }).click();
  await primary(page).click();
  await expect(shell(page)).toHaveAttribute(
    "data-new-intake-shell",
    "s-product",
  );
  const visited = await toReview(page);
  expect(visited).not.toContain("s-offerings");
  expect(visited).not.toContain("s-branch");
  await expect(
    page.getByRole("button", { name: "Ubah Produk dan layanan", exact: true }),
  ).toHaveCount(0);
  await questions(page);
  const handoff = await downloadHandoff(page);
  expect(handoff.input.confirmed.scope).toBe("produk");
  expect(handoff.input.confirmed.offerings).toEqual([]);
});

test("market areas validate, nationwide and international clear them, and no-direct mode excludes names", async ({
  page,
}) => {
  await entry(page, "brand");
  await toReview(page);
  await page.getByRole("button", { name: "Ubah Pasar", exact: true }).click();
  await page.getByRole("radio", { name: "Sekitar satu area" }).click();
  await expect(primary(page)).toHaveAttribute("aria-disabled", "true");
  await page
    .getByRole("textbox", { name: "Tambah area lain", exact: true })
    .fill("Yogyakarta");
  await page.getByRole("button", { name: "Tambahkan", exact: true }).click();
  await primary(page).click();
  await toReview(page);
  await expect(
    page.getByRole("button", { name: "Ubah Pasar", exact: true }),
  ).toContainText("Yogyakarta");
  await page.getByRole("button", { name: "Ubah Pasar", exact: true }).click();
  await page.getByRole("radio", { name: "Beberapa area" }).click();
  await expect(primary(page)).toHaveAttribute("aria-disabled", "true");
  for (const area of ["Malang", "Surabaya"]) {
    await page
      .getByRole("textbox", { name: "Tambah area lain", exact: true })
      .fill(area);
    await page.getByRole("button", { name: "Tambahkan", exact: true }).click();
  }
  await primary(page).click();
  await toReview(page);
  await page.getByRole("button", { name: "Ubah Pasar", exact: true }).click();
  await page.getByRole("radio", { name: "Indonesia dan luar negeri" }).click();
  await expect(
    page.getByRole("textbox", { name: "Tambah area lain", exact: true }),
  ).toBeHidden();
  await primary(page).click();
  await toReview(page);
  await page
    .getByRole("button", { name: "Ubah Pembanding", exact: true })
    .click();
  await page
    .getByRole("checkbox", {
      name: "Tidak ada pesaing langsung yang saya tahu",
      exact: true,
    })
    .click();
  await primary(page).click();
  await toReview(page);
  await questions(page);
  const handoff = await downloadHandoff(page);
  expect(handoff.input.confirmed.market).toEqual({ reach: "luar", areas: [] });
  expect(handoff.input.confirmed.comparators).toEqual({
    mode: "category-alternatives",
    names: [],
  });
});

test("wrong brand correction commits only after reading and Back skips processing", async ({
  page,
}) => {
  await page.goto("/audit/new-intake");
  await expect(shell(page)).toHaveAttribute("data-new-intake-shell", "s-brand");
  await page.getByRole("button", { name: "Ubah", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Nama brand", exact: true })
    .fill("Kedai Fiktif Pagi");
  await page
    .getByRole("textbox", { name: "Sumber bisnis", exact: true })
    .fill("https://kedaifiktif.example");
  await primary(page).click();
  await expect(shell(page)).toHaveAttribute("data-new-intake-shell", "s-brand");
  await expect(
    page.getByRole("heading", { name: "Kedai Fiktif Pagi", exact: true }),
  ).toBeVisible();
  await primary(page).click();
  await back(page).click();
  await expect(shell(page)).toHaveAttribute("data-new-intake-shell", "s-brand");
  await expect(
    page.getByRole("heading", { name: "Kedai Fiktif Pagi", exact: true }),
  ).toBeVisible();
});

test("empty location and product preparation offer valid manual target controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  for (const scope of ["cabang", "produk"] as const) {
    await page.goto("/audit/new-intake?fixture=F2");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await entry(page, scope, "?fixture=F2");
    await expect(page.getByRole("radio")).toHaveCount(0);
    await expect(primary(page)).toHaveAttribute("aria-disabled", "true");
    await page
      .getByRole("textbox", {
        name: scope === "cabang" ? "Nama lokasi" : "Nama produk atau layanan",
        exact: true,
      })
      .fill(scope === "cabang" ? "Gerai Melati" : "Paket langganan mingguan");
    if (scope === "cabang")
      await page
        .getByRole("textbox", {
          name: "Alamat atau area yang membedakan lokasi",
          exact: true,
        })
        .fill("Jalan Melati 12, Yogyakarta");
    await page.getByRole("button", { name: "Tambah", exact: true }).click();
    await primary(page).click();
    await expect(shell(page)).toHaveAttribute(
      "data-new-intake-shell",
      "s-category",
    );
    expect(errors).toEqual([]);
    await back(page).click();
    await expect(page.getByRole("radio", { checked: true })).toContainText(
      scope === "cabang" ? "Gerai Melati" : "Paket langganan mingguan",
    );
  }
});

test("unavailable reading stays failed on retry until the owner corrects its identity and source", async ({
  page,
}) => {
  await page.goto("/audit/new-intake?fixture=F6");
  await expect(shell(page).getByRole("alert")).toBeVisible();
  await expect(shell(page)).toHaveAttribute("data-new-intake-shell", "s-crawl");
  await expect(
    page.getByRole("heading", {
      name: "Kami menemukan brand ini",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Coba lagi", exact: true }).click();
  await expect(shell(page).getByRole("alert")).toContainText(
    "Nama brand belum tersedia",
  );
  await expect(shell(page)).toHaveAttribute("data-new-intake-shell", "s-crawl");
  await expect(
    page.getByRole("heading", {
      name: "Kami menemukan brand ini",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Ubah sumber", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Nama brand", exact: true })
    .fill("Kedai Fiktif Pagi");
  await page
    .getByRole("textbox", { name: "Sumber bisnis", exact: true })
    .fill("https://kedaifiktif.example");
  await primary(page).click();
  await expect(shell(page)).toHaveAttribute("data-new-intake-shell", "s-brand");
  await expect(
    page.getByRole("heading", { name: "Kedai Fiktif Pagi", exact: true }),
  ).toBeVisible();
});

test("question failure returns unchanged Review and retry prepares a startable pack", async ({
  page,
}) => {
  await entry(page, "brand", "?failure=questions");
  await toReview(page);
  const review = await shell(page).innerText();
  await primary(page).click();
  await expect(shell(page).getByRole("alert")).toBeVisible();
  await expect(page.locator("[data-question-slot]")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Kembali ke informasi brand", exact: true })
    .click();
  await expect(shell(page)).toHaveAttribute(
    "data-new-intake-shell",
    "s-review",
  );
  expect(await shell(page).innerText()).toBe(review);
  await questions(page);
  expect((await downloadHandoff(page)).auditExecuted).toBe(false);
});
