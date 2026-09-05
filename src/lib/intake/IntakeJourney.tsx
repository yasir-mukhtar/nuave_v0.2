"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import IntakeFixturePlaceholder from "./IntakeFixturePlaceholder";
import {
  chapterFills,
  continueLabelFor,
  isBareScreen,
  isBlockingScreen,
  normalizeStubAnswers,
  resolveJourneyPath,
  useIntakeFunnel,
  type IntakeAnswerUpdater,
  type IntakeEntryMode,
  type IntakeFunnelSink,
  type IntakeScopeChoice,
  type IntakeScreenNav,
  type IntakeScreenSlot,
  type IntakeScreenSlotProps,
} from "./navigation";
import IntakeChapterProgress from "./progress";
import { isIntakeScreenId, type IntakeScreenId } from "./screens";
import {
  applyScopeChange,
  commitBrandFix,
  createIntakeState,
  isMaterialChange,
  scopeOptionIdOfKind,
  withBumpedFactVersion,
  type IntakeState,
} from "./state";

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
  /* Stub graph drivers until wave-2 content owns real answers. Scope lives
   * in committed IntakeState (Phase 5); entry/brand-fix stay preview stub
   * drivers until preparation owns them. */
  const answers = useMemo(
    () =>
      normalizeStubAnswers({
        entry,
        scope: stubScope,
        brandNeedsFix: stubBrandNeedsFix,
      }),
    [entry, stubScope, stubBrandNeedsFix],
  );
  /* Real committed answers, shell-owned (Phase 5): screens read through
   * `answers` and write through `updateAnswer`, so Back navigation and
   * remounts restore committed answers instead of reseeding. The preview
   * stub scope still seeds the route (same as before); a stub-driven scope
   * counts as unanswered until the owner explicitly picks (data contract
   * §1.1 rule 3 — never silently confirmed). */
  const [committed, setCommitted] = useState<IntakeState>(() => {
    const seeded = createIntakeState(fixtureOverride);
    if (seeded.scope === answers.scope) return seeded;
    return {
      ...seeded,
      scope: answers.scope,
      scopeOptionId: scopeOptionIdOfKind(answers.scope),
      scopeCommitted: false,
    };
  });
  const updateAnswer: IntakeAnswerUpdater = useCallback((updater) => {
    setCommitted((prev) => updater(prev));
  }, []);
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
  /* Live scope answer: the committed pick re-resolves the path (founder
   * Gate 1 review 2026-09-05 re-route behavior, now state-driven). */
  const scopeChoice: IntakeScopeChoice = committed.scope;
  const liveAnswers = useMemo(
    () => ({ ...answers, scope: scopeChoice }),
    [answers, scopeChoice],
  );
  /* Transactional review-edit session (journey §8.1.6 + §8.3): leaving
   * s-review for a row owner snapshots committed answers. Back from the
   * entry screen cancels (snapshot restored, unchanged review); Lanjut
   * saves (fact version bumps on material change, dependents reconfirmed,
   * return to updated review). Never resumes the linear journey. */
  const [editSession, setEditSession] = useState<{
    snapshot: IntakeState;
    entry: IntakeScreenId;
  } | null>(null);
  const path = useMemo<IntakeScreenId[]>(
    () =>
      screens && screens.length > 0
        ? [...screens]
        : resolveJourneyPath(liveAnswers),
    [screens, liveAnswers],
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

  /* Blocking-validity gate (founder Gate 1 review 2026-09-05): screens
   * publish validity per screen id; blocking screens default to blocked
   * until their first publish. Stays per-screen so Back keeps answers. */
  const [validity, setValidity] = useState<Record<string, boolean>>({});
  const [invalidAttempts, setInvalidAttempts] = useState(0);

  const emit = useIntakeFunnel(funnelSink);
  const emittedRef = useRef<Set<string>>(new Set());

  const safeIndex = Math.min(index, Math.max(path.length - 1, 0));
  const screenId: IntakeScreenId = terminal ? "s-questions" : path[safeIndex];
  const current: IntakeScreenId = path[safeIndex];
  const bare = !terminal && isBareScreen(current);
  const canGoBack = !terminal && safeIndex > 0;
  const fills = chapterFills(path, current);
  const blocking = !terminal && isBlockingScreen(current);
  const canContinue = blocking ? validity[current] === true : true;

  const handleValidityChange = useCallback(
    (valid: boolean) => {
      setValidity((prev) =>
        prev[current] === valid ? prev : { ...prev, [current]: valid },
      );
    },
    [current],
  );

  const handleScopeChoice = useCallback(
    (scope: IntakeScopeChoice) => {
      /* The pick re-resolves the route (founder Gate 1 review 2026-09-05)
       * and invalidates scope-conditioned answers (journey §8.2): the old
       * target leaves the draft, product scope deactivates offerings. */
      setCommitted((prev) =>
        prev.scope === scope && prev.scopeCommitted
          ? prev
          : applyScopeChange(prev, fixture, scope),
      );
    },
    [fixture],
  );

  const jumpTo = useCallback(
    (target: IntakeScreenId) => {
      const at = path.indexOf(target);
      if (at !== -1) {
        setInvalidAttempts(0);
        setIndex(at);
        return true;
      }
      return false;
    },
    [path],
  );

  const goNext = useCallback(() => {
    if (terminal || path.length === 0) return;
    if (!canContinue) {
      /* Blocked attempt: count it and let the screen show its message
       * (workbench behavior — message, no advance). */
      setInvalidAttempts((count) => count + 1);
      emit({ event: "intake_validation_failed", screenId: current });
      return;
    }
    setInvalidAttempts(0);
    const at = path[safeIndex];
    /* Review-edit save (journey §8.1.6 + §8.3): Lanjut on the owner commits.
     * Processing/correction screens advance without closing the session. */
    if (editSession && at !== "s-crawl" && at !== "s-brand-fix") {
      const material = isMaterialChange(editSession.snapshot, committed);
      if (at === "s-scope" && committed.scope !== editSession.snapshot.scope) {
        /* Scope change: visit only the new target + invalid dependents,
         * then the normal forward walk returns to review (journey §8.3). */
        setCommitted((prev) => (material ? withBumpedFactVersion(prev) : prev));
        setEditSession(null);
        emit({ event: "intake_continued", screenId: at });
        jumpTo(
          committed.scope === "cabang"
            ? "s-branch"
            : committed.scope === "produk"
              ? "s-product"
              : "s-category",
        );
        return;
      }
      setCommitted((prev) => (material ? withBumpedFactVersion(prev) : prev));
      setEditSession(null);
      emit({ event: "intake_continued", screenId: at });
      jumpTo("s-review");
      return;
    }
    if (at === "s-brand-fix") {
      /* Periksa lagi commits the staged correction, then the re-read loop
       * continues (journey §4.1 wrong-brand loop). */
      setCommitted((prev) => commitBrandFix(prev));
    }
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
  }, [
    terminal,
    path,
    safeIndex,
    canContinue,
    current,
    committed,
    editSession,
    emit,
    jumpTo,
    onReviewConfirm,
    onQuestionsConfirm,
  ]);

  const goBack = useCallback(() => {
    if (terminal) return;
    /* Review-edit cancel (journey §8.1.6): Back from the entry screen
     * restores the snapshot — the review returns unchanged. Deeper nested
     * correction screens step back normally; a session that cannot step
     * back also cancels instead of stranding the owner. */
    if (editSession && (current === editSession.entry || safeIndex <= 0)) {
      setCommitted(editSession.snapshot);
      setEditSession(null);
      setInvalidAttempts(0);
      emit({ event: "intake_resumed", screenId: "s-review" });
      jumpTo("s-review");
      return;
    }
    if (safeIndex <= 0) return;
    setInvalidAttempts(0);
    const dest = path[safeIndex - 1];
    setIndex(safeIndex - 1);
    /* Back restores committed answers (shell-owned state survives the
     * remount); the resume event carries counts only, never answers. */
    if (dest !== undefined) emit({ event: "intake_resumed", screenId: dest });
  }, [terminal, safeIndex, path, current, editSession, emit, jumpTo]);

  /* Readback correction jumps (journey §8.3). Leaving s-review for a row
   * owner opens the transactional edit session; no-op off-path. */
  const goToScreen = useCallback(
    (target: IntakeScreenId) => {
      if (terminal) return;
      const at = path.indexOf(target);
      if (at === -1) return;
      if (
        editSession === null &&
        current === "s-review" &&
        target !== "s-review"
      ) {
        setEditSession({ snapshot: committed, entry: target });
      }
      setInvalidAttempts(0);
      setIndex(at);
    },
    [terminal, path, current, editSession, committed],
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
    /* Real blocking gate (founder Gate 1 review 2026-09-05): blocking
     * screens stay disabled until they publish validity. */
    canContinue,
    canGoBack,
    continueLabel: continueLabelFor(terminal ? "s-questions" : current),
    onValidityChange: handleValidityChange,
    onScopeChoice: handleScopeChoice,
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
            scopeChoice={scopeChoice}
            invalidAttempts={invalidAttempts}
            answers={committed}
            updateAnswer={updateAnswer}
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
              aria-disabled={!nav.canContinue}
              data-continue-disabled={!nav.canContinue ? "true" : undefined}
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
