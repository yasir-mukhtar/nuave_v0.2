import type { AuditObservation, ReportContent } from "./types";

/**
 * Derives a bounded excerpt without rewriting any character inside the retained
 * answer. Leading/trailing whitespace may be trimmed, but line breaks, repeated
 * spaces, bullets, punctuation, and CRLF sequences remain byte-for-byte
 * faithful to the raw answer.
 */
export function exactAnswerExcerpt(rawAnswer: string, maxLength = 320) {
  const answer = rawAnswer.trim();
  if (!answer) return "";

  const firstSentence = answer.match(/^[\s\S]*?[.!?](?=\s|$)/)?.[0].trim();
  if (firstSentence && firstSentence.length <= maxLength) return firstSentence;
  if (answer.length <= maxLength) return answer;

  const clipped = answer.slice(0, maxLength);
  let boundary = -1;
  for (let index = clipped.length - 1; index >= 0; index -= 1) {
    if (/\s/.test(clipped[index])) {
      boundary = index;
      break;
    }
  }
  return clipped.slice(0, boundary > 0 ? boundary : maxLength).trimEnd();
}

export function repairExactReportExcerpts(
  content: ReportContent,
  observations: AuditObservation[],
): { content: ReportContent; repaired_prompt_ids: string[] } {
  const observationById = new Map(
    observations.map((observation) => [observation.prompt_id, observation]),
  );
  const repaired: string[] = [];
  const details = content.details.map((detail) => {
    const observation = observationById.get(detail.prompt_id);
    if (!observation || observation.run_status !== "completed") return detail;

    const candidate = detail.answer_excerpt.trim();
    if (candidate && observation.raw_answer.includes(candidate)) {
      return candidate === detail.answer_excerpt
        ? detail
        : { ...detail, answer_excerpt: candidate };
    }

    repaired.push(detail.prompt_id);
    return {
      ...detail,
      answer_excerpt: exactAnswerExcerpt(observation.raw_answer),
    };
  });

  return {
    content: { ...content, details },
    repaired_prompt_ids: repaired,
  };
}

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
