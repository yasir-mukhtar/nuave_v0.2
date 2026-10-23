"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  IconArrowRight,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandX,
  IconChartBar,
  IconInfoCircle,
  IconListCheck,
  IconQuote,
  IconSparkles,
  IconUsers,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/motion/BottomSheet";
import { SPRING_SETTLE } from "@/components/motion/presets";
import { ChipRadioGroup, RadioChip } from "@/components/product/selection/Chip";
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
      title: "Cek klinik Anda",
      body: "Masukkan website klinik. Kami tunjukkan klinik yang kami temukan. Gratis.",
      art: "website",
      artWidth: 71,
    },
    {
      title: "Ceritakan klinik Anda",
      body: "Setelah bayar Rp99.000, cek layanan dan info klinik yang sudah kami isi.",
      art: "form",
      artWidth: 48,
    },
    {
      title: "Jalankan audit",
      body: "Setujui 10 pertanyaan calon pasien. Laporan dikirim ke email Anda.",
      art: "magnifierCheck",
      artWidth: 86,
    },
  ];

const RECEIVES = [
  {
    Icon: IconChartBar,
    text: "Di berapa dari 10 pertanyaan klinik Anda disebut dan direkomendasikan",
  },
  { Icon: IconQuote, text: "Jawaban AI apa adanya, dengan sumbernya" },
  { Icon: IconUsers, text: "Klinik lain yang disebut AI" },
  {
    Icon: IconInfoCircle,
    text: "Info klinik yang keliru atau kurang di jawaban AI",
  },
  {
    Icon: IconListCheck,
    text: "Saran perbaikan untuk tim Anda, sesuai temuan",
  },
];

/**
 * One patient question and a short AI answer per kind of clinic. Every name
 * holds "Fiksi", "Rekaan" or "Contoh", so none can match a real clinic.
 */
const PATIENT_EXAMPLES: {
  id: string;
  label: string;
  question: string;
  clinics: [name: string, area: string][];
}[] = [
  {
    id: "gigi",
    label: "Gigi",
    question:
      "Klinik gigi di Bekasi yang bagus buat pasang behel, biayanya kira-kira berapa?",
    clinics: [
      ["Klinik Gigi Rekaan", "Bekasi Barat"],
      ["Senyum Fiksi Dental", "Summarecon"],
      ["Klinik Contoh Sehat", "Galaxy"],
    ],
  },
  {
    id: "kecantikan",
    label: "Kecantikan",
    question:
      "Mau laser flek hitam pertama kali di Surabaya, klinik mana yang dokternya berpengalaman?",
    clinics: [
      ["Klinik Kulit Rekaan", "Darmo"],
      ["Estetika Fiksi", "Pakuwon"],
      ["Klinik Contoh Ayu", "Rungkut"],
    ],
  },
  {
    id: "khitan",
    label: "Khitan",
    question: "Sunat anak di Depok metode klamp, ada yang bisa home service?",
    clinics: [
      ["Rumah Khitan Rekaan", "Margonda"],
      ["Klinik Sunat Fiksi", "Cinere"],
      ["Khitan Contoh", "Sawangan"],
    ],
  },
  {
    id: "anak",
    label: "Anak",
    question: "Klinik anak di Bintaro buat vaksin, jadwal dokternya kapan aja?",
    clinics: [
      ["Klinik Anak Rekaan", "Bintaro"],
      ["Klinik Fiksi Ceria", "Pondok Aren"],
      ["Klinik Contoh Bunda", "Pesanggrahan"],
    ],
  },
  {
    id: "umum",
    label: "Umum",
    question: "Klinik dekat Kemang yang bisa pakai BPJS dan buka sampai malam?",
    clinics: [
      ["Klinik Pratama Rekaan", "Kemang"],
      ["Klinik Fiksi 24 Jam", "Mampang"],
      ["Klinik Contoh Medika", "Cipete"],
    ],
  },
];

/** One patient question as a chat bubble, and the AI's short list. */
function PatientExchange({
  example,
}: {
  example: (typeof PATIENT_EXAMPLES)[number];
}) {
  return (
    <>
      <div className="flex justify-end">
        <p className="type-copy m-0 max-w-[290px] rounded-[22px] rounded-br-md bg-ink-900 px-[18px] py-3.5 text-white">
          {example.question}
        </p>
      </div>
      <div className="flex justify-start">
        <div className="grid max-w-[310px] gap-2 rounded-[22px] rounded-bl-md bg-white px-[18px] py-3.5 shadow-card">
          <p className="type-label-sm-strong m-0 flex items-center gap-1.5 text-ember-700">
            <IconSparkles size={14} stroke={2} aria-hidden="true" />
            Jawaban AI
          </p>
          <p className="type-copy-sm m-0 text-ink-700">
            Berikut beberapa klinik yang bisa dipertimbangkan:
          </p>
          <ol className="m-0 grid list-none gap-1.5 p-0">
            {example.clinics.map(([name, area], index) => (
              <li key={name} className="type-copy-sm text-ink-900">
                <strong>
                  {index + 1}. {name}
                </strong>{" "}
                <span className="text-ink-600">· {area}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  );
}

/** The cream band: pick a kind of clinic, see what a patient asks and the
 * short list AI answers with. Nothing is fetched; the examples are fixed. */
function PatientQuestionExample() {
  const animate = useMotionAllowed();
  const [kind, setKind] = useState(PATIENT_EXAMPLES[0].id);
  const example =
    PATIENT_EXAMPLES.find((item) => item.id === kind) ?? PATIENT_EXAMPLES[0];
  return (
    <div className="grid w-full gap-5">
      {/* Centred like the heading above, also when the chips wrap. */}
      <div className="[&>[role=radiogroup]]:justify-center">
        <ChipRadioGroup
          label="Jenis klinik"
          value={kind}
          onValueChange={setKind}
        >
          {PATIENT_EXAMPLES.map((item) => (
            <RadioChip
              key={item.id}
              value={item.id}
              label={item.label}
              checked={item.id === kind}
            />
          ))}
        </ChipRadioGroup>
      </div>
      <div aria-live="polite" className="text-left" data-patient-example={kind}>
        {/* With reduced motion the example simply swaps, as JourneyScene
            does. */}
        {animate ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={example.id}
              className="grid gap-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={SPRING_SETTLE}
            >
              <PatientExchange example={example} />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="grid gap-3">
            <PatientExchange example={example} />
          </div>
        )}
      </div>
    </div>
  );
}

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
          Contoh. Nama klinik fiktif. Hasil klinik Anda bisa berbeda.
        </p>
        <div className="flex items-center gap-3">
          <div className="grid flex-1 gap-1">
            <p className="type-label-sm-strong m-0 text-ember-700">
              AI Visibility Report
            </p>
            <p className="type-heading-md m-0 text-ink-900">Klinik Fiksi</p>
            <p className="type-copy-sm m-0 text-ink-600">
              Seluruh klinik · Bandung
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
            Klinik Anda muncul di 3 dari 10 pertanyaan
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
            Cariin klinik gigi di Dago yang buka sore, setelah jam kantor.
          </p>
          <p className="type-copy-sm m-0 text-ink-700">
            “…Ada juga{" "}
            <mark className="bg-transparent font-semibold text-ember-700 underline">
              Klinik Fiksi
            </mark>{" "}
            di Jalan Dago, tetapi informasi jadwal dokter dan biaya perawatannya
            belum banyak ditemukan.…”
          </p>
        </div>
        <div className="grid gap-2.5 rounded-card bg-stone-50 p-4">
          <p className="type-label-sm-strong m-0 text-ember-700">
            Bisnis lain yang disebut
          </p>
          <ul className="m-0 grid list-none gap-2.5 p-0">
            <li className="type-copy-sm text-ink-900">
              <strong>Klinik Gigi Rekaan</strong>{" "}
              <span className="text-ink-600">
                · Bisnis lain diunggulkan · Pertanyaan 2, 5, 7
              </span>
            </li>
            <li className="type-copy-sm text-ink-900">
              <strong>Senyum Fiksi Dental</strong>{" "}
              <span className="text-ink-600">
                · Disebut dalam jawaban · Pertanyaan 2
              </span>
            </li>
          </ul>
        </div>
        <div className="grid gap-2 rounded-[24px] border border-line-200 bg-white px-5 pt-4 pb-4 shadow-card">
          <span className="type-label-sm-strong inline-flex w-fit rounded-full bg-ember-50 px-2.5 py-1 text-ember-700">
            Kerjakan dulu
          </span>
          <p className="type-title-sm m-0 text-ink-900">
            Tampilkan jadwal praktik dokter di halaman layanan.
          </p>
          <p className="type-caption m-0 text-ink-500">
            Berdasarkan Pertanyaan 2
          </p>
        </div>
        <p className="type-caption m-0 text-ink-500">
          Laporan lengkap memuat 10 jawaban AI apa adanya, dengan sumbernya.
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
                Begini calon pasien bertanya ke AI
              </h2>
            </Reveal>
            <Reveal delay={0.08} className="w-full">
              <PatientQuestionExample />
            </Reveal>
            <div className="grid gap-1">
              <p className="type-title-sm m-0 text-ink-900">
                Klinik Anda ada di jawaban ini?
              </p>
              <p className="type-copy-sm m-0 text-ink-600">
                Dashboard iklan dan statistik website Anda tidak menunjukkannya.
              </p>
            </div>
            <p className="type-caption m-0 text-ink-600">
              Contoh. Nama klinik fiktif.
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
              Cek klinik saya di AI
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
