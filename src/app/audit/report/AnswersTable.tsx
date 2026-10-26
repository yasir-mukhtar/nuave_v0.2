"use client";

import { MentionDot } from "@/components/product/report/MentionDot";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TwoSourceReport } from "@/lib/audit/two-source-report";
import { findNames } from "./mark-names";
import { MENTION_LABEL, SOURCE_LABEL, mentionState } from "./report-v2-data";
import { SOURCE_ICON, useOpenAnswer } from "./AnswerPanel";
import styles from "./answers.module.css";

const SOURCES = ["chatgpt", "google"] as const;

/**
 * Spec 021 Part D: the Jawaban AI table. Its header row ("#", "Pertanyaan",
 * the two source logos with tooltips) sits inside the table; each row opens
 * its question in the side panel.
 */
export function AnswersTable({
  two,
  names,
}: {
  two: TwoSourceReport;
  names: readonly string[];
}) {
  const openAnswer = useOpenAnswer();
  return (
    <TooltipProvider delay={150}>
      <ul className={styles.table} data-answers-table>
        <li className={`${styles.grid} ${styles.head}`}>
          <span>#</span>
          <span>Pertanyaan</span>
          <span className={styles.icons}>
            {SOURCES.map((source) => (
              <Tooltip key={source}>
                <TooltipTrigger
                  render={<span tabIndex={0} />}
                  className={styles.icon}
                  aria-label={SOURCE_LABEL[source]}
                  data-source-logo={source}
                >
                  {SOURCE_ICON[source]}
                </TooltipTrigger>
                <TooltipContent className={styles.tip}>
                  {SOURCE_LABEL[source]}
                </TooltipContent>
              </Tooltip>
            ))}
          </span>
        </li>
        {two.questions.map((question) => {
          const ownName = findNames(question.question, names).length > 0;
          const states = SOURCES.map((source) => ({
            source,
            state: mentionState(question, source),
          }));
          return (
            <li key={question.prompt_id}>
              <button
                type="button"
                className={`${styles.grid} ${styles.row}`}
                onClick={() => openAnswer(question.ordinal)}
                data-answer-row={question.ordinal}
                aria-label={`Pertanyaan ${question.ordinal}: ${question.question}${
                  ownName ? " (menyebut nama Anda)" : ""
                }. ${states
                  .map(
                    ({ source, state }) =>
                      `${SOURCE_LABEL[source]}: ${MENTION_LABEL[state]}.`,
                  )
                  .join(" ")}`}
              >
                <span className={styles.number}>{question.ordinal}</span>
                <span className={styles.question}>
                  {question.question}
                  {ownName ? (
                    <span className={styles.tag}>menyebut nama Anda</span>
                  ) : null}
                </span>
                <span className={styles.marks}>
                  {states.map(({ source, state }) => (
                    <Tooltip key={source}>
                      <TooltipTrigger
                        render={<span />}
                        className={styles.mark}
                        data-mention={state}
                        data-source={source}
                      >
                        <MentionDot look={state} size="sm" />
                      </TooltipTrigger>
                      <TooltipContent className={styles.tip}>
                        {SOURCE_LABEL[source]} · {MENTION_LABEL[state]}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </TooltipProvider>
  );
}
