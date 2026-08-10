import { Badge } from "@/components/ui/badge";
import { IconFileText } from "@tabler/icons-react";

/* ── Shared UI components for the report (used by EN and ID versions) ── */

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Badge
      variant="outline"
      className="mb-4 border-accent-border bg-accent-soft text-accent px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] rounded-full"
    >
      {children}
    </Badge>
  );
}

export function Callout({
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
    <div className={`${colors[variant]} border rounded-lg p-6 my-7`}>
      <h4
        className={`${textColors[variant]} flex items-center gap-2 mt-0 text-sm font-semibold`}
      >
        <Icon className="size-4" />
        {title}
        {cost && <CostBadge tier={cost} />}
      </h4>
      <div className="text-[#4b5563] text-[0.95rem] space-y-3 mt-2 [&_p]:text-[#4b5563]">
        {children}
      </div>
    </div>
  );
}

export function CostBadge({ tier }: { tier: string }) {
  const isFree = tier.toLowerCase().includes("free");
  const isBudget = tier.toLowerCase().includes("budget");
  const isHire =
    tier.toLowerCase().includes("hire") || tier.toLowerCase().includes("tech");

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

export function StatusPill({
  variant,
  children,
}: {
  variant: "green" | "amber" | "red";
  children: React.ReactNode;
}) {
  const colors = {
    green: "bg-pill-green-bg text-pill-green-text",
    amber: "bg-pill-amber-bg text-pill-amber-text",
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

export function StageNum({
  variant,
  children,
}: {
  variant: "green" | "amber" | "red";
  children: React.ReactNode;
}) {
  const colors = {
    green: "bg-pill-green-bg text-pill-green-text",
    amber: "bg-pill-amber-bg text-pill-amber-text",
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

export function PromptBox({
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

export function ResponseBox({
  children,
  label = "AI response",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <div className="relative bg-white border border-gray-300 rounded-md p-4 my-3 text-[0.9rem] text-[#4b5563] leading-relaxed">
      <span className="absolute -top-2 right-4 text-[0.68rem] font-semibold bg-accent-soft text-accent px-2.5 py-0.5 rounded-full border border-accent-border flex items-center gap-1 whitespace-nowrap">
        <IconFileText className="size-3" />
        {label}
      </span>
      {children}
    </div>
  );
}

export function ScoreRing({
  score,
  outOfLabel = "out of 100",
  scoreLabel = "AI Visibility Score",
}: {
  score: number;
  outOfLabel?: string;
  scoreLabel?: string;
}) {
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
            {outOfLabel}
          </span>
        </div>
      </div>
      <span className="text-[0.8rem] font-semibold text-[#6b7280] text-center mt-3 tracking-[0.06em] uppercase">
        {scoreLabel}
      </span>
    </div>
  );
}
