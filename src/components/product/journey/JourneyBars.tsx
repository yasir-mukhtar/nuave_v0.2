"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { IconChevronLeft, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/motion/BottomSheet";
import { SPRING_SETTLE } from "@/components/motion/presets";
import { useMotionAllowed } from "@/components/motion/useMotionAllowed";
import { cn } from "@/lib/utils";
import { SUPPORT_EMAIL } from "@/lib/legal";
import { NuaveLogo } from "./NuaveLogo";

export { SUPPORT_EMAIL };

/** A 36px pill with a 44px touch area (Simpan & keluar, Bantuan). */
export function PillButton({
  children,
  onClick,
  href,
  className,
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  const classes = cn(
    "type-label relative inline-flex h-9 shrink-0 items-center rounded-chip border border-line-200 bg-white px-4 text-ink-900 no-underline transition-[background-color,transform] duration-150 ease-(--motion-ease-standard) before:absolute before:-inset-1 before:content-[''] hover:bg-stone-50 active:scale-[0.97]",
    className,
  );
  if (href)
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  return (
    <button type="button" onClick={onClick} className={classes} {...rest}>
      {children}
    </button>
  );
}

/** Circle back button (36px, chevron) with a 44px touch area. Named apart
 * from the bottom bar's "Kembali", which sits on the same screens. */
export function CircleBackButton({
  onClick,
  label = "Halaman sebelumnya",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative grid size-9 shrink-0 place-items-center rounded-chip border border-line-200 bg-white text-ink-900 transition-[background-color,transform] duration-150 ease-(--motion-ease-standard) before:absolute before:-inset-1 before:content-[''] hover:bg-stone-50 active:scale-[0.94]"
    >
      <IconChevronLeft size={18} stroke={1.75} aria-hidden="true" />
    </button>
  );
}

/**
 * "Bantuan": one calm sheet with the support address and the FAQ, so asking
 * for help never throws away the screen the person is on.
 */
export function HelpButton({ orderNumber }: { orderNumber?: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PillButton onClick={() => setOpen(true)} aria-haspopup="dialog">
        Bantuan
      </PillButton>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Butuh bantuan?"
        footer={
          <div className="grid gap-3">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="type-title inline-flex h-14 items-center justify-center rounded-button bg-ink-900 px-6 text-white no-underline transition-[background-color,transform] duration-150 hover:bg-ink-800 active:scale-[0.97]"
            >
              Kirim email ke {SUPPORT_EMAIL}
            </a>
            <Link
              href="/faq"
              className="type-title-sm inline-flex h-12 items-center justify-center text-ink-900 underline decoration-1 underline-offset-4"
            >
              Lihat pertanyaan umum
            </Link>
          </div>
        }
      >
        <p className="type-copy m-0 text-ink-600">
          Tim Nuave membalas lewat email. Isian Anda tetap tersimpan di halaman
          ini.
          {orderNumber ? (
            <>
              {" "}
              Sebutkan nomor pesanan{" "}
              <span className="font-semibold text-ink-900">{orderNumber}</span>.
            </>
          ) : null}
        </p>
      </BottomSheet>
    </>
  );
}

/**
 * The top bar variants from the v2 kit: the wizard bar (Simpan & keluar ·
 * Bantuan) inside Steps 2–3, the back bar (‹ · Bantuan) in Step 1, the title
 * bar on checkout, and the brand bar once the audit runs.
 */
export function TopBar(
  props:
    | { kind: "wizard"; onSaveExit: () => void; orderNumber?: string | null }
    | { kind: "back"; onBack?: () => void; orderNumber?: string | null }
    | { kind: "title"; title: string; onBack?: () => void }
    | { kind: "brand"; orderNumber?: string | null; action?: ReactNode },
) {
  return (
    <div className="flex h-14 items-center justify-between gap-3">
      {props.kind === "wizard" ? (
        <>
          <PillButton onClick={props.onSaveExit}>
            Simpan &amp; keluar
          </PillButton>
          <HelpButton orderNumber={props.orderNumber} />
        </>
      ) : props.kind === "back" ? (
        <>
          {props.onBack ? (
            <CircleBackButton onClick={props.onBack} />
          ) : (
            <span className="size-9" aria-hidden="true" />
          )}
          <HelpButton orderNumber={props.orderNumber} />
        </>
      ) : props.kind === "title" ? (
        <>
          {props.onBack ? (
            <CircleBackButton onClick={props.onBack} />
          ) : (
            <span className="size-9" aria-hidden="true" />
          )}
          <p className="type-title-sm m-0 truncate text-ink-900">
            {props.title}
          </p>
          <span className="size-9" aria-hidden="true" />
        </>
      ) : (
        <>
          <Link href="/" aria-label="Nuave, ke beranda" className="flex">
            <NuaveLogo className="h-[25px] w-auto" />
          </Link>
          {props.action ?? <HelpButton orderNumber={props.orderNumber} />}
        </>
      )}
    </div>
  );
}

/**
 * The journey's page frame: a 480px phone column with room for the fixed
 * bottom bar. `ember` is the paid moment (J09), `cream` the report-ready
 * moment (J30).
 */
export function JourneyPage({
  tone = "plain",
  hasBottomBar,
  children,
}: {
  tone?: "plain" | "ember" | "cream";
  hasBottomBar: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        // A screen sliding in from the side never widens the page, even for
        // the moment of the transition.
        "relative min-h-svh w-full overflow-x-clip",
        tone === "ember" && "bg-(image:--surface-ember)",
        tone === "cream" && "bg-cream",
      )}
      data-journey-tone={tone}
    >
      <div
        className={cn(
          "mx-auto flex min-h-svh w-full max-w-[480px] flex-col px-6",
          hasBottomBar
            ? "pb-[calc(128px+env(safe-area-inset-bottom,0px))]"
            : "pb-[calc(40px+env(safe-area-inset-bottom,0px))]",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Three-segment step progress (Airbnb's bottom bar): fills animate. */
export function StepProgress({
  fills,
  label,
}: {
  /** One fill in [0, 1] per step. */
  fills: readonly [number, number, number];
  label: string;
}) {
  const animate = useMotionAllowed();
  return (
    <div
      role="img"
      aria-label={label}
      data-step-progress={fills.map((fill) => fill.toFixed(2)).join(",")}
      className="grid h-1 grid-cols-3 gap-1"
    >
      {fills.map((fill, index) => {
        const width = `${Math.round(Math.min(1, Math.max(0, fill)) * 1000) / 10}%`;
        return (
          <div key={index} className="relative h-1 overflow-hidden bg-line-200">
            {animate ? (
              <motion.div
                className="absolute inset-y-0 left-0 bg-ink-900"
                initial={false}
                animate={{ width }}
                transition={SPRING_SETTLE}
              />
            ) : (
              <div
                className="absolute inset-y-0 left-0 bg-ink-900"
                style={{ width }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

type BarAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  /** Ember only for the commit moments: Bayar, Jalankan / Mulai audit.
   * `outline` is the quiet way out once nothing is left to do (J29). */
  tone?: "ink" | "commit" | "outline";
  ariaDescribedBy?: string;
};

/** The CSS variable a floating keyboard bar uses to sit above this bar. */
export const BOTTOM_BAR_HEIGHT_VAR = "--journey-bottom-bar";

/**
 * The fixed bottom bar: step progress on its top edge, `Kembali` on the left
 * and the one forward action on the right — or a single full-width action.
 * It stays put while screens change underneath it.
 */
export function BottomBar({
  progress,
  back,
  action,
  layout = "split",
  note,
}: {
  progress?: { fills: readonly [number, number, number]; label: string };
  back?: { onClick: () => void; label?: string } | null;
  action?: BarAction | null;
  layout?: "split" | "full";
  /** Small print under a full-width action (e.g. the consent line). */
  note?: ReactNode;
}) {
  // Its height, for a keyboard bar floating with no on-screen keyboard (a
  // tablet keyboard case): that bar then sits just above this one.
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = bar.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() =>
      root.style.setProperty(
        BOTTOM_BAR_HEIGHT_VAR,
        `${Math.ceil(element.getBoundingClientRect().height)}px`,
      ),
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty(BOTTOM_BAR_HEIGHT_VAR);
    };
  }, []);
  return (
    <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
      {/* Content scrolling under the bar fades out instead of being cut. */}
      <div
        className="mx-auto h-6 w-full max-w-[480px] bg-linear-to-b from-white/0 to-white"
        aria-hidden="true"
      />
      <div
        ref={bar}
        className="pointer-events-auto mx-auto w-full max-w-[480px] bg-white"
      >
        {progress ? (
          <StepProgress fills={progress.fills} label={progress.label} />
        ) : (
          <div className="h-px bg-line-200" />
        )}
        <div
          className={cn(
            "flex items-center gap-3 px-6 pt-3.5 pb-[calc(14px+env(safe-area-inset-bottom,0px))]",
            layout === "full" ? "flex-col" : "justify-between",
          )}
        >
          {layout === "split" ? (
            back ? (
              // The Figma ghost button: 4px sides, so the word lines up with
              // the content edge and leaves room for the action.
              <Button
                variant="inkLink"
                size="touch"
                className="px-1"
                onClick={back.onClick}
              >
                {back.label ?? "Kembali"}
              </Button>
            ) : (
              <span />
            )
          ) : null}
          {action ? (
            <Button
              variant={
                action.tone === "commit"
                  ? "commit"
                  : action.tone === "outline"
                    ? "inkOutline"
                    : "ink"
              }
              size={layout === "full" ? "xl" : "touch"}
              // On a very narrow phone a long label wraps instead of being
              // cut off at the screen edge.
              className={
                layout === "full"
                  ? "w-full"
                  : "h-auto min-h-12 min-w-0 shrink py-2 text-center whitespace-normal max-sm:min-h-12"
              }
              disabled={action.disabled || action.busy}
              aria-busy={action.busy || undefined}
              aria-describedby={action.ariaDescribedBy}
              onClick={action.onClick}
            >
              {action.busy ? (
                <IconLoader2
                  className="animate-spin"
                  aria-hidden="true"
                  stroke={2}
                />
              ) : null}
              {action.label}
            </Button>
          ) : null}
          {note ? (
            <div className="type-caption w-full text-center text-ink-500">
              {note}
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
