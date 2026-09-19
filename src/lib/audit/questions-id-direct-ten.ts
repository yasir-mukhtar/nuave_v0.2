/** Spec 009 direct-ten GLM boundary (approved 2026-09-18).
 *
 * Pure functions only: no provider registration, no fetch, no route or UI
 * dispatch, no credentials, no storage service. Nothing here generates
 * replacement text — every failure is explicit and the caller retains the
 * supplied input/response for review.
 *
 * This is the NEW method: one minimized brief -> ten directly generated
 * unnamed questions. No slot matrix, fixed purposes, 6/4 split, named
 * questions, required competitor, per-slot context, or punctuation proxy.
 * The dormant slot-contract prototype (questions-id-glm.ts) stays unchanged
 * for its own historical records; shared transport/provenance mechanics are
 * imported from it rather than duplicated.
 */
import {
  INDONESIAN_QUESTION_GLM_MAX_OUTPUT_TOKENS,
  INDONESIAN_QUESTION_GLM_MODEL,
  INDONESIAN_QUESTION_GLM_REASONING_EFFORT,
  minimizedBriefFromQuestionFacts,
} from "./questions-id-glm";
import type { QuestionFactsV3 } from "./question-facts-v3";
import {
  containsIndonesianComparisonIdentity,
  INDONESIAN_HIGH_IMPACT_ADVICE_PATTERNS,
  INDONESIAN_PRIVATE_DATA_PATTERNS,
  INDONESIAN_PROVIDER_SAFETY_PATTERNS,
  mentionsIndonesianBrand,
  type MinimizedIndonesianBrief,
  normalizeIndonesianIdentity,
} from "./questions-id";
import {
  DIRECT_TEN_SAMPLE_BRAND_PLACEHOLDER,
  glmDirectTenWriterInstruction,
} from "./questions-id-direct-ten-instruction";

export const INDONESIAN_QUESTION_DIRECT_TEN_INSTRUCTION_VERSION =
  "glm-direct-ten-2026-09-18" as const;
// Shared transport/provenance mechanics stay imported from the dormant slot
// module rather than duplicated; its own contract is untouched.

// ---------------------------------------------------------------------------
// One minimized brief (R-02) — replaces the per-slot context projection
// ---------------------------------------------------------------------------

/**
 * The single brief the writer receives. Confirmed facts, buyer preferences
 * (tagged, never asserted as business capabilities) and explicit unknowns are
 * distinguished, matching the accepted request's labeled-text convention.
 * The target identity is supplied with a do-not-name rule (in the amendment);
 * comparator names are listed only as identities to avoid — never required.
 * Guard-only signals (source URLs, fingerprints) never appear.
 */
export function buildDirectTenWriterBrief(facts: QuestionFactsV3) {
  const lines: string[] = [
    "Confirmed business information for one audited business.",
    `Nama: ${facts.identity.brand}`,
    `Kategori: ${facts.category || "(tidak diketahui)"}`,
  ];
  const scopeText =
    facts.entityScope.kind === "whole-brand"
      ? `Seluruh brand ${facts.identity.brand}`
      : facts.entityScope.kind === "branch"
        ? `Cabang${facts.entityScope.name ? ` ${facts.entityScope.name}` : ""}${facts.entityScope.address ? ` — ${facts.entityScope.address}` : ""}`
        : facts.entityScope.kind === "offering"
          ? `Penawaran${facts.entityScope.name ? ` ${facts.entityScope.name}` : ""}${facts.entityScope.detail ? ` — ${facts.entityScope.detail}` : ""}`
          : "(tidak diketahui)";
  lines.push(`Cakupan: ${scopeText}`);
  if (facts.businessType) lines.push(`Jenis bisnis: ${facts.businessType}`);
  if (facts.offerings.length)
    lines.push(`Penawaran: ${facts.offerings.join("; ")}`);
  const market =
    facts.marketContext.reach === "national"
      ? "seluruh Indonesia"
      : facts.marketContext.reach === "international"
        ? "Indonesia dan luar negeri"
        : facts.marketContext.areas.length
          ? facts.marketContext.areas.join("; ")
          : null;
  if (market) lines.push(`Area layanan: ${market}`);
  if (facts.marketContext.description)
    lines.push(`Konteks pasar: ${facts.marketContext.description}`);
  if (facts.serviceChannels?.length) {
    const labels = {
      on_premise: "layanan di lokasi bisnis",
      on_customer: "layanan di lokasi pelanggan",
      delivery: "pengiriman ke pelanggan",
      online: "penggunaan secara online",
    } as const;
    lines.push(
      `Saluran layanan: ${facts.serviceChannels.map((c) => labels[c]).join("; ")}`,
    );
  }
  if (facts.targetCustomer) lines.push(`Pelanggan: ${facts.targetCustomer}`);
  if (facts.customerNeeds.length)
    lines.push(`Kebutuhan pelanggan: ${facts.customerNeeds.join("; ")}`);
  if (facts.buyerConstraints.length)
    lines.push(
      `Preferensi pembeli (bukan klaim tentang bisnis): ${facts.buyerConstraints.map((c) => c.text).join("; ")}`,
    );
  if (facts.accessConstraints.length)
    lines.push(
      `Akses/pemenuhan yang dikonfirmasi: ${facts.accessConstraints.map((c) => c.text).join("; ")}`,
    );
  if (facts.safeFacts.length)
    lines.push(
      `Fakta tambahan dari pembeli: ${facts.safeFacts.map((f) => f.text).join("; ")}`,
    );
  const doNotName = [
    ...facts.identity.aliases,
    ...facts.identity.targets,
    ...facts.identity.comparators,
  ].filter((name) => name && name !== facts.identity.brand);
  if (doNotName.length)
    lines.push(
      `Nama lain / pembanding yang juga tidak boleh disebut: ${doNotName.join("; ")}`,
    );
  const unknowns: string[] = [];
  if (!facts.category) unknowns.push("kategori");
  if (!facts.offerings.length) unknowns.push("penawaran");
  if (!market) unknowns.push("wilayah layanan");
  if (!facts.customerNeeds.length && !facts.targetCustomer)
    unknowns.push("kebutuhan pelanggan");
  unknowns.push("harga", "kualitas layanan", "fitur lain yang tidak tercantum");
  lines.push(
    `Tidak diketahui: ${unknowns.join(", ")}. Jangan mengarang fakta tentang bisnis ini.`,
  );
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Request builder — exact proposed request body (pure)
// ---------------------------------------------------------------------------

/**
 * Build the exact chat-completions request for the direct-ten contract. The
 * adapted instruction is assembled from the verbatim recovered body; the
 * sample-brand placeholder is substituted with the one minimized brief.
 */
export function buildDirectTenQuestionRequest(brief: string) {
  const instruction = glmDirectTenWriterInstruction();
  if (!instruction.includes(DIRECT_TEN_SAMPLE_BRAND_PLACEHOLDER)) {
    throw new Error(
      "direct-ten source body drifted — sample-brand placeholder missing",
    );
  }
  return {
    model: INDONESIAN_QUESTION_GLM_MODEL,
    stream: false,
    max_tokens: INDONESIAN_QUESTION_GLM_MAX_OUTPUT_TOKENS,
    reasoning_effort: INDONESIAN_QUESTION_GLM_REASONING_EFFORT,
    messages: [
      {
        role: "user",
        content: instruction.replace(
          DIRECT_TEN_SAMPLE_BRAND_PLACEHOLDER,
          brief,
        ),
      },
    ],
  } as const;
}

// ---------------------------------------------------------------------------
// Strict three-section extractor (R-03 — never silently drops text)
// ---------------------------------------------------------------------------

export const DIRECT_TEN_SECTION_MARKERS = {
  marketInterpretation: "## 1. Market interpretation",
  candidateQuestions: "## 2. Candidate questions",
  selfCritique: "## 3. Self-critique",
} as const;

export type DirectTenExtractionFailure =
  | "missing_marker"
  | "duplicate_marker"
  | "marker_order"
  | "unexpected_preamble"
  | "unexpected_line"
  | "bad_numbering";

export type DirectTenExtractionResult =
  | {
      ok: true;
      questions: string[];
      /** Optional "Intent pattern:" labels, aligned to questions (null when absent). */
      intentLabels: (string | null)[];
      /** Section 1 and 3 text, preserved verbatim for inspection. */
      marketInterpretation: string;
      selfCritique: string;
    }
  | { ok: false; reason: DirectTenExtractionFailure; detail: string };

const NUMBERED_ITEM = /^\s*(\d{1,2})[.)]\s+(\S.*)$/;
const INTENT_LABEL = /^\s*Intent pattern\s*:\s*(\S.*)$/;

/**
 * Extract exactly the ten candidate questions from the three-section
 * response. Markers must appear once each and in order; inside the "## 2."
 * span only blank lines, numbered question lines 1–10 in canonical order,
 * and each question's single optional `Intent pattern:` label line are
 * accepted. Anything else — wrapped continuations, prose, stray numbers —
 * rejects the whole extraction; a malformed item is never shortened into a
 * question. Sections 1 and 3 are never read into question text.
 */
export function extractDirectTenQuestions(
  text: string,
): DirectTenExtractionResult {
  const lines = text.split("\n");
  const markerAt = (needle: string) =>
    lines.reduce<number[]>(
      (acc, line, i) => (line.trim() === needle ? [...acc, i] : acc),
      [],
    );
  const m1 = markerAt(DIRECT_TEN_SECTION_MARKERS.marketInterpretation);
  const m2 = markerAt(DIRECT_TEN_SECTION_MARKERS.candidateQuestions);
  const m3 = markerAt(DIRECT_TEN_SECTION_MARKERS.selfCritique);
  for (const [name, hits] of [
    ["## 1.", m1],
    ["## 2.", m2],
    ["## 3.", m3],
  ] as const) {
    if (hits.length === 0)
      return {
        ok: false,
        reason: "missing_marker",
        detail: `no ${name} marker line`,
      };
    if (hits.length > 1)
      return {
        ok: false,
        reason: "duplicate_marker",
        detail: `${hits.length} ${name} marker lines`,
      };
  }
  if (!(m1[0]! < m2[0]! && m2[0]! < m3[0]!)) {
    return {
      ok: false,
      reason: "marker_order",
      detail: "section markers out of order",
    };
  }
  if (lines.slice(0, m1[0]).some((line) => line.trim())) {
    return {
      ok: false,
      reason: "unexpected_preamble",
      detail: "non-blank text before ## 1.",
    };
  }

  const questions: string[] = [];
  const intentLabels: (string | null)[] = [];
  const seen: number[] = [];
  let previousWasQuestion = false;
  for (const line of lines.slice(m2[0]! + 1, m3[0])) {
    if (!line.trim()) {
      previousWasQuestion = false;
      continue;
    }
    const numbered = line.match(NUMBERED_ITEM);
    if (numbered) {
      seen.push(Number(numbered[1]));
      questions.push(numbered[2]!.trim());
      intentLabels.push(null);
      previousWasQuestion = true;
      continue;
    }
    const label = line.match(INTENT_LABEL);
    if (label && previousWasQuestion && intentLabels.length) {
      intentLabels[intentLabels.length - 1] = label[1]!.trim();
      previousWasQuestion = false;
      continue;
    }
    return {
      ok: false,
      reason: "unexpected_line",
      detail: `line inside "## 2." span is not a numbered question, blank, or intent label: ${line.slice(0, 60)}`,
    };
  }
  if (seen.length !== 10 || seen.some((n, i) => n !== i + 1)) {
    return {
      ok: false,
      reason: "bad_numbering",
      detail: `numbered items must be exactly 1–10 in order; got [${seen.join(", ")}]`,
    };
  }
  return {
    ok: true,
    questions,
    intentLabels,
    marketInterpretation: lines
      .slice(m1[0]! + 1, m2[0])
      .join("\n")
      .trim(),
    selfCritique: lines
      .slice(m3[0]! + 1)
      .join("\n")
      .trim(),
  };
}

// ---------------------------------------------------------------------------
// Direct-ten validation (R-04 — retained protections only)
// ---------------------------------------------------------------------------

export type DirectTenValidationRule =
  | "count"
  | "empty"
  | "length"
  | "unexecutable"
  | "identity_leakage"
  | "competitor_leakage"
  | "unsupported_premise"
  | "private_data"
  | "high_impact_advice"
  | "provider_safety"
  | "distinctness";

export type DirectTenValidationIssue = {
  /** 1-based position in the flat list; null for pack-level issues. */
  slot: number | null;
  rule: DirectTenValidationRule;
  message: string;
};

const DIRECT_TEN_MIN_LENGTH = 8;
const DIRECT_TEN_MAX_QUESTION_LENGTH = 700;

/** Guarantee tokens stay rejected — an asserted premise, not a natural ask. */
const DIRECT_TEN_GUARANTEE_PATTERNS = [/\b(?:dijamin|jaminan|dipastikan)\b/i];

/**
 * The direct-ten pack rules: exactly ten complete texts; nonempty and
 * bounded length; no audited-business identity, alias, target or confirmed
 * comparator in any question; no guarantee/premise tokens; the shared
 * private-data, high-impact and provider-safety protections; exact
 * duplicates flagged for human review. There is deliberately NO purpose,
 * composition, comparison-relation or punctuation rule — a direct request
 * with no question mark, several question marks, or a context sentence is a
 * valid text. No naturalness classifier; wording quality stays a human
 * judgment.
 */
/**
 * The identity context every direct-ten boundary validates against. The
 * intake-time caller supplies the projected facts; the audit lock/run/report
 * boundaries supply the minimized confirmed brief plus the comparator names
 * carried by their own brief record — the checks are identical.
 */
export type DirectTenIdentityContext = {
  /** Minimized brief used for audited-identity detection. */
  brief: MinimizedIndonesianBrief;
  /** Confirmed comparator names that must not appear in any question. */
  comparators: string[];
};

export function validateDirectTenQuestions(
  questions: string[],
  context: DirectTenIdentityContext,
): DirectTenValidationIssue[] {
  const issues: DirectTenValidationIssue[] = [];
  if (questions.length !== 10) {
    issues.push({
      slot: null,
      rule: "count",
      message: `Paket pertanyaan metode langsung harus berisi tepat 10 pertanyaan, diterima ${questions.length}.`,
    });
    return issues;
  }

  const brief = context.brief;
  const forbiddenIdentities = [
    ...context.comparators.map((name) => ({
      name,
      rule: "competitor_leakage" as const,
      message: (order: number) =>
        `Pertanyaan ${order} tidak boleh menyebut bisnis pembanding.`,
    })),
  ];

  questions.forEach((question, index) => {
    const order = index + 1;
    const normalized = question.replace(/\s+/g, " ").trim();
    if (!normalized) {
      issues.push({
        slot: order,
        rule: "empty",
        message: `Pertanyaan ${order} tidak boleh kosong.`,
      });
      return;
    }
    if (question.trim().length > DIRECT_TEN_MAX_QUESTION_LENGTH) {
      issues.push({
        slot: order,
        rule: "length",
        message: `Pertanyaan ${order} tidak boleh lebih dari 700 karakter.`,
      });
    }
    if (normalized.length < DIRECT_TEN_MIN_LENGTH) {
      issues.push({
        slot: order,
        rule: "unexecutable",
        message: `Pertanyaan ${order} terlalu singkat untuk dijalankan sebagai pertanyaan mandiri.`,
      });
    }

    // Every question is unnamed: the audited identity (brand, aliases,
    // targets, source domains via the minimized brief) must not appear.
    if (mentionsIndonesianBrand(question, brief)) {
      issues.push({
        slot: order,
        rule: "identity_leakage",
        message: `Pertanyaan ${order} tidak boleh menyebut bisnis Anda.`,
      });
    }
    for (const identity of forbiddenIdentities) {
      if (containsIndonesianComparisonIdentity(question, identity.name)) {
        issues.push({
          slot: order,
          rule: identity.rule,
          message: identity.message(order),
        });
      }
    }

    if (
      DIRECT_TEN_GUARANTEE_PATTERNS.some((pattern) => pattern.test(question))
    ) {
      issues.push({
        slot: order,
        rule: "unsupported_premise",
        message: `Pertanyaan ${order} tidak boleh menganggap fakta yang belum dikonfirmasi sebagai benar.`,
      });
    }

    if (
      INDONESIAN_PRIVATE_DATA_PATTERNS.some((pattern) => pattern.test(question))
    ) {
      issues.push({
        slot: order,
        rule: "private_data",
        message: `Question ${order} requests or exposes private or sensitive personal data.`,
      });
    }
    if (
      INDONESIAN_HIGH_IMPACT_ADVICE_PATTERNS.some((pattern) =>
        pattern.test(question),
      )
    ) {
      issues.push({
        slot: order,
        rule: "high_impact_advice",
        message: `Question ${order} asks for individualized high-impact advice that Nuave does not provide.`,
      });
    }
    if (
      INDONESIAN_PROVIDER_SAFETY_PATTERNS.some((pattern) =>
        pattern.test(question),
      )
    ) {
      issues.push({
        slot: order,
        rule: "provider_safety",
        message: `Question ${order} asks the provider to do something it cannot lawfully or safely process.`,
      });
    }
  });

  // Exact duplicates flag human review; no diverse replacement is fabricated.
  const seen = new Set<string>();
  questions.forEach((question, index) => {
    const normalized = normalizeIndonesianIdentity(question);
    if (seen.has(normalized)) {
      issues.push({
        slot: index + 1,
        rule: "distinctness",
        message:
          "Pertanyaan ini sama dengan pertanyaan lain dalam paket. Periksa dan ubah bila perlu.",
      });
    } else {
      seen.add(normalized);
    }
  });

  return issues;
}

/**
 * Intake-time entry point: validate against the projected facts the pack was
 * generated for. Audit boundaries use `validateDirectTenQuestions` with the
 * minimized brief their own record carries.
 */
export function validateDirectTenQuestionPack(
  questions: string[],
  facts: QuestionFactsV3,
): DirectTenValidationIssue[] {
  return validateDirectTenQuestions(questions, {
    brief: minimizedBriefFromQuestionFacts(facts),
    comparators: facts.identity.comparators,
  });
}
