/**
 * Spec 018: the code-built part of a two-source report. The report-writing
 * model reads the ChatGPT answers as before; everything here is built by code
 * from the saved evidence when the report is made, and saved with it (the
 * saved report never changes, S0). Nothing here comes from a model.
 *
 * - R-13: the places each source was asked from.
 * - R-16/R-17: per question, the ChatGPT and Google outcomes and "named".
 * - R-19: the per-source counts and denominators.
 * - R-18: "Topik yang belum menyebut Anda".
 * - Q-3 default: the Google coverage finding.
 * - R-08: whether search data was available.
 * - Spec 021 C-01/C-02: per business, the answers that name it and what the
 *   sources' own pages showed about it (v2).
 *
 * This module has no server imports, so the report page can use its types.
 */

/** v2 (Spec 021 Part C) adds `competitors`; v1 reports have names only. */
export const TWO_SOURCE_REPORT_VERSION = "nuave-two-source-v2" as const;
export type TwoSourceReportVersion =
  "nuave-two-source-v1" | typeof TWO_SOURCE_REPORT_VERSION;
/** The evidence export carries its own version for two-source reports (R-29). */
export const TWO_SOURCE_EXPORT_VERSION =
  "nuave-evidence-two-source-v1" as const;

export type NamedFact = "named" | "source_only" | "absent";

/** How the report names the customer's business: "Klinik Anda" for a clinic,
 * "Bisnis Anda" otherwise (founder decision 2026-10-24, AC-20). */
export type ReportSubject = "bisnis" | "klinik";

/** AC-20: a business is a clinic when its confirmed category contains the
 * word "klinik" (any case), e.g. "Klinik kecantikan", "klinik gigi". */
export function reportSubjectForCategory(category: string): ReportSubject {
  return /(^|[^\p{L}])klinik([^\p{L}]|$)/iu.test(category)
    ? "klinik"
    : "bisnis";
}

/** "Bisnis Anda" / "Klinik Anda", or lowercase inside a sentence. A report
 * saved without a subject is a business report. */
export function subjectNoun(
  subject: ReportSubject | undefined,
  capital = true,
): string {
  const word = subject === "klinik" ? "klinik" : "bisnis";
  return `${capital ? word.charAt(0).toUpperCase() + word.slice(1) : word} Anda`;
}
export type QuestionLabelKey =
  | "dicari_di_google"
  | "orang_lain_juga_bertanya"
  | "disusun_dari_topik"
  | "disusun_dari_profil"
  | "diubah_oleh_anda";

export type TwoSourceQuestion = {
  prompt_id: string;
  ordinal: number;
  /** The text both sources received, byte for byte (R-13). */
  question: string;
  label: QuestionLabelKey;
  /** The settled label text (Experience 3). */
  label_text: string;
  /** "Topik: … · ±N pencarian/bulan di Google, seluruh Indonesia (data …)"
   * or "Tidak ada data jumlah pencarian". */
  topic_line: string;
  topic: string | null;
  volume: number | null;
  data_month: string | null;
  chatgpt: {
    outcome: "answered" | "failed";
    /** Null when the check failed. */
    named: NamedFact | null;
    /** Today's assessment rules; null when not answered. */
    recommended: boolean | null;
  };
  google: {
    outcome: "summary" | "not_shown" | "failed";
    /** The AI Overview text (phone numbers removed); empty otherwise. */
    text: string;
    references: { url: string; title: string }[];
    /** Null unless a summary with text was shown. */
    named: NamedFact | null;
    observed_at: string | null;
  };
};

export type TopicRow = {
  prompt_id: string;
  ordinal: number;
  topic: string;
  volume: number | null;
  data_month: string | null;
  domains: string[];
};

/** Spec 021 C-01/C-02: one business, counted by code when the report was
 * made. Ids are the questions whose answers name it. */
export type CompetitorFact = {
  name: string;
  chatgpt: string[];
  google: string[];
  /** ChatGPT answers that name it and showed it as one of ChatGPT's own
   * business cards. Not "recommended": that word stays for the report
   * writer's reading of the owner's answers. */
  cards: string[];
  /** From the provider data only (C-04); null when none was given. */
  website: string | null;
  rating: { value: number; max: number } | null;
  reviews: number | null;
};

export type TwoSourceReport = {
  version: TwoSourceReportVersion;
  /** AC-20: absent on reports saved before the label existed ("Bisnis Anda"). */
  subject?: ReportSubject;
  /** For the "Minta bantuan" email (R-20); null when the order has none. */
  order_number: string | null;
  places: {
    google: { code: number; name: string };
    chatgpt: { code: number; name: string };
  };
  /** The first and last time a check was answered. */
  checked_from: string | null;
  checked_to: string | null;
  /** R-08: false when the questions were written from the business facts. */
  search_data_available: boolean;
  questions: TwoSourceQuestion[];
  counts: {
    chatgpt: {
      /** N: completed ChatGPT answers (R-19). */
      completed: number;
      named: number;
      recommended: number;
      failed: number;
    };
    google: {
      /** M: completed Google checks (summary or not shown). */
      completed: number;
      /** Z: summaries with text. */
      summaries: number;
      /** W: summaries that name the business. */
      named: number;
      failed: number;
    };
    /** K: failed checks of both sources. */
    failed: number;
  };
  /** Q-3 default: "Google tidak menampilkan AI Overview untuk X dari M
   * pertanyaan ini." when Z < M; otherwise null. */
  google_finding: string | null;
  /** R-18, up to five rows. */
  topics_missing: TopicRow[];
  /** One short list per source, taken from the answer text. */
  other_businesses: { chatgpt: string[]; google: string[] };
  /** Spec 021 Part C: every business in `other_businesses`, counted, and the
   * owner's listing details. Absent on reports made before Part C, whose
   * counts are derived when the page opens. */
  competitors?: {
    others: CompetitorFact[];
    own: Pick<CompetitorFact, "cards" | "website" | "rating" | "reviews">;
  };
};

/** "Bisnis Anda muncul di X dari N pertanyaan" ("Klinik Anda …" for a
 * clinic), or "Tidak diuji" when N is 0. */
export function countSentence(
  verb: "muncul" | "direkomendasikan",
  count: number,
  of: number,
  subject?: ReportSubject,
): string {
  return of === 0
    ? "Tidak diuji"
    : `${subjectNoun(subject)} ${verb} di ${count} dari ${of} pertanyaan`;
}

export function googleSummarySentence(z: number, m: number): string {
  return m === 0
    ? "Tidak diuji"
    : `Google menampilkan AI Overview di ${z} dari ${m} pertanyaan`;
}

export function googleNamedSentence(
  w: number,
  z: number,
  subject?: ReportSubject,
): string {
  return z === 0 ? "Tidak diuji" : countSentence("muncul", w, z, subject);
}

export function googleCoverageFinding(z: number, m: number): string | null {
  return m > 0 && z < m
    ? `Google tidak menampilkan AI Overview untuk ${m - z} dari ${m} pertanyaan ini.`
    : null;
}

/** The domain of a URL, without "www.". */
export function urlDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** R-18: questions with at least one completed answer with text where the
 * business was not named in any of them, ordered by demand, at most five. */
export function topicsMissing(
  questions: readonly (TwoSourceQuestion & {
    chatgptSources: readonly { url: string }[];
  })[],
): TopicRow[] {
  return questions
    .filter((question) => {
      const chatgpt = question.chatgpt.outcome === "answered";
      const google = question.google.outcome === "summary";
      if (!chatgpt && !google) return false;
      return (
        (!chatgpt || question.chatgpt.named !== "named") &&
        (!google || question.google.named !== "named")
      );
    })
    .map((question) => {
      const urls = [
        ...(question.chatgpt.outcome === "answered"
          ? question.chatgptSources.map((source) => source.url)
          : []),
        ...(question.google.outcome === "summary"
          ? question.google.references.map((reference) => reference.url)
          : []),
      ];
      const domains = [
        ...new Set(urls.map(urlDomain).filter((d): d is string => Boolean(d))),
      ].slice(0, 3);
      return {
        prompt_id: question.prompt_id,
        ordinal: question.ordinal,
        topic: question.topic ?? question.question,
        volume: question.volume,
        data_month: question.data_month,
        domains,
      };
    })
    .sort(
      (a, b) => (b.volume ?? -1) - (a.volume ?? -1) || a.ordinal - b.ordinal,
    )
    .slice(0, 5);
}

/**
 * Spec 018 R-28 and the Report layout ("findings name their source"): the
 * code-built facts the report-writing model reads beside the ChatGPT answers.
 * Never raw responses, answer text from Google, or phone numbers.
 */
export type TwoSourceReportFacts = {
  /** AC-20: how the writer and the code-built sentences name the business. */
  subject?: ReportSubject;
  /** The business name and confirmed aliases, so a sentence that names the
   * business by name is checked like "bisnis Anda" (N-33). */
  names?: string[];
  counts: {
    chatgpt: { completed: number; named: number };
    google: { completed: number; summaries: number; named: number };
  };
  google: {
    prompt_id: string;
    outcome: "summary" | "not_shown" | "failed";
    /** Named in the AI Overview text; null when no summary was shown. */
    business_named: boolean | null;
    cited_domains: string[];
  }[];
};

export const SOURCE_CHATGPT = "ChatGPT";
export const SOURCE_GOOGLE = "Google AI Overview";

const NAMING_VERB =
  "(?:disebut(?:kan)?|muncul|menyebut(?:kan)?(?:nya)?|ditemukan|terlihat|tampil|menyinggung|disinggung)";
/** "tidak/tak/belum/bukan (pernah/sama sekali) disebut…", "tidak ada jawaban
 * yang menyebut…", "tidak satu pun ringkasan menyebut…", "absen". */
const NEGATIVE = new RegExp(
  `\\b(?:tidak|tak|belum|bukan)\\s+(?:(?:pernah|lagi)\\s+)?(?:(?:sama\\s+sekali|sekali\\s+pun)\\s+)?${NAMING_VERB}\\b|\\btidak\\s+(?:ada|satu\\s+pun)\\b.*\\b(?:menyebut(?:kan)?|memuat|mencantumkan)\\b|\\babsen\\b`,
  "i",
);
const POSITIVE = new RegExp(`\\b${NAMING_VERB}\\b`, "i");
const RECOMMEND = /\bdirekomendasikan|merekomendasikan\b/i;
/** N-31: a negation is limited only when the limit is about questions,
 * needs or searches ("pada kebutuhan lain", "untuk pertanyaan tentang
 * harga", "di 5 ringkasan lainnya"), never "klinik lain". */
const LIMITED =
  /\b(?:pertanyaan|kebutuhan|jawaban|ringkasan|topik|pencarian|layanan)\s+(?:lain(?:nya)?|tentang|soal|mengenai|untuk)\b|\b(?:sebagian|beberapa)\s+(?:pertanyaan|jawaban|ringkasan|topik|kebutuhan|pencarian)\b|\bkecuali\b|\b(?:untuk|pada|dalam|di)\s+(?:pertanyaan|kebutuhan|topik|pencarian)\b|\bketika\b|\bsebagai\b|\bsaat\s+(?:pelanggan|orang|pasien|calon)\b|\bpertanyaan\s+(?:ke-?\s*)?\d/i;
const ALL = /\b(?:semua|seluruh|setiap)\s+(?:jawaban|ringkasan|pertanyaan)\b/i;
/** N-37: "di pertanyaan mana pun", "pertanyaan yang diuji" are absolute; a
 * question word next to them never limits the negation. */
const ABSOLUTE =
  /\bmana\s*pun\b|\bsatu\s+pun\b|\bsama\s+sekali\b|\byang\s+diuji\b/i;
const COUNT = /\b(\d+)\s+dari\s+(\d+)\b/g;
/** "di 6 jawaban", "pada 5 ringkasan": a count with no "dari". */
const BARE_COUNT =
  /\b(?:di|dalam|pada|untuk)\s+(\d+)\s+(?:jawaban|ringkasan|pertanyaan)\b/g;
const NUMBER_WORDS: Record<string, string> = {
  nol: "0",
  satu: "1",
  dua: "2",
  tiga: "3",
  empat: "4",
  lima: "5",
  enam: "6",
  tujuh: "7",
  delapan: "8",
  sembilan: "9",
  sepuluh: "10",
};
/** "enam dari sembilan jawaban" reads as "6 dari 9 jawaban". */
function digitsForWords(text: string): string {
  return text.replace(
    /\b(nol|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)\b(?=\s+(?:dari|jawaban|ringkasan|pertanyaan)\b)|(?<=\bdari\s+)(nol|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)\b/gi,
    (word) => NUMBER_WORDS[word.toLowerCase()] ?? word,
  );
}
/** Clauses: a contrast or a comma changes what the clause is about. */
const CLAUSE_SPLIT =
  /\s*[,;]\s*|\s+(?:tetapi|namun|sedangkan|sementara|padahal|melainkan)\s+|\s+(?:dan|serta)\s+(?=(?:tidak|tak|belum|bukan)\b)/i;
/** Nouns that make a clause about a detail of the business, not about the
 * business being named ("harga layanan Anda tidak disebut"). */
const DETAIL_NOUN =
  "(?:harga|alamat|layanan|lokasi|jam|nomor|cabang|produk|menu|promo|ulasan|website|situs|informasi|data|foto|tarif|biaya|paket|perawatan|treatment|akun|profil|halaman|artikel|konten|kontak|dokter|jadwal)";
const DETAIL = new RegExp(`\\b${DETAIL_NOUN}\\b`, "i");
const OTHER_BUSINESS =
  /\b(?:bisnis|klinik|usaha|tempat|merek)\s+(?:lain(?:nya)?|pesaing|kompetitor|serupa)\b|\bpesaing\b|\bkompetitor\b/i;
const COVERAGE =
  /\b(?:AI Overview|ringkasan(?:\s+AI)?)\s+(?:tidak\s+|tak\s+|belum\s+)?(?:muncul|tampil|ditampilkan)\b|\bmenampilkan\s+(?:AI Overview|ringkasan)\b/i;

const namesChatGpt = (text: string) => text.includes(SOURCE_CHATGPT);
/** "AI Overview" alone names Google too (N-26). */
const namesGoogle = (text: string) => /Google|AI Overview/.test(text);
const namesSource = (text: string) => namesChatGpt(text) || namesGoogle(text);

type Source = "chatgpt" | "google";
type ClauseSources = { sources: Source[]; explicit: boolean };

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The clause names the business: "bisnis/klinik/usaha Anda", a bare "Anda"
 * that is not a detail's owner, "menyebutnya", the business name or an
 * alias, or "bisnis"/"klinik" that is not "klinik lain". */
function namesBusiness(clause: string, facts: TwoSourceReportFacts): boolean {
  if (/\b(?:bisnis|klinik|usaha|nama|merek)\s+Anda\b/i.test(clause))
    return true;
  if (/\bmenyebut(?:kan)?nya\b/i.test(clause)) return true;
  for (const name of facts.names ?? []) {
    const trimmed = name.trim();
    if (
      trimmed.length > 1 &&
      new RegExp(
        `(?:^|[^\\p{L}\\p{N}])${escapeRegExp(trimmed)}(?![\\p{L}\\p{N}])`,
        "iu",
      ).test(clause)
    )
      return true;
  }
  const bareAnda = [...clause.matchAll(/(\S+)\s+Anda\b|^Anda\b/gi)].some(
    (m) => !m[1] || !new RegExp(`^${DETAIL_NOUN}$`, "i").test(m[1]),
  );
  if (bareAnda) return true;
  return (
    /\b(?:bisnis|klinik|usaha)\b/i.test(clause) && !OTHER_BUSINESS.test(clause)
  );
}

type ClauseKind = "business" | "coverage" | "other";

function clauseKind(clause: string, facts: TwoSourceReportFacts): ClauseKind {
  if (namesBusiness(clause, facts)) return "business";
  if (OTHER_BUSINESS.test(clause) || DETAIL.test(clause)) return "other";
  if (COVERAGE.test(clause)) return "coverage";
  // No explicit subject: the business, as in a finding title "Belum muncul
  // di ChatGPT".
  return "business";
}

function sourcesOf(text: string): Source[] {
  return [
    ...(namesChatGpt(text) ? (["chatgpt"] as const) : []),
    ...(namesGoogle(text) ? (["google"] as const) : []),
  ];
}

/** The denominators a source's naming counts may use. */
function denominators(facts: TwoSourceReportFacts, source: Source): number[] {
  const { chatgpt, google } = facts.counts;
  return source === "chatgpt"
    ? [chatgpt.completed]
    : [google.summaries, google.completed];
}

function namedOf(facts: TwoSourceReportFacts, source: Source): number {
  return source === "chatgpt"
    ? facts.counts.chatgpt.named
    : facts.counts.google.named;
}

/** The "X dari Y" pairs that are true for a clause of this kind and polarity
 * about one source (N-31, N-32): named counts for a positive clause, not-named
 * counts for a negative one, AI Overview coverage for a coverage clause. */
function truePairs(
  facts: TwoSourceReportFacts,
  source: Source,
  kind: ClauseKind,
  negative: boolean,
): Set<string> {
  const pairs = new Set<string>();
  const { google } = facts.counts;
  if (kind === "coverage") {
    if (source === "google") {
      pairs.add(`${google.summaries}/${google.completed}`);
      pairs.add(`${google.completed - google.summaries}/${google.completed}`);
    }
    return pairs;
  }
  const named = namedOf(facts, source);
  for (const of of denominators(facts, source))
    pairs.add(negative ? `${of - named}/${of}` : `${named}/${of}`);
  return pairs;
}

/**
 * B-5, N-31, N-32: the sources a sentence contradicts. Each clause is read on
 * its own, with the source named in it (or carried from the clause before):
 * - a "X dari Y" about the business must be that source's named count (or
 *   not-named count in a negative clause); a coverage count must be Google's
 *   AI Overview count; a swapped or wrong count is a contradiction;
 * - a negation about the business, with no count and no limit to some
 *   questions, contradicts a source that named it;
 * - a plain positive claim contradicts a source that named it 0 times, and
 *   "di semua jawaban/ringkasan" one that did not name it every time.
 * Clauses about a detail ("harga layanan Anda"), other businesses or
 * recommendations are not checked.
 */
function contradictedSources(
  sentence: string,
  facts: TwoSourceReportFacts,
): Set<Source> {
  const out = new Set<Source>();
  const whole = sourcesOf(sentence);
  let carried: ClauseSources | null = null;
  // A clause with a count but no verb ("…; di Google AI Overview, di 3 dari
  // 8 ringkasan") takes the polarity of the clause before it.
  let carriedPolarity: "negative" | "positive" | null = null;
  for (const clause of digitsForWords(sentence).split(CLAUSE_SPLIT)) {
    if (!clause.trim()) continue;
    const own = sourcesOf(clause);
    const at: ClauseSources = own.length
      ? { sources: own, explicit: true }
      : (carried ?? {
          sources: whole.length ? whole : ["chatgpt", "google"],
          explicit: whole.length > 0,
        });
    if (own.length) carried = at;
    let negative = NEGATIVE.test(clause);
    let positive = !negative && POSITIVE.test(clause);
    if (negative || positive)
      carriedPolarity = negative ? "negative" : "positive";
    else if (
      carriedPolarity &&
      (/\b\d+\s+dari\s+\d+\b/.test(clause) ||
        new RegExp(BARE_COUNT.source).test(clause))
    ) {
      negative = carriedPolarity === "negative";
      positive = !negative;
    }
    const counts = [
      ...[...clause.matchAll(COUNT)].map((m) => `${m[1]}/${m[2]}`),
      ...[...clause.matchAll(BARE_COUNT)].map((m) => `${m[1]}/*`),
    ];
    const kind = clauseKind(clause, facts);
    if (kind === "other") continue;
    if (RECOMMEND.test(clause) && !negative && counts.length) continue;
    if (counts.length && (negative || positive || kind === "coverage")) {
      const ok = (source: Source) => {
        const pairs = [...truePairs(facts, source, kind, negative)];
        return counts.every((pair) =>
          pair.endsWith("/*")
            ? pairs.some((p) => p.split("/")[0] === pair.split("/")[0])
            : pairs.includes(pair),
        );
      };
      if (at.explicit && at.sources.length === 1) {
        if (!ok(at.sources[0]!)) out.add(at.sources[0]!);
      } else if (!at.sources.some(ok)) at.sources.forEach((s) => out.add(s));
      continue;
    }
    if (kind !== "business") continue;
    if (negative && (ABSOLUTE.test(clause) || !LIMITED.test(clause))) {
      // "tidak disebut di ChatGPT maupun Google" is false when either named
      // it; with no source in the sentence, when any did.
      for (const source of at.sources)
        if (namedOf(facts, source) > 0) out.add(source);
    } else if (positive && !RECOMMEND.test(clause)) {
      for (const source of at.sources) {
        const named = namedOf(facts, source);
        const zero = named === 0;
        const notAll =
          ALL.test(clause) &&
          !denominators(facts, source).some((of) => of === named);
        if ((at.explicit && zero) || notAll) out.add(source);
      }
      if (!at.explicit && at.sources.every((s) => namedOf(facts, s) === 0))
        at.sources.forEach((s) => out.add(s));
    }
  }
  return out;
}

function contradictedSource(
  sentence: string,
  facts: TwoSourceReportFacts,
): "chatgpt" | "google" | "both" | null {
  const sources = contradictedSources(sentence, facts);
  if (sources.size === 0) return null;
  // A sentence about both sources is replaced by both count sentences, so its
  // true half is not lost.
  if (sources.size === 2 || sourcesOf(sentence).length === 2) return "both";
  return [...sources][0]!;
}

/** The code-built per-source sentence used when the writer's sentence cannot
 * be kept. A source with nothing to count says so instead of "0 dari 0"
 * (R-19, N-26). */
export function twoSourceCountSentence(
  facts: TwoSourceReportFacts,
  source?: "chatgpt" | "google",
): string {
  const { chatgpt, google } = facts.counts;
  const gpt =
    chatgpt.completed > 0
      ? `Di ${SOURCE_CHATGPT}, ${subjectNoun(facts.subject, false)} disebut di ${chatgpt.named} dari ${chatgpt.completed} jawaban`
      : `Di ${SOURCE_CHATGPT}, tidak ada jawaban yang dapat diuji`;
  const ggl =
    google.summaries > 0
      ? `Di ${SOURCE_GOOGLE}, ${subjectNoun(facts.subject, false)} disebut di ${google.named} dari ${google.summaries} ringkasan`
      : google.completed > 0
        ? `Di ${SOURCE_GOOGLE}, Google tidak menampilkan AI Overview untuk pertanyaan yang diuji`
        : `Di ${SOURCE_GOOGLE}, tidak ada pemeriksaan yang dapat diuji`;
  if (source === "chatgpt") return `${gpt}.`;
  if (source === "google") return `${ggl}.`;
  return `${gpt}; ${ggl.charAt(0).toLowerCase()}${ggl.slice(1)}.`;
}

/** Abbreviations a sentence does not end at (N-33): "drg. Linda", "Jl.
 * Sudirman", "Sp.KK.", "M.Biomed.", single initials. */
const ABBREVIATION =
  /(?:^|[\s(])(?:dr|drg|dra|drs|jl|jln|no|dll|dsb|dst|sp|pt|cv|hj|h|prof|st|tbk|ir|apt|bpk|sdr|tn|ny|kec|kab|kel|rt|rw|biomed|kes|ked|psi|gz|ft|gg|m|s|kk|ve|mm|tel|telp|hlm|vol|yth)\.$|(?:^|[\s(.])\p{Lu}\.$/iu;

/** Exported for Spec 021's verdict cut (abbreviation-aware). */
export function sentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (const m of text.matchAll(/[.!?;](?=\s+)/g)) {
    const end = m.index! + 1;
    if (m[0] === "." && ABBREVIATION.test(text.slice(start, end))) continue;
    const sentence = text.slice(start, end).trim();
    if (sentence) out.push(sentence);
    start = end;
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

/**
 * B-4: what the pipeline does when the writer's one revision still breaks the
 * source checks. A paid order is never failed for it. A contradicting
 * sentence is replaced by the code-built count sentence for its source; a
 * conclusion that names no source gets the count sentence in front; a finding
 * that names no source speaks about the ChatGPT answers it cites, so its
 * explanation is marked "Di ChatGPT".
 */
export function repairTwoSourceWriting<
  T extends {
    conclusion: string;
    key_findings: { title: string; explanation: string }[];
  },
>(content: T, facts: TwoSourceReportFacts): { content: T; changed: boolean } {
  let changed = false;
  // A replacement keeps the replaced sentence's place: it ends with ";" when
  // the original did, starts lowercase after a ";", and a title has no final
  // full stop (N-26).
  const fix = (text: string, title = false) => {
    const parts = sentences(text);
    return parts
      .map((sentence, index) => {
        const source = contradictedSource(sentence, facts);
        if (!source) return sentence;
        changed = true;
        let replacement = twoSourceCountSentence(
          facts,
          source === "both" ? undefined : source,
        );
        if (sentence.endsWith(";"))
          replacement = `${replacement.slice(0, -1)};`;
        else if (title) replacement = replacement.slice(0, -1);
        if (index > 0 && parts[index - 1].endsWith(";"))
          replacement = `${replacement.charAt(0).toLowerCase()}${replacement.slice(1)}`;
        return replacement;
      })
      .join(" ");
  };
  const names = namesSource;
  let conclusion = fix(content.conclusion);
  if (!names(conclusion)) {
    conclusion = `${twoSourceCountSentence(facts)} ${conclusion}`;
    changed = true;
  }
  const key_findings = content.key_findings.map((finding) => {
    const title = fix(finding.title, true);
    let explanation = fix(finding.explanation);
    if (!names(`${title} ${explanation}`)) {
      explanation = `Di ${SOURCE_CHATGPT}: ${explanation}`;
      changed = true;
    }
    return { ...finding, title, explanation };
  });
  return { content: { ...content, conclusion, key_findings }, changed };
}

/**
 * The source checks for a two-source report: the conclusion and every key
 * finding name the source they speak about, and no sentence says a source
 * did not name the business when the code counts show it did.
 */
export function twoSourceWritingViolations(
  content: {
    conclusion: string;
    key_findings: { title: string; explanation: string }[];
  },
  facts: TwoSourceReportFacts,
): string[] {
  const violations: string[] = [];
  const names = namesSource;
  if (!names(content.conclusion))
    violations.push(
      `The conclusion must name its source: write "Di ${SOURCE_CHATGPT}" and/or "Di ${SOURCE_GOOGLE}".`,
    );
  content.key_findings.forEach((finding, index) => {
    if (!names(`${finding.title} ${finding.explanation}`))
      violations.push(
        `Key finding ${index + 1} must name its source ("${SOURCE_CHATGPT}" or "${SOURCE_GOOGLE}").`,
      );
  });
  const texts = [
    content.conclusion,
    ...content.key_findings.flatMap((f) => [f.title, f.explanation]),
  ];
  for (const sentence of texts.flatMap(sentences)) {
    const source = contradictedSource(sentence, facts);
    if (source === "chatgpt")
      violations.push(
        `"${sentence}" contradicts the counts: ChatGPT named the business in ${facts.counts.chatgpt.named} of ${facts.counts.chatgpt.completed} answers. Limit the sentence to some questions or give that exact count.`,
      );
    else if (source === "google")
      violations.push(
        `"${sentence}" contradicts the counts: Google AI Overview named the business in ${facts.counts.google.named} of ${facts.counts.google.summaries} summaries. Limit the sentence to some questions or give that exact count.`,
      );
    else if (source === "both")
      violations.push(
        `"${sentence}" contradicts the counts: the business was named in at least one answer.`,
      );
  }
  return [...new Set(violations)];
}

/**
 * "Tentang audit ini" for a two-source report: both sources' checks, in plain
 * Indonesian, with no internal system labels (N-10). It replaces the
 * one-source method sentence, which counted ChatGPT only.
 */
export function twoSourceMethodSentence(
  two: Pick<TwoSourceReport, "counts">,
): string {
  const { chatgpt, google, failed } = two.counts;
  const failedPart = failed ? `; ${failed} pemeriksaan tidak dapat diuji` : "";
  return `Audit ini menanyakan 10 pertanyaan yang sama ke aplikasi ChatGPT dan ke Google AI Overview melalui DataForSEO. ${chatgpt.completed} dari 10 pemeriksaan ChatGPT dan ${google.completed} dari 10 pemeriksaan Google selesai${failedPart}.`;
}
