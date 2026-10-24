/**
 * Spec 018 R-10, R-10a, R-11 and R-11a: provider-choice detection, the place
 * rule, question origin labels and the checks added to the direct-ten
 * validator. The same functions run on generated packs, the fallback pack,
 * customer edits, approval and the report pipeline.
 */
import { brandTokens, type BrandInput } from "./phrase";
import {
  namesSearchPlace,
  otherPlaceIn,
  searchPlaceName,
  type SearchPlace,
} from "./places";
import {
  isPlaceDependent,
  namedBusiness,
  type DiscoveryPool,
  type PoolTopic,
} from "./pool";
import {
  containsAllWords,
  hasWordSequence,
  normalizedText,
  words,
} from "./text";

export type QuestionLabel =
  | "dicari_di_google"
  | "orang_lain_juga_bertanya"
  | "disusun_dari_topik"
  | "disusun_dari_profil"
  | "diubah_oleh_anda";

/** The settled customer labels (Experience 3). */
export const QUESTION_LABEL_TEXT: Readonly<Record<QuestionLabel, string>> = {
  dicari_di_google: "Dicari di Google",
  orang_lain_juga_bertanya: "Orang lain juga bertanya",
  disusun_dari_topik: "Disusun dari topik yang dicari",
  disusun_dari_profil: "Disusun dari profil bisnis",
  diubah_oleh_anda: "Diubah oleh Anda",
};

/** Server-owned facts about one question (R-07): never taken from the
 * browser. */
export type QuestionOrigin = {
  label: QuestionLabel;
  topic: string | null;
  volume: number | null;
  dataMonth: string | null;
  /** For an edited question: the topic it started from (Experience 3). */
  originalTopic?: string | null;
};

const PROVIDER_WORDS: readonly string[] = [
  "rekomendasi",
  "terbaik",
  "terdekat",
  "bagus",
  "dimana",
  "tempat",
  "klinik",
  "harga",
  "biaya",
  "tarif",
  "murah",
];
const PROVIDER_PAIRS: readonly string[][] = [
  ["di", "mana"],
  ["mana", "yang"],
  ["yang", "mana"],
  ["berapa", "harga"],
  ["berapa", "biaya"],
  ["berapa", "tarif"],
];

export const MIN_PROVIDER_QUESTIONS = 7;
export const MAX_ADVICE_QUESTIONS = 2;

/** R-10: whole words only, so "bagaimana" never matches "mana" and "berapa
 * lama…" is advice. Naming a place alone does not make a question
 * provider-choice. */
export function isProviderChoice(question: string): boolean {
  const tokens = words(question);
  return (
    PROVIDER_WORDS.some((word) => tokens.includes(word)) ||
    PROVIDER_PAIRS.some((pair) => hasWordSequence(tokens, pair))
  );
}

export function topicCoreFor(
  topic: string | null,
  pool: Pick<DiscoveryPool, "topics"> | null,
): string[] | null {
  if (!topic || !pool) return null;
  return pool.topics.find((entry) => entry.text === topic)?.core ?? null;
}

/** A number is shown only when the question contains its topic's core words
 * (R-06, R-11, AC-19). */
export function numberShown(
  question: string,
  origin: QuestionOrigin,
  pool: Pick<DiscoveryPool, "topics"> | null,
): boolean {
  const topic = origin.topic ?? origin.originalTopic ?? null;
  const core = topicCoreFor(topic, pool);
  return (
    origin.volume !== null && core !== null && containsAllWords(question, core)
  );
}

/** R-11a: the message shown under one edited question, or null. */
export function questionPlaceMessage(
  question: string,
  place: SearchPlace,
): string | null {
  const name = searchPlaceName(place);
  const other = otherPlaceIn(question, place);
  if (name === null) {
    // "Seluruh Indonesia": no question names a place (R-10a).
    return other ? "Pertanyaan ini menyebut kota. Hapus nama kotanya." : null;
  }
  if (other) return `Pertanyaan ini menyebut kota lain. Gunakan ${name}.`;
  if (isProviderChoice(question) && !namesSearchPlace(question, place))
    return `Sebutkan kota ${name} di pertanyaan ini.`;
  return null;
}

export const PROVIDER_SPLIT_MESSAGE =
  "Minimal 7 pertanyaan harus tentang memilih tempat.";

export type PackRuleIssue = { index: number | null; message: string };

const labelOrigins: Partial<Record<QuestionLabel, readonly string[]>> = {
  dicari_di_google: ["keyword", "autocomplete"],
  orang_lain_juga_bertanya: ["people_also_ask"],
};

/**
 * R-11: the Spec 018 checks on a ten-question pack. `pool` is the saved pool,
 * or null for the fallback pack (then every question must be labelled
 * "Disusun dari profil bisnis" and carry no number).
 */
export function validateSearchGroundedPack(input: {
  questions: readonly string[];
  origins: readonly QuestionOrigin[];
  place: SearchPlace;
  pool: DiscoveryPool | null;
  brand: BrandInput;
  /** Customer edits are allowed only at review and approval. */
  allowEdited: boolean;
}): PackRuleIssue[] {
  const issues: PackRuleIssue[] = [];
  const { questions, origins, place, pool, brand } = input;
  if (origins.length !== questions.length)
    return [{ index: null, message: "Asal pertanyaan tidak lengkap." }];
  const tokens = brandTokens(brand);
  const businessNames = pool?.businessNames ?? [];
  questions.forEach((question, index) => {
    const origin = origins[index];
    const add = (message: string) => issues.push({ index, message });
    const placeMessage = questionPlaceMessage(question, place);
    if (placeMessage) add(placeMessage);
    if (place.kind === "indonesia" && isPlaceDependent(question))
      add("Tanpa kota, pertanyaan tidak boleh memakai kata seperti terdekat.");
    if (words(question).some((word) => tokens.includes(word)))
      add("Pertanyaan tidak boleh menyebut nama bisnis Anda.");
    if (namedBusiness(question, businessNames))
      add("Pertanyaan tidak boleh menyebut nama bisnis, klinik, atau dokter.");
    if (origin.label === "diubah_oleh_anda") {
      if (!input.allowEdited) add("Asal pertanyaan tidak sesuai.");
    } else if (origin.label === "disusun_dari_profil") {
      if (pool && !pool.thin) add("Asal pertanyaan tidak sesuai.");
    } else {
      if (!pool || pool.thin) {
        add("Asal pertanyaan tidak sesuai.");
      } else if (origin.label === "disusun_dari_topik") {
        const core = topicCoreFor(origin.topic, pool);
        if (!core || !containsAllWords(question, core))
          add("Pertanyaan harus memuat topik yang dicari.");
      } else {
        const allowed = labelOrigins[origin.label] ?? [];
        const key = normalizedText(question);
        const match = pool.wordings.find(
          (wording) =>
            allowed.includes(wording.origin) &&
            normalizedText(wording.text) === key,
        );
        if (!match) add("Asal pertanyaan tidak sesuai.");
        else if (match.topic !== origin.topic)
          add("Topik pertanyaan tidak sesuai.");
      }
    }
    if (origin.volume !== null && !numberShown(question, origin, pool))
      add("Jumlah pencarian tidak sesuai dengan pertanyaan.");
    if (origin.volume !== null && origin.label !== "diubah_oleh_anda") {
      const topic = pool?.topics.find((entry) => entry.text === origin.topic);
      if (
        !topic ||
        topic.volume !== origin.volume ||
        topic.dataMonth !== origin.dataMonth
      )
        add("Jumlah pencarian tidak sesuai.");
    }
  });
  const provider = questions.filter(isProviderChoice).length;
  const advice = questions.length - provider;
  if (provider < MIN_PROVIDER_QUESTIONS || advice > MAX_ADVICE_QUESTIONS)
    issues.push({ index: null, message: PROVIDER_SPLIT_MESSAGE });
  return issues;
}

/** The origin a generated question gets from the saved pool: an exact pool
 * wording keeps its own label and topic; anything else is "Disusun dari
 * topik" with the longest topic it contains, or null when none fits. */
export function originForGenerated(
  question: string,
  pool: DiscoveryPool,
): QuestionOrigin | null {
  const key = normalizedText(question);
  const exact = pool.wordings.find((w) => normalizedText(w.text) === key);
  const placeOk =
    !isProviderChoice(question) ||
    pool.place.kind === "indonesia" ||
    namesSearchPlace(question, pool.place);
  if (exact && placeOk) {
    return {
      label:
        exact.origin === "people_also_ask"
          ? "orang_lain_juga_bertanya"
          : "dicari_di_google",
      topic: exact.topic,
      volume: exact.volume,
      dataMonth: exact.dataMonth,
    };
  }
  const topic = longestTopicIn(question, pool.topics);
  return topic
    ? {
        label: "disusun_dari_topik",
        topic: topic.text,
        volume: topic.volume,
        dataMonth: topic.dataMonth,
      }
    : null;
}

function longestTopicIn(
  question: string,
  topics: readonly PoolTopic[],
): PoolTopic | null {
  return (
    topics
      .filter((topic) => containsAllWords(question, topic.core))
      .sort((a, b) => b.text.length - a.text.length)[0] ?? null
  );
}

export const FALLBACK_ORIGIN: QuestionOrigin = {
  label: "disusun_dari_profil",
  topic: null,
  volume: null,
  dataMonth: null,
};

/** R-07 / AC-19: the server's origins for the approved texts. An unchanged
 * question keeps its generated origin; an edited one becomes "Diubah oleh
 * Anda", keeps "Topik awal", and keeps its number only while its text still
 * contains the topic's core words. */
export function originsForApproved(input: {
  approved: readonly string[];
  generated: readonly string[];
  generatedOrigins: readonly QuestionOrigin[];
  pool: DiscoveryPool | null;
}): QuestionOrigin[] {
  return input.approved.map((question, index) => {
    const origin = input.generatedOrigins[index] ?? FALLBACK_ORIGIN;
    if (
      normalizedText(question) === normalizedText(input.generated[index] ?? "")
    )
      return origin;
    const edited: QuestionOrigin = {
      label: "diubah_oleh_anda",
      topic: null,
      volume: origin.volume,
      dataMonth: origin.dataMonth,
      originalTopic: origin.topic ?? origin.originalTopic ?? null,
    };
    return numberShown(question, edited, input.pool)
      ? edited
      : { ...edited, volume: null, dataMonth: null };
  });
}
