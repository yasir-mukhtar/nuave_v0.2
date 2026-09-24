"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  contextIdentityGuard,
  contextNamedComparators,
  type DirectTenAuditContext,
} from "../audit/direct-ten-context-v2";
import { validateDirectTenQuestions } from "../audit/questions-id-direct-ten";
import type { SmartQuestionPack } from "./smart-session";

export default function SmartQuestionsScreen({
  pack,
  context,
  onChange,
  onApprove,
  onBack,
}: {
  pack: SmartQuestionPack;
  context: DirectTenAuditContext;
  onChange: (pack: SmartQuestionPack) => void;
  onApprove: () => void;
  onBack: () => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const editButtons = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (editing !== null) textarea.current?.focus();
  }, [editing]);
  function close(index: number) {
    setEditing(null);
    setIssues([]);
    queueMicrotask(() => editButtons.current[index]?.focus());
  }
  function save(index: number) {
    const next = [...pack.approved];
    next[index] = draft.trim();
    const found = validateDirectTenQuestions(next, {
      brief: contextIdentityGuard(context),
      comparators: contextNamedComparators(context),
    });
    if (found.length) {
      setIssues(
        found
          .filter((issue) => issue.slot === index + 1 || issue.slot === null)
          .map((issue) => issue.message),
      );
      textarea.current?.focus();
      return;
    }
    onChange({ ...pack, approved: next, revision: pack.revision + 1 });
    close(index);
  }
  return (
    <section
      className="mx-auto w-full max-w-3xl px-5 pb-24"
      data-intake-screen="s-questions"
    >
      <h1 className="type-heading-lg">Periksa pertanyaan audit</h1>
      <p className="type-copy mt-2 text-muted-foreground">
        Sepuluh pertanyaan dari informasi yang Anda konfirmasi. Anda dapat
        mengubah kalimatnya sebelum menjalankan audit.
      </p>
      <p
        className="type-copy-sm mt-3 text-muted-foreground"
        data-glm-provenance={pack.provenance.transport}
      >
        {pack.provenance.transport === "synthetic-stub"
          ? "Respons sintetis berlabel, bukan keluaran provider."
          : "Pertanyaan disiapkan melalui satu panggilan provider."}{" "}
        Model diminta: {pack.provenance.requestedModel}. Model diterima:{" "}
        {pack.provenance.returnedModel ?? "tidak ada"}. Biaya:{" "}
        {pack.billedCostUsd === null
          ? "tidak tersedia"
          : `USD ${pack.billedCostUsd}`}
        .
      </p>
      <h2 className="type-heading-sm mt-8">
        Sepuluh pertanyaan tanpa nama bisnis
      </h2>
      <p className="type-copy-sm text-muted-foreground">
        Nama bisnis Anda dan nama bisnis pembanding tidak boleh muncul. Urutan
        pertanyaan tidak memiliki tujuan tetap.
      </p>
      <ol className="mt-4 list-none p-0">
        {pack.approved.map((question, index) => (
          <li
            key={index}
            className="grid gap-3 border-t border-border py-4"
            data-question-slot={index + 1}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="type-label text-muted-foreground">
                {index + 1}
                {question !== pack.originals[index] ? " · diubah" : ""}
              </h3>
              {editing !== index ? (
                <Button
                  ref={(node) => {
                    editButtons.current[index] = node;
                  }}
                  variant="link"
                  disabled={editing !== null}
                  aria-label={`Ubah pertanyaan ${index + 1}`}
                  onClick={() => {
                    setEditing(index);
                    setDraft(question);
                    setIssues([]);
                  }}
                >
                  Ubah
                </Button>
              ) : null}
            </div>
            {editing === index ? (
              <div className="grid gap-3">
                <label
                  className="type-label"
                  htmlFor={`smart-question-${index}`}
                >
                  Pertanyaan {index + 1}
                </label>
                <Textarea
                  ref={textarea}
                  id={`smart-question-${index}`}
                  rows={4}
                  maxLength={701}
                  value={draft}
                  aria-invalid={issues.length > 0}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") close(index);
                  }}
                />
                <p className="type-copy-sm text-muted-foreground">
                  Tetap satu permintaan konsumen tanpa nama bisnis Anda atau
                  bisnis pembanding. Perubahan kalimat dapat mengubah apa yang
                  diukur.
                </p>
                {issues.length ? (
                  <p role="alert" className="type-copy-sm text-destructive">
                    {issues.join(" ")}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Button onClick={() => save(index)}>Simpan</Button>
                  <Button variant="ghost" onClick={() => close(index)}>
                    Batal
                  </Button>
                </div>
              </div>
            ) : (
              <p className="type-copy break-words">{question}</p>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="ghost" onClick={onBack}>
          Kembali ke informasi bisnis
        </Button>
        <Button disabled={editing !== null} onClick={onApprove}>
          Mulai audit
        </Button>
      </div>
    </section>
  );
}
