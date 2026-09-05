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
 *   add-lines, question edits, and the s-facts textarea.
 * - Validation per handoff (2026-09-05): s-market blocks until one reach
 *   is chosen (and ≥1 area when the reach is area-based); s-competitors
 *   requires ≥1 named competitor or the no-direct mode; s-facts /
 *   s-review / s-questions never block. The shell's stub gate stays
 *   permissive (Phase 5 wires real blocking via `nav.canContinue`).
 * - Funnel: screens emit only E5 (answer_corrected, count only) and E6
 *   (resumed, on draft-cache rehydrate). Payloads carry ids/counters
 *   only, never text.
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

/** Journey-level market skip removed (handoff 2026-09-05): s-market is
 *  always shown. Retained only as a deprecated no-op alias so the journey
 *  contract's older sections read clearly; always false. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isMarketSkippedFixture(_fixture: unknown): boolean {
  return false;
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
  /** Owning screen for the chevron correction link. */
  target: IntakeScreenId;
  advisory?: boolean;
};

export function deriveReviewRows(
  fixture: unknown,
  activeScreens?: readonly IntakeScreenId[],
): ReviewRow[] {
  const scopeLabels = selectedLabels(getFixtureScreen(fixture, "s-scope"));
  const branchLabels = selectedLabels(getFixtureScreen(fixture, "s-branch"));
  const productLabels = selectedLabels(getFixtureScreen(fixture, "s-product"));
  const categoryLabels = selectedLabels(
    getFixtureScreen(fixture, "s-category"),
  );
  const offeringLabels = selectedLabels(
    getFixtureScreen(fixture, "s-offerings"),
  );
  const customerLabels = selectedLabels(
    getFixtureScreen(fixture, "s-customers"),
  );
  const serviceLabels = selectedLabels(getFixtureScreen(fixture, "s-service"));
  const marketState = getFixtureScreen(fixture, "s-market");
  const competitorState = getFixtureScreen(fixture, "s-competitors");
  const factsState = getFixtureScreen(fixture, "s-facts");
  const reviewState = getFixtureScreen(fixture, "s-review");

  const active = (id: IntakeScreenId) =>
    activeScreens === undefined || activeScreens.includes(id);

  // Scope row: the committed scope choice label.
  const scopeValue = scopeLabels.length > 0 ? scopeLabels[0] : "Belum dipilih";

  // Target row: the conditional entity (branch or product) actually visited;
  // omitted entirely on whole-brand routes (handoff: omit inactive branches).
  const targetLabel =
    branchLabels.length > 0 ? branchLabels[0] : productLabels[0];
  const targetValue = targetLabel !== undefined ? targetLabel : "Belum dipilih";

  let marketValue: string;
  if (!marketState || marketState.selected.length === 0) {
    marketValue = "Belum dipilih";
  } else {
    const ids = marketState.selected;
    if (ids.some((id) => /luar|abroad|international/i.test(id))) {
      marketValue = "Indonesia dan luar negeri";
    } else if (ids.some((id) => /seluruh|nationwide|^all|national/i.test(id))) {
      marketValue = "Seluruh Indonesia";
    } else {
      const areas = selectedLabels(marketState).filter(
        (label) => !/^market (type|bound)/i.test(label),
      );
      const areaLabels = areas.filter(
        (label) =>
          label !== "Sekitar satu area" &&
          label !== "Beberapa area" &&
          label !== "Seluruh Indonesia" &&
          label !== "Indonesia dan luar negeri",
      );
      marketValue =
        areaLabels.length > 0
          ? `${areaLabels.join(", ")}`
          : (areas[0] ?? "Belum dipilih");
    }
  }

  let competitorValue: string;
  if (!competitorState || competitorState.selected.length === 0) {
    competitorValue = "Belum dikonfirmasi";
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
  const factsValue =
    factsText.trim().length > 0 ? factsText : "Tidak ditambahkan";

  const rows: ReviewRow[] = [
    {
      key: "brand",
      label: "Brand",
      value: brandRowValue(fixture),
      target: "s-brand",
    },
    {
      key: "scope",
      label: "Fokus audit",
      value: scopeValue,
      target: "s-scope",
    },
  ];
  if (active("s-branch") || active("s-product")) {
    rows.push({
      key: "target",
      label: "Target audit",
      value: targetValue,
      target: branchLabels.length > 0 ? "s-branch" : "s-product",
    });
  }
  rows.push(
    {
      key: "category",
      label: "Kategori",
      value: categoryLabels.length > 0 ? categoryLabels[0] : "Belum dipilih",
      target: "s-category",
    },
    {
      key: "offerings",
      label: "Produk dan layanan",
      value:
        offeringLabels.length > 0
          ? offeringLabels.join(", ")
          : "Belum dikonfirmasi",
      target: "s-offerings",
    },
    {
      key: "customers",
      label: "Alasan pelanggan",
      value:
        customerLabels.length > 0
          ? customerLabels.join(", ")
          : "Tidak ditambahkan",
      target: "s-customers",
    },
    {
      key: "service",
      label: "Cara layanan",
      value:
        serviceLabels.length > 0 ? serviceLabels.join(", ") : "Belum dipilih",
      target: "s-service",
    },
    { key: "market", label: "Pasar", value: marketValue, target: "s-market" },
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
  );

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

/** Meaning-level brand row value ("Kopi Sudut · kopisudut.id"). Reads the
 *  prepared brand card (label = name, detail = source) like BrandScreen;
 *  falls back to selected labels, then "Belum dipilih". */
function brandRowValue(fixture: unknown): string {
  const brand = getFixtureScreen(fixture, "s-brand");
  const card = brand?.prepared[0];
  if (card) {
    const source =
      typeof card.detail === "string" && card.detail.trim().length > 0
        ? ` · ${card.detail.trim()}`
        : "";
    return `${card.label}${source}`;
  }
  const selected = selectedLabels(brand);
  return selected.length > 0 ? selected[0] : "Belum dipilih";
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

/* ── s-market: single-select reach + conditional required area chips ── */

type MarketKind = "sekitar" | "beberapa" | "seluruh" | "luar";

const MARKET_OPTIONS: ReadonlyArray<{
  kind: MarketKind;
  glyph: string;
  title: string;
  description: string;
  reveals: boolean;
}> = [
  {
    kind: "sekitar",
    glyph: "⌖",
    title: "Sekitar satu area",
    description: "Pelanggan terutama datang dari satu kota atau area.",
    reveals: true,
  },
  {
    kind: "beberapa",
    glyph: "⌘",
    title: "Beberapa area",
    description: "Pelanggan berasal dari beberapa kota atau area tertentu.",
    reveals: true,
  },
  {
    kind: "seluruh",
    glyph: "▤",
    title: "Seluruh Indonesia",
    description: "Produk atau layanan tersedia secara nasional.",
    reveals: false,
  },
  {
    kind: "luar",
    glyph: "◎",
    title: "Indonesia dan luar negeri",
    description: "Pelanggan juga berada di negara lain.",
    reveals: false,
  },
];

function marketKindFromId(id: string): MarketKind | null {
  const lower = id.toLowerCase();
  if (/sekitar|nearby|lokasi/.test(lower)) return "sekitar";
  if (/beberapa|multi|kota|cities/.test(lower) && !/tambah/.test(lower))
    return "beberapa";
  if (/seluruh|nationwide|seluruh-indonesia|^all|national/.test(lower))
    return "seluruh";
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

/** Reach + areas both required for area-based reach (handoff: "required area
 *  selection where applicable"). Pure, unit-tested. */
export function isMarketAnswerValid(
  kind: MarketKind | null,
  areaCount: number,
): boolean {
  if (kind === null) return false;
  if (kind === "sekitar" || kind === "beberapa") return areaCount > 0;
  return true;
}

function MarketScreen({
  fixture,
  nav,
  emit,
  invalidAttempts,
}: IntakeScreenSlotProps) {
  const state = getFixtureScreen(fixture, "s-market");
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
    () => {
      const ids = seedCityIds(state);
      /* Sekitar is single-select (workbench): seed at most one area. */
      return seedMarketKind(state) === "sekitar" ? ids.slice(0, 1) : ids;
    },
    emit,
  );
  const [customCities, setCustomCities] = useDraftState<string[]>(
    "s-market",
    "custom-cities",
    () => [],
    emit,
  );

  const cityById = new Map(
    (state?.prepared ?? []).map((item) => [item.id, item.label]),
  );
  /* Candidate areas: fixture-prepared area chips plus the areas the user
   * already picked (prepared chips remain tappable options — workbench
   * behavior; they only show as removable once selected). */
  const allAreaIds = Array.from(
    new Set([
      ...(state?.prepared ?? [])
        .filter(
          (item) =>
            marketKindFromId(item.id) === null && !/^market-/.test(item.id),
        )
        .map((item) => item.id),
      ...cityIds,
    ]),
  );
  const reveal = kind === "sekitar" || kind === "beberapa";
  const singleArea = kind === "sekitar";
  const areaCount = cityIds.length + customCities.length;
  const valid = isMarketAnswerValid(kind, areaCount);

  /* Publish blocking validity to the shell gate (founder Gate 1 review
   * 2026-09-05): reach pick required; area-based reach also needs ≥1 area. */
  const publishValidity = nav?.onValidityChange;
  useEffect(() => {
    publishValidity?.(valid);
  }, [valid, publishValidity]);

  /* Workbench strings: panel heading + attempt error, per reach kind. */
  const panelHeading = singleArea
    ? "Pilih satu kota atau area"
    : "Pilih semua kota atau area";
  const areaErrorText = singleArea
    ? "Pilih satu kota atau area."
    : "Pilih setidaknya satu kota atau area.";
  const reachErrorText = "Pilih jangkauan utama untuk melanjutkan.";

  const toggleArea = (id: string) => {
    setCityIds(singleArea ? [id] : toggleId(cityIds, id));
    countCorrections();
  };

  return (
    <ScreenSection screenId="s-market" labelledBy="s-market-h">
      <Heading id="s-market-h">Di mana pelanggan Anda berada?</Heading>
      <Lead>Pilih jangkauan utama untuk audit ini.</Lead>
      <div
        role="radiogroup"
        aria-label="Di mana pelanggan Anda berada?"
        style={{ display: "grid", gap: "8px" }}
      >
        {MARKET_OPTIONS.map((option) => (
          <button
            key={option.kind}
            type="button"
            role="radio"
            aria-checked={kind === option.kind}
            onClick={() => {
              if (kind !== option.kind) countCorrections();
              setKind(option.kind);
              /* Reach change resets the area pick (workbench behavior):
               * sekitar re-picks one, beberapa re-picks many. */
              setCityIds([]);
            }}
            style={{
              minHeight: "44px",
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              textAlign: "left",
              padding: "12px 16px",
              fontSize: "16px",
              borderRadius: "12px",
              cursor: "pointer",
              background: "var(--bg-page, #ffffff)",
              border:
                kind === option.kind
                  ? "2px solid var(--action, #18181b)"
                  : "1px solid var(--border-default, #e5e7eb)",
              color: "var(--text-heading, #18181b)",
              transition: `border-color 150ms ${EASE}`,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontSize: "22px",
                lineHeight: 1,
                width: "32px",
                height: "32px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {option.glyph}
            </span>
            <span style={{ display: "grid", gap: "2px", flex: 1 }}>
              <span style={{ fontWeight: 600 }}>{option.title}</span>
              <span
                style={{
                  fontSize: "13px",
                  color: "var(--text-muted, #52525b)",
                }}
              >
                {option.description}
              </span>
            </span>
          </button>
        ))}
      </div>
      {reveal ? (
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
            {panelHeading}
          </h2>
          {/* Attempt-triggered inline error (workbench string). Hidden until
           * the first blocked Lanjut, so it never nags pre-interaction. */}
          {(invalidAttempts ?? 0) > 0 && !valid ? (
            <p
              role="alert"
              style={{
                margin: 0,
                fontSize: "13px",
                lineHeight: 1.5,
                color: "var(--text-danger, #b91c1c)",
                fontWeight: 600,
              }}
            >
              {areaErrorText}
            </p>
          ) : null}
          {allAreaIds.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {allAreaIds.map((id) => {
                const on = cityIds.includes(id);
                return (
                  <ToggleChip
                    key={id}
                    on={on}
                    onToggle={() => toggleArea(id)}
                    label={`Pilih ${cityById.get(id) ?? id}`}
                  >
                    {on ? (
                      <span
                        aria-hidden="true"
                        style={{ marginRight: "6px", fontWeight: 700 }}
                      >
                        ✓
                      </span>
                    ) : null}
                    {cityById.get(id) ?? id}
                  </ToggleChip>
                );
              })}
            </div>
          ) : null}
          {customCities.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
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
            id="s-market-area-add"
            placeholder="Tambah area lain"
            buttonLabel="Tambahkan"
            onAdd={(value) => {
              if (!customCities.includes(value)) {
                setCustomCities([...customCities, value]);
                countCorrections();
              }
            }}
          />
        </div>
      ) : null}
      {!reveal && (invalidAttempts ?? 0) > 0 && !valid ? (
        <p
          role="alert"
          style={{
            margin: 0,
            fontSize: "13px",
            lineHeight: 1.5,
            color: "var(--text-danger, #b91c1c)",
            fontWeight: 600,
          }}
        >
          {reachErrorText}
        </p>
      ) : null}
    </ScreenSection>
  );
}

/* ── s-competitors (checkbox names + add + no-direct-competitor mode) ── */

function CompetitorsScreen({
  fixture,
  nav,
  emit,
  invalidAttempts,
}: IntakeScreenSlotProps) {
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

  /* Blocking gate (founder Gate 1 review 2026-09-05, workbench string):
   * ≥1 competitor or the no-direct acknowledgment before Continue. */
  const valid = keptIds.length + custom.length > 0 || noDirect;
  const publishValidity = nav?.onValidityChange;
  useEffect(() => {
    publishValidity?.(valid);
  }, [valid, publishValidity]);
  const competitorErrorText =
    'Pilih setidaknya satu bisnis, atau pilih "Tidak ada pesaing langsung".';

  const rows = (state?.prepared ?? [])
    .filter((item) => /^competitor/i.test(item.id))
    // Names only: descriptions never render (handoff 2026-09-05).
    .map((item) => ({ id: item.id, label: item.label }));

  const renderRow = (
    label: string,
    kept: boolean,
    onToggle: () => void,
    key: string,
  ) => (
    <li key={key}>
      <button
        type="button"
        role="checkbox"
        aria-checked={kept}
        disabled={noDirect}
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          width: "100%",
          textAlign: "left",
          minHeight: "44px",
          padding: "10px 16px",
          fontSize: "15px",
          borderRadius: "12px",
          cursor: noDirect ? "not-allowed" : "pointer",
          background: "var(--bg-page, #ffffff)",
          border: kept
            ? "1px solid var(--action, #18181b)"
            : "1px solid var(--border-default, #e5e7eb)",
          color: "var(--text-heading, #18181b)",
          opacity: noDirect ? 0.5 : 1,
        }}
      >
        <span>{label}</span>
        <span
          aria-hidden="true"
          style={{
            width: "24px",
            height: "24px",
            flexShrink: 0,
            borderRadius: "6px",
            border: kept
              ? "2px solid var(--action, #18181b)"
              : "1px solid var(--border-strong, #d1d5db)",
            background: kept
              ? "var(--action, #18181b)"
              : "var(--bg-page, #ffffff)",
            color: "var(--action-foreground, #ffffff)",
            fontSize: "14px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {kept ? "✓" : ""}
        </span>
      </button>
    </li>
  );

  return (
    <ScreenSection screenId="s-competitors" labelledBy="s-competitors-h">
      <Heading id="s-competitors-h">
        Bisnis apa yang menjadi alternatif bagi pelanggan Anda?
      </Heading>
      <Lead>
        {thin
          ? "Nuave belum menemukan pembanding dari sumber Anda. Ini pembanding yang umum untuk kategori Anda. Pilih yang relevan atau tambah sendiri."
          : "Pilih bisnis yang dipertimbangkan pelanggan untuk kebutuhan yang sama. Nuave akan menggunakannya untuk menguji perbandingan."}
      </Lead>
      {(invalidAttempts ?? 0) > 0 && !valid ? (
        <p
          role="alert"
          style={{
            margin: 0,
            fontSize: "13px",
            lineHeight: 1.5,
            color: "var(--text-danger, #b91c1c)",
            fontWeight: 600,
          }}
        >
          {competitorErrorText}
        </p>
      ) : null}
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
          {rows.map((row) =>
            renderRow(
              row.label,
              keptIds.includes(row.id),
              () => {
                setKeptIds(toggleId(keptIds, row.id));
                countCorrections();
              },
              row.id,
            ),
          )}
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
          {custom.map((name) =>
            renderRow(
              name,
              true,
              () => {
                setCustom(custom.filter((entry) => entry !== name));
                countCorrections();
              },
              `custom-${name}`,
            ),
          )}
        </ul>
      ) : null}
      <AddLine
        id="s-competitors-add"
        placeholder="Tambah bisnis lain"
        buttonLabel="Tambahkan"
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
          aria-hidden="true"
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
        Apa yang tidak boleh Nuave salah pahami?
        <Pill>Opsional</Pill>
      </Heading>
      <Lead>
        Tambahkan satu fakta publik yang dapat memengaruhi hasil audit, seperti
        harga, sertifikasi, wilayah layanan, atau istilah khusus. Kosongkan jika
        tidak ada.
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
          Satu fakta yang wajib benar
        </label>
        <textarea
          id="s-facts-text"
          value={text}
          aria-describedby={flagged ? SENSITIVE_NOTICE_ID : "s-facts-hint"}
          aria-invalid={flagged}
          placeholder="Misalnya: harga tertentu, sertifikasi halal, wilayah layanan, atau istilah khas yang sering keliru."
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
            Jangan masukkan data pribadi, informasi pembayaran, atau rahasia
            bisnis. Hapus bagian itu dan tulis fakta bisnis yang boleh dipahami
            AI.
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
          Jangan masukkan data pribadi, informasi pembayaran, atau rahasia
          bisnis.
        </p>
      </div>
    </ScreenSection>
  );
}

/* ── s-review (workbench: full-width chevron rows, no Ubah links) ── */

function ReviewScreen({
  fixture,
  nav,
  emit,
  activeScreens,
}: IntakeScreenSlotProps) {
  const rows = deriveReviewRows(fixture, activeScreens);
  const countCorrections = useCorrectionCounter("s-review", emit);

  const correctAndJump = (target: IntakeScreenId) => () => {
    countCorrections();
    if (nav.onGotoScreen) {
      nav.onGotoScreen(target);
      return;
    }
    nav.onBack();
  };

  return (
    <ScreenSection screenId="s-review" labelledBy="s-review-h">
      <Heading id="s-review-h">Konfirmasi informasi brand Anda</Heading>
      <Lead>
        Pastikan informasi ini sudah tepat sebelum Nuave menyusun pertanyaan
        audit.
      </Lead>
      <dl style={{ margin: 0, display: "grid", gap: "8px" }}>
        {rows.map((row) => (
          <button
            key={row.key}
            type="button"
            data-correction-target={row.target}
            aria-label={`Ubah ${row.label}`}
            onClick={correctAndJump(row.target)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              width: "100%",
              textAlign: "left",
              minHeight: "44px",
              padding: "14px 0",
              borderTop: "1px solid var(--border-default, #e5e7eb)",
              background: "transparent",
              borderLeft: "none",
              borderRight: "none",
              borderBottom: "none",
              cursor: "pointer",
            }}
          >
            <span style={{ display: "grid", gap: "4px" }}>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--text-muted, #52525b)",
                }}
              >
                {row.label}
              </span>
              <span
                style={{
                  fontSize: "15px",
                  lineHeight: 1.6,
                  color: "var(--text-heading, #18181b)",
                }}
              >
                {row.value}
              </span>
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
            </span>
            <span
              aria-hidden="true"
              style={{
                fontSize: "20px",
                color: "var(--text-muted, #52525b)",
                flexShrink: 0,
              }}
            >
              ›
            </span>
          </button>
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
