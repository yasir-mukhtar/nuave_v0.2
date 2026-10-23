// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_PASS_STORAGE_KEY } from "./test-pass";
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
  type SmartSession,
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
    status: () => ({
      state: "open",
      payment: { state: "not_required" },
      completed: 0,
      total: 10,
      questions: [],
    }),
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
  // Spec 017 R-20: these journeys run on a founder test pass (no payment); the
  // paid screens have their own tests in payment-journey.test.tsx.
  window.sessionStorage.setItem(TEST_PASS_STORAGE_KEY, "test-code");
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
const mulai = () =>
  fireEvent.click(screen.getByRole("button", { name: "Mulai" }));
const heading = (name: string | RegExp) =>
  screen.findByRole("heading", { name });

/** J01 → J05 → J06 → J07: one website field, the found business, the three
 * steps, then the order screen. The business name is read from the site. */
async function enterBusiness() {
  fireEvent.change(
    await screen.findByRole("textbox", {
      name: "Website atau akun Instagram klinik",
    }),
    { target: { value: "https://kedai-fiksi.example/" } },
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Cek klinik saya di AI" }),
  );
  await heading("Kami menemukan klinik Anda");
  fireEvent.click(screen.getByRole("button", { name: "Ya, ini klinik saya" }));
  await heading("Tinggal 3 langkah");
  fireEvent.click(screen.getByRole("button", { name: "Lanjut ke pembayaran" }));
  await heading("Konfirmasi dan bayar");
}
async function typeEmail(value = EMAIL) {
  fireEvent.change(
    screen.getByRole("textbox", { name: "Email penerima laporan" }),
    { target: { value } },
  );
}
/** The paid reading (J09) runs by itself after the order and lands on the
 * Step 2 cover (J10); its "Mulai" opens the focus screen. */
async function toFocus() {
  await heading("Ceritakan klinik Anda");
  mulai();
  await heading("Apa yang ingin Anda audit?");
}
async function throughDetails() {
  await toFocus();
  for (const name of [
    "Klinik Anda biasanya disebut apa?",
    "Apa saja layanan klinik Anda?",
    "Siapa yang biasanya mencari klinik Anda?",
    "Apa yang mereka cari saat memilih klinik?",
    "Bagaimana pasien dilayani?",
    "Pasien Anda datang dari mana?",
    "Klinik mana pembanding Anda?",
    "Apa yang membuat klinik Anda berbeda?",
  ]) {
    lanjut();
    await heading(name);
  }
  lanjut();
  await heading("Periksa, lalu jalankan audit");
  mulai();
  await heading("Ini profil klinik yang akan Nuave pakai");
}
/** J25: the owner ticks the confirmation, then asks for the questions. */
function makeQuestions() {
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: "Saya sudah memeriksa informasi ini dan menyetujuinya untuk digunakan dalam pertanyaan audit.",
    }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Buat pertanyaan audit" }),
  );
}
async function toQuestions() {
  await enterBusiness();
  await typeEmail();
  lanjut();
  await throughDetails();
  makeQuestions();
  await heading("10 pertanyaan untuk AI");
}
/** J27 → J27b: "Jalankan audit" opens the start sheet; its button approves. */
async function startAudit() {
  fireEvent.click(
    await screen.findByRole("button", { name: "Jalankan audit" }),
  );
  const sheet = await screen.findByRole("dialog", {
    name: "Mulai audit sekarang?",
  });
  fireEvent.click(
    within(sheet).getByRole("button", { name: "Mulai audit sekarang" }),
  );
}
/** The saved order screen of an order whose paid reading never began (say
 * the tab closed right after the order was made): no reading mark on the
 * order and no trace of a reading in the progress. */
function orderBeforeReading(
  saved: SmartSession,
  order: { id: string; website: string; name: string } = saved.order!,
): SmartSession {
  return {
    ...saved,
    stage: "order",
    order: { id: order.id, website: order.website, name: order.name },
    prepared: null,
    selection: null,
    preparationCalls: [],
    sourceExcerptStatus: undefined,
  };
}

describe("the order screen (R-01, R-06, AC-01)", () => {
  it("shows the business, what the report includes and an email field, with no price on a founder test pass", async () => {
    stubServer();
    render(<SmartIntakeJourney live={false} />);
    await enterBusiness();
    const summary = screen.getByRole("article", { name: "Ringkasan pesanan" });
    expect(summary.textContent).toContain("Kedai Fiksi");
    // What the report includes: one AI Visibility Report on ten questions.
    expect(within(summary).getByText("AI Visibility Report")).toBeTruthy();
    expect(
      within(summary).getByText("Kedai Fiksi · 10 pertanyaan"),
    ).toBeTruthy();
    expect(
      screen.getByRole("textbox", { name: "Email penerima laporan" }),
    ).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Rp\s?\d|IDR|USD|harga/i);
    expect(screen.queryByRole("button", { name: "Bayar Rp99.000" })).toBeNull();
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
      screen.getByRole("heading", { name: "Konfirmasi dan bayar" }),
    ).toBeTruthy();
  });

  it("sends the email only to the order route, and never keeps it in the browser", async () => {
    const server = stubServer();
    render(<SmartIntakeJourney live={false} />);
    await enterBusiness();
    await typeEmail();
    lanjut();
    await toFocus();
    expect(server.bodies["/api/orders"]).toEqual([
      {
        email: EMAIL,
        business_name: "Kedai Fiksi",
        website: "https://kedai-fiksi.example/",
        test_pass_code: "test-code",
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
    await toFocus();
    lanjut();
    await heading("Klinik Anda biasanya disebut apa?");
    lanjut();
    await heading("Apa saja layanan klinik Anda?");
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
    await heading("Apa saja layanan klinik Anda?");
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
    await toFocus();
    lanjut();
    await heading("Klinik Anda biasanya disebut apa?");
    const savedSelection = readSmartSession()?.selection;
    first.unmount();

    state = "expired";
    render(<SmartIntakeJourney live={false} />);
    await heading("Konfirmasi dan bayar");
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
    await heading("Klinik Anda biasanya disebut apa?");
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

  it("a replacement order (the website changed after the order screen) names the order it replaces, once", async () => {
    const server = stubServer({});
    const first = render(<SmartIntakeJourney live={false} />);
    await enterBusiness();
    await typeEmail();
    lanjut();
    await toFocus();
    const saved = readSmartSession()!;
    first.unmount();
    // The saved order was made for another website, so the next `Lanjut` makes
    // a replacement and tells the server which order it replaces.
    writeSmartSession({
      ...saved,
      stage: "order",
      order: { ...saved.order!, website: "https://lama.example/" },
      prepared: null,
      selection: null,
    });
    server.orderResponse = () =>
      Response.json({ order_id: OTHER_ORDER_ID, state: "open" });
    render(<SmartIntakeJourney live={false} />);
    await heading("Konfirmasi dan bayar");
    await typeEmail("baru@example.com");
    lanjut();
    await toFocus();
    const bodies = server.bodies["/api/orders"]!;
    expect(bodies).toHaveLength(2);
    expect(bodies[0]).not.toHaveProperty("previous_order_id");
    expect(bodies[1]!.previous_order_id).toBe(saved.order!.id);
    expect(readSmartSession()?.order?.id).toBe(OTHER_ORDER_ID);
    expect(readSmartSession()?.supersededOrder ?? null).toBeNull();
  });

  it("a saved test-pass order made for another website never starts the paid reading by itself; the email typed again makes the replacement", async () => {
    const server = stubServer();
    const first = render(<SmartIntakeJourney live={false} />);
    await enterBusiness();
    await typeEmail();
    lanjut();
    await toFocus();
    const saved = readSmartSession()!;
    first.unmount();
    writeSmartSession(
      orderBeforeReading(saved, {
        ...saved.order!,
        website: "https://lama.example/",
      }),
    );
    server.orderResponse = () =>
      Response.json({ order_id: OTHER_ORDER_ID, state: "open" });
    const before = server.calls.length;
    render(<SmartIntakeJourney live={false} />);
    await heading("Konfirmasi dan bayar");
    // The page asks about the saved order (it needs no payment) and is given
    // time to act on the answer.
    await waitFor(() =>
      expect(server.calls.slice(before)).toEqual(["/api/orders/status"]),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    // Before the person acts: no error, no order and no reading.
    expect(
      screen.queryByText("Masukkan satu alamat email yang valid."),
    ).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(server.calls.slice(before)).toEqual(["/api/orders/status"]);
    // The email typed again makes the replacement order, then the reading.
    await typeEmail("baru@example.com");
    lanjut();
    await toFocus();
    expect(server.calls.slice(before)).toEqual([
      "/api/orders/status",
      "/api/orders",
      "/api/audit/extract",
    ]);
    expect(server.bodies["/api/orders"]![1]).toMatchObject({
      email: "baru@example.com",
      previous_order_id: ORDER_ID,
    });
    expect(readSmartSession()?.order?.id).toBe(OTHER_ORDER_ID);
  });

  it("a saved test-pass order that still fits starts the paid reading by itself on reload, once", async () => {
    const server = stubServer();
    const first = render(<SmartIntakeJourney live={false} />);
    await enterBusiness();
    await typeEmail();
    lanjut();
    await toFocus();
    const saved = readSmartSession()!;
    first.unmount();
    // The order was made for this website, but its paid reading never began.
    writeSmartSession(orderBeforeReading(saved));
    const before = server.calls.length;
    render(<SmartIntakeJourney live={false} />);
    // No Lanjut: the reading runs by itself and lands on the Step 2 cover.
    await toFocus();
    expect(server.calls.slice(before)).toEqual([
      "/api/orders/status",
      "/api/audit/extract",
    ]);
    expect(server.bodies["/api/audit/extract"]).toEqual([
      { order_id: ORDER_ID },
      { order_id: ORDER_ID },
    ]);
    expect(readSmartSession()?.order?.id).toBe(ORDER_ID);
  });

  it("a saved test-pass order whose paid reading already started never starts it again by itself on reload, only on Lanjut", async () => {
    const server = stubServer();
    const first = render(<SmartIntakeJourney live={false} />);
    await enterBusiness();
    await typeEmail();
    lanjut();
    await toFocus();
    const saved = orderBeforeReading(readSmartSession()!);
    first.unmount();
    // The same saved order, marked: its reading began (and failed or was cut
    // off).
    writeSmartSession({
      ...saved,
      order: { ...saved.order!, readingStarted: true },
    });
    const before = server.calls.length;
    render(<SmartIntakeJourney live={false} />);
    // The page knows the order needs no payment and offers Lanjut...
    await screen.findByText(
      "Pesanan Anda sudah dibuat. Tekan Lanjut untuk meneruskan.",
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    // ...but reads nothing by itself.
    expect(server.calls.slice(before)).toEqual(["/api/orders/status"]);
    lanjut();
    await toFocus();
    expect(server.calls.slice(before)).toEqual([
      "/api/orders/status",
      "/api/audit/extract",
    ]);
  });

  it("a server that no longer knows the order counts as ended", async () => {
    const server = stubServer();
    const first = render(<SmartIntakeJourney live={false} />);
    await enterBusiness();
    await typeEmail();
    lanjut();
    await toFocus();
    first.unmount();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "Not found" }, { status: 404 })),
    );
    render(<SmartIntakeJourney live={false} />);
    await heading("Konfirmasi dan bayar");
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
    const website = await screen.findByRole("textbox", {
      name: "Website atau akun Instagram klinik",
    });
    expect((website as HTMLInputElement).value).toBe("");
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

  it("progress with no save date, or an unreadable one, is treated as expired and removed", () => {
    for (const savedAt of [undefined, "not a date", ""]) {
      const session: Record<string, unknown> = {
        ...freshSmartSession(),
        entry: { name: "Kedai Tanpa Tanggal", source: "https://x.example/" },
      };
      if (savedAt === undefined) delete session.savedAt;
      else session.savedAt = savedAt;
      window.localStorage.setItem(
        SMART_INTAKE_STORAGE_KEY,
        JSON.stringify(session),
      );
      expect(readSmartSession()).toBeNull();
      expect(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)).toBeNull();
    }
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
    await toFocus();
    const raw = window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)!;
    expect(raw).not.toMatch(/email/i);
    expect(parseSmartSession(raw)?.order).toEqual({
      id: ORDER_ID,
      website: "https://kedai-fiksi.example/",
      name: "Kedai Fiksi",
      readingStarted: true,
    });
  });
});

describe("approving the questions and the audit starting (R-17, R-31)", () => {
  it("posts the approved and original wording, removes the intake progress and keeps only the order id", async () => {
    const server = stubServer();
    render(<SmartIntakeJourney live={false} />);
    await toQuestions();
    fireEvent.click(screen.getByRole("button", { name: "Ubah pertanyaan 1" }));
    const editor = await screen.findByRole("dialog", {
      name: "Ubah pertanyaan 1",
    });
    const edited =
      "Pilihan kedai kopi apa yang cocok untuk pekerja di Bandung?";
    fireEvent.change(
      within(editor).getByRole("textbox", { name: "Pertanyaan 1" }),
      { target: { value: edited } },
    );
    fireEvent.click(within(editor).getByRole("button", { name: "Simpan" }));
    await startAudit();
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

  it("a saved order that is already running (approved in another tab) opens the progress view, not the order screen", async () => {
    let state = "open";
    const server = stubServer({
      status: () => ({ state, completed: 2, total: 10, questions: [] }),
    });
    const first = render(<SmartIntakeJourney live={false} />);
    await toQuestions();
    first.unmount();
    state = "running";
    render(<SmartIntakeJourney live={false} />);
    await screen.findByText(/Anda boleh menutup halaman ini/);
    expect(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)).toBeNull();
    expect(readActiveOrder()).toBe(ORDER_ID);
    expect(
      screen.queryByRole("heading", { name: "Konfirmasi dan bayar" }),
    ).toBeNull();
    expect(
      server.calls.filter((c) => c === "/api/orders/approve"),
    ).toHaveLength(0);
  });

  it("a slow saved-order check that answers after the questions were approved does not bring the progress back", async () => {
    const server = stubServer({});
    const first = render(<SmartIntakeJourney live={false} />);
    await toQuestions();
    first.unmount();
    // Reopen: the saved order is checked, but that answer is held back.
    const normal = globalThis.fetch;
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    let statusCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === "/api/orders/status") {
          statusCalls += 1;
          await held;
          // By now the audit is running on the server.
          return Response.json({
            state: "running",
            completed: 0,
            total: 10,
            questions: [],
          });
        }
        return normal(input, init);
      }),
    );
    render(<SmartIntakeJourney live={false} />);
    await heading("10 pertanyaan untuk AI");
    await startAudit();
    await screen.findByText(/Anda boleh menutup halaman ini/);
    expect(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)).toBeNull();
    release();
    await waitFor(() => expect(statusCalls).toBeGreaterThan(0));
    await new Promise((resolve) => setTimeout(resolve, 50));
    // Still cleared (R-31), still the running screen, order id kept.
    expect(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)).toBeNull();
    expect(readActiveOrder()).toBe(ORDER_ID);
    expect(screen.getByText(/Anda boleh menutup halaman ini/)).toBeTruthy();
    expect(
      server.calls.filter((c) => c === "/api/orders/approve"),
    ).toHaveLength(1);
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
    await startAudit();
    await heading("Konfirmasi dan bayar");
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
    await startAudit();
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
    makeQuestions();
    await heading("Konfirmasi dan bayar");
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
        "Anda boleh menutup halaman ini. Audit akan tetap berjalan, dan link laporan dikirim ke email Anda.",
      ),
    ).toBeTruthy();
    await waitFor(() =>
      expect(
        document.querySelector('[data-order-progress="3"]'),
      ).not.toBeNull(),
    );
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
      await screen.findByRole("heading", { name: "Laporan Anda sudah siap" }),
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
        name: "Audit belum bisa diselesaikan",
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
