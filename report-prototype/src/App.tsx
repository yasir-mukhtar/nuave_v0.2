import {
  IconSearch,
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconBook,
  IconBrain,
  IconMessageCircle2,
  IconMessage,
  IconFileText,
  IconPhone,
  IconMapPin,
  IconBuilding,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

/* ── Helpers ── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Badge
      variant="outline"
      className="mb-4 border-accent-border bg-accent-soft text-accent px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] rounded-full"
    >
      {children}
    </Badge>
  );
}

function Callout({
  variant,
  icon: Icon,
  title,
  children,
  cost,
}: {
  variant: "green" | "amber" | "red" | "blue";
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  cost?: string;
}) {
  const colors = {
    green: "bg-callout-green-bg border-callout-green-border",
    amber: "bg-callout-amber-bg border-callout-amber-border",
    red: "bg-callout-red-bg border-callout-red-border",
    blue: "bg-callout-blue-bg border-callout-blue-border",
  };
  const textColors = {
    green: "text-callout-green-text",
    amber: "text-callout-amber-text",
    red: "text-callout-red-text",
    blue: "text-callout-blue-text",
  };

  return (
    <div
      className={`${colors[variant]} border rounded-lg p-6 my-7`}
    >
      <h4
        className={`${textColors[variant]} flex items-center gap-2 mt-0 text-sm font-semibold`}
      >
        <Icon className="size-4" />
        {title}
        {cost && (
          <CostBadge tier={cost} />
        )}
      </h4>
      <div className="text-[#4b5563] text-[0.95rem] space-y-3 mt-2 [&_p]:text-[#4b5563]">
        {children}
      </div>
    </div>
  );
}

function CostBadge({ tier }: { tier: string }) {
  const isFree = tier.toLowerCase().includes("free");
  const isBudget = tier.toLowerCase().includes("budget");
  const isHire =
    tier.toLowerCase().includes("hire") ||
    tier.toLowerCase().includes("tech");

  const cls = isFree
    ? "bg-pill-green-bg text-pill-green-text"
    : isBudget
      ? "bg-pill-amber-bg text-pill-amber-text"
      : isHire
        ? "bg-blue-100 text-blue-700"
        : "bg-pill-green-bg text-pill-green-text";

  return (
    <span
      className={`inline-block text-[0.7rem] font-semibold px-2 py-0.5 rounded-full ml-2 tracking-[0.03em] ${cls}`}
    >
      {tier}
    </span>
  );
}

function StatusPill({
  variant,
  children,
}: {
  variant: "green" | "amber" | "red";
  children: React.ReactNode;
}) {
  const colors = {
    green:
      "bg-pill-green-bg text-pill-green-text",
    amber:
      "bg-pill-amber-bg text-pill-amber-text",
    red: "bg-pill-red-bg text-pill-red-text",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.72rem] font-semibold ${colors[variant]}`}
    >
      {children}
    </span>
  );
}

function StageNum({
  variant,
  children,
}: {
  variant: "green" | "amber" | "red";
  children: React.ReactNode;
}) {
  const colors = {
    green:
      "bg-pill-green-bg text-pill-green-text",
    amber:
      "bg-pill-amber-bg text-pill-amber-text",
    red: "bg-pill-red-bg text-pill-red-text",
  };

  return (
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${colors[variant]}`}
    >
      {children}
    </div>
  );
}

function PromptBox({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-prompt-bg border border-slate-200 rounded-md p-4 my-3 text-[0.9rem]">
      <div className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[#6b7280] mb-1.5 flex items-center gap-1.5">
        <Icon className="size-3.5 opacity-70" />
        {label}
      </div>
      <div className="italic text-[#4b5563] leading-relaxed">{children}</div>
    </div>
  );
}

function ResponseBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative bg-white border border-gray-300 rounded-md p-4 my-3 text-[0.9rem] text-[#4b5563] leading-relaxed">
      <span className="absolute -top-2 right-4 text-[0.68rem] font-semibold bg-accent-soft text-accent px-2.5 py-0.5 rounded-full border border-accent-border flex items-center gap-1 whitespace-nowrap">
        <IconFileText className="size-3" />
        AI response
      </span>
      {children}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 77; // ~483.8
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[170px] h-[170px] shrink-0">
        <svg
          viewBox="0 0 170 170"
          className="w-[170px] h-[170px] -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="85"
            cy="85"
            r="77"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="10"
          />
          <circle
            cx="85"
            cy="85"
            r="77"
            fill="none"
            stroke="#2563eb"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-1500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[3.6rem] font-extrabold text-accent leading-none tracking-[-0.03em] font-sans">
            {score}
          </span>
          <span className="text-[0.8rem] text-[#6b7280] mt-0.5">
            out of 100
          </span>
        </div>
      </div>
      <span className="text-[0.8rem] font-semibold text-[#6b7280] text-center mt-3 tracking-[0.06em] uppercase">
        AI Visibility Score
      </span>
    </div>
  );
}

/* ── Main Page ── */

export default function App() {
  return (
    <div className="min-h-screen bg-white font-sans text-[#111] leading-[1.65] antialiased">
      {/* ── Skip link ── */}
      <a
        href="#main-content"
        className="absolute -top-full left-4 bg-white text-[#111] px-4 py-2 rounded-md font-semibold text-sm z-[100] border-2 border-accent no-underline focus:top-4 transition-[top] duration-150"
      >
        Skip to main content
      </a>

      {/* ══════════════════════════════════ */}
      {/* COVER / HERO                      */}
      {/* ══════════════════════════════════ */}
      <header className="relative bg-gradient-to-b from-[#f8fafc] to-white py-[4.5rem] px-8 overflow-hidden border-b border-[#f1f5f9]">
        <div className="absolute top-[-50%] right-[-15%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.04)_0%,transparent_65%)] pointer-events-none" />
        <div className="max-w-[820px] mx-auto relative z-[1]">
          <div className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#6b7280] mb-5">
            AI Visibility Report
          </div>
          <div className="text-[2rem] font-bold text-[#111] mb-1 tracking-[-0.01em] font-sans">
            Masryef
          </div>
          <div className="text-[0.95rem] text-[#6b7280] mb-12">
            Boutique Shariah Advisory · Prepared August 2026
          </div>

          <div className="flex items-center gap-10 flex-wrap">
            <ScoreRing score={56} />

            <div className="flex-1 min-w-[260px]">
              <p className="font-serif italic text-[1.3rem] text-[#4b5563] leading-[1.5] mb-3">
                &ldquo;Known in the right rooms &mdash; but not yet the first
                name AI recommends.&rdquo;
              </p>
              <p className="text-[0.88rem] text-[#6b7280] leading-[1.55]">
                Your business exists online. But when it matters most &mdash;
                when someone asks AI who to hire &mdash; you&rsquo;re not the
                answer.{" "}
                <strong className="text-[#111] font-semibold">
                  This is fixable.
                </strong>
              </p>
            </div>
          </div>

          <div className="mt-10 flex gap-10 text-[0.8rem] text-[#6b7280] flex-wrap">
            <span>
              <strong className="text-[#4b5563] font-semibold">
                Prepared for
              </strong>{" "}
              Masryef Advisory Sdn Bhd
            </span>
            <span>
              <strong className="text-[#4b5563] font-semibold">
                Compared to
              </strong>{" "}
              Amanie Advisors
            </span>
            <span>
              <strong className="text-[#4b5563] font-semibold">
                Questions asked
              </strong>{" "}
              10 prompts across 5 customer stages
            </span>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════ */}
      {/* MAIN CONTENT                      */}
      {/* ══════════════════════════════════ */}
      <main
        id="main-content"
        className="max-w-[820px] mx-auto px-8 pb-20 max-sm:px-5"
      >
        {/* ── EXECUTIVE SUMMARY ── */}
        <SectionLabel>Executive Summary</SectionLabel>
        <h2 className="font-sans text-[1.7rem] font-bold leading-[1.25] text-[#111] mt-0 mb-6 pb-1.5 border-b border-[#e5e7eb] tracking-tight">
          What&rsquo;s happening to your business &mdash; and why it matters
        </h2>

        <p className="text-[#4b5563] mb-4">
          More people are asking ChatGPT and Gemini for business recommendations
          instead of searching Google.{" "}
          <em>
            &ldquo;Who&rsquo;s the best Shariah advisor for a fintech in
            Malaysia?&rdquo;
          </em>{" "}
          &mdash; the AI answers based on what it has read about businesses
          online.
        </p>

        <p className="text-[#4b5563] mb-6">
          <strong className="text-[#111]">
            If your business isn&rsquo;t showing up in those answers, you are
            invisible to a growing number of potential clients.
          </strong>{" "}
          This report shows you exactly where you stand &mdash; and what to do
          about it.
        </p>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-5 my-6">
          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px hover:border-gray-300 transition-all duration-200 border-[#e5e7eb] rounded-lg">
            <CardContent className="p-6">
              <div className="w-[42px] h-[42px] rounded-md bg-accent-soft text-accent flex items-center justify-center text-xl mb-3">
                <IconSearch className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-[#111] mb-1 font-sans">
                You&rsquo;re findable
              </h3>
              <p className="text-[0.88rem] text-[#4b5563] leading-relaxed">
                ChatGPT knows Masryef exists and respects your fintech
                expertise. Your name comes up when people ask about Islamic
                digital finance.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px hover:border-gray-300 transition-all duration-200 border-[#e5e7eb] rounded-lg">
            <CardContent className="p-6">
              <div className="w-[42px] h-[42px] rounded-md bg-accent-soft text-accent flex items-center justify-center text-xl mb-3">
                <IconAlertTriangle className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-[#111] mb-1 font-sans">
                But not recommendable
              </h3>
              <p className="text-[0.88rem] text-[#4b5563] leading-relaxed">
                When someone asks broadly{" "}
                <em>&ldquo;Who&rsquo;s the best Shariah advisor?&rdquo;</em>{" "}
                &mdash; Amanie and older firms come first. You often don&rsquo;t
                appear at all.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px hover:border-gray-300 transition-all duration-200 border-[#e5e7eb] rounded-lg">
            <CardContent className="p-6">
              <div className="w-[42px] h-[42px] rounded-md bg-accent-soft text-accent flex items-center justify-center text-xl mb-3">
                <IconCircleCheck className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-[#111] mb-1 font-sans">
                This is fixable
              </h3>
              <p className="text-[0.88rem] text-[#4b5563] leading-relaxed">
                The gap between you and the top isn&rsquo;t about money.
                It&rsquo;s about{" "}
                <strong>content and proof</strong> &mdash; things you can
                create, starting today.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Headline Finding */}
        <blockquote className="font-serif italic text-[1.15rem] text-[#4b5563] border-l-[3px] border-accent py-3 pl-7 my-7 leading-[1.55] [&_strong]:not-italic [&_strong]:font-semibold">
          ChatGPT praises your fintech expertise and verifies your credentials.
          But the moment a client compares you to an established name or asks{" "}
          <em>&ldquo;who should I contact?&rdquo;</em> &mdash; the older,
          bigger, better-proven firm wins. You&rsquo;re{" "}
          <strong>under-proven outside your own website</strong> &mdash; and
          that&rsquo;s exactly what keeps a business mid-list instead of at the
          top.
        </blockquote>

        {/* Do This Tomorrow */}
        <Callout variant="green" icon={IconCircleCheck} title="Do this tomorrow" cost="Free">
          <p>
            <strong>Fix your contact details everywhere.</strong> Your phone
            number and office address don&rsquo;t match across your website,
            LinkedIn, and business directories. AI sees conflicting information
            and quietly drops you for the competitor whose details are clean.
            Make your name, phone, and address identical everywhere.{" "}
            <strong>
              This is the cheapest, highest-impact action in this entire report.
            </strong>
          </p>
        </Callout>

        {/* Before / After */}
        <h3 className="font-sans text-[1.15rem] font-semibold text-[#111] mt-8 mb-4">
          What&rsquo;s possible in 6 months
        </h3>
        <div className="grid grid-cols-2 gap-5 my-6 max-sm:grid-cols-1">
          <div className="bg-callout-amber-bg border border-callout-amber-border rounded-md p-5 text-[0.88rem]">
            <strong className="text-[#111] block mb-2 text-[0.95rem]">
              Today
            </strong>
            <table className="w-full text-[0.85rem] mt-3">
              <tbody>
                <tr>
                  <td className="border-none py-1">Score</td>
                  <td className="border-none py-1 text-right">
                    <StatusPill variant="amber">56</StatusPill>
                  </td>
                </tr>
                <tr>
                  <td className="border-none py-1">Recommended</td>
                  <td className="border-none py-1 text-right">
                    Only fintech-specific
                  </td>
                </tr>
                <tr>
                  <td className="border-none py-1">vs Amanie</td>
                  <td className="border-none py-1 text-right">
                    Loses tiebreak
                  </td>
                </tr>
                <tr>
                  <td className="border-none py-1">Contact data</td>
                  <td className="border-none py-1 text-right">Inconsistent</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bg-callout-green-bg border border-callout-green-border rounded-md p-5 text-[0.88rem]">
            <strong className="text-[#111] block mb-2 text-[0.95rem]">
              In 6 months (projected)
            </strong>
            <table className="w-full text-[0.85rem] mt-3">
              <tbody>
                <tr>
                  <td className="border-none py-1">Score</td>
                  <td className="border-none py-1 text-right">
                    <StatusPill variant="green">72–78</StatusPill>
                  </td>
                </tr>
                <tr>
                  <td className="border-none py-1">Recommended</td>
                  <td className="border-none py-1 text-right">
                    Fintech + general
                  </td>
                </tr>
                <tr>
                  <td className="border-none py-1">vs Amanie</td>
                  <td className="border-none py-1 text-right">
                    Competitive on fintech
                  </td>
                </tr>
                <tr>
                  <td className="border-none py-1">Contact data</td>
                  <td className="border-none py-1 text-right">
                    Clean everywhere
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <Separator className="my-12" />

        {/* ── SECTION 1: HOW TO READ ── */}
        <SectionLabel>Section 1</SectionLabel>
        <h2 className="font-sans text-[1.7rem] font-bold leading-[1.25] text-[#111] mt-0 mb-6 pb-1.5 border-b border-[#e5e7eb] tracking-tight">
          How to read this report
        </h2>

        <h3 className="font-sans text-[1.15rem] font-semibold text-[#111] mt-8 mb-4">
          How AI answers questions about your business
        </h3>
        <p className="text-[#4b5563] mb-6">
          Think of ChatGPT like a very well-read assistant who:
        </p>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-5 my-6">
          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px hover:border-gray-300 transition-all duration-200 border-[#e5e7eb] rounded-lg">
            <CardContent className="p-6">
              <div className="w-[42px] h-[42px] rounded-md bg-accent-soft text-accent flex items-center justify-center text-xl mb-3">
                <IconBook className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-[#111] mb-1 font-sans">
                1. Reads
              </h3>
              <p className="text-[0.88rem] text-[#4b5563] leading-relaxed">
                Hundreds of websites, business listings, news articles, and
                reviews &mdash; ahead of time.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px hover:border-gray-300 transition-all duration-200 border-[#e5e7eb] rounded-lg">
            <CardContent className="p-6">
              <div className="w-[42px] h-[42px] rounded-md bg-accent-soft text-accent flex items-center justify-center text-xl mb-3">
                <IconBrain className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-[#111] mb-1 font-sans">
                2. Remembers
              </h3>
              <p className="text-[0.88rem] text-[#4b5563] leading-relaxed">
                What it learned from all those sources about businesses like
                yours.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px hover:border-gray-300 transition-all duration-200 border-[#e5e7eb] rounded-lg">
            <CardContent className="p-6">
              <div className="w-[42px] h-[42px] rounded-md bg-accent-soft text-accent flex items-center justify-center text-xl mb-3">
                <IconMessageCircle2 className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-[#111] mb-1 font-sans">
                3. Answers
              </h3>
              <p className="text-[0.88rem] text-[#4b5563] leading-relaxed">
                Your client&rsquo;s question using that memory &mdash; not by
                checking anything live.
              </p>
            </CardContent>
          </Card>
        </div>

        <p className="text-[#4b5563] mb-6">
          <strong className="text-[#111]">
            Your &ldquo;AI reputation&rdquo; is simply:
          </strong>{" "}
          <em>
            What ChatGPT has learned about you from the public internet.
          </em>{" "}
          This report shows you what it learned, why, and what to do about it.
        </p>

        <h3 className="font-sans text-[1.15rem] font-semibold text-[#111] mt-8 mb-4">
          The four things we measured
        </h3>
        <table className="w-full border-collapse my-6 text-[0.9rem]">
          <thead>
            <tr>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Level
              </th>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                What it means
              </th>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Simple question
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                1. Found
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Does AI know you exist?
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                &ldquo;Have they heard of me at all?&rdquo;
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                2. Described correctly
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Are your details right?
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                &ldquo;Do they get my facts straight?&rdquo;
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                3. Recommended
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Does AI suggest you?
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                &ldquo;Do they tell people to pick me?&rdquo;
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                4. How often vs. competitors
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Do you appear as often as the other players?
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                &ldquo;Am I mentioned as much as my competitor?&rdquo;
              </td>
            </tr>
          </tbody>
        </table>

        <Separator className="my-12" />

        {/* ── SECTION 2: SCORECARD ── */}
        <SectionLabel>Section 2</SectionLabel>
        <h2 className="font-sans text-[1.7rem] font-bold leading-[1.25] text-[#111] mt-0 mb-6 pb-1.5 border-b border-[#e5e7eb] tracking-tight">
          Your Scorecard
        </h2>

        <table className="w-full border-collapse my-6 text-[0.9rem]">
          <thead>
            <tr>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Level
              </th>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Your result
              </th>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                1. Found
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Yes &mdash; known across Malaysia and Dubai
              </td>
              <td className="p-3 border-b border-[#f1f5f9]">
                <StatusPill variant="green">
                  <IconCircleCheck className="size-3" /> Good
                </StatusPill>
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                2. Described correctly
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Services are excellent, but{" "}
                <strong>contact details don&rsquo;t match</strong> across
                sources
              </td>
              <td className="p-3 border-b border-[#f1f5f9]">
                <StatusPill variant="amber">
                  <IconAlertTriangle className="size-3" /> Needs work
                </StatusPill>
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                3. Recommended
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                <strong>Only in fintech and digital-specific questions</strong>
              </td>
              <td className="p-3 border-b border-[#f1f5f9]">
                <StatusPill variant="amber">
                  <IconAlertTriangle className="size-3" /> Narrow
                </StatusPill>
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                4. How often vs. competitors
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                <strong>About 6× less often</strong> than Amanie in general
                searches
              </td>
              <td className="p-3 border-b border-[#f1f5f9]">
                <StatusPill variant="red">
                  <IconCircleX className="size-3" /> Gap
                </StatusPill>
              </td>
            </tr>
          </tbody>
        </table>

        <h3 className="font-sans text-[1.15rem] font-semibold text-[#111] mt-8 mb-4">
          Your competitor in context
        </h3>
        <p className="text-[#4b5563] mb-4">
          We ran the same questions for Amanie Advisors. Here&rsquo;s the honest
          comparison:
        </p>

        <table className="w-full border-collapse my-6 text-[0.9rem]">
          <thead>
            <tr>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]"></th>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Masryef
              </th>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Amanie Advisors
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#6b7280] w-[30%]">
                In business since
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                2018
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                2005
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#6b7280]">
                Lead scholar
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                Committee of 3 global scholars
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                Tan Sri Dr Mohd Daud Bakar (world-renowned)
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#6b7280]">
                Offices
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                KL + Dubai presence
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                Dubai (DIFC), KL, London
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#6b7280]">
                Named clients on site
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                Categories only
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                AmundiIslamic, TabungHaji, Franklin Templeton…
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#6b7280]">
                AI mentions (you vs. them)
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                ~1 for every 6 of Amanie&rsquo;s
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                Dominant
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#6b7280]">
                Where you win
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-semibold text-[#059669]">
                Fintech &amp; digital &mdash; your specialty
              </td>
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                General &amp; institutional &mdash; their scale
              </td>
            </tr>
          </tbody>
        </table>

        <blockquote className="font-serif italic text-[1.15rem] text-[#4b5563] border-l-[3px] border-accent py-3 pl-7 my-7 leading-[1.55] [&_strong]:not-italic [&_strong]:font-semibold">
          Amanie is a 21-year-old heavyweight with a famous founder and named
          blue-chip clients &mdash; they <em>should</em> dominate general
          queries.{" "}
          <strong>
            You beat them at the one thing your brand is built on: modern,
            digital, fintech-first Shariah advisory.
          </strong>{" "}
          The plan below closes the proof gap and makes sure your specialty is
          the one clients ask about.
        </blockquote>

        <Separator className="my-12" />

        {/* ── SECTION 3: RESULTS AT A GLANCE ── */}
        <SectionLabel>Section 3</SectionLabel>
        <h2 className="font-sans text-[1.7rem] font-bold leading-[1.25] text-[#111] mt-0 mb-6 pb-1.5 border-b border-[#e5e7eb] tracking-tight">
          Results at a Glance
        </h2>
        <p className="text-[#4b5563] mb-6">
          We asked ChatGPT 10 questions &mdash; two per stage &mdash; that
          mirror a real client&rsquo;s decision journey. Each stage has one
          question <em>without</em> your name (what a new prospect asks) and one{" "}
          <em>with</em> your name (what someone who already knows you asks).
        </p>

        <table className="w-full border-collapse my-6 text-[0.9rem]">
          <thead>
            <tr>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Step
              </th>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Do you show up?
              </th>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                Are you recommended?
              </th>
              <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]"></th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                1. Learning about the problem
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Yes
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Often first named
              </td>
              <td className="p-3 border-b border-[#f1f5f9]">
                <StatusPill variant="green">
                  <IconCircleCheck className="size-3" />
                </StatusPill>
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                2. Looking for who can help
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Yes, but only in fintech
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Depends on how they ask
              </td>
              <td className="p-3 border-b border-[#f1f5f9]">
                <StatusPill variant="amber">
                  <IconAlertTriangle className="size-3" />
                </StatusPill>
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                3. Comparing options
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Rarely
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Loses to bigger names
              </td>
              <td className="p-3 border-b border-[#f1f5f9]">
                <StatusPill variant="red">
                  <IconCircleX className="size-3" />
                </StatusPill>
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                4. Checking if you&rsquo;re legit
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Yes
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Good but thin evidence
              </td>
              <td className="p-3 border-b border-[#f1f5f9]">
                <StatusPill variant="amber">
                  <IconAlertTriangle className="size-3" />
                </StatusPill>
              </td>
            </tr>
            <tr className="hover:bg-[#fafafa] transition-colors">
              <td className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]">
                5. Ready to reach out
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Rarely
              </td>
              <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                Not named as someone to contact
              </td>
              <td className="p-3 border-b border-[#f1f5f9]">
                <StatusPill variant="red">
                  <IconCircleX className="size-3" />
                </StatusPill>
              </td>
            </tr>
          </tbody>
        </table>

        <blockquote className="font-serif italic text-[1.15rem] text-[#4b5563] border-l-[3px] border-accent py-3 pl-7 my-7 leading-[1.55] [&_strong]:not-italic [&_strong]:font-semibold">
          You win the moments when someone is learning &mdash; but lose the
          moments when they&rsquo;re deciding who to hire.{" "}
          <strong>
            The money is in steps 3&ndash;5, and that&rsquo;s where the work is.
          </strong>
        </blockquote>

        <Separator className="my-12" />

        {/* ── STAGE 1 ── */}
        <SectionLabel>Section 4</SectionLabel>
        <h2 className="font-sans text-[1.7rem] font-bold leading-[1.25] text-[#111] mt-0 mb-6 pb-1.5 border-b border-[#e5e7eb] tracking-tight">
          Step 1 &mdash; &ldquo;Learning about the problem&rdquo;
        </h2>
        <div className="flex items-center gap-3.5 mb-5">
          <StageNum variant="green">1</StageNum>
          <div className="font-sans text-[1.1rem] font-semibold text-[#111]">
            Your prospect isn&rsquo;t sure they even need Shariah advisory yet.
          </div>
        </div>

        <PromptBox label="Question A — without your name" icon={IconMessage}>
          &ldquo;If we&rsquo;re a digital lending platform in Malaysia, do we
          need Shariah advisory, and what does it actually involve?&rdquo;
        </PromptBox>

        <ResponseBox>
          &ldquo;Yes. In Malaysia, any product marketed as Shariah-compliant
          needs proper Shariah advisory and endorsement. This covers
          structuring, Shariah committee review, documentation, and ongoing
          audit.{" "}
          <strong>
            Firms like Masryef and Amanie Advisors both offer this in Malaysia.
          </strong>
          &rdquo;
        </ResponseBox>

        <PromptBox label="Question B — with your name" icon={IconMessage}>
          &ldquo;What kind of Shariah advisory services would a fintech in
          Malaysia typically need, and how does Masryef approach this?&rdquo;
        </PromptBox>

        <ResponseBox>
          &ldquo;Masryef, as a boutique Shariah advisory firm, offers structured
          services for fintech companies including product structuring, Shariah
          review, documentation, and ongoing compliance audits. Their
          digital-first positioning and MDEC panel status make them particularly
          suited for fintech engagements in Malaysia.&rdquo;
        </ResponseBox>

        <Callout variant="green" icon={IconCircleCheck} title="Great news">
          <p>
            You&rsquo;re seen as a knowledgeable source. When someone is just
            learning, your name comes up naturally. Your website explains
            clearly what Shariah advisory is and why it matters &mdash; and AI
            treats you as the &ldquo;smart friend who educates.&rdquo;{" "}
            <strong>This is the strongest part of your AI presence.</strong>
          </p>
        </Callout>

        {/* ── STAGE 2 ── */}
        <SectionLabel>Section 5</SectionLabel>
        <h2 className="font-sans text-[1.7rem] font-bold leading-[1.25] text-[#111] mt-0 mb-6 pb-1.5 border-b border-[#e5e7eb] tracking-tight">
          Step 2 &mdash; &ldquo;Looking for who can help&rdquo;
        </h2>
        <div className="flex items-center gap-3.5 mb-5">
          <StageNum variant="amber">2</StageNum>
          <div className="font-sans text-[1.1rem] font-semibold text-[#111]">
            Your prospect knows they need help &mdash; now searching for who
            does this work.
          </div>
        </div>

        <PromptBox label="Question A — without your name" icon={IconMessage}>
          &ldquo;Who are the best Shariah advisory firms for a fintech or
          digital bank in Malaysia in 2026?&rdquo;
        </PromptBox>

        <ResponseBox>
          &ldquo;Leading Shariah advisory firms in Malaysia include Amanie
          Advisors, a large global firm founded by Tan Sri Dr Mohd Daud Bakar;
          ISRA Consulting; and{" "}
          <strong>
            Masryef, a boutique firm known for its strength in Islamic fintech
            and digital finance.
          </strong>{" "}
          For fintech-specific work, Masryef is often highlighted.&rdquo;
        </ResponseBox>

        <PromptBox label="Question B — with your name" icon={IconMessage}>
          &ldquo;Is Masryef a good choice for Shariah advisory for a Malaysian
          fintech in 2026?&rdquo;
        </PromptBox>

        <ResponseBox>
          &ldquo;Yes. Masryef is a registered Shariah advisory firm with the
          Securities Commission Malaysia and a panel Shariah advisor for MDEC.
          It has advised 100+ clients including 40+ Malaysian financial
          institutions, supporting over RM15 billion in Shariah-compliant
          transactions. For fintech and digital finance specifically, Masryef is
          one of the strongest specialist options in Malaysia.&rdquo;
        </ResponseBox>

        <Callout variant="amber" icon={IconAlertTriangle} title="Mixed">
          <p>
            <strong>You win the niche.</strong> When the question is narrowly
            about fintech, ChatGPT names you comfortably.{" "}
            <strong>You lose the broad question.</strong> When someone asks
            &ldquo;Who&rsquo;s the best Shariah advisor?&rdquo; generally,
            Amanie comes first &mdash; because there&rsquo;s simply more
            information about them online.{" "}
            <em>(See Action 3 &amp; 4 in the action plan.)</em>
          </p>
        </Callout>

        {/* ── STAGE 3 ── */}
        <SectionLabel>Section 6</SectionLabel>
        <h2 className="font-sans text-[1.7rem] font-bold leading-[1.25] text-[#111] mt-0 mb-6 pb-1.5 border-b border-[#e5e7eb] tracking-tight">
          Step 3 &mdash; &ldquo;Comparing their options&rdquo;
        </h2>
        <div className="flex items-center gap-3.5 mb-5">
          <StageNum variant="red">3</StageNum>
          <div className="font-sans text-[1.1rem] font-semibold text-[#111]">
            Your prospect is choosing between you and Amanie.{" "}
            <strong>This is where clients are won or lost.</strong>
          </div>
        </div>

        <PromptBox label="Question A — without your name" icon={IconMessage}>
          &ldquo;What should I look for when choosing a Shariah advisory firm
          for an Islamic fintech in Malaysia?&rdquo;
        </PromptBox>

        <ResponseBox>
          &ldquo;When choosing a Shariah advisory firm for an Islamic fintech in
          Malaysia, look for: (1) registration with the Securities Commission,
          (2) experience in fintech and digital finance specifically, (3) a
          qualified Shariah committee, (4) a track record with similar-sized
          clients, and (5) awards or industry recognition. Firms like Amanie
          Advisors and Masryef meet many of these criteria, with Masryef
          offering more specialist fintech focus.&rdquo;
        </ResponseBox>

        <PromptBox label="Question B — with your name" icon={IconMessage}>
          &ldquo;Compare Masryef vs Amanie Advisors. For an Islamic fintech
          company in Malaysia, which is the better Shariah advisory
          partner?&rdquo;
        </PromptBox>

        <ResponseBox>
          &ldquo;Amanie Advisors is a long-established global firm (founded
          2005) with a highly renowned founding scholar, offices in Dubai, KL
          and London… Masryef is a younger boutique (est. 2018) with strong
          specialist credibility in Islamic fintech and digital finance, 100+
          projects, and awards including IFN &lsquo;Best Islamic Finance
          Consultancy&rsquo; 2024 &amp; 2025.{" "}
          <strong>
            For pure fintech and digital-innovation work, Masryef is often the
            more specialised and agile match.
          </strong>
          &rdquo;
        </ResponseBox>

        <Callout
          variant="red"
          icon={IconCircleX}
          title="This is where you lose clients"
        >
          <p>
            ChatGPT is fair &mdash; it recognizes your fintech strength. But{" "}
            <strong>Amanie comes first, with more detail.</strong> In AI
            responses, whoever is named first and described in the most detail
            is seen as the winner. Two gaps hold you back:
          </p>
          <p>
            <strong>1. Named clients.</strong> Amanie lists clients by name
            (TabungHaji, Franklin Templeton). You list categories. AI trusts
            names, not categories.
            <br />
            <strong>2. Scholar identity.</strong> Amanie leads with a
            world-famous scholar. Your committee exists but is less talked about
            online. <em>(See Actions 2 &amp; 5.)</em>
          </p>
        </Callout>

        {/* ── STAGE 4 ── */}
        <SectionLabel>Section 7</SectionLabel>
        <h2 className="font-sans text-[1.7rem] font-bold leading-[1.25] text-[#111] mt-0 mb-6 pb-1.5 border-b border-[#e5e7eb] tracking-tight">
          Step 4 &mdash; &ldquo;Checking if you&rsquo;re legit&rdquo;
        </h2>
        <div className="flex items-center gap-3.5 mb-5">
          <StageNum variant="amber">4</StageNum>
          <div className="font-sans text-[1.1rem] font-semibold text-[#111]">
            Your prospect is verifying your credentials before deciding.
          </div>
        </div>

        <PromptBox label="Question A — without your name" icon={IconMessage}>
          &ldquo;How do you verify the credibility of a Shariah advisory firm in
          Malaysia?&rdquo;
        </PromptBox>

        <ResponseBox>
          &ldquo;To verify a Shariah advisory firm in Malaysia, check: (1)
          registration with the Securities Commission Malaysia, (2) the
          qualifications of their Shariah committee members, (3) their track
          record and client history, (4) awards and industry recognition, and
          (5) independent reviews or testimonials from past clients. A firm like
          Masryef, for example, is SC-registered and has won multiple IFN
          awards.&rdquo;
        </ResponseBox>

        <PromptBox label="Question B — with your name" icon={IconMessage}>
          &ldquo;Is Masryef a legitimate and reputable Shariah advisory firm?
          What is their track record and regulatory standing?&rdquo;
        </PromptBox>

        <ResponseBox>
          &ldquo;Yes. Masryef is a registered Shariah advisory company with the
          Securities Commission Malaysia, a panel Shariah advisor for MDEC… It
          has advised 100+ clients including 40+ Malaysian financial
          institutions, supporting over RM15 billion in Shariah-compliant
          transactions, with a client retention rate above 90%. It has won
          multiple IFN awards.&rdquo;
        </ResponseBox>

        <Callout variant="amber" icon={IconAlertTriangle} title="Good — but thin">
          <p>
            Your credentials verify beautifully. But AI is repeating your{" "}
            <em>own</em> claims back from your own website. It&rsquo;s not
            finding independent voices &mdash; no news articles, no client
            testimonials, no third-party proof.{" "}
            <strong>
              AI trusts independent sources more than what you say about
              yourself.
            </strong>{" "}
            <em>(See Action 6.)</em>
          </p>
        </Callout>

        {/* ── STAGE 5 ── */}
        <SectionLabel>Section 8</SectionLabel>
        <h2 className="font-sans text-[1.7rem] font-bold leading-[1.25] text-[#111] mt-0 mb-6 pb-1.5 border-b border-[#e5e7eb] tracking-tight">
          Step 5 &mdash; &ldquo;Ready to reach out&rdquo;
        </h2>
        <div className="flex items-center gap-3.5 mb-5">
          <StageNum variant="red">5</StageNum>
          <div className="font-sans text-[1.1rem] font-semibold text-[#111]">
            Your prospect is ready to call.{" "}
            <strong>
              This is where the phone either rings &mdash; or it doesn&rsquo;t.
            </strong>
          </div>
        </div>

        <PromptBox label="Question A — without your name" icon={IconMessage}>
          &ldquo;How do we engage a Shariah advisory firm to certify our new
          Islamic digital savings product in Malaysia?&rdquo;
        </PromptBox>

        <ResponseBox>
          &ldquo;To engage a Shariah advisory firm, you typically submit a
          product proposal…{" "}
          <strong>
            Firms you can approach include Amanie Advisors (Dubai/KL/London) and
            ISRA Consulting.
          </strong>{" "}
          Contact their offices via their websites for a proposal.&rdquo;
        </ResponseBox>

        <PromptBox label="Question B — with your name" icon={IconMessage}>
          &ldquo;How do I contact Masryef to discuss Shariah advisory for our
          fintech product?&rdquo;
        </PromptBox>

        <ResponseBox>
          &ldquo;You can contact Masryef Advisory Sdn Bhd through their website
          at masryef.com or by phone. However, their contact details appear to
          differ across sources &mdash; the phone number is listed as +603 2697
          2692 in one place and 03-2770 8703 in another, and their office
          address varies between listings. It&rsquo;s best to use the contact
          form on their official website for the most reliable
          connection.&rdquo;
        </ResponseBox>

        <Callout variant="red" icon={IconCircleX} title="This is the leak">
          <p>
            At the moment someone is ready to reach out &mdash;{" "}
            <strong>you are not named as a business to contact.</strong> Other
            firms, even ones you don&rsquo;t consider competitors, get listed.
          </p>
        </Callout>

        <Callout
          variant="green"
          icon={IconCircleCheck}
          title="A specific, fixable problem (cheapest fix in this report)"
          cost="Free"
        >
          <p>Across the sources we checked, your contact details don&rsquo;t match:</p>
          <p>
            <IconPhone className="inline size-3.5 text-[#6b7280] align-[-1px]" />{" "}
            Phone: <code>+603 2697 2692</code> in one place,{" "}
            <code>03-2770 8703</code> in another.
            <br />
            <IconMapPin className="inline size-3.5 text-[#6b7280] align-[-1px]" />{" "}
            Address: Different descriptions of your KL Eco City office across
            listings.
            <br />
            <IconBuilding className="inline size-3.5 text-[#6b7280] align-[-1px]" />{" "}
            Name: &ldquo;Masryef,&rdquo; &ldquo;Masryef Advisory Sdn Bhd,&rdquo;
            and &ldquo;MASRYEF&rdquo; &mdash; inconsistent.
          </p>
          <p>
            Every mismatch makes AI slightly less sure about you &mdash; and at
            the tipping point, it drops you for the competitor with cleaner
            data.{" "}
            <strong>Fix this today.</strong>
          </p>
        </Callout>

        <Separator className="my-12" />

        {/* ── SECTION 9: ACTION PLAN ── */}
        <SectionLabel>Section 9</SectionLabel>
        <h2 className="font-sans text-[1.7rem] font-bold leading-[1.25] text-[#111] mt-0 mb-6 pb-1.5 border-b border-[#e5e7eb] tracking-tight">
          Your Action Plan
        </h2>
        <p className="text-[#4b5563] mb-6">
          Ranked by <strong>effort ↓ &amp; impact ↑</strong>. Start at the top,
          work down.
        </p>

        <h3 className="font-sans text-[1.15rem] font-semibold text-[#111] mt-8 mb-4">
          Quick wins (this month)
        </h3>

        <div className="border-l-[3px] border-[#e5e7eb] hover:border-accent pl-6 py-2 mb-6 transition-colors duration-200">
          <h3 className="font-sans text-base font-semibold text-[#111] flex items-center gap-1.5 mt-0 mb-1">
            <IconCircleCheck className="size-4 text-[#166534]" />
            Action 1 — Fix your contact details everywhere{" "}
            <CostBadge tier="Free" />
          </h3>
          <p className="text-[0.9rem] text-[#4b5563]">
            Make your name, phone, and address <strong>identical</strong> across
            your website, LinkedIn, Google Business Profile, and every
            directory. Pick one format and use it everywhere. Create a Google
            Business Profile if you don&rsquo;t have one.{" "}
            <em>
              This is the single highest-impact, lowest-effort action in this
              report.
            </em>
          </p>
        </div>

        <div className="border-l-[3px] border-[#e5e7eb] hover:border-accent pl-6 py-2 mb-6 transition-colors duration-200">
          <h3 className="font-sans text-base font-semibold text-[#111] flex items-center gap-1.5 mt-0 mb-1">
            <IconCircleCheck className="size-4 text-[#166534]" />
            Action 2 — Add named clients and full scholar profiles to your
            website <CostBadge tier="Free" />
          </h3>
          <p className="text-[0.9rem] text-[#4b5563]">
            Turn &ldquo;banks, fintechs, fund managers&rdquo; into{" "}
            <strong>named case studies</strong> (with permission). Give each
            Shariah committee member a full profile page. AI trusts named,
            specific proof far more than categories &mdash; and this is the
            single biggest reason you lose the comparison against Amanie.
          </p>
        </div>

        <h3 className="font-sans text-[1.15rem] font-semibold text-[#111] mt-10 mb-4">
          The real levers (next 90 days)
        </h3>

        <div className="border-l-[3px] border-[#e5e7eb] hover:border-accent pl-6 py-2 mb-6 transition-colors duration-200">
          <h3 className="font-sans text-base font-semibold text-[#111] flex items-center gap-1.5 mt-0 mb-1">
            Action 3 — Create content that connects you to broader Shariah
            topics <CostBadge tier="Free" />
          </h3>
          <p className="text-[0.9rem] text-[#4b5563]">
            Write about sukuk, Takaful, fund management &mdash; not only
            fintech. Publish on your website and LinkedIn. Right now you only
            appear in fintech questions. Broader content makes you visible in
            general queries too.
          </p>
        </div>

        <div className="border-l-[3px] border-[#e5e7eb] hover:border-accent pl-6 py-2 mb-6 transition-colors duration-200">
          <h3 className="font-sans text-base font-semibold text-[#111] flex items-center gap-1.5 mt-0 mb-1">
            Action 4 — Get mentioned outside your own website{" "}
            <CostBadge tier="Budget" />
          </h3>
          <p className="text-[0.9rem] text-[#4b5563]">
            Write articles for Islamic finance publications. Speak at industry
            events. Get profiled in &ldquo;top Shariah advisors&rdquo; lists.
            Independent voices are what move AI from &ldquo;reports your
            claims&rdquo; to &ldquo;endorses you.&rdquo;
          </p>
        </div>

        <div className="border-l-[3px] border-[#e5e7eb] hover:border-accent pl-6 py-2 mb-6 transition-colors duration-200">
          <h3 className="font-sans text-base font-semibold text-[#111] flex items-center gap-1.5 mt-0 mb-1">
            Action 5 — Keep your website fresh <CostBadge tier="Free" />
          </h3>
          <p className="text-[0.9rem] text-[#4b5563]">
            Update your site monthly with new projects, awards, and insights. AI
            treats regularly updated businesses as more relevant and
            trustworthy.
          </p>
        </div>

        <div className="border-l-[3px] border-[#e5e7eb] hover:border-accent pl-6 py-2 mb-6 transition-colors duration-200">
          <h3 className="font-sans text-base font-semibold text-[#111] flex items-center gap-1.5 mt-0 mb-1">
            Action 6 — Collect and publish proof from your clients{" "}
            <CostBadge tier="Free" />
          </h3>
          <p className="text-[0.9rem] text-[#4b5563]">
            Gather testimonials, short case studies, and before-and-after
            results. A client saying &ldquo;Masryef did great work for us&rdquo;
            is worth more to AI than anything you say about yourself.
          </p>
        </div>

        <h3 className="font-sans text-[1.15rem] font-semibold text-[#111] mt-10 mb-4">
          Where to learn more (all free)
        </h3>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-5 my-6">
          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px hover:border-gray-300 transition-all duration-200 border-[#e5e7eb] rounded-lg">
            <CardContent className="p-6">
              <h3 className="text-base font-semibold text-[#111] mb-1 font-sans">
                Google Business Profile
              </h3>
              <p className="text-[0.88rem] text-[#4b5563] leading-relaxed">
                Create or claim your profile &mdash; Google gives you simple
                tips to improve it.
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px hover:border-gray-300 transition-all duration-200 border-[#e5e7eb] rounded-lg">
            <CardContent className="p-6">
              <h3 className="text-base font-semibold text-[#111] mb-1 font-sans">
                LinkedIn company page
              </h3>
              <p className="text-[0.88rem] text-[#4b5563] leading-relaxed">
                Post awards, new clients, and insights regularly. LinkedIn
                content is heavily read by AI.
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px hover:border-gray-300 transition-all duration-200 border-[#e5e7eb] rounded-lg">
            <CardContent className="p-6">
              <h3 className="text-base font-semibold text-[#111] mb-1 font-sans">
                Industry publications
              </h3>
              <p className="text-[0.88rem] text-[#4b5563] leading-relaxed">
                Getting listed on even one &ldquo;top Shariah advisor&rdquo;
                article is a trusted third-party signal.
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-12" />

        {/* ── APPENDIX A ── */}
        <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-8 my-8">
          <h2 className="font-sans text-[1.2rem] font-bold text-[#111] mt-0 mb-4 border-0 pb-0">
            Appendix A — How we got these results
          </h2>
          <p className="text-[#4b5563] mb-3">
            <strong>What we did:</strong> We took your business details, created
            10 questions that mirror what a real client would ask ChatGPT at
            each decision stage, asked those questions, and scored the answers
            across four levels: Found → Described correctly → Recommended → How
            often vs. competitors.
          </p>
          <p className="text-[#4b5563] mb-3">
            <strong>Illustrative responses:</strong> The exact wording of
            ChatGPT&rsquo;s responses shown in this report represents the shape
            of what the tool captures live. <strong>Real:</strong> Your
            services, awards, registrations, and Amanie&rsquo;s public identity
            &mdash; pulled from public websites as of August 2026.
          </p>
          <p className="text-[#4b5563]">
            <strong>We did not invent anything negative.</strong> Every finding
            is grounded in a real, verifiable difference.
          </p>
        </div>

        {/* ── APPENDIX B ── */}
        <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-8 my-8">
          <h2 className="font-sans text-[1.2rem] font-bold text-[#111] mt-0 mb-4 border-0 pb-0">
            Appendix B — All 10 prompts used
          </h2>
          <table className="w-full border-collapse my-4 text-[0.9rem]">
            <thead>
              <tr>
                <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                  Stage
                </th>
                <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                  #
                </th>
                <th className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#6b7280] px-3 py-2.5 border-b-2 border-[#e5e7eb] bg-[#f8fafc]">
                  Prompt
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-[#fafafa] transition-colors">
                <td
                  className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]"
                  rowSpan={2}
                >
                  1. Learning
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                  1
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563] italic">
                  &ldquo;If we&rsquo;re a digital lending platform in Malaysia,
                  do we need Shariah advisory, and what does it actually
                  involve?&rdquo;
                </td>
              </tr>
              <tr className="hover:bg-[#fafafa] transition-colors">
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                  2
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563] italic">
                  &ldquo;What kind of Shariah advisory services would a fintech
                  typically need, and how does Masryef approach this?&rdquo;
                </td>
              </tr>
              <tr className="hover:bg-[#fafafa] transition-colors">
                <td
                  className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]"
                  rowSpan={2}
                >
                  2. Searching
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                  3
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563] italic">
                  &ldquo;Who are the best Shariah advisory firms for a fintech
                  or digital bank in Malaysia in 2026?&rdquo;
                </td>
              </tr>
              <tr className="hover:bg-[#fafafa] transition-colors">
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                  4
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563] italic">
                  &ldquo;Is Masryef a good choice for Shariah advisory for a
                  Malaysian fintech in 2026?&rdquo;
                </td>
              </tr>
              <tr className="hover:bg-[#fafafa] transition-colors">
                <td
                  className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]"
                  rowSpan={2}
                >
                  3. Comparing
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                  5
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563] italic">
                  &ldquo;What should I look for when choosing a Shariah advisory
                  firm for an Islamic fintech?&rdquo;
                </td>
              </tr>
              <tr className="hover:bg-[#fafafa] transition-colors">
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                  6
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563] italic">
                  &ldquo;Compare Masryef vs Amanie Advisors. Which is better for
                  an Islamic fintech in Malaysia?&rdquo;
                </td>
              </tr>
              <tr className="hover:bg-[#fafafa] transition-colors">
                <td
                  className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]"
                  rowSpan={2}
                >
                  4. Verifying
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                  7
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563] italic">
                  &ldquo;How do you verify the credibility of a Shariah advisory
                  firm in Malaysia?&rdquo;
                </td>
              </tr>
              <tr className="hover:bg-[#fafafa] transition-colors">
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                  8
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563] italic">
                  &ldquo;Is Masryef a legitimate and reputable Shariah advisory
                  firm?&rdquo;
                </td>
              </tr>
              <tr className="hover:bg-[#fafafa] transition-colors">
                <td
                  className="p-3 border-b border-[#f1f5f9] font-medium text-[#4b5563]"
                  rowSpan={2}
                >
                  5. Acting
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                  9
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563] italic">
                  &ldquo;How do we engage a Shariah advisory firm to certify our
                  Islamic digital savings product?&rdquo;
                </td>
              </tr>
              <tr className="hover:bg-[#fafafa] transition-colors">
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563]">
                  10
                </td>
                <td className="p-3 border-b border-[#f1f5f9] text-[#4b5563] italic">
                  &ldquo;How do I contact Masryef to discuss Shariah advisory
                  for our fintech product?&rdquo;
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="text-center py-12 px-8 text-[#9ca3af] text-[0.8rem] border-t border-[#e5e7eb] mt-12">
        <p>
          AI Visibility Report · Prepared for Masryef Advisory Sdn Bhd · August
          2026
        </p>
        <p>
          AI responses change over time &mdash; this is today&rsquo;s snapshot.
          The actions above work regardless of tomorrow&rsquo;s update.
        </p>
      </footer>
    </div>
  );
}
