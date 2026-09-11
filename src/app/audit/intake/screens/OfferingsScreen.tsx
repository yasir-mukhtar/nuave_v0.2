"use client";

import { AddLine } from "@/components/product/selection/AddLine";
import { Chip, ChipGroup } from "@/components/product/selection/Chip";
import type { BusinessBrief } from "@/lib/audit/types";
import type { ScopeKind } from "@/lib/audit/workflow-authority";
import { IntakeFieldError, IntakeHeading, IntakeShell } from "../IntakeShell";

type Busy = "extract" | "prompts" | "run" | "report" | null;
type UpdateBrief = <K extends keyof BusinessBrief>(
  key: K,
  value: BusinessBrief[K],
) => void;

/**
 * Offerings: the chip pattern. Chips arrive pre-selected from the draft
 * (R-16), so removing the last one still leaves Lanjut enabled (R-17) and the
 * press routes the error back here with the group focused.
 */
export function OfferingsScreen({
  brief,
  updateBrief,
  scopeKind,
  fieldErrors,
  customerEditedFields,
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
  offeringsInvalidated: boolean;
  busy: Busy;
  onContinue: (screen: "offerings") => void;
  onBack: (screen: "offerings") => void;
}) {
  const offerings = brief.verified_offerings;
  const hasDraft = offerings.some((item) => item.trim());
  const emptyExplanation = customerEditedFields.includes("verified_offerings")
    ? "Nilai ini dikosongkan setelah perubahan Anda. Tambahkan setidaknya satu produk atau layanan untuk melanjutkan."
    : offeringsInvalidated
      ? "Cakupan produk berubah, sehingga daftar sebelumnya dihapus. Tambahkan setidaknya satu produk atau layanan untuk melanjutkan."
      : "Tambahkan setidaknya satu produk atau layanan untuk melanjutkan.";

  function removeOffering(item: string) {
    updateBrief(
      "verified_offerings",
      offerings.filter((candidate) => candidate !== item),
    );
  }

  function addOffering(value: string) {
    updateBrief(
      "verified_offerings",
      offerings.includes(value) ? offerings : [...offerings, value],
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
        title={
          hasDraft
            ? "Ini produk Anda. Sudah benar?"
            : "Apa saja yang Anda tawarkan?"
        }
        lead={
          hasDraft ? "Hapus yang salah, tambah yang kurang." : emptyExplanation
        }
      />

      {offerings.length ? (
        <div id="verified-offerings" tabIndex={-1}>
          <ChipGroup label="Produk atau layanan">
            {offerings.map((item) => (
              <Chip
                key={item}
                label={item}
                selected
                onToggle={() => removeOffering(item)}
              />
            ))}
          </ChipGroup>
        </div>
      ) : (
        <div id="verified-offerings" tabIndex={-1} />
      )}

      <IntakeFieldError message={fieldErrors.verified_offerings} />

      <AddLine
        inputLabel="Tambah produk atau layanan"
        placeholder="Tambah produk atau layanan"
        onCommit={addOffering}
      />
    </IntakeShell>
  );
}
