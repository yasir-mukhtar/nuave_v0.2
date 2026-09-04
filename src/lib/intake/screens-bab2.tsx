"use client";

/**
 * Bab 2-3 intake screens (Pasar dan pembanding + Sebelum audit).
 *
 * Owns: s-market, s-competitors, s-facts, s-review, s-questions.
 * Exported as `BAB2_SCREENS` for orchestrator wiring into `IntakeJourney`
 * via its `ScreenSlot` prop (whole-journey switch only, never per-screen
 * flags). The shell keeps owning the frame, the Back/Continue bar, the
 * s-review -> s-questions -> terminal transitions, and funnel E1/E2/E3/E7.
 *
 * Authority: docs/drafts/INTAKE_EXPERIENCE_CONTRACT.md ledger §2 rows for
 * these screens + §3 terminal state + closed copy deck §6 (copy strings
 * below come ONLY from that deck), and docs/drafts/INTAKE_DATA_CONTRACT.md
 * (readback = meaning, never an engine dump).
 *
 * Rules honored here:
 * - NO live calls, NO network, NO persistence beyond a tab-local draft
 *   cache (Back/resume restores in-memory state; reload-resume stays the
 *   shell/orchestrator's job).
 * - Prepared values come from the `fixture` prop (pinned fixture shape
 *   `{ screens, entry }`); the shell stub shape degrades to empty states.
 * - Tap-first: chips, cards, rows are buttons; typing lives only in
 *   add-lines, the alias inline edit, question edits, and the s-facts
 *   textarea.
 * - Validation per ledger: s-market / s-competitors / s-facts / s-review /
 *   s-questions NEVER block Continue (only brand/scope/category + the
 *   conditional entity rows block, all owned by sibling screens). s-facts
 *   is skippable by tapping Lanjut with empty text.
 * - Funnel: screens emit only E5 (answer_corrected, count only) and E6
 *   (resumed, on draft-cache rehydrate). E4 is never emitted here because
 *   nothing blocks. Payloads carry ids/counters only, never text.
 * - 44px+ touch targets, two-layer focus via the shell frame, single
 *   ease-out curve, `prefers-reduced-motion` disables motion.
 */

import { useEffect, useRef, useState } from "react";
import type { FixtureScreenState } from "./fixtures";
import type {
  IntakeFunnelEmit,
  IntakeScreenSlot,
  IntakeScreenSlotProps,
} from "./navigation";
import { INTAKE_SCREEN_ORDER, type IntakeScreenId } from "./screens";

/* Fixture reading (pinned shape; stub degrades to empty) */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getFixtureScreen(
  fixture: unknown,
  screenId: IntakeScreenId,
): FixtureScreenState | null {
  if (!isRecord(fixture)) return null;
  const screens = fixture["screens"];
  if (!isRecord(screens)) return null;
  const state = screens[screenId];
  if (!isRecord(state)) return null;
  const prepared = Array.isArray(state["prepared"])
    ? (state["prepared"] as FixtureScreenState["prepared"])
    : [];
  const selected = Array.isArray(state["selected"])
    ? (state["selected"] as string[]).filter((id) => typeof id === "string")
    : [];
  const note = typeof state["note"] === "string" ? state["note"] : undefined;
  return { prepared, selected, note };
}

/** Labels of prepared items currently selected (meaning-level readback). */
function selectedLabels(state: FixtureScreenState | null): string[] {
  if (!state) return [];
  const byId = new Map(state.prepared.map((item) => [item.id, item.label]));
  return state.selected
    .map((id) => byId.get(id))
    .filter((label): label is string => typeof label === "string");
}

/* ── Pure state helpers (unit-tested; no rendering) ── */

export function toggleId(list: readonly string[], id: string): string[] {
  return list.includes(id)
    ? list.filter((entry) => entry !== id)
    : [...list, id];
}

/** Journey-level market skip (shipped product): recorded, never defaulted. */
export function isMarketSkippedFixture(fixture: unknown): boolean {
  if (!isRecord(fixture)) return false;
  if (fixture["marketSkipped"] === true) return true;
  const market = getFixtureScreen(fixture, "s-market");
  if (!market) return false;
  return (
    market.prepared.length === 0 &&
    typeof market.note === "string" &&
    /skip|dilewati|shipped|dikirim/i.test(market.note)
  );
}

/** Thin/manual competitor lead when prepared rows are generic or absent.
 * Generic rows carry structural `competitor-generic-*` ids; detection never
 * sniffs display labels, so customer-language labels stay render-safe. */
export function isThinCompetitorState(
  state: FixtureScreenState | null,
): boolean {
  if (!state || state.prepared.length === 0) return true;
  return state.prepared.some((item) => /^competitor-generic/i.test(item.id));
}

/** Substring guard for unbranded question edits (screening strength is the
 *  engine's job per §8.12; the screen refuses plain identity leaks). */
export function isUnbrandedViolation(
  text: string,
  identities: readonly string[],
): boolean {
  const haystack = text.toLowerCase();
  return identities
    .map((identity) => identity.trim().toLowerCase())
    .filter((identity) => identity.length > 1)
    .some((identity) => haystack.includes(identity));
}

/** Client-side sensitive-data stop for s-facts (AGENTS.md rule 12).
 *  Never blocks navigation; the mapper must drop flagged text. */
export function containsSensitiveData(text: string): boolean {
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) return true;
  if (/(?:\+?62|0)[\d\s\-().]{8,}/.test(text)) return true;
  if (/\b\d{16}\b/.test(text)) return true;
  if (/\b(nik|ktp|no\.?\s*(rekening|ktp)|cvv|cvv2|pin\s*atm)\b/i.test(text))
    return true;
  return false;
}

/* ── Brand + alias resolution (data, never copy) ── */

export function resolveBrandName(fixture: unknown): string {
  const brand = getFixtureScreen(fixture, "s-brand");
  const first = brand?.prepared[0]?.label ?? brand?.selected[0];
  if (typeof first === "string" && first.trim().length > 0) {
    if (brand && brand.prepared.length > 0) {
      const byId = new Map(brand.prepared.map((item) => [item.id, item.label]));
      const sel = brand.selected
        .map((id) => byId.get(id))
        .find((label): label is string => typeof label === "string");
      if (sel) return sel;
      return brand.prepared[0].label;
    }
    return first;
  }
  return "brand Anda";
}

export function resolveAliases(fixture: unknown): string[] {
  const review = getFixtureScreen(fixture, "s-review");
  if (!review) return [];
  const aliases: string[] = [];
  for (const item of review.prepared) {
    if (!/^row-alias/.test(item.id)) continue;
    const fromSelected = review.selected.includes(item.id);
    if (!fromSelected) continue;
    // Explicit none-values ("...: none", "...: Tidak ada") mean no aliases.
    if (/:\s*(none|tidak ada)\b/i.test(item.label)) continue;
    const parts = item.label
      .split(/[:,;]/)
      .map((part) => part.trim())
      .filter(
        (part) =>
          part.length > 1 &&
          !/^readback row/i.test(part) &&
          !/^alias/i.test(part),
      );
    for (const part of parts) {
      if (!aliases.includes(part)) aliases.push(part);
    }
  }
  return aliases;
}

/* ── s-questions static structure (no prompt generation is connected) ── */

export const UNBRANDED_INTENTS = [
  "Rekomendasi kategori",
  "Situasi pelanggan",
  "Kebutuhan dan pertimbangan",
  "Produk untuk kebutuhan tertentu",
  "Shortlist",
  "Pertimbangan antar pilihan",
] as const;

export const BRANDED_INTENTS = [
  "Kecocokan untuk kebutuhan",
  "Rekomendasi eksplisit",
  "Perbandingan langsung",
  "Cocok, tidak cocok, kelebihan dan kekurangan",
] as const;

export type QuestionSlot = {
  number: number;
  intent: string;
  unbranded: boolean;
  text: string;
};

/** The 10 review slots in final order. Texts come from the fixture's
 *  s-questions prepared items when present; otherwise a structural
 *  placeholder (never invented question wording). */
export function deriveQuestionSlots(fixture: unknown): QuestionSlot[] {
  const state = getFixtureScreen(fixture, "s-questions");
  const byIndex = new Map<string, string>();
  if (state) {
    state.prepared.forEach((item, index) => {
      byIndex.set(String(index), item.label);
    });
  }
  const intents = [...UNBRANDED_INTENTS, ...BRANDED_INTENTS];
  return intents.map((intent, index) => ({
    number: index + 1,
    intent,
    unbranded: index < UNBRANDED_INTENTS.length,
    text: byIndex.get(String(index)) ?? `Pertanyaan ${index + 1} (${intent})`,
  }));
}

/* ── s-review row derivation (meaning-level, data contract §1-§2) ── */

export type ReviewRow = {
  key: string;
  label: string;
  value: string;
  /** Owning screen for the Ubah correction link. Null = inline edit. */
  target: IntakeScreenId | null;
  advisory?: boolean;
};

export function deriveReviewRows(fixture: unknown): ReviewRow[] {
  const scopeLabels = selectedLabels(getFixtureScreen(fixture, "s-scope"));
  const categoryLabels = selectedLabels(
    getFixtureScreen(fixture, "s-category"),
  );
  const offeringLabels = selectedLabels(
    getFixtureScreen(fixture, "s-offerings"),
  );
  const customerLabels = selectedLabels(
    getFixtureScreen(fixture, "s-customers"),
  );
  const marketState = getFixtureScreen(fixture, "s-market");
  const competitorState = getFixtureScreen(fixture, "s-competitors");
  const factsState = getFixtureScreen(fixture, "s-facts");
  const reviewState = getFixtureScreen(fixture, "s-review");
  const marketSkipped = isMarketSkippedFixture(fixture);

  const scopeValue =
    scopeLabels.length > 0
      ? categoryLabels.length > 0
        ? `${scopeLabels[0]} · kategori: ${categoryLabels[0]}`
        : scopeLabels[0]
      : categoryLabels.length > 0
        ? `kategori: ${categoryLabels[0]}`
        : "Belum diisi";

  let marketValue: string;
  let marketTarget: IntakeScreenId;
  if (marketSkipped) {
    marketValue =
      "Tidak relevan untuk audit ini. Produk ini dikirim ke seluruh Indonesia.";
    marketTarget = "s-competitors";
  } else if (!marketState || marketState.selected.length === 0) {
    marketValue = "Belum diisi";
    marketTarget = "s-market";
  } else {
    const ids = marketState.selected;
    if (ids.some((id) => /luar|abroad|international/i.test(id))) {
      marketValue = "Indonesia dan luar negeri";
    } else if (ids.some((id) => /seluruh|nationwide|^all/i.test(id))) {
      marketValue = "Seluruh Indonesia";
    } else {
      const cities = selectedLabels(marketState).filter(
        (label) => !/^market (type|bound)/i.test(label),
      );
      const bound = ids.some((id) => /bound-local|lokal/i.test(id))
        ? "Ya, bisnis kami lokal"
        : ids.some((id) => /bound-online|online/i.test(id))
          ? "Tidak, kami juga melayani online"
          : null;
      marketValue =
        cities.length > 0
          ? bound
            ? `${cities.join(", ")} · ${bound}`
            : cities.join(", ")
          : (selectedLabels(marketState)[0] ?? "Belum diisi");
    }
    marketTarget = "s-market";
  }

  let competitorValue: string;
  if (!competitorState || competitorState.selected.length === 0) {
    competitorValue = "Belum diisi";
  } else {
    const kept = selectedLabels(competitorState);
    competitorValue =
      kept.length > 0
        ? kept.join(", ")
        : "Tidak ada pesaing langsung. Audit membandingkan dengan alternatif dalam kategori Anda.";
  }

  const factsText =
    factsState && factsState.selected.length > 0
      ? factsState.selected.join(" ")
      : "";
  const factsValue = factsText.trim().length > 0 ? factsText : "Tidak diisi";

  const aliases = resolveAliases(fixture);
  const aliasValue = aliases.length > 0 ? aliases.join(", ") : "Tidak ada";

  const rows: ReviewRow[] = [
    {
      key: "scope",
      label: "Yang diaudit",
      value: scopeValue,
      target: "s-scope",
    },
    {
      key: "offerings",
      label: "Produk dan layanan",
      value:
        offeringLabels.length > 0 ? offeringLabels.join(", ") : "Belum diisi",
      target: "s-offerings",
    },
    {
      key: "customers",
      label: "Kenapa pelanggan mencari",
      value:
        customerLabels.length > 0 ? customerLabels.join(", ") : "Belum diisi",
      target: "s-customers",
    },
    { key: "market", label: "Pasar", value: marketValue, target: marketTarget },
    {
      key: "competitors",
      label: "Pembanding",
      value: competitorValue,
      target: "s-competitors",
    },
    {
      key: "facts",
      label: "Hal yang wajib benar",
      value: factsValue,
      target: "s-facts",
    },
    {
      key: "aliases",
      label: "Nama lain dan sumber",
      value: aliasValue,
      target: null,
    },
  ];

  if (reviewState) {
    for (const item of reviewState.prepared) {
      if (!/^row-conflict/.test(item.id)) continue;
      if (!reviewState.selected.includes(item.id)) continue;
      rows.push({
        key: item.id,
        label: "Perbedaan sumber",
        value: item.label,
        target: "s-brand",
        advisory: true,
      });
    }
  }
  return rows;
}

/* ── Tab-local draft cache (Back restores state; reload is shell-owned) ── */

const draftCache = new Map<string, unknown>();

function readDraft<T>(key: string): T | undefined {
  return draftCache.get(key) as T | undefined;
}

function writeDraft(key: string, value: unknown): void {
  draftCache.set(key, value);
}

/** Local editable state seeded from the fixture, restored from the
 *  tab-local draft on remount (Back navigation). Emits E6 once per
 *  rehydrate; payloads carry counts only, never text. */
function useDraftState<T>(
  screenId: IntakeScreenId,
  key: string,
  seed: () => T,
  emit: IntakeFunnelEmit,
): [T, (next: T | ((prev: T) => T)) => void] {
  const cacheKey = `${screenId}:${key}`;
  const [value, setValue] = useState<T>(() => {
    const cached = readDraft<T>(cacheKey);
    return cached !== undefined ? cached : seed();
  });
  const resumedRef = useRef(false);
  useEffect(() => {
    if (!resumedRef.current && readDraft<T>(cacheKey) !== undefined) {
      resumedRef.current = true;
      emit({ event: "intake_resumed", screenId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const set = (next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved =
        typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      writeDraft(cacheKey, resolved);
      return resolved;
    });
  };
  return [value, set];
}

function useCorrectionCounter(
  screenId: IntakeScreenId,
  emit: IntakeFunnelEmit,
): (extra?: number) => void {
  const countRef = useRef(0);
  return (extra = 1) => {
    countRef.current += extra;
    emit({
      event: "intake_answer_corrected",
      screenId,
      correctionCount: countRef.current,
    });
  };
}

/* ── Shared atoms (zinc tokens, 44px targets, one ease-out curve) ── */

const EASE = "ease-out";
const REDUCED_MOTION_CSS = `@media (prefers-reduced-motion: reduce){[data-bab23]{transition:none!important;animation:none!important;}[data-bab23] *{transition:none!important;animation:none!important;}}`;

function ScreenSection({
  screenId,
  labelledBy,
  children,
}: {
  screenId: IntakeScreenId;
  labelledBy: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-bab23={screenId}
      aria-labelledby={labelledBy}
      style={{
        display: "grid",
        gap: "16px",
        transition: `opacity 150ms ${EASE}`,
      }}
    >
      <style>{REDUCED_MOTION_CSS}</style>
      {children}
    </section>
  );
}

function Heading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h1
      id={id}
      style={{
        margin: 0,
        fontSize: "24px",
        lineHeight: 1.25,
        color: "var(--text-heading, #18181b)",
      }}
    >
      {children}
    </h1>
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: "15px", lineHeight: 1.6 }}>{children}</p>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block",
        marginLeft: "8px",
        padding: "2px 10px",
        fontSize: "12px",
        fontWeight: 600,
        borderRadius: "999px",
        border: "1px solid var(--border-default, #e5e7eb)",
        color: "var(--text-muted, #52525b)",
        verticalAlign: "middle",
      }}
    >
      {children}
    </span>
  );
}

function OptionCard({
  selected,
  onSelect,
  title,
  description,
  radioGroup,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  radioGroup?: string;
}) {
  return (
    <button
      type="button"
      role={radioGroup ? "radio" : undefined}
      aria-checked={radioGroup ? selected : undefined}
      aria-pressed={radioGroup ? undefined : selected}
      onClick={onSelect}
      style={{
        minHeight: "44px",
        width: "100%",
        textAlign: "left",
        padding: "12px 16px",
        fontSize: "16px",
        borderRadius: "12px",
        cursor: "pointer",
        background: selected
          ? "var(--action-soft, #f4f4f5)"
          : "var(--bg-page, #ffffff)",
        border: selected
          ? "2px solid var(--action, #18181b)"
          : "1px solid var(--border-default, #e5e7eb)",
        color: "var(--text-heading, #18181b)",
        transition: `border-color 150ms ${EASE}, background 150ms ${EASE}`,
      }}
    >
      <span style={{ display: "block", fontWeight: 600 }}>{title}</span>
      {description ? (
        <span
          style={{
            display: "block",
            marginTop: "4px",
            fontSize: "14px",
            fontWeight: 400,
            color: "var(--text-muted, #52525b)",
          }}
        >
          {description}
        </span>
      ) : null}
    </button>
  );
}

function ToggleChip({
  on,
  onToggle,
  children,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onToggle}
      style={{
        minHeight: "44px",
        padding: "10px 16px",
        fontSize: "15px",
        borderRadius: "999px",
        cursor: "pointer",
        background: on ? "var(--action, #18181b)" : "transparent",
        color: on
          ? "var(--action-foreground, #ffffff)"
          : "var(--text-body, #3f3f46)",
        border: on
          ? "1px solid var(--action, #18181b)"
          : "1px solid var(--border-strong, #d1d5db)",
        transition: `background 150ms ${EASE}, color 150ms ${EASE}`,
      }}
    >
      {children}
    </button>
  );
}

function AddLine({
  id,
  placeholder,
  buttonLabel,
  hint,
  onAdd,
}: {
  id: string;
  placeholder: string;
  buttonLabel: string;
  hint?: string;
  onAdd: (value: string) => void;
}) {
  const [text, setText] = useState("");
  const submit = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    onAdd(trimmed);
    setText("");
  };
  const describedBy = hint ? `${id}-hint` : undefined;
  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          id={id}
          type="text"
          value={text}
          aria-label={placeholder}
          placeholder={placeholder}
          aria-describedby={describedBy}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          style={{
            flex: 1,
            minHeight: "44px",
            padding: "10px 14px",
            fontSize: "16px",
            borderRadius: "12px",
            border: "1px solid var(--border-default, #e5e7eb)",
            background: "var(--bg-page, #ffffff)",
            color: "var(--text-heading, #18181b)",
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={text.trim().length === 0}
          style={{
            minHeight: "44px",
            minWidth: "44px",
            padding: "10px 20px",
            fontSize: "15px",
            fontWeight: 600,
            borderRadius: "999px",
            cursor: text.trim().length === 0 ? "not-allowed" : "pointer",
            background: "transparent",
            border: "1px solid var(--action, #18181b)",
            color: "var(--text-heading, #18181b)",
            opacity: text.trim().length === 0 ? 0.5 : 1,
          }}
        >
          {buttonLabel}
        </button>
      </div>
      {hint ? (
        <p
          id={`${id}-hint`}
          style={{
            margin: 0,
            fontSize: "13px",
            lineHeight: 1.5,
            color: "var(--text-muted, #52525b)",
          }}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ── s-market (A2 choose one + A4 reveal, conditional) ── */

type MarketKind = "sekitar" | "beberapa" | "seluruh" | "luar";

const MARKET_OPTIONS: ReadonlyArray<{
  kind: MarketKind;
  title: string;
  description?: string;
  reveals: boolean;
}> = [
  {
    kind: "sekitar",
    title: "Sekitar lokasi tertentu",
    description: "Pelanggan datang dari area di sekitar Anda",
    reveals: true,
  },
  { kind: "beberapa", title: "Beberapa kota", reveals: true },
  {
    kind: "seluruh",
    title: "Seluruh Indonesia",
    description: "Misalnya lewat e-commerce atau pengiriman",
    reveals: false,
  },
  { kind: "luar", title: "Juga di luar negeri", reveals: false },
];

function marketKindFromId(id: string): MarketKind | null {
  const lower = id.toLowerCase();
  if (/sekitar|nearby|lokasi/.test(lower)) return "sekitar";
  if (/beberapa|multi|kota/.test(lower) && !/tambah/.test(lower))
    return "beberapa";
  if (/seluruh|nationwide|seluruh-indonesia|^all/.test(lower)) return "seluruh";
  if (/luar|abroad|international|luar-negeri/.test(lower)) return "luar";
  return null;
}

function seedMarketKind(state: FixtureScreenState | null): MarketKind | null {
  if (!state) return null;
  for (const id of state.selected) {
    const kind = marketKindFromId(id);
    if (kind) return kind;
  }
  for (const item of state.prepared) {
    if (!item.on) continue;
    const kind = marketKindFromId(item.id);
    if (kind) return kind;
  }
  return null;
}

function seedCityIds(state: FixtureScreenState | null): string[] {
  if (!state) return [];
  return state.prepared
    .filter(
      (item) =>
        /^city/i.test(item.id) ||
        (/kota|area|city/i.test(item.id) && marketKindFromId(item.id) === null),
    )
    .filter((item) => state.selected.includes(item.id))
    .map((item) => item.id);
}

function seedBound(
  state: FixtureScreenState | null,
): "lokal" | "online" | null {
  if (!state) return null;
  const ids = state.selected;
  if (ids.some((id) => /bound-local|lokal/i.test(id))) return "lokal";
  if (ids.some((id) => /bound-online|online/i.test(id))) return "online";
  for (const item of state.prepared) {
    if (!item.on) continue;
    if (/bound-local|lokal/i.test(item.id)) return "lokal";
    if (/bound-online|online/i.test(item.id)) return "online";
  }
  return null;
}

function MarketScreen({ fixture, emit }: IntakeScreenSlotProps) {
  const state = getFixtureScreen(fixture, "s-market");
  const skipped = isMarketSkippedFixture(fixture);
  const countCorrections = useCorrectionCounter("s-market", emit);
  const [kind, setKind] = useDraftState<MarketKind | null>(
    "s-market",
    "kind",
    () => seedMarketKind(state),
    emit,
  );
  const [cityIds, setCityIds] = useDraftState<string[]>(
    "s-market",
    "cities",
    () => seedCityIds(state),
    emit,
  );
  const [bound, setBound] = useDraftState<"lokal" | "online" | null>(
    "s-market",
    "bound",
    () => seedBound(state),
    emit,
  );
  const [customCities, setCustomCities] = useDraftState<string[]>(
    "s-market",
    "custom-cities",
    () => [],
    emit,
  );

  if (skipped) {
    return (
      <ScreenSection screenId="s-market" labelledBy="s-market-h">
        <div role="status" style={{ display: "grid", gap: "12px" }}>
          <Heading id="s-market-h">Di mana pelanggan Anda berada?</Heading>
          <Lead>
            Layar ini dilewati. Lokasi tidak memengaruhi rekomendasi untuk audit
            ini.
          </Lead>
        </div>
      </ScreenSection>
    );
  }

  const cityById = new Map(
    (state?.prepared ?? []).map((item) => [item.id, item.label]),
  );
  const reveal = kind === "sekitar" || kind === "beberapa";
  const selectedOption = MARKET_OPTIONS.find((option) => option.kind === kind);

  return (
    <ScreenSection screenId="s-market" labelledBy="s-market-h">
      <Heading id="s-market-h">Di mana pelanggan Anda berada?</Heading>
      <Lead>
        Ditanyakan karena lokasi memengaruhi rekomendasi untuk bisnis Anda.
        Untuk bisnis yang sepenuhnya online, layar ini dilewati.
      </Lead>
      <div
        role="radiogroup"
        aria-label="Di mana pelanggan Anda berada?"
        style={{ display: "grid", gap: "8px" }}
      >
        {MARKET_OPTIONS.map((option) => (
          <OptionCard
            key={option.kind}
            radioGroup="market-kind"
            selected={kind === option.kind}
            title={option.title}
            description={option.description}
            onSelect={() => {
              if (kind !== option.kind) countCorrections();
              setKind(option.kind);
            }}
          />
        ))}
      </div>
      {reveal && selectedOption ? (
        <div
          style={{
            display: "grid",
            gap: "12px",
            paddingLeft: "12px",
            borderLeft: "2px solid var(--border-default, #e5e7eb)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "16px",
              color: "var(--text-heading, #18181b)",
            }}
          >
            Kota atau area mana?
          </h2>
          {cityIds.length > 0 || customCities.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {cityIds.map((id) => (
                <ToggleChip
                  key={id}
                  on
                  onToggle={() => {
                    setCityIds(toggleId(cityIds, id));
                    countCorrections();
                  }}
                  label={`Hapus ${cityById.get(id) ?? id}`}
                >
                  {cityById.get(id) ?? id} ×
                </ToggleChip>
              ))}
              {customCities.map((city) => (
                <ToggleChip
                  key={`custom-${city}`}
                  on
                  onToggle={() => {
                    setCustomCities(
                      customCities.filter((entry) => entry !== city),
                    );
                    countCorrections();
                  }}
                  label={`Hapus ${city}`}
                >
                  {city} ×
                </ToggleChip>
              ))}
            </div>
          ) : null}
          <AddLine
            id="s-market-city-add"
            placeholder="Tambah kota atau area"
            buttonLabel="Tambah"
            onAdd={(value) => {
              if (!customCities.includes(value)) {
                setCustomCities([...customCities, value]);
                countCorrections();
              }
            }}
          />
          <h2
            style={{
              margin: 0,
              fontSize: "16px",
              color: "var(--text-heading, #18181b)",
            }}
          >
            Pelanggan harus datang ke lokasi Anda?
          </h2>
          <div
            role="radiogroup"
            aria-label="Pelanggan harus datang ke lokasi Anda?"
            style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
          >
            <OptionCard
              radioGroup="market-bound"
              selected={bound === "lokal"}
              title="Ya, bisnis kami lokal"
              onSelect={() => {
                if (bound !== "lokal") countCorrections();
                setBound("lokal");
              }}
            />
            <OptionCard
              radioGroup="market-bound"
              selected={bound === "online"}
              title="Tidak, kami juga melayani online"
              onSelect={() => {
                if (bound !== "online") countCorrections();
                setBound("online");
              }}
            />
          </div>
        </div>
      ) : null}
    </ScreenSection>
  );
}

/* ── s-competitors (A3 choose several + add + no-direct-competitor toggle) ── */

function CompetitorsScreen({ fixture, emit }: IntakeScreenSlotProps) {
  const state = getFixtureScreen(fixture, "s-competitors");
  const thin = isThinCompetitorState(state);
  const countCorrections = useCorrectionCounter("s-competitors", emit);
  const [keptIds, setKeptIds] = useDraftState<string[]>(
    "s-competitors",
    "kept",
    () => state?.selected.filter((id) => /^competitor/i.test(id)) ?? [],
    emit,
  );
  const [custom, setCustom] = useDraftState<string[]>(
    "s-competitors",
    "custom",
    () => state?.selected.filter((id) => !/^competitor/i.test(id)) ?? [],
    emit,
  );
  const [noDirect, setNoDirect] = useDraftState<boolean>(
    "s-competitors",
    "no-direct",
    () => false,
    emit,
  );

  const rows = (state?.prepared ?? []).filter((item) =>
    /^competitor/i.test(item.id),
  );
  const removedIds = rows
    .map((row) => row.id)
    .filter((id) => !keptIds.includes(id));

  return (
    <ScreenSection screenId="s-competitors" labelledBy="s-competitors-h">
      <Heading id="s-competitors-h">
        Ini yang mungkin dibandingkan dengan Anda
      </Heading>
      <Lead>
        {thin
          ? "Nuave belum menemukan pembanding dari sumber Anda. Ini pembanding yang umum untuk kategori Anda. Hapus yang tidak relevan, tambah yang kurang."
          : "Hapus yang tidak relevan, tambah yang kurang."}
      </Lead>
      {rows.length > 0 ? (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gap: "8px",
          }}
        >
          {rows.map((row) => {
            const kept = keptIds.includes(row.id);
            return (
              <li
                key={row.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  minHeight: "44px",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: "1px solid var(--border-default, #e5e7eb)",
                  background: kept
                    ? "var(--bg-page, #ffffff)"
                    : "var(--bg-surface-raised, #f4f4f5)",
                  opacity: kept ? 1 : 0.75,
                }}
              >
                <span
                  style={{
                    fontSize: "15px",
                    color: "var(--text-heading, #18181b)",
                  }}
                >
                  {row.label}
                </span>
                <button
                  type="button"
                  aria-label={`${kept ? "Hapus" : "Batalkan"} ${row.label}`}
                  disabled={noDirect}
                  onClick={() => {
                    setKeptIds(toggleId(keptIds, row.id));
                    countCorrections();
                  }}
                  style={{
                    minHeight: "44px",
                    minWidth: "44px",
                    padding: "10px 12px",
                    fontSize: "14px",
                    fontWeight: 600,
                    background: "transparent",
                    border: "none",
                    cursor: noDirect ? "not-allowed" : "pointer",
                    color: "var(--text-body, #3f3f46)",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                    opacity: noDirect ? 0.5 : 1,
                  }}
                >
                  {kept ? "Hapus" : "Batalkan"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {custom.length > 0 ? (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gap: "8px",
          }}
        >
          {custom.map((name) => (
            <li
              key={`custom-${name}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                minHeight: "44px",
                padding: "10px 16px",
                borderRadius: "12px",
                border: "1px solid var(--border-default, #e5e7eb)",
              }}
            >
              <span style={{ fontSize: "15px" }}>{name}</span>
              <button
                type="button"
                aria-label={`Hapus ${name}`}
                disabled={noDirect}
                onClick={() => {
                  setCustom(custom.filter((entry) => entry !== name));
                  countCorrections();
                }}
                style={{
                  minHeight: "44px",
                  minWidth: "44px",
                  padding: "10px 12px",
                  fontSize: "14px",
                  fontWeight: 600,
                  background: "transparent",
                  border: "none",
                  cursor: noDirect ? "not-allowed" : "pointer",
                  color: "var(--text-body, #3f3f46)",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                  opacity: noDirect ? 0.5 : 1,
                }}
              >
                Hapus
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {removedIds.length > 0 ? (
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            color: "var(--text-muted, #52525b)",
          }}
        >
          {removedIds.length} saran dihapus dan dicatat sebagai sinyal negatif.
        </p>
      ) : null}
      <AddLine
        id="s-competitors-add"
        placeholder="Tambah pembanding"
        buttonLabel="Tambah"
        onAdd={(value) => {
          if (!custom.includes(value)) {
            setCustom([...custom, value]);
            countCorrections();
          }
        }}
      />
      <button
        type="button"
        role="checkbox"
        aria-checked={noDirect}
        onClick={() => {
          setNoDirect(!noDirect);
          countCorrections();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          minHeight: "44px",
          width: "100%",
          textAlign: "left",
          padding: "10px 4px",
          fontSize: "15px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--text-body, #3f3f46)",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24px",
            height: "24px",
            flexShrink: 0,
            borderRadius: "6px",
            border: noDirect
              ? "2px solid var(--action, #18181b)"
              : "1px solid var(--border-strong, #d1d5db)",
            background: noDirect
              ? "var(--action, #18181b)"
              : "var(--bg-page, #ffffff)",
            color: "var(--action-foreground, #ffffff)",
            fontSize: "14px",
          }}
        >
          {noDirect ? "✓" : ""}
        </span>
        Tidak ada pesaing langsung yang saya tahu
      </button>
    </ScreenSection>
  );
}

/* ── s-facts (A4 fallback, optional, never blocks) ── */

const SENSITIVE_NOTICE_ID = "s-facts-sensitive-notice";

function FactsScreen({ emit }: IntakeScreenSlotProps) {
  // Free text lives only in the tab-local draft: the pinned fixture shape
  // carries no free-text field (note is fixture metadata), so F1 seeds
  // the normal skipped state (empty textarea + placeholder guidance).
  const [text, setText] = useDraftState<string>(
    "s-facts",
    "text",
    () => "",
    emit,
  );
  const flagged = containsSensitiveData(text);

  return (
    <ScreenSection screenId="s-facts" labelledBy="s-facts-h">
      <Heading id="s-facts-h">
        Apa yang tidak boleh salah dipahami tentang brand Anda?
        <Pill>Opsional</Pill>
      </Heading>
      <Lead>
        Satu hal yang, kalau AI salah paham, akan membuat seluruh audit meleset.
        Satu kalimat cukup.
      </Lead>
      <div style={{ display: "grid", gap: "8px" }}>
        <label
          htmlFor="s-facts-text"
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--text-heading, #18181b)",
          }}
        >
          Satu hal yang wajib benar
        </label>
        <textarea
          id="s-facts-text"
          value={text}
          aria-describedby={flagged ? SENSITIVE_NOTICE_ID : "s-facts-hint"}
          aria-invalid={flagged}
          placeholder="Misalnya: keunggulan yang sering terlewat, fakta harga, sertifikasi, istilah khas, atau kesalahpahaman yang sering terjadi."
          rows={4}
          onChange={(event) => setText(event.target.value)}
          style={{
            width: "100%",
            minHeight: "112px",
            padding: "12px 14px",
            fontSize: "16px",
            lineHeight: 1.6,
            borderRadius: "12px",
            resize: "vertical",
            border: flagged
              ? "2px solid var(--red, #dc2626)"
              : "1px solid var(--border-default, #e5e7eb)",
            background: "var(--bg-page, #ffffff)",
            color: "var(--text-heading, #18181b)",
            fontFamily: "inherit",
          }}
        />
        {flagged ? (
          <p
            id={SENSITIVE_NOTICE_ID}
            role="alert"
            style={{
              margin: 0,
              fontSize: "14px",
              lineHeight: 1.5,
              color: "var(--red, #dc2626)",
            }}
          >
            Hapus alamat email, nomor telepon, atau identitas pribadi dari kolom
            ini. Cukup tulis fakta bisnis yang boleh dipahami AI.
          </p>
        ) : null}
        <p
          id="s-facts-hint"
          style={{
            margin: 0,
            fontSize: "13px",
            color: "var(--text-muted, #52525b)",
          }}
        >
          Boleh dikosongkan.
        </p>
      </div>
    </ScreenSection>
  );
}

/* ── s-review (A5 readback with correction links) ── */

function ReviewScreen({ fixture, nav, emit }: IntakeScreenSlotProps) {
  const rows = deriveReviewRows(fixture);
  const [editingAliases, setEditingAliases] = useState(false);
  const [aliasText, setAliasText] = useDraftState<string>(
    "s-review",
    "aliases",
    () => {
      const aliases = resolveAliases(fixture);
      return aliases.join(", ");
    },
    emit,
  );
  const countCorrections = useCorrectionCounter("s-review", emit);
  const aliasEdited =
    aliasText.trim().length > 0 &&
    aliasText !== resolveAliases(fixture).join(", ");

  const correctAndJump = (target: IntakeScreenId | null) => () => {
    countCorrections();
    // Direct jump to the owning screen when the shell supports it
    // (data-correction-target preserved for tests); Back walks the
    // resolved path as the fallback.
    if (target !== null && nav.onGotoScreen) {
      nav.onGotoScreen(target);
      return;
    }
    nav.onBack();
  };

  return (
    <ScreenSection screenId="s-review" labelledBy="s-review-h">
      <Heading id="s-review-h">Ini yang akan Nuave audit</Heading>
      <Lead>Periksa sekali lagi. Semua bisa diubah.</Lead>
      <dl style={{ margin: 0, display: "grid", gap: "8px" }}>
        {rows.map((row) => (
          <div
            key={row.key}
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "12px",
              minHeight: "44px",
              padding: "12px 0",
              borderTop: "1px solid var(--border-default, #e5e7eb)",
            }}
          >
            <div style={{ display: "grid", gap: "4px" }}>
              <dt
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-muted, #52525b)",
                }}
              >
                {row.label}
              </dt>
              <dd
                style={{
                  margin: 0,
                  fontSize: "15px",
                  lineHeight: 1.6,
                  color: "var(--text-heading, #18181b)",
                }}
              >
                {row.key === "aliases" ? (
                  editingAliases ? (
                    <span style={{ display: "grid", gap: "8px" }}>
                      <input
                        type="text"
                        aria-label="Nama lain dan sumber"
                        value={aliasText}
                        onChange={(event) => setAliasText(event.target.value)}
                        style={{
                          minHeight: "44px",
                          padding: "10px 14px",
                          fontSize: "16px",
                          borderRadius: "12px",
                          border: "1px solid var(--border-default, #e5e7eb)",
                          background: "var(--bg-page, #ffffff)",
                          color: "var(--text-heading, #18181b)",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "13px",
                          color: "var(--text-muted, #52525b)",
                        }}
                      >
                        Nama lain dipakai untuk memastikan enam pertanyaan tanpa
                        menyebut bisnis Anda benar-benar tidak menyebutnya.
                      </span>
                    </span>
                  ) : (
                    <span>
                      {aliasEdited ? aliasText : row.value}
                      <span
                        style={{
                          display: "block",
                          fontSize: "13px",
                          color: "var(--text-muted, #52525b)",
                        }}
                      >
                        Nama lain dipakai untuk memastikan enam pertanyaan tanpa
                        menyebut bisnis Anda benar-benar tidak menyebutnya.
                      </span>
                    </span>
                  )
                ) : (
                  row.value
                )}
              </dd>
              {row.advisory ? (
                <span
                  style={{
                    fontSize: "13px",
                    color: "var(--text-muted, #52525b)",
                  }}
                >
                  Saran ini tidak menghalangi. Abaikan atau ubah, keduanya
                  lanjut.
                </span>
              ) : null}
            </div>
            {row.target !== null ? (
              <button
                type="button"
                data-correction-target={row.target}
                aria-label={`Ubah ${row.label}`}
                onClick={correctAndJump(row.target)}
                style={{
                  minHeight: "44px",
                  minWidth: "44px",
                  flexShrink: 0,
                  padding: "10px 12px",
                  fontSize: "14px",
                  fontWeight: 600,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-body, #3f3f46)",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                Ubah
              </button>
            ) : (
              <button
                type="button"
                aria-label={`${editingAliases ? "Selesai" : "Ubah"} ${row.label}`}
                aria-expanded={editingAliases}
                onClick={() => {
                  if (editingAliases) countCorrections();
                  setEditingAliases(!editingAliases);
                }}
                style={{
                  minHeight: "44px",
                  minWidth: "44px",
                  flexShrink: 0,
                  padding: "10px 12px",
                  fontSize: "14px",
                  fontWeight: 600,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-body, #3f3f46)",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                {editingAliases ? "Selesai" : "Ubah"}
              </button>
            )}
          </div>
        ))}
      </dl>
    </ScreenSection>
  );
}

/* ── s-questions (A5 post-intake review; generation is NOT connected) ── */

function QuestionsScreen({ fixture, emit }: IntakeScreenSlotProps) {
  const slots = deriveQuestionSlots(fixture);
  const brand = resolveBrandName(fixture);
  const aliases = resolveAliases(fixture);
  const identities = [brand, ...aliases];
  const countCorrections = useCorrectionCounter("s-questions", emit);
  const [edits, setEdits] = useDraftState<Record<string, string>>(
    "s-questions",
    "edits",
    () => ({}),
    emit,
  );
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [refusal, setRefusal] = useState<number | null>(null);

  const unbranded = slots.filter((slot) => slot.unbranded);
  const branded = slots.filter((slot) => !slot.unbranded);

  const startEdit = (slot: QuestionSlot) => {
    setEditing(slot.number);
    setDraft(edits[String(slot.number)] ?? slot.text);
    setRefusal(null);
  };

  const saveEdit = (slot: QuestionSlot) => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      setEdits((prev) => {
        const next = { ...prev };
        delete next[String(slot.number)];
        return next;
      });
      setEditing(null);
      setRefusal(null);
      return;
    }
    if (slot.unbranded && isUnbrandedViolation(trimmed, identities)) {
      setRefusal(slot.number);
      return;
    }
    setEdits((prev) => ({ ...prev, [String(slot.number)]: trimmed }));
    countCorrections();
    setEditing(null);
    setRefusal(null);
  };

  const renderSlot = (slot: QuestionSlot) => {
    const text = edits[String(slot.number)] ?? slot.text;
    const isEditing = editing === slot.number;
    return (
      <li
        key={slot.number}
        style={{
          display: "grid",
          gap: "8px",
          padding: "12px 0",
          borderTop: "1px solid var(--border-default, #e5e7eb)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-muted, #52525b)",
            }}
          >
            {slot.number} · {slot.intent}
          </p>
          {isEditing ? null : (
            <button
              type="button"
              aria-label={`Ubah pertanyaan ${slot.number}`}
              onClick={() => startEdit(slot)}
              style={{
                minHeight: "44px",
                minWidth: "44px",
                padding: "10px 12px",
                fontSize: "14px",
                fontWeight: 600,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-body, #3f3f46)",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              Ubah
            </button>
          )}
        </div>
        {isEditing ? (
          <div style={{ display: "grid", gap: "8px" }}>
            <label
              htmlFor={`s-questions-edit-${slot.number}`}
              style={{ fontSize: "14px", fontWeight: 600 }}
            >
              Pertanyaan {slot.number}
            </label>
            <textarea
              id={`s-questions-edit-${slot.number}`}
              value={draft}
              aria-describedby={
                refusal === slot.number
                  ? `s-questions-refusal-${slot.number}`
                  : undefined
              }
              aria-invalid={refusal === slot.number}
              rows={3}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setEditing(null);
                  setRefusal(null);
                }
              }}
              style={{
                width: "100%",
                minHeight: "44px",
                padding: "10px 14px",
                fontSize: "16px",
                lineHeight: 1.6,
                borderRadius: "12px",
                resize: "vertical",
                border:
                  refusal === slot.number
                    ? "2px solid var(--red, #dc2626)"
                    : "1px solid var(--border-default, #e5e7eb)",
                fontFamily: "inherit",
              }}
            />
            {refusal === slot.number ? (
              <p
                id={`s-questions-refusal-${slot.number}`}
                role="alert"
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: "var(--red, #dc2626)",
                }}
              >
                Pertanyaan ini tidak boleh menyebut {brand} atau nama lainnya,
                supaya hasilnya tetap mengukur penemuan spontan.
              </p>
            ) : null}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => saveEdit(slot)}
                style={{
                  minHeight: "44px",
                  padding: "10px 20px",
                  fontSize: "15px",
                  fontWeight: 600,
                  borderRadius: "999px",
                  cursor: "pointer",
                  background: "var(--action, #18181b)",
                  color: "var(--action-foreground, #ffffff)",
                  border: "1px solid var(--action, #18181b)",
                }}
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setRefusal(null);
                }}
                style={{
                  minHeight: "44px",
                  padding: "10px 20px",
                  fontSize: "15px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-body, #3f3f46)",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              lineHeight: 1.6,
              color: "var(--text-heading, #18181b)",
            }}
          >
            {text}
          </p>
        )}
      </li>
    );
  };

  return (
    <ScreenSection screenId="s-questions" labelledBy="s-questions-h">
      <Heading id="s-questions-h">Periksa pertanyaan audit</Heading>
      <Lead>
        Sepuluh pertanyaan ini akan diuji ke model AI, satu per satu. Ubah kalau
        ada yang tidak wajar.
      </Lead>
      <div style={{ display: "grid", gap: "4px" }}>
        <h2
          style={{
            margin: 0,
            fontSize: "16px",
            color: "var(--text-heading, #18181b)",
          }}
        >
          Tanpa menyebut bisnis Anda{" "}
          <span
            style={{
              fontSize: "13px",
              fontWeight: 400,
              color: "var(--text-muted, #52525b)",
            }}
          >
            6 pertanyaan
          </span>
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "var(--text-muted, #52525b)",
          }}
        >
          Menguji apakah {brand} muncul dan direkomendasikan dengan sendirinya.
          Nama brand tidak boleh ada di sini.
        </p>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {unbranded.map(renderSlot)}
        </ul>
      </div>
      <div style={{ display: "grid", gap: "4px" }}>
        <h2
          style={{
            margin: 0,
            fontSize: "16px",
            color: "var(--text-heading, #18181b)",
          }}
        >
          Menyebut bisnis Anda{" "}
          <span
            style={{
              fontSize: "13px",
              fontWeight: 400,
              color: "var(--text-muted, #52525b)",
            }}
          >
            4 pertanyaan
          </span>
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "var(--text-muted, #52525b)",
          }}
        >
          Menguji apa yang model AI katakan saat brand Anda ditanyakan langsung.
          Hasilnya tidak dihitung sebagai penemuan spontan.
        </p>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {branded.map(renderSlot)}
        </ul>
      </div>
    </ScreenSection>
  );
}

/* ── Orchestrator wiring map ── */

export const BAB2_SCREENS: Partial<Record<IntakeScreenId, IntakeScreenSlot>> = {
  "s-market": MarketScreen,
  "s-competitors": CompetitorsScreen,
  "s-facts": FactsScreen,
  "s-review": ReviewScreen,
  "s-questions": QuestionsScreen,
};

export const BAB2_SCREEN_IDS = Object.keys(BAB2_SCREENS).filter(
  (id): id is IntakeScreenId =>
    (INTAKE_SCREEN_ORDER as readonly string[]).includes(id),
);
