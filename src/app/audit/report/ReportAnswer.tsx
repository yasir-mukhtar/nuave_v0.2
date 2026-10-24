"use client";

import { useState } from "react";
import { IconCopy, IconExternalLink, IconWorld } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  answerCopyText,
  type AnswerPresentation,
} from "@/lib/audit/report-presentation";
import { AnswerMarkdown } from "./AnswerMarkdown";
import styles from "./report-body.module.css";

const unassessed = "Tidak dinilai dari jawaban yang tersedia";
const appearance = {
  mentioned: "Disebut",
  absent: "Tidak disebut",
  not_assessed: unassessed,
};
const recommendation = {
  recommended: "Direkomendasikan",
  not_recommended: "Tidak direkomendasikan",
  not_assessed: unassessed,
};
const comparison = {
  client_preferred: "Brand Anda diunggulkan",
  competitor_preferred: "Bisnis lain diunggulkan",
  compared_no_preference: "Dibandingkan tanpa pilihan unggulan",
  not_observed: unassessed,
  not_assessed: unassessed,
};
const information = {
  confirmed: "Terkonfirmasi",
  incomplete: "Belum lengkap",
  conflicting: "Bertentangan",
  not_assessed: unassessed,
};

export function observationTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "long",
    timeZone: "UTC",
  }).format(new Date(value));
}

/** Ember for a good result, ink for "said, but not this", grey otherwise. */
function tone(value: string): "good" | "plain" | "none" {
  if (
    ["mentioned", "recommended", "client_preferred", "confirmed"].includes(
      value,
    )
  )
    return "good";
  if (["not_assessed", "not_observed"].includes(value)) return "none";
  return "plain";
}

function Status({
  label,
  value,
  text,
}: {
  label: string;
  value: string;
  text: string;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd data-tone={tone(value)}>
        <span className={styles.dot} aria-hidden="true" />
        {text}
      </dd>
    </div>
  );
}

export function ReportAnswer({
  answer,
  names = [],
}: {
  answer: AnswerPresentation;
  /** The business's name and other names, marked inside the answer. */
  names?: readonly string[];
}) {
  return (
    <section
      className={styles.answer}
      aria-labelledby={answer.targetId}
      data-report-answer={answer.ordinal}
    >
      <header className={styles.questionHeader}>
        <p className={styles.eyebrow}>Pertanyaan {answer.ordinal}</p>
        <h3 id={answer.targetId} tabIndex={-1}>
          {answer.question}
        </h3>
        {answer.detail ? (
          <dl className={styles.statuses}>
            <Status
              label="Penyebutan"
              value={answer.detail.appearance}
              text={appearance[answer.detail.appearance]}
            />
            <Status
              label="Rekomendasi"
              value={answer.detail.recommendation}
              text={recommendation[answer.detail.recommendation]}
            />
            {!["not_observed", "not_assessed"].includes(
              answer.detail.comparison,
            ) && (
              <Status
                label="Perbandingan"
                value={answer.detail.comparison}
                text={comparison[answer.detail.comparison]}
              />
            )}
            {answer.detail.information !== "not_assessed" && (
              <Status
                label="Informasi publik"
                value={answer.detail.information}
                text={information[answer.detail.information]}
              />
            )}
          </dl>
        ) : null}
      </header>
      <AnswerMarkdown raw={answer.rawAnswer} names={names} />
      <div className={styles.provenance}>
        <h4>Sumber yang tersimpan</h4>
        {answer.sources.length ? (
          <ul className={styles.sources}>
            {answer.sources.map((source, i) => (
              <li key={i}>
                {source.href ? (
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                  >
                    <IconWorld size={18} stroke={1.75} aria-hidden="true" />
                    <span>
                      <span>{source.title || source.domain}</span>
                      <span>{source.url}</span>
                    </span>
                    <IconExternalLink
                      size={16}
                      stroke={1.75}
                      aria-hidden="true"
                    />
                  </a>
                ) : (
                  <span>
                    <IconWorld size={18} stroke={1.75} aria-hidden="true" />
                    <span>
                      {source.title}
                      <br />
                      {source.url}
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>
            Tidak ada tautan sumber yang tersimpan untuk jawaban ini. Ini tidak
            berarti penelusuran tidak dilakukan.
          </p>
        )}
        <p>
          Tautan sumber tidak membuktikan kebenaran setiap pernyataan dalam
          jawaban.
        </p>
        <dl>
          <div>
            <dt>Waktu pengamatan</dt>
            <dd>
              <time dateTime={answer.observedAt}>
                {observationTime(answer.observedAt)}
              </time>
            </dd>
          </div>
          <div>
            <dt>Sistem</dt>
            <dd>{answer.system}</dd>
          </div>
          <div>
            <dt>Model diminta</dt>
            <dd>{answer.requestedModel}</dd>
          </div>
          <div>
            <dt>Model jawaban</dt>
            <dd>{answer.returnedModel}</dd>
          </div>
        </dl>
      </div>
      <AnswerControls answer={answer} />
    </section>
  );
}

/** Copy the question and answer, and the exact retained text. Spec 018 reuses
 * these under the ChatGPT answer of a two-source report. */
export function AnswerControls({ answer }: { answer: AnswerPresentation }) {
  const [rawOpen, setRawOpen] = useState<string[]>([]);
  const [copyStatus, setCopyStatus] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(answerCopyText(answer));
      setCopyStatus("Pertanyaan, jawaban, dan informasi pengamatan tersalin.");
    } catch {
      setRawOpen(["raw"]);
      setCopyStatus(
        "Tidak dapat menyalin otomatis. Pilih dan salin teks asli di bawah.",
      );
    }
  }
  return (
    <div className={styles.controls}>
      <Button
        type="button"
        variant="inkOutline"
        size="touch"
        onClick={copy}
        aria-label={`Salin pertanyaan dan jawaban ${answer.ordinal}`}
      >
        <IconCopy aria-hidden="true" />
        Salin pertanyaan dan jawaban
      </Button>
      <p role="status">{copyStatus}</p>
      <Accordion value={rawOpen} onValueChange={setRawOpen}>
        <AccordionItem value="raw" className={styles.raw}>
          <AccordionTrigger
            aria-label={`Teks asli pertanyaan ${answer.ordinal}`}
          >
            Teks asli
            <span className="sr-only"> pertanyaan {answer.ordinal}</span>
          </AccordionTrigger>
          <AccordionContent>
            <pre className={styles.rawText} data-raw-answer>
              {answer.rawAnswer}
            </pre>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
