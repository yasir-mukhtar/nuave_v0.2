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
      "Klinik Saya",
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

describe("verdict cut", () => {
  it("keeps whole sentences up to the limit", () => {
    const a = "Kalimat pertama cukup pendek.";
    const b = "Kalimat kedua juga.";
    const long = "x".repeat(VERDICT_MAX);
    expect(verdictFromConclusion(`${a} ${b} ${long}.`)).toBe(`${a} ${b}`);
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
