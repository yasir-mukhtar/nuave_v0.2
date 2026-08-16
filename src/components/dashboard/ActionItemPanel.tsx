"use client";

import { useTranslations } from "next-intl";
import { IconArrowUpRight } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { SeverityIcon } from "@/app/(dashboard)/findings/_components/severity-badge";

type ActionItem = {
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  problem_type: string;
};

type ActionItemPanelProps = {
  items: ActionItem[];
  auditId?: string;
  maxListHeight?: number;
};

const severityConfig = {
  high: { labelKey: "severity.critical" as const },
  medium: { labelKey: "severity.important" as const },
  low: { labelKey: "severity.normal" as const },
};

function formatProblemType(type: string): string {
  return type.replaceAll("_", " ").replaceAll(/\b\w/g, (c) => c.toUpperCase());
}

export default function ActionItemPanel({
  items,
  auditId,
  maxListHeight,
}: Readonly<ActionItemPanelProps>) {
  const t = useTranslations();
  return (
    <div className="border border-border-light rounded-[var(--radius-sm)] shadow-app-subtle bg-white flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-14 shrink-0 px-5">
        <span className="type-title text-text-heading">
          {t("dashboard.findings")}
        </span>
        {auditId && (
          <span className="type-body flex items-center gap-1 px-3 py-1.5 font-[var(--btn-font-weight)] text-text-heading border border-border-light rounded-[var(--radius-sm)] shadow-app-subtle hover:border-[var(--border-default)] hover:bg-gray-50 transition-colors cursor-pointer select-none">
            {t("cta.viewAll")}
            <IconArrowUpRight size={14} stroke={2} />
          </span>
        )}
      </div>

      <div className="h-px bg-border-light shrink-0" />

      {/* Items list */}
      <div
        className="scroll-subtle flex-1 min-h-0 overflow-y-auto py-1"
        style={maxListHeight ? { maxHeight: maxListHeight } : undefined}
      >
        {items.length === 0 ? (
          <div className="type-body py-6 px-5 text-center text-text-muted">
            {t("dashboard.noProblemsDetected")}
          </div>
        ) : (
          items.map((item, idx) => {
            const severity =
              severityConfig[item.severity] ?? severityConfig.low;

            return (
              <div
                key={`action-${idx}-${item.title.slice(0, 20)}`}
                className={cn(
                  "px-5 py-4",
                  idx < items.length - 1 && "border-b border-[#F3F4F6]",
                )}
              >
                {/* Number + Title */}
                <div className="flex items-start gap-2.5">
                  <span className="w-[22px] h-[22px] rounded-full bg-brand text-white flex items-center justify-center text-[11px] font-semibold shrink-0 mt-px">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="type-body font-semibold text-text-heading m-0">
                      {item.title}
                    </p>
                    <p className="type-caption text-text-muted mt-1 m-0 line-clamp-2">
                      {item.description}
                    </p>

                    {/* Badges */}
                    <div className="flex items-center gap-2 mt-2.5">
                      <span className="inline-flex items-center gap-1.5 shrink-0">
                        <SeverityIcon severity={item.severity} />
                        <span className="type-caption font-medium text-text-muted">
                          {t(severity.labelKey)}
                        </span>
                      </span>
                      {item.problem_type && (
                        <span className="type-caption inline-flex items-center gap-1 font-medium text-text-muted">
                          {formatProblemType(item.problem_type)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
