import { validateReportContent } from "./contracts";
import type {
  AuditObservation,
  BusinessBrief,
  ReportContent,
} from "./types";

function observedGapError(order: number) {
  return `Priority ${order} is not tied to an observed gap.`;
}

/**
 * Uses the existing final validator as the authority for the observed-gap
 * predicate. Unknown prompt IDs are deliberately preserved so the final
 * integrity validator can reject them rather than silently repairing evidence.
 */
function priorityIsSupported(
  priority: ReportContent["priorities"][number],
  content: ReportContent,
  observations: AuditObservation[],
  brief: BusinessBrief,
) {
  const knownIds = new Set(observations.map((item) => item.prompt_id));
  if (priority.evidence_prompt_ids.some((id) => !knownIds.has(id))) return true;

  const errors = validateReportContent(
    { ...content, priorities: [priority] },
    observations,
    brief,
  );
  return !errors.includes(observedGapError(priority.order));
}

export type ReportPrioritySanitization = {
  content: ReportContent;
  removed_orders: number[];
};

/**
 * Drops only model-authored priorities whose known evidence fails the exact
 * observed-gap rule enforced by validateReportContent. Surviving actions keep
 * their original order and evidence IDs, then receive contiguous display
 * numbering. No observations or result classifications are mutated.
 */
export function sanitizeUnsupportedReportPriorities(
  content: ReportContent,
  observations: AuditObservation[],
  brief: BusinessBrief,
): ReportPrioritySanitization {
  const removedOrders: number[] = [];
  const surviving = content.priorities.filter((priority) => {
    const supported = priorityIsSupported(priority, content, observations, brief);
    if (!supported) removedOrders.push(priority.order);
    return supported;
  });
  const priorities = surviving.map((priority, index) => ({
    ...priority,
    order: index + 1,
  }));

  return {
    content: { ...content, priorities },
    removed_orders: removedOrders,
  };
}
