"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
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
import { AUDIT_SOURCE_HANDOFF_STORAGE_KEY } from "../audit/source-handoff";
import { AUDIT_CLIENT_CONTRACT_VERSION } from "../audit/client-contract";
import { canonicalLockedDirectTenPack } from "../audit/locked-question-pack";
import { dedupeCalls } from "./local-audit-session";
import { trackJourneyEvent } from "../consent/meta-pixel";
import { readHistoricalAudit } from "./historical-audit";
import {
  confirmSmartSelection,
  firstSmartGapStage,
  initialSmartSelection,
  prepareUnderstanding,
  requiredSmartGaps,
  smartCategoryReady,
  smartComparatorsReady,
  smartLocationReady,
  smartMarketReady,
  smartProductReady,
  smartServiceReady,
  unsafeSmartName,
  unsafeSmartSelection,
  unsafeSmartSource,
  usablePublishedLocations,
  type SmartSelection,
} from "./smart-intake-contract";
import {
  clearSmartSession,
  freshSmartSession,
  IDENTITY_DESCRIPTION_MAX,
  IDENTITY_ICON_MAX,
  readActiveOrder,
  readSmartSession,
  smartPackPrompts,
  writeActiveOrder,
  writeSmartSession,
  type SmartQuestionPack,
  type SmartSession,
} from "./smart-session";
import { OrderScreen, PayConsent, type OrderPayment } from "./order-screens";
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
  flushPendingAdds,
  PendingAddsContext,
  type PendingAdds,
} from "./pending-adds";
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
  SmartDifferentiatorScreen,
  SmartCompetitorsScreen,
  SmartTargetCustomerScreen,
} from "./smart-customer-screens";
import { currentOrigins } from "./question-origin-lines";
import SmartQuestionsScreen, {
  QuestionsPreparing,
} from "./SmartQuestionsScreen";
import SmartAuditStage from "@/app/audit/SmartAuditStage";
import {
  JourneyScene,
  type SceneDirection,
  type SceneKind,
} from "@/components/motion/JourneyScene";
import { pauseForMotion } from "@/components/motion/useMotionAllowed";
import {
  BottomBar,
  JourneyPage,
  SUPPORT_EMAIL,
  TopBar,
} from "@/components/product/journey/JourneyBars";
import {
  BusinessCheckScreen,
  BusinessFoundScreen,
  checkPhaseFor,
  displayHost,
  EntryScreen,
  nameFromAddress,
  ScreenHeader,
  StepsScreen,
  WAIT_MORE_MS,
  WAY_OUT_MS,
} from "./step-one-screens";
import {
  ChapterCover,
  PaidReadingScreen,
  type ReadingFindings,
} from "./journey-moments";
import { cn } from "@/lib/utils";

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
/** Q13 A, R-12: after these the order is never paid for again, so the screen
 * is locked like the waiting states (no way back, no change, no new payment). */
const LOCKING_PAYMENT_STATES = ["closed_unknown", "needs_refund"];
/** Payment states of an order that was paid (R-19: locked, never replaced). */
const PAID_PAYMENT_STATES = ["paid", "paid_ended", "refunded"];
const PAYMENT_POLL_MS = 10_000;

/** A free check cut off by a reload (Spec 013 R-04: never replayed). */
const LOOKUP_INTERRUPTED_NOTICE =
  "Pemeriksaan website sebelumnya terputus. Tekan Cek bisnis saya di AI untuk mencoba lagi.";

/** The paid reading cut off by a reload: the order screen offers it again. */
const READING_INTERRUPTED_NOTICE =
  "Pembacaan website sebelumnya terputus. Isian Anda tetap tersimpan. Tekan Lanjut untuk membaca ulang.";

const SYNTHETIC_LABEL =
  "Mode uji lokal menggunakan pengganti sintetis berlabel.";

type SmartStage = SmartSession["stage"];

/** The framed one-question screens of Step 2 (Lanjut walks the chain). */
const FRAMED_STAGES: readonly SmartStage[] = [
  "focus",
  "location",
  "product",
  "category",
  "offerings",
  "target-customer",
  "customer-needs",
  "service",
  "market",
  "competitors",
  "differentiator",
];

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
 * chain is cover → focus → location/product → category → offerings → target
 * customer → customer needs (with what they compare) → service → market →
 * competitors → differentiator (with the often-wrong fact) → cover → summary.
 * Inside a detour (`editReturn`) a screen's Lanjut walks the remaining chain
 * until it lands on the review. Product and location edits pass through their
 * target and category screens (R-05/R-21).
 */
function forwardStageFor(session: SmartSession): SmartStage | null {
  const marker = session.editReturn;
  const selection = session.selection;
  const unchanged = marker ? detourUnchanged(session) : false;
  switch (session.stage) {
    case "intro-business":
      return "focus";
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
      return marker ?? "intro-review";
    case "intro-review":
      return "summary";
    default:
      return null;
  }
}

/** R-19: what the old order was made for, kept with its id when the customer
 * leaves it, so a late payment on it (409 on the next order) can be shown with
 * its OWN website and business. */
function supersededInfoOf(session: SmartSession) {
  return session.order
    ? { website: session.order.website, name: session.order.name }
    : (session.supersededInfo ?? null);
}

/** A new website (typed on the entry, or on the landing page): everything
 * read from the old one goes, and its order is retired by the next one
 * (R-19). The same website keeps everything. */
function withNewSource(session: SmartSession, value: string): SmartSession {
  const unchangedSource =
    session.identity &&
    parseSourceInput(value)?.normalizedUrl === session.identity.inputSource;
  return unchangedSource
    ? { ...session, entry: { ...session.entry, source: value } }
    : {
        ...session,
        entry: { ...session.entry, source: value },
        identity: null,
        sourceExcerptStatus: undefined,
        prepared: null,
        selection: null,
        confirmedSelection: null,
        frozen: null,
        pack: null,
        brand: null,
        order: null,
        supersededOrder: session.order?.id ?? session.supersededOrder ?? null,
        supersededInfo: supersededInfoOf(session),
        afterOrder: null,
        editReturn: undefined,
        editBaseline: undefined,
      };
}

/**
 * In-flow target of the frame's `Kembali` and of a marked browser Back.
 * `entry` and `reading` have no back target; `reading` is never a target.
 * The review steps back to its cover, the cover to the differentiator.
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
      // A review-opened name edit backs out to the review (J7), also after
      // payment; the normal brand check still steps back to the entry screen.
      return marker ?? (locked ? null : "entry");
    case "steps":
      return locked ? null : "brand";
    case "intro-business":
      return locked ? null : "brand";
    case "focus": {
      if (!marker || !selection) return "intro-business";
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
    case "service":
      return marker ?? "customer-needs";
    case "market":
      return marker ?? "service";
    case "competitors":
      return marker ?? (selection?.focus === "cabang" ? "service" : "market");
    case "differentiator":
      return marker ?? "competitors";
    case "intro-review":
      return "differentiator";
    case "summary":
      return "intro-review";
    case "order":
      return locked ? null : "steps";
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

type StepFills = readonly [number, number, number];

/**
 * Three-step fill (Airbnb's bottom bar, v2 J02–J27). Step 1 runs from the
 * website check to payment, Step 2 is the chapter of business questions
 * (the target screen only exists under a location or product focus, and a
 * location focus has no market screen), Step 3 is the review and the
 * questions. A chapter cover shows a sliver of its own step.
 */
function stageProgress(
  session: SmartSession,
  lookup: boolean,
): { fills: StepFills; label: string } | null {
  const step = (index: 0 | 1 | 2, fill: number) => {
    const fills = [0, 0, 0];
    for (let before = 0; before < index; before += 1) fills[before] = 1;
    fills[index] = fill;
    return {
      fills: fills as unknown as StepFills,
      label: `Langkah ${index + 1} dari 3`,
    };
  };
  switch (session.stage) {
    case "entry":
      return null;
    case "reading":
      return lookup ? step(0, 0.12) : null;
    case "brand":
      return session.prepared ? step(1, 0.05) : step(0, 0.34);
    case "steps":
      return step(0, 0.67);
    case "order":
      return null;
    case "intro-business":
      return step(1, 0.02);
    case "intro-review":
      return step(2, 0.02);
    case "summary":
      return step(2, 0.3);
    case "questions":
      return step(2, 0.65);
    default: {
      const chain: SmartStage[] = [
        "focus",
        ...(session.selection?.focus === "cabang"
          ? (["location"] as const)
          : session.selection?.focus === "produk"
            ? (["product"] as const)
            : []),
        "category",
        "offerings",
        "target-customer",
        "customer-needs",
        "service",
        ...(session.selection?.focus === "cabang" ? [] : ["market" as const]),
        "competitors",
        "differentiator",
      ];
      const index = chain.indexOf(session.stage);
      return index >= 0 ? step(1, (index + 1) / (chain.length + 0.4)) : null;
    }
  }
}

/** Journey order of the scenes, for the direction of a transition. */
const SCENE_ORDER = [
  "entry",
  "reading:lookup",
  "brand",
  "steps",
  "order",
  "reading:paid",
  "intro-business",
  "focus",
  "location",
  "product",
  "category",
  "offerings",
  "target-customer",
  "customer-needs",
  "service",
  "market",
  "competitors",
  "differentiator",
  "intro-review",
  "summary",
  "questions:false",
  "questions:true",
];

function sceneRank(key: string): number {
  const index = SCENE_ORDER.indexOf(key);
  return index >= 0 ? index : 0;
}

const TARGET_SCENES = ["focus", "location", "product"];

function intakeMark() {
  return { ...(window.history.state ?? {}), nuaveIntake: true };
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

/** The found products and branches shown on J09 before moving on. */
function findingsOf(
  prepared: ReturnType<typeof prepareUnderstanding>,
): ReadingFindings {
  const places = usablePublishedLocations(prepared).map((item) => item.name);
  return {
    products: [...(prepared.offerings.proposed ?? [])],
    places: places.length ? places : [...(prepared.marketAreas.proposed ?? [])],
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
  const [error, setError] = useState<string | null>(null);
  // The owner asked to check the name; the sheet opens once the brand
  // screen has mounted, even if the tap came while it was sliding in.
  const [askName, setAskName] = useState(false);
  const [interrupted, setInterrupted] = useState(false);
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
  // The saved order whose status answer this page has seen. Until then it
  // may be paid, so J01's notice does not offer to replace it (R-19).
  const [checkedOrder, setCheckedOrder] = useState<string | null>(null);
  const [testPass, setTestPass] = useState(false);
  // J02–J04: when the free check started, the clock it is shown against, the
  // moment it finished, and the J04 name field.
  const [lookupStartedAt, setLookupStartedAt] = useState<number | null>(null);
  const [lookupNow, setLookupNow] = useState(0);
  const [lookupFinished, setLookupFinished] = useState(false);
  const [wayOutFrom, setWayOutFrom] = useState(WAY_OUT_MS);
  const [wayOutName, setWayOutName] = useState("");
  // J09: what the paid reading found, shown before the journey moves on.
  const [findings, setFindings] = useState<ReadingFindings | null>(null);
  // J25: the owner ticked the confirmation sentence.
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  // J27b: the final confirmation sheet.
  const [startSheetOpen, setStartSheetOpen] = useState(false);
  // The approved questions of the audit started in this tab (memory only,
  // R-31: never stored), so the running page can show them being asked.
  const [startedQuestions, setStartedQuestions] = useState<string[] | null>(
    null,
  );
  // When this tab started that audit (memory only, like the texts), for the
  // elapsed time on the running page.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  // A website typed on the landing page while this browser still holds an
  // order: it is not checked by itself, and the page says so (J01).
  const [skippedHandoff, setSkippedHandoff] = useState<string | null>(null);
  const returningOrder = useRef(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const lookupToken = useRef(0);
  const lookupAbort = useRef<AbortController | null>(null);
  const autoReadOrder = useRef<string | null>(null);
  const pendingHandoff = useRef<string | null>(null);
  // The open "+ Lainnya" fields' typed text, added on Lanjut (pending-adds).
  const [pendingAdds] = useState<PendingAdds>(() => new Set());
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
      // J01: the website typed on the landing page arrives once, through
      // this tab's session storage, and is removed as soon as it is read.
      let handoff: string | null = null;
      try {
        handoff = window.sessionStorage.getItem(
          AUDIT_SOURCE_HANDOFF_STORAGE_KEY,
        );
        window.sessionStorage.removeItem(AUDIT_SOURCE_HANDOFF_STORAGE_KEY);
      } catch {
        // Storage blocked: the entry screen asks for the website instead.
      }
      const handoffSource = handoff ? parseSourceInput(handoff) : null;
      const saved = readSmartSession();
      const runningOrder = readActiveOrder();
      if (!saved && runningOrder) {
        // R-31: a reload during or after the audit shows its progress or
        // result; the intake progress is already gone. A website typed on
        // the landing page is not checked meanwhile, and the page says so.
        setActiveOrder(runningOrder);
        if (handoffSource) setSkippedHandoff(handoffSource.normalizedUrl);
        setReady(true);
        return;
      }
      if (saved && (saved.order || !handoffSource)) {
        if (saved.stage === "reading" && saved.prepared) {
          // Reloaded during J09's short "found" pause: the reading is already
          // saved, so the journey simply goes on to the Step 2 cover.
          const next: SmartSession = { ...saved, stage: "intro-business" };
          writeSmartSession(next);
          setSession(next);
        } else if (saved.stage === "reading") {
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
        if (
          handoffSource &&
          saved.order &&
          handoffSource.normalizedUrl !== saved.identity?.inputSource &&
          handoffSource.normalizedUrl !== saved.order.website
        )
          setSkippedHandoff(handoffSource.normalizedUrl);
      } else {
        if (handoffSource) {
          // A fresh check of the website from the landing page. Progress
          // without an order is replaced, as typing a new website would.
          const fresh: SmartSession = {
            ...freshSmartSession(),
            entry: { name: "", source: handoffSource.normalizedUrl },
            supersededOrder: saved?.supersededOrder ?? null,
            supersededInfo: saved?.supersededInfo ?? null,
          };
          writeSmartSession(fresh);
          setSession(fresh);
          pendingHandoff.current = handoffSource.normalizedUrl;
        } else {
          try {
            setHistorical(Boolean(readHistoricalAudit()));
          } catch {
            // Browser storage is blocked: there is no old audit to hold.
          }
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
      // R-19: a paid order first seen as ended or refunded is also paid.
      let latest = current;
      if (
        payment &&
        PAID_PAYMENT_STATES.includes(payment.state) &&
        !current.order!.paid
      ) {
        // R-19: from now on the website and business are locked.
        latest = {
          ...current,
          order: {
            ...current.order!,
            paid: true,
            ...(payment.order_number ? { number: payment.order_number } : {}),
          },
        };
        persist(latest);
      }
      setCheckedOrder(orderId);
      if (payment && BLOCKING_PAYMENT_STATES.includes(payment.state)) {
        // The page shows the state on the order screen; it never starts a new
        // order from an answer like this (Experience 7, 8).
        if (latest.stage !== "order") persist({ ...latest, stage: "order" });
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

  // J01 → J02: the website from the landing page is checked straight away.
  useEffect(() => {
    if (!ready || !pendingHandoff.current) return;
    pendingHandoff.current = null;
    queueMicrotask(() => void inspect());
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
      supersededInfo: supersededInfoOf(from),
      stage: "order",
      afterOrder:
        resume === "order" || resume === "steps" ? "intro-business" : resume,
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
      supersededInfo: supersededInfoOf(session),
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
  // screen locks the website and business exactly as after payment. Q13 A and
  // R-12: a closed-unknown or needs-refund order is locked the same way.
  const paymentLocked =
    Boolean(session.order?.paid) ||
    (paymentState !== null &&
      (POLLED_PAYMENT_STATES.includes(paymentState) ||
        LOCKING_PAYMENT_STATES.includes(paymentState)));
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

  // Spec 019 R-08/R-09: checkout opened, and a confirmed payment. Each is sent
  // once (per website, per order), only after Allow; a test-pass order is
  // "not_required", never "paid", so it sends no Purchase.
  const checkoutSite = session.identity?.canonicalUrl;
  useEffect(() => {
    if (ready && session.stage === "order" && checkoutSite)
      trackJourneyEvent("InitiateCheckout", checkoutSite);
  }, [ready, session.stage, checkoutSite]);
  // Spec 022: the paid order's event code goes with the Pixel Purchase, and
  // the same code with the server's.
  const purchaseEventId =
    paymentFor && paymentFor.orderId === session.order?.id
      ? paymentFor.payment.purchase_event_id
      : undefined;
  useEffect(() => {
    if (ready && session.order?.paid && paymentState === "paid")
      trackJourneyEvent(
        "Purchase",
        session.order.id,
        Date.now(),
        purchaseEventId,
      );
  }, [
    ready,
    session.order?.paid,
    session.order?.id,
    paymentState,
    purchaseEventId,
  ]);

  // An unpaid order made for another website or name is replaced on Lanjut,
  // which needs the email typed again (R-01), so it never starts by itself.
  const orderStillFits = Boolean(
    session.order &&
    (session.order.paid ||
      (session.order.website === session.identity?.canonicalUrl &&
        session.order.name ===
          (session.brand?.name ?? session.entry.name.trim()))),
  );
  // A reading already started for this order (or, in progress saved before
  // that mark existed, any trace of an earlier reading) never starts again
  // by itself.
  const readingTried = Boolean(
    session.order?.readingStarted ||
    session.preparationCalls.length > 0 ||
    session.sourceExcerptStatus !== undefined,
  );
  // J09: once the server says the order is paid (or needs no payment), the
  // paid reading starts by itself, once per order in this tab. A reading that
  // failed here, or one a reload interrupted, waits for the customer's own
  // Lanjut: a refresh never replays the call (Spec 013 R-04).
  useEffect(() => {
    const order = session.order;
    if (
      !ready ||
      session.stage !== "order" ||
      !order ||
      !orderStillFits ||
      readingTried ||
      session.prepared ||
      busy !== null ||
      error ||
      interrupted ||
      autoReadOrder.current === order.id ||
      !(
        (order.paid && paymentState === "paid") ||
        paymentState === "not_required"
      )
    )
      return;
    autoReadOrder.current = order.id;
    queueMicrotask(() => void continueFromOrder());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ready,
    session.stage,
    session.order?.id,
    session.order?.paid,
    orderStillFits,
    readingTried,
    paymentState,
    busy,
    error,
    interrupted,
  ]);

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
      setSkippedHandoff(null);
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
      lookupAbort.current?.abort();
    };
  }, []);

  // The J02–J04 clock ticks only while the free check runs.
  useEffect(() => {
    if (lookupStartedAt === null) return;
    const tick = () => setLookupNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [lookupStartedAt]);

  // The ref follows at once, so a second handler of the same tap (a focus
  // card's own click and its radio change) builds on this save, not on the
  // render before it.
  const persist = (next: SmartSession) => {
    writeSmartSession(next);
    sessionRef.current = next;
    setSession(next);
  };
  // A forward transition keeps one marked entry on top of the stack so the
  // next browser Back performs exactly one in-flow step back. An async tail
  // may finish after the owner left /audit: the finished state still saves,
  // but pushing history on the page they moved to would strand a marked
  // entry there, so the push is skipped once unmounted.
  const goStage = (next: SmartSession) => {
    persist(next);
    // Moving on answers J01's "belum diperiksa" notice.
    setSkippedHandoff(null);
    if (mounted.current) window.history.pushState(intakeMark(), "");
  };
  // The frame's `Kembali` moves in-flow without touching the stack; the trap
  // stays on top, so a later real Back still steps back from the new stage.
  const goBack = () => {
    const target = backTargetFor(session, paymentLocked);
    if (!target) return;
    setSkippedHandoff(null);
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
    const fresh = freshSmartSession();
    // A website typed on the landing page and not checked yet waits in the
    // field (J01's notice); nothing is checked until the owner asks.
    const next: SmartSession = skippedHandoff
      ? { ...fresh, entry: { ...fresh.entry, source: skippedHandoff } }
      : fresh;
    setSkippedHandoff(null);
    persist(next);
    setHistorical(false);
    setError(null);
    setInterrupted(false);
    setEmail("");
    setStartedQuestions(null);
    setStartedAt(null);
  }

  /** Stop the free check the person walked away from; a late answer is then
   * ignored (J04 "Coba website lain", "Kembali", or continuing by name). */
  function cancelLookup() {
    lookupToken.current += 1;
    lookupAbort.current?.abort();
    lookupAbort.current = null;
    inFlight.current = false;
    setBusy(null);
    setLookupStartedAt(null);
    setLookupFinished(false);
  }

  /** J01's website, typed while an unlocked order was saved: check it now,
   * exactly as typing it on the entry would (the old order is retired by the
   * next one, R-19). */
  function checkSkippedWebsite() {
    const url = skippedHandoff;
    const order = sessionRef.current.order;
    if (!url || lockRef.current || (order && checkedOrder !== order.id)) return;
    setSkippedHandoff(null);
    setInterrupted(false);
    persist(withNewSource(sessionRef.current, url));
    queueMicrotask(() => void inspect());
  }

  /** Back to the website field, with what was typed kept for correction. */
  function editWebsite() {
    cancelLookup();
    persist({ ...sessionRef.current, stage: "entry" });
    setError(null);
    queueMicrotask(() => sourceInputRef.current?.focus());
  }

  /** Screens 1-3: the FREE lookup only. No AI runs here, and no order exists
   * yet (spec 016 R-01, D1). Only the website is typed: the name comes from
   * the site (or, J04, from its address). */
  async function inspect() {
    if (inFlight.current) return;
    const current = sessionRef.current;
    const parsed = parseSourceInput(current.entry.source);
    if (!parsed) {
      setError("Masukkan satu website atau akun Instagram yang valid.");
      return;
    }
    if (unsafeSmartSource(current.entry.source)) {
      stopSensitiveInput();
      return;
    }
    setInterrupted(false);
    setError(null);
    // The source is unchanged: the lookup stays reusable (Spec 013 R-05/R-09).
    if (
      current.identity &&
      parsed.normalizedUrl === current.identity.inputSource
    ) {
      goStage({ ...current, stage: "brand" });
      return;
    }
    inFlight.current = true;
    const token = ++lookupToken.current;
    const controller = new AbortController();
    lookupAbort.current = controller;
    setBusy("lookup");
    setLookupFinished(false);
    setWayOutFrom(WAY_OUT_MS);
    setWayOutName(nameFromAddress(parsed.normalizedUrl));
    setLookupStartedAt(Date.now());
    const working: SmartSession = { ...current, stage: "reading" };
    persist(working);
    const stillMine = () => mounted.current && token === lookupToken.current;
    try {
      const response = await fetch(
        `/api/audit/identity?source=${encodeURIComponent(parsed.normalizedUrl)}`,
        { signal: controller.signal },
      );
      const result = (await response.json().catch(() => ({}))) as {
        canonical_url?: string;
        display_name?: string;
        description?: string;
        icon_data_url?: string | null;
        confidence?: boolean;
        preparation_mode?: string;
        error?: string;
      };
      if (!stillMine()) return;
      if (!response.ok || typeof result.canonical_url !== "string")
        throw new Error(result.error || "Sumber bisnis belum dapat dibaca.");
      const canonical = parseSourceInput(result.canonical_url);
      const displayName =
        typeof result.display_name === "string"
          ? result.display_name.trim()
          : "";
      const description =
        typeof result.description === "string"
          ? result.description.trim().slice(0, IDENTITY_DESCRIPTION_MAX)
          : "";
      if (
        !canonical ||
        unsafeSmartSource(canonical.normalizedUrl) ||
        (displayName && unsafeSmartName(displayName)) ||
        (description && unsafeSmartName(description))
      )
        throw new Error(
          "Sumber bisnis berisi informasi yang tidak dapat digunakan.",
        );
      const name =
        displayName || nameFromAddress(canonical.normalizedUrl) || "";
      const icon =
        typeof result.icon_data_url === "string" &&
        result.icon_data_url.startsWith("data:image/") &&
        result.icon_data_url.length <= IDENTITY_ICON_MAX
          ? result.icon_data_url
          : null;
      const identity = {
        inputName: name,
        inputSource: parsed.normalizedUrl,
        canonicalUrl: canonical.normalizedUrl,
        displayName: displayName || null,
        preparationMode:
          result.preparation_mode === "live"
            ? ("live" as const)
            : ("synthetic-local" as const),
        description: description || null,
        iconDataUrl: icon,
        // Only a real reading can be unsure; the synthetic one never reads.
        ...(result.preparation_mode === "live" && result.confidence === false
          ? { nameUnsure: true as const }
          : {}),
      };
      // Every step ticks off before the card appears.
      setLookupFinished(true);
      await pauseForMotion(450);
      if (!stillMine()) return;
      // Spec 019 R-07: the free check found the business.
      trackJourneyEvent("Lead", identity.canonicalUrl);
      goStage({
        ...working,
        stage: "brand",
        entry: { ...working.entry, name },
        identity,
        brand: { name, origin: "website" },
        prepared: null,
        selection: null,
        confirmedSelection: null,
        frozen: null,
        pack: null,
        order: null,
        supersededOrder: current.order?.id ?? current.supersededOrder ?? null,
        supersededInfo: supersededInfoOf(current),
        afterOrder: null,
      });
    } catch (cause) {
      if (!stillMine()) return;
      persist({ ...working, stage: "entry" });
      setError(
        cause instanceof Error
          ? cause.message
          : "Persiapan terhenti. Periksa sumber dan coba lagi.",
      );
    } finally {
      if (token === lookupToken.current) {
        inFlight.current = false;
        setBusy(null);
        setLookupStartedAt(null);
        setLookupFinished(false);
        lookupAbort.current = null;
      }
    }
  }

  /** J04: continue with the name guessed from the web address. The free
   * check is let go; Nuave reads the website properly after payment. */
  function continueWithGuessedName() {
    const current = sessionRef.current;
    const parsed = parseSourceInput(current.entry.source);
    const name = wayOutName.trim();
    if (!parsed || !name) return;
    if (unsafeSmartName(name)) {
      stopSensitiveInput();
      return;
    }
    cancelLookup();
    setError(null);
    goStage({
      ...current,
      stage: "steps",
      entry: { ...current.entry, name },
      identity: {
        inputName: name,
        inputSource: parsed.normalizedUrl,
        canonicalUrl: parsed.normalizedUrl,
        displayName: null,
        preparationMode: live ? "live" : "synthetic-local",
        description: null,
        iconDataUrl: null,
        guessed: true,
      },
      brand: { name, origin: "owner" },
      prepared: null,
      selection: null,
      confirmedSelection: null,
      frozen: null,
      pack: null,
      order: null,
      supersededOrder: current.order?.id ?? current.supersededOrder ?? null,
      supersededInfo: supersededInfoOf(current),
      afterOrder: null,
    });
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
  /** The owner's own Bayar or Lanjut on the order screen: going on with the
   * saved order answers J01's "belum diperiksa" notice. */
  function pressOrder() {
    setSkippedHandoff(null);
    void continueFromOrder();
  }

  async function continueFromOrder() {
    if (inFlight.current) return;
    const session = sessionRef.current;
    const identity = session.identity;
    const brand = session.brand ?? {
      name: session.entry.name.trim(),
      origin: "owner" as const,
    };
    if (!identity || !brand.name) return;
    let order = session.order ?? null;
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
    // The order a 409 answer is about: the one this screen held, or the one the
    // customer left (its own website and business if kept, else this screen's).
    const previousOrder =
      session.order ??
      (previousOrderId
        ? {
            id: previousOrderId,
            website: session.supersededInfo?.website ?? identity.canonicalUrl,
            name: session.supersededInfo?.name ?? brand.name,
          }
        : null);
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
          // The page shows that order's own state, with its own website and
          // business as kept (an older saved session without them falls back
          // to this screen's). If there is no such order, nothing is recorded
          // and the message stands.
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
              supersededInfo: null,
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
        working = {
          ...working,
          order,
          supersededOrder: null,
          supersededInfo: null,
        };
        persist(working);
        if (testCode) {
          setPaymentFor({
            orderId: order.id,
            payment: { state: "not_required" },
          });
          // The test pass needs no payment: this tab reads at once.
          autoReadOrder.current = order.id;
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
      setFindings(null);
      // Saved before the call: a reload or a failure never replays it.
      working = {
        ...working,
        stage: "reading",
        order: { ...order, readingStarted: true },
      };
      persist(working);
      await readWebsite(working, order.id, brand);
    } finally {
      inFlight.current = false;
      setBusy(null);
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
        expireOrder({ ...working, stage: "order" }, "intro-business");
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
      if (!extractionResponse.ok || !extraction.draft)
        throw new Error(
          extraction.error || "Fakta bisnis belum dapat disiapkan.",
        );
      const prepared = prepareUnderstanding({
        typedName: working.entry.name.trim() || brand.name,
        discoveredName: identity.displayName,
        canonicalSource: identity.canonicalUrl,
        draft: extraction.draft,
      });
      const next: SmartSession = {
        ...working,
        stage: "intro-business",
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
      };
      // J09: what was found drops in before the journey moves on by itself.
      // The reading is saved first, so a reload during the pause loses
      // nothing and calls nothing again.
      persist({ ...next, stage: "reading" });
      setFindings(findingsOf(prepared));
      await pauseForMotion(2_400);
      if (!mounted.current) {
        writeSmartSession(next);
        return;
      }
      goStage(next);
    } catch (cause) {
      persist({ ...working, stage: "order" });
      setError(
        cause instanceof Error
          ? cause.message
          : "Persiapan terhenti. Periksa sumber dan coba lagi.",
      );
    } finally {
      setFindings(null);
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
      setStartSheetOpen(false);
      setError(
        cause instanceof Error ? cause.message : "Periksa pertanyaan audit.",
      );
      return;
    }
    if (!order) {
      setStartSheetOpen(false);
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
          ...(session.pack.origins
            ? { question_origins: currentOrigins(session.pack) }
            : {}),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      if (response.ok) {
        writeActiveOrder(order.id);
        clearSmartSession();
        setStartSheetOpen(false);
        if (mounted.current) {
          setStartedQuestions([...session.pack.approved]);
          setStartedAt(Date.now());
          setActiveOrder(order.id);
        }
        return;
      }
      setStartSheetOpen(false);
      if (response.status === 404 || body.code === "ORDER_STATE") {
        expireOrder(session, "questions");
        return;
      }
      setError(body.error || "Audit belum dapat dimulai. Coba lagi.");
    } catch {
      setStartSheetOpen(false);
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
    let committed: SmartSession = {
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
      // Spec 018 R-04/R-15: search discovery runs in its own request first.
      // Its pool stays on the server; if it fails, the questions are written
      // from the business facts (R-08).
      if (session.order?.id && frozen.context.searchPlace) {
        const discovery = await fetch("/api/audit/discovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: session.order.id, intake: frozen }),
        }).catch(() => null);
        const discoveryBody = discovery
          ? ((await discovery.json().catch(() => ({}))) as {
              code?: string;
              locked?: boolean;
            })
          : {};
        if (discoveryBody.code === "ORDER_REQUIRED") {
          expireOrder(session, "summary");
          return;
        }
        // R-07: once discovery ran twice, the place stays as it is.
        if (
          discoveryBody.locked === true &&
          !committed.order?.searchPlaceLocked
        ) {
          committed = {
            ...committed,
            order: committed.order
              ? { ...committed.order, searchPlaceLocked: true }
              : committed.order,
          };
          goStage(committed);
        }
      }
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
          ...(Array.isArray(outcome.origins) && outcome.origins.length === 10
            ? { origins: outcome.origins }
            : {}),
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

  function updateSelection(selection: SmartSelection): boolean {
    if (unsafeSmartSelection(selection)) {
      stopSensitiveInput();
      return false;
    }
    persist({ ...sessionRef.current, selection });
    setError(null);
    return true;
  }

  /** "Simpan & keluar": progress is already saved in this browser; leave. */
  function saveAndExit() {
    if (!flushPendingAdds(pendingAdds)) return;
    writeSmartSession(sessionRef.current);
    window.location.assign("/");
  }

  // The scene on screen and the direction the person is moving in.
  const sceneKey =
    session.stage === "questions"
      ? `questions:${Boolean(session.pack)}`
      : session.stage === "reading"
        ? `reading:${busy === "lookup" || !session.order ? "lookup" : "paid"}`
        : session.stage;
  // The previous scene is remembered in state, so the direction of a change
  // is worked out during the render that shows it.
  const [motionDirection, setMotionDirection] = useState<{
    key: string;
    direction: SceneDirection;
    kind: SceneKind;
  }>({ key: sceneKey, direction: 1, kind: "slide" });
  if (motionDirection.key !== sceneKey) {
    const previous = motionDirection.key;
    setMotionDirection({
      key: sceneKey,
      direction: sceneRank(sceneKey) >= sceneRank(previous) ? 1 : -1,
      kind:
        TARGET_SCENES.includes(previous) && TARGET_SCENES.includes(sceneKey)
          ? "fade"
          : "slide",
    });
  }
  // R-27: each screen arrival moves focus to its heading and resets scroll.
  const arrive = () => {
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  };

  // J01 → a saved order or audit: the typed website was not checked; say so,
  // and offer the check while nothing locks the saved progress.
  const savedFor = session.order?.name ?? session.brand?.name ?? "";
  // R-19: checking another website replaces the saved order, so it waits for
  // the order's status answer (the order may be paid) and never replaces a
  // paid or paying one.
  const canCheckSkipped =
    !activeOrder &&
    !paymentLocked &&
    (!session.order || checkedOrder === session.order.id);
  // R-27: a long business name or website wraps inside the note (its
  // buttons too) instead of running past a 320px screen.
  const handoffNotice = skippedHandoff ? (
    <div
      role="status"
      className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2.5 rounded-tile bg-stone-50 px-4 py-3.5"
    >
      <p className="type-copy-sm m-0 text-ink-700 [overflow-wrap:anywhere]">
        {activeOrder
          ? `Website ${displayHost(skippedHandoff)} belum diperiksa, karena browser ini masih menampilkan audit sebelumnya.`
          : paymentLocked
            ? `Website ${displayHost(skippedHandoff)} belum diperiksa. Pesanan untuk ${savedFor} sudah dibayar atau sedang dibayar, jadi selesaikan audit ini dulu. Butuh bantuan? ${SUPPORT_EMAIL}`
            : `Website ${displayHost(skippedHandoff)} belum diperiksa, karena ${session.order ? "pesanan" : "audit"} untuk ${savedFor} masih tersimpan di browser ini.`}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {canCheckSkipped ? (
          <Button
            type="button"
            variant="inkOutline"
            size="sm"
            className="h-auto min-h-11 max-w-full shrink rounded-chip px-4 py-2 text-left whitespace-normal [overflow-wrap:anywhere]"
            onClick={checkSkippedWebsite}
          >
            Periksa {displayHost(skippedHandoff)}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="inkLink"
          size="sm"
          className="h-auto min-h-11 max-w-full shrink px-0 py-2 text-left whitespace-normal [overflow-wrap:anywhere]"
          onClick={() => setSkippedHandoff(null)}
        >
          {activeOrder || paymentLocked
            ? "Tutup"
            : `Lanjutkan ${session.order ? "pesanan" : "audit"} ${savedFor}`}
        </Button>
      </div>
    </div>
  ) : null;

  if (!ready)
    return (
      <JourneyPage hasBottomBar={false}>
        <p role="status" className="type-copy m-0 mt-14 text-ink-600">
          Menyiapkan sesi audit…
        </p>
      </JourneyPage>
    );
  if (activeOrder)
    return (
      <SmartAuditStage
        orderId={activeOrder}
        onRestart={newJourney}
        questions={startedQuestions}
        startedAt={startedAt}
        notice={handoffNotice}
      />
    );
  if (historical)
    return (
      <JourneyPage hasBottomBar={false}>
        <TopBar kind="brand" />
        <section className="grid gap-4 pt-10" data-historical-audit="held">
          <ScreenHeader
            headingRef={headingRef}
            title="Audit lama tersimpan di sesi ini"
            lead="Catatan audit lama tetap tersimpan di browser ini. Tampilan laporan, unduhan, melanjutkan pengamatan, dan percobaan ulang laporan ditahan untuk catatan tersebut."
          />
          <Button variant="ink" size="xl" className="mt-4" onClick={newJourney}>
            Mulai audit baru
          </Button>
        </section>
      </JourneyPage>
    );

  // Spec 017: the saved order is the one for this website and business; what
  // the server last said about its payment; and what the main button does.
  const progress = stageProgress(session, busy === "lookup");
  const backTarget = backTargetFor(session, paymentLocked);
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
      : "Bayar Rp249.000"
    : currentPayment?.state === "paid" ||
        currentPayment?.state === "not_required"
      ? "Lanjut"
      : currentPayment?.state === "unpaid"
        ? "Bayar Rp249.000"
        : null;
  const lookupElapsed =
    lookupStartedAt !== null ? Math.max(0, lookupNow - lookupStartedAt) : 0;
  const checkPhase = checkPhaseFor(lookupElapsed, wayOutFrom, lookupFinished);
  const isLookup = session.stage === "reading" && sceneKey === "reading:lookup";
  const isPaidReading =
    session.stage === "reading" && sceneKey === "reading:paid";
  const orderNumber = session.order?.number ?? null;
  const selection = session.selection;
  const prepared = session.prepared;
  const gaps = selection ? requiredSmartGaps(selection) : [];

  /** The forward button of a framed Step 2 screen. */
  const framedNext = (): {
    label: string;
    onClick: () => void;
    disabled: boolean;
  } | null => {
    if (!selection || !FRAMED_STAGES.includes(session.stage)) return null;
    return {
      label: "Lanjut",
      disabled:
        (session.stage === "location" && !smartLocationReady(selection)) ||
        (session.stage === "product" && !smartProductReady(selection)) ||
        (session.stage === "category" && !smartCategoryReady(selection)) ||
        (session.stage === "offerings" &&
          selection.focus !== "produk" &&
          !selection.offerings.length) ||
        (session.stage === "service" && !smartServiceReady(selection)) ||
        (session.stage === "market" && !smartMarketReady(selection)) ||
        (session.stage === "competitors" && !smartComparatorsReady(selection)),
      onClick: () => {
        // Text typed into an add field is added first (or its refusal
        // keeps the screen).
        if (!flushPendingAdds(pendingAdds)) return;
        const latest = sessionRef.current;
        const target = forwardStageFor(latest);
        if (!target) return;
        goStage({
          ...latest,
          stage: target,
          ...markerFields(latest, target),
        });
        // A message about this screen does not follow to the next one.
        setError(null);
      },
    };
  };

  // The free check read the website but could not tell its name for sure:
  // the owner saves the name once before going on.
  const nameToCheck =
    session.stage === "brand" &&
    !prepared &&
    session.identity?.nameUnsure === true &&
    session.brand?.origin !== "owner";

  // ── Top bar per stage ──
  let top: ReactNode = null;
  if (session.stage === "entry")
    top = <TopBar kind="brand" orderNumber={orderNumber} />;
  else if (isLookup) top = <TopBar kind="back" onBack={editWebsite} />;
  else if (session.stage === "brand" && !prepared)
    top = (
      <TopBar
        kind="back"
        onBack={backTarget ? goBack : undefined}
        orderNumber={orderNumber}
      />
    );
  else if (session.stage === "steps")
    top = (
      <TopBar
        kind="back"
        onBack={backTarget ? goBack : undefined}
        orderNumber={orderNumber}
      />
    );
  else if (session.stage === "order")
    top = (
      <TopBar
        kind="title"
        title="Konfirmasi dan bayar"
        onBack={backTarget ? goBack : undefined}
      />
    );
  else if (!isPaidReading)
    top = (
      <TopBar
        kind="wizard"
        onSaveExit={saveAndExit}
        orderNumber={orderNumber}
      />
    );

  // ── Bottom bar per stage ──
  let bottom: ReactNode = null;
  const back = backTarget ? { onClick: goBack } : null;
  if (isLookup) {
    bottom = (
      <BottomBar
        progress={progress ?? undefined}
        back={{ onClick: editWebsite }}
        action={
          checkPhase === "wayout"
            ? {
                label: "Lanjut dengan nama ini",
                onClick: continueWithGuessedName,
                disabled: !wayOutName.trim(),
              }
            : {
                label: "Ya, ini bisnis saya",
                onClick: () => {},
                disabled: true,
              }
        }
      />
    );
  } else if (session.stage === "brand" && !prepared && session.identity) {
    const brandName = session.brand?.name ?? session.entry.name.trim();
    bottom = (
      <BottomBar
        progress={progress ?? undefined}
        back={back}
        action={
          nameToCheck
            ? {
                label: "Periksa nama bisnis",
                opensDialog: true,
                onClick: () => setAskName(true),
              }
            : {
                label: "Ya, ini bisnis saya",
                disabled: !brandName.trim(),
                onClick: () => {
                  // Spec 016 D1: the free brand check is followed by the order
                  // screens; the paid reading starts only after the order.
                  goStage({
                    ...session,
                    stage: "steps",
                    entry: { ...session.entry, name: brandName },
                    brand: session.brand ?? {
                      name: brandName,
                      origin: "owner",
                    },
                  });
                },
              }
        }
      />
    );
  } else if (session.stage === "brand" && prepared && selection) {
    bottom = (
      <BottomBar
        progress={progress ?? undefined}
        back={back}
        action={{
          label: "Lanjut",
          disabled: !selection.name.trim(),
          onClick: () => {
            // A review-opened name edit continues straight back to the
            // review; the normal brand check still opens the chapter.
            const target = session.editReturn ?? "intro-business";
            goStage({
              ...session,
              stage: target,
              ...markerFields(session, target),
            });
          },
        }}
      />
    );
  } else if (session.stage === "steps") {
    bottom = (
      <BottomBar
        layout="full"
        action={{
          label: "Lanjut ke pembayaran",
          onClick: () => goStage({ ...session, stage: "order" }),
        }}
      />
    );
  } else if (session.stage === "order" && session.identity) {
    bottom = orderAction ? (
      <BottomBar
        layout="full"
        action={{
          label: orderAction,
          tone: orderAction === "Lanjut" ? "ink" : "commit",
          busy: busy !== null,
          onClick: pressOrder,
        }}
        note={orderAction === "Lanjut" ? undefined : <PayConsent />}
      />
    ) : null;
  } else if (
    session.stage === "intro-business" ||
    session.stage === "intro-review"
  ) {
    bottom = (
      <BottomBar
        progress={progress ?? undefined}
        back={back}
        action={{
          label: "Mulai",
          onClick: () => {
            const target = forwardStageFor(session);
            if (target) goStage({ ...session, stage: target });
          },
        }}
      />
    );
  } else if (framedNext()) {
    bottom = (
      <BottomBar
        progress={progress ?? undefined}
        back={back}
        action={framedNext()}
      />
    );
  } else if (session.stage === "summary" && selection) {
    bottom = (
      <BottomBar
        layout="full"
        progress={progress ?? undefined}
        action={
          gaps.length
            ? {
                label: "Lengkapi yang perlu dipastikan",
                onClick: () => {
                  // The CTA opens the screen that owns the first still-missing
                  // meaning; the return marker sends it back to the review
                  // once corrected instead of replaying unrelated screens.
                  const target = firstSmartGapStage(selection);
                  if (!target) return;
                  goStage({
                    ...session,
                    stage: target,
                    editReturn: "summary",
                    editBaseline: undefined,
                  });
                  setError(null);
                },
              }
            : {
                label: "Buat pertanyaan audit",
                disabled: !reviewConfirmed,
                busy: busy === "questions",
                ariaDescribedBy: "review-confirmation",
                onClick: () => void confirm(),
              }
        }
      />
    );
  } else if (session.stage === "questions" && session.frozen) {
    bottom = session.pack ? (
      <BottomBar
        progress={progress ?? undefined}
        back={back}
        action={{
          label: "Jalankan audit",
          tone: "commit",
          disabled: busy !== null,
          onClick: () => setStartSheetOpen(true),
        }}
      />
    ) : (
      <BottomBar progress={progress ?? undefined} back={back} />
    );
  }

  // ── The screen ──
  // Spec 013 R-07: synthetic mode stays visibly labelled while checking.
  const syntheticFootnote = live ? null : (
    <p className="type-copy-sm m-0 text-center text-ink-500">
      {SYNTHETIC_LABEL}
    </p>
  );
  let screen: ReactNode = null;
  if (session.stage === "entry") {
    screen = (
      <EntryScreen
        headingRef={headingRef}
        inputRef={sourceInputRef}
        source={session.entry.source}
        onSourceChange={(value) => {
          if (unsafeSmartSource(value)) {
            stopSensitiveInput();
            return;
          }
          // A website change invalidates preparation: the next check reads
          // the new source from scratch.
          persist(withNewSource(session, value));
          setError(null);
        }}
        onSubmit={() => void inspect()}
        busy={busy !== null}
        error={error || restoredSourceError}
        notice={interrupted ? LOOKUP_INTERRUPTED_NOTICE : null}
        footnote={syntheticFootnote}
      />
    );
  } else if (isLookup) {
    screen = (
      <BusinessCheckScreen
        headingRef={headingRef}
        phase={checkPhase}
        elapsed={lookupElapsed}
        finished={lookupFinished}
        onWaitLonger={() => setWayOutFrom(lookupElapsed + WAIT_MORE_MS)}
        onTryAnother={editWebsite}
        onContinueWithName={continueWithGuessedName}
        wayOutName={wayOutName}
        onWayOutNameChange={(value) => {
          setWayOutName(value);
          setError(null);
        }}
        wayOutError={error}
        footnote={syntheticFootnote}
      />
    );
  } else if (isPaidReading) {
    screen = (
      <PaidReadingScreen
        headingRef={headingRef}
        orderNumber={orderNumber}
        findings={findings}
        footnote={
          live ? null : (
            <p className="type-caption m-0 text-ink-500">{SYNTHETIC_LABEL}</p>
          )
        }
      />
    );
  } else if (session.stage === "brand" && !prepared && session.identity) {
    const brandName = session.brand?.name ?? session.entry.name.trim();
    screen = (
      <BusinessFoundScreen
        headingRef={headingRef}
        name={brandName}
        source={session.identity.canonicalUrl}
        description={session.identity.description}
        iconDataUrl={session.identity.iconDataUrl}
        guessed={session.identity.guessed === true}
        nameUnsure={nameToCheck}
        askName={askName}
        onAsked={() => setAskName(false)}
        onRename={(name) => {
          if (unsafeSmartName(name)) {
            stopSensitiveInput();
            return false;
          }
          persist({
            ...session,
            entry: { ...session.entry, name },
            brand: { name, origin: "owner" },
          });
          setError(null);
          return true;
        }}
        onChangeWebsite={editWebsite}
        error={error}
      />
    );
  } else if (session.stage === "brand" && prepared && selection) {
    screen = (
      <BusinessFoundScreen
        headingRef={headingRef}
        name={selection.name}
        source={prepared.canonicalSource}
        description={session.identity?.description}
        iconDataUrl={session.identity?.iconDataUrl}
        notice={
          session.sourceExcerptStatus === "no-usable-text" ? (
            <p role="status" className="type-copy-sm m-0 text-ink-600">
              {SOURCE_EXCERPT_EMPTY_NOTICE}
            </p>
          ) : null
        }
        onRename={(name) =>
          updateSelection({ ...selection, name, nameOrigin: "owner" })
        }
        onChangeWebsite={lockedAfterPayment ? undefined : editWebsite}
        error={error}
      />
    );
  } else if (session.stage === "steps") {
    screen = <StepsScreen headingRef={headingRef} />;
  } else if (session.stage === "order" && session.identity) {
    screen = (
      <OrderScreen
        headingRef={headingRef}
        businessName={session.brand?.name ?? session.entry.name.trim()}
        iconDataUrl={session.identity.iconDataUrl}
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
        onNewOrder={newJourney}
        onSubmit={pressOrder}
        submitLabel={orderAction}
      />
    );
  } else if (session.stage === "intro-business") {
    screen = (
      <ChapterCover
        headingRef={headingRef}
        step={2}
        title="Ceritakan bisnis Anda"
        body="Sebagian besar sudah kami isi dari website Anda. Anda cukup memeriksa, mengetuk, lalu lanjut."
        art="kedaiOpen"
        from="kedaiBare"
      />
    );
  } else if (session.stage === "intro-review") {
    screen = (
      <ChapterCover
        headingRef={headingRef}
        step={3}
        title="Periksa, lalu jalankan audit"
        body="Cek profil bisnis dan 10 pertanyaan sekali saja. Setelah itu Nuave bekerja sendiri, dan laporan dikirim ke email Anda."
        art="kedaiBusy"
        from="kedaiOpen"
      />
    );
  } else if (prepared && selection && FRAMED_STAGES.includes(session.stage)) {
    const shared = {
      headingRef,
      prepared,
      selection,
      onChange: updateSelection,
      error,
      // One message at a time: a field's limit replaces a privacy stop and
      // the other way round.
      onRefuse: setError,
    };
    screen =
      session.stage === "focus" ? (
        <>
          {session.sourceExcerptStatus === "no-usable-text" ? (
            <p role="status" className="type-copy-sm m-0 mb-4 text-ink-600">
              {SOURCE_EXCERPT_EMPTY_NOTICE}
            </p>
          ) : null}
          <SmartFocusScreen
            {...shared}
            onOpenTarget={(next) => {
              if (unsafeSmartSelection(next)) {
                stopSensitiveInput();
                return;
              }
              const target = next.focus === "cabang" ? "location" : "product";
              goStage({
                ...sessionRef.current,
                selection: next,
                stage: target,
                ...markerFields(sessionRef.current, target),
              });
            }}
          />
        </>
      ) : session.stage === "location" ? (
        <SmartLocationScreen {...shared} onChangeFocus={goBack} />
      ) : session.stage === "product" ? (
        <SmartProductScreen {...shared} onChangeFocus={goBack} />
      ) : session.stage === "category" ? (
        <SmartCategoryScreen {...shared} />
      ) : session.stage === "offerings" ? (
        <SmartOfferingsScreen {...shared} />
      ) : session.stage === "target-customer" ? (
        <SmartTargetCustomerScreen {...shared} />
      ) : session.stage === "customer-needs" ? (
        <SmartCustomerNeedsScreen {...shared} />
      ) : session.stage === "service" ? (
        <SmartServiceScreen {...shared} />
      ) : session.stage === "market" ? (
        <SmartMarketScreen {...shared} />
      ) : session.stage === "competitors" ? (
        <SmartCompetitorsScreen
          {...shared}
          onSkip={(mode) => {
            // R-18: "Belum tahu" or "Tidak ada pembanding langsung": nothing
            // named, so the audit compares with similar businesses in the
            // category, and each choice freezes as itself.
            const target = forwardStageFor(session);
            if (!target) return;
            goStage({
              ...session,
              selection: {
                ...selection,
                comparatorMode: mode,
                comparatorNames: [],
                origins: { ...selection.origins, comparators: "owner" },
              },
              stage: target,
              ...markerFields(session, target),
            });
            setError(null);
          }}
        />
      ) : (
        <SmartDifferentiatorScreen {...shared} />
      );
  } else if (session.stage === "summary" && prepared && selection) {
    screen = (
      <SmartReview
        headingRef={headingRef}
        prepared={prepared}
        searchPlaceLocked={Boolean(session.order?.searchPlaceLocked)}
        selection={selection}
        onChange={updateSelection}
        confirmed={reviewConfirmed}
        onConfirmedChange={setReviewConfirmed}
        onEditBrand={() => {
          // The business row's name edit opens the brand screen; its Lanjut
          // and Back then return to the review (J7). It stays open after
          // payment: only the website identifies the order, and a Google
          // listing name such as "Klinik Dokter Gigi Terdekat" needs fixing
          // (2026-10-29).
          goStage({
            ...session,
            stage: "brand",
            editReturn: "summary",
            editBaseline: undefined,
          });
          setError(null);
        }}
        onEditSource={
          lockedAfterPayment
            ? undefined
            : () => {
                // The marker lets a same-source correction come back through
                // the brand check; a changed URL clears it and resets
                // preparation/frozen state on input change.
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
          // The focus row reviews focus; the dedicated screen owns the
          // change, and this marker sends the detour back here once the chain
          // completes — recording the confirmed focus and category so an
          // untouched pick exits early (R-05/R-21).
          goStage({
            ...session,
            stage: "focus",
            editReturn: "summary",
            editBaseline: {
              focus: selection.focus,
              category: selection.category,
            },
          });
          setError(null);
        }}
        canUndo={Boolean(
          session.confirmedSelection &&
          JSON.stringify(selection) !==
            JSON.stringify(session.confirmedSelection),
        )}
        onUndo={() =>
          goStage({
            ...session,
            stage: "questions",
            selection: session.confirmedSelection,
          })
        }
        busy={busy !== null}
        error={error}
        sourceExcerptStatus={session.sourceExcerptStatus}
      />
    );
  } else if (session.stage === "questions" && session.frozen) {
    screen = session.pack ? (
      <SmartQuestionsScreen
        headingRef={headingRef}
        pack={session.pack}
        context={session.frozen.context}
        onChange={(pack) => persist({ ...session, pack })}
        approving={busy === "approving"}
        onApprove={() => void approveQuestions()}
        startOpen={startSheetOpen}
        onStartOpenChange={setStartSheetOpen}
        error={error}
      />
    ) : (
      <QuestionsPreparing
        headingRef={headingRef}
        preparing={busy === "questions"}
        searching={Boolean(session.frozen.context.searchPlace)}
        live={live}
        onRetry={() => void confirm()}
        onBack={goBack}
        error={error}
      />
    );
  }

  return (
    <PendingAddsContext.Provider value={pendingAdds}>
      <JourneyPage
        tone={isPaidReading ? "ember" : "plain"}
        hasBottomBar={bottom !== null}
      >
        {top}
        {handoffNotice}
        <JourneyScene
          sceneKey={sceneKey}
          direction={motionDirection.direction}
          kind={motionDirection.kind}
          onEnter={arrive}
          className={cn(
            "flex-1",
            session.stage === "entry"
              ? "pt-2"
              : isPaidReading
                ? "pt-4"
                : "pt-5",
          )}
        >
          {screen}
        </JourneyScene>
        {bottom}
      </JourneyPage>
    </PendingAddsContext.Provider>
  );
}
