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
import { extractionDraftSchema } from "../audit/types";
import { DELIVERY_PROMISE } from "../orders/promise";
import SmartIntakeJourney from "./SmartIntakeJourney";
import { readSmartSession } from "./smart-session";

// Spec 017 Experience 2-8 in the browser: the order summary with its price, the
// payment states the status route can answer, the replacement order after a
// finally unpaid attempt, and the locks after payment. The server is a fetch
// stub; the payment mechanics are in payments/*.test.ts.

const ORDER_ID = "0123456789abcdef0123456789abcdef";
const EMAIL = "pemilik@example.com";
const NUMBER = "NV-7K3Q9P";
const MIDTRANS_PAGE =
  "https://app.sandbox.midtrans.com/snap/v4/redirection/abc";

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
  /** Answers by route, replaceable per test. */
  status: () => Record<string, unknown> | Response;
  start: () => Response;
  create: () => Response;
  extract: () => Response | Promise<Response>;
};

/** The paid reading's answer (screen 3b). */
const extracted = () =>
  Response.json({
    draft,
    telemetry: [],
    preparation_mode: "synthetic-local",
  });

let navigated: string | null = null;
const assign = vi.fn((url: string) => {
  navigated = url;
});

function stubServer(overrides: Partial<Stub> = {}): Stub {
  const stub: Stub = {
    calls: [],
    bodies: {},
    status: () => ({ state: "open", payment: { state: "unpaid" } }),
    start: () => Response.json({ redirect_url: MIDTRANS_PAGE }),
    create: () => Response.json({ order_id: ORDER_ID, state: "open" }),
    extract: extracted,
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
      if (key === "/api/orders") return stub.create();
      if (key === "/api/payments/start") return stub.start();
      if (key === "/api/orders/status") {
        const answer = stub.status();
        return answer instanceof Response ? answer : Response.json(answer);
      }
      if (key === "/api/audit/extract") return stub.extract();
      throw new Error(`Unexpected request ${url}`);
    }),
  );
  return stub;
}

beforeEach(() => {
  navigated = null;
  assign.mockClear();
  window.sessionStorage.clear();
  window.localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  // jsdom cannot navigate: capture the Midtrans redirect.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, assign },
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const heading = (name: string | RegExp) =>
  screen.findByRole("heading", { name });
const button = (name: string) => screen.findByRole("button", { name });

/** J01 → J05 → J06 → J07: one website field, the found business, the three
 * steps, then the order summary. The business name is read from the site. */
async function toOrderScreen() {
  fireEvent.change(
    await screen.findByRole("textbox", {
      name: "Website atau akun Instagram bisnis",
    }),
    { target: { value: "https://kedai-fiksi.example/" } },
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Cek bisnis saya di AI" }),
  );
  await heading("Kami menemukan bisnis Anda");
  fireEvent.click(screen.getByRole("button", { name: "Ya, ini bisnis saya" }));
  await heading("Tinggal 3 langkah");
  fireEvent.click(screen.getByRole("button", { name: "Lanjut ke pembayaran" }));
  await heading("Konfirmasi dan bayar");
}
async function typeEmail() {
  fireEvent.change(
    screen.getByRole("textbox", { name: "Email penerima laporan" }),
    { target: { value: EMAIL } },
  );
}
/** An extract answer held back until `release`, so the paid reading (J09)
 * stays on screen. */
function heldReading() {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  return {
    release,
    extract: async () => {
      await held;
      return extracted();
    },
  };
}
async function pay() {
  await typeEmail();
  fireEvent.click(await button("Bayar Rp99.000"));
}
/** The saved session of a customer who made an order and left to pay. */
async function reloadWith(stub: Stub) {
  cleanup();
  render(<SmartIntakeJourney live />);
  await heading("Konfirmasi dan bayar");
  return stub;
}

describe("the order summary (Experience 2, 3)", () => {
  it("shows the price, the delivery promise, the Terms and Privacy links and the pay button", async () => {
    stubServer();
    render(<SmartIntakeJourney live />);
    await toOrderScreen();
    expect(screen.getByText("Rp99.000")).toBeTruthy();
    expect(
      screen.getByText(
        "Sekali bayar. Tanpa pajak atau biaya tambahan dari Nuave. Ringkasan ini berlaku 30 hari.",
      ),
    ).toBeTruthy();
    expect(screen.getByText(DELIVERY_PROMISE)).toBeTruthy();
    // The consent line sits under the pay button, in the bottom bar.
    const terms = screen.getByRole("link", { name: "Syarat Penggunaan" });
    expect(terms.getAttribute("href")).toBe("/terms");
    expect(
      screen
        .getByRole("link", { name: "Kebijakan Privasi" })
        .getAttribute("href"),
    ).toBe("/privacy");
    expect(terms.parentElement?.textContent).toBe(
      "Dengan membayar, Anda menyetujui Syarat Penggunaan dan Kebijakan Privasi.",
    );
    expect(terms.closest('[data-intake-screen="order"]')).toBeNull();
    expect(
      screen.getByRole("textbox", { name: "Email penerima laporan" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bayar Rp99.000" })).toBeTruthy();
    // A real payment screen has no simulation label.
    expect(document.body.textContent).not.toContain("Pembayaran simulasi");
  });

  it("in synthetic mode the labelled simulated payment pays at once and shows the order number", async () => {
    let paid = false;
    const reading = heldReading();
    const stub = stubServer({
      start: () => {
        paid = true;
        return Response.json({ simulated: true });
      },
      status: () => ({
        state: "open",
        payment: paid
          ? { state: "paid", order_number: NUMBER }
          : { state: "unpaid" },
      }),
      extract: reading.extract,
    });
    render(<SmartIntakeJourney live={false} />);
    await toOrderScreen();
    expect(document.body.textContent).toContain("Pembayaran simulasi");
    await pay();
    // J09: once paid, the paid reading starts by itself (no Lanjut), under
    // the order number.
    await heading("Nuave sedang membaca website Anda");
    expect(
      document.querySelector('[data-journey-tone="ember"]'),
    ).not.toBeNull();
    expect(screen.getByText(NUMBER).closest("p")?.textContent).toBe(
      `Pembayaran diterima·${NUMBER}`,
    );
    expect(navigated).toBeNull();
    expect(stub.calls).toEqual([
      "identity",
      "/api/orders",
      "/api/payments/start",
      "/api/orders/status",
      "/api/audit/extract",
    ]);
    // Paid: the website and business are locked and the order number is kept.
    expect(readSmartSession()?.order).toMatchObject({
      id: ORDER_ID,
      paid: true,
      number: NUMBER,
    });
    // The intake continues as today.
    reading.release();
    await heading("Ceritakan bisnis Anda");
    fireEvent.click(await button("Mulai"));
    await heading("Apa yang ingin Anda audit?");
    expect(stub.calls.filter((call) => call === "/api/orders")).toHaveLength(1);
    expect(
      stub.calls.filter((call) => call === "/api/audit/extract"),
    ).toHaveLength(1);
  });

  it("creates the order, starts the payment and sends the browser to the Midtrans page", async () => {
    const stub = stubServer();
    render(<SmartIntakeJourney live />);
    await toOrderScreen();
    await pay();
    await waitFor(() => expect(navigated).toBe(MIDTRANS_PAGE));
    expect(stub.bodies["/api/orders"]).toEqual([
      {
        email: EMAIL,
        business_name: "Kedai Fiksi",
        website: "https://kedai-fiksi.example/",
      },
    ]);
    // The order is saved before leaving, the email never is.
    expect(readSmartSession()?.order?.id).toBe(ORDER_ID);
    expect(JSON.stringify({ ...window.localStorage })).not.toContain(EMAIL);
    expect(stub.bodies["/api/payments/start"]).toEqual([
      { order_id: ORDER_ID },
    ]);
  });

  it("shows the cap-full message and starts no payment", async () => {
    stubServer({
      start: () =>
        Response.json(
          {
            error: "Kuota audit sedang penuh. Coba lagi dalam beberapa jam.",
            code: "CAP_FULL",
          },
          { status: 409 },
        ),
    });
    render(<SmartIntakeJourney live />);
    await toOrderScreen();
    await pay();
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Kuota audit sedang penuh. Coba lagi dalam beberapa jam.",
    );
    expect(navigated).toBeNull();
    // Nothing is lost: the same order can be tried again later.
    expect(await button("Bayar Rp99.000")).toBeTruthy();
  });

  it("shows 'Pembayaran belum bisa dimulai' when Snap fails, and the retry reuses the same order", async () => {
    let failing = true;
    const stub = stubServer({
      start: () =>
        failing
          ? Response.json(
              {
                error: "Pembayaran belum bisa dimulai.",
                code: "PAYMENT_START_FAILED",
              },
              { status: 502 },
            )
          : Response.json({ redirect_url: MIDTRANS_PAGE }),
    });
    render(<SmartIntakeJourney live />);
    await toOrderScreen();
    await pay();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Pembayaran belum bisa dimulai",
    );
    // The order exists; the order screen now asks the status and offers the
    // button again with no email field.
    await waitFor(() =>
      expect(screen.queryByRole("textbox", { name: /Email/ })).toBeNull(),
    );
    failing = false;
    fireEvent.click(await button("Bayar Rp99.000"));
    await waitFor(() => expect(navigated).toBe(MIDTRANS_PAGE));
    expect(stub.calls.filter((call) => call === "/api/orders")).toHaveLength(1);
  });

  it("shows the neutral unavailable answer when the settings are missing", async () => {
    stubServer({
      create: () =>
        Response.json(
          {
            error: "Audit tidak tersedia saat ini.",
            code: "ORDER_UNAVAILABLE",
          },
          { status: 503 },
        ),
    });
    render(<SmartIntakeJourney live />);
    await toOrderScreen();
    await pay();
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Audit tidak tersedia saat ini.",
    );
  });
});

/** Make an order and leave for Midtrans; then come back with `payment`. */
async function returnWith(
  payment: Record<string, unknown>,
  top: Record<string, unknown> = { state: "open" },
  overrides: Partial<Stub> = {},
) {
  let answer: Record<string, unknown> = {
    state: "open",
    payment: { state: "unpaid" },
  };
  const stub = stubServer({ status: () => answer, ...overrides });
  render(<SmartIntakeJourney live />);
  await toOrderScreen();
  await pay();
  await waitFor(() => expect(navigated).toBe(MIDTRANS_PAGE));
  answer = { ...top, payment };
  await reloadWith(stub);
  return { stub, set: (next: Record<string, unknown>) => (answer = next) };
}

describe("coming back from Midtrans (Experience 5-8)", () => {
  it("shows 'Menunggu pembayaran' with 'Lihat cara bayar' to the same Midtrans page", async () => {
    await returnWith({ state: "waiting", redirect_url: MIDTRANS_PAGE });
    await heading("Menunggu pembayaran");
    expect(
      screen
        .getByRole("link", { name: "Lihat cara bayar" })
        .getAttribute("href"),
    ).toBe(MIDTRANS_PAGE);
    expect(screen.queryByRole("button", { name: "Bayar Rp99.000" })).toBeNull();
  });

  it.each([
    ["denied", "Pembayaran ditolak"],
    ["cancelled", "Pembayaran dibatalkan"],
    ["failed", "Pembayaran gagal"],
    ["expired", "Waktu pembayaran"],
  ])(
    "shows an honest message for a %s try and the same Midtrans page",
    async (last, text) => {
      await returnWith({
        state: "try_failed",
        last_try: last,
        redirect_url: MIDTRANS_PAGE,
      });
      await heading("Pembayaran belum berhasil");
      expect(document.body.textContent).toContain(text);
      expect(
        screen.getByRole("link", { name: "Lihat cara bayar" }),
      ).toBeTruthy();
    },
  );

  it("after the window says 'Kami sedang memeriksa pembayaran Anda' with 'Cek lagi' and no new payment", async () => {
    const { stub, set } = await returnWith({ state: "checking" });
    await heading("Kami sedang memeriksa pembayaran Anda");
    expect(screen.queryByRole("link", { name: "Lihat cara bayar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Bayar Rp99.000" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Lanjut" })).toBeNull();
    // Cek lagi asks the status again, and the answer is shown.
    const before = stub.calls.filter(
      (call) => call === "/api/orders/status",
    ).length;
    set({ state: "open", payment: { state: "cannot_check" } });
    fireEvent.click(await button("Cek lagi"));
    await heading("Status pembayaran belum dapat diperiksa");
    expect(
      stub.calls.filter((call) => call === "/api/orders/status").length,
    ).toBe(before + 1);
    expect(await button("Cek lagi")).toBeTruthy();
    expect(
      stub.calls.filter((call) => call === "/api/payments/start"),
    ).toHaveLength(1);
  });

  it("when the status cannot be fetched at all it says it cannot be checked", async () => {
    let down = false;
    const stub = stubServer({
      status: () =>
        down
          ? new Response("", { status: 503 })
          : { state: "open", payment: { state: "unpaid" } },
    });
    render(<SmartIntakeJourney live />);
    await toOrderScreen();
    await pay();
    await waitFor(() => expect(navigated).toBe(MIDTRANS_PAGE));
    down = true;
    await reloadWith(stub);
    await heading("Status pembayaran belum dapat diperiksa");
    expect(await button("Cek lagi")).toBeTruthy();
  });

  it("polls the status while waiting and moves on when it is paid", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const reading = heldReading();
      const { stub, set } = await returnWith(
        { state: "waiting", redirect_url: MIDTRANS_PAGE },
        { state: "open" },
        { extract: reading.extract },
      );
      await heading("Menunggu pembayaran");
      set({ state: "open", payment: { state: "paid", order_number: NUMBER } });
      await vi.advanceTimersByTimeAsync(10_500);
      // Paid: the paid reading starts by itself under the order number (J09).
      await heading("Nuave sedang membaca website Anda");
      expect(screen.getByText(NUMBER).closest("p")?.textContent).toBe(
        `Pembayaran diterima·${NUMBER}`,
      );
      reading.release();
      await heading("Ceritakan bisnis Anda");
      expect(
        stub.calls.filter((call) => call === "/api/audit/extract"),
      ).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("finally unpaid: 'Coba bayar lagi' returns to the summary and starts a replacement order", async () => {
    const { stub, set } = await returnWith(
      { state: "unpaid_final" },
      { state: "expired" },
    );
    await heading("Pembayaran tidak kami terima");
    // The page keeps the ended order and never makes a new one by itself.
    expect(stub.calls.filter((call) => call === "/api/orders")).toHaveLength(1);
    set({ state: "open", payment: { state: "unpaid" } });
    fireEvent.click(await button("Coba bayar lagi"));
    await typeEmail();
    fireEvent.click(await button("Bayar Rp99.000"));
    await waitFor(() => expect(stub.bodies["/api/orders"]).toHaveLength(2));
    expect(stub.bodies["/api/orders"]![1]).toMatchObject({
      email: EMAIL,
      previous_order_id: ORDER_ID,
    });
  });

  it.each([
    [
      "waiting",
      { state: "waiting", redirect_url: MIDTRANS_PAGE },
      "Menunggu pembayaran",
    ],
    [
      "try_failed",
      { state: "try_failed", last_try: "denied", redirect_url: MIDTRANS_PAGE },
      "Pembayaran belum berhasil",
    ],
    [
      "checking",
      { state: "checking" },
      "Kami sedang memeriksa pembayaran Anda",
    ],
    [
      "cannot_check",
      { state: "cannot_check" },
      "Status pembayaran belum dapat diperiksa",
    ],
  ])(
    "while %s the website and business are locked: no Kembali to the brand check",
    async (_name, payment, title) => {
      await returnWith(payment);
      await heading(title);
      // Neither the bottom bar's Kembali nor the top bar's round back button.
      expect(screen.queryByRole("button", { name: "Kembali" })).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Halaman sebelumnya" }),
      ).toBeNull();
      expect(screen.queryByRole("textbox", { name: /Email/ })).toBeNull();
    },
  );

  it.each(["closed_unknown", "needs_refund", "paid_ended", "refunded"])(
    "a %s order shows the order number and the support address, never a new payment",
    async (state) => {
      const { stub } = await returnWith(
        { state, order_number: NUMBER },
        { state: "failed" },
      );
      await screen.findByText(NUMBER);
      expect(
        screen.getByRole("link", { name: "support@nuave.ai" }),
      ).toBeTruthy();
      expect(
        screen.queryByRole("button", { name: "Bayar Rp99.000" }),
      ).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Coba bayar lagi" }),
      ).toBeNull();
      expect(screen.queryByRole("textbox", { name: /Email/ })).toBeNull();
      expect(stub.calls.filter((call) => call === "/api/orders")).toHaveLength(
        1,
      );
    },
  );
});

describe("a latest try finally unpaid after an earlier unknown try (Q18 A)", () => {
  it("the status answer is closed_unknown: the page is support-only and offers neither Coba bayar lagi nor Kembali", async () => {
    // The server answers closed_unknown (not unpaid_final) for this order.
    await returnWith({ state: "closed_unknown", order_number: NUMBER });
    await heading("Pembayaran belum dapat dipastikan");
    expect(screen.getByText(NUMBER)).toBeTruthy();
    expect(screen.getByRole("link", { name: "support@nuave.ai" })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Coba bayar lagi" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Kembali" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Halaman sebelumnya" }),
    ).toBeNull();
  });
});

describe("Mulai pesanan baru after a refund (Q17)", () => {
  it.each([
    ["closed_unknown", "Pembayaran belum dapat dipastikan"],
    ["needs_refund", "Pembayaran ini tidak dapat dipakai untuk pesanan ini"],
    ["paid_ended", "Pesanan ini tidak dapat dilanjutkan di sini"],
    ["unpaid_final", "Pembayaran tidak kami terima"],
  ])("a %s order has no Mulai pesanan baru", async (state, title) => {
    await returnWith({ state, order_number: NUMBER }, { state: "failed" });
    await heading(title);
    expect(
      screen.queryByRole("button", { name: "Mulai pesanan baru" }),
    ).toBeNull();
  });

  it("a refunded order offers it; it returns to the entry and the next order carries no previous_order_id", async () => {
    const { stub, set } = await returnWith(
      { state: "refunded", order_number: NUMBER },
      { state: "failed" },
    );
    await heading("Pembayaran sudah dikembalikan");
    fireEvent.click(await button("Mulai pesanan baru"));
    await screen.findByRole("textbox", {
      name: "Website atau akun Instagram bisnis",
    });
    expect(readSmartSession()?.order ?? null).toBeNull();
    expect(readSmartSession()?.supersededOrder ?? null).toBeNull();
    // A fresh journey: a new order is made with no previous_order_id.
    set({ state: "open", payment: { state: "unpaid" } });
    await toOrderScreen();
    await pay();
    await waitFor(() => expect(stub.bodies["/api/orders"]).toHaveLength(2));
    expect(stub.bodies["/api/orders"]![1]).not.toHaveProperty(
      "previous_order_id",
    );
  });
});

describe("a replacement refused because the payment is unknown (Q14)", () => {
  it("shows the old order's closed-unknown screen and starts no new payment", async () => {
    let created = 0;
    let answer: Record<string, unknown> = {
      state: "open",
      payment: { state: "unpaid" },
    };
    const stub = stubServer({
      status: () => answer,
      create: () => {
        created += 1;
        return created === 1
          ? Response.json({ order_id: ORDER_ID, state: "open" })
          : Response.json(
              {
                error: "Pembayaran pesanan sebelumnya belum dapat dipastikan.",
                code: "PREVIOUS_ORDER_ACTIVE",
                previous_state: "payment_unknown",
              },
              { status: 409 },
            );
      },
    });
    render(<SmartIntakeJourney live />);
    await toOrderScreen();
    await pay();
    await waitFor(() => expect(navigated).toBe(MIDTRANS_PAGE));
    answer = { state: "expired", payment: { state: "unpaid_final" } };
    await reloadWith(stub);
    fireEvent.click(await button("Coba bayar lagi"));
    // Meanwhile the old attempt closed as unknown.
    answer = {
      state: "failed",
      payment: { state: "closed_unknown", order_number: NUMBER },
    };
    await typeEmail();
    fireEvent.click(await button("Bayar Rp99.000"));
    await heading("Pembayaran belum dapat dipastikan");
    expect(screen.getByText(NUMBER)).toBeTruthy();
    expect(created).toBe(2);
    expect(stub.calls.filter((c) => c === "/api/payments/start")).toHaveLength(
      1,
    );
    expect(readSmartSession()?.order?.id).toBe(ORDER_ID);
    expect(screen.queryByRole("button", { name: "Bayar Rp99.000" })).toBeNull();
  });
});

describe("ended payment states lock the order (Q13 A, R-12, R-19)", () => {
  it.each(["closed_unknown", "needs_refund"])(
    "a %s order has no Kembali, no Ubah and no way to Bayar Rp99.000",
    async (state) => {
      await returnWith({ state, order_number: NUMBER }, { state: "failed" });
      await screen.findByText(NUMBER);
      expect(screen.queryByRole("button", { name: "Kembali" })).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Halaman sebelumnya" }),
      ).toBeNull();
      expect(screen.queryByRole("button", { name: /Ubah/ })).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Bayar Rp99.000" }),
      ).toBeNull();
      expect(screen.queryByRole("textbox", { name: /Email/ })).toBeNull();
    },
  );

  it.each(["paid_ended", "refunded"])(
    "a paid order first seen as %s is stored as paid with its number, never sent as a replacement",
    async (state) => {
      const { stub } = await returnWith(
        { state, order_number: NUMBER },
        { state: "failed" },
      );
      await screen.findByText(NUMBER);
      expect(readSmartSession()?.order).toMatchObject({
        id: ORDER_ID,
        paid: true,
        number: NUMBER,
      });
      expect(screen.queryByRole("button", { name: "Kembali" })).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Halaman sebelumnya" }),
      ).toBeNull();
      expect(stub.calls.filter((call) => call === "/api/orders")).toHaveLength(
        1,
      );
    },
  );
});

describe("a late payment after Coba bayar lagi (R-11, R-19)", () => {
  it("the 409 restores the old order from the kept id and the page continues as paid", async () => {
    let created = 0;
    let answer: Record<string, unknown> = {
      state: "open",
      payment: { state: "unpaid" },
    };
    const stub = stubServer({
      status: () => answer,
      create: () => {
        created += 1;
        return created === 1
          ? Response.json({ order_id: ORDER_ID, state: "open" })
          : Response.json(
              {
                error: "Pesanan sebelumnya sudah dibayar.",
                code: "PREVIOUS_ORDER_ACTIVE",
                previous_state: "paid",
              },
              { status: 409 },
            );
      },
    });
    render(<SmartIntakeJourney live />);
    await toOrderScreen();
    await pay();
    await waitFor(() => expect(navigated).toBe(MIDTRANS_PAGE));
    // Back from Midtrans: the attempt ended unpaid, so Coba bayar lagi.
    answer = { state: "expired", payment: { state: "unpaid_final" } };
    await reloadWith(stub);
    fireEvent.click(await button("Coba bayar lagi"));
    expect(readSmartSession()?.order).toBeNull();
    // Meanwhile a late payment revived the old order.
    answer = {
      state: "open",
      payment: { state: "paid", order_number: NUMBER },
    };
    await typeEmail();
    fireEvent.click(await button("Bayar Rp99.000"));
    await heading("Pembayaran diterima");
    expect(screen.getByText(NUMBER)).toBeTruthy();
    expect(created).toBe(2);
    expect(readSmartSession()?.order).toMatchObject({
      id: ORDER_ID,
      paid: true,
      name: "Kedai Fiksi",
      website: "https://kedai-fiksi.example/",
    });
    // No second payment was started and the page offers to continue.
    expect(stub.calls.filter((c) => c === "/api/payments/start")).toHaveLength(
      1,
    );
    expect(await button("Lanjut")).toBeTruthy();
  });
});

describe("a replacement refused because the old order is active (R-19)", () => {
  it("keeps the old order with its own website and business, and makes no new order", async () => {
    let created = 0;
    const stub = stubServer({
      start: () =>
        Response.json(
          {
            error: "Pembayaran belum bisa dimulai.",
            code: "PAYMENT_START_FAILED",
          },
          { status: 502 },
        ),
      create: () => {
        created += 1;
        return created === 1
          ? Response.json({ order_id: ORDER_ID, state: "open" })
          : Response.json(
              {
                error: "Pesanan sebelumnya sudah dibayar.",
                code: "PREVIOUS_ORDER_ACTIVE",
              },
              { status: 409 },
            );
      },
    });
    render(<SmartIntakeJourney live />);
    await toOrderScreen();
    await pay();
    await screen.findByRole("alert");
    await waitFor(() =>
      expect(screen.queryByRole("textbox", { name: /Email/ })).toBeNull(),
    );
    // Back to the brand check (through the three steps), a different
    // business name, forward again.
    fireEvent.click(screen.getByRole("button", { name: "Halaman sebelumnya" }));
    await heading("Tinggal 3 langkah");
    fireEvent.click(screen.getByRole("button", { name: "Halaman sebelumnya" }));
    await heading("Kami menemukan bisnis Anda");
    fireEvent.click(screen.getByRole("button", { name: "Ubah nama" }));
    const rename = await screen.findByRole("dialog", { name: "Nama bisnis" });
    fireEvent.change(
      within(rename).getByRole("textbox", { name: "Nama bisnis" }),
      { target: { value: "Nama Lain Fiksi" } },
    );
    fireEvent.click(within(rename).getByRole("button", { name: "Simpan" }));
    fireEvent.click(await button("Ya, ini bisnis saya"));
    await heading("Tinggal 3 langkah");
    fireEvent.click(
      screen.getByRole("button", { name: "Lanjut ke pembayaran" }),
    );
    await heading("Konfirmasi dan bayar");
    await typeEmail();
    fireEvent.click(await button("Bayar Rp99.000"));
    await waitFor(() => expect(created).toBe(2));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("sudah dibayar"),
    );
    expect(stub.calls.filter((c) => c === "/api/payments/start")).toHaveLength(
      1,
    );
    const saved = readSmartSession()!;
    expect(saved.order).toMatchObject({
      id: ORDER_ID,
      name: "Kedai Fiksi",
      website: "https://kedai-fiksi.example/",
    });
    expect(saved.brand?.name).toBe("Kedai Fiksi");
  });
});

describe("locks after payment (R-19, AC-13)", () => {
  async function paidAtFocus() {
    let paid = false;
    const stub = stubServer({
      start: () => {
        paid = true;
        return Response.json({ simulated: true });
      },
      status: () => ({
        state: "open",
        payment: paid
          ? { state: "paid", order_number: NUMBER }
          : { state: "unpaid" },
      }),
    });
    render(<SmartIntakeJourney live={false} />);
    await toOrderScreen();
    await pay();
    // The paid reading starts by itself and lands on the Step 2 cover.
    await heading("Ceritakan bisnis Anda");
    fireEvent.click(await button("Mulai"));
    await heading("Apa yang ingin Anda audit?");
    return stub;
  }

  it("has no way back to the business or the website", async () => {
    await paidAtFocus();
    expect(
      screen.queryByRole("button", { name: "Halaman sebelumnya" }),
    ).toBeNull();
    // Kembali on the focus screen only reaches the Step 2 cover...
    fireEvent.click(screen.getByRole("button", { name: "Kembali" }));
    await heading("Ceritakan bisnis Anda");
    // ...which has no way back to the business, the steps or the order.
    expect(screen.queryByRole("button", { name: "Kembali" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Halaman sebelumnya" }),
    ).toBeNull();
    // The main button still works.
    fireEvent.click(screen.getByRole("button", { name: "Mulai" }));
    await heading("Apa yang ingin Anda audit?");
  });

  it("a paid order that the server no longer knows is never turned into a new order", async () => {
    const stub = await paidAtFocus();
    stub.status = () => new Response("", { status: 404 });
    cleanup();
    render(<SmartIntakeJourney live={false} />);
    await screen.findByText(NUMBER);
    expect(screen.getByRole("link", { name: "support@nuave.ai" })).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: /Email/ })).toBeNull();
    expect(stub.calls.filter((call) => call === "/api/orders")).toHaveLength(1);
    // The saved order keeps its paid mark, so it is never sent as a replacement.
    expect(readSmartSession()?.order?.paid).toBe(true);
  });

  it("an ended answer for a paid order shows support, not the entry of a new order", async () => {
    const stub = await paidAtFocus();
    stub.status = () => ({ state: "expired", payment: { state: "paid" } });
    cleanup();
    render(<SmartIntakeJourney live={false} />);
    await screen.findByText(NUMBER);
    expect(screen.queryByRole("textbox", { name: /Email/ })).toBeNull();
    expect(stub.calls.filter((call) => call === "/api/orders")).toHaveLength(1);
  });
});

describe("the founder test pass (R-20)", () => {
  it("sends the code only in the order body, then continues with no payment", async () => {
    window.sessionStorage.setItem(
      "nuave.testPass.v1",
      "founder-code-0123456789abcdef",
    );
    const stub = stubServer({
      status: () => ({ state: "open", payment: { state: "not_required" } }),
    });
    render(<SmartIntakeJourney live />);
    await toOrderScreen();
    expect(screen.queryByText("Rp99.000")).toBeNull();
    await typeEmail();
    fireEvent.click(await button("Lanjut"));
    // No payment: the paid reading runs at once and the intake continues.
    await heading("Ceritakan bisnis Anda");
    fireEvent.click(await button("Mulai"));
    await heading("Apa yang ingin Anda audit?");
    expect(stub.bodies["/api/orders"]![0]).toMatchObject({
      test_pass_code: "founder-code-0123456789abcdef",
    });
    expect(stub.calls).not.toContain("/api/payments/start");
    // Never in local storage, a URL or any other request.
    expect(JSON.stringify({ ...window.localStorage })).not.toContain(
      "founder-code",
    );
    for (const [key, bodies] of Object.entries(stub.bodies)) {
      if (key !== "/api/orders")
        expect(JSON.stringify(bodies)).not.toContain("founder-code");
    }
    expect(window.location.href).not.toContain("founder-code");
  });
});
