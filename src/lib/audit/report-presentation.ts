import { z } from "zod";
import {
  auditObservationSchema,
  reportContentSchema,
  type AuditObservation,
  type AuditReport,
  type ReportDetail,
} from "./types";

export type AnswerPresentation = {
  id: string;
  ordinal: number;
  targetId: string;
  question: string;
  rawAnswer: string;
  /** The bound analysis detail. Spec 012 R-15's answers-only recovery passes
   * `null`: it reuses this renderer without supplying any classification. */
  detail: ReportDetail | null;
  observedAt: string;
  system: string;
  requestedModel: string;
  returnedModel: string;
  sources: {
    title: string;
    url: string;
    domain: string;
    href: string | null;
  }[];
};

export type ReportPresentation =
  | { status: "historical" }
  | {
      status: "unavailable";
      reason: "binding" | "evidence" | "references" | "measures";
    }
  | {
      status: "ready";
      report: AuditReport;
      measures: AuditReport["measures"];
      answers: AnswerPresentation[];
      references: ReadonlyMap<string, AnswerPresentation>;
    };

const count = z.number().int().min(0).max(10);
const measureSchema = z
  .object({
    overall: z.object({ appeared: count, total: z.literal(10) }),
    unbranded: z.object({ appeared: count, total: count }),
    branded: z.object({ appeared: count, total: count }),
    recommendation: z.object({ recommended: count, assessed: z.literal(10) }),
    comparison: z.object({ client_preferred: count, assessed: count }),
    information: z.object({
      confirmed: count,
      incomplete: count,
      conflicting: count,
      assessed: count,
    }),
  })
  .refine(
    (m) =>
      m.unbranded.appeared <= m.unbranded.total &&
      m.branded.appeared <= m.branded.total &&
      m.unbranded.total + m.branded.total === m.overall.total &&
      m.unbranded.appeared + m.branded.appeared === m.overall.appeared &&
      m.recommendation.recommended <= m.overall.appeared &&
      m.comparison.client_preferred <= m.comparison.assessed &&
      m.information.confirmed +
        m.information.incomplete +
        m.information.conflicting ===
        m.information.assessed,
  );

// Validate only the retained reading boundary. Empty older analysis remains
// inspectable; PR B2 owns the minimum for newly synthesized reports.
const contentSchema = reportContentSchema.extend({
  key_findings: z.array(reportContentSchema.shape.key_findings.element),
  priorities: z.array(reportContentSchema.shape.priorities.element),
});
const evidenceSchema = auditObservationSchema
  .pick({
    prompt_id: true,
    question: true,
    raw_answer: true,
    run_status: true,
    sources: true,
    system: true,
    observed_at: true,
    requested_model: true,
    returned_model: true,
  })
  .extend({
    telemetry: z.array(z.unknown()).min(1),
    sources: z.array(z.object({ title: z.string(), url: z.string() })),
  });

function answerSources(observation: AuditObservation) {
  return observation.sources.map((source) => {
    const href = retainedSourceHref(source.url);
    return {
      title: source.title,
      url: source.url,
      href,
      domain: href ? new URL(href).hostname : "",
    };
  });
}

/** Only retained, absolute HTTP(S) source URLs may navigate. Body URLs never do. */
export function retainedSourceHref(url: string): string | null {
  if (!/^https?:\/\//i.test(url) || url !== url.trim()) return null;
  try {
    const parsed = new URL(url);
    return parsed.hostname && !parsed.username && !parsed.password ? url : null;
  } catch {
    return null;
  }
}

/** A pure, transient projection. No sorting repair, evidence inference or IO. */
export function buildReportPresentation(
  report: AuditReport,
  observations: readonly AuditObservation[],
): ReportPresentation {
  if (report.provenance?.question_method !== "direct-ten")
    return { status: "historical" };
  const unavailable = (
    reason: "binding" | "evidence" | "references" | "measures",
  ): ReportPresentation => ({ status: "unavailable", reason });
  if (
    !Array.isArray(observations) ||
    !Array.isArray(report.details) ||
    observations.length !== 10 ||
    report.details.length !== 10
  )
    return unavailable("binding");
  const observationIds = observations.map((o) => o?.prompt_id);
  const detailIds = report.details.map((d) => d?.prompt_id);
  // Uniqueness is established before any Map can overwrite an entry.
  if (
    [observationIds, detailIds].some(
      (ids) =>
        ids.some((id) => typeof id !== "string" || !id.trim()) ||
        new Set(ids).size !== 10,
    )
  )
    return unavailable("binding");
  const detailIdSet = new Set(detailIds);
  if (
    observationIds.some((id) => !detailIdSet.has(id)) ||
    observationIds.some((id, index) => id !== detailIds[index])
  )
    return unavailable("binding");
  if (
    !contentSchema.safeParse(report).success ||
    observations.some(
      (o) =>
        !evidenceSchema.safeParse(o).success ||
        o.run_status !== "completed" ||
        !o.question.trim() ||
        !o.raw_answer.trim() ||
        !Number.isFinite(Date.parse(o.observed_at)),
    ) ||
    report.details.some((d) => d.run !== "completed")
  )
    return unavailable("evidence");
  const references = [
    ...report.key_findings,
    ...report.priorities,
    ...report.observed_competitors,
  ];
  if (
    references.some(
      (item) =>
        !item.evidence_prompt_ids.length ||
        item.evidence_prompt_ids.some((id) => !detailIdSet.has(id)),
    )
  )
    return unavailable("references");
  if (!measureSchema.safeParse(report.measures).success)
    return unavailable("measures");
  const detailById = new Map(report.details.map((d) => [d.prompt_id, d]));
  const answers: AnswerPresentation[] = observations.map(
    (o: AuditObservation, index) => ({
      id: o.prompt_id,
      ordinal: index + 1,
      targetId: `report-question-${index + 1}`,
      question: o.question,
      rawAnswer: o.raw_answer,
      detail: detailById.get(o.prompt_id)!,
      observedAt: o.observed_at,
      system: o.system,
      requestedModel: o.requested_model,
      returnedModel: o.returned_model,
      sources: answerSources(o),
    }),
  );
  return {
    status: "ready",
    report,
    measures: report.measures,
    answers,
    references: new Map(answers.map((a) => [a.id, a])),
  };
}

/**
 * Spec 012 R-15: the observation-only projection for the answers-only
 * recovery reader. It applies the same retained-evidence checks as the ready
 * path — ten unique bound observations, each completed with a non-empty exact
 * question and raw answer, retained telemetry, and a valid timestamp — then
 * returns answers with `detail: null`. No fake report, detail, measure, or
 * rejected synthesis is constructed, and a failed check returns null so the
 * stage can keep its ordinary failure path instead of guessing.
 */
export function buildObservationAnswers(
  observations: readonly AuditObservation[],
): AnswerPresentation[] | null {
  if (!Array.isArray(observations) || observations.length !== 10) return null;
  const ids = observations.map((o) => o?.prompt_id);
  if (
    ids.some((id) => typeof id !== "string" || !id.trim()) ||
    new Set(ids).size !== 10 ||
    observations.some(
      (o) =>
        !evidenceSchema.safeParse(o).success ||
        o.run_status !== "completed" ||
        !o.question.trim() ||
        !o.raw_answer.trim() ||
        !Number.isFinite(Date.parse(o.observed_at)),
    )
  )
    return null;
  return observations.map((o: AuditObservation, index) => ({
    id: o.prompt_id,
    ordinal: index + 1,
    targetId: `report-question-${index + 1}`,
    question: o.question,
    rawAnswer: o.raw_answer,
    detail: null,
    observedAt: o.observed_at,
    system: o.system,
    requestedModel: o.requested_model,
    returnedModel: o.returned_model,
    sources: answerSources(o),
  }));
}

/** Interpolate stored strings directly: do not normalize CRLF or whitespace. */
export function answerCopyText(answer: AnswerPresentation): string {
  return `Pertanyaan ${answer.ordinal}:\n${answer.question}\n\nJawaban model AI:\n${answer.rawAnswer}\n\nWaktu pengamatan: ${answer.observedAt}\nSistem: ${answer.system}\nModel diminta: ${answer.requestedModel}\nModel jawaban: ${answer.returnedModel}`;
}
