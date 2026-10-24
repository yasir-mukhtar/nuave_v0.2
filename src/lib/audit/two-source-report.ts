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

export type TwoSourceReport = {
  version: typeof TWO_SOURCE_REPORT_VERSION;
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

const NEGATIVE =
  /\b(?:tidak|belum|bukan)\s+(?:pernah\s+|sama\s+sekali\s+)?(?:disebut|disebutkan|muncul|menyebut|menyebutkan|ditemukan)\b/i;

/** A negation limited to some questions is true even when the source named
 * the business elsewhere ("tidak muncul pada kebutuhan lain", "tidak disebut
 * di 5 ringkasan lainnya"). */
const LIMITED =
  /\b(?:lain(?:nya)?|sebagian|beberapa|kecuali|tentang|untuk\s+pertanyaan|pada\s+pertanyaan|pada\s+kebutuhan)\b/i;
const COUNT = /\b(\d+)\s+dari\s+(\d+)\b/g;

const namesChatGpt = (text: string) => text.includes(SOURCE_CHATGPT);
/** "AI Overview" alone names Google too (N-26). */
const namesGoogle = (text: string) => /Google|AI Overview/.test(text);
const namesSource = (text: string) => namesChatGpt(text) || namesGoogle(text);

/** The "X dari Y" pairs that are true for a source: named or not named, out
 * of its completed answers (ChatGPT) or its summaries or checks (Google). */
function validCounts(
  facts: TwoSourceReportFacts,
  source: "chatgpt" | "google",
): Set<string> {
  const { chatgpt, google } = facts.counts;
  const pairs = new Set<string>();
  const add = (named: number, of: number) => {
    pairs.add(`${named}/${of}`);
    pairs.add(`${of - named}/${of}`);
  };
  if (source === "chatgpt") add(chatgpt.named, chatgpt.completed);
  else {
    add(google.named, google.summaries);
    add(google.named, google.completed);
  }
  return pairs;
}

/**
 * B-5: a sentence that says a source did not name the business contradicts
 * the counts when that source named it at least once, unless the sentence is
 * limited to some questions or carries that source's correct count. A wrong
 * count is itself a contradiction. "direkomendasikan" is not checked.
 */
function contradictedSource(
  sentence: string,
  facts: TwoSourceReportFacts,
): "chatgpt" | "google" | "both" | null {
  if (!NEGATIVE.test(sentence)) return null;
  const aboutChatGpt = namesChatGpt(sentence);
  const aboutGoogle = namesGoogle(sentence);
  const { chatgpt, google } = facts.counts;
  const source: "chatgpt" | "google" | "both" =
    aboutChatGpt && !aboutGoogle
      ? "chatgpt"
      : aboutGoogle && !aboutChatGpt
        ? "google"
        : "both";
  const named =
    source === "chatgpt"
      ? chatgpt.named
      : source === "google"
        ? google.named
        : chatgpt.named + google.named;
  if (named === 0) return null;
  const counts = [...sentence.matchAll(COUNT)].map((m) => `${m[1]}/${m[2]}`);
  if (counts.length) {
    const valid =
      source === "both"
        ? new Set([
            ...validCounts(facts, "chatgpt"),
            ...validCounts(facts, "google"),
          ])
        : validCounts(facts, source);
    return counts.every((pair) => valid.has(pair)) ? null : source;
  }
  return LIMITED.test(sentence) ? null : source;
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

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?;])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
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
        else if (title && !/[.!?]$/.test(sentence))
          replacement = replacement.slice(0, -1);
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
