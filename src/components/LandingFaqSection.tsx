"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

export default function LandingFaqSection() {
  const t = useTranslations();
  const faqs = Array.from({ length: 10 }, (_, index) => ({
    question: t(`faqs.q${index + 1}`),
    answer: t(`faqs.a${index + 1}`),
  }));
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="lp-faq-section bg-[#F9FAFB] px-8 pt-[72px] pb-20"
    >
      <div className="mx-auto max-w-[740px]">
        <h2 className="lp-faq-heading mb-12 text-center">
          {t("landing.faqHeading")}
        </h2>
        <div className="flex flex-col gap-4">
          {faqs.map((faq, index) => (
            <div
              key={faq.question}
              className="overflow-hidden rounded-[12px] border border-[#E5E7EB] bg-white"
            >
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="flex w-full cursor-pointer items-center justify-between gap-4 border-none bg-transparent p-6 text-left"
              >
                <span className="text-[18px] leading-[1.7em] font-semibold tracking-[-0.5px] text-[#111827]">
                  {faq.question}
                </span>
                <IconChevronDown
                  size={20}
                  stroke={1.5}
                  className="shrink-0 text-[#6B7280] transition-transform duration-300"
                  style={{
                    transform:
                      openFaq === index ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                style={{ gridTemplateRows: openFaq === index ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p className="m-0 px-6 pb-6 text-[16px] leading-[1.6em] font-normal text-[#6B7280]">
                    {faq.answer}
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
