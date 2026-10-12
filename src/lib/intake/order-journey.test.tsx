// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SmartAuditStage from "@/app/audit/SmartAuditStage";
import { extractionDraftSchema } from "../audit/types";
import { SMART_INTAKE_STORAGE_KEY } from "./smart-intake-contract";
import SmartIntakeJourney from "./SmartIntakeJourney";
import {
  ACTIVE_ORDER_STORAGE_KEY,
  parseSmartSession,
  readActiveOrder,
  readSmartSession,
  SMART_SESSION_MAX_AGE_MS,
  writeActiveOrder,
  writeSmartSession,
  freshSmartSession,
} from "./smart-session";

// Spec 016 R-29..R-31, AC-19 in the browser: the order screen, saved progress,
// the progress view of the server-side audit and the storage rules. The server
// is a fetch stub; the order and runner mechanics are in orders/*.test.ts.

const ORDER_ID = "0123456789abcdef0123456789abcdef";
const OTHER_ORDER_ID = "fedcba9876543210fedcba9876543210";
const EMAIL = "pemilik@example.com";

const draft = extractionDraftSchema.parse({
  brand_name: "Kedai Fiksi",
  entity_scope: "",
  brand_type: "",
  category: "kedai kopi",
  market_context: "",
  service_channels: ["on_premise"],
  market_reach: "sekitar",
  market_areas: ["Bandung"],
  target_customer: "pekerja sekitar",
  official_sources: ["https://kedai-fiksi.example/"],
  verified_offerings: ["kopi susu"],
  verified_customer_needs: ["minuman dekat kantor"],
  verified_decision_criteria: ["lokasi"],
  similar_businesses: [],
  brand_name_variants: [],
  priority_offering: "",
  conversion_action: "",
  customer_supplied_facts: [],
  known_accuracy_questions: [],
  usp: "Racikan fiktif",
  regulated_category_notes: "",
  evidence: [],
  warnings: [],
});

type Stub = {
  calls: string[];
  bodies: Record<string, Array<Record<string, unknown>>>;
  status: () => Record<string, unknown>;
  orderResponse: () => Response;
  approveResponse: () => Response;
  glmResponse: () => Response;
};

function stubServer(overrides: Partial<Stub> = {}): Stub {
  const stub: Stub = {
    calls: [],
    bodies: {},
    status: () => ({ state: "open", completed: 0, total: 10, questions: [] }),
    orderResponse: () => Response.json({ order_id: ORDER_ID, state: "open" }),
    approveResponse: () => Response.json({ state: "running" }),
    glmResponse: () =>
      Response.json({
        status: "ok",
        questions: Array.from(
          { length: 10 },
          (_, index) =>
            `Pilihan kedai kopi apa di Bandung untuk kebutuhan ${index + 1}?`,
        ),
        provenance: {
          requestId: "fictional",
          method: "direct-ten",
          requestedModel: "synthetic",
          returnedModel: "synthetic",
          responseId: "fictional-response",
          modelMismatch: false,
          transport: "synthetic-stub",
        },
        cost: { billedUsd: null, available: false },
      }),
    ...overrides,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const key = url.startsWith("/api/audit/identity") ? "identity" : url;
      stub.calls.push(key);
      if (init?.body)
        (stub.bodies[key] ??= []).push(
          JSON.parse(String(init.body)) as Record<string, unknown>,
        );
      if (key === "identity")
        return Response.json({
          canonical_url: "https://kedai-fiksi.example/",
          display_name: "Kedai Fiksi",
          preparation_mode: "synthetic-local",
        });
      if (key === "/api/orders") return stub.orderResponse();
      if (key === "/api/orders/status") return Response.json(stub.status());
      if (key === "/api/orders/approve") return stub.approveResponse();
      if (key === "/api/audit/extract")
        return Response.json({
          draft,
          telemetry: [],
          preparation_mode: "synthetic-local",
        });
      if (key === "/api/audit/glm-questions") return stub.glmResponse();
      throw new Error(`Unexpected request ${url}`);
    }),
  );
  return stub;
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const lanjut = () =>
  fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
const heading = (name: string | RegExp) =>
  screen.findByRole("heading", { name });

async function enterBusiness() {
  await screen.findByRole("textbox", { name: "Nama bisnis" });
  fireEvent.change(screen.getByRole("textbox", { name: "Nama bisnis" }), {
    target: { value: "Kedai Fiksi" },
  });
  fireEvent.change(
    screen.getByRole("textbox", { name: "URL website publik" }),
    { target: { value: "https://kedai-fiksi.example/" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
  await heading("Ini brand yang ingin Anda audit?");
  lanjut();
  await heading("Ringkasan pesanan");
}
async function typeEmail(value = EMAIL) {
  fireEvent.change(screen.getByRole("textbox", { name: /Email/ }), {
    target: { value },
  });
}
async function throughDetails() {
  await heading("Apa yang ingin Anda audit?");
  for (const name of [
    /biasanya disebut apa\?$/,
    /yang Anda tawarkan\?$/,
    "Siapa pelanggan utama Anda?",
    "Kenapa pelanggan biasanya mencari yang seperti ini?",
    "Apa yang dipertimbangkan pelanggan saat memilih?",
    "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
    "Di mana pelanggan Anda berada?",
    "Ini yang mungkin dibandingkan dengan Anda",
    "Apa yang membedakan bisnis Anda?",
    "Apa yang tidak boleh salah dipahami tentang brand Anda?",
  ]) {
    lanjut();
    await heading(name);
  }
  lanjut();
  await heading("Ini yang akan Nuave audit");
}
async function toQuestions() {
  await enterBusiness();
  await typeEmail();
  lanjut();
  await throughDetails();
  fireEvent.click(
    screen.getByRole("button", {
      name: "Sudah sesuai — buat pertanyaan audit",
    }),
  );
  await heading("Periksa pertanyaan audit");
}

describe("the order screen (R-01, R-06, AC-01)", () => {
  it("shows the business, what the report includes and an email field, with no price and no payment", async () => {
    stubServer();
    render(<SmartIntakeJourney live={false} />);
    await enterBusiness();
    expect(
      screen.getByRole("article", { name: "Bisnis yang diaudit" }).textContent,
    ).toContain("Kedai Fiksi");
    expect(screen.getByText("Isi laporan")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: /Email/ })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(
      /Rp\s?\d|IDR|USD|bayar|harga/i,
    );
  });

  it("makes no order and no paid call for a missing or bad email", async () => {
    const server = stubServer();
    render(<SmartIntakeJourney live={false} />);
    await enterBusiness();
    for (const value of [
      "",
      "pemilik",
      "a@b",
      "dua@example.com dan satu@example.com",
    ]) {
      await typeEmail(value);
      lanjut();
      expect((await screen.findByRole("alert")).textContent).toContain(
        "alamat email yang valid",
      );
    }
    expect(server.calls).toEqual(["identity"]);
  });

  it("an email that cannot order (not listed or cap full) shows today's unavailable copy and makes no paid call", async () => {
    const server = stubServer({
      orderResponse: () =>
        Response.json(
          {
            error: "Audit tidak tersedia saat ini.",
            code: "ORDER_UNAVAILABLE",
          },
          { status: 503 },
        ),
    });
    render(<SmartIntakeJourney live />);
    await enterBusiness();
    await typeEmail();
    lanjut();
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Audit tidak tersedia saat ini.",
    );
    expect(server.calls).toEqual(["identity", "/api/orders"]);
    expect(
      screen.queryByRole("heading", { name: "Apa yang ingin Anda audit?" }),
    ).toBeNull();
    // The customer is still on the order screen with the progress kept.
    expect(
      screen.getByRole("heading", { name: "Ringkasan pesanan" }),
    ).toBeTruthy();
  });

  it("sends the email only to the order route, and never keeps it in the browser", async () => {
    const server = stubServer();
    render(<SmartIntakeJourney live={false} />);
    await enterBusiness();
    await typeEmail();
    lanjut();
    await heading("Apa yang ingin Anda audit?");
    expect(server.bodies["/api/orders"]).toEqual([
      {
        email: EMAIL,
        business_name: "Kedai Fiksi",
        website: "https://kedai-fiksi.example/",
      },
    ]);
    for (const key of Object.keys(server.bodies)) {
      if (key === "/api/orders") continue;
      expect(JSON.stringify(server.bodies[key])).not.toContain(EMAIL);
    }
    expect(JSON.stringify({ ...window.localStorage })).not.toContain(EMAIL);
    expect(JSON.stringify({ ...window.sessionStorage })).not.toContain(EMAIL);
    // The paid reading carries only the order id.
    expect(server.bodies["/api/audit/extract"]).toEqual([
      { order_id: ORDER_ID },
    ]);
  });
});

describe("saved progress (R-29, R-30, R-31, AC-19)", () => {
  it("closing the tab and opening /audit again continues at the same screen with the same answers and repeats no paid step", async () => {
    const server = stubServer();
    const first = render(<SmartIntakeJourney live={false} />);
    await enterBusiness();
    await typeEmail();
    lanjut();
    await heading("Apa yang ingin Anda audit?");
    lanjut();
    await heading(/biasanya disebut apa\?$/);
    lanjut();
    await heading(/yang Anda tawarkan\?$/);
    const before = readSmartSession();
    expect(before?.stage).toBe("offerings");
    const paidBefore = server.calls.filter((call) =>
      [
        "/api/audit/extract",
        "/api/audit/glm-questions",
        "/api/orders",
      ].includes(call),
    );
    first.unmount();

    render(<SmartIntakeJourney live={false} />);
    await heading(/yang Anda tawarkan\?$/);
    expect(readSmartSession()?.selection).toEqual(before?.selection);
    expect(
      server.calls.filter((call) =>
        [
          "/api/audit/extract",
          "/api/audit/glm-questions",
          "/api/orders",
        ].includes(call),
      ),
    ).toEqual(paidBefore);
  });

  it("an ended order sends the customer back to the order screen; the answers stay and a new order makes no new paid call", async () => {
    let state = "open";
    const server = stubServer({
      status: () => ({ state, completed: 0, total: 10, questions: [] }),
    });
    const first = render(<SmartIntakeJourney live={false} />);
    await enterBusiness();
    await typeEmail();
    lanjut();
    await heading("Apa yang ingin Anda audit?");
    lanjut();
    await heading(/biasanya disebut apa\?$/);
    const savedSelection = readSmartSession()?.selection;
    first.unmount();

    state = "expired";
    render(<SmartIntakeJourney live={false} />);
    await heading("Ringkasan pesanan");
    expect(
      screen.getByText(
        /Pesanan Anda sudah berakhir\. Isian Anda tetap tersimpan/,
      ),
    ).toBeTruthy();
    expect(readSmartSession()?.order).toBeNull();
    // The email is asked again.
    server.orderResponse = () =>
      Response.json({ order_id: OTHER_ORDER_ID, state: "open" });
    await typeEmail("baru@example.com");
    lanjut();
    await heading(/biasanya disebut apa\?$/);
    const after = readSmartSession();
    expect(after?.order?.id).toBe(OTHER_ORDER_ID);
    expect(after?.selection).toEqual(savedSelection);
    expect(server.calls.filter((call) => call === "/api/orders")).toHaveLength(
      2,
    );
    expect(
      server.calls.filter((call) => call === "/api/audit/extract"),
    ).toHaveLength(1);
  });

  it("a server that no longer knows the order counts as ended", async () => {
    const server = stubServer();
    const first = render(<SmartIntakeJourney live={false} />);
    await enterBusiness();
    await typeEmail();
    lanjut();
    await heading("Apa yang ingin Anda audit?");
    first.unmount();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "Not found" }, { status: 404 })),
    );
    render(<SmartIntakeJourney live={false} />);
    await heading("Ringkasan pesanan");
    void server;
  });

  it("progress saved more than 7 days ago is removed and the journey starts empty", async () => {
    stubServer();
    const old = {
      ...freshSmartSession(),
      entry: { name: "Kedai Lama", source: "https://lama.example/" },
      savedAt: new Date(
        Date.now() - SMART_SESSION_MAX_AGE_MS - 60_000,
      ).toISOString(),
    };
    window.localStorage.setItem(SMART_INTAKE_STORAGE_KEY, JSON.stringify(old));
    render(<SmartIntakeJourney live={false} />);
    const name = await screen.findByRole("textbox", { name: "Nama bisnis" });
    expect((name as HTMLInputElement).value).toBe("");
    expect(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)).toBeNull();
  });

  it("progress saved 6 days ago is kept", () => {
    const recent = {
      ...freshSmartSession(),
      entry: { name: "Kedai Baru", source: "https://baru.example/" },
      savedAt: new Date(Date.now() - 6 * 24 * 3600_000).toISOString(),
    };
    window.localStorage.setItem(
      SMART_INTAKE_STORAGE_KEY,
      JSON.stringify(recent),
    );
    expect(readSmartSession()?.entry.name).toBe("Kedai Baru");
  });

  it("works without browser storage (blocked or full)", async () => {
    stubServer();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<SmartIntakeJourney live={false} />);
    await enterBusiness();
    expect(readSmartSession()).toBeNull();
    expect(readActiveOrder()).toBeNull();
    expect(() => writeSmartSession(freshSmartSession())).not.toThrow();
    expect(() => writeActiveOrder(ORDER_ID)).not.toThrow();
  });

  it("the saved record never has an email field", async () => {
    stubServer();
    render(<SmartIntakeJourney live={false} />);
    await enterBusiness();
    await typeEmail();
    lanjut();
    await heading("Apa yang ingin Anda audit?");
    const raw = window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)!;
    expect(raw).not.toMatch(/email/i);
    expect(parseSmartSession(raw)?.order).toEqual({
      id: ORDER_ID,
      website: "https://kedai-fiksi.example/",
      name: "Kedai Fiksi",
    });
  });
});

describe("approving the questions and the audit starting (R-17, R-31)", () => {
  it("posts the approved and original wording, removes the intake progress and keeps only the order id", async () => {
    const server = stubServer();
    render(<SmartIntakeJourney live={false} />);
    await toQuestions();
    fireEvent.click(screen.getByRole("button", { name: "Ubah pertanyaan 1" }));
    const edited =
      "Pilihan kedai kopi apa yang cocok untuk pekerja di Bandung?";
    fireEvent.change(screen.getByRole("textbox", { name: "Pertanyaan 1" }), {
      target: { value: edited },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    fireEvent.click(screen.getByRole("button", { name: "Mulai audit" }));
    await screen.findByText(/Anda boleh menutup halaman ini/);
    const [sent] = server.bodies["/api/orders/approve"] as Array<{
      order_id: string;
      prompts: Array<{ question: string }>;
      originals: string[];
    }>;
    expect(sent.order_id).toBe(ORDER_ID);
    expect(sent.prompts[0].question).toBe(edited);
    expect(sent.originals[0]).toBe(
      "Pilihan kedai kopi apa di Bandung untuk kebutuhan 1?",
    );
    expect(sent).not.toHaveProperty("email");
    // R-31.
    expect(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)).toBeNull();
    expect(readActiveOrder()).toBe(ORDER_ID);
    expect(window.localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY)).toBe(
      JSON.stringify({ orderId: ORDER_ID }),
    );
    expect(JSON.stringify({ ...window.localStorage })).not.toContain(EMAIL);
  });

  it("an order that ended before approval returns to the order screen with the answers kept", async () => {
    const server = stubServer({
      approveResponse: () =>
        Response.json(
          {
            error: "Pesanan ini tidak dapat dilanjutkan.",
            code: "ORDER_STATE",
          },
          { status: 409 },
        ),
    });
    render(<SmartIntakeJourney live={false} />);
    await toQuestions();
    fireEvent.click(screen.getByRole("button", { name: "Mulai audit" }));
    await heading("Ringkasan pesanan");
    expect(readSmartSession()?.pack).not.toBeNull();
    expect(readSmartSession()?.afterOrder).toBe("questions");
    expect(readActiveOrder()).toBeNull();
    void server;
  });

  it("a failed approval shows its message and keeps the progress", async () => {
    stubServer({
      approveResponse: () =>
        Response.json({ error: "Periksa data audit." }, { status: 400 }),
    });
    render(<SmartIntakeJourney live={false} />);
    await toQuestions();
    fireEvent.click(screen.getByRole("button", { name: "Mulai audit" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Periksa data audit.",
    );
    expect(readActiveOrder()).toBeNull();
    expect(readSmartSession()?.stage).toBe("questions");
  });

  it("question writing for an ended order returns to the order screen without losing the answers", async () => {
    stubServer({
      glmResponse: () =>
        Response.json(
          {
            status: "failed",
            code: "ORDER_REQUIRED",
            error: "Pesanan belum dibuat atau sudah berakhir.",
            providerContact: "none",
          },
          { status: 409 },
        ),
    });
    render(<SmartIntakeJourney live={false} />);
    await enterBusiness();
    await typeEmail();
    lanjut();
    await throughDetails();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Sudah sesuai — buat pertanyaan audit",
      }),
    );
    await heading("Ringkasan pesanan");
    const saved = readSmartSession();
    expect(saved?.order).toBeNull();
    expect(saved?.afterOrder).toBe("summary");
    expect(saved?.selection).not.toBeNull();
    // A question attempt that never reached a provider is not recorded.
    expect(saved?.generationAttempts).toEqual([]);
  });
});

describe("the progress view (screens 15 and 15a, R-21, AC-19)", () => {
  const questions = (statuses: string[]) =>
    statuses.map((status, index) => ({
      prompt_id: `NUAVE-DT-${String(index + 1).padStart(2, "0")}`,
      status,
    }));

  it("a reload with only the order id shows the running audit with the close-the-tab note", async () => {
    writeActiveOrder(ORDER_ID);
    const server = stubServer({
      status: () => ({
        state: "running",
        completed: 3,
        total: 10,
        questions: questions([
          "completed",
          "completed",
          "completed",
          "running",
          "pending",
          "pending",
          "pending",
          "pending",
          "pending",
          "pending",
        ]),
      }),
    });
    render(<SmartIntakeJourney live={false} />);
    expect(
      await screen.findByText(
        "Anda boleh menutup halaman ini. Kami akan mengirim link laporan ke email Anda.",
      ),
    ).toBeTruthy();
    expect(document.querySelector('[data-order-progress="3"]')).not.toBeNull();
    expect(server.bodies["/api/orders/status"]).toEqual([
      { order_id: ORDER_ID },
    ]);
    // Still saved: the order has not ended.
    expect(readActiveOrder()).toBe(ORDER_ID);
    expect(readSmartSession()).toBeNull();
  });

  it("shows screen 15a when the report is ready and removes the order id from the browser", async () => {
    writeActiveOrder(ORDER_ID);
    stubServer({
      status: () => ({
        state: "delivered",
        completed: 10,
        total: 10,
        questions: questions(Array(10).fill("completed")),
      }),
    });
    render(<SmartIntakeJourney live={false} />);
    expect(
      await screen.findByRole("heading", {
        name: "Laporan Anda sudah siap dan kami kirim ke email Anda.",
      }),
    ).toBeTruthy();
    // The tab never shows the report itself.
    expect(document.querySelector("[data-direct-ten-report]")).toBeNull();
    expect(readActiveOrder()).toBeNull();
  });

  it("shows the failure screen and removes the order id", async () => {
    writeActiveOrder(ORDER_ID);
    stubServer({
      status: () => ({
        state: "failed",
        completed: 4,
        total: 10,
        questions: [],
      }),
    });
    render(<SmartIntakeJourney live={false} />);
    expect(
      await screen.findByRole("heading", {
        name: "Audit belum bisa diselesaikan.",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Kami sudah mencatatnya dan akan menghubungi Anda lewat email.",
      ),
    ).toBeTruthy();
    expect(readActiveOrder()).toBeNull();
  });

  it("polls until the order ends, then stops", async () => {
    writeActiveOrder(ORDER_ID);
    let state = "running";
    const server = stubServer({
      status: () => ({ state, completed: 0, total: 10, questions: [] }),
    });
    render(
      <SmartAuditStage orderId={ORDER_ID} pollMs={10} onRestart={() => {}} />,
    );
    await waitFor(() =>
      expect(
        server.calls.filter((c) => c === "/api/orders/status").length,
      ).toBeGreaterThan(2),
    );
    state = "delivered";
    await screen.findByRole("heading", { name: /sudah siap/ });
    const settled = server.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(server.calls.length).toBe(settled);
  });

  it("an order the server does not know ends the view with a way to start again", async () => {
    writeActiveOrder(ORDER_ID);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "Not found" }, { status: 404 })),
    );
    const restart = vi.fn();
    render(
      <SmartAuditStage orderId={ORDER_ID} pollMs={10} onRestart={restart} />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Mulai audit baru" }),
    );
    expect(restart).toHaveBeenCalled();
    expect(readActiveOrder()).toBeNull();
  });

  it("keeps trying and says so while the server cannot be reached", async () => {
    writeActiveOrder(ORDER_ID);
    let up = false;
    const fetchMock = vi.fn(async () => {
      if (!up) throw new TypeError("offline");
      return Response.json({
        state: "running",
        completed: 1,
        total: 10,
        questions: [],
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <SmartAuditStage orderId={ORDER_ID} pollMs={10} onRestart={() => {}} />,
    );
    await screen.findByText(/Kemajuan belum dapat dimuat/);
    up = true;
    await waitFor(() =>
      expect(screen.queryByText(/Kemajuan belum dapat dimuat/)).toBeNull(),
    );
    expect(readActiveOrder()).toBe(ORDER_ID);
  });

  it("an expired order id in the browser is not replayed as an active audit", () => {
    window.localStorage.setItem(
      ACTIVE_ORDER_STORAGE_KEY,
      JSON.stringify({ orderId: "not-an-order-id" }),
    );
    expect(readActiveOrder()).toBeNull();
  });
});

describe("saved order fields are checked when read back", () => {
  const base = () => ({
    ...freshSmartSession(),
    identity: {
      inputName: "Kedai Fiksi",
      inputSource: "https://kedai-fiksi.example/",
      canonicalUrl: "https://kedai-fiksi.example/",
      displayName: "Kedai Fiksi",
      preparationMode: "synthetic-local" as const,
    },
    brand: { name: "Kedai Fiksi", origin: "owner" as const },
  });
  const parse = (value: unknown) => parseSmartSession(JSON.stringify(value));

  it("accepts the order screen with an identity and an order for it", () => {
    expect(
      parse({
        ...base(),
        stage: "order",
        order: {
          id: ORDER_ID,
          website: "https://kedai-fiksi.example/",
          name: "Kedai Fiksi",
        },
      })?.stage,
    ).toBe("order");
  });

  it("restarts rather than show a blank order screen without an identity", () => {
    expect(parse({ ...freshSmartSession(), stage: "order" })).toBeNull();
  });

  it.each([
    [
      "an id that is not 128 bits of hex",
      { id: "abc", website: "https://x.example/", name: "X" },
    ],
    ["a missing website", { id: ORDER_ID, name: "X" }],
    [
      "an oversized name",
      { id: ORDER_ID, website: "https://x.example/", name: "x".repeat(161) },
    ],
  ])("rejects %s", (_label, order) => {
    expect(parse({ ...base(), stage: "order", order })).toBeNull();
  });

  it.each(["order", "somewhere", 5])(
    "rejects a return stage of %j",
    (afterOrder) => {
      expect(parse({ ...base(), stage: "order", afterOrder })).toBeNull();
    },
  );
});
