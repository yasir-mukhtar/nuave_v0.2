"use client";

import { useEffect, useId, useRef, useState } from "react";
import type {
  FixtureScreenState,
  IntakeFixture,
  PreparedItem,
} from "./fixtures";
import type {
  IntakeFunnelEmit,
  IntakeScopeChoice,
  IntakeScreenSlot,
  IntakeScreenSlotProps,
} from "./navigation";
import type { IntakeScreenId } from "./screens";
import {
  addMultiCustom,
  addSingleCustom,
  isScreenAnswerValid,
  resetBrandFixDraft,
  scopeKindOfOptionId,
  setBrandFixDraft,
  setCategoryAnswer,
  setCategoryCustom,
  setScopeAnswer,
  setSingleAnswer,
  toggleMultiAnswer,
  toggleServiceChannel,
  useIntakeAnswers,
} from "./state";

/**
 * Bab 0-1 intake screens (wave-2 content worker: s-crawl … s-customers).
 *
 * Authority: docs/drafts/INTAKE_EXPERIENCE_CONTRACT.md §2 (ledger rows),
 * §4 (the closed 5 archetypes — no sixth is introduced here), §6.4 (copy
 * deck: every visible Indonesian string below comes from that deck; the only
 * interpolations are data slots such as counts and fixture labels), and
 * docs/drafts/INTAKE_FIXTURES_AND_BUDGETS.md (F1 rich primary, funnel §2).
 *
 * Fixture contract: prepared values come from the `fixture` slot prop. When
 * it matches the pinned `IntakeFixture` shape
 * (`{ screens: Record<screenId, { prepared, selected, note? }>, entry }`)
 * the screen reads `screens[screenId]`; anything else (e.g. the shell stub
 * `{ entry, scope, brandNeedsFix, marketSkipped }`) renders as empty
 * prepared. Empty prepared never renders a blank form: each screen keeps its
 * archetype with tap-to-add suggestions or its add-line.
 *
 * Navigation contract: screens never render their own Kembali/Lanjut — the
 * shell owns the sticky bar. Screens (a) publish blocking validity by
 * assigning `nav.canContinue` during render (the orchestrator wrapper
 * re-reads it; the optional `onValidityChange` callback covers wrappers that
 * lift validity into state), and (b) call `nav.onContinue` only where the
 * ledger demands immediate routing (s-brand rejection → s-brand-fix,
 * s-brand-fix submit → re-read, s-crawl failure exits). The shell emits
 * `intake_continued` on those transitions; screens emit
 * `intake_answer_corrected` (count only) and `intake_validation_failed`
 * (blocking screens only) directly.
 *
 * The scope XOR (brand → neither, cabang → s-branch, produk → s-product) is
 * owned by the journey graph (`resolveJourneyPath`); these screens implement
 * the three decision surfaces, exactly one of which is ever on a path.
 */

export type BabScreenProps = IntakeScreenSlotProps & {
  /** Optional validity lift for orchestrator wrappers (in addition to `nav.canContinue`). */
  onValidityChange?: (valid: boolean) => void;
};

/* ── Fixture reading ─────────────────────────────────────────────── */

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

/* ── Deck copy for scope options (ids → settled titles/descriptions) ── */

const SCOPE_DECK: Record<
  string,
  { glyph: string; title: string; description: string }
> = {
  "scope-whole-brand": {
    glyph: "✺",
    // Deck: "Seluruh brand <nama>" — the brand-name slot has no fixture
    // source at wave-2 build time, so the slot is omitted, never invented.
    title: "Brand secara keseluruhan",
    description: "Semua lokasi, produk, dan layanan sebagai satu kesatuan.",
  },
  "scope-branch": {
    glyph: "⌖",
    title: "Satu lokasi",
    description: "Satu gerai atau cabang tertentu.",
  },
  "scope-product": {
    glyph: "▣",
    title: "Satu produk atau layanan",
    description: "Satu produk, layanan, atau lini tertentu.",
  },
};

function scopeDeckFor(item: PreparedItem): {
  glyph: string;
  title: string;
  description: string;
} {
  return (
    SCOPE_DECK[item.id] ?? {
      glyph: "•",
      title: item.label,
      description: "",
    }
  );
}

/**
 * Manual-path fallback: when no scope options were prepared at all, keep the
 * A2 archetype with the two always-available options instead of a blank form.
 */
function fallbackScopeOptions(): PreparedItem[] {
  /* All three founder-locked scope choices stay reachable even when no
   * options were prepared (founder Gate 1 review 2026-09-05: Satu lokasi
   * must branch to the location pick). */
  return [
    { id: "scope-whole-brand", label: "Seluruh brand", on: false },
    { id: "scope-branch", label: "Satu lokasi", on: false },
    { id: "scope-product", label: "Satu produk atau layanan", on: false },
  ];
}

/* ── Shared presentation (shell grammar: 560px column, 44px+ targets) ── */

const BAB1_STYLE = `
[data-bab1] :focus-visible{outline:2px solid var(--action,#18181b);outline-offset:2px;box-shadow:0 0 0 4px rgba(24,24,27,.15)}
[data-bab1] button,[data-bab1] input,[data-bab1] [role="radio"],[data-bab1] summary{transition:background-color 150ms ease-out,color 150ms ease-out,border-color 150ms ease-out}
@media (min-width:640px){[data-bab1-h1]{font-size:24px !important}}
@media (prefers-reduced-motion: reduce){[data-bab1] *,[data-bab1] *::before,[data-bab1] *::after{animation:none !important;transition:none !important;scroll-behavior:auto !important}}
`;

function BabStyles() {
  return <style>{BAB1_STYLE}</style>;
}

const h1Style: React.CSSProperties = {
  margin: 0,
  fontSize: "20px",
  lineHeight: 1.3,
  letterSpacing: "-0.01em",
  color: "var(--text-heading, #18181b)",
};

const leadStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "15px",
  lineHeight: 1.6,
  color: "var(--text-body, #3f3f46)",
};

const hintStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "13px",
  lineHeight: 1.5,
  color: "var(--text-muted, #52525b)",
};

const cardButtonBase: React.CSSProperties = {
  minHeight: "44px",
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  textAlign: "left",
  padding: "12px 16px",
  fontSize: "16px",
  borderRadius: "12px",
  border: "1px solid var(--border-default, #e5e7eb)",
  background: "var(--bg-surface, #ffffff)",
  color: "var(--text-heading, #18181b)",
  cursor: "pointer",
};

const addInputStyle: React.CSSProperties = {
  minHeight: "48px",
  flex: 1,
  fontSize: "16px",
  padding: "10px 14px",
  borderRadius: "12px",
  border: "1px solid var(--border-default, #e5e7eb)",
  background: "var(--bg-surface, #ffffff)",
  color: "var(--text-heading, #18181b)",
};

const addButtonStyle: React.CSSProperties = {
  minHeight: "48px",
  padding: "10px 20px",
  fontSize: "16px",
  fontWeight: 600,
  borderRadius: "999px",
  border: "1px solid var(--action, #18181b)",
  background: "transparent",
  color: "var(--text-heading, #18181b)",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

function chipStyle(on: boolean): React.CSSProperties {
  return {
    minHeight: "44px",
    minWidth: "44px",
    padding: "10px 18px",
    fontSize: "15px",
    lineHeight: 1.4,
    borderRadius: "999px",
    border: `1px solid ${on ? "var(--action, #18181b)" : "var(--border-default, #e5e7eb)"}`,
    background: on ? "var(--action, #18181b)" : "transparent",
    color: on
      ? "var(--action-foreground, #ffffff)"
      : "var(--text-body, #3f3f46)",
    cursor: "pointer",
  };
}

function ScreenSection({
  labelledBy,
  children,
}: {
  labelledBy: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-bab1=""
      aria-labelledby={labelledBy}
      style={{ display: "grid", gap: "16px" }}
    >
      <BabStyles />
      {children}
    </section>
  );
}

/* ── Validity + funnel wiring ──────────────────────────────── */

/**
 * Publish blocking validity to the shell gate (founder Gate 1 review
 * 2026-09-05). The nav slot object is shell-owned and never mutated during
 * render; validity fires through `nav.onValidityChange` from an effect.
 */
function useBabValidity(
  valid: boolean,
  nav: BabScreenProps["nav"],
  onValidityChange?: (valid: boolean) => void,
) {
  void nav;
  const publish = nav.onValidityChange ?? onValidityChange;
  useEffect(() => {
    publish?.(valid);
  }, [publish, valid]);
}

/**
 * Correction counter: emits `intake_answer_corrected` with counts only —
 * never what changed, never answer text.
 */
function useBabCorrections(screenId: IntakeScreenId, emit: IntakeFunnelEmit) {
  const countRef = useRef(0);
  return () => {
    countRef.current += 1;
    emit({
      event: "intake_answer_corrected",
      screenId,
      correctionCount: countRef.current,
    });
  };
}

/**
 * Add-line hook: shared tap-to-add behavior with empty-submit handling.
 * A blocked (empty) submit reuses the screen's own deck hint/lead as the
 * message — no new wording — associates it via aria-describedby, moves
 * focus to it, and emits `intake_validation_failed` (counts only).
 */
function useBabAddLine({
  screenId,
  emit,
  prefix,
  guidance,
  store,
}: {
  screenId: IntakeScreenId;
  emit: IntakeFunnelEmit;
  prefix: string;
  guidance: string;
  /**
   * Shell-state backing for user-added rows (Phase 5): when present, added
   * rows commit into shared answers (Back-safe); otherwise they stay local
   * exactly as before.
   */
  store?: {
    items: PreparedItem[];
    push: (item: PreparedItem) => void;
  };
}) {
  const [value, setValue] = useState("");
  const [custom, setCustom] = useState<PreparedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const hintId = useId();
  const errorRef = useRef<HTMLParagraphElement | null>(null);

  const submit = (onAdd: (item: PreparedItem) => void): boolean => {
    const label = value.trim();
    if (label.length === 0) {
      setError(guidance);
      emit({ event: "intake_validation_failed", screenId });
      errorRef.current?.focus();
      return false;
    }
    if (store !== undefined) {
      const item: PreparedItem = {
        id: `${prefix}-custom-${store.items.length + 1}`,
        label,
        on: true,
      };
      store.push(item);
      onAdd(item);
      setValue("");
      setError(null);
      return true;
    }
    const next = addCustomItem(custom, label, prefix);
    setCustom(next.items);
    onAdd(next.items[next.items.length - 1]);
    setValue("");
    setError(null);
    return true;
  };

  return {
    value,
    setValue,
    custom,
    error,
    errorId,
    hintId,
    errorRef,
    guidance,
    submit,
  };
}

function AddLineError({
  error,
  errorId,
  errorRef,
}: {
  error: string | null;
  errorId: string;
  errorRef: React.RefObject<HTMLParagraphElement | null>;
}) {
  if (error === null) return null;
  return (
    <p
      ref={errorRef}
      id={errorId}
      role="alert"
      tabIndex={-1}
      style={{
        margin: 0,
        fontSize: "14px",
        lineHeight: 1.5,
        color: "var(--text-heading, #18181b)",
        outline: "none",
      }}
    >
      {error}
    </p>
  );
}

function BabAddLine({
  screenId,
  emit,
  prefix,
  placeholder,
  hint,
  buttonLabel,
  inputLabel,
  onAdd,
  addLine,
}: {
  screenId: IntakeScreenId;
  emit: IntakeFunnelEmit;
  prefix: string;
  placeholder: string;
  hint: string;
  buttonLabel: string;
  inputLabel: string;
  onAdd: (item: PreparedItem) => void;
  addLine: ReturnType<typeof useBabAddLine>;
}) {
  const reportCorrection = useBabCorrections(screenId, emit);
  const inputId = useId();
  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
        <label
          htmlFor={inputId}
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            whiteSpace: "nowrap",
          }}
        >
          {inputLabel}
        </label>
        <input
          id={inputId}
          type="text"
          value={addLine.value}
          placeholder={placeholder}
          autoComplete="off"
          aria-invalid={addLine.error !== null}
          aria-describedby={
            addLine.error !== null ? addLine.errorId : addLine.hintId
          }
          onChange={(event) => {
            addLine.setValue(event.target.value);
            if (addLine.error !== null) addLine.submit(() => {});
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (addLine.submit(onAdd)) reportCorrection();
            }
          }}
          style={addInputStyle}
        />
        <button
          type="button"
          onClick={() => {
            if (addLine.submit(onAdd)) reportCorrection();
          }}
          style={addButtonStyle}
        >
          {buttonLabel}
        </button>
      </div>
      <p id={addLine.hintId} style={hintStyle}>
        {hint}
      </p>
      <AddLineError
        error={addLine.error}
        errorId={addLine.errorId}
        errorRef={addLine.errorRef}
      />
    </div>
  );
}

/* ── s-crawl: Membaca (read-before-ask system status) ───────── */

/**
 * s-crawl fixture note says whether preparation failed (F6). On success the
 * shell auto-advances to s-brand; on failure this screen stops with
 * "Coba lagi" + "Ubah sumber" and never fabricates a brand preview.
 */
function resolveCrawlFailureNote(note?: string): boolean {
  return note !== undefined && /fail/i.test(note);
}

function CrawlScreen({ fixture, nav, emit }: BabScreenProps) {
  const state = readScreenState(fixture, "s-crawl");
  const failed = resolveCrawlFailureNote(state.note);
  const [attempt, setAttempt] = useState(1);
  const [retrying, setRetrying] = useState(false);
  useBabValidity(true, nav);
  const headingId = useId();

  // One visible re-read pass on retry (F6 recovery: ceiling is 2 attempts).
  useEffect(() => {
    if (!retrying) return;
    const timer = setTimeout(() => setRetrying(false), 1200);
    return () => clearTimeout(timer);
  }, [retrying]);

  const steps = [
    "Membaca sumber Anda",
    "Mengenali produk dan lokasi",
    "Menyiapkan perkiraan pelanggan dan pesaing",
  ];
  // No artificial delay on the success path: the real preparation latency is
  // what paces this screen. The staged list reads "in progress" while the
  // step state is not terminal.

  return (
    <ScreenSection labelledBy={headingId}>
      <h1 id={headingId} data-bab1-h1="" style={h1Style}>
        Kami sedang mengenali bisnis Anda
      </h1>
      {failed && !retrying ? (
        <div
          role="alert"
          aria-live="assertive"
          style={{ display: "grid", gap: "12px" }}
        >
          <p style={leadStyle}>
            Kami belum berhasil membaca sumber Anda. Silakan coba sekali lagi
            atau ubah sumber.
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {attempt < 2 ? (
              <button
                type="button"
                onClick={() => {
                  setAttempt(attempt + 1);
                  setRetrying(true);
                }}
                style={fixPrimaryStyle}
              >
                Coba lagi
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                emit({ event: "intake_answer_corrected", screenId: "s-crawl" });
                // "Ubah sumber" walks Back to the correction/source surface
                // (s-brand-fix on fix paths; the pre-payment source surface
                // is out of rebuild scope, so Back is the honest exit).
                nav.onBack();
              }}
              style={fixGhostStyle}
            >
              Ubah sumber
            </button>
          </div>
        </div>
      ) : (
        <ol
          role="status"
          aria-live="polite"
          aria-label="Kemajuan persiapan"
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gap: "10px",
          }}
        >
          {steps.map((step, index) => (
            <li
              key={step}
              aria-current={index === 0 ? "step" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "15px",
                color: "var(--text-body, #3f3f46)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "999px",
                  border: "1px solid var(--border-strong, #d4d4d8)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                }}
              >
                {index === 0 ? "…" : ""}
              </span>
              {step}
            </li>
          ))}
        </ol>
      )}
      <p style={leadStyle}>
        Nanti Anda bisa memeriksa dan memperbaiki hasilnya.
      </p>
      <span style={{ display: "none" }}>{emit !== undefined ? "" : ""}</span>
    </ScreenSection>
  );
}

/* ── s-brand: Konfirmasi (Editorial) ───────────────────────── */

function initialsFor(label: string): string {
  const letters = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "•";
}

/**
 * Structured brand card from the fixture s-brand state:
 * prepared[0] = { label: brand name, detail: source }; the note carries
 * "INITIALS::description" (descriptions are source-derived; omitted when
 * unreliable — the UI never invents one).
 */
function readBrandCard(state: FixtureScreenState): {
  name: string;
  initials: string;
  source: string;
  description: string;
} | null {
  const first = state.prepared[0];
  if (!first) return null;
  const noteParts = (state.note ?? "").split("::");
  return {
    name: first.label,
    source: first.detail ?? "",
    initials: noteParts[0]?.trim() || initialsFor(first.label),
    description: noteParts.slice(1).join("::").trim(),
  };
}

function BrandScreen({
  screenId,
  fixture,
  nav,
  answers: answersProp,
  updateAnswer,
}: BabScreenProps) {
  void screenId;
  const [answers] = useIntakeAnswers(fixture, answersProp, updateAnswer);
  const state = readScreenState(fixture, "s-brand");
  const card = readBrandCard(state);
  const fix = readFixPrefill(readScreenState(fixture, "s-brand-fix"), fixture);
  // Skeleton bridge for the correction loop: when a correction is present
  // (fix-name filled), the confirmed card is the corrected business. The
  // real fact-version state arrives with IntakeState (Phase 5); this keeps
  // the F4 wrong-identity walk truthful until then.
  const committedFix = answers.brandCorrected;
  const resolvedCard =
    card === null
      ? null
      : committedFix !== null
        ? { ...card, name: committedFix.name, source: committedFix.source }
        : fix.name !== ""
          ? { ...card, name: fix.name, source: fix.source }
          : card;
  // Editorial Konfirmasi: the card is the focal point; the sticky "Lanjut"
  // implicitly confirms. No Yes/No choice exists on this screen.
  useBabValidity(true, nav);
  const headingId = useId();

  const openCorrection = () => {
    if (nav.onGotoScreen) nav.onGotoScreen("s-brand-fix");
  };

  return (
    <ScreenSection labelledBy={headingId}>
      {resolvedCard !== null ? (
        <div
          style={{
            display: "grid",
            gap: "16px",
            padding: "24px 16px",
            borderRadius: "20px",
            border: "1px solid var(--border-default, #e5e7eb)",
            background: "var(--bg-surface, #ffffff)",
            boxShadow: "0 1px 2px rgba(24,24,27,.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span
              aria-hidden="true"
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "20px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                fontWeight: 700,
                background: "var(--bg-muted, #f4f4f5)",
                color: "var(--text-heading, #18181b)",
              }}
            >
              {resolvedCard.initials}
            </span>
            <button
              type="button"
              onClick={openCorrection}
              style={{
                alignSelf: "flex-start",
                minHeight: "44px",
                padding: "6px 12px",
                fontSize: "15px",
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
          </div>
          <h1
            id={headingId}
            data-bab1-h1=""
            style={{ ...h1Style, fontSize: "28px", lineHeight: 1.15 }}
          >
            {resolvedCard.name}
          </h1>
          {resolvedCard.source !== "" ? (
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "var(--text-muted, #52525b)",
              }}
            >
              {resolvedCard.source}
            </p>
          ) : null}
          {resolvedCard.description !== "" ? (
            <p style={{ margin: 0, fontSize: "16px", lineHeight: 1.5 }}>
              {resolvedCard.description}
            </p>
          ) : null}
        </div>
      ) : (
        // Empty-prepared state keeps the same archetype: initials + hint
        // that a card will appear once preparation lands. Never a blank form.
        <div style={{ display: "grid", gap: "12px" }}>
          <span
            aria-hidden="true"
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "20px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              fontWeight: 700,
              background: "var(--bg-muted, #f4f4f5)",
              color: "var(--text-muted, #52525b)",
            }}
          >
            ?
          </span>
          <h1 id={headingId} data-bab1-h1="" style={h1Style}>
            Brand Anda
          </h1>
          <p style={leadStyle}>
            Kartu brand muncul setelah Nuave selesai membaca sumber Anda.
          </p>
        </div>
      )}
      <p
        aria-hidden="true"
        style={{
          margin: 0,
          fontSize: "12px",
          color: "var(--text-muted, #52525b)",
        }}
      >
        Lanjut untuk memakai brand ini
      </p>
    </ScreenSection>
  );
}

/* ── s-brand-fix: Koreksi (prefilled, Batal / Periksa lagi) ── */

const fixPrimaryStyle: React.CSSProperties = {
  minHeight: "48px",
  padding: "0 20px",
  fontSize: "16px",
  fontWeight: 600,
  borderRadius: "999px",
  border: "1px solid var(--action, #18181b)",
  cursor: "pointer",
  background: "var(--action, #18181b)",
  color: "var(--action-foreground, #ffffff)",
};

const fixGhostStyle: React.CSSProperties = {
  minHeight: "48px",
  padding: "0 16px",
  fontSize: "16px",
  fontWeight: 600,
  borderRadius: "999px",
  border: "1px solid var(--border-default, #e5e7eb)",
  cursor: "pointer",
  background: "transparent",
  color: "var(--text-heading, #18181b)",
};

/** s-brand-fix prefill derives from the fixture's own s-brand card (the
 *  correction target) plus its explicit fix-name override when present. */
function readFixPrefill(
  state: FixtureScreenState,
  fixture: unknown,
): {
  name: string;
  source: string;
} {
  const byId = new Map(state.prepared.map((item) => [item.id, item]));
  const brand = readScreenState(fixture, "s-brand");
  const card = readBrandCard(brand);
  const fixName = byId.get("fix-name")?.label?.trim();
  const fixSourceRaw = byId.get("fix-source");
  const fixSource = (fixSourceRaw?.detail ?? fixSourceRaw?.label ?? "").trim();
  return {
    name:
      fixName !== undefined && fixName !== "" ? fixName : (card?.name ?? ""),
    source: fixSource !== "" ? fixSource : (card?.source ?? ""),
  };
}

function BrandFixScreen({
  screenId,
  fixture,
  nav,
  emit,
  answers: answersProp,
  updateAnswer: updateAnswerProp,
}: BabScreenProps) {
  const [answers, updateAnswer] = useIntakeAnswers(
    fixture,
    answersProp,
    updateAnswerProp,
  );
  /* Staged correction draft (journey §8.1.4): uncommitted until Periksa
   * lagi; Batal drops it. Draft lives in shell state so the blocking gate
   * reads the same value the fields show. */
  const draft = answers.brandFixDraft;
  const name = draft.name;
  const source = draft.source;
  const setName = (value: string) =>
    updateAnswer((prev) =>
      setBrandFixDraft(prev, {
        name: value,
        source: prev.brandFixDraft.source,
      }),
    );
  const setSource = (value: string) =>
    updateAnswer((prev) =>
      setBrandFixDraft(prev, { name: prev.brandFixDraft.name, source: value }),
    );
  const [touched, setTouched] = useState(false);
  const reportCorrection = useBabCorrections(screenId, emit);
  const valid = isBrandFixValid(name);
  useBabValidity(valid, nav);
  const headingId = useId();
  const nameId = useId();
  const sourceId = useId();
  const errorId = useId();
  const nameRef = useRef<HTMLInputElement | null>(null);

  const submit = () => {
    setTouched(true);
    if (!isBrandFixValid(name)) {
      nameRef.current?.focus();
      emit({ event: "intake_validation_failed", screenId });
      return;
    }
    reportCorrection();
    // "Periksa lagi": re-read → s-crawl → refreshed card. On the resolved
    // fix path the next screen IS s-crawl; goto keeps it honest elsewhere.
    nav.onContinue();
  };

  return (
    <ScreenSection labelledBy={headingId}>
      <h1 id={headingId} data-bab1-h1="" style={h1Style}>
        Perbaiki brand
      </h1>
      <p style={leadStyle}>Ubah nama atau sumber jika hasilnya belum tepat.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        style={{ display: "grid", gap: "14px" }}
      >
        <div style={{ display: "grid", gap: "6px" }}>
          <label htmlFor={nameId} style={fixLabelStyle}>
            Nama brand
          </label>
          <input
            ref={nameRef}
            id={nameId}
            type="text"
            value={name}
            autoComplete="organization"
            aria-required="true"
            aria-invalid={touched && !valid}
            aria-describedby={touched && !valid ? errorId : undefined}
            onChange={(event) => setName(event.target.value)}
            style={{
              ...addInputStyle,
              flex: "none",
              width: "100%",
              borderColor:
                touched && !valid ? "var(--status-error, #dc2626)" : undefined,
            }}
          />
          {touched && !valid ? (
            <p
              id={errorId}
              role="alert"
              style={{
                margin: 0,
                fontSize: "14px",
                color: "var(--status-error, #dc2626)",
              }}
            >
              Nama brand wajib diisi.
            </p>
          ) : null}
        </div>
        <div style={{ display: "grid", gap: "6px" }}>
          <label htmlFor={sourceId} style={fixLabelStyle}>
            Sumber bisnis
          </label>
          <input
            id={sourceId}
            type="text"
            value={source}
            autoComplete="url"
            onChange={(event) => setSource(event.target.value)}
            style={{ ...addInputStyle, flex: "none", width: "100%" }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            marginTop: "8px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              // "Batal" returns to Konfirmasi (the card) without changes:
              // the staged draft is dropped, never committed.
              updateAnswer((prev) => resetBrandFixDraft(prev, fixture));
              if (nav.onGotoScreen) nav.onGotoScreen("s-brand");
              else nav.onBack();
            }}
            style={fixGhostStyle}
          >
            Batal
          </button>
          <button type="submit" style={fixPrimaryStyle}>
            Periksa lagi
          </button>
        </div>
      </form>
    </ScreenSection>
  );
}

const fixLabelStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--text-heading, #18181b)",
};

/* ── s-scope: A2 choose what to audit ──────────────────────── */

function ScopeScreen({
  screenId,
  fixture,
  nav,
  emit,
  answers: answersProp,
  updateAnswer: updateAnswerProp,
}: BabScreenProps) {
  const [answers, updateAnswer] = useIntakeAnswers(
    fixture,
    answersProp,
    updateAnswerProp,
  );
  const state = readScreenState(fixture, "s-scope");
  /* Fixed single-select (handoff 2026-09-05): the three scope choices are
   * always offered regardless of what the source prepared; a prepared
   * option may preselect its canonical id. Order: brand, lokasi, produk. */
  const CANONICAL_SCOPE_IDS = [
    "scope-whole-brand",
    "scope-branch",
    "scope-product",
  ] as const;
  const options: PreparedItem[] =
    state.prepared.length === 0
      ? fallbackScopeOptions()
      : CANONICAL_SCOPE_IDS.map((id) => {
          const prepared = state.prepared.find((p) => p.id === id);
          return {
            id,
            label: prepared?.label ?? "",
            on: prepared?.on ?? false,
          };
        });
  const selectedId = answers.scopeOptionId;
  const initialRef = useRef(selectedId);
  const reportCorrection = useBabCorrections(screenId, emit);
  useBabValidity(isScreenAnswerValid("s-scope", answers), nav);
  const headingId = useId();

  /* scope-option id → journey scope answer (handoff locked routes). */
  const scopeOf = (id: string): IntakeScopeChoice | null =>
    scopeKindOfOptionId(id);

  return (
    <ScreenSection labelledBy={headingId}>
      <h1 id={headingId} data-bab1-h1="" style={h1Style}>
        Apa fokus audit ini?
      </h1>
      <div
        role="radiogroup"
        aria-label="Pilihan cakupan audit"
        style={{ display: "grid", gap: "8px" }}
      >
        {options.map((item) => {
          const deck = scopeDeckFor(item);
          const checked = selectedId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => {
                updateAnswer((prev) => setScopeAnswer(prev, item.id));
                if (initialRef.current !== item.id) reportCorrection();
                /* Founder Gate 1 review 2026-09-05: the pick re-resolves the
                 * route (Satu lokasi → s-branch, Satu produk → s-product). */
                const scope = scopeOf(item.id);
                if (scope !== null && nav.onScopeChoice)
                  nav.onScopeChoice(scope);
              }}
              style={{
                ...cardButtonBase,
                borderColor: checked
                  ? "var(--action, #18181b)"
                  : "var(--border-default, #e5e7eb)",
                borderWidth: checked ? "2px" : "1px",
                alignItems: "flex-start",
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
                  color: "var(--text-heading, #18181b)",
                }}
              >
                {deck.glyph}
              </span>
              <span style={{ display: "grid", gap: "2px", flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{deck.title}</span>
                {deck.description !== "" ? (
                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--text-muted, #52525b)",
                    }}
                  >
                    {deck.description}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </ScreenSection>
  );
}

/* ── s-branch / s-product: A2 + add (conditional entity screens) ── */

function EntityScreen({
  screenId,
  fixture,
  nav,
  emit,
  heading,
  placeholder,
  hint,
  inputLabel,
  prefix,
  answers: answersProp,
  updateAnswer: updateAnswerProp,
}: BabScreenProps & {
  heading: string;
  placeholder: string;
  hint: string;
  inputLabel: string;
  prefix: string;
}) {
  const [answers, updateAnswer] = useIntakeAnswers(
    fixture,
    answersProp,
    updateAnswerProp,
  );
  const entityKey = screenId === "s-product" ? "product" : "branch";
  const entity = answers[entityKey];
  const selectedId = entity.selectedId;
  const state = readScreenState(fixture, screenId);
  const reportCorrection = useBabCorrections(screenId, emit);
  useBabValidity(isScreenAnswerValid(screenId, answers), nav);
  const addLine = useBabAddLine({
    screenId,
    emit,
    prefix,
    guidance: hint,
    store: {
      items: entity.custom,
      push: (item) =>
        updateAnswer((prev) => addSingleCustom(prev, entityKey, item)),
    },
  });
  const headingId = useId();
  const rows = [...state.prepared, ...entity.custom];

  return (
    <ScreenSection labelledBy={headingId}>
      <h1 id={headingId} data-bab1-h1="" style={h1Style}>
        {heading}
      </h1>
      {rows.length > 0 ? (
        <div
          role="radiogroup"
          aria-label={heading}
          style={{ display: "grid", gap: "8px" }}
        >
          {rows.map((item) => {
            const checked = selectedId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => {
                  updateAnswer((prev) =>
                    setSingleAnswer(prev, entityKey, item.id),
                  );
                  reportCorrection();
                }}
                style={{
                  ...cardButtonBase,
                  borderColor: checked
                    ? "var(--action, #18181b)"
                    : "var(--border-default, #e5e7eb)",
                  borderWidth: checked ? "2px" : "1px",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
      <BabAddLine
        screenId={screenId}
        emit={emit}
        prefix={prefix}
        placeholder={placeholder}
        hint={hint}
        buttonLabel="Tambah"
        inputLabel={inputLabel}
        addLine={addLine}
        onAdd={() => undefined}
      />
    </ScreenSection>
  );
}

function BranchScreen(props: BabScreenProps) {
  return (
    <EntityScreen
      {...props}
      heading="Lokasi mana yang ingin Anda audit?"
      placeholder="Tambah lokasi lain"
      hint="Nama lokasi dan alamat membantu membedakan antar lokasi."
      inputLabel="Nama lokasi"
      prefix="branch"
    />
  );
}

function ProductScreen(props: BabScreenProps) {
  return (
    <EntityScreen
      {...props}
      heading="Produk atau layanan mana yang ingin Anda audit?"
      placeholder="Tambah produk atau layanan lain"
      hint="Pertanyaan tentang pelanggan dan pembanding selanjutnya akan difokuskan ke produk ini."
      inputLabel="Nama produk atau layanan"
      prefix="product"
    />
  );
}

/* ── s-category: A4 + A2 hybrid ────────────────────────────── */

function CategoryScreen({
  screenId,
  fixture,
  nav,
  emit,
  scopeChoice,
  answers: answersProp,
  updateAnswer: updateAnswerProp,
}: BabScreenProps) {
  const [answers, updateAnswer] = useIntakeAnswers(
    fixture,
    answersProp,
    updateAnswerProp,
  );
  const state = readScreenState(fixture, "s-category");
  const selectedId = answers.category.selectedId;
  const customLabel = answers.category.customLabel;
  const reportCorrection = useBabCorrections(screenId, emit);
  useBabValidity(isScreenAnswerValid("s-category", answers), nav);
  const headingId = useId();
  const inputId = useId();
  const errorId = useId();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement | null>(null);
  /* Founder Gate 1 review 2026-09-05: the heading echoes the scope choice
   * (workbench getCategoryContext). Whole brand keeps the settled deck copy. */
  const scope: IntakeScopeChoice = scopeChoice ?? "brand";
  const heading =
    scope === "cabang"
      ? "Lokasi ini biasanya disebut apa?"
      : scope === "produk"
        ? "Produk atau layanan ini biasanya disebut apa?"
        : "Bisnis Anda biasanya disebut apa?";
  const lead =
    "Pilih sebutan yang mungkin dipakai pelanggan saat bertanya ke AI.";

  const applyCustom = (): boolean => {
    const label = draft.trim();
    if (label.length === 0) {
      // Reuse the deck lead as guidance — no new wording is introduced.
      setError(lead);
      emit({ event: "intake_validation_failed", screenId });
      errorRef.current?.focus();
      return false;
    }
    updateAnswer((prev) => setCategoryCustom(prev, label));
    setDraft("");
    setError(null);
    reportCorrection();
    return true;
  };

  const rows = [...state.prepared];
  if (
    customLabel !== null &&
    selectedId !== null &&
    !rows.some((row) => row.id === selectedId)
  ) {
    rows.push({ id: selectedId, label: customLabel, on: true });
  }

  return (
    <ScreenSection labelledBy={headingId}>
      <h1 id={headingId} data-bab1-h1="" style={h1Style}>
        {heading}
      </h1>
      <p style={leadStyle}>{lead}</p>
      {rows.length > 0 ? (
        <div
          role="radiogroup"
          aria-label="Pilihan kategori"
          style={{ display: "grid", gap: "8px" }}
        >
          {rows.map((item) => {
            const checked = selectedId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => {
                  updateAnswer((prev) => setCategoryAnswer(prev, item.id));
                  reportCorrection();
                }}
                style={{
                  ...cardButtonBase,
                  borderColor: checked
                    ? "var(--action, #18181b)"
                    : "var(--border-default, #e5e7eb)",
                  borderWidth: checked ? "2px" : "1px",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
      <div style={{ display: "grid", gap: "8px" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
          <label
            htmlFor={inputId}
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              overflow: "hidden",
              clip: "rect(0 0 0 0)",
              whiteSpace: "nowrap",
            }}
          >
            Tulis kategori sendiri
          </label>
          <input
            id={inputId}
            type="text"
            value={draft}
            placeholder="Tulis kategori sendiri"
            autoComplete="off"
            aria-invalid={error !== null}
            aria-describedby={error !== null ? errorId : undefined}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyCustom();
              }
            }}
            style={addInputStyle}
          />
          <button type="button" onClick={applyCustom} style={addButtonStyle}>
            Pakai
          </button>
        </div>
        <AddLineError error={error} errorId={errorId} errorRef={errorRef} />
      </div>
    </ScreenSection>
  );
}

/* ── s-offerings / s-customers: A3 chips ───────────────────── */

function ChipsScreen({
  screenId,
  fixture,
  nav,
  emit,
  answers: answersProp,
  updateAnswer: updateAnswerProp,
  invalidAttempts,
  heading,
  lead,
  pill,
  placeholder,
  inputLabel,
  prefix,
  askLeadFor,
}: BabScreenProps & {
  heading: string;
  lead: string;
  pill?: string;
  placeholder: string;
  inputLabel: string;
  prefix: string;
  /** Ask-mode lead override; receives the detected count (data slot N). */
  askLeadFor?: (detectedCount: number) => string;
}) {
  const [answers, updateAnswer] = useIntakeAnswers(
    fixture,
    answersProp,
    updateAnswerProp,
  );
  const state = readScreenState(fixture, screenId);
  const { mode, detectedCount } = deriveOfferingsMode(state.prepared);
  /* Offerings vs customers share the A3 grammar; only offerings blocks
   * (journey §2 settles the Gate 0 disagreement: whole/location routes
   * require ≥1; customers stay optional). */
  const chipKey = screenId === "s-customers" ? "customers" : "offerings";
  const answer = answers[chipKey];
  const onIds = answer.onIds;
  const reportCorrection = useBabCorrections(screenId, emit);
  const valid =
    screenId === "s-offerings"
      ? isScreenAnswerValid("s-offerings", answers)
      : true;
  useBabValidity(valid, nav);
  const addLine = useBabAddLine({
    screenId,
    emit,
    prefix,
    guidance: lead,
    store: {
      items: answer.custom,
      push: (item) =>
        updateAnswer((prev) => addMultiCustom(prev, chipKey, item)),
    },
  });
  const headingId = useId();

  const toggle = (id: string) => {
    updateAnswer((prev) => toggleMultiAnswer(prev, chipKey, id));
    reportCorrection();
  };

  const chips: PreparedItem[] = [...state.prepared, ...answer.custom];
  const resolvedLead =
    askLeadFor !== undefined && mode === "ask"
      ? askLeadFor(detectedCount)
      : lead;

  return (
    <ScreenSection labelledBy={headingId}>
      <h1
        id={headingId}
        data-bab1-h1=""
        style={{
          ...h1Style,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <span>{heading}</span>
        {pill !== undefined ? (
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: "999px",
              border: "1px solid var(--border-default, #e5e7eb)",
              color: "var(--text-muted, #52525b)",
              letterSpacing: "0",
            }}
          >
            {pill}
          </span>
        ) : null}
      </h1>
      <p style={leadStyle}>{resolvedLead}</p>
      {screenId === "s-offerings" && (invalidAttempts ?? 0) > 0 && !valid ? (
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
          Pilih atau tambah setidaknya satu produk atau layanan.
        </p>
      ) : null}
      {chips.length > 0 ? (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {chips.map((item) => {
            const on = onIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(item.id)}
                style={chipStyle(on)}
              >
                {on ? (
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-block",
                      marginRight: "8px",
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </span>
                ) : null}
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
      <BabAddLine
        screenId={screenId}
        emit={emit}
        prefix={prefix}
        placeholder={placeholder}
        hint={lead}
        buttonLabel="Tambah"
        inputLabel={inputLabel}
        addLine={addLine}
        onAdd={() => undefined}
      />
    </ScreenSection>
  );
}

function OfferingsScreen(props: BabScreenProps) {
  return (
    <ChipsScreen
      {...props}
      heading={
        deriveOfferingsMode(
          readScreenState(props.fixture, "s-offerings").prepared,
        ).mode === "confirm"
          ? "Apakah ini yang Anda tawarkan?"
          : "Apa saja yang Anda tawarkan?"
      }
      lead="Nuave sudah memilih yang ditemukan. Hapus yang salah, tambah yang kurang."
      placeholder="Tambah yang belum ada"
      inputLabel="Produk atau layanan"
      prefix="offering"
      askLeadFor={(detectedCount) =>
        detectedCount > 0
          ? `Nuave menemukan ${detectedCount} dari sumber Anda. Pilih dari saran di bawah atau tambah sendiri.`
          : "Pilih dari saran di bawah atau tambah sendiri."
      }
    />
  );
}

function CustomersScreen(props: BabScreenProps) {
  return (
    <ChipsScreen
      {...props}
      heading="Mengapa pelanggan mencari yang seperti ini?"
      lead="Pilih kebutuhan atau situasi nyata yang mendorong pelanggan mencari pilihan seperti ini. Ini membantu Nuave menyusun pertanyaan audit yang lebih relevan. Anda boleh lanjut tanpa memilih."
      pill="Opsional"
      placeholder="Tambah alasan lain"
      inputLabel="Alasan pelanggan"
      prefix="customer-chip"
    />
  );
}

/* ── s-service: fixed icon+checkbox multi-select (handoff 2026-09-05) ── */

const SERVICE_CHANNELS: ReadonlyArray<{
  id: string;
  glyph: string;
  title: string;
  description: string;
}> = [
  {
    id: "service-location",
    glyph: "▦",
    title: "Di lokasi bisnis Anda",
    description: "Pelanggan datang untuk membeli atau menggunakan layanan.",
  },
  {
    id: "service-customer",
    glyph: "⌂",
    title: "Di lokasi pelanggan",
    description: "Anda mendatangi pelanggan untuk memberikan layanan.",
  },
  {
    id: "service-delivery",
    glyph: "⇢",
    title: "Dikirim ke pelanggan",
    description: "Produk dikirim tanpa pelanggan datang ke lokasi Anda.",
  },
  {
    id: "service-online",
    glyph: "▭",
    title: "Digunakan secara online",
    description: "Layanan digunakan dari jarak jauh melalui internet.",
  },
];

/** ≥1 channel required; fixture `on` flags preselect (AI-prepared values are
 *  never confirmed merely by being displayed). */
export function isServiceSelectionValid(ids: readonly string[]): boolean {
  return ids.length > 0;
}

function ServiceScreen({
  screenId,
  fixture,
  nav,
  emit,
  answers: answersProp,
  updateAnswer: updateAnswerProp,
}: BabScreenProps) {
  const [answers, updateAnswer] = useIntakeAnswers(
    fixture,
    answersProp,
    updateAnswerProp,
  );
  const onIdsState = answers.service.onIds;
  const reportCorrection = useBabCorrections(screenId, emit);
  useBabValidity(isScreenAnswerValid("s-service", answers), nav);
  const headingId = useId();

  return (
    <ScreenSection labelledBy={headingId}>
      <h1 id={headingId} data-bab1-h1="" style={h1Style}>
        Bagaimana pelanggan mendapatkan yang Anda tawarkan?
      </h1>
      <p style={leadStyle}>
        Pilih semua cara yang berlaku. Ini membantu Nuave memahami di mana
        pengalaman pelanggan terjadi.
      </p>
      <div
        role="group"
        aria-label="Cara pelanggan mendapatkan yang Anda tawarkan"
        style={{ display: "grid", gap: "8px" }}
      >
        {SERVICE_CHANNELS.map((channel) => {
          const on = onIdsState.includes(channel.id);
          return (
            <button
              key={channel.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => {
                updateAnswer((prev) => toggleServiceChannel(prev, channel.id));
                reportCorrection();
              }}
              style={{
                ...cardButtonBase,
                borderColor: on
                  ? "var(--action, #18181b)"
                  : "var(--border-default, #e5e7eb)",
                borderWidth: on ? "2px" : "1px",
                alignItems: "flex-start",
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
                  color: "var(--text-heading, #18181b)",
                }}
              >
                {channel.glyph}
              </span>
              <span style={{ display: "grid", gap: "2px", flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{channel.title}</span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "var(--text-muted, #52525b)",
                  }}
                >
                  {channel.description}
                </span>
              </span>
              <span
                aria-hidden="true"
                style={{
                  width: "24px",
                  height: "24px",
                  flexShrink: 0,
                  borderRadius: "6px",
                  border: on
                    ? "2px solid var(--action, #18181b)"
                    : "1px solid var(--border-strong, #d1d5db)",
                  background: on
                    ? "var(--action, #18181b)"
                    : "var(--bg-surface, #ffffff)",
                  color: "var(--action-foreground, #ffffff)",
                  fontSize: "14px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {on ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </ScreenSection>
  );
}

/* ── Orchestrator wiring map ─────────────────────────────────── */

export const BAB1_SCREENS: Partial<Record<IntakeScreenId, IntakeScreenSlot>> = {
  "s-crawl": CrawlScreen,
  "s-brand": BrandScreen,
  "s-brand-fix": BrandFixScreen,
  "s-scope": ScopeScreen,
  "s-branch": BranchScreen,
  "s-product": ProductScreen,
  "s-category": CategoryScreen,
  "s-offerings": OfferingsScreen,
  "s-customers": CustomersScreen,
  "s-service": ServiceScreen,
};
