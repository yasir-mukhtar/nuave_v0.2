"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconCheck, IconCircle } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { parseSourceInput } from "@/lib/audit/source-input";
import { INTAKE_FIXTURES, type IntakeFixture } from "./fixtures";
import {
  chapterFills,
  continueLabelFor,
  resolveJourneyPath,
  useIntakeFunnel,
  type IntakeScreenSlot,
  type IntakeScreenSlotProps,
  type IntakeAnswerUpdater,
  type IntakeEntryMode,
  type IntakeScopeChoice,
} from "./navigation";
import type { IntakeScreenId } from "./screens";
import { BAB1_SCREENS } from "./screens-bab1";
import { BAB2_SCREENS } from "./screens-bab2";
import IntakeChapterProgress from "./progress";
import {
  createIntakeState,
  isMaterialChange,
  isScreenAnswerValid,
  setScopeAnswer,
  scopeOptionIdOfKind,
  type IntakeState,
} from "./state";
import {
  deriveContextFixture,
  prepareLocalIdentity,
  reconcileOnCommit,
} from "./preparation";
import {
  freezeLocalIntake,
  prepareLocalQuestions,
  isLocalQuestionPackCurrent,
  createLocalStartHandoff,
  parseLocalQuestionPack,
  type LocalStartHandoff,
} from "./local-questions";
import { LocalQuestionsScreen } from "./questions-screen";
import {
  LOCAL_INTAKE_STORAGE_KEY,
  parseLocalSession,
  type LocalSession,
} from "./local-session";
import styles from "./journey.module.css";

type Props = {
  fixtureOverride?: unknown;
  ScreenSlot?: IntakeScreenSlot;
  initialScreenId?: string;
  entry?: IntakeEntryMode;
  stubScope?: IntakeScopeChoice;
  stubBrandNeedsFix?: boolean;
  screens?: readonly IntakeScreenId[];
  failQuestionsOnce?: boolean;
};
type Edit = { original: LocalSession; remaining: IntakeScreenId[] };
type Correction = {
  session: LocalSession;
  working: IntakeState;
  edit: Edit | null;
  failure: string | null;
};
type Model = {
  session: LocalSession;
  working: IntakeState;
  edit: Edit | null;
  correction: Correction | null;
  busy: "reading" | "questions" | null;
  failure: string | null;
  pendingIdentity: { name: string; source: string } | null;
  readAttempt: number;
  questionAttempt: number;
  handoff: LocalStartHandoff | null;
};

function activePath(answers: IntakeState) {
  return resolveJourneyPath({
    entry: "read",
    scope: answers.scope,
    brandNeedsFix: false,
  });
}
function freshSession(fixture: IntakeFixture): LocalSession {
  const seeded = createIntakeState(fixture);
  return {
    version: 1,
    fixture,
    answers: {
      ...seeded,
      scopeCommitted: false,
      scopeOptionId: null,
      branch: { selectedId: null, custom: [] },
      product: { selectedId: null, custom: [] },
    },
    current: "s-crawl",
    visited: [],
    confirmed: [],
    identityReady: false,
    pack: null,
  };
}
function freshModel(fixture: IntakeFixture): Model {
  const session = freshSession(fixture);
  return {
    session,
    working: session.answers,
    edit: null,
    correction: null,
    busy: "reading",
    failure: null,
    pendingIdentity: null,
    readAttempt: 0,
    questionAttempt: 0,
    handoff: null,
  };
}
function questionInput(session: LocalSession) {
  return freezeLocalIntake(
    session.answers,
    deriveContextFixture(session.fixture, session.answers),
    activePath(session.answers),
  );
}
function requiredScreens(answers: IntakeState) {
  return activePath(answers).filter(
    (id) => !["s-crawl", "s-review", "s-questions", "s-brand-fix"].includes(id),
  );
}
function complete(session: LocalSession) {
  return (
    session.identityReady &&
    requiredScreens(session.answers).every(
      (id) =>
        session.confirmed.includes(id) &&
        isScreenAnswerValid(id, session.answers),
    )
  );
}
function DefaultSlot(props: IntakeScreenSlotProps) {
  const Slot = { ...BAB1_SCREENS, ...BAB2_SCREENS }[props.screenId];
  return Slot ? <Slot {...props} /> : null;
}

/** One local journey owner; children only stage answers, never overwrite a parent snapshot. */
export default function IntakeJourney({
  fixtureOverride,
  ScreenSlot = DefaultSlot,
  failQuestionsOnce = false,
}: Props) {
  const initialFixture = (fixtureOverride ??
    INTAKE_FIXTURES.F1) as IntakeFixture;
  const [model, setModel] = useState<Model>(() => freshModel(initialFixture));
  const [hydrated, setHydrated] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [validity, setValidity] = useState<Record<string, boolean>>({});
  const [questionEditing, setQuestionEditing] = useState(false);
  const [storageNotice, setStorageNotice] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const emit = useIntakeFunnel();
  const session = model.session;
  const current = session.current;
  const path = activePath(session.answers);
  const fixture = useMemo(
    () => deriveContextFixture(session.fixture, model.working),
    [session.fixture, model.working],
  );
  const isProcessing = model.busy !== null;
  const reading = current === "s-crawl";
  const questionWait =
    current === "s-questions" &&
    (model.busy === "questions" || model.failure !== null);
  const canContinue =
    !isProcessing &&
    !model.handoff &&
    (current === "s-review"
      ? complete(session)
      : current === "s-questions"
        ? !questionEditing && !!session.pack
        : current === "s-brand"
          ? session.identityReady
          : isScreenAnswerValid(current, model.working) &&
            validity[current] !== false);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const restored = parseLocalSession(
          sessionStorage.getItem(LOCAL_INTAKE_STORAGE_KEY),
        );
        if (restored) {
          let pack = null;
          if (restored.pack)
            pack = parseLocalQuestionPack(
              restored.pack,
              questionInput({ ...restored, pack: null }),
            );
          const active = activePath(restored.answers);
          const safeCurrent = active.includes(restored.current)
            ? restored.current
            : "s-brand";
          const accepted: LocalSession = {
            ...restored,
            pack,
            current:
              safeCurrent === "s-questions" && !pack ? "s-review" : safeCurrent,
          };
          setModel({
            ...freshModel(accepted.fixture),
            session: accepted,
            working: accepted.answers,
            busy: accepted.current === "s-crawl" ? "reading" : null,
          });
        }
      } catch {
        setStorageNotice(true);
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    // Refresh cancels an unfinished edit/correction. Processing is never a stable destination.
    const stable = model.edit?.original ?? model.correction?.session ?? session;
    const saved =
      model.busy === "questions"
        ? { ...stable, current: "s-review" as const }
        : stable;
    try {
      sessionStorage.setItem(LOCAL_INTAKE_STORAGE_KEY, JSON.stringify(saved));
    } catch {
      queueMicrotask(() => setStorageNotice(true));
    }
  }, [hydrated, model.edit, model.correction, model.busy, session]);

  useEffect(() => {
    if (!hydrated || model.busy === null) return;
    let cancelled = false;
    const task = model.busy;
    const captured = model;
    // Deterministic adapters are async boundaries; no fetch, provider, or artificial progress timer.
    Promise.resolve()
      .then(() => {
        if (cancelled) return;
        if (task === "reading") {
          const fails = /fail/i.test(
            captured.session.fixture.screens["s-crawl"].note ?? "",
          );
          if (fails && captured.readAttempt === 0 && !captured.pendingIdentity)
            throw new Error(
              "Sumber belum berhasil disiapkan. Coba lagi atau perbaiki sumber.",
            );
          const prior = captured.correction?.session ?? captured.session;
          const priorCard = prior.fixture.screens["s-brand"].prepared[0];
          const priorIdentity = prior.answers.brandCorrected ?? {
            name: priorCard?.label ?? "",
            source: priorCard?.detail ?? "",
          };
          const sameIdentity =
            !!captured.pendingIdentity &&
            captured.pendingIdentity.name.trim().toLocaleLowerCase("id-ID") ===
              priorIdentity.name.trim().toLocaleLowerCase("id-ID") &&
            parseSourceInput(captured.pendingIdentity.source)?.normalizedUrl ===
              parseSourceInput(priorIdentity.source)?.normalizedUrl;
          const nextFixture = sameIdentity
            ? prior.fixture
            : captured.pendingIdentity
              ? prepareLocalIdentity(
                  captured.session.fixture,
                  captured.pendingIdentity.name,
                  captured.pendingIdentity.source,
                )
              : captured.session.fixture;
          if (!nextFixture.screens["s-brand"].prepared[0])
            throw new Error(
              "Nama brand belum tersedia. Perbaiki nama dan sumber untuk melanjutkan.",
            );
          setModel((m) => {
            if (m !== captured) return m;
            const working = sameIdentity
              ? { ...m.working, brandCorrected: prior.answers.brandCorrected }
              : captured.pendingIdentity
                ? { ...m.working, brandCorrected: captured.pendingIdentity }
                : m.working;
            return {
              ...m,
              session: {
                ...m.session,
                fixture: nextFixture,
                identityReady: true,
                current: "s-brand",
              },
              working,
              busy: null,
              failure: null,
              readAttempt: m.readAttempt + 1,
            };
          });
        } else {
          if (failQuestionsOnce && captured.questionAttempt === 0)
            throw new Error(
              "Pertanyaan belum berhasil disiapkan. Coba lagi atau kembali ke informasi brand.",
            );
          const pack = prepareLocalQuestions(questionInput(captured.session));
          setModel((m) =>
            m === captured
              ? {
                  ...m,
                  session: { ...m.session, pack, current: "s-questions" },
                  busy: null,
                  failure: null,
                  questionAttempt: m.questionAttempt + 1,
                }
              : m,
          );
        }
      })
      .catch((error) => {
        if (!cancelled)
          setModel((m) =>
            m === captured
              ? {
                  ...m,
                  busy: null,
                  failure:
                    error instanceof Error
                      ? error.message
                      : "Belum berhasil. Silakan coba lagi.",
                  readAttempt: m.readAttempt + (task === "reading" ? 1 : 0),
                  questionAttempt:
                    m.questionAttempt + (task === "questions" ? 1 : 0),
                }
              : m,
          );
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, model, failQuestionsOnce]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    mainRef.current?.focus({ preventScroll: true });
    emit({ event: "intake_screen_viewed", screenId: current });
  }, [current, model.busy, emit]);

  const updateAnswer: IntakeAnswerUpdater = useCallback((updater) => {
    setModel((m) => ({ ...m, working: updater(m.working) }));
  }, []);
  const validityChanged = useCallback(
    (valid: boolean) =>
      setValidity((prev) =>
        prev[current] === valid ? prev : { ...prev, [current]: valid },
      ),
    [current],
  );

  const cancelOrBack = useCallback(() => {
    setAttempts(0);
    setQuestionEditing(false);
    setModel((m) => {
      if (m.handoff) return m;
      if (m.edit)
        return {
          ...m,
          session: m.edit.original,
          working: m.edit.original.answers,
          edit: null,
          correction: null,
          busy: null,
          failure: null,
          pendingIdentity: null,
        };
      if (m.correction)
        return {
          ...m,
          session: m.correction.session,
          working: m.correction.working,
          edit: m.correction.edit,
          failure: m.correction.failure,
          correction: null,
          busy: null,
          pendingIdentity: null,
        };
      if (m.session.current === "s-questions")
        return {
          ...m,
          session: { ...m.session, current: "s-review" },
          working: m.session.answers,
          busy: null,
          failure: null,
        };
      const applicable = activePath(m.session.answers);
      const visited = m.session.visited.filter(
        (id) =>
          applicable.includes(id) &&
          id !== "s-crawl" &&
          id !== m.session.current,
      );
      const dest = visited.pop();
      return dest
        ? {
            ...m,
            session: { ...m.session, current: dest, visited },
            working: m.session.answers,
            busy: null,
            failure: null,
          }
        : m;
    });
  }, []);

  // Browser Back shares the same cancellation and stable-history behavior as the footer.
  useEffect(() => {
    window.history.replaceState(
      { ...window.history.state, nuaveLocalIntake: true },
      "",
    );
    const handler = () => {
      cancelOrBack();
      window.history.pushState(
        { ...window.history.state, nuaveLocalIntake: true },
        "",
      );
    };
    window.history.pushState(
      { ...window.history.state, nuaveLocalIntake: true },
      "",
    );
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [cancelOrBack]);

  const goTo = useCallback((target: IntakeScreenId) => {
    setAttempts(0);
    setModel((m) => {
      if (m.handoff) return m;
      let edit = m.edit;
      if (m.session.current === "s-review")
        edit = { original: m.session, remaining: [] };
      if (target === "s-brand-fix") {
        const card = m.session.fixture.screens["s-brand"].prepared[0];
        return {
          ...m,
          edit,
          correction: {
            session: m.session,
            working: m.working,
            edit,
            failure: m.failure,
          },
          working: {
            ...m.working,
            brandFixDraft: m.working.brandCorrected ?? {
              name: card?.label ?? "",
              source: card?.detail ?? "",
            },
          },
          session: { ...m.session, current: target },
          busy: null,
          failure: null,
        };
      }
      if (!activePath(m.session.answers).includes(target)) return m;
      return {
        ...m,
        edit,
        session: { ...m.session, current: target },
        working: m.session.answers,
        busy: null,
        failure: null,
      };
    });
  }, []);

  const next = useCallback(() => {
    if (!canContinue) {
      setAttempts((n) => n + 1);
      requestAnimationFrame(() =>
        mainRef.current
          ?.querySelector<HTMLElement>(
            '[aria-invalid="true"], [role="alert"], input, [role="radiogroup"], [role="group"]',
          )
          ?.focus(),
      );
      emit({ event: "intake_validation_failed", screenId: current });
      return;
    }
    setAttempts(0);
    setModel((m) => {
      const at = m.session.current;
      if (at === "s-brand-fix") {
        if (
          !m.working.brandFixDraft.name.trim() ||
          !parseSourceInput(m.working.brandFixDraft.source)
        )
          return {
            ...m,
            failure:
              "Isi nama brand dan situs atau profil Instagram bisnis yang valid.",
          };
        return {
          ...m,
          session: { ...m.session, current: "s-crawl" },
          pendingIdentity: {
            name: m.working.brandFixDraft.name.trim(),
            source: m.working.brandFixDraft.source.trim(),
          },
          busy: "reading",
          failure: null,
        };
      }
      if (at === "s-review") {
        if (!complete(m.session)) return m;
        const input = questionInput(m.session);
        if (isLocalQuestionPackCurrent(m.session.pack, input))
          return {
            ...m,
            session: { ...m.session, current: "s-questions" },
            working: m.session.answers,
            failure: null,
          };
        return {
          ...m,
          session: { ...m.session, current: "s-questions", pack: null },
          busy: "questions",
          failure: null,
        };
      }
      if (at === "s-questions") {
        if (!m.session.pack) return m;
        try {
          return {
            ...m,
            handoff: createLocalStartHandoff(
              m.session.pack,
              questionInput(m.session),
            ),
            failure: null,
          };
        } catch {
          return {
            ...m,
            session: { ...m.session, current: "s-review", pack: null },
            failure:
              "Informasi sudah berubah. Siapkan dan periksa pertanyaan kembali.",
          };
        }
      }
      const changed = reconcileOnCommit(
        m.session.answers,
        m.working,
        m.session.fixture,
        at,
      );
      const route = activePath(changed.state);
      const reconfirm = changed.reconfirm.filter(
        (id) => route.includes(id) && id !== at,
      );
      const confirmed = [
        ...new Set([
          ...m.session.confirmed.filter(
            (id) => route.includes(id) && !reconfirm.includes(id),
          ),
          at,
        ]),
      ];
      const candidate: LocalSession = {
        ...m.session,
        answers: changed.state,
        confirmed,
      };
      if (m.edit) {
        const remaining = route.filter(
          (id) =>
            id !== at && [...m.edit!.remaining, ...reconfirm].includes(id),
        );
        if (remaining.length) {
          const [dest, ...rest] = remaining;
          return {
            ...m,
            session: { ...candidate, current: dest },
            working: changed.state,
            edit: { ...m.edit, remaining: rest },
            correction: null,
            pendingIdentity: null,
            failure: null,
          };
        }
        const material =
          isMaterialChange(m.edit.original.answers, changed.state) ||
          JSON.stringify(m.edit.original.fixture.screens["s-brand"]) !==
            JSON.stringify(candidate.fixture.screens["s-brand"]);
        const saved = {
          ...changed.state,
          factVersion: m.edit.original.answers.factVersion + (material ? 1 : 0),
        };
        return {
          ...m,
          session: {
            ...candidate,
            current: "s-review",
            answers: saved,
            visited: requiredScreens(saved).filter((id) =>
              confirmed.includes(id),
            ),
            pack: material ? null : m.edit.original.pack,
          },
          working: saved,
          edit: null,
          correction: null,
          pendingIdentity: null,
          failure: null,
        };
      }
      const material = isMaterialChange(m.session.answers, changed.state);
      const saved = {
        ...changed.state,
        factVersion: m.session.answers.factVersion + (material ? 1 : 0),
      };
      const dest = route[route.indexOf(at) + 1] ?? "s-review";
      const visited = [
        ...m.session.visited.filter(
          (id) => route.includes(id) && id !== "s-crawl" && id !== at,
        ),
        at,
      ];
      return {
        ...m,
        session: {
          ...candidate,
          answers: saved,
          current: dest,
          visited,
          pack: material ? null : m.session.pack,
        },
        working: saved,
        correction: null,
        pendingIdentity: null,
        failure: null,
      };
    });
  }, [canContinue, current, emit]);

  const retry = () => {
    setModel((m) => ({
      ...m,
      busy: current === "s-crawl" ? "reading" : "questions",
      failure: null,
    }));
  };
  const restart = () => {
    setModel(freshModel(initialFixture));
    setAttempts(0);
  };
  const canBack =
    !!model.edit ||
    !!model.correction ||
    current === "s-questions" ||
    session.visited.some(
      (id) => path.includes(id) && id !== current && id !== "s-crawl",
    );
  const primary =
    model.edit && !["s-brand-fix", "s-crawl"].includes(current)
      ? "Simpan"
      : continueLabelFor(current);
  const nav = {
    onContinue: next,
    onBack: cancelOrBack,
    onGotoScreen: goTo,
    canContinue,
    canGoBack: canBack,
    continueLabel: primary,
    onValidityChange: validityChanged,
    onScopeChoice: (scope: IntakeScopeChoice) =>
      updateAnswer((prev) => setScopeAnswer(prev, scopeOptionIdOfKind(scope))),
  };

  return (
    <main
      ref={mainRef}
      tabIndex={-1}
      lang="id"
      data-new-intake-shell={model.handoff ? "done" : current}
      className={styles.shell}
    >
      <header className={styles.header}>
        <p className={`type-heading-md ${styles.wordmark}`}>nuave</p>
      </header>
      {!reading && !model.handoff && (
        <div className={styles.progress}>
          <IntakeChapterProgress fills={chapterFills(path, current)} />
        </div>
      )}
      {model.handoff ? (
        <section className={styles.content} aria-label="Serah terima lokal">
          <h1 className="type-heading-lg">Serah terima lokal siap</h1>
          <p className="type-copy-lg">
            Informasi brand dan sepuluh pertanyaan yang Anda setujui sudah siap
            diteruskan.
          </p>
          <p className={`type-copy ${styles.notice}`}>
            Ini uji coba lokal. Tidak ada audit AI, pembayaran, atau laporan
            yang dijalankan.
          </p>
          <div className={styles.actions}>
            <Button
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(model.handoff, null, 2)], {
                    type: "application/json",
                  }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = "nuave-local-intake-handoff.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className={styles.primary}
            >
              Unduh serah terima
            </Button>
            <Button
              variant="outline"
              className={styles.primary}
              onClick={restart}
            >
              Uji perjalanan baru
            </Button>
          </div>
        </section>
      ) : reading || questionWait ? (
        <section className={styles.content}>
          <h1 className="type-heading-lg">
            {reading
              ? "Kami sedang mengenali bisnis Anda"
              : "Menyiapkan pertanyaan audit"}
          </h1>
          {model.failure ? (
            <>
              <p role="alert" className={`type-copy ${styles.error}`}>
                {model.failure}
              </p>
              <div className={styles.actions}>
                <Button onClick={retry} className={styles.primary}>
                  Coba lagi
                </Button>
                <Button
                  variant="outline"
                  className={styles.primary}
                  onClick={() =>
                    reading ? goTo("s-brand-fix") : cancelOrBack()
                  }
                >
                  {reading ? "Ubah sumber" : "Kembali ke informasi brand"}
                </Button>
                {model.correction && (
                  <Button variant="ghost" onClick={cancelOrBack}>
                    Batal
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <ul
                className={`type-copy-lg ${styles.reading}`}
                role="status"
                aria-label={
                  reading
                    ? "Menyiapkan contoh bisnis"
                    : "Menyiapkan sepuluh pertanyaan"
                }
              >
                {(reading
                  ? [
                      "Membaca sumber Anda",
                      "Mengenali produk dan lokasi",
                      "Menyiapkan perkiraan pelanggan dan pesaing",
                    ]
                  : [
                      "Memakai informasi yang Anda konfirmasi",
                      "Menyusun sepuluh pertanyaan",
                      "Memeriksa pertanyaan",
                    ]
                ).map((text, i) => (
                  <li key={text}>
                    {i === 0 ? (
                      <IconCheck size={24} />
                    ) : (
                      <IconCircle size={24} />
                    )}
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <p className="type-copy">
                Semua bisa Anda koreksi. Anda yang paling tahu bisnis Anda.
              </p>
            </>
          )}
          <p className={`type-copy-sm ${styles.notice}`}>
            Uji coba lokal memakai contoh deterministik. Sumber tidak diakses
            dan tidak ada panggilan AI.
          </p>
          {isProcessing && (model.correction || !reading) && (
            <Button variant="ghost" onClick={cancelOrBack}>
              Batal
            </Button>
          )}
        </section>
      ) : current === "s-questions" && session.pack ? (
        <LocalQuestionsScreen
          pack={session.pack}
          onPackChange={(pack) =>
            setModel((m) => ({ ...m, session: { ...m.session, pack } }))
          }
          onEditingChange={setQuestionEditing}
        />
      ) : (
        <ScreenSlot
          key={current}
          screenId={current}
          fixture={fixture}
          nav={nav}
          emit={emit}
          activeScreens={path}
          scopeChoice={model.working.scope}
          invalidAttempts={attempts}
          answers={model.working}
          updateAnswer={updateAnswer}
        />
      )}
      {model.failure && !reading && !questionWait && (
        <p className={`type-copy ${styles.error}`} role="alert">
          {model.failure}
        </p>
      )}
      {attempts > 0 && !canContinue && (
        <p className={`type-copy-sm ${styles.error}`} role="alert">
          Lengkapi pilihan yang diminta sebelum melanjutkan.
        </p>
      )}
      {storageNotice && (
        <p className="type-copy-sm" role="status">
          Penyimpanan browser tidak tersedia. Selesaikan uji coba di halaman
          ini.
        </p>
      )}
      {!reading && !model.handoff && !questionWait && (
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <span>
              {canBack && (
                <Button
                  variant="ghost"
                  className={`type-copy ${styles.back}`}
                  onClick={cancelOrBack}
                >
                  {model.edit || model.correction ? "Batal" : "Kembali"}
                </Button>
              )}
            </span>
            <Button
              className={`type-copy ${styles.primary}`}
              onClick={next}
              aria-disabled={!canContinue}
              data-continue-disabled={!canContinue ? "true" : undefined}
            >
              {primary}
            </Button>
          </div>
        </footer>
      )}
      {!model.handoff && !reading && (
        <p className={`type-copy-sm ${styles.localNote}`}>
          Contoh lokal · tidak menjalankan audit AI
        </p>
      )}
    </main>
  );
}
export type { IntakeScreenSlotProps };
