"use client";

import { useId, useState, type ReactNode, type RefObject } from "react";
import { Checkbox } from "@base-ui/react";
import {
  IconBuildingStore,
  IconCheck,
  IconSwords,
  IconUsers,
} from "@tabler/icons-react";
import {
  BottomSheet,
  SheetActionsHeader,
} from "@/components/motion/BottomSheet";
import { Chip, ChipGroup } from "@/components/product/selection/Chip";
import { Reveal } from "@/components/product/selection/Reveal";
import { cn } from "@/lib/utils";
import {
  INTAKE_TEXT_RESTRICTED_MESSAGE,
  SOURCE_EXCERPT_EMPTY_NOTICE,
  type SourceExcerptStatus,
} from "../audit/types";
import {
  requiredSmartGaps,
  smartAliasesReady,
  smartCategoryReady,
  smartComparatorsReady,
  smartMarketReady,
  smartServiceReady,
  unsafeSmartSelection,
  type PreparedUnderstanding,
  type SmartSelection,
} from "./smart-intake-contract";
import { ChipAdder } from "./ChipAdder";
import { ScreenError, sameText } from "./intake-bits";
import { ScreenHeader, displayHost } from "./step-one-screens";
import {
  CategoryFields,
  MarketFields,
  OfferingsFields,
  ServiceFields,
} from "./smart-detail-screens";
import {
  CompetitorFields,
  CustomerFields,
  DifferentiatorFields,
  NeedsFields,
} from "./smart-customer-screens";

type Props = {
  prepared: PreparedUnderstanding;
  selection: SmartSelection;
  /** Saves a section; false when the journey refused it. */
  onChange: (next: SmartSelection) => boolean | void;
  /** The owner's tick on the confirmation sentence (J25). */
  confirmed: boolean;
  onConfirmedChange: (confirmed: boolean) => void;
  /** Opens the brand check for a name correction (absent once paid). */
  onEditBrand?: () => void;
  /** Opens the website entry (absent once paid). */
  onEditSource?: () => void;
  /** Opens the focus screen; the chain then returns here (R-05/R-21). */
  onEditFocus: () => void;
  /** The profile changed after the questions were made from it. */
  canUndo: boolean;
  onUndo: () => void;
  busy?: boolean;
  error?: string | null;
  sourceExcerptStatus?: SourceExcerptStatus;
  /** The intake frame focuses this heading on screen arrival (R-27). */
  headingRef?: RefObject<HTMLHeadingElement | null>;
};

type Section = "business" | "customers" | "comparison";

const SECTION_TITLES: Record<Section, string> = {
  business: "Bisnis",
  customers: "Calon pelanggan",
  comparison: "Pembanding",
};

const CHANNEL_WORDS: Record<string, string> = {
  on_premise: "datang ke tempat",
  delivery: "dikirim",
  on_customer: "Anda yang datang",
  online: "online",
};

function focusText(selection: SmartSelection): string {
  if (selection.focus === "cabang")
    return selection.locationName.trim()
      ? `Satu cabang: ${selection.locationName.trim()}`
      : "Satu cabang";
  if (selection.focus === "produk")
    return selection.productTarget.trim()
      ? `Satu produk: ${selection.productTarget.trim()}`
      : "Satu produk";
  return "Seluruh brand";
}

function areaText(selection: SmartSelection): string {
  switch (selection.marketReach) {
    case "sekitar":
    case "beberapa":
      return selection.marketAreas.join(", ");
    case "seluruh":
      return "Seluruh Indonesia";
    case "luar":
      return "Indonesia dan luar negeri";
    default:
      return "";
  }
}

function comparatorText(selection: SmartSelection): string {
  if (selection.comparatorMode === "named")
    return selection.comparatorNames.join(", ");
  if (selection.comparatorMode === "category-alternatives")
    return "Tidak ada pembanding langsung. Nuave membandingkan dengan bisnis sejenis.";
  return "Belum tahu. Nuave membandingkan dengan bisnis sejenis.";
}

/** One read-back line: a quiet label over the value. */
function Fact({
  label,
  value,
  empty = "Belum diisi",
  required = false,
  children,
}: {
  label: string;
  value: string;
  /** Shown when nothing was chosen. */
  empty?: string;
  /** A missing required answer reads as something to fix. */
  required?: boolean;
  children?: ReactNode;
}) {
  const missing = !value.trim();
  return (
    <div className="grid gap-[3px] border-b border-line-200 py-3">
      <dt className="type-label-sm text-ink-500">{label}</dt>
      <dd
        className={cn(
          // A long unbroken name wraps inside the column instead of
          // widening the page.
          "type-copy m-0 min-w-0 [overflow-wrap:anywhere]",
          missing
            ? required
              ? "text-ember-700"
              : "text-ink-500"
            : "text-ink-900",
        )}
      >
        {missing ? (required ? "Perlu dipastikan" : empty) : value}
        {children}
      </dd>
    </div>
  );
}

function ReviewSection({
  icon,
  title,
  onEdit,
  disabled,
  children,
}: {
  icon: ReactNode;
  title: string;
  onEdit: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="mt-6">
      <div className="flex items-center gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-stone-100 text-ink-700"
          aria-hidden="true"
        >
          {icon}
        </span>
        <h2 id={headingId} className="type-heading-sm m-0 flex-1 text-ink-900">
          {title}
        </h2>
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          aria-label={`Ubah ${title}`}
          className="type-title-sm min-h-11 px-1 text-ink-900 underline underline-offset-4 transition-colors hover:text-ink-700 disabled:text-ink-400 disabled:no-underline"
        >
          Ubah
        </button>
      </div>
      <dl className="m-0 mt-2">{children}</dl>
    </section>
  );
}

/** A titled block inside an edit sheet. */
function SheetBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3">
      <h3 className="type-title m-0 text-ink-900">{title}</h3>
      {children}
    </div>
  );
}

/** Other names the business goes by (R-21/R-22), edited in the Bisnis sheet. */
function AliasFields({
  selection,
  onChange,
}: {
  selection: SmartSelection;
  onChange: (next: SmartSelection) => boolean | void;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const write = (aliases: string[]) => {
    const ok =
      onChange({
        ...selection,
        aliases,
        origins: { ...selection.origins, aliases: "owner" },
      }) !== false;
    if (ok) setProblem(null);
    return ok;
  };
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start gap-2.5">
        {selection.aliases.length ? (
          <ChipGroup label="Nama lain">
            {selection.aliases.map((alias, index) => (
              <Chip
                key={`${alias}-${index}`}
                label={alias}
                selected
                onToggle={(on) => {
                  if (!on)
                    write(
                      selection.aliases.filter((_, item) => item !== index),
                    );
                }}
              />
            ))}
          </ChipGroup>
        ) : null}
        <ChipAdder
          addLabel="Tambah nama lain"
          fieldLabel="Nama lain baru"
          placeholder="Contoh: singkatan atau nama lama"
          maxLength={160}
          onAdd={(items) => {
            let next = [...selection.aliases];
            for (const alias of items) {
              if (next.some((item) => sameText(item, alias))) {
                setProblem("Nama lain ini sudah ada.");
                return false;
              }
              if (alias.length > 160) {
                setProblem("Setiap nama lain paling panjang 160 karakter.");
                return false;
              }
              if (next.length >= 12) {
                setProblem("Pilih paling banyak 12 nama lain.");
                return false;
              }
              next = [...next, alias];
            }
            return write(next);
          }}
        />
      </div>
      <p className="type-copy-sm m-0 text-ink-500">
        Nama lain membantu Nuave memastikan pertanyaan tanpa nama bisnis
        benar-benar tidak menyebut bisnis Anda.
      </p>
      {problem ? (
        <p role="alert" className="type-copy-sm m-0 text-ember-700">
          {problem}
        </p>
      ) : null}
    </div>
  );
}

/** Whether a section's draft can be saved: the same rules as its screens. */
function sectionReady(section: Section, draft: SmartSelection): boolean {
  if (section === "business")
    return (
      smartCategoryReady(draft) &&
      (draft.focus === "produk" || draft.offerings.length > 0) &&
      smartAliasesReady(draft)
    );
  if (section === "customers")
    return (
      smartServiceReady(draft) &&
      (draft.focus === "cabang" || smartMarketReady(draft))
    );
  return smartComparatorsReady(draft);
}

/**
 * J25/J26: the profile the audit will use, read back in three plain
 * sections. Each "Ubah" opens a sheet with the same pickers as the screens
 * before; "Simpan" applies the change in place and "Batal" drops it. The
 * owner's one tick on the confirmation sentence unlocks "Buat pertanyaan
 * audit" in the bottom bar.
 */
export default function SmartReview({
  prepared,
  selection,
  onChange,
  confirmed,
  onConfirmedChange,
  onEditBrand,
  onEditSource,
  onEditFocus,
  canUndo,
  onUndo,
  busy = false,
  error,
  sourceExcerptStatus,
  headingRef,
}: Props) {
  // The section stays set while the sheet slides away, so its content does
  // not change during the exit.
  const [section, setSection] = useState<Section>("business");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<SmartSelection>(selection);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const gaps = requiredSmartGaps(selection);
  const open = (next: Section) => {
    setDraft(selection);
    setSheetError(null);
    setSection(next);
    setSheetOpen(true);
  };
  const close = () => setSheetOpen(false);
  // Sensitive text never enters even the draft (R-31 privacy path).
  const changeDraft = (next: SmartSelection): boolean => {
    if (unsafeSmartSelection(next)) {
      setSheetError(INTAKE_TEXT_RESTRICTED_MESSAGE);
      return false;
    }
    setSheetError(null);
    setDraft(next);
    return true;
  };
  const save = () => {
    if (onChange(draft) === false) return;
    close();
  };
  const ready = sectionReady(section, draft);
  const offeringsText =
    selection.focus === "produk"
      ? selection.productTarget
      : selection.offerings.join(", ");

  return (
    <section
      className="grid w-full min-w-0 pb-4"
      data-smart-summary="ready"
      data-intake-screen="review"
    >
      <ScreenHeader
        headingRef={headingRef}
        title="Ini profil yang akan Nuave pakai"
        lead="Cek sekilas. Ketuk Ubah jika ada yang kurang tepat."
      />
      {sourceExcerptStatus === "no-usable-text" ? (
        <p role="status" className="type-copy-sm m-0 mt-3 text-ink-600">
          {SOURCE_EXCERPT_EMPTY_NOTICE}
        </p>
      ) : null}
      {canUndo ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-tile bg-stone-50 px-4 py-3">
          <p className="type-copy-sm m-0 flex-1 text-ink-700">
            Profil berubah setelah pertanyaan dibuat.
          </p>
          <button
            type="button"
            onClick={onUndo}
            disabled={busy}
            className="type-label min-h-11 font-semibold text-ink-900 underline underline-offset-4"
          >
            Batalkan perubahan
          </button>
        </div>
      ) : null}
      {gaps.length ? (
        <p role="status" className="type-copy-sm m-0 mt-4 text-ember-700">
          Perlu dipastikan: {gaps.join(", ")}.
        </p>
      ) : null}

      <div className="mt-6">
        <ReviewSection
          icon={<IconBuildingStore size={20} stroke={1.75} />}
          title={SECTION_TITLES.business}
          onEdit={() => open("business")}
          disabled={busy}
        >
          <Fact label="Nama" value={selection.name} required>
            {selection.aliases.length ? (
              <span className="type-copy-sm mt-0.5 block text-ink-600">
                Juga disebut: {selection.aliases.join(", ")}
              </span>
            ) : null}
          </Fact>
          <Fact label="Website" value={displayHost(prepared.canonicalSource)} />
          <Fact label="Fokus audit" value={focusText(selection)}>
            {selection.focus === "cabang" &&
            selection.locationAddress.trim() ? (
              <span className="type-copy-sm mt-0.5 block text-ink-600">
                {selection.locationAddress}
              </span>
            ) : null}
          </Fact>
          <Fact label="Disebut sebagai" value={selection.category} required />
          <Fact label="Menjual" value={offeringsText} required />
        </ReviewSection>

        <ReviewSection
          icon={<IconUsers size={20} stroke={1.75} />}
          title={SECTION_TITLES.customers}
          onEdit={() => open("customers")}
          disabled={busy}
        >
          <Fact label="Siapa" value={selection.targetCustomer} />
          <Fact
            label="Mereka butuh"
            value={selection.customerNeeds.join(", ")}
          />
          <Fact
            label="Mereka membandingkan"
            value={selection.decisionConsiderations.join(", ")}
          />
          <Fact
            label="Cara mendapatkan"
            value={selection.serviceChannels
              .map((channel) => CHANNEL_WORDS[channel] ?? channel)
              .join(", ")}
            required
          />
          {selection.focus !== "cabang" ? (
            <Fact
              label="Area"
              value={smartMarketReady(selection) ? areaText(selection) : ""}
              required
            />
          ) : null}
        </ReviewSection>

        <ReviewSection
          icon={<IconSwords size={20} stroke={1.75} />}
          title={SECTION_TITLES.comparison}
          onEdit={() => open("comparison")}
          disabled={busy}
        >
          <Fact
            label="Bisnis pembanding"
            value={
              smartComparatorsReady(selection) ? comparatorText(selection) : ""
            }
            required
          />
          <Fact label="Yang membedakan Anda" value={selection.differentiator} />
          <Fact
            label="Info yang sering salah"
            value={selection.publicFact}
            empty="Tidak ada"
          />
        </ReviewSection>
      </div>

      {prepared.sourceLinks.length ? (
        <div className="mt-4">
          <Reveal trigger={`Lihat sumber (${prepared.sourceLinks.length})`}>
            <ul className="type-copy-sm m-0 grid list-none gap-2 p-0 text-ink-600">
              {prepared.sourceLinks.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all underline underline-offset-2"
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      ) : null}

      {!gaps.length ? (
        <Checkbox.Root
          checked={confirmed}
          onCheckedChange={(next) => onConfirmedChange(next)}
          disabled={busy}
          aria-labelledby="review-confirmation"
          className="group mt-6 flex w-full cursor-pointer items-start gap-3 rounded-tile bg-stone-50 p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ink-900 focus-visible:ring-offset-2 data-[disabled]:cursor-default"
        >
          <span
            className="mt-px grid size-6 shrink-0 place-items-center rounded-[7px] border-[1.5px] border-line-300 bg-white text-white transition-colors group-data-[checked]:border-ink-900 group-data-[checked]:bg-ink-900"
            aria-hidden="true"
          >
            {confirmed ? <IconCheck size={16} stroke={2.5} /> : null}
          </span>
          <span id="review-confirmation" className="type-copy text-ink-900">
            Saya sudah memeriksa informasi ini dan menyetujuinya untuk digunakan
            dalam pertanyaan audit.
          </span>
        </Checkbox.Root>
      ) : null}
      <ScreenError error={error} />

      <BottomSheet
        open={sheetOpen}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        title={`Ubah ${SECTION_TITLES[section]}`}
        header={
          <SheetActionsHeader
            title={SECTION_TITLES[section]}
            onCancel={close}
            onSave={save}
            saveDisabled={!ready}
          />
        }
      >
        {section === "business" ? (
          <div className="grid gap-[26px] pt-2">
            <SheetBlock title="Fokus audit">
              <p className="type-copy m-0 text-ink-900">{focusText(draft)}</p>
              <button
                type="button"
                className="type-label justify-self-start font-semibold text-ink-900 underline underline-offset-4"
                onClick={() => {
                  close();
                  onEditFocus();
                }}
              >
                Ganti fokus audit
              </button>
            </SheetBlock>
            <SheetBlock title="Nama">
              <p className="type-copy m-0 text-ink-900">{draft.name}</p>
              {onEditBrand || onEditSource ? (
                <div className="flex flex-wrap gap-x-4">
                  {onEditBrand ? (
                    <button
                      type="button"
                      className="type-label min-h-11 font-semibold text-ink-900 underline underline-offset-4"
                      onClick={() => {
                        close();
                        onEditBrand();
                      }}
                    >
                      Ubah nama
                    </button>
                  ) : null}
                  {onEditSource ? (
                    <button
                      type="button"
                      className="type-label min-h-11 font-semibold text-ink-900 underline underline-offset-4"
                      onClick={() => {
                        close();
                        onEditSource();
                      }}
                    >
                      Ganti website
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="type-copy-sm m-0 text-ink-500">
                  Nama dan website sudah terkunci untuk pesanan ini.
                </p>
              )}
            </SheetBlock>
            <SheetBlock title="Nama lain">
              <AliasFields selection={draft} onChange={changeDraft} />
            </SheetBlock>
            <SheetBlock title="Disebut sebagai">
              <CategoryFields
                prepared={prepared}
                selection={draft}
                onChange={changeDraft}
                showPreview={false}
              />
            </SheetBlock>
            {draft.focus !== "produk" ? (
              <SheetBlock title="Menjual">
                <OfferingsFields
                  prepared={prepared}
                  selection={draft}
                  onChange={changeDraft}
                />
              </SheetBlock>
            ) : null}
          </div>
        ) : section === "customers" ? (
          <div className="grid gap-[26px] pt-2">
            <SheetBlock title="Siapa yang biasanya mencari bisnis Anda?">
              <CustomerFields
                prepared={prepared}
                selection={draft}
                onChange={changeDraft}
                onRefuse={setSheetError}
              />
            </SheetBlock>
            <NeedsFields
              prepared={prepared}
              selection={draft}
              onChange={changeDraft}
              onRefuse={setSheetError}
            />
            <SheetBlock title="Bagaimana pelanggan mendapatkannya?">
              <ServiceFields
                prepared={prepared}
                selection={draft}
                onChange={changeDraft}
              />
            </SheetBlock>
            {draft.focus !== "cabang" ? (
              <SheetBlock title="Di mana pelanggan Anda berada?">
                <MarketFields
                  prepared={prepared}
                  selection={draft}
                  onChange={changeDraft}
                  onRefuse={setSheetError}
                />
              </SheetBlock>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-[26px] pt-2">
            <SheetBlock title="Bisnis pembanding">
              <CompetitorFields
                prepared={prepared}
                selection={draft}
                onChange={changeDraft}
                onRefuse={setSheetError}
              />
            </SheetBlock>
            <SheetBlock title="Yang membedakan Anda">
              <DifferentiatorFields
                prepared={prepared}
                selection={draft}
                onChange={changeDraft}
                showExamples={false}
              />
            </SheetBlock>
          </div>
        )}
        {sheetError ? (
          <p role="alert" className="type-copy-sm m-0 mt-4 text-ember-700">
            {sheetError}
          </p>
        ) : null}
        {!ready ? (
          <p role="status" className="type-copy-sm m-0 mt-4 text-ink-500">
            Lengkapi pilihan yang wajib sebelum menyimpan.
          </p>
        ) : null}
      </BottomSheet>
    </section>
  );
}
