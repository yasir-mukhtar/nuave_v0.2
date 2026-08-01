"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function LandingCtaSection() {
  const t = useTranslations();

  return (
    <section className="lp-cta-section relative flex min-h-[516px] w-full items-center justify-center overflow-hidden bg-[url('/bg-cta.png')] bg-cover bg-center px-8 py-[144px]">
      <div className="flex flex-col items-center gap-10 text-center">
        <h2 className="lp-cta-heading m-0 max-w-[720px]">
          {t("landing.ctaHeading")}
        </h2>
        <Link
          href="#sample-audit"
          className="btn-lp-black inline-flex cursor-pointer items-center rounded-[8px] px-7 py-3.5 text-[14px] font-medium text-white no-underline"
        >
          {t("cta.seeSampleAudit")}
        </Link>
      </div>
    </section>
  );
}
