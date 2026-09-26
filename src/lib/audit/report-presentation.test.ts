import { describe, expect, it } from "vitest";
import {
  buildObservationAnswers,
  buildReportPresentation,
  answerCopyText,
} from "./report-presentation";
import { presentationFixture } from "./report-presentation.fixture";
import type { AuditReport, AuditObservation } from "./types";

const unavailable = (report: AuditReport, observations: AuditObservation[]) => {
  expect(buildReportPresentation(report, observations).status).toBe(
    "unavailable",
  );
};

describe("direct-ten presentation binding (before UI)", () => {
  it("joins unique non-lexical IDs, preserving exact strings, order and both frozen inputs", () => {
    const { report, observations } = presentationFixture();
    const before = JSON.stringify({ report, observations });
    function freeze(value: object) {
      Object.values(value).forEach((v) => {
        if (v && typeof v === "object") freeze(v);
      });
      Object.freeze(value);
    }
    freeze(report);
    freeze(observations);
    const result = buildReportPresentation(report, observations);
    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw Error("Expected ready");
    expect(result.answers.map((a) => a.id)).toEqual(
      observations.map((o) => o.prompt_id),
    );
    result.answers.forEach((a, i) => {
      expect(a.ordinal).toBe(i + 1);
      expect(a.question).toBe(observations[i].question);
      expect(a.rawAnswer).toBe(observations[i].raw_answer);
      expect(a.detail).toBe(report.details[i]);
    });
    expect(new Set(result.answers.map((a) => a.targetId)).size).toBe(10);
    expect(JSON.stringify({ report, observations })).toBe(before);
    expect(answerCopyText(result.answers[0])).toContain(
      observations[0].question,
    );
    expect(answerCopyText(result.answers[0])).toContain(
      observations[0].raw_answer,
    );
    expect(answerCopyText(result.answers[0])).toContain(
      observations[0].returned_model,
    );
    expect(answerCopyText(result.answers[0])).not.toContain(
      report.provenance.returned_report_model,
    );
  });

  it.each(["canonical", "glm-indonesian-slots", undefined] as const)(
    "routes %s to history even with ten direct-ten-looking IDs",
    (method) => {
      const { report, observations } = presentationFixture();
      Object.assign(report.provenance, { question_method: method });
      expect(buildReportPresentation(report, observations)).toEqual({
        status: "historical",
      });
    },
  );

  it.each(["observation", "detail"])("rejects missing %s", (side) => {
    const { report, observations } = presentationFixture();
    if (side === "observation") observations.pop();
    else report.details.pop();
    unavailable(report, observations);
  });
  it.each(["observation", "detail"])(
    "rejects duplicate %s IDs before mapping",
    (side) => {
      const { report, observations } = presentationFixture();
      const items = side === "observation" ? observations : report.details;
      items[1].prompt_id = items[0].prompt_id;
      unavailable(report, observations);
    },
  );
  it.each(["observation", "detail"])("rejects an extra %s", (side) => {
    const { report, observations } = presentationFixture();
    if (side === "observation")
      observations.push({ ...observations[0], prompt_id: "extra" });
    else report.details.push({ ...report.details[0], prompt_id: "extra" });
    unavailable(report, observations);
  });
  it.each(["observation", "detail"])("rejects an unknown %s ID", (side) => {
    const { report, observations } = presentationFixture();
    (side === "observation" ? observations : report.details)[2].prompt_id =
      "unknown";
    unavailable(report, observations);
  });
  it.each(["observation", "detail"])(
    "rejects independently reordered %s without sorting",
    (side) => {
      const { report, observations } = presentationFixture();
      (side === "observation" ? observations : report.details).reverse();
      unavailable(report, observations);
    },
  );
  it.each(["question", "raw_answer"] as const)(
    "rejects missing/blank %s without substituting the excerpt",
    (field) => {
      for (const value of [undefined, "", " \r\n "]) {
        const { report, observations } = presentationFixture();
        Object.assign(observations[0], { [field]: value });
        unavailable(report, observations);
      }
    },
  );
  it.each(["observation", "detail", "telemetry"])(
    "rejects an unusable %s",
    (side) => {
      const { report, observations } = presentationFixture();
      if (side === "observation") observations[0].run_status = "failed";
      if (side === "detail") report.details[0].run = "failed";
      if (side === "telemetry") observations[0].telemetry = [];
      unavailable(report, observations);
    },
  );
  it.each(["key_findings", "priorities", "observed_competitors"] as const)(
    "rejects invalid or empty %s references",
    (field) => {
      for (const refs of [["unknown"], [], ["q-z", "unknown"]]) {
        const { report, observations } = presentationFixture();
        report[field][0].evidence_prompt_ids = refs;
        unavailable(report, observations);
      }
    },
  );
  it("retains every reference and actual comparator relationship; allows older empty analysis", () => {
    const { report, observations } = presentationFixture();
    const result = buildReportPresentation(report, observations);
    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw Error("Expected ready");
    expect(result.report.observed_competitors).toEqual(
      report.observed_competitors,
    );
    expect(result.references.get("q-z")?.ordinal).toBe(1);
    expect(result.references.get("q-a")?.ordinal).toBe(2);
    report.key_findings = [];
    report.priorities = [];
    report.observed_competitors = [];
    expect(buildReportPresentation(report, observations).status).toBe("ready");
  });
  it("reads 1/10 recommendation from measures despite nine unassessed details, without interpreting prose", () => {
    const { report, observations } = presentationFixture();
    const result = buildReportPresentation(report, observations);
    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw Error("Expected ready");
    expect(result.measures.recommendation).toEqual({
      recommended: 1,
      assessed: 10,
    });
    expect(
      result.answers.filter((a) => a.detail?.recommendation === "not_assessed"),
    ).toHaveLength(9);
  });
  it.each([0, 1, 9, 11, -1, 1.5, NaN, Infinity])(
    "rejects corrupt direct-ten denominator %s",
    (value) => {
      for (const dimension of ["overall", "recommendation"] as const) {
        const { report, observations } = presentationFixture();
        if (dimension === "overall") report.measures.overall.total = value;
        else report.measures.recommendation.assessed = value;
        unavailable(report, observations);
      }
    },
  );
  it.each([-1, 11, 0.5, NaN, Infinity])("rejects numerator %s", (value) => {
    const { report, observations } = presentationFixture();
    report.measures.overall.appeared = value;
    unavailable(report, observations);
  });
  it("rejects missing measure shape and internally inconsistent measure ranges", () => {
    const { report, observations } = presentationFixture();
    for (const patch of [
      { recommendation: undefined },
      { branded: { appeared: 1, total: 0 } },
      {
        information: {
          confirmed: 1,
          incomplete: 1,
          conflicting: 1,
          assessed: 2,
        },
      },
    ]) {
      unavailable(
        {
          ...report,
          measures: { ...report.measures, ...patch },
        } as AuditReport,
        observations,
      );
    }
  });
  it("keeps safe sources active and unsafe/relative URLs inert, with exact URL text", () => {
    const { report, observations } = presentationFixture();
    observations[0].sources = [
      "https://source.example/path",
      "http://source.example/path",
      "javascript:alert(1)",
      "//source.example",
      "data:text/html,hello",
      "https://user:pass@source.example/",
    ].map((url) => ({ url, title: "Sumber tersimpan" }));
    const result = buildReportPresentation(report, observations);
    if (result.status !== "ready") throw Error("Expected ready");
    expect(result.answers[0].sources.map((s) => s.href)).toEqual([
      "https://source.example/path",
      "http://source.example/path",
      null,
      null,
      null,
      null,
    ]);
    expect(result.answers[0].sources.map((s) => s.url)).toEqual(
      observations[0].sources.map((s) => s.url),
    );
  });
  it("does not leak a fictional restricted-data marker from an invalid saved binding", () => {
    const { report, observations } = presentationFixture();
    observations[0].raw_answer =
      "[FICTIONAL PERSONAL-DATA MARKER — restricted; do not render]";
    observations[0].run_status = "failed";
    const result = buildReportPresentation(report, observations);
    expect(result.status).toBe("unavailable");
    expect(JSON.stringify(result)).not.toContain("PERSONAL-DATA MARKER");
  });
});

describe("observation-only projection (Spec 012 R-15 answers-only recovery)", () => {
  it("returns ten exact questions/answers with null detail — no analysis surface", () => {
    const { observations } = presentationFixture();
    const answers = buildObservationAnswers(observations);
    expect(answers).toHaveLength(10);
    answers?.forEach((answer, index) => {
      expect(answer.id).toBe(observations[index].prompt_id);
      expect(answer.ordinal).toBe(index + 1);
      expect(answer.question).toBe(observations[index].question);
      expect(answer.rawAnswer).toBe(observations[index].raw_answer);
      // The recovery view must never surface a classification.
      expect(answer.detail).toBeNull();
      expect(answer.sources.map((s) => s.url)).toEqual(
        observations[index].sources.map((s) => s.url),
      );
    });
    // Copy behavior reuses the ready path's exact-question/full-answer text.
    expect(answerCopyText(answers![0])).toContain(observations[0].question);
    expect(answerCopyText(answers![0])).toContain(observations[0].raw_answer);
  });

  it.each([
    "missing",
    "extra",
    "duplicate",
    "failed-run",
    "blank-question",
    "blank-answer",
    "bad-time",
  ] as const)("returns null instead of guessing on %s", (defect) => {
    const { observations } = presentationFixture();
    if (defect === "missing") observations.pop();
    if (defect === "extra")
      observations.push({ ...observations[0], prompt_id: "extra" });
    if (defect === "duplicate")
      observations[1].prompt_id = observations[0].prompt_id;
    if (defect === "failed-run") observations[0].run_status = "failed";
    if (defect === "blank-question") observations[0].question = "  ";
    if (defect === "blank-answer") observations[0].raw_answer = "";
    if (defect === "bad-time") observations[0].observed_at = "not-a-date";
    expect(buildObservationAnswers(observations)).toBeNull();
  });
});
