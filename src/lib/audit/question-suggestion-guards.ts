import {
  classifyIndonesianQuestion,
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

function compactIdentity(value: string) {
  return normalizedWords(value).join("");
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

  if (questions.filter(clearlyEnglishQuestion).length >= 8) {
    issues.push("clearly_non_indonesian_output");
  }

  const competitor = compactIdentity(brief.comparison_business?.name ?? "");
  if (competitor.length >= 3) {
    questions.forEach((question, index) => {
      if (index === 5) return;
      if (compactIdentity(question).includes(competitor)) {
        issues.push(`compact_competitor_leakage:${index + 1}`);
      }
    });
  }

  return issues;
}
