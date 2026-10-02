"use client";

import { useState, type RefObject } from "react";
import {
  IconBuildingStore,
  IconHome,
  IconMap,
  IconMapPin,
  IconMapPins,
  IconTruckDelivery,
  IconWorld,
} from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  SelectionCard,
  SelectionGroup,
} from "@/components/product/selection/SelectionCard";
import { Chip, ChipGroup } from "@/components/product/selection/Chip";
import { AddLine } from "@/components/product/selection/AddLine";
import { Reveal } from "@/components/product/selection/Reveal";
import {
  categorySuggestionsFor,
  smartCategoryReady,
  type PreparedUnderstanding,
  type SmartSelection,
} from "./smart-intake-contract";
import controls from "./controls.module.css";

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

const ORIGIN_TEXT = {
  website: "Dari website Anda",
  nuave: "Saran Nuave",
  owner: "Dari Anda",
} as const;

function ScreenError({ error }: { error?: string | null }) {
  return error ? (
    <p role="alert" className="type-copy text-destructive">
      {error}
    </p>
  ) : null;
}

function sameText(a: string, b: string): boolean {
  return (
    a.trim().toLocaleLowerCase("id-ID") === b.trim().toLocaleLowerCase("id-ID")
  );
}

/**
 * R-05/R-13: the category the audit claims. The cards are the active focus's
 * `Saran Nuave` proposals — the whole-brand list for brand/location, the
 * offering-bound suggestion for product — plus the prepared website category
 * (`Dari website Anda`) and the current value as its own labelled card when
 * it matches neither. `Tulis kategori sendiri` keeps a local draft so a value
 * that transiently equals a card mid-keystroke never blanks the input.
 */
export function SmartCategoryScreen({
  prepared,
  selection,
  onChange,
  headingRef,
  error,
}: ScreenProps) {
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
  const update = (patch: Partial<SmartSelection>, originKey?: string) =>
    onChange({
      ...selection,
      ...patch,
      origins: originKey
        ? { ...selection.origins, [originKey]: "owner" }
        : selection.origins,
    });
  const selectedValue = suggestions.findIndex((item) =>
    sameText(item, current),
  );
  const [manualDraft, setManualDraft] = useState<string | null>(null);
  const shownManual =
    manualDraft ??
    (selection.categoryKind === "manual" ? selection.category : "");
  const manualForm = (
    <div className={`${controls.manual} grid gap-3`}>
      <label className="grid gap-2 type-label">
        Kategori
        <Input
          value={shownManual}
          maxLength={200}
          autoComplete="off"
          onChange={(event) => {
            const value = event.target.value;
            setManualDraft(value);
            update({ category: value, categoryKind: "manual" }, "category");
          }}
        />
      </label>
      <p className={`${controls.hint} type-copy-sm m-0`}>
        Tulis sebutan yang dikenal pelanggan Anda.
      </p>
    </div>
  );
  const hasCards = Boolean(suggestions.length || mainDistinct);
  return (
    <section className="grid gap-5" data-intake-screen="category">
      <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
        {selection.focus === "cabang"
          ? "Lokasi ini biasanya disebut apa?"
          : selection.focus === "produk"
            ? "Produk atau layanan ini biasanya disebut apa?"
            : "Bisnis Anda biasanya disebut apa?"}
      </h1>
      <p className="type-copy-sm text-muted-foreground">
        Pilih sebutan yang mungkin dipakai pelanggan saat bertanya ke AI.
      </p>
      {hasCards ? (
        <div className={`${controls.choices} ${controls.dynamicChoices}`}>
          <SelectionGroup
            label="Pilihan kategori"
            value={
              selectedValue >= 0
                ? `sug-${selectedValue}`
                : mainDistinct && sameText(mainDistinct, current)
                  ? "main"
                  : currentUnmatched
                    ? "current"
                    : ""
            }
            onValueChange={(next) => {
              setManualDraft(null);
              if (next.startsWith("sug-")) {
                const picked = suggestions[Number(next.slice(4))];
                if (picked)
                  update(
                    { category: picked, categoryKind: "suggestion" },
                    "category",
                  );
              } else if (next === "main" && mainDistinct) {
                update(
                  { category: mainDistinct, categoryKind: "main" },
                  "category",
                );
              }
            }}
          >
            {suggestions.map((item, index) => (
              <SelectionCard
                key={`sug-${index}`}
                value={`sug-${index}`}
                title={item}
                meta={
                  ORIGIN_TEXT[
                    sameText(item, current)
                      ? (selection.origins.category ?? "owner")
                      : "nuave"
                  ]
                }
              />
            ))}
            {mainDistinct ? (
              <SelectionCard
                value="main"
                title={mainDistinct}
                meta={
                  ORIGIN_TEXT[
                    sameText(mainDistinct, current)
                      ? (selection.origins.category ?? "owner")
                      : prepared.category.origin
                  ]
                }
              />
            ) : null}
            {currentUnmatched ? (
              <SelectionCard
                value="current"
                title={current}
                meta={ORIGIN_TEXT[selection.origins.category ?? "owner"]}
              />
            ) : null}
          </SelectionGroup>
        </div>
      ) : null}
      {hasCards ? (
        <Reveal
          trigger="Tulis kategori sendiri"
          defaultOpen={selection.categoryKind === "manual"}
        >
          {manualForm}
        </Reveal>
      ) : (
        manualForm
      )}
      {!smartCategoryReady(selection) ? (
        <p role="status" className="type-copy-sm m-0 text-muted-foreground">
          Pilih atau tulis satu kategori.
        </p>
      ) : null}
      <ScreenError error={error} />
    </section>
  );
}

/**
 * R-14: the offerings the audit covers. Prepared items sit in a
 * `Dari website Anda` chip group; owner additions form a `Dari Anda` group.
 * Under a product focus the audited product is already the frozen offering,
 * so the catalogue is read-only context instead of a control.
 */
export function SmartOfferingsScreen({
  prepared,
  selection,
  onChange,
  headingRef,
  error,
}: ScreenProps) {
  const proposed = prepared.offerings.proposed ?? [];
  const ownerAdded = selection.offerings.filter(
    (item) => !proposed.some((row) => sameText(row, item)),
  );
  const update = (patch: Partial<SmartSelection>, originKey?: string) =>
    onChange({
      ...selection,
      ...patch,
      origins: originKey
        ? { ...selection.origins, [originKey]: "owner" }
        : selection.origins,
    });
  const toggle = (item: string, on: boolean) =>
    update(
      {
        offerings: on
          ? [...selection.offerings, item]
          : selection.offerings.filter((row) => row !== item),
      },
      "offerings",
    );
  const add = (value: string) => {
    const match = [...proposed, ...ownerAdded].find((item) =>
      sameText(item, value),
    );
    if (match) {
      if (!selection.offerings.includes(match)) toggle(match, true);
      return;
    }
    update({ offerings: [...selection.offerings, value] }, "offerings");
  };
  if (selection.focus === "produk") {
    const catalogue = proposed.includes(selection.productTarget)
      ? proposed
      : [...proposed, selection.productTarget].filter(Boolean);
    return (
      <section className="grid gap-5" data-intake-screen="offerings">
        <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
          Apa saja yang Anda tawarkan?
        </h1>
        <p className="type-copy-sm text-muted-foreground">
          Audit ini berfokus pada {selection.productTarget || "satu penawaran"}.
          Penawaran lain dari website Anda tetap tercatat sebagai konteks dan
          tidak ikut diaudit.
        </p>
        <ul
          className="m-0 grid list-none gap-2 p-0"
          aria-label="Katalog penawaran"
        >
          {catalogue.map((item) => (
            <li
              key={item}
              className="flex flex-wrap items-baseline gap-2 type-copy"
            >
              {item}
              {item === selection.productTarget ? (
                <span className="type-copy-sm text-muted-foreground">
                  · Fokus audit
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        <p className={`${controls.hint} type-copy-sm m-0`}>
          {ORIGIN_TEXT[selection.origins.offerings ?? "website"]}
        </p>
        <ScreenError error={error} />
      </section>
    );
  }
  return (
    <section className="grid gap-5" data-intake-screen="offerings">
      <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
        {proposed.length
          ? "Apakah ini yang Anda tawarkan?"
          : "Apa saja yang Anda tawarkan?"}
      </h1>
      <p className="type-copy-sm text-muted-foreground">
        {proposed.length
          ? "Nuave sudah memilih yang ditemukan. Hapus yang salah, tambah yang kurang."
          : "Tambahkan produk atau layanan utama yang pelanggan cari."}
      </p>
      {proposed.length ? (
        <div className="grid gap-2">
          <h2 className="type-label m-0">{ORIGIN_TEXT.website}</h2>
          <ChipGroup label={ORIGIN_TEXT.website}>
            {proposed.map((item) => (
              <Chip
                key={item}
                label={item}
                selected={selection.offerings.includes(item)}
                selectedIndicator="check"
                onToggle={(on) => toggle(item, on)}
              />
            ))}
          </ChipGroup>
        </div>
      ) : null}
      {ownerAdded.length ? (
        <div className="grid gap-2">
          <h2 className="type-label m-0">{ORIGIN_TEXT.owner}</h2>
          <ChipGroup label={ORIGIN_TEXT.owner}>
            {ownerAdded.map((item) => (
              <Chip
                key={item}
                label={item}
                selected
                selectedIndicator="remove"
                onToggle={(on) => toggle(item, on)}
              />
            ))}
          </ChipGroup>
        </div>
      ) : null}
      <div className={`${controls.manual} grid gap-3`}>
        <AddLine
          inputLabel="Penawaran lain"
          placeholder="Tambah yang belum ada"
          buttonLabel="Tambahkan"
          onCommit={add}
        />
      </div>
      {!selection.offerings.length ? (
        <p role="status" className="type-copy-sm m-0 text-muted-foreground">
          Pilih atau tambah setidaknya satu produk atau layanan.
        </p>
      ) : null}
      <ScreenError error={error} />
    </section>
  );
}

const serviceChannels = [
  {
    value: "on_premise",
    title: "Di lokasi bisnis Anda",
    description: "Pelanggan datang untuk membeli atau menggunakan layanan.",
    icon: IconBuildingStore,
  },
  {
    value: "on_customer",
    title: "Di lokasi pelanggan",
    description: "Anda mendatangi pelanggan untuk memberikan layanan.",
    icon: IconHome,
  },
  {
    value: "delivery",
    title: "Dikirim ke pelanggan",
    description: "Produk dikirim tanpa pelanggan datang ke lokasi Anda.",
    icon: IconTruckDelivery,
  },
  {
    value: "online",
    title: "Digunakan secara online",
    description: "Layanan digunakan dari jarak jauh melalui internet.",
    icon: IconWorld,
  },
] as const;

/**
 * R-15: the fixed service-channel choices as multi-select cards; at least
 * one is required before Lanjut. A prepared pick notes `Dari website Anda`
 * once so a prepared set is never read as the owner's own confirmation.
 */
export function SmartServiceScreen({
  selection,
  onChange,
  headingRef,
  error,
}: ScreenProps) {
  const toggle = (
    channel: (typeof serviceChannels)[number]["value"],
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
    <section className="grid gap-5" data-intake-screen="service">
      <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
        Bagaimana pelanggan mendapatkan yang Anda tawarkan?
      </h1>
      <p className="type-copy-sm text-muted-foreground">
        Pilih semua cara yang berlaku. Ini membantu Nuave memahami di mana
        pengalaman pelanggan terjadi.
      </p>
      {selection.origins.serviceChannels === "website" &&
      selection.serviceChannels.length ? (
        <p className={`${controls.hint} type-copy-sm m-0`}>
          Pilihan awal disiapkan dari website Anda.
        </p>
      ) : null}
      <div
        className={controls.checkboxList}
        role="group"
        aria-label="Cara pelanggan mendapatkan yang Anda tawarkan"
      >
        {serviceChannels.map(({ value, title, description, icon: Icon }) => (
          <label
            key={value}
            className={controls.checkboxCard}
            data-selected={selection.serviceChannels.includes(value)}
          >
            <Icon
              className={controls.choiceIcon}
              size={32}
              stroke={1.5}
              aria-hidden="true"
            />
            <span className={controls.choiceBody}>
              <span className="type-heading-sm">{title}</span>
              <span className={`${controls.hint} type-copy`}>
                {description}
              </span>
            </span>
            <Checkbox
              className={controls.checkbox}
              checked={selection.serviceChannels.includes(value)}
              onCheckedChange={(checked) => toggle(value, checked === true)}
            />
          </label>
        ))}
      </div>
      {!selection.serviceChannels.length ? (
        <p role="status" className="type-copy-sm m-0 text-muted-foreground">
          Pilih setidaknya satu cara layanan.
        </p>
      ) : null}
      <ScreenError error={error} />
    </section>
  );
}

const reachOptions = [
  {
    value: "sekitar",
    title: "Sekitar satu area",
    description: "Pelanggan terutama datang dari satu kota atau area.",
    icon: IconMapPin,
  },
  {
    value: "beberapa",
    title: "Beberapa area",
    description: "Pelanggan berasal dari beberapa kota atau area tertentu.",
    icon: IconMapPins,
  },
  {
    value: "seluruh",
    title: "Seluruh Indonesia",
    description: "Produk atau layanan tersedia secara nasional.",
    icon: IconMap,
  },
  {
    value: "luar",
    title: "Indonesia dan luar negeri",
    description: "Pelanggan juga berada di negara lain.",
    icon: IconWorld,
  },
] as const;

const AREA_CAP = 8;

/**
 * R-16: the market the audit claims. `sekitar` keeps exactly one area,
 * `beberapa` keeps one to eight, and `seluruh`/`luar` keep none. A ninth
 * area — typed or toggled — is refused with a visible block, never silently
 * dropped. This screen is never reached under a location focus.
 */
export function SmartMarketScreen({
  prepared,
  selection,
  onChange,
  headingRef,
  error,
}: ScreenProps) {
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
  const blocked = () =>
    setAreaBlock(
      "Area layanan dibatasi paling banyak 8. Hapus satu untuk menambah yang lain.",
    );
  const toggleArea = (area: string, on: boolean) => {
    if (on && selection.marketAreas.some((item) => sameText(item, area))) {
      setAreaBlock(null);
      return;
    }
    if (selection.marketReach === "sekitar") {
      setAreas(on ? [area] : []);
      setAreaBlock(null);
      return;
    }
    if (on) {
      if (selection.marketAreas.length >= AREA_CAP) {
        blocked();
        return;
      }
      setAreas([...selection.marketAreas, area]);
    } else {
      setAreas(selection.marketAreas.filter((item) => item !== area));
    }
    setAreaBlock(null);
  };
  const addArea = (value: string) => {
    const match = [...proposed, ...ownerAdded].find((item) =>
      sameText(item, value),
    );
    if (match) {
      toggleArea(match, true);
      return;
    }
    if (
      selection.marketReach === "beberapa" &&
      selection.marketAreas.length >= AREA_CAP
    ) {
      blocked();
      return;
    }
    setAreas(
      selection.marketReach === "sekitar"
        ? [value]
        : [...selection.marketAreas, value],
    );
    setAreaBlock(null);
  };
  return (
    <section className="grid gap-5" data-intake-screen="market">
      <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
        Di mana pelanggan Anda berada?
      </h1>
      <p className="type-copy-sm text-muted-foreground">
        Pilih jangkauan utama untuk audit ini.
      </p>
      {selection.origins.market === "website" && selection.marketReach ? (
        <p className={`${controls.hint} type-copy-sm m-0`}>
          Pilihan awal disiapkan dari website Anda.
        </p>
      ) : null}
      <div className={controls.choices}>
        <SelectionGroup
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
          {reachOptions.map(({ value, title, description, icon: Icon }) => (
            <SelectionCard
              key={value}
              value={value}
              title={title}
              description={description}
              icon={<Icon stroke={1.5} />}
            />
          ))}
        </SelectionGroup>
      </div>
      <Reveal open={areaBased}>
        <div className={controls.areaPanel}>
          <h2 className="type-heading-sm m-0">
            {selection.marketReach === "sekitar"
              ? "Pilih satu kota atau area"
              : "Pilih semua kota atau area"}
          </h2>
          <ChipGroup label="Kota atau area">
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
                selectedIndicator="remove"
                onToggle={(on) => toggleArea(area, on)}
              />
            ))}
          </ChipGroup>
          <div className={`${controls.manual} m-0`}>
            <AddLine
              inputLabel="Tambah area lain"
              placeholder="Tambah area lain"
              buttonLabel="Tambahkan"
              onCommit={addArea}
            />
          </div>
          {areaBlock ? (
            <p role="alert" className="type-copy-sm m-0 text-destructive">
              {areaBlock}
            </p>
          ) : null}
        </div>
      </Reveal>
      {selection.marketReach && selection.marketAreas.length > AREA_CAP ? (
        <p role="alert" className="type-copy-sm m-0 text-destructive">
          Pilih paling banyak 8 area layanan.
        </p>
      ) : null}
      {areaBased &&
      (selection.marketReach === "sekitar"
        ? selection.marketAreas.length !== 1
        : !selection.marketAreas.length) ? (
        <p role="status" className="type-copy-sm m-0 text-muted-foreground">
          {selection.marketReach === "sekitar"
            ? "Pilih satu kota atau area."
            : "Pilih setidaknya satu kota atau area."}
        </p>
      ) : null}
      {!selection.marketReach ? (
        <p role="status" className="type-copy-sm m-0 text-muted-foreground">
          Pilih jangkauan utama untuk melanjutkan.
        </p>
      ) : null}
      <ScreenError error={error} />
    </section>
  );
}
