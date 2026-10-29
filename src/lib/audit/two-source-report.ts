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

import type { ReadPage } from "../reading/page-reader";

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
    /** Spec 021 Part B: the writer's reading of an AI Overview that names the
     * business, applied when the page opens (never saved here). */
    recommended?: boolean;
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
  /** Spec 021 B-01: present for the new writer (Part B) only. */
  writer?: TwoSourceWriterFacts;
};

/**
 * Spec 021 B-01 (Spec 018 R-28 as amended 2026-10-26): what the new writer
 * reads beside the ChatGPT answers and the counts, built by code from the
 * saved checks. Google's words reach the writer with phone numbers removed.
 */
export type TwoSourceWriterFacts = {
  questions: {
    prompt_id: string;
    ordinal: number;
    /** The search topic the question came from; null when none. */
    topic: string | null;
    /** Monthly searches, when known. */
    volume: number | null;
    /** Whether each source's answer named the business, cited its site
     * only, or neither; null when the check failed or showed no summary. */
    named: { chatgpt: NamedFact | null; google: NamedFact | null };
    /** Google's AI Overview text; empty when none was shown. */
    google_text: string;
    /** The other businesses each source's answer names. */
    businesses: { chatgpt: string[]; google: string[] };
  }[];
  /** Every other business the answers name: a "Menurut jawaban AI" line may
   * name only these. */
  businesses: string[];
  /** The reading test (founder decision 2026-10-27): pages Nuave read, the
   * business's own site and the pages the answers cited most. Absent in
   * production until the founder judges the test. */
  pages?: ReadPage[];
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
/** "keempat jawaban itu", "keempatnya": a group named before (Spec 023,
 * founder's guide). "keduanya" is left out: in this report it means both
 * sources. */
const ORDINAL_GROUP =
  /\bke(tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)(?:nya\b|\s+(?:jawaban|ringkasan|pertanyaan)\s+(?:itu|tersebut|tadi)\b)/i;
const ALL = /\b(?:semua|seluruh|setiap)\s+(?:jawaban|ringkasan|pertanyaan)\b/i;
/** N-37: "di pertanyaan mana pun", "pertanyaan yang diuji" are absolute; a
 * question word next to them never limits the negation. */
const ABSOLUTE =
  /\bmana\s*pun\b|\bsatu\s+pun\b|\bsama\s+sekali\b|\byang\s+diuji\b/i;
const COUNT = /\b(\d+)\s+dari\s+(\d+)\b/g;
/** "di 6 jawaban", "pada 5 ringkasan": a count with no "dari". */
const BARE_COUNT =
  /\b(?:di|dalam|pada|untuk)\s+(\d+)\s+(?:jawaban|ringkasan|pertanyaan)\b/gi;
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
/** "ringkasan" in a two-source report is an AI Overview summary (ChatGPT
 * gives "jawaban"), when the text names no other source (Spec 023, founder's
 * guide, 2026-10-29). */
const meansGoogle = (text: string) =>
  namesGoogle(text) ||
  (!namesChatGpt(text) &&
    !/\bjawaban/i.test(text) &&
    !/\bsebagai\s+ringkasan|\bringkasan\s+(?:hasil|jawaban)\b/i.test(text) &&
    /\b(?:\d+|ke\p{L}+|semua|setiap)\s+ringkasan\b|\bringkasan\s+(?:itu|tersebut|yang\s+tampil|AI)\b/iu.test(
      digitsForWords(text),
    ));
const namesSource = (text: string) => namesChatGpt(text) || meansGoogle(text);

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
    ...(meansGoogle(text) ? (["google"] as const) : []),
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

/** Spec 023 R-03: a key finding's sentences may count the finding's own
 * cited questions. */
export type CheckScope = { ids: readonly string[] };

/** What a sentence contradicts, and whether the false part is a count about
 * a group of questions or another business (dropped by the repair) rather
 * than a claim about the whole test (replaced by the count sentence). */
type Contradiction = { sources: Set<Source>; droppable: boolean };

/** Spec 023 R-03: a group of questions is named right after "pertanyaan",
 * "jawaban" or "ringkasan" in one of three forms: a topic word ("pertanyaan
 * treatment"), "tentang/soal/mengenai" and a topic ("pertanyaan tentang
 * harga"), or "yang (tidak) menyebut/menanyakan/membahas" and a topic
 * ("jawaban yang menyebut kota"). Anything else names no group, and the
 * clause is read as today. */
const GROUP_NOUN = /^(?:pertanyaan|jawaban|ringkasan)$/i;
const GROUP_VERB =
  /^(?:menyebut(?:kan)?|menanyakan|membahas|tentang|soal|mengenai)$/i;
/** Words that never name a topic: the whole test or its sample (in a
 * clinic audit every question is a patient's), a source,
 * "other" questions, function words, and the claim's own words (a negation,
 * an adverb, a naming verb). */
const NOT_A_TOPIC = new RegExp(
  `^(?:chatgpt|google|ai|overview|ini|itu|tersebut|kami|kita|nuave|audit|uji|diuji|pengujian|tes|test|sampel|sample|survei|pasien|pelanggan|konsumen|calon|pengguna|orang|asli|lengkap|utama|acak|contoh|umum|nyata|lain(?:nya)?|sama|berbeda|mana|semua|seluruh|setiap|ada|satu|pada|di|ke|dari|dan|atau|untuk|dengan|oleh|dalam|saat|ketika|sebagai|serta|juga|pun|apa|yang|tentang|soal|mengenai|tidak|tak|belum|bukan|pernah|selalu|masih|hanya|umumnya|biasanya|sudah|lagi|sering|jarang|sekali|cuma|${NAMING_VERB})$`,
  "i",
);
/** A word shaped like a verb ("diajukan", "menunjukkan", "berisi") is no
 * topic: such a clause falls back to today's reading. */
const VERB_FORM = /^(?:me[mnlrwy]|meng|meny|di|ter|ber)\p{L}{2,}$/iu;
const isTopic = (word: string | undefined) =>
  !!word &&
  /^[\p{L}][\p{L}\p{N}-]{2,}$/u.test(word) &&
  !NOT_A_TOPIC.test(word) &&
  !VERB_FORM.test(word);

/** The qualifier of the group a clause names, or null. A qualifier that
 * refers to the owner in any form or to any business ("jawaban yang tidak
 * menyebut SOZO", "jawaban yang menyebut klinik ini", "jawaban yang
 * menyebut ZAP") is the claim itself, not a group, and the clause is read
 * as today. */
function namedGroup(
  clause: string,
  facts: TwoSourceReportFacts,
): string | null {
  if (ABSOLUTE.test(clause)) return null;
  const words = clause.match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) ?? [];
  for (let i = 0; i < words.length; i++) {
    if (!GROUP_NOUN.test(words[i]!)) continue;
    const next = words.slice(i + 1);
    let taken: string[] = [];
    if (/^(?:tentang|soal|mengenai)$/i.test(next[0] ?? "")) {
      if (isTopic(next[1])) taken = next.slice(0, 2);
    } else if (/^yang$/i.test(next[0] ?? "")) {
      const at = /^(?:tidak|tak|belum)$/i.test(next[1] ?? "") ? 2 : 1;
      if (GROUP_VERB.test(next[at] ?? "") && isTopic(next[at + 1])) {
        taken = next.slice(0, at + 2);
        if (isTopic(next[at + 2])) taken.push(next[at + 2]!);
      }
    } else if (isTopic(next[0])) taken = [next[0]!];
    if (!taken.length) continue;
    const span = (list: string[]) =>
      clause.match(new RegExp(list.map(escapeRegExp).join("\\s+"), "iu"))?.[0];
    const base = span(taken);
    if (!base) continue;
    // A qualifier about the owner or any business is the claim itself
    // ("jawaban yang menyebut klinik ini"); the word after it counts too
    // ("jawaban tentang klinik ini"). "jawaban yang menyebut klinik" may mean
    // the owner. Each falls back to today's reading.
    const yang = /^yang\b/i.test(base);
    const after = next[taken.length];
    if (
      refersToOwner(after ? `${base} ${after}` : base, facts, yang) ||
      competitorsIn(base, facts).length ||
      (yang && /\b(?:bisnis|klinik|usaha|merek|tempat)\b/i.test(base))
    )
      return null;
    // In a clinic audit "pertanyaan tentang klinik" is the whole test; only a
    // place makes it a group ("pertanyaan tentang klinik di [kota]").
    if (/^(?:bisnis|klinik|usaha|tempat)$/i.test(taken[taken.length - 1]!)) {
      const [at, place] = next.slice(taken.length, taken.length + 2);
      // "di sini", "di kota ini" still mean the whole test.
      const here =
        /^(?:sini|situ|sana|sekitar)$/i.test(place ?? "") ||
        (/^(?:kota|daerah|area|wilayah)$/i.test(place ?? "") &&
          /^(?:ini|itu|Anda|tersebut)$/i.test(next[taken.length + 2] ?? ""));
      if (!/^di$/i.test(at ?? "") || !isTopic(place) || here) return null;
      return span([...taken, at!, place!]) ?? null;
    }
    return base;
  }
  return null;
}

/** The owner by name, alias, "… Anda" or "menyebutnya": the explicit marks
 * (not the bare "klinik" a competitor's name may hold). */
function namesOwnerExplicitly(
  clause: string,
  facts: TwoSourceReportFacts,
): boolean {
  if (/\b(?:bisnis|klinik|usaha|nama|merek)\s+Anda\b/i.test(clause))
    return true;
  if (/\bmenyebut(?:kan)?nya\b/i.test(clause)) return true;
  return (facts.names ?? []).some((name) => hasName(clause, name));
}

/** The owner in any form the writer may use (R-05): its name or an alias,
 * "klinik Anda", "klinik ini", a bare "Anda" that is not a detail's owner,
 * or "menyebutnya", and (unless `bareNoun` is false, as for a topic such
 * as "tentang klinik di [kota]") a bare "klinik" that is not "klinik lain".
 * Other businesses' names are set aside first, so a competitor called
 * "Klinik …" never reads as the owner. */
function refersToOwner(
  clause: string,
  facts: TwoSourceReportFacts,
  bareNoun = true,
): boolean {
  if (namesOwnerExplicitly(clause, facts)) return true;
  let rest = clause;
  for (const name of facts.writer?.businesses ?? [])
    if (name.trim().length > 1)
      rest = rest.replace(
        new RegExp(escapeRegExp(name.trim()), "giu"),
        " \u0001 ",
      );
  if (/\b(?:bisnis|klinik|usaha)\s+ini\b/i.test(rest)) return true;
  // A bare "klinik" reads as the owner, as namesBusiness reads it, unless it
  // is "klinik lain" or part of a competitor's name ("klinik ERHA").
  if (
    bareNoun &&
    /\b(?:bisnis|klinik|usaha)\b(?!\s+\u0001)/i.test(rest) &&
    !OTHER_BUSINESS.test(rest)
  )
    return true;
  return [...rest.matchAll(/(\S+)\s+Anda\b|^\s*Anda\b/gi)].some(
    (m) => !m[1] || !new RegExp(`^${DETAIL_NOUN}$`, "i").test(m[1]),
  );
}

function hasName(clause: string, name: string): boolean {
  const trimmed = name.trim();
  return (
    trimmed.length > 1 &&
    new RegExp(
      `(?:^|[^\\p{L}\\p{N}])${escapeRegExp(trimmed)}(?![\\p{L}\\p{N}])`,
      "iu",
    ).test(clause)
  );
}

/** Another business the answers name, when the clause names one. */
function competitorIn(
  clause: string,
  facts: TwoSourceReportFacts,
): string | null {
  return competitorsIn(clause, facts)[0] ?? null;
}

/** Every other business the answers name that the clause names, the
 * longest first; a name inside a longer one found already counts once. */
function competitorsIn(clause: string, facts: TwoSourceReportFacts): string[] {
  const found: string[] = [];
  const businesses = [...(facts.writer?.businesses ?? [])].sort(
    (a, b) => b.length - a.length,
  );
  for (const name of businesses)
    if (hasName(clause, name) && !found.some((longer) => hasName(longer, name)))
      found.push(name);
  // A short form the writer uses after the full name ("Seruni" for "Klinik
  // Seruni", "ERHA" for "ERHA Ultimate Batam"): the name's first distinctive
  // word, when no owner name and no other listed business shares it.
  for (const name of businesses) {
    if (found.includes(name)) continue;
    const short = shortName(name);
    if (
      short &&
      new RegExp(
        `(?:^|[^\\p{L}\\p{N}])${escapeRegExp(short)}(?![\\p{L}\\p{N}])`,
        "u",
      ).test(clause) &&
      !(facts.writer?.questions ?? []).some(
        (q) => q.topic && hasName(q.topic, short),
      ) &&
      !(facts.names ?? []).some((own) => hasName(own, short)) &&
      businesses.every((other) => other === name || !hasName(other, short))
    )
      found.push(name);
  }
  return found;
}

/** Words that do not tell one clinic from another. */
const GENERIC_NAME_WORD =
  /^(?:klinik|clinic|praktik|praktek|dr|drg|dokter|rumah|sakit|rs|rsud|rsu|skin|beauty|aesthetic|aesthetics|estetika|estetik|kecantikan|center|centre|care|the|and|dan|&|sp|spkk|spdve|cabang|umum|utama|pratama|daerah|kota|kulit|jerawat|laser|wajah|gigi|mata|anak|bedah|plastik|medika|medical|medis|kesehatan|sehat|spesialis|indonesia|group|grup)$/i;

function shortName(name: string): string | null {
  const word = name
    .split(/[\s,.|()]+/)
    .find((part) => part.length >= 3 && !GENERIC_NAME_WORD.test(part));
  return word && word !== name.trim() && /^\p{Lu}/u.test(word) ? word : null;
}

/** Per question, for one source: was it checked, and was the owner (or the
 * named competitor) named in it. Questions without a check are left out. */
function perQuestion(
  facts: TwoSourceReportFacts,
  source: Source,
  competitor: string | null,
): Map<string, boolean> {
  const out = new Map<string, boolean>();
  const lower = competitor?.trim().toLocaleLowerCase("id-ID");
  for (const q of facts.writer?.questions ?? []) {
    const google = facts.google.find((g) => g.prompt_id === q.prompt_id);
    const done =
      source === "chatgpt"
        ? q.named.chatgpt !== null
        : google?.outcome === "summary";
    if (!done) continue;
    out.set(
      q.prompt_id,
      lower
        ? q.businesses[source].some(
            (name) => name.trim().toLocaleLowerCase("id-ID") === lower,
          )
        : source === "chatgpt"
          ? q.named.chatgpt === "named"
          : google?.business_named === true,
    );
  }
  return out;
}

/** Whether a clause's counts and claims hold over a set of questions
 * (Spec 023 R-03): a count must match, "semua" must hold for every
 * question, an unlimited negation needs none named, a positive one. */
function holds(input: {
  named: number;
  denominators: number[];
  counts: string[];
  all: boolean;
  negative: boolean;
  positive: boolean;
  unlimited: boolean;
}): boolean {
  const { named, denominators, counts, negative } = input;
  // A clause that says nothing about being named makes no claim to check.
  if (!negative && !input.positive) return true;
  if (counts.length)
    return counts.every((pair) => {
      const [x, y] = pair.split("/");
      return denominators.some(
        (of) =>
          (y === "*" || Number(y) === of) &&
          Number(x) === (negative ? of - named : named),
      );
    });
  if (input.all)
    return denominators.some((of) =>
      negative ? named === 0 && of > 0 : of > 0 && named === of,
    );
  if (negative && input.unlimited) return named === 0;
  if (input.positive && !negative) return named > 0;
  return true;
}

/** The sources a precise reading (R-03) finds false. One named source is
 * checked on its own. With none or both named, a "not named" claim without
 * a count must hold for each, as today; any other claim for at least one. */
function failedSources(
  at: ClauseSources,
  verdict: (source: Source) => boolean,
  eachMustHold: boolean,
): Source[] {
  if (at.explicit && at.sources.length === 1)
    return verdict(at.sources[0]!) ? [] : [at.sources[0]!];
  if (eachMustHold) return at.sources.filter((s) => !verdict(s));
  return at.sources.some(verdict) ? [] : [...at.sources];
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
 * Spec 023 R-03 adds two precise readings, both only ever stricter about a
 * false claim than "true for the whole test":
 * - in a key finding (`scope`), a count or "semua" about a named group of
 *   questions ("pertanyaan treatment") is checked against the finding's own
 *   cited questions;
 * - a clause about another business the answers name (and not the owner) is
 *   checked against the questions whose answers name that business.
 * Clauses about a detail ("harga layanan Anda"), unnamed other businesses or
 * recommendations are not checked.
 */
/** Spec 023, founder's guide (2026-10-29): a leading clause that only
 * limits the claim ("Dalam empat jawaban tentang bekas jerawat, ChatGPT
 * tidak menyebut Aruna") is read with the clause after its comma, as
 * "ChatGPT tidak menyebut Aruna dalam empat jawaban tentang bekas jerawat"
 * is. Only a sentence's opening clauses join; a count clause after a claim
 * keeps the claim's polarity as before. */
function clausesOf(sentence: string, facts: TwoSourceReportFacts): string[] {
  const text = digitsForWords(sentence);
  const out: string[] = [];
  let at = 0;
  let lead = "";
  for (const m of text.matchAll(new RegExp(CLAUSE_SPLIT.source, "gi"))) {
    const part = text.slice(at, m.index);
    at = m.index! + m[0].length;
    if (!out.length && /^\s*,\s*$/.test(m[0]) && leadingLimit(part, facts)) {
      lead = lead ? `${lead} ${part}` : part;
      continue;
    }
    out.push(joinLead(lead, part));
    lead = "";
  }
  out.push(joinLead(lead, text.slice(at)));
  return out;
}

const GROUP_SIZE =
  /\b(dalam|di|pada|untuk)\s+(?:\d+|ke\p{L}+|sebagian|beberapa)\s+(jawaban|ringkasan|pertanyaan)\b/iu;

/** The opening limit before the claim. When the claim has its own count
 * ("Pada 6 pertanyaan umum, ChatGPT menyebut Aruna dalam 3 jawaban"), the
 * opening's size is the group's size, not a naming count, and is left out. */
function joinLead(lead: string, part: string): string {
  if (!lead) return part;
  const counted =
    /\b\d+\s+dari\s+\d+\b/.test(part) ||
    new RegExp(BARE_COUNT.source, "i").test(part);
  return `${counted ? lead.replace(GROUP_SIZE, "$1 $2") : lead} ${part}`;
}

/** An opening clause limits the claim only when it names a group of
 * questions ("Dalam empat jawaban tentang bekas jerawat", "Untuk pertanyaan
 * tentang harga"); "Ketika audit ini dijalankan" or "Sebagai klinik di
 * Depok" limits nothing. */
const leadingLimit = (clause: string, facts: TwoSourceReportFacts) =>
  !NEGATIVE.test(clause) &&
  !POSITIVE.test(clause) &&
  (!!namedGroup(clause, facts) || GROUP_SIZE.test(clause));

function contradictedSources(
  sentence: string,
  facts: TwoSourceReportFacts,
  scope?: CheckScope,
): Contradiction {
  const out = new Set<Source>();
  let droppable = false;
  const whole = sourcesOf(sentence);
  let carried: ClauseSources | null = null;
  // A clause with a count but no verb ("…; di Google AI Overview, di 3 dari
  // 8 ringkasan") takes the polarity of the clause before it.
  let carriedPolarity: "negative" | "positive" | null = null;
  for (const clause of clausesOf(sentence, facts)) {
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
        new RegExp(BARE_COUNT.source, "i").test(clause))
    ) {
      negative = carriedPolarity === "negative";
      positive = !negative;
    }
    const counts = [
      ...[...clause.matchAll(COUNT)].map((m) => `${m[1]}/${m[2]}`),
      ...[...clause.matchAll(BARE_COUNT)].map((m) => `${m[1]}/*`),
    ];
    // An ordinal group limits the claim only when it is smaller than the
    // source's own total; "kesepuluh jawaban itu" is every answer.
    const ordinal = clause.match(ORDINAL_GROUP)?.[1];
    const ordinalLimits =
      !!ordinal &&
      at.sources.every(
        (source) =>
          Number(NUMBER_WORDS[ordinal.toLowerCase()]) <
          (source === "chatgpt"
            ? facts.counts.chatgpt.completed
            : facts.counts.google.summaries),
      );
    const unlimited =
      ABSOLUTE.test(clause) || (!LIMITED.test(clause) && !ordinalLimits);

    // R-03: a group's own naming verb ("jawaban yang tidak menyebut kota")
    // is not the claim's. Only when the rest of the clause has its own
    // ("SOZO muncul di 3 dari 4 …") does the rest decide, and only in the
    // two precise readings below; today's reading keeps the whole clause.
    const group = facts.writer ? namedGroup(clause, facts) : null;
    let groupNegative = negative;
    let groupPositive = positive;
    if (group && POSITIVE.test(group)) {
      const rest = clause.replace(group, " ");
      if (NEGATIVE.test(rest) || POSITIVE.test(rest)) {
        groupNegative = NEGATIVE.test(rest);
        groupPositive = !groupNegative;
      }
    }

    // R-03: another business the answers name, when the clause does not
    // also refer to the owner (a clause about both is checked for the owner,
    // as today).
    const competitor =
      facts.writer && !refersToOwner(clause, facts)
        ? competitorIn(clause, facts)
        : null;
    if (competitor) {
      if (RECOMMEND.test(clause)) continue;
      const subset = group && scope ? new Set(scope.ids) : null;
      const verdict = (source: Source) => {
        const asked = perQuestion(facts, source, competitor);
        const ids = [...asked.keys()].filter((id) => !subset || subset.has(id));
        const named = ids.filter((id) => asked.get(id)).length;
        return holds({
          named,
          denominators: subset
            ? [ids.length]
            : source === "chatgpt"
              ? [facts.counts.chatgpt.completed]
              : [facts.counts.google.summaries],
          counts,
          all: ALL.test(clause) || /\bsemua\b/i.test(clause),
          negative: groupNegative,
          positive: groupPositive,
          unlimited,
        });
      };
      const failed = failedSources(
        at,
        verdict,
        groupNegative && !counts.length,
      );
      failed.forEach((s) => out.add(s));
      if (failed.length) droppable = true;
      continue;
    }

    const kind = clauseKind(clause, facts);
    if (kind === "other") continue;

    // R-03: in a key finding, a count or "semua" about a named group of
    // questions is checked against the finding's own cited questions.
    const all = /\b(?:semua|seluruh|setiap)\b/i.test(clause);
    if (
      kind === "business" &&
      group &&
      scope &&
      (counts.length || all) &&
      !(RECOMMEND.test(clause) && !groupNegative)
    ) {
      const cited = new Set(scope.ids);
      // A clause about the owner and another business ("ERHA dan klinik
      // ini") must hold for each of them.
      const subjects = [null, ...competitorsIn(clause, facts)];
      const verdict = (source: Source) =>
        subjects.every((subject) => {
          const asked = perQuestion(facts, source, subject);
          const ids = [...asked.keys()].filter((id) => cited.has(id));
          return holds({
            named: ids.filter((id) => asked.get(id)).length,
            denominators: [ids.length],
            counts,
            all,
            negative: groupNegative,
            positive: groupPositive,
            unlimited: false,
          });
        });
      const failed = failedSources(
        at,
        verdict,
        groupNegative && !counts.length,
      );
      failed.forEach((s) => out.add(s));
      if (failed.length) droppable = true;
      continue;
    }

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
    if (negative && unlimited) {
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
  return { sources: out, droppable };
}

function contradictedSource(
  sentence: string,
  facts: TwoSourceReportFacts,
  scope?: CheckScope,
): { source: "chatgpt" | "google" | "both" | null; droppable: boolean } {
  const { sources, droppable } = contradictedSources(sentence, facts, scope);
  if (sources.size === 0) return { source: null, droppable: false };
  // A sentence about both sources is replaced by both count sentences, so its
  // true half is not lost.
  if (sources.size === 2 || sourcesOf(sentence).length === 2)
    return { source: "both", droppable };
  return { source: [...sources][0]!, droppable };
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

/** Spec 023, founder's guide (2026-10-29): a conclusion that only gives
 * the next step need not name a source; one that says the business was or
 * was not named, or counts, does. */
const CLAIM_VERB =
  /\b(?:direkomendasikan|merekomendasikan|dikutip|mengutip|menyarankan|disarankan|hadir|tercantum)\b/i;

function makesNamingClaim(text: string, facts: TwoSourceReportFacts): boolean {
  return digitsForWords(text)
    .split(CLAUSE_SPLIT)
    .some(
      (clause) =>
        (NEGATIVE.test(clause) ||
          POSITIVE.test(clause) ||
          CLAIM_VERB.test(clause) ||
          /\b\d+\s+dari\s+\d+\b/.test(clause) ||
          new RegExp(BARE_COUNT.source, "i").test(clause)) &&
        clauseKind(clause, facts) !== "other",
    );
}

/**
 * B-4: what the pipeline does when the writer's one revision still breaks the
 * source checks. A paid order is never failed for it. A sentence that
 * contradicts the counts about the whole test is replaced by the code-built
 * count sentence for its source; a conclusion that makes a naming claim but
 * names no source gets the count sentence in front; a finding that names no source speaks about the
 * ChatGPT answers it cites, so its explanation is marked "Di ChatGPT".
 * Spec 023 R-03: a false count about a group of questions or another
 * business is dropped instead (the owner's count sentence would be out of
 * place there). A finding left empty by a drop is dropped while another
 * remains; the last finding has its sentence replaced as before.
 */
export function repairTwoSourceWriting<
  T extends {
    conclusion: string;
    key_findings: {
      title: string;
      explanation: string;
      evidence_prompt_ids?: string[];
    }[];
    /** Spec 021 Part B: the verdict is checked too. Recommendations,
     * takeaways and the plan are not: they are about other businesses and
     * advice, which this check would misread as claims about the owner ("ERHA
     * disebut AI lewat dokternya"). */
    two_source_writing?: { verdict: string };
  },
>(
  content: T,
  facts: TwoSourceReportFacts,
): {
  content: T;
  changed: boolean;
  sentencesReplaced: number;
  sentencesDropped: number;
  findingsDropped: number;
} {
  let changed = false;
  let sentencesDropped = 0;
  let sentencesReplaced = 0;
  // A replacement keeps the replaced sentence's place: it ends with ";" when
  // the original did, starts lowercase after a ";", and a title has no final
  // full stop (N-26).
  const fix = (
    text: string,
    options: { title?: boolean; scope?: CheckScope; noDrop?: boolean } = {},
  ) => {
    const parts = sentences(text);
    let dropped = 0;
    const kept = parts.flatMap((sentence, index) => {
      const { source, droppable } = contradictedSource(
        sentence,
        facts,
        options.scope,
      );
      if (!source) return [sentence];
      changed = true;
      if (droppable && !options.noDrop) {
        dropped += 1;
        return [];
      }
      sentencesReplaced += 1;
      let replacement = twoSourceCountSentence(
        facts,
        source === "both" ? undefined : source,
      );
      if (sentence.endsWith(";")) replacement = `${replacement.slice(0, -1)};`;
      else if (options.title) replacement = replacement.slice(0, -1);
      if (index > 0 && parts[index - 1].endsWith(";"))
        replacement = `${replacement.charAt(0).toLowerCase()}${replacement.slice(1)}`;
      return [replacement];
    });
    let joined = kept.join(" ");
    // A drop must not leave a dangling ";" at the end.
    if (dropped && joined.endsWith(";"))
      joined = `${joined.slice(0, -1)}${options.title ? "" : "."}`;
    return { text: joined, dropped };
  };
  const names = namesSource;
  const conclusionFix = fix(content.conclusion);
  sentencesDropped += conclusionFix.dropped;
  let conclusion = conclusionFix.text;
  if (!names(conclusion) && makesNamingClaim(conclusion, facts)) {
    conclusion = `${twoSourceCountSentence(facts)} ${conclusion}`.trim();
    changed = true;
    sentencesReplaced += 1;
  }
  const repaired = content.key_findings.map((finding) => {
    const scope = { ids: finding.evidence_prompt_ids ?? [] };
    const title = fix(finding.title, { title: true, scope });
    const explanation = fix(finding.explanation, { scope });
    return {
      finding,
      scope,
      title,
      explanation,
      empty: !title.text.trim() || !explanation.text.trim(),
    };
  });
  const kept = repaired.filter((item) => !item.empty);
  const findingsDropped = kept.length ? repaired.length - kept.length : 0;
  const key_findings = (kept.length ? kept : repaired).map((item) => {
    // The last finding is never dropped: its sentences are replaced instead.
    const title = kept.length
      ? item.title
      : fix(item.finding.title, {
          title: true,
          scope: item.scope,
          noDrop: true,
        });
    const explanationFix = kept.length
      ? item.explanation
      : fix(item.finding.explanation, { scope: item.scope, noDrop: true });
    if (kept.length) sentencesDropped += title.dropped + explanationFix.dropped;
    let explanation = explanationFix.text;
    if (!names(`${title.text} ${explanation}`)) {
      explanation = `Di ${SOURCE_CHATGPT}: ${explanation}`;
      changed = true;
      sentencesReplaced += 1;
    }
    return { ...item.finding, title: title.text, explanation };
  });
  const writing = content.two_source_writing;
  const verdict = writing ? fix(writing.verdict) : null;
  if (verdict) sentencesDropped += verdict.dropped;
  return {
    content: {
      ...content,
      conclusion,
      key_findings,
      ...(writing && verdict
        ? { two_source_writing: { ...writing, verdict: verdict.text } }
        : {}),
    },
    changed,
    sentencesReplaced,
    sentencesDropped,
    findingsDropped,
  };
}

/**
 * The source checks for a two-source report: the conclusion and every key
 * finding name the source they speak about, and no sentence says a source
 * did not name the business when the code counts show it did. Spec 023
 * R-03: a key finding's counts about a named group of questions are read
 * against the questions it cites, and claims about another business against
 * the answers that name it.
 */
export function twoSourceWritingViolations(
  content: {
    conclusion: string;
    key_findings: {
      title: string;
      explanation: string;
      evidence_prompt_ids?: string[];
    }[];
    two_source_writing?: { verdict: string };
  },
  facts: TwoSourceReportFacts,
): string[] {
  const violations: string[] = [];
  const names = namesSource;
  if (!names(content.conclusion) && makesNamingClaim(content.conclusion, facts))
    violations.push(
      `The conclusion must say which source it is about, in natural words that include "${SOURCE_CHATGPT}" or "Google".`,
    );
  content.key_findings.forEach((finding, index) => {
    if (!names(`${finding.title} ${finding.explanation}`))
      violations.push(
        `Key finding ${index + 1} must say which source it is about, in natural words that include "${SOURCE_CHATGPT}" or "Google".`,
      );
  });
  const texts: [string, CheckScope | undefined][] = [
    [content.conclusion, undefined],
    ...content.key_findings.flatMap((f): [string, CheckScope][] => {
      const scope = { ids: f.evidence_prompt_ids ?? [] };
      return [
        [f.title, scope],
        [f.explanation, scope],
      ];
    }),
    ...(content.two_source_writing
      ? [[content.two_source_writing.verdict, undefined] as [string, undefined]]
      : []),
  ];
  for (const [text, scope] of texts)
    for (const sentence of sentences(text)) {
      const { source, droppable } = contradictedSource(sentence, facts, scope);
      if (!source) continue;
      if (droppable)
        violations.push(
          `"${sentence}" is not true for the questions it counts or the business it names. Count only the questions this finding cites, or copy the number from the answers.`,
        );
      else if (source === "chatgpt")
        violations.push(
          `"${sentence}" contradicts the counts: ChatGPT named the business in ${facts.counts.chatgpt.named} of ${facts.counts.chatgpt.completed} answers. Limit the sentence to a named group of questions or give that exact count.`,
        );
      else if (source === "google")
        violations.push(
          `"${sentence}" contradicts the counts: Google AI Overview named the business in ${facts.counts.google.named} of ${facts.counts.google.summaries} summaries. Limit the sentence to a named group of questions or give that exact count.`,
        );
      else
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
