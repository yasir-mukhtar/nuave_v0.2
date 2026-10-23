"use client";

import { useRef, useState, type RefObject } from "react";
import { motion } from "motion/react";
import {
  BottomSheet,
  SheetActionsHeader,
} from "@/components/motion/BottomSheet";
import { SPRING_SETTLE } from "@/components/motion/presets";
import { useMotionAllowed } from "@/components/motion/useMotionAllowed";
import {
  SelectionCard,
  SelectionGroup,
} from "@/components/product/selection/SelectionCard";
import { SelectionRow } from "@/components/product/selection/SelectionRow";
import { AddChip } from "@/components/product/selection/Chip";
import { ART } from "@/components/product/journey/Art";
import { FloatingField } from "@/components/product/journey/FloatingField";
import {
  selectSmartFocus,
  smartLocationReady,
  smartProductReady,
  syncSmartCategory,
  usablePublishedLocations,
  type PreparedUnderstanding,
  type SmartSelection,
} from "./smart-intake-contract";
import { OriginNote, ScreenError } from "./intake-bits";
import { ScreenHeader } from "./step-one-screens";

type ScreenProps = {
  prepared: PreparedUnderstanding;
  selection: SmartSelection;
  /** Persists a new selection — the journey keeps the sensitive-text screen. */
  onChange: (next: SmartSelection) => void;
  /** The intake frame focuses this heading on screen arrival (R-27). */
  headingRef?: RefObject<HTMLHeadingElement | null>;
  /** Rejected sensitive input or navigation errors surface here (R-27). */
  error?: string | null;
};

const FOCUS_HEADING = "Apa yang ingin Anda audit?";

/**
 * R-10, J11: the audit's point of view, as three big rows with a small 3D
 * object each. `Seluruh brand` is Nuave's prepared proposal and is labelled
 * once. Tapping `Satu cabang` or `Satu produk` opens its list right away (the
 * J12 view); moving through the rows with arrow keys only selects, and
 * `Lanjut` goes on as before.
 */
export function SmartFocusScreen({
  prepared,
  selection,
  onChange,
  onOpenTarget,
  headingRef,
  error,
}: ScreenProps & {
  /** Open the list for a just-tapped location or product focus. */
  onOpenTarget: (next: SmartSelection) => void;
}) {
  const locations = usablePublishedLocations(prepared);
  const example = locations[0]?.name;
  const serviceExample = prepared.offerings.proposed?.[0]?.trim();
  const choose = (focus: SmartSelection["focus"]) =>
    selectSmartFocus(prepared, selection, focus);
  const choices = [
    {
      value: "brand" as const,
      title: "Seluruh klinik",
      description: "Semua cabang dan layanan, sebagai satu klinik",
      image: ART.focusBrand.src,
    },
    {
      value: "cabang" as const,
      title: "Satu cabang",
      description: example
        ? `Satu lokasi tertentu, misalnya ${example}`
        : "Satu lokasi tertentu",
      image: ART.focusBranch.src,
    },
    {
      value: "produk" as const,
      title: "Satu layanan",
      description: serviceExample
        ? `Satu layanan tertentu, misalnya ${serviceExample}`
        : "Satu layanan tertentu",
      image: ART.focusProduct.src,
    },
  ];
  return (
    <section className="grid" data-intake-screen="focus">
      <ScreenHeader
        headingRef={headingRef}
        title={FOCUS_HEADING}
        lead={
          selection.origins.focus === "nuave" ? (
            <OriginNote
              origin="nuave"
              text="sudah dipilih. Ganti jika perlu."
            />
          ) : (
            "Pertanyaan audit akan fokus ke pilihan ini."
          )
        }
      />
      <div className="mt-6">
        <SelectionGroup
          label="Fokus audit"
          value={selection.focus}
          onValueChange={(next) =>
            onChange(choose(next as SmartSelection["focus"]))
          }
        >
          {choices.map(({ value, title, description, image }) => (
            <SelectionCard
              key={value}
              value={value}
              title={title}
              description={description}
              image={image}
              onClick={
                value === "brand"
                  ? undefined
                  : () => onOpenTarget(choose(value))
              }
            />
          ))}
        </SelectionGroup>
      </div>
      <ScreenError error={error} />
    </section>
  );
}

/** The chosen focus, shown compact above its list (J12). Tapping changes it. */
function ChosenFocus({
  title,
  description,
  image,
  onChange,
}: {
  title: string;
  description: string;
  image: string;
  onChange: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onChange}
      aria-label={`${title}. Ganti fokus audit`}
      className="flex w-full items-center gap-4 rounded-tile border border-ink-900 bg-stone-50 py-[18px] pr-4 pl-5 text-left shadow-(--edge-ink) transition-transform active:scale-[0.985]"
    >
      <span className="grid min-w-0 flex-1 gap-1">
        <span className="type-title text-ink-900">{title}</span>
        <span className="type-copy-sm text-ink-600">{description}</span>
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element -- static decorative art */}
      <img
        src={image}
        alt=""
        width={64}
        height={64}
        className="size-16 object-contain"
      />
    </motion.button>
  );
}

/** One field sheet for adding a branch or product (J12b). */
function AddSheet({
  open,
  onOpenChange,
  title,
  fields,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    maxLength: number;
    autoComplete?: string;
  }[];
  onSave: () => void;
}) {
  const first = useRef<HTMLInputElement>(null);
  const ready = fields.every((field) => field.value.trim());
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      initialFocus={first}
      header={
        <SheetActionsHeader
          title={title}
          onCancel={() => onOpenChange(false)}
          onSave={onSave}
          saveDisabled={!ready}
        />
      }
    >
      <form
        className="grid gap-3.5 pb-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) onSave();
        }}
      >
        {fields.map((field, index) => (
          <FloatingField
            key={field.label}
            ref={index === 0 ? first : undefined}
            label={field.label}
            value={field.value}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            autoComplete={field.autoComplete ?? "off"}
            enterKeyHint={index === fields.length - 1 ? "done" : "next"}
            onChange={(event) => field.onChange(event.target.value)}
          />
        ))}
        <button type="submit" className="sr-only" tabIndex={-1}>
          Simpan
        </button>
      </form>
    </BottomSheet>
  );
}

function useListEntrance() {
  const animate = useMotionAllowed();
  return (index: number) =>
    animate
      ? {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { ...SPRING_SETTLE, delay: 0.08 + index * 0.05 },
        }
      : {};
}

/**
 * R-11, J12: one location the business itself publishes, or one the owner
 * adds in a sheet (name + address). Published rows are stated once as found
 * on the website; `usablePublishedLocations` re-checks a restored session
 * before that label is shown.
 */
export function SmartLocationScreen({
  prepared,
  selection,
  onChange,
  onChangeFocus,
  headingRef,
  error,
}: ScreenProps & { onChangeFocus: () => void }) {
  const locations = usablePublishedLocations(prepared);
  const entrance = useListEntrance();
  const selectedIndex = locations.findIndex(
    (item) =>
      item.name === selection.locationName &&
      item.address === selection.locationAddress,
  );
  const manualReady = selectedIndex < 0 && smartLocationReady(selection);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", address: "" });
  const updateTarget = (patch: Partial<SmartSelection>) =>
    onChange({
      ...selection,
      ...patch,
      origins: { ...selection.origins, focus: "owner" },
    });
  return (
    <section className="grid" data-intake-screen="location">
      <ScreenHeader headingRef={headingRef} title={FOCUS_HEADING} />
      <div className="mt-5">
        <ChosenFocus
          title="Satu cabang"
          description="Satu lokasi tertentu"
          image={ART.focusBranch.src}
          onChange={onChangeFocus}
        />
      </div>
      <h2 className="type-heading-sm m-0 mt-7 text-ink-900" id="branch-heading">
        Cabang mana?
      </h2>
      {locations.length || manualReady ? (
        <div className="mt-3">
          <SelectionGroup
            labelId="branch-heading"
            value={
              selectedIndex >= 0
                ? `loc-${selectedIndex}`
                : manualReady
                  ? "manual"
                  : ""
            }
            onValueChange={(next) => {
              if (!next.startsWith("loc-")) return;
              const picked = locations[Number(next.slice(4))];
              if (picked)
                updateTarget({
                  locationName: picked.name,
                  locationAddress: picked.address,
                });
            }}
          >
            {locations.map((item, index) => (
              <motion.div
                key={`${item.name}::${item.address}`}
                {...entrance(index)}
              >
                <SelectionRow
                  value={`loc-${index}`}
                  title={item.name}
                  description={item.address}
                />
              </motion.div>
            ))}
            {manualReady ? (
              <motion.div {...entrance(locations.length)}>
                <SelectionRow
                  value="manual"
                  title={selection.locationName}
                  description={selection.locationAddress}
                  meta="Dari Anda"
                />
              </motion.div>
            ) : null}
          </SelectionGroup>
        </div>
      ) : (
        <p className="type-copy m-0 mt-2 text-ink-600">
          Kami belum menemukan cabang di website Anda. Tambahkan cabang yang
          ingin diaudit.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <AddChip
          label="Tambah cabang"
          onClick={() => {
            setDraft({ name: "", address: "" });
            setAdding(true);
          }}
        />
        {locations.length ? <OriginNote origin="website" /> : null}
      </div>
      {!smartLocationReady(selection) ? (
        <p role="status" className="type-copy-sm m-0 mt-4 text-ink-500">
          Pilih satu cabang, atau tambahkan cabang lain.
        </p>
      ) : null}
      <ScreenError error={error} />
      <AddSheet
        open={adding}
        onOpenChange={setAdding}
        title="Tambah cabang"
        fields={[
          {
            label: "Nama cabang",
            value: draft.name,
            onChange: (name) => setDraft((current) => ({ ...current, name })),
            placeholder: "Contoh: nama klinik dan daerahnya",
            maxLength: 300,
          },
          {
            label: "Alamat cabang",
            value: draft.address,
            onChange: (address) =>
              setDraft((current) => ({ ...current, address })),
            placeholder: "Jalan, nomor, dan kota atau area",
            maxLength: 500,
            autoComplete: "street-address",
          },
        ]}
        onSave={() => {
          updateTarget({
            locationName: draft.name.trim(),
            locationAddress: draft.address.trim(),
          });
          setAdding(false);
        }}
      />
    </section>
  );
}

/**
 * R-12: one prepared offering, or one the owner adds in a sheet. Offerings are
 * stated once as found on the website; a typed target is the owner's own.
 */
export function SmartProductScreen({
  prepared,
  selection,
  onChange,
  onChangeFocus,
  headingRef,
  error,
}: ScreenProps & { onChangeFocus: () => void }) {
  const offerings = prepared.offerings.proposed ?? [];
  const entrance = useListEntrance();
  const selectedIndex = offerings.findIndex(
    (item) => item === selection.productTarget,
  );
  const manualActive =
    Boolean(selection.productTarget.trim()) && selectedIndex < 0;
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  // A target change re-resolves the category: the new product's suggestion
  // pre-selects unless the owner typed one (R-05).
  const updateTarget = (patch: Partial<SmartSelection>) =>
    onChange(
      syncSmartCategory(prepared, {
        ...selection,
        ...patch,
        origins: { ...selection.origins, focus: "owner" },
      }),
    );
  return (
    <section className="grid" data-intake-screen="product">
      <ScreenHeader headingRef={headingRef} title={FOCUS_HEADING} />
      <div className="mt-5">
        <ChosenFocus
          title="Satu layanan"
          description="Satu layanan tertentu"
          image={ART.focusProduct.src}
          onChange={onChangeFocus}
        />
      </div>
      <h2
        className="type-heading-sm m-0 mt-7 text-ink-900"
        id="product-heading"
      >
        Layanan mana?
      </h2>
      {offerings.length || manualActive ? (
        <div className="mt-3">
          <SelectionGroup
            labelId="product-heading"
            value={
              selectedIndex >= 0
                ? `off-${selectedIndex}`
                : manualActive
                  ? "manual"
                  : ""
            }
            onValueChange={(next) => {
              if (!next.startsWith("off-")) return;
              const picked = offerings[Number(next.slice(4))];
              if (picked) updateTarget({ productTarget: picked });
            }}
          >
            {offerings.map((offering, index) => (
              <motion.div key={offering} {...entrance(index)}>
                <SelectionRow value={`off-${index}`} title={offering} />
              </motion.div>
            ))}
            {manualActive ? (
              <motion.div {...entrance(offerings.length)}>
                <SelectionRow
                  value="manual"
                  title={selection.productTarget}
                  meta="Dari Anda"
                />
              </motion.div>
            ) : null}
          </SelectionGroup>
        </div>
      ) : (
        <p className="type-copy m-0 mt-2 text-ink-600">
          Kami belum menemukan layanan di website Anda. Tambahkan layanan yang
          ingin diaudit.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <AddChip
          label="Tambah layanan"
          onClick={() => {
            setDraft("");
            setAdding(true);
          }}
        />
        {offerings.length ? <OriginNote origin="website" /> : null}
      </div>
      {!smartProductReady(selection) ? (
        <p role="status" className="type-copy-sm m-0 mt-4 text-ink-500">
          Pilih atau tambahkan satu layanan.
        </p>
      ) : null}
      <ScreenError error={error} />
      <AddSheet
        open={adding}
        onOpenChange={setAdding}
        title="Tambah layanan"
        fields={[
          {
            label: "Nama layanan",
            value: draft,
            onChange: setDraft,
            maxLength: 300,
          },
        ]}
        onSave={() => {
          updateTarget({ productTarget: draft.trim() });
          setAdding(false);
        }}
      />
    </section>
  );
}
