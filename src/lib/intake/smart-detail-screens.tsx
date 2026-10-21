"use client";

import { useState, type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  IconBuildingStore,
  IconHome,
  IconMap,
  IconMapPin,
  IconMapPins,
  IconTruckDelivery,
  IconWorld,
} from "@tabler/icons-react";
import { SPRING_SETTLE } from "@/components/motion/presets";
import { useMotionAllowed } from "@/components/motion/useMotionAllowed";
import {
  Chip,
  ChipGroup,
  ChipRadioGroup,
  RadioChip,
} from "@/components/product/selection/Chip";
import {
  RadioTile,
  RadioTileGroup,
  TileGrid,
  ToggleTile,
} from "@/components/product/selection/Tile";
import {
  categorySuggestionsFor,
  smartCategoryReady,
  type PreparedUnderstanding,
  type SmartSelection,
} from "./smart-intake-contract";
import { ChipAdder } from "./ChipAdder";
import { OriginNote, ScreenError, sameText } from "./intake-bits";
import { placeSuggestions } from "./indonesian-places";
import { ScreenHeader } from "./step-one-screens";

type ScreenProps = {
  prepared: PreparedUnderstanding;
  selection: SmartSelection;
  /** Persists a new selection — the journey keeps the sensitive-text screen.
   * Returns false when the change was refused. */
  onChange: (next: SmartSelection) => boolean | void;
  /** The intake frame focuses this heading on screen arrival (R-27). */
  headingRef?: RefObject<HTMLHeadingElement | null>;
  /** Rejected sensitive input or navigation errors surface here (R-27). */
  error?: string | null;
  /** A field's own refusal (a limit) for that same message slot. */
  onRefuse?: (message: string) => void;
};

/** The picker part of a screen, also used inside the review's sheets (J26). */
export type FieldsProps = Pick<ScreenProps, "prepared" | "selection"> & {
  onChange: (next: SmartSelection) => boolean | void;
  /**
   * Shows a field's own refusal (a limit) in the screen's one message slot,
   * replacing whatever it showed before, so only the latest message stands.
   * Without it the field shows the message itself.
   */
  onRefuse?: (message: string) => void;
};

const originKind = (origin: string | undefined) =>
  origin === "website" ? "website" : origin === "nuave" ? "nuave" : "owner";

/* ───────────────────────────── J13 · category ───────────────────────────── */

function capitalise(value: string): string {
  return value
    ? value.charAt(0).toLocaleUpperCase("id-ID") + value.slice(1)
    : value;
}

/** The town at the end of a street address ("…, Bandung" → "Bandung"). */
function townOf(address: string): string | null {
  const last = address.split(",").at(-1)?.trim() ?? "";
  return last && last.length <= 30 && !/^\d/.test(last) ? last : null;
}

/**
 * J13's live preview: the chosen word inside the kind of question a real
 * customer types. An example only; the audit writes its own questions.
 */
function CustomerQuestionPreview({ selection }: { selection: SmartSelection }) {
  const animate = useMotionAllowed();
  const category = selection.category.trim();
  if (!category) return null;
  const area =
    selection.focus === "cabang"
      ? townOf(selection.locationAddress)
      : ["sekitar", "beberapa"].includes(selection.marketReach)
        ? (selection.marketAreas[0] ?? null)
        : null;
  return (
    <figure className="m-0 grid gap-2 rounded-card bg-stone-50 px-5 pt-[18px] pb-5">
      <figcaption className="type-label-sm text-ink-500">
        Contoh pertanyaan pelanggan
      </figcaption>
      <blockquote className="type-copy-lg m-0 text-ink-900">
        “
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.strong
            key={category}
            className="font-semibold text-ember-700"
            initial={animate ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={SPRING_SETTLE}
          >
            {area ? capitalise(category) : `Rekomendasi ${category}`}
          </motion.strong>
        </AnimatePresence>
        {area ? ` yang bagus di ${area} apa ya?` : " yang bagus apa ya?"}”
      </blockquote>
    </figure>
  );
}

export function CategoryFields({
  prepared,
  selection,
  onChange,
  showPreview = true,
}: FieldsProps & { showPreview?: boolean }) {
  const suggestions = categorySuggestionsFor(prepared, selection);
  const main = prepared.category.proposed?.trim()
    ? prepared.category.proposed!
    : null;
  const mainDistinct =
    main && !suggestions.some((item) => sameText(item, main)) ? main : null;
  const current = selection.category.trim();
  const currentUnmatched =
    current &&
    !suggestions.some((item) => sameText(item, current)) &&
    !(mainDistinct && sameText(mainDistinct, current))
      ? current
      : null;
  const update = (patch: Partial<SmartSelection>) =>
    onChange({
      ...selection,
      ...patch,
      origins: { ...selection.origins, category: "owner" },
    });
  const selectedIndex = suggestions.findIndex((item) =>
    sameText(item, current),
  );
  const value =
    selectedIndex >= 0
      ? `sug-${selectedIndex}`
      : mainDistinct && sameText(mainDistinct, current)
        ? "main"
        : currentUnmatched
          ? "current"
          : "";
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start gap-2.5">
        {suggestions.length || mainDistinct || currentUnmatched ? (
          <ChipRadioGroup
            label="Pilihan kategori"
            value={value}
            onValueChange={(next) => {
              if (next.startsWith("sug-")) {
                const picked = suggestions[Number(next.slice(4))];
                if (picked)
                  update({ category: picked, categoryKind: "suggestion" });
              } else if (next === "main" && mainDistinct) {
                update({ category: mainDistinct, categoryKind: "main" });
              }
            }}
          >
            {suggestions.map((item, index) => (
              <RadioChip
                key={`sug-${index}`}
                value={`sug-${index}`}
                label={item}
                checked={value === `sug-${index}`}
              />
            ))}
            {mainDistinct ? (
              <RadioChip
                value="main"
                label={mainDistinct}
                checked={value === "main"}
              />
            ) : null}
            {currentUnmatched ? (
              <RadioChip
                value="current"
                label={currentUnmatched}
                checked={value === "current"}
              />
            ) : null}
          </ChipRadioGroup>
        ) : null}
        <ChipAdder
          addLabel="Lainnya"
          fieldLabel="Kategori lain"
          placeholder="Sebutan yang dikenal pelanggan"
          splitOnComma={false}
          maxLength={200}
          startOpen={!suggestions.length && !mainDistinct && !currentUnmatched}
          onAdd={([value]) => {
            if (!value || value.length > 200) return false;
            return (
              update({ category: value, categoryKind: "manual" }) !== false
            );
          }}
        />
      </div>
      {showPreview ? <CustomerQuestionPreview selection={selection} /> : null}
    </div>
  );
}

/**
 * R-05/R-13, J13: the word the audit uses for the business. Chips instead of
 * tall cards: the active focus's `Saran Nuave` proposals, the website's own
 * category, and anything the owner typed. A live preview turns the choice
 * into the kind of question a real customer types.
 */
export function SmartCategoryScreen({
  prepared,
  selection,
  onChange,
  headingRef,
  error,
}: ScreenProps) {
  return (
    <section className="grid" data-intake-screen="category">
      <ScreenHeader
        headingRef={headingRef}
        title={
          selection.focus === "cabang"
            ? "Lokasi ini biasanya disebut apa?"
            : selection.focus === "produk"
              ? "Produk atau layanan ini biasanya disebut apa?"
              : "Bisnis Anda biasanya disebut apa?"
        }
        lead="Pilih kata yang dipakai pelanggan saat bertanya ke AI."
      />
      <div className="mt-[22px]">
        <CategoryFields
          prepared={prepared}
          selection={selection}
          onChange={onChange}
        />
      </div>
      {selection.category.trim() ? (
        <OriginNote
          className="mt-[18px]"
          origin={originKind(selection.origins.category)}
          text={
            originKind(selection.origins.category) === "nuave"
              ? "dari website Anda"
              : undefined
          }
        />
      ) : null}
      {!smartCategoryReady(selection) ? (
        <p role="status" className="type-copy-sm m-0 mt-4 text-ink-500">
          Pilih atau tulis satu kategori.
        </p>
      ) : null}
      <ScreenError error={error} />
    </section>
  );
}

/* ───────────────────────────── J14 · offerings ───────────────────────────── */

export function OfferingsFields({
  prepared,
  selection,
  onChange,
}: FieldsProps) {
  const proposed = prepared.offerings.proposed ?? [];
  const ownerAdded = selection.offerings.filter(
    (item) => !proposed.some((row) => sameText(row, item)),
  );
  const update = (offerings: string[]) =>
    onChange({
      ...selection,
      offerings,
      origins: { ...selection.origins, offerings: "owner" },
    });
  const toggle = (item: string, on: boolean) =>
    update(
      on
        ? [...selection.offerings, item]
        : selection.offerings.filter((row) => row !== item),
    );
  return (
    <div className="grid gap-5">
      {proposed.length || ownerAdded.length ? (
        <ChipGroup label="Produk dan layanan">
          {proposed.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={selection.offerings.includes(item)}
              selectedIndicator="check"
              onToggle={(on) => toggle(item, on)}
            />
          ))}
          {ownerAdded.map((item) => (
            <Chip
              key={item}
              label={item}
              selected
              selectedIndicator="check"
              onToggle={(on) => toggle(item, on)}
            />
          ))}
        </ChipGroup>
      ) : null}
      <ChipAdder
        variant="field"
        addLabel="Tambah"
        fieldLabel="Produk atau layanan lain"
        placeholder="Contoh: nama produk, nama layanan"
        hint="Bisa tempel daftar, pisahkan dengan koma."
        onAdd={(items) => {
          let next = [...selection.offerings];
          for (const value of items) {
            const match = [...proposed, ...ownerAdded].find((item) =>
              sameText(item, value),
            );
            if (match) {
              if (!next.includes(match)) next = [...next, match];
            } else if (!next.some((item) => sameText(item, value))) {
              next = [...next, value];
            }
          }
          return update(next) !== false;
        }}
      />
    </div>
  );
}

/**
 * R-14, J14/J15: what the business sells. Items found on the website are
 * pre-selected; a tap switches one off or on. One box adds more, and accepts
 * a pasted list. Under a product focus the audited product is already the
 * frozen offering, so the catalogue is read-only context instead.
 */
export function SmartOfferingsScreen({
  prepared,
  selection,
  onChange,
  headingRef,
  error,
}: ScreenProps) {
  const proposed = prepared.offerings.proposed ?? [];
  if (selection.focus === "produk") {
    const catalogue = proposed.includes(selection.productTarget)
      ? proposed
      : [...proposed, selection.productTarget].filter(Boolean);
    return (
      <section className="grid" data-intake-screen="offerings">
        <ScreenHeader
          headingRef={headingRef}
          title="Apa saja yang Anda jual?"
          lead={`Audit ini berfokus pada ${selection.productTarget || "satu penawaran"}. Penawaran lain dari website Anda tetap tercatat sebagai konteks dan tidak ikut diaudit.`}
        />
        <ul
          className="m-0 mt-[22px] flex list-none flex-wrap gap-2.5 p-0"
          aria-label="Katalog penawaran"
        >
          {catalogue.map((item) => (
            <li
              key={item}
              className={
                item === selection.productTarget
                  ? "type-label-lg inline-flex min-h-11 items-center rounded-[22px] bg-ink-900 px-[18px] text-white"
                  : "type-label-lg inline-flex min-h-11 items-center rounded-[22px] border border-line-300 px-[18px] text-ink-900"
              }
            >
              {item}
              {item === selection.productTarget ? (
                <span className="sr-only"> · Fokus audit</span>
              ) : null}
            </li>
          ))}
        </ul>
        <OriginNote
          className="mt-[18px]"
          origin={originKind(selection.origins.offerings ?? "website")}
        />
        <ScreenError error={error} />
      </section>
    );
  }
  return (
    <section className="grid" data-intake-screen="offerings">
      <ScreenHeader
        headingRef={headingRef}
        title="Apa saja yang Anda jual?"
        lead={
          proposed.length
            ? "Sudah kami pilih dari website. Ketuk untuk membuang, ketik untuk menambah."
            : "Tambahkan produk atau layanan utama yang pelanggan cari."
        }
      />
      <div className="mt-[22px]">
        <OfferingsFields
          prepared={prepared}
          selection={selection}
          onChange={onChange}
        />
      </div>
      {proposed.length ? (
        <OriginNote className="mt-[18px]" origin="website" />
      ) : null}
      {!selection.offerings.length ? (
        <p role="status" className="type-copy-sm m-0 mt-4 text-ink-500">
          Pilih atau tambah setidaknya satu produk atau layanan.
        </p>
      ) : null}
      <ScreenError error={error} />
    </section>
  );
}

/* ──────────────────────────── J18 · how they buy ──────────────────────────── */

const SERVICE_TILES = [
  { value: "on_premise", label: "Datang ke tempat", Icon: IconBuildingStore },
  { value: "delivery", label: "Dikirim", Icon: IconTruckDelivery },
  { value: "on_customer", label: "Anda yang datang", Icon: IconHome },
  { value: "online", label: "Online", Icon: IconWorld },
] as const;

export const SERVICE_LABELS: Record<string, string> = Object.fromEntries(
  SERVICE_TILES.map((tile) => [tile.value, tile.label]),
);

export function ServiceFields({ selection, onChange }: FieldsProps) {
  const toggle = (
    channel: (typeof SERVICE_TILES)[number]["value"],
    on: boolean,
  ) =>
    onChange({
      ...selection,
      serviceChannels: on
        ? [...selection.serviceChannels, channel]
        : selection.serviceChannels.filter((item) => item !== channel),
      origins: { ...selection.origins, serviceChannels: "owner" },
    });
  return (
    <TileGrid label="Cara pelanggan mendapatkan yang Anda tawarkan">
      {SERVICE_TILES.map(({ value, label, Icon }) => (
        <ToggleTile
          key={value}
          label={label}
          icon={<Icon size={28} stroke={1.5} />}
          pressed={selection.serviceChannels.includes(value)}
          onPressedChange={(on) => toggle(value, on)}
        />
      ))}
    </TileGrid>
  );
}

/**
 * R-15, J18: compact 2 x 2 tiles, like Airbnb's amenities. All four fit on
 * one screen, pre-filled from the website; at least one is required.
 */
export function SmartServiceScreen({
  prepared,
  selection,
  onChange,
  headingRef,
  error,
}: ScreenProps) {
  const fromWebsite =
    selection.origins.serviceChannels === "website" &&
    selection.serviceChannels.length > 0;
  return (
    <section className="grid" data-intake-screen="service">
      <ScreenHeader
        headingRef={headingRef}
        title="Bagaimana pelanggan mendapatkannya?"
        lead={
          fromWebsite
            ? "Pilih semua yang berlaku. Sudah kami isi dari website."
            : "Pilih semua yang berlaku."
        }
      />
      <div className="mt-[22px]">
        <ServiceFields
          prepared={prepared}
          selection={selection}
          onChange={onChange}
        />
      </div>
      {!selection.serviceChannels.length ? (
        <p role="status" className="type-copy-sm m-0 mt-4 text-ink-500">
          Pilih setidaknya satu cara.
        </p>
      ) : null}
      <ScreenError error={error} />
    </section>
  );
}

/* ──────────────────────────── J19 · where they are ──────────────────────────── */

const REACH_TILES = [
  { value: "sekitar", label: "Satu area", Icon: IconMapPin },
  { value: "beberapa", label: "Beberapa area", Icon: IconMapPins },
  { value: "seluruh", label: "Seluruh Indonesia", Icon: IconMap },
  { value: "luar", label: "Luar negeri", Icon: IconWorld },
] as const;

export const REACH_LABELS: Record<string, string> = {
  sekitar: "Satu area",
  beberapa: "Beberapa area",
  seluruh: "Seluruh Indonesia",
  luar: "Indonesia dan luar negeri",
};

const AREA_CAP = 8;

export function MarketFields({
  prepared,
  selection,
  onChange,
  onRefuse,
}: FieldsProps) {
  const proposed = prepared.marketAreas.proposed ?? [];
  const ownerAdded = selection.marketAreas.filter(
    (item) => !proposed.some((row) => sameText(row, item)),
  );
  const areaBased =
    selection.marketReach === "sekitar" || selection.marketReach === "beberapa";
  const [areaBlock, setAreaBlock] = useState<string | null>(null);
  const update = (patch: Partial<SmartSelection>) =>
    onChange({
      ...selection,
      ...patch,
      origins: { ...selection.origins, market: "owner" },
    });
  const setAreas = (areas: string[]) =>
    update({ marketAreas: areas, retainedBrandAreas: areas });
  const blocked = () => {
    const message =
      "Area dibatasi paling banyak 8. Hapus satu untuk menambah yang lain.";
    if (onRefuse) onRefuse(message);
    else setAreaBlock(message);
  };
  const toggleArea = (area: string, on: boolean): boolean => {
    if (on && selection.marketAreas.some((item) => sameText(item, area))) {
      setAreaBlock(null);
      return true;
    }
    if (selection.marketReach === "sekitar") {
      setAreas(on ? [area] : []);
      setAreaBlock(null);
      return true;
    }
    if (on) {
      if (selection.marketAreas.length >= AREA_CAP) {
        blocked();
        return false;
      }
      setAreas([...selection.marketAreas, area]);
    } else {
      setAreas(selection.marketAreas.filter((item) => item !== area));
    }
    setAreaBlock(null);
    return true;
  };
  /** Adds typed or suggested areas in one change; a ninth is refused. */
  const addAreas = (values: string[]): boolean => {
    let next = [...selection.marketAreas];
    for (const value of values) {
      const area =
        [...proposed, ...ownerAdded].find((item) => sameText(item, value)) ??
        value;
      if (next.some((item) => sameText(item, area))) continue;
      if (selection.marketReach === "sekitar") {
        next = [area];
        continue;
      }
      if (next.length >= AREA_CAP) {
        blocked();
        return false;
      }
      next = [...next, area];
    }
    // A refused change (sensitive text) keeps the typed text for correction.
    setAreaBlock(null);
    return setAreas(next) !== false;
  };
  return (
    <div className="grid">
      <RadioTileGroup
        label="Jangkauan pasar"
        value={selection.marketReach}
        onValueChange={(next) => {
          update({
            marketReach: next as SmartSelection["marketReach"],
            marketAreas: [],
            retainedBrandReach: next as SmartSelection["marketReach"],
            retainedBrandAreas: [],
          });
          setAreaBlock(null);
        }}
      >
        {REACH_TILES.map(({ value, label, Icon }) => (
          <RadioTile
            key={value}
            value={value}
            label={label}
            icon={<Icon size={28} stroke={1.5} />}
          />
        ))}
      </RadioTileGroup>
      <AnimatePresence initial={false}>
        {areaBased ? (
          <motion.div
            key="areas"
            className="grid gap-3 overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={SPRING_SETTLE}
          >
            <h2
              className="type-title m-0 mt-[26px] text-ink-900"
              id="area-heading"
            >
              {selection.marketReach === "sekitar"
                ? "Area mana?"
                : "Area mana saja?"}
            </h2>
            <div className="flex flex-wrap items-start gap-2.5">
              {proposed.length || ownerAdded.length ? (
                <ChipGroup labelId="area-heading">
                  {proposed.map((area) => (
                    <Chip
                      key={area}
                      label={area}
                      selected={selection.marketAreas.includes(area)}
                      selectedIndicator="check"
                      onToggle={(on) => toggleArea(area, on)}
                    />
                  ))}
                  {ownerAdded.map((area) => (
                    <Chip
                      key={area}
                      label={area}
                      selected
                      selectedIndicator="check"
                      onToggle={(on) => toggleArea(area, on)}
                    />
                  ))}
                </ChipGroup>
              ) : null}
              <ChipAdder
                addLabel="Tambah kota"
                fieldLabel="Kota atau area"
                placeholder="Ketik nama kota"
                maxLength={120}
                suggestionsFor={(draft) =>
                  placeSuggestions(draft, selection.marketAreas)
                }
                onAdd={addAreas}
              />
            </div>
            {areaBlock ? (
              <p role="alert" className="type-copy-sm m-0 text-ember-700">
                {areaBlock}
              </p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
      {selection.marketReach && selection.marketAreas.length > AREA_CAP ? (
        <p role="alert" className="type-copy-sm m-0 mt-3 text-ember-700">
          Pilih paling banyak 8 area.
        </p>
      ) : null}
    </div>
  );
}

/**
 * R-16, J19: where the customers are. `Satu area` keeps exactly one area,
 * `Beberapa area` one to eight, and the other two keep none. A ninth area is
 * refused with a visible note, never silently dropped. City names are
 * suggested as the owner types. Never reached under a location focus.
 */
export function SmartMarketScreen({
  prepared,
  selection,
  onChange,
  headingRef,
  error,
  onRefuse,
}: ScreenProps) {
  const areaBased =
    selection.marketReach === "sekitar" || selection.marketReach === "beberapa";
  return (
    <section className="grid" data-intake-screen="market">
      <ScreenHeader
        headingRef={headingRef}
        title="Di mana pelanggan Anda berada?"
        lead={
          selection.origins.market === "website" && selection.marketReach
            ? "Sudah kami isi dari website. Ganti jika perlu."
            : undefined
        }
      />
      <div className="mt-[22px]">
        <MarketFields
          prepared={prepared}
          selection={selection}
          onChange={onChange}
          onRefuse={onRefuse}
        />
      </div>
      {areaBased &&
      (selection.marketReach === "sekitar"
        ? selection.marketAreas.length !== 1
        : !selection.marketAreas.length) ? (
        <p role="status" className="type-copy-sm m-0 mt-4 text-ink-500">
          {selection.marketReach === "sekitar"
            ? "Pilih satu kota atau area."
            : "Pilih setidaknya satu kota atau area."}
        </p>
      ) : null}
      {!selection.marketReach ? (
        <p role="status" className="type-copy-sm m-0 mt-4 text-ink-500">
          Pilih satu jangkauan untuk melanjutkan.
        </p>
      ) : null}
      <ScreenError error={error} />
    </section>
  );
}
