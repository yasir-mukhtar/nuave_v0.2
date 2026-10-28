import { describe, expect, it } from "vitest";
import type {
  TwoSourceReportFacts,
  TwoSourceWriterFacts,
} from "./two-source-report";
import {
  captionFitsBasis,
  cutVerdict,
  dashViolations,
  finishTwoSourceWriting,
  repairDashes,
  saveableTwoSourceWriting,
  headlineConfirmed,
  partBWritingViolations,
} from "./two-source-writing";
import {
  TWO_SOURCE_WRITING_VERSION,
  twoSourceWritingSynthesisSchema,
  reportSynthesisSchema,
  type AuditObservation,
  type HeadlineBasis,
  type ReportContent,
} from "./types";
import { zodTextFormat } from "openai/helpers/zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

/* Four questions:
 * q1: ChatGPT named and recommended; Google named (cited reference a.example).
 * q2: ChatGPT absent (cites b.example, c.example, names Klinik Satu, Klinik
 *     Dua); Google summary without the name (cites d.example).
 * q3: ChatGPT absent; Google cited the site only. Answer says "75+ cabang".
 * q4: ChatGPT failed; Google showed no AI Overview. */
const ids = ["q1", "q2", "q3", "q4"];

function observation(
  id: string,
  raw: string,
  sources: string[],
  run: "completed" | "failed" = "completed",
): AuditObservation {
  return {
    prompt_id: id,
    question: `Pertanyaan ${id}?`,
    raw_answer: raw,
    run_status: run,
    sources: sources.map((url) => ({ url, title: url })),
  } as unknown as AuditObservation;
}

const observations = [
  observation("q1", "Klinik Fiksi direkomendasikan.", ["https://a.example/x"]),
  observation("q2", "Klinik Satu dan Klinik Dua.", [
    "https://b.example/1",
    "https://www.c.example/2",
  ]),
  observation("q3", "Klinik Satu punya 75+ cabang.", []),
  observation("q4", "", [], "failed"),
];

const facts: TwoSourceReportFacts & { writer: TwoSourceWriterFacts } = {
  subject: "klinik",
  names: ["Klinik Fiksi"],
  counts: {
    chatgpt: { completed: 3, named: 1 },
    google: { completed: 3, summaries: 3, named: 1 },
  },
  google: [
    {
      prompt_id: "q1",
      outcome: "summary",
      business_named: true,
      cited_domains: ["a.example"],
    },
    {
      prompt_id: "q2",
      outcome: "summary",
      business_named: false,
      cited_domains: ["d.example"],
    },
    {
      prompt_id: "q3",
      outcome: "summary",
      business_named: false,
      cited_domains: ["fiksi.example"],
    },
    {
      prompt_id: "q4",
      outcome: "not_shown",
      business_named: null,
      cited_domains: [],
    },
  ],
  writer: {
    questions: [
      {
        prompt_id: "q1",
        ordinal: 1,
        topic: "botox",
        volume: 900,
        named: { chatgpt: "named", google: "named" },
        google_text: "Klinik Fiksi.",
        businesses: { chatgpt: [], google: [] },
      },
      {
        prompt_id: "q2",
        ordinal: 2,
        topic: null,
        volume: null,
        named: { chatgpt: "absent", google: "absent" },
        google_text: "Klinik Dua.",
        businesses: {
          chatgpt: ["Klinik Satu", "Klinik Dua"],
          google: ["Klinik Dua"],
        },
      },
      {
        prompt_id: "q3",
        ordinal: 3,
        topic: null,
        volume: null,
        named: { chatgpt: "absent", google: "source_only" },
        google_text: "Ringkasan.",
        businesses: { chatgpt: ["Klinik Satu"], google: [] },
      },
      {
        prompt_id: "q4",
        ordinal: 4,
        topic: "flek",
        volume: null,
        named: { chatgpt: null, google: null },
        google_text: "",
        businesses: { chatgpt: [], google: [] },
      },
    ],
    businesses: ["Klinik Satu", "Klinik Dua"],
  },
};

function detail(
  id: string,
  appearance: string,
  recommendation: string,
  run = "completed",
) {
  return {
    prompt_id: id,
    run,
    appearance,
    recommendation,
    comparison: "not_observed",
    information: "not_assessed",
    finding: "",
    answer_excerpt: "",
    evidence_note: "",
    source_urls: [],
  };
}

function content(overrides: Partial<ReportContent> = {}): ReportContent {
  return {
    conclusion: "Di ChatGPT, klinik Anda disebut di 1 dari 3 jawaban.",
    accuracy_status: "could_not_assess",
    observed_competitors: [],
    key_findings: [
      {
        title: "Google memakai situs Anda tanpa nama",
        explanation: "Di Google AI Overview, situs Anda dikutip tanpa nama.",
        evidence_prompt_ids: ["q2", "q3"],
      },
    ],
    priorities: [
      {
        order: 1,
        action: "Tulis halaman botox",
        why: "Satu halaman per treatment.",
        evidence_prompt_ids: ["q2"],
      },
      {
        order: 2,
        action: "Minta ulasan pasien",
        why: "Ulasan membantu.",
        evidence_prompt_ids: ["q3"],
      },
    ],
    details: [
      detail("q1", "mentioned", "recommended"),
      detail("q2", "absent", "not_assessed"),
      detail("q3", "absent", "not_assessed"),
      detail("q4", "not_assessed", "not_assessed", "failed"),
    ],
    two_source_writing: {
      version: TWO_SOURCE_WRITING_VERSION,
      verdict: "Di ChatGPT, klinik Anda disebut di 1 dari 3 jawaban.",
      competitor_reasons: [],
      takeaways: [],
      plan: [
        {
          weeks: "Minggu 1–2",
          title: "Tulis halaman",
          text: "Mulai dari botox.",
        },
        { weeks: "Minggu 3–4", title: "Minta ulasan", text: "Dari pasien." },
        { weeks: "Minggu 5–8", title: "Audit ulang", text: "Sama." },
      ],
      topic_names: [],
      google_readings: [{ prompt_id: "q1", recommended: true }],
    },
    ...overrides,
  } as ReportContent;
}

const confirmed = (
  number: string,
  basis: HeadlineBasis,
  cited = ["q2", "q3"],
) =>
  headlineConfirmed({ number, basis }, cited, content(), facts, observations);

describe("headline numbers, checked by their basis (B-05)", () => {
  it("'X dari Y' over the cited questions counts only the named fact", () => {
    // q2 and q3: ChatGPT named neither; Google cited the site only in q3.
    expect(confirmed("0 dari 2", "chatgpt_named")).toBe(true);
    expect(confirmed("2 dari 2", "chatgpt_not_named")).toBe(true);
    expect(confirmed("1 dari 2", "google_cited_only")).toBe(true);
    // The complement of a fact is not that fact.
    expect(confirmed("2 dari 2", "chatgpt_named")).toBe(false);
    expect(confirmed("0 dari 2", "chatgpt_not_named")).toBe(false);
    expect(confirmed("1 dari 4", "chatgpt_named")).toBe(false);
  });

  it("'X dari Y' over a source's completed checks", () => {
    // ChatGPT named the business in 1 of 3 answers; Google in 1 of 3
    // summaries; Google showed an AI Overview for 3 of 3 checks.
    expect(confirmed("1 dari 3", "chatgpt_named")).toBe(true);
    expect(confirmed("2 dari 3", "chatgpt_not_named")).toBe(true);
    expect(confirmed("1 dari 3", "google_named")).toBe(true);
    expect(confirmed("3 dari 3", "google_shown")).toBe(true);
    expect(confirmed("2 dari 3", "chatgpt_named")).toBe(false);
    expect(confirmed("7 dari 10", "google_named")).toBe(false);
  });

  it("'N' or 'N×' for the cited questions with the fact", () => {
    expect(confirmed("2×", "chatgpt_not_named")).toBe(true);
    expect(confirmed("1×", "google_cited_only")).toBe(true);
    expect(confirmed("2×", "google_cited_only")).toBe(false);
    expect(confirmed("0", "chatgpt_named")).toBe(false);
  });

  it("domains and businesses in the cited answers, per source or both", () => {
    expect(confirmed("2", "chatgpt_cited_domains")).toBe(true); // b, c
    expect(confirmed("2", "google_cited_domains")).toBe(true); // d, fiksi
    expect(confirmed("4", "cited_domains")).toBe(true);
    expect(confirmed("4", "chatgpt_cited_domains")).toBe(false);
    expect(confirmed("2", "chatgpt_named_businesses")).toBe(true);
    expect(confirmed("1", "google_named_businesses")).toBe(true);
    expect(confirmed("2", "named_businesses")).toBe(true);
    expect(confirmed("3", "named_businesses")).toBe(false);
  });

  it("verbatim: a whole token of a cited answer, never part of a longer number", () => {
    expect(confirmed("75+", "verbatim")).toBe(true);
    expect(confirmed("75+", "verbatim", ["q1"])).toBe(false);
    expect(confirmed("75", "verbatim")).toBe(true);
    expect(confirmed("7", "verbatim")).toBe(false);
    const priced = [
      observation("q2", "Harga mulai Rp 250.000 per sesi.", []),
      ...observations.slice(2),
    ];
    const check = (number: string) =>
      headlineConfirmed(
        { number, basis: "verbatim" },
        ["q2"],
        content(),
        facts,
        priced,
      );
    expect(check("250.000")).toBe(true);
    expect(check("2")).toBe(false);
    expect(check("000")).toBe(false);
    expect(check("250")).toBe(false);
  });

  it("verbatim: a figure from a page read (the business's own, or one a cited question's answer cited)", () => {
    const withPages = {
      ...facts,
      writer: {
        ...facts.writer,
        pages: [
          {
            url: "https://fiksi.example/",
            domain: "fiksi.example",
            title: "",
            kind: "own" as const,
            cited_in: [],
            text: "Kami punya 120 dokter.",
          },
          {
            url: "https://hadirr.com/a",
            domain: "hadirr.com",
            title: "",
            kind: "cited" as const,
            cited_in: ["q4"],
            text: "Daftar 37 klinik.",
          },
        ],
      },
    };
    const check = (number: string) =>
      headlineConfirmed(
        { number, basis: "verbatim" },
        ["q2"],
        content(),
        withPages,
        observations,
      );
    expect(check("120")).toBe(true);
    // A page cited only by a question the finding does not cite.
    expect(check("37")).toBe(false);
    // The same page, when the finding cites the question that cited it.
    expect(
      headlineConfirmed(
        { number: "37", basis: "verbatim" },
        ["q2", "q4"],
        content(),
        withPages,
        observations,
      ),
    ).toBe(true);
  });

  it("verbatim: two figures side by side, each a token of a cited answer", () => {
    expect(confirmed("2 vs 75+", "verbatim")).toBe(false);
    const two = [
      observation("q2", "Ada 70 cabang.", []),
      observation("q3", "Klinik Satu punya 75+ cabang.", []),
    ];
    expect(
      headlineConfirmed(
        { number: "70 vs 75+", basis: "verbatim" },
        ["q2", "q3"],
        content(),
        facts,
        two,
      ),
    ).toBe(true);
    expect(confirmed("banyak", "verbatim")).toBe(false);
  });
});

describe("the one revision is asked to fix the new fields (B-04, B-06)", () => {
  it("a clean draft has no violation; a report without the block is not checked", () => {
    expect(partBWritingViolations(content())).toEqual([]);
    const { two_source_writing, ...old } = content({
      key_findings: [
        {
          title: "Pastikan profil",
          explanation: "x",
          evidence_prompt_ids: ["q1"],
        },
      ],
    });
    void two_source_writing;
    expect(partBWritingViolations(old as ReportContent)).toEqual([]);
  });

  it("names each banned title start, the over-long verdict and a label", () => {
    const draft = content({
      key_findings: [
        {
          title: "Periksa profil Google",
          explanation: "Mengapa: karena.",
          evidence_prompt_ids: ["q2"],
        },
      ],
      priorities: [
        {
          order: 1,
          action: "Pastikan profil lengkap",
          why: "x",
          evidence_prompt_ids: ["q2"],
        },
        {
          order: 2,
          action: "pertimbangkan iklan",
          why: "x",
          evidence_prompt_ids: ["q2"],
        },
      ],
    });
    draft.two_source_writing!.verdict = "Satu. Dua. Tiga.";
    draft.two_source_writing!.plan[0]!.title = "Pertahankan ulasan";
    const violations = partBWritingViolations(draft).join("\n");
    expect(violations).toMatch(/Finding 1 title starts with/);
    expect(violations).toMatch(/Recommendation 1 title starts with/);
    expect(violations).toMatch(/Recommendation 2 title starts with/);
    expect(violations).toMatch(/Plan step 1 title starts with/);
    expect(violations).toMatch(/verdict must be at most 2 sentences/);
    expect(violations).toMatch(/"Mengapa:" or "Berdasarkan:" label/);
  });

  it("names a paragraph over its word limit", () => {
    const long = Array.from({ length: 101 }, () => "kata").join(" ");
    const violations = partBWritingViolations(
      content({
        priorities: [
          {
            order: 1,
            action: "Tulis halaman",
            why: long,
            evidence_prompt_ids: ["q2"],
          },
        ],
      }),
    );
    expect(violations).toContain(
      "Recommendation 1 paragraph has 101 words; the limit is 100.",
    );
  });
});

describe("after the revision, code finishes the block (B-04 to B-06)", () => {
  it("removes a banned start, drops an unconfirmed headline and cuts the verdict", () => {
    const draft = content({
      key_findings: [
        {
          title: "Periksa situs Anda",
          explanation: "Di Google AI Overview, situs Anda dikutip.",
          evidence_prompt_ids: ["q2", "q3"],
          headline: {
            number: "9 dari 2",
            caption: "salah",
            basis: "chatgpt_named",
          },
        },
        {
          title: "Klinik lain disebut",
          explanation: "Di ChatGPT, dua klinik lain disebut.",
          evidence_prompt_ids: ["q2", "q3"],
          headline: {
            number: "2",
            caption: "klinik lain",
            basis: "chatgpt_named_businesses",
          },
        },
      ],
      priorities: [
        {
          order: 1,
          action: "Pastikan: profil Google lengkap",
          why: "Berdasarkan: ulasan.",
          evidence_prompt_ids: ["q2"],
        },
      ],
    });
    draft.two_source_writing!.verdict = `Satu kalimat. Dua kalimat. Tiga kalimat.`;
    const { content: out, diagnostics } = finishTwoSourceWriting(
      draft,
      facts,
      observations,
    );
    expect(out.key_findings[0]!.title).toBe("Situs Anda");
    expect(out.key_findings[0]!.headline).toBeUndefined();
    expect(out.key_findings[1]!.headline).toEqual({
      number: "2",
      caption: "klinik lain",
      basis: "chatgpt_named_businesses",
    });
    expect(out.priorities[0]!.action).toBe("Profil Google lengkap");
    expect(out.priorities[0]!.why).toBe("ulasan.");
    expect(out.two_source_writing!.verdict).toBe("Satu kalimat. Dua kalimat.");
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        "banned_title_repaired",
        "headline_dropped",
        "verdict_cut",
      ]),
    );
  });

  it("keeps only reasons, topic names and readings it can place", () => {
    const draft = content();
    draft.two_source_writing = {
      ...draft.two_source_writing!,
      competitor_reasons: [
        { name: "klinik  satu", reason: "ChatGPT menyebut dokternya." },
        { name: "Klinik Satu", reason: "dua kali" },
        { name: "Klinik Hantu", reason: "tidak ada di daftar" },
      ],
      topic_names: [
        { prompt_id: "q2", topic: "Bekas jerawat" },
        { prompt_id: "q1", topic: "Sudah punya topik" },
        { prompt_id: "q3", topic: "Pertanyaan q3?" },
        { prompt_id: "q9", topic: "Tidak ada" },
      ],
      google_readings: [
        { prompt_id: "q1", recommended: true },
        { prompt_id: "q2", recommended: true },
      ],
    };
    const { content: out } = finishTwoSourceWriting(draft, facts, observations);
    expect(out.two_source_writing!.competitor_reasons).toEqual([
      { name: "Klinik Satu", reason: "ChatGPT menyebut dokternya." },
    ]);
    expect(out.two_source_writing!.topic_names).toEqual([
      { prompt_id: "q2", topic: "Bekas jerawat" },
    ]);
    expect(out.two_source_writing!.google_readings).toEqual([
      { prompt_id: "q1", recommended: true },
    ]);
  });

  it("drops a recommendation that cites no gap, and renumbers; with no gap anywhere, any question passes", () => {
    const draft = content({
      priorities: [
        {
          order: 1,
          action: "Tulis halaman",
          why: "x",
          evidence_prompt_ids: ["q1"],
        },
        {
          order: 2,
          action: "Minta ulasan",
          why: "x",
          evidence_prompt_ids: ["q3"],
        },
      ],
    });
    const { content: out } = finishTwoSourceWriting(draft, facts, observations);
    // q1: named and recommended by both sources, so not a gap.
    expect(out.priorities.map((p) => [p.order, p.action])).toEqual([
      [1, "Minta ulasan"],
    ]);

    const allNamed: typeof facts = {
      ...facts,
      google: facts.google.map((g) => ({
        ...g,
        outcome: "not_shown",
        business_named: null,
      })),
    };
    const noGaps = content({
      details: ids.map((id) =>
        detail(id, "mentioned", "recommended"),
      ) as ReportContent["details"],
      priorities: [
        {
          order: 1,
          action: "Tulis halaman",
          why: "x",
          evidence_prompt_ids: ["q1"],
        },
      ],
    });
    expect(
      finishTwoSourceWriting(noGaps, allNamed, observations).content.priorities,
    ).toHaveLength(1);
  });

  it("drops a headline outside the saved bounds, so the page never refuses the report", () => {
    const draft = content({
      key_findings: [
        {
          title: "Dua klinik lain",
          explanation: "Di ChatGPT, dua klinik lain disebut.",
          evidence_prompt_ids: ["q2", "q3"],
          headline: {
            number: "2",
            caption: "  ",
            basis: "chatgpt_named_businesses",
          },
        },
        {
          title: "Dua klinik lain lagi",
          explanation: "Di ChatGPT, dua klinik lain disebut.",
          evidence_prompt_ids: ["q2", "q3"],
          headline: {
            number: "2",
            caption: "k".repeat(161),
            basis: "chatgpt_named_businesses",
          },
        },
      ],
    });
    const { content: out } = finishTwoSourceWriting(draft, facts, observations);
    expect(out.key_findings.map((f) => f.headline)).toEqual([
      undefined,
      undefined,
    ]);
  });

  it("keeps the writer's recommendations whole rather than leave none", () => {
    const draft = content({
      priorities: [
        {
          order: 1,
          action: "Tulis halaman",
          why: "x",
          evidence_prompt_ids: ["q1"],
        },
      ],
    });
    const { content: out, diagnostics } = finishTwoSourceWriting(
      draft,
      facts,
      observations,
    );
    expect(out.priorities).toHaveLength(1);
    expect(diagnostics).not.toContain("unsupported_priority_removed");
  });

  it("a caption must say what its basis counts", () => {
    const fits = (caption: string, basis: HeadlineBasis) =>
      captionFitsBasis({ caption, basis });
    expect(fits("pertanyaan yang menyebut Klinik Anda", "chatgpt_named")).toBe(
      true,
    );
    expect(
      fits("pertanyaan yang menyebut Klinik Anda", "chatgpt_not_named"),
    ).toBe(false);
    expect(
      fits("jawaban yang tidak menyebut Klinik Anda", "chatgpt_not_named"),
    ).toBe(true);
    expect(
      fits("jawaban yang tidak menyebut Klinik Anda", "chatgpt_named"),
    ).toBe(false);
    expect(fits("pertanyaan tanpa AI Overview", "google_not_shown")).toBe(true);
    expect(fits("belum disebut sumber mana pun", "named_by_neither")).toBe(
      true,
    );
    // A cited-only caption may say "tanpa menyebut nama".
    expect(
      fits(
        "blog Anda dikutip Google, tanpa menyebut nama",
        "google_cited_only",
      ),
    ).toBe(true);
    // Counts of domains or businesses, and verbatim figures, are not checked.
    expect(fits("sumber pihak ketiga", "cited_domains")).toBe(true);
    expect(fits("cabang, belum termasuk mitra", "verbatim")).toBe(true);

    const draft = content({
      key_findings: [
        {
          title: "Dua jawaban",
          explanation: "Di ChatGPT, dua jawaban.",
          evidence_prompt_ids: ["q2", "q3"],
          headline: {
            number: "2 dari 2",
            caption: "jawaban yang menyebut Klinik Anda",
            basis: "chatgpt_not_named",
          },
        },
      ],
    });
    expect(
      finishTwoSourceWriting(draft, facts, observations).content
        .key_findings[0]!.headline,
    ).toBeUndefined();
  });

  it("a report that would fail the saved schema is saved without the new block", () => {
    // A saved report holds ten answers.
    const ten = [
      ...content().details,
      ...["q5", "q6", "q7", "q8", "q9", "q10"].map((id) =>
        detail(id, "absent", "not_assessed"),
      ),
    ] as ReportContent["details"];
    const fine = content({ details: ten });
    expect(saveableTwoSourceWriting(fine)).toEqual({
      content: fine,
      dropped: false,
    });
    const broken = content({
      details: ten,
      key_findings: [
        {
          title: "x",
          explanation: "y",
          evidence_prompt_ids: ["q2"],
          headline: { number: "", caption: "", basis: "verbatim" },
        },
      ],
    });
    const { content: out, dropped } = saveableTwoSourceWriting(broken);
    expect(dropped).toBe(true);
    expect(out.two_source_writing).toBeUndefined();
    expect(out.key_findings[0]).not.toHaveProperty("headline");
    expect(out.conclusion).toBe(broken.conclusion);
  });

  it("cuts a verdict to two sentences and 220 characters", () => {
    expect(cutVerdict("Satu. Dua. Tiga.")).toBe("Satu. Dua.");
    const long = `${"kata ".repeat(60).trim()}.`;
    expect(cutVerdict(long).length).toBeLessThanOrEqual(220);
    expect(cutVerdict(long).endsWith("…")).toBe(true);
  });
});

describe("answer shapes (B-04)", () => {
  it("the new writer's schema is valid for OpenAI strict mode: every field required", () => {
    const format = zodTextFormat(
      twoSourceWritingSynthesisSchema,
      "nuave_audit_report",
    );
    const walk = (node: unknown): void => {
      if (!node || typeof node !== "object") return;
      const schema = node as {
        type?: string;
        properties?: Record<string, unknown>;
        required?: string[];
      };
      if (schema.type === "object" && schema.properties)
        expect(new Set(schema.required)).toEqual(
          new Set(Object.keys(schema.properties)),
        );
      Object.values(schema).forEach(walk);
    };
    walk(format.schema);
  });

  it("older writers' answer shape still requires every priority field", () => {
    const priority = reportSynthesisSchema.shape.priorities.element;
    expect(
      priority.safeParse({
        order: 1,
        action: "a",
        why: "b",
        evidence_prompt_ids: ["q1"],
      }).success,
    ).toBe(false);
  });
});

describe("Spec 023 R-11: dashes (AC-04)", () => {
  const withDashes = content({
    conclusion: "ChatGPT mengenal Klinik Fiksi — tetapi belum untuk botox.",
    key_findings: [
      {
        title: "Google memakai situs Anda - tanpa nama",
        explanation: "Ringkasan AI Google mengutip Klinik Satu - Cabang Dago.",
        evidence_prompt_ids: ["q2", "q3"],
        headline: { number: "1-2", caption: "pertanyaan", basis: "verbatim" },
      },
    ],
  });
  const dashFacts = {
    ...facts,
    writer: { ...facts.writer, businesses: ["Klinik Satu - Cabang Dago"] },
  };

  it("lists a dash used as punctuation, never one inside a business name", () => {
    const listed = dashViolations(withDashes, dashFacts);
    expect(listed.join(" ")).toContain("The conclusion uses a dash");
    expect(listed.join(" ")).toContain("Finding 1 title uses a dash");
    expect(listed.join(" ")).not.toContain("Finding 1 paragraph");
  });

  it("replaces them with a comma, and leaves names, headline numbers and week labels alone", () => {
    const { content: fixed, changed } = repairDashes(withDashes, dashFacts);
    expect(changed).toBe(true);
    expect(fixed.conclusion).toBe(
      "ChatGPT mengenal Klinik Fiksi, tetapi belum untuk botox.",
    );
    expect(fixed.key_findings[0]!.title).toBe(
      "Google memakai situs Anda, tanpa nama",
    );
    expect(fixed.key_findings[0]!.explanation).toBe(
      "Ringkasan AI Google mengutip Klinik Satu - Cabang Dago.",
    );
    expect(fixed.key_findings[0]!.headline!.number).toBe("1-2");
    expect(fixed.two_source_writing!.plan[0]!.weeks).toBe("Minggu 1–2");
    // Nothing to change: the same object back.
    expect(repairDashes(fixed, dashFacts).changed).toBe(false);
  });

  it("turns a dash between two numbers into 'sampai', never a list", () => {
    const ranges = content({
      conclusion:
        "Harga di situs Rp250.000 - Rp500.000 per sesi. Klinik buka 08.00 – 21.00.",
    });
    expect(repairDashes(ranges, dashFacts).content.conclusion).toBe(
      "Harga di situs Rp250.000 sampai Rp500.000 per sesi. Klinik buka 08.00 sampai 21.00.",
    );
  });
});

describe("Spec 023 R-08: the storyline (AC-05)", () => {
  it("is the answer's first property, with no bounds a provider could move", () => {
    expect(Object.keys(twoSourceWritingSynthesisSchema.shape)[0]).toBe(
      "storyline",
    );
    const format = zodTextFormat(
      twoSourceWritingSynthesisSchema,
      "nuave_audit_report",
    ) as unknown as {
      schema: { properties: Record<string, unknown> };
    };
    expect(Object.keys(format.schema.properties)[0]).toBe("storyline");
    const claude = zodOutputFormat(
      twoSourceWritingSynthesisSchema,
    ) as unknown as {
      schema: {
        properties: {
          storyline: { properties: { support: Record<string, unknown> } };
        };
      };
    };
    expect(Object.keys(claude.schema.properties)[0]).toBe("storyline");
    const support = claude.schema.properties.storyline.properties.support;
    expect(support).not.toHaveProperty("minItems");
    expect(support).not.toHaveProperty("maxItems");
  });
});
