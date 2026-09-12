"use client";

import { useState } from "react";
import { SelectionGroup } from "@/components/product/selection/SelectionCard";
import { SelectionRow } from "@/components/product/selection/SelectionRow";
import { AddLine } from "@/components/product/selection/AddLine";
import { Reveal } from "@/components/product/selection/Reveal";
import type { BusinessBrief } from "@/lib/audit/types";
import type { ScopeKind } from "@/lib/audit/workflow-authority";
import { IntakeFieldError, IntakeHeading, IntakeShell } from "../IntakeShell";
import styles from "../intake.module.css";

type Busy = "extract" | "prompts" | "run" | "report" | null;

export function BranchScreen({
  scopeKind,
  scopeValue,
  fieldErrors,
  busy,
  onScopeValueChange,
  onContinue,
  onBack,
}: {
  brief: BusinessBrief;
  scopeKind: ScopeKind;
  scopeValue: string;
  fieldErrors: Record<string, string>;
  busy: Busy;
  onScopeValueChange: (value: string) => void;
  onContinue: (screen: "branch") => void;
  onBack: (screen: "branch") => void;
}) {
  const [knownBranches, setKnownBranches] = useState(() =>
    scopeValue.trim() ? [scopeValue] : [],
  );
  const [adding, setAdding] = useState(false);
  const candidates = [
    ...new Set([...knownBranches, scopeValue].filter((value) => value.trim())),
  ];
  const error = fieldErrors.scopeValue || fieldErrors.entity_scope;
  const open = adding || candidates.length === 0 || Boolean(error);

  return (
    <IntakeShell
      screen="branch"
      scopeKind={scopeKind}
      onBack={() => onBack("branch")}
      onNext={() => onContinue("branch")}
      busy={Boolean(busy)}
    >
      <IntakeHeading
        screen="branch"
        title="Lokasi mana yang ingin Anda audit?"
        lead={
          candidates.length
            ? undefined
            : "Nuave belum dapat membaca lokasi Anda. Tambahkan lokasi yang ingin diaudit."
        }
      />
      {candidates.length ? (
        <SelectionGroup
          value={scopeValue}
          onValueChange={onScopeValueChange}
          label="Pilih satu lokasi"
          disabled={Boolean(busy)}
        >
          {candidates.map((candidate) => (
            <SelectionRow key={candidate} value={candidate} title={candidate} />
          ))}
        </SelectionGroup>
      ) : null}
      <div className={styles.stack}>
        <Reveal
          trigger={candidates.length ? "Tambah lokasi lain" : undefined}
          open={open}
          onOpenChange={setAdding}
        >
          <AddLine
            id="scope-value"
            inputLabel="Nama lokasi"
            placeholder="Contoh: Depok"
            buttonLabel="Tambahkan"
            disabled={Boolean(busy)}
            onCommit={(value) => {
              setKnownBranches((current) => [...new Set([...current, value])]);
              onScopeValueChange(value);
              setAdding(false);
            }}
          />
        </Reveal>
      </div>
      <IntakeFieldError message={error} />
    </IntakeShell>
  );
}
