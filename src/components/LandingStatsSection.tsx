"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export default function LandingStatsSection() {
  const t = useTranslations();
  const stats = [
    {
      number: t("landing.stat1Number"),
      title: t("landing.stat1Title"),
      body: t("landing.stat1Body"),
    },
    {
      number: t("landing.stat2Number"),
      title: t("landing.stat2Title"),
      body: t("landing.stat2Body"),
    },
    {
      number: t("landing.stat3Number"),
      title: t("landing.stat3Title"),
      body: t("landing.stat3Body"),
    },
  ];

  return (
    <section className="lp-stats-section bg-[#F9FAFB] pt-[120px] pb-[120px]">
      <div className="mb-6 px-8 text-center">
        <h2
          className="lp-stats-heading m-0 mb-5"
          dangerouslySetInnerHTML={{
            __html: t
              .raw("landing.statsHeading")
              .replace(/\n/g, '<br class="lp-stats-br" />'),
          }}
        />
        <p className="lp-stats-subtitle m-0 text-[20px] leading-[1.7em] font-normal tracking-[-0.5px] text-[#6B7280]">
          {t("landing.statsSubtitle")}
        </p>
      </div>
      <div className="h-px bg-[#E5E7EB]" />
      <div className="lp-stats-grid-inner mx-auto grid max-w-[1044px] grid-cols-3">
        {stats.map((stat, index) => (
          <div
            key={stat.title}
            className={cn(
              "lp-stat-item border-r border-[#E5E7EB] px-10 py-12",
              index === 0 && "border-l border-[#E5E7EB]",
            )}
          >
            <p className="m-0 mb-2 text-[40px] leading-[1.4em] font-semibold tracking-[-1px] text-[#111827]">
              {stat.number}
            </p>
            <p className="m-0 mb-3 text-[24px] leading-[1.4em] font-medium tracking-[-0.5px] text-[#111827]">
              {stat.title}
            </p>
            <p className="m-0 text-[16px] leading-[1.7em] font-normal text-[#6B7280]">
              {stat.body}
            </p>
          </div>
        ))}
      </div>
      <div className="h-px bg-[#E5E7EB]" />
      <p className="mt-6 px-8 text-center text-[13px] text-[#6B7280]">
        {t("landing.statsDisclaimer")}
      </p>
    </section>
  );
}
