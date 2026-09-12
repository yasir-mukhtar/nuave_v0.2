"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  IconRosette,
  IconBuildingStore,
  IconMapPin,
} from "@tabler/icons-react";
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
  const [editingBrandType, setEditingBrandType] = useState(false);
  const needsBrandType =
    editingBrandType ||
    !brief.brand_type.trim() ||
    Boolean(fieldErrors.brand_type);
  return (
    <IntakeShell
      screen="scope"
      scopeKind={scopeKind}
      onBack={() => onBack("scope")}
      onNext={() => onContinue("scope")}
      busy={Boolean(busy)}
    >
      <IntakeHeading screen="scope" title="Apa fokus audit ini?" />
      <SelectionGroup
        value={scopeKind}
        label="Pilih fokus audit"
        disabled={Boolean(busy)}
        onValueChange={(next) => {
          if (next === "whole-brand" || next === "branch" || next === "product")
            onScopeKindChange(next);
        }}
      >
        <SelectionCard
          id="scope-kind-whole-brand"
          value="whole-brand"
          title="Brand secara keseluruhan"
          description="Semua lokasi, produk, dan layanan sebagai satu kesatuan."
          icon={<IconRosette stroke={1.6} />}
        />
        <SelectionCard
          id="scope-kind-branch"
          value="branch"
          title="Satu lokasi"
          description="Satu gerai atau cabang tertentu."
          icon={<IconMapPin stroke={1.6} />}
        />
        <SelectionCard
          id="scope-kind-product"
          value="product"
          title="Satu produk atau layanan"
          description="Satu produk, layanan, atau lini tertentu."
          icon={<IconBuildingStore stroke={1.6} />}
        />
      </SelectionGroup>
      <IntakeFieldError message={fieldErrors.entity_scope} />
      {needsBrandType ? (
        <div className={styles.fieldBlock}>
          <label className={styles.fieldLabel} htmlFor="brand-type">
            Jenis brand
          </label>
          <p className={styles.fieldHint}>
            {customerEditedFields.includes("brand_type")
              ? "Isi jenis brand untuk melanjutkan."
              : "Nuave belum dapat membaca jenis brand Anda. Contoh: kedai kopi atau toko online."}
          </p>
          <Input
            id="brand-type"
            value={brief.brand_type}
            aria-invalid={Boolean(fieldErrors.brand_type)}
            onChange={(event) => {
              setEditingBrandType(true);
              updateBrief("brand_type", event.target.value);
            }}
          />
          <IntakeFieldError message={fieldErrors.brand_type} />
        </div>
      ) : null}
    </IntakeShell>
  );
}
