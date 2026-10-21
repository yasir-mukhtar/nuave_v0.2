"use client";

import { useRef, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { cn } from "@/lib/utils";
import { KeyboardAccessoryInline } from "@/components/product/journey/KeyboardAccessory";
import { DURATION_BASE, EASE_EXIT, SPRING_SHEET } from "./presets";
import { useMotionAllowed } from "./useMotionAllowed";

/**
 * The v2 sheet (J05b, J12b, J26, J27b, J28): rises from the bottom over a dim
 * page, with a grab handle the person can drag down to dismiss. Base UI's
 * dialog owns focus trapping, Escape, the accessible name and focus return;
 * Motion only moves it. A drag past a third of the sheet (or a quick flick)
 * closes it; anything less springs back.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  titleHidden = false,
  description,
  header,
  children,
  footer,
  className,
  initialFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name; shown as the sheet title unless `titleHidden`. */
  title: string;
  titleHidden?: boolean;
  description?: string;
  /** Replaces the default centred title row (e.g. Batal · title · Simpan). */
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  initialFocus?: React.RefObject<HTMLElement | null>;
}) {
  const animate = useMotionAllowed();
  const drag = useDragControls();
  const popup = useRef<HTMLDivElement>(null);
  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal keepMounted>
            <Dialog.Backdrop
              render={
                <motion.div
                  initial={animate ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: DURATION_BASE } }}
                />
              }
              className="fixed inset-0 z-50 bg-ink-900/40"
            />
            <Dialog.Popup
              ref={popup}
              initialFocus={initialFocus}
              render={
                <motion.div
                  initial={animate ? { y: "100%" } : false}
                  animate={{ y: 0, transition: SPRING_SHEET }}
                  exit={{
                    y: "100%",
                    transition: { duration: 0.2, ease: EASE_EXIT },
                  }}
                  drag={animate ? "y" : false}
                  dragListener={false}
                  dragControls={drag}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0.05, bottom: 0.9 }}
                  onDragEnd={(_, info) => {
                    const height = popup.current?.offsetHeight ?? 400;
                    if (info.offset.y > height / 3 || info.velocity.y > 600)
                      onOpenChange(false);
                  }}
                />
              }
              className={cn(
                "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92svh] w-full max-w-[480px] flex-col rounded-t-sheet bg-white shadow-float outline-none",
                className,
              )}
            >
              <div
                className="flex shrink-0 cursor-grab touch-none justify-center pt-2.5 pb-1 active:cursor-grabbing"
                onPointerDown={(event) => drag.start(event)}
                aria-hidden="true"
              >
                <span className="h-1 w-9 rounded-full bg-line-300" />
              </div>
              {header ?? (
                <div className="px-6 pt-2 pb-1">
                  <Dialog.Title
                    className={cn(
                      "type-heading-sm m-0 text-ink-900",
                      titleHidden && "sr-only",
                    )}
                  >
                    {title}
                  </Dialog.Title>
                </div>
              )}
              {header ? (
                <Dialog.Title className="sr-only">{title}</Dialog.Title>
              ) : null}
              {description ? (
                <Dialog.Description className="sr-only">
                  {description}
                </Dialog.Description>
              ) : null}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-4">
                <KeyboardAccessoryInline.Provider value={true}>
                  {children}
                </KeyboardAccessoryInline.Provider>
              </div>
              {footer ? (
                <div className="shrink-0 px-6 pt-2 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
                  {footer}
                </div>
              ) : (
                <div className="h-[env(safe-area-inset-bottom,0px)] shrink-0" />
              )}
            </Dialog.Popup>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}

/** The sheet header from the design: Batal · title · Simpan. */
export function SheetActionsHeader({
  title,
  onCancel,
  onSave,
  saveLabel = "Simpan",
  saveDisabled = false,
}: {
  title: string;
  onCancel: () => void;
  onSave?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-6 pt-1 pb-3">
      <button
        type="button"
        onClick={onCancel}
        className="type-copy min-h-11 justify-self-start text-ink-600 transition-colors hover:text-ink-900"
      >
        Batal
      </button>
      <p className="type-title-sm m-0 text-ink-900" aria-hidden="true">
        {title}
      </p>
      {onSave ? (
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          className="type-title-sm min-h-11 justify-self-end text-ink-900 underline decoration-1 underline-offset-4 transition-colors disabled:text-ink-400 disabled:no-underline"
        >
          {saveLabel}
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}
