import { detailShowsObservedGap } from "./contracts";
import type { AuditQuestionMethod } from "./locked-question-pack";
import type { HistoricalPromptPackId } from "./measurement-matrix";
import type { AuditObservation, ReportContent } from "./types";

type ReportPriority = ReportContent["priorities"][number];
type ReportDetail = ReportContent["details"][number];

/**
 * Spec 012 R-13: the two approved non-corrective actions, owned entirely by
 * code. These strings are exact; `{n}` is the observation's approved human
 * ordinal (1–10) and `{id}` is its real prompt_id. They are never sent to a
 * model — no prompt, retry draft, or candidate payload carries them.
 */
const PRESERVATION_ACTION = (n: number) =>
  `Pemeliharaan: periksa dan pertahankan informasi publik yang mendukung rekomendasi pada jawaban pertanyaan ${n}.`;
const PRESERVATION_WHY =
  "Jawaban ini merekomendasikan brand Anda. Pemeriksaan membantu Anda mempertahankan informasi yang benar tanpa menganggap semua informasi sudah lengkap.";
const PRESERVATION_BASIS = (n: number) =>
  `Rekomendasi terlihat pada jawaban pertanyaan ${n}.`;
const PRESERVATION_DONE_WHEN =
  "Informasi tentang brand dalam jawaban sudah diperiksa pada sumber resmi; fakta yang sesuai dan perlu dikonfirmasi dicatat.";
const PRESERVATION_CAVEAT =
  "Rekomendasi ini hanya tercatat pada pengujian tersebut dan bukan jaminan hasil berikutnya.";

const VERIFICATION_ACTION = (n: number) =>
  `Pemeriksaan lanjutan: cocokkan informasi tentang brand dalam jawaban pertanyaan ${n} dengan sumber resmi Anda.`;
const VERIFICATION_WHY =
  "Jawaban ini menyebut brand Anda, tetapi kebenaran informasinya belum dinilai.";
const VERIFICATION_BASIS = (n: number) =>
  `Penilaian informasi pada pertanyaan ${n}: Tidak dinilai dari jawaban yang tersedia.`;
const VERIFICATION_DONE_WHEN =
  "Setiap informasi tentang brand dalam jawaban ditandai sesuai, perlu konfirmasi, atau tidak tercantum pada sumber resmi.";
const VERIFICATION_CAVEAT =
  "Informasi yang belum dinilai bukan berarti salah atau hilang.";

export type NonCorrectiveKind = "preservation" | "verification";

/** The complete field set a persisted priority may carry. Anything else —
 * a discriminator, template ID, or forged tag — is an extra field and fails
 * the exact-match check. */
const PRIORITY_FIELD_SET = [
  "order",
  "timing",
  "action",
  "why",
  "basis",
  "owner",
  "done_when",
  "evidence_prompt_ids",
  "caveat",
] as const;

function buildNonCorrectiveAction(
  kind: NonCorrectiveKind,
  ordinal: number,
  promptId: string,
): ReportPriority {
  if (kind === "preservation") {
    return {
      order: 1,
      timing: "do_next",
      action: PRESERVATION_ACTION(ordinal),
      why: PRESERVATION_WHY,
      basis: PRESERVATION_BASIS(ordinal),
      owner: "business_owner",
      done_when: PRESERVATION_DONE_WHEN,
      evidence_prompt_ids: [promptId],
      caveat: PRESERVATION_CAVEAT,
    };
  }
  return {
    order: 1,
    timing: "do_next",
    action: VERIFICATION_ACTION(ordinal),
    why: VERIFICATION_WHY,
    basis: VERIFICATION_BASIS(ordinal),
    owner: "business_owner",
    done_when: VERIFICATION_DONE_WHEN,
    evidence_prompt_ids: [promptId],
    caveat: VERIFICATION_CAVEAT,
  };
}

type NonCorrectiveInput = {
  details: ReportContent["details"];
  observations: AuditObservation[];
  historicalFixtureId?: HistoricalPromptPackId;
  questionMethod?: AuditQuestionMethod;
};

/**
 * R-13 post-normalization eligibility: a completed observation with a valid
 * detail binding, a visible brand mention, and no observed gap under the
 * unchanged corrective predicate. Preservation needs an explicit
 * recommendation; verification needs an unassessed information result.
 */
function nonCorrectiveEligibility(
  detail: ReportDetail | undefined,
  observation: AuditObservation,
  input: NonCorrectiveInput,
): NonCorrectiveKind | null {
  if (observation.run_status !== "completed") return null;
  if (!detail || detail.prompt_id !== observation.prompt_id) return null;
  if (detail.appearance !== "mentioned") return null;
  if (
    detailShowsObservedGap({
      promptId: observation.prompt_id,
      details: input.details,
      observations: input.observations,
      historicalFixtureId: input.historicalFixtureId,
      questionMethod: input.questionMethod,
    })
  ) {
    return null;
  }
  if (detail.recommendation === "recommended") return "preservation";
  if (detail.information === "not_assessed") return "verification";
  return null;
}

function eligibleCandidates(input: NonCorrectiveInput) {
  const candidates: {
    kind: NonCorrectiveKind;
    ordinal: number;
    promptId: string;
  }[] = [];
  input.observations.forEach((observation, index) => {
    const detail = input.details.find(
      (item) => item.prompt_id === observation.prompt_id,
    );
    const kind = nonCorrectiveEligibility(detail, observation, input);
    if (kind) {
      candidates.push({
        kind,
        ordinal: index + 1,
        promptId: observation.prompt_id,
      });
    }
  });
  return candidates;
}

/**
 * Select at most one eligible code-owned action, preferring preservation over
 * verification and the earliest approved ordinal within each type. Returns
 * null when the method is not direct-ten, corrective actions already survive,
 * or no candidate is eligible. Deterministic request-local logic — never a
 * model call, never persisted state.
 */
export function selectCodeOwnedNonCorrectiveAction(input: {
  content: ReportContent;
  observations: AuditObservation[];
  historicalFixtureId?: HistoricalPromptPackId;
  questionMethod?: AuditQuestionMethod;
}): ReportPriority | null {
  if (input.questionMethod !== "direct-ten") return null;
  if (input.content.priorities.length) return null;
  const candidates = eligibleCandidates({
    details: input.content.details,
    observations: input.observations,
    historicalFixtureId: input.historicalFixtureId,
    questionMethod: input.questionMethod,
  });
  const chosen =
    candidates.find((candidate) => candidate.kind === "preservation") ??
    candidates.find((candidate) => candidate.kind === "verification");
  return chosen
    ? buildNonCorrectiveAction(chosen.kind, chosen.ordinal, chosen.promptId)
    : null;
}

/**
 * R-13 exact validation for the code-owned exception: recompute the single
 * eligible object for this evidence and require the candidate to equal it in
 * every field, enum, and reference order, with the identical field set and no
 * extra keys. Only display `order` may differ (contiguous renumbering); it
 * must still be an integer inside the schema bound. A model-authored copy,
 * an edited field, or a forged tag fails here and falls back to the ordinary
 * observed-gap path.
 */
export function isExactCodeOwnedNonCorrectiveAction(
  priority: ReportPriority,
  input: {
    content: ReportContent;
    observations: AuditObservation[];
    historicalFixtureId?: HistoricalPromptPackId;
    questionMethod?: AuditQuestionMethod;
  },
): boolean {
  const expected = selectCodeOwnedNonCorrectiveAction({
    ...input,
    content: { ...input.content, priorities: [] },
  });
  if (!expected) return false;
  const keys = Object.keys(priority).sort();
  const expectedKeys = [...PRIORITY_FIELD_SET].sort();
  if (
    keys.length !== expectedKeys.length ||
    !expectedKeys.every((key, index) => key === keys[index])
  ) {
    return false;
  }
  return PRIORITY_FIELD_SET.every((field) =>
    field === "order"
      ? Number.isInteger(priority.order) &&
        priority.order >= 1 &&
        priority.order <= 10
      : JSON.stringify(priority[field]) === JSON.stringify(expected[field]),
  );
}
