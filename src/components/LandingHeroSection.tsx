"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

const HERO_STEP_COUNT = 3;

export default function LandingHeroSection() {
  const t = useTranslations();
  const steps = [
    t("landing.heroStep1"),
    t("landing.heroStep2"),
    t("landing.heroStep3"),
  ];
  const previews = [
    {
      eyebrow: t("landing.heroPreviewEyebrow1"),
      heading: t("landing.heroPreviewHeading1"),
      body: t("landing.heroPreviewBody1"),
    },
    {
      eyebrow: t("landing.heroPreviewEyebrow2"),
      heading: t("landing.heroPreviewHeading2"),
      body: t("landing.heroPreviewBody2"),
    },
    {
      eyebrow: t("landing.heroPreviewEyebrow3"),
      heading: t("landing.heroPreviewHeading3"),
      body: t("landing.heroPreviewBody3"),
    },
  ];
  const [activeStep, setActiveStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveStep((previous) => (previous + 1) % HERO_STEP_COUNT);
    }, 3000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const handleStepClick = (index: number) => {
    setActiveStep(index);
    startTimer();
  };

  return (
    <>
      <section className="lp-root lp-hero-section relative flex w-full justify-center overflow-hidden px-[30px] pt-[120px]">
        <div className="flex w-full max-w-[1200px] flex-col items-center">
          <div className="flex flex-col items-center gap-6">
            <h1 className="lp-hero-heading m-0 max-w-[800px] text-center">
              {t("landing.heroHeading")}
            </h1>
            <p className="lp-hero-subtitle m-0 max-w-[740px] text-center text-[18px] leading-[1.7em] font-normal tracking-[-0.5px] text-[var(--lp-text-secondary)]">
              {t("landing.heroSubtitle")}
            </p>
            <Link
              href="#sample-audit"
              className="btn-lp-purple inline-flex cursor-pointer items-center rounded-[6px] border border-[var(--lp-border)] px-[22px] py-3 text-[14px] leading-[1.7em] font-medium text-white no-underline"
            >
              {t("cta.seeSampleAudit")}
            </Link>
          </div>

          <div
            id="sample-audit"
            className="lp-hero-preview relative mt-16 w-full scroll-mt-[100px]"
          >
            <div className="lp-hero-preview-frame relative aspect-[1.82094] w-full overflow-hidden rounded-[12px] border border-[var(--lp-border)]">
              <div className="lp-hero-bg-base" aria-hidden="true" />
              <div className="lp-hero-overlay-1" aria-hidden="true" />
              <div className="lp-hero-overlay-2" aria-hidden="true" />
              <div className="lp-hero-overlay-3" aria-hidden="true" />

              <div className="lp-hero-preview-content absolute inset-0 z-10 flex flex-col items-center gap-6 px-10 pt-10">
                <div className="lp-hero-stepper flex h-[43px] items-center gap-0 rounded-[10px] border border-[var(--lp-border)] bg-white px-3.5 py-2 shadow-[rgba(0,0,0,0.04)_0px_1px_4px_0px]">
                  {steps.map((step, index) => (
                    <button
                      key={step}
                      onClick={() => handleStepClick(index)}
                      className="flex cursor-pointer items-center gap-3.5 border-none bg-transparent pr-3.5 text-[16px] leading-[1.7em] font-medium whitespace-nowrap"
                      style={{
                        color:
                          activeStep === index
                            ? "var(--lp-text-primary)"
                            : "var(--lp-text-secondary)",
                      }}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                        {activeStep === index ? (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            aria-hidden="true"
                          >
                            <circle cx="10" cy="10" r="10" fill="#0a0a0a" />
                            <text
                              x="10"
                              y="10"
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill="#fff"
                              fontFamily="Inter, sans-serif"
                              fontWeight="600"
                              fontSize="14"
                            >
                              {index + 1}
                            </text>
                          </svg>
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-[var(--lp-border)]" />
                        )}
                      </span>
                      {step}
                    </button>
                  ))}
                </div>

                <div className="lp-hero-report-shell relative h-[504px] w-full max-w-[900px] overflow-hidden rounded-[12px] bg-white/[0.72] p-8 shadow-[rgba(0,0,0,0.08)_0px_8px_32px_0px] backdrop-blur-[54px]">
                  {previews.map((preview, index) => (
                    <article
                      key={preview.heading}
                      className="lp-hero-report-card absolute inset-8 flex flex-col justify-between rounded-[8px] border border-[#E5E7EB] bg-white p-10"
                      style={{
                        opacity: activeStep === index ? 1 : 0,
                        transition: "opacity 0.5s ease",
                        pointerEvents: activeStep === index ? "auto" : "none",
                      }}
                      aria-hidden={activeStep !== index}
                    >
                      <div>
                        <p className="mb-5 text-[12px] font-semibold tracking-[0.14em] text-[var(--lp-purple)] uppercase">
                          {t("landing.sampleLabel")}
                        </p>
                        <p className="mb-3 text-[14px] text-[#6B7280]">
                          {preview.eyebrow}
                        </p>
                        <h2 className="mb-5 max-w-[650px] text-[34px] leading-[1.2] tracking-[-1px] text-[#111827]">
                          {preview.heading}
                        </h2>
                        <p className="max-w-[680px] text-[17px] leading-[1.7] text-[#6B7280]">
                          {preview.body}
                        </p>
                      </div>
                      <p className="mb-0 border-t border-[#E5E7EB] pt-5 text-[13px] leading-[1.6] text-[#6B7280]">
                        {t("landing.sampleDisclaimer")}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-marquee-section flex w-full flex-col items-center gap-8 overflow-hidden pt-[120px] pb-24">
        <p className="lp-marquee-text m-0 px-[30px] text-center text-[18px] leading-[1.5em] font-normal text-[#0A0A0A]">
          {t("landing.marqueeText")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 px-8">
          {["scopeChip1", "scopeChip2", "scopeChip3", "scopeChip4"].map(
            (key) => (
              <span
                key={key}
                className="rounded-full border border-[#E5E7EB] bg-white px-5 py-2.5 text-[14px] text-[#4B5563]"
              >
                {t(`landing.${key}`)}
              </span>
            ),
          )}
        </div>
      </section>
    </>
  );
}
