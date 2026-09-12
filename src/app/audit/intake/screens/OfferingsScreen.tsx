"use client";

import { useState } from "react";
import { AddLine } from "@/components/product/selection/AddLine";
import { Chip, ChipGroup } from "@/components/product/selection/Chip";
import { Reveal } from "@/components/product/selection/Reveal";
import type { BusinessBrief } from "@/lib/audit/types";
import type { ScopeKind } from "@/lib/audit/workflow-authority";
import { IntakeFieldError, IntakeHeading, IntakeShell } from "../IntakeShell";
import styles from "../intake.module.css";

type Busy = "extract" | "prompts" | "run" | "report" | null;
type UpdateBrief = <K extends keyof BusinessBrief>(
  key: K,
  value: BusinessBrief[K],
) => void;

export function OfferingsScreen({
  brief,
  updateBrief,
  scopeKind,
  fieldErrors,
  preparedOfferings = [],
  offeringsInvalidated,
  busy,
  onContinue,
  onBack,
}: {
  brief: BusinessBrief;
  updateBrief: UpdateBrief;
  scopeKind: ScopeKind;
  fieldErrors: Record<string, string>;
  customerEditedFields: string[];
  preparedOfferings?: readonly string[];
  offeringsInvalidated: boolean;
  busy: Busy;
  onContinue: (screen: "offerings") => void;
  onBack: (screen: "offerings") => void;
}) {
  const [added, setAdded] = useState(brief.verified_offerings);
  const [adding, setAdding] = useState(false);
  const candidates = [
    ...new Set(
      [
        ...(offeringsInvalidated ? [] : preparedOfferings),
        ...added,
        ...brief.verified_offerings,
      ].filter((value) => value.trim()),
    ),
  ];

  function toggle(value: string, selected: boolean) {
    const current = brief.verified_offerings;
    updateBrief(
      "verified_offerings",
      selected
        ? [...new Set([...current, value])]
        : current.filter((item) => item !== value),
    );
  }

  return (
    <IntakeShell
      screen="offerings"
      scopeKind={scopeKind}
      onBack={() => onBack("offerings")}
      onNext={() => onContinue("offerings")}
      busy={Boolean(busy)}
    >
      <IntakeHeading
        screen="offerings"
        title="Apakah ini yang Anda tawarkan?"
        lead={
          candidates.length
            ? "Pilih yang sesuai. Tambahkan produk atau layanan yang belum ada."
            : offeringsInvalidated
              ? "Fokus audit berubah. Tambahkan produk atau layanan yang sesuai."
              : "Nuave belum dapat membaca produk atau layanan Anda. Tambahkan setidaknya satu untuk melanjutkan."
        }
      />
      <div id="verified-offerings" tabIndex={-1}>
        <ChipGroup label="Produk atau layanan">
          {candidates.map((item) => (
            <Chip
              key={item}
              label={item}
              removable={false}
              selected={brief.verified_offerings.includes(item)}
              disabled={Boolean(busy)}
              onToggle={(selected) => toggle(item, selected)}
            />
          ))}
        </ChipGroup>
      </div>
      <IntakeFieldError message={fieldErrors.verified_offerings} />
      <div className={styles.stack}>
        <Reveal
          trigger={
            candidates.length ? "Tambah produk atau layanan lain" : undefined
          }
          open={adding || candidates.length === 0}
          onOpenChange={setAdding}
        >
          <AddLine
            inputLabel="Nama produk atau layanan"
            placeholder="Contoh: kopi susu"
            buttonLabel="Tambahkan"
            disabled={Boolean(busy)}
            onCommit={(value) => {
              setAdded((current) => [...new Set([...current, value])]);
              toggle(value, true);
              setAdding(false);
            }}
          />
        </Reveal>
      </div>
    </IntakeShell>
  );
}
