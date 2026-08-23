import type { AuditObservation, ReportContent } from "./types";

export function exactReportExcerptErrors(
  content: ReportContent,
  observations: AuditObservation[],
): string[] {
  const observationById = new Map(
    observations.map((observation) => [observation.prompt_id, observation]),
  );
  const errors: string[] = [];

  content.details.forEach((detail) => {
    const observation = observationById.get(detail.prompt_id);
    if (!observation) return;
    const excerpt = detail.answer_excerpt;
    if (observation.run_status === "completed" && !excerpt.trim()) {
      errors.push(`${detail.prompt_id} is missing an exact answer excerpt.`);
      return;
    }
    if (excerpt && !observation.raw_answer.includes(excerpt)) {
      errors.push(
        `${detail.prompt_id} has an answer excerpt that is not copied exactly from the raw response.`,
      );
    }
  });

  return errors;
}
