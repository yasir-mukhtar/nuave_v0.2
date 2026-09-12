"use client";

import { IconChevronRight } from "@tabler/icons-react";
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

export function ReviewScreen({
  brief,
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
  const joined = (values: string[]) =>
    values.filter((value) => value.trim()).join(" · ");
  const rows: {
    label: string;
    screen: IntakeScreen;
    value: string;
    empty?: string;
  }[] = [
    {
      label: "Brand",
      screen: FIELD_OWNERSHIP.brand_name.screen,
      value: joined([brief.brand_name, brief.official_sources[0] || ""]),
    },
    {
      label: "Fokus audit",
      screen: "scope",
      value:
        scopeKind === "whole-brand"
          ? "Brand secara keseluruhan"
          : scopeKind === "branch"
            ? "Satu lokasi"
            : "Satu produk atau layanan",
    },
    ...(scopeKind === "whole-brand"
      ? []
      : [
          {
            label: scopeKind === "branch" ? "Lokasi" : "Produk atau layanan",
            screen:
              scopeKind === "branch"
                ? ("branch" as const)
                : ("product" as const),
            value: brief.entity_scope.replace(/^(Cabang|Produk):\s*/, ""),
          },
        ]),
    {
      label: "Kategori",
      screen: FIELD_OWNERSHIP.category.screen,
      value: brief.category,
    },
    ...(scopeKind === "product"
      ? []
      : [
          {
            label: "Produk dan layanan",
            screen: "offerings" as const,
            value: joined(brief.verified_offerings),
          },
        ]),
    {
      label: "Alasan pelanggan",
      screen: FIELD_OWNERSHIP.target_customer.screen,
      value: joined([
        brief.target_customer,
        ...brief.verified_customer_needs,
        ...brief.verified_decision_criteria,
      ]),
      empty: "Tidak ditambahkan",
    },
    {
      label: "Pasar",
      screen: FIELD_OWNERSHIP.market_context.screen,
      value: brief.market_context,
    },
    {
      label: "Pembanding",
      screen: FIELD_OWNERSHIP.verified_competitor.screen,
      value: brief.verified_competitor.name,
    },
    {
      label: "Hal yang wajib benar",
      screen: FIELD_OWNERSHIP.customer_supplied_facts.screen,
      value: joined([brief.usp, ...brief.customer_supplied_facts]),
      empty: "Tidak ditambahkan",
    },
  ];

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
        title="Konfirmasi informasi brand Anda"
        lead="Pastikan informasi ini sudah tepat sebelum Nuave menyusun pertanyaan audit."
      />
      <div
        className={styles.reviewList}
        role="group"
        aria-label="Ringkasan informasi brand"
      >
        {rows.map((row) => (
          <button
            key={row.label}
            type="button"
            className={styles.reviewRow}
            aria-label={`Ubah ${row.label.toLocaleLowerCase("id-ID")}`}
            onClick={() => onNavigateToScreen(row.screen)}
            disabled={Boolean(busy)}
          >
            <span className={styles.reviewCopy}>
              <span className={styles.reviewLabel}>{row.label}</span>
              <span className={styles.reviewValue}>
                {row.value || row.empty || "Belum dikonfirmasi"}
              </span>
            </span>
            <IconChevronRight
              className={styles.reviewChevron}
              size={24}
              stroke={1.6}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </IntakeShell>
  );
}
