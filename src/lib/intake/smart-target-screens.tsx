"use client";

import type { RefObject } from "react";
import {
  IconBuildingStore,
  IconMapPin,
  IconPackage,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SelectionCard,
  SelectionGroup,
} from "@/components/product/selection/SelectionCard";
import { Reveal } from "@/components/product/selection/Reveal";
import {
  selectSmartFocus,
  smartLocationReady,
  smartProductReady,
  usablePublishedLocations,
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

function ScreenError({ error }: { error?: string | null }) {
  return error ? (
    <p role="alert" className="type-copy text-destructive">
      {error}
    </p>
  ) : null;
}

const focusChoices = [
  {
    value: "brand",
    title: "Brand secara keseluruhan",
    description: "Semua lokasi, produk, dan layanan sebagai satu kesatuan.",
    icon: IconBuildingStore,
  },
  {
    value: "cabang",
    title: "Satu lokasi",
    description: "Satu gerai atau cabang tertentu.",
    icon: IconMapPin,
  },
  {
    value: "produk",
    title: "Satu produk atau layanan",
    description: "Satu produk, layanan, atau lini tertentu.",
    icon: IconPackage,
  },
] as const;

/**
 * R-10: the audit's point of view. `Brand secara keseluruhan` carries the
 * `Saran Nuave` label because whole-brand is Nuave's prepared proposal; the
 * combined focus row on the summary switches to `Dari Anda` once the owner
 * changes it. `Satu lokasi` is offered as a card only while the business's
 * own source publishes at least one location — otherwise a secondary link
 * opens the manual location screen instead.
 */
export function SmartFocusScreen({
  prepared,
  selection,
  onChange,
  onEnterLocationManually,
  headingRef,
  error,
}: ScreenProps & { onEnterLocationManually: () => void }) {
  const locations = usablePublishedLocations(prepared);
  return (
    <section className="grid gap-5" data-intake-screen="focus">
      <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
        Apa yang ingin Anda audit?
      </h1>
      <p className="type-copy-sm text-muted-foreground">
        Ini menentukan sudut pandang seluruh audit.
      </p>
      <div className={controls.choices}>
        <SelectionGroup
          label="Fokus audit"
          value={selection.focus}
          onValueChange={(next) =>
            onChange(
              selectSmartFocus(selection, next as SmartSelection["focus"]),
            )
          }
        >
          {focusChoices
            .filter((choice) => choice.value !== "cabang" || locations.length)
            .map(({ value, title, description, icon: Icon }) => (
              <SelectionCard
                key={value}
                value={value}
                title={title}
                description={description}
                meta={value === "brand" ? "Saran Nuave" : undefined}
                icon={<Icon stroke={1.5} />}
              />
            ))}
        </SelectionGroup>
      </div>
      {!locations.length ? (
        <div>
          <Button
            variant="link"
            className="w-fit"
            onClick={onEnterLocationManually}
          >
            Isi lokasi secara manual
          </Button>
        </div>
      ) : null}
      <ScreenError error={error} />
    </section>
  );
}

/**
 * R-11: one location the business itself publishes, or a manual name +
 * address. Published rows carry `Dari website Anda` — `prepared.locations`
 * is already host-screened, and `usablePublishedLocations` re-checks a
 * restored session before any label is shown. A typed answer renders as its
 * own `Dari Anda` row once both fields are filled, so a half-written name
 * never looks like a committed pick.
 */
export function SmartLocationScreen({
  prepared,
  selection,
  onChange,
  headingRef,
  error,
}: ScreenProps) {
  const locations = usablePublishedLocations(prepared);
  const selectedIndex = locations.findIndex(
    (item) =>
      item.name === selection.locationName &&
      item.address === selection.locationAddress,
  );
  // Typed content that matches no published row is the owner's own answer.
  const manualActive =
    Boolean(
      selection.locationName.trim() || selection.locationAddress.trim(),
    ) && selectedIndex < 0;
  const manualReady = manualActive && smartLocationReady(selection);
  const updateTarget = (patch: Partial<SmartSelection>) =>
    onChange({
      ...selection,
      ...patch,
      origins: { ...selection.origins, focus: "owner" },
    });
  const manualForm = (
    <div className={`${controls.manual} grid gap-3`}>
      <label className="grid gap-2 type-label">
        Nama lokasi
        <Input
          value={selection.locationName}
          maxLength={300}
          autoComplete="off"
          onChange={(event) =>
            updateTarget({ locationName: event.target.value })
          }
        />
      </label>
      <label className="grid gap-2 type-label">
        Alamat atau area
        <Input
          value={selection.locationAddress}
          maxLength={500}
          autoComplete="off"
          placeholder="Jalan, nomor, dan kota atau area"
          onChange={(event) =>
            updateTarget({ locationAddress: event.target.value })
          }
        />
      </label>
      <p className={`${controls.hint} type-copy-sm m-0`}>
        Nama lokasi dan alamat membantu membedakan antar lokasi.
      </p>
    </div>
  );
  return (
    <section className="grid gap-5" data-intake-screen="location">
      <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
        Lokasi mana yang ingin Anda audit?
      </h1>
      {locations.length ? (
        <div className={`${controls.choices} ${controls.dynamicChoices}`}>
          <SelectionGroup
            label="Pilih satu lokasi"
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
              <SelectionCard
                key={`${item.name}::${item.address}`}
                value={`loc-${index}`}
                title={item.name}
                description={item.address}
                meta="Dari website Anda"
              />
            ))}
            {manualReady ? (
              <SelectionCard
                value="manual"
                title={selection.locationName}
                description={selection.locationAddress}
                meta="Dari Anda"
              />
            ) : null}
          </SelectionGroup>
        </div>
      ) : null}
      {locations.length ? (
        <Reveal trigger="Tambah lokasi lain" defaultOpen={manualActive}>
          {manualForm}
        </Reveal>
      ) : (
        manualForm
      )}
      {!smartLocationReady(selection) ? (
        <p role="status" className="type-copy-sm m-0 text-muted-foreground">
          Pilih satu lokasi, atau lengkapi nama dan alamatnya.
        </p>
      ) : null}
      <ScreenError error={error} />
    </section>
  );
}

/**
 * R-12: one prepared offering, or a typed name. Offering rows carry
 * `Dari website Anda`; a typed target renders as its own `Dari Anda` row.
 */
export function SmartProductScreen({
  prepared,
  selection,
  onChange,
  headingRef,
  error,
}: ScreenProps) {
  const offerings = prepared.offerings.proposed ?? [];
  const selectedIndex = offerings.findIndex(
    (item) => item === selection.productTarget,
  );
  const manualActive =
    Boolean(selection.productTarget.trim()) && selectedIndex < 0;
  const updateTarget = (patch: Partial<SmartSelection>) =>
    onChange({
      ...selection,
      ...patch,
      origins: { ...selection.origins, focus: "owner" },
    });
  const manualForm = (
    <div className={`${controls.manual} grid gap-3`}>
      <label className="grid gap-2 type-label">
        Nama produk atau layanan
        <Input
          value={selection.productTarget}
          maxLength={300}
          autoComplete="off"
          onChange={(event) =>
            updateTarget({ productTarget: event.target.value })
          }
        />
      </label>
      <p className={`${controls.hint} type-copy-sm m-0`}>
        Pertanyaan pelanggan dan pembanding akan difokuskan ke penawaran ini.
      </p>
    </div>
  );
  return (
    <section className="grid gap-5" data-intake-screen="product">
      <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
        Produk atau layanan mana yang ingin Anda audit?
      </h1>
      {offerings.length ? (
        <div className={`${controls.choices} ${controls.dynamicChoices}`}>
          <SelectionGroup
            label="Pilih satu produk atau layanan"
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
              <SelectionCard
                key={offering}
                value={`off-${index}`}
                title={offering}
                meta="Dari website Anda"
              />
            ))}
            {manualActive ? (
              <SelectionCard
                value="manual"
                title={selection.productTarget}
                meta="Dari Anda"
              />
            ) : null}
          </SelectionGroup>
        </div>
      ) : null}
      {offerings.length ? (
        <Reveal
          trigger="Tambah produk atau layanan lain"
          defaultOpen={manualActive}
        >
          {manualForm}
        </Reveal>
      ) : (
        manualForm
      )}
      {!smartProductReady(selection) ? (
        <p role="status" className="type-copy-sm m-0 text-muted-foreground">
          Pilih atau tulis satu produk atau layanan.
        </p>
      ) : null}
      <ScreenError error={error} />
    </section>
  );
}
