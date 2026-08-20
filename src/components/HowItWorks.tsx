"use client";

import { useRef, useEffect, useState } from "react";
import { IconCheck } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const ConfirmBusinessPreview = dynamic(
  () => import("@/components/ConfirmBusinessPreview"),
  { ssr: false },
);
const PaymentPreview = dynamic(() => import("@/components/PaymentPreview"), {
  ssr: false,
});
const QuestionsPreview = dynamic(
  () => import("@/components/QuestionsPreview"),
  { ssr: false },
);
const ReportPagePreview = dynamic(
  () => import("@/components/ReportPagePreview"),
  { ssr: false },
);

/* ── Static gradient panel (R-12: no perpetual cursor-glow) ── */
function StaticGradientPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{
        background: `linear-gradient(135deg, #e0e7ff, #dbeafe, #ede9fe, #e0f2fe, #f3e8ff)`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Main component ── */
export default function HowItWorks() {
  const t = useTranslations();

  const CARDS = [
    {
      step: "1",
      label: t("howItWorks.step1Label"),
      title: t("howItWorks.step1Title"),
      desc: t("howItWorks.step1Desc"),
      checks: [
        t("howItWorks.step1Check1"),
        t("howItWorks.step1Check2"),
        t("howItWorks.step1Check3"),
      ],
    },
    {
      step: "2",
      label: t("howItWorks.step2Label"),
      title: t("howItWorks.step2Title"),
      desc: t("howItWorks.step2Desc"),
      checks: [
        t("howItWorks.step2Check1"),
        t("howItWorks.step2Check2"),
        t("howItWorks.step2Check3"),
      ],
      flip: true,
    },
    {
      step: "3",
      label: t("howItWorks.step3Label"),
      title: t("howItWorks.step3Title"),
      desc: t("howItWorks.step3Desc"),
      checks: [
        t("howItWorks.step3Check1"),
        t("howItWorks.step3Check2"),
        t("howItWorks.step3Check3"),
      ],
    },
    {
      step: "4",
      label: t("howItWorks.step4Label"),
      title: t("howItWorks.step4Title"),
      desc: t("howItWorks.step4Desc"),
      checks: [
        t("howItWorks.step4Check1"),
        t("howItWorks.step4Check2"),
        t("howItWorks.step4Check3"),
      ],
      flip: true,
    },
  ];
  const sectionRef = useRef<HTMLDivElement>(null);
  const [headingOpacity, setHeadingOpacity] = useState(1);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const sectionTop = rect.top + window.scrollY;
      const sectionHeight = sectionRef.current.offsetHeight;
      const sectionBottom = sectionTop + sectionHeight;
      const scrollY = window.scrollY;
      const vh = window.innerHeight;

      // Fade heading as section scrolls off screen
      const fadeStart = sectionBottom - vh - 200;
      const fadeEnd = sectionBottom - vh;
      const alpha =
        1 -
        Math.max(0, Math.min(1, (scrollY - fadeStart) / (fadeEnd - fadeStart)));
      setHeadingOpacity(alpha);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      id="cara-kerja"
      ref={sectionRef}
      className="lp-hiw-section relative pt-[120px]"
      style={{ background: "var(--lp-bg)" }}
    >
      {/* Sticky heading */}
      <div
        className="lp-hiw-sticky-heading sticky top-20 z-10 pb-10 px-8 pointer-events-none"
        style={{ opacity: headingOpacity, transition: "opacity 0.1s linear" }}
      >
        <div className="max-w-[868px] mx-auto text-center">
          <h2 className="lp-hiw-heading">{t("howItWorks.heading")}</h2>
        </div>
      </div>

      {/* Cards scroll area */}
      <div className="pb-[120px]">
        {CARDS.map((card, i) => (
          <div
            key={card.step}
            className="lp-hiw-card-wrapper sticky px-8 pb-6 mb-6"
            style={{ top: 232, zIndex: 20 + i }}
          >
            <div
              className="lp-hiw-card-grid max-w-[868px] mx-auto grid grid-cols-2 rounded-[12px] overflow-hidden bg-white border border-[#E5E7EB] shadow-[0_8px_40px_rgba(0,0,0,0.10)] min-h-[360px]"
              style={{ transformOrigin: "top center" }}
            >
              {/* Left panel — white */}
              <div
                className={cn(
                  "lp-hiw-left-panel bg-white p-10 flex flex-col justify-between",
                  card.flip ? "order-2" : "order-1",
                )}
              >
                <div>
                  {/* Step circle */}
                  <div className="w-10 h-10 rounded-full bg-[var(--lp-purple)] text-white text-[24px] font-bold tracking-[-0.5px] leading-[1.4] flex items-center justify-center mb-6">
                    {card.step}
                  </div>
                  <h3 className="mb-3">{card.title}</h3>
                  <p className="text-[16px] leading-[28px] text-[#858585] mb-6">
                    {card.desc}
                  </p>
                </div>
                {/* Checklist */}
                <div className="flex flex-col gap-2.5">
                  {card.checks.map((check) => (
                    <div key={check} className="flex items-center gap-2.5">
                      <IconCheck
                        size={16}
                        color="var(--lp-text-primary)"
                        stroke={2}
                        className="shrink-0"
                      />
                      <span className="text-[16px] font-normal leading-[28px] text-[var(--lp-text-primary)]">
                        {check}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right panel — static preview (desktop) */}
              <StaticGradientPanel
                className={cn(
                  "lp-hiw-right-panel flex items-center justify-center",
                  card.flip ? "order-1" : "order-2",
                )}
              >
                {card.step === "1" && <ConfirmBusinessPreview />}
                {card.step === "2" && <PaymentPreview />}
                {card.step === "3" && <QuestionsPreview />}
                {card.step === "4" && <ReportPagePreview />}
              </StaticGradientPanel>

              {/* Mobile preview */}
              <div className="lp-hiw-mobile-preview p-3 order-3">
                <StaticGradientPanel className="rounded-[var(--radius-sm)] p-6 flex justify-center items-center">
                  {card.step === "1" && <ConfirmBusinessPreview />}
                  {card.step === "2" && <PaymentPreview />}
                  {card.step === "3" && <QuestionsPreview />}
                  {card.step === "4" && <ReportPagePreview />}
                </StaticGradientPanel>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
