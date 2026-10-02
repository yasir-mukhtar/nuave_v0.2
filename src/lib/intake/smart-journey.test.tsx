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
import historicalPair from "../../../tests/spec011-v1-records.json";
import { LOCAL_INTAKE_STORAGE_KEY } from "./local-session";
import { LOCAL_AUDIT_STORAGE_KEY } from "./local-audit-session";
import { SMART_INTAKE_STORAGE_KEY } from "./smart-intake-contract";
import SmartIntakeJourney from "./SmartIntakeJourney";
import { parseSmartSession } from "./smart-session";

beforeEach(() => {
  window.sessionStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const lanjut = () =>
  fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
const kembali = () =>
  fireEvent.click(screen.getByRole("button", { name: "Kembali" }));

// J5: the detail chain between the target screens and the summary. A cabang
// focus skips the market screen.
async function fromOfferings(focus: "brand" | "cabang" | "produk" = "brand") {
  await screen.findByRole("heading", {
    name: /^(Apakah ini|Apa saja) yang Anda tawarkan\?$/,
  });
  lanjut();
  await screen.findByRole("heading", {
    name: "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
  });
  lanjut();
  if (focus !== "cabang") {
    await screen.findByRole("heading", {
      name: "Di mana pelanggan Anda berada?",
    });
    lanjut();
  }
  await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
}

async function throughDetails(focus: "brand" | "cabang" | "produk" = "brand") {
  await screen.findByRole("heading", { name: /biasanya disebut apa\?/ });
  lanjut();
  await fromOfferings(focus);
}

async function throughBrand() {
  await screen.findByRole("heading", {
    name: "Ini brand yang ingin Anda audit?",
  });
  lanjut();
  await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
  lanjut();
  await throughDetails();
}

const draft = {
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
  verified_offerings: ["kopi susu", "roti"],
  verified_customer_needs: ["minuman dekat kantor"],
  verified_decision_criteria: ["lokasi"],
  similar_businesses: [],
  brand_name_variants: [],
  priority_offering: "",
  conversion_action: "",
  customer_supplied_facts: [],
  known_accuracy_questions: [],
  usp: "",
  regulated_category_notes: "",
  evidence: [],
  warnings: [],
};

describe("smart blank intake", () => {
  it("uses one explicit inspection and one confirmation to reach ten questions with exact v2 context", async () => {
    const requests: { url: string; body: Record<string, unknown> | null }[] =
      [];
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        requests.push({
          url,
          body: init?.body
            ? (JSON.parse(String(init.body)) as Record<string, unknown>)
            : null,
        });
        if (url.startsWith("/api/audit/identity"))
          return Response.json({
            canonical_url: "https://kedai-fiksi.example/",
            display_name: "Kedai Fiksi",
            preparation_mode: "synthetic-local",
          });
        if (url === "/api/audit/extract")
          return Response.json({
            draft,
            telemetry: [],
            preparation_mode: "synthetic-local",
          });
        if (url === "/api/audit/glm-questions")
          return Response.json({
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
          });
        throw new Error(`Unexpected request ${url}`);
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<SmartIntakeJourney live={false} />);
    await screen.findByRole("textbox", { name: "Nama bisnis" });
    fireEvent.change(screen.getByRole("textbox", { name: "Nama bisnis" }), {
      target: { value: "Kedai Fiksi" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "URL website publik" }),
      { target: { value: "https://kedai-fiksi.example/" } },
    );
    const inspect = screen.getByRole("button", { name: "Periksa" });
    fireEvent.click(inspect);
    fireEvent.click(inspect);
    await throughBrand();
    expect(requests.map((item) => item.url)).toEqual([
      "/api/audit/identity?source=https%3A%2F%2Fkedai-fiksi.example%2F",
      "/api/audit/extract",
    ]);
    expect(
      screen.getByRole("region", { name: "Fokus audit" }).textContent,
    ).toContain("Brand secara keseluruhan");
    expect(
      screen.getByRole("region", { name: "Fokus audit" }).textContent,
    ).toContain("Saran Nuave");
    const confirm = screen.getByRole("button", {
      name: "Sudah sesuai — buat pertanyaan audit",
    });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(
      await screen.findByRole("heading", { name: "Periksa pertanyaan audit" }),
    ).toBeTruthy();
    expect(requests).toHaveLength(3);
    const sent = requests[2]!.body!;
    expect(sent).not.toHaveProperty("brief");
    expect(sent.intake).toMatchObject({
      version: "nuave-local-intake-input-v2",
      context: {
        category: { value: "kedai kopi", origin: "website" },
        market: {
          value: { reach: "sekitar", areas: ["Bandung"] },
          origin: "website",
        },
        comparators: { value: { mode: "unknown" } },
      },
    });
    expect(
      screen.getAllByRole("button", { name: /Ubah pertanyaan/ }),
    ).toHaveLength(10);
    expect(
      JSON.parse(
        window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
      ),
    ).toMatchObject({ version: 6, stage: "questions" });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });

  it("holds a literal started v1 pair without changing its bytes or calling a provider", async () => {
    window.sessionStorage.setItem(
      LOCAL_INTAKE_STORAGE_KEY,
      historicalPair.intake,
    );
    window.sessionStorage.setItem(
      LOCAL_AUDIT_STORAGE_KEY,
      historicalPair.audit,
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<SmartIntakeJourney live={false} />);
    expect(
      await screen.findByRole("heading", {
        name: "Audit lama tersimpan di sesi ini",
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /Unduh|Lanjutkan audit|Coba lagi/ }),
    ).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(LOCAL_INTAKE_STORAGE_KEY)).toBe(
      historicalPair.intake,
    );
    expect(window.sessionStorage.getItem(LOCAL_AUDIT_STORAGE_KEY)).toBe(
      historicalPair.audit,
    );
    fireEvent.click(screen.getByRole("button", { name: "Mulai audit baru" }));
    await screen.findByRole("textbox", { name: "Nama bisnis" });
    expect(window.sessionStorage.getItem(LOCAL_AUDIT_STORAGE_KEY)).toBe(
      historicalPair.audit,
    );
  });
});

const questionsResponse = () =>
  Response.json({
    status: "ok",
    questions: Array.from(
      { length: 10 },
      (_, index) => `Pertanyaan fiksi nomor ${index + 1}?`,
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
  });

function stubPreparation(
  options: {
    holdExtract?: Promise<void>;
    draft?: Record<string, unknown>;
  } = {},
) {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url.startsWith("/api/audit/identity") ? "identity" : url);
    if (url.startsWith("/api/audit/identity"))
      return Response.json({
        canonical_url: "https://kedai-fiksi.example/",
        display_name: "Kedai Fiksi",
        preparation_mode: "synthetic-local",
      });
    if (url === "/api/audit/extract") {
      if (options.holdExtract) await options.holdExtract;
      return Response.json({
        draft: options.draft ?? draft,
        telemetry: [],
        preparation_mode: "synthetic-local",
      });
    }
    if (url === "/api/audit/glm-questions") return questionsResponse();
    throw new Error(`Unexpected request ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

async function fillAndPeriksa() {
  await screen.findByRole("textbox", { name: "Nama bisnis" });
  fireEvent.change(screen.getByRole("textbox", { name: "Nama bisnis" }), {
    target: { value: "Kedai Fiksi" },
  });
  fireEvent.change(
    screen.getByRole("textbox", { name: "URL website publik" }),
    {
      target: { value: "https://kedai-fiksi.example/" },
    },
  );
  fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
}

describe("Spec 013 J2 screen frame", () => {
  it("focuses the entry heading on arrival and keeps entry free of flow chrome", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    const heading = await screen.findByRole("heading", {
      name: "Periksa visibilitas bisnis Anda",
    });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    // Screens 1–2 carry no chapter progress and no Kembali/Lanjut nav.
    expect(screen.queryByRole("img", { name: /Bab / })).toBeNull();
    expect(screen.queryByRole("button", { name: "Kembali" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Lanjut" })).toBeNull();
  });

  it("shows the labelled reading screen while preparation is in flight, then the brand check", async () => {
    let release!: () => void;
    const holdExtract = new Promise<void>((resolve) => (release = resolve));
    stubPreparation({ holdExtract });
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    const reading = await screen.findByRole("region", {
      name: "Pembacaan sumber",
    });
    expect(reading.getAttribute("data-intake-screen")).toBe("reading");
    expect(
      screen.getByRole("heading", { name: "Sebentar, Nuave sedang membaca" }),
    ).toBeTruthy();
    expect(screen.getByText("Membaca sumber Anda")).toBeTruthy();
    expect(screen.getByText("Menemukan produk dan lokasi")).toBeTruthy();
    expect(
      screen.getByText("Memperkirakan pelanggan dan pembanding"),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Mode uji lokal menggunakan pengganti sintetis berlabel.",
      ),
    ).toBeTruthy();
    // No navigation or submit affordance while the read is in flight.
    expect(screen.queryByRole("button")).toBeNull();
    release();
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
  });

  it("brand check shows typed name and website, corrects inline, and keeps sensitive text out", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    const card = await screen.findByRole("article", {
      name: "Brand yang ditemukan",
    });
    expect(card.textContent).toContain("Kedai Fiksi");
    expect(card.textContent).toContain("https://kedai-fiksi.example/");
    // Chapter progress marks bab 1 of 4 on the brand check.
    expect(screen.getByRole("img", { name: "Bab 1 dari 4" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ubah nama" }));
    const field = screen.getByRole("textbox", { name: "Nama brand" });
    fireEvent.change(field, { target: { value: "Kedai Fiksi Baru" } });
    expect(card.textContent).toContain("Kedai Fiksi Baru");
    fireEvent.change(field, { target: { value: "nomor rekening 12345" } });
    expect((await screen.findByRole("alert")).textContent).toContain(
      "informasi sensitif",
    );
    expect(card.textContent).toContain("Kedai Fiksi Baru");
    expect(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "",
    ).not.toContain("nomor rekening");
  });

  it("Kembali on the brand check returns to a filled entry; the same source adds no call", async () => {
    const { calls } = stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    fireEvent.click(screen.getByRole("button", { name: "Kembali" }));
    const name = await screen.findByRole("textbox", { name: "Nama bisnis" });
    expect((name as HTMLInputElement).value).toBe("Kedai Fiksi");
    expect(
      (
        screen.getByRole("textbox", {
          name: "URL website publik",
        }) as HTMLInputElement
      ).value,
    ).toBe("https://kedai-fiksi.example/");
    fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    expect(calls).toEqual(["identity", "/api/audit/extract"]);
  });

  it("a marked browser Back walks the flow one screen at a time and ignores foreign entries", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    // summary → market → service → offerings → category → focus → brand →
    // entry via marked pops; foreign states do nothing.
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Di mana pelanggan Anda berada?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Apakah ini yang Anda tawarkan?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    fireEvent.popState(window, { state: { nuaveIntake: true } });
    await screen.findByRole("textbox", { name: "Nama bisnis" });
    fireEvent.popState(window, { state: { otherNavigation: true } });
    await screen.findByRole("textbox", { name: "Nama bisnis" });
  });

  it("a reload during reading restores a filled entry with the interruption note and no replay", async () => {
    let release!: () => void;
    const holdExtract = new Promise<void>((resolve) => (release = resolve));
    const { fetchMock } = stubPreparation({ holdExtract });
    const first = render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await waitFor(() =>
      expect(
        JSON.parse(
          window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
        ).stage,
      ).toBe("reading"),
    );
    const callsSoFar = fetchMock.mock.calls.length;
    first.unmount();
    render(<SmartIntakeJourney live={false} />);
    const name = await screen.findByRole("textbox", { name: "Nama bisnis" });
    expect((name as HTMLInputElement).value).toBe("Kedai Fiksi");
    expect(
      (
        screen.getByRole("textbox", {
          name: "URL website publik",
        }) as HTMLInputElement
      ).value,
    ).toBe("https://kedai-fiksi.example/");
    expect(
      screen.getByText(
        "Pembacaan sumber sebelumnya terputus. Isian Anda tetap tersimpan — tekan Periksa untuk membaca ulang.",
      ),
    ).toBeTruthy();
    // The interrupted read is never replayed on its own.
    expect(fetchMock).toHaveBeenCalledTimes(callsSoFar);
    release();
  });

  it("a stored pre-bump session restarts safely at an empty entry", async () => {
    window.sessionStorage.setItem(
      "nuave.localIntake.v3",
      JSON.stringify({
        version: 3,
        stage: "summary",
        entry: { name: "Kedai Lama", source: "https://lama.example/" },
        identity: null,
        prepared: {},
        selection: {},
        confirmedSelection: null,
        frozen: null,
        pack: null,
        preparationCalls: [],
        preparationMode: null,
        generationAttempts: [],
      }),
    );
    // A stale version under the current key is rejected the same way.
    window.sessionStorage.setItem(
      SMART_INTAKE_STORAGE_KEY,
      JSON.stringify({ version: 5, stage: "entry" }),
    );
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    const name = await screen.findByRole("textbox", { name: "Nama bisnis" });
    expect((name as HTMLInputElement).value).toBe("");
    expect(
      parseSmartSession(
        window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
      ),
    ).toBeNull();
  });

  it("a corrupt stored selection at a later stage restarts at entry instead of crashing", async () => {
    window.sessionStorage.setItem(
      SMART_INTAKE_STORAGE_KEY,
      JSON.stringify({
        version: 6,
        stage: "brand",
        entry: { name: "Kedai Lama", source: "https://lama.example/" },
        identity: null,
        prepared: {},
        selection: {},
        confirmedSelection: null,
        frozen: null,
        pack: null,
        preparationCalls: [],
        preparationMode: null,
        generationAttempts: [],
      }),
    );
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await screen.findByRole("textbox", { name: "Nama bisnis" });
    expect(
      parseSmartSession(
        window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
      ),
    ).toBeNull();
  });

  it("a name-only edit at entry keeps later answers and spends no call", async () => {
    const { calls } = stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    // The summary's category row opens the dedicated screen; a typed
    // category is the owner's own answer.
    fireEvent.click(
      within(screen.getByRole("region", { name: "Kategori" })).getByRole(
        "button",
        { name: "Ubah" },
      ),
    );
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Tulis kategori sendiri" }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Kategori" }), {
      target: { value: "kafe fiksi" },
    });
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
    fireEvent.click(
      screen.getByRole("button", { name: "Ubah nama atau website" }),
    );
    await screen.findByRole("textbox", { name: "Nama bisnis" });
    fireEvent.change(screen.getByRole("textbox", { name: "Nama bisnis" }), {
      target: { value: "Kedai Fiksi Baru" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    expect(calls).toEqual(["identity", "/api/audit/extract"]);
    lanjut();
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    lanjut();
    await throughDetails();
    expect(
      screen.getByRole("region", { name: "Kategori" }).textContent,
    ).toContain("kafe fiksi");
  });

  it("re-offers the website's discovered name when a name-only edit makes it differ", async () => {
    const { calls } = stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    const group = () => screen.getByRole("radiogroup", { name: "Nama bisnis" });
    // Typed name equals the discovered name: only the owner option shows.
    expect(within(group()).getAllByRole("radio")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Kembali" }));
    fireEvent.change(
      await screen.findByRole("textbox", { name: "Nama bisnis" }),
      { target: { value: "Kedai Fiksi Baru" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    const options = within(group())
      .getAllByRole("radio")
      .map((radio) => radio.closest("label")!.textContent);
    expect(options).toHaveLength(2);
    expect(options[0]).toContain("Kedai Fiksi Baru");
    expect(options[0]).toContain("Dari Anda");
    expect(options[1]).toContain("Kedai Fiksi");
    expect(options[1]).toContain("Dari website Anda");
    // The name-only path still spends no new preparation call.
    expect(calls).toEqual(["identity", "/api/audit/extract"]);
  });

  it("merges the website option when a name-only edit lands on the discovered name", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await screen.findByRole("textbox", { name: "Nama bisnis" });
    fireEvent.change(screen.getByRole("textbox", { name: "Nama bisnis" }), {
      target: { value: "Kopi X" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "URL website publik" }),
      { target: { value: "https://kedai-fiksi.example/" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    const group = () => screen.getByRole("radiogroup", { name: "Nama bisnis" });
    expect(within(group()).getAllByRole("radio")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Kembali" }));
    fireEvent.change(
      await screen.findByRole("textbox", { name: "Nama bisnis" }),
      { target: { value: "Kedai Fiksi" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Periksa" }));
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    expect(within(group()).getAllByRole("radio")).toHaveLength(1);
    // The summary must not show a duplicated name either.
    lanjut();
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    lanjut();
    await throughDetails();
    const business = within(screen.getByRole("region", { name: "Bisnis" }));
    expect(business.getAllByRole("radio")).toHaveLength(1);
  });

  it("moves focus to the question-review heading when the pack lands", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await throughBrand();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Sudah sesuai — buat pertanyaan audit",
      }),
    );
    const heading = await screen.findByRole("heading", {
      name: "Periksa pertanyaan audit",
    });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });
});

const j4Draft = {
  ...draft,
  published_locations: [
    {
      name: "Kedai Fiksi Dago",
      address: "Jl. Fiksi Raya No. 10, Bandung",
      source_url: "https://kedai-fiksi.example/lokasi",
    },
    {
      name: "Kedai Fiksi Cimahi",
      address: "Jl. Contoh Fiksi No. 2, Cimahi",
      source_url: "https://www.kedai-fiksi.example/lokasi",
    },
  ],
};

async function toFocusScreen() {
  await fillAndPeriksa();
  await screen.findByRole("heading", {
    name: "Ini brand yang ingin Anda audit?",
  });
  fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
  await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
}

const focusRow = () =>
  within(screen.getByRole("region", { name: "Fokus audit" }));

// Types one character at a time — bulk fireEvent.change skips the
// intermediate values a real keystroke sequence passes through.
const typeChars = (input: HTMLInputElement, text: string) => {
  for (const ch of text) {
    fireEvent.change(input, { target: { value: input.value + ch } });
  }
};

describe("Spec 013 J4 focus and target screens", () => {
  it("offers the three focus cards with the Nuave label on whole brand, then lands on the summary", async () => {
    const { calls } = stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    const whole = screen.getByRole("radio", {
      name: /Brand secara keseluruhan/,
    });
    expect(whole.getAttribute("aria-checked")).toBe("true");
    expect(whole.textContent).toContain("Saran Nuave");
    expect(
      screen
        .getByRole("radio", { name: /Satu lokasi/ })
        .getAttribute("aria-checked"),
    ).toBe("false");
    expect(
      screen.getByRole("radio", { name: /Satu produk atau layanan/ }),
    ).toBeTruthy();
    // Chapter progress marks bab 2 of 4 on the focus screen.
    expect(screen.getByRole("img", { name: "Bab 2 dari 4" })).toBeTruthy();
    lanjut();
    await throughDetails();
    expect(focusRow().getByText("Brand secara keseluruhan")).toBeTruthy();
    // Screen navigation spends no extra preparation call.
    expect(calls).toEqual(["identity", "/api/audit/extract"]);
  });

  it("the location screen lists host-screened published rows and blocks Lanjut until complete", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(screen.getByRole("radio", { name: /Satu lokasi/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    const dago = screen.getByRole("radio", { name: /Kedai Fiksi Dago/ });
    const cimahi = screen.getByRole("radio", { name: /Kedai Fiksi Cimahi/ });
    expect(dago.textContent).toContain("Jl. Fiksi Raya No. 10, Bandung");
    expect(dago.textContent).toContain("Dari website Anda");
    // A www.-equivalent page still counts as published by the business.
    expect(cimahi.textContent).toContain("Dari website Anda");
    fireEvent.click(cimahi);
    expect(cimahi.getAttribute("aria-checked")).toBe("true");
    lanjut();
    await throughDetails("cabang");
    expect(focusRow().getByText("Satu lokasi")).toBeTruthy();
    expect(focusRow().getByText(/Kedai Fiksi Cimahi/)).toBeTruthy();
    const saved = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(saved.selection).toMatchObject({
      focus: "cabang",
      locationName: "Kedai Fiksi Cimahi",
      locationAddress: "Jl. Contoh Fiksi No. 2, Cimahi",
    });
    expect(saved.selection.origins.focus).toBe("owner");
  });

  it("blocks Lanjut on a manual location until name and address are both filled", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(screen.getByRole("radio", { name: /Satu lokasi/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    fireEvent.click(screen.getByRole("button", { name: "Tambah lokasi lain" }));
    const lanjut = screen.getByRole("button", { name: "Lanjut" });
    expect(lanjut).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByRole("textbox", { name: "Nama lokasi" }), {
      target: { value: "Gerai Fiksi" },
    });
    expect(lanjut).toHaveProperty("disabled", true);
    fireEvent.change(
      screen.getByRole("textbox", { name: "Alamat atau area" }),
      {
        target: { value: "Jl. Fiksi 40, Bandung" },
      },
    );
    expect(lanjut).toHaveProperty("disabled", false);
    // The completed manual entry shows as its own owner-labelled choice.
    const manual = screen.getByRole("radio", { name: /Gerai Fiksi/ });
    expect(manual.getAttribute("aria-checked")).toBe("true");
    expect(manual.textContent).toContain("Dari Anda");
  });

  it("the product screen lists offerings and accepts a typed target", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(
      screen.getByRole("radio", { name: /Satu produk atau layanan/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    await screen.findByRole("heading", {
      name: "Produk atau layanan mana?",
    });
    const lanjut = screen.getByRole("button", { name: "Lanjut" });
    expect(lanjut).toHaveProperty("disabled", true);
    const roti = screen.getByRole("radio", { name: /roti/ });
    expect(roti.textContent).toContain("Dari website Anda");
    fireEvent.click(roti);
    expect(roti.getAttribute("aria-checked")).toBe("true");
    // A typed replacement becomes the owner's answer.
    fireEvent.click(
      screen.getByRole("button", { name: "Tambah produk atau layanan lain" }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Nama produk atau layanan" }),
      { target: { value: "paket rapat" } },
    );
    const manual = screen.getByRole("radio", { name: /paket rapat/ });
    expect(manual.getAttribute("aria-checked")).toBe("true");
    expect(manual.textContent).toContain("Dari Anda");
    expect(roti.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(lanjut);
    await throughDetails("produk");
    expect(focusRow().getByText(/paket rapat/)).toBeTruthy();
  });

  it("offers the manual location link when no usable published location exists", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    expect(screen.queryByRole("radio", { name: /Satu lokasi/ })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Isi lokasi secara manual" }),
    );
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    // With no published list the manual form is shown directly.
    expect(screen.getByRole("textbox", { name: "Nama lokasi" })).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "Nama lokasi" }), {
      target: { value: "Gerai Satu" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Alamat atau area" }),
      {
        target: { value: "Jl. Fiksi 1" },
      },
    );
    lanjut();
    await throughDetails("cabang");
    expect(focusRow().getByText(/Gerai Satu/)).toBeTruthy();
  });

  it("keeps a summary-opened focus edit returning to the summary", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await throughDetails();
    fireEvent.click(focusRow().getByRole("button", { name: "Ubah" }));
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    // In-flow Kembali returns to the summary this edit came from.
    kembali();
    await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
  });

  it("walks back through the target screens one stage at a time", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(screen.getByRole("radio", { name: /Satu lokasi/ }));
    lanjut();
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    // location → focus → brand via in-flow Kembali.
    kembali();
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    expect(
      screen
        .getByRole("radio", { name: /Satu lokasi/ })
        .getAttribute("aria-checked"),
    ).toBe("true");
    kembali();
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    // And the summary steps back to the last screen its focus shows — the
    // service screen for a location focus, which skips the market.
    lanjut();
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    lanjut();
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    fireEvent.click(screen.getByRole("radio", { name: /Kedai Fiksi Dago/ }));
    lanjut();
    await throughDetails("cabang");
    kembali();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
    });
  });

  it("restores the location stage and its answers after a reload", async () => {
    stubPreparation({ draft: j4Draft });
    const first = render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(screen.getByRole("radio", { name: /Satu lokasi/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    fireEvent.click(screen.getByRole("button", { name: "Tambah lokasi lain" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Nama lokasi" }), {
      target: { value: "Gerai Reload" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Alamat atau area" }),
      {
        target: { value: "Jl. Muat Ulang 7" },
      },
    );
    first.unmount();
    render(<SmartIntakeJourney live={false} />);
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    expect(
      (screen.getByRole("textbox", { name: "Nama lokasi" }) as HTMLInputElement)
        .value,
    ).toBe("Gerai Reload");
    expect(
      (
        screen.getByRole("textbox", {
          name: "Alamat atau area",
        }) as HTMLInputElement
      ).value,
    ).toBe("Jl. Muat Ulang 7");
  });

  it("clears an incompatible target when the focus changes (R-05)", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(screen.getByRole("radio", { name: /Satu lokasi/ }));
    lanjut();
    fireEvent.click(screen.getByRole("radio", { name: /Kedai Fiksi Dago/ }));
    lanjut();
    await throughDetails("cabang");
    // Re-open focus from the summary and switch to product: the location
    // target no longer applies.
    fireEvent.click(focusRow().getByRole("button", { name: "Ubah" }));
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    fireEvent.click(
      screen.getByRole("radio", { name: /Satu produk atau layanan/ }),
    );
    lanjut();
    await screen.findByRole("heading", {
      name: "Produk atau layanan mana?",
    });
    const saved = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(saved.selection.locationName).toBe("");
    expect(saved.selection.locationAddress).toBe("");
    expect(saved.selection.productTarget).toBe("");
  });

  it("keeps sensitive manual target text out of the selection", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(
      screen.getByRole("radio", { name: /Satu produk atau layanan/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    await screen.findByRole("heading", {
      name: "Produk atau layanan mana?",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Tambah produk atau layanan lain" }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Nama produk atau layanan" }),
      { target: { value: "paket rapat" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Nama produk atau layanan" }),
      { target: { value: "nomor rekening 12345" } },
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "informasi sensitif",
    );
    expect(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "",
    ).not.toContain("nomor rekening");
  });

  it("a summary-opened focus screen exits back only with a complete target (B1)", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await throughDetails();
    // Switch to a product focus, then Kembali must not reach the summary —
    // it would read back a focus with no target and no field to fill one.
    fireEvent.click(focusRow().getByRole("button", { name: "Ubah" }));
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    fireEvent.click(
      screen.getByRole("radio", { name: /Satu produk atau layanan/ }),
    );
    kembali();
    await screen.findByRole("heading", { name: "Produk atau layanan mana?" });
    // Completing the detour's target walks the remaining chain — the
    // category checkpoint, the read-only catalogue, service, market — and
    // lands back on the summary.
    fireEvent.click(
      screen.getByRole("button", { name: "Tambah produk atau layanan lain" }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Nama produk atau layanan" }),
      { target: { value: "paket rapat" } },
    );
    lanjut();
    await throughDetails("produk");
    expect(focusRow().getByText(/paket rapat/)).toBeTruthy();
  });

  it("a summary-opened focus screen detours Kembali through an unready location target (B1)", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await throughDetails();
    fireEvent.click(focusRow().getByRole("button", { name: "Ubah" }));
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    fireEvent.click(screen.getByRole("radio", { name: /Satu lokasi/ }));
    kembali();
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    // The detour consumes the return marker: backing out of the target
    // screen resumes the ordinary focus → brand → entry chain.
    kembali();
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    kembali();
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
  });

  it("keeps the Satu lokasi card visible while cabang is the stored answer (B2)", async () => {
    stubPreparation();
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    expect(screen.queryByRole("radio", { name: /Satu lokasi/ })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Isi lokasi secara manual" }),
    );
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Nama lokasi" }), {
      target: { value: "Gerai Satu" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Alamat atau area" }),
      { target: { value: "Jl. Fiksi 1" } },
    );
    // Back to the focus screen: the stored cabang answer stays a visible,
    // checked card even though no published locations exist (R-02).
    fireEvent.click(screen.getByRole("button", { name: "Kembali" }));
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    const card = screen.getByRole("radio", { name: /Satu lokasi/ });
    expect(card.getAttribute("aria-checked")).toBe("true");
  });

  it("the manual location form starts empty over a published pick (M1)", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(screen.getByRole("radio", { name: /Satu lokasi/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    fireEvent.click(screen.getByRole("radio", { name: /Kedai Fiksi Dago/ }));
    fireEvent.click(screen.getByRole("button", { name: "Tambah lokasi lain" }));
    const name = screen.getByRole("textbox", {
      name: "Nama lokasi",
    }) as HTMLInputElement;
    const address = screen.getByRole("textbox", {
      name: "Alamat atau area",
    }) as HTMLInputElement;
    // A picked published row is not a draft — the form opens empty instead
    // of pre-filling the published values the owner is about to overwrite.
    expect(name.value).toBe("");
    expect(address.value).toBe("");
    fireEvent.change(name, { target: { value: "Gerai Baru" } });
    expect(name.value).toBe("Gerai Baru");
    expect(address.value).toBe("");
    const saved = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(saved.selection.locationName).toBe("Gerai Baru");
    expect(saved.selection.locationAddress).toBe("");
  });

  it("keeps typed text whole across a transient match with a published offering (P2)", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(
      screen.getByRole("radio", { name: /Satu produk atau layanan/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    await screen.findByRole("heading", { name: "Produk atau layanan mana?" });
    fireEvent.click(
      screen.getByRole("button", { name: "Tambah produk atau layanan lain" }),
    );
    const input = screen.getByRole("textbox", {
      name: "Nama produk atau layanan",
    }) as HTMLInputElement;
    // "kopi susu" is a published offering — the draft must not blank when
    // the owner types through it on the way to a longer name.
    typeChars(input, "kopi susu premium");
    expect(input.value).toBe("kopi susu premium");
    const manual = screen.getByRole("radio", { name: /kopi susu premium/ });
    expect(manual.getAttribute("aria-checked")).toBe("true");
    expect(manual.textContent).toContain("Dari Anda");
  });

  it("keeps the location name across a transient match with a published row (P2)", async () => {
    stubPreparation({ draft: j4Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(screen.getByRole("radio", { name: /Satu lokasi/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    fireEvent.click(screen.getByRole("button", { name: "Tambah lokasi lain" }));
    const name = screen.getByRole("textbox", {
      name: "Nama lokasi",
    }) as HTMLInputElement;
    const address = screen.getByRole("textbox", {
      name: "Alamat atau area",
    }) as HTMLInputElement;
    typeChars(name, "Kedai Fiksi Dago");
    // Mid-typing the pair equals the published row at
    // "Jl. Fiksi Raya No. 10, Bandung" — the name must survive the match.
    typeChars(address, "Jl. Fiksi Raya No. 10, Bandung Wetan");
    expect(name.value).toBe("Kedai Fiksi Dago");
    expect(address.value).toBe("Jl. Fiksi Raya No. 10, Bandung Wetan");
    const saved = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(saved.selection.locationName).toBe("Kedai Fiksi Dago");
    expect(saved.selection.locationAddress).toBe(
      "Jl. Fiksi Raya No. 10, Bandung Wetan",
    );
  });
});

const j5Draft = {
  ...j4Draft,
  category_suggestions: ["kedai kopi", "kafe"],
  offering_category_suggestions: [
    { offering: "kopi susu", category: "minuman kopi siap tutup" },
  ],
};

describe("Spec 013 J5 business-detail screens", () => {
  it.each(["", "   "])(
    "preselects a Nuave suggestion when the main category is %j",
    async (category) => {
      stubPreparation({ draft: { ...j5Draft, category } });
      render(<SmartIntakeJourney live={false} />);
      await toFocusScreen();
      lanjut();
      await screen.findByRole("heading", {
        name: "Bisnis Anda biasanya disebut apa?",
      });
      const suggestion = screen.getByRole("radio", { name: /kedai kopi/ });
      expect(suggestion.getAttribute("aria-checked")).toBe("true");
      expect(suggestion.textContent).toContain("Saran Nuave");
      const session = parseSmartSession(
        window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY),
      );
      expect(session?.selection).toMatchObject({
        category: "kedai kopi",
        categoryKind: "suggestion",
        origins: { category: "nuave" },
      });
      lanjut();
      await fromOfferings();
      expect(
        screen.getByRole("region", { name: "Kategori" }).textContent,
      ).toContain("Saran Nuave");
    },
  );

  it.each([
    [
      "produk",
      /Satu produk atau layanan/,
      "Produk atau layanan mana?",
      /kopi susu/,
      /roti/,
    ],
    [
      "cabang",
      /Satu lokasi/,
      "Cabang mana yang ingin diaudit?",
      /Kedai Fiksi Dago/,
      /Kedai Fiksi Cimahi/,
    ],
  ] as const)(
    "keeps an existing %s target editable from the summary",
    async (focus, scope, heading, first, replacement) => {
      stubPreparation({ draft: j5Draft });
      render(<SmartIntakeJourney live={false} />);
      await toFocusScreen();
      fireEvent.click(screen.getByRole("radio", { name: scope }));
      lanjut();
      await screen.findByRole("heading", { name: heading });
      fireEvent.click(screen.getByRole("radio", { name: first }));
      lanjut();
      await throughDetails(focus);
      fireEvent.click(focusRow().getByRole("button", { name: "Ubah" }));
      await screen.findByRole("heading", {
        name: "Apa yang ingin Anda audit?",
      });
      lanjut();
      await screen.findByRole("heading", { name: heading });
      fireEvent.click(screen.getByRole("radio", { name: replacement }));
      lanjut();
      await screen.findByRole("heading", { name: /biasanya disebut apa\?/ });
      lanjut();
      await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
      expect(focusRow().getByText(replacement)).toBeTruthy();
    },
  );

  it("keeps the selected category's source through overlapping suggestions and owner edits", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    const group = screen.getByRole("radiogroup", { name: "Pilihan kategori" });
    expect(
      within(group).getByRole("radio", { name: /kedai kopi/ }).textContent,
    ).toContain("Dari website Anda");
    const kafe = within(group).getByRole("radio", { name: /kafe/ });
    expect(kafe.textContent).toContain("Saran Nuave");
    fireEvent.click(kafe);
    expect(kafe.textContent).toContain("Dari Anda");
    fireEvent.click(
      screen.getByRole("button", { name: "Tulis kategori sendiri" }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Kategori" }), {
      target: { value: "kedai kopi" },
    });
    expect(
      within(group).getByRole("radio", { name: /kedai kopi/ }).textContent,
    ).toContain("Dari Anda");
    lanjut();
    await fromOfferings();
    expect(
      screen.getByRole("region", { name: "Kategori" }).textContent,
    ).toContain("Dari Anda");
  });

  it("does not spend an area slot when an already-selected area is added again", async () => {
    const areas = [
      "Bandung",
      "Jakarta",
      "Bogor",
      "Depok",
      "Bekasi",
      "Surabaya",
      "Medan",
    ];
    stubPreparation({
      draft: { ...j5Draft, market_reach: "beberapa", market_areas: areas },
    });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await throughDetails();
    fireEvent.click(
      within(screen.getByRole("region", { name: "Jangkauan pasar" })).getByRole(
        "button",
        { name: "Ubah" },
      ),
    );
    await screen.findByRole("heading", {
      name: "Di mana pelanggan Anda berada?",
    });
    const add = (value: string) => {
      fireEvent.change(
        screen.getByRole("textbox", { name: "Tambah area lain" }),
        { target: { value } },
      );
      fireEvent.click(screen.getByRole("button", { name: "Tambahkan" }));
    };
    add(" bandung ");
    add("Denpasar");
    add("DENPASAR");
    expect(
      parseSmartSession(window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY))
        ?.selection?.marketAreas,
    ).toEqual([...areas, "Denpasar"]);
    expect(screen.queryByRole("alert")).toBeNull();
    add("Semarang");
    expect((await screen.findByRole("alert")).textContent).toContain(
      "paling banyak 8",
    );
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
  });

  it("the category screen labels Nuave suggestions and keeps the website category as its own card", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    const group = screen.getByRole("radiogroup", { name: "Pilihan kategori" });
    const radios = within(group).getAllByRole("radio");
    // "kedai kopi" is both a Nuave suggestion and the prepared website
    // category — one card; "kafe" is the second suggestion.
    expect(radios).toHaveLength(2);
    const kafe = within(group).getByRole("radio", { name: /kafe/ });
    expect(kafe.textContent).toContain("Saran Nuave");
    expect(
      within(group)
        .getByRole("radio", { name: /kedai kopi/ })
        .getAttribute("aria-checked"),
    ).toBe("true");
    fireEvent.click(kafe);
    expect(kafe.getAttribute("aria-checked")).toBe("true");
    lanjut();
    await fromOfferings();
    const row = screen.getByRole("region", { name: "Kategori" });
    expect(row.textContent).toContain("kafe");
    expect(row.textContent).toContain("Dari Anda");
  });

  it("shows the website category beside Nuave suggestions when they differ", async () => {
    stubPreparation({
      draft: { ...j5Draft, category: "warung kopi" },
    });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    const group = screen.getByRole("radiogroup", { name: "Pilihan kategori" });
    const main = within(group).getByRole("radio", { name: /warung kopi/ });
    expect(main.textContent).toContain("Dari website Anda");
    expect(main.getAttribute("aria-checked")).toBe("true");
  });

  it("keeps an owner-typed category across a focus change (R-05)", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Tulis kategori sendiri" }),
    );
    const input = screen.getByRole("textbox", {
      name: "Kategori",
    }) as HTMLInputElement;
    // Char-by-char: at "kafe" the draft transiently equals a suggestion card;
    // typing must continue on the owner's own text.
    typeChars(input, "kafe hijau");
    expect(input.value).toBe("kafe hijau");
    lanjut();
    await fromOfferings();
    // Switch focus to a product target that carries its own suggestion: an
    // owner-entered category still wins over every suggestion (R-05).
    fireEvent.click(focusRow().getByRole("button", { name: "Ubah" }));
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    fireEvent.click(
      screen.getByRole("radio", { name: /Satu produk atau layanan/ }),
    );
    lanjut();
    await screen.findByRole("heading", {
      name: "Produk atau layanan mana?",
    });
    fireEvent.click(screen.getByRole("radio", { name: /kopi susu/ }));
    lanjut();
    // The category checkpoint is shown because the focus changed; the typed
    // value stays selected as the owner's own card.
    await screen.findByRole("heading", {
      name: "Produk atau layanan ini biasanya disebut apa?",
    });
    const card = screen.getByRole("radio", { name: /kafe hijau/ });
    expect(card.getAttribute("aria-checked")).toBe("true");
    expect(card.textContent).toContain("Dari Anda");
    const saved = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(saved.selection.category).toBe("kafe hijau");
    expect(saved.selection.categoryKind).toBe("manual");
    expect(saved.selection.origins.category).toBe("owner");
  });

  it("replaces an old-focus suggestion with the product's suggestion (R-05)", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    fireEvent.click(
      within(
        screen.getByRole("radiogroup", { name: "Pilihan kategori" }),
      ).getByRole("radio", { name: /^kafe/ }),
    );
    lanjut();
    await fromOfferings();
    expect(
      screen.getByRole("region", { name: "Kategori" }).textContent,
    ).toContain("kafe");
    fireEvent.click(focusRow().getByRole("button", { name: "Ubah" }));
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    fireEvent.click(
      screen.getByRole("radio", { name: /Satu produk atau layanan/ }),
    );
    lanjut();
    await screen.findByRole("heading", {
      name: "Produk atau layanan mana?",
    });
    fireEvent.click(screen.getByRole("radio", { name: /kopi susu/ }));
    lanjut();
    // The changed focus re-resolves the category: "kafe" is not a product
    // suggestion, so the target's suggestion is pre-selected (R-05).
    await screen.findByRole("heading", {
      name: "Produk atau layanan ini biasanya disebut apa?",
    });
    const group = screen.getByRole("radiogroup", { name: "Pilihan kategori" });
    expect(within(group).queryByRole("radio", { name: /kafe$/i })).toBeNull();
    const productSuggestion = within(group).getByRole("radio", {
      name: /minuman kopi siap tutup/,
    });
    expect(productSuggestion.getAttribute("aria-checked")).toBe("true");
    expect(productSuggestion.textContent).toContain("Saran Nuave");
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
    expect(
      screen.getByRole("region", { name: "Kategori" }).textContent,
    ).toContain("minuman kopi siap tutup");
  });

  it("an unchanged focus edit exits the detour straight back to the summary", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await throughDetails();
    fireEvent.click(focusRow().getByRole("button", { name: "Ubah" }));
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    // Nothing changed: Lanjut returns to the review without re-walking the
    // detail screens.
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
  });

  it("the offerings screen keeps prepared chips labelled, adds manual items, and updates the row", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Apakah ini yang Anda tawarkan?",
    });
    const websiteGroup = screen.getByRole("group", {
      name: "Dari website Anda",
    });
    expect(
      within(websiteGroup)
        .getByRole("button", { name: /kopi susu/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    // Deselect a prepared offering, then add an owner one.
    fireEvent.click(within(websiteGroup).getByRole("button", { name: /roti/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Penawaran lain" }), {
      target: { value: "es teh" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tambahkan" }));
    const ownerGroup = screen.getByRole("group", { name: "Dari Anda" });
    expect(
      within(ownerGroup)
        .getByRole("button", { name: /es teh/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    // Typing a prepared name selects the existing chip instead of
    // duplicating it.
    fireEvent.change(screen.getByRole("textbox", { name: "Penawaran lain" }), {
      target: { value: "Kopi Susu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tambahkan" }));
    expect(
      within(websiteGroup).getAllByRole("button", { name: /kopi susu/i }),
    ).toHaveLength(1);
    lanjut();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Di mana pelanggan Anda berada?",
    });
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
    expect(
      screen.getByRole("region", { name: "Produk dan layanan" }).textContent,
    ).toContain("kopi susu, es teh");
  });

  it("shows the catalogue read-only under a product focus (R-14)", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    fireEvent.click(
      screen.getByRole("radio", { name: /Satu produk atau layanan/ }),
    );
    lanjut();
    await screen.findByRole("heading", {
      name: "Produk atau layanan mana?",
    });
    fireEvent.click(screen.getByRole("radio", { name: /kopi susu/ }));
    lanjut();
    await screen.findByRole("heading", {
      name: "Produk atau layanan ini biasanya disebut apa?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Apa saja yang Anda tawarkan?",
    });
    const catalogue = screen.getByRole("list", {
      name: "Katalog penawaran",
    });
    expect(catalogue.textContent).toContain("kopi susu");
    expect(catalogue.textContent).toContain("Fokus audit");
    expect(catalogue.textContent).toContain("roti");
    // Read-only context: no toggles on the catalogue screen.
    expect(within(catalogue).queryByRole("button")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
    });
  });

  it("the service screen requires at least one channel and keeps the pick", async () => {
    stubPreparation({ draft: { ...j5Draft, service_channels: [] } });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Apakah ini yang Anda tawarkan?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
    });
    // Nothing prepared: every card starts unchecked and Lanjut stays gated.
    const lanjutButton = screen.getByRole("button", { name: "Lanjut" });
    expect(lanjutButton).toHaveProperty("disabled", true);
    expect(
      screen.getByText("Pilih setidaknya satu cara layanan."),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Digunakan secara online/ }),
    );
    expect(lanjutButton).toHaveProperty("disabled", false);
    lanjut();
    await screen.findByRole("heading", {
      name: "Di mana pelanggan Anda berada?",
    });
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
    expect(
      screen.getByRole("region", { name: "Cara layanan" }).textContent,
    ).toContain("Digunakan secara online");
  });

  it("the market screen enforces exactly one area for sekitar and caps several at eight", async () => {
    stubPreparation({
      draft: {
        ...j5Draft,
        market_reach: "",
        market_areas: [
          "Area 1",
          "Area 2",
          "Area 3",
          "Area 4",
          "Area 5",
          "Area 6",
          "Area 7",
          "Area 8",
        ],
      },
    });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Apakah ini yang Anda tawarkan?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Di mana pelanggan Anda berada?",
    });
    // No prepared reach — Lanjut is disabled until one is chosen.
    const lanjutButton = screen.getByRole("button", { name: "Lanjut" });
    expect(lanjutButton).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("radio", { name: /Beberapa area/ }));
    const areas = screen.getByRole("group", { name: "Kota atau area" });
    for (const name of [
      "Area 1",
      "Area 2",
      "Area 3",
      "Area 4",
      "Area 5",
      "Area 6",
      "Area 7",
      "Area 8",
    ]) {
      fireEvent.click(within(areas).getByRole("button", { name }));
    }
    expect(lanjutButton).toHaveProperty("disabled", false);
    // A ninth area is refused with a visible block, not a silent drop.
    fireEvent.change(
      screen.getByRole("textbox", { name: "Tambah area lain" }),
      { target: { value: "Area 9" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Tambahkan" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "paling banyak 8",
    );
    const saved = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(saved.selection.marketAreas).toHaveLength(8);
    expect(saved.selection.marketAreas).not.toContain("Area 9");
    // sekitar keeps exactly one: a second chip replaces the first.
    fireEvent.click(screen.getByRole("radio", { name: /Sekitar satu area/ }));
    expect(lanjutButton).toHaveProperty("disabled", true);
    fireEvent.click(within(areas).getByRole("button", { name: "Area 1" }));
    expect(lanjutButton).toHaveProperty("disabled", false);
    fireEvent.click(within(areas).getByRole("button", { name: "Area 2" }));
    const savedAfterSwitch = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(savedAfterSwitch.selection.marketAreas).toEqual(["Area 2"]);
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
    expect(
      screen.getByRole("region", { name: "Jangkauan pasar" }).textContent,
    ).toContain("Sekitar bisnis");
    expect(
      screen.getByRole("region", { name: "Jangkauan pasar" }).textContent,
    ).toContain("Area 2");
  });

  it("a location focus never shows the market screen and freezes market null", async () => {
    const requests: Record<string, unknown>[] = [];
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.startsWith("/api/audit/identity"))
          return Response.json({
            canonical_url: "https://kedai-fiksi.example/",
            display_name: "Kedai Fiksi",
            preparation_mode: "synthetic-local",
          });
        if (url === "/api/audit/extract")
          return Response.json({
            draft: j5Draft,
            telemetry: [],
            preparation_mode: "synthetic-local",
          });
        if (url === "/api/audit/glm-questions") {
          requests.push(JSON.parse(String(init?.body)));
          return questionsResponse();
        }
        throw new Error(`Unexpected request ${url}`);
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<SmartIntakeJourney live={false} />);
    await fillAndPeriksa();
    await screen.findByRole("heading", {
      name: "Ini brand yang ingin Anda audit?",
    });
    lanjut();
    await screen.findByRole("heading", { name: "Apa yang ingin Anda audit?" });
    fireEvent.click(screen.getByRole("radio", { name: /Satu lokasi/ }));
    lanjut();
    await screen.findByRole("heading", {
      name: "Cabang mana yang ingin diaudit?",
    });
    fireEvent.click(screen.getByRole("radio", { name: /Kedai Fiksi Dago/ }));
    lanjut();
    await screen.findByRole("heading", {
      name: "Lokasi ini biasanya disebut apa?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Apakah ini yang Anda tawarkan?",
    });
    lanjut();
    await screen.findByRole("heading", {
      name: "Bagaimana pelanggan mendapatkan yang Anda tawarkan?",
    });
    lanjut();
    // Cabang focus: service → summary directly, never the market screen.
    await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
    expect(
      screen.queryByRole("heading", {
        name: "Di mana pelanggan Anda berada?",
      }),
    ).toBeNull();
    expect(
      screen.queryByRole("region", { name: "Jangkauan pasar" }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Sudah sesuai — buat pertanyaan audit",
      }),
    );
    await screen.findByRole("heading", { name: "Periksa pertanyaan audit" });
    const sent = requests[0]!;
    expect(sent.intake).toMatchObject({
      context: {
        focus: { value: { kind: "cabang" } },
        market: null,
        serviceChannels: { value: ["on_premise"], origin: "website" },
      },
    });
  });

  it("summary Ubah opens the owning screen and Lanjut returns to the summary", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await throughDetails();
    fireEvent.click(
      within(
        screen.getByRole("region", { name: "Produk dan layanan" }),
      ).getByRole("button", { name: "Ubah" }),
    );
    await screen.findByRole("heading", {
      name: "Apakah ini yang Anda tawarkan?",
    });
    // Kembali exits the detour to the summary without touching the answer.
    kembali();
    await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
    fireEvent.click(
      within(
        screen.getByRole("region", { name: "Produk dan layanan" }),
      ).getByRole("button", { name: "Ubah" }),
    );
    await screen.findByRole("heading", {
      name: "Apakah ini yang Anda tawarkan?",
    });
    fireEvent.click(screen.getByRole("button", { name: /roti/ }));
    lanjut();
    await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
    expect(
      screen.getByRole("region", { name: "Produk dan layanan" }).textContent,
    ).toContain("kopi susu");
    expect(
      screen.getByRole("region", { name: "Produk dan layanan" }).textContent,
    ).not.toContain("roti");
  });

  it("restores a mid-detail screen and its answers after a reload", async () => {
    stubPreparation({ draft: j5Draft });
    const first = render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    fireEvent.click(
      within(
        screen.getByRole("radiogroup", { name: "Pilihan kategori" }),
      ).getByRole("radio", { name: /^kafe/ }),
    );
    lanjut();
    await screen.findByRole("heading", {
      name: "Apakah ini yang Anda tawarkan?",
    });
    first.unmount();
    render(<SmartIntakeJourney live={false} />);
    await screen.findByRole("heading", {
      name: "Apakah ini yang Anda tawarkan?",
    });
    const saved = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(saved.stage).toBe("offerings");
    expect(saved.selection.category).toBe("kafe");
    expect(saved.selection.categoryKind).toBe("suggestion");
  });

  it("blocks sensitive text on the new detail inputs without persisting it", async () => {
    stubPreparation({ draft: j5Draft });
    render(<SmartIntakeJourney live={false} />);
    await toFocusScreen();
    lanjut();
    await screen.findByRole("heading", {
      name: "Bisnis Anda biasanya disebut apa?",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Tulis kategori sendiri" }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Kategori" }), {
      target: { value: "nomor rekening 12345" },
    });
    expect((await screen.findByRole("alert")).textContent).toContain(
      "informasi sensitif",
    );
    expect(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "",
    ).not.toContain("nomor rekening");
    lanjut();
    await screen.findByRole("heading", {
      name: "Apakah ini yang Anda tawarkan?",
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Penawaran lain" }), {
      target: { value: "nomor rekening 12345" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tambahkan" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "informasi sensitif",
    );
    const saved = JSON.parse(
      window.sessionStorage.getItem(SMART_INTAKE_STORAGE_KEY) ?? "{}",
    );
    expect(saved.selection.offerings).not.toContain("nomor rekening 12345");
  });
});
