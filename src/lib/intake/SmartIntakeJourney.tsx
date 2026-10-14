"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconCheck, IconCircle, IconLoader2 } from "@tabler/icons-react";
import { AuditNotice } from "@/components/product/AuditNotice";
import IntakeChapterProgress from "./progress";
import {
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
import { AUDIT_CLIENT_CONTRACT_VERSION } from "../audit/client-contract";
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
  clearSmartSession,
  freshSmartSession,
  readActiveOrder,
  readSmartSession,
  smartPackPrompts,
  writeActiveOrder,
  writeSmartSession,
  type SmartQuestionPack,
  type SmartSession,
} from "./smart-session";
import {
  FreeBrandScreen,
  OrderScreen,
  type OrderPayment,
} from "./order-screens";
import { readTestPassCode } from "./test-pass";
import type { GenerationAttempt } from "./local-session";
import {
  questionPublicCost,
  questionPublicMessage,
  questionRateLimitRefusal,
  type QuestionPublicOutcome,
} from "./question-public-errors";
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

/** Screen 2: the free lookup. No AI runs here (spec 016 D1). */
const LOOKUP_STEPS = ["Memeriksa website Anda"] as const;

/** Screen 3b: the paid reading, which runs under the order. */
const READING_STEPS = [
  "Membaca sumber Anda",
  "Menemukan produk dan lokasi",
  "Memperkirakan pelanggan dan pembanding",
] as const;

const ORDER_ENDED_NOTICE =
  "Pesanan Anda sudah berakhir. Isian Anda tetap tersimpan. Masukkan email Anda lagi untuk melanjutkan.";

const PAY_START_FAILED_NOTICE =
  "Pembayaran belum bisa dimulai. Periksa koneksi dan coba lagi.";

/** Spec 017 R-14: payment states that can still change by themselves, so the
 * page asks the status again, politely, while it is open and visible. */
const POLLED_PAYMENT_STATES = [
  "waiting",
  "try_failed",
  "checking",
  "cannot_check",
];
/** Payment states that end this order's journey on this screen: the page shows
 * them instead of the pay form, and the saved order is never made a new one. */
const BLOCKING_PAYMENT_STATES = [
  "unpaid_final",
  "closed_unknown",
  "needs_refund",
  "refunded",
  "paid_ended",
];
const PAYMENT_POLL_MS = 10_000;

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
function backTargetFor(
  session: SmartSession,
  locked = Boolean(session.order?.paid),
): SmartStage | null {
  const marker = session.editReturn;
  const selection = session.selection;
  // Spec 017 R-19: once paid, or while a payment attempt is open, the website
  // and business are locked, so nothing steps back to the screens that change
  // them.
  switch (session.stage) {
    case "brand":
      // A review-opened name edit backs out to the review (J7); the normal
      // brand check still steps back to the entry screen.
      return locked ? null : (marker ?? "entry");
    case "focus": {
      if (!marker || !selection) return locked ? null : "brand";
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
    case "order":
      return locked ? null : "brand";
    case "questions":
      return "summary";
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
  if (session.stage === "brand" || session.stage === "order")
    return fills(1, 1);
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
  outcome: QuestionPublicOutcome,
): GenerationAttempt | null {
  const cost = questionPublicCost(outcome)?.billedUsd ?? null;
  if (outcome.status === "validation_failed") {
    return {
      started_at,
      outcome: "failed",
      execution: "confirmed",
      cost_usd: cost,
    };
  }
  if (
    questionRateLimitRefusal(outcome) ||
    outcome.status === "invalid_request" ||
    outcome.status === "correction_required" ||
    (outcome.status === "failed" && outcome.providerContact === "none")
  )
    return null;
  if (
    outcome.status !== "failed" ||
    (outcome.providerContact !== "sent" &&
      outcome.providerContact !== "responded")
  )
    return {
      started_at,
      outcome: "interrupted",
      execution: "unknown",
      cost_usd: null,
    };
  return {
    started_at,
    outcome: "failed",
    execution: outcome.providerContact === "sent" ? "unknown" : "confirmed",
    cost_usd: cost,
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
  const [busy, setBusy] = useState<
    "lookup" | "reading" | "paying" | "questions" | "approving" | null
  >(null);
  const [readingStep, setReadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [interrupted, setInterrupted] = useState(false);
  const [editingBrandName, setEditingBrandName] = useState(false);
  // Spec 016 R-31: the email is typed here and never stored in the browser.
  const [email, setEmail] = useState("");
  // The order whose audit is running on the server (after the questions are
  // approved). Only its id stays in the browser.
  const [activeOrder, setActiveOrder] = useState<string | null>(null);
  // Spec 017: what the server last said about the saved order's payment, and
  // for which order; a check is running; this tab holds the founder test code.
  const [paymentFor, setPaymentFor] = useState<{
    orderId: string;
    payment: OrderPayment;
  } | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [testPass, setTestPass] = useState(false);
  const returningOrder = useRef(false);
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
      setTestPass(readTestPassCode() !== null);
      const saved = readSmartSession();
      const runningOrder = readActiveOrder();
      if (!saved && runningOrder) {
        // R-31: a reload during or after the audit shows its progress or
        // result; the intake progress is already gone.
        setActiveOrder(runningOrder);
        setReady(true);
        return;
      }
      if (saved) {
        if (saved.stage === "reading") {
          // A stored reading session means the page was reloaded mid-read:
          // return to the order screen (or the entry) with the fields kept and
          // never replay the call.
          const next: SmartSession = {
            ...saved,
            stage: saved.order ? "order" : "entry",
          };
          writeSmartSession(next);
          setSession(next);
          setInterrupted(true);
        } else {
          setSession(saved);
        }
        // Spec 017 Experience 5-8: coming back (also from Midtrans) always asks
        // the server for the order's state; the return URL's words are never
        // read.
        if (saved.order) returningOrder.current = true;
      } else {
        try {
          setHistorical(Boolean(readHistoricalAudit()));
        } catch {
          // Browser storage is blocked: there is no old audit to hold.
        }
      }
      setReady(true);
    });
  }, []);

  /** R-30: if the saved order has ended, the customer sees the order screen
   * again and types the email again; the saved progress continues on the new
   * order with no new paid call. Spec 017 R-14: the answer also carries the
   * payment, which the order screen shows (paid, waiting, checking ...). */
  async function checkOrder(saved: SmartSession) {
    if (!saved.order) return;
    const orderId = saved.order.id;
    const unknown = () =>
      setPaymentFor((last) =>
        last?.orderId === orderId
          ? last
          : { orderId, payment: { state: "cannot_check" } },
      );
    setCheckingPayment(true);
    try {
      const response = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      if (!mounted.current) return;
      if (!response.ok && response.status !== 404) {
        // Offline or the server is busy: keep the saved order and carry on.
        unknown();
        return;
      }
      const answer = response.ok
        ? ((await response.json()) as {
            state?: string;
            payment?: OrderPayment;
          })
        : null;
      const state = answer ? answer.state : "gone";
      // The answer may arrive late (a slow server): if the customer has already
      // approved the questions, the saved progress is gone and the order is
      // running, not ended. Only act while this same saved order is still the
      // journey's own.
      const current = readSmartSession();
      if (!mounted.current || !current || current.order?.id !== orderId) return;
      const payment = answer?.payment;
      if (payment) setPaymentFor({ orderId, payment });
      if (payment?.state === "paid" && !current.order!.paid) {
        // R-19: from now on the website and business are locked.
        persist({
          ...current,
          order: {
            ...current.order!,
            paid: true,
            ...(payment.order_number ? { number: payment.order_number } : {}),
          },
        });
      }
      if (payment && BLOCKING_PAYMENT_STATES.includes(payment.state)) {
        // The page shows the state on the order screen; it never starts a new
        // order from an answer like this (Experience 7, 8).
        if (current.stage !== "order") persist({ ...current, stage: "order" });
        return;
      }
      if (state === "open") return;
      if (state === "expired" || state === "gone") {
        expireOrder(current);
        return;
      }
      // Approved elsewhere (another tab): running, reporting, delivered or
      // failed all go to the progress view; the intake progress is done (R-31).
      writeActiveOrder(orderId);
      clearSmartSession();
      setActiveOrder(orderId);
    } catch {
      // Offline or the server is busy: keep the saved order and carry on.
      unknown();
    } finally {
      if (mounted.current) setCheckingPayment(false);
    }
  }

  // A returning customer (also from Midtrans): ask the server once, as soon as
  // the saved session is loaded.
  useEffect(() => {
    if (!ready || !returningOrder.current) return;
    returningOrder.current = false;
    queueMicrotask(() => {
      const saved = readSmartSession();
      if (saved?.order) void checkOrder(saved);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /** The order is over or unknown: back to the order screen, progress kept.
   * R-19: a PAID order is never turned into a new one; the page shows its
   * number and the support address instead. */
  function expireOrder(from: SmartSession, resumeAt?: SmartSession["stage"]) {
    if (from.order?.paid) {
      setPaymentFor({
        orderId: from.order.id,
        payment: {
          state: "paid_ended",
          ...(from.order.number ? { order_number: from.order.number } : {}),
        },
      });
      if (from.stage !== "order") persist({ ...from, stage: "order" });
      return;
    }
    const resume = resumeAt ?? from.afterOrder ?? from.stage;
    const next: SmartSession = {
      ...from,
      order: null,
      // R-19: the ended unpaid order's id goes with the next order, so the
      // server marks it replaced.
      supersededOrder: from.order?.id ?? from.supersededOrder ?? null,
      stage: "order",
      afterOrder: resume === "order" ? "focus" : resume,
    };
    writeSmartSession(next);
    setSession(next);
    setError(ORDER_ENDED_NOTICE);
  }

  /** Experience 7: "Coba bayar lagi" returns to the order summary, which makes
   * a replacement order (R-19) from the email the customer types again. */
  function payAgain() {
    const order = session.order;
    if (order?.paid) return;
    persist({
      ...session,
      order: null,
      supersededOrder: order?.id ?? session.supersededOrder ?? null,
      stage: "order",
    });
    setError(null);
  }

  // Spec 017 R-14: while a payment can still change, ask again every few
  // seconds and when the tab becomes visible again (coming back from a wallet
  // app). The server limits its own Midtrans checks.
  const paymentState =
    paymentFor && paymentFor.orderId === session.order?.id
      ? paymentFor.payment.state
      : null;
  // R-19: the server refuses a replacement while an attempt is open, so the
  // screen locks the website and business exactly as after payment.
  const paymentLocked =
    Boolean(session.order?.paid) ||
    (paymentState !== null && POLLED_PAYMENT_STATES.includes(paymentState));
  const lockRef = useRef(paymentLocked);
  useEffect(() => {
    lockRef.current = paymentLocked;
  });
  useEffect(() => {
    if (
      !ready ||
      session.stage !== "order" ||
      !paymentState ||
      !POLLED_PAYMENT_STATES.includes(paymentState)
    )
      return;
    const ask = () => {
      if (document.visibilityState === "visible" && sessionRef.current.order)
        void checkOrder(sessionRef.current);
    };
    const timer = window.setInterval(ask, PAYMENT_POLL_MS);
    document.addEventListener("visibilitychange", ask);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", ask);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, session.stage, session.order?.id, paymentState]);

  // History ownership: every in-flow entry is marked `nuaveIntake` and a
  // marked duplicate stays on top while the stage has a back target. A real
  // browser Back lands on the marked entry below and performs one in-flow
  // step back; the trap is re-armed unless the landing stage is `entry`.
  useEffect(() => {
    if (!ready) return;
    if (window.history.state?.nuaveIntake !== true)
      window.history.replaceState(intakeMark(), "");
    if (backTargetFor(sessionRef.current, lockRef.current))
      window.history.pushState(intakeMark(), "");
    const onBack = (event: PopStateEvent) => {
      // Fragment or foreign history events must not move the intake flow.
      if (event.state?.nuaveIntake !== true) return;
      const current = sessionRef.current;
      const target = backTargetFor(current, lockRef.current);
      if (!target) return;
      // The review-return marker survives a back hop onto the focus or
      // category checkpoint; landing anywhere else consumes it.
      const next: SmartSession = {
        ...current,
        stage: target,
        ...backMarkerFields(current, target),
      };
      setError(null);
      writeSmartSession(next);
      setSession(next);
      if (backTargetFor(next, lockRef.current))
        window.history.pushState(intakeMark(), "");
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
    const target = backTargetFor(session, paymentLocked);
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
    clearSmartSession();
    setActiveOrder(null);
    const next = freshSmartSession();
    persist(next);
    setHistorical(false);
    setError(null);
    setInterrupted(false);
    setEmail("");
  }

  /** Screens 1-3: the FREE lookup only. No AI runs here, and no order exists
   * yet (spec 016 R-01, D1). */
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
    // The source is unchanged: the lookup stays reusable and a name-only
    // correction applies without another call (Spec 013 R-05/R-09).
    if (
      session.identity &&
      parsed.normalizedUrl === session.identity.inputSource
    ) {
      if (session.prepared && session.selection) {
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
      goStage({
        ...session,
        stage: "brand",
        entry: { ...session.entry, name },
        identity: { ...session.identity, inputName: name },
        brand:
          session.brand && name === session.identity.inputName
            ? session.brand
            : { name, origin: "owner" },
      });
      return;
    }
    inFlight.current = true;
    setBusy("lookup");
    setReadingStep(0);
    const working: SmartSession = { ...session, stage: "reading" };
    persist(working);
    try {
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
      const identity = {
        inputName: name,
        inputSource: parsed.normalizedUrl,
        canonicalUrl: canonical.normalizedUrl,
        displayName:
          typeof result.display_name === "string" ? result.display_name : null,
        preparationMode:
          result.preparation_mode === "live"
            ? ("live" as const)
            : ("synthetic-local" as const),
      };
      goStage({
        ...working,
        stage: "brand",
        identity,
        brand: { name, origin: "owner" },
        prepared: null,
        selection: null,
        confirmedSelection: null,
        frozen: null,
        pack: null,
        order: null,
        supersededOrder: session.order?.id ?? session.supersededOrder ?? null,
        afterOrder: null,
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
    }
  }

  /**
   * Screen 3a (spec 016 R-01, spec 017 Experience 2-3): make ONE order from the
   * email, start its payment and send the browser to Midtrans. Back from the
   * payment (or with a test pass, or a paid order) the same button runs the paid
   * reading (screen 3b) on the website saved on the order. A returning customer
   * whose order is still open does not make another one; one whose order ended
   * (R-30) types the email again and the saved progress continues on the new
   * order with no new paid call.
   */
  async function continueFromOrder() {
    if (inFlight.current) return;
    const identity = session.identity;
    const brand = session.brand ?? {
      name: session.entry.name.trim(),
      origin: "owner" as const,
    };
    if (!identity || !brand.name) return;
    let order = session.order ?? null;
    const previousOrder = order;
    let previousOrderId = session.supersededOrder ?? null;
    // Going back past this screen to change the website or the brand starts a
    // new order (R-01). A paid order is locked: it is never replaced (R-19).
    if (
      order &&
      !order.paid &&
      (order.website !== identity.canonicalUrl || order.name !== brand.name)
    ) {
      previousOrderId = order.id;
      order = null;
    }
    if (!order && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError("Masukkan satu alamat email yang valid.");
      return;
    }
    // R-20: the code from `/uji` goes only in this request's body.
    const testCode = order ? null : readTestPassCode();
    // An order that needs no payment (test pass, legacy) or is paid reads now.
    const state =
      paymentFor?.orderId === order?.id ? paymentFor?.payment.state : null;
    if (order && !order.paid && state !== "unpaid" && state !== "not_required")
      return;
    setInterrupted(false);
    setError(null);
    inFlight.current = true;
    setBusy(
      order && (order.paid || state === "not_required") ? "reading" : "paying",
    );
    setReadingStep(0);
    let working: SmartSession = { ...session, order };
    try {
      if (!order) {
        const created = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            business_name: brand.name,
            website: identity.canonicalUrl,
            // The old order, if any, is retired by the server so it stops
            // holding part of the daily cap (R-19).
            ...(previousOrderId ? { previous_order_id: previousOrderId } : {}),
            ...(testCode ? { test_pass_code: testCode } : {}),
          }),
        });
        const body = (await created.json().catch(() => ({}))) as {
          order_id?: string;
          error?: string;
          code?: string;
        };
        if (
          created.status === 409 &&
          body.code === "PREVIOUS_ORDER_ACTIVE" &&
          previousOrderId
        ) {
          // R-19: the old order is paid or waiting for payment: no new order.
          // The page shows that order's own state, with ITS OWN website and
          // business (never the ones on this screen). If this screen no longer
          // has them, nothing is recorded and the message stands.
          if (
            previousOrder &&
            previousOrder.id === previousOrderId &&
            previousOrder.website === identity.canonicalUrl
          ) {
            working = {
              ...working,
              order: previousOrder,
              brand: { name: previousOrder.name, origin: brand.origin },
              supersededOrder: null,
            };
            persist(working);
            void checkOrder(working);
          }
          setError(body.error || "Pesanan sebelumnya masih berjalan.");
          return;
        }
        if (!created.ok || typeof body.order_id !== "string") {
          setError(body.error || "Pesanan belum dapat dibuat. Coba lagi.");
          return;
        }
        order = {
          id: body.order_id,
          website: identity.canonicalUrl,
          name: brand.name,
        };
        working = { ...working, order, supersededOrder: null };
        persist(working);
        if (testCode) {
          setPaymentFor({
            orderId: order.id,
            payment: { state: "not_required" },
          });
        } else {
          await startPayment(working, order.id);
          return;
        }
      } else if (!order.paid && state === "unpaid") {
        await startPayment(working, order.id);
        return;
      }
      // R-30: saved progress continues on the new order, no new paid call.
      if (working.prepared && working.selection) {
        const target = working.afterOrder ?? "focus";
        goStage({ ...working, stage: target, afterOrder: null });
        return;
      }
      setBusy("reading");
      working = { ...working, stage: "reading" };
      persist(working);
      await readWebsite(working, order.id, brand);
    } finally {
      inFlight.current = false;
      setBusy(null);
      setReadingStep(0);
    }
  }

  /** Spec 017 R-05, R-17: ask the server to start the payment. A real payment
   * sends the browser to the Midtrans page it answers with; the simulated one
   * (synthetic mode only) is marked paid right there and the page then asks the
   * status like any return from a payment. */
  async function startPayment(working: SmartSession, orderId: string) {
    try {
      const response = await fetch("/api/payments/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        redirect_url?: unknown;
        simulated?: boolean;
        error?: string;
        code?: string;
      };
      if (response.ok && body.simulated) {
        await checkOrder(working);
        return;
      }
      if (
        (response.ok || body.code === "PAYMENT_ALREADY_OPEN") &&
        typeof body.redirect_url === "string" &&
        body.redirect_url.startsWith("https://")
      ) {
        window.location.assign(body.redirect_url);
        return;
      }
      // The order exists and is not paid: the page asks its state, so it shows
      // the right button (try again) or the real state (already paying).
      void checkOrder(working);
      setError(body.error || PAY_START_FAILED_NOTICE);
    } catch {
      void checkOrder(working);
      setError(PAY_START_FAILED_NOTICE);
    }
  }

  /** Screen 3b: the paid website reading, under the order. The server reads the
   * website saved on the order; the browser sends only the order id. */
  async function readWebsite(
    start: SmartSession,
    orderId: string,
    brand: { name: string; origin: "owner" | "website" },
  ) {
    let working = start;
    const identity = working.identity!;
    try {
      setReadingStep(0);
      const extractionResponse = await fetch("/api/audit/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      const extraction = (await extractionResponse
        .json()
        .catch(() => ({}))) as {
        draft?: ExtractionDraft;
        telemetry?: AuditCallTelemetry[];
        preparation_mode?: string;
        source_excerpt_status?: unknown;
        code?: string;
        error?: string;
      };
      if (
        extractionResponse.status === 409 &&
        extraction.code === "ORDER_REQUIRED"
      ) {
        expireOrder({ ...working, stage: "order" }, "focus");
        return;
      }
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
        stage: "focus",
        prepared,
        selection: {
          ...initialSmartSelection(prepared),
          name: brand.name,
          nameOrigin: brand.origin,
        },
        confirmedSelection: null,
        frozen: null,
        pack: null,
        afterOrder: null,
      });
    } catch (cause) {
      persist({ ...working, stage: "order" });
      setError(
        cause instanceof Error
          ? cause.message
          : "Persiapan terhenti. Periksa sumber dan coba lagi.",
      );
    }
  }

  /** Approve the ten questions (spec 016 R-17): the server saves them and the
   * audit then runs there. The intake progress leaves the browser now (R-31);
   * only the order id stays until the order ends. */
  async function approveQuestions() {
    if (inFlight.current || !session.pack || !session.frozen) return;
    const order = session.order;
    try {
      canonicalLockedDirectTenPack(
        smartPackPrompts(session.pack),
        session.frozen.context,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Periksa pertanyaan audit.",
      );
      return;
    }
    if (!order) {
      expireOrder(session, "questions");
      return;
    }
    inFlight.current = true;
    setBusy("approving");
    setError(null);
    try {
      const response = await fetch("/api/orders/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.id,
          client_contract_version: AUDIT_CLIENT_CONTRACT_VERSION,
          question_method: "direct-ten",
          context: session.frozen.context,
          prompts: smartPackPrompts(session.pack),
          originals: session.pack.originals,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      if (response.ok) {
        writeActiveOrder(order.id);
        clearSmartSession();
        if (mounted.current) setActiveOrder(order.id);
        return;
      }
      if (response.status === 404 || body.code === "ORDER_STATE") {
        expireOrder(session, "questions");
        return;
      }
      setError(body.error || "Audit belum dapat dimulai. Coba lagi.");
    } catch {
      setError("Audit belum dapat dimulai. Periksa koneksi dan coba lagi.");
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
    } catch {
      setError(questionPublicMessage({ status: "invalid_request" }));
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
    // Until a classified response arrives, execution remains uncertain.
    let failureMessage = questionPublicMessage(
      { status: "failed", reason: "transport" },
      live,
    );
    try {
      const response = await fetch("/api/audit/glm-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intake: frozen,
          method: "direct-ten",
          order_id: session.order?.id,
          ...(glmStubBehavior ? { stubBehavior: glmStubBehavior } : {}),
        }),
      });
      const outcome = (await response
        .json()
        .catch(() => null)) as QuestionPublicOutcome | null;
      if (!outcome) throw new Error("Question response unavailable");
      if (outcome.status === "failed" && outcome.code === "ORDER_REQUIRED") {
        // The order ended before the questions were written; nothing was
        // sent. The progress stays and continues on a new order (R-30).
        expireOrder(session, "summary");
        return;
      }
      failureMessage = questionPublicMessage(outcome, live);
      if (outcome.status === "ok") {
        const provenance = outcome.provenance;
        const cost = questionPublicCost(outcome);
        if (
          !response.ok ||
          !Array.isArray(outcome.questions) ||
          outcome.questions.some((question) => typeof question !== "string") ||
          !cost ||
          !provenance ||
          typeof provenance.requestId !== "string" ||
          !provenance.requestId.trim() ||
          provenance.method !== "direct-ten" ||
          typeof provenance.requestedModel !== "string" ||
          !provenance.requestedModel.trim() ||
          !(
            typeof provenance.returnedModel === "string" ||
            provenance.returnedModel === null
          ) ||
          !(
            typeof provenance.responseId === "string" ||
            provenance.responseId === null
          ) ||
          typeof provenance.modelMismatch !== "boolean" ||
          (provenance.transport !== "cheaper-inference" &&
            provenance.transport !== "synthetic-stub")
        )
          throw new Error("Question success envelope invalid");
        const pack: SmartQuestionPack = {
          version: "nuave-local-questions-v2",
          inputFingerprint: frozen.fingerprint,
          originals: [...outcome.questions],
          approved: [...outcome.questions],
          revision: 0,
          provenance,
          billedCostUsd: cost.billedUsd,
        };
        // Do not replace the started unknown attempt until the pack is valid.
        canonicalLockedDirectTenPack(smartPackPrompts(pack), frozen.context);
        persist({
          ...committed,
          pack,
          generationAttempts: [
            ...session.generationAttempts,
            {
              started_at,
              outcome: "succeeded",
              execution: "confirmed",
              cost_usd: cost.billedUsd,
            },
          ],
        });
        return;
      }
      const attempt = attemptForOutcome(started_at, outcome);
      const attempts = attempt
        ? [...session.generationAttempts, attempt]
        : session.generationAttempts;
      const settled = { ...committed, generationAttempts: attempts };
      persist(settled);
      setError(failureMessage);
    } catch {
      setError(failureMessage);
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
  if (activeOrder)
    return <SmartAuditStage orderId={activeOrder} onRestart={newJourney} />;
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
            approving={busy === "approving"}
            onApprove={() => void approveQuestions()}
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
  // Framed intake screens (Spec 013 J2+J4): entry → reading → brand → focus
  // → location/product → summary.
  const progress = stageProgress(session);
  const backTarget = backTargetFor(session, paymentLocked);
  // Spec 017: the saved order is the one for this website and business; what
  // the server last said about its payment; and what the main button does.
  const lockedAfterPayment = paymentLocked;
  const orderMatches = Boolean(
    session.order &&
    session.identity &&
    session.order.website === session.identity.canonicalUrl &&
    session.order.name === (session.brand?.name ?? session.entry.name.trim()),
  );
  const currentPayment =
    paymentFor && paymentFor.orderId === session.order?.id
      ? paymentFor.payment
      : null;
  const orderAction: string | null = !orderMatches
    ? testPass
      ? "Lanjut"
      : "Bayar Rp99.000"
    : currentPayment?.state === "paid" ||
        currentPayment?.state === "not_required"
      ? "Lanjut"
      : currentPayment?.state === "unpaid"
        ? "Bayar Rp99.000"
        : null;
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
                    brand: null,
                    order: null,
                    supersededOrder:
                      session.order?.id ?? session.supersededOrder ?? null,
                    afterOrder: null,
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
              {busy === "lookup" ? "Memeriksa…" : "Periksa"}
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
              {(busy === "lookup" ? LOOKUP_STEPS : READING_STEPS).map(
                (step, index) => {
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
                },
              )}
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
        {session.stage === "brand" && !session.prepared && session.identity ? (
          <FreeBrandScreen
            headingRef={headingRef}
            typedName={session.entry.name.trim()}
            discoveredName={session.identity.displayName?.trim() || null}
            source={session.identity.canonicalUrl}
            brand={
              session.brand ?? {
                name: session.entry.name.trim(),
                origin: "owner",
              }
            }
            editing={editingBrandName}
            onToggleEditing={() => setEditingBrandName((value) => !value)}
            onChange={(brand) => {
              if (unsafeSmartName(brand.name)) {
                stopSensitiveInput();
                return;
              }
              persist({ ...session, brand });
              setError(null);
            }}
            error={error}
          />
        ) : null}
        {session.stage === "order" && session.identity ? (
          <OrderScreen
            headingRef={headingRef}
            businessName={session.brand?.name ?? session.entry.name.trim()}
            website={session.identity.canonicalUrl}
            hasOrder={orderMatches}
            email={email}
            onEmailChange={(value) => {
              setEmail(value);
              setError(null);
            }}
            busy={busy !== null}
            notice={interrupted ? READING_INTERRUPTED_NOTICE : null}
            error={error || restoredSourceError}
            live={live}
            payment={orderMatches ? currentPayment : null}
            checking={checkingPayment}
            testPass={testPass}
            onCheckAgain={() => void checkOrder(session)}
            onPayAgain={payAgain}
          />
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
        {session.stage === "focus" &&
        session.sourceExcerptStatus === "no-usable-text" ? (
          <p role="status" className="type-copy-sm text-muted-foreground">
            {SOURCE_EXCERPT_EMPTY_NOTICE}
          </p>
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
              onEditBrand={
                lockedAfterPayment
                  ? undefined
                  : () => {
                      // The business row's Ubah opens the existing brand screen;
                      // its Lanjut and Back then return to the review (J7).
                      goStage({
                        ...session,
                        stage: "brand",
                        editReturn: "summary",
                        editBaseline: undefined,
                      });
                      setError(null);
                    }
              }
              onEditSource={
                lockedAfterPayment
                  ? undefined
                  : () => {
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
                    }
              }
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
      {backTarget || (lockedAfterPayment && session.stage !== "reading") ? (
        <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background">
          <div className="mx-auto flex w-full max-w-[560px] items-center justify-between gap-3 px-6 py-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] sm:px-8">
            {backTarget ? (
              <Button
                variant="ghost"
                className="min-h-11 px-2 underline underline-offset-8"
                onClick={goBack}
              >
                Kembali
              </Button>
            ) : (
              <span />
            )}
            {session.stage === "order" ? (
              orderAction ? (
                <Button
                  className="min-h-11 rounded-full px-6"
                  disabled={busy !== null}
                  onClick={() => void continueFromOrder()}
                >
                  {orderAction}
                </Button>
              ) : (
                <span />
              )
            ) : session.stage === "brand" && !session.prepared ? (
              <Button
                className="min-h-11 rounded-full px-6"
                disabled={!(session.brand?.name ?? session.entry.name).trim()}
                onClick={() => {
                  setEditingBrandName(false);
                  // Spec 016 D1: the free brand check is followed by the order
                  // screen; the paid reading starts only after the order.
                  goStage({
                    ...session,
                    stage: "order",
                    brand: session.brand ?? {
                      name: session.entry.name.trim(),
                      origin: "owner",
                    },
                  });
                }}
              >
                Lanjut
              </Button>
            ) : session.stage === "brand" ? (
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
