"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  IconCircleCheck,
  IconCircleDashed,
  IconCheck,
  IconLoader2,
  IconWorld,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  BottomSheet,
  SheetActionsHeader,
} from "@/components/motion/BottomSheet";
import {
  EASE_STANDARD,
  SPRING_POP,
  SPRING_SETTLE,
} from "@/components/motion/presets";
import { useMotionAllowed } from "@/components/motion/useMotionAllowed";
import { Art } from "@/components/product/journey/Art";
import { FloatingField } from "@/components/product/journey/FloatingField";
import { AUDIT_SOURCES_TEXT } from "@/lib/orders/promise";
import { cn } from "@/lib/utils";

/** Headline + supporting line, the same rhythm on every journey screen. */
export function ScreenHeader({
  headingRef,
  title,
  lead,
  live = false,
  className,
}: {
  headingRef?: RefObject<HTMLHeadingElement | null>;
  title: ReactNode;
  lead?: ReactNode;
  /** Announce a change of words while the screen stays (the long wait). */
  live?: boolean;
  className?: string;
}) {
  return (
    <header
      className={cn("grid gap-2.5", className)}
      aria-live={live ? "polite" : undefined}
    >
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="type-heading-lg m-0 text-ink-900 outline-none"
      >
        {title}
      </h1>
      {lead ? <p className="type-copy m-0 text-ink-600">{lead}</p> : null}
    </header>
  );
}

export function initialsOf(name: string): string {
  const letters = name
    .trim()
    .replace(/^@/, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase());
  return letters.join("") || "?";
}

/** "klinik-fiksi.example" from a canonical URL, for display only. */
export function displayHost(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    return parsed.hostname.endsWith("instagram.com")
      ? `instagram.com${parsed.pathname.replace(/\/$/, "")}`
      : host;
  } catch {
    return url;
  }
}

/**
 * A best guess at the business name from its web address (J04), the same
 * rule the synthetic identity uses: the first host label, words capitalised.
 */
export function nameFromAddress(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith("instagram.com")) {
      const handle = parsed.pathname.replace(/^\/|\/$/g, "");
      return handle ? `@${handle}` : "";
    }
    return parsed.hostname
      .replace(/^www\./, "")
      .split(".")[0]!
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  } catch {
    return "";
  }
}

/* ───────────────────────── J01 · the website form ───────────────────────── */

/**
 * The hero form (J01): the website is the only thing typed. The business
 * name is read from the site on the next step, so nothing is typed twice.
 */
export function WebsiteForm({
  value,
  onChange,
  onSubmit,
  busy = false,
  error,
  inputRef,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy?: boolean;
  error?: string | null;
  inputRef?: RefObject<HTMLInputElement | null>;
  autoFocus?: boolean;
}) {
  return (
    <form
      className="grid gap-3"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="flex h-[60px] items-center gap-3 rounded-chip border border-line-200 bg-white px-5 shadow-float transition-[box-shadow,border-color] duration-150 ease-(--motion-ease-standard) focus-within:border-ink-900 focus-within:shadow-[var(--edge-ink),var(--elevation-float)] has-[[aria-invalid=true]]:border-error-edge has-[[aria-invalid=true]]:shadow-[var(--edge-error),var(--elevation-float)]">
        <IconWorld
          size={22}
          stroke={1.75}
          className="shrink-0 text-ink-900"
          aria-hidden="true"
        />
        <span className="sr-only">Website atau akun Instagram bisnis</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type="text"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          maxLength={2_000}
          autoFocus={autoFocus}
          placeholder="Website atau akun Instagram"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "website-error" : "website-note"}
          className="type-copy min-w-0 flex-1 border-0 bg-transparent p-0 text-ink-900 outline-none placeholder:text-ink-500"
        />
      </label>
      {error ? (
        <p
          id="website-error"
          role="alert"
          className="type-copy-sm m-0 px-2 text-error"
        >
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="commit"
        size="xl"
        className="w-full"
        disabled={busy}
        aria-busy={busy || undefined}
      >
        {busy ? (
          <IconLoader2 className="animate-spin" aria-hidden="true" />
        ) : null}
        Cek bisnis saya di AI
      </Button>
      <p
        id="website-note"
        className="type-copy-sm m-0 text-center text-ink-500"
      >
        Pratinjau gratis. Audit Rp249.000, sekali bayar.
      </p>
    </form>
  );
}

/** The landing hero's headline, shared by `/` and the `/audit` entry. */
export function HeroHeadline({
  headingRef,
  as: Tag = "h1",
}: {
  headingRef?: RefObject<HTMLHeadingElement | null>;
  as?: "h1" | "h2";
}) {
  return (
    <div className="grid gap-3.5 text-center">
      <Tag
        ref={headingRef}
        tabIndex={-1}
        className="type-display m-0 text-ink-900 outline-none"
      >
        Bisnis Anda <span className="block text-ember-500">disebut AI?</span>
      </Tag>
      <p className="type-copy m-0 text-ink-600">
        Sekarang pelanggan tanya AI dulu. Nuave bertanya seperti mereka, lalu
        menunjukkan bisnis mana yang disebut.
      </p>
    </div>
  );
}

/** `/audit` with no website yet: the landing hero, ready to type. */
export function EntryScreen({
  headingRef,
  source,
  onSourceChange,
  onSubmit,
  busy,
  error,
  notice,
  footnote,
  inputRef,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  source: string;
  onSourceChange: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  error?: string | null;
  notice?: string | null;
  footnote?: ReactNode;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  return (
    <section
      className="grid grid-cols-[minmax(0,1fr)] gap-6"
      data-intake-screen="entry"
    >
      {/* min-w-0: on a 320px phone the art is trimmed at its sides instead
          of widening the page (R-27). */}
      <div className="-mx-6 flex min-w-0 justify-center overflow-hidden">
        <Art name="kedaiBusy" width={340} priority enter />
      </div>
      <HeroHeadline headingRef={headingRef} />
      {notice ? (
        <p
          role="status"
          className="type-copy-sm m-0 rounded-tile bg-stone-50 px-4 py-3 text-ink-600"
        >
          {notice}
        </p>
      ) : null}
      <WebsiteForm
        value={source}
        onChange={onSourceChange}
        onSubmit={onSubmit}
        busy={busy}
        error={error}
        inputRef={inputRef}
      />
      {footnote}
    </section>
  );
}

/* ──────────────── J02–J04 · the business check and its long wait ──────────────── */

export type CheckPhase = "first" | "long" | "wayout";

export const LONG_WAIT_MS = 10_000;
export const WAY_OUT_MS = 30_000;
/** "Tunggu sebentar lagi" hides the way out for this long. */
export const WAIT_MORE_MS = 20_000;

/** Which J02–J04 state the free check shows after `elapsed` ms. */
export function checkPhaseFor(
  elapsed: number,
  wayOutFrom: number,
  finished: boolean,
): CheckPhase {
  if (elapsed >= wayOutFrom && !finished) return "wayout";
  return elapsed >= LONG_WAIT_MS ? "long" : "first";
}

const CHECK_STEPS = [
  "Membuka website",
  "Membaca nama dan logo",
  "Membaca deskripsi bisnis",
] as const;

function StepIcon({ state }: { state: "done" | "active" | "pending" }) {
  const animate = useMotionAllowed();
  const icon =
    state === "done" ? (
      <IconCircleCheck size={22} stroke={1.75} className="text-ink-900" />
    ) : state === "active" ? (
      <IconLoader2
        size={22}
        stroke={1.75}
        className="animate-spin text-ember-500"
      />
    ) : (
      <IconCircleDashed size={22} stroke={1.75} className="text-ink-400" />
    );
  if (!animate) return <span aria-hidden="true">{icon}</span>;
  return (
    <span
      className="relative grid size-[22px] place-items-center"
      aria-hidden="true"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={state}
          className="grid place-items-center"
          initial={animate ? { scale: 0.5, opacity: 0 } : { opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={animate ? { scale: 0.5, opacity: 0 } : { opacity: 0 }}
          transition={state === "done" ? SPRING_POP : { duration: 0.15 }}
        >
          {icon}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** The three-line checklist that ticks off while the website is read. */
export function CheckList({
  steps,
  states,
}: {
  steps: readonly string[];
  states: ("done" | "active" | "pending")[];
}) {
  return (
    <ul className="m-0 grid list-none gap-4 p-0" aria-label="Kemajuan">
      {steps.map((step, index) => {
        const state = states[index] ?? "pending";
        return (
          <li
            key={step}
            data-reading-step={state}
            className="flex items-center gap-3"
          >
            <StepIcon state={state} />
            <span
              className={cn(
                "type-copy transition-colors duration-200",
                state === "active" && "font-semibold text-ink-900",
                state === "done" && "text-ink-900",
                state === "pending" && "text-ink-500",
              )}
            >
              {step}
              <span className="sr-only">
                {state === "done"
                  ? ", selesai"
                  : state === "active"
                    ? ", sedang berjalan"
                    : ", menunggu"}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The bare kedai being read under a slowly sweeping magnifier (J02). */
function ScanArt() {
  const animate = useMotionAllowed();
  return (
    <div
      className="relative h-[250px] w-full overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute top-[46px] left-8">
        <Art name="kedaiBare" width={260} priority />
      </div>
      {animate ? (
        <motion.div
          className="absolute top-0.5 left-[200px]"
          animate={{ x: [0, -120, -40, 0], y: [0, 34, 70, 0] }}
          transition={{
            duration: 6,
            ease: "easeInOut",
            repeat: Infinity,
            times: [0, 0.35, 0.7, 1],
          }}
        >
          <Art name="magnifier" width={112} priority />
        </motion.div>
      ) : (
        <div className="absolute top-0.5 left-[200px]">
          <Art name="magnifier" width={112} priority />
        </div>
      )}
    </div>
  );
}

/** A customer's question to AI, typed in once like a chat (J03). */
function CustomerBubble({ text }: { text: string }) {
  const animate = useMotionAllowed();
  const [typed, setTyped] = useState(!animate);
  useEffect(() => {
    if (!animate) return;
    const timer = window.setTimeout(() => setTyped(true), 1100);
    return () => window.clearTimeout(timer);
  }, [animate]);
  return (
    <div className="flex justify-end">
      <motion.div
        layout={animate}
        initial={animate ? { opacity: 0, y: 10, scale: 0.96 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SPRING_SETTLE}
        className="max-w-[290px] rounded-[22px] rounded-br-md bg-ink-900 px-[18px] py-3.5 text-white"
      >
        {typed ? (
          <motion.p
            className="type-copy m-0"
            initial={animate ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, ease: EASE_STANDARD }}
          >
            {text}
          </motion.p>
        ) : (
          <span className="flex h-6 items-center gap-1" aria-label="Mengetik">
            {[0, 1, 2].map((dot) => (
              <motion.span
                key={dot}
                className="size-1.5 rounded-full bg-white/70"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  delay: dot * 0.15,
                }}
              />
            ))}
          </span>
        )}
      </motion.div>
    </div>
  );
}

/**
 * J02–J04: the free business check. The wait is never blank: the steps tick
 * off in order; after 10 seconds the title admits it is slower and teaches
 * the product with one customer question; after 30 seconds the person can
 * continue with the name guessed from the web address, wait a bit longer,
 * or try another site.
 */
export function BusinessCheckScreen({
  headingRef,
  phase,
  elapsed,
  finished,
  onWaitLonger,
  onTryAnother,
  onContinueWithName,
  wayOutName,
  onWayOutNameChange,
  wayOutError,
  footnote,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  phase: CheckPhase;
  /** Time since the check started, in ms. */
  elapsed: number;
  /** The check answered: every step shows done for a moment. */
  finished: boolean;
  onWaitLonger: () => void;
  onTryAnother: () => void;
  onContinueWithName: () => void;
  wayOutName: string;
  onWayOutNameChange: (value: string) => void;
  wayOutError?: string | null;
  /** The synthetic-mode label (Spec 013 R-07). */
  footnote?: ReactNode;
}) {
  const animate = useMotionAllowed();
  const states: ("done" | "active" | "pending")[] = finished
    ? ["done", "done", "done"]
    : elapsed < 1_200
      ? ["active", "pending", "pending"]
      : elapsed < 4_000
        ? ["done", "active", "pending"]
        : ["done", "done", "active"];
  const fieldRef = useRef<HTMLInputElement>(null);
  const lastPhase = useRef(phase);
  useEffect(() => {
    if (lastPhase.current !== phase && phase === "wayout")
      fieldRef.current?.focus({ preventScroll: true });
    lastPhase.current = phase;
  }, [phase]);
  return (
    <section
      className="grid"
      data-intake-screen="reading"
      data-check-phase={phase}
      aria-label="Pemeriksaan bisnis"
    >
      {phase === "wayout" ? (
        <motion.div
          className="grid"
          initial={animate ? { opacity: 0, y: 8 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING_SETTLE}
        >
          <ScreenHeader
            headingRef={headingRef}
            live
            title="Website Anda butuh waktu lebih lama"
            lead="Anda bisa lanjut sekarang dengan nama bisnis Anda. Website Anda kami baca lengkap setelah pembayaran."
          />
          <div className="mt-6">
            <FloatingField
              ref={fieldRef}
              label="Nama bisnis"
              value={wayOutName}
              maxLength={160}
              autoComplete="organization"
              onChange={(event) => onWayOutNameChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && wayOutName.trim()) {
                  event.preventDefault();
                  onContinueWithName();
                }
              }}
              error={wayOutError}
              hint="Kami tebak dari alamat website. Ubah jika perlu."
            />
          </div>
          <Button
            variant="inkOutline"
            size="xl"
            className="mt-6 w-full"
            onClick={onWaitLonger}
          >
            Tunggu sebentar lagi
          </Button>
          <Button
            variant="inkLink"
            size="touch"
            className="mx-auto mt-2"
            onClick={onTryAnother}
          >
            Coba website lain
          </Button>
        </motion.div>
      ) : (
        <>
          <ScreenHeader
            headingRef={headingRef}
            live
            title={
              phase === "long"
                ? "Masih membaca. Website Anda cukup lengkap."
                : "Sebentar, kami cari bisnis Anda"
            }
            lead={
              phase === "long"
                ? "Terima kasih sudah menunggu. Hampir selesai."
                : "Biasanya kurang dari 10 detik."
            }
          />
          {phase === "first" ? (
            <div className="mt-3">
              <ScanArt />
            </div>
          ) : null}
          <div className={phase === "first" ? "mt-[18px]" : "mt-6"}>
            <CheckList steps={CHECK_STEPS} states={states} />
          </div>
          {phase === "long" ? (
            <motion.div
              className="mt-8 grid gap-3"
              initial={animate ? { opacity: 0, y: 12 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING_SETTLE, delay: 0.15 }}
            >
              <p className="type-label m-0 text-ink-500">
                Sambil menunggu: begini pelanggan bertanya ke AI
              </p>
              <CustomerBubble text="Klinik gigi dekat kantor di Dago yang buka sore apa ya?" />
              <p className="type-copy-sm m-0 text-ink-600">
                Laporan Anda menunjukkan apakah bisnis Anda ikut disebut, dan
                siapa saja yang disebut.
              </p>
            </motion.div>
          ) : null}
        </>
      )}
      {footnote ? <div className="mt-8">{footnote}</div> : null}
    </section>
  );
}

/* ───────────────────────── J05 · business found (+ J05b) ───────────────────────── */

/** The logo tile: the site's own icon when it has one, else initials. */
export function BusinessMark({
  name,
  iconDataUrl,
  size = "lg",
  verified = false,
}: {
  name: string;
  iconDataUrl?: string | null;
  size?: "lg" | "sm";
  /** The ember tick: "the website was read". */
  verified?: boolean;
}) {
  const animate = useMotionAllowed();
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center bg-ember-50 text-ember-700",
        size === "lg" ? "size-20 rounded-3xl" : "size-14 rounded-2xl",
      )}
      aria-hidden="true"
    >
      {iconDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- a data URL from the website check
        <img
          src={iconDataUrl}
          alt=""
          className={cn(
            "object-contain",
            size === "lg" ? "size-12 rounded-xl" : "size-9 rounded-lg",
          )}
        />
      ) : (
        <span className={size === "lg" ? "type-heading-lg" : "type-heading-sm"}>
          {initialsOf(name)}
        </span>
      )}
      {verified ? (
        <motion.span
          className="absolute -right-1.5 -bottom-1.5 grid size-7 place-items-center rounded-full border-[3px] border-white bg-ember-500 text-white"
          initial={animate ? { scale: 0, rotate: -30 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...SPRING_POP, delay: 0.35 }}
        >
          <IconCheck size={14} stroke={3} />
        </motion.span>
      ) : null}
    </span>
  );
}

/**
 * J05: one raised card, like Airbnb's profile preview: logo, name, source
 * and the site's own summary. The tick says the website was read. Nothing
 * is paid yet, so the forward button is black.
 */
export function BusinessFoundScreen({
  headingRef,
  name,
  source,
  description,
  iconDataUrl,
  onRename,
  onChangeWebsite,
  notice,
  error,
  guessed = false,
  nameUnsure = false,
  askName = 0,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  name: string;
  source: string;
  description?: string | null;
  iconDataUrl?: string | null;
  /** The free check did not finish (J04): the name is the owner's, and
   * nothing was read from the website yet, so nothing claims it was. */
  guessed?: boolean;
  /** The website's name labels were unclear: the owner checks the name. */
  nameUnsure?: boolean;
  /** Opens the name sheet each time it goes up. */
  askName?: number;
  /** Save a corrected name (J05b). Returns false when it was refused. */
  onRename: (name: string) => boolean;
  /** Absent once the website is locked by a payment (R-19). */
  onChangeWebsite?: () => void;
  notice?: ReactNode;
  error?: string | null;
}) {
  const animate = useMotionAllowed();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const fieldRef = useRef<HTMLInputElement>(null);
  const save = () => {
    const next = draft.trim();
    if (!next) return;
    if (onRename(next)) setEditing(false);
  };
  // A new request opens the sheet with the current name.
  const [seenAsk, setSeenAsk] = useState(askName);
  if (askName !== seenAsk) {
    setSeenAsk(askName);
    setDraft(name);
    setEditing(true);
  }
  return (
    <section className="grid gap-3" data-intake-screen="brand">
      <ScreenHeader
        headingRef={headingRef}
        title={
          guessed ? "Bisnis yang akan diaudit" : "Kami menemukan bisnis Anda"
        }
        lead={
          guessed
            ? "Nama ini dari Anda. Website Anda belum terbaca; kami membacanya lengkap setelah pembayaran."
            : nameUnsure
              ? "Website Anda tidak menyebut namanya dengan jelas. Pastikan nama bisnis di bawah benar sebelum lanjut."
              : "Ini yang kami baca dari website Anda. Hasil audit belum ada di sini."
        }
      />
      {notice}
      <motion.article
        aria-label="Bisnis yang ditemukan"
        className="mt-2 flex flex-col items-center rounded-3xl bg-white px-6 pt-7 pb-[26px] text-center shadow-float"
        initial={animate ? { opacity: 0, y: 18, scale: 0.97 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...SPRING_SETTLE, delay: 0.05 }}
      >
        <BusinessMark
          name={name}
          iconDataUrl={iconDataUrl}
          verified={!guessed && !nameUnsure}
        />
        <h2 className="type-heading-md m-0 mt-4 break-words text-ink-900">
          {name}
        </h2>
        <p className="type-copy-sm m-0 mt-1.5 flex max-w-full items-center gap-1.5 text-ink-500">
          <IconWorld
            size={15}
            stroke={1.75}
            aria-hidden="true"
            className="shrink-0"
          />
          <span className="truncate">{displayHost(source)}</span>
        </p>
        <Button
          variant="inkLink"
          className="mt-2 h-auto min-h-9"
          aria-haspopup="dialog"
          onClick={() => {
            setDraft(name);
            setEditing(true);
          }}
        >
          Ubah nama
        </Button>
        {description ? (
          <>
            <div className="mt-4 h-px w-full bg-line-200" />
            <p className="type-copy m-0 mt-[18px] text-ink-700">
              {description}
            </p>
          </>
        ) : null}
      </motion.article>
      {onChangeWebsite ? (
        <p className="type-copy-sm m-0 mt-1.5 flex flex-wrap items-center justify-center gap-x-1.5 text-ink-600">
          Bukan bisnis Anda?
          <button
            type="button"
            onClick={onChangeWebsite}
            className="type-label-strong min-h-11 text-ink-900 underline decoration-1 underline-offset-4 sm:min-h-0"
          >
            Ganti tautan bisnis
          </button>
        </p>
      ) : null}
      {/* While the sheet is open the page behind it is hidden from assistive
          technology, so a refused name is announced inside the sheet. */}
      {error && !editing ? (
        <p role="alert" className="type-copy-sm m-0 text-error">
          {error}
        </p>
      ) : null}
      <BottomSheet
        open={editing}
        onOpenChange={setEditing}
        title={nameUnsure ? "Pastikan nama bisnis" : "Nama bisnis"}
        initialFocus={fieldRef}
        header={
          <SheetActionsHeader
            title={nameUnsure ? "Pastikan nama bisnis" : "Nama bisnis"}
            onCancel={() => setEditing(false)}
            onSave={save}
            saveDisabled={!draft.trim()}
          />
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <FloatingField
            ref={fieldRef}
            label="Nama bisnis"
            value={draft}
            maxLength={160}
            autoComplete="organization"
            enterKeyHint="done"
            onChange={(event) => setDraft(event.target.value)}
            hint="Pakai nama yang dikenal pelanggan."
            error={editing ? error : null}
          />
        </form>
      </BottomSheet>
    </section>
  );
}

/* ───────────────────────── J06 · three steps ───────────────────────── */

const THREE_STEPS = [
  {
    title: "Konfirmasi dan bayar",
    body: "Cek bisnis Anda, lalu bayar Rp249.000 sekali. Tanpa langganan.",
    art: "website" as const,
    artWidth: 71,
  },
  {
    title: "Ceritakan bisnis Anda",
    body: "Sebagian besar sudah kami isi dari website. Anda cukup cek dan ketuk.",
    art: "form" as const,
    artWidth: 48,
  },
  {
    title: "Periksa 10 pertanyaan",
    body: "Lalu jalankan audit. Laporan dikirim ke email Anda.",
    art: "magnifierCheck" as const,
    artWidth: 86,
  },
];

/**
 * J06, Airbnb's "It's easy to get started": three rows, the same kedai
 * getting more finished. The price question is answered before checkout.
 */
export function StepsScreen({
  headingRef,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const animate = useMotionAllowed();
  return (
    <section className="grid" data-intake-screen="steps">
      <ScreenHeader headingRef={headingRef} title="Tinggal 3 langkah" />
      <ol className="m-0 mt-3 grid list-none p-0">
        {THREE_STEPS.map((step, index) => (
          <motion.li
            key={step.title}
            className={cn(
              "flex items-start gap-3.5 py-[22px]",
              index < THREE_STEPS.length - 1 && "border-b border-line-200",
            )}
            initial={animate ? { opacity: 0, y: 14 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING_SETTLE, delay: 0.06 + index * 0.07 }}
          >
            <span className="type-title text-ink-900" aria-hidden="true">
              {index + 1}
            </span>
            <div className="grid min-w-0 flex-1 gap-1">
              <h2 className="type-title m-0 text-ink-900">
                <span className="sr-only">Langkah {index + 1}: </span>
                {step.title}
              </h2>
              <p className="type-copy-sm m-0 text-ink-600">{step.body}</p>
            </div>
            {/* The size Figma shows inside the 92 x 64 slot (its images
                carry clear space around the object; ours are trimmed). */}
            <span className="mt-0.5 flex h-16 w-[92px] shrink-0 items-center justify-center">
              <Art name={step.art} width={step.artWidth} />
            </span>
          </motion.li>
        ))}
      </ol>
      <motion.div
        className="rounded-tile bg-stone-50 px-[18px] py-4"
        initial={animate ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_SETTLE, delay: 0.3 }}
      >
        <p className="type-title-sm m-0 text-ink-900">
          Rp249.000 untuk satu audit
        </p>
        <p className="type-copy-sm m-0 mt-0.5 text-ink-600">
          Diperiksa di {AUDIT_SOURCES_TEXT}. Tidak ada pajak atau biaya tambahan
          dari Nuave.
        </p>
      </motion.div>
    </section>
  );
}
