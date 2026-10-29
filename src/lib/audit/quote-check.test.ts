import { describe, expect, it } from "vitest";
import {
  quotableTexts,
  profileWords,
  type QuotableTexts,
  quoteFound,
  quoteViolations,
  repairQuotes,
  unfoundQuoteSentences,
  withoutUnfoundQuotes,
} from "./quote-check";
import {
  repairTwoSourceWriting,
  twoSourceWritingViolations,
  type TwoSourceReportFacts,
  type TwoSourceWriterFacts,
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
const every = (t: QuotableTexts) => [
  ...t.chatgpt,
  ...t.google,
  ...t.questions,
  ...t.shared,
  ...t.pages,
];
const onlyChatGPT = (...chatgpt: string[]): QuotableTexts => ({
  chatgpt,
  google: [],
  questions: [],
  shared: [],
  pages: [],
});

describe("Spec 023: a quotation must be the saved words it cites", () => {
  it("compares words: Markdown, punctuation, dashes and quotation marks never matter", () => {
    const texts = every(textsFor(["q1"]));
    expect(quoteFound("Klinik Seruni dikenal dengan laser", texts)).toBe(true);
    expect(quoteFound("dokter yang ramah!", texts)).toBe(true);
    expect(quoteFound("Pilihan lain: Klinik Dua.", texts)).toBe(true);
    // Review round 10: nested quotation marks, a dash the dash rule turned
    // into a comma, a ChatGPT citation link and a number range.
    expect(
      quoteFound("Klinik ‘Seruni’ juga punya paket peeling", [
        'Klinik "Seruni" juga punya paket peeling.',
      ]),
    ).toBe(true);
    expect(
      quoteFound("Klinik Seruni, dokter spesialis kulit", [
        "- **Klinik Seruni** – dokter spesialis kulit.",
      ]),
    ).toBe(true);
    expect(
      quoteFound("Klinik Seruni buka setiap hari", [
        "Klinik Seruni ([seruni.id](https://seruni.id/?utm_source=chatgpt.com)) buka setiap hari citeturn0search2.",
      ]),
    ).toBe(true);
    expect(
      quoteFound("biayanya Rp7 sampai 8,5 juta", ["Biayanya Rp7–8,5 juta."]),
    ).toBe(true);
  });

  it("matches whole words only", () => {
    expect(
      quoteFound("Aruna Clinic adalah pilihan tepat", [
        "Karuna Clinic adalah pilihan tepat untuk laser.",
      ]),
    ).toBe(false);
  });

  it("finds each piece of a cut quotation, in order, in one paragraph", () => {
    const texts = every(textsFor(["q1"]));
    expect(quoteFound("Klinik Seruni […] dokter yang ramah", texts)).toBe(true);
    expect(quoteFound("Klinik Seruni ... dokter yang ramah", texts)).toBe(true);
    expect(
      quoteFound("dokter yang ramah […] Klinik Seruni dikenal", texts),
    ).toBe(false);
    // A one-word piece, more than two cuts, or pieces from two paragraphs
    // could make a new meaning.
    expect(quoteFound("Klinik Seruni […] ramah", texts)).toBe(false);
    expect(
      quoteFound("Klinik A […] adalah yang […] terbaik di […] kota ini", [
        "Klinik A adalah yang terbaik di kota ini.",
      ]),
    ).toBe(false);
    expect(
      quoteFound("Klinik Seruni bisa […] adalah yang terbaik", [
        "Klinik Seruni bisa menjadi pilihan.\n\nKlinik X adalah yang terbaik.",
      ]),
    ).toBe(false);
  });

  it("quotes only the answers, AI Overviews and questions the passage cites", () => {
    expect(quoteFound("harga botox di Depok", every(textsFor(["q1"])))).toBe(
      false,
    );
    expect(quoteFound("harga botox di Depok", every(textsFor(["q2"])))).toBe(
      true,
    );
    expect(
      quoteFound("Berapa harga botox di Depok?", every(textsFor(["q2"]))),
    ).toBe(true);
    // A failed answer is not a saved answer.
    expect(quoteFound("Jawaban gagal yang", every(textsFor(["q2"])))).toBe(
      false,
    );
    // A passage that cites nothing may quote any of them.
    expect(quoteFound("harga botox di Depok", every(textsFor()))).toBe(true);
  });

  it("words credited to ChatGPT must be in its answers, to Google in its AI Overview", () => {
    const texts = textsFor();
    expect(
      unfoundQuoteSentences(
        "Google menulis “harga botox di Depok mulai dari Rp1.500.000”.",
        texts,
      ),
    ).toEqual([]);
    expect(
      unfoundQuoteSentences(
        "ChatGPT menulis “harga botox di Depok mulai dari Rp1.500.000”.",
        texts,
      ),
    ).toHaveLength(1);
    expect(
      unfoundQuoteSentences(
        "Google menulis “Klinik Seruni dikenal dengan laser fraksional”.",
        texts,
      ),
    ).toHaveLength(1);
  });

  it("reads each text as the writer did: without phone numbers", () => {
    const withPhone = [
      observation("q1", "Hubungi Klinik Seruni di 0812-3456-7890 untuk janji."),
    ];
    expect(
      quoteFound(
        "Hubungi Klinik Seruni di [nomor telepon dihapus]",
        every(quotableTexts(["q1"], facts, withPhone, questions)),
      ),
    ).toBe(true);
  });

  it("allows a name, a topic or a label in quotation marks, and ignores one quoted word", () => {
    expect(
      unfoundQuoteSentences(
        "Pertanyaan tentang “perawatan bekas jerawat” menyebut “Klinik Seruni”, dengan status “Tidak disebut”.",
        textsFor(["q2"]),
      ),
    ).toEqual([]);
    expect(
      unfoundQuoteSentences("Statusnya “Disebut”.", onlyChatGPT()),
    ).toEqual([]);
    // Two words are a quotation: "pilihan terbaik" is in no answer.
    expect(
      unfoundQuoteSentences(
        "ChatGPT menyebut Aruna “pilihan terbaik”.",
        textsFor(),
      ),
    ).toHaveLength(1);
  });

  it("reads every kind of quotation mark, and never an inch mark or an apostrophe", () => {
    const texts = onlyChatGPT("Klinik Seruni dikenal dengan laser.");
    for (const sentence of [
      "ChatGPT menulis 'Aruna adalah klinik paling direkomendasikan'.",
      'ChatGPT menulis “Aruna adalah klinik paling direkomendasikan".',
      "ChatGPT menulis ‘Aruna adalah klinik paling direkomendasikan’.",
      'ChatGPT menulis "Aruna adalah klinik paling direkomendasikan".',
    ])
      expect(unfoundQuoteSentences(sentence, texts)).toEqual([sentence]);
    expect(
      unfoundQuoteSentences(
        'Alat laser 5" dipakai hari Jum\'at, bukan alat 7" yang lama.',
        texts,
      ),
    ).toEqual([]);
  });

  it("counts quotation marks inside a quotation, so the rest is still checked", () => {
    const texts = onlyChatGPT('Klinik "Seruni" dikenal dengan laser.');
    for (const sentence of [
      'ChatGPT menulis “Klinik "Seruni" adalah klinik terbaik dan termurah di Depok”.',
      'ChatGPT menulis "Klinik "Seruni" adalah klinik terbaik dan termurah di Depok".',
      "ChatGPT menulis “Klinik “Seruni” adalah klinik terbaik dan termurah di Depok”.",
      'ChatGPT menulis “Klinik Seruni adalah klinik terbaik dan termurah di Depok".',
    ])
      expect(unfoundQuoteSentences(sentence, texts)).toEqual([sentence]);
    expect(
      unfoundQuoteSentences(
        'ChatGPT menulis “Klinik "Seruni" dikenal dengan laser”.',
        texts,
      ),
    ).toEqual([]);
    // A suffix after a closing mark never joins two quotations.
    expect(
      unfoundQuoteSentences(
        "Nama “Klinik Seruni”nya ada, dan ChatGPT menulis “dikenal dengan laser”.",
        onlyChatGPT("Klinik Seruni dikenal dengan laser."),
      ),
    ).toEqual([]);
  });

  it("allows the confirmed profile's names in any sentence, and a question only where the sentence speaks of it", () => {
    const profile = profileWords({
      services: [{ name: "Acne Peeling", source: "owner" }],
      logo: "data:image/png;base64,AAAA",
    });
    expect(profile).toEqual(["Acne Peeling", "owner"]);
    const texts = quotableTexts(
      ["q1"],
      facts,
      observations,
      questions,
      profile,
    );
    expect(
      unfoundQuoteSentences(
        "ChatGPT tidak menyebut layanan “Acne Peeling” milik Aruna.",
        texts,
      ),
    ).toEqual([]);
    expect(
      unfoundQuoteSentences(
        "Saat ditanya “Klinik mana yang bagus untuk bekas jerawat di Depok?”, ChatGPT menyebut Seruni.",
        texts,
      ),
    ).toEqual([]);
    expect(
      unfoundQuoteSentences(
        "ChatGPT menulis “klinik mana yang bagus untuk bekas jerawat”.",
        texts,
      ),
    ).toHaveLength(1);
  });

  it("ends a sentence at 'dll.' or 'vitamin C.' before a capital, never at 'dr.'", () => {
    for (const first of [
      "Krim ini mengandung vitamin C.",
      "Ada laser, peeling, dll.",
    ])
      expect(
        withoutUnfoundQuotes(
          `${first} ChatGPT menulis “Aruna adalah klinik terbaik”. Seruni disebut.`,
          onlyChatGPT(),
        ).text,
      ).toBe(`${first} Seruni disebut.`);
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

  it("never ends a sentence inside a quotation or after an abbreviation", () => {
    expect(
      unfoundQuoteSentences(
        "Awal. ChatGPT menulis “Satu. Dua tiga empat.” Akhir.",
        onlyChatGPT(),
      ),
    ).toEqual(["ChatGPT menulis “Satu. Dua tiga empat.”"]);
    expect(
      withoutUnfoundQuotes(
        "ChatGPT menyebut dr. Rina sebagai “dokter terbaik se-Depok untuk jerawat”. Aruna tidak disebut dalam jawaban itu.",
        onlyChatGPT(),
      ).text,
    ).toBe("Aruna tidak disebut dalam jawaban itu.");
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

  it("a finding or recommendation emptied by a drop goes while another remains", () => {
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

    const keptAction = content().priorities[0]!;
    const priorities = repairQuotes(
      content({
        priorities: [
          {
            order: 1,
            action: "Tulis halaman harga",
            why: "ChatGPT menulis “Aruna belum punya halaman harga”.",
            evidence_prompt_ids: ["q1"],
          },
          { ...keptAction, order: 2 },
        ],
      }),
      facts,
      observations,
      questions,
      fallback,
    );
    expect(priorities.content.priorities).toEqual([keptAction]);
  });

  it("a lone recommendation keeps the fallback; a plan step keeps its words without the marks; a failed caption drops its headline", () => {
    const made = content({
      conclusion: "Google menulis “Aruna klinik paling murah di Depok”.",
      key_findings: [
        {
          ...content().key_findings[0]!,
          headline: {
            number: "1",
            caption: "jawaban yang menulis “Aruna paling murah”",
            basis: "chatgpt_named",
          },
        } as ReportContent["key_findings"][number],
      ],
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
    expect(dropped).toBe(4);
    expect(next.conclusion).toBe(fallback);
    expect(next.key_findings[0]!.headline).toBeUndefined();
    expect(next.priorities[0]!.why).toBe(fallback);
    expect(next.two_source_writing!.plan[0]!.text).toBe(
      "Jawab berapa harga laser di Depok.",
    );
  });
});

describe("the quotation repair runs before the source repair", () => {
  it("a finding a drop leaves without its source is still repaired", () => {
    const made = content({
      key_findings: [
        {
          title: "Bekas jerawat jatuh ke Seruni",
          explanation:
            "ChatGPT menulis “Seruni adalah klinik terbaik untuk semua jenis jerawat”. Aruna tidak disebut dalam jawaban itu.",
          evidence_prompt_ids: ["q1"],
        },
      ],
    });
    expect(twoSourceWritingViolations(made, facts)).toEqual([]);
    const quoted = repairQuotes(made, facts, observations, questions, fallback);
    expect(twoSourceWritingViolations(quoted.content, facts)).not.toEqual([]);
    const repaired = repairTwoSourceWriting(quoted.content, facts);
    expect(twoSourceWritingViolations(repaired.content, facts)).toEqual([]);
  });
});
