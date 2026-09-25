"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuditNotice } from "@/components/product/AuditNotice";
import {
  AUDIT_COST_LIMIT_USD,
  auditCallTelemetrySchema,
  sourceExcerptStatusSchema,
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
  initialSmartSelection,
  prepareUnderstanding,
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
import SmartSummary from "./SmartSummary";
import SmartQuestionsScreen from "./SmartQuestionsScreen";
import SmartAuditStage from "@/app/audit/SmartAuditStage";

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
  const [error, setError] = useState<string | null>(null);
  const [autoStart, setAutoStart] = useState(false);
  const inFlight = useRef(false);
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
      if (saved) setSession(saved);
      else setHistorical(Boolean(readHistoricalAudit()));
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready || session.stage !== "audit") return;
    if (window.history.state?.nuaveSmartIntake !== "audit") {
      window.history.replaceState(
        { ...window.history.state, nuaveSmartIntake: "questions" },
        "",
      );
      window.history.pushState(
        { ...window.history.state, nuaveSmartIntake: "audit" },
        "",
      );
    }
    const onBack = (event: PopStateEvent) => {
      // Only our question entry represents Back from this saved audit.
      // Fragment/unmarked history events must not dismiss the report.
      if (event.state?.nuaveSmartIntake !== "questions") return;
      const next: SmartSession = { ...session, stage: "questions" };
      setAutoStart(false);
      writeSmartSession(next);
      setSession(next);
    };
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, [ready, session]);

  const persist = (next: SmartSession) => {
    writeSmartSession(next);
    setSession(next);
  };
  function stopSensitiveInput() {
    setError(INTAKE_TEXT_RESTRICTED_MESSAGE);
  }
  function newJourney() {
    const next = freshSmartSession();
    persist(next);
    setHistorical(false);
    setError(null);
    setAutoStart(false);
  }
  async function inspect() {
    if (inFlight.current) return;
    const parsed = parseSourceInput(session.entry.source);
    if (!session.entry.name.trim() || !parsed) {
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
    if (
      session.prepared &&
      session.entry.name.trim() === session.prepared.typedName &&
      parsed.normalizedUrl === session.prepared.canonicalSource
    ) {
      persist({ ...session, stage: "summary" });
      setError(null);
      return;
    }
    inFlight.current = true;
    setBusy("reading");
    setError(null);
    let working = session;
    try {
      let identity = working.identity;
      if (
        !identity ||
        identity.inputName !== session.entry.name.trim() ||
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
          inputName: session.entry.name.trim(),
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
      const extractionResponse = await fetch("/api/audit/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website_url: identity.canonicalUrl,
          brand_name: session.entry.name.trim(),
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
      persist({
        ...working,
        stage: "summary",
        prepared,
        selection: initialSmartSelection(prepared),
        confirmedSelection: null,
        frozen: null,
        pack: null,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Persiapan terhenti. Periksa sumber dan coba lagi.",
      );
    } finally {
      inFlight.current = false;
      setBusy(null);
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
      persist({
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
    persist(committed);
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
            ? outcome.detail
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
  if (session.stage === "entry")
    return (
      <section
        className="mx-auto grid max-w-3xl gap-5 px-5 py-14"
        data-intake-screen="entry"
      >
        <h1 className="type-heading-lg">Periksa visibilitas bisnis Anda</h1>
        <p className="type-copy">
          Masukkan nama bisnis dan website publik. Nuave menyiapkan ringkasan
          untuk Anda periksa.
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
              persist({
                ...session,
                entry: { ...session.entry, name: event.target.value },
                identity: null,
                sourceExcerptStatus: undefined,
                prepared: null,
                selection: null,
                confirmedSelection: null,
                frozen: null,
                pack: null,
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
            Mode uji lokal menggunakan pengganti sintetis berlabel.
          </p>
        ) : null}
      </section>
    );
  if (
    (session.stage === "summary" || session.stage === "clarify") &&
    session.prepared &&
    session.selection
  )
    return (
      <>
        <SmartSummary
          key={session.stage}
          prepared={session.prepared}
          selection={session.selection}
          onChange={(selection: SmartSelection) => {
            if (unsafeSmartSelection(selection)) {
              stopSensitiveInput();
              return;
            }
            persist({ ...session, selection });
            setError(null);
          }}
          onClarify={() => {
            persist({ ...session, stage: "clarify" });
            setError(null);
          }}
          onEditSource={() => {
            persist({ ...session, stage: "entry" });
            setError(null);
          }}
          onConfirm={() => void confirm()}
          busy={busy !== null}
          error={error}
          sourceExcerptStatus={session.sourceExcerptStatus}
          clarify={session.stage === "clarify"}
        />
        {session.stage === "clarify" ? (
          <div className="mx-auto max-w-3xl px-5 pb-10">
            <Button onClick={() => persist({ ...session, stage: "summary" })}>
              Kembali ke ringkasan
            </Button>
          </div>
        ) : null}
        {session.confirmedSelection &&
        JSON.stringify(session.selection) !==
          JSON.stringify(session.confirmedSelection) ? (
          <div className="mx-auto max-w-3xl px-5 pb-10">
            <Button
              variant="ghost"
              onClick={() =>
                persist({
                  ...session,
                  stage: "questions",
                  selection: session.confirmedSelection,
                })
              }
            >
              Batalkan perubahan
            </Button>
          </div>
        ) : null}
      </>
    );
  if (session.stage === "questions" && session.frozen)
    return (
      <>
        {session.pack ? (
          <SmartQuestionsScreen
            pack={session.pack}
            context={session.frozen.context}
            onChange={(pack) => persist({ ...session, pack })}
            onBack={() => {
              setError(null);
              persist({ ...session, stage: "summary" });
            }}
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
              persist({ ...session, stage: "audit" });
              setAutoStart(true);
            }}
          />
        ) : (
          <section className="mx-auto grid max-w-3xl gap-4 px-5 py-14">
            <h1 className="type-heading-lg">Siapkan pertanyaan audit</h1>
            <p className="type-copy">
              {busy === "questions"
                ? "Sepuluh pertanyaan sedang disiapkan."
                : "Pertanyaan belum diterima. Coba lagi hanya jika Anda ingin membuat permintaan baru."}
            </p>
            {busy !== "questions" ? (
              <Button className="w-fit" onClick={() => void confirm()}>
                Coba siapkan pertanyaan
              </Button>
            ) : null}
            <Button
              variant="ghost"
              className="w-fit"
              onClick={() => persist({ ...session, stage: "summary" })}
            >
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
  return null;
}
