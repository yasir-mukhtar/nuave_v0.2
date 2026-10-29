import { describe, expect, it } from "vitest";
import {
  normalizeForQuote,
  quotableTexts,
  quoteFound,
  quoteViolations,
  repairQuotes,
  unfoundQuoteSentences,
} from "./quote-check";
import type {
  TwoSourceReportFacts,
  TwoSourceWriterFacts,
} from "./two-source-report";
import {
  TWO_SOURCE_WRITING_VERSION,
  type AuditObservation,
  type ReportContent,
} from "./types";

/* Two questions. q1's ChatGPT answer is Markdown with an escaped "!";
 * q2's answer failed, so only its Google AI Overview and question can be
 * quoted. */
function observation(
  id: string,
  raw: string,
  run: "completed" | "failed" = "completed",
): AuditObservation {
  return {
    prompt_id: id,
    raw_answer: raw,
    run_status: run,
  } as unknown as AuditObservation;
}

const observations = [
  observation(
    "q1",
    "Untuk bekas jerawat, **Klinik Seruni** dikenal dengan *laser fraksional* dan dokter yang ramah\\! Pilihan lain: [Klinik Dua](https://dua.example).",
  ),
  observation("q2", "Jawaban gagal yang tidak boleh dikutip.", "failed"),
];

const questions = new Map([
  ["q1", "Klinik mana yang bagus untuk bekas jerawat di Depok?"],
  ["q2", "Berapa harga botox di Depok?"],
]);

const facts: TwoSourceReportFacts & { writer: TwoSourceWriterFacts } = {
  subject: "klinik",
  names: ["Klinik Aruna"],
  counts: {
    chatgpt: { completed: 1, named: 0 },
    google: { completed: 2, summaries: 1, named: 0 },
  },
  google: [
    {
      prompt_id: "q1",
      outcome: "not_shown",
      business_named: null,
      cited_domains: [],
    },
    {
      prompt_id: "q2",
      outcome: "summary",
      business_named: false,
      cited_domains: [],
    },
  ],
  writer: {
    questions: [
      {
        prompt_id: "q1",
        ordinal: 1,
        topic: "perawatan bekas jerawat",
        volume: null,
        named: { chatgpt: "absent", google: null },
        google_text: "",
        businesses: { chatgpt: ["Klinik Seruni", "Klinik Dua"], google: [] },
      },
      {
        prompt_id: "q2",
        ordinal: 2,
        topic: null,
        volume: null,
        named: { chatgpt: null, google: "absent" },
        google_text: "Harga botox di Depok mulai dari Rp1.500.000 per area.",
        businesses: { chatgpt: [], google: [] },
      },
    ],
    businesses: ["Klinik Seruni", "Klinik Dua"],
  },
};

const fallback = "Di ChatGPT, klinik Anda disebut di 0 dari 1 jawaban.";

function content(overrides: Partial<ReportContent> = {}): ReportContent {
  return {
    conclusion: "ChatGPT menyebut Klinik Seruni, bukan klinik Anda.",
    accuracy_status: "could_not_assess",
    observed_competitors: [],
    key_findings: [
      {
        title: "ChatGPT memilih Seruni untuk bekas jerawat",
        explanation:
          "Saat ditanya “Klinik mana yang bagus untuk bekas jerawat di Depok?”, ChatGPT menulis bahwa Klinik Seruni “dikenal dengan laser fraksional”.",
        evidence_prompt_ids: ["q1"],
      },
    ],
    priorities: [
      {
        order: 1,
        action: "Tulis halaman bekas jerawat",
        why: "Google menulis “harga botox di Depok mulai dari Rp1.500.000”.",
        evidence_prompt_ids: ["q2"],
      },
    ],
    details: [],
    two_source_writing: {
      version: TWO_SOURCE_WRITING_VERSION,
      verdict: "ChatGPT tidak menyebut klinik Anda.",
      competitor_reasons: [],
      takeaways: [],
      plan: [
        { weeks: "Minggu 1–2", title: "Tulis halaman", text: "Mulai." },
        { weeks: "Minggu 3–4", title: "Minta ulasan", text: "Dari pasien." },
        { weeks: "Minggu 5–8", title: "Audit ulang", text: "Sama." },
      ],
      topic_names: [],
      google_readings: [],
    },
    ...overrides,
  } as ReportContent;
}

const textsFor = (ids?: string[]) =>
  quotableTexts(ids, facts, observations, questions);

describe("Spec 023: a quotation must be the saved words it cites", () => {
  it("reads the answer without its Markdown, and any kind of quotation mark", () => {
    expect(
      normalizeForQuote("**Klinik Seruni** dikenal\\! [Dua](https://x.y)"),
    ).toBe("klinik seruni dikenal! dua");
    const texts = textsFor(["q1"]);
    expect(quoteFound("Klinik Seruni dikenal dengan laser", texts)).toBe(true);
    expect(quoteFound("dokter yang ramah!", texts)).toBe(true);
    expect(quoteFound("Pilihan lain: Klinik Dua.", texts)).toBe(true);
  });

  it("finds each piece of a cut quotation, in order", () => {
    const texts = textsFor(["q1"]);
    expect(quoteFound("Klinik Seruni […] dokter yang ramah", texts)).toBe(true);
    expect(quoteFound("Klinik Seruni ... dokter yang ramah", texts)).toBe(true);
    expect(
      quoteFound("dokter yang ramah […] Klinik Seruni dikenal", texts),
    ).toBe(false);
  });

  it("quotes only the answers, AI Overviews and questions the passage cites", () => {
    expect(quoteFound("harga botox di Depok", textsFor(["q1"]))).toBe(false);
    expect(quoteFound("harga botox di Depok", textsFor(["q2"]))).toBe(true);
    expect(quoteFound("Berapa harga botox di Depok?", textsFor(["q2"]))).toBe(
      true,
    );
    // A failed answer is not a saved answer.
    expect(quoteFound("Jawaban gagal yang", textsFor(["q2"]))).toBe(false);
    // A passage that cites nothing may quote any of them.
    expect(quoteFound("harga botox di Depok", textsFor())).toBe(true);
  });

  it("reads each text as the writer did: without phone numbers", () => {
    const withPhone = [
      observation("q1", "Hubungi Klinik Seruni di 0812-3456-7890 untuk janji."),
    ];
    expect(
      quoteFound(
        "Hubungi Klinik Seruni di [nomor telepon dihapus]",
        quotableTexts(["q1"], facts, withPhone, questions),
      ),
    ).toBe(true);
  });

  it("allows a name or a topic in quotation marks, and ignores a quoted short term", () => {
    expect(
      unfoundQuoteSentences(
        "Pertanyaan tentang “perawatan bekas jerawat” menyebut “Klinik Seruni”.",
        textsFor(["q2"]),
      ),
    ).toEqual([]);
    expect(
      unfoundQuoteSentences("Statusnya “Disebut”, bukan “Tidak disebut”.", []),
    ).toEqual([]);
  });

  it("the guide's model finding passes; a made-up quotation is listed", () => {
    expect(quoteViolations(content(), facts, observations, questions)).toEqual(
      [],
    );
    const made = content({
      key_findings: [
        {
          title: "ChatGPT memilih Seruni",
          explanation:
            "ChatGPT menyebut Klinik Seruni. Jawabannya menulis “Seruni adalah klinik terbaik di Depok”.",
          evidence_prompt_ids: ["q1"],
        },
      ],
    });
    const violations = quoteViolations(made, facts, observations, questions);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain(
      'Finding 1 paragraph: "Jawabannya menulis “Seruni adalah klinik terbaik di Depok”."',
    );
  });

  it("past the revision, drops the sentence and keeps the rest", () => {
    const made = content({
      key_findings: [
        {
          title: "ChatGPT memilih Seruni",
          explanation:
            "Jawabannya menulis “Seruni adalah klinik terbaik di Depok.” ChatGPT menyebut Klinik Seruni.",
          evidence_prompt_ids: ["q1"],
        },
      ],
    });
    const repaired = repairQuotes(
      made,
      facts,
      observations,
      questions,
      fallback,
    );
    expect(repaired.dropped).toBe(1);
    expect(repaired.content.key_findings[0]!.explanation).toBe(
      "ChatGPT menyebut Klinik Seruni.",
    );
    expect(
      repairQuotes(content(), facts, observations, questions, fallback),
    ).toEqual({ content: content(), dropped: 0 });
  });

  it("a finding emptied by a drop goes while another remains; otherwise it keeps the fallback", () => {
    const empty = {
      title: "ChatGPT memilih Seruni",
      explanation: "Jawabannya menulis “Seruni adalah klinik terbaik”.",
      evidence_prompt_ids: ["q1"],
    };
    const kept = content().key_findings[0]!;
    const two = repairQuotes(
      content({ key_findings: [empty, kept] }),
      facts,
      observations,
      questions,
      fallback,
    );
    expect(two.content.key_findings).toEqual([kept]);
    const one = repairQuotes(
      content({ key_findings: [empty] }),
      facts,
      observations,
      questions,
      fallback,
    );
    expect(one.content.key_findings).toEqual([
      { ...empty, explanation: fallback },
    ]);
  });

  it("required paragraphs get the fallback; a plan step keeps its words without the marks", () => {
    const made = content({
      conclusion: "Google menulis “Aruna klinik paling murah di Depok”.",
      priorities: [
        {
          order: 1,
          action: "Tulis halaman",
          why: "ChatGPT menulis “Aruna belum punya halaman harga”.",
          evidence_prompt_ids: ["q1"],
        },
      ],
    });
    made.two_source_writing!.plan[0]!.text =
      "Jawab “berapa harga laser di Depok”.";
    const { content: next, dropped } = repairQuotes(
      made,
      facts,
      observations,
      questions,
      fallback,
    );
    expect(dropped).toBe(3);
    expect(next.conclusion).toBe(fallback);
    expect(next.priorities[0]!.why).toBe(fallback);
    expect(next.two_source_writing!.plan[0]!.text).toBe(
      "Jawab berapa harga laser di Depok.",
    );
  });

  it("never ends a sentence inside a quotation", () => {
    expect(
      unfoundQuoteSentences(
        "Awal. ChatGPT menulis “Satu. Dua tiga empat.” Akhir.",
        [],
      ),
    ).toEqual(["ChatGPT menulis “Satu. Dua tiga empat.”"]);
  });
});
