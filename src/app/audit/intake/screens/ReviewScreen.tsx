"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import type { BusinessBrief } from "@/lib/audit/types";
import {
  FIELD_OWNERSHIP,
  type IntakeScreen,
  type ScopeKind,
} from "@/lib/audit/workflow-authority";
import { IntakeHeading, IntakeShell } from "../IntakeShell";
import styles from "../intake.module.css";

type Busy = "extract" | "prompts" | "run" | "report" | null;
type UpdateBrief = <K extends keyof BusinessBrief>(
  key: K,
  value: BusinessBrief[K],
) => void;

type ReviewField =
  | "brand_name"
  | "official_sources"
  | "entity_scope"
  | "brand_type"
  | "category"
  | "verified_offerings"
  | "target_customer"
  | "verified_customer_needs"
  | "verified_decision_criteria"
  | "market_context"
  | "verified_competitor"
  | "customer_supplied_facts";

function screenForField(field: ReviewField): IntakeScreen {
  return FIELD_OWNERSHIP[field].screen;
}

/**
 * The review readback (§6.4): one row per fact, uppercase-capable label, plain
 * Indonesian empty states, and an Ubah link routing to the owning screen from
 * FIELD_OWNERSHIP. `brand_name_variants` edits inline.
 */
export function ReviewScreen({
  brief,
  updateBrief,
  scopeKind,
  busy,
  onNavigateToScreen,
  onBack,
  onGenerate,
}: {
  brief: BusinessBrief;
  updateBrief: UpdateBrief;
  scopeKind: ScopeKind;
  busy: Busy;
  onNavigateToScreen: (screen: IntakeScreen) => void;
  onBack: (screen: "review") => void;
  onGenerate: () => void;
}) {
  const [variantsEditing, setVariantsEditing] = useState(false);
  const [variantsDraft, setVariantsDraft] = useState("");

  const rows: {
    label: string;
    field: ReviewField;
    value: string;
    empty: string;
  }[] = [
    {
      label: "Nama brand",
      field: "brand_name",
      value: brief.brand_name,
      empty: "Belum diisi",
    },
    {
      label: "Sumber resmi",
      field: "official_sources",
      value: brief.official_sources.join(", "),
      empty: "Belum ada",
    },
    {
      label: "Yang diaudit",
      field: "entity_scope",
      value: brief.entity_scope,
      empty: "Belum dipilih",
    },
    {
      label: "Jenis brand",
      field: "brand_type",
      value: brief.brand_type,
      empty: "Belum diisi",
    },
    {
      label: "Kategori",
      field: "category",
      value: brief.category,
      empty: "Belum dipilih",
    },
    {
      label: "Produk dan layanan",
      field: "verified_offerings",
      value: brief.verified_offerings.join(", "),
      empty: "Belum ada",
    },
    {
      label: "Pelanggan",
      field: "target_customer",
      value: brief.target_customer,
      empty: "Belum diisi",
    },
    {
      label: "Kebutuhan pelanggan",
      field: "verified_customer_needs",
      value: brief.verified_customer_needs.join(", "),
      empty: "Belum diisi",
    },
    {
      label: "Pertimbangan pelanggan",
      field: "verified_decision_criteria",
      value: brief.verified_decision_criteria.join(", "),
      empty: "Belum diisi",
    },
    {
      label: "Pasar",
      field: "market_context",
      value: brief.market_context,
      empty: "Belum diisi",
    },
    {
      label: "Bisnis pembanding",
      field: "verified_competitor",
      value: brief.verified_competitor.name,
      empty: "Belum dikonfirmasi",
    },
    {
      label: "Fakta tambahan",
      field: "customer_supplied_facts",
      value: brief.customer_supplied_facts.join(", "),
      empty: "Tidak diisi",
    },
  ];

  function saveVariants() {
    const parsed = variantsDraft
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    updateBrief("brand_name_variants", parsed);
    setVariantsEditing(false);
  }

  return (
    <IntakeShell
      screen="review"
      scopeKind={scopeKind}
      onBack={() => onBack("review")}
      onNext={onGenerate}
      nextLabel="Buat pertanyaan audit"
      busy={busy === "prompts"}
    >
      <IntakeHeading
        screen="review"
        title="Ini yang akan Nuave audit"
        lead="Periksa sekali lagi. Semua bisa diubah."
      />

      <div className={styles.reviewList}>
        {rows.map((row) => (
          <div key={row.field} className={styles.reviewRow}>
            <div className={styles.reviewHeader}>
              <h2 className={styles.reviewLabel}>{row.label}</h2>
              <button
                type="button"
                className={styles.editLink}
                onClick={() => onNavigateToScreen(screenForField(row.field))}
              >
                Ubah
              </button>
            </div>
            <p className={styles.reviewValue}>{row.value || row.empty}</p>
          </div>
        ))}

        <div className={styles.reviewRow}>
          <div className={styles.reviewHeader}>
            <h2 className={styles.reviewLabel}>Nama brand lain</h2>
            {variantsEditing ? (
              <button
                type="button"
                className={styles.editLink}
                onClick={saveVariants}
              >
                Selesai
              </button>
            ) : (
              <button
                type="button"
                className={styles.editLink}
                onClick={() => {
                  setVariantsDraft(brief.brand_name_variants.join(", "));
                  setVariantsEditing(true);
                }}
              >
                Ubah
              </button>
            )}
          </div>
          {variantsEditing ? (
            <div>
              <Input
                id="brand-name-variants"
                aria-label="Nama brand lain, pisahkan dengan koma"
                value={variantsDraft}
                onChange={(event) => setVariantsDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    saveVariants();
                  }
                }}
              />
              <p className={styles.fieldHint}>
                Pisahkan dengan koma. Nama lain dipakai untuk memastikan
                pertanyaan tanpa nama benar-benar tidak menyebut brand Anda.
              </p>
            </div>
          ) : (
            <p className={styles.reviewValue}>
              {brief.brand_name_variants.length
                ? brief.brand_name_variants.join(", ")
                : "Tidak ada"}
            </p>
          )}
        </div>
      </div>
    </IntakeShell>
  );
}
