import { describe, expect, it, vi } from "vitest";
import {
  callDataForSeo,
  classifyDataForSeoStatus,
  DATAFORSEO_PATHS,
  type DataForSeoRequest,
  type DataForSeoTransport,
} from "./dataforseo";
import { discoveryPhrases, peopleAlsoAskSeeds, runDiscovery } from "./discover";
import {
  brandTokens,
  coreWords,
  searchPhrase,
  type BrandInput,
} from "./phrase";
import {
  INDONESIA_SEARCH_PLACE,
  matchPlace,
  otherPlaceIn,
  placeLabel,
  PLACES,
  prefillSearchPlace,
  type SearchPlace,
} from "./places";
import { buildDiscoveryPool, isRelevant, type DiscoveryPool } from "./pool";
import {
  FALLBACK_ORIGIN,
  isProviderChoice,
  originForGenerated,
  originsForApproved,
  PROVIDER_SPLIT_MESSAGE,
  questionPlaceMessage,
  validateSearchGroundedPack,
  type QuestionOrigin,
} from "./question-rules";
import { syntheticDataForSeoTransport } from "./synthetic";
import { searchChecks, syntheticFallbackTexts } from "./questions";
import type { DirectTenAuditContext } from "../audit/direct-ten-context-v2";

const place = (display: string): SearchPlace => {
  const entry = matchPlace(display);
  if (!entry) throw new Error(`no single place for ${display}`);
  return { kind: "place", code: entry.code, display: entry.display };
};

const brand = (
  name: string,
  category: string,
  aliases: string[] = [],
  source = "https://contoh.id/",
): BrandInput => ({ name, aliases, source, category });

describe("R-04a search phrases (AC-03)", () => {
  it("turns services into phrases with the six steps", () => {
    const kopi = brand("Kopi Sudut", "kedai kopi");
    expect(searchPhrase("Kopi Susu Sudut", kopi)).toBe("kopi susu");
    expect(searchPhrase("Non-kopi (matcha, cokelat)", kopi)).toBe("non kopi");
    expect(searchPhrase("Biji kopi kemasan 200g", kopi)).toBe(
      "biji kopi kemasan",
    );
    const cs = brand("CS Dental", "klinik gigi");
    expect(searchPhrase("Behel (orthodonti)", cs)).toBe("behel gigi");
    expect(searchPhrase("Veneer porselen", cs)).toBe("veneer porselen");
    expect(searchPhrase("Laser", brand("MS Glow", "klinik kecantikan"))).toBe(
      "laser kecantikan",
    );
    const sozo = brand(
      "Sozo",
      "klinik kecantikan",
      ["Sozo Skin Clinic", "Sozo Beauty Clinic"],
      "https://sozoskinclinic.com/",
    );
    expect(brandTokens(sozo)).toEqual(["sozo", "sozoskinclinic"]);
    // A business named after its city keeps its own words as brand words,
    // never the city: questions must name the search place (R-10a).
    const fiksi = brand(
      "Kedai Fiksi",
      "kedai kopi",
      ["Kedai Fiksi Bandung"],
      "https://kedai-fiksi.example/",
    );
    expect(brandTokens(fiksi)).toEqual(["fiksi"]);
    expect(searchPhrase("Skin Booster", sozo)).toBe("skin booster");
    // Step 5 adds the subject word to a one-word phrase.
    expect(searchPhrase("Botox treatment", sozo)).toBe("botox kecantikan");
    expect(searchPhrase("V shape", sozo)).toBe("v shape");
    expect(searchPhrase("Paket promo Sozo", sozo)).toBeNull();
    expect(searchPhrase("Facial wajah glowing super bersih", sozo)).toBe(
      "facial wajah glowing super",
    );
  });

  it("keeps the category subject word out of core words", () => {
    expect(coreWords("behel gigi", "klinik gigi")).toEqual(["behel"]);
    expect(coreWords("klinik gigi", "klinik gigi")).toEqual(["klinik", "gigi"]);
  });
});

describe("R-03 places (AC-04c)", () => {
  it("maps Jakarta, its parts and DKI Jakarta", () => {
    expect(matchPlace("Jakarta")?.code).toBe(1007716);
    expect(matchPlace("DKI Jakarta")?.code).toBe(1007716);
    expect(matchPlace("Jakarta Selatan")?.code).toBe(9072592);
    expect(matchPlace("Kota Jakarta Barat")?.code).toBe(9072596);
  });

  it("keeps compass words and refuses ambiguous names", () => {
    expect(matchPlace("Tangerang Selatan")?.display).toBe("Tangerang Selatan");
    expect(matchPlace("Tangerang")?.display).toBe("Tangerang");
    expect(matchPlace("Depok")).toBeNull();
    const depoks = PLACES.filter((p) => p.display === "Depok").map(placeLabel);
    expect(new Set(depoks).size).toBe(3);
    expect(depoks).toContain("Depok (Cirebon, Jawa Barat)");
    expect(
      PLACES.filter((p) => p.display === "Cisarua")
        .map(placeLabel)
        .sort(),
    ).toEqual([
      "Cisarua (Kabupaten Bandung Barat, Jawa Barat)",
      "Cisarua (Kabupaten Bogor, Jawa Barat)",
    ]);
  });

  it("pre-fills only from one clear match", () => {
    expect(
      prefillSearchPlace({
        focus: "brand",
        marketReach: "sekitar",
        marketAreas: ["Jakarta Selatan"],
      }),
    ).toMatchObject({ code: 9072592, display: "Jakarta Selatan" });
    expect(
      prefillSearchPlace({
        focus: "brand",
        marketReach: "beberapa",
        marketAreas: ["Depok", "DKI Jakarta"],
      }),
    ).toMatchObject({ code: 1007716 });
    expect(
      prefillSearchPlace({
        focus: "brand",
        marketReach: "sekitar",
        marketAreas: ["Tangerang Selatan"],
      }),
    ).toMatchObject({ display: "Tangerang Selatan" });
    expect(
      prefillSearchPlace({
        focus: "brand",
        marketReach: "seluruh",
        marketAreas: [],
      }),
    ).toBeNull();
    expect(
      prefillSearchPlace({
        focus: "cabang",
        locationAddress: "Jl. Bintaro Raya No.15, Jakarta Selatan 12240",
      }),
    ).toMatchObject({ display: "Jakarta Selatan" });
  });
});

describe("R-10 / R-10a question rules (AC-04a)", () => {
  it("detects provider-choice on whole words", () => {
    expect(isProviderChoice("Bagaimana cara memilih klinik?")).toBe(true);
    expect(isProviderChoice("Bagaimana cara memilih dokter?")).toBe(false);
    expect(isProviderChoice("Berapa lama efek laser wajah terlihat?")).toBe(
      false,
    );
    expect(isProviderChoice("Berapa biaya laser wajah di Bandung?")).toBe(true);
    expect(isProviderChoice("fisioterapi stroke jakarta barat")).toBe(false);
    expect(isProviderChoice("Di mana pasang behel di Surabaya?")).toBe(true);
  });

  it("applies the place rule with longest names first", () => {
    const tangsel = place("Tangerang Selatan");
    expect(
      otherPlaceIn("klinik gigi terbaik di tangerang selatan", tangsel),
    ).toBeNull();
    expect(otherPlaceIn("klinik gigi terbaik di tangerang", tangsel)).toBe(
      "Tangerang",
    );
    const barat = place("Jakarta Barat");
    expect(otherPlaceIn("fisioterapi stroke jakarta", barat)).toBeNull();
    expect(otherPlaceIn("fisioterapi stroke jakarta selatan", barat)).toBe(
      "Jakarta Selatan",
    );
    expect(otherPlaceIn("fisioterapi saraf kejepit bekasi", barat)).toBe(
      "Bekasi",
    );
    const jakarta = place("Jakarta");
    expect(otherPlaceIn("klinik jakarta selatan", jakarta)).toBeNull();
    const padangPanjang = place("Padang Panjang");
    expect(
      otherPlaceIn("klinik gigi terbaik di padang panjang", padangPanjang),
    ).toBeNull();
    expect(otherPlaceIn("nasi padang enak", place("Bandung"))).toBeNull();
  });

  it("gives the R-11a edit messages", () => {
    const surabaya = place("Surabaya");
    expect(questionPlaceMessage("Klinik gigi terbaik di mana?", surabaya)).toBe(
      "Sebutkan kota Surabaya di pertanyaan ini.",
    );
    expect(
      questionPlaceMessage("Klinik gigi terbaik di Bekasi?", surabaya),
    ).toBe("Pertanyaan ini menyebut kota lain. Gunakan Surabaya.");
    expect(
      questionPlaceMessage("Klinik gigi terbaik di Surabaya?", surabaya),
    ).toBeNull();
    expect(
      questionPlaceMessage("Berapa lama behel gigi terpasang?", surabaya),
    ).toBeNull();
  });
});

const dentalContext = (overrides: Partial<DirectTenAuditContext> = {}) =>
  ({
    version: "nuave-direct-ten-context-v2",
    identity: {
      name: "CS Dental Aesthetic Clinic",
      source: "https://csdental.example/",
      sourceOrigin: "owner",
      aliases: ["CS Dental"],
      origin: "owner",
    },
    focus: { value: { kind: "brand" }, origin: "owner" },
    category: { value: "klinik gigi", origin: "owner" },
    offerings: {
      value: [
        "Veneer porselen",
        "Behel (orthodonti)",
        "Clear aligner",
        "Implan gigi",
      ],
      origin: "owner",
    },
    serviceChannels: { value: ["on_premise"], origin: "owner" },
    market: {
      value: { reach: "sekitar", areas: ["Surabaya"] },
      origin: "owner",
    },
    comparators: { value: { mode: "unknown" }, origin: "owner" },
    ...overrides,
  }) as DirectTenAuditContext;

describe("R-05..R-08 pool (AC-04b, AC-05)", () => {
  const surabaya = place("Surabaya");
  const context = {
    brand: brand("CS Dental", "klinik gigi", ["CS Dental"]),
    place: surabaya,
    phrases: ["behel gigi", "implan gigi"],
  };

  it("drops off-topic texts, other businesses and other places", () => {
    expect(isRelevant("harga behel gigi surabaya", context)).toBe(true);
    expect(isRelevant("cara merapikan gigi tanpa behel", context)).toBe(false);
    expect(isRelevant("sikat gigi untuk behel", context)).toBe(false);
    const pool = buildDiscoveryPool(
      {
        keywords: [
          {
            phrase: "behel gigi",
            text: "behel gigi",
            volume: 9_900,
            dataMonth: "2026-09",
            intent: "navigational",
          },
          {
            phrase: "behel gigi",
            text: "behel gigi",
            volume: 9_900,
            dataMonth: "2026-09",
            intent: null,
          },
          {
            phrase: "behel gigi",
            text: "harga behel gigi",
            volume: 4_400,
            dataMonth: "2026-09",
            intent: null,
          },
          {
            phrase: "implan gigi",
            text: "klinik implan gigi terdekat",
            volume: 260,
            dataMonth: "2026-09",
            intent: "navigational",
          },
          {
            phrase: "implan gigi",
            text: "wonder dental spesialis implan gigi surabaya",
            volume: 50,
            dataMonth: "2026-09",
            intent: null,
          },
          {
            phrase: "behel gigi",
            text: "behel gigi bekasi",
            volume: 90,
            dataMonth: "2026-09",
            intent: null,
          },
          {
            phrase: "behel gigi",
            text: "behel gigi adalah",
            volume: 70,
            dataMonth: "2026-09",
            intent: null,
          },
          {
            phrase: "behel gigi",
            text: "biaya behel gigi",
            volume: 5,
            dataMonth: "2026-09",
            intent: null,
          },
        ],
        autocomplete: [
          "rekomendasi behel gigi surabaya",
          "behel gigi surabaya murah",
          "cs dental behel",
        ],
        peopleAlsoAsk: [
          "Berapa biaya pasang behel gigi?",
          "Apakah drg. Budi bagus?",
        ],
        businessNamesSeen: ["Wonder Dental", "Klinik Gigi Surabaya"],
      },
      context,
      {
        incomplete: false,
        synthetic: false,
        now: new Date("2026-10-24T00:00:00Z"),
      },
    );
    expect(pool.businessNames).toEqual(["wonder"]);
    expect(pool.topics.map((t) => t.text)).toEqual([
      "behel gigi",
      "harga behel gigi",
      "klinik implan gigi terdekat",
      // "gigi" is a category word, so it counts as context (R-05a).
      "behel gigi adalah",
    ]);
    const texts = pool.wordings.map((w) => w.text);
    expect(texts).toContain("rekomendasi behel gigi surabaya");
    expect(texts).toContain("Berapa biaya pasang behel gigi?");
    expect(texts).not.toContain("cs dental behel");
    expect(texts).not.toContain("Apakah drg. Budi bagus?");
    expect(
      pool.wordings.find((w) => w.text === "behel gigi surabaya murah"),
    ).toMatchObject({
      origin: "autocomplete",
      topic: "behel gigi",
      volume: 9_900,
    });
    expect(pool.thin).toBe(true);
  });
});

function recordingTransport(
  base: DataForSeoTransport,
): DataForSeoTransport & { requests: DataForSeoRequest[] } {
  const requests: DataForSeoRequest[] = [];
  return {
    kind: base.kind,
    requests,
    send: async (request) => {
      requests.push(request);
      return base.send(request);
    },
  };
}

describe("runDiscovery (AC-03, AC-05, R-27)", () => {
  it("never sends the brand and builds a pool in synthetic mode", async () => {
    const transport = recordingTransport(syntheticDataForSeoTransport());
    const context = dentalContext();
    const run = await runDiscovery({
      context,
      place: place("Surabaya"),
      transport,
    });
    expect(discoveryPhrases(context)).toEqual([
      "veneer porselen",
      "behel gigi",
      "clear aligner",
      "implan gigi",
    ]);
    expect(transport.requests).toHaveLength(10);
    for (const request of transport.requests) {
      const keyword = String(request.body.keyword).toLowerCase();
      expect(keyword).not.toMatch(/\bcs\b|csdental/);
    }
    expect(run.pool.synthetic).toBe(true);
    expect(run.pool.thin).toBe(false);
    expect(run.pool.businessNames).toEqual(["sintesa contoh"]);
    expect(
      run.pool.wordings.some((w) => /sintesa|bekasi|obat/i.test(w.text)),
    ).toBe(false);
    expect(
      run.pool.topics.some((t) => t.text === "veneer porselen adalah"),
    ).toBe(false);
  });

  it("leaves the place out of seeds for Seluruh Indonesia", () => {
    const context = dentalContext();
    expect(
      peopleAlsoAskSeeds(
        context,
        discoveryPhrases(context),
        INDONESIA_SEARCH_PLACE,
      ),
    ).toEqual(["klinik gigi terbaik", "biaya veneer porselen"]);
  });

  it("keeps what it had when DataForSEO is unavailable", async () => {
    const run = await runDiscovery({
      context: dentalContext(),
      place: place("Surabaya"),
      transport: syntheticDataForSeoTransport({ fail: "unavailable" }),
    });
    expect(run.unavailable).toBe(true);
    expect(run.pool.incomplete).toBe(true);
    expect(run.pool.thin).toBe(true);
    expect(run.calls).toBe(1);
  });
});

describe("DataForSEO status codes (AC-13)", () => {
  it("classifies codes per R-14", () => {
    expect(classifyDataForSeoStatus(20000)).toBe("ok");
    expect(classifyDataForSeoStatus(50301)).toBe("retry");
    expect(classifyDataForSeoStatus(40210)).toBe("unavailable");
    expect(classifyDataForSeoStatus(40102)).toBe("no_results");
    expect(classifyDataForSeoStatus(41234)).toBe("failed");
  });

  it("retries 50301 once and never retries an unknown code", async () => {
    const send = vi.fn().mockResolvedValue({
      httpStatus: 200,
      json: { tasks: [{ status_code: 50301 }] },
    });
    await callDataForSeo({
      call: "autocomplete",
      body: { keyword: "behel gigi" },
      stage: "discovery",
      transport: { kind: "test", send },
      forbiddenWords: [],
    });
    expect(send).toHaveBeenCalledTimes(2);
    send.mockClear();
    send.mockResolvedValue({
      httpStatus: 200,
      json: { tasks: [{ status_code: 41234 }] },
    });
    const result = await callDataForSeo({
      call: "autocomplete",
      body: { keyword: "behel gigi" },
      stage: "discovery",
      transport: { kind: "test", send },
      forbiddenWords: [],
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(result.outcome).toBe("failed");
  });

  it("never sends a request that carries a brand word (R-02)", async () => {
    const send = vi.fn();
    const result = await callDataForSeo({
      call: "autocomplete",
      body: { keyword: "sozo laser" },
      stage: "discovery",
      transport: { kind: "test", send },
      forbiddenWords: ["sozo"],
    });
    expect(send).not.toHaveBeenCalled();
    expect(result.outcome).toBe("failed");
    expect(DATAFORSEO_PATHS.autocomplete).toContain("autocomplete");
  });
});

function samplePool(): DiscoveryPool {
  return {
    version: "nuave-discovery-pool-v1",
    place: place("Surabaya"),
    phrases: ["behel gigi"],
    topics: [
      {
        text: "behel gigi",
        phrase: "behel gigi",
        volume: 9_900,
        dataMonth: "2026-09",
        core: ["behel"],
        intent: null,
      },
      {
        text: "harga behel gigi",
        phrase: "behel gigi",
        volume: 4_400,
        dataMonth: "2026-09",
        core: ["harga", "behel"],
        intent: null,
      },
    ],
    wordings: [
      {
        origin: "autocomplete",
        text: "rekomendasi behel gigi surabaya",
        topic: "behel gigi",
        volume: 9_900,
        dataMonth: "2026-09",
      },
      {
        origin: "people_also_ask",
        text: "Berapa lama behel gigi terpasang?",
        topic: "behel gigi",
        volume: 9_900,
        dataMonth: "2026-09",
      },
      {
        origin: "keyword",
        text: "harga behel gigi",
        topic: "harga behel gigi",
        volume: 4_400,
        dataMonth: "2026-09",
      },
    ],
    businessNames: ["wonder"],
    thin: false,
    incomplete: false,
    synthetic: false,
    createdAt: "2026-10-24T00:00:00.000Z",
  };
}

describe("R-11 pack validation (AC-04, AC-04a, AC-04b, AC-19)", () => {
  const csBrand = brand("CS Dental", "klinik gigi", ["CS Dental"]);
  const pool = samplePool();
  const providerTexts = [
    "rekomendasi behel gigi surabaya",
    "Berapa harga behel gigi di Surabaya?",
    "Klinik behel gigi terbaik di Surabaya mana ya?",
    "Pasang behel gigi murah di Surabaya di mana?",
    "Behel gigi yang bagus di Surabaya apa?",
    "Tempat pasang behel gigi di Surabaya yang rapi?",
    "Biaya behel gigi di Surabaya berapa?",
    "Rekomendasi dokter behel gigi di Surabaya?",
  ];
  const questions = [
    ...providerTexts,
    "Berapa lama behel gigi terpasang?",
    "Apakah behel gigi sakit?",
  ];
  const origins = questions.map((q) =>
    originForGenerated(q, pool),
  ) as QuestionOrigin[];

  it("accepts the city in every question for a business named after its city", () => {
    const context = {
      version: "nuave-direct-ten-context-v2",
      identity: {
        name: "Kedai Fiksi",
        source: "https://kedai-fiksi.example/",
        sourceOrigin: "owner",
        aliases: ["Kedai Fiksi Bandung"],
        origin: "website",
      },
      focus: { value: { kind: "brand" }, origin: "nuave" },
      category: { value: "kedai kopi", origin: "website" },
      offerings: { value: ["kopi susu", "roti"], origin: "website" },
      serviceChannels: { value: ["on_premise"], origin: "website" },
      market: {
        value: { reach: "beberapa", areas: ["Bandung", "Cimahi"] },
        origin: "website",
      },
      comparators: { value: { mode: "unknown" }, origin: "nuave" },
    } as DirectTenAuditContext;
    const bandung = place("Bandung");
    const texts = syntheticFallbackTexts(context, bandung);
    expect(texts[0]).toBe("Rekomendasi kedai kopi terbaik di Bandung?");
    expect(
      searchChecks(texts, "fallback", null, bandung, context).issues,
    ).toEqual([]);
    // The brand word itself is still refused.
    expect(
      searchChecks(
        ["Kedai Fiksi di Bandung bagus?", ...texts.slice(1)],
        "fallback",
        null,
        bandung,
        context,
      ).issues,
    ).toContain("Pertanyaan tidak boleh menyebut nama bisnis Anda.");
  });

  it("labels exact pool texts and accepts a valid pack", () => {
    expect(origins[0]).toMatchObject({
      label: "dicari_di_google",
      volume: 9_900,
    });
    expect(origins[8]).toMatchObject({ label: "orang_lain_juga_bertanya" });
    expect(origins[1]).toMatchObject({
      label: "disusun_dari_topik",
      topic: "harga behel gigi",
    });
    expect(
      validateSearchGroundedPack({
        questions,
        origins,
        place: pool.place,
        pool,
        brand: csBrand,
        allowEdited: false,
      }),
    ).toEqual([]);
  });

  it("rejects a label or number changed in the browser", () => {
    const forged = origins.map((o, i) =>
      i === 1 ? { ...o, label: "dicari_di_google" as const } : o,
    );
    expect(
      validateSearchGroundedPack({
        questions,
        origins: forged,
        place: pool.place,
        pool,
        brand: csBrand,
        allowEdited: false,
      }),
    ).not.toEqual([]);
    const bumped = origins.map((o, i) =>
      i === 0 ? { ...o, volume: 99_999 } : o,
    );
    expect(
      validateSearchGroundedPack({
        questions,
        origins: bumped,
        place: pool.place,
        pool,
        brand: csBrand,
        allowEdited: false,
      }),
    ).not.toEqual([]);
  });

  it("enforces the place, the split, brands and other businesses", () => {
    const edited = [...questions];
    edited[2] = "Klinik behel gigi terbaik di Bekasi mana ya?";
    edited[3] = "Wonder dental pasang behel gigi di Surabaya bagus?";
    edited[4] = "Berapa lama behel gigi dipakai?";
    const messages = validateSearchGroundedPack({
      questions: edited,
      origins: originsForApproved({
        approved: edited,
        generated: questions,
        generatedOrigins: origins,
      }),
      place: pool.place,
      pool,
      brand: csBrand,
      allowEdited: true,
    }).map((issue) => issue.message);
    expect(messages).toContain(
      "Pertanyaan ini menyebut kota lain. Gunakan Surabaya.",
    );
    expect(messages).toContain(
      "Pertanyaan tidak boleh menyebut nama bisnis, klinik, atau dokter.",
    );
    expect(messages).toContain(PROVIDER_SPLIT_MESSAGE);
  });

  it("marks edits and keeps the number only with the topic words (AC-19)", () => {
    const approved = [...questions];
    approved[1] = "Berapa harga behel gigi yang bagus di Surabaya?";
    approved[2] = "Klinik terbaik di Surabaya mana ya?";
    const result = originsForApproved({
      approved,
      generated: questions,
      generatedOrigins: origins,
    });
    expect(result[1]).toMatchObject({
      label: "diubah_oleh_anda",
      originalTopic: "harga behel gigi",
      volume: 4_400,
    });
    expect(result[2]).toMatchObject({
      label: "diubah_oleh_anda",
      volume: null,
    });
    expect(result[0]).toEqual(origins[0]);
  });

  it("checks the fallback pack against the same rules (R-11a)", () => {
    const fallback = questions.map(() => FALLBACK_ORIGIN);
    expect(
      validateSearchGroundedPack({
        questions,
        origins: fallback,
        place: pool.place,
        pool: { ...pool, thin: true },
        brand: csBrand,
        allowEdited: false,
      }),
    ).toEqual([]);
    expect(
      validateSearchGroundedPack({
        questions,
        origins: fallback,
        place: pool.place,
        pool,
        brand: csBrand,
        allowEdited: false,
      }).length,
    ).toBeGreaterThan(0);
  });
});
