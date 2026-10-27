import {
  IconAlertCircle,
  IconExternalLink,
  IconWorld,
} from "@tabler/icons-react";
import type { AnswerPresentation } from "@/lib/audit/report-presentation";
import {
  subjectNoun,
  urlDomain,
  type ReportSubject,
  type NamedFact,
  type TwoSourceQuestion,
  type TwoSourceReport,
} from "@/lib/audit/two-source-report";
import { AnswerMarkdown } from "./AnswerMarkdown";
import { AnswerControls, observationTime } from "./ReportAnswer";
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

const NAMED_TEXT: Record<NamedFact, string> = {
  named: "Disebut",
  source_only: "Dipakai sebagai sumber",
  absent: "Tidak disebut",
};

function helpHref(two: TwoSourceReport, question: TwoSourceQuestion) {
  const order = two.order_number ? ` ${two.order_number}` : "";
  const subject = `Minta bantuan pesanan${order}, pertanyaan ${question.ordinal}`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

/** R-20: a failed check. No button runs it again. */
function FailedSlot({
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

function Status({
  label,
  text,
  good,
}: {
  label: string;
  text: string;
  good: boolean;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd data-tone={good ? "good" : "plain"}>
        <span className={styles.dot} aria-hidden="true" />
        {text}
      </dd>
    </div>
  );
}

function SourceList({
  sources,
}: {
  sources: readonly { url: string; title: string }[];
}) {
  if (!sources.length) return null;
  return (
    <ul className={styles.sources}>
      {sources.map((source, i) => {
        const safe = /^https?:\/\//i.test(source.url) ? source.url : null;
        const label = source.title || urlDomain(source.url) || source.url;
        return (
          <li key={i}>
            {safe ? (
              <a
                href={safe}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
              >
                <IconWorld size={18} stroke={1.75} aria-hidden="true" />
                <span>
                  <span>{label}</span>
                  <span>{source.url}</span>
                </span>
                <IconExternalLink size={16} stroke={1.75} aria-hidden="true" />
              </a>
            ) : (
              <span>
                <IconWorld size={18} stroke={1.75} aria-hidden="true" />
                <span>
                  {label}
                  <br />
                  {source.url}
                </span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const NO_VOLUME = "Tidak ada data jumlah pencarian";

/** Spec 021 AC-A4: saved topic lines may say there was no search volume;
 * the report shows the topic alone, or nothing. */
export function topicLine(line: string): string | null {
  if (line === NO_VOLUME) return null;
  return line.replace(` · ${NO_VOLUME}`, "");
}

/** One block per question: the question, its label and topic, then the
 * ChatGPT answer and the Google AI Overview, stacked (no tabs, so the PDF
 * shows everything). */
export function TwoSourceAnswers({
  two,
  answers,
  names,
}: {
  two: TwoSourceReport;
  answers: readonly AnswerPresentation[];
  names: readonly string[];
}) {
  return (
    <>
      {two.questions.map((question) => {
        const answer = answers.find((a) => a.id === question.prompt_id);
        const chatgpt = question.chatgpt;
        const google = question.google;
        return (
          <section
            key={question.prompt_id}
            className={styles.answer}
            aria-labelledby={`report-question-${question.ordinal}`}
            data-report-answer={question.ordinal}
          >
            <header className={styles.questionHeader}>
              <p className={styles.eyebrow}>Pertanyaan {question.ordinal}</p>
              <h3 id={`report-question-${question.ordinal}`} tabIndex={-1}>
                {question.question}
              </h3>
              <p className={styles.originLabel} data-origin-label>
                {question.label_text}
              </p>
              {topicLine(question.topic_line) ? (
                <p className={styles.supporting} data-topic-line>
                  {topicLine(question.topic_line)}
                </p>
              ) : null}
            </header>
            <div className={styles.sourceAnswer} data-source-answer="chatgpt">
              <h4 className={styles.sourceHeading}>
                ChatGPT
                <span> · Ditanya dari {two.places.chatgpt.name}</span>
              </h4>
              {chatgpt.outcome === "answered" && answer ? (
                <>
                  <dl className={styles.statuses}>
                    <Status
                      label="Penyebutan"
                      text={NAMED_TEXT[chatgpt.named ?? "absent"]}
                      good={chatgpt.named === "named"}
                    />
                    <Status
                      label="Rekomendasi"
                      text={
                        chatgpt.recommended
                          ? "Direkomendasikan"
                          : "Tidak direkomendasikan"
                      }
                      good={chatgpt.recommended === true}
                    />
                  </dl>
                  <AnswerMarkdown raw={answer.rawAnswer} names={names} />
                  <div className={styles.provenance}>
                    {answer.sources.length ? <h4>Sumber</h4> : null}
                    <SourceList sources={answer.sources} />
                    <p>
                      Waktu pengamatan:{" "}
                      <time dateTime={answer.observedAt}>
                        {observationTime(answer.observedAt)}
                      </time>
                    </p>
                  </div>
                  <AnswerControls answer={answer} />
                </>
              ) : (
                <FailedSlot two={two} question={question} />
              )}
            </div>
            <div className={styles.sourceAnswer} data-source-answer="google">
              <h4 className={styles.sourceHeading}>
                Google AI Overview
                <span> · Ditanya dari {two.places.google.name}</span>
              </h4>
              {google.outcome === "failed" ? (
                <FailedSlot two={two} question={question} />
              ) : google.outcome === "not_shown" ? (
                <p className={styles.supporting} data-not-shown>
                  Google tidak menampilkan AI Overview
                </p>
              ) : (
                <>
                  <dl className={styles.statuses}>
                    <Status
                      label="Penyebutan"
                      text={NAMED_TEXT[google.named ?? "absent"]}
                      good={google.named === "named"}
                    />
                  </dl>
                  <AnswerMarkdown raw={google.text} names={names} />
                  <div className={styles.provenance}>
                    {google.references.length ? <h4>Sumber</h4> : null}
                    <SourceList sources={google.references} />
                  </div>
                </>
              )}
              {google.outcome !== "failed" && google.observed_at ? (
                <p className={styles.supporting}>
                  Waktu pengamatan:{" "}
                  <time dateTime={google.observed_at}>
                    {observationTime(google.observed_at)}
                  </time>
                </p>
              ) : null}
            </div>
          </section>
        );
      })}
    </>
  );
}
