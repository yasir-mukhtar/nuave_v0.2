"use client";

import { SelectionGroup } from "@/components/product/selection/SelectionCard";
import { SelectionRow } from "@/components/product/selection/SelectionRow";
import { AddLine } from "@/components/product/selection/AddLine";
import type { BusinessBrief } from "@/lib/audit/types";
import type { ScopeKind } from "@/lib/audit/workflow-authority";
import { IntakeFieldError, IntakeHeading, IntakeShell } from "../IntakeShell";
import styles from "../intake.module.css";

type Busy = "extract" | "prompts" | "run" | "report" | null;

/**
 * Branch: the selection-row pattern. The drafted branch arrives pre-selected;
 * the typed escape hatch replaces it through `applyScopeSelection`.
 */
export function BranchScreen({
  brief,
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
  const draftedBranch = scopeValue.trim();
  const error = fieldErrors.scopeValue || fieldErrors.entity_scope;

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
        title="Cabang mana yang ingin diaudit?"
        lead={
          draftedBranch
            ? "Pilih cabang yang ada, atau tambahkan nama cabang yang benar."
            : "Tambahkan nama cabang atau lokasi yang akan diaudit."
        }
      />

      {draftedBranch ? (
        <SelectionGroup
          value={scopeValue}
          onValueChange={onScopeValueChange}
          label="Cabang yang diaudit"
        >
          <SelectionRow value={scopeValue} title={draftedBranch} />
        </SelectionGroup>
      ) : null}

      <AddLine
        id="scope-value"
        inputLabel="Nama cabang atau lokasi"
        placeholder={
          draftedBranch ? "Tambah cabang lain" : "Nama cabang atau lokasi"
        }
        onCommit={onScopeValueChange}
      />
      <IntakeFieldError message={error} />

      <div className={styles.readFirst}>
        <div>
          <span className={styles.readFirstLabel}>Cakupan audit</span>
          <div className={styles.readFirstValue}>
            {brief.entity_scope || "Belum lengkap"}
          </div>
        </div>
      </div>
    </IntakeShell>
  );
}
