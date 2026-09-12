"use client";

import { useEffect, useId, useState } from "react";
import {
  IconBuildingStore,
  IconHome,
  IconPackage,
  IconWorld,
  IconMapPin,
  IconTruckDelivery,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  SelectionCard,
  SelectionGroup,
} from "@/components/product/selection/SelectionCard";
import { Chip } from "@/components/product/selection/Chip";
import { AddLine } from "@/components/product/selection/AddLine";
import { Reveal } from "@/components/product/selection/Reveal";
import type {
  FixtureScreenState,
  IntakeFixture,
  PreparedItem,
} from "./fixtures";
import type { IntakeScreenSlot, IntakeScreenSlotProps } from "./navigation";
import type { IntakeScreenId } from "./screens";
import {
  addMultiCustom,
  addSingleCustom,
  isScreenAnswerValid,
  setBrandFixDraft,
  setCategoryAnswer,
  setCategoryCustom,
  setScopeAnswer,
  setSingleAnswer,
  toggleMultiAnswer,
  toggleServiceChannel,
  useIntakeAnswers,
} from "./state";
import styles from "./controls.module.css";

export type BabScreenProps = IntakeScreenSlotProps & {
  onValidityChange?: (valid: boolean) => void;
};

const EMPTY_SCREEN_STATE: FixtureScreenState = { prepared: [], selected: [] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPreparedItem(value: unknown): value is PreparedItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.on === "boolean"
  );
}
function isScreenState(value: unknown): value is FixtureScreenState {
  return (
    isRecord(value) &&
    Array.isArray(value.prepared) &&
    (value.prepared as unknown[]).every(isPreparedItem) &&
    Array.isArray(value.selected) &&
    (value.selected as unknown[]).every((id) => typeof id === "string")
  );
}

/** Read one screen's prepared state from the opaque slot fixture prop. */
export function readScreenState(
  fixture: unknown,
  screenId: IntakeScreenId,
): FixtureScreenState {
  if (!isRecord(fixture)) return EMPTY_SCREEN_STATE;
  const screens = (fixture as Partial<IntakeFixture>).screens;
  if (!isRecord(screens)) return EMPTY_SCREEN_STATE;
  const state: unknown = (screens as Record<string, unknown>)[screenId];
  if (!isScreenState(state)) return EMPTY_SCREEN_STATE;
  return state;
}

/* ── Pure interaction helpers (unit-tested; components delegate) ── */

/** Toggle membership of `id` in a selection list. */
export function toggleSelected(selected: string[], id: string): string[] {
  return selected.includes(id)
    ? selected.filter((entry) => entry !== id)
    : [...selected, id];
}

/** Append a deterministic custom item (never reuses a prepared id). */
export function addCustomItem(
  custom: PreparedItem[],
  label: string,
  prefix: string,
): { items: PreparedItem[]; id: string } {
  const id = `${prefix}-custom-${custom.length + 1}`;
  return { items: [...custom, { id, label, on: true }], id };
}

/** A2 single-select is valid once exactly one row is chosen. */
export function isSingleChoiceValid(selectedId: string | null): boolean {
  return selectedId !== null;
}

/** s-brand-fix blocks until the name field is non-empty (source optional). */
export function isBrandFixValid(name: string): boolean {
  return name.trim().length > 0;
}

export type OfferingsMode = "confirm" | "ask";

/**
 * s-offerings mode derives from evidence strength: confirm mode only when
 * every prepared chip arrived pre-on; any off suggestion (or none at all)
 * means ask mode. Returns the detected count for the ask-mode lead ("N").
 */
export function deriveOfferingsMode(prepared: PreparedItem[]): {
  mode: OfferingsMode;
  detectedCount: number;
} {
  const detectedCount = prepared.filter((item) => item.on).length;
  const mode: OfferingsMode =
    prepared.length > 0 && detectedCount === prepared.length
      ? "confirm"
      : "ask";
  return { mode, detectedCount };
}

/** Initial A2 selection: first fixture-selected id that is still prepared. */
export function initialSingleSelection(
  state: FixtureScreenState,
): string | null {
  const preparedIds = new Set(state.prepared.map((item) => item.id));
  return state.selected.find((id) => preparedIds.has(id)) ?? null;
}

/** Initial A3 on-set: fixture-selected ids that are still prepared. */
export function initialChipSelection(state: FixtureScreenState): string[] {
  const preparedIds = new Set(state.prepared.map((item) => item.id));
  return state.selected.filter((id) => preparedIds.has(id));
}

function useValidity(valid: boolean, nav: BabScreenProps["nav"]) {
  const publish = nav.onValidityChange;
  useEffect(() => {
    publish?.(valid);
  }, [publish, valid]);
}

function Screen({
  heading,
  children,
}: {
  heading: string;
  children?: React.ReactNode;
}) {
  const id = useId();
  return (
    <section className={styles.screen} aria-labelledby={id}>
      <h1 className="type-heading-lg" id={id}>
        {heading}
      </h1>
      {children}
    </section>
  );
}

function CrawlScreen({ fixture }: BabScreenProps) {
  const failed = /fail/i.test(readScreenState(fixture, "s-crawl").note ?? "");
  return (
    <Screen heading="Kami sedang mengenali bisnis Anda">
      {failed ? (
        <p role="alert">Kami belum berhasil membaca sumber Anda.</p>
      ) : (
        <ol aria-label="Kemajuan persiapan" role="status">
          <li>Membaca sumber Anda</li>
          <li>Mengenali produk dan lokasi</li>
          <li>Menyiapkan perkiraan pelanggan dan pesaing</li>
        </ol>
      )}
      <p className="type-copy-lg">
        Nanti Anda bisa memeriksa dan memperbaiki hasilnya.
      </p>
    </Screen>
  );
}

function BrandScreen({ fixture, nav }: BabScreenProps) {
  const state = readScreenState(fixture, "s-brand");
  const item = state.prepared[0];
  const description = (state.note ?? "").split("::").slice(1).join("::").trim();
  const initials =
    item?.label
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() ?? "?";
  useValidity(Boolean(item?.label), nav);
  return (
    <Screen heading="Kami menemukan brand ini">
      {item ? (
        <article className={styles.brandCard} aria-label="Brand yang ditemukan">
          <span
            aria-hidden="true"
            className={`${styles.brandLogo} type-heading-md`}
          >
            {initials}
          </span>
          <h2 className="type-heading-lg">{item.label}</h2>
          <p className={`${styles.brandSource} type-copy`}>{item.detail}</p>
          {description ? (
            <p className={`${styles.brandDescription} type-copy-lg`}>
              {description}
            </p>
          ) : null}
          <Button
            variant="outline"
            className={styles.brandEdit}
            onClick={() => nav.onGotoScreen?.("s-brand-fix")}
          >
            Ubah
          </Button>
        </article>
      ) : (
        <p className="type-copy-lg">
          Kartu brand muncul setelah Nuave selesai membaca sumber Anda.
        </p>
      )}
    </Screen>
  );
}

function BrandFixScreen({
  fixture,
  nav,
  answers: supplied,
  updateAnswer: update,
}: BabScreenProps) {
  const [answers, updateAnswer] = useIntakeAnswers(fixture, supplied, update);
  const draft = answers.brandFixDraft;
  useValidity(isScreenAnswerValid("s-brand-fix", answers), nav);
  return (
    <Screen heading="Perbaiki brand">
      <p className={`${styles.lead} type-copy-lg`}>
        Ubah nama atau sumber jika hasilnya belum tepat.
      </p>
      <div className={styles.fieldStack}>
        <label className={styles.field}>
          <span className="type-label">Nama brand</span>
          <Input
            value={draft.name}
            autoComplete="organization"
            required
            onChange={(e) =>
              updateAnswer((prev) =>
                setBrandFixDraft(prev, {
                  ...prev.brandFixDraft,
                  name: e.target.value,
                }),
              )
            }
          />
        </label>
        <label className={styles.field}>
          <span className="type-label">Sumber bisnis</span>
          <Input
            value={draft.source}
            autoComplete="url"
            required
            onChange={(e) =>
              updateAnswer((prev) =>
                setBrandFixDraft(prev, {
                  ...prev.brandFixDraft,
                  source: e.target.value,
                }),
              )
            }
          />
        </label>
        <p className={`${styles.hint} type-copy-sm`}>
          Gunakan tautan publik bisnis, seperti situs web atau profil bisnis.
        </p>
      </div>
    </Screen>
  );
}

const scopes = [
  {
    id: "scope-whole-brand",
    title: "Brand secara keseluruhan",
    description: "Semua lokasi, produk, dan layanan sebagai satu kesatuan.",
    icon: IconBuildingStore,
  },
  {
    id: "scope-branch",
    title: "Satu lokasi",
    description: "Satu gerai atau cabang tertentu.",
    icon: IconMapPin,
  },
  {
    id: "scope-product",
    title: "Satu produk atau layanan",
    description: "Satu produk, layanan, atau lini tertentu.",
    icon: IconPackage,
  },
];

function ScopeScreen({
  fixture,
  nav,
  answers: supplied,
  updateAnswer: update,
}: BabScreenProps) {
  const [answers, updateAnswer] = useIntakeAnswers(fixture, supplied, update);
  useValidity(isScreenAnswerValid("s-scope", answers), nav);
  return (
    <Screen heading="Apa fokus audit ini?">
      <div className={styles.choices}>
        <SelectionGroup
          label="Pilihan cakupan audit"
          value={answers.scopeOptionId ?? ""}
          onValueChange={(id) =>
            updateAnswer((prev) => setScopeAnswer(prev, id))
          }
        >
          {scopes.map(({ id, title, description, icon: Icon }) => (
            <SelectionCard
              key={id}
              value={id}
              title={title}
              description={description}
              icon={<Icon stroke={1.5} />}
            />
          ))}
        </SelectionGroup>
      </div>
    </Screen>
  );
}

function EntityScreen({
  fixture,
  nav,
  screenId,
  answers: supplied,
  updateAnswer: update,
}: BabScreenProps) {
  const [answers, updateAnswer] = useIntakeAnswers(fixture, supplied, update);
  const key = screenId === "s-product" ? "product" : "branch";
  const entity = answers[key];
  const rows = [
    ...readScreenState(fixture, screenId).prepared,
    ...entity.custom,
  ];
  const isBranch = key === "branch";
  const heading = isBranch
    ? "Lokasi mana yang ingin Anda audit?"
    : "Produk atau layanan mana yang ingin Anda audit?";
  const trigger = isBranch
    ? "Tambah lokasi lain"
    : "Tambah produk atau layanan lain";
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  useValidity(isScreenAnswerValid(screenId, answers), nav);
  const add = () => {
    if (!name.trim() || (isBranch && !address.trim())) return;
    updateAnswer((prev) =>
      addSingleCustom(prev, key, {
        id: `${key}-custom-${prev[key].custom.length + 1}`,
        label: name.trim(),
        ...(isBranch ? { detail: address.trim() } : {}),
        on: true,
      }),
    );
    setName("");
    setAddress("");
  };
  return (
    <Screen heading={heading}>
      <div className={`${styles.choices} ${styles.dynamicChoices}`}>
        <SelectionGroup
          label={heading}
          value={entity.selectedId ?? ""}
          onValueChange={(id) =>
            updateAnswer((prev) => setSingleAnswer(prev, key, id))
          }
        >
          {rows.map((item) => {
            // The imported example stores prepared entity detail after a dash.
            // Keep the full answer while presenting its name and address separately.
            const parts =
              !item.detail &&
              !entity.custom.some((entry) => entry.id === item.id)
                ? item.label.split(" — ")
                : [item.label];
            return (
              <SelectionCard
                key={item.id}
                value={item.id}
                title={parts[0]}
                description={
                  item.detail ??
                  (parts.length > 1 ? parts.slice(1).join(" — ") : undefined)
                }
              />
            );
          })}
        </SelectionGroup>
      </div>
      <Reveal trigger={trigger} defaultOpen={rows.length === 0}>
        <form
          className={styles.manual}
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <label className={styles.field}>
            <span className="type-label">
              {isBranch ? "Nama lokasi" : "Nama produk atau layanan"}
            </span>
            <Input
              placeholder={trigger}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </label>
          {isBranch ? (
            <label className={styles.field}>
              <span className="type-label">
                Alamat atau area yang membedakan lokasi
              </span>
              <Input
                placeholder="Jalan, nomor, dan kota atau area"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoComplete="off"
              />
            </label>
          ) : null}
          <p className={`${styles.hint} type-copy-sm`}>
            {isBranch
              ? "Nama lokasi dan alamat membantu membedakan antar lokasi."
              : "Pertanyaan tentang pelanggan dan pembanding selanjutnya akan difokuskan ke produk ini."}
          </p>
          <Button
            type="submit"
            variant="outline"
            disabled={!name.trim() || (isBranch && !address.trim())}
          >
            Tambah
          </Button>
        </form>
      </Reveal>
    </Screen>
  );
}

function CategoryScreen({
  fixture,
  nav,
  answers: supplied,
  updateAnswer: update,
  scopeChoice,
}: BabScreenProps) {
  const [answers, updateAnswer] = useIntakeAnswers(fixture, supplied, update);
  const scope = scopeChoice ?? answers.scope;
  const heading =
    scope === "cabang"
      ? "Lokasi ini biasanya disebut apa?"
      : scope === "produk"
        ? "Produk atau layanan ini biasanya disebut apa?"
        : "Bisnis Anda biasanya disebut apa?";
  const rows = [...readScreenState(fixture, "s-category").prepared];
  if (answers.category.customLabel)
    rows.push({
      id: "category-custom-1",
      label: answers.category.customLabel,
      on: true,
    });
  useValidity(isScreenAnswerValid("s-category", answers), nav);
  return (
    <Screen heading={heading}>
      <p className={`${styles.lead} type-copy-lg`}>
        Pilih sebutan yang mungkin dipakai pelanggan saat bertanya ke AI.
      </p>
      <div className={`${styles.choices} ${styles.dynamicChoices}`}>
        <SelectionGroup
          label="Pilihan kategori"
          value={answers.category.selectedId ?? ""}
          onValueChange={(id) =>
            updateAnswer((prev) => setCategoryAnswer(prev, id))
          }
        >
          {rows.map((item) => (
            <SelectionCard key={item.id} value={item.id} title={item.label} />
          ))}
        </SelectionGroup>
      </div>
      <Reveal trigger="Tulis kategori sendiri" defaultOpen={!rows.length}>
        <div className={styles.manual}>
          <AddLine
            inputLabel="Tulis kategori sendiri"
            placeholder="Tulis kategori sendiri"
            buttonLabel="Pakai"
            onCommit={(label) =>
              updateAnswer((prev) => setCategoryCustom(prev, label))
            }
          />
        </div>
      </Reveal>
    </Screen>
  );
}

function ChipsScreen({
  fixture,
  nav,
  screenId,
  answers: supplied,
  updateAnswer: update,
  invalidAttempts,
}: BabScreenProps) {
  const [answers, updateAnswer] = useIntakeAnswers(fixture, supplied, update);
  const key = screenId === "s-customers" ? "customers" : "offerings";
  const answer = answers[key];
  const prepared = readScreenState(fixture, screenId).prepared;
  const rows = [...prepared, ...answer.custom];
  const optional = key === "customers";
  const mode = deriveOfferingsMode(prepared);
  const heading = optional
    ? "Mengapa pelanggan mencari yang seperti ini?"
    : mode.mode === "confirm"
      ? "Apakah ini yang Anda tawarkan?"
      : "Apa saja yang Anda tawarkan?";
  const lead = optional
    ? "Pilih kebutuhan atau situasi nyata yang mendorong pelanggan mencari pilihan seperti ini. Ini membantu Nuave menyusun pertanyaan audit yang lebih relevan. Anda boleh lanjut tanpa memilih."
    : mode.mode === "confirm"
      ? "Nuave sudah memilih yang ditemukan. Hapus yang salah, tambah yang kurang."
      : "Pilih dari saran di bawah atau tambah sendiri.";
  const valid = optional || isScreenAnswerValid(screenId, answers);
  useValidity(valid, nav);
  const add = (label: string) => {
    const existing = rows.find(
      (row) => row.label.toLocaleLowerCase() === label.toLocaleLowerCase(),
    );
    updateAnswer((prev) =>
      existing
        ? prev[key].onIds.includes(existing.id)
          ? prev
          : toggleMultiAnswer(prev, key, existing.id)
        : addMultiCustom(prev, key, {
            id: `${key}-custom-${prev[key].custom.length + 1}`,
            label,
            on: true,
          }),
    );
  };
  return (
    <Screen heading={heading}>
      <p className={`${styles.lead} type-copy-lg`}>{lead}</p>
      {optional ? (
        <span className={`${styles.hint} type-label-sm`}>Opsional</span>
      ) : null}
      <div
        className={styles.chipList}
        role="group"
        aria-label={optional ? "Alasan pelanggan" : "Produk dan layanan"}
      >
        {rows.map((item) => (
          <Chip
            key={item.id}
            label={item.label}
            selected={answer.onIds.includes(item.id)}
            selectedIndicator="check"
            onToggle={() =>
              updateAnswer((prev) => toggleMultiAnswer(prev, key, item.id))
            }
          />
        ))}
      </div>
      {!valid && (invalidAttempts ?? 0) > 0 ? (
        <p role="alert" className={`${styles.error} type-copy-sm`}>
          Pilih atau tambah setidaknya satu produk atau layanan.
        </p>
      ) : null}
      <Reveal
        trigger={optional ? "Tambah alasan lain" : "Tambah yang belum ada"}
        defaultOpen={!rows.length}
      >
        <div className={styles.manual}>
          <AddLine
            inputLabel={optional ? "Alasan pelanggan" : "Produk atau layanan"}
            placeholder={
              optional ? "Tambah alasan lain" : "Tambah yang belum ada"
            }
            onCommit={add}
          />
        </div>
      </Reveal>
    </Screen>
  );
}

const channels = [
  {
    id: "service-location",
    title: "Di lokasi bisnis Anda",
    description: "Pelanggan datang untuk membeli atau menggunakan layanan.",
    icon: IconBuildingStore,
  },
  {
    id: "service-customer",
    title: "Di lokasi pelanggan",
    description: "Anda mendatangi pelanggan untuk memberikan layanan.",
    icon: IconHome,
  },
  {
    id: "service-delivery",
    title: "Dikirim ke pelanggan",
    description: "Produk dikirim tanpa pelanggan datang ke lokasi Anda.",
    icon: IconTruckDelivery,
  },
  {
    id: "service-online",
    title: "Digunakan secara online",
    description: "Layanan digunakan dari jarak jauh melalui internet.",
    icon: IconWorld,
  },
];

export function isServiceSelectionValid(ids: readonly string[]): boolean {
  return ids.length > 0;
}

function ServiceScreen({
  fixture,
  nav,
  answers: supplied,
  updateAnswer: update,
}: BabScreenProps) {
  const [answers, updateAnswer] = useIntakeAnswers(fixture, supplied, update);
  useValidity(isScreenAnswerValid("s-service", answers), nav);
  return (
    <Screen heading="Bagaimana pelanggan mendapatkan yang Anda tawarkan?">
      <p className={`${styles.lead} type-copy-lg`}>
        Pilih semua cara yang berlaku. Ini membantu Nuave memahami di mana
        pengalaman pelanggan terjadi.
      </p>
      <div
        className={styles.checkboxList}
        role="group"
        aria-label="Cara pelanggan mendapatkan yang Anda tawarkan"
      >
        {channels.map(({ id, title, description, icon: Icon }) => (
          <label
            key={id}
            className={styles.checkboxCard}
            data-selected={answers.service.onIds.includes(id)}
          >
            <Icon
              className={styles.choiceIcon}
              size={32}
              stroke={1.5}
              aria-hidden="true"
            />
            <span className={styles.choiceBody}>
              <span className="type-heading-sm">{title}</span>
              <span className={`${styles.hint} type-copy`}>{description}</span>
            </span>
            <Checkbox
              className={styles.checkbox}
              checked={answers.service.onIds.includes(id)}
              onCheckedChange={() =>
                updateAnswer((prev) => toggleServiceChannel(prev, id))
              }
            />
          </label>
        ))}
      </div>
    </Screen>
  );
}

export const BAB1_SCREENS: Partial<Record<IntakeScreenId, IntakeScreenSlot>> = {
  "s-crawl": CrawlScreen,
  "s-brand": BrandScreen,
  "s-brand-fix": BrandFixScreen,
  "s-scope": ScopeScreen,
  "s-branch": EntityScreen,
  "s-product": EntityScreen,
  "s-category": CategoryScreen,
  "s-offerings": ChipsScreen,
  "s-customers": ChipsScreen,
  "s-service": ServiceScreen,
};
