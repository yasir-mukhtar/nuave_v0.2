// @vitest-environment jsdom
// Real Smart UI -> real routes -> real safe fetch/selector/provider/SDK/parser.
// Only DNS, Worker bindings and HTTP transports are fictional; never use network.
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Buffer } from "node:buffer";
const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  resolve4: vi.fn(),
  resolve6: vi.fn(),
}));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.context,
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
import { reserveAuditCall } from "../audit/telemetry";
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
  vi.clearAllMocks();
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
  return extractPOST(
    new Request("https://nuave.test/api/audit/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    }),
  );
}
async function inspect() {
  await screen.findByRole("textbox", { name: "Nama bisnis" });
  fireEvent.change(screen.getByRole("textbox", { name: "Nama bisnis" }), {
    target: { value: "Kedai Pelangi Fiksi" },
  });
  fireEvent.change(
    screen.getByRole("textbox", { name: "URL website publik" }),
    { target: { value: source } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
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
      await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
      expect(
        JSON.parse(requests[0].input[1].content).public_source_data.text,
      ).toBe(text);
      const saved = parseSmartSession(
        window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
      );
      expect(saved?.prepared?.offerings).toEqual({
        proposed: [text],
        origin: "website",
      });
      expect(saved?.selection?.offerings).toEqual([text]);
      fireEvent.click(
        screen.getByRole("button", {
          name: "Sudah sesuai — buat pertanyaan audit",
        }),
      );
      await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
      const confirmed = parseSmartSession(
        window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
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
      window.sessionStorage.setItem(
        SMART_INTAKE_STORAGE_KEY,
        JSON.stringify(initial),
      );
      pageHtml = `<head><title>Kedai Pelangi Fiksi</title></head><p>${text}</p>`;
      const mounted = render(<SmartIntakeJourney live />);
      await inspect();
      expect((await screen.findByRole("alert")).textContent).toBe(expected);
      const saved = parseSmartSession(
        window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
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
      expect(clientRequests).toEqual(calls);
      expect(pageReads).toBe(reads);
      expect(requests).toHaveLength(0);
      expect(reserveAuditCall).not.toHaveBeenCalled();
      expect(
        parseSmartSession(
          window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
        )?.preparationCalls,
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
      const mounted = render(<SmartIntakeJourney live />);
      await screen.findByRole("textbox", { name: "Nama bisnis" });
      fireEvent.change(screen.getByRole("textbox", { name: "Nama bisnis" }), {
        target: { value: text },
      });
      expect((await screen.findByRole("alert")).textContent).toBe(expected);
      expect(clientRequests).toHaveLength(0);
      expect(
        window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "",
      ).not.toContain(text);
      parsedDraft = { ...draft(), verified_offerings: [text] };
      await inspect();
      expect((await screen.findByRole("alert")).textContent).toBe(expected);
      const rejected = parseSmartSession(
        window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
      );
      expect(rejected?.prepared).toBeNull();
      expect(rejected?.preparationCalls).toHaveLength(1);
      expect(JSON.stringify(rejected)).not.toContain(text);
      expect(clientRequests).toHaveLength(2);
      expect(requests).toHaveLength(1);
      mounted.unmount();
      // A separate safe preparation exercises the existing owner-edit guard.
      window.sessionStorage.clear();
      parsedDraft = draft();
      render(<SmartIntakeJourney live />);
      await inspect();
      await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
      const before = window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY);
      const calls = [...clientRequests];
      const row = within(
        screen.getByRole("region", { name: "Kategori dan penawaran utama" }),
      );
      fireEvent.click(row.getByRole("button", { name: "Ubah" }));
      fireEvent.change(row.getByRole("textbox", { name: "Kategori" }), {
        target: { value: text },
      });
      expect((await screen.findByRole("alert")).textContent).toBe(expected);
      expect(window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY)).toBe(
        before,
      );
      expect(clientRequests).toEqual(calls);
      expect(document.body.textContent).not.toContain(text);
      expect(document.body.textContent).not.toContain("hubungi Nuave");
    },
  );

  it("accepts an owner correction with the same safe-text rule and owner origin", async () => {
    render(<SmartIntakeJourney live />);
    await inspect();
    await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
    const text = "Keluarga kami membuka kedai di jantung kota.";
    const row = within(
      screen.getByRole("region", { name: "Kategori dan penawaran utama" }),
    );
    fireEvent.click(row.getByRole("button", { name: "Ubah" }));
    fireEvent.change(row.getByRole("textbox", { name: "Kategori" }), {
      target: { value: text },
    });
    expect(row.getByText("Dari Anda")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Sudah sesuai — buat pertanyaan audit",
      }),
    );
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
    expect(
      parseSmartSession(window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY))
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
      await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
      const saved = parseSmartSession(
        window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
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
      expect(
        within(
          screen.getByRole("region", { name: "Jangkauan pasar" }),
        ).getByText("Dari website Anda"),
      ).toBeTruthy();
      const confirm = screen.getByRole("button", {
        name: "Sudah sesuai — buat pertanyaan audit",
      });
      expect((confirm as HTMLButtonElement).disabled).toBe(!ready);
      if (reach === "seluruh" || reach === "luar")
        expect(
          screen.queryByRole("region", { name: "Area layanan" }),
        ).toBeNull();
      for (const area of areas)
        expect(
          screen
            .getByRole("checkbox", { name: area })
            .getAttribute("aria-checked"),
        ).toBe("true");
      fireEvent.click(screen.getByRole("button", { name: "Lihat sumber" }));
      expect(
        (
          await screen.findByRole("link", { name: source + "lokasi-resmi" })
        ).getAttribute("href"),
      ).toBe(source + "lokasi-resmi");
      mounted.unmount();
      render(<SmartIntakeJourney live />);
      await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
      expect(requests).toHaveLength(1);
      expect(pageReads).toBe(2); // Existing identity read plus one excerpt read.
      expect(clientRequests).toHaveLength(2);
      if (ready) {
        fireEvent.click(
          screen.getByRole("button", {
            name: "Sudah sesuai — buat pertanyaan audit",
          }),
        );
        await screen.findByRole("heading", {
          name: "Periksa pertanyaan audit",
        });
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
      } else {
        expect(
          (
            screen.getByRole("button", {
              name: "Sudah sesuai — buat pertanyaan audit",
            }) as HTMLButtonElement
          ).disabled,
        ).toBe(true);
      }
      expect(requests).toHaveLength(1);
      expect(pageReads).toBe(2);
    },
  );

  it("one Periksa preserves identity/icon behavior, adds one document, and prepares exact proposals without storing text", async () => {
    render(<SmartIntakeJourney live />);
    await inspect();
    await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
    expect(clientRequests).toHaveLength(2);
    expect(pageReads).toBe(2);
    expect(iconReads).toBe(1);
    expect(requests).toHaveLength(1);
    expect(screen.getByText("kedai kopi")).toBeTruthy();
    expect(screen.getByText("Kopi susu, Roti panggang")).toBeTruthy();
    expect(
      screen
        .getByRole("checkbox", { name: "Di lokasi bisnis Anda" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen
        .getByRole("checkbox", { name: "Dago, Bandung" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    const user = JSON.parse(requests[0].input[1].content);
    expect(user.public_source_data).toEqual({
      text: excerpt,
      source_url: source,
      retrieved_at: expect.any(String),
    });
    const stored = window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY)!;
    expect(stored).not.toContain("Penanda teks publik");
    expect(stored).not.toContain("public_source_data");
    expect(stored).not.toContain("<html>");
    expect(JSON.parse(stored).sourceExcerptStatus).toBe("included");
    const categoryRow = within(
      screen.getByRole("region", { name: "Kategori dan penawaran utama" }),
    );
    expect(categoryRow.getByText("Dari website Anda")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Lihat sumber" }));
    expect(
      (await screen.findByRole("link", { name: source })).getAttribute("href"),
    ).toBe(source);
    fireEvent.click(categoryRow.getByRole("button", { name: "Ubah" }));
    fireEvent.change(categoryRow.getByRole("textbox", { name: "Kategori" }), {
      target: { value: "kafe" },
    });
    expect(categoryRow.getByText("Dari Anda")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Sudah sesuai — buat pertanyaan audit",
      }),
    );
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
    const frozen = JSON.stringify(clientBodies.at(-1));
    expect(frozen).not.toContain("sourceExcerptStatus");
    expect(frozen).not.toContain("public_source_data");
    expect(frozen).not.toContain("Penanda teks publik");
    expect(frozen).toContain("website");
    expect(requests).toHaveLength(1);
  });
  it("sparse readable input leaves unknowns empty and does not retry or invent channels/reach", async () => {
    pageHtml =
      "<head><title>Kedai Pelangi Fiksi</title></head><p>Selamat datang.</p>";
    parsedDraft = draft(false);
    render(<SmartIntakeJourney live />);
    await inspect();
    await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
    const saved = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY)!,
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
      await inspect();
      await screen.findByText(SOURCE_EXCERPT_EMPTY_NOTICE);
      expect(JSON.parse(requests[0].input[1].content)).not.toHaveProperty(
        "public_source_data",
      );
      expect(screen.getByText("Kopi susu, Roti panggang")).toBeTruthy();
      fireEvent.click(
        screen.getByRole("button", { name: "Ubah nama atau website" }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
      await screen.findByText(SOURCE_EXCERPT_EMPTY_NOTICE);
      first.unmount();
      render(<SmartIntakeJourney live />);
      await screen.findByText(SOURCE_EXCERPT_EMPTY_NOTICE);
      expect(screen.getByRole("status").textContent).toBe(
        SOURCE_EXCERPT_EMPTY_NOTICE,
      );
      expect(
        JSON.parse(window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY)!)
          .sourceExcerptStatus,
      ).toBe("no-usable-text");
      expect(requests).toHaveLength(1);
      expect(pageReads).toBe(2);
      expect(clientRequests).toHaveLength(2);
    },
  );
  it("source failure persists safe identity/status, reload does no work and explicit retry reuses identity", async () => {
    failPage = 2;
    const first = render(<SmartIntakeJourney live />);
    await inspect();
    await screen.findByText(SOURCE_EXCERPT_UNAVAILABLE_MESSAGE);
    const saved = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY)!,
    );
    expect(saved.identity.canonicalUrl).toBe(source);
    expect(saved.sourceExcerptStatus).toBe("unavailable");
    expect(requests).toHaveLength(0);
    first.unmount();
    render(<SmartIntakeJourney live />);
    await screen.findByText(SOURCE_EXCERPT_UNAVAILABLE_MESSAGE);
    expect(pageReads).toBe(2);
    failPage = 0;
    fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
    await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
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
      await inspect();
      await screen.findByRole("alert");
      const expected = kind === "privacy" ? "restricted" : "rate-limited";
      const raw = window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY)!;
      const saved = JSON.parse(raw);
      expect(saved.sourceExcerptStatus).toBe(expected);
      expect(saved.identity.canonicalUrl).toBe(source);
      expect(raw).not.toContain("pasien");
      const reads = pageReads;
      const message = screen.getByRole("alert").textContent;
      first.unmount();
      render(<SmartIntakeJourney live />);
      expect((await screen.findByRole("alert")).textContent).toBe(message);
      expect(pageReads).toBe(reads);
      expect(requests).toHaveLength(0);
    },
  );
  it("a failed extraction restores its source outcome and ledger without replay or reset", async () => {
    providerError = true;
    const first = render(<SmartIntakeJourney live />);
    await inspect();
    await screen.findByRole("alert");
    const saved = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY)!,
    );
    expect(saved.sourceExcerptStatus).toBe("included");
    expect(saved.preparationCalls).toHaveLength(1);
    expect(saved.preparationCalls[0].status).toBe("failed");
    first.unmount();
    render(<SmartIntakeJourney live />);
    await screen.findByRole("textbox", { name: "Nama bisnis" });
    expect(requests).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
    await screen.findByRole("alert");
    expect(clientBodies.at(-1)!.budget).toMatchObject({
      calls: saved.preparationCalls,
    });
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
      expect(reservation.budget).toEqual(input().budget);
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
    await extractBusinessDraft(input());
    const baseline = structuredClone(requests[0]);
    await post();
    const withSource = structuredClone(requests[1]);
    const payload = JSON.parse(withSource.input[1].content);
    delete payload.public_source_data;
    withSource.input[1].content = JSON.stringify(payload);
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
  it("prior extraction blocks a subsequent technical retry and preserves its paid ledger", async () => {
    incomplete = true;
    const result = await post();
    const body = await result.json();
    expect(pageReads).toBe(1);
    expect(requests).toHaveLength(1);
    expect(body.telemetry).toHaveLength(1);
    expect(
      vi.mocked(reserveAuditCall).mock.calls[1][0].budget.calls,
    ).toHaveLength(2);
  });
  it.each(["stage", "budget", "floor"])(
    "an exhausted %s retains complete reservation input and prevents provider dispatch",
    async (kind) => {
      const value = input();
      if (kind === "stage")
        value.budget.calls.push(fixtureCallTelemetry({ stage: "extract" }));
      else if (kind === "budget") value.budget.carryover_cost_usd = 4.9;
      else vi.stubEnv("OPENAI_AUDIT_CARRYOVER_COST_USD", "4.9");
      const original = structuredClone(value);
      const result = await post(value);
      expect(result.ok).toBe(false);
      expect(requests).toHaveLength(0);
      expect(pageReads).toBe(1);
      expect(value).toEqual(original);
      expect(
        JSON.parse(
          (vi.mocked(reserveAuditCall).mock.calls[0][0].request as SDKRequest)
            .input[1].content,
        ).public_source_data.text,
      ).toBe(excerpt);
    },
  );
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
