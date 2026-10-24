import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DATAFORSEO_CHATGPT_SYSTEM } from "../audit/approved-live-providers";
import type { AuditPrompt } from "../audit/types";
import {
  dataForSeoAvailability,
  resetDataForSeoAvailabilityCache,
} from "./balance";
import {
  chatgptAnswerText,
  chatgptCheckBody,
  readChatGptAttempt,
} from "./chatgpt";
import { googleBusinesses, googleCheckBody, readGoogleAttempt } from "./google";
import { namedOutcome } from "./named";
import {
  containsPhoneNumber,
  PHONE_REMOVED,
  phoneSafeUrl,
  stripPhoneNumbers,
} from "./phones";
import type { CheckSend } from "./send";
import { syntheticCheckSend } from "./synthetic";

const AT = new Date("2026-10-24T03:00:00.000Z");
const prompt: AuditPrompt = {
  prompt_id: "NUAVE-DT-01",
  category: "unassigned",
  role: "",
  branded: false,
  question: "Klinik gigi terbaik di Surabaya untuk behel?",
  rationale: "x",
  inputs_used: ["x"],
  review_status: "needs_human_review",
};
const names = ["CS Dental", "CS Dental Aesthetic Clinic"];

const send = (
  result: Record<string, unknown> | null,
  overrides: Partial<CheckSend> = {},
): CheckSend => ({
  outcome: "ok",
  statusCode: 20000,
  result,
  costUsd: 0.004,
  taskId: "task-1",
  startedAt: AT,
  completedAt: new Date(AT.getTime() + 30_000),
  transportError: null,
  ...overrides,
});

describe("phone numbers are removed (R-12, R-28)", () => {
  it("removes Indonesian and international numbers but keeps prices and years", () => {
    const text =
      "Hubungi 0812-3456-7890 atau +62 21 555 0199, (021) 7654321. Harga Rp1.200.000 sejak 2024.";
    const stripped = stripPhoneNumbers(text);
    expect(stripped).not.toMatch(/0812|555 0199|7654321/);
    expect(
      stripped.match(new RegExp(PHONE_REMOVED.replace(/[[\]]/g, "\\$&"), "g")),
    ).toHaveLength(3);
    expect(stripped).toContain("Rp1.200.000");
    expect(stripped).toContain("2024");
    expect(containsPhoneNumber(stripped)).toBe(false);
  });
});

describe("named is decided by code (R-16, AC-08)", () => {
  const sources = [
    { url: "https://csdental.co.id/behel", title: "Harga behel" },
  ];
  it("counts the name or an alias in the answer text, including link text", () => {
    expect(
      namedOutcome({ text: "Coba **CS Dental** di Surabaya.", sources, names }),
    ).toBe("named");
    expect(
      namedOutcome({
        text: "Lihat [CS Dental Aesthetic Clinic](https://x.test).",
        sources: [],
        names,
      }),
    ).toBe("named");
  });
  it("a name only in link addresses or the sources list is a source, not named", () => {
    expect(
      namedOutcome({
        text: "Harga behel sekitar Rp5 juta ([csdental.co.id](https://csdental.co.id/behel)).",
        sources,
        names,
      }),
    ).toBe("source_only");
    expect(
      namedOutcome({
        text: "Harga behel sekitar Rp5 juta.",
        sources: [{ url: "https://x.test", title: "CS Dental — harga" }],
        names,
      }),
    ).toBe("source_only");
    expect(
      namedOutcome({ text: "Klinik lain di Surabaya.", sources: [], names }),
    ).toBe("absent");
  });
});

describe("the ChatGPT check (R-12, R-13, R-14)", () => {
  it("asks the exact question from Indonesia in Indonesian with web search (AC-02)", () => {
    expect(chatgptCheckBody(prompt.question)).toEqual({
      keyword: prompt.question,
      location_code: 2360,
      language_code: "id",
      force_web_search: true,
    });
  });

  it("saves the answer, local-business cards without phones, sources and facts", () => {
    const attempt = readChatGptAttempt({
      send: send({
        model: "gpt-6",
        markdown: "Pilihan: **Smile Studio** (telp 031-555-0101).",
        sources: [
          {
            title: "Daftar klinik",
            url: "https://daftar.test/klinik",
            domain: "daftar.test",
          },
        ],
        brand_entities: [{ title: "Smile Studio" }],
        items: [
          { type: "chat_gpt_text", markdown: "Pilihan: **Smile Studio**." },
          {
            type: "chat_gpt_local_businesses",
            items: [
              {
                title: "CS Dental",
                phone: "+62 31 555 0102",
                address: "Jl. Raya 1",
                rating: { value: 4.8 },
              },
            ],
          },
        ],
      }),
      prompt,
      attempt: 1,
      names,
    });
    expect(attempt.kind).toBe("answered");
    if (attempt.kind !== "answered") return;
    expect(attempt.observation.system).toBe(DATAFORSEO_CHATGPT_SYSTEM);
    expect(attempt.observation.question).toBe(prompt.question);
    expect(attempt.observation.raw_answer).toContain(
      "CS Dental · rating 4.8 · Jl. Raya 1",
    );
    expect(containsPhoneNumber(attempt.observation.raw_answer)).toBe(false);
    expect(attempt.observation.sources).toEqual([
      { url: "https://daftar.test/klinik", title: "Daftar klinik" },
    ]);
    // A name in a local-business card counts as named (AC-08).
    expect(attempt.facts.named).toBe("named");
    expect(attempt.facts.location_code).toBe(2360);
    expect(attempt.facts.businesses).toEqual(["Smile Studio", "CS Dental"]);
    expect(attempt.telemetry).toMatchObject({
      stage: "observation",
      accounted_cost_usd: 0.004,
      web_search_calls: 1,
    });
  });

  it("classifies failures per R-14", () => {
    const read = (overrides: Partial<CheckSend>) =>
      readChatGptAttempt({
        send: send(null, overrides),
        prompt,
        attempt: 1,
        names,
      });
    expect(read({ outcome: "unavailable", statusCode: 40200 })).toMatchObject({
      kind: "failed",
      retry: false,
      unavailable: true,
    });
    expect(read({ outcome: "retry", statusCode: 50301 })).toMatchObject({
      kind: "failed",
      retry: true,
    });
    expect(read({ outcome: "no_results", statusCode: 40102 })).toMatchObject({
      kind: "failed",
      retry: true,
    });
    expect(read({ outcome: "failed", statusCode: 40501 })).toMatchObject({
      kind: "failed",
      retry: false,
      unavailable: false,
    });
    expect(
      readChatGptAttempt({
        send: send({ markdown: "  " }),
        prompt,
        attempt: 1,
        names,
      }),
    ).toMatchObject({ kind: "failed", retry: true });
  });

  it("does not append a card already in the markdown", () => {
    expect(
      chatgptAnswerText({
        markdown: "Ada **CS Dental** di Surabaya.",
        items: [
          {
            type: "chat_gpt_local_businesses",
            items: [{ title: "CS Dental" }],
          },
        ],
      }),
    ).toBe("Ada **CS Dental** di Surabaya.");
  });
});

describe("the Google check (R-12, R-17)", () => {
  const read = (s: CheckSend) =>
    readGoogleAttempt({
      send: s,
      promptId: prompt.prompt_id,
      question: prompt.question,
      locationCode: 1007715,
      locationName: "Surabaya",
      names,
    });
  it("asks the exact question from the search place, mobile, with the AI Overview loaded", () => {
    expect(googleCheckBody(prompt.question, 1007715)).toEqual({
      keyword: prompt.question,
      location_code: 1007715,
      language_code: "id",
      device: "mobile",
      load_async_ai_overview: true,
    });
  });
  it("keeps only the AI Overview text and references, phones removed", () => {
    const attempt = read(
      send({
        items: [
          { type: "local_pack", title: "Klinik X", phone: "031-555-0199" },
          {
            type: "ai_overview",
            markdown:
              "Klinik yang sering disebut: CS Dental. Telp 031 555 0199.",
            items: [
              {
                type: "ai_overview_element",
                references: [
                  {
                    type: "ai_overview_reference",
                    url: "https://ulasan.test/a",
                    title: "Ulasan",
                  },
                ],
              },
            ],
          },
        ],
      }),
    );
    expect(attempt.kind).toBe("done");
    if (attempt.kind !== "done") return;
    expect(attempt.check).toMatchObject({
      outcome: "summary",
      named: "named",
      location_name: "Surabaya",
      question: prompt.question,
    });
    expect(attempt.check.references).toEqual([
      { url: "https://ulasan.test/a", title: "Ulasan" },
    ]);
    expect(containsPhoneNumber(attempt.check.text)).toBe(false);
    expect(JSON.stringify(attempt.check)).not.toContain("Klinik X");
  });
  it("no AI Overview, or status 40102, is a completed 'not shown'; an empty element is retried", () => {
    expect(read(send({ items: [{ type: "organic" }] }))).toMatchObject({
      kind: "done",
      check: { outcome: "not_shown", text: "" },
    });
    expect(
      read(send(null, { outcome: "no_results", statusCode: 40102 })),
    ).toMatchObject({ kind: "done", check: { outcome: "not_shown" } });
    expect(
      read(
        send({ items: [{ type: "ai_overview", markdown: null, items: null }] }),
      ),
    ).toMatchObject({ kind: "empty" });
    expect(
      read(send(null, { outcome: "unavailable", statusCode: 40210 })),
    ).toMatchObject({ kind: "failed", unavailable: true, retry: false });
  });
});

describe("synthetic checks (R-27)", () => {
  it("answer shaped like DataForSEO, with one empty summary, one not shown and one failed ChatGPT check", () => {
    const at = (source: "chatgpt" | "google", ordinal: number) =>
      syntheticCheckSend({
        source,
        body: { keyword: `Q${ordinal}` },
        ordinal,
        attempt: 1,
        names,
        now: AT,
      });
    expect(at("chatgpt", 7).outcome).toBe("retry");
    const google3 = readGoogleAttempt({
      send: at("google", 3),
      promptId: "x",
      question: "Q3",
      locationCode: 1,
      locationName: "S",
      names,
    });
    expect(google3.kind).toBe("empty");
    const google5 = readGoogleAttempt({
      send: at("google", 5),
      promptId: "x",
      question: "Q5",
      locationCode: 1,
      locationName: "S",
      names,
    });
    expect(google5).toMatchObject({
      kind: "done",
      check: { outcome: "not_shown" },
    });
    const chat1 = readChatGptAttempt({
      send: at("chatgpt", 1),
      prompt,
      attempt: 1,
      names,
    });
    // Synthetic ChatGPT answers never name the business; AI Overviews do in
    // odd-numbered questions.
    expect(chat1).toMatchObject({
      kind: "answered",
      facts: { named: "absent" },
    });
    const google1 = readGoogleAttempt({
      send: at("google", 1),
      promptId: "x",
      question: "Q1",
      locationCode: 1,
      locationName: "S",
      names,
    });
    expect(google1).toMatchObject({
      kind: "done",
      check: { outcome: "summary", named: "named" },
    });
    if (chat1.kind === "answered")
      expect(containsPhoneNumber(chat1.observation.raw_answer)).toBe(false);
  });
});

describe("DataForSEO availability for payment start (R-22)", () => {
  beforeEach(() => {
    resetDataForSeoAvailabilityCache();
    vi.stubEnv("DATAFORSEO_LOGIN", "login");
    vi.stubEnv("DATAFORSEO_PASSWORD", "password");
  });
  afterEach(() => vi.unstubAllEnvs());
  const answer = (balance: number, status = 20000, http = 200) =>
    vi.fn(async () =>
      Response.json(
        {
          status_code: status,
          tasks: [{ status_code: status, result: [{ money: { balance } }] }],
        },
        { status: http },
      ),
    );
  it("passes at USD 2.00 or more and caches the answer for 10 minutes", async () => {
    const fetchImpl = answer(2);
    expect(await dataForSeoAvailability({ now: AT, fetchImpl })).toEqual({
      ok: true,
      balanceUsd: 2,
    });
    await dataForSeoAvailability({
      now: new Date(AT.getTime() + 9 * 60_000),
      fetchImpl,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await dataForSeoAvailability({
      now: new Date(AT.getTime() + 11 * 60_000),
      fetchImpl,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("refuses a low balance, rejected credentials and missing credentials", async () => {
    expect(
      await dataForSeoAvailability({ now: AT, fetchImpl: answer(1.99) }),
    ).toMatchObject({ ok: false, reason: "balance", balanceUsd: 1.99 });
    resetDataForSeoAvailabilityCache();
    expect(
      await dataForSeoAvailability({
        now: AT,
        fetchImpl: answer(5, 40100, 401),
      }),
    ).toMatchObject({ ok: false, reason: "rejected" });
    resetDataForSeoAvailabilityCache();
    vi.stubEnv("DATAFORSEO_PASSWORD", "");
    const fetchImpl = answer(5);
    expect(await dataForSeoAvailability({ now: AT, fetchImpl })).toMatchObject({
      ok: false,
      reason: "credentials",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("phone numbers in cited links (N-5)", () => {
  it("drops messaging links and cleans or drops links that carry a number", () => {
    expect(phoneSafeUrl("https://wa.me/6281234567890")).toBeNull();
    expect(
      phoneSafeUrl("https://api.whatsapp.com/send?phone=6281234567890"),
    ).toBeNull();
    expect(phoneSafeUrl("tel:+6281234567890")).toBeNull();
    expect(
      phoneSafeUrl("https://klinik.example/kontak?hp=081234567890&ref=x"),
    ).toBe("https://klinik.example/kontak");
    expect(
      phoneSafeUrl("https://klinik.example/hubungi-081234567890"),
    ).toBeNull();
    expect(phoneSafeUrl("https://klinik.example/harga?utm_source=openai")).toBe(
      "https://klinik.example/harga?utm_source=openai",
    );
  });

  it("N-20: keeps article links whose digit runs are not Indonesian mobile numbers", () => {
    const kompas =
      "https://www.kompas.com/read/2023/05/12/080000565/tips-memilih-klinik";
    expect(phoneSafeUrl(kompas)).toBe(kompas);
    expect(phoneSafeUrl("https://berita.example/2024/021234567/klinik")).toBe(
      "https://berita.example/2024/021234567/klinik",
    );
    expect(phoneSafeUrl("https://klinik.example/wa/6281234567890")).toBeNull();
  });

  it("N-25: drops a link whose path holds a mobile number written with separators", () => {
    expect(
      phoneSafeUrl(
        "https://klinik.example/promo-hubungi-0812-3456-7890-sekarang",
      ),
    ).toBeNull();
    expect(
      phoneSafeUrl("https://klinik.example/kontak/0812.3456.7890"),
    ).toBeNull();
    const dated =
      "https://www.kompas.com/read/2023/05/12/080000565/tips-memilih-klinik";
    expect(phoneSafeUrl(dated)).toBe(dated);
    expect(
      phoneSafeUrl("https://berita.example/2024-10-24-0800-klinik-baru"),
    ).toBe("https://berita.example/2024-10-24-0800-klinik-baru");
  });
});

describe("Google's own business list (N-6)", () => {
  it("keeps names from Google's page that its AI Overview also names, never the business itself", () => {
    const result = {
      items: [
        {
          type: "local_pack",
          title: "Klinik Gigi Senyum",
          phone: "+62 31 555 0101",
        },
        { type: "local_pack", title: "Kopi Nuave" },
        { type: "organic", website_name: "Dental Prima" },
        { type: "organic", website_name: "Halodoc" },
      ],
    };
    expect(
      googleBusinesses(
        result,
        "Pilihan populer: **Klinik Gigi Senyum** dan Dental Prima. Kopi Nuave juga disebut.",
        ["Kopi Nuave"],
      ),
    ).toEqual(["Klinik Gigi Senyum", "Dental Prima"]);
  });

  it("N-21: a branch of the business is not listed as another business", () => {
    const result = {
      items: [
        { type: "local_pack", title: "CS Dental Surabaya" },
        { type: "local_pack", title: "Dental Prima" },
      ],
    };
    expect(
      googleBusinesses(
        result,
        "CS Dental Surabaya dan Dental Prima sering disebut.",
        ["CS Dental"],
      ),
    ).toEqual(["Dental Prima"]);
  });
});
