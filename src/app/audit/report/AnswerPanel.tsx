"use client";

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
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
import { cn } from "@/lib/utils";
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

/** `opener` is the element focus returns to on close: pass the clicked
 * element, since Safari does not focus a button on a mouse click. */
export type OpenAnswer = (
  ordinal: number,
  source?: Source,
  opener?: HTMLElement | null,
) => void;

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
          // Keyed, so a "copied" note never carries over to another question.
          <AnswerControls key={answer!.id} answer={answer!} />
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
  const prevButton = useRef<HTMLButtonElement | null>(null);
  const nextButton = useRef<HTMLButtonElement | null>(null);
  const body = useRef<HTMLDivElement | null>(null);
  // Said to screen readers when paging (the title alone is not re-read).
  const [announcement, setAnnouncement] = useState("");
  // Stable, so opening, paging or switching tabs does not re-render every
  // row, dot and "P" reference that uses it.
  const openAnswer = useCallback<OpenAnswer>(
    (next, nextSource = "chatgpt", from) => {
      opener.current =
        from ??
        (document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null);
      setOrdinal(next);
      setSource(nextSource);
      setAnnouncement("");
      setOpen(true);
    },
    [],
  );
  const total = two.questions.length;
  const questionAt = (n: number) =>
    two.questions.find((q) => q.ordinal === n) ?? two.questions[0]!;
  const question = questionAt(ordinal);
  // The answer text is the costly part to draw. It follows a moment later,
  // in an interruptible render, so the click only shows the panel and the
  // slide starts at once (Spec 021 AC-D2).
  const shownQuestion = questionAt(useDeferredValue(ordinal));
  const answer = answers.find((a) => a.id === shownQuestion.prompt_id);
  // Each question starts at its top, with its bubble in view.
  useLayoutEffect(() => {
    if (open && body.current) body.current.scrollTop = 0;
  }, [open, shownQuestion.ordinal]);
  // On every opening, the reset is repeated on the next frame: the dialog
  // shows the kept-mounted panel only after this render, and a reset made
  // while it is hidden does not stick. The panel is still off-screen then.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      if (body.current) body.current.scrollTop = 0;
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);
  const page = (next: number) => {
    setOrdinal(next);
    setAnnouncement(`Pertanyaan ${next} dari ${total}`);
  };
  return (
    <OpenAnswerContext.Provider value={openAnswer}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          overlayBlur={false}
          overlayClassName={styles.overlay}
          className={cn(
            styles.panel,
            // Replaces the sheet's own 40px nudge (the separate `translate`
            // property, which is not animated here and would snap on close).
            "data-[side=right]:data-starting-style:translate-x-0 data-[side=right]:data-ending-style:translate-x-0",
          )}
          finalFocus={opener}
          keepMounted
          data-answer-panel
        >
          <div className={styles.top}>
            <SheetTitle className={styles.title}>
              Pertanyaan {shownQuestion.ordinal} dari {total}
            </SheetTitle>
            <p className="sr-only" aria-live="polite">
              {announcement}
            </p>
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
            <div className={styles.body} ref={body} data-panel-body>
              {(["chatgpt", "google"] as const).map((item) => (
                <TabsContent key={item} value={item} className={styles.chat}>
                  <p className={styles.context}>
                    {questionContext(shownQuestion)}
                  </p>
                  <p className={styles.bubble}>{shownQuestion.question}</p>
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
              ref={prevButton}
              disabled={question.ordinal <= 1}
              onClick={() => {
                const next = question.ordinal - 1;
                page(next);
                // This button turns off at the first question: keep focus
                // in the panel, on the other one.
                if (next <= 1) nextButton.current?.focus();
              }}
            >
              <IconChevronLeft aria-hidden="true" />
              Sebelumnya
            </Button>
            <Button
              type="button"
              variant="inkOutline"
              size="touch"
              ref={nextButton}
              data-panel-next
              disabled={question.ordinal >= total}
              onClick={() => {
                const next = question.ordinal + 1;
                page(next);
                if (next >= total) prevButton.current?.focus();
              }}
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
