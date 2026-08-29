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
      className="lp-report-section bg-white px-8 py-[120px] border-t border-[#E5E7EB]"
    >
      <div className="max-w-[1044px] mx-auto">
        <h2 className="lp-report-heading type-heading-xl text-center m-0 mb-6">
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
                <p className="type-label text-[var(--lp-text-primary)] m-0">
                  {item.title}
                </p>
                <p className="type-copy-sm text-[#6B7280] m-0">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div
          id="contoh-laporan"
          className="mt-16 flex flex-col items-center gap-5"
        >
          <Link
            href="/audit"
            className="btn-lp-purple type-label inline-flex items-center px-[22px] py-3 text-white rounded-[6px] border border-[var(--lp-border)] no-underline cursor-pointer"
          >
            {t("report.cta")}
          </Link>
          <ExampleReportPreview />
          <p className="type-label-sm text-[#9CA3AF] m-0">
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
      className="lp-batasan-section bg-white px-8 py-[120px] border-t border-[#E5E7EB]"
    >
      <div className="max-w-[1044px] mx-auto">
        <h2 className="lp-batasan-heading type-heading-xl text-center m-0 mb-14">
          {t("batasan.heading")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ITEMS.map((item) => (
            <div
              key={item.title}
              className="rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] p-8 flex flex-col gap-3"
            >
              <p className="type-heading-sm text-[#111827] m-0">{item.title}</p>
              <p className="type-copy-sm text-[#6B7280] m-0">{item.body}</p>
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
      className="lp-data-section bg-white px-8 pb-[120px] border-t border-[#E5E7EB]"
    >
      <div className="max-w-[1044px] mx-auto pt-[80px]">
        <div className="rounded-[16px] bg-[#0d1738] px-8 py-14 flex flex-col items-center text-center gap-5">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <IconShieldLock size={22} color="#fff" stroke={1.6} />
          </div>
          <h3 className="type-heading-sm text-white m-0">
            {t("dataPolicy.heading")}
          </h3>
          <p className="type-copy-sm text-white/80 m-0 max-w-[640px]">
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
    <section
      id="faq"
      className="lp-faq-section bg-[#F9FAFB] px-8 pt-[72px] pb-20 border-t border-[#E5E7EB]"
    >
      <div className="max-w-[740px] mx-auto">
        <h2 className="lp-faq-heading type-heading-xl text-center mb-12">
          {t("landing.faqHeading")}
        </h2>
        <Accordion
          defaultValue={["faq-0"]}
          className="gap-4"
          aria-label={t("landing.faqHeading")}
        >
          {FAQS.map((faq, i) => (
            <AccordionItem
              key={faq.q}
              value={`faq-${i}`}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              <AccordionTrigger className="type-heading-sm w-full px-6 py-5 text-foreground hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="type-copy px-6 pb-6 text-muted-foreground">
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
    <section className="lp-problem-section bg-white px-8 py-[120px] border-t border-[#E5E7EB]">
      <div className="max-w-[1044px] mx-auto">
        <h2 className="lp-problem-heading type-heading-xl text-center m-0 mb-5">
          {t("landing.educateHeading")}
        </h2>
        <p className="lp-problem-subtitle type-copy-lg text-center text-[var(--lp-text-secondary)] m-0 mb-14">
          {t("landing.educateSubtitle")}
        </p>
        <div className="lp-problem-grid grid grid-cols-2 gap-6">
          {CARDS.map((card) => (
            <div
              key={card.number}
              className="lp-problem-card relative rounded-[12px] border border-[#E5E7EB] overflow-hidden flex flex-col justify-between min-h-[440px] bg-white p-10"
            >
              <div>
                <p className="type-heading-md text-[#111827] m-0 mb-5">
                  {card.number}
                </p>
                <p className="type-heading-sm text-[#111827] m-0 max-w-[340px]">
                  {card.desc}
                </p>
              </div>
              <div className="pt-[80px] flex flex-col gap-2.5">
                {card.chips.map((chip) => (
                  <span
                    key={chip}
                    className="type-copy-sm inline-block self-start text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] rounded-full px-4 py-2"
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
          className="lp-cta-section w-full min-h-[516px] px-8 py-[144px] flex items-center justify-center relative overflow-hidden bg-cover bg-center border-t border-[#E5E7EB]"
          style={{ backgroundImage: "url('/bg-cta.png')" }}
        >
          <div className="flex flex-col items-center gap-10 text-center">
            <h2 className="lp-cta-heading type-heading-xl m-0 max-w-[720px]">
              {t("landing.ctaHeading")}
            </h2>
            <Link
              href="/audit"
              className="btn-lp-black type-label inline-flex items-center px-7 py-3.5 text-white rounded-[8px] no-underline cursor-pointer"
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
