"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconChevronDown,
  IconCheck,
  IconShieldLock,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import Footer from "@/components/Footer";
import HowItWorks from "@/components/HowItWorks";
import LandingNav from "@/components/LandingNav";
import ExampleReportPreview from "@/components/ExampleReportPreview";

/* ───── Hero Intake (one-question / one-input) ───── */
function HeroSection() {
  const t = useTranslations();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const trimmed = value.trim();
  const isInstagram =
    trimmed.includes("instagram.com") || trimmed.startsWith("@");
  const detectionLabel = isInstagram
    ? t("landing.intakeChipInstagram")
    : t("landing.intakeChipWebsite");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (!v || v.length < 3) {
      setError(t("landing.intakeInvalidHint"));
      return;
    }
    // Very light validation: require dot or instagram pattern
    if (!v.includes(".") && !v.startsWith("@")) {
      setError(t("landing.intakeInvalidHint"));
      return;
    }
    setError(null);
    setIsScanning(true);
    // Scan-line motif then handoff to /audit
    const q = encodeURIComponent(v);
    setTimeout(() => {
      router.push(`/audit?source=${q}`);
    }, 450);
  };

  const handleExampleClick = (example: string) => {
    setValue(example);
    setError(null);
  };

  return (
    <section className="lp-root lp-hero-section relative w-full pt-[120px] px-[30px] flex justify-center overflow-hidden">
      <div className="max-w-[720px] w-full flex flex-col items-center text-center">
        {/* Headline — stagger 1 */}
        <h1 className="lp-hero-heading lp-entrance lp-entrance-1 max-w-[640px] m-0">
          {t("landing.heroHeading")}
        </h1>

        {/* Subline — stagger 2 */}
        <p className="lp-hero-subtitle lp-entrance lp-entrance-2 max-w-[560px] text-[18px] font-normal leading-[1.7em] tracking-[-0.5px] text-[var(--lp-text-secondary)] text-center m-0 mt-4">
          {t("landing.heroSubtitle")}
        </p>

        {/* Intake card — stagger 3 */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lp-entrance lp-entrance-3 w-full mt-8 rounded-[16px] border border-[#E5E7EB] bg-white p-4 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] text-left relative overflow-hidden"
        >
          {/* scan-line motif */}
          {isScanning && (
            <div
              className="lp-scan-line absolute left-0 right-0 h-px bg-[var(--lp-purple)] pointer-events-none"
              aria-hidden="true"
            />
          )}
          <label
            htmlFor="landing-intake"
            className="block text-[13px] font-medium text-[#6B7280] mb-2"
          >
            {t("landing.intakeChipWebsite")} /{" "}
            {t("landing.intakeChipInstagram")}
          </label>
          <div className="relative flex items-center">
            <input
              id="landing-intake"
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t("landing.intakePlaceholder")}
              autoComplete="off"
              spellCheck={false}
              className="h-[52px] w-full rounded-[10px] border border-[#E5E7EB] bg-white pl-4 pr-[140px] text-[15px] text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:border-[var(--lp-purple)] focus:ring-2 focus:ring-[rgba(83,58,253,0.15)] transition-colors"
              aria-label={t("landing.intakePlaceholder")}
              aria-invalid={!!error}
              aria-describedby={
                error ? "landing-intake-error" : "landing-intake-hint"
              }
            />
            {/* detection chip inside field */}
            <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center rounded-full bg-[#F3F4F6] border border-[#E5E7EB] px-3 py-1 text-[12px] font-medium text-[#374151]">
              {detectionLabel}
            </span>
          </div>

          {/* example chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {[t("landing.intakeExample1"), t("landing.intakeExample2")].map(
              (ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => handleExampleClick(ex)}
                  className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5 text-[13px] text-[#374151] hover:bg-white hover:border-[#D1D5DB] transition-colors cursor-pointer"
                >
                  {ex}
                </button>
              ),
            )}
          </div>

          {/* reassurance + error */}
          <p
            id="landing-intake-hint"
            className="mt-3 text-[13px] leading-[1.5] text-[#6B7280] m-0"
          >
            {t("landing.intakeReassurance")}
          </p>
          {error && (
            <p
              id="landing-intake-error"
              role="alert"
              className="mt-2 text-[13px] text-[#DC2626] m-0"
            >
              {error}
            </p>
          )}

          {/* primary CTA */}
          <button
            type="submit"
            disabled={isScanning}
            className="btn-lp-purple mt-4 inline-flex w-full items-center justify-center px-[22px] py-3 text-white text-[14px] font-medium leading-[1.7em] rounded-[10px] border border-[var(--lp-border)] no-underline cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {t("cta.auditBrandFree")}
          </button>
        </form>

        {/* secondary link to example */}
        <Link
          href="#contoh-laporan"
          className="lp-entrance lp-entrance-3 mt-4 text-[14px] font-medium text-[var(--lp-text-secondary)] underline underline-offset-4 hover:text-[var(--lp-text-primary)] transition-colors"
        >
          {t("cta.seeExampleReport")}
        </Link>
      </div>
    </section>
  );
}

/* ───── What you receive (Isi Laporan) ───── */

function IsilaporanSection() {
  const t = useTranslations();
  const ITEMS = Array.from({ length: 7 }, (_, i) => ({
    title: t(`report.item${i + 1}Title`),
    body: t(`report.item${i + 1}Body`),
  }));
  return (
    <section
      id="isi-laporan"
      className="lp-report-section bg-white px-8 py-[120px] border-t border-[#E5E7EB]"
    >
      <div className="max-w-[1044px] mx-auto">
        <h2 className="lp-report-heading text-center m-0 mb-6">
          {t("report.heading")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-14">
          {ITEMS.map((item, i) => (
            <div
              key={item.title}
              className={cn(
                "flex items-start gap-3.5 rounded-[12px] border border-[#E5E7EB] bg-white p-5",
                i === 6 && "md:col-span-2",
              )}
            >
              <div className="w-6 h-6 rounded-full bg-[#ECE8FF] flex items-center justify-center shrink-0 mt-0.5">
                <IconCheck size={14} stroke={2.5} color="var(--lp-purple)" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-[16px] font-semibold tracking-[-0.3px] leading-[1.5em] text-[var(--lp-text-primary)] m-0">
                  {item.title}
                </p>
                <p className="text-[14px] font-normal leading-[1.6em] text-[#6B7280] m-0">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Example report */}
        <div
          id="contoh-laporan"
          className="mt-16 flex flex-col items-center gap-5"
        >
          <Link
            href="/audit"
            className="btn-lp-purple inline-flex items-center px-[22px] py-3 text-white text-[14px] font-medium leading-[1.7em] rounded-[6px] border border-[var(--lp-border)] no-underline cursor-pointer"
          >
            {t("report.cta")}
          </Link>
          <ExampleReportPreview />
          <p className="text-[13px] text-[#9CA3AF] m-0">
            {t("report.exampleFootnote")}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ───── Boundaries (Batasan) ───── */

function BatasanSection() {
  const t = useTranslations();
  const ITEMS = [
    { title: t("batasan.item1Title"), body: t("batasan.item1Body") },
    { title: t("batasan.item2Title"), body: t("batasan.item2Body") },
    { title: t("batasan.item3Title"), body: t("batasan.item3Body") },
  ];
  return (
    <section
      id="batasan"
      className="lp-batasan-section bg-white px-8 py-[120px] border-t border-[#E5E7EB]"
    >
      <div className="max-w-[1044px] mx-auto">
        <h2 className="lp-batasan-heading text-center m-0 mb-14">
          {t("batasan.heading")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ITEMS.map((item) => (
            <div
              key={item.title}
              className="rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] p-8 flex flex-col gap-3"
            >
              <p className="text-[20px] font-semibold tracking-[-0.5px] leading-[1.4em] text-[#111827] m-0">
                {item.title}
              </p>
              <p className="text-[15px] font-normal leading-[1.7em] text-[#6B7280] m-0">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───── Data policy (Kebijakan Data) ───── */

function KebijakanDataSection() {
  const t = useTranslations();
  return (
    <section
      id="kebijakan-data"
      className="lp-data-section bg-white px-8 pb-[120px] border-t border-[#E5E7EB]"
    >
      <div className="max-w-[1044px] mx-auto pt-[80px]">
        <div className="rounded-[16px] bg-[#0d1738] px-8 py-14 flex flex-col items-center text-center gap-5">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <IconShieldLock size={22} color="#fff" stroke={1.6} />
          </div>
          <h3 className="text-[22px] font-semibold tracking-[-0.5px] leading-[1.4em] text-white m-0">
            {t("dataPolicy.heading")}
          </h3>
          <p className="text-[15px] font-normal leading-[1.8em] text-white/80 m-0 max-w-[640px]">
            {t("dataPolicy.statement")}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ───── FAQ Section ───── */

function FAQSection() {
  const t = useTranslations();
  const FAQS = Array.from({ length: 10 }, (_, i) => ({
    q: t(`faqs.q${i + 1}`),
    a: t(`faqs.a${i + 1}`),
  }));
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  return (
    <section
      id="faq"
      className="lp-faq-section bg-[#F9FAFB] px-8 pt-[72px] pb-20 border-t border-[#E5E7EB]"
    >
      <div className="max-w-[740px] mx-auto">
        <h2 className="lp-faq-heading text-center mb-12">
          {t("landing.faqHeading")}
        </h2>
        <div className="flex flex-col gap-4">
          {FAQS.map((faq, i) => (
            <div
              key={faq.q}
              className="bg-white border border-[#E5E7EB] rounded-[12px] overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex items-center justify-between gap-4 w-full p-6 bg-transparent border-none cursor-pointer text-left"
              >
                <span className="text-[18px] font-semibold tracking-[-0.5px] leading-[1.7em] text-[#111827]">
                  {faq.q}
                </span>
                <IconChevronDown
                  size={20}
                  stroke={1.5}
                  className="shrink-0 text-[#6B7280] transition-transform duration-300"
                  style={{
                    transform:
                      openFaq === i ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                style={{ gridTemplateRows: openFaq === i ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p className="text-[16px] font-normal leading-[1.6em] text-[#6B7280] m-0 px-6 pb-6">
                    {faq.a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───── Educate Section (masalah) — calm, no glow ───── */

function EducateSection() {
  const t = useTranslations();
  const CARDS = [
    {
      number: t("landing.problemCard1Number"),
      desc: t("landing.problemCard1Desc"),
      chips: [
        t("landing.problemCard1Chip1"),
        t("landing.problemCard1Chip2"),
        t("landing.problemCard1Chip3"),
      ],
    },
    {
      number: t("landing.problemCard2Number"),
      desc: t("landing.problemCard2Desc"),
      chips: [
        t("landing.problemCard2Chip1"),
        t("landing.problemCard2Chip2"),
        t("landing.problemCard2Chip3"),
      ],
    },
  ];
  return (
    <section className="lp-problem-section bg-white px-8 py-[120px] border-t border-[#E5E7EB]">
      <div className="max-w-[1044px] mx-auto">
        <h2 className="lp-problem-heading text-center m-0 mb-5">
          {t("landing.educateHeading")}
        </h2>
        <p className="lp-problem-subtitle text-center text-[18px] font-normal leading-[1.7em] tracking-[-0.5px] text-[var(--lp-text-secondary)] m-0 mb-14">
          {t("landing.educateSubtitle")}
        </p>
        <div className="lp-problem-grid grid grid-cols-2 gap-6">
          {CARDS.map((card) => (
            <div
              key={card.number}
              className="lp-problem-card relative rounded-[12px] border border-[#E5E7EB] overflow-hidden flex flex-col justify-between min-h-[440px] bg-white p-10"
            >
              <div>
                <p className="text-[28px] font-semibold tracking-[-0.5px] leading-[1.2em] text-[#111827] m-0 mb-5">
                  {card.number}
                </p>
                <p className="text-[20px] font-medium tracking-[-0.5px] leading-[1.4em] text-[#111827] m-0 max-w-[340px]">
                  {card.desc}
                </p>
              </div>
              <div className="pt-[80px] flex flex-col gap-2.5">
                {card.chips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-block self-start text-[14px] font-normal text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] rounded-full px-4 py-2"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───── Page ───── */

export default function Home() {
  const t = useTranslations();

  return (
    <div className="lp-page min-h-screen bg-white">
      {/* ──── Nav + Hero ──── */}
      <div style={{ background: "var(--lp-bg, #f7f7f5)" }}>
        <LandingNav />
        <HeroSection />
      </div>

      {/* ──── Educate Section (masalah) ──── */}
      <EducateSection />

      {/* ──── How it works ──── */}
      <HowItWorks />

      {/* ──── Isi Laporan (what you receive) ──── */}
      <IsilaporanSection />

      {/* ──── Batasan (honest boundaries) ──── */}
      <BatasanSection />

      {/* ──── Kebijakan Data ──── */}
      <KebijakanDataSection />

      {/* ──── FAQ ──── */}
      <FAQSection />

      {/* ──── Final CTA ──── */}
      <section
        id="cta"
        className="lp-cta-section w-full min-h-[516px] px-8 py-[144px] flex items-center justify-center relative overflow-hidden bg-cover bg-center border-t border-[#E5E7EB]"
        style={{ backgroundImage: "url('/bg-cta.png')" }}
      >
        <div className="flex flex-col items-center gap-10 text-center">
          <h2 className="lp-cta-heading m-0 max-w-[720px]">
            {t("landing.ctaHeading")}
          </h2>
          <Link
            href="/audit"
            className="btn-lp-black inline-flex items-center px-7 py-3.5 text-white text-[14px] font-medium rounded-[8px] no-underline cursor-pointer"
          >
            {t("cta.auditBrandFreeNoExclaim")}
          </Link>
        </div>
      </section>

      {/* ──── Footer ──── */}
      <Footer />
    </div>
  );
}
