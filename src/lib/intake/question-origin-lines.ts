/** Spec 018 Experience 3: the origin label and topic line under each of the
 * ten questions, from the server-owned origins (R-07). */
import {
  numberShown,
  originsForApproved,
  QUESTION_LABEL_TEXT,
  type QuestionOrigin,
} from "../discovery/question-rules";

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** "2026-09" → "September 2026". */
export function dataMonthText(month: string | null): string | null {
  const match = month?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const name = MONTHS[Number(match[2]) - 1];
  return name ? `${name} ${match[1]}` : null;
}

export type QuestionOriginLines = { label: string; topic: string };

/** What the screen shows for one question as it stands now. */
export function questionOriginLines(
  question: string,
  origin: QuestionOrigin,
): QuestionOriginLines {
  const label = QUESTION_LABEL_TEXT[origin.label];
  const topic = origin.topic ?? origin.originalTopic ?? null;
  const prefix = origin.label === "diubah_oleh_anda" ? "Topik awal" : "Topik";
  if (!topic) return { label, topic: "Tidak ada data jumlah pencarian" };
  if (!numberShown(question, origin))
    return {
      label,
      topic: `${prefix}: ${topic} · Tidak ada data jumlah pencarian`,
    };
  const month = dataMonthText(origin.dataMonth);
  return {
    label,
    topic: `${prefix}: ${topic} · ±${origin.volume!.toLocaleString("id-ID")} pencarian/bulan di Google, seluruh Indonesia${month ? ` (data ${month})` : ""}`,
  };
}

/** The origins for the questions as the owner left them (AC-19); the server
 * derives the same itself at approval. */
export function currentOrigins(pack: {
  originals: string[];
  approved: string[];
  origins?: QuestionOrigin[];
}): QuestionOrigin[] | null {
  return pack.origins
    ? originsForApproved({
        approved: pack.approved,
        generated: pack.originals,
        generatedOrigins: pack.origins,
      })
    : null;
}
