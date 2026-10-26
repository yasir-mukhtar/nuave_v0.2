import type { AnswerPresentation } from "@/lib/audit/report-presentation";
import type { TwoSourceReport } from "@/lib/audit/two-source-report";
import { SourceAnswer, questionContext } from "./AnswerPanel";
import styles from "./answers.module.css";

/**
 * Spec 021 Part D: every answer in the chat style, for print only. On screen
 * the answers live in the side panel; on paper (and in the PDF) the reader
 * cannot open it, so all of them follow the table here.
 */
export function ReportAppendix({
  two,
  answers,
  names,
}: {
  two: TwoSourceReport;
  answers: readonly AnswerPresentation[];
  names: readonly string[];
}) {
  return (
    <div className={styles.appendix} data-report-appendix>
      <h3>Lampiran: jawaban lengkap</h3>
      {two.questions.map((question) => (
        <section
          key={question.prompt_id}
          className={styles.appendixQuestion}
          aria-labelledby={`report-question-${question.ordinal}`}
          data-report-answer={question.ordinal}
        >
          <p className={styles.context}>
            Pertanyaan {question.ordinal} · {questionContext(question)}
          </p>
          <h3 id={`report-question-${question.ordinal}`}>
            {question.question}
          </h3>
          {(["chatgpt", "google"] as const).map((source) => (
            <SourceAnswer
              key={source}
              two={two}
              question={question}
              source={source}
              answer={answers.find((a) => a.id === question.prompt_id)}
              names={names}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
