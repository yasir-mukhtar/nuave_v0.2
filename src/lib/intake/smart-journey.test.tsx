// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import historicalPair from "../../../tests/spec011-v1-records.json";
import { LOCAL_INTAKE_STORAGE_KEY } from "./local-session";
import { LOCAL_AUDIT_STORAGE_KEY } from "./local-audit-session";
import { SMART_INTAKE_STORAGE_KEY } from "./smart-intake-contract";
import SmartIntakeJourney from "./SmartIntakeJourney";

beforeEach(() => window.sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

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
    expect(
      await screen.findByRole("heading", { name: "Ini yang Nuave pahami." }),
    ).toBeTruthy();
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
    ).toMatchObject({ version: 2, stage: "questions" });
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
