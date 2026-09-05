import { useCallback, useRef } from "react";
import type { ComponentType } from "react";
import { type IntakeScreenId } from "./screens";

/**
 * Journey graph, chapter progress model, screen-slot contract, and funnel
 * hook for the isolated new intake shell (plan Phase 4 shell part).
 *
 * Authority: docs/drafts/INTAKE_EXPERIENCE_CONTRACT.md §1 (flow graph +
 * chapter model), §2 (frame), §6 (copy deck), and
 * docs/drafts/INTAKE_FIXTURES_AND_BUDGETS.md §2 (funnel events).
 * Screen ids come from `./screens` (sequence authority). This module owns
 * navigation only — screen content, fixtures, extraction, and persistence
 * belong to sibling workers.
 */

/* ── Stub answers: the only drivers of the shell-phase graph ── */

export type IntakeEntryMode = "read" | "manual";
export type IntakeScopeChoice = "brand" | "cabang" | "produk";

/**
 * Minimal answers the shell needs to resolve the conditional graph before
 * wave-2 content screens own real answers. Until then the journey preview
 * drives these via `IntakeJourney` props (see README.md).
 */
export type IntakeStubAnswers = {
  /** `read` enters at s-crawl; `manual` (no usable source) enters at s-scope. */
  entry: IntakeEntryMode;
  /** Scope decision: picks at most one of the s-branch / s-product XOR. */
  scope: IntakeScopeChoice;
  /** s-brand routes once through s-brand-fix → s-crawl → s-brand. */
  brandNeedsFix: boolean;
};

export const DEFAULT_STUB_ANSWERS: IntakeStubAnswers = {
  entry: "read",
  scope: "brand",
  brandNeedsFix: false,
};

export function normalizeStubAnswers(
  partial?: Partial<IntakeStubAnswers>,
): IntakeStubAnswers {
  return {
    entry: partial?.entry === "manual" ? "manual" : "read",
    scope:
      partial?.scope === "cabang" || partial?.scope === "produk"
        ? partial.scope
        : "brand",
    brandNeedsFix: partial?.brandNeedsFix === true,
  };
}

/* ── Resolved journey path (the full screen graph) ── */

/**
 * Visible screen path for one journey, in walk order. Applies every
 * conditional from the handoff locked routes (2026-09-05):
 * - manual entry starts at s-scope (no s-crawl / s-brand);
 * - brand fix inserts exactly one s-brand-fix → s-crawl → s-brand loop;
 * - scope picks at most one of s-branch / s-product (XOR);
 * - product scope skips s-offerings (the product IS the offering set);
 * - s-service is on every route; s-market is always shown (no skip state);
 * - s-review → s-questions is always the tail.
 */
export function resolveJourneyPath(
  answers: IntakeStubAnswers = DEFAULT_STUB_ANSWERS,
): IntakeScreenId[] {
  const path: IntakeScreenId[] = [];
  if (answers.entry === "manual") {
    path.push("s-scope");
  } else if (answers.brandNeedsFix) {
    path.push("s-brand-fix", "s-crawl", "s-brand");
  } else {
    path.push("s-crawl", "s-brand");
  }
  // Read paths always ask the scope question; the entity screens branch on
  // the resolved answer (XOR). Manual entry lands directly on s-scope.
  if (answers.entry !== "manual") path.push("s-scope");
  if (answers.scope === "cabang") {
    path.push("s-branch");
  } else if (answers.scope === "produk") {
    path.push("s-product");
  }
  path.push("s-category");
  if (answers.scope !== "produk") {
    path.push("s-offerings");
  }
  path.push(
    "s-customers",
    "s-service",
    "s-market",
    "s-competitors",
    "s-facts",
    "s-review",
    "s-questions",
  );
  return path;
}

/** First index of a screen in a resolved path, or -1 when absent. */
export function pathIndexOf(
  path: readonly IntakeScreenId[],
  screenId: IntakeScreenId,
): number {
  return path.indexOf(screenId);
}

/** Screen after `current` on the resolved path, or null at the end. */
export function nextScreenInPath(
  path: readonly IntakeScreenId[],
  current: IntakeScreenId,
): IntakeScreenId | null {
  const at = path.indexOf(current);
  if (at === -1 || at + 1 >= path.length) return null;
  return path[at + 1];
}

/** Screen before `current` on the resolved path, or null at the start. */
export function prevScreenInPath(
  path: readonly IntakeScreenId[],
  current: IntakeScreenId,
): IntakeScreenId | null {
  const at = path.indexOf(current);
  if (at <= 0) return null;
  return path[at - 1];
}

/* ── Chapter progress model (4 chapters, fractional fill) ── */

export const INTAKE_CHAPTER_COUNT = 4;

export type IntakeChapterIndex = 0 | 1 | 2 | 3;

/** Fractional fill per chapter, one entry per chapter, each in [0, 1]. */
export type IntakeChapterFills = readonly [number, number, number, number];

const CHAPTER_OF: Record<IntakeScreenId, IntakeChapterIndex> = {
  "s-crawl": 0,
  "s-brand": 0,
  "s-brand-fix": 0,
  "s-scope": 1,
  "s-branch": 1,
  "s-product": 1,
  "s-category": 1,
  "s-offerings": 1,
  "s-customers": 1,
  "s-service": 1,
  "s-market": 2,
  "s-competitors": 2,
  "s-facts": 3,
  "s-review": 3,
  "s-questions": 3,
};

export function chapterOf(screenId: IntakeScreenId): IntakeChapterIndex {
  return CHAPTER_OF[screenId];
}

/**
 * Chapter fills for `current` on a resolved `path`. Chapters before the
 * current one read 1, chapters after read 0, and the current chapter fills
 * fractionally by the screen's position among that chapter's *visible*
 * screens (so the branch/product XOR moves the fill, never leaves a hole).
 * No interstitial screens exist — each screen's own heading orients.
 */
export function chapterFills(
  path: readonly IntakeScreenId[],
  current: IntakeScreenId,
): IntakeChapterFills {
  const currentChapter = chapterOf(current);
  const visible: IntakeScreenId[][] = [[], [], [], []];
  for (const id of path) {
    const chapter = chapterOf(id);
    if (!visible[chapter].includes(id)) visible[chapter].push(id);
  }
  const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
  const fillOf = (chapter: IntakeChapterIndex): number => {
    if (chapter < currentChapter) return 1;
    if (chapter > currentChapter) return 0;
    const inChapter = visible[chapter];
    if (inChapter.length === 0) return 1;
    return clamp01((inChapter.indexOf(current) + 1) / inChapter.length);
  };
  return [fillOf(0), fillOf(1), fillOf(2), fillOf(3)] as IntakeChapterFills;
}

/* ── Shell copy lookups (deck §6 — settled strings only) ── */

export type IntakeContinueLabel =
  "Lanjut" | "Buat pertanyaan audit" | "Mulai audit" | "Periksa lagi";

export function continueLabelFor(
  screenId: IntakeScreenId,
): IntakeContinueLabel {
  if (screenId === "s-brand-fix") return "Periksa lagi";
  if (screenId === "s-review") return "Buat pertanyaan audit";
  if (screenId === "s-questions") return "Mulai audit";
  return "Lanjut";
}

/** Screens with no shell bottom bar: system status (s-crawl) and the
 *  correction screen (s-brand-fix), which owns its own Batal / Periksa lagi. */
export function isBareScreen(screenId: IntakeScreenId): boolean {
  return screenId === "s-crawl" || screenId === "s-brand-fix";
}

/**
 * Screens whose Continue stays disabled until their decision is explicit
 * (ledger §8.3 + founder Gate 1 review 2026-09-05: market needs reach+areas,
 * competitors need ≥1 or the no-direct toggle — workbench behavior). The
 * shell gate is real: screens publish validity via `nav.onValidityChange`
 * and blocking screens default to blocked until they publish.
 */
const BLOCKING_SCREENS: readonly IntakeScreenId[] = [
  "s-brand",
  "s-brand-fix",
  "s-scope",
  "s-branch",
  "s-product",
  "s-category",
  "s-service",
  "s-market",
  "s-competitors",
];

export function isBlockingScreen(screenId: IntakeScreenId): boolean {
  return BLOCKING_SCREENS.includes(screenId);
}

/* ── Funnel emission hook (fixtures §2: 7 events, allowlist payload only) ── */

export type IntakeFunnelEventName =
  | "intake_started"
  | "intake_screen_viewed"
  | "intake_continued"
  | "intake_validation_failed"
  | "intake_answer_corrected"
  | "intake_resumed"
  | "intake_completed";

/**
 * Privacy-safe funnel event. Allowed: random single-tab session id, screen
 * id, event name, timestamp, per-screen active ms, counters/booleans. Never:
 * answer text, field values, source content, brand names, contact/payment.
 */
export type IntakeFunnelEvent = {
  sessionId: string;
  event: IntakeFunnelEventName;
  screenId: IntakeScreenId | null;
  at: string;
  activeMs?: number;
  correctionCount?: number;
  retryCount?: number;
  completed?: boolean;
};

export type IntakeFunnelSink = (event: IntakeFunnelEvent) => void;

export type IntakeFunnelEmit = (event: {
  event: IntakeFunnelEventName;
  screenId?: IntakeScreenId | null;
  activeMs?: number;
  correctionCount?: number;
  retryCount?: number;
  completed?: boolean;
}) => void;

/** Random single-tab session id. The shell holds one per mount. */
export function createFunnelSessionId(): string {
  try {
    const cryptoRef = (
      globalThis as {
        crypto?: { randomUUID?: () => string };
      }
    ).crypto;
    if (cryptoRef?.randomUUID) return cryptoRef.randomUUID();
  } catch {
    /* fall through to the Math.random fallback below */
  }
  return `intake-${Date.now().toString(36)}-${Math.floor(
    Math.random() * 1e9,
  ).toString(36)}`;
}

/**
 * Funnel emitter for one shell mount. Stamps every event with the mount's
 * session id and an ISO timestamp, then forwards to `sink`. The default sink
 * is a no-op: the shell never sends anything over the network itself.
 */
export function useIntakeFunnel(sink?: IntakeFunnelSink): IntakeFunnelEmit {
  const sessionRef = useRef<string | null>(null);
  if (sessionRef.current === null) {
    sessionRef.current = createFunnelSessionId();
  }
  return useCallback(
    (partial) => {
      const event: IntakeFunnelEvent = {
        sessionId: sessionRef.current as string,
        at: new Date().toISOString(),
        screenId: null,
        ...partial,
      };
      sink?.(event);
    },
    [sink],
  );
}

/* ── Screen-slot contract (pinned; wave-2 content implements to it) ── */

export type IntakeScreenNav = {
  onContinue: () => void;
  onBack: () => void;
  /**
   * Direct jump to a screen already in the resolved path (readback
   * correction links). No-op when the target is outside the path.
   * Optional so existing slot tests keep compiling.
   */
  onGotoScreen?: (screenId: IntakeScreenId) => void;
  canContinue: boolean;
  canGoBack: boolean;
  continueLabel: IntakeContinueLabel;
  /**
   * Publish the current screen's blocking validity to the shell gate
   * (founder Gate 1 review 2026-09-05). Fires from an effect, never during
   * render. Optional so existing slot tests keep compiling.
   */
  onValidityChange?: (valid: boolean) => void;
  /**
   * Report the scope answer chosen on s-scope; the shell re-resolves the
   * journey path (s-branch / s-product XOR) and re-seeds downstream copy.
   * Optional so existing slot tests keep compiling.
   */
  onScopeChoice?: (scope: IntakeScopeChoice) => void;
};

export type IntakeScreenSlotProps = {
  screenId: IntakeScreenId;
  /** Opaque until the fixture worker pins the shape; shell passes stub data. */
  fixture: unknown;
  nav: IntakeScreenNav;
  emit: IntakeFunnelEmit;
  /**
   * Screens on the resolved journey path (superset of visited; the shell
   * owns the graph). Review uses it to omit inactive branch rows
   * (handoff 2026-09-05). Optional so slot tests keep compiling.
   */
  activeScreens?: readonly IntakeScreenId[];
  /**
   * The scope answer the shell currently holds (stub seed or the user's
   * s-scope pick). Drives scope-dependent copy, e.g. the s-category heading
   * (founder Gate 1 review 2026-09-05). Optional so slot tests keep
   * compiling.
   */
  scopeChoice?: IntakeScopeChoice;
  /**
   * Blocked Continue attempts on the current screen since the last advance
   * (founder Gate 1 review 2026-09-05). >0 means an invalid attempt just
   * happened: screens render their inline selection message. Optional so
   * slot tests keep compiling.
   */
  invalidAttempts?: number;
};

/** A screen-content component. The shell renders one per screen id. */
export type IntakeScreenSlot = ComponentType<IntakeScreenSlotProps>;
