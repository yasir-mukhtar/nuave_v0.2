"use client";

import {
  createContext,
  memo,
  useContext,
  useDeferredValue,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  IconBrandGoogle,
  IconBrandOpenai,
  IconChevronLeft,
  IconChevronRight,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MentionDot } from "@/components/product/report/MentionDot";
import type { AnswerPresentation } from "@/lib/audit/report-presentation";
import {
  urlDomain,
  type TwoSourceQuestion,
  type TwoSourceReport,
} from "@/lib/audit/two-source-report";
import { AnswerMarkdown } from "./AnswerMarkdown";
import { AnswerControls, observationTime } from "./ReportAnswer";
import {
  MENTION_LABEL,
  SOURCE_LABEL,
  mentionState,
  type Source,
} from "./report-v2-data";
import { FailedSlot, topicLine } from "./TwoSourceSections";
import styles from "./answers.module.css";

/**
 * Spec 021 Part D: one question's answers in a side panel, ChatGPT and Google
 * AI Overview as tabs, in a chat layout. Dots, table rows and "P" references
 * all open it through `useOpenAnswer`.
 */

export const SOURCE_ICON: Record<Source, ReactNode> = {
  chatgpt: <IconBrandOpenai stroke={1.75} aria-hidden="true" />,
  google: <IconBrandGoogle stroke={1.75} aria-hidden="true" />,
};

export type OpenAnswer = (ordinal: number, source?: Source) => void;

const OpenAnswerContext = createContext<OpenAnswer>(() => {});

/** Opens the side panel on a question (and, optionally, a source tab). */
export function useOpenAnswer() {
  return useContext(OpenAnswerContext);
}

/** One source's answer to one question: status, the answer, its sources and
 * when it was observed. The panel and the print appendix both use it. */
export const SourceAnswer = memo(function SourceAnswer({
  two,
  question,
  source,
  answer,
  names,
}: {
  two: TwoSourceReport;
  question: TwoSourceQuestion;
  source: Source;
  /** The validated ChatGPT answer (its raw text, sources and time). */
  answer: AnswerPresentation | undefined;
  names: readonly string[];
}) {
  const state = mentionState(question, source);
  const place =
    source === "chatgpt" ? two.places.chatgpt.name : two.places.google.name;
  const google = question.google;
  const answered =
    source === "chatgpt"
      ? question.chatgpt.outcome === "answered" && answer !== undefined
      : google.outcome === "summary";
  const sources =
    source === "chatgpt" ? (answer?.sources ?? []) : google.references;
  const observedAt =
    source === "chatgpt" ? answer?.observedAt : google.observed_at;
  return (
    <div className={styles.ai} data-source-answer={source}>
      <span className={styles.avatar}>{SOURCE_ICON[source]}</span>
      <div className={styles.reply}>
        <p className={styles.status}>
          <span className={styles.pill} data-mention-status={state}>
            <MentionDot look={state} size="sm" />
            {MENTION_LABEL[state]}
          </span>
          <span>
            {SOURCE_LABEL[source]} · Ditanya dari {place}
          </span>
        </p>
        {state === "failed" || !answered ? (
          state === "noaio" ? (
            <p className={styles.empty} data-not-shown>
              Google tidak menampilkan AI Overview untuk pertanyaan ini saat
              diperiksa.
            </p>
          ) : (
            <FailedSlot two={two} question={question} />
          )
        ) : (
          <AnswerMarkdown
            raw={source === "chatgpt" ? answer!.rawAnswer : google.text}
            names={names}
          />
        )}
        {answered && sources.length ? (
          <ul className={styles.srcs} aria-label="Sumber">
            {sources.map((item, i) => {
              const safe = /^https?:\/\//i.test(item.url) ? item.url : null;
              const label = urlDomain(item.url) || item.title || item.url;
              return (
                <li key={i}>
                  {safe ? (
                    <a
                      className={styles.src}
                      href={safe}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                      title={item.title || safe}
                    >
                      {label}
                    </a>
                  ) : (
                    <span className={styles.src}>{label}</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
        {state !== "failed" && observedAt ? (
          <p className={styles.time}>
            Waktu pengamatan:{" "}
            <time dateTime={observedAt}>{observationTime(observedAt)}</time>
          </p>
        ) : null}
        {source === "chatgpt" && answered ? (
          <AnswerControls answer={answer!} />
        ) : null}
      </div>
    </div>
  );
});

/** Where the question came from, as one short line (topic and volume). */
export function questionContext(question: TwoSourceQuestion) {
  const topic = topicLine(question.topic_line);
  return topic ? `${question.label_text} · ${topic}` : question.label_text;
}

/** Owns the panel's state and gives every opener the same `openAnswer`. */
export function AnswerPanelProvider({
  two,
  answers,
  names,
  children,
}: {
  two: TwoSourceReport;
  answers: readonly AnswerPresentation[];
  names: readonly string[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [ordinal, setOrdinal] = useState(1);
  const [source, setSource] = useState<Source>("chatgpt");
  // Focus goes back to whatever opened the panel (Spec 021 D-02).
  const opener = useRef<HTMLElement | null>(null);
  const openAnswer: OpenAnswer = (next, nextSource = "chatgpt") => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setOrdinal(next);
    setSource(nextSource);
    setOpen(true);
  };
  const total = two.questions.length;
  const questionAt = (n: number) =>
    two.questions.find((q) => q.ordinal === n) ?? two.questions[0]!;
  const question = questionAt(ordinal);
  // The answer text is the costly part to draw. It follows a moment later,
  // in an interruptible render, so the click only shows the panel and the
  // slide starts at once (Spec 021 AC-D2).
  const shownQuestion = questionAt(useDeferredValue(ordinal));
  const answer = answers.find((a) => a.id === shownQuestion.prompt_id);
  return (
    <OpenAnswerContext.Provider value={openAnswer}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          overlayBlur={false}
          overlayClassName={styles.overlay}
          className={styles.panel}
          finalFocus={opener}
          keepMounted
          data-answer-panel
        >
          <div className={styles.top}>
            <SheetTitle className={styles.title}>
              Pertanyaan {question.ordinal} dari {total}
            </SheetTitle>
            <SheetClose
              render={<Button type="button" variant="inkOutline" size="icon" />}
              aria-label="Tutup"
            >
              <IconX aria-hidden="true" />
            </SheetClose>
          </div>
          <Tabs
            value={source}
            onValueChange={(value) => setSource(value as Source)}
            className="contents"
          >
            <TabsList className={styles.tabs} aria-label="Sumber jawaban">
              {(["chatgpt", "google"] as const).map((item) => (
                <TabsTrigger key={item} value={item} className={styles.tab}>
                  {SOURCE_ICON[item]}
                  {SOURCE_LABEL[item]}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className={styles.body}>
              {(["chatgpt", "google"] as const).map((item) => (
                <TabsContent key={item} value={item} className={styles.chat}>
                  <p className={styles.context}>{questionContext(question)}</p>
                  <p className={styles.bubble}>{question.question}</p>
                  <SourceAnswer
                    two={two}
                    question={shownQuestion}
                    source={item}
                    answer={answer}
                    names={names}
                  />
                </TabsContent>
              ))}
            </div>
          </Tabs>
          <div className={styles.foot}>
            <Button
              type="button"
              variant="inkOutline"
              size="touch"
              disabled={question.ordinal <= 1}
              onClick={() => setOrdinal(question.ordinal - 1)}
            >
              <IconChevronLeft aria-hidden="true" />
              Sebelumnya
            </Button>
            <Button
              type="button"
              variant="inkOutline"
              size="touch"
              disabled={question.ordinal >= total}
              onClick={() => setOrdinal(question.ordinal + 1)}
            >
              Berikutnya
              <IconChevronRight aria-hidden="true" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </OpenAnswerContext.Provider>
  );
}
