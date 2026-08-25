import {
  classifyIndonesianQuestion,
  containsIndonesianComparisonIdentity,
  type MinimizedIndonesianBrief,
} from "./questions-id";

function normalizedWords(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

const ENGLISH_MARKERS = new Set([
  "what",
  "which",
  "where",
  "when",
  "why",
  "how",
  "does",
  "do",
  "is",
  "are",
  "can",
  "recommend",
  "recommended",
  "compare",
  "near",
  "best",
  "for",
  "with",
]);

const INDONESIAN_MARKERS = new Set([
  "apa",
  "apakah",
  "bagaimana",
  "berapa",
  "dimana",
  "mana",
  "yang",
  "untuk",
  "dengan",
  "saya",
  "ada",
  "cari",
  "rekomendasi",
  "bandingkan",
  "menyediakan",
  "alamat",
  "jam",
]);

function clearlyEnglishQuestion(question: string) {
  const words = normalizedWords(question);
  const english = words.filter((word) => ENGLISH_MARKERS.has(word)).length;
  const indonesian = words.filter((word) =>
    INDONESIAN_MARKERS.has(word),
  ).length;
  return english >= 2 && english > indonesian * 2;
}

/**
 * Spec 002 requires the model-authored default to be Indonesian while allowing
 * familiar borrowed terms. We therefore count only questions that are
 * independently clearly English. When a majority of the ten-question default
 * is clearly English, the whole pack is materially non-Indonesian and cannot
 * truthfully be stamped id-ID.
 */
const CLEARLY_ENGLISH_MAJORITY = 6;

/**
 * Guards only the model-authored DEFAULT suggestion. These constraints are not
 * applied after customer editing: the final approved pack may have any
 * name/no-name balance allowed by the locked-pack contract.
 */
export function generatedSuggestionGuardIssues(
  questions: string[],
  brief: MinimizedIndonesianBrief,
): string[] {
  if (questions.length !== 10) return [];
  const issues: string[] = [];

  const unbranded = questions.filter(
    (question) =>
      classifyIndonesianQuestion(question, brief) ===
      "tanpa_menyebut_bisnis_anda",
  ).length;
  if (unbranded !== 5) issues.push("default_composition_not_five_five");

  if (
    questions.filter(clearlyEnglishQuestion).length >= CLEARLY_ENGLISH_MAJORITY
  ) {
    issues.push("clearly_non_indonesian_output");
  }

  const competitor = brief.comparison_business?.name ?? "";
  questions.forEach((question, index) => {
    if (index === 5) return;
    if (containsIndonesianComparisonIdentity(question, competitor)) {
      issues.push(`compact_competitor_leakage:${index + 1}`);
    }
  });

  return issues;
}
