import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import LandingNav from "@/components/LandingNav";
import Footer from "@/components/Footer";

/**
 * Placeholder-aware text: renders `[SESUATU]` content in red with a dotted
 * underline so unresolved founder fields are visible at a glance. Once the
 * brackets are replaced with a real value in messages/id.json, it renders as
 * normal text automatically.
 */
function Ph({ children }: { children: React.ReactNode }) {
  const text = Array.isArray(children)
    ? children.join("")
    : typeof children === "string"
      ? children
      : "";
  if (!/^\[.+\]$/.test(text.trim())) return <>{children}</>;
  return (
    <span className="font-semibold text-[#DC2626] underline decoration-dotted underline-offset-2">
      {children}
    </span>
  );
}

function Mail({ children }: { children: React.ReactNode }) {
  const addr = Array.isArray(children)
    ? children.join("")
    : typeof children === "string"
      ? children
      : "";
  return (
    <a
      href={`mailto:${addr}`}
      className="text-[var(--lp-purple)] underline hover:text-[var(--lp-purple-dark)]"
    >
      {children}
    </a>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("support");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function SupportPage() {
  const t = await getTranslations("support");

  const fasterItems = Array.from({ length: 6 }, (_, i) =>
    t(`fasterItem${i + 1}`),
  );

  const categories: { title: string; body: React.ReactNode }[] = [
    { title: t("cat1Title"), body: t("cat1Body") },
    { title: t("cat2Title"), body: t("cat2Body") },
    { title: t("cat3Title"), body: t("cat3Body") },
    {
      title: t("cat4Title"),
      body: t.rich("cat4Body", {
        termsLink: (chunks) => (
          <Link
            href="/terms"
            className="font-medium text-[var(--lp-purple)] underline hover:text-[var(--lp-purple-dark)]"
          >
            {chunks}
          </Link>
        ),
      }),
    },
    {
      title: t("cat5Title"),
      body: t.rich("cat5Body", {
        privacyEmail: (chunks) => <Mail>{chunks}</Mail>,
        privacyLink: (chunks) => (
          <Link
            href="/privacy"
            className="font-medium text-[var(--lp-purple)] underline hover:text-[var(--lp-purple-dark)]"
          >
            {chunks}
          </Link>
        ),
      }),
    },
    { title: t("cat6Title"), body: t("cat6Body") },
  ];

  const channels = [
    { label: t("channelSupportLabel"), value: t("supportEmail") },
    { label: t("channelPrivacyLabel"), value: t("privacyEmail") },
    { label: t("channelHoursLabel"), value: t("channelHoursValue") },
  ];

  return (
    <div className="lp-page min-h-screen">
      <LandingNav />

      <main className="bg-white pt-[140px] px-8 pb-[120px]">
        <div className="max-w-[740px] mx-auto">
          {/* Header */}
          <h1 className="m-0 mb-6">{t("heading")}</h1>
          <p className="text-[18px] font-normal leading-[1.7em] tracking-[-0.5px] text-[var(--lp-text-secondary)] m-0">
            {t.rich("lead", {
              email: (chunks) => <Mail>{chunks}</Mail>,
              operator: (chunks) => <Ph>{chunks}</Ph>,
              city: (chunks) => <Ph>{chunks}</Ph>,
            })}
          </p>
          <p className="text-[15px] font-normal leading-[1.7em] text-[#6B7280] m-0 mt-4">
            {t("responseTarget")}
          </p>

          {/* What to include */}
          <section className="mt-16">
            <h2 className="text-[28px] font-medium tracking-[-0.5px] leading-[1.3em] m-0 mb-6">
              {t("fasterHeading")}
            </h2>
            <div className="rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] p-8">
              <p className="text-[16px] font-semibold text-[#111827] m-0 mb-4">
                {t("fasterIntro")}
              </p>
              <ul className="list-disc pl-5 m-0 flex flex-col gap-2">
                {fasterItems.map((item) => (
                  <li
                    key={item}
                    className="text-[15px] font-normal leading-[1.7em] text-[#374151] m-0"
                  >
                    {item}
                  </li>
                ))}
              </ul>
              <p className="rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[14px] font-normal leading-[1.6em] text-[#B91C1C] m-0 mt-6">
                {t("sensitiveWarning")}
              </p>
            </div>
          </section>

          {/* Help categories */}
          <section className="mt-16">
            <h2 className="text-[28px] font-medium tracking-[-0.5px] leading-[1.3em] m-0 mb-6">
              {t("categoriesHeading")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.title}
                  className="rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] p-6 flex flex-col gap-2"
                >
                  <h3 className="text-[16px] font-semibold tracking-[-0.3px] leading-[1.5em] text-[#111827] m-0">
                    {cat.title}
                  </h3>
                  <p className="text-[14px] font-normal leading-[1.7em] text-[#6B7280] m-0">
                    {cat.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Official channels */}
          <section className="mt-16">
            <h2 className="text-[28px] font-medium tracking-[-0.5px] leading-[1.3em] m-0 mb-6">
              {t("channelsHeading")}
            </h2>
            <div className="rounded-[12px] border border-[#E5E7EB] divide-y divide-[#E5E7EB]">
              {channels.map((ch) => (
                <div
                  key={ch.label}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 p-5"
                >
                  <span className="text-[15px] font-semibold text-[#111827]">
                    {ch.label}
                  </span>
                  {/^\[/.test(ch.value) ? (
                    <Ph>{ch.value}</Ph>
                  ) : (
                    <Mail>{ch.value}</Mail>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[14px] font-normal leading-[1.7em] text-[#6B7280] m-0 mt-8">
              {t.rich("socialWarning", {
                email: (chunks) => <Mail>{chunks}</Mail>,
              })}
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
