"use client";

import { AgentProgress } from "@/components/agents/loading-states/agent-progress";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const DEFAULT_TOTAL = 10;

type AuditProgressProps = {
  completed: number;
  total?: number;
  reporting?: boolean;
  className?: string;
};

/**
 * Product progress for the audit run. Determinate progress is derived only
 * from completed observations; report generation is intentionally indeterminate.
 */
export function AuditProgress({
  completed,
  total = DEFAULT_TOTAL,
  reporting = false,
  className,
}: AuditProgressProps) {
  const percentage =
    total > 0 ? Math.min(100, Math.max(0, (completed / total) * 100)) : 0;

  if (reporting) {
    return (
      <div
        className={cn(
          "w-full rounded-lg border border-border bg-muted/30 p-4",
          className,
        )}
        aria-live="polite"
      >
        <AgentProgress
          label="Creating report"
          className="w-full justify-between"
        />
      </div>
    );
  }

  return (
    <Progress
      value={percentage}
      max={100}
      aria-label="Audit progress"
      className={cn(
        "w-full gap-2 rounded-lg border border-border bg-card p-4",
        "[&_[data-slot=progress-indicator]]:bg-[var(--green)]",
        className,
      )}
    >
      <ProgressLabel>Audit progress</ProgressLabel>
      <ProgressValue>{() => `${completed} of ${total} complete`}</ProgressValue>
    </Progress>
  );
}
