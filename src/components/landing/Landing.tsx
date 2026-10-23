"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  IconArrowRight,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandX,
  IconChartBar,
  IconListCheck,
  IconQuote,
  IconUsers,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/motion/BottomSheet";
import { SPRING_SETTLE } from "@/components/motion/presets";
import {
  motionAllowedNow,
  useMotionAllowed,
} from "@/components/motion/useMotionAllowed";
import { Art, type ArtName } from "@/components/product/journey/Art";
import { PillButton } from "@/components/product/journey/JourneyBars";
import { NuaveLogo } from "@/components/product/journey/NuaveLogo";
import { AUDIT_SOURCE_HANDOFF_STORAGE_KEY } from "@/lib/audit/source-handoff";
import { parseSourceInput } from "@/lib/audit/source-input";
import { readActiveOrder, readSmartSession } from "@/lib/intake/smart-session";
import { HeroHeadline, WebsiteForm } from "@/lib/intake/step-one-screens";

/** Rises into place the first time it scrolls into view. */
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const animate = useMotionAllowed();
  return (
    <motion.div
      className={className}
      initial={animate ? { opacity: 0, y: 18 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ ...SPRING_SETTLE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Progress saved in this browser: offered back before anything else. */
function ResumeBanner() {
  const [resume, setResume] = useState<string | null>(null);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        if (readActiveOrder()) {
          setResume("Audit Anda sedang berjalan");
          return;
        }
        const saved = readSmartSession();
        // A paid order always resumes, even one a reload stopped mid-reading.
        if (
          saved &&
          (saved.order ||
            (saved.stage !== "entry" && saved.stage !== "reading"))
        ) {
          const name = saved.brand?.name ?? saved.entry.name.trim();
          setResume(name ? `Lanjutkan audit ${name}` : "Lanjutkan audit Anda");
        }
      } catch {
        // Storage blocked: nothing to resume.
      }
    });
  }, []);
  if (!resume) return null;
  return (
    <Link
      href="/audit"
      className="type-label-lg mt-2 flex min-h-12 items-center justify-between gap-3 rounded-tile bg-stone-50 px-4 text-ink-900 no-underline transition-colors hover:bg-stone-100"
    >
      <span className="min-w-0 truncate">{resume}</span>
      <IconArrowRight
        size={18}
        stroke={1.75}
        aria-hidden="true"
        className="shrink-0"
      />
    </Link>
  );
}

/** Each step's miniature at the size Figma shows it inside its 92 x 64 slot
 * (the Figma images carry clear space around the object; ours are trimmed). */
const STEPS: { title: string; body: string; art: ArtName; artWidth: number }[] =
  [
    {
      title: "Cek bisnis Anda",
      body: "Masukkan website. Kami tampilkan bisnis yang kami temukan. Gratis.",
      art: "website",
      artWidth: 71,
    },
    {
      title: "Ceritakan bisnis Anda",
      body: "Setelah bayar Rp99.000, periksa informasi yang sudah kami isi.",
      art: "form",
      artWidth: 48,
    },
    {
      title: "Jalankan audit",
      body: "Periksa 10 pertanyaan. Laporan dikirim ke email Anda.",
      art: "magnifierCheck",
      artWidth: 80,
    },
  ];

const RECEIVES = [
  { Icon: IconChartBar, text: "Skor kemunculan, misalnya 4 dari 10" },
  { Icon: IconQuote, text: "Jawaban AI apa adanya, dengan sumbernya" },
  { Icon: IconUsers, text: "Bisnis lain yang disebut" },
  { Icon: IconListCheck, text: "Saran perbaikan sesuai temuan" },
];

/** The fictional example's ten questions: where the business was named. */
const EXAMPLE_MENTIONED = [2, 7, 9];
const EXAMPLE_RECOMMENDED = [9];

function Beads({ on, tone }: { on: number[]; tone: "ember" | "ink" }) {
  return (
    <ol className="m-0 flex list-none gap-[7px] p-0" aria-hidden="true">
      {Array.from({ length: 10 }, (_, index) => {
        const hit = on.includes(index + 1);
        return (
          <li key={index} className="grid justify-items-center gap-[5px]">
            <span
              className={
                hit
                  ? tone === "ember"
                    ? "size-[22px] rounded-full bg-(image:--bead-ember)"
                    : "size-[22px] rounded-full bg-(image:--bead-ink)"
                  : "size-[22px] rounded-full border border-line-300 bg-stone-50"
              }
            />
            <span className="type-mono-sm text-ink-500">{index + 1}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** "Contoh laporan": the report's first screen with a fictional business. */
function ExampleReportSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Contoh laporan">
      <div className="grid gap-4 pt-1 pb-2">
        <p className="type-copy-sm m-0 text-ink-600">
          Contoh tampilan. Nama bisnis fiktif. Hasil untuk bisnis Anda bisa
          berbeda.
        </p>
        <div className="flex items-center gap-3">
          <div className="grid flex-1 gap-1">
            <p className="type-label-sm-strong m-0 text-ember-700">
              AI Visibility Report
            </p>
            <p className="type-heading-md m-0 text-ink-900">Kedai Fiksi</p>
            <p className="type-copy-sm m-0 text-ink-600">
              Seluruh brand · Bandung
            </p>
          </div>
          <Art name="kedaiBusy" width={96} />
        </div>
        <div className="grid gap-3 rounded-[24px] border border-line-200 bg-white px-5 pt-5 pb-4 shadow-card">
          <p className="m-0 flex items-baseline gap-2">
            <span className="type-number text-ink-900">3</span>
            <span className="type-copy-lg text-ink-500">dari 10</span>
          </p>
          <p className="type-title-sm m-0 text-ink-900">
            Bisnis Anda muncul di 3 dari 10 pertanyaan
          </p>
          <Beads on={EXAMPLE_MENTIONED} tone="ember" />
          <div className="h-px bg-line-200" />
          <p className="type-title-sm m-0 text-ink-900">
            Direkomendasikan di 1 dari 10 pertanyaan
          </p>
          <Beads on={EXAMPLE_RECOMMENDED} tone="ink" />
        </div>
        <div className="grid gap-2 rounded-card bg-stone-50 p-4">
          <p className="type-label-sm-strong m-0 text-ember-700">
            Pertanyaan 2
          </p>
          <p className="type-title-sm m-0 text-ink-900">
            Cariin kedai kopi dekat kantor di Dago yang enak buat kerja.
          </p>
          <p className="type-copy-sm m-0 text-ink-700">
            “…Ada juga{" "}
            <mark className="bg-transparent font-semibold text-ember-700 underline">
              Kedai Fiksi
            </mark>{" "}
            di Jalan Dago, tetapi informasi jam buka dan fasilitas kerjanya
            belum banyak ditemukan.…”
          </p>
        </div>
        <p className="type-caption m-0 text-ink-500">
          Laporan lengkap juga memuat semua jawaban AI apa adanya, sumber yang
          tersimpan, bisnis lain yang disebut, dan saran perbaikan.
        </p>
      </div>
    </BottomSheet>
  );
}

const FOOTER_LINKS = [
  { href: "/faq", label: "FAQ" },
  { href: "/terms", label: "Syarat Penggunaan" },
  { href: "/privacy", label: "Kebijakan Privasi" },
  { href: "/support", label: "Kontak" },
];

const SOCIAL = [
  {
    Icon: IconBrandInstagram,
    href: "https://instagram.com/nuave.ai",
    label: "Instagram",
  },
  {
    Icon: IconBrandLinkedin,
    href: "https://linkedin.com/company/nuave",
    label: "LinkedIn",
  },
  { Icon: IconBrandX, href: "https://x.com/nuaveAI", label: "X" },
];

/**
 * J01: the landing page. The website field is the hero; the business name is
 * read from the site on the next step, so nothing is typed twice. Below the
 * fold: how customers ask, three steps, and what the report holds.
 */
export default function Landing() {
  const router = useRouter();
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLDivElement>(null);

  const start = () => {
    const parsed = parseSourceInput(source);
    if (!parsed) {
      setError("Masukkan satu website atau akun Instagram yang valid.");
      input.current?.focus();
      return;
    }
    setError(null);
    setLeaving(true);
    try {
      // `/audit` reads this once and starts the free check right away.
      window.sessionStorage.setItem(
        AUDIT_SOURCE_HANDOFF_STORAGE_KEY,
        parsed.normalizedUrl,
      );
    } catch {
      // Storage blocked: `/audit` asks for the website again.
    }
    router.push("/audit");
  };

  /** The last button returns to the one field, rather than a second form. */
  const toForm = () => {
    form.current?.scrollIntoView({
      behavior: motionAllowedNow() ? "smooth" : "auto",
      block: "center",
    });
    input.current?.focus({ preventScroll: true });
  };

  return (
    <div className="min-h-svh bg-white" lang="id">
      <div className="mx-auto w-full max-w-[480px]">
        <header className="flex h-14 items-center justify-between px-6">
          <Link href="/" aria-label="Nuave, ke beranda" className="flex">
            <NuaveLogo className="h-[25px] w-auto" />
          </Link>
          <PillButton
            onClick={() => setExampleOpen(true)}
            aria-haspopup="dialog"
          >
            Contoh laporan
          </PillButton>
        </header>

        <main>
          <section className="grid grid-cols-[minmax(0,1fr)] px-6">
            <ResumeBanner />
            {/* min-w-0: on a 320px phone the art is trimmed at its sides
                instead of widening the page. */}
            <div className="-mx-6 flex h-[290px] min-w-0 justify-center overflow-hidden">
              <Art
                name="kedaiBusy"
                width={390}
                priority
                enter
                className="h-full w-full max-w-[390px]"
              />
            </div>
            <div className="pt-2">
              <HeroHeadline />
            </div>
            <div ref={form} className="pt-6">
              <WebsiteForm
                value={source}
                onChange={(value) => {
                  setSource(value);
                  if (error) setError(null);
                }}
                onSubmit={start}
                busy={leaving}
                error={error}
                inputRef={input}
              />
            </div>
          </section>

          <section
            className="mt-10 grid justify-items-center gap-4 bg-cream px-6 pt-10 pb-9 text-center"
            aria-labelledby="ask-title"
          >
            <Reveal>
              <h2 id="ask-title" className="type-heading-md m-0 text-ink-900">
                Pelanggan tidak lagi cek website satu per satu. Mereka tanya ke
                AI.
              </h2>
            </Reveal>
            <Reveal delay={0.08}>
              <Art name="phoneChat" width={130} />
            </Reveal>
            <p className="type-caption m-0 text-ink-600">
              Contoh tampilan. Nama bisnis fiktif.
            </p>
          </section>

          <section className="px-6 pt-10 pb-2" aria-labelledby="how-title">
            <h2 id="how-title" className="type-heading-md m-0 text-ink-900">
              Cara kerjanya
            </h2>
            <ol className="m-0 mt-1 list-none p-0">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="border-line-200 not-last:border-b"
                >
                  <Reveal
                    className="flex items-center gap-3.5 py-5"
                    delay={index * 0.06}
                  >
                    <span
                      className="type-title text-ink-900"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <span className="grid min-w-0 flex-1 gap-1">
                      <h3 className="type-title-sm m-0 text-ink-900">
                        <span className="sr-only">Langkah {index + 1}: </span>
                        {step.title}
                      </h3>
                      <span className="type-copy-sm text-ink-600">
                        {step.body}
                      </span>
                    </span>
                    <span className="flex h-16 w-[92px] shrink-0 items-center justify-center">
                      <Art name={step.art} width={step.artWidth} />
                    </span>
                  </Reveal>
                </li>
              ))}
            </ol>
          </section>

          <section
            className="grid gap-[18px] px-6 pt-8 pb-10"
            aria-labelledby="get-title"
          >
            <h2 id="get-title" className="type-heading-md m-0 text-ink-900">
              Yang Anda terima
            </h2>
            <ul className="m-0 grid list-none gap-[18px] p-0">
              {RECEIVES.map(({ Icon, text }, index) => (
                <li key={text}>
                  <Reveal
                    className="flex items-center gap-3.5"
                    delay={index * 0.05}
                  >
                    <Icon
                      size={24}
                      stroke={1.75}
                      className="shrink-0 text-ink-900"
                      aria-hidden="true"
                    />
                    <span className="type-copy text-ink-900">{text}</span>
                  </Reveal>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setExampleOpen(true)}
              aria-haspopup="dialog"
              className="type-label-strong justify-self-start text-ink-900 underline underline-offset-4"
            >
              Lihat contoh laporan
            </button>
          </section>

          <section className="grid gap-4 px-6 pt-2 pb-7 text-center">
            <Button
              variant="commit"
              size="xl"
              className="w-full"
              onClick={toForm}
            >
              Cek bisnis saya di AI
            </Button>
            <p className="type-caption m-0 text-ink-500">
              Ini bukan peringkat atau jaminan. Jawaban AI bisa berubah dari
              waktu ke waktu.
            </p>
          </section>
        </main>

        <footer className="grid gap-5 border-t border-line-200 px-6 pt-8 pb-[calc(32px+env(safe-area-inset-bottom,0px))]">
          <nav aria-label="Tautan situs">
            <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="type-copy-sm text-ink-600 no-underline hover:text-ink-900"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center justify-between gap-3">
            <p className="type-caption m-0 text-ink-500">
              © {new Date().getFullYear()} Nuave
            </p>
            <div className="flex gap-2">
              {SOCIAL.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid size-11 place-items-center rounded-full text-ink-600 transition-colors hover:bg-stone-100 hover:text-ink-900"
                >
                  <Icon size={20} stroke={1.75} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </footer>
      </div>
      <ExampleReportSheet open={exampleOpen} onOpenChange={setExampleOpen} />
    </div>
  );
}
