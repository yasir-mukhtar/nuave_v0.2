"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { IconCheck, IconCircle } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { parseSourceInput } from "@/lib/audit/source-input";
import {
  EMPTY_INTAKE_FIXTURE,
  INTAKE_FIXTURES,
  type IntakeFixture,
} from "./fixtures";
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
  prepareBoundaryIdentity,
  prepareLocalIdentity,
  reconcileOnCommit,
} from "./preparation";
import {
  freezeLocalIntake,
  prepareLocalQuestions,
  prepareGlmLocalPack,
  isLocalQuestionPackCurrent,
  createLocalStartHandoff,
  parseLocalQuestionPack,
  type FrozenLocalIntake,
  type LocalQuestionPack,
  type GlmQuestionsOutcome,
  type LocalStartHandoff,
} from "./local-questions";
import { LocalQuestionsScreen } from "./questions-screen";
import {
  LOCAL_INTAKE_STORAGE_KEY,
  parseLocalSession,
  type GenerationAttempt,
  type LocalSession,
} from "./local-session";
import {
  clearLocalAuditRecord,
  localAuditQuestionsKey,
  readLocalAuditRecord,
} from "./local-audit-session";
import {
  AUDIT_COST_LIMIT_USD,
  type AuditCallTelemetry,
  type ExtractionDraft,
} from "../audit/types";
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
  /** Founder-only local GLM experiment — server-controlled flag passed from
   * the page. Preparation still goes through the local API route. */
  glmExperiment?: boolean;
  glmStubBehavior?: string;
  /** Spec 010 R-08: the public blank start — no fixture business is seeded;
   * the journey opens on the empty name + source step and only restores
   * sessions that began blank. */
  blank?: boolean;
  /** Spec 010 R-08: the server-selected live deployment — real provider
   * calls run, so the "local trial / no AI calls" notices must not render. */
  live?: boolean;
  /** The continuous direct-ten audit stage, injected by the page boundary.
   * The journey orchestrates it but stays free of audit-UI imports; when it
   * is absent the approved questions still render for review. */
  AuditStage?: ComponentType<{
    pack: LocalQuestionPack;
    input: FrozenLocalIntake;
    autoStart: boolean;
    preparationCalls?: AuditCallTelemetry[];
    preparationMode?: "synthetic-local" | "live" | null;
    /** Spec 010 R-06 ledger — every generation attempt this session started;
     * the stage folds it into the evidence export and the report notice. */
    generationAttempts?: GenerationAttempt[];
    onExit: () => void;
    onRestart: () => void;
  }>;
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
  /** The continuous direct-ten stage replaces the handoff for this method:
   * explicit approval flows straight into run/report/download inside the
   * journey. `autoStart` marks the approval click itself — reload/Back
   * restore the stage without replaying a paid stage. */
  audit: { autoStart: boolean } | null;
  /** Returned GLM texts + their issues, shown for inspection on a failed
   * validation — a failed check is displayed, never silently replaced. */
  glmInspection: { questions: string[]; issues: string[] } | null;
  /** Spec 010 R-06: the last question-generation request produced no usable
   * response — the pack may exist and may have been billed. Shown as the
   * honest interrupted state; never auto-retried. */
  generationInterrupted: boolean;
};

function activePath(answers: IntakeState) {
  return resolveJourneyPath({
    entry: "read",
    scope: answers.scope,
    brandNeedsFix: false,
  });
}
function freshSession(fixture: IntakeFixture, blank: boolean): LocalSession {
  const seeded = createIntakeState(fixture);
  return {
    version: 1,
    fixture,
    origin: blank ? "blank" : "fixture",
    answers: {
      ...seeded,
      scopeCommitted: false,
      scopeOptionId: null,
      branch: { selectedId: null, custom: [] },
      product: { selectedId: null, custom: [] },
    },
    // A blank journey opens on the empty name/source step — there is no
    // prepared source to read, so no reading pass runs on mount.
    current: blank ? "s-brand-fix" : "s-crawl",
    visited: [],
    confirmed: [],
    identityReady: false,
    pack: null,
  };
}
function freshModel(fixture: IntakeFixture, blank: boolean): Model {
  const session = freshSession(fixture, blank);
  return {
    session,
    working: session.answers,
    edit: null,
    correction: null,
    busy: blank ? null : "reading",
    failure: null,
    pendingIdentity: null,
    readAttempt: 0,
    questionAttempt: 0,
    handoff: null,
    audit: null,
    glmInspection: null,
    generationInterrupted: false,
  };
}
function questionInput(session: LocalSession) {
  return freezeLocalIntake(
    session.answers,
    deriveContextFixture(session.fixture, session.answers),
    activePath(session.answers),
  );
}

/** Spec 010 R-06: the exact interrupted-state copy — the pack may exist and
 * may have been billed; nothing is claimed either way. */
const GENERATION_INTERRUPTED_MESSAGE =
  "Permintaan pembuatan pertanyaan terputus. Pertanyaan mungkin sudah dibuat dan mungkin sudah dikenai biaya, tetapi tidak diterima.";

/** R-06 attempt classification: only a request that reached the provider
 * stage records an attempt. Pre-provider rejections — `invalid_request`,
 * `correction_required`, and `failed` outcomes the server marked
 * `providerContact: "none"` (missing credential, frozen-attempt refusals) —
 * record nothing: zero calls, zero cost. A `failed` outcome marked "sent"
 * (transport invoked, no provider response) keeps execution "unknown";
 * "responded" (or a legacy record without the field) is confirmed and keeps
 * the provider-billed cost when the response carried one. */
function glmAttemptFromOutcome(
  startedAt: string,
  outcome: GlmQuestionsOutcome,
): GenerationAttempt | null {
  switch (outcome.status) {
    case "ok":
      return {
        started_at: startedAt,
        outcome: "succeeded",
        execution: "confirmed",
        cost_usd: outcome.cost.billedUsd,
      };
    case "validation_failed":
      return {
        started_at: startedAt,
        outcome: "failed",
        execution: "confirmed",
        cost_usd: outcome.cost.billedUsd,
      };
    case "failed": {
      const contact = outcome.providerContact ?? "responded";
      if (contact === "none") return null;
      if (contact === "sent")
        return {
          started_at: startedAt,
          outcome: "failed",
          execution: "unknown",
          cost_usd: null,
        };
      return {
        started_at: startedAt,
        outcome: "failed",
        execution: "confirmed",
        cost_usd: outcome.cost?.billedUsd ?? null,
      };
    }
    default:
      return null;
  }
}

/** One explicit preparation attempt = one POST to the experimental local
 * route. No client-side retry: a refresh never replays this (busy state is
 * never persisted), and "Buat pertanyaan lagi"/"Coba lagi" is an explicit
 * new attempt. Every attempt that reached the provider stage comes back with
 * its R-06 ledger record; `interrupted` marks the no-response case that must
 * render the honest interrupted state. */
async function requestGlmQuestions(
  input: FrozenLocalIntake,
  stubBehavior: string | undefined,
): Promise<{
  outcome: GlmQuestionsOutcome;
  attempt: GenerationAttempt | null;
  interrupted: boolean;
}> {
  const emptyProvenance = {
    requestId: "",
    method: "direct-ten" as const,
    requestedModel: "",
    returnedModel: null,
    responseId: null,
    modelMismatch: false,
    transport: "synthetic-stub" as const,
  };
  const unreachable = (detail: string): GlmQuestionsOutcome => ({
    status: "failed",
    reason: "unavailable",
    detail,
    provenance: emptyProvenance,
  });
  const startedAt = new Date().toISOString();
  const interruptedAttempt: GenerationAttempt = {
    started_at: startedAt,
    outcome: "interrupted",
    execution: "unknown",
    cost_usd: null,
  };
  let response: Response;
  try {
    response = await fetch("/api/audit/glm-questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        intake: input,
        // The Spec 009 direct-ten method, requested explicitly.
        method: "direct-ten",
        ...(stubBehavior ? { stubBehavior } : {}),
      }),
    });
  } catch {
    // The request may have executed and been billed — the response never
    // reached the browser, so the attempt's execution stays unknown.
    return {
      outcome: unreachable("experimental local route unreachable"),
      attempt: interruptedAttempt,
      interrupted: true,
    };
  }
  const outcome = (await response
    .json()
    .catch(() => null)) as GlmQuestionsOutcome | null;
  if (!outcome || typeof outcome !== "object" || !("status" in outcome)) {
    if (!response.ok) {
      // A route-level rejection (404 switch off, 400 method, 429/503
      // rate-limit) ran before any provider work — no attempt is recorded.
      return {
        outcome: unreachable(
          `experimental route returned HTTP ${response.status}`,
        ),
        attempt: null,
        interrupted: false,
      };
    }
    // A 2xx response without a readable outcome: the request may have
    // executed server-side — interrupted, never silently counted.
    return {
      outcome: unreachable(
        `experimental route returned HTTP ${response.status}`,
      ),
      attempt: interruptedAttempt,
      interrupted: true,
    };
  }
  return {
    outcome,
    attempt: glmAttemptFromOutcome(startedAt, outcome),
    interrupted: false,
  };
}

/** The entered business goes through the real identity/extraction
 * boundaries with `local_mode: "auto"` — the SERVER selects the preparation
 * mode (labeled synthetic substitute by default; the real source fetch and
 * extraction only under the explicit live authorization). The response's
 * `preparation_mode` is the provenance; the substitute invents nothing so
 * every fact the brief carries still comes from the buyer's review screens.
 * This is one preparation attempt per reading phase; a refresh never
 * replays it. The returned preparation telemetry is carried into the
 * session's audit budget so any authorized spend stays on the ledger. */
async function prepareEnteredBusinessFixture(
  base: IntakeFixture,
  pending: { name: string; source: string },
): Promise<{
  fixture: IntakeFixture;
  preparationCalls: AuditCallTelemetry[];
  preparationMode: "synthetic-local" | "live";
}> {
  const identityResponse = await fetch(
    `/api/audit/identity?source=${encodeURIComponent(
      pending.source,
    )}&local_mode=auto`,
  );
  const identity = (await identityResponse.json().catch(() => null)) as {
    display_name?: string;
    canonical_url?: string;
    preparation_mode?: string;
    error?: string;
  } | null;
  if (!identityResponse.ok || !identity?.canonical_url) {
    throw new Error(
      identity?.error ||
        "Sumber belum berhasil disiapkan. Coba lagi atau perbaiki sumber.",
    );
  }
  const extractionResponse = await fetch("/api/audit/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      website_url: identity.canonical_url,
      brand_name: pending.name.trim(),
      market_context: "",
      category: "",
      identity_unverified: true,
      safety_identifier: `local-${crypto.randomUUID()}`,
      budget: {
        limit_usd: AUDIT_COST_LIMIT_USD,
        carryover_cost_usd: 0,
        calls: [],
      },
      local_mode: "auto",
    }),
  });
  const extraction = (await extractionResponse.json().catch(() => null)) as {
    draft?: ExtractionDraft;
    telemetry?: AuditCallTelemetry[];
    preparation_mode?: string;
    error?: string;
  } | null;
  if (!extractionResponse.ok || !extraction?.draft) {
    throw new Error(
      extraction?.error || "Fakta bisnis belum berhasil disiapkan. Coba lagi.",
    );
  }
  return {
    fixture: prepareBoundaryIdentity(
      base,
      pending.name,
      {
        canonicalUrl: identity.canonical_url,
        displayName: identity.display_name ?? pending.name.trim(),
      },
      extraction.draft,
    ),
    preparationCalls: Array.isArray(extraction.telemetry)
      ? extraction.telemetry
      : [],
    preparationMode:
      extraction.preparation_mode === "live" ||
      identity.preparation_mode === "live"
        ? "live"
        : "synthetic-local",
  };
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
  glmExperiment = false,
  glmStubBehavior,
  blank = false,
  live = false,
  AuditStage,
}: Props) {
  const initialFixture = (
    blank ? EMPTY_INTAKE_FIXTURE : (fixtureOverride ?? INTAKE_FIXTURES.F1)
  ) as IntakeFixture;
  const [model, setModel] = useState<Model>(() =>
    freshModel(initialFixture, blank),
  );
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
        // Sessions restore only into a matching start: a stored fixture
        // session must never seed the public blank entry, and a blank
        // session must never replace an explicit fixture seed.
        const restoredOrigin = restored?.origin ?? "fixture";
        if (restored && (restoredOrigin === "blank") === blank) {
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
          // A bound audit record returns the journey to the audit stage —
          // restored, never replayed: autoStart stays false so a reload makes
          // zero provider calls and completed work is shown, not re-run.
          const audit =
            accepted.current === "s-questions" &&
            accepted.pack?.generation.kind === "glm-direct-ten-local" &&
            readLocalAuditRecord(
              accepted.pack.inputFingerprint,
              localAuditQuestionsKey(
                accepted.pack.promptPack.prompts.map((prompt) => ({
                  prompt_id: prompt.prompt_id,
                  question: prompt.question,
                })),
              ),
            )
              ? { autoStart: false }
              : null;
          setModel({
            ...freshModel(accepted.fixture, blank),
            session: accepted,
            working: accepted.answers,
            busy: accepted.current === "s-crawl" ? "reading" : null,
            audit,
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
  }, [blank]);

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
    // Spec 010 R-06: the attempt record and the interrupted flag must reach
    // the catch below even when pack-building throws after a response —
    // an accounted attempt is never lost because a later step failed.
    let generationAttempt: GenerationAttempt | null = null;
    let generationInterrupted = false;
    // Deterministic adapters are async boundaries; the GLM experiment awaits
    // its one local-route request inside the same stale/cancel handling.
    Promise.resolve()
      .then(async () => {
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
          let preparationCalls: AuditCallTelemetry[] | undefined;
          let preparationMode: "synthetic-local" | "live" | undefined;
          let nextFixture: IntakeFixture;
          if (sameIdentity) {
            nextFixture = prior.fixture;
          } else if (captured.pendingIdentity && glmExperiment) {
            // Spec 009: the founder-local experiment reads the entered
            // business through the real identity/extraction boundaries —
            // the server selects the labeled substitute or the authorized
            // live path and returns explicit provenance. The deterministic
            // demo keeps its zero-request fixture preparation.
            const prepared = await prepareEnteredBusinessFixture(
              captured.session.fixture,
              captured.pendingIdentity,
            );
            nextFixture = prepared.fixture;
            preparationCalls = prepared.preparationCalls;
            preparationMode = prepared.preparationMode;
          } else if (captured.pendingIdentity) {
            nextFixture = prepareLocalIdentity(
              captured.session.fixture,
              captured.pendingIdentity.name,
              captured.pendingIdentity.source,
            );
          } else {
            nextFixture = captured.session.fixture;
          }
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
                // A re-read of the same identity keeps its preparation
                // ledger; a new business or the deterministic path never
                // inherits another session's preparation history.
                preparationCalls: sameIdentity
                  ? m.session.preparationCalls
                  : preparationCalls,
                preparationMode: sameIdentity
                  ? m.session.preparationMode
                  : preparationMode,
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
          const input = questionInput(captured.session);
          let pack;
          if (glmExperiment) {
            const result = await requestGlmQuestions(input, glmStubBehavior);
            generationAttempt = result.attempt;
            generationInterrupted = result.interrupted;
            const outcome = result.outcome;
            if (outcome.status === "ok") {
              pack = prepareGlmLocalPack(input, outcome);
            } else {
              // Every failure is explicit: a returned-but-invalid pack is
              // still shown for inspection; nothing is silently replaced.
              const message =
                outcome.status === "validation_failed"
                  ? "Sepuluh teks kembali, tetapi belum lolos pemeriksaan paket. Detail di bawah."
                  : outcome.status === "correction_required"
                    ? `Informasi perlu diperbaiki sebelum pertanyaan dibuat: ${outcome.issues
                        .map((issue) => issue.target ?? issue.field)
                        .join(", ")}. Kembali dan periksa jawaban.`
                    : outcome.status === "invalid_request"
                      ? "Data konfirmasi tidak sampai ke penyiapan GLM. Kembali ke informasi brand."
                      : `Persiapan GLM gagal (${outcome.reason}): ${outcome.detail}`;
              const error = new Error(message) as Error & {
                inspection?: Model["glmInspection"];
              };
              if (outcome.status === "validation_failed")
                error.inspection = {
                  questions: outcome.questions,
                  issues: outcome.issues,
                };
              throw error;
            }
          } else {
            pack = prepareLocalQuestions(input);
          }
          setModel((m) =>
            m === captured
              ? {
                  ...m,
                  session: {
                    ...m.session,
                    pack,
                    current: "s-questions",
                    generation_attempts: generationAttempt
                      ? [
                          ...(m.session.generation_attempts ?? []),
                          generationAttempt,
                        ]
                      : m.session.generation_attempts,
                  },
                  busy: null,
                  failure: null,
                  glmInspection: null,
                  generationInterrupted: false,
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
                    task === "questions" && generationInterrupted
                      ? GENERATION_INTERRUPTED_MESSAGE
                      : error instanceof Error
                        ? error.message
                        : "Belum berhasil. Silakan coba lagi.",
                  generationInterrupted:
                    task === "questions"
                      ? generationInterrupted
                      : m.generationInterrupted,
                  glmInspection:
                    task === "questions"
                      ? (((error as { inspection?: Model["glmInspection"] })
                          .inspection ?? null) as Model["glmInspection"])
                      : m.glmInspection,
                  // The attempt ledger survives the failure — a reload still
                  // carries it into the evidence export.
                  session:
                    task === "questions" && generationAttempt
                      ? {
                          ...m.session,
                          generation_attempts: [
                            ...(m.session.generation_attempts ?? []),
                            generationAttempt,
                          ],
                        }
                      : m.session,
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
  }, [hydrated, model, failQuestionsOnce, glmExperiment, glmStubBehavior]);

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
      // Leaving the audit stage returns to the approved questions; captured
      // run progress stays in its own session key, so a later visit resumes
      // rather than replaying.
      if (m.audit) return { ...m, audit: null };
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
          generationInterrupted: false,
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
      if (m.handoff || m.audit) return m;
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
          glmInspection: null,
          generationInterrupted: false,
        };
      }
      if (at === "s-questions") {
        if (!m.session.pack) return m;
        try {
          const handoff = createLocalStartHandoff(
            m.session.pack,
            questionInput(m.session),
          );
          // Spec 009 continuous flow: for the direct-ten method the explicit
          // approval click IS the audit start — the same session, wording and
          // facts flow straight into the run/report stage. Other methods keep
          // the downloadable handoff.
          if (m.session.pack.generation.kind === "glm-direct-ten-local") {
            // Return-and-continue: a bound audit record already exists (Back
            // then forward, or a restored session) — the stage reopens its
            // captured state: a done report renders, an interrupted run
            // offers resume, nothing is silently replayed. Only a fresh
            // approval with no record starts execution.
            const bound = readLocalAuditRecord(
              m.session.pack.inputFingerprint,
              localAuditQuestionsKey(
                m.session.pack.promptPack.prompts.map((prompt) => ({
                  prompt_id: prompt.prompt_id,
                  question: prompt.question,
                })),
              ),
            );
            return {
              ...m,
              audit: { autoStart: bound === null },
              failure: null,
            };
          }
          return {
            ...m,
            handoff,
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
      glmInspection: null,
      generationInterrupted: false,
    }));
  };
  const restart = () => {
    // A new journey never inherits the prior session's audit record.
    clearLocalAuditRecord();
    setModel(freshModel(initialFixture, blank));
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
      data-new-intake-shell={
        model.audit ? "audit" : model.handoff ? "done" : current
      }
      className={styles.shell}
    >
      <header className={styles.header}>
        <p className={`type-heading-md ${styles.wordmark}`}>nuave</p>
      </header>
      {!reading && !model.handoff && !model.audit && (
        <div className={styles.progress}>
          <IntakeChapterProgress fills={chapterFills(path, current)} />
        </div>
      )}
      {model.audit &&
      AuditStage &&
      session.pack?.generation.kind === "glm-direct-ten-local" ? (
        <section
          className={styles.content}
          aria-label={live ? "Audit" : "Audit lokal"}
        >
          <AuditStage
            pack={session.pack}
            input={questionInput(session)}
            autoStart={model.audit.autoStart}
            preparationCalls={session.preparationCalls ?? []}
            preparationMode={session.preparationMode ?? null}
            generationAttempts={session.generation_attempts ?? []}
            onExit={cancelOrBack}
            onRestart={restart}
          />
        </section>
      ) : model.handoff ? (
        <section className={styles.content} aria-label="Serah terima lokal">
          <h1 className="type-heading-lg">Serah terima lokal siap</h1>
          <p className="type-copy-lg">
            Informasi brand dan sepuluh pertanyaan yang Anda setujui sudah siap
            diteruskan.
          </p>
          <p className={`type-copy ${styles.notice}`}>
            Ini uji coba lokal. Tidak ada audit AI, pembayaran, atau laporan
            yang dijalankan.
            {model.handoff.mode === "glm-experimental-local" ||
            model.handoff.mode === "glm-direct-ten-local"
              ? " Pertanyaan disiapkan lewat uji coba GLM lokal."
              : ""}
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
            model.generationInterrupted ? (
              // Spec 010 R-06: the honest interrupted state — one explicit
              // new-attempt button, never an automatic retry.
              <>
                <p role="alert" className={`type-copy ${styles.error}`}>
                  {model.failure}
                </p>
                <div className={styles.actions}>
                  <Button onClick={retry} className={styles.primary}>
                    Buat pertanyaan lagi
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p role="alert" className={`type-copy ${styles.error}`}>
                  {model.failure}
                </p>
                {model.glmInspection && (
                  <div
                    className="grid gap-3"
                    data-glm-inspection="failed-validation"
                  >
                    <p className="type-copy-sm text-muted-foreground">
                      Teks yang dikembalikan (belum disetujui, tidak
                      menggantikan apa pun):
                    </p>
                    <ol className="m-0 list-decimal pl-6">
                      {model.glmInspection.questions.map((question, index) => (
                        <li key={index} className="type-copy-sm">
                          {question}
                        </li>
                      ))}
                    </ol>
                    <ul className="m-0 list-disc pl-6">
                      {model.glmInspection.issues.map((issue, index) => (
                        <li
                          key={index}
                          className="type-copy-sm text-destructive"
                        >
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
            )
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
            {live
              ? "Versi uji coba — hasil berlaku untuk bisnis yang diuji saja."
              : glmExperiment
                ? "Uji coba GLM lokal: persiapan memakai pengganti sintetis berlabel di batas nyata; pertanyaan lewat satu permintaan ke rute eksperimental."
                : "Uji coba lokal memakai contoh deterministik. Sumber tidak diakses dan tidak ada panggilan AI."}
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
      {!reading && !model.handoff && !questionWait && !model.audit && (
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
      {!model.handoff && !reading && !model.audit && (
        <p className={`type-copy-sm ${styles.localNote}`}>
          {blank || live
            ? "Versi uji coba — hasil berlaku untuk bisnis yang diuji saja."
            : glmExperiment
              ? "Versi uji coba — audit memakai pengganti sintetis berlabel."
              : "Contoh lokal · tidak menjalankan audit AI"}
        </p>
      )}
    </main>
  );
}
export type { IntakeScreenSlotProps };
