/**
 * Spec 024 Part 0 "Fixtures" (plan §8.1): synthetic saved reports for the
 * designed PDF. Every name, site, answer and number here is invented; no
 * real order's data is used. A fixture longer than the saved maxima is
 * allowed and expected (the maximum fixture is over every budget).
 *
 * Never imported by product code: tests, the e2e print check and the local
 * print script read it.
 */
import { presentationFixture } from "@/lib/audit/report-presentation.fixture";
import {
  DIRECT_TEN_CONTEXT_VERSION,
  type DirectTenAuditContext,
} from "@/lib/audit/direct-ten-context-v2";
import type { SavedReportData } from "@/lib/audit/customer-evidence-export";
import { words } from "@/lib/audit/two-source-writing";
import {
  TWO_SOURCE_REPORT_VERSION,
  googleCoverageFinding,
  type ReportSubject,
  type TwoSourceQuestion,
  type TwoSourceReport,
} from "@/lib/audit/two-source-report";
import {
  TWO_SOURCE_WRITING_VERSION,
  type AuditObservation,
  type AuditReport,
} from "@/lib/audit/types";

const FILLER = [
  "Jawaban contoh ini dibuat untuk menguji tata letak laporan",
  "setiap kalimat berisi kata biasa tanpa data nyata",
  "panjang teks diatur oleh pengujian dan bukan oleh pesanan",
  "halaman harus memuat semua kata tanpa memotongnya",
  "angka di sini tidak berasal dari bisnis mana pun",
];

/** Exactly `n` words (by the writer's `words()`), in sentences of about
 * nine words, each ending with a full stop. */
export function textOfWords(n: number, seed = 0): string {
  const out: string[] = [];
  let sentence: string[] = [];
  let count = 0;
  let i = seed;
  while (count < n) {
    const pool = FILLER[i % FILLER.length]!.split(" ");
    for (const word of pool) {
      if (count >= n) break;
      sentence.push(word);
      count += 1;
    }
    i += 1;
    out.push(sentence.join(" ").replace(/^./, (c) => c.toUpperCase()) + ".");
    sentence = [];
  }
  const text = out.join(" ");
  if (words(text) !== n) throw new Error(`textOfWords(${n}) is ${words(text)}`);
  return text;
}

export type FixtureOptions = {
  name?: string;
  aliases?: string[];
  subject?: ReportSubject;
  place?: string;
  /** Ordinals (1 to 10) per state. */
  chatgptNamed?: number[];
  chatgptRecommended?: number[];
  chatgptCited?: number[];
  chatgptFailed?: number[];
  googleNamed?: number[];
  googleCited?: number[];
  googleNotShown?: number[];
  googleFailed?: number[];
  searchData?: boolean;
  /** Words of every ChatGPT and Google answer. */
  chatgptWords?: number;
  googleWords?: number;
  /** ChatGPT sources cited by question 1's answer. */
  sources?: number;
  /** Question 2's ChatGPT answer holds a markdown table. */
  table?: boolean;
  /** Other businesses named in the answers. */
  otherBusinesses?: number;
  /** Question 3's answers name no business at all. */
  answerWithoutBusiness?: boolean;
  findings?: number;
  recommendations?: number;
  findingWords?: number;
  findingTitleWords?: number;
  recommendationWords?: number;
  recommendationTitleWords?: number;
  conclusionWords?: number;
  planWords?: number;
  /** False: a report written before Spec 021 Part B (no writer block). */
  writing?: boolean;
  synthetic?: boolean;
  checkedTo?: string;
};

const has = (list: number[] | undefined, ordinal: number) =>
  Boolean(list?.includes(ordinal));

function businessNames(n: number): string[] {
  return Array.from(
    { length: n },
    (_, i) => `Klinik Contoh ${String.fromCharCode(65 + i)}`,
  );
}

function answerText(
  words: number,
  seed: number,
  names: readonly string[],
  table: boolean,
): string {
  const lead = names.length
    ? `Beberapa pilihan yang sering disebut: ${names.join(", ")}.`
    : "";
  const tableText = table
    ? [
        "",
        "| Klinik | Perawatan | Kisaran |",
        "| --- | --- | --- |",
        "| Klinik Contoh A | Perawatan satu | Rp1 juta |",
        "| Klinik Contoh B | Perawatan dua | Rp2 juta |",
        "",
      ].join("\n")
    : "";
  const body = textOfWords(
    Math.max(1, words - (lead ? lead.split(" ").length : 0)),
    seed,
  );
  return [lead, tableText, body].filter(Boolean).join("\n\n");
}

/** One synthetic saved report (the data `/api/report` returns). */
export function reportFixture(options: FixtureOptions = {}): SavedReportData {
  const name = options.name ?? "Klinik Fiksi Sehat";
  const subject = options.subject ?? "klinik";
  const place = options.place ?? "Jakarta";
  const searchData = options.searchData ?? true;
  const base = presentationFixture();
  const others = businessNames(options.otherBusinesses ?? 3);
  const checkedTo = options.checkedTo ?? "2026-11-06T09:16:00.000Z";

  const observations: AuditObservation[] = base.observations.map((o, i) => {
    const ordinal = i + 1;
    const failed = has(options.chatgptFailed, ordinal);
    const named =
      has(options.chatgptNamed, ordinal) ||
      has(options.chatgptRecommended, ordinal);
    const mentioned = [
      ...(named ? [name] : []),
      ...(options.answerWithoutBusiness && ordinal === 3
        ? []
        : others.slice(0, 3)),
    ];
    return {
      ...o,
      question: `Pertanyaan contoh ${ordinal} tentang perawatan kulit di ${place}?`,
      raw_answer: failed
        ? ""
        : answerText(
            options.chatgptWords ?? 120,
            ordinal,
            mentioned,
            Boolean(options.table) && ordinal === 2,
          ),
      sources: failed
        ? []
        : Array.from(
            { length: ordinal === 1 ? (options.sources ?? 3) : 2 },
            (_, s) => ({
              title: `Sumber contoh ${s + 1}`,
              url: `https://sumber-${s + 1}.example/artikel-${ordinal}`,
            }),
          ),
      run_status: failed ? ("failed" as const) : ("completed" as const),
      failure_reason: failed ? "Pemeriksaan contoh gagal." : "",
      observed_at: checkedTo,
    };
  });

  const questions: TwoSourceQuestion[] = observations.map((o, i) => {
    const ordinal = i + 1;
    const cFailed = has(options.chatgptFailed, ordinal);
    const gFailed = has(options.googleFailed, ordinal);
    const gNotShown = has(options.googleNotShown, ordinal);
    const volume = searchData ? 1000 + ordinal * 100 : null;
    return {
      prompt_id: o.prompt_id,
      ordinal,
      question: o.question,
      label: searchData ? "dicari_di_google" : "disusun_dari_profil",
      label_text: searchData ? "Dicari di Google" : "Disusun dari profil",
      topic_line: searchData
        ? `Topik: topik ${ordinal} · ±${volume} pencarian/bulan di Google, seluruh Indonesia (data Oktober 2026)`
        : "Tidak ada data jumlah pencarian",
      topic: `topik contoh ${ordinal}`,
      volume,
      data_month: searchData ? "2026-10" : null,
      chatgpt: cFailed
        ? { outcome: "failed", named: null, recommended: null }
        : {
            outcome: "answered",
            named:
              has(options.chatgptNamed, ordinal) ||
              has(options.chatgptRecommended, ordinal)
                ? "named"
                : has(options.chatgptCited, ordinal)
                  ? "source_only"
                  : "absent",
            recommended: has(options.chatgptRecommended, ordinal),
          },
      google: gFailed
        ? {
            outcome: "failed",
            text: "",
            references: [],
            named: null,
            observed_at: null,
          }
        : gNotShown
          ? {
              outcome: "not_shown",
              text: "",
              references: [],
              named: null,
              observed_at: checkedTo,
            }
          : {
              outcome: "summary",
              text: answerText(
                options.googleWords ?? 80,
                ordinal + 3,
                has(options.googleNamed, ordinal) ? [name] : [],
                false,
              ),
              references: [
                {
                  url: `https://ulasan-${ordinal}.example/`,
                  title: `Ulasan contoh ${ordinal}`,
                },
              ],
              named: has(options.googleNamed, ordinal)
                ? "named"
                : has(options.googleCited, ordinal)
                  ? "source_only"
                  : "absent",
              observed_at: checkedTo,
            },
    };
  });

  const answered = questions.filter((q) => q.chatgpt.outcome === "answered");
  const completedGoogle = questions.filter(
    (q) => q.google.outcome !== "failed",
  );
  const summaries = questions.filter((q) => q.google.outcome === "summary");
  const counts: TwoSourceReport["counts"] = {
    chatgpt: {
      completed: answered.length,
      named: answered.filter((q) => q.chatgpt.named === "named").length,
      recommended: answered.filter((q) => q.chatgpt.recommended).length,
      failed: 10 - answered.length,
    },
    google: {
      completed: completedGoogle.length,
      summaries: summaries.length,
      named: summaries.filter((q) => q.google.named === "named").length,
      failed: 10 - completedGoogle.length,
    },
    failed: 10 - answered.length + (10 - completedGoogle.length),
  };

  const two: TwoSourceReport = {
    version: TWO_SOURCE_REPORT_VERSION,
    subject,
    order_number: "NV-FIKSI1",
    places: {
      google: { code: 1, name: place },
      chatgpt: { code: 2, name: "Indonesia" },
    },
    checked_from: "2026-11-06T08:02:00.000Z",
    checked_to: checkedTo,
    search_data_available: searchData,
    questions,
    counts,
    google_finding: googleCoverageFinding(
      summaries.length,
      completedGoogle.length,
    ),
    topics_missing: questions
      .filter((q) => q.chatgpt.named !== "named" && q.google.named !== "named")
      .slice(0, 5)
      .map((q) => ({
        prompt_id: q.prompt_id,
        ordinal: q.ordinal,
        topic: `Topik contoh ${q.ordinal}`,
        volume: q.volume,
        data_month: q.data_month,
        domains: ["sumber-1.example"],
      })),
    other_businesses: {
      chatgpt:
        options.answerWithoutBusiness && others.length === 0 ? [] : others,
      google: [],
    },
  };

  const ids = observations.map((o) => o.prompt_id);
  const nFindings = options.findings ?? 4;
  const nRecs = options.recommendations ?? 4;
  const writing = options.writing ?? true;
  const report: AuditReport = {
    ...base.report,
    conclusion: textOfWords(options.conclusionWords ?? 50, 2),
    key_findings: Array.from({ length: nFindings }, (_, i) => ({
      title: textOfWords(options.findingTitleWords ?? 9, i).replace(/\.$/, ""),
      explanation: textOfWords(options.findingWords ?? 55, i + 1),
      evidence_prompt_ids: ids.slice(i % 8, (i % 8) + 2),
    })),
    priorities: Array.from({ length: nRecs }, (_, i) => ({
      order: i + 1,
      action: textOfWords(
        options.recommendationTitleWords ?? 10,
        i + 2,
      ).replace(/\.$/, ""),
      why: textOfWords(options.recommendationWords ?? 50, i + 3),
      evidence_prompt_ids: ids.slice(0, 2),
    })),
    two_source: two,
    ...(writing
      ? {
          two_source_writing: {
            version: TWO_SOURCE_WRITING_VERSION,
            verdict: "Ringkasan contoh untuk menguji halaman laporan.",
            competitor_reasons: others.slice(0, 5).map((business) => ({
              name: business,
              reason: textOfWords(15, 1),
            })),
            takeaways: [
              { title: "Catatan contoh satu", text: textOfWords(20, 1) },
              { title: "Catatan contoh dua", text: textOfWords(20, 2) },
            ],
            plan: [
              {
                weeks: "Minggu 1–2",
                title: "Rapikan fakta dasar",
                text: textOfWords(options.planWords ?? 22, 1),
              },
              {
                weeks: "Minggu 3–6",
                title: "Tampilkan keahlian",
                text: textOfWords(options.planWords ?? 22, 2),
              },
              {
                weeks: "Minggu 5–8",
                title: "Jaga arus ulasan",
                text: textOfWords(options.planWords ?? 22, 3),
              },
            ],
            topic_names: [],
            google_readings: [],
          },
        }
      : {}),
  } as AuditReport;
  if (!writing) delete (report as Partial<AuditReport>).two_source_writing;

  const context = {
    version: DIRECT_TEN_CONTEXT_VERSION,
    identity: {
      name,
      source: "https://klinik-fiksi.example/",
      sourceOrigin: "owner",
      aliases: options.aliases ?? [],
      origin: "owner",
    },
    focus: { value: { kind: "brand" }, origin: "owner" },
    category: {
      value: subject === "klinik" ? "klinik kecantikan" : "kedai kopi",
      origin: "website",
    },
    offerings: { value: ["perawatan contoh"], origin: "website" },
    serviceChannels: { value: ["on_premise"], origin: "website" },
    market: { value: { reach: "seluruh", areas: [] }, origin: "owner" },
    comparators: { value: { mode: "unknown" }, origin: "nuave" },
  } as DirectTenAuditContext;

  return {
    report,
    context,
    prompts: [],
    originals: [],
    observations,
    synthetic: options.synthetic ?? false,
  };
}

const all = Array.from({ length: 10 }, (_, i) => i + 1);

/** Part 0 and Part 1's fixtures (plan §8.1 and Part 0 "Fixtures"). */
export const FIXTURES = {
  /** An ordinary delivered report (stands in for NV-3WDSAY and NV-8XAPUF,
   * whose real data is not used). */
  typical: () =>
    reportFixture({
      chatgptNamed: [1, 4, 7],
      chatgptRecommended: [8],
      chatgptCited: [6],
      googleNamed: [4],
      googleCited: [3, 9],
      googleNotShown: [5, 7, 8],
    }),
  /** The clinic is named in no answer. */
  named_nowhere: () => reportFixture({}),
  /** The clinic is named in all twenty answers. */
  named_everywhere: () =>
    reportFixture({
      chatgptNamed: all,
      chatgptRecommended: [1, 2],
      googleNamed: all,
    }),
  /** Three AI Overviews not shown. */
  three_no_overview: () =>
    reportFixture({ chatgptNamed: [2], googleNotShown: [3, 5, 9] }),
  /** A failed check on each source. */
  failed_each_source: () =>
    reportFixture({ chatgptNamed: [1], chatgptFailed: [7], googleFailed: [2] }),
  /** No search volume: questions written from the business facts. */
  no_search_volume: () =>
    reportFixture({ searchData: false, chatgptNamed: [3] }),
  /** The longest answers: about 700 words (ChatGPT) and 450 (Google). */
  longest_answer: () => reportFixture({ chatgptWords: 700, googleWords: 450 }),
  /** An answer with a table. */
  answer_with_table: () => reportFixture({ table: true }),
  /** Ten other businesses named. */
  ten_other_businesses: () =>
    reportFixture({ otherBusinesses: 10, chatgptNamed: [1] }),
  /** A long business name. */
  long_business_name: () =>
    reportFixture({
      name: "Klinik Kecantikan dan Perawatan Kulit Fiksi Sehat Sejahtera Cabang Kebayoran Baru",
    }),
  /** An answer naming no business. */
  answer_without_business: () => reportFixture({ answerWithoutBusiness: true }),
  /** Written before Spec 021 Part B: no writer block, so no plan. */
  before_part_b: () => reportFixture({ writing: false }),
  /** The longest texts saved on Nuave's orders (spike README): finding 64
   * words, recommendation 60, conclusion 58, plan step 23. */
  longest_texts: () =>
    reportFixture({
      findingWords: 64,
      recommendationWords: 60,
      conclusionWords: 58,
      planWords: 23,
    }),
  /** Ten findings and ten recommendations. */
  ten_and_ten: () =>
    reportFixture({ findings: 10, recommendations: 10, googleNotShown: [2] }),
  /** An answer citing 44 sources (saved maximum: 44). */
  sources_44: () => reportFixture({ sources: 44 }),
  /** A business that is not a clinic ("Bisnis Anda", AC-20). */
  non_clinic: () =>
    reportFixture({
      name: "Kedai Kopi Fiksi",
      subject: "bisnis",
      place: "Bandung",
    }),
  /** Every texts at its budget exactly (one page each). */
  at_budget: () =>
    reportFixture({
      findingWords: 80,
      findingTitleWords: 12,
      recommendationWords: 100,
      recommendationTitleWords: 14,
      conclusionWords: 70,
      planWords: 35,
    }),
  /** The maximum: ten findings and ten recommendations, every text at 1.5
   * to 3 times its budget, the longest answers, 44 sources, ten other
   * businesses, a long name, failed checks and AI Overviews not shown. */
  maximum: () =>
    reportFixture({
      name: "Klinik Kecantikan dan Perawatan Kulit Fiksi Sehat Sejahtera Cabang Kebayoran Baru",
      findings: 10,
      recommendations: 10,
      findingWords: 240,
      findingTitleWords: 18,
      recommendationWords: 300,
      recommendationTitleWords: 21,
      conclusionWords: 210,
      planWords: 105,
      chatgptWords: 1200,
      googleWords: 450,
      sources: 44,
      table: true,
      otherBusinesses: 10,
      chatgptNamed: [1, 2, 3],
      chatgptRecommended: [4],
      chatgptCited: [5],
      chatgptFailed: [10],
      googleNamed: [1],
      googleCited: [2],
      googleNotShown: [3, 6, 7],
      googleFailed: [9],
    }),
} as const;

export type FixtureName = keyof typeof FIXTURES;

/** A report saved before Spec 018 (no `two_source`): keeps today's print. */
export function beforeSpec018Fixture(): SavedReportData {
  const base = presentationFixture();
  return {
    report: base.report,
    context: base.brief as unknown as DirectTenAuditContext,
    prompts: [],
    originals: [],
    observations: base.observations,
    synthetic: false,
  };
}
