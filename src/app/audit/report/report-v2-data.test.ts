import { describe, expect, it } from "vitest";
import {
  TWO_SOURCE_REPORT_VERSION,
  type TwoSourceQuestion,
  type TwoSourceReport,
} from "@/lib/audit/two-source-report";
import type { AuditObservation } from "@/lib/audit/types";
import { findNames } from "./mark-names";
import {
  VERDICT_MAX,
  competitorRows,
  displayHost,
  mentionState,
  ratingLine,
  siteIcon,
  topicGapRows,
  verdictFromConclusion,
} from "./report-v2-data";

function question(
  ordinal: number,
  over: {
    chatgpt?: TwoSourceQuestion["chatgpt"];
    google?: Partial<TwoSourceQuestion["google"]>;
    question?: string;
    topic?: string | null;
  } = {},
): TwoSourceQuestion {
  return {
    prompt_id: `p${ordinal}`,
    ordinal,
    question: over.question ?? `Pertanyaan ${ordinal}?`,
    label: "dicari_di_google",
    label_text: "Dicari di Google",
    topic_line: "",
    topic: over.topic === undefined ? `topik ${ordinal}` : over.topic,
    volume: null,
    data_month: null,
    chatgpt: over.chatgpt ?? {
      outcome: "answered",
      named: "absent",
      recommended: false,
    },
    google: {
      outcome: "summary",
      text: "",
      references: [],
      named: "absent",
      observed_at: null,
      ...over.google,
    },
  };
}

function observation(ordinal: number, raw_answer: string): AuditObservation {
  return {
    prompt_id: `p${ordinal}`,
    run_status: "completed",
    raw_answer,
  } as AuditObservation;
}

function report(
  questions: TwoSourceQuestion[],
  over: Partial<TwoSourceReport> = {},
): TwoSourceReport {
  return {
    version: TWO_SOURCE_REPORT_VERSION,
    order_number: null,
    places: {
      google: { code: 1, name: "Jakarta" },
      chatgpt: { code: 2, name: "Indonesia" },
    },
    checked_from: null,
    checked_to: null,
    search_data_available: true,
    questions,
    counts: {
      chatgpt: { completed: 2, named: 1, recommended: 1, failed: 0 },
      google: { completed: 2, summaries: 2, named: 0, failed: 0 },
      failed: 0,
    },
    google_finding: null,
    topics_missing: [],
    other_businesses: { chatgpt: [], google: [] },
    ...over,
  };
}

describe("mention states (Figma legend)", () => {
  it("maps each saved outcome to its dot", () => {
    expect(
      mentionState(
        question(1, {
          chatgpt: { outcome: "answered", named: "named", recommended: true },
        }),
        "chatgpt",
      ),
    ).toBe("recommended");
    expect(
      mentionState(
        question(1, {
          chatgpt: { outcome: "answered", named: "named", recommended: false },
        }),
        "chatgpt",
      ),
    ).toBe("mentioned");
    expect(
      mentionState(
        question(1, {
          chatgpt: {
            outcome: "answered",
            named: "source_only",
            recommended: false,
          },
        }),
        "chatgpt",
      ),
    ).toBe("cited");
    expect(
      mentionState(
        question(1, {
          chatgpt: { outcome: "failed", named: null, recommended: null },
        }),
        "chatgpt",
      ),
    ).toBe("failed");
    expect(mentionState(question(1), "chatgpt")).toBe("none");
    expect(
      mentionState(question(1, { google: { outcome: "not_shown" } }), "google"),
    ).toBe("noaio");
    expect(
      mentionState(question(1, { google: { outcome: "failed" } }), "google"),
    ).toBe("failed");
    expect(
      mentionState(question(1, { google: { named: "named" } }), "google"),
    ).toBe("mentioned");
    expect(
      mentionState(question(1, { google: { named: "source_only" } }), "google"),
    ).toBe("cited");
  });
});

describe("shared name matching", () => {
  it("matches whole words in any case, longest name first", () => {
    const text = "Coba Erha Clinic atau ERHA. Erhaku bukan.";
    const found = findNames(text, ["Erha", "Erha Clinic"]);
    expect(found.map((m) => m.name)).toEqual(["Erha Clinic", "Erha"]);
  });
});

describe("competitor rows from saved answers (A-04)", () => {
  it("counts answers that name a business, once per answer, plus the owner's row", () => {
    const two = report(
      [
        question(1, {
          google: { text: "ZAP Clinic dan ZAP Clinic lagi; juga Erha Clinic." },
        }),
        question(2),
      ],
      {
        other_businesses: {
          chatgpt: ["ZAP Clinic", "Erha Clinic", "Erha"],
          google: ["zap clinic", "Tak Disebut"],
        },
      },
    );
    const { counted, uncounted } = competitorRows(
      two,
      [
        observation(1, "ZAP Clinic bagus."),
        observation(2, "Erha punya dokter."),
      ],
      ["Klinik Saya"],
    );
    const zap = counted.find((r) => r.name === "ZAP Clinic")!;
    expect(zap).toMatchObject({ chatgpt: 1, google: 1 });
    // "Erha" inside "Erha Clinic" is not counted twice in the same answer.
    expect(counted.find((r) => r.name === "Erha Clinic")).toMatchObject({
      google: 1,
    });
    expect(counted.find((r) => r.name === "Erha")).toMatchObject({
      chatgpt: 1,
      google: 0,
    });
    expect(uncounted).toEqual(["Tak Disebut"]);
    const own = counted.find((r) => r.own)!;
    expect(own).toMatchObject({ name: "Klinik Saya", chatgpt: 1, google: 0 });
    expect(own.own).toEqual({ cited: 0, recommended: 1 });
    // Sorted by total, ties put the owner first.
    expect(counted[0]!.name).toBe("ZAP Clinic");
  });
});

describe("Celah Topik rows (A-05)", () => {
  it("hides a row without a topic name and counts other businesses when no volume", () => {
    const two = report(
      [
        question(1, {
          google: { text: "ZAP Clinic untuk laser." },
          topic: "laser",
        }),
        question(2, { question: "Apa?", topic: "Apa?" }),
        question(3, { google: { named: "source_only" }, topic: "flek" }),
      ],
      {
        other_businesses: { chatgpt: ["ZAP Clinic"], google: [] },
        topics_missing: [
          {
            prompt_id: "p1",
            ordinal: 1,
            topic: "laser",
            volume: null,
            data_month: null,
            domains: ["a.example"],
          },
          {
            prompt_id: "p2",
            ordinal: 2,
            topic: "Apa?",
            volume: null,
            data_month: null,
            domains: [],
          },
          {
            prompt_id: "p3",
            ordinal: 3,
            topic: "flek",
            volume: 3602,
            data_month: "2026-09",
            domains: [],
          },
        ],
      },
    );
    const rows = topicGapRows(
      two,
      [observation(1, ""), observation(3, "")],
      "klinik",
    );
    expect(rows.map((r) => r.topic)).toEqual(["laser", "flek"]);
    expect(rows[0]).toMatchObject({ othersNamed: 1, volume: null });
    expect(rows[0]!.standing).toBe(
      "Tidak disebut di ChatGPT maupun Google AI Overview.",
    );
    expect(rows[1]!.standing).toBe(
      "Situs klinik Anda dikutip, tetapi namanya tidak disebut.",
    );
  });
});

describe("competitor counts and the owner's own names", () => {
  it("an answer that only names the owner does not count for a competitor inside the owner's name", () => {
    const two = report([question(1), question(2)], {
      other_businesses: { chatgpt: ["Natasha"], google: [] },
    });
    const { counted, uncounted } = competitorRows(
      two,
      [
        observation(1, "Natasha Skin Clinic Center punya dokter kulit."),
        observation(
          2,
          "Coba Natasha di Kemang, atau Natasha Skin Clinic Center.",
        ),
      ],
      ["Natasha Skin Clinic Center"],
    );
    expect(counted.find((r) => r.name === "Natasha")).toMatchObject({
      chatgpt: 1,
    });
    expect(uncounted).toEqual([]);
  });
});

describe("verdict cut", () => {
  it("keeps whole sentences up to the limit", () => {
    const a = "Kalimat pertama cukup pendek.";
    const b = "Kalimat kedua juga.";
    const long = "x".repeat(VERDICT_MAX);
    expect(verdictFromConclusion(`${a} ${b} ${long}.`)).toBe(`${a} ${b}`);
  });

  it("never stops on a semicolon: a clause stays with the rest of its sentence", () => {
    const clause = `Klinik Anda dikenal ChatGPT sebagai pilihan yang mudah dijangkau ${"di banyak kota ".repeat(4)}dan sering disebut;`;
    const rest = `namun untuk tindakan medis AI mengarahkan pasien ke klinik lain ${"yang menampilkan dokter spesialis ".repeat(3)}di halaman mereka.`;
    expect(clause.length).toBeLessThan(VERDICT_MAX);
    expect(clause.length + rest.length).toBeGreaterThan(VERDICT_MAX);
    const verdict = verdictFromConclusion(`${clause} ${rest} Lalu.`);
    expect(verdict.endsWith(";")).toBe(false);
    expect(verdict.endsWith("…")).toBe(true);
    expect(verdict.length).toBeLessThanOrEqual(VERDICT_MAX);
  });

  it("does not split at an abbreviation", () => {
    expect(verdictFromConclusion("Kunjungi dr. Linda di sana. Lalu.")).toBe(
      "Kunjungi dr. Linda di sana. Lalu.",
    );
  });

  it("cuts one over-long sentence at the last word with an ellipsis", () => {
    const sentence = `${"kata ".repeat(60)}akhir.`;
    const verdict = verdictFromConclusion(sentence);
    expect(verdict.length).toBeLessThanOrEqual(VERDICT_MAX);
    expect(verdict.endsWith("kata…")).toBe(true);
  });
});

describe("display host", () => {
  it("shows the host without www", () => {
    expect(displayHost("https://www.sozoskinclinic.com/x")).toBe(
      "sozoskinclinic.com",
    );
    expect(displayHost("instagram: sozo")).toBe("instagram: sozo");
    expect(displayHost("https://www.instagram.com/sozo.clinic/")).toBe(
      "instagram.com/sozo.clinic",
    );
  });
});

describe("competitor rows saved with the report (Spec 021 Part C, AC-C1)", () => {
  const fact = (name: string, over = {}) => ({
    name,
    chatgpt: [] as string[],
    google: [] as string[],
    cards: [] as string[],
    website: null,
    rating: null,
    reviews: null,
    ...over,
  });

  it("uses the saved counts, recommendations and listing details instead of matching names again", () => {
    const two = report([question(1), question(2)], {
      // The saved names would match differently: the saved block wins.
      other_businesses: { chatgpt: ["ZAP Clinic", "Kosong"], google: [] },
      competitors: {
        others: [
          fact("ZAP Clinic", {
            chatgpt: ["p1", "p2"],
            google: ["p1"],
            cards: ["p2"],
            website: "https://zapclinic.example/",
            rating: { value: 4.7, max: 5 },
            reviews: 1200,
          }),
          fact("Kosong", { website: "https://kosong.example/" }),
        ],
        own: {
          cards: [],
          website: "https://saya.example/",
          rating: { value: 4.9, max: 5 },
          reviews: 80,
        },
      },
    });
    const { counted, uncounted } = competitorRows(
      two,
      [observation(1, "Tidak ada nama."), observation(2, "")],
      ["Klinik Saya"],
    );
    expect(counted[0]).toEqual({
      name: "ZAP Clinic",
      chatgpt: 2,
      google: 1,
      cards: 1,
      website: "https://zapclinic.example/",
      rating: { value: 4.7, max: 5 },
      reviews: 1200,
    });
    expect(uncounted).toEqual(["Kosong"]);
    expect(counted.find((row) => row.own)).toMatchObject({
      name: "Klinik Saya",
      chatgpt: 1,
      google: 0,
      own: { cited: 0, recommended: 1 },
      cards: 0,
      website: "https://saya.example/",
      rating: { value: 4.9, max: 5 },
      reviews: 80,
    });
  });
});

describe("site icons (C-03)", () => {
  it("is the business's own /favicon.ico, never a shared platform's", () => {
    expect(siteIcon("https://www.zapclinic.example/treatment?a=1")).toBe(
      "https://www.zapclinic.example/favicon.ico",
    );
    expect(siteIcon("http://klinik.example/")).toBe(
      "https://klinik.example/favicon.ico",
    );
    for (const shared of [
      "https://www.instagram.com/klinik",
      "https://m.facebook.com/klinik",
      "https://wa.me/628123",
      "https://t.me/klinik",
      "https://line.me/R/ti/p/@klinik",
      "https://maps.google.com/?cid=1",
      "https://klinik.business.site/",
      "https://www.halodoc.com/klinik",
      "https://linktr.ee/klinik",
      "https://www.google.co.id/search?q=klinik",
      "https://bit.ly/klinik",
      "https://s.id/klinik",
      "https://lynk.id/klinik",
      "http://192.168.1.10/",
      "https://[2001:db8::1]/",
    ])
      expect(siteIcon(shared), shared).toBeNull();
    expect(siteIcon(null)).toBeNull();
    expect(siteIcon("ftp://klinik.example/")).toBeNull();
    expect(siteIcon("not a url")).toBeNull();
  });
});

describe("rating line", () => {
  it("writes Indonesian numbers, and says the scale when it is not 5", () => {
    expect(ratingLine({ value: 4.7, max: 5 }, 1200)).toBe(
      "Rating 4,7 · 1.200 ulasan",
    );
    expect(ratingLine({ value: 4, max: 5 }, null)).toBe("Rating 4");
    expect(ratingLine({ value: 8.5, max: 10 }, 3)).toBe(
      "Rating 8,5/10 · 3 ulasan",
    );
    expect(ratingLine(null, 40)).toBe("");
  });
});
