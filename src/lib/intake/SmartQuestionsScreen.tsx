"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Collapsible } from "@base-ui/react";
import { motion } from "motion/react";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
  IconPencil,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  BottomSheet,
  SheetActionsHeader,
} from "@/components/motion/BottomSheet";
import { SPRING_SETTLE } from "@/components/motion/presets";
import { useMotionAllowed } from "@/components/motion/useMotionAllowed";
import { Art } from "@/components/product/journey/Art";
import selectionStyles from "@/components/product/selection/selection.module.css";
import { cn } from "@/lib/utils";
import {
  contextIdentityGuard,
  contextNamedComparators,
  type DirectTenAuditContext,
} from "../audit/direct-ten-context-v2";
import { validateDirectTenQuestions } from "../audit/questions-id-direct-ten";
import type { SmartQuestionPack } from "./smart-session";
import { OriginTag, ScreenError } from "./intake-bits";
import { ScreenHeader } from "./step-one-screens";

const QUESTION_MAX = 700;

/* ───────────────────────────── name finding ───────────────────────────── */

type Range = { start: number; end: number; kind: "own" | "comparator" };

/** Word runs of the text with their positions, compared like the audit's
 * own name check (lower case, letters and digits only). */
function wordsOf(text: string) {
  return [...text.matchAll(/[\p{L}\p{N}]+/gu)].map((match) => ({
    word: match[0].toLocaleLowerCase("id-ID"),
    start: match.index!,
    end: match.index! + match[0].length,
  }));
}

/**
 * Where the text names the business (its name, other names, website) or a
 * comparison business, so the edit field can mark it (J28). Whole-word runs
 * only; the audit's own check stays the authority on saving.
 */
export function nameRanges(
  text: string,
  own: string[],
  comparators: string[],
): Range[] {
  const words = wordsOf(text);
  const ranges: Range[] = [];
  const find = (name: string, kind: Range["kind"]) => {
    const target = wordsOf(name).map((item) => item.word);
    if (!target.length || target.join(" ").length < 3) return;
    for (let index = 0; index + target.length <= words.length; index += 1) {
      if (target.every((word, offset) => words[index + offset]!.word === word))
        ranges.push({
          start: words[index]!.start,
          end: words[index + target.length - 1]!.end,
          kind,
        });
    }
  };
  own.forEach((name) => find(name, "own"));
  comparators.forEach((name) => find(name, "comparator"));
  // Longest first, then drop runs inside an earlier one.
  return ranges
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .filter(
      (range, index, all) =>
        !all.some(
          (other, otherIndex) =>
            otherIndex < index &&
            other.start <= range.start &&
            other.end >= range.end,
        ),
    );
}

/**
 * Takes the marked names out of a question, with the "atau"/"dan" that
 * joined them, so "Ada rekomendasi Kedai Fiksi atau kedai kopi lain…" reads
 * "Ada rekomendasi kedai kopi lain…".
 */
export function withoutNames(text: string, ranges: Range[]): string {
  let next = text;
  for (const range of [...ranges].sort((a, b) => b.start - a.start)) {
    let start = range.start;
    let end = range.end;
    const after = next.slice(end).match(/^\s*,?\s*(?:atau|dan|maupun)\s+/i);
    const before = next
      .slice(0, start)
      .match(/\s+(?:atau|dan|maupun)\s*,?\s*$/i);
    if (after) end += after[0].length;
    else if (before) start -= before[0].length;
    next = `${next.slice(0, start)} ${next.slice(end)}`;
  }
  return next
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([?.,!])/g, "$1")
    .trim();
}

/** The question with its names marked, drawn under a see-through textarea. */
function Marked({ text, ranges }: { text: string; ranges: Range[] }) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((range, index) => {
    if (range.start > cursor) parts.push(text.slice(cursor, range.start));
    parts.push(
      <mark
        key={index}
        className="bg-transparent text-error underline decoration-error-edge underline-offset-2"
      >
        {text.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  });
  parts.push(text.slice(cursor));
  // A trailing line break needs a character after it to keep its height.
  return (
    <>
      {parts}
      {"​"}
    </>
  );
}

/* ───────────────────────────── J28 · editing ───────────────────────────── */

function QuestionEditor({
  index,
  draft,
  onDraftChange,
  original,
  ranges,
  issues,
  field,
}: {
  index: number;
  draft: string;
  onDraftChange: (value: string) => void;
  original: string;
  ranges: Range[];
  issues: string[];
  /** The sheet opens with this field focused. */
  field: RefObject<HTMLTextAreaElement | null>;
}) {
  // The sheet focuses the field: the caret starts after the text.
  useEffect(() => {
    const element = field.current;
    if (element)
      element.setSelectionRange(element.value.length, element.value.length);
    // Once, when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const own = ranges.some((range) => range.kind === "own");
  const comparator = ranges.some((range) => range.kind === "comparator");
  const issueId = `question-${index}-issues`;
  const warningId = `question-${index}-names`;
  const labelId = `question-${index}-label`;
  const tagId = `question-${index}-tag`;
  const text = "type-copy-lg whitespace-pre-wrap [overflow-wrap:anywhere]";
  return (
    <div className="grid gap-3.5 pt-1">
      <label
        htmlFor={`smart-question-${index}`}
        className="grid gap-3 rounded-input border border-line-300 bg-white px-4 pt-4 pb-3.5 transition-[border-color,box-shadow] focus-within:border-ink-900 focus-within:shadow-(--edge-ink) has-[[aria-invalid=true]]:border-error-edge has-[[aria-invalid=true]]:shadow-(--edge-error)"
      >
        <span id={labelId} className="sr-only">
          Pertanyaan {index + 1}
        </span>
        <span className="relative block">
          <span aria-hidden="true" className={cn(text, "block text-ink-900")}>
            <Marked text={draft} ranges={ranges} />
          </span>
          <textarea
            ref={field}
            id={`smart-question-${index}`}
            value={draft}
            maxLength={QUESTION_MAX}
            // Spelling marks would sit on the hidden text, over the marked
            // names drawn underneath.
            spellCheck={false}
            aria-invalid={issues.length || own || comparator ? true : undefined}
            // The tag inside the box describes the field; it is not its name.
            aria-labelledby={labelId}
            aria-describedby={
              [
                own || comparator ? warningId : null,
                issues.length ? issueId : null,
                tagId,
              ]
                .filter(Boolean)
                .join(" ") || undefined
            }
            onChange={(event) => onDraftChange(event.target.value)}
            className={cn(
              text,
              "absolute inset-0 h-full w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-transparent caret-ink-900 outline-none selection:bg-ember-500/25",
            )}
          />
        </span>
        <OriginTag id={tagId} className="justify-self-start">
          Tanpa menyebut klinik Anda
        </OriginTag>
      </label>
      {own || comparator ? (
        <div
          id={warningId}
          role="status"
          className="grid gap-2.5 rounded-tile bg-error-light p-4"
        >
          <p className="type-title-sm m-0 flex items-center gap-2 text-error">
            <IconAlertTriangle size={18} stroke={1.75} aria-hidden="true" />
            {own
              ? "Ada nama klinik Anda di pertanyaan ini"
              : "Ada nama klinik pembanding di pertanyaan ini"}
          </p>
          <p className="type-copy-sm m-0 text-ink-700">
            {own
              ? "Pertanyaan ini seharusnya tanpa nama klinik Anda. Kalau namanya ada, AI cenderung ikut menyebutnya, jadi hasilnya kurang adil."
              : "Pertanyaan audit tidak menyebut klinik pembanding, supaya AI memilih sendiri tanpa diarahkan."}
          </p>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
            <Button
              type="button"
              variant="inkOutline"
              size="touch"
              className="bg-white"
              onClick={() => {
                onDraftChange(withoutNames(draft, ranges));
                field.current?.focus();
              }}
            >
              Hapus nama
            </Button>
            {draft !== original ? (
              <button
                type="button"
                className="type-label-strong min-h-11 text-ink-900 underline underline-offset-4"
                onClick={() => {
                  onDraftChange(original);
                  field.current?.focus();
                }}
              >
                Kembalikan saran
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {issues.length ? (
        <p id={issueId} role="alert" className="type-copy-sm m-0 text-error">
          {issues.join(" ")}
        </p>
      ) : (
        <p className="type-copy-sm m-0 text-ink-500">
          Tulis satu pertanyaan seperti calon pasien bertanya. Mengubah kalimat
          dapat mengubah apa yang diukur.
        </p>
      )}
      {!own && !comparator && draft !== original ? (
        <button
          type="button"
          className="type-label-strong min-h-11 justify-self-start text-ink-900 underline underline-offset-4"
          onClick={() => {
            onDraftChange(original);
            field.current?.focus();
          }}
        >
          Kembalikan saran
        </button>
      ) : null}
    </div>
  );
}

/* ──────────────────────────── J27b · start ──────────────────────────── */

function StartSheet({
  open,
  onOpenChange,
  approving,
  onApprove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approving: boolean;
  onApprove: () => void;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => {
        // The sheet stays while the approval is being saved.
        if (!approving) onOpenChange(next);
      }}
      title="Mulai audit sekarang?"
      titleHidden
      description="Setelah dimulai, info klinik dan pertanyaan tidak dapat diubah."
    >
      <div className="grid justify-items-center gap-3 pt-1 text-center">
        <Art name="phoneChat" width={65} enter className="mb-1" />
        <p className="type-heading-md m-0 text-ink-900" aria-hidden="true">
          Mulai audit sekarang?
        </p>
        <p className="type-copy m-0 text-ink-600">
          Nuave akan menjalankan 10 pertanyaan ini satu per satu. Setelah
          dimulai, info klinik dan pertanyaan tidak dapat diubah.
        </p>
        <div className="mt-2 flex w-full gap-2.5 rounded-input border border-line-200 bg-stone-50 px-3.5 py-3 text-left">
          <IconCircleCheck
            size={18}
            stroke={1.75}
            className="mt-px shrink-0 text-ink-600"
            aria-hidden="true"
          />
          <p className="type-copy-sm m-0 text-ink-600">
            Jika proses terhenti karena masalah teknis, Nuave akan melanjutkan
            atau mengulang pengujian yang gagal tanpa menggunakan pesanan baru.
          </p>
        </div>
        <Button
          type="button"
          variant="commit"
          size="xl"
          className="mt-3 w-full"
          disabled={approving}
          aria-busy={approving || undefined}
          onClick={onApprove}
        >
          {approving ? "Memulai audit…" : "Mulai audit sekarang"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="touch"
          disabled={approving}
          onClick={() => onOpenChange(false)}
        >
          Kembali periksa
        </Button>
      </div>
    </BottomSheet>
  );
}

/* ──────────────────────────── J27 · the list ──────────────────────────── */

/**
 * J27/J27b/J28: the ten audit questions as a plain list, numbered like a
 * quiz. All ten are asked without the business's name, as a customer who
 * does not know it yet would ask. A pencil opens one question in a sheet;
 * a name typed into it is marked and one tap takes it out. "Jalankan audit"
 * in the bottom bar opens the last confirmation.
 */
export default function SmartQuestionsScreen({
  pack,
  context,
  onChange,
  approving = false,
  onApprove,
  startOpen,
  onStartOpenChange,
  error,
  headingRef,
}: {
  pack: SmartQuestionPack;
  context: DirectTenAuditContext;
  onChange: (pack: SmartQuestionPack) => void;
  /** The approval is being saved on the server. */
  approving?: boolean;
  onApprove: () => void;
  /** The J27b confirmation sheet, opened by the bottom bar. */
  startOpen: boolean;
  onStartOpenChange: (open: boolean) => void;
  error?: string | null;
  /** The intake frame focuses this heading on screen arrival (R-27). */
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  const animate = useMotionAllowed();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const editorField = useRef<HTMLTextAreaElement>(null);
  const guard = contextIdentityGuard(context);
  const comparators = contextNamedComparators(context);
  const ownNames = [
    guard.brand_name,
    ...guard.brand_name_variants,
    ...guard.official_source_urls.map((url) =>
      url.replace(/^https?:\/\//i, "").replace(/\/+$/, ""),
    ),
  ];
  const ranges = nameRanges(draft, ownNames, comparators);
  const edit = (slot: number) => {
    setIndex(slot);
    setDraft(pack.approved[slot] ?? "");
    setIssues([]);
    setSheetOpen(true);
  };
  const save = () => {
    const next = [...pack.approved];
    next[index] = draft.trim();
    const rules = { brief: guard, comparators };
    // This question's own problems, and any this edit creates elsewhere (a
    // duplicate is reported on the other copy's slot); problems another
    // question already had stay with that question.
    const key = (issue: { slot: number | null; message: string }) =>
      `${issue.slot}|${issue.message}`;
    const before = new Set(
      validateDirectTenQuestions(pack.approved, rules).map(key),
    );
    const found = validateDirectTenQuestions(next, rules).filter(
      (issue) =>
        issue.slot === index + 1 ||
        issue.slot === null ||
        !before.has(key(issue)),
    );
    if (found.length) {
      setIssues(found.map((issue) => issue.message));
      return;
    }
    if (next[index] !== pack.approved[index])
      onChange({ ...pack, approved: next, revision: pack.revision + 1 });
    setSheetOpen(false);
  };
  return (
    <section className="grid" data-intake-screen="s-questions">
      <ScreenHeader
        headingRef={headingRef}
        title="10 pertanyaan untuk AI"
        lead="Ditulis seperti calon pasien bertanya. Anda bisa mengubahnya."
      />
      <div className="mt-3.5 flex flex-wrap gap-2">
        <OriginTag>10 Tanpa menyebut klinik Anda</OriginTag>
      </div>
      <Collapsible.Root className="mt-3">
        <Collapsible.Trigger className="type-label-strong inline-flex min-h-11 items-center gap-2 text-left text-ink-900 underline underline-offset-4">
          <IconInfoCircle size={18} stroke={1.75} aria-hidden="true" />
          Kenapa tanpa nama klinik?
        </Collapsible.Trigger>
        <Collapsible.Panel className={selectionStyles.revealPanel}>
          <p className="type-copy-sm m-0 rounded-tile bg-stone-50 p-4 text-ink-700">
            Calon pasien yang belum mengenal klinik Anda bertanya tanpa menyebut
            namanya. Dari sini terlihat apakah AI menyebut klinik Anda dengan
            sendirinya. Nama klinik pembanding juga tidak dipakai, supaya AI
            tidak diarahkan.
          </p>
        </Collapsible.Panel>
      </Collapsible.Root>
      <ol className="m-0 mt-3 list-none p-0">
        {pack.approved.map((question, slot) => (
          <motion.li
            key={slot}
            className="flex items-start gap-3 border-t border-line-200 py-4"
            data-question-slot={slot + 1}
            initial={animate ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING_SETTLE, delay: animate ? slot * 0.035 : 0 }}
          >
            <span
              className="type-mono-sm mt-0.5 w-5 shrink-0 text-ink-500 tabular-nums"
              aria-hidden="true"
            >
              {String(slot + 1).padStart(2, "0")}
            </span>
            <div className="grid min-w-0 flex-1 gap-1">
              <p className="type-copy m-0 break-words text-ink-900">
                <span className="sr-only">Pertanyaan {slot + 1}: </span>
                {question}
              </p>
              <p className="type-caption m-0 text-ink-500">
                Tanpa menyebut klinik Anda
                {question !== pack.originals[slot] ? " · diubah" : ""}
              </p>
            </div>
            <button
              type="button"
              aria-label={`Ubah pertanyaan ${slot + 1}`}
              disabled={approving}
              onClick={() => edit(slot)}
              className="grid size-11 shrink-0 place-items-center rounded-full text-ink-700 transition-transform active:scale-[0.94] disabled:opacity-50"
            >
              <span className="grid size-9 place-items-center rounded-full border border-line-200 bg-white">
                <IconPencil size={16} stroke={1.75} aria-hidden="true" />
              </span>
            </button>
          </motion.li>
        ))}
      </ol>
      {/* How the questions were made (model, cost) stays in the stored
          evidence, never on screen. Only the test-mode label shows, so a
          synthetic pack is never mistaken for a real one. */}
      {pack.provenance.transport === "synthetic-stub" ? (
        <p
          className="type-caption m-0 mt-2 border-t border-line-200 pt-4 text-ink-500"
          data-glm-provenance={pack.provenance.transport}
        >
          Respons sintetis berlabel, bukan keluaran provider.
        </p>
      ) : null}
      <ScreenError error={error} />

      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={`Ubah pertanyaan ${index + 1}`}
        initialFocus={editorField}
        header={
          <SheetActionsHeader
            title={`Pertanyaan ${index + 1}`}
            onCancel={() => setSheetOpen(false)}
            onSave={save}
            saveDisabled={!draft.trim()}
          />
        }
      >
        <QuestionEditor
          index={index}
          draft={draft}
          onDraftChange={(value) => {
            setDraft(value);
            setIssues([]);
          }}
          original={pack.originals[index] ?? ""}
          ranges={ranges}
          issues={issues}
          field={editorField}
        />
      </BottomSheet>
      <StartSheet
        open={startOpen}
        onOpenChange={onStartOpenChange}
        approving={approving}
        onApprove={onApprove}
      />
    </section>
  );
}

/* ─────────────────────── before the questions arrive ─────────────────────── */

/**
 * The questions are being written from the approved profile (one request),
 * or that request did not come back. A retry is a new request, so it is
 * only ever the owner's choice.
 */
export function QuestionsPreparing({
  headingRef,
  preparing,
  onRetry,
  onBack,
  error,
}: {
  headingRef?: RefObject<HTMLHeadingElement | null>;
  preparing: boolean;
  onRetry: () => void;
  onBack: () => void;
  error?: string | null;
}) {
  const animate = useMotionAllowed();
  return (
    <section className="grid" data-intake-screen="s-questions-pending">
      <ScreenHeader
        headingRef={headingRef}
        live
        title={
          preparing ? "Menyiapkan 10 pertanyaan…" : "Pertanyaan belum diterima"
        }
        lead={
          preparing
            ? "Ditulis seperti calon pasien bertanya, dari profil yang Anda setujui."
            : "Coba lagi hanya jika Anda ingin membuat permintaan baru."
        }
      />
      {preparing ? (
        <ol className="m-0 mt-6 list-none p-0" aria-hidden="true">
          {Array.from({ length: 10 }, (_, slot) => (
            <motion.li
              key={slot}
              className="flex items-start gap-3 border-t border-line-200 py-4"
              initial={animate ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: animate ? slot * 0.08 : 0 }}
            >
              <span className="type-mono-sm mt-0.5 w-5 shrink-0 text-ink-500 tabular-nums">
                {String(slot + 1).padStart(2, "0")}
              </span>
              <span className="grid flex-1 gap-2 pt-1">
                <span className="h-3.5 w-11/12 animate-pulse rounded-full bg-stone-100 motion-reduce:animate-none" />
                <span className="h-3.5 w-2/3 animate-pulse rounded-full bg-stone-100 motion-reduce:animate-none" />
              </span>
            </motion.li>
          ))}
        </ol>
      ) : (
        <div className="mt-6 grid justify-items-start gap-3">
          <Button type="button" variant="ink" size="touch" onClick={onRetry}>
            Coba siapkan pertanyaan
          </Button>
          <Button type="button" variant="inkLink" size="touch" onClick={onBack}>
            Kembali ke profil
          </Button>
        </div>
      )}
      <ScreenError error={error} />
    </section>
  );
}
