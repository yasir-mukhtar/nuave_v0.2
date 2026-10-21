// @vitest-environment jsdom
// Real Smart UI -> real routes -> real safe fetch/selector/provider/SDK/parser.
// Only DNS, Worker bindings and HTTP transports are fictional; never use network.
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_PASS_STORAGE_KEY } from "./test-pass";
import { Buffer } from "node:buffer";
const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  resolve4: vi.fn(),
  resolve6: vi.fn(),
}));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.context,
}));
// Spec 016: the paid reading needs an open order and reads the website saved on
// it. The order and ledger mechanics are tested in orders/*.test.ts; here the
// order is a stub carrying the website the UI ordered for.
const orderStub = vi.hoisted(() => ({
  id: "0123456789abcdef0123456789abcdef",
  website: "",
  name: "",
}));
vi.mock("@/lib/orders/http", () => ({
  orderRuntime: () => ({ db: {}, environment: "production", mode: "live" }),
}));
vi.mock("@/lib/orders/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/orders/store")>()),
  orderInState: async () => ({
    id: orderStub.id,
    website: orderStub.website,
    business_name: orderStub.name,
  }),
}));
vi.mock("node:dns", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:dns")>();
  const promises = {
    ...original.promises,
    resolve4: mocks.resolve4,
    resolve6: mocks.resolve6,
  };
  return { ...original, promises, default: { ...original, promises } };
});
vi.mock("../audit/telemetry", async (importOriginal) => {
  const original = await importOriginal<typeof import("../audit/telemetry")>();
  return { ...original, reserveAuditCall: vi.fn(original.reserveAuditCall) };
});
vi.mock("@/lib/spending/provider-spend", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/spending/provider-spend")>()),
  // These tests are not about the spend cap (see spending/*.test.ts).
  reserveProviderSpend: async () => ({ settle: async () => {} }),
}));
vi.mock("openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("openai")>();
  // These Node route handlers run inside the UI's jsdom test process only.
  // Preserve the real SDK/parser/transport while bypassing its browser-env check.
  return {
    ...actual,
    default: class OfflineServerSDK extends actual.default {
      constructor(options: ConstructorParameters<typeof actual.default>[0]) {
        super({ ...options, dangerouslyAllowBrowser: true });
      }
    },
  };
});
import { GET as identityGET } from "@/app/api/audit/identity/route";
import { POST as extractPOST } from "@/app/api/audit/extract/route";
import {
  extractBusinessDraft,
  extractionDraftOrManualFallback,
} from "../audit/openai";
import { reserveAuditCall, serverOwnedAuditBudget } from "../audit/telemetry";
import { fixtureCallTelemetry } from "../audit/fixtures/telemetry";
import {
  SOURCE_EXCERPT_EMPTY_NOTICE,
  SOURCE_EXCERPT_UNAVAILABLE_MESSAGE,
  SOURCE_EXCERPT_RESTRICTED_MESSAGE,
  type ExtractionDraft,
} from "../audit/types";
import { SMART_INTAKE_STORAGE_KEY } from "./smart-intake-contract";
import { freshSmartSession, parseSmartSession } from "./smart-session";
import SmartIntakeJourney from "./SmartIntakeJourney";

const source = "https://kedai-pelangi-fiksi.example/";
const excerpt =
  "Kedai Pelangi Fiksi\n\nKopi susu dan roti panggang.\n\nMakan dan minum di kedai kami.\n\nMelayani kawasan Dago, Bandung.\n\nPenanda teks publik fiktif yang tidak disimpan.";
const richHtml =
  "<html><head><title>Kedai Pelangi Fiksi</title></head><body><main><h1>Kedai Pelangi Fiksi</h1><p>Kopi susu dan roti panggang.</p><p>Makan dan minum di kedai kami.</p><p>Melayani kawasan Dago, Bandung.</p><p>Penanda teks publik fiktif yang tidak disimpan.</p></main></body></html>";
function input() {
  return {
    website_url: source,
    brand_name: "Kedai Pelangi Fiksi",
    market_context: "",
    category: "",
    safety_identifier: "fictional-source-test",
    budget: {
      limit_usd: 5 as const,
      carryover_cost_usd: 0.25,
      calls: [
        fixtureCallTelemetry({ stage: "extract", accounted_cost_usd: 0.02 }),
      ],
    },
  };
}
function draft(rich = true): ExtractionDraft {
  const value = extractionDraftOrManualFallback(input(), {
    status: "completed",
    incomplete_details: null,
    output: [],
    output_parsed: null,
  });
  return {
    ...value,
    warnings: [],
    ...(rich
      ? {
          category: "kedai kopi",
          verified_offerings: ["Kopi susu", "Roti panggang"],
          service_channels: ["on_premise"],
          market_reach: "sekitar",
          market_areas: ["Dago, Bandung"],
          evidence: [
            {
              field: "verified_offerings",
              value: "Kopi susu",
              source_url: source,
              note: "Menu publik fiksi",
            },
          ],
        }
      : {}),
  };
}
type SDKRequest = {
  input: { role: string; content: string }[];
  [key: string]: unknown;
};
let pageHtml: string,
  parsedDraft: ExtractionDraft,
  incomplete: boolean,
  providerError: boolean;
let failPage: number, pageReads: number, iconReads: number;
let requests: SDKRequest[],
  clientRequests: string[],
  clientBodies: Record<string, unknown>[];
let destination: { limit: ReturnType<typeof vi.fn> };
function sdkResponse() {
  return {
    id: "resp_fictional",
    object: "response",
    created_at: 0,
    model: "gpt-5.6-luna",
    service_tier: "default",
    status: incomplete ? "incomplete" : "completed",
    incomplete_details: incomplete ? { reason: "max_output_tokens" } : null,
    output: incomplete
      ? []
      : [
          {
            id: "msg_fictional",
            type: "message",
            role: "assistant",
            status: "completed",
            content: [
              {
                type: "output_text",
                text: JSON.stringify(parsedDraft),
                annotations: [],
              },
            ],
          },
        ],
    usage: {
      input_tokens: 100,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens: 100,
      output_tokens_details: { reasoning_tokens: 0 },
      total_tokens: 200,
    },
  };
}
beforeEach(() => {
  window.sessionStorage.clear();
  // Spec 017 R-20: these journeys run on a founder test pass (no payment); the
  // paid screens have their own tests in payment-journey.test.tsx.
  window.sessionStorage.setItem(TEST_PASS_STORAGE_KEY, "test-code");
  window.localStorage.clear();
  vi.clearAllMocks();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  // Native fetch byte chunks and jsdom typed arrays belong to different realms.
  vi.stubGlobal(
    "Uint8Array",
    Object.getPrototypeOf(Buffer.prototype).constructor,
  );
  for (const [name, value] of Object.entries({
    NUAVE_NEW_AUDIT_ENABLED: "1",
    NUAVE_AUDIT_MODE: "live",
    NUAVE_PROVIDER: "openai",
    OPENAI_API_KEY: "fictional-offline-only",
    CHEAPERINFERENCE_API_KEY: "fictional-offline-only",
    OPENAI_BASE_URL: "https://api.openai.com/v1",
    OPENAI_AUDIT_MODEL: "gpt-5.6-luna",
    OPENAI_AUDIT_REASONING_EFFORT: "low",
    OPENAI_AUDIT_CARRYOVER_COST_USD: "0",
    NUAVE_LIVE_PROVIDER_TESTING: "0",
  }))
    vi.stubEnv(name, value);
  mocks.resolve4.mockResolvedValue(["93.184.216.34"]);
  mocks.resolve6.mockResolvedValue([]);
  destination = { limit: vi.fn(async () => ({ success: true })) };
  mocks.context.mockReturnValue({
    env: {
      IDENTITY_CALLER_RATE_LIMITER: { limit: async () => ({ success: true }) },
      IDENTITY_DESTINATION_RATE_LIMITER: destination,
      EXTRACT_CALLER_RATE_LIMITER: { limit: async () => ({ success: true }) },
    },
  });
  pageHtml = richHtml;
  parsedDraft = draft();
  incomplete = false;
  providerError = false;
  failPage = 0;
  pageReads = 0;
  iconReads = 0;
  requests = [];
  clientRequests = [];
  clientBodies = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const value = String(url);
        if (value === "/api/orders") {
          const sent = JSON.parse(String(init?.body)) as {
            website: string;
            business_name: string;
          };
          orderStub.website = sent.website;
          orderStub.name = sent.business_name;
          return Response.json({ order_id: orderStub.id, state: "open" });
        }
        if (value === "/api/orders/status")
          return Response.json({
            state: "open",
            payment: { state: "not_required" },
            completed: 0,
            total: 10,
            questions: [],
          });
        if (value.startsWith("/api/audit/")) {
          clientRequests.push(value);
          if (init?.body) clientBodies.push(JSON.parse(String(init.body)));
          if (value.startsWith("/api/audit/identity"))
            return identityGET(new Request("https://nuave.test" + value));
          if (value === "/api/audit/extract")
            return extractPOST(new Request("https://nuave.test" + value, init));
          if (value === "/api/audit/glm-questions")
            return Response.json({
              status: "ok",
              questions: Array.from(
                { length: 10 },
                (_, i) =>
                  `Pilihan kedai kopi apa di Dago untuk kebutuhan ${i + 1}?`,
              ),
              provenance: {
                requestId: "fictional",
                method: "direct-ten",
                requestedModel: "synthetic",
                returnedModel: "synthetic",
                responseId: "fictional",
                modelMismatch: false,
                transport: "synthetic-stub",
              },
              cost: { billedUsd: null, available: false },
            });
          throw new Error("Downstream request forbidden");
        }
        if (value === source) {
          pageReads++;
          expect(init?.redirect).toBe("manual");
          return new Response(pageHtml, {
            status: pageReads === failPage ? 503 : 200,
            headers: { "content-type": "text/html" },
          });
        }
        if (value === source + "favicon.ico") {
          iconReads++;
          return new Response(new Uint8Array([1, 2, 3]), {
            headers: { "content-type": "image/png" },
          });
        }
        if (
          [
            "https://api.openai.com/v1/responses",
            "https://opencode.ai/zen/go/v1/responses",
          ].includes(value)
        ) {
          const body = JSON.parse(String(init?.body)) as SDKRequest;
          expect(body).toEqual(
            JSON.parse(
              JSON.stringify(
                vi.mocked(reserveAuditCall).mock.calls.at(-1)![0].request,
              ),
            ),
          );
          requests.push(body);
          return providerError
            ? Response.json(
                { error: { message: "Fictional provider failure" } },
                { status: 401 },
              )
            : Response.json(sdkResponse());
        }
        throw new Error("Unstubbed request forbidden");
      },
    ),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
async function post(value: Record<string, unknown> = input()) {
  // The website and brand come from the order; everything else the browser
  // sends is ignored by the route (spec 016 R-04).
  orderStub.website = String(value.website_url ?? source);
  orderStub.name = String(value.brand_name ?? "");
  return extractPOST(
    new Request("https://nuave.test/api/audit/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...value, order_id: orderStub.id }),
    }),
  );
}
const WEBSITE_FIELD = "Website atau akun Instagram bisnis";
const REVIEW_HEADING = "Ini profil yang akan Nuave pakai";
const REVIEW_CONFIRMATION =
  "Saya sudah memeriksa informasi ini dan menyetujuinya untuk digunakan dalam pertanyaan audit.";
async function passOrder() {
  await screen.findByRole("heading", { name: "Konfirmasi dan bayar" });
  fireEvent.change(
    screen.getByRole("textbox", { name: "Email penerima laporan" }),
    { target: { value: "pemilik@example.com" } },
  );
  fireEvent.click(lanjut());
}
/** J05 → J06: the business the free check found, then the three steps. */
async function confirmBrand() {
  await screen.findByRole("heading", { name: "Kami menemukan bisnis Anda" });
  fireEvent.click(screen.getByRole("button", { name: "Ya, ini bisnis saya" }));
  await screen.findByRole("heading", { name: "Tinggal 3 langkah" });
  fireEvent.click(screen.getByRole("button", { name: "Lanjut ke pembayaran" }));
}
/** Screens J01-J08: the free lookup, the brand check, the steps, then the
 * order. The paid reading (J09) starts by itself once the order needs no
 * payment (these journeys hold a founder test pass). */
async function inspectAndOrder() {
  await inspect();
  await confirmBrand();
  await passOrder();
}
/** J01: one field; the business name is read from the website. */
async function inspect() {
  const website = await screen.findByRole("textbox", { name: WEBSITE_FIELD });
  fireEvent.change(website, { target: { value: source } });
  fireEvent.click(
    screen.getByRole("button", { name: "Cek bisnis saya di AI" }),
  );
}
// `Cek bisnis saya di AI` lands on the brand check; the order's reading opens
// the Step 2 cover and `Mulai` the focus; whole-brand continues through
// category → offerings → target customer → customer needs (with what they
// compare) → service → market → competitors → differentiator (with the often
// wrong fact) → the Step 3 cover → review. These fixtures carry prepared
// values, so each screen's `Lanjut` is already enabled.
const lanjut = () => screen.getByRole("button", { name: "Lanjut" });
async function throughOrderToFocus() {
  await confirmBrand();
  await passOrder();
  await screen.findByRole("heading", { name: "Ceritakan bisnis Anda" });
  fireEvent.click(screen.getByRole("button", { name: "Mulai" }));
  await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
}
async function toCategory() {
  fireEvent.click(lanjut());
  await screen.findByRole("heading", { name: /biasanya disebut apa\?$/ });
}
async function fromCategoryToMarket() {
  fireEvent.click(lanjut());
  await screen.findByRole("heading", { name: "Apa saja yang Anda jual?" });
  fireEvent.click(lanjut());
  await screen.findByRole("heading", {
    name: "Siapa yang biasanya mencari bisnis Anda?",
  });
  fireEvent.click(lanjut());
  await screen.findByRole("heading", {
    name: "Apa yang mereka cari saat memilih?",
  });
  fireEvent.click(lanjut());
  await screen.findByRole("heading", {
    name: "Bagaimana pelanggan mendapatkannya?",
  });
  fireEvent.click(lanjut());
  await screen.findByRole("heading", {
    name: "Di mana pelanggan Anda berada?",
  });
}
async function fromFocusToMarket() {
  await toCategory();
  await fromCategoryToMarket();
}
async function throughBrandToMarket() {
  await throughOrderToFocus();
  await fromFocusToMarket();
}
async function fromMarketToSummary() {
  fireEvent.click(lanjut());
  // The fixtures name no similar businesses, so the field is already open.
  await screen.findByRole("heading", {
    name: "Bisnis mana yang sering dibandingkan dengan Anda?",
  });
  fireEvent.click(lanjut());
  await screen.findByRole("heading", {
    name: "Apa yang membuat bisnis Anda berbeda?",
  });
  fireEvent.click(lanjut());
  await screen.findByRole("heading", { name: "Periksa, lalu jalankan audit" });
  fireEvent.click(screen.getByRole("button", { name: "Mulai" }));
  await screen.findByRole("heading", { name: REVIEW_HEADING });
}
async function throughBrand() {
  await throughBrandToMarket();
  await fromMarketToSummary();
}
/** J25: the owner's tick unlocks the one request that writes the questions. */
async function makeQuestions() {
  const make = screen.getByRole("button", {
    name: "Buat pertanyaan audit",
  }) as HTMLButtonElement;
  expect(make.disabled).toBe(true);
  fireEvent.click(screen.getByRole("checkbox", { name: REVIEW_CONFIRMATION }));
  expect(make.disabled).toBe(false);
  fireEvent.click(make);
  await screen.findByRole("heading", { name: "10 pertanyaan untuk AI" });
}
/** What the review reads back under one fact label (dt → dd). */
function fact(label: string) {
  return screen.getByText(label, { selector: "dt" }).nextElementSibling
    ?.textContent;
}
/** J26: a review section's edit sheet. */
async function editSection(
  section: "Bisnis" | "Calon pelanggan" | "Pembanding",
) {
  fireEvent.click(screen.getByRole("button", { name: `Ubah ${section}` }));
  return screen.findByRole("dialog", { name: `Ubah ${section}` });
}
/** "+ Lainnya" in the Bisnis sheet: types a category of the owner's own. */
function typeCategory(sheet: HTMLElement, value: string) {
  fireEvent.click(within(sheet).getByRole("button", { name: "Lainnya" }));
  const field = within(sheet).getByRole("textbox", { name: "Kategori lain" });
  fireEvent.change(field, { target: { value } });
  fireEvent.keyDown(field, { key: "Enter" });
  return field;
}
/**
 * After a reload the order screen asks the server about the saved order once.
 * Its answer brings back `Lanjut`; any reading that would start by itself
 * starts right after it, so the counters are read only after that point.
 */
async function orderSettled() {
  await screen.findByRole("button", { name: "Lanjut" });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

describe("server excerpt through the active Smart preparation", () => {
  it.each([
    "Hasil panen petani lokal untuk keluarga Indonesia.",
    "Menu sehat keluarga, baik untuk jantung.",
    "Kontes foto untuk saya dan keluarga.",
    "Keluarga kami membuka kedai di jantung kota.",
  ])(
    "R3 page and copied proposal reach confirmation unchanged: %s",
    async (text) => {
      pageHtml = `<head><title>Kedai Pelangi Fiksi</title></head><main><p>${text}</p></main>`;
      parsedDraft = { ...draft(), verified_offerings: [text] };
      render(<SmartIntakeJourney live />);
      await inspect();
      await throughBrand();
      expect(
        JSON.parse(requests[0].input[1].content).public_source_data.text,
      ).toBe(text);
      const saved = parseSmartSession(
        window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
      );
      expect(saved?.prepared?.offerings).toEqual({
        proposed: [text],
        origin: "website",
      });
      expect(saved?.selection?.offerings).toEqual([text]);
      expect(fact("Menjual")).toBe(text);
      await makeQuestions();
      const confirmed = parseSmartSession(
        window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
      );
      expect(confirmed?.frozen?.context.offerings).toEqual({
        value: [text],
        origin: "website",
      });
      expect(clientBodies.at(-1)?.intake).toEqual(confirmed?.frozen);
      expect(requests).toHaveLength(1);
      expect(reserveAuditCall).toHaveBeenCalledTimes(1);
      expect(pageReads).toBe(2);
      expect(clientRequests).toHaveLength(3);
    },
  );

  it.each([
    ["sensitive", "Hasil tes darah keluarga saya menunjukkan anemia."],
    ["cautious P9", "Keluarga kami menyajikan menu sehat untuk jantung."],
    [
      "cautious P14",
      "Keluarga kami menyajikan kopi sejak 1990, positif dan hangat.",
    ],
  ])(
    "%s page stop preserves accounting, clear copy and reload without work",
    async (_label, text) => {
      const expected =
        "Nuave belum dapat menyiapkan informasi dari halaman ini. Sebagian teks mungkin berisi informasi sensitif. Pilih halaman lain yang hanya memuat informasi publik tentang brand Anda.";
      expect(SOURCE_EXCERPT_RESTRICTED_MESSAGE).toBe(expected);
      const initial = freshSmartSession();
      initial.preparationCalls = input().budget.calls;
      initial.savedAt = new Date().toISOString();
      window.localStorage.setItem(
        SMART_INTAKE_STORAGE_KEY,
        JSON.stringify(initial),
      );
      pageHtml = `<head><title>Kedai Pelangi Fiksi</title></head><p>${text}</p>`;
      const mounted = render(<SmartIntakeJourney live />);
      await inspectAndOrder();
      expect((await screen.findByRole("alert")).textContent).toBe(expected);
      const saved = parseSmartSession(
        window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
      );
      expect(saved?.preparationCalls).toEqual(initial.preparationCalls);
      expect(saved?.entry).toEqual({ name: "Kedai Pelangi Fiksi", source });
      expect(saved?.prepared).toBeNull();
      expect(saved?.sourceExcerptStatus).toBe("restricted");
      expect(JSON.stringify(saved)).not.toContain(text);
      expect(document.body.textContent).not.toContain(text);
      expect(document.body.textContent).not.toContain("hubungi Nuave");
      const calls = [...clientRequests];
      const reads = pageReads;
      mounted.unmount();
      render(<SmartIntakeJourney live />);
      expect((await screen.findByRole("alert")).textContent).toBe(expected);
      // The stopped reading waits for the owner's own Lanjut (J09).
      await orderSettled();
      expect(screen.getByRole("alert").textContent).toBe(expected);
      expect(clientRequests).toEqual(calls);
      expect(pageReads).toBe(reads);
      expect(requests).toHaveLength(0);
      expect(reserveAuditCall).not.toHaveBeenCalled();
      expect(
        parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY))
          ?.preparationCalls,
      ).toEqual(initial.preparationCalls);
    },
  );

  it.each([
    "Hasil tes darah keluarga saya menunjukkan anemia.",
    "Keluarga kami menyajikan menu sehat untuk jantung.",
  ])(
    "later proposal, entered name and owner edit use the distinct stop without saving text: %s",
    async (text) => {
      const expected =
        "Persiapan audit belum dapat dilanjutkan. Ada teks yang mungkin berisi informasi sensitif. Gunakan hanya informasi publik tentang brand Anda, tanpa data pribadi atau akses akun.";
      const stored = () =>
        window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "";
      const first = render(<SmartIntakeJourney live />);
      // J01's one field is the first text the owner enters.
      fireEvent.change(
        await screen.findByRole("textbox", { name: WEBSITE_FIELD }),
        { target: { value: text } },
      );
      expect((await screen.findByRole("alert")).textContent).toBe(expected);
      expect(clientRequests).toHaveLength(0);
      expect(stored()).not.toContain(text);
      parsedDraft = { ...draft(), verified_offerings: [text] };
      await inspectAndOrder();
      expect((await screen.findByRole("alert")).textContent).toBe(expected);
      const rejected = parseSmartSession(
        window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
      );
      expect(rejected?.prepared).toBeNull();
      expect(rejected?.preparationCalls).toHaveLength(1);
      expect(JSON.stringify(rejected)).not.toContain(text);
      expect(clientRequests).toHaveLength(2);
      expect(requests).toHaveLength(1);
      first.unmount();
      // A separate safe preparation exercises the existing owner-edit guard,
      // now inside the review's Bisnis sheet (J26).
      window.sessionStorage.clear();
      window.sessionStorage.setItem(TEST_PASS_STORAGE_KEY, "test-code");
      window.localStorage.clear();
      parsedDraft = draft();
      const second = render(<SmartIntakeJourney live />);
      await inspect();
      await throughBrand();
      const calls = [...clientRequests];
      const before = window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY);
      const sheet = await editSection("Bisnis");
      typeCategory(sheet, text);
      expect(within(sheet).getByRole("alert").textContent).toBe(expected);
      expect(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)).toBe(
        before,
      );
      expect(clientRequests).toEqual(calls);
      // The refused text stays only in the owner's own field and its
      // keyboard bar, for correction; nothing else on the page repeats it.
      const draftBar = within(sheet).getByRole("group", {
        name: "Kategori lain",
      });
      expect(
        document.body.textContent!.replace(draftBar.textContent!, ""),
      ).not.toContain(text);
      expect(document.body.textContent).not.toContain("hubungi Nuave");
      fireEvent.click(within(sheet).getByRole("button", { name: "Batal" }));
      // The sheet slides away before it leaves the page.
      await waitFor(() => expect(sheet.isConnected).toBe(false));
      expect(document.body.textContent).not.toContain(text);
      expect(fact("Disebut sebagai")).toBe("kedai kopi");
      expect(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)).toBe(
        before,
      );
      expect(clientRequests).toEqual(calls);
      second.unmount();
      // J05b: the name the owner enters after the free check.
      window.sessionStorage.clear();
      window.sessionStorage.setItem(TEST_PASS_STORAGE_KEY, "test-code");
      window.localStorage.clear();
      render(<SmartIntakeJourney live />);
      await inspect();
      await screen.findByRole("heading", {
        name: "Kami menemukan bisnis Anda",
      });
      const looked = [...clientRequests];
      fireEvent.click(screen.getByRole("button", { name: "Ubah nama" }));
      const rename = await screen.findByRole("dialog", { name: "Nama bisnis" });
      fireEvent.change(
        within(rename).getByRole("textbox", { name: "Nama bisnis" }),
        { target: { value: text } },
      );
      fireEvent.click(within(rename).getByRole("button", { name: "Simpan" }));
      expect(stored()).not.toContain(text);
      expect(clientRequests).toEqual(looked);
      expect((await screen.findByRole("alert")).textContent).toBe(expected);
    },
  );

  it("accepts an owner correction with the same safe-text rule and owner origin", async () => {
    render(<SmartIntakeJourney live />);
    await inspect();
    await throughBrand();
    const text = "Keluarga kami membuka kedai di jantung kota.";
    const sheet = await editSection("Bisnis");
    typeCategory(sheet, text);
    expect(within(sheet).queryByRole("alert")).toBeNull();
    expect(
      within(sheet)
        .getByRole("radio", { name: text })
        .getAttribute("aria-checked"),
    ).toBe("true");
    fireEvent.click(within(sheet).getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(fact("Disebut sebagai")).toBe(text);
    // The review reads back plain facts; the owner origin travels with them.
    expect(
      parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY))
        ?.selection?.origins.category,
    ).toBe("owner");
    await makeQuestions();
    expect(
      parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY))
        ?.frozen?.context.category,
    ).toEqual({ value: text, origin: "owner" });
    expect(requests).toHaveLength(1);
  });

  // Fictional hosted-search outputs exercise application behavior, not the
  // model's ability to discover a directory or interpret its geographic scope.
  it.each([
    {
      label: "one local area",
      reach: "sekitar",
      areas: ["Dago, Bandung"],
      ready: true,
    },
    {
      label: "six regional areas",
      reach: "beberapa",
      areas: [
        "Cimahi",
        "Bandung",
        "Sumedang",
        "Garut",
        "Tasikmalaya",
        "Cianjur",
      ],
      ready: true,
    },
    {
      label: "many outlets in two published regions",
      reach: "beberapa",
      areas: ["Bandung Raya", "Priangan Timur"],
      ready: true,
    },
    {
      label: "distributed national network with local delivery",
      reach: "seluruh",
      areas: [],
      ready: true,
    },
    {
      label: "current presence in Indonesia and abroad",
      reach: "luar",
      areas: [],
      ready: true,
    },
    {
      label: "regional footprint that cannot fit eight supported areas",
      reach: "beberapa",
      areas: [],
      ready: false,
    },
    {
      label: "aspiration, contact or unexplained count only",
      reach: "",
      areas: [],
      ready: false,
    },
  ] as const)(
    "preserves $label as proposals with one preparation and the existing confirmation gate",
    async ({ reach, areas, ready }) => {
      pageHtml =
        "<head><title>Kedai Pelangi Fiksi</title></head><main><p>Kopi susu dan roti panggang di kedai kami.</p><p>Pengiriman hanya di sekitar gerai.</p></main>";
      parsedDraft = {
        ...draft(),
        service_channels: ["on_premise", "delivery"],
        market_reach: reach,
        market_areas: [...areas],
        target_customer: "",
        evidence: [
          {
            field: "market_reach",
            value: reach,
            source_url: source + "lokasi-resmi",
            note: "Bukti lokasi fiktif; pengiriman hanya di sekitar gerai.",
          },
        ],
      };
      const mounted = render(<SmartIntakeJourney live />);
      await inspect();
      // The prepared market proposal lands on the market screen; an
      // unrepresentable one keeps its `Lanjut` blocked instead of reaching
      // the summary with a gap.
      await throughBrandToMarket();
      const saved = parseSmartSession(
        window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
      );
      expect(saved?.frozen).toBeNull();
      expect(saved?.selection).toMatchObject({
        focus: "brand",
        marketReach: reach,
        marketAreas: [...areas],
        targetCustomer: "",
        serviceChannels: ["on_premise", "delivery"],
        origins: {
          focus: "nuave",
          market: "website",
          serviceChannels: "website",
        },
      });
      if (reach)
        expect(
          screen.getByText("Sudah kami isi dari website. Ganti jika perlu."),
        ).toBeTruthy();
      if (reach === "seluruh" || reach === "luar") {
        expect(
          screen.queryByRole("button", { name: "Tambah kota" }),
        ).toBeNull();
        expect(
          screen.queryByRole("textbox", { name: "Kota atau area" }),
        ).toBeNull();
      }
      for (const area of areas)
        expect(
          screen
            .getByRole("button", { name: area })
            .getAttribute("aria-pressed"),
        ).toBe("true");
      expect((lanjut() as HTMLButtonElement).disabled).toBe(!ready);
      mounted.unmount();
      render(<SmartIntakeJourney live />);
      await screen.findByRole("heading", {
        name: "Di mana pelanggan Anda berada?",
      });
      expect(requests).toHaveLength(1);
      expect(pageReads).toBe(2); // Existing identity read plus one excerpt read.
      expect(clientRequests).toHaveLength(2);
      if (ready) {
        await fromMarketToSummary();
        expect(fact("Area")).toBe(
          reach === "seluruh"
            ? "Seluruh Indonesia"
            : reach === "luar"
              ? "Indonesia dan luar negeri"
              : areas.join(", "),
        );
        fireEvent.click(
          screen.getByRole("button", { name: "Lihat sumber (1)" }),
        );
        expect(
          (
            await screen.findByRole("link", { name: source + "lokasi-resmi" })
          ).getAttribute("href"),
        ).toBe(source + "lokasi-resmi");
        await makeQuestions();
        const intake = clientBodies.at(-1)!.intake as {
          context: Record<string, unknown>;
        };
        expect(intake.context.market).toEqual({
          value: { reach, areas: [...areas] },
          origin: "website",
        });
        expect(intake.context.serviceChannels).toEqual({
          value: ["on_premise", "delivery"],
          origin: "website",
        });
        expect(intake.context.focus).toEqual({
          value: { kind: "brand" },
          origin: "nuave",
        });
        expect(intake.context).not.toHaveProperty("targetCustomer");
        expect(clientRequests).toHaveLength(3);
      }
      expect(requests).toHaveLength(1);
      expect(pageReads).toBe(2);
    },
  );

  it("one Periksa preserves identity/icon behavior, adds one document, and prepares exact proposals without storing text", async () => {
    render(<SmartIntakeJourney live />);
    await inspect();
    await throughOrderToFocus();
    await toCategory();
    // The website's own category is labelled once, on its own screen (J13).
    expect(screen.getByText("Ditemukan di website")).toBeTruthy();
    await fromCategoryToMarket();
    await fromMarketToSummary();
    expect(clientRequests).toHaveLength(2);
    expect(pageReads).toBe(2);
    expect(iconReads).toBe(1);
    expect(requests).toHaveLength(1);
    expect(fact("Disebut sebagai")).toBe("kedai kopi");
    expect(fact("Menjual")).toBe("Kopi susu, Roti panggang");
    expect(fact("Cara mendapatkan")).toBe("datang ke tempat");
    expect(fact("Area")).toBe("Dago, Bandung");
    const user = JSON.parse(requests[0].input[1].content);
    expect(user.public_source_data).toEqual({
      text: excerpt,
      source_url: source,
      retrieved_at: expect.any(String),
    });
    const stored = window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)!;
    expect(stored).not.toContain("Penanda teks publik");
    expect(stored).not.toContain("public_source_data");
    expect(stored).not.toContain("<html>");
    expect(JSON.parse(stored).sourceExcerptStatus).toBe("included");
    fireEvent.click(screen.getByRole("button", { name: "Lihat sumber (1)" }));
    expect(
      (await screen.findByRole("link", { name: source })).getAttribute("href"),
    ).toBe(source);
    const sheet = await editSection("Bisnis");
    typeCategory(sheet, "kafe");
    fireEvent.click(within(sheet).getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(fact("Disebut sebagai")).toBe("kafe");
    expect(
      parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY))
        ?.selection?.origins.category,
    ).toBe("owner");
    await makeQuestions();
    const frozen = JSON.stringify(clientBodies.at(-1));
    expect(frozen).not.toContain("sourceExcerptStatus");
    expect(frozen).not.toContain("public_source_data");
    expect(frozen).not.toContain("Penanda teks publik");
    expect(frozen).toContain("website");
    expect(requests).toHaveLength(1);
  });
  it("carries locations and Nuave category suggestions through the real route into a refresh-safe session", async () => {
    // Fictional J3 draft values; provider calls and counts are unchanged.
    parsedDraft = {
      ...draft(),
      published_locations: [
        {
          name: "Kedai Pelangi Dago",
          address: "Jl. Pelangi Fiksi No. 1, Bandung",
          source_url: `${source}lokasi`,
        },
        {
          name: "Kedai Pelangi Cimahi",
          address: "Jl. Pelangi Fiksi No. 2, Cimahi",
          // www-equivalent page on the same host still counts as published
          // by the business (PR #98 M2, applied in J4).
          source_url: `${source.replace("https://", "https://www.")}lokasi`,
        },
        {
          name: "Kedai Pelangi Terluar",
          address: "Jl. Pelangi Fiksi No. 3",
          // A listing on another host is never shown as website-published.
          source_url: "https://agregator.example/listing/pelangi",
        },
      ],
      category_suggestions: ["kedai kopi", "kafe"],
      offering_category_suggestions: [
        { offering: "Kopi susu", category: "minuman kopi siap minum" },
        { offering: "tidak tercantum", category: "misteri" },
      ],
    };
    const mounted = render(<SmartIntakeJourney live />);
    await inspect();
    await throughBrand();
    const saved = parseSmartSession(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
    );
    expect(saved?.prepared?.locations).toEqual({
      proposed: [
        {
          name: "Kedai Pelangi Dago",
          address: "Jl. Pelangi Fiksi No. 1, Bandung",
          sourceUrl: "https://kedai-pelangi-fiksi.example/lokasi",
        },
        {
          name: "Kedai Pelangi Cimahi",
          address: "Jl. Pelangi Fiksi No. 2, Cimahi",
          sourceUrl: "https://www.kedai-pelangi-fiksi.example/lokasi",
        },
      ],
      origin: "website",
    });
    expect(saved?.prepared?.categorySuggestions).toEqual({
      proposed: ["kedai kopi", "kafe"],
      origin: "nuave",
    });
    expect(saved?.prepared?.offeringCategorySuggestions).toEqual({
      proposed: [
        { offering: "Kopi susu", category: "minuman kopi siap minum" },
      ],
      origin: "nuave",
    });
    // Still exactly one provider request for preparation.
    expect(requests).toHaveLength(1);
    mounted.unmount();
    render(<SmartIntakeJourney live />);
    await screen.findByRole("heading", { name: REVIEW_HEADING });
    expect(
      parseSmartSession(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY))
        ?.prepared,
    ).toEqual(saved?.prepared);
    expect(requests).toHaveLength(1);
    expect(clientRequests).toHaveLength(2);
  });

  it("a location whose published address carries private contact text is dropped — the clean one still prepares", async () => {
    // Review B1: a branch listing printing WA/email on the address line drops
    // only that location — it never reaches the session and never blocks the
    // reading.
    parsedDraft = {
      ...draft(),
      published_locations: [
        {
          name: "Kedai Pelangi Cimahi",
          address: "Jl. Pelangi Fiksi 2, Cimahi (WA 0812-3456-7890)",
          source_url: source,
        },
        {
          name: "Kedai Pelangi Dago",
          address: "Jl. Pelangi Fiksi No. 1, Bandung",
          source_url: `${source}lokasi`,
        },
      ],
    };
    render(<SmartIntakeJourney live />);
    await inspect();
    await throughBrand();
    const saved = parseSmartSession(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY),
    );
    expect(saved?.prepared?.locations).toEqual({
      proposed: [
        {
          name: "Kedai Pelangi Dago",
          address: "Jl. Pelangi Fiksi No. 1, Bandung",
          sourceUrl: "https://kedai-pelangi-fiksi.example/lokasi",
        },
      ],
      origin: "website",
    });
    expect(JSON.stringify(saved)).not.toContain("0812-3456-7890");
    expect(document.body.textContent).not.toContain("0812-3456-7890");
    expect(requests).toHaveLength(1);
  });

  it("sparse readable input leaves unknowns empty and does not retry or invent channels/reach", async () => {
    pageHtml =
      "<head><title>Kedai Pelangi Fiksi</title></head><p>Selamat datang.</p>";
    parsedDraft = draft(false);
    render(<SmartIntakeJourney live />);
    await inspect();
    // Nothing was prepared: the first detail screen asks instead of
    // inventing values, and its `Lanjut` stays blocked.
    await throughOrderToFocus();
    await toCategory();
    expect(
      screen.getByRole("heading", {
        name: "Bisnis Anda biasanya disebut apa?",
      }),
    ).toBeTruthy();
    expect((lanjut() as HTMLButtonElement).disabled).toBe(true);
    const saved = JSON.parse(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)!,
    );
    expect(saved.selection.category).toBe("");
    expect(saved.selection.offerings).toEqual([]);
    expect(saved.selection.serviceChannels).toEqual([]);
    expect(saved.selection.marketReach).toBe("");
    expect(requests).toHaveLength(1);
    expect(pageReads).toBe(2);
  });
  it.each([
    ["script-only", "<script>unexecuted()</script>"],
    [
      "zero-opacity-only",
      '<main style="opacity:0.0!important"><p>Penanda tersembunyi fiktif.</p></main>',
    ],
    [
      "customer-reviews-only",
      '<section aria-label="Customer reviews"><p>Pelanggan Fiksi: roti ini kesukaan saya.</p></section>',
    ],
  ])(
    "%s no-text notice survives Back and reload without replay or a per-offering evidence gate",
    async (_label, body) => {
      pageHtml = `<head><title>Kedai Pelangi Fiksi</title></head>${body}`;
      const first = render(<SmartIntakeJourney live />);
      await inspectAndOrder();
      // The no-usable-text note first lands on the first question screen
      // after the paid reading and its Step 2 cover (J11).
      await screen.findByRole("heading", { name: "Ceritakan bisnis Anda" });
      fireEvent.click(screen.getByRole("button", { name: "Mulai" }));
      await screen.findByRole("heading", {
        name: "Apa yang ingin Anda audit?",
      });
      expect(screen.getByText(SOURCE_EXCERPT_EMPTY_NOTICE)).toBeTruthy();
      expect(JSON.parse(requests[0].input[1].content)).not.toHaveProperty(
        "public_source_data",
      );
      await fromFocusToMarket();
      await fromMarketToSummary();
      expect(screen.getByText(SOURCE_EXCERPT_EMPTY_NOTICE)).toBeTruthy();
      expect(fact("Menjual")).toBe("Kopi susu, Roti panggang");
      const sheet = await editSection("Bisnis");
      fireEvent.click(
        within(sheet).getByRole("button", { name: "Ganti website" }),
      );
      fireEvent.click(
        await screen.findByRole("button", { name: "Cek bisnis saya di AI" }),
      );
      await screen.findByRole("heading", {
        name: "Kami menemukan bisnis Anda",
      });
      expect(screen.getByText(SOURCE_EXCERPT_EMPTY_NOTICE)).toBeTruthy();
      first.unmount();
      render(<SmartIntakeJourney live />);
      await screen.findByText(SOURCE_EXCERPT_EMPTY_NOTICE);
      expect(screen.getByRole("status").textContent).toBe(
        SOURCE_EXCERPT_EMPTY_NOTICE,
      );
      expect(
        JSON.parse(window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)!)
          .sourceExcerptStatus,
      ).toBe("no-usable-text");
      expect(requests).toHaveLength(1);
      expect(pageReads).toBe(2);
      // identity + extract; the saved-order check is not a provider request.
      expect(clientRequests).toHaveLength(2);
    },
  );
  it("source failure persists safe identity/status, reload does no work and explicit retry reuses identity and order", async () => {
    failPage = 2;
    const first = render(<SmartIntakeJourney live />);
    await inspectAndOrder();
    await screen.findByText(SOURCE_EXCERPT_UNAVAILABLE_MESSAGE);
    const saved = JSON.parse(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)!,
    );
    expect(saved.identity.canonicalUrl).toBe(source);
    expect(saved.sourceExcerptStatus).toBe("unavailable");
    expect(saved.order.id).toBe(orderStub.id);
    expect(requests).toHaveLength(0);
    first.unmount();
    render(<SmartIntakeJourney live />);
    await screen.findByText(SOURCE_EXCERPT_UNAVAILABLE_MESSAGE);
    // The failed reading waits for the owner's own Lanjut (J09).
    await orderSettled();
    expect(pageReads).toBe(2);
    expect(screen.getByText(SOURCE_EXCERPT_UNAVAILABLE_MESSAGE)).toBeTruthy();
    failPage = 0;
    // The saved order is still open: Lanjut reads again, with no new order and
    // no email typed again.
    expect(screen.queryByRole("textbox", { name: /Email/ })).toBeNull();
    fireEvent.click(lanjut());
    await screen.findByRole("heading", { name: "Ceritakan bisnis Anda" });
    fireEvent.click(screen.getByRole("button", { name: "Mulai" }));
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    expect(pageReads).toBe(3);
    expect(iconReads).toBe(1);
    expect(
      clientRequests.filter((url) => url.startsWith("/api/audit/identity")),
    ).toHaveLength(1);
  });
  it("existing v2 absence is unknown and invalid source metadata cannot restore as success", () => {
    const old = freshSmartSession();
    expect(parseSmartSession(JSON.stringify(old))).not.toHaveProperty(
      "sourceExcerptStatus",
    );
    expect(
      parseSmartSession(
        JSON.stringify({ ...old, sourceExcerptStatus: { text: "untrusted" } }),
      ),
    ).toBeNull();
  });
  it.each(["privacy", "rate"])(
    "%s failure restores an accessible safe error without replay",
    async (kind) => {
      if (kind === "privacy")
        pageHtml =
          "<head><title>Kedai Pelangi Fiksi</title></head><p>Rekam medis pasien fiktif.</p>";
      else
        destination.limit
          .mockResolvedValueOnce({ success: true })
          .mockResolvedValueOnce({ success: true })
          .mockResolvedValue({ success: false });
      const first = render(<SmartIntakeJourney live />);
      await inspectAndOrder();
      await screen.findByRole("alert");
      const expected = kind === "privacy" ? "restricted" : "rate-limited";
      const raw = window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)!;
      const saved = JSON.parse(raw);
      expect(saved.sourceExcerptStatus).toBe(expected);
      expect(saved.identity.canonicalUrl).toBe(source);
      expect(raw).not.toContain("pasien");
      const reads = pageReads;
      const calls = [...clientRequests];
      const message = screen.getByRole("alert").textContent;
      first.unmount();
      render(<SmartIntakeJourney live />);
      expect((await screen.findByRole("alert")).textContent).toBe(message);
      // The stopped reading waits for the owner's own Lanjut (J09).
      await orderSettled();
      expect(screen.getByRole("alert").textContent).toBe(message);
      expect(pageReads).toBe(reads);
      expect(clientRequests).toEqual(calls);
      expect(requests).toHaveLength(0);
    },
  );
  it("a failed extraction restores its source outcome and ledger without replay or reset", async () => {
    providerError = true;
    const first = render(<SmartIntakeJourney live />);
    await inspectAndOrder();
    await screen.findByRole("alert");
    const saved = JSON.parse(
      window.localStorage.getItem(SMART_INTAKE_STORAGE_KEY)!,
    );
    expect(saved.sourceExcerptStatus).toBe("included");
    expect(saved.preparationCalls).toHaveLength(1);
    expect(saved.preparationCalls[0].status).toBe("failed");
    first.unmount();
    render(<SmartIntakeJourney live />);
    await screen.findByRole("heading", { name: "Konfirmasi dan bayar" });
    expect(requests).toHaveLength(1);
    // The failed reading waits for the owner's own Lanjut (J09): no replayed
    // provider call after the reload.
    await orderSettled();
    expect(requests).toHaveLength(1);
    // An explicit retry reads again under the same order; the browser's budget
    // history is no longer sent at all (the order's own limit decides).
    fireEvent.click(lanjut());
    await screen.findByRole("alert");
    expect(clientBodies.at(-1)).toEqual({ order_id: orderStub.id });
    expect(requests).toHaveLength(2);
    expect(
      clientRequests.filter((url) => url.startsWith("/api/audit/identity")),
    ).toHaveLength(1);
  });
});

describe("real extraction route and SDK controls", () => {
  it.each(["switch", "credentials", "input", "caller"])(
    "%s validation stops before the new read",
    async (kind) => {
      const value = input();
      if (kind === "switch") vi.stubEnv("NUAVE_NEW_AUDIT_ENABLED", "0");
      if (kind === "credentials") vi.stubEnv("OPENAI_API_KEY", "");
      if (kind === "input") value.website_url = "invalid";
      if (kind === "caller")
        mocks.context.mockReturnValue({
          env: {
            EXTRACT_CALLER_RATE_LIMITER: {
              limit: async () => ({ success: false }),
            },
          },
        });
      const response = await post(value);
      expect(response.ok).toBe(false);
      expect(pageReads).toBe(0);
      expect(requests).toHaveLength(0);
    },
  );
  it.each(["openai", "opencodego"])(
    "production alias %s sends only server-owned text before the original reservation",
    async (provider) => {
      vi.stubEnv("NUAVE_PROVIDER", provider);
      if (provider === "opencodego") {
        vi.stubEnv("OPENCODEGO_API_KEY", "fictional-opencode");
        vi.stubEnv("OPENAI_BASE_URL", "https://opencode.ai/zen/go/v1");
      }
      const result = await post({
        ...input(),
        public_source_data: {
          text: "injected",
          source_url: "https://unrelated.example/",
          retrieved_at: "fake",
        },
        source_excerpt_status: "included",
      });
      expect(result.status).toBe(200);
      expect((await result.json()).source_excerpt_status).toBe("included");
      const reservation = vi.mocked(reserveAuditCall).mock.calls[0][0];
      // The browser's budget is not trusted: the server starts from its own.
      expect(reservation.budget).toEqual(serverOwnedAuditBudget());
      const data = JSON.parse(requests[0].input[1].content).public_source_data;
      expect(data.text).toBe(excerpt);
      expect(data.source_url).toBe(source);
      expect(data.retrieved_at).not.toBe("fake");
      expect(pageReads).toBe(1);
      expect(iconReads).toBe(0);
      expect(requests).toHaveLength(1);
    },
  );
  it("removing only supplemental user data restores full protected request equivalence", async () => {
    // An order's reading is always an unverified identity (spec 016 R-01).
    await extractBusinessDraft({ ...input(), identity_unverified: true });
    const baseline = structuredClone(requests[0]);
    await post();
    const withSource = structuredClone(requests[1]);
    const payload = JSON.parse(withSource.input[1].content);
    delete payload.public_source_data;
    withSource.input[1].content = JSON.stringify(payload);
    // The safety identifier now comes from the order id (spec 016 R-04).
    delete baseline.safety_identifier;
    delete withSource.safety_identifier;
    expect(withSource).toEqual(baseline);
  });
  it("permitted technical retry reuses the same excerpt and running ledger without refetch", async () => {
    incomplete = true;
    const value = input();
    value.budget.calls = [];
    const result = await post(value);
    expect(result.status).toBe(200);
    expect(pageReads).toBe(1);
    expect(requests).toHaveLength(2);
    expect(JSON.parse(requests[1].input[1].content).public_source_data).toEqual(
      JSON.parse(requests[0].input[1].content).public_source_data,
    );
    expect(
      vi.mocked(reserveAuditCall).mock.calls[1][0].budget.calls,
    ).toHaveLength(1);
    expect((await result.json()).telemetry).toHaveLength(2);
  });
  it("client-reported prior extraction is ignored; only this request's own calls count", async () => {
    incomplete = true;
    const result = await post();
    const body = await result.json();
    expect(pageReads).toBe(1);
    expect(requests).toHaveLength(2);
    expect(body.telemetry).toHaveLength(2);
    expect(
      vi.mocked(reserveAuditCall).mock.calls[1][0].budget.calls,
    ).toHaveLength(1);
  });
  it.each(["stage", "budget"])(
    "client-reported exhausted %s spend is ignored and does not block dispatch",
    async (kind) => {
      const value = input();
      if (kind === "stage")
        value.budget.calls.push(fixtureCallTelemetry({ stage: "extract" }));
      else value.budget.carryover_cost_usd = 4.9;
      const result = await post(value);
      expect(result.ok).toBe(true);
      expect(requests).toHaveLength(1);
    },
  );
  it("a server-configured carryover floor still prevents provider dispatch", async () => {
    vi.stubEnv("OPENAI_AUDIT_CARRYOVER_COST_USD", "4.9");
    const result = await post(input());
    expect(result.ok).toBe(false);
    expect(requests).toHaveLength(0);
    expect(pageReads).toBe(1);
    expect(
      JSON.parse(
        (vi.mocked(reserveAuditCall).mock.calls[0][0].request as SDKRequest)
          .input[1].content,
      ).public_source_data.text,
    ).toBe(excerpt);
  });
  it("provider failure retains included-source outcome and failed-call telemetry, not a source error", async () => {
    providerError = true;
    const result = await post();
    const body = await result.json();
    expect(result.status).toBe(502);
    expect(body.source_excerpt_status).toBe("included");
    expect(body.telemetry).toHaveLength(1);
    expect(body.telemetry[0].status).toBe("failed");
    expect(body.error).not.toBe(SOURCE_EXCERPT_UNAVAILABLE_MESSAGE);
    expect(pageReads).toBe(1);
    expect(requests).toHaveLength(1);
  });
  it("synthetic preparation adds no fetch and cannot be forced to accept caller excerpt metadata", async () => {
    vi.stubEnv("NUAVE_AUDIT_MODE", "synthetic");
    const response = await post({
      ...input(),
      public_source_data: { text: "injected" },
      source_excerpt_status: "included",
    });
    const body = await response.json();
    expect(body.source_excerpt_status).toBe("not-attempted");
    expect(body.preparation_mode).toBe("synthetic-local");
    expect(pageReads).toBe(0);
    expect(requests).toHaveLength(0);
  });
  it("Instagram keeps existing URL-only extraction without an added page read", async () => {
    const response = await post({ ...input(), website_url: "@kedai_fiksi" });
    expect(response.status).toBe(200);
    expect((await response.json()).source_excerpt_status).toBe("not-attempted");
    expect(pageReads).toBe(0);
    expect(JSON.parse(requests[0].input[1].content)).not.toHaveProperty(
      "public_source_data",
    );
  });
  it.each(["context", "destination"])(
    "production missing %s fails closed before fetch/provider",
    async (missing) => {
      vi.stubEnv("NODE_ENV", "production");
      if (missing === "context")
        mocks.context.mockImplementation(() => {
          throw Error("No context");
        });
      else
        mocks.context.mockReturnValue({
          env: {
            EXTRACT_CALLER_RATE_LIMITER: {
              limit: async () => ({ success: true }),
            },
          },
        });
      const response = await post();
      expect(response.status).toBe(503);
      expect(pageReads).toBe(0);
      expect(requests).toHaveLength(0);
    },
  );
  it("destination limiting cannot fall back to URL-only extraction", async () => {
    destination.limit.mockResolvedValue({ success: false });
    const response = await post();
    expect(response.status).toBe(429);
    expect((await response.json()).source_excerpt_status).toBe("rate-limited");
    expect(pageReads).toBe(0);
    expect(requests).toHaveLength(0);
  });
  it("private DNS and sensitive source failures never reach the provider or expose source content", async () => {
    mocks.resolve4.mockResolvedValueOnce(["127.0.0.1"]);
    const unsafe = await post();
    expect(unsafe.status).toBe(400);
    expect((await unsafe.json()).error).toBe(
      SOURCE_EXCERPT_UNAVAILABLE_MESSAGE,
    );
    pageHtml = "<p>Rekam medis fiktif pasien.</p><p>Kopi susu</p>";
    const restricted = await post();
    const body = await restricted.json();
    expect(body.error).toBe(SOURCE_EXCERPT_RESTRICTED_MESSAGE);
    expect(body.source_excerpt_status).toBe("restricted");
    expect(JSON.stringify(body)).not.toContain("pasien");
    expect(requests).toHaveLength(0);
  });
});
