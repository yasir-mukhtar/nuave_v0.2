/**
 * Spec 018 R-08, R-10, R-11 and R-11a: writing the ten questions from the
 * saved pool. Cheaper Inference stays the writer; the search data and the
 * extra rules are appended to its one brief (the founder-approved
 * instruction body is unchanged). A grounded pack that fails the checks is
 * retried once; then the R-08 fallback writes from the business facts under
 * the same place rule and split.
 */
import type { DirectTenAuditContext } from "../audit/direct-ten-context-v2";
import {
  prepareGlmQuestionsForIntake,
  type GlmQuestionTransport,
} from "../intake/glm-local";
import type { GlmQuestionsOutcome } from "../intake/local-questions";
import { brandInputFor, discoveryPhrases } from "./discover";
import { searchPlaceName, type SearchPlace } from "./places";
import type { DiscoveryPool } from "./pool";
import {
  FALLBACK_ORIGIN,
  isProviderChoice,
  MAX_ADVICE_QUESTIONS,
  MIN_PROVIDER_QUESTIONS,
  originForGenerated,
  validateSearchGroundedPack,
  type QuestionOrigin,
} from "./question-rules";
import { namesSearchPlace, otherPlaceIn } from "./places";
import { normalizedText } from "./text";

export type QuestionMode = "grounded" | "fallback";

const MAX_BRIEF_TOPICS = 20;
const MAX_BRIEF_WORDINGS = 30;

function volumeText(volume: number): string {
  return `±${volume.toLocaleString("id-ID")}/bulan`;
}

/** The rules every pack follows: place and split (R-10, R-10a). */
function placeRules(place: SearchPlace): string[] {
  const name = searchPlaceName(place);
  return [
    `- Minimal ${MIN_PROVIDER_QUESTIONS} pertanyaan tentang memilih tempat atau penyedia (memakai kata seperti rekomendasi, terbaik, terdekat, bagus, tempat, klinik, harga, biaya, tarif, murah, atau "di mana"). Paling banyak ${MAX_ADVICE_QUESTIONS} pertanyaan saran.`,
    name
      ? `- Setiap pertanyaan tentang memilih tempat wajib menyebut "${name}". Jangan menyebut kota atau daerah lain.`
      : `- Jangan menyebut kota atau daerah apa pun, dan jangan memakai kata terdekat, dekat sini, atau di sekitar.`,
  ];
}

/** The text appended to the writer's brief. */
export function searchBrief(
  mode: QuestionMode,
  pool: DiscoveryPool | null,
  place: SearchPlace,
): string {
  const name = searchPlaceName(place) ?? "seluruh Indonesia";
  const lines = [`Kota untuk pencarian: ${name}.`];
  if (mode === "grounded" && pool) {
    lines.push(
      "Data pencarian Google untuk bisnis ini (jumlah per bulan, seluruh Indonesia):",
      ...pool.topics
        .slice(0, MAX_BRIEF_TOPICS)
        .map((topic) => `- Topik: ${topic.text} (${volumeText(topic.volume)})`),
      "Teks yang benar-benar dicari atau ditanyakan orang (pakai kata per kata bila cocok):",
      ...pool.wordings
        .filter((wording) => wording.origin !== "keyword")
        .slice(0, MAX_BRIEF_WORDINGS)
        .map((wording) => `- ${wording.text}`),
      "Aturan tambahan untuk 10 pertanyaan:",
      ...placeRules(place),
      "- Pakai teks di atas kata per kata bila cocok. Jika tidak cocok, tulis pertanyaan pendek sehari-hari yang memuat kata topiknya.",
      "- Setiap layanan yang punya topik mendapat minimal dua pertanyaan; sisanya untuk topik yang paling banyak dicari.",
      "- Lewati teks yang menyebut nama bisnis, klinik, dokter, atau merek produk.",
    );
  } else {
    lines.push("Aturan tambahan untuk 10 pertanyaan:", ...placeRules(place));
  }
  return lines.join("\n");
}

function capitalized(text: string): string {
  return text.charAt(0).toLocaleUpperCase("id-ID") + text.slice(1);
}

function uniqueTake(candidates: string[], count: number, taken: Set<string>) {
  const out: string[] = [];
  for (const text of candidates) {
    const key = normalizedText(text);
    if (!key || taken.has(key)) continue;
    taken.add(key);
    out.push(text);
    if (out.length === count) break;
  }
  return out;
}

/** R-27: labelled synthetic grounded questions from the pool — real wordings
 * first, then short questions on topics — following the place rule and the
 * 8/2 split. */
export function syntheticGroundedTexts(pool: DiscoveryPool): string[] {
  const place = pool.place;
  const name = searchPlaceName(place);
  const at = name ? ` di ${name}` : "";
  const placeOk = (text: string) =>
    !otherPlaceIn(text, place) &&
    (!isProviderChoice(text) || !name || namesSearchPlace(text, place));
  const taken = new Set<string>();
  const wordings = pool.wordings
    .filter((w) => w.origin !== "keyword")
    .map((w) => w.text);
  const provider = uniqueTake(
    [
      ...wordings.filter((text) => isProviderChoice(text) && placeOk(text)),
      ...pool.topics.flatMap((topic) => [
        `Rekomendasi ${topic.text} terbaik${at}?`,
        `Berapa biaya ${topic.text}${at}?`,
        `Tempat ${topic.text} yang bagus${at} di mana?`,
      ]),
    ].filter(placeOk),
    8,
    taken,
  );
  const advice = uniqueTake(
    [
      ...wordings.filter((text) => !isProviderChoice(text) && placeOk(text)),
      ...pool.phrases.flatMap((phrase) => [
        `Berapa lama proses ${phrase}?`,
        `Bagaimana cara merawat hasil ${phrase}?`,
      ]),
    ].filter((text) => !isProviderChoice(text)),
    10 - provider.length,
    taken,
  );
  return [...provider, ...advice].slice(0, 10);
}

/** R-27 / R-08: labelled synthetic fallback questions from the category,
 * under the same place rule and split. */
export function syntheticFallbackTexts(
  context: DirectTenAuditContext,
  place: SearchPlace,
): string[] {
  const category = context.category.value.trim().toLocaleLowerCase("id-ID");
  const name = searchPlaceName(place);
  const at = name ? ` di ${name}` : "";
  // Advice questions must not use provider words; "klinik" is one, so they
  // name the service instead of the category.
  const service = discoveryPhrases(context)[0] ?? "layanan ini";
  return [
    `Rekomendasi ${category} terbaik${at}?`,
    `${capitalized(category)} yang bagus${at} di mana?`,
    `Berapa biaya ${category}${at}?`,
    `${capitalized(category)} murah tapi rapi${at} apa ya?`,
    `Tempat ${category} paling lengkap${at} di mana?`,
    `Harga layanan ${category}${at} biasanya berapa?`,
    `${capitalized(category)} mana yang paling direkomendasikan${at}?`,
    `Cari ${category} terbaik untuk pemula${at}, ada saran?`,
    `Berapa lama proses ${service}?`,
    `Bagaimana cara merawat hasil ${service}?`,
  ];
}

export type SearchGroundedOutcome = GlmQuestionsOutcome & {
  mode?: QuestionMode;
};

/** R-11: the added checks for one mode, with each question's origin. */
export function searchChecks(
  questions: string[],
  mode: QuestionMode,
  pool: DiscoveryPool | null,
  place: SearchPlace,
  context: DirectTenAuditContext,
): { issues: string[]; origins: QuestionOrigin[] } {
  const missingTopic: string[] = [];
  const origins =
    mode === "grounded" && pool
      ? questions.map((question) => {
          const origin = originForGenerated(question, pool);
          if (!origin)
            missingTopic.push("Pertanyaan harus memuat topik yang dicari.");
          return origin ?? FALLBACK_ORIGIN;
        })
      : questions.map(() => FALLBACK_ORIGIN);
  const checkPool =
    mode === "fallback" && pool ? { ...pool, thin: true } : pool;
  const issues = validateSearchGroundedPack({
    questions,
    origins,
    place,
    pool: checkPool,
    brand: brandInputFor(context),
    allowEdited: false,
  }).map((issue) => issue.message);
  return { issues: [...missingTopic, ...issues], origins };
}

/**
 * Writes the ten questions: grounded (twice at most) when the pool is not
 * thin, then the fallback. Any outcome other than a failed check is returned
 * as it is (provider errors keep today's handling).
 */
export async function prepareSearchGroundedQuestions(input: {
  intake: unknown;
  context: DirectTenAuditContext;
  pool: DiscoveryPool | null;
  place: SearchPlace;
  stubBehavior?: unknown;
  transport?: GlmQuestionTransport;
}): Promise<SearchGroundedOutcome> {
  const { pool, place, context } = input;
  const modes: QuestionMode[] =
    pool && !pool.thin ? ["grounded", "grounded", "fallback"] : ["fallback"];
  let last: SearchGroundedOutcome | null = null;
  for (const mode of modes) {
    const outcome = await prepareGlmQuestionsForIntake({
      intake: input.intake,
      stubBehavior: input.stubBehavior,
      transport: input.transport,
      extraBrief: searchBrief(mode, pool, place),
      syntheticTexts:
        mode === "grounded" && pool
          ? syntheticGroundedTexts(pool)
          : syntheticFallbackTexts(context, place),
      postValidate: (questions) =>
        searchChecks(questions, mode, pool, place, context),
    });
    last = { ...outcome, mode };
    if (outcome.status !== "validation_failed") return last;
  }
  return last!;
}
