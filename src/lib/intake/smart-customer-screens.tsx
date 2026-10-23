"use client";

import { useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Collapsible } from "@base-ui/react";
import { IconBulb, IconChevronDown, IconQuote } from "@tabler/icons-react";
import { SPRING_SETTLE } from "@/components/motion/presets";
import { useMotionAllowed } from "@/components/motion/useMotionAllowed";
import { Chip, ChipGroup } from "@/components/product/selection/Chip";
import { CheckList, CheckRow } from "@/components/product/selection/CheckRow";
import { FloatingTextarea } from "@/components/product/journey/FloatingField";
import { KeyboardAccessory } from "@/components/product/journey/KeyboardAccessory";
import selectionStyles from "@/components/product/selection/selection.module.css";
import {
  smartComparatorsReady,
  type PreparedUnderstanding,
  type SmartSelection,
} from "./smart-intake-contract";
import { ChipAdder, splitList } from "./ChipAdder";
import { OriginNote, OriginTag, ScreenError, sameText } from "./intake-bits";
import { ScreenHeader, initialsOf } from "./step-one-screens";
import type { FieldsProps } from "./smart-detail-screens";

type ScreenProps = {
  prepared: PreparedUnderstanding;
  selection: SmartSelection;
  /** Persists a new selection; false when the journey refused it (for
   * example sensitive text, which never reaches storage). */
  onChange: (next: SmartSelection) => boolean | void;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  error?: string | null;
  /** A field's own refusal (a limit) for that same message slot. */
  onRefuse?: (message: string) => void;
};

/** The audit context's limits for the optional lists (12 of 300 chars). */
const LIST_CAP = 12;
const ITEM_MAX = 300;
const TARGET_CUSTOMER_MAX = 500;
const COMPARATOR_CAP = 5;
const COMPARATOR_MAX = 160;
const DIFFERENTIATOR_MAX = 1000;
const PUBLIC_FACT_MAX = 500;

/**
 * Items the owner added stay on screen, unticked, after being switched off,
 * so a mis-tap is one tap to undo. They are forgotten when the screen closes.
 */
function useKeptItems(current: string[]) {
  const [kept, setKept] = useState<string[]>(current);
  const items = [
    ...kept,
    ...current.filter((item) => !kept.some((row) => sameText(row, item))),
  ];
  const keep = (added: string[]) =>
    setKept((previous) => [
      ...previous,
      ...added.filter((item) => !previous.some((row) => sameText(row, item))),
    ]);
  return [items, keep] as const;
}

/**
 * A field's own refusal: in the screen's message slot when it has one (so a
 * new message replaces the last), else under the field.
 */
function useRefusal(onRefuse?: (message: string) => void) {
  const [problem, setProblem] = useState<string | null>(null);
  return {
    problem,
    refuse: (message: string) =>
      onRefuse ? onRefuse(message) : setProblem(message),
    clear: () => setProblem(null),
  };
}

/**
 * Tick and add for an optional chip list, within the context's limits. A
 * refused add keeps the typed text for correction.
 */
function useChipList({
  selected,
  write,
  cap,
  max,
  capMessage,
  maxMessage,
  fits,
  fitMessage = "",
  onRefuse,
}: {
  selected: string[];
  write: (next: string[]) => boolean | void;
  cap: number;
  max: number;
  capMessage: string;
  maxMessage: string;
  /** A limit on the whole list (the joined target-customer text). */
  fits?: (next: string[]) => boolean;
  fitMessage?: string;
  onRefuse?: (message: string) => void;
}) {
  const { problem, refuse, clear } = useRefusal(onRefuse);
  const refusal = (next: string[], item: string) =>
    item.length > max
      ? maxMessage
      : next.length > cap
        ? capMessage
        : fits && !fits(next)
          ? fitMessage
          : null;
  // A change the screen refused shows the screen's own message instead.
  const apply = (next: string[]) => {
    clear();
    return write(next) !== false;
  };
  const toggle = (item: string, on: boolean): boolean => {
    if (!on) return apply(selected.filter((row) => !sameText(row, item)));
    if (selected.some((row) => sameText(row, item))) return true;
    const next = [...selected, item];
    const why = refusal(next, item);
    if (why) {
      refuse(why);
      return false;
    }
    return apply(next);
  };
  /** Typed items; one that matches a chip on screen switches that chip on. */
  const add = (items: string[], known: string[]): boolean => {
    let next = [...selected];
    for (const value of items) {
      const item = known.find((row) => sameText(row, value)) ?? value;
      if (next.some((row) => sameText(row, item))) continue;
      const why = refusal([...next, item], item);
      if (why) {
        refuse(why);
        return false;
      }
      next = [...next, item];
    }
    return apply(next);
  };
  return { problem, toggle, add };
}

/** Typed items that are not already a chip on screen. */
function newItems(items: string[], chips: string[]): string[] {
  return items.filter((value) => !chips.some((row) => sameText(row, value)));
}

function Problem({ text }: { text: string | null }) {
  return text ? (
    <p role="alert" className="type-copy-sm m-0 text-error">
      {text}
    </p>
  ) : null;
}

/* ──────────────────────────── J16 · who searches ──────────────────────────── */

/** Common customer types offered as one-tap chips next to the website's. */
const CUSTOMER_TYPES = [
  "orang tua dengan anak",
  "remaja",
  "mahasiswa",
  "pekerja kantoran",
  "ibu hamil",
  "keluarga",
  "lansia",
  "calon pengantin",
];

const LEADING_JOINER = /^(dan|serta|atau)\s+/i;

/**
 * The stored text "Mahasiswa, pekerja kantoran, dan keluarga" as chips:
 * split on commas, without the joining "dan".
 */
export function customerParts(value: string): string[] {
  return splitList(
    splitList(value)
      .map((part) => part.replace(LEADING_JOINER, "").trim())
      .join("\n"),
  );
}

export function CustomerFields({
  prepared,
  selection,
  onChange,
  onRefuse,
}: FieldsProps) {
  const proposed = customerParts(prepared.targetCustomer.proposed ?? "");
  const selected = customerParts(selection.targetCustomer);
  const generic = CUSTOMER_TYPES.filter(
    (item) => !proposed.some((row) => sameText(row, item)),
  );
  const [ownerAdded, keep] = useKeptItems(
    selected.filter(
      (item) => ![...proposed, ...generic].some((row) => sameText(row, item)),
    ),
  );
  const list = useChipList({
    selected,
    write: (next) =>
      onChange({
        ...selection,
        targetCustomer: next.join(", "),
        origins: { ...selection.origins, targetCustomer: "owner" },
      }),
    cap: LIST_CAP,
    max: ITEM_MAX,
    capMessage: "Pilih paling banyak 12 jenis pasien.",
    maxMessage: "Setiap jenis pasien paling panjang 300 karakter.",
    // Stored as one phrase, which has its own 500-character limit.
    fits: (next) => next.join(", ").length <= TARGET_CUSTOMER_MAX,
    fitMessage:
      "Daftar pasien paling panjang 500 karakter. Lepas satu untuk menambah yang lain.",
    onRefuse,
  });
  const chips = [...proposed, ...ownerAdded, ...generic];
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start gap-2.5">
        <ChipGroup label="Jenis pasien">
          {chips.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={selected.some((row) => sameText(row, item))}
              selectedIndicator="check"
              onToggle={(on) => list.toggle(item, on)}
            />
          ))}
        </ChipGroup>
        <ChipAdder
          addLabel="Tambah lainnya"
          fieldLabel="Pasien lain"
          placeholder="Contoh: atlet, ekspatriat"
          maxLength={ITEM_MAX}
          onAdd={(items) => {
            const ok = list.add(items, chips);
            if (ok) keep(newItems(items, chips));
            return ok;
          }}
        />
      </div>
      <Problem text={list.problem} />
    </div>
  );
}

/**
 * Optional, J16: who usually looks for the business. The website's answer
 * is ticked already; common customer types are one tap away and anything
 * else can be typed. Saved as one comma-separated phrase.
 */
export function SmartTargetCustomerScreen({
  prepared,
  selection,
  onChange,
  headingRef,
  error,
  onRefuse,
}: ScreenProps) {
  const fromNuave =
    selection.origins.targetCustomer !== "owner" &&
    Boolean(selection.targetCustomer.trim());
  return (
    <section className="grid" data-intake-screen="target-customer">
      <ScreenHeader
        headingRef={headingRef}
        title="Siapa yang biasanya mencari klinik Anda?"
        lead="Pilih semua yang cocok."
      />
      <div className="mt-6">
        <CustomerFields
          prepared={prepared}
          selection={selection}
          onChange={onChange}
          onRefuse={onRefuse}
        />
      </div>
      {fromNuave ? (
        <OriginNote className="mt-5" origin="nuave" text="dari website Anda" />
      ) : null}
      <ScreenError error={error} />
    </section>
  );
}

/* ─────────────────────── J17 · what they look for ─────────────────────── */

/** Reasons people compare businesses of almost any kind. */
const COMPARISON_REASONS = [
  "biaya",
  "lokasi",
  "dokter",
  "metode perawatan",
  "ulasan",
  "jam buka",
  "BPJS atau asuransi",
  "waktu tunggu",
];

function NeedsList({ prepared, selection, onChange, onRefuse }: FieldsProps) {
  const proposed = prepared.customerNeeds.proposed ?? [];
  const selected = selection.customerNeeds;
  const [ownerAdded, keep] = useKeptItems(
    selected.filter((item) => !proposed.some((row) => sameText(row, item))),
  );
  const list = useChipList({
    selected,
    write: (next) =>
      onChange({
        ...selection,
        customerNeeds: next,
        origins: { ...selection.origins, customerNeeds: "owner" },
      }),
    cap: LIST_CAP,
    max: ITEM_MAX,
    capMessage:
      "Pilih paling banyak 12 kebutuhan. Lepas satu untuk menambah yang lain.",
    maxMessage: "Setiap kebutuhan paling panjang 300 karakter.",
    onRefuse,
  });
  const chips = [...proposed, ...ownerAdded];
  return (
    <div className="grid gap-3">
      <h2 id="needs-heading" className="type-title m-0 text-ink-900">
        Mereka butuh…
      </h2>
      <div className="flex flex-wrap items-start gap-2.5">
        {chips.length ? (
          <ChipGroup labelId="needs-heading">
            {chips.map((item) => (
              <Chip
                key={item}
                label={item}
                selected={selected.some((row) => sameText(row, item))}
                selectedIndicator="check"
                onToggle={(on) => list.toggle(item, on)}
              />
            ))}
          </ChipGroup>
        ) : null}
        <ChipAdder
          addLabel="Lainnya"
          addContext="kebutuhan"
          fieldLabel="Kebutuhan pasien lain"
          placeholder="Contoh: periksa tanpa antre lama"
          maxLength={ITEM_MAX}
          onAdd={(items) => {
            const ok = list.add(items, chips);
            if (ok) keep(newItems(items, chips));
            return ok;
          }}
        />
      </div>
      <Problem text={list.problem} />
    </div>
  );
}

function ReasonsList({ prepared, selection, onChange, onRefuse }: FieldsProps) {
  const proposed = prepared.decisionConsiderations.proposed ?? [];
  const selected = selection.decisionConsiderations;
  const generic = COMPARISON_REASONS.filter(
    (item) => !proposed.some((row) => sameText(row, item)),
  );
  const [ownerAdded, keep] = useKeptItems(
    selected.filter(
      (item) => ![...proposed, ...generic].some((row) => sameText(row, item)),
    ),
  );
  const list = useChipList({
    selected,
    write: (next) =>
      onChange({
        ...selection,
        decisionConsiderations: next,
        origins: { ...selection.origins, decisionConsiderations: "owner" },
      }),
    cap: LIST_CAP,
    max: ITEM_MAX,
    capMessage:
      "Pilih paling banyak 12 pertimbangan. Lepas satu untuk menambah yang lain.",
    maxMessage: "Setiap pertimbangan paling panjang 300 karakter.",
    onRefuse,
  });
  const chips = [...proposed, ...ownerAdded, ...generic];
  return (
    <div className="grid gap-3">
      <h2 id="reasons-heading" className="type-title m-0 text-ink-900">
        Mereka membandingkan…
      </h2>
      <div className="flex flex-wrap items-start gap-2.5">
        <ChipGroup labelId="reasons-heading">
          {chips.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={selected.some((row) => sameText(row, item))}
              selectedIndicator="check"
              onToggle={(on) => list.toggle(item, on)}
            />
          ))}
        </ChipGroup>
        <ChipAdder
          addLabel="Lainnya"
          addContext="pertimbangan"
          fieldLabel="Pertimbangan pasien lain"
          placeholder="Contoh: dokter perempuan, produk halal"
          maxLength={ITEM_MAX}
          onAdd={(items) => {
            const ok = list.add(items, chips);
            if (ok) keep(newItems(items, chips));
            return ok;
          }}
        />
      </div>
      <Problem text={list.problem} />
    </div>
  );
}

/** J17's two pickers, also used by the review's sheet (J26). */
export function NeedsFields(props: FieldsProps) {
  return (
    <div className="grid gap-[26px]">
      <NeedsList {...props} />
      <ReasonsList {...props} />
    </div>
  );
}

/**
 * Optional, J17: what customers need and what they weigh up, on one screen.
 * The website's answers are ticked already; common reasons to compare are
 * one tap away.
 */
export function SmartCustomerNeedsScreen({
  prepared,
  selection,
  onChange,
  headingRef,
  error,
  onRefuse,
}: ScreenProps) {
  return (
    <section className="grid" data-intake-screen="customer-needs">
      <ScreenHeader
        headingRef={headingRef}
        title="Apa yang mereka cari saat memilih klinik?"
        lead="Boleh dilewati."
      />
      <div className="mt-[22px]">
        <NeedsFields
          prepared={prepared}
          selection={selection}
          onChange={onChange}
          onRefuse={onRefuse}
        />
      </div>
      <ScreenError error={error} />
    </section>
  );
}

/* ──────────────────────── J20/J21 · compared with ──────────────────────── */

/** Distinct, non-blank names in their order. */
function cleanNames(names: string[]): string[] {
  return names
    .map((name) => name.trim())
    .filter(
      (name, index, all) =>
        name && all.findIndex((row) => sameText(row, name)) === index,
    );
}

export function CompetitorFields({
  prepared,
  selection,
  onChange,
  onRefuse,
  onSkip,
}: FieldsProps & {
  /** "Lewati" in the keyboard bar while nothing is ticked (J21). */
  onSkip?: () => void;
}) {
  const proposed = prepared.comparatorSuggestions.proposed ?? [];
  const names = cleanNames(selection.comparatorNames);
  const [ownerAdded, keep] = useKeptItems(
    names.filter((name) => !proposed.some((row) => sameText(row, name))),
  );
  const { problem, refuse, clear } = useRefusal(onRefuse);
  // R-18: ticking a name chooses "named"; unticking the last one keeps
  // "named" (Lanjut waits for a name or another choice) rather than quietly
  // becoming "Belum tahu". A change the screen refused shows the screen's
  // own message instead.
  const write = (next: string[]) => {
    clear();
    return (
      onChange({
        ...selection,
        comparatorNames: next,
        comparatorMode: next.length ? "named" : selection.comparatorMode,
        origins: { ...selection.origins, comparators: "owner" },
      }) !== false
    );
  };
  const full = () =>
    refuse(
      "Pilih paling banyak 5 klinik pembanding. Lepas satu untuk menambah yang lain.",
    );
  const isOn = (name: string) => names.some((row) => sameText(row, name));
  const toggle = (name: string, on: boolean) => {
    if (!on) return write(names.filter((row) => !sameText(row, name)));
    if (isOn(name)) return true;
    if (names.length >= COMPARATOR_CAP) {
      full();
      return false;
    }
    return write([...names, name]);
  };
  const rows = [...proposed, ...ownerAdded];
  const add = (items: string[]): boolean => {
    let next = [...names];
    for (const value of items) {
      const name = rows.find((row) => sameText(row, value)) ?? value;
      if (next.some((row) => sameText(row, name))) continue;
      if (name.length > COMPARATOR_MAX) {
        refuse("Nama pembanding paling panjang 160 karakter.");
        return false;
      }
      if (next.length >= COMPARATOR_CAP) {
        full();
        return false;
      }
      next = [...next, name];
    }
    const ok = write(next);
    if (ok) keep(newItems(items, rows));
    return ok;
  };
  return (
    <div className="grid gap-2.5">
      {rows.length ? (
        <CheckList label="Klinik pembanding">
          {rows.map((name) => (
            <CheckRow
              key={name}
              label={name}
              avatar={initialsOf(name)}
              tag={proposed.includes(name) ? "Saran Nuave" : "Dari Anda"}
              checked={isOn(name)}
              onCheckedChange={(on) => toggle(name, on)}
            />
          ))}
        </CheckList>
      ) : null}
      {/* A chip, not a full-width row, until it opens. */}
      <div className="flex">
        <ChipAdder
          addLabel="Tambah pembanding"
          fieldLabel="Nama atau website klinik"
          hint="Contoh: klinik di jalan yang sama, atau yang sering disebut pasien."
          maxLength={COMPARATOR_MAX}
          startOpen={!rows.length}
          onAdd={add}
          accessoryExtra={
            onSkip && !names.length ? (
              <button
                type="button"
                className="type-label-lg shrink-0 px-1 text-ink-900 underline underline-offset-4"
                onClick={onSkip}
              >
                Lewati
              </button>
            ) : undefined
          }
        />
      </div>
      <Problem text={problem} />
    </div>
  );
}

/**
 * R-07, J20/J21: businesses AI may name next to this one. Nuave's
 * suggestions arrive ticked; the owner unticks the ones they do not know
 * and adds others. With nothing found the screen opens on the typing field.
 * Skipping, or leaving everything unticked, lets the audit compare with
 * similar businesses in the category.
 */
export function SmartCompetitorsScreen({
  prepared,
  selection,
  onChange,
  headingRef,
  error,
  onRefuse,
  onSkip,
}: ScreenProps & {
  /** R-18's other two choices: "Belum tahu" or "Tidak ada pembanding
   * langsung"; either names nobody and moves on. */
  onSkip: (mode: "unknown" | "category-alternatives") => void;
}) {
  const found = Boolean(prepared.comparatorSuggestions.proposed?.length);
  const noneTicked =
    selection.comparatorMode === "named" &&
    !cleanNames(selection.comparatorNames).length;
  return (
    <section className="grid" data-intake-screen="competitors">
      <ScreenHeader
        headingRef={headingRef}
        title="Klinik mana pembanding Anda?"
        lead={
          found
            ? "AI sering menyebut klinik lain. Centang yang Anda kenal."
            : "Kami belum menemukannya di website Anda. Tulis 1 sampai 5 nama."
        }
      />
      <div className="mt-5">
        <CompetitorFields
          prepared={prepared}
          selection={selection}
          onChange={onChange}
          onRefuse={onRefuse}
          onSkip={() => onSkip("unknown")}
        />
      </div>
      {!smartComparatorsReady(selection) ? (
        <p role="status" className="type-copy-sm m-0 mt-4 text-ink-500">
          {noneTicked
            ? "Centang atau tulis satu nama, atau pilih salah satu pilihan di bawah."
            : "Periksa daftar pembanding: tanpa nama kosong atau ganda, paling banyak 5 nama."}
        </p>
      ) : null}
      <div className="mt-5 grid justify-items-start gap-1">
        <button
          type="button"
          className="type-label-strong m-0 min-h-11 text-left text-ink-900 underline underline-offset-4"
          onClick={() => onSkip("unknown")}
        >
          Belum tahu? Lewati, kami bandingkan dengan klinik sejenis.
        </button>
        <button
          type="button"
          className="type-label-strong m-0 min-h-11 text-left text-ink-900 underline underline-offset-4"
          onClick={() => onSkip("category-alternatives")}
        >
          Tidak ada pembanding langsung? Lewati juga.
        </button>
      </div>
      <ScreenError error={error} />
    </section>
  );
}

/* ─────────────────────── J22/J23 · what sets you apart ─────────────────────── */

/** Openings that help the owner start a sentence (J23's keyboard bar). */
const STARTER_PHRASES = [
  "buka sampai malam",
  "dokter spesialis",
  "menerima BPJS",
  "bisa daftar online",
  "berdiri sejak",
];

const EXAMPLES = [
  {
    text: "Dokter gigi praktik sampai jam 9 malam, daftar cukup lewat WhatsApp.",
    kind: "Klinik gigi",
  },
  {
    text: "Perawatan wajah dikerjakan langsung oleh dokter.",
    kind: "Klinik kecantikan",
  },
  {
    text: "Khitan metode klamp, bisa di rumah pasien.",
    kind: "Klinik khitan",
  },
  {
    text: "Klinik anak yang buka hari Minggu, dengan dokter spesialis anak.",
    kind: "Klinik anak",
  },
];

function capitalise(value: string): string {
  return value
    ? value.charAt(0).toLocaleUpperCase("id-ID") + value.slice(1)
    : value;
}

/**
 * Adds a starter phrase where the owner is typing: it finishes words already
 * begun ("Buka sampai" → "Buka sampai malam"), opens a new sentence after a
 * full stop, and otherwise continues the sentence after a comma.
 */
export function withPhrase(text: string, phrase: string): string {
  const trimmed = text.replace(/\s+$/, "");
  if (!trimmed) return capitalise(phrase);
  const lower = trimmed.toLocaleLowerCase("id-ID");
  const words = phrase.split(" ");
  for (let count = words.length - 1; count > 0; count -= 1) {
    const start = words.slice(0, count).join(" ");
    if (
      lower.endsWith(start) &&
      /(^|[\s,.;:])$/.test(lower.slice(0, -start.length))
    )
      return `${trimmed} ${words.slice(count).join(" ")}`;
  }
  return /[.!?]$/.test(trimmed)
    ? `${trimmed} ${capitalise(phrase)}`
    : `${trimmed}, ${phrase}`;
}

/** Other businesses' answers, to show the kind of sentence that helps. */
function Examples() {
  return (
    <section className="grid gap-2.5" aria-labelledby="examples-heading">
      <h2 id="examples-heading" className="type-title-sm m-0 text-ink-900">
        Contoh dari klinik lain
      </h2>
      <ul className="-mx-6 my-0 flex list-none snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 pb-1 [scrollbar-width:none]">
        {EXAMPLES.map((example) => (
          <li
            key={example.kind}
            className="grid w-[236px] shrink-0 snap-start content-start gap-2 rounded-tile bg-stone-50 p-4"
          >
            <IconQuote
              size={18}
              stroke={1.75}
              className="text-ink-400"
              aria-hidden="true"
            />
            <p className="type-copy m-0 text-ink-900">{example.text}</p>
            <p className="type-caption m-0 text-ink-500">{example.kind}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The folded optional fact (formerly its own screen): what AI gets wrong. */
function PublicFactFold({
  selection,
  onChange,
}: Pick<FieldsProps, "selection" | "onChange">) {
  const [defaultOpen] = useState(Boolean(selection.publicFact.trim()));
  return (
    <Collapsible.Root defaultOpen={defaultOpen}>
      <Collapsible.Trigger className="group flex min-h-14 w-full items-center gap-2 border-y border-line-200 py-4 text-left">
        <span className="type-title-sm flex-1 text-ink-900">
          Ada info yang sering salah ditulis AI?
        </span>
        <OriginTag>Opsional</OriginTag>
        <IconChevronDown
          size={18}
          stroke={1.75}
          aria-hidden="true"
          className="text-ink-600 transition-transform duration-200 group-data-[panel-open]:rotate-180"
        />
      </Collapsible.Trigger>
      <Collapsible.Panel className={selectionStyles.revealPanel}>
        <FloatingTextarea
          label="Info yang benar"
          value={selection.publicFact}
          maxLength={PUBLIC_FACT_MAX}
          placeholder="Contoh: klinik kami sudah pindah ke Jl. Merdeka No. 10."
          hint="Hanya fakta publik. Jangan tulis data pasien."
          onChange={(event) =>
            onChange({
              ...selection,
              publicFact: event.target.value,
              origins: { ...selection.origins, publicFact: "owner" },
            })
          }
        />
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

export function DifferentiatorFields({
  selection,
  onChange,
  showExamples = true,
}: FieldsProps & { showExamples?: boolean }) {
  const animate = useMotionAllowed();
  const field = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const value = selection.differentiator;
  const write = (next: string) =>
    onChange({
      ...selection,
      differentiator: next,
      origins: { ...selection.origins, differentiator: "owner" },
    });
  const fromNuave =
    selection.origins.differentiator !== "owner" && Boolean(value.trim());
  const phrases = STARTER_PHRASES.filter(
    (phrase) => !value.toLocaleLowerCase("id-ID").includes(phrase),
  ).slice(0, 3);
  return (
    <div className="grid">
      {/* The tip and the phrase bar stay while focus is anywhere inside,
          so keyboard users can reach the phrases too. */}
      <div
        className="grid"
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setFocused(false);
        }}
      >
        <FloatingTextarea
          ref={field}
          label="Pembeda klinik"
          labelHidden
          value={value}
          maxLength={DIFFERENTIATOR_MAX}
          placeholder="Contoh: dokter spesialis anak praktik setiap Sabtu"
          onChange={(event) => write(event.target.value)}
          footer={fromNuave ? <OriginTag>Saran Nuave</OriginTag> : null}
        />
        <AnimatePresence initial={false}>
          {focused ? (
            <motion.p
              key="tip"
              className="type-copy-sm m-0 flex gap-2 overflow-hidden text-ink-600"
              initial={
                animate ? { opacity: 0, height: 0, marginTop: 0 } : false
              }
              animate={{ opacity: 1, height: "auto", marginTop: 12 }}
              exit={
                animate
                  ? { opacity: 0, height: 0, marginTop: 0 }
                  : { opacity: 0 }
              }
              transition={SPRING_SETTLE}
            >
              <IconBulb
                size={18}
                stroke={1.75}
                className="mt-px shrink-0"
                aria-hidden="true"
              />
              <span>
                Contoh: “Klinik anak yang buka hari Minggu, dengan dokter
                spesialis anak.”
              </span>
            </motion.p>
          ) : null}
        </AnimatePresence>
        <KeyboardAccessory
          open={focused && phrases.length > 0}
          label="Frasa pembuka"
          className="mt-3 overflow-x-auto [scrollbar-width:none]"
        >
          {phrases.map((phrase) => (
            <button
              key={phrase}
              type="button"
              className="type-label-lg h-[38px] shrink-0 rounded-chip border border-line-300 bg-white px-4 text-ink-900 transition-transform active:scale-[0.96]"
              onClick={() => {
                write(withPhrase(value, phrase));
                field.current?.focus();
              }}
            >
              {phrase}
            </button>
          ))}
        </KeyboardAccessory>
      </div>
      {showExamples ? (
        <div className="mt-[22px]">
          <Examples />
        </div>
      ) : null}
      <div className="mt-[18px]">
        <PublicFactFold selection={selection} onChange={onChange} />
      </div>
    </div>
  );
}

/**
 * Optional, J22/J23: what sets the business apart, in a sentence or two of
 * public information. Nuave's suggestion from the website is filled in; other
 * businesses' answers show the kind of sentence that helps. The fact AI
 * often gets wrong folds in underneath instead of taking its own screen.
 */
export function SmartDifferentiatorScreen({
  prepared,
  selection,
  onChange,
  headingRef,
  error,
}: ScreenProps) {
  return (
    <section className="grid" data-intake-screen="differentiator">
      <ScreenHeader
        headingRef={headingRef}
        title="Apa yang membuat klinik Anda berbeda?"
        lead="Satu atau dua kalimat. Pakai info yang memang publik."
      />
      <div className="mt-[18px]">
        <DifferentiatorFields
          prepared={prepared}
          selection={selection}
          onChange={onChange}
        />
      </div>
      <ScreenError error={error} />
    </section>
  );
}
