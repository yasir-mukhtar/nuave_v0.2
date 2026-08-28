"use client";

import Link from "next/link";
import { IconCheck, IconShieldLock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Footer from "@/components/Footer";
import HowItWorks from "@/components/HowItWorks";
import LandingNav from "@/components/LandingNav";
import LandingAuditHero from "@/components/LandingAuditHero";
import ExampleReportPreview from "@/components/ExampleReportPreview";

function IsilaporanSection() {
  const t = useTranslations();
  const ITEMS = Array.from({ length: 7 }, (_, i) => ({
    title: t(`report.item${i + 1}Title`),
    body: t(`report.item${i + 1}Body`),
  }));
  return (
    <section
      id="isi-laporan"
      className="lp-report-section bg-white px-8 py-[120px]"
    >
      <div className="max-w-[1200px] mx-auto">
        <h2 className="lp-report-heading text-center m-0 mb-6">
          {t("report.heading")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-16">
          {ITEMS.map((item, i) => (
            <div
              key={item.title}
              className={cn(
                "flex items-start gap-4 rounded-[28px] bg-[#F5F5F7] p-7 md:p-8",
                i === 6 && "md:col-span-2",
              )}
            >
              <div className="w-8 h-8 rounded-full bg-[#E8E8ED] flex items-center justify-center shrink-0 mt-0.5">
                <IconCheck
                  size={16}
                  stroke={2}
                  color="var(--lp-text-primary)"
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-[21px] font-semibold tracking-[0.011em] leading-[1.38] text-[var(--lp-text-primary)] m-0">
                  {item.title}
                </p>
                <p className="text-[17px] font-normal tracking-[-0.022em] leading-[1.47] text-[var(--lp-text-secondary)] m-0">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          id="contoh-laporan"
          className="mt-20 flex flex-col items-center gap-5"
        >
          <Link
            href="/audit"
            className="btn-lp-purple inline-flex items-center px-5 py-[11px] text-white text-[17px] font-normal tracking-[-0.022em] leading-[1.47] rounded-full no-underline cursor-pointer"
          >
            {t("report.cta")}
          </Link>
          <ExampleReportPreview />
          <p className="text-[12px] leading-4 tracking-[-0.12px] text-[var(--lp-text-secondary)] m-0">
            {t("report.exampleFootnote")}
          </p>
        </div>
      </div>
    </section>
  );
}

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
      className="lp-batasan-section bg-[#F5F5F7] px-8 py-[120px]"
    >
      <div className="max-w-[1200px] mx-auto">
        <h2 className="lp-batasan-heading text-center m-0 mb-16">
          {t("batasan.heading")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ITEMS.map((item) => (
            <div
              key={item.title}
              className="rounded-[28px] bg-white p-7 md:p-10 flex flex-col gap-4"
            >
              <p className="text-[28px] font-semibold tracking-[0.007em] leading-[1.14] text-[var(--lp-text-primary)] m-0">
                {item.title}
              </p>
              <p className="text-[17px] font-normal tracking-[-0.022em] leading-[1.47] text-[var(--lp-text-secondary)] m-0">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function KebijakanDataSection() {
  const t = useTranslations();
  return (
    <section
      id="kebijakan-data"
      className="lp-data-section bg-white px-8 pb-[120px]"
    >
      <div className="max-w-[1200px] mx-auto pt-[120px]">
        <div className="rounded-[28px] bg-[#1D1D1F] px-8 py-20 flex flex-col items-center text-center gap-6">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <IconShieldLock size={22} color="#fff" stroke={1.6} />
          </div>
          <h3 className="text-[40px] font-semibold tracking-[-0.01em] leading-[1.2] text-white m-0">
            {t("dataPolicy.heading")}
          </h3>
          <p className="text-[17px] font-normal tracking-[-0.022em] leading-[1.47] text-white/75 m-0 max-w-[640px]">
            {t("dataPolicy.statement")}
          </p>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const t = useTranslations();
  const FAQS = Array.from({ length: 10 }, (_, i) => ({
    q: t(`faqs.q${i + 1}`),
    a: t(`faqs.a${i + 1}`),
  }));
  return (
    <section id="faq" className="lp-faq-section bg-[#F5F5F7] px-8 py-[120px]">
      <div className="max-w-[820px] mx-auto">
        <h2 className="lp-faq-heading text-center mb-14">
          {t("landing.faqHeading")}
        </h2>
        <Accordion
          defaultValue={["faq-0"]}
          className="gap-3"
          aria-label={t("landing.faqHeading")}
        >
          {FAQS.map((faq, i) => (
            <AccordionItem
              key={faq.q}
              value={`faq-${i}`}
              className="overflow-hidden rounded-[28px] border-0 bg-white"
            >
              <AccordionTrigger className="w-full px-7 py-6 text-[21px] leading-[1.38] font-semibold tracking-[0.011em] text-foreground hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="px-7 pb-7 text-[17px] leading-[1.47] tracking-[-0.022em] text-muted-foreground">
                <p className="m-0">{faq.a}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

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
    <section className="lp-problem-section bg-white px-8 py-[120px]">
      <div className="max-w-[1200px] mx-auto">
        <h2 className="lp-problem-heading text-center m-0 mb-6">
          {t("landing.educateHeading")}
        </h2>
        <p className="lp-problem-subtitle text-center text-[21px] font-normal leading-[1.38] tracking-[0.011em] text-[var(--lp-text-secondary)] m-0 mb-16">
          {t("landing.educateSubtitle")}
        </p>
        <div className="lp-problem-grid grid grid-cols-2 gap-5">
          {CARDS.map((card) => (
            <div
              key={card.number}
              className="lp-problem-card relative rounded-[28px] overflow-hidden flex flex-col justify-between min-h-[460px] bg-[#F5F5F7] p-7 md:p-10"
            >
              <div>
                <p className="text-[40px] font-semibold tracking-[-0.01em] leading-[1.2] text-[var(--lp-text-primary)] m-0 mb-6">
                  {card.number}
                </p>
                <p className="text-[28px] font-semibold tracking-[0.007em] leading-[1.14] text-[var(--lp-text-primary)] m-0 max-w-[420px]">
                  {card.desc}
                </p>
              </div>
              <div className="pt-[80px] flex flex-col gap-2">
                {card.chips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-block self-start text-[17px] font-normal tracking-[-0.022em] leading-[1.47] text-[#474747] bg-white rounded-full px-4 py-2"
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

export default function Home() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-white">
      <div className="relative">
        <LandingNav overlayHero />
        <LandingAuditHero />
      </div>

      <div className="lp-page">
        <EducateSection />
        <HowItWorks />
        <IsilaporanSection />
        <BatasanSection />
        <KebijakanDataSection />
        <FAQSection />

        <section
          id="cta"
          className="lp-cta-section w-full min-h-[516px] px-8 py-[144px] flex items-center justify-center relative overflow-hidden bg-cover bg-center"
          style={{ backgroundImage: "url('/bg-cta.png')" }}
        >
          <div className="flex flex-col items-center gap-10 text-center">
            <h2 className="lp-cta-heading m-0 max-w-[820px]">
              {t("landing.ctaHeading")}
            </h2>
            <Link
              href="/audit"
              className="btn-lp-purple inline-flex items-center px-6 py-[11px] text-white text-[17px] font-normal tracking-[-0.022em] leading-[1.47] rounded-full no-underline cursor-pointer"
            >
              {t("cta.auditBrandFreeNoExclaim")}
            </Link>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
