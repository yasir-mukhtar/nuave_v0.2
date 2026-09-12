"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { AUDIT_MEASUREMENT_MATRIX } from "../audit/measurement-matrix";
import { updateLocalQuestion, type LocalQuestionPack } from "./local-questions";

export type LocalQuestionsScreenProps = {
  pack: LocalQuestionPack;
  onPackChange: (pack: LocalQuestionPack) => void;
  onEditingChange?: (editing: boolean) => void;
};

/** The shell owns the pack and footer. Only an unsaved wording draft is local. */
export function LocalQuestionsScreen({
  pack,
  onPackChange,
  onEditingChange,
}: LocalQuestionsScreenProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const editButtons = useRef(new Map<string, HTMLButtonElement>());
  const textArea = useRef<HTMLTextAreaElement>(null);
  const returnFocus = useRef<string | null>(null);
  useEffect(() => {
    onEditingChange?.(editing !== null);
    if (editing) textArea.current?.focus();
    else if (returnFocus.current) {
      editButtons.current.get(returnFocus.current)?.focus();
      returnFocus.current = null;
    }
  }, [editing, onEditingChange]);

  function closeEdit(slotId: string) {
    returnFocus.current = slotId;
    setEditing(null);
    setIssues([]);
  }

  return (
    <section
      aria-labelledby="s-questions-h"
      data-intake-screen="s-questions"
      className="grid gap-6"
    >
      <h1 id="s-questions-h" className="type-heading-lg">
        Periksa pertanyaan audit
      </h1>
      <p className="type-copy text-muted-foreground">
        Sepuluh pertanyaan dari informasi yang Anda konfirmasi. Anda dapat
        mengubah kalimatnya sebelum melanjutkan.
      </p>
      <p className="type-copy-sm text-muted-foreground">
        Simulasi lokal: pertanyaan ini disiapkan tanpa panggilan AI. Audit belum
        dijalankan.
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {(["forbidden", "required"] as const).map((identity) => {
        const slots = AUDIT_MEASUREMENT_MATRIX.filter(
          (slot) => slot.auditedBrandIdentity === identity,
        );
        return (
          <section
            key={identity}
            aria-labelledby={`questions-group-${identity}`}
            className="grid gap-2"
          >
            <h2 id={`questions-group-${identity}`} className="type-heading-sm">
              {identity === "forbidden"
                ? "Tanpa menyebut bisnis Anda"
                : "Menyebut bisnis Anda"}{" "}
              <span className="type-copy-sm text-muted-foreground">
                {slots.length} pertanyaan
              </span>
            </h2>
            <p className="type-copy-sm text-muted-foreground">
              {identity === "forbidden"
                ? "Nama bisnis dan nama lainnya tidak boleh muncul dalam kelompok ini."
                : "Nama bisnis harus tetap disebut. Pertanyaan perbandingan juga harus menyebut pembandingnya."}
            </p>
            <ol start={slots[0].order} className="m-0 list-none p-0">
              {slots.map((slot) => {
                const prompt = pack.promptPack.prompts.find(
                  (item) => item.prompt_id === slot.id,
                )!;
                const isEditing = editing === slot.id;
                const inputId = `question-wording-${slot.order}`;
                return (
                  <li
                    key={slot.id}
                    data-question-slot={slot.order}
                    className="grid gap-2 border-t border-border py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="type-label text-muted-foreground">
                        {slot.order} · {slot.customerFacingLabel}
                      </h3>
                      {!isEditing && (
                        <Button
                          ref={(node) => {
                            if (node) editButtons.current.set(slot.id, node);
                            else editButtons.current.delete(slot.id);
                          }}
                          variant="link"
                          className="min-h-11"
                          aria-label={`Ubah pertanyaan ${slot.order}`}
                          disabled={editing !== null}
                          onClick={() => {
                            setEditing(slot.id);
                            setDraft(prompt.question);
                            setIssues([]);
                          }}
                        >
                          Ubah
                        </Button>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="grid gap-3">
                        <p
                          id={`${inputId}-purpose`}
                          className="type-copy-sm text-muted-foreground"
                        >
                          Tujuan tetap:{" "}
                          {slot.customerFacingLabel.toLocaleLowerCase("id-ID")}.{" "}
                          {slot.auditedBrandIdentity === "forbidden"
                            ? "Jangan sebut nama bisnis Anda."
                            : "Nama bisnis Anda wajib disebut."}{" "}
                          {slot.comparisonTargetIdentity === "required"
                            ? "Sebutkan pembanding dan bandingkan kedua pihak."
                            : "Jangan sebut nama bisnis pembanding."}
                        </p>
                        <label htmlFor={inputId} className="type-label">
                          Pertanyaan {slot.order}
                        </label>
                        <Textarea
                          ref={textArea}
                          id={inputId}
                          rows={4}
                          maxLength={701}
                          value={draft}
                          aria-invalid={issues.length > 0}
                          aria-describedby={`${inputId}-purpose${issues.length ? ` ${inputId}-issues` : ""}`}
                          onChange={(event) => setDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") closeEdit(slot.id);
                          }}
                        />
                        {issues.length > 0 && (
                          <div
                            id={`${inputId}-issues`}
                            role="alert"
                            className="type-copy-sm text-destructive"
                          >
                            {issues.join(" ")}
                          </div>
                        )}
                        <p className="type-copy-sm text-muted-foreground">
                          Perubahan kalimat dapat mengubah apa yang diukur.
                          Pastikan pertanyaan tetap sesuai tujuan di atas.
                          Peringatan ini tidak menghalangi Anda melanjutkan.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            className="min-h-11"
                            onClick={() => {
                              const result = updateLocalQuestion(
                                pack,
                                slot.id,
                                draft,
                              );
                              if (!result.ok) {
                                setIssues(result.issues);
                                textArea.current?.focus();
                                return;
                              }
                              onPackChange(result.pack);
                              setAnnouncement(
                                `Pertanyaan ${slot.order} disimpan.`,
                              );
                              closeEdit(slot.id);
                            }}
                          >
                            Simpan
                          </Button>
                          <Button
                            variant="ghost"
                            className="min-h-11"
                            onClick={() => closeEdit(slot.id)}
                          >
                            Batal
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="type-copy break-words">{prompt.question}</p>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </section>
  );
}
