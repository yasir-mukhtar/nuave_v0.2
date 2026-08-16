"use client";
import Link from "next/link";
import {
  IconBrandX,
  IconBrandInstagram,
  IconBrandLinkedin,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

const LOGO_SVG = "/nuave-logo.svg";

const NAV_LINK_KEYS = [
  { key: "sampleAudit" as const, href: "#sample-audit" },
  { key: "howItWorks" as const, href: "#cara-kerja" },
];

const SOCIAL = [
  {
    icon: IconBrandLinkedin,
    href: "https://linkedin.com/company/nuave",
    label: "LinkedIn",
  },
  { icon: IconBrandX, href: "https://x.com/nuaveAI", label: "X" },
  {
    icon: IconBrandInstagram,
    href: "https://instagram.com/nuave.ai",
    label: "Instagram",
  },
];

export default function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="lp-footer px-8 py-[110px] bg-white">
      <div className="max-w-[1045px] mx-auto">
        {/* Row 1: Footer menu + Social icons */}
        <div className="lp-footer-row1 flex items-center justify-between mb-[72px]">
          <div className="lp-footer-nav flex items-center gap-8">
            {NAV_LINK_KEYS.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="text-[14px] font-normal leading-[20px] text-[#6B7280] no-underline hover:text-brand transition-colors duration-150"
              >
                {t(link.key)}
              </Link>
            ))}
          </div>

          <div className="lp-footer-social flex items-center gap-3">
            <span className="lp-footer-social-label text-[14px] font-normal leading-[20px] text-[#6B7280] mr-1">
              {t("followUs")}
            </span>
            <div className="lp-footer-social-icons flex items-center gap-3">
              {SOCIAL.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex items-center justify-center w-9 h-9 rounded-[8px] bg-[#111827] text-white no-underline shrink-0 hover:bg-brand transition-colors duration-150"
                >
                  <Icon size={18} stroke={1.5} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#E5E7EB]" />

        {/* Row 2: Logo + tagline + copyright */}
        <div className="lp-footer-row2 mt-14 flex items-center gap-8">
          <div className="flex items-center gap-2">
            <img
              src={LOGO_SVG}
              alt="Nuave"
              width={28}
              height={28}
              className="object-contain"
            />
            <span className="text-[18px] font-semibold text-[#111827]">
              Nuave
            </span>
          </div>

          <p className="text-[14px] font-normal leading-[20px] text-[#6B7280] m-0">
            {t("tagline")}
          </p>

          <p className="lp-footer-copyright text-[14px] font-normal leading-[20px] text-[#6B7280] m-0 ml-auto">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
