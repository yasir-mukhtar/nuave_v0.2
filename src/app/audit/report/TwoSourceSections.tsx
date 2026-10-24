import {
  IconAlertCircle,
  IconExternalLink,
  IconWorld,
} from "@tabler/icons-react";
import type { AnswerPresentation } from "@/lib/audit/report-presentation";
import {
  countSentence,
  googleNamedSentence,
  googleSummarySentence,
  urlDomain,
  type NamedFact,
  type TwoSourceQuestion,
  type TwoSourceReport,
} from "@/lib/audit/two-source-report";
import {
  TenBeads,
  questionList,
  type BeadMark,
} from "@/components/product/report/TenBeads";
import { AnswerMarkdown } from "./AnswerMarkdown";
import { observationTime } from "./ReportAnswer";
import styles from "./report-body.module.css";

/**
 * Spec 018: the parts of a two-source report (ChatGPT and Google AI Overview)
 * that differ from the direct-ten report. Every count, outcome and list here
 * is code-built from the evidence saved with the report; nothing is written by
 * a model. Reports saved before Spec 018 never reach this file (R-29).
 */

export const SUPPORT_EMAIL = "support@nuave.ai";
export const TWO_SOURCE_ANSWERS_TITLE =
  "Jawaban ChatGPT dan Google AI Overview";

const dateOnly = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeZone: "UTC",
});

/** R-13: one place when both are the same, otherwise both. */
export function placesText(places: TwoSourceReport["places"]): string {
  return places.google.name === places.chatgpt.name
    ? places.google.name
    : `Google: ${places.google.name} · ChatGPT: ${places.chatgpt.name}`;
}

/** The day the checks were answered, or null. */
export function checkedDate(two: TwoSourceReport): string | null {
  const at = two.checked_to ?? two.checked_from;
  return at ? dateOnly.format(new Date(at)) : null;
}

/** "Diperiksa di ChatGPT dan Google AI Overview · <tanggal>". */
export function checkedLine(two: TwoSourceReport): string {
  const date = checkedDate(two);
  return `Diperiksa di ChatGPT dan Google AI Overview${date ? ` · ${date}` : ""}`;
}

/** The R-08 sentence (AC-05), said once in the report. */
export const PROFILE_QUESTIONS_NOTE =
  "Data pencarian Google tidak tersedia untuk audit ini, jadi pertanyaan disusun dari profil bisnis Anda.";

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

/** "Hasil singkat": one card per source, each with its own denominator (R-19). */
export function TwoSourceSummary({ two }: { two: TwoSourceReport }) {
  const { counts, questions } = two;
  const marks = (held: (q: TwoSourceQuestion) => boolean | null): BeadMark[] =>
    questions.map((q) => {
      const value = held(q);
      return value === null ? "untested" : value ? "hit" : "miss";
    });
  const numbers = (list: BeadMark[]) =>
    list.flatMap((mark, i) => (mark === "hit" ? [i + 1] : []));
  const said = (list: BeadMark[], hit: string, none: string) =>
    numbers(list).length ? `${hit} ${questionList(numbers(list))}.` : none;
  const chatgptNamed = marks((q) =>
    q.chatgpt.outcome === "answered" ? q.chatgpt.named === "named" : null,
  );
  const chatgptRecommended = marks((q) =>
    q.chatgpt.outcome === "answered" ? q.chatgpt.recommended === true : null,
  );
  const googleShown = marks((q) =>
    q.google.outcome === "failed" ? null : q.google.outcome === "summary",
  );
  const googleNamed = marks((q) =>
    q.google.outcome === "summary" ? q.google.named === "named" : null,
  );
  const n = counts.chatgpt.completed;
  const z = counts.google.summaries;
  const m = counts.google.completed;
  return (
    <>
      <div className={styles.resultCard} data-source-card="chatgpt">
        <h3 className={styles.sourceTitle}>ChatGPT</h3>
        {n > 0 ? (
          <p className={styles.bigNumber} aria-hidden="true">
            <span>{counts.chatgpt.named}</span>
            <span>dari {n}</span>
          </p>
        ) : null}
        <p className={styles.count}>
          {countSentence("muncul", counts.chatgpt.named, n)}
        </p>
        {n > 0 ? (
          <TenBeads
            marks={chatgptNamed}
            tone="ember"
            summary={said(
              chatgptNamed,
              "Disebut di pertanyaan",
              "Tidak disebut di pertanyaan mana pun.",
            )}
          />
        ) : null}
        <div className={styles.cardRule} />
        <p className={styles.count}>
          {countSentence("direkomendasikan", counts.chatgpt.recommended, n)}
        </p>
        {n > 0 ? (
          <TenBeads
            marks={chatgptRecommended}
            tone="ink"
            summary={said(
              chatgptRecommended,
              "Direkomendasikan di pertanyaan",
              "Tidak direkomendasikan di pertanyaan mana pun.",
            )}
          />
        ) : null}
      </div>
      <div className={styles.resultCard} data-source-card="google">
        <h3 className={styles.sourceTitle}>Google AI Overview</h3>
        {m > 0 ? (
          <p className={styles.bigNumber} aria-hidden="true">
            <span>{z}</span>
            <span>dari {m}</span>
          </p>
        ) : null}
        <p className={styles.count}>{googleSummarySentence(z, m)}</p>
        {m > 0 ? (
          <TenBeads
            marks={googleShown}
            tone="ink"
            summary={said(
              googleShown,
              "AI Overview tampil di pertanyaan",
              "AI Overview tidak tampil di pertanyaan mana pun.",
            )}
          />
        ) : null}
        <div className={styles.cardRule} />
        <p className={styles.count}>
          {googleNamedSentence(counts.google.named, z)}
        </p>
        {z > 0 ? (
          <TenBeads
            marks={googleNamed}
            tone="ember"
            summary={said(
              googleNamed,
              "Disebut di pertanyaan",
              "Tidak disebut di pertanyaan mana pun.",
            )}
          />
        ) : null}
      </div>
      {counts.failed > 0 ? (
        <p className={styles.completion} data-failed-count>
          <IconAlertCircle size={16} stroke={1.75} aria-hidden="true" />
          {counts.failed} pemeriksaan tidak dapat diuji
        </p>
      ) : null}
    </>
  );
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
              <p className={styles.supporting} data-topic-line>
                {question.topic_line}
              </p>
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

/** "Bisnis lain yang disebut", one short list per source. */
export function OtherBusinesses({ two }: { two: TwoSourceReport }) {
  const lists = [
    ["ChatGPT", two.other_businesses.chatgpt],
    ["Google AI Overview", two.other_businesses.google],
  ] as const;
  if (lists.every(([, names]) => names.length === 0)) return null;
  return (
    <div className={styles.comparators} data-other-businesses>
      <h3>Bisnis lain yang disebut</h3>
      {lists.map(([source, names]) => (
        <div key={source} className={styles.comparator}>
          <p>
            <strong>{source}</strong>
          </p>
          <p>{names.length ? names.join(", ") : "Tidak ada."}</p>
        </div>
      ))}
    </div>
  );
}

const volumeFormat = new Intl.NumberFormat("id-ID");

/** R-18: built by code from the evidence. */
export function TopicsMissing({ two }: { two: TwoSourceReport }) {
  if (!two.topics_missing.length) return null;
  return (
    <div className={styles.comparators} data-topics-missing>
      <h3>Topik yang belum menyebut Anda</h3>
      <ol className={styles.items}>
        {two.topics_missing.map((row) => (
          <li key={row.prompt_id} className={styles.card}>
            <p>
              <strong>{row.topic}</strong>
            </p>
            <p className={styles.supporting}>
              {row.volume !== null
                ? `±${volumeFormat.format(row.volume)} pencarian/bulan di Google`
                : "Tidak ada data jumlah pencarian"}
              {` · Pertanyaan ${row.ordinal}`}
            </p>
            {row.domains.length ? (
              <p className={styles.supporting}>
                Dikutip: {row.domains.join(", ")}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** "Tentang audit ini": where the questions and answers came from. */
export function TwoSourceMethod({ two }: { two: TwoSourceReport }) {
  const month = two.questions.find((q) => q.data_month)?.data_month;
  return (
    <ul className={styles.method} data-two-source-method>
      {two.search_data_available ? (
        <li>
          Pertanyaan diambil dari data pencarian Google melalui DataForSEO
          {month ? ` (data ${monthText(month)})` : ""}, seluruh Indonesia.
        </li>
      ) : null}
      <li>
        Jawaban ChatGPT diambil dari aplikasi ChatGPT, ditanya dari{" "}
        {two.places.chatgpt.name}. Jawaban Google diambil dari halaman hasil
        Google untuk {two.places.google.name}. Keduanya melalui DataForSEO.
      </li>
      <li>
        Jawaban dapat berbeda menurut waktu, akun, dan lokasi. Disebut bukan
        berarti direkomendasikan.
      </li>
      <li>
        Ekspor bukti menyimpan pertanyaan, jawaban, sumber, waktu, dan hasil
        dari laporan yang sama.
      </li>
    </ul>
  );
}

const monthFormat = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function monthText(month: string): string {
  const at = Date.parse(`${month}-01T00:00:00Z`);
  return Number.isFinite(at) ? monthFormat.format(new Date(at)) : month;
}
