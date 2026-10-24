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
 *
 * This module has no server imports, so the report page can use its types.
 */

export const TWO_SOURCE_REPORT_VERSION = "nuave-two-source-v1" as const;
/** The evidence export carries its own version for two-source reports (R-29). */
export const TWO_SOURCE_EXPORT_VERSION =
  "nuave-evidence-two-source-v1" as const;

export type NamedFact = "named" | "source_only" | "absent";
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

export type TwoSourceReport = {
  version: typeof TWO_SOURCE_REPORT_VERSION;
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
};

/** "Bisnis Anda muncul di X dari N pertanyaan", or "Tidak diuji" when N is 0. */
export function countSentence(
  verb: "muncul" | "direkomendasikan",
  count: number,
  of: number,
): string {
  return of === 0
    ? "Tidak diuji"
    : `Bisnis Anda ${verb} di ${count} dari ${of} pertanyaan`;
}

export function googleSummarySentence(z: number, m: number): string {
  return m === 0
    ? "Tidak diuji"
    : `Google menampilkan AI Overview di ${z} dari ${m} pertanyaan`;
}

export function googleNamedSentence(w: number, z: number): string {
  return z === 0 ? "Tidak diuji" : countSentence("muncul", w, z);
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
