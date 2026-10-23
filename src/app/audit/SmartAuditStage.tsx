"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  IconCircleCheck,
  IconCircleDashed,
  IconClock,
  IconInfoCircle,
  IconLoader2,
  IconMail,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { SPRING_SETTLE } from "@/components/motion/presets";
import { useMotionAllowed } from "@/components/motion/useMotionAllowed";
import { Art } from "@/components/product/journey/Art";
import {
  BottomBar,
  JourneyPage,
  SUPPORT_EMAIL,
  TopBar,
} from "@/components/product/journey/JourneyBars";
import { measurementSlotForPromptId } from "@/lib/audit/measurement-matrix";
import { clearActiveOrder } from "@/lib/intake/smart-session";
import { cn } from "@/lib/utils";

/**
 * Screens J29 and J30 (spec 016 screens 15 and 15a): the audit runs on the
 * server, so this page only shows progress by question and can be closed at
 * any time. It asks `/api/orders/status` (the order id travels in the body,
 * never the URL) and never receives the report, the email or the link
 * secret (R-21). When the order ends, the saved order id is removed from the
 * browser (R-31). The question texts are shown only while this tab still
 * holds them from the approval; they are never stored.
 */

type QuestionStatus =
  "pending" | "running" | "retrying" | "completed" | "failed";
type OrderStatusAnswer = {
  state: "open" | "running" | "reporting" | "delivered" | "failed" | "expired";
  completed: number;
  total: number;
  questions: Array<{ prompt_id: string; status: QuestionStatus }>;
  payment?: { order_number?: string };
};

const POLL_MS = 5_000;

/** "2 menit 10 detik" */
export function elapsedText(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes} menit ${rest} detik` : `${rest} detik`;
}

const ROW_STATUS: Record<QuestionStatus, string> = {
  pending: "Menunggu",
  running: "Sedang diuji",
  retrying: "Diuji ulang",
  completed: "Selesai",
  failed: "Belum berhasil diuji",
};

function StatusIcon({ status }: { status: QuestionStatus }) {
  if (status === "completed")
    return <IconCircleCheck size={18} stroke={1.75} className="text-ink-700" />;
  if (status === "running" || status === "retrying")
    return (
      <IconLoader2
        size={18}
        stroke={1.75}
        className="animate-spin text-ember-700 motion-reduce:animate-none"
      />
    );
  if (status === "failed")
    return <IconInfoCircle size={18} stroke={1.75} className="text-ink-500" />;
  return <IconCircleDashed size={18} stroke={1.75} className="text-ink-400" />;
}

/** Ten segments: done in ember, the one being asked lighter, the rest grey. */
function TenSegments({
  questions,
  completed,
}: {
  questions: OrderStatusAnswer["questions"];
  completed: number;
}) {
  const statuses: QuestionStatus[] = Array.from(
    { length: 10 },
    (_, index) =>
      questions[index]?.status ?? (index < completed ? "completed" : "pending"),
  );
  return (
    <div
      role="progressbar"
      aria-label="Pertanyaan selesai"
      aria-valuemin={0}
      aria-valuemax={10}
      aria-valuenow={completed}
      className="grid grid-cols-10 gap-1"
    >
      {statuses.map((status, index) => (
        <span
          key={index}
          className={cn(
            "h-1.5 rounded-[3px] transition-colors duration-500",
            status === "completed"
              ? "bg-ember-500"
              : status === "running" || status === "retrying"
                ? "bg-ember-100"
                : "bg-line-200",
          )}
        />
      ))}
    </div>
  );
}

function Centered({
  headingRef,
  art,
  title,
  children,
  stage,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  art?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  stage: string;
}) {
  return (
    <section
      className="grid justify-items-center gap-2.5 pt-1 text-center"
      data-order-stage={stage}
    >
      {art}
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="type-heading-lg m-0 text-balance text-ink-900 outline-none"
      >
        {title}
      </h1>
      {children}
    </section>
  );
}

export default function SmartAuditStage({
  orderId,
  pollMs = POLL_MS,
  onRestart,
  questions,
  startedAt = null,
  notice = null,
}: {
  orderId: string;
  pollMs?: number;
  onRestart: () => void;
  /** The approved texts, while this tab still holds them. */
  questions?: string[] | null;
  /** When this tab started the audit (ms), while it still holds it. */
  startedAt?: number | null;
  /** A note under the top bar (a website typed on the landing page that was
   * not checked). */
  notice?: ReactNode;
}) {
  const animate = useMotionAllowed();
  const [status, setStatus] = useState<OrderStatusAnswer | null>(null);
  const [ended, setEnded] = useState<"gone" | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      let again = true;
      try {
        const response = await fetch("/api/orders/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: orderId }),
        });
        if (cancelled) return;
        if (response.status === 404) {
          // Unknown to the server: nothing more to wait for.
          clearActiveOrder();
          setEnded("gone");
          again = false;
        } else if (response.ok) {
          const answer = (await response.json()) as OrderStatusAnswer;
          if (cancelled) return;
          setStatus(answer);
          setUnreachable(false);
          if (["delivered", "failed", "expired"].includes(answer.state)) {
            // R-31: the order has ended; the order id leaves the browser too.
            clearActiveOrder();
            again = false;
          }
        } else {
          setUnreachable(true);
        }
      } catch {
        if (!cancelled) setUnreachable(true);
      }
      if (again && !cancelled) timer = setTimeout(poll, pollMs);
    }
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, pollMs]);

  const running =
    !ended &&
    (!status || ["open", "running", "reporting"].includes(status.state));
  // The elapsed time ticks once a second while the audit runs.
  useEffect(() => {
    if (!running || startedAt === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running, startedAt]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [status?.state, ended]);

  const orderNumber = status?.payment?.order_number ?? null;
  /** "Tutup halaman": the audit keeps running on the server. A tab this page
   * did not open cannot close itself, so it goes to the home page instead. */
  const closePage = () => {
    window.close();
    window.setTimeout(() => window.location.assign("/"), 150);
  };

  if (ended === "gone" || status?.state === "expired") {
    return (
      <JourneyPage hasBottomBar={false}>
        <TopBar kind="brand" />
        {notice}
        <div className="pt-10">
          <Centered
            headingRef={headingRef}
            title="Pesanan ini sudah tidak aktif"
            stage="gone"
          >
            <p className="type-copy m-0 text-ink-600">
              Pesanan ini sudah berakhir atau tidak ditemukan. Anda dapat
              memulai audit baru.
            </p>
            <Button
              variant="ink"
              size="xl"
              className="mt-6 w-full"
              onClick={onRestart}
            >
              Mulai audit baru
            </Button>
          </Centered>
        </div>
      </JourneyPage>
    );
  }

  if (status?.state === "delivered") {
    return (
      <JourneyPage tone="cream" hasBottomBar={false}>
        <TopBar kind="brand" orderNumber={orderNumber} />
        {notice}
        <div className="pt-2.5">
          <Centered
            headingRef={headingRef}
            stage="delivered"
            title="Laporan Anda sudah siap"
            art={
              <>
                <span className="type-label-sm inline-flex h-[30px] items-center gap-1.5 rounded-chip border border-line-200 bg-white pr-3 pl-2.5 text-ink-700">
                  <IconCircleCheck size={16} stroke={1.75} aria-hidden="true" />
                  10 dari 10 pertanyaan selesai
                </span>
                <Art
                  name="envelope"
                  width={153}
                  enter
                  priority
                  className="my-1"
                />
              </>
            }
          >
            <p className="type-copy m-0 text-ink-600">
              Link laporan sudah dikirim ke email Anda. Buka email dari Tim
              Nuave untuk melihat laporan.
            </p>
            <div className="mt-4 flex w-full items-start gap-3 rounded-card bg-white px-[18px] py-4 text-left shadow-card">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full bg-ember-50 text-ember-700"
                aria-hidden="true"
              >
                <IconMail size={18} stroke={1.75} />
              </span>
              <span className="grid min-w-0 gap-px">
                <span className="type-caption text-ink-500">Dikirim ke</span>
                <span className="type-title-sm text-ink-900">
                  Email yang Anda tulis saat memesan
                </span>
                <span className="type-caption text-ink-500">
                  dari Tim Nuave &lt;{SUPPORT_EMAIL}&gt;
                </span>
              </span>
            </div>
            <p className="type-copy-sm m-0 mt-3 flex w-full items-start gap-2 text-left text-ink-600">
              <IconInfoCircle
                size={16}
                stroke={1.75}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              Belum ada di kotak masuk? Periksa folder Spam atau Promosi.
            </p>
          </Centered>
        </div>
        <div className="mt-auto grid justify-items-center gap-2.5 pt-10 text-center">
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
              `Minta kirim ulang email laporan${orderNumber ? ` (${orderNumber})` : ""}`,
            )}`}
            className="type-title inline-flex h-14 w-full items-center justify-center rounded-button border-[1.5px] border-ink-900 bg-white px-6 text-ink-900 no-underline transition-[background-color,transform] duration-150 hover:bg-stone-50 active:scale-[0.97]"
          >
            Minta kirim ulang email
          </a>
          <p className="type-caption m-0 text-ink-600">
            Butuh bantuan? {SUPPORT_EMAIL}
          </p>
          {orderNumber ? (
            <p className="type-mono-sm m-0 text-ink-600">
              No. pesanan {orderNumber}
            </p>
          ) : null}
          <Button variant="inkLink" size="touch" onClick={onRestart}>
            Mulai audit baru
          </Button>
        </div>
      </JourneyPage>
    );
  }

  if (status?.state === "failed") {
    return (
      <JourneyPage hasBottomBar={false}>
        <TopBar kind="brand" orderNumber={orderNumber} />
        {notice}
        <div className="pt-10">
          <Centered
            headingRef={headingRef}
            stage="failed"
            title="Audit belum bisa diselesaikan"
          >
            <p role="status" className="type-copy m-0 text-ink-600">
              Kami sudah mencatatnya dan akan menghubungi Anda lewat email.
            </p>
            {orderNumber ? (
              <p className="type-mono-sm m-0 mt-2 text-ink-500">
                No. pesanan {orderNumber}
              </p>
            ) : null}
          </Centered>
        </div>
      </JourneyPage>
    );
  }

  const reporting = status?.state === "reporting";
  const completed = status?.completed ?? 0;
  const rows = status?.questions ?? [];
  const current = rows.findIndex(
    (row) => row.status === "running" || row.status === "retrying",
  );
  const textOf = (index: number, promptId: string) =>
    questions?.[index] ??
    measurementSlotForPromptId(promptId)?.customerFacingLabel ??
    `Pertanyaan ${index + 1}`;
  return (
    <JourneyPage hasBottomBar>
      <TopBar kind="brand" orderNumber={orderNumber} />
      {notice}
      <section
        className="grid justify-items-center pt-1 text-center"
        data-order-stage={status?.state ?? "loading"}
      >
        <Art name="phoneChat" width={66} enter priority />
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="type-heading-lg m-0 mt-3 text-balance text-ink-900 outline-none"
        >
          {reporting
            ? "Semua pertanyaan selesai, laporan sedang dibuat"
            : "Audit bisnis Anda sedang berjalan"}
        </h1>
        <p
          role="status"
          className="type-copy m-0 mt-2.5 text-ink-600"
          data-order-note="close-ok"
        >
          Anda boleh menutup halaman ini. Audit akan tetap berjalan, dan link
          laporan dikirim ke email Anda.
        </p>
      </section>
      <section
        aria-label="Kemajuan audit"
        data-order-progress={completed}
        className="mt-6 grid gap-3 rounded-[24px] border border-line-200 bg-white px-[18px] pt-[18px] pb-2 shadow-card"
      >
        <div className="grid gap-1">
          <p className="type-title m-0 text-ink-900">
            {completed} dari 10 pertanyaan selesai
          </p>
          {startedAt !== null ? (
            <p className="type-caption m-0 flex items-center gap-1.5 text-ink-500">
              <IconClock size={14} stroke={1.75} aria-hidden="true" />
              Waktu berjalan: {elapsedText(now - startedAt)}
            </p>
          ) : null}
        </div>
        <TenSegments questions={rows} completed={completed} />
        <AnimatePresence mode="popLayout" initial={false}>
          {reporting || current >= 0 ? (
            <motion.div
              key={reporting ? "report" : `q-${current}`}
              className="flex items-start gap-2.5 rounded-input border border-ember-100 bg-ember-50 p-3"
              initial={animate ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={animate ? { opacity: 0, y: -8 } : { opacity: 0 }}
              transition={SPRING_SETTLE}
            >
              <IconLoader2
                size={18}
                stroke={1.75}
                className="mt-px shrink-0 animate-spin text-ember-700 motion-reduce:animate-none"
                aria-hidden="true"
              />
              <span className="grid min-w-0 gap-[3px] text-left">
                <span className="type-label-sm-strong text-ember-700">
                  {reporting
                    ? "Sedang menyusun laporan"
                    : `Sedang diuji · pertanyaan ${current + 1}`}
                </span>
                <span className="type-title-sm text-ink-900">
                  {reporting
                    ? "Jawaban model AI sedang dibaca dan diringkas."
                    : textOf(current, rows[current]!.prompt_id)}
                </span>
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {status ? (
          <ol className="m-0 list-none p-0 text-left">
            {rows.map((row, index) => (
              <li
                key={row.prompt_id}
                className="flex items-start gap-2.5 border-line-200 py-3 not-first:border-t"
              >
                <span className="mt-px shrink-0" aria-hidden="true">
                  <StatusIcon status={row.status} />
                </span>
                <span className="grid min-w-0 gap-[3px]">
                  <span
                    className={cn(
                      "type-copy-sm break-words",
                      row.status === "running" || row.status === "retrying"
                        ? "font-semibold text-ink-900"
                        : row.status === "pending"
                          ? "text-ink-500"
                          : "text-ink-600",
                    )}
                  >
                    {index + 1}. {textOf(index, row.prompt_id)}
                  </span>
                  <span
                    className={cn(
                      "type-label-sm",
                      row.status === "running" || row.status === "retrying"
                        ? "text-ember-700"
                        : "text-ink-500",
                    )}
                  >
                    {ROW_STATUS[row.status]}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p role="status" className="type-copy-sm m-0 pb-3 text-ink-500">
            Memeriksa kemajuan audit…
          </p>
        )}
      </section>
      {unreachable ? (
        <p role="status" className="type-copy-sm m-0 mt-3 text-ink-600">
          Kemajuan belum dapat dimuat. Audit tetap berjalan di server; coba lagi
          sebentar.
        </p>
      ) : null}
      <p className="type-caption m-0 mt-5 flex items-center justify-center gap-1.5 text-ink-600">
        <IconMail size={16} stroke={1.75} aria-hidden="true" />
        Link laporan dikirim ke email yang Anda tulis saat memesan.
      </p>
      <BottomBar
        layout="full"
        action={{ label: "Tutup halaman", tone: "outline", onClick: closePage }}
      />
    </JourneyPage>
  );
}
