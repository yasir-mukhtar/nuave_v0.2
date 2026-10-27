import { IconAlertCircle } from "@tabler/icons-react";
import {
  subjectNoun,
  type ReportSubject,
  type TwoSourceQuestion,
  type TwoSourceReport,
} from "@/lib/audit/two-source-report";
import { SUPPORT_EMAIL } from "@/lib/legal";
import styles from "./report-body.module.css";

/**
 * Spec 018: the parts of a two-source report (ChatGPT and Google AI Overview)
 * that differ from the direct-ten report. Every count, outcome and list here
 * is code-built from the evidence saved with the report; nothing is written by
 * a model. Reports saved before Spec 018 never reach this file (R-29).
 */

export { SUPPORT_EMAIL };
const dateOnly = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeZone: "UTC",
});

/** The day the checks were answered, or null. */
export function checkedDate(two: TwoSourceReport): string | null {
  const at = two.checked_to ?? two.checked_from;
  return at ? dateOnly.format(new Date(at)) : null;
}

/** The R-08 sentence (AC-05), said once in the report. */
export function profileQuestionsNote(subject?: ReportSubject): string {
  return `Data pencarian Google tidak tersedia untuk audit ini, jadi pertanyaan disusun dari profil ${subjectNoun(subject, false)}.`;
}
export const PROFILE_QUESTIONS_NOTE = profileQuestionsNote();

function helpHref(two: TwoSourceReport, question: TwoSourceQuestion) {
  const order = two.order_number ? ` ${two.order_number}` : "";
  const subject = `Minta bantuan pesanan${order}, pertanyaan ${question.ordinal}`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

/** R-20: a failed check. No button runs it again. */
export function FailedSlot({
  two,
  question,
}: {
  two: TwoSourceReport;
  question: TwoSourceQuestion;
}) {
  return (
    <div className={styles.failedSlot} data-failed-slot>
      <p>
        <IconAlertCircle size={16} stroke={1.75} aria-hidden="true" />
        Tidak dapat diuji
      </p>
      <a href={helpHref(two, question)} data-help-link>
        Minta bantuan
      </a>
    </div>
  );
}

const NO_VOLUME = "Tidak ada data jumlah pencarian";

/** Spec 021 AC-A4: saved topic lines may say there was no search volume;
 * the report shows the topic alone, or nothing. */
export function topicLine(line: string): string | null {
  if (line === NO_VOLUME) return null;
  return line.replace(` · ${NO_VOLUME}`, "");
}
