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

async function throughBrand() {
  await screen.findByRole("heading", {
    name: "Ini brand yang ingin Anda audit?",
  });
  fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
  await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
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
      screen
        .getByRole("button", { name: "Brand secara keseluruhan" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
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
    ).toMatchObject({ version: 4, stage: "questions" });
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

function stubPreparation(options: { holdExtract?: Promise<void> } = {}) {
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
        draft,
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
    // summary → brand → entry via marked pops; foreign states do nothing.
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
      JSON.stringify({ version: 3, stage: "entry" }),
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
        version: 4,
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
    const row = within(
      screen.getByRole("region", { name: "Kategori dan penawaran utama" }),
    );
    fireEvent.click(row.getByRole("button", { name: "Ubah" }));
    fireEvent.change(row.getByRole("textbox", { name: "Kategori" }), {
      target: { value: "kafe fiksi" },
    });
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
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
    const rowAgain = within(
      screen.getByRole("region", { name: "Kategori dan penawaran utama" }),
    );
    fireEvent.click(rowAgain.getByRole("button", { name: "Ubah" }));
    expect(
      (rowAgain.getByRole("textbox", { name: "Kategori" }) as HTMLInputElement)
        .value,
    ).toBe("kafe fiksi");
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
    fireEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    await screen.findByRole("heading", { name: "Ini yang Nuave pahami." });
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
