"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconCheck, IconCircle, IconLoader2 } from "@tabler/icons-react";
import { AuditNotice } from "@/components/product/AuditNotice";
import IntakeChapterProgress from "./progress";
import {
  AUDIT_COST_LIMIT_USD,
  auditCallTelemetrySchema,
  sourceExcerptStatusSchema,
  SOURCE_EXCERPT_EMPTY_NOTICE,
  SOURCE_EXCERPT_UNAVAILABLE_MESSAGE,
  SOURCE_EXCERPT_RESTRICTED_MESSAGE,
  INTAKE_TEXT_RESTRICTED_MESSAGE,
  type AuditCallTelemetry,
  type ExtractionDraft,
} from "../audit/types";
import { parseSourceInput } from "../audit/source-input";
import { canonicalLockedDirectTenPack } from "../audit/locked-question-pack";
import { dedupeCalls } from "./local-audit-session";
import { readHistoricalAudit } from "./historical-audit";
import {
  confirmSmartSelection,
  firstSmartGapStage,
  initialSmartSelection,
  prepareUnderstanding,
  selectSmartFocus,
  smartCategoryReady,
  smartComparatorsReady,
  smartLocationReady,
  smartMarketReady,
  smartProductReady,
  smartServiceReady,
  unsafeSmartName,
  unsafeSmartSelection,
  unsafeSmartSource,
  type SmartSelection,
} from "./smart-intake-contract";
import {
  freshSmartSession,
  readSmartSession,
  smartPackPrompts,
  writeSmartSession,
  type SmartQuestionPack,
  type SmartSession,
} from "./smart-session";
import type { GenerationAttempt } from "./local-session";
import type { GlmQuestionsOutcome } from "./local-questions";
import SmartReview from "./SmartReview";
import {
  SmartFocusScreen,
  SmartLocationScreen,
  SmartProductScreen,
} from "./smart-target-screens";
import {
  SmartCategoryScreen,
  SmartMarketScreen,
  SmartOfferingsScreen,
  SmartServiceScreen,
} from "./smart-detail-screens";
import {
  SmartCustomerNeedsScreen,
  SmartDecisionConsiderationsScreen,
  SmartDifferentiatorScreen,
  SmartCompetitorsScreen,
  SmartPublicFactScreen,
  SmartTargetCustomerScreen,
} from "./smart-customer-screens";
import SmartQuestionsScreen from "./SmartQuestionsScreen";
import SmartAuditStage from "@/app/audit/SmartAuditStage";

const READING_STEPS = [
  "Membaca sumber Anda",
  "Menemukan produk dan lokasi",
  "Memperkirakan pelanggan dan pembanding",
] as const;

const READING_INTERRUPTED_NOTICE =
  "Pembacaan sumber sebelumnya terputus. Isian Anda tetap tersimpan — tekan Periksa untuk membaca ulang.";

const SYNTHETIC_LABEL =
  "Mode uji lokal menggunakan pengganti sintetis berlabel.";

type SmartStage = SmartSession["stage"];

/**
 * True while the focus and category the owner confirmed on the review are
 * still untouched inside the current edit detour (R-05).
 */
function detourUnchanged(session: SmartSession): boolean {
  const baseline = session.editBaseline;
  return Boolean(
    baseline &&
    session.selection &&
    session.selection.focus === baseline.focus &&
    session.selection.category === baseline.category,
  );
}

/**
 * Forward hop after each framed screen. Outside a summary-edit detour the
 * chain is focus → location/product → category → offerings → target
 * customer → customer needs → decision considerations → service → market →
 * competitors → differentiator → public fact → summary. Inside a detour
 * (`editReturn`) a screen's Lanjut walks the remaining chain until it lands on
 * the review. Product and location edits pass through their target and
 * category screens (R-05/R-21).
 */
function forwardStageFor(session: SmartSession): SmartStage | null {
  const marker = session.editReturn;
  const selection = session.selection;
  const unchanged = marker ? detourUnchanged(session) : false;
  switch (session.stage) {
    case "focus": {
      if (!selection) return "category";
      if (selection.focus === "cabang") return "location";
      if (selection.focus === "produk") return "product";
      return unchanged ? marker! : "category";
    }
    case "location":
    case "product":
      return "category";
    case "category":
      return marker ?? "offerings";
    case "offerings":
      return marker ?? "target-customer";
    case "target-customer":
      return marker ?? "customer-needs";
    case "customer-needs":
      return marker ?? "decision-considerations";
    case "decision-considerations":
      return marker ?? "service";
    case "service":
      return (
        marker ?? (selection?.focus === "cabang" ? "competitors" : "market")
      );
    case "market":
      return marker ?? "competitors";
    case "competitors":
      return marker ?? "differentiator";
    case "differentiator":
      return marker ?? "public-fact";
    case "public-fact":
      return marker ?? "summary";
    default:
      return null;
  }
}

/**
 * In-flow target of the frame's `Kembali` and of a marked browser Back.
 * `entry` and `reading` have no back target; `reading` is never a target.
 * The summary steps back to the optional public-fact screen.
 * Inside a summary-edit detour every detail screen's Back exits straight to
 * the review, while the focus screen keeps its J4 guards: a picked location
 * or product whose target is still missing detours through that target
 * screen, and a changed focus or category passes the category checkpoint
 * before returning (R-05/R-21).
 */
function backTargetFor(session: SmartSession): SmartStage | null {
  const marker = session.editReturn;
  const selection = session.selection;
  switch (session.stage) {
    case "brand":
      // A review-opened name edit backs out to the review (J7); the normal
      // brand check still steps back to the entry screen.
      return marker ?? "entry";
    case "focus": {
      if (!marker || !selection) return "brand";
      if (selection.focus === "cabang" && !smartLocationReady(selection))
        return "location";
      if (selection.focus === "produk" && !smartProductReady(selection))
        return "product";
      return detourUnchanged(session) ? marker : "category";
    }
    case "location":
      return "focus";
    case "product":
      return marker && session.editBaseline === undefined ? marker : "focus";
    case "category":
      return (
        marker ??
        (selection?.focus === "cabang"
          ? "location"
          : selection?.focus === "produk"
            ? "product"
            : "focus")
      );
    case "offerings":
      return marker ?? "category";
    case "target-customer":
      return marker ?? "offerings";
    case "customer-needs":
      return marker ?? "target-customer";
    case "decision-considerations":
      return marker ?? "customer-needs";
    case "service":
      return marker ?? "decision-considerations";
    case "market":
      return marker ?? "service";
    case "competitors":
      return marker ?? (selection?.focus === "cabang" ? "service" : "market");
    case "differentiator":
      return marker ?? "competitors";
    case "public-fact":
      return marker ?? "differentiator";
    case "summary":
      return "public-fact";
    case "questions":
      return "summary";
    case "audit":
      return "questions";
    default:
      return null;
  }
}

/**
 * Marker fields for a forward hop that lands on `target`: arriving on the
 * review consumes the marker and its baseline; every other stage keeps them.
 */
function markerFields(
  session: SmartSession,
  target: SmartStage,
): Pick<SmartSession, "editReturn" | "editBaseline"> {
  return target === session.editReturn
    ? { editReturn: undefined, editBaseline: undefined }
    : { editReturn: session.editReturn, editBaseline: session.editBaseline };
}

/**
 * Marker fields for a back hop: landing on the focus or category screen
 * keeps the detour alive (the target guard and the category checkpoint still
 * apply), while landing anywhere else — a target screen, the review, or the
 * brand check — consumes it so backing out always resumes the ordinary
 * chain (J4 B1).
 */
function backMarkerFields(
  session: SmartSession,
  target: SmartStage,
): Pick<SmartSession, "editReturn" | "editBaseline"> {
  return target === "focus" || target === "category"
    ? {
        editReturn: session.editReturn,
        editBaseline: session.editBaseline,
      }
    : { editReturn: undefined, editBaseline: undefined };
}

/**
 * Four-segment chapter fill per framed screen. Bab 2 is focus → target →
 * category → offerings (the target screen only exists under a location or
 * product focus); bab 3 is service → market (location focus audits no
 * market, so service completes the chapter). Fractional fills never leave a
 * hole (deck §6.1).
 */
function stageProgress(session: SmartSession) {
  const fills = (chapter: number, fill: number) => {
    const value = [1, 0, 0, 0] as [number, number, number, number];
    for (let index = 0; index < chapter - 1; index += 1) value[index] = 1;
    value[chapter - 1] = fill;
    return { chapter, fills: value };
  };
  const targetStages: SmartStage[] =
    session.selection?.focus === "cabang"
      ? ["location"]
      : session.selection?.focus === "produk"
        ? ["product"]
        : [];
  const bab2: SmartStage[] = [
    "focus",
    ...targetStages,
    "category",
    "offerings",
  ];
  const bab3: SmartStage[] = [
    "target-customer",
    "customer-needs",
    "decision-considerations",
    "service",
    ...(session.selection?.focus === "cabang" ? [] : ["market" as const]),
    "competitors",
    "differentiator",
    "public-fact",
  ];
  if (session.stage === "brand") return fills(1, 1);
  const index2 = bab2.indexOf(session.stage);
  if (index2 >= 0) return fills(2, (index2 + 1) / bab2.length);
  const index3 = bab3.indexOf(session.stage);
  if (index3 >= 0) return fills(3, (index3 + 1) / bab3.length);
  if (session.stage === "summary") return fills(4, 0.5);
  return null;
}

const ORIGIN_TEXT = {
  website: "Dari website Anda",
  nuave: "Saran Nuave",
  owner: "Dari Anda",
} as const;

function intakeMark() {
  return { ...(window.history.state ?? {}), nuaveIntake: true };
}

function brandInitials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase());
  return letters.join("") || "?";
}

function attemptForOutcome(
  started_at: string,
  outcome: GlmQuestionsOutcome,
): GenerationAttempt | null {
  if (outcome.status === "ok" || outcome.status === "validation_failed") {
    return {
      started_at,
      outcome: outcome.status === "ok" ? "succeeded" : "failed",
      execution: "confirmed",
      cost_usd: outcome.cost.billedUsd,
    };
  }
  if (outcome.status !== "failed" || outcome.providerContact === "none")
    return null;
  return {
    started_at,
    outcome: "failed",
    execution: outcome.providerContact === "sent" ? "unknown" : "confirmed",
    cost_usd: outcome.cost?.billedUsd ?? null,
  };
}

export default function SmartIntakeJourney({
  live,
  glmStubBehavior,
}: {
  live: boolean;
  glmStubBehavior?: string;
}) {
  const [session, setSession] = useState<SmartSession>(freshSmartSession);
  const [ready, setReady] = useState(false);
  const [historical, setHistorical] = useState(false);
  const [busy, setBusy] = useState<"reading" | "questions" | null>(null);
  const [readingStep, setReadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [interrupted, setInterrupted] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const [editingBrandName, setEditingBrandName] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusedStage = useRef<string | null>(null);
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  });
  const sourceFailure = {
    unavailable: SOURCE_EXCERPT_UNAVAILABLE_MESSAGE,
    restricted: SOURCE_EXCERPT_RESTRICTED_MESSAGE,
    "rate-limited": "Permintaan terlalu banyak. Coba lagi dalam beberapa saat.",
    "rate-unavailable":
      "Perlindungan akses sedang tidak tersedia. Coba lagi nanti.",
  };
  const restoredSourceError =
    session.sourceExcerptStatus && session.sourceExcerptStatus in sourceFailure
      ? sourceFailure[session.sourceExcerptStatus as keyof typeof sourceFailure]
      : null;
  useEffect(() => {
    queueMicrotask(() => {
      const saved = readSmartSession();
      if (saved) {
        if (saved.stage === "reading") {
          // A stored reading session means the page was reloaded mid-read:
          // return to entry with the fields kept and never replay the call.
          const next: SmartSession = { ...saved, stage: "entry" };
          writeSmartSession(next);
          setSession(next);
          setInterrupted(true);
        } else {
          setSession(saved);
        }
      } else setHistorical(Boolean(readHistoricalAudit()));
      setReady(true);
    });
  }, []);

  // History ownership: every in-flow entry is marked `nuaveIntake` and a
  // marked duplicate stays on top while the stage has a back target. A real
  // browser Back lands on the marked entry below and performs one in-flow
  // step back; the trap is re-armed unless the landing stage is `entry`.
  useEffect(() => {
    if (!ready) return;
    if (window.history.state?.nuaveIntake !== true)
      window.history.replaceState(intakeMark(), "");
    if (backTargetFor(sessionRef.current))
      window.history.pushState(intakeMark(), "");
    const onBack = (event: PopStateEvent) => {
      // Fragment or foreign history events must not move the intake flow.
      if (event.state?.nuaveIntake !== true) return;
      const current = sessionRef.current;
      const target = backTargetFor(current);
      if (!target) return;
      // The review-return marker survives a back hop onto the focus or
      // category checkpoint; landing anywhere else consumes it.
      const next: SmartSession = {
        ...current,
        stage: target,
        ...backMarkerFields(current, target),
      };
      setError(null);
      setAutoStart(false);
      writeSmartSession(next);
      setSession(next);
      if (backTargetFor(next)) window.history.pushState(intakeMark(), "");
    };
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, [ready]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // R-27: each screen arrival moves focus to its heading and resets scroll.
  // The questions stage swaps its placeholder heading for the pack's heading
  // when the pack lands, so the key must include that arrival too.
  const focusKey =
    session.stage === "questions"
      ? `questions:${Boolean(session.pack)}`
      : session.stage;
  useEffect(() => {
    if (!ready || focusedStage.current === focusKey) return;
    focusedStage.current = focusKey;
    window.scrollTo(0, 0);
    headingRef.current?.focus();
  }, [ready, focusKey]);

  const persist = (next: SmartSession) => {
    writeSmartSession(next);
    setSession(next);
  };
  // A forward transition keeps one marked entry on top of the stack so the
  // next browser Back performs exactly one in-flow step back. An async tail
  // may finish after the owner left /audit: the finished state still saves,
  // but pushing history on the page they moved to would strand a marked
  // entry there, so the push is skipped once unmounted.
  const goStage = (next: SmartSession) => {
    persist(next);
    if (mounted.current) window.history.pushState(intakeMark(), "");
  };
  // The frame's `Kembali` moves in-flow without touching the stack; the trap
  // stays on top, so a later real Back still steps back from the new stage.
  const goBack = () => {
    const target = backTargetFor(session);
    if (!target) return;
    persist({
      ...session,
      stage: target,
      ...backMarkerFields(session, target),
    });
    setError(null);
  };
  function stopSensitiveInput() {
    setError(INTAKE_TEXT_RESTRICTED_MESSAGE);
  }
  function newJourney() {
    const next = freshSmartSession();
    persist(next);
    setHistorical(false);
    setError(null);
    setInterrupted(false);
    setAutoStart(false);
  }
  async function inspect() {
    if (inFlight.current) return;
    const parsed = parseSourceInput(session.entry.source);
    const name = session.entry.name.trim();
    if (!name || !parsed) {
      setError("Isi nama bisnis dan satu URL website publik yang valid.");
      return;
    }
    if (
      unsafeSmartName(session.entry.name) ||
      unsafeSmartSource(session.entry.source)
    ) {
      stopSensitiveInput();
      return;
    }
    setInterrupted(false);
    setError(null);
    // The source is unchanged: preparation stays reusable and a name-only
    // correction applies without another call (Spec 013 R-05/R-09).
    if (
      session.prepared &&
      session.selection &&
      session.identity &&
      parsed.normalizedUrl === session.identity.inputSource
    ) {
      if (name !== session.prepared.typedName) {
        // The stored discovered name was deduped against the old typed name;
        // recompute it so the website's name is offered when it now differs
        // and hidden when it now matches (R-09).
        const discovered = session.identity.displayName?.trim();
        goStage({
          ...session,
          stage: "brand",
          entry: { ...session.entry, name },
          identity: { ...session.identity, inputName: name },
          prepared: {
            ...session.prepared,
            typedName: name,
            discoveredName:
              discovered && discovered !== name ? discovered : null,
          },
          selection: {
            ...session.selection,
            name,
            nameOrigin: "owner",
          },
          confirmedSelection: null,
          frozen: null,
          pack: null,
        });
      } else {
        goStage({ ...session, stage: "brand" });
      }
      return;
    }
    inFlight.current = true;
    setBusy("reading");
    setReadingStep(0);
    let working: SmartSession = { ...session, stage: "reading" };
    persist(working);
    try {
      let identity = working.identity;
      if (
        !identity ||
        identity.inputName !== name ||
        identity.inputSource !== parsed.normalizedUrl
      ) {
        const response = await fetch(
          `/api/audit/identity?source=${encodeURIComponent(parsed.normalizedUrl)}`,
        );
        const result = (await response.json().catch(() => ({}))) as {
          canonical_url?: string;
          display_name?: string;
          preparation_mode?: string;
          error?: string;
        };
        if (!response.ok || typeof result.canonical_url !== "string")
          throw new Error(result.error || "Sumber bisnis belum dapat dibaca.");
        const canonical = parseSourceInput(result.canonical_url);
        if (
          !canonical ||
          unsafeSmartSource(canonical.normalizedUrl) ||
          (typeof result.display_name === "string" &&
            unsafeSmartName(result.display_name))
        )
          throw new Error(
            "Sumber bisnis berisi informasi yang tidak dapat digunakan.",
          );
        identity = {
          inputName: name,
          inputSource: parsed.normalizedUrl,
          canonicalUrl: canonical.normalizedUrl,
          displayName:
            typeof result.display_name === "string"
              ? result.display_name
              : null,
          preparationMode:
            result.preparation_mode === "live" ? "live" : "synthetic-local",
        };
        working = { ...working, identity };
        persist(working);
      }
      setReadingStep(1);
      const extractionResponse = await fetch("/api/audit/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website_url: identity.canonicalUrl,
          brand_name: name,
          market_context: "",
          category: "",
          identity_unverified: true,
          safety_identifier: `local-${crypto.randomUUID()}`,
          budget: {
            limit_usd: AUDIT_COST_LIMIT_USD,
            carryover_cost_usd: 0,
            calls: working.preparationCalls,
          },
        }),
      });
      const extraction = (await extractionResponse
        .json()
        .catch(() => ({}))) as {
        draft?: ExtractionDraft;
        telemetry?: AuditCallTelemetry[];
        preparation_mode?: string;
        source_excerpt_status?: unknown;
        error?: string;
      };
      const sourceStatus = sourceExcerptStatusSchema.safeParse(
        extraction.source_excerpt_status,
      );
      working = {
        ...working,
        sourceExcerptStatus: sourceStatus.success
          ? sourceStatus.data
          : undefined,
        preparationCalls: dedupeCalls([
          ...working.preparationCalls,
          ...(Array.isArray(extraction.telemetry)
            ? extraction.telemetry.flatMap((item) => {
                const parsed = auditCallTelemetrySchema.safeParse(item);
                return parsed.success ? [parsed.data] : [];
              })
            : []),
        ]),
        preparationMode:
          extraction.preparation_mode === "live" ||
          identity.preparationMode === "live"
            ? "live"
            : "synthetic-local",
      };
      persist(working);
      setReadingStep(2);
      if (!extractionResponse.ok || !extraction.draft)
        throw new Error(
          extraction.error || "Fakta bisnis belum dapat disiapkan.",
        );
      const prepared = prepareUnderstanding({
        typedName: working.entry.name,
        discoveredName: identity.displayName,
        canonicalSource: identity.canonicalUrl,
        draft: extraction.draft,
      });
      goStage({
        ...working,
        stage: "brand",
        prepared,
        selection: initialSmartSelection(prepared),
        confirmedSelection: null,
        frozen: null,
        pack: null,
      });
    } catch (cause) {
      persist({ ...working, stage: "entry" });
      setError(
        cause instanceof Error
          ? cause.message
          : "Persiapan terhenti. Periksa sumber dan coba lagi.",
      );
    } finally {
      inFlight.current = false;
      setBusy(null);
      setReadingStep(0);
    }
  }

  async function confirm() {
    if (inFlight.current || !session.prepared || !session.selection) return;
    let candidate;
    try {
      candidate = confirmSmartSelection(
        session.prepared,
        session.selection,
        session.frozen ? session.frozen.factVersion + 1 : 1,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Periksa pilihan Anda.",
      );
      return;
    }
    // Returning to the unchanged committed summary does not spend another call.
    const unchanged =
      session.frozen &&
      JSON.stringify(session.frozen.context) ===
        JSON.stringify(candidate.context);
    if (unchanged && session.pack) {
      goStage({
        ...session,
        stage: "questions",
        selection: session.confirmedSelection,
      });
      setError(null);
      return;
    }
    const frozen = unchanged ? session.frozen! : candidate;
    inFlight.current = true;
    setBusy("questions");
    setError(null);
    const started_at = new Date().toISOString();
    const committed: SmartSession = {
      ...session,
      stage: "questions",
      confirmedSelection: session.selection,
      frozen,
      pack: null,
      // Persist an unknown-outcome attempt before the request leaves. A
      // reload cannot silently erase an in-flight provider possibility.
      generationAttempts: [
        ...session.generationAttempts,
        {
          started_at,
          outcome: "interrupted",
          execution: "unknown",
          cost_usd: null,
        },
      ],
    };
    goStage(committed);
    try {
      const response = await fetch("/api/audit/glm-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intake: frozen,
          method: "direct-ten",
          ...(glmStubBehavior ? { stubBehavior: glmStubBehavior } : {}),
        }),
      });
      const outcome = (await response
        .json()
        .catch(() => null)) as GlmQuestionsOutcome | null;
      if (!outcome)
        throw new Error(
          "Respons pertanyaan tidak diterima. Percobaan mungkin sudah dikenai biaya.",
        );
      const attempt = attemptForOutcome(started_at, outcome);
      const attempts = attempt
        ? [...session.generationAttempts, attempt]
        : session.generationAttempts;
      const settled = { ...committed, generationAttempts: attempts };
      persist(settled);
      if (!response.ok || outcome.status !== "ok") {
        throw new Error(
          outcome.status === "failed" || outcome.status === "invalid_request"
            ? outcome.status === "failed" && outcome.reason === "incomplete"
              ? "Penyusunan 10 pertanyaan belum selesai. Jawaban Anda tetap tersedia dalam sesi ini. Coba siapkan pertanyaan lagi."
              : outcome.detail
            : outcome.status === "validation_failed"
              ? outcome.issues.join(" ")
              : "Pertanyaan perlu ditinjau ulang.",
        );
      }
      const pack: SmartQuestionPack = {
        version: "nuave-local-questions-v2",
        inputFingerprint: frozen.fingerprint,
        originals: [...outcome.questions],
        approved: [...outcome.questions],
        revision: 0,
        provenance: outcome.provenance,
        billedCostUsd: outcome.cost.billedUsd,
      };
      canonicalLockedDirectTenPack(smartPackPrompts(pack), frozen.context);
      persist({ ...settled, pack });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Pembuatan pertanyaan terhenti.",
      );
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  function updateSelection(selection: SmartSelection) {
    if (unsafeSmartSelection(selection)) {
      stopSensitiveInput();
      return;
    }
    persist({ ...session, selection });
    setError(null);
  }

  if (!ready)
    return (
      <section className="mx-auto max-w-3xl px-5 py-14" role="status">
        Menyiapkan sesi audit…
      </section>
    );
  if (historical)
    return (
      <section
        className="mx-auto max-w-3xl px-5 py-14"
        data-historical-audit="held"
      >
        <h1 className="type-heading-lg">Audit lama tersimpan di sesi ini</h1>
        <AuditNotice tone="info" title="Hasil lama belum tersedia di versi ini">
          Catatan audit lama tetap tersimpan di browser ini. Tampilan laporan,
          unduhan, melanjutkan pengamatan, dan percobaan ulang laporan ditahan
          untuk catatan tersebut.
        </AuditNotice>
        <Button className="mt-6" onClick={newJourney}>
          Mulai audit baru
        </Button>
      </section>
    );
  if (session.stage === "questions" && session.frozen)
    return (
      <>
        {session.pack ? (
          <SmartQuestionsScreen
            headingRef={headingRef}
            pack={session.pack}
            context={session.frozen.context}
            onChange={(pack) => persist({ ...session, pack })}
            onBack={goBack}
            onApprove={() => {
              if (inFlight.current) return;
              try {
                canonicalLockedDirectTenPack(
                  smartPackPrompts(session.pack!),
                  session.frozen!.context,
                );
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Periksa pertanyaan audit.",
                );
                return;
              }
              goStage({ ...session, stage: "audit" });
              setAutoStart(true);
            }}
          />
        ) : (
          <section className="mx-auto grid max-w-3xl gap-4 px-5 py-14">
            <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
              Siapkan pertanyaan audit
            </h1>
            <p className="type-copy">
              {busy === "questions"
                ? "Sepuluh pertanyaan sedang disiapkan."
                : "Pertanyaan belum diterima. Coba lagi hanya jika Anda ingin membuat permintaan baru."}
            </p>
            {busy !== "questions" ? (
              <>
                <Button className="w-fit" onClick={() => void confirm()}>
                  Coba siapkan pertanyaan
                </Button>
                {live ? (
                  <p className="type-copy">
                    Mencoba lagi mengirim permintaan baru dan dapat menambah
                    biaya penggunaan AI.
                  </p>
                ) : null}
              </>
            ) : null}
            <Button variant="ghost" className="w-fit" onClick={goBack}>
              Kembali ke ringkasan
            </Button>
          </section>
        )}
        {error ? (
          <p
            role="alert"
            className="mx-auto max-w-3xl px-5 type-copy text-destructive"
          >
            {error}
          </p>
        ) : null}
      </>
    );
  if (session.stage === "audit" && session.frozen && session.pack)
    return (
      <SmartAuditStage
        pack={session.pack}
        input={session.frozen}
        autoStart={autoStart}
        preparationCalls={session.preparationCalls}
        preparationMode={session.preparationMode}
        generationAttempts={session.generationAttempts}
        onExit={() => {
          window.history.back();
        }}
        onRestart={newJourney}
      />
    );

  // Framed intake screens (Spec 013 J2+J4): entry → reading → brand → focus
  // → location/product → summary.
  const progress = stageProgress(session);
  const backTarget = backTargetFor(session);
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[560px] flex-col px-6 pb-[calc(148px+env(safe-area-inset-bottom,0px))] pt-8 sm:px-8">
      <header>
        <p className="type-heading-md m-0">nuave</p>
        {progress ? (
          <div className="mt-6">
            <IntakeChapterProgress
              fills={progress.fills}
              label={`Bab ${progress.chapter} dari 4`}
            />
          </div>
        ) : null}
      </header>
      <main className="mt-10 flex-1">
        {session.stage === "entry" ? (
          <section className="grid gap-5" data-intake-screen="entry">
            <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
              Periksa visibilitas bisnis Anda
            </h1>
            {interrupted ? (
              <p role="status" className="type-copy-sm text-muted-foreground">
                {READING_INTERRUPTED_NOTICE}
              </p>
            ) : null}
            <p className="type-copy">
              Masukkan nama bisnis dan website publik. Nuave menyiapkan
              ringkasan untuk Anda periksa.
            </p>
            <label className="grid gap-2 type-label">
              Nama bisnis
              <Input
                value={session.entry.name}
                maxLength={160}
                onChange={(event) => {
                  if (unsafeSmartName(event.target.value)) {
                    stopSensitiveInput();
                    return;
                  }
                  // A name-only edit keeps preparation and every later
                  // answer; `Periksa` applies it without another read.
                  persist({
                    ...session,
                    entry: { ...session.entry, name: event.target.value },
                  });
                  setError(null);
                }}
              />
            </label>
            <label className="grid gap-2 type-label">
              URL website publik
              <Input
                value={session.entry.source}
                maxLength={2_000}
                onChange={(event) => {
                  if (unsafeSmartSource(event.target.value)) {
                    stopSensitiveInput();
                    return;
                  }
                  // A website change invalidates preparation: the next
                  // `Periksa` reads the new source from scratch.
                  persist({
                    ...session,
                    entry: { ...session.entry, source: event.target.value },
                    identity: null,
                    sourceExcerptStatus: undefined,
                    prepared: null,
                    selection: null,
                    confirmedSelection: null,
                    frozen: null,
                    pack: null,
                    editReturn: undefined,
                    editBaseline: undefined,
                  });
                  setError(null);
                }}
              />
            </label>
            {error || restoredSourceError ? (
              <p role="alert" className="type-copy text-destructive">
                {error || restoredSourceError}
              </p>
            ) : null}
            <Button
              className="w-fit"
              disabled={busy !== null}
              onClick={() => void inspect()}
            >
              {busy === "reading" ? "Memeriksa…" : "Periksa"}
            </Button>
            {!live ? (
              <p className="type-copy-sm text-muted-foreground">
                {SYNTHETIC_LABEL}
              </p>
            ) : null}
          </section>
        ) : null}
        {session.stage === "reading" ? (
          <section
            className="grid gap-5"
            data-intake-screen="reading"
            aria-label="Pembacaan sumber"
          >
            <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
              Sebentar, Nuave sedang membaca
            </h1>
            <ul
              role="status"
              aria-live="polite"
              className="m-0 grid list-none gap-4 p-0"
            >
              {READING_STEPS.map((step, index) => {
                const state =
                  index < readingStep
                    ? "done"
                    : index === readingStep
                      ? "active"
                      : "pending";
                return (
                  <li
                    key={step}
                    data-reading-step={state}
                    className="flex items-center gap-3 type-copy"
                  >
                    {state === "done" ? (
                      <IconCheck
                        className="size-5 shrink-0 text-[var(--action)]"
                        aria-hidden
                      />
                    ) : state === "active" ? (
                      <IconLoader2
                        className="size-5 shrink-0 animate-spin text-[var(--action)]"
                        aria-hidden
                      />
                    ) : (
                      <IconCircle
                        className="size-5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                    <span
                      className={
                        state === "pending"
                          ? "text-muted-foreground"
                          : undefined
                      }
                    >
                      {step}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="type-copy-sm text-muted-foreground">
              Semua bisa Anda koreksi. Anda yang paling tahu bisnis Anda.
            </p>
            {!live ? (
              <p className="type-copy-sm text-muted-foreground">
                {SYNTHETIC_LABEL}
              </p>
            ) : null}
          </section>
        ) : null}
        {session.stage === "brand" && session.prepared && session.selection ? (
          <section className="grid gap-5" data-intake-screen="brand">
            <h1 ref={headingRef} tabIndex={-1} className="type-heading-lg">
              Ini brand yang ingin Anda audit?
            </h1>
            {session.sourceExcerptStatus === "no-usable-text" ? (
              <p role="status" className="type-copy-sm text-muted-foreground">
                {SOURCE_EXCERPT_EMPTY_NOTICE}
              </p>
            ) : null}
            <article
              className="flex items-center gap-4 rounded-xl border border-border p-5"
              aria-label="Brand yang ditemukan"
            >
              <span
                className="grid size-12 shrink-0 place-items-center rounded-full border border-border type-heading-sm"
                aria-hidden="true"
              >
                {brandInitials(session.selection.name)}
              </span>
              <div className="min-w-0">
                <h2 className="type-heading-sm m-0 break-words">
                  {session.selection.name}
                </h2>
                <p className="type-copy-sm m-0 mt-1 break-all text-muted-foreground">
                  {session.prepared.canonicalSource} ·{" "}
                  {ORIGIN_TEXT[session.selection.nameOrigin]}
                </p>
              </div>
            </article>
            <div
              role="radiogroup"
              aria-label="Nama bisnis"
              className="grid gap-1"
            >
              <label className="flex min-h-11 items-center gap-3 type-copy">
                <input
                  type="radio"
                  name="smart-brand-name"
                  checked={
                    session.selection.name === session.prepared.typedName &&
                    session.selection.nameOrigin === "owner"
                  }
                  onChange={() =>
                    updateSelection({
                      ...session.selection!,
                      name: session.prepared!.typedName,
                      nameOrigin: "owner",
                    })
                  }
                />
                {session.prepared.typedName}{" "}
                <span className="type-copy-sm text-muted-foreground">
                  Dari Anda
                </span>
              </label>
              {session.prepared.discoveredName &&
              session.prepared.discoveredName !== session.prepared.typedName ? (
                <label className="flex min-h-11 items-center gap-3 type-copy">
                  <input
                    type="radio"
                    name="smart-brand-name"
                    checked={
                      session.selection.name ===
                        session.prepared.discoveredName &&
                      session.selection.nameOrigin === "website"
                    }
                    onChange={() =>
                      updateSelection({
                        ...session.selection!,
                        name: session.prepared!.discoveredName!,
                        nameOrigin: "website",
                      })
                    }
                  />
                  {session.prepared.discoveredName}{" "}
                  <span className="type-copy-sm text-muted-foreground">
                    Dari website Anda
                  </span>
                </label>
              ) : null}
            </div>
            <div>
              <Button
                variant="link"
                className="w-fit"
                onClick={() => setEditingBrandName((value) => !value)}
              >
                Ubah nama
              </Button>
              {editingBrandName ? (
                <label className="mt-2 grid gap-2 type-label">
                  Nama brand
                  <Input
                    value={session.selection.name}
                    maxLength={160}
                    onChange={(event) =>
                      updateSelection({
                        ...session.selection!,
                        name: event.target.value,
                        nameOrigin: "owner",
                      })
                    }
                  />
                </label>
              ) : null}
            </div>
            {error ? (
              <p role="alert" className="type-copy text-destructive">
                {error}
              </p>
            ) : null}
          </section>
        ) : null}
        {session.stage === "focus" && session.prepared && session.selection ? (
          <SmartFocusScreen
            headingRef={headingRef}
            prepared={session.prepared}
            selection={session.selection}
            onChange={updateSelection}
            error={error}
            onEnterLocationManually={() => {
              const next = selectSmartFocus(
                session.prepared!,
                session.selection!,
                "cabang",
              );
              if (unsafeSmartSelection(next)) {
                stopSensitiveInput();
                return;
              }
              goStage({
                ...session,
                selection: next,
                stage: "location",
              });
            }}
          />
        ) : null}
        {session.stage === "location" &&
        session.prepared &&
        session.selection ? (
          <SmartLocationScreen
            headingRef={headingRef}
            prepared={session.prepared}
            selection={session.selection}
            onChange={updateSelection}
            error={error}
          />
        ) : null}
        {session.stage === "product" &&
        session.prepared &&
        session.selection ? (
          <SmartProductScreen
            headingRef={headingRef}
            prepared={session.prepared}
            selection={session.selection}
            onChange={updateSelection}
            error={error}
          />
        ) : null}
        {session.stage === "category" &&
        session.prepared &&
        session.selection ? (
          <SmartCategoryScreen
            headingRef={headingRef}
            prepared={session.prepared}
            selection={session.selection}
            onChange={updateSelection}
            error={error}
          />
        ) : null}
        {session.stage === "offerings" &&
        session.prepared &&
        session.selection ? (
          <SmartOfferingsScreen
            headingRef={headingRef}
            prepared={session.prepared}
            selection={session.selection}
            onChange={updateSelection}
            error={error}
          />
        ) : null}
        {session.stage === "target-customer" &&
        session.prepared &&
        session.selection ? (
          <SmartTargetCustomerScreen
            headingRef={headingRef}
            prepared={session.prepared}
            selection={session.selection}
            onChange={updateSelection}
            error={error}
          />
        ) : null}
        {session.stage === "decision-considerations" &&
        session.prepared &&
        session.selection ? (
          <SmartDecisionConsiderationsScreen
            headingRef={headingRef}
            prepared={session.prepared}
            selection={session.selection}
            onChange={updateSelection}
            error={error}
          />
        ) : null}
        {session.stage === "differentiator" &&
        session.prepared &&
        session.selection ? (
          <SmartDifferentiatorScreen
            headingRef={headingRef}
            prepared={session.prepared}
            selection={session.selection}
            onChange={updateSelection}
            error={error}
          />
        ) : null}
        {session.stage === "service" &&
        session.prepared &&
        session.selection ? (
          <SmartServiceScreen
            headingRef={headingRef}
            prepared={session.prepared}
            selection={session.selection}
            onChange={updateSelection}
            error={error}
          />
        ) : null}
        {session.stage === "market" && session.prepared && session.selection ? (
          <SmartMarketScreen
            headingRef={headingRef}
            prepared={session.prepared}
            selection={session.selection}
            onChange={updateSelection}
            error={error}
          />
        ) : null}
        {session.stage === "customer-needs" &&
        session.prepared &&
        session.selection ? (
          <SmartCustomerNeedsScreen
            headingRef={headingRef}
            prepared={session.prepared}
            selection={session.selection}
            onChange={updateSelection}
            error={error}
          />
        ) : null}
        {session.stage === "competitors" &&
        session.prepared &&
        session.selection ? (
          <SmartCompetitorsScreen
            headingRef={headingRef}
            prepared={session.prepared}
            selection={session.selection}
            onChange={updateSelection}
            error={error}
          />
        ) : null}
        {session.stage === "public-fact" &&
        session.prepared &&
        session.selection ? (
          <SmartPublicFactScreen
            headingRef={headingRef}
            prepared={session.prepared}
            selection={session.selection}
            onChange={updateSelection}
            error={error}
          />
        ) : null}
        {session.stage === "summary" &&
        session.prepared &&
        session.selection ? (
          <>
            <SmartReview
              headingRef={headingRef}
              prepared={session.prepared}
              selection={session.selection}
              onChange={updateSelection}
              onFillGaps={() => {
                // The CTA opens the screen that owns the first still-missing
                // meaning; the return marker sends it back to the review
                // once corrected instead of replaying unrelated screens.
                const target = firstSmartGapStage(session.selection!);
                if (!target) return;
                goStage({
                  ...session,
                  stage: target,
                  editReturn: "summary",
                  editBaseline: undefined,
                });
                setError(null);
              }}
              onEditBrand={() => {
                // The business row's Ubah opens the existing brand screen;
                // its Lanjut and Back then return to the review (J7).
                goStage({
                  ...session,
                  stage: "brand",
                  editReturn: "summary",
                  editBaseline: undefined,
                });
                setError(null);
              }}
              onEditSource={() => {
                // The marker lets a same-source/name-only correction come
                // back through the brand check; a changed URL clears it and
                // resets preparation/frozen state on input change.
                persist({
                  ...session,
                  stage: "entry",
                  editReturn: "summary",
                  editBaseline: undefined,
                });
                setError(null);
              }}
              onEditFocus={() => {
                // The summary row reviews focus; the dedicated screen owns
                // the change, and this marker sends the detour back here
                // once the chain completes — recording the confirmed focus
                // and category so an untouched pick exits early (R-05/R-21).
                goStage({
                  ...session,
                  stage: "focus",
                  editReturn: "summary",
                  editBaseline: {
                    focus: session.selection!.focus,
                    category: session.selection!.category,
                  },
                });
                setError(null);
              }}
              onEditCategory={() => {
                goStage({
                  ...session,
                  stage: "category",
                  editReturn: "summary",
                  editBaseline: undefined,
                });
                setError(null);
              }}
              onEditOfferings={() => {
                goStage({
                  ...session,
                  stage:
                    session.selection?.focus === "produk"
                      ? "product"
                      : "offerings",
                  editReturn: "summary",
                  editBaseline: undefined,
                });
                setError(null);
              }}
              onEditService={() => {
                goStage({
                  ...session,
                  stage: "service",
                  editReturn: "summary",
                  editBaseline: undefined,
                });
                setError(null);
              }}
              onEditMarket={() => {
                goStage({
                  ...session,
                  stage: "market",
                  editReturn: "summary",
                  editBaseline: undefined,
                });
                setError(null);
              }}
              onEditCustomerNeeds={() => {
                goStage({
                  ...session,
                  stage: "customer-needs",
                  editReturn: "summary",
                  editBaseline: undefined,
                });
                setError(null);
              }}
              onEditTargetCustomer={() => {
                goStage({
                  ...session,
                  stage: "target-customer",
                  editReturn: "summary",
                  editBaseline: undefined,
                });
                setError(null);
              }}
              onEditDecisionConsiderations={() => {
                goStage({
                  ...session,
                  stage: "decision-considerations",
                  editReturn: "summary",
                  editBaseline: undefined,
                });
                setError(null);
              }}
              onEditDifferentiator={() => {
                goStage({
                  ...session,
                  stage: "differentiator",
                  editReturn: "summary",
                  editBaseline: undefined,
                });
                setError(null);
              }}
              onEditCompetitors={() => {
                goStage({
                  ...session,
                  stage: "competitors",
                  editReturn: "summary",
                  editBaseline: undefined,
                });
                setError(null);
              }}
              onEditPublicFact={() => {
                goStage({
                  ...session,
                  stage: "public-fact",
                  editReturn: "summary",
                  editBaseline: undefined,
                });
                setError(null);
              }}
              onConfirm={() => void confirm()}
              busy={busy !== null}
              error={error}
              sourceExcerptStatus={session.sourceExcerptStatus}
            />
            {session.confirmedSelection &&
            JSON.stringify(session.selection) !==
              JSON.stringify(session.confirmedSelection) ? (
              <Button
                variant="ghost"
                className="mt-4 w-fit"
                onClick={() =>
                  goStage({
                    ...session,
                    stage: "questions",
                    selection: session.confirmedSelection,
                  })
                }
              >
                Batalkan perubahan
              </Button>
            ) : null}
          </>
        ) : null}
      </main>
      {backTarget ? (
        <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background">
          <div className="mx-auto flex w-full max-w-[560px] items-center justify-between gap-3 px-6 py-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] sm:px-8">
            <Button
              variant="ghost"
              className="min-h-11 px-2 underline underline-offset-8"
              onClick={goBack}
            >
              Kembali
            </Button>
            {session.stage === "brand" ? (
              <Button
                className="min-h-11 rounded-full px-6"
                disabled={!session.selection?.name.trim()}
                onClick={() => {
                  setEditingBrandName(false);
                  // A review-opened name edit continues straight back to
                  // the review; the normal brand check still opens focus.
                  const target = session.editReturn ?? "focus";
                  goStage({
                    ...session,
                    stage: target,
                    ...markerFields(session, target),
                  });
                }}
              >
                Lanjut
              </Button>
            ) : [
                "focus",
                "location",
                "product",
                "category",
                "offerings",
                "target-customer",
                "customer-needs",
                "decision-considerations",
                "service",
                "market",
                "competitors",
                "differentiator",
                "public-fact",
              ].includes(session.stage) && session.selection ? (
              <Button
                className="min-h-11 rounded-full px-6"
                disabled={
                  (session.stage === "location" &&
                    !smartLocationReady(session.selection)) ||
                  (session.stage === "product" &&
                    !smartProductReady(session.selection)) ||
                  (session.stage === "category" &&
                    !smartCategoryReady(session.selection)) ||
                  (session.stage === "offerings" &&
                    session.selection.focus !== "produk" &&
                    !session.selection.offerings.length) ||
                  (session.stage === "service" &&
                    !smartServiceReady(session.selection)) ||
                  (session.stage === "market" &&
                    !smartMarketReady(session.selection)) ||
                  (session.stage === "competitors" &&
                    !smartComparatorsReady(session.selection))
                }
                onClick={() => {
                  const target = forwardStageFor(session);
                  if (!target) return;
                  goStage({
                    ...session,
                    stage: target,
                    ...markerFields(session, target),
                  });
                }}
              >
                Lanjut
              </Button>
            ) : (
              <span />
            )}
          </div>
        </footer>
      ) : null}
    </div>
  );
}
