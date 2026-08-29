"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  IconArrowLeft,
  IconArrowRight,
  IconExternalLink,
  IconSearch,
  IconSparkles,
} from "@tabler/icons-react";
import {
  businessBriefSchema,
  type BusinessBrief,
  type ExtractionDraft,
  type PromptPack,
} from "@/lib/audit/types";
import {
  INVALID_SIMILAR_BUSINESS_URL_MESSAGE,
  withPrimarySimilarBusiness,
} from "@/lib/audit/similar-businesses";
import SimilarBusinessesEditor from "./SimilarBusinessesEditor";
import styles from "./audit.module.css";

type Busy = "extract" | "prompts" | "run" | "report" | null;
type UpdateBrief = <K extends keyof BusinessBrief>(
  key: K,
  value: BusinessBrief[K],
) => void;

type BusinessFactsScreen =
  | "brand"
  | "offer"
  | "customer"
  | "market"
  | "milestone"
  | "details"
  | "review";

type BriefFieldErrors = Partial<Record<keyof BusinessBrief, string>>;

type ValidationResult = {
  success: boolean;
  error?: {
    issues: Array<{ path: PropertyKey[]; message: string }>;
  };
};

export const categoryLabels: Record<string, string> = {
  need_discovery: "Need discovery",
  solution_discovery: "Solution discovery",
  comparison: "Comparison",
  validation: "Validation",
  action: "Action",
};

const categories = [
  "need_discovery",
  "solution_discovery",
  "comparison",
  "validation",
  "action",
] as const;

const businessFactsMeta: Record<
  Exclude<BusinessFactsScreen, "milestone">,
  { number: number; title: string; description: string }
> = {
  brand: {
    number: 1,
    title: "Brand Anda",
    description:
      "Pastikan identitas dan cakupan brand yang akan digunakan untuk audit ini.",
  },
  offer: {
    number: 2,
    title: "Produk atau layanan",
    description:
      "Periksa apa yang ditawarkan brand Anda dan tentukan prioritas bila ada.",
  },
  customer: {
    number: 3,
    title: "Calon pelanggan",
    description:
      "Jelaskan siapa calon pelanggan Anda dan apa yang mereka pertimbangkan.",
  },
  market: {
    number: 4,
    title: "Pasar dan bisnis serupa",
    description:
      "Periksa pasar, sumber resmi, dan bisnis lain yang relevan untuk perbandingan.",
  },
  details: {
    number: 5,
    title: "Detail tambahan",
    description:
      "Tambahkan konteks yang membantu bila informasinya tersedia. Semua bagian di langkah ini opsional.",
  },
  review: {
    number: 6,
    title: "Periksa dan konfirmasi",
    description:
      "Periksa ringkasan fakta sebelum Nuave menggunakannya untuk membuat pertanyaan audit.",
  },
};

const screenFieldKeys: Partial<
  Record<BusinessFactsScreen, Array<keyof BusinessBrief>>
> = {
  brand: ["brand_name", "entity_scope", "brand_type", "category"],
  offer: ["verified_offerings", "priority_offering"],
  customer: [
    "target_customer",
    "verified_customer_needs",
    "verified_decision_criteria",
  ],
  market: ["market_context", "official_sources", "similar_businesses"],
  details: [
    "usp",
    "brand_name_variants",
    "conversion_action",
    "customer_supplied_facts",
    "known_accuracy_questions",
    "regulated_category_notes",
  ],
};

const fieldIds: Partial<Record<keyof BusinessBrief, string>> = {
  brand_name: "brief-brand-name",
  entity_scope: "brief-entity-scope",
  brand_type: "brief-brand-type",
  category: "brief-category",
  verified_offerings: "brief-offerings",
  priority_offering: "brief-priority-offering",
  target_customer: "brief-target-customer",
  verified_customer_needs: "brief-customer-needs",
  verified_decision_criteria: "brief-decision-criteria",
  market_context: "brief-market-context",
  official_sources: "brief-official-sources",
  usp: "brief-usp",
  brand_name_variants: "brief-brand-name-variants",
  conversion_action: "brief-conversion-action",
  customer_supplied_facts: "brief-customer-facts",
  known_accuracy_questions: "brief-accuracy-questions",
  regulated_category_notes: "brief-regulated-notes",
  agency_name: "brief-agency-name",
  agency_logo_data_url: "agency-logo",
};

function lines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function text(value: string[]) {
  return value.join("\n");
}

function sameLines(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  );
}

function sourceTitle(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function evidenceFieldLabel(field: string) {
  const labels: Record<string, string> = {
    brand_name: "Nama brand",
    entity_scope: "Cakupan brand",
    brand_type: "Jenis brand",
    category: "Kategori",
    market_context: "Pasar atau lokasi",
    target_customer: "Calon pelanggan",
    official_sources: "Sumber resmi",
    verified_offerings: "Produk atau layanan",
    verified_customer_needs: "Kebutuhan calon pelanggan",
    verified_decision_criteria: "Kriteria keputusan",
    brand_name_variants: "Nama brand lain",
    priority_offering: "Produk atau layanan prioritas",
    conversion_action: "Langkah berikutnya untuk pelanggan",
    customer_supplied_facts: "Fakta yang sering keliru",
    known_accuracy_questions: "Pertanyaan akurasi",
    usp: "Pembeda utama",
    regulated_category_notes: "Catatan kategori yang diatur",
  };
  return labels[field] || "Informasi brand";
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

function DisclosureSection({
  value,
  title,
  children,
}: Readonly<{
  value: string;
  title: React.ReactNode;
  children: React.ReactNode;
}>) {
  return (
    <Accordion className={styles.disclosure}>
      <AccordionItem value={value} className="border-0">
        <AccordionTrigger className={styles.disclosureTrigger}>
          {title}
        </AccordionTrigger>
        <AccordionContent className={styles.disclosureBody}>
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
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
  const fieldId = id || generatedId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const describedBy = [hint ? hintId : "", error ? errorId : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <Field
      data-disabled={disabled || undefined}
      data-invalid={error ? true : undefined}
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
        aria-describedby={describedBy || undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <FieldDescription id={hintId}>{hint}</FieldDescription> : null}
      {error ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
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
  const fieldId = id || generatedId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const describedBy = [hint ? hintId : "", error ? errorId : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <Field data-invalid={error ? true : undefined}>
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
        aria-describedby={describedBy || undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <FieldDescription id={hintId}>{hint}</FieldDescription> : null}
      {error ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </Field>
  );
}

function LineListEditor({
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
  const [draft, setDraft] = useState(serializedValue);
  const generatedId = useId();
  const fieldId = id || generatedId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const focusedRef = useRef(false);
  const describedBy = [hint ? hintId : "", error ? errorId : ""]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (!focusedRef.current) setDraft(serializedValue);
  }, [serializedValue]);

  function commitCanonical(nextDraft: string) {
    const normalizedValue = lines(nextDraft);
    if (!sameLines(normalizedValue, value)) onChange(normalizedValue);
    return normalizedValue;
  }

  return (
    <Field data-invalid={error ? true : undefined}>
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
        aria-describedby={describedBy || undefined}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);
          commitCanonical(nextDraft);
        }}
        onBlur={() => {
          focusedRef.current = false;
          const normalizedValue = commitCanonical(draft);
          setDraft(text(normalizedValue));
        }}
      />
      {hint ? <FieldDescription id={hintId}>{hint}</FieldDescription> : null}
      {error ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </Field>
  );
}

function LineListInput(props: Parameters<typeof LineListEditor>[0]) {
  return <LineListEditor {...props} />;
}

function validationMessage(key: keyof BusinessBrief) {
  switch (key) {
    case "brand_name":
      return "Masukkan nama brand yang valid.";
    case "entity_scope":
      return "Masukkan cakupan brand yang akan diaudit.";
    case "brand_type":
      return "Masukkan jenis brand yang valid.";
    case "category":
      return "Masukkan kategori brand yang valid.";
    case "verified_offerings":
      return "Tambahkan setidaknya satu produk atau layanan yang valid.";
    case "priority_offering":
      return "Periksa produk atau layanan prioritas ini.";
    case "target_customer":
      return "Jelaskan calon pelanggan yang akan menjadi konteks audit.";
    case "verified_customer_needs":
      return "Periksa kebutuhan calon pelanggan yang diisi.";
    case "verified_decision_criteria":
      return "Periksa kriteria keputusan yang diisi.";
    case "market_context":
      return "Masukkan pasar atau lokasi yang valid.";
    case "official_sources":
      return "Tambahkan setidaknya satu URL sumber resmi yang valid.";
    case "similar_businesses":
      return INVALID_SIMILAR_BUSINESS_URL_MESSAGE;
    case "usp":
      return "Periksa pembeda utama yang diisi.";
    case "brand_name_variants":
      return "Periksa nama brand lain yang diisi.";
    case "conversion_action":
      return "Periksa langkah berikutnya untuk pelanggan yang diisi.";
    case "customer_supplied_facts":
      return "Periksa fakta yang sering keliru yang diisi.";
    case "known_accuracy_questions":
      return "Periksa pertanyaan akurasi yang diisi.";
    case "regulated_category_notes":
      return "Periksa catatan kategori yang diatur yang diisi.";
    case "agency_name":
      return "Periksa nama agensi yang diisi.";
    case "agency_logo_data_url":
      return "Periksa logo laporan yang diunggah.";
    default:
      return "Periksa informasi ini sebelum melanjutkan.";
  }
}

function ReviewList({ values }: { values: string[] }) {
  return (
    <ul className="m-0 grid gap-1 pl-5 text-sm leading-6">
      {values.map((value) => (
        <li key={value}>{value}</li>
      ))}
    </ul>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-border py-6 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <h2 className="m-0 text-base font-semibold tracking-tight">{title}</h2>
        <div className="mt-3 grid gap-3 text-sm leading-6 text-muted-foreground">
          {children}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        onClick={onEdit}
        className="self-start"
      >
        Ubah
      </Button>
    </section>
  );
}

export function SourceStep({
  websiteUrl,
  setWebsiteUrl,
  brief,
  updateBrief,
  busy,
  factsExtracted,
  onExtract,
}: {
  websiteUrl: string;
  setWebsiteUrl: (value: string) => void;
  brief: BusinessBrief;
  updateBrief: UpdateBrief;
  busy: Busy;
  factsExtracted: boolean;
  onExtract: () => void;
}) {
  return (
    <section className={`${styles.workspace} ${styles.workspaceFocused}`}>
      <StageIntro
        number={1}
        eyebrow="Official source"
        title="Start with facts you can verify."
        description="Add the client's official website. Nuave will draft the business brief, and you will check every fact before the audit runs."
      />
      <form
        className={styles.stageForm}
        onSubmit={(event) => {
          event.preventDefault();
          onExtract();
        }}
      >
        <StageSection
          id="client-business-heading"
          title="Client business"
          description="Use the official business identity so every later observation refers to the right entity."
          className={styles.focusedSection}
        >
          <FieldSet aria-labelledby="client-business-heading">
            <FieldGroup className={styles.gridTwo}>
              <TextInput
                label="Official website"
                type="url"
                required
                value={websiteUrl}
                placeholder="https://example.com"
                hint="Nuave uses this domain as the primary source for the draft."
                onChange={setWebsiteUrl}
              />
              <TextInput
                label="Brand name"
                value={brief.brand_name}
                placeholder="Public brand name"
                onChange={(value) => updateBrief("brand_name", value)}
              />
              <TextInput
                label="Market or location"
                value={brief.market_context}
                placeholder="For example: Jakarta, Indonesia"
                onChange={(value) => updateBrief("market_context", value)}
              />
              <TextInput
                label="Business category"
                value={brief.category}
                placeholder="For example: dental clinic"
                onChange={(value) => updateBrief("category", value)}
              />
            </FieldGroup>
            <div className={`${styles.actionRow} ${styles.inlineAction}`}>
              <p>Only public information from the official domain is used.</p>
              <Button type="submit" variant="default" disabled={Boolean(busy)}>
                {busy === "extract" ? (
                  <IconLoader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <IconSearch />
                )}
                {factsExtracted ? "Analyze again" : "Draft the client brief"}
              </Button>
            </div>
          </FieldSet>
        </StageSection>
      </form>
    </section>
  );
}

export function BriefStep({
  brief,
  updateBrief,
  extraction,
  factsConfirmed,
  setFactsConfirmed,
  busy,
  onGenerate,
  onBack,
  onLogo,
}: {
  brief: BusinessBrief;
  updateBrief: UpdateBrief;
  extraction: ExtractionDraft | null;
  factsConfirmed: boolean;
  setFactsConfirmed: (value: boolean) => void;
  busy: Busy;
  onGenerate: () => void;
  onBack: () => void;
  onLogo: (file: File | undefined) => void;
}) {
  const [screen, setScreen] = useState<BusinessFactsScreen>("brand");
  const [returnToReview, setReturnToReview] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<BriefFieldErrors>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pendingFocusId = useRef<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      const focusId = pendingFocusId.current;
      pendingFocusId.current = null;
      if (focusId) document.getElementById(focusId)?.focus();
      else headingRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [screen]);

  function updateField<K extends keyof BusinessBrief>(
    key: K,
    value: BusinessBrief[K],
  ) {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    updateBrief(key, value);
  }

  function focusField(id: string) {
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.focus();
    });
  }

  function navigate(next: BusinessFactsScreen, focusId?: string) {
    pendingFocusId.current = focusId || null;
    setScreen(next);
  }

  function applyValidationResults(
    currentScreen: BusinessFactsScreen,
    checks: Array<{
      key: keyof BusinessBrief;
      result: ValidationResult;
      focusId?: string;
    }>,
  ) {
    const errors: BriefFieldErrors = {};
    let firstFocusId = "";

    for (const check of checks) {
      if (check.result.success) continue;
      errors[check.key] = validationMessage(check.key);
      if (!firstFocusId) {
        if (check.key === "similar_businesses") {
          const path = check.result.error?.issues[0]?.path ?? [];
          const index = typeof path[0] === "number" ? path[0] : 0;
          firstFocusId = `similar-business-${index}`;
        } else {
          firstFocusId = check.focusId || fieldIds[check.key] || "";
        }
      }
    }

    const ownedKeys = screenFieldKeys[currentScreen] ?? [];
    setFieldErrors((current) => {
      const next = { ...current };
      ownedKeys.forEach((key) => delete next[key]);
      return { ...next, ...errors };
    });

    if (firstFocusId) focusField(firstFocusId);
    return !firstFocusId;
  }

  function validateScreen(currentScreen: BusinessFactsScreen) {
    switch (currentScreen) {
      case "brand":
        return applyValidationResults(currentScreen, [
          {
            key: "brand_name",
            result: businessBriefSchema.shape.brand_name.safeParse(
              brief.brand_name,
            ),
          },
          {
            key: "entity_scope",
            result: businessBriefSchema.shape.entity_scope.safeParse(
              brief.entity_scope,
            ),
          },
          {
            key: "brand_type",
            result: businessBriefSchema.shape.brand_type.safeParse(
              brief.brand_type,
            ),
          },
          {
            key: "category",
            result: businessBriefSchema.shape.category.safeParse(brief.category),
          },
        ]);
      case "offer":
        return applyValidationResults(currentScreen, [
          {
            key: "verified_offerings",
            result: businessBriefSchema.shape.verified_offerings.safeParse(
              brief.verified_offerings,
            ),
          },
          {
            key: "priority_offering",
            result: businessBriefSchema.shape.priority_offering.safeParse(
              brief.priority_offering,
            ),
          },
        ]);
      case "customer":
        return applyValidationResults(currentScreen, [
          {
            key: "target_customer",
            result: businessBriefSchema.shape.target_customer.safeParse(
              brief.target_customer,
            ),
          },
          {
            key: "verified_customer_needs",
            result: businessBriefSchema.shape.verified_customer_needs.safeParse(
              brief.verified_customer_needs,
            ),
          },
          {
            key: "verified_decision_criteria",
            result:
              businessBriefSchema.shape.verified_decision_criteria.safeParse(
                brief.verified_decision_criteria,
              ),
          },
        ]);
      case "market":
        return applyValidationResults(currentScreen, [
          {
            key: "market_context",
            result: businessBriefSchema.shape.market_context.safeParse(
              brief.market_context,
            ),
          },
          {
            key: "official_sources",
            result: businessBriefSchema.shape.official_sources.safeParse(
              brief.official_sources,
            ),
          },
          {
            key: "similar_businesses",
            result: businessBriefSchema.shape.similar_businesses.safeParse(
              brief.similar_businesses,
            ),
          },
        ]);
      case "details":
        return applyValidationResults(currentScreen, [
          {
            key: "usp",
            result: businessBriefSchema.shape.usp.safeParse(brief.usp),
          },
          {
            key: "brand_name_variants",
            result: businessBriefSchema.shape.brand_name_variants.safeParse(
              brief.brand_name_variants,
            ),
          },
          {
            key: "conversion_action",
            result: businessBriefSchema.shape.conversion_action.safeParse(
              brief.conversion_action,
            ),
          },
          {
            key: "customer_supplied_facts",
            result: businessBriefSchema.shape.customer_supplied_facts.safeParse(
              brief.customer_supplied_facts,
            ),
          },
          {
            key: "known_accuracy_questions",
            result:
              businessBriefSchema.shape.known_accuracy_questions.safeParse(
                brief.known_accuracy_questions,
              ),
          },
          {
            key: "regulated_category_notes",
            result:
              businessBriefSchema.shape.regulated_category_notes.safeParse(
                brief.regulated_category_notes,
              ),
          },
        ]);
      default:
        return true;
    }
  }

  function advance(currentScreen: BusinessFactsScreen) {
    if (!validateScreen(currentScreen)) return;
    if (returnToReview) {
      setReturnToReview(false);
      navigate("review");
      return;
    }
    if (currentScreen === "brand") navigate("offer");
    else if (currentScreen === "offer") navigate("customer");
    else if (currentScreen === "customer") navigate("market");
    else if (currentScreen === "market") navigate("milestone");
    else if (currentScreen === "details") navigate("review");
  }

  function goBack(currentScreen: BusinessFactsScreen) {
    if (currentScreen === "offer") navigate("brand");
    else if (currentScreen === "customer") navigate("offer");
    else if (currentScreen === "market") navigate("customer");
    else if (currentScreen === "milestone") navigate("market");
    else if (currentScreen === "details") navigate("market");
    else if (currentScreen === "review") navigate("details");
  }

  function editFromReview(
    target: Exclude<BusinessFactsScreen, "milestone" | "review">,
  ) {
    setReturnToReview(true);
    navigate(target);
  }

  function screenForField(key: keyof BusinessBrief): BusinessFactsScreen {
    if (["brand_name", "entity_scope", "brand_type", "category"].includes(key)) {
      return "brand";
    }
    if (["verified_offerings", "priority_offering"].includes(key)) {
      return "offer";
    }
    if (
      [
        "target_customer",
        "verified_customer_needs",
        "verified_decision_criteria",
      ].includes(key)
    ) {
      return "customer";
    }
    if (
      [
        "market_context",
        "official_sources",
        "similar_businesses",
        "verified_competitor",
      ].includes(key)
    ) {
      return "market";
    }
    if (
      [
        "usp",
        "brand_name_variants",
        "conversion_action",
        "customer_supplied_facts",
        "known_accuracy_questions",
        "regulated_category_notes",
      ].includes(key)
    ) {
      return "details";
    }
    return "review";
  }

  function finalFocusId(key: keyof BusinessBrief, issuePath: PropertyKey[]) {
    if (key === "similar_businesses") {
      const index = typeof issuePath[1] === "number" ? issuePath[1] : 0;
      return `similar-business-${index}`;
    }
    if (key === "verified_competitor") return "similar-business-0";
    return fieldIds[key] || "";
  }

  function generateQuestions() {
    let preparedBrief: BusinessBrief;
    try {
      preparedBrief = withPrimarySimilarBusiness(brief);
    } catch {
      setFieldErrors((current) => ({
        ...current,
        similar_businesses: INVALID_SIMILAR_BUSINESS_URL_MESSAGE,
      }));
      navigate("market", "similar-business-0");
      return;
    }

    const result = businessBriefSchema.safeParse(preparedBrief);
    if (!result.success) {
      const issue = result.error.issues[0];
      const key = issue.path[0] as keyof BusinessBrief;
      const target = screenForField(key);
      const focusId = finalFocusId(key, issue.path);
      setFieldErrors((current) => ({
        ...current,
        [key]: validationMessage(key),
      }));
      if (target === screen) focusField(focusId);
      else navigate(target, focusId);
      return;
    }

    onGenerate();
  }

  const meta = screen === "milestone" ? null : businessFactsMeta[screen];
  const headingId = screen === "brand" ? "stage-2" : `business-facts-${screen}`;

  return (
    <section
      className={`${styles.workspace} ${styles.workspaceFocused} max-w-[45rem] px-1 sm:px-0`}
      lang="id"
    >
      <Button
        type="button"
        variant="ghost"
        onClick={onBack}
        className={styles.backButton}
      >
        <IconArrowLeft /> Ganti website
      </Button>

      {screen === "milestone" ? (
        <header className={`${styles.stageIntro} mb-8`}>
          <p className={styles.stageMeta}>Jeda singkat</p>
          <h1 id={headingId} ref={headingRef} tabIndex={-1}>
            Konteks utama sudah siap
          </h1>
          <p>
            Nuave sudah punya konteks utama tentang {brief.brand_name}, calon
            pelanggan, dan pasar yang ingin Anda audit.
          </p>
        </header>
      ) : (
        <header className={`${styles.stageIntro} mb-8`}>
          <p
            className={styles.stageMeta}
            aria-label={`Langkah ${meta?.number} dari 6: ${meta?.title}`}
          >
            <span aria-hidden="true">{meta?.number} dari 6</span>
          </p>
          <div
            className="mb-5 h-1 w-full overflow-hidden rounded-full bg-muted"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${((meta?.number ?? 1) / 6) * 100}%` }}
            />
          </div>
          <h1 id={headingId} ref={headingRef} tabIndex={-1}>
            {meta?.title}
          </h1>
          <p>{meta?.description}</p>
        </header>
      )}

      {extraction?.warnings.length ? (
        <WarningAlert title="Periksa informasi ini">
          <ul className={styles.compactList}>
            {extraction.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </WarningAlert>
      ) : null}

      {screen === "brand" ? (
        <StageSection
          id="business-facts-brand-heading"
          title="Identitas brand"
          description="Gunakan identitas yang tepat agar semua pertanyaan merujuk ke brand yang benar."
          className={styles.focusedSection}
        >
          <FieldSet aria-labelledby="business-facts-brand-heading">
            <FieldGroup className="grid gap-5">
              <TextInput
                id={fieldIds.brand_name}
                label="Nama brand"
                required
                value={brief.brand_name}
                error={fieldErrors.brand_name}
                onChange={(value) => updateField("brand_name", value)}
              />
              <TextInput
                id={fieldIds.entity_scope}
                label="Cakupan brand"
                required
                hint="Satu cabang, brand, atau lini produk yang akan diuji dalam audit ini."
                value={brief.entity_scope}
                error={fieldErrors.entity_scope}
                onChange={(value) => updateField("entity_scope", value)}
              />
              <TextInput
                id={fieldIds.brand_type}
                label="Jenis brand"
                required
                value={brief.brand_type}
                error={fieldErrors.brand_type}
                onChange={(value) => updateField("brand_type", value)}
              />
              <TextInput
                id={fieldIds.category}
                label="Kategori"
                required
                value={brief.category}
                error={fieldErrors.category}
                onChange={(value) => updateField("category", value)}
              />
            </FieldGroup>
          </FieldSet>
        </StageSection>
      ) : null}

      {screen === "offer" ? (
        <StageSection
          id="business-facts-offer-heading"
          title="Penawaran utama"
          description="Satu item per baris membantu Nuave membentuk pertanyaan yang lebih spesifik."
          className={styles.focusedSection}
        >
          <FieldSet aria-labelledby="business-facts-offer-heading">
            <FieldGroup className="grid gap-5">
              <LineListInput
                id={fieldIds.verified_offerings}
                label="Produk atau layanan"
                required
                hint="Satu produk atau layanan terverifikasi per baris."
                value={brief.verified_offerings}
                error={fieldErrors.verified_offerings}
                onChange={(value) => updateField("verified_offerings", value)}
              />
              <TextInput
                id={fieldIds.priority_offering}
                label="Produk atau layanan prioritas"
                hint="Opsional. Isi bila ada satu penawaran yang paling penting untuk audit ini."
                value={brief.priority_offering}
                error={fieldErrors.priority_offering}
                onChange={(value) => updateField("priority_offering", value)}
              />
            </FieldGroup>
          </FieldSet>
        </StageSection>
      ) : null}

      {screen === "customer" ? (
        <StageSection
          id="business-facts-customer-heading"
          title="Konteks calon pelanggan"
          description="Isi konteks yang membantu pertanyaan terdengar seperti pertanyaan calon pelanggan yang nyata."
          className={styles.focusedSection}
        >
          <FieldSet aria-labelledby="business-facts-customer-heading">
            <FieldGroup className="grid gap-5">
              <LongInput
                id={fieldIds.target_customer}
                label="Calon pelanggan"
                required
                value={brief.target_customer}
                error={fieldErrors.target_customer}
                onChange={(value) => updateField("target_customer", value)}
              />
              <LineListInput
                id={fieldIds.verified_customer_needs}
                label="Kebutuhan calon pelanggan"
                hint="Opsional. Satu kebutuhan per baris."
                value={brief.verified_customer_needs}
                error={fieldErrors.verified_customer_needs}
                onChange={(value) => updateField("verified_customer_needs", value)}
              />
              <LineListInput
                id={fieldIds.verified_decision_criteria}
                label="Kriteria keputusan"
                hint="Opsional. Satu faktor pertimbangan per baris."
                value={brief.verified_decision_criteria}
                error={fieldErrors.verified_decision_criteria}
                onChange={(value) => updateField("verified_decision_criteria", value)}
              />
            </FieldGroup>
          </FieldSet>
        </StageSection>
      ) : null}

      {screen === "market" ? (
        <>
          <StageSection
            id="business-facts-market-heading"
            title="Pasar dan sumber resmi"
            description="Pastikan lokasi atau pasar dan sumber publik yang menjadi dasar fakta brand."
            className={styles.focusedSection}
          >
            <FieldSet aria-labelledby="business-facts-market-heading">
              <FieldGroup className="grid gap-5">
                <TextInput
                  id={fieldIds.market_context}
                  label="Pasar atau lokasi"
                  required
                  value={brief.market_context}
                  error={fieldErrors.market_context}
                  onChange={(value) => updateField("market_context", value)}
                />
                <LineListInput
                  id={fieldIds.official_sources}
                  label="Sumber resmi"
                  required
                  hint="Satu URL per baris."
                  value={brief.official_sources}
                  error={fieldErrors.official_sources}
                  onChange={(value) => updateField("official_sources", value)}
                />
              </FieldGroup>
            </FieldSet>
          </StageSection>

          <StageSection
            id="business-facts-similar-heading"
            title="Bisnis lain yang serupa"
            description="Opsional. Tambahkan bisnis yang serupa atau sering dibandingkan dengan brand Anda. Saran Nuave dapat Anda hapus atau ubah."
            className={styles.focusedSection}
          >
            <FieldSet aria-labelledby="business-facts-similar-heading">
              <SimilarBusinessesEditor
                businesses={brief.similar_businesses ?? []}
                onChange={(value) => updateField("similar_businesses", value)}
              />
              {fieldErrors.similar_businesses ? (
                <p className="text-sm text-destructive" role="alert">
                  {fieldErrors.similar_businesses}
                </p>
              ) : null}
            </FieldSet>
          </StageSection>
        </>
      ) : null}

      {screen === "milestone" ? (
        <div className="grid gap-4 rounded-xl border border-border bg-muted/30 p-5 sm:grid-cols-3">
          <div>
            <span className="text-xs font-medium text-muted-foreground">Brand</span>
            <p className="mt-1 text-sm font-medium">{brief.brand_name}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground">
              Calon pelanggan
            </span>
            <p className="mt-1 line-clamp-3 text-sm font-medium">
              {brief.target_customer}
            </p>
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground">Pasar</span>
            <p className="mt-1 text-sm font-medium">{brief.market_context}</p>
          </div>
        </div>
      ) : null}

      {screen === "details" ? (
        <StageSection
          id="business-facts-details-heading"
          title="Konteks tambahan"
          description="Kosongkan bagian yang tidak relevan. Melanjutkan tidak akan menghapus nilai yang sudah ada."
          className={styles.focusedSection}
        >
          <FieldSet aria-labelledby="business-facts-details-heading">
            <FieldGroup className="grid gap-5">
              <LongInput
                id={fieldIds.usp}
                label="Pembeda utama"
                value={brief.usp}
                error={fieldErrors.usp}
                onChange={(value) => updateField("usp", value)}
              />
              <LineListInput
                id={fieldIds.brand_name_variants}
                label="Nama brand lain"
                value={brief.brand_name_variants}
                error={fieldErrors.brand_name_variants}
                onChange={(value) => updateField("brand_name_variants", value)}
              />
              <TextInput
                id={fieldIds.conversion_action}
                label="Langkah berikutnya untuk pelanggan"
                value={brief.conversion_action}
                error={fieldErrors.conversion_action}
                onChange={(value) => updateField("conversion_action", value)}
              />
              <LineListInput
                id={fieldIds.customer_supplied_facts}
                label="Fakta yang sering keliru"
                value={brief.customer_supplied_facts}
                error={fieldErrors.customer_supplied_facts}
                onChange={(value) => updateField("customer_supplied_facts", value)}
              />
              <LineListInput
                id={fieldIds.known_accuracy_questions}
                label="Pertanyaan akurasi"
                value={brief.known_accuracy_questions}
                error={fieldErrors.known_accuracy_questions}
                onChange={(value) => updateField("known_accuracy_questions", value)}
              />
              <LongInput
                id={fieldIds.regulated_category_notes}
                label="Catatan kategori yang diatur"
                value={brief.regulated_category_notes}
                error={fieldErrors.regulated_category_notes}
                onChange={(value) => updateField("regulated_category_notes", value)}
              />
            </FieldGroup>
          </FieldSet>
        </StageSection>
      ) : null}

      {screen === "review" ? (
        <div className="grid gap-0">
          <ReviewSection title="Brand" onEdit={() => editFromReview("brand")}>
            <p className="m-0 text-foreground">{brief.brand_name}</p>
            <p className="m-0">Cakupan: {brief.entity_scope}</p>
            <p className="m-0">Jenis: {brief.brand_type}</p>
            <p className="m-0">Kategori: {brief.category}</p>
          </ReviewSection>

          <ReviewSection
            title="Produk atau layanan"
            onEdit={() => editFromReview("offer")}
          >
            <ReviewList values={brief.verified_offerings} />
            {brief.priority_offering ? (
              <p className="m-0">Prioritas: {brief.priority_offering}</p>
            ) : null}
          </ReviewSection>

          <ReviewSection
            title="Calon pelanggan"
            onEdit={() => editFromReview("customer")}
          >
            <p className="m-0 text-foreground">{brief.target_customer}</p>
            {brief.verified_customer_needs.length ? (
              <div>
                <p className="mb-1 mt-0 font-medium text-foreground">Kebutuhan</p>
                <ReviewList values={brief.verified_customer_needs} />
              </div>
            ) : null}
            {brief.verified_decision_criteria.length ? (
              <div>
                <p className="mb-1 mt-0 font-medium text-foreground">
                  Kriteria keputusan
                </p>
                <ReviewList values={brief.verified_decision_criteria} />
              </div>
            ) : null}
          </ReviewSection>

          <ReviewSection
            title="Pasar dan bisnis serupa"
            onEdit={() => editFromReview("market")}
          >
            <p className="m-0 text-foreground">{brief.market_context}</p>
            <div>
              <p className="mb-1 mt-0 font-medium text-foreground">Sumber resmi</p>
              <ReviewList values={brief.official_sources} />
            </div>
            {brief.similar_businesses?.filter((item) => item.source_url.trim())
              .length ? (
              <div>
                <p className="mb-1 mt-0 font-medium text-foreground">
                  Bisnis lain yang serupa
                </p>
                <ReviewList
                  values={(brief.similar_businesses ?? [])
                    .filter((item) => item.source_url.trim())
                    .map((item) => item.name?.trim() || item.source_url)}
                />
              </div>
            ) : null}
          </ReviewSection>

          <ReviewSection
            title="Detail tambahan"
            onEdit={() => editFromReview("details")}
          >
            {brief.usp ? <p className="m-0">Pembeda utama: {brief.usp}</p> : null}
            {brief.brand_name_variants.length ? (
              <div>
                <p className="mb-1 mt-0 font-medium text-foreground">
                  Nama brand lain
                </p>
                <ReviewList values={brief.brand_name_variants} />
              </div>
            ) : null}
            {brief.conversion_action ? (
              <p className="m-0">
                Langkah berikutnya untuk pelanggan: {brief.conversion_action}
              </p>
            ) : null}
            {brief.customer_supplied_facts.length ? (
              <div>
                <p className="mb-1 mt-0 font-medium text-foreground">
                  Fakta yang sering keliru
                </p>
                <ReviewList values={brief.customer_supplied_facts} />
              </div>
            ) : null}
            {brief.known_accuracy_questions.length ? (
              <div>
                <p className="mb-1 mt-0 font-medium text-foreground">
                  Pertanyaan akurasi
                </p>
                <ReviewList values={brief.known_accuracy_questions} />
              </div>
            ) : null}
            {brief.regulated_category_notes ? (
              <p className="m-0">
                Catatan kategori yang diatur: {brief.regulated_category_notes}
              </p>
            ) : null}
            {!brief.usp &&
            !brief.brand_name_variants.length &&
            !brief.conversion_action &&
            !brief.customer_supplied_facts.length &&
            !brief.known_accuracy_questions.length &&
            !brief.regulated_category_notes ? (
              <p className="m-0">Tidak ada detail tambahan yang diisi.</p>
            ) : null}
          </ReviewSection>

          <DisclosureSection
            value="report-branding"
            title="Branding laporan — opsional"
          >
            <div className="grid gap-5 py-1">
              <TextInput
                id={fieldIds.agency_name}
                label="Nama agensi"
                value={brief.agency_name}
                error={fieldErrors.agency_name}
                onChange={(value) => updateField("agency_name", value)}
              />
              <Field>
                <FieldLabel htmlFor="agency-logo">Logo agensi</FieldLabel>
                {brief.agency_logo_data_url ? (
                  <div className="flex min-h-14 items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <Image
                      src={brief.agency_logo_data_url}
                      width={96}
                      height={48}
                      unoptimized
                      alt="Logo laporan yang diunggah"
                      className="max-h-12 w-auto object-contain"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onLogo(undefined)}
                    >
                      Hapus logo
                    </Button>
                  </div>
                ) : null}
                <Input
                  id="agency-logo"
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) => onLogo(event.target.files?.[0])}
                />
                <FieldDescription>PNG atau JPG, maksimal 1 MB.</FieldDescription>
              </Field>
            </div>
          </DisclosureSection>

          {extraction?.evidence.length ? (
            <DisclosureSection
              value="extraction-notes"
              title={`${extraction.evidence.length} catatan sumber ekstraksi`}
            >
              <div className={styles.evidenceList}>
                {extraction.evidence.map((item, index) => (
                  <div key={`${item.field}-${index}`}>
                    <strong>{evidenceFieldLabel(item.field)}</strong>
                    <span>{item.value}</span>
                    <a href={item.source_url} target="_blank" rel="noreferrer">
                      {sourceTitle(item.source_url)} <IconExternalLink />
                    </a>
                  </div>
                ))}
              </div>
            </DisclosureSection>
          ) : null}

          <div className={`${styles.stickyAction} flex-col items-stretch`}>
            <div className={styles.confirmation}>
              <Field orientation="horizontal" className="items-start">
                <Checkbox
                  id="facts-confirmed"
                  checked={factsConfirmed}
                  onCheckedChange={(checked) =>
                    setFactsConfirmed(checked === true)
                  }
                />
                <FieldLabel htmlFor="facts-confirmed" className="leading-6">
                  Saya sudah memeriksa informasi ini dan menyetujuinya untuk
                  digunakan dalam pertanyaan audit.
                </FieldLabel>
              </Field>
            </div>
            <div className={styles.actionRow}>
              <p>
                Pertanyaan baru dibuat hanya setelah Anda mengonfirmasi fakta di
                atas.
              </p>
              <Button
                type="button"
                variant="default"
                onClick={generateQuestions}
                disabled={Boolean(busy) || !factsConfirmed}
              >
                {busy === "prompts" ? (
                  <IconLoader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <IconArrowRight />
                )}
                Buat pertanyaan audit
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {screen !== "review" ? (
        <div className={`${styles.stickyAction} flex-wrap`}>
          <div className="flex w-full items-center justify-between gap-3">
            {screen === "brand" ? (
              <span aria-hidden="true" />
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => goBack(screen)}
              >
                <IconArrowLeft /> Kembali
              </Button>
            )}
            {screen === "milestone" ? (
              <Button
                type="button"
                variant="default"
                onClick={() => navigate("details")}
              >
                Lanjutkan <IconArrowRight />
              </Button>
            ) : (
              <Button
                type="button"
                variant="default"
                onClick={() => advance(screen)}
              >
                Lanjut <IconArrowRight />
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
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
  return (
    <section className={`${styles.workspace} ${styles.workspaceWide}`}>
      <Button
        type="button"
        variant="ghost"
        onClick={onBack}
        className={styles.backButton}
      >
        <IconArrowLeft /> Back to client brief
      </Button>
      <StageIntro
        number={3}
        eyebrow="Review questions"
        title="Review the ten questions before you run the audit."
        description={`Unbranded questions must not hint at ${brandName}. Each question runs as a separate observation.`}
      />
      <div className={styles.summaryChips}>
        <Badge variant="secondary">5 unbranded</Badge>
        <Badge variant="default">5 branded</Badge>
        <Badge variant="outline">Target: ChatGPT</Badge>
      </div>
      {pack.warnings.length ? (
        <WarningAlert title="Question generator warning">
          {pack.warnings.join(" ")}
        </WarningAlert>
      ) : null}
      <div className={styles.categoryList}>
        {categories.map((category) => (
          <StageSection
            key={category}
            id={`category-${category}`}
            title={categoryLabels[category]}
            className={styles.promptSection}
          >
            <FieldGroup
              className={styles.promptPair}
              aria-labelledby={`category-${category}`}
            >
              {pack.prompts.map((prompt, index) => {
                if (prompt.category !== category) return null;
                const questionId = `audit-question-${index}`;
                const rationaleId = `${questionId}-rationale`;
                return (
                  <Field key={prompt.prompt_id}>
                    <div className={styles.promptMeta}>
                      <Badge variant={prompt.branded ? "default" : "secondary"}>
                        {prompt.branded ? "Branded" : "Unbranded"}
                      </Badge>
                      <code>{prompt.prompt_id}</code>
                    </div>
                    <FieldLabel htmlFor={questionId}>
                      Question {index + 1}
                    </FieldLabel>
                    <Textarea
                      id={questionId}
                      rows={3}
                      value={prompt.question}
                      aria-describedby={rationaleId}
                      onChange={(event) => onEdit(index, event.target.value)}
                    />
                    <FieldDescription id={rationaleId}>
                      {prompt.rationale}
                    </FieldDescription>
                  </Field>
                );
              })}
            </FieldGroup>
          </StageSection>
        ))}
      </div>
      <div className={styles.stickyAction}>
        <div>
          <strong>Ready to run 10 independent observations</strong>
          <span>
            The client brief and questions lock when the audit starts.
          </span>
        </div>
        <Button
          type="button"
          variant="default"
          onClick={onRun}
          disabled={Boolean(busy)}
        >
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
