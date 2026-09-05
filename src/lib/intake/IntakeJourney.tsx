"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import IntakeFixturePlaceholder from "./IntakeFixturePlaceholder";
import {
  chapterFills,
  continueLabelFor,
  isBareScreen,
  normalizeStubAnswers,
  resolveJourneyPath,
  useIntakeFunnel,
  type IntakeEntryMode,
  type IntakeFunnelSink,
  type IntakeScopeChoice,
  type IntakeScreenNav,
  type IntakeScreenSlot,
  type IntakeScreenSlotProps,
} from "./navigation";
import IntakeChapterProgress from "./progress";
import { isIntakeScreenId, type IntakeScreenId } from "./screens";

type IntakeJourneyProps = {
  /** Screen to show first. Unknown values fall back to the first screen. */
  initialScreenId?: string;
  /**
   * Explicit resolved path override (whole-journey switch only, never
   * per-screen). Defaults to the graph resolved from the stub answers below.
   */
  screens?: readonly IntakeScreenId[];
  /** Stub graph drivers until wave-2 content owns real answers. */
  entry?: IntakeEntryMode;
  stubScope?: IntakeScopeChoice;
  stubBrandNeedsFix?: boolean;
  /**
   * Final-readback transition slot: s-review Continue ("Buat pertanyaan
   * audit"). Defaults to advancing to s-questions.
   */
  onReviewConfirm?: () => void;
  /**
   * Question-review transition slot: s-questions Continue ("Mulai audit").
   * Defaults to the terminal "Audit dimulai" state.
   */
  onQuestionsConfirm?: () => void;
  /** Funnel sink for the 7 privacy-safe events. Default is a silent no-op. */
  funnelSink?: IntakeFunnelSink;
  /**
   * Real fixture datum (pinned `IntakeFixture` shape). When provided, screen
   * slots receive it; otherwise they get the stub graph datum below and
   * render their empty states.
   */
  fixtureOverride?: unknown;
  /**
   * Screen-content slot. Wave-2 workers implement to `IntakeScreenSlot`;
   * until then every screen renders the fixture placeholder.
   */
  ScreenSlot?: IntakeScreenSlot;
};

/** s-crawl auto-advance: brief readable pass, never an artificial wait. */
const CRAWL_ADVANCE_MS = 900;

function DefaultScreenSlot({ screenId }: IntakeScreenSlotProps) {
  return <IntakeFixturePlaceholder screenId={screenId} />;
}

/**
 * Isolated new intake shell (plan §4.1 + Phase 4 shell part).
 *
 * Owns the complete intake frame — wordmark, 4-chapter progress (never on
 * s-crawl), sticky Kembali/primary bar — plus the resolved screen graph,
 * Back/Continue behavior, focus + scroll restoration, the readback/question
 * transition slots, and the funnel emission hook. Screen content renders
 * only through the pinned slot contract (`IntakeScreenSlotProps`); the
 * shell never imports or falls through to legacy intake renderers.
 */
export default function IntakeJourney({
  initialScreenId,
  screens,
  entry,
  stubScope,
  stubBrandNeedsFix,
  onReviewConfirm,
  onQuestionsConfirm,
  funnelSink,
  fixtureOverride,
  ScreenSlot = DefaultScreenSlot,
}: IntakeJourneyProps) {
  const answers = useMemo(
    () =>
      normalizeStubAnswers({
        entry,
        scope: stubScope,
        brandNeedsFix: stubBrandNeedsFix,
      }),
    [entry, stubScope, stubBrandNeedsFix],
  );
  const path = useMemo<IntakeScreenId[]>(
    () =>
      screens && screens.length > 0
        ? [...screens]
        : resolveJourneyPath(answers),
    [screens, answers],
  );
  const [index, setIndex] = useState(() => {
    if (initialScreenId !== undefined && isIntakeScreenId(initialScreenId)) {
      const at = path.indexOf(initialScreenId);
      if (at !== -1) return at;
    }
    return 0;
  });
  const [terminal, setTerminal] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);

  const emit = useIntakeFunnel(funnelSink);
  const emittedRef = useRef<Set<string>>(new Set());

  const safeIndex = Math.min(index, Math.max(path.length - 1, 0));
  const screenId: IntakeScreenId = terminal ? "s-questions" : path[safeIndex];
  const current: IntakeScreenId = path[safeIndex];
  const bare = !terminal && isBareScreen(current);
  const canGoBack = !terminal && safeIndex > 0;
  const fills = chapterFills(path, current);

  const goNext = useCallback(() => {
    if (terminal || path.length === 0) return;
    const at = path[safeIndex];
    if (at === "s-review") {
      emit({ event: "intake_continued", screenId: at });
      emit({ event: "intake_completed", screenId: at, completed: true });
      if (onReviewConfirm) {
        onReviewConfirm();
        return;
      }
      setIndex(Math.min(safeIndex + 1, path.length - 1));
      return;
    }
    if (at === "s-questions") {
      emit({ event: "intake_continued", screenId: at });
      if (onQuestionsConfirm) {
        onQuestionsConfirm();
        return;
      }
      setTerminal(true);
      return;
    }
    emit({ event: "intake_continued", screenId: at });
    setIndex(Math.min(safeIndex + 1, path.length - 1));
  }, [terminal, path, safeIndex, emit, onReviewConfirm, onQuestionsConfirm]);

  const goBack = useCallback(() => {
    if (terminal || safeIndex <= 0) return;
    setIndex(safeIndex - 1);
  }, [terminal, safeIndex]);

  /* Direct jump for readback correction links; no-op off-path. */
  const goToScreen = useCallback(
    (target: IntakeScreenId) => {
      if (terminal) return;
      const at = path.indexOf(target);
      if (at !== -1) setIndex(at);
    },
    [terminal, path],
  );

  /* Funnel: started + one screen-viewed per screen (deduped for remounts). */
  useEffect(() => {
    if (terminal || path.length === 0) return;
    const key = `${safeIndex}:${current}`;
    if (!emittedRef.current.has("started")) {
      emittedRef.current.add("started");
      emit({ event: "intake_started", screenId: path[0] });
    }
    if (!emittedRef.current.has(key)) {
      emittedRef.current.add(key);
      emit({ event: "intake_screen_viewed", screenId: current });
    }
  }, [terminal, safeIndex, current, path, emit]);

  /* s-crawl auto-advances on preparation success (timer simulates the wait). */
  useEffect(() => {
    if (terminal || path.length === 0 || current !== "s-crawl") return;
    const timer = setTimeout(goNext, CRAWL_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [terminal, current, goNext]);

  /* Focus + scroll restoration on every transition. */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    mainRef.current?.focus({ preventScroll: true });
  }, [terminal, safeIndex]);

  /* Stub fixture datum until a real fixture is injected via fixtureOverride. */
  const stubFixture: unknown = useMemo(
    () => ({
      entry: answers.entry,
      scope: answers.scope,
      brandNeedsFix: answers.brandNeedsFix,
    }),
    [answers],
  );
  const fixture: unknown = fixtureOverride ?? stubFixture;

  if (path.length === 0) {
    return (
      <main data-new-intake-shell="empty" lang="id">
        <p>Perjalanan intake baru belum memiliki layar.</p>
      </main>
    );
  }

  const nav: IntakeScreenNav = {
    onContinue: goNext,
    onBack: goBack,
    onGotoScreen: goToScreen,
    /* Stub answers satisfy every blocker; wave-2 content drives this. */
    canContinue: true,
    canGoBack,
    continueLabel: continueLabelFor(terminal ? "s-questions" : current),
  };

  return (
    <main
      ref={mainRef}
      tabIndex={-1}
      data-new-intake-shell={terminal ? "done" : screenId}
      lang="id"
      style={{
        maxWidth: "560px",
        margin: "0 auto",
        padding: "20px 16px calc(112px + env(safe-area-inset-bottom, 0px))",
        fontFamily: "var(--font-ui, inherit)",
        color: "var(--text-body, #3f3f46)",
        outline: "none",
      }}
    >
      <style>{`[data-new-intake-shell] :focus-visible{outline:2px solid var(--action,#18181b);outline-offset:2px;box-shadow:0 0 0 4px rgba(24,24,27,.15);}`}</style>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "17px",
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: "var(--text-heading, #18181b)",
          }}
        >
          nuave
        </p>
      </header>

      {!terminal && !bare ? (
        <div style={{ marginBottom: "16px" }}>
          <IntakeChapterProgress fills={fills} />
        </div>
      ) : null}

      {terminal ? (
        <section
          aria-label="Audit dimulai"
          style={{ display: "grid", gap: "12px" }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "24px",
              lineHeight: 1.25,
              color: "var(--text-heading, #18181b)",
            }}
          >
            Audit dimulai
          </h1>
        </section>
      ) : (
        <>
          <ScreenSlot
            screenId={current}
            fixture={fixture}
            nav={nav}
            emit={emit}
            activeScreens={path}
          />
        </>
      )}

      {!terminal && !bare ? (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
            background: "var(--bg-page, #ffffff)",
            borderTop: "1px solid var(--border-default, #e5e7eb)",
          }}
        >
          <div
            style={{
              maxWidth: "560px",
              margin: "0 auto",
              padding:
                "12px 16px calc(12px + env(safe-area-inset-bottom, 0px))",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <span style={{ minWidth: "96px" }}>
              {canGoBack ? (
                <button
                  type="button"
                  onClick={goBack}
                  style={{
                    minHeight: "44px",
                    padding: "10px 16px",
                    fontSize: "16px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-body, #3f3f46)",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                  }}
                >
                  Kembali
                </button>
              ) : null}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={!nav.canContinue}
              style={{
                minHeight: "44px",
                padding: "10px 24px",
                fontSize: "16px",
                fontWeight: 600,
                borderRadius: "999px",
                border: "1px solid var(--action, #18181b)",
                cursor: nav.canContinue ? "pointer" : "not-allowed",
                background: "var(--action, #18181b)",
                color: "var(--action-foreground, #ffffff)",
                opacity: nav.canContinue ? 1 : 0.5,
              }}
            >
              {nav.continueLabel}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

// Re-exported for the slot contract reference in README.md.
export type { IntakeScreenSlotProps };
