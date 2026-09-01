"use client";

import { useId, useState } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  IconArrowLeft,
  IconArrowRight,
  IconExternalLink,
  IconSparkles,
} from "@tabler/icons-react";
import type {
  BusinessBrief,
  ExtractionDraft,
  PromptPack,
} from "@/lib/audit/types";
import type {
  ComparisonTargetInput,
  ComparisonTargetProposal,
  ComparisonStatus,
  IntakeScreen,
  ScopeKind,
} from "@/lib/audit/workflow-authority";
import {
  AUDIT_MEASUREMENT_MATRIX,
  CANONICAL_COMPOSITION_COUNTS,
  measurementSlotForPromptId,
} from "@/lib/audit/measurement-matrix";
import { INDONESIAN_PURPOSE_DRIFT_WARNING } from "@/lib/audit/questions-id";
import {
  isValidSimilarBusinessUrl,
  normalizeSimilarBusinessUrl,
} from "@/lib/audit/similar-businesses";
import styles from "./audit.module.css";

function IntakeActions({
  onBack,
  onNext,
  nextLabel = "Lanjut",
  busy = false,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  busy?: boolean;
}) {
  return (
    <div className={styles.stickyAction}>
      <Button variant="ghost" type="button" onClick={onBack}>
        <IconArrowLeft /> Kembali
      </Button>
      <Button variant="default" type="button" onClick={onNext} disabled={busy}>
        {busy ? (
          <IconLoader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <IconArrowRight />
        )}
        {nextLabel}
      </Button>
    </div>
  );
}

type Busy = "extract" | "prompts" | "run" | "report" | null;
type UpdateBrief = <K extends keyof BusinessBrief>(
  key: K,
  value: BusinessBrief[K],
) => void;

function lines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function text(value: string[]) {
  return value.join("\n");
}

function hasFilledValue(value: string | string[]) {
  return Array.isArray(value)
    ? value.some((item) => item.trim())
    : value.trim().length > 0;
}

function emptyAiFieldHint(
  value: string | string[],
  field: string,
  customerEditedFields: string[],
  extractionMessage: string,
  invalidationMessage?: string,
) {
  if (hasFilledValue(value)) return "";
  if (invalidationMessage) return invalidationMessage;
  if (customerEditedFields.includes(field)) {
    return "Nilai ini dikosongkan setelah perubahan Anda. Isi nilai yang benar untuk melanjutkan.";
  }
  return extractionMessage;
}

const preservedFieldLabels: Record<string, string> = {
  brand_name: "Nama brand",
  entity_scope: "Cakupan audit",
  brand_type: "Jenis brand",
  category: "Kategori",
  market_context: "Konteks pasar",
  target_customer: "Target pelanggan",
  verified_offerings: "Produk atau layanan",
  verified_customer_needs: "Kebutuhan pelanggan",
  verified_decision_criteria: "Pertimbangan keputusan",
  verified_competitor: "Bisnis pembanding",
  brand_name_variants: "Nama brand lain",
  customer_supplied_facts: "Fakta tambahan",
  usp: "Differentiator",
};

function preservedFieldValue(brief: BusinessBrief, field: string) {
  if (field === "verified_competitor") {
    return brief.verified_competitor.name;
  }
  const value = brief[field as keyof BusinessBrief];
  if (Array.isArray(value)) return value.join(", ");
  return typeof value === "string" ? value : "";
}

function StageIntro({
  number,
  eyebrow,
  title,
  description,
}: {
  number: number;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className={styles.stageIntro} tabIndex={-1} id={`stage-${number}`}>
      <p className={styles.stageMeta}>
        Step {number} of 4 <span aria-hidden="true">·</span> {eyebrow}
      </p>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

function StageSection({
  id,
  title,
  description,
  children,
  className = "",
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`${styles.stageSection} ${className}`}>
      <header className={styles.stageSectionHeader}>
        <h2 id={id}>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      <div className={styles.stageSectionBody}>{children}</div>
    </section>
  );
}

function WarningAlert({
  title,
  children,
}: Readonly<{
  title: string;
  children: React.ReactNode;
}>) {
  return (
    <div className={styles.auditAlert} role="alert">
      <span className={styles.auditAlertIcon} aria-hidden="true">
        !
      </span>
      <div>
        <h2 className={styles.auditAlertTitle}>{title}</h2>
        <div className={styles.auditAlertBody}>{children}</div>
      </div>
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className={styles.validationError} role="alert">
      {message}
    </p>
  ) : null;
}

function TextInput({
  id,
  label,
  value,
  onChange,
  hint,
  placeholder,
  required,
  type = "text",
  disabled,
  error,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  disabled?: boolean;
  error?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  return (
    <Field
      data-disabled={disabled || undefined}
      data-invalid={error || undefined}
    >
      <FieldLabel htmlFor={fieldId}>
        {label}
        {required ? "*" : ""}
      </FieldLabel>
      <Input
        id={fieldId}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hint ? hintId : "", error ? errorId : ""]
            .filter(Boolean)
            .join(" ") || undefined
        }
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <FieldDescription id={hintId}>{hint}</FieldDescription> : null}
      <FieldError id={errorId} message={error} />
    </Field>
  );
}

function LongInput({
  id,
  label,
  value,
  onChange,
  hint,
  required,
  rows = 3,
  error,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  required?: boolean;
  rows?: number;
  error?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  return (
    <Field data-invalid={error || undefined}>
      <FieldLabel htmlFor={fieldId}>
        {label}
        {required ? "*" : ""}
      </FieldLabel>
      <Textarea
        id={fieldId}
        rows={rows}
        value={value}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hint ? hintId : "", error ? errorId : ""]
            .filter(Boolean)
            .join(" ") || undefined
        }
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <FieldDescription id={hintId}>{hint}</FieldDescription> : null}
      <FieldError id={errorId} message={error} />
    </Field>
  );
}

function LineListEditor({
  id,
  label,
  initialValue,
  onChange,
  hint,
  required,
  rows = 3,
  error,
}: {
  id?: string;
  label: string;
  initialValue: string;
  onChange: (value: string[]) => void;
  hint?: string;
  required?: boolean;
  rows?: number;
  error?: string;
}) {
  const [draft, setDraft] = useState(initialValue);
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;

  function commitDraft() {
    const normalizedValue = lines(draft);
    setDraft(text(normalizedValue));
    onChange(normalizedValue);
  }

  return (
    <Field data-invalid={error || undefined}>
      <FieldLabel htmlFor={fieldId}>
        {label}
        {required ? "*" : ""}
      </FieldLabel>
      <Textarea
        id={fieldId}
        rows={rows}
        value={draft}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hint ? hintId : "", error ? errorId : ""]
            .filter(Boolean)
            .join(" ") || undefined
        }
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitDraft}
      />
      {hint ? <FieldDescription id={hintId}>{hint}</FieldDescription> : null}
      <FieldError id={errorId} message={error} />
    </Field>
  );
}

function LineListInput({
  id,
  label,
  value,
  onChange,
  hint,
  required,
  rows = 3,
  error,
}: {
  id?: string;
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  hint?: string;
  required?: boolean;
  rows?: number;
  error?: string;
}) {
  const serializedValue = text(value);
  return (
    <LineListEditor
      key={serializedValue}
      id={id}
      label={label}
      initialValue={serializedValue}
      onChange={onChange}
      hint={hint}
      required={required}
      rows={rows}
      error={error}
    />
  );
}

function B1ComparisonTarget({
  brief,
  proposal,
  status,
  error,
  scopeError,
  sourceError,
  onAccept,
}: {
  brief: BusinessBrief;
  proposal: ComparisonTargetProposal | null;
  status: ComparisonStatus;
  error?: string;
  scopeError?: string;
  sourceError?: string;
  onAccept: (input: ComparisonTargetInput) => void;
}) {
  const current = brief.verified_competitor;
  const [name, setName] = useState(current.name || proposal?.name || "");
  const [scope, setScope] = useState(current.scope || proposal?.scope || "");
  const [sourceUrl, setSourceUrl] = useState(
    current.source_url || proposal?.source_url || "",
  );
  const [localError, setLocalError] = useState("");

  function saveReplacement() {
    if (!name.trim()) {
      setLocalError(
        "Isi nama bisnis pembanding atau gunakan alternatif kategori.",
      );
      return;
    }
    if (sourceUrl.trim() && !isValidSimilarBusinessUrl(sourceUrl)) {
      setLocalError("Masukkan URL publik yang valid atau kosongkan sumbernya.");
      return;
    }
    setLocalError("");
    onAccept({
      kind: "replacement",
      name,
      scope,
      source_url: sourceUrl ? normalizeSimilarBusinessUrl(sourceUrl) : "",
    });
  }

  return (
    <div className={styles.stageSectionBody}>
      {status === "needs_reconfirmation" && current.name ? (
        <WarningAlert title="Konfirmasi ulang target sebelumnya">
          <p>
            Cakupan atau kategori berubah. Target yang Anda pilih sebelumnya
            tetap ada, tetapi harus dikonfirmasi ulang sebelum audit dibuat.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              onAccept({
                kind: "replacement",
                name: current.name,
                scope: current.scope,
                source_url: current.source_url,
              })
            }
          >
            Konfirmasi target sebelumnya
          </Button>
        </WarningAlert>
      ) : null}

      {proposal ? (
        <div
          className={styles.auditAlert}
          role="group"
          aria-label="Saran Nuave"
        >
          <span className={styles.auditAlertIcon} aria-hidden="true">
            ✦
          </span>
          <div className={styles.auditAlertBody}>
            <h2 className={styles.auditAlertTitle}>Saran Nuave</h2>
            <p>
              {proposal.kind === "suggestion"
                ? "Nuave mengusulkan target ini dari hasil ekstraksi. Pilihan Anda diperlukan; target belum disimpan."
                : "Jika Anda tidak dapat menyebut bisnis tertentu, Anda dapat menerima alternatif kategori ini."}
            </p>
            <strong>{proposal.name}</strong>
            {proposal.source_url ? (
              <p>
                Sumber: <code>{proposal.source_url}</code>
              </p>
            ) : null}
            <div className={styles.actionRow}>
              <Button
                type="button"
                variant="default"
                onClick={() =>
                  onAccept({
                    kind: proposal.kind,
                    name: proposal.name,
                    scope: proposal.scope,
                    source_url: proposal.source_url,
                  })
                }
              >
                {proposal.kind === "suggestion"
                  ? "Terima saran Nuave"
                  : "Gunakan alternatif kategori"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {brief.similar_businesses?.length ? (
        <StageSection
          id="comparison-choices-heading"
          title="Pilihan lain dari hasil ekstraksi"
          description="Pilih hanya jika bisnis ini adalah pembanding yang realistis bagi pelanggan."
        >
          <div className={styles.compactList}>
            {brief.similar_businesses.map((business, index) => {
              const candidateName =
                business.name?.trim() ||
                business.source_url ||
                `Pilihan ${index + 1}`;
              return (
                <div key={`${business.source_url}-${business.name}-${index}`}>
                  <strong>{candidateName}</strong>
                  {business.source_url ? (
                    <span> · {business.source_url}</span>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      onAccept({
                        kind: "suggestion",
                        name: candidateName,
                        scope: "",
                        source_url: business.source_url,
                      })
                    }
                  >
                    Pilih sebagai target
                  </Button>
                </div>
              );
            })}
          </div>
        </StageSection>
      ) : null}

      <StageSection
        id="comparison-entry-heading"
        title="Edit atau ganti target"
        description="Anda dapat menerima saran, mengeditnya, menggantinya, atau menerima alternatif kategori. Sumber URL boleh dikosongkan."
      >
        <FieldGroup
          className={styles.gridTwo}
          aria-labelledby="comparison-entry-heading"
        >
          <TextInput
            id="comparison-name"
            label="Nama bisnis pembanding"
            value={name}
            required
            error={localError || error}
            onChange={(value) => {
              setName(value);
              setLocalError("");
            }}
          />
          <TextInput
            id="comparison-scope"
            label="Cakupan pembanding"
            value={scope}
            error={scopeError}
            hint="Opsional. Misalnya kota atau cabang."
            onChange={setScope}
          />
          <TextInput
            id="comparison-source"
            label="Sumber URL (opsional)"
            type="url"
            value={sourceUrl}
            error={sourceError}
            hint="Kosongkan jika Anda hanya memiliki nama bisnis."
            onChange={(value) => {
              setSourceUrl(value);
              setLocalError("");
            }}
          />
        </FieldGroup>
        <div className={styles.actionRow}>
          <Button type="button" variant="secondary" onClick={saveReplacement}>
            Simpan bisnis pembanding
          </Button>
          {proposal?.kind === "category_fallback" ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                onAccept({
                  kind: "category_fallback",
                  name: proposal.name,
                  scope: "",
                  source_url: "",
                })
              }
            >
              Terima “{proposal.name}”
            </Button>
          ) : null}
        </div>
      </StageSection>
    </div>
  );
}

export function B1BriefStep({
  brief,
  updateBrief,
  extraction,
  screen,
  scopeKind,
  scopeValue,
  comparisonProposal,
  comparisonStatus,
  marketInvalidated,
  offeringsInvalidated,
  customerEditedFields,
  preservedCustomerFields,
  fieldErrors,
  identityUnverified,
  busy,
  onScopeKindChange,
  onScopeValueChange,
  onConfirmIdentity,
  onRequestSourceCorrection,
  onSubmitSourceCorrection,
  onAcceptComparison,
  onContinue,
  onBack,
  onBackToSource,
  onGenerate,
}: {
  brief: BusinessBrief;
  updateBrief: UpdateBrief;
  extraction: ExtractionDraft | null;
  screen: IntakeScreen;
  scopeKind: ScopeKind;
  scopeValue: string;
  comparisonProposal: ComparisonTargetProposal | null;
  comparisonStatus: ComparisonStatus;
  marketInvalidated: boolean;
  offeringsInvalidated: boolean;
  customerEditedFields: string[];
  preservedCustomerFields: string[];
  fieldErrors: Record<string, string>;
  identityUnverified: boolean;
  busy: Busy;
  onScopeKindChange: (value: ScopeKind) => void;
  onScopeValueChange: (value: string) => void;
  onConfirmIdentity: () => void;
  onRequestSourceCorrection: () => void;
  onSubmitSourceCorrection: (
    sourceUrl: string,
    brandName: string,
  ) => void | Promise<void>;
  onAcceptComparison: (input: ComparisonTargetInput) => void;
  onContinue: (screen: IntakeScreen) => void;
  onBack: (screen: IntakeScreen) => void;
  onBackToSource: () => void;
  onGenerate: () => void;
}) {
  const [correctionSource, setCorrectionSource] = useState(
    brief.official_sources[0] || "",
  );
  const [correctionBrandName, setCorrectionBrandName] = useState(
    brief.brand_name,
  );

  const titleByScreen: Record<IntakeScreen, string> = {
    "brand-confirm": "Check the client brief before it shapes the audit.",
    "source-correction": "Perbaiki sumber dan nama brand.",
    scope: "Tentukan cakupan audit.",
    branch: "Lengkapi cabang atau lokasi.",
    product: "Lengkapi produk atau layanan.",
    category: "Pilih kategori brand.",
    market: "Jelaskan konteks pasar.",
    "customer-reasons": "Kenali pelanggan dan alasannya.",
    offerings: "Pilih produk atau layanan yang diverifikasi.",
    "comparison-target": "Pilih bisnis pembanding yang realistis.",
    facts: "Tambahkan fakta opsional.",
    review: "Tinjau brief sebelum membuat pertanyaan.",
  };
  const descriptionByScreen: Record<IntakeScreen, string> = {
    "brand-confirm":
      "Detail ini adalah draft, bukan fakta terverifikasi. Perbaiki yang keliru, lengkapi yang kosong, lalu konfirmasi brief.",
    "source-correction":
      "Nuave akan membaca ulang sumber yang Anda pilih. Perubahan sumber menjalankan satu ekstraksi pengganti; perubahan nama saja tidak memanggil ekstraksi baru.",
    scope:
      "Pilih satu entitas saja. Pilihan cabang atau produk akan menjadi cakupan audit.",
    branch:
      "Nama ini akan menjadi bagian dari cakupan audit dan menggantikan nilai cabang lama.",
    product:
      "Nama ini akan menjadi bagian dari cakupan audit dan menggantikan nilai produk lama.",
    category:
      "Kategori yang dipilih menentukan pertanyaan dan nilai default yang dapat diturunkan Nuave.",
    market:
      "Layar ini selalu ditampilkan. Konteks pasar wajib diisi, termasuk untuk brand nasional atau online.",
    "customer-reasons":
      "Isi kebutuhan dan pertimbangan yang benar-benar penting bagi pelanggan.",
    offerings:
      "Setidaknya satu item terverifikasi diperlukan untuk membuat pertanyaan audit.",
    "comparison-target":
      "Saran Nuave belum menjadi target sampai Anda menerima, mengedit, atau menggantinya.",
    facts:
      "Fakta tambahan dari Anda bersifat opsional dan tidak menggantikan hasil audit.",
    review:
      "Periksa semua nilai. Konfirmasi eksplisit di sini sebelum pertanyaan dibuat.",
  };

  const error = (field: string) => fieldErrors[field];
  const showSources = screen === "brand-confirm";
  const preservedEntries = preservedCustomerFields
    .map((field) => ({
      field,
      label: preservedFieldLabels[field],
      value: preservedFieldValue(brief, field),
    }))
    .filter((entry): entry is { field: string; label: string; value: string } =>
      Boolean(entry.label),
    );

  return (
    <section className={`${styles.workspace} ${styles.workspaceWide}`}>
      <Button
        variant="ghost"
        onClick={
          screen === "brand-confirm" ? onBackToSource : () => onBack(screen)
        }
        className={styles.backButton}
        type="button"
      >
        <IconArrowLeft />{" "}
        {screen === "brand-confirm" ? "Change website" : "Kembali"}
      </Button>
      <StageIntro
        number={2}
        eyebrow="Verify facts"
        title={titleByScreen[screen]}
        description={descriptionByScreen[screen]}
      />

      {extraction?.warnings.length ? (
        <WarningAlert title="Periksa catatan ekstraksi">
          <ul className={styles.compactList}>
            {extraction.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </WarningAlert>
      ) : null}

      {screen === "brand-confirm" ? (
        <>
          <StageSection
            id="brand-confirm-heading"
            title="Identitas brand"
            description="Sumber resmi tetap menjadi dasar brief ini."
          >
            <FieldGroup
              className={styles.gridTwo}
              aria-labelledby="brand-confirm-heading"
            >
              <TextInput
                id="brand-name"
                label="Brand name"
                required
                value={brief.brand_name}
                error={error("brand_name")}
                hint={
                  identityUnverified
                    ? "Nuave tidak dapat membaca nama brand dari sumber ini. Isi nama yang benar lalu konfirmasi."
                    : brief.brand_name.trim()
                      ? "Pastikan nama ini persis seperti yang digunakan brand Anda."
                      : emptyAiFieldHint(
                          brief.brand_name,
                          "brand_name",
                          customerEditedFields,
                          "Nuave belum menemukan nama brand dari sumber ini. Isi nama yang benar untuk melanjutkan.",
                        )
                }
                onChange={(value) => updateBrief("brand_name", value)}
              />
              <Field>
                <FieldLabel>Sumber resmi</FieldLabel>
                {showSources && brief.official_sources.length ? (
                  <ul className={styles.compactList}>
                    {brief.official_sources.map((source) => (
                      <li key={source}>
                        <a href={source} target="_blank" rel="noreferrer">
                          {source} <IconExternalLink />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <FieldDescription>
                    Tambahkan website resmi atau profil Instagram yang valid
                    dari langkah sebelumnya.
                  </FieldDescription>
                )}
              </Field>
            </FieldGroup>
            {identityUnverified ? (
              <div className={styles.actionRow}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onConfirmIdentity}
                >
                  Konfirmasi nama brand ini
                </Button>
              </div>
            ) : null}
            <div className={styles.actionRow}>
              <Button
                type="button"
                variant="ghost"
                onClick={onRequestSourceCorrection}
              >
                Bukan, ganti brand atau sumber
              </Button>
            </div>
          </StageSection>
          <IntakeActions
            onBack={onBackToSource}
            onNext={() => onContinue(screen)}
            busy={Boolean(busy)}
          />
        </>
      ) : null}

      {screen === "source-correction" ? (
        <>
          <StageSection
            id="source-correction-heading"
            title="Sumber yang benar"
            description="Gunakan website publik atau profil Instagram brand yang benar."
          >
            <div className={styles.gridTwo}>
              <TextInput
                id="source-correction-source"
                label="Website atau profil Instagram baru (opsional)"
                value={correctionSource}
                error={
                  error("official_sources") ?? error("sourceCorrectionSource")
                }
                hint="Kosongkan untuk memakai sumber yang sudah diterima. Google Maps dan nama brand tanpa sumber baru tidak didukung."
                onChange={setCorrectionSource}
              />
              <TextInput
                id="source-correction-name"
                label="Nama brand yang benar"
                required
                value={correctionBrandName}
                error={error("sourceCorrectionName")}
                hint="Nama ini dikirim sebagai koreksi pengguna saat sumber dibaca ulang."
                onChange={setCorrectionBrandName}
              />
            </div>
            <p className={styles.mutedText}>
              Yang sudah Anda isi tidak hilang. Sumber baru memulai satu draft
              ekstraksi pengganti; bila sumbernya sama, hanya nama yang
              diperbarui tanpa ekstraksi baru.
            </p>
          </StageSection>
          <IntakeActions
            onBack={() => onBack(screen)}
            onNext={() =>
              onSubmitSourceCorrection(correctionSource, correctionBrandName)
            }
            nextLabel="Baca ulang sumber"
            busy={busy === "extract"}
          />
        </>
      ) : null}

      {screen === "scope" ? (
        <>
          <StageSection
            id="scope-heading"
            title="Cakupan audit"
            description="Pilih salah satu bentuk entitas yang akan diaudit."
          >
            <fieldset>
              <legend className="sr-only">Jenis cakupan audit</legend>
              <div className={styles.gridThree}>
                {(["whole-brand", "branch", "product"] as ScopeKind[]).map(
                  (kind) => (
                    <label key={kind}>
                      <input
                        id={`scope-kind-${kind}`}
                        type="radio"
                        name="scope-kind"
                        value={kind}
                        checked={scopeKind === kind}
                        onChange={() => onScopeKindChange(kind)}
                      />{" "}
                      {kind === "whole-brand"
                        ? "Seluruh brand"
                        : kind === "branch"
                          ? "Satu cabang atau lokasi"
                          : "Satu produk atau layanan"}
                    </label>
                  ),
                )}
              </div>
            </fieldset>
            <div className={styles.gridTwo}>
              <TextInput
                id="brand-type"
                label="Jenis brand"
                required
                value={brief.brand_type}
                error={error("brand_type")}
                hint={
                  brief.brand_type.trim()
                    ? "Pastikan jenis brand ini sesuai dengan sumber resmi."
                    : emptyAiFieldHint(
                        brief.brand_type,
                        "brand_type",
                        customerEditedFields,
                        "Nuave belum menemukan jenis brand dari sumber ini. Isi nilai yang benar untuk melanjutkan.",
                      )
                }
                onChange={(value) => updateBrief("brand_type", value)}
              />
              <Field>
                <FieldLabel>Cakupan audit</FieldLabel>
                <FieldDescription>
                  {brief.entity_scope ||
                    (customerEditedFields.includes("entity_scope")
                      ? "Cakupan Anda belum lengkap. Pilih atau lengkapi nilainya."
                      : "Nuave belum menemukan cakupan audit dari sumber ini. Pilih cakupan yang benar untuk melanjutkan.")}
                </FieldDescription>
                {error("entity_scope") ? (
                  <p className={styles.validationError}>
                    {error("entity_scope")}
                  </p>
                ) : null}
              </Field>
            </div>
          </StageSection>
          <IntakeActions
            onBack={() => onBack(screen)}
            onNext={() => onContinue(screen)}
            busy={Boolean(busy)}
          />
        </>
      ) : null}

      {screen === "branch" || screen === "product" ? (
        <>
          <StageSection
            id={`${screen}-heading`}
            title={
              screen === "branch" ? "Cabang atau lokasi" : "Produk atau layanan"
            }
          >
            <TextInput
              id="scope-value"
              label={
                screen === "branch"
                  ? "Nama cabang atau lokasi"
                  : "Nama produk atau layanan"
              }
              required
              value={scopeValue}
              error={error("scopeValue") || error("entity_scope")}
              onChange={onScopeValueChange}
            />
            <Field>
              <FieldLabel>Cakupan terpilih</FieldLabel>
              <FieldDescription>
                {brief.entity_scope ||
                  "Nilai cakupan akan muncul setelah nama dilengkapi."}
              </FieldDescription>
              {error("entity_scope") ? (
                <p className={styles.validationError}>
                  {error("entity_scope")}
                </p>
              ) : null}
            </Field>
          </StageSection>
          <IntakeActions
            onBack={() => onBack(screen)}
            onNext={() => onContinue(screen)}
            busy={Boolean(busy)}
          />
        </>
      ) : null}

      {screen === "category" ? (
        <>
          <StageSection id="category-heading" title="Kategori">
            {extraction?.category.trim() ? (
              <fieldset>
                <legend>Saran kategori</legend>
                <label>
                  <input
                    type="radio"
                    name="category-choice"
                    checked={brief.category === extraction.category.trim()}
                    onChange={() =>
                      updateBrief("category", extraction.category.trim())
                    }
                  />{" "}
                  {extraction.category.trim()} (saran dari ekstraksi)
                </label>{" "}
                <label>
                  <input
                    type="radio"
                    name="category-choice"
                    checked={brief.category !== extraction.category.trim()}
                    onChange={() => {
                      if (brief.category === extraction.category.trim()) {
                        updateBrief("category", "");
                      }
                    }}
                  />{" "}
                  Kategori lain
                </label>
              </fieldset>
            ) : null}
            <TextInput
              id="category"
              label="Category"
              required
              value={brief.category}
              error={error("category")}
              hint={
                brief.category.trim()
                  ? "Gunakan nama kategori yang cukup spesifik untuk pertanyaan pelanggan."
                  : emptyAiFieldHint(
                      brief.category,
                      "category",
                      customerEditedFields,
                      "Nuave belum menemukan kategori dari sumber ini. Isi kategori yang benar untuk melanjutkan.",
                    )
              }
              onChange={(value) => updateBrief("category", value)}
            />
          </StageSection>
          <IntakeActions
            onBack={() => onBack(screen)}
            onNext={() => onContinue(screen)}
            busy={Boolean(busy)}
          />
        </>
      ) : null}

      {screen === "market" ? (
        <>
          <StageSection
            id="market-heading"
            title="Market atau lokasi"
            description={workflowMetaDescription(scopeKind)}
          >
            <TextInput
              id="market-context"
              label="Market or location"
              required
              value={brief.market_context}
              error={error("market_context")}
              hint={
                brief.market_context.trim()
                  ? "Contoh: nasional di Indonesia, online di Indonesia, atau Bandung."
                  : emptyAiFieldHint(
                      brief.market_context,
                      "market_context",
                      customerEditedFields,
                      "Nuave belum menemukan konteks pasar dari sumber ini. Isi konteks pasar yang benar untuk melanjutkan.",
                      marketInvalidated
                        ? "Cakupan berubah, sehingga konteks pasar lama dihapus. Isi konteks pasar yang benar untuk melanjutkan."
                        : undefined,
                    )
              }
              onChange={(value) => updateBrief("market_context", value)}
            />
          </StageSection>
          <IntakeActions
            onBack={() => onBack(screen)}
            onNext={() => onContinue(screen)}
            busy={Boolean(busy)}
          />
        </>
      ) : null}

      {screen === "customer-reasons" ? (
        <>
          <StageSection
            id="customer-reasons-heading"
            title="Pelanggan dan kebutuhan"
          >
            <LongInput
              id="target-customer"
              label="Target customer"
              required
              value={brief.target_customer}
              error={error("target_customer")}
              hint={
                brief.target_customer.trim()
                  ? "Pastikan deskripsi ini mewakili pelanggan yang ingin dipahami."
                  : emptyAiFieldHint(
                      brief.target_customer,
                      "target_customer",
                      customerEditedFields,
                      "Nuave belum menemukan target pelanggan dari sumber ini. Isi nilai yang benar untuk melanjutkan.",
                    )
              }
              onChange={(value) => updateBrief("target_customer", value)}
            />
            <div className={styles.gridTwo}>
              <LineListInput
                id="customer-needs"
                label="Customer needs"
                required
                value={brief.verified_customer_needs}
                error={error("verified_customer_needs")}
                hint={
                  hasFilledValue(brief.verified_customer_needs)
                    ? "Setidaknya satu kebutuhan, satu item per baris."
                    : emptyAiFieldHint(
                        brief.verified_customer_needs,
                        "verified_customer_needs",
                        customerEditedFields,
                        "Nuave belum menemukan kebutuhan pelanggan dari sumber ini. Isi setidaknya satu kebutuhan untuk melanjutkan.",
                      )
                }
                onChange={(value) =>
                  updateBrief("verified_customer_needs", value)
                }
              />
              <LineListInput
                id="decision-criteria"
                label="Decision criteria"
                required
                value={brief.verified_decision_criteria}
                error={error("verified_decision_criteria")}
                hint={
                  hasFilledValue(brief.verified_decision_criteria)
                    ? "Setidaknya satu pertimbangan, satu item per baris."
                    : emptyAiFieldHint(
                        brief.verified_decision_criteria,
                        "verified_decision_criteria",
                        customerEditedFields,
                        "Nuave belum menemukan pertimbangan keputusan dari sumber ini. Isi setidaknya satu pertimbangan untuk melanjutkan.",
                      )
                }
                onChange={(value) =>
                  updateBrief("verified_decision_criteria", value)
                }
              />
            </div>
          </StageSection>
          <IntakeActions
            onBack={() => onBack(screen)}
            onNext={() => onContinue(screen)}
            busy={Boolean(busy)}
          />
        </>
      ) : null}

      {screen === "offerings" ? (
        <>
          <StageSection id="offerings-heading" title="Produk atau layanan">
            <LineListInput
              id="verified-offerings"
              label="Products or services"
              required
              value={brief.verified_offerings}
              error={error("verified_offerings")}
              hint={
                hasFilledValue(brief.verified_offerings)
                  ? "Setidaknya satu item terverifikasi, satu item per baris."
                  : emptyAiFieldHint(
                      brief.verified_offerings,
                      "verified_offerings",
                      customerEditedFields,
                      "Nuave belum menemukan produk atau layanan dari sumber ini. Isi setidaknya satu produk atau layanan untuk melanjutkan.",
                      offeringsInvalidated
                        ? "Cakupan produk berubah, sehingga daftar sebelumnya dihapus. Isi setidaknya satu produk atau layanan untuk melanjutkan."
                        : undefined,
                    )
              }
              onChange={(value) => updateBrief("verified_offerings", value)}
            />
            <Field>
              <FieldLabel>Priority offering</FieldLabel>
              <FieldDescription>
                {brief.priority_offering ||
                  "Akan diturunkan dari item pertama yang terisi."}
              </FieldDescription>
            </Field>
          </StageSection>
          <IntakeActions
            onBack={() => onBack(screen)}
            onNext={() => onContinue(screen)}
            busy={Boolean(busy)}
          />
        </>
      ) : null}

      {screen === "comparison-target" ? (
        <>
          <StageSection
            id="comparison-target-heading"
            title="Bisnis pembanding"
            description="Target baru ditulis hanya setelah tindakan eksplisit Anda."
          >
            <B1ComparisonTarget
              key={`${comparisonStatus}:${brief.verified_competitor.name}:${comparisonProposal?.name || ""}`}
              brief={brief}
              proposal={comparisonProposal}
              status={comparisonStatus}
              error={error("verified_competitor.name")}
              scopeError={error("verified_competitor.scope")}
              sourceError={error("verified_competitor.source_url")}
              onAccept={onAcceptComparison}
            />
          </StageSection>
          <IntakeActions
            onBack={() => onBack(screen)}
            onNext={() => onContinue(screen)}
            busy={Boolean(busy)}
          />
        </>
      ) : null}

      {screen === "facts" ? (
        <>
          <StageSection id="facts-heading" title="Fakta tambahan">
            <LongInput
              id="usp"
              label="Differentiator (opsional)"
              value={brief.usp}
              hint={
                brief.usp.trim()
                  ? "Draft dari ekstraksi; koreksi jika diperlukan."
                  : emptyAiFieldHint(
                      brief.usp,
                      "usp",
                      customerEditedFields,
                      "Nuave belum menemukan differentiator dari sumber ini. Isi nilai yang benar atau biarkan kosong karena bidang ini opsional.",
                    )
              }
              onChange={(value) => updateBrief("usp", value)}
            />
            <LineListInput
              id="customer-supplied-facts"
              label="Fakta yang Anda tambahkan (opsional)"
              value={brief.customer_supplied_facts}
              onChange={(value) =>
                updateBrief("customer_supplied_facts", value)
              }
              hint="Satu fakta per baris. Jangan masukkan data pribadi atau rahasia."
            />
          </StageSection>
          <IntakeActions
            onBack={() => onBack(screen)}
            onNext={() => onContinue(screen)}
            busy={Boolean(busy)}
          />
        </>
      ) : null}

      {screen === "review" ? (
        <>
          <StageSection
            id="review-heading"
            title="Review brief"
            description="Konfirmasi ini adalah tindakan eksplisit. Berpindah layar tidak mengonfirmasi brief."
          >
            {preservedEntries.length ? (
              <WarningAlert title="Nilai yang dipertahankan dari sumber sebelumnya">
                <p>
                  Sumber telah diganti. Nilai berikut berasal dari isian Anda
                  sebelumnya dan perlu diperiksa serta dikonfirmasi ulang.
                </p>
                <ul className={styles.compactList}>
                  {preservedEntries.map((entry) => (
                    <li key={entry.field}>
                      <strong>{entry.label}</strong>:
                      {entry.value || " Belum diisi"}
                    </li>
                  ))}
                </ul>
                {comparisonStatus === "needs_reconfirmation" ? (
                  <p>
                    Bisnis pembanding juga harus dikonfirmasi ulang pada layar
                    pemilihannya.
                  </p>
                ) : null}
              </WarningAlert>
            ) : null}
            <dl className={styles.factList}>
              <div className={styles.factRow}>
                <dt className={styles.factLabel}>Brand</dt>
                <dd className={styles.factValue}>{brief.brand_name}</dd>
              </div>
              <div className={styles.factRow}>
                <dt className={styles.factLabel}>Sumber resmi</dt>
                <dd className={styles.factValue}>
                  {brief.official_sources.join(", ")}
                </dd>
              </div>
              <div className={styles.factRow}>
                <dt className={styles.factLabel}>Cakupan</dt>
                <dd className={styles.factValue}>{brief.entity_scope}</dd>
              </div>
              <div className={styles.factRow}>
                <dt className={styles.factLabel}>Kategori</dt>
                <dd className={styles.factValue}>{brief.category}</dd>
              </div>
              <div className={styles.factRow}>
                <dt className={styles.factLabel}>Market</dt>
                <dd className={styles.factValue}>{brief.market_context}</dd>
              </div>
              <div className={styles.factRow}>
                <dt className={styles.factLabel}>Priority offering</dt>
                <dd className={styles.factValue}>{brief.priority_offering}</dd>
              </div>
              <div className={styles.factRow}>
                <dt className={styles.factLabel}>Comparison target</dt>
                <dd className={styles.factValue}>
                  {brief.verified_competitor.name || "Belum dikonfirmasi"}
                </dd>
              </div>
            </dl>
            <LineListInput
              id="brand-name-variants"
              label="Nama brand lain (opsional)"
              value={brief.brand_name_variants}
              onChange={(value) => updateBrief("brand_name_variants", value)}
            />
          </StageSection>
          <div className={styles.stickyAction}>
            <Button
              variant="ghost"
              type="button"
              onClick={() => onBack(screen)}
            >
              <IconArrowLeft /> Kembali
            </Button>
            <Button
              variant="default"
              type="button"
              onClick={onGenerate}
              disabled={Boolean(busy)}
            >
              {busy === "prompts" ? (
                <IconLoader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <IconArrowRight />
              )}
              Konfirmasi fakta dan buat 10 pertanyaan
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}

function workflowMetaDescription(scopeKind: ScopeKind) {
  if (scopeKind === "branch")
    return "Untuk satu cabang, isi area layanan atau lokasi yang benar-benar berlaku.";
  if (scopeKind === "product")
    return "Untuk satu produk, isi cakupan pasar produk ini; layar tetap wajib diisi.";
  return "Untuk seluruh brand, isi jangkauan nasional atau online yang ingin diuji.";
}

export function QuestionsStep({
  pack,
  brandName,
  busy,
  onEdit,
  onBack,
  onRun,
}: {
  pack: PromptPack;
  brandName: string;
  busy: Busy;
  onEdit: (index: number, value: string) => void;
  onBack: () => void;
  onRun: () => void;
}) {
  const promptsBySlot = new Map<
    string,
    { prompt: PromptPack["prompts"][number]; index: number }
  >();
  pack.prompts.forEach((prompt, index) => {
    const slot = measurementSlotForPromptId(prompt.prompt_id);
    if (slot) promptsBySlot.set(slot.id, { prompt, index });
  });

  return (
    <section className={`${styles.workspace} ${styles.workspaceWide}`}>
      <Button variant="ghost" onClick={onBack} className={styles.backButton}>
        <IconArrowLeft /> Back to client brief
      </Button>
      <StageIntro
        number={3}
        eyebrow="Review questions"
        title="Review the ten questions before you run the audit."
        description={`Unbranded questions must not hint at ${brandName}. Each question runs as a separate observation.`}
      />
      <div className={styles.summaryChips}>
        <Badge variant="secondary">
          {CANONICAL_COMPOSITION_COUNTS.unbranded} unbranded
        </Badge>
        <Badge variant="default">
          {CANONICAL_COMPOSITION_COUNTS.branded} branded
        </Badge>
        <Badge variant="outline">Target: ChatGPT</Badge>
      </div>
      <WarningAlert title="Tujuan setiap slot tetap ditetapkan Nuave">
        <p>{INDONESIAN_PURPOSE_DRIFT_WARNING}</p>
      </WarningAlert>
      {pack.warnings.length ? (
        <WarningAlert title="Question generator warning">
          {pack.warnings.join(" ")}
        </WarningAlert>
      ) : null}
      <div className={styles.categoryList}>
        {AUDIT_MEASUREMENT_MATRIX.map((slot) => {
          const entry = promptsBySlot.get(slot.id);
          if (!entry) return null;
          const { prompt, index } = entry;
          const questionId = `audit-question-${index}`;
          const rationaleId = `${questionId}-rationale`;
          const sectionId = `measurement-slot-${slot.order}`;
          return (
            <StageSection
              key={slot.id}
              id={sectionId}
              title={slot.customerFacingLabel}
              description={slot.measurementPurpose}
              className={styles.promptSection}
            >
              <FieldGroup
                className={styles.promptPair}
                aria-labelledby={sectionId}
              >
                <Field>
                  <div className={styles.promptMeta}>
                    <Badge
                      variant={
                        slot.auditedBrandIdentity === "required"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {slot.auditedBrandIdentity === "required"
                        ? "Branded"
                        : "Unbranded"}
                    </Badge>
                    <code>{prompt.prompt_id}</code>
                  </div>
                  <FieldLabel htmlFor={questionId}>
                    Question {slot.order}
                  </FieldLabel>
                  <Textarea
                    id={questionId}
                    rows={3}
                    value={prompt.question}
                    aria-describedby={rationaleId}
                    onChange={(event) => onEdit(index, event.target.value)}
                  />
                  <FieldDescription id={rationaleId}>
                    {slot.measurementPurpose}
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </StageSection>
          );
        })}
      </div>
      <div className={styles.stickyAction}>
        <div>
          <strong>Ready to run 10 independent observations</strong>
          <span>
            The client brief and questions lock when the audit starts.
          </span>
        </div>
        <Button variant="default" onClick={onRun} disabled={Boolean(busy)}>
          <IconSparkles /> Run the audit
        </Button>
      </div>
    </section>
  );
}

export type RunUnfinishedState = {
  completed: number;
  failedPromptIds: string[];
  message: string;
};
