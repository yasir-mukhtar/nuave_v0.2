"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { IconBox, IconBuildingStore, IconMapPin } from "@tabler/icons-react";
import type { BusinessBrief } from "@/lib/audit/types";
import type { ScopeKind } from "@/lib/audit/workflow-authority";
import {
  SelectionCard,
  SelectionGroup,
} from "@/components/product/selection/SelectionCard";
import { IntakeFieldError, IntakeHeading, IntakeShell } from "../IntakeShell";
import styles from "../intake.module.css";

type Busy = "extract" | "prompts" | "run" | "report" | null;
type UpdateBrief = <K extends keyof BusinessBrief>(
  key: K,
  value: BusinessBrief[K],
) => void;

const SCOPE_CARD_IDS: Record<ScopeKind, string> = {
  "whole-brand": "scope-kind-whole-brand",
  branch: "scope-kind-branch",
  product: "scope-kind-product",
};

/**
 * Scope: the selection-card pattern. `brand_type` is the §6.1 read-first
 * statement with an Ubah affordance while drafted, and an open input with a
 * plain ask when the extraction could not read one.
 */
export function ScopeScreen({
  brief,
  updateBrief,
  scopeKind,
  fieldErrors,
  customerEditedFields,
  busy,
  onScopeKindChange,
  onContinue,
  onBack,
}: {
  brief: BusinessBrief;
  updateBrief: UpdateBrief;
  scopeKind: ScopeKind;
  fieldErrors: Record<string, string>;
  customerEditedFields: string[];
  busy: Busy;
  onScopeKindChange: (value: ScopeKind) => void;
  onContinue: (screen: "scope") => void;
  onBack: (screen: "scope") => void;
}) {
  const [brandTypeEditing, setBrandTypeEditing] = useState(false);
  const brandTypeDrafted = Boolean(brief.brand_type.trim());
  const showBrandTypeInput = !brandTypeDrafted || brandTypeEditing;
  const brandTypeHint = brandTypeDrafted
    ? "Pastikan jenis brand ini sudah benar."
    : customerEditedFields.includes("brand_type")
      ? "Nilai ini dikosongkan setelah perubahan Anda. Isi nilai yang benar untuk melanjutkan."
      : "Apa jenis brand Anda? Contoh: kedai kopi, klinik gigi, toko online.";

  const scopeCards: {
    kind: ScopeKind;
    title: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      kind: "whole-brand",
      title: brief.brand_name.trim()
        ? `Seluruh brand ${brief.brand_name.trim()}`
        : "Seluruh brand",
      description: "Semua lokasi dan produk dinilai sebagai satu brand",
      icon: <IconBuildingStore size={20} stroke={1.6} />,
    },
    {
      kind: "branch",
      title: "Satu cabang atau lokasi",
      description: "Misalnya hanya satu gerai",
      icon: <IconMapPin size={20} stroke={1.6} />,
    },
    {
      kind: "product",
      title: "Satu produk atau layanan",
      description: "Misalnya hanya satu lini produk",
      icon: <IconBox size={20} stroke={1.6} />,
    },
  ];

  return (
    <IntakeShell
      screen="scope"
      scopeKind={scopeKind}
      onBack={() => onBack("scope")}
      onNext={() => onContinue("scope")}
      busy={Boolean(busy)}
    >
      <IntakeHeading
        screen="scope"
        title="Apa yang ingin Anda audit?"
        lead="Ini menentukan sudut pandang seluruh audit."
      />

      <SelectionGroup
        value={scopeKind}
        onValueChange={(next) => {
          if (
            next === "whole-brand" ||
            next === "branch" ||
            next === "product"
          ) {
            onScopeKindChange(next);
          }
        }}
        label="Cakupan audit"
      >
        {scopeCards.map((card) => (
          <SelectionCard
            key={card.kind}
            id={SCOPE_CARD_IDS[card.kind]}
            value={card.kind}
            title={card.title}
            description={card.description}
            icon={card.icon}
          />
        ))}
      </SelectionGroup>
      <IntakeFieldError message={fieldErrors.entity_scope} />

      {showBrandTypeInput ? (
        <div className={styles.fieldBlock}>
          <label className={styles.fieldLabel} htmlFor="brand-type">
            Jenis brand
          </label>
          <Input
            id="brand-type"
            value={brief.brand_type}
            aria-invalid={fieldErrors.brand_type ? true : undefined}
            onChange={(event) => updateBrief("brand_type", event.target.value)}
          />
          <IntakeFieldError message={fieldErrors.brand_type} />
          <p className={styles.fieldHint}>{brandTypeHint}</p>
          {brandTypeEditing ? (
            <button
              type="button"
              className={styles.editLink}
              onClick={() => setBrandTypeEditing(false)}
            >
              Selesai
            </button>
          ) : null}
        </div>
      ) : (
        <div className={styles.readFirst}>
          <div>
            <span className={styles.readFirstLabel}>Jenis brand</span>
            <div className={styles.readFirstValue}>{brief.brand_type}</div>
          </div>
          <button
            type="button"
            className={styles.editLink}
            onClick={() => setBrandTypeEditing(true)}
          >
            Ubah
          </button>
        </div>
      )}
    </IntakeShell>
  );
}
