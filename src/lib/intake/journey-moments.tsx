"use client";

import { type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconCircleCheck } from "@tabler/icons-react";
import {
  EASE_STANDARD,
  SPRING_POP,
  SPRING_SETTLE,
} from "@/components/motion/presets";
import { useMotionAllowed } from "@/components/motion/useMotionAllowed";
import { Art, type ArtName } from "@/components/product/journey/Art";

/* ───────────────────── J09 · paid, Nuave reads the website ───────────────────── */

export type ReadingFindings = {
  products: string[];
  places: string[];
};

/**
 * J09, the one full-orange moment: payment is confirmed, the website is being
 * read under the magnifier, and what Nuave finds drops in as chips before the
 * journey moves on by itself. Body text sits on white for contrast.
 */
export function PaidReadingScreen({
  headingRef,
  orderNumber,
  findings,
  error,
  action,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  orderNumber?: string | null;
  /** Null while the reading runs; the found products and places after. */
  findings: ReadingFindings | null;
  error?: string | null;
  /** A way forward when the reading could not finish here. */
  action?: ReactNode;
}) {
  const animate = useMotionAllowed();
  const reading = !findings && !error;
  const nothingFound =
    findings && !findings.products.length && !findings.places.length;
  return (
    <section
      className="relative grid justify-items-center pt-3 text-center"
      data-intake-screen="reading"
      data-reading-phase={reading ? "reading" : error ? "stopped" : "found"}
      aria-label="Pembacaan website"
    >
      <motion.p
        className="type-label m-0 flex items-center gap-2 rounded-chip bg-white py-2 pr-4 pl-3 text-ink-900 shadow-[0_6px_16px_rgb(122_41_16/0.12)]"
        initial={animate ? { opacity: 0, y: -14, scale: 0.94 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...SPRING_POP, delay: 0.1 }}
      >
        <IconCircleCheck size={18} stroke={1.75} aria-hidden="true" />
        Pembayaran diterima
        {orderNumber ? <span aria-hidden="true">·</span> : null}
        {orderNumber ? <span>{orderNumber}</span> : null}
      </motion.p>
      <div className="relative mt-3 h-[260px] w-[330px]" aria-hidden="true">
        <motion.div
          className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.28),rgb(255_255_255/0))]"
          animate={
            animate && reading
              ? { scale: [0.94, 1.04, 0.94], opacity: [0.8, 1, 0.8] }
              : { scale: 1, opacity: 1 }
          }
          transition={
            animate && reading
              ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.3 }
          }
        />
        <div className="absolute top-[73px] left-[44px]">
          <Art name="website" width={220} priority enter />
        </div>
        <motion.div
          className="absolute top-[30px] left-[202px]"
          animate={
            animate && reading
              ? {
                  x: [0, -110, -60, 0],
                  y: [0, 40, 84, 0],
                  rotate: [0, -6, 4, 0],
                }
              : { x: 0, y: 0, rotate: 0 }
          }
          transition={
            animate && reading
              ? { duration: 5.5, repeat: Infinity, ease: "easeInOut" }
              : SPRING_SETTLE
          }
        >
          <Art name="magnifier" width={104} priority />
        </motion.div>
      </div>
      <motion.h1
        ref={headingRef}
        tabIndex={-1}
        className="type-heading-lg m-0 mt-5 max-w-[330px] text-white outline-none"
        initial={animate ? { opacity: 0, y: 12 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_SETTLE, delay: 0.2 }}
      >
        {error
          ? "Pembacaan website berhenti"
          : findings
            ? "Website Anda sudah terbaca"
            : "Nuave sedang membaca website Anda"}
      </motion.h1>
      <motion.div
        className="mt-8 grid w-full gap-3.5 rounded-[28px] bg-white px-[22px] pt-[22px] pb-5 text-left shadow-[0_12px_32px_rgb(122_41_16/0.16)]"
        initial={animate ? { opacity: 0, y: 40 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_SETTLE, delay: 0.3 }}
        role="status"
        aria-live="polite"
      >
        <p className="type-title-sm m-0 flex items-center gap-2 text-ink-900">
          {error ? "Belum selesai" : "Yang sudah kami temukan"}
          {reading ? (
            <motion.span
              className="size-2 rounded-full bg-ember-500"
              animate={animate ? { opacity: [1, 0.25, 1] } : undefined}
              transition={{ duration: 1.4, repeat: Infinity }}
              aria-hidden="true"
            />
          ) : null}
        </p>
        {error ? (
          <>
            <p role="alert" className="type-copy-sm m-0 text-ink-700">
              {error}
            </p>
            {action}
          </>
        ) : findings ? (
          nothingFound ? (
            <p className="type-copy-sm m-0 text-ink-600">
              Website Anda belum menyebut produk atau cabang dengan jelas. Anda
              bisa mengisinya di langkah berikutnya.
            </p>
          ) : (
            <>
              {findings.products.length ? (
                <FoundGroup label="Produk" items={findings.products} />
              ) : null}
              {findings.places.length ? (
                <FoundGroup
                  label="Cabang"
                  items={findings.places}
                  delay={findings.products.length * 0.08}
                />
              ) : null}
            </>
          )
        ) : (
          <SkeletonChips />
        )}
        {!error ? (
          <div className="flex items-center gap-1.5">
            <span className="type-label-sm shrink-0 rounded-chip bg-stone-100 px-2.5 py-1 text-ink-700">
              Ditemukan di website
            </span>
            <span className="type-caption min-w-0 text-ink-500">
              {findings
                ? "Lanjut sendiri sebentar lagi."
                : "Lanjut sendiri, biasanya 20 sampai 40 detik."}
            </span>
          </div>
        ) : null}
      </motion.div>
    </section>
  );
}

function FoundGroup({
  label,
  items,
  delay = 0,
}: {
  label: string;
  items: string[];
  delay?: number;
}) {
  const animate = useMotionAllowed();
  return (
    <div className="grid gap-2">
      <p className="type-label-sm m-0 text-ink-500">{label}</p>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {items.slice(0, 6).map((item, index) => (
          <motion.li
            key={item}
            className="type-copy-sm inline-flex h-9 items-center rounded-chip border border-line-300 px-[18px] text-ink-900"
            initial={animate ? { opacity: 0, y: -12, scale: 0.88 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...SPRING_POP, delay: delay + index * 0.08 }}
          >
            {item}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

/** Quiet placeholders while the reading runs (genuine work, so it shimmers). */
function SkeletonChips() {
  const animate = useMotionAllowed();
  return (
    <div className="grid gap-2" aria-hidden="true">
      <span className="h-3 w-14 rounded bg-stone-100" />
      <div className="flex flex-wrap gap-2">
        {[88, 56, 96].map((width, index) => (
          <motion.span
            key={width}
            className="h-9 rounded-chip bg-stone-100"
            style={{ width }}
            animate={animate ? { opacity: [0.5, 1, 0.5] } : undefined}
            transition={{ duration: 1.6, repeat: Infinity, delay: index * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── J10 / J24 · chapter covers ─────────────────────────── */

/**
 * Airbnb's step cover: the same kedai, a little more finished each chapter.
 * The previous stage of the shop dissolves into the new one (its awning and
 * chairs arrive in Step 2, the AI chat bubbles in Step 3) before the words
 * settle in. Reduced motion shows the finished shop and the words in place.
 */
export function ChapterCover({
  headingRef,
  step,
  title,
  body,
  art,
  from,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  step: 2 | 3;
  title: string;
  body: string;
  art: ArtName;
  /** The shop as the person last saw it. */
  from: ArtName;
}) {
  const animate = useMotionAllowed();
  return (
    <section
      className="grid"
      data-intake-screen={step === 2 ? "intro-business" : "intro-review"}
    >
      <div
        className="relative -mx-6 mt-5 grid h-[270px] place-items-center"
        aria-hidden="true"
      >
        <AnimatePresence initial>
          {animate ? (
            <motion.div
              key="from"
              className="absolute inset-0 grid place-items-center"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.25, ease: EASE_STANDARD }}
            >
              <Art
                name={from}
                width={360}
                className="h-full max-h-[270px] w-full max-w-[360px]"
                priority
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
        <motion.div
          className="absolute inset-0 grid place-items-center"
          initial={animate ? { opacity: 0, scale: 1.05, y: -6 } : false}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            opacity: { duration: 0.45, delay: 0.25, ease: EASE_STANDARD },
            scale: { ...SPRING_SETTLE, delay: 0.25 },
            y: { ...SPRING_SETTLE, delay: 0.25 },
          }}
        >
          <Art
            name={art}
            width={360}
            className="h-full max-h-[270px] w-full max-w-[360px]"
            priority
          />
        </motion.div>
      </div>
      <motion.div
        className="mt-9 grid gap-2.5"
        initial={animate ? { opacity: 0, y: 14 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_SETTLE, delay: 0.45 }}
      >
        <p className="type-label-lg m-0 text-ink-700">Langkah {step}</p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="type-heading-lg m-0 text-ink-900 outline-none"
        >
          {title}
        </h1>
        <p className="type-copy-lg m-0 text-ink-600">{body}</p>
      </motion.div>
    </section>
  );
}
