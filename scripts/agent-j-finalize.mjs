import fs from "node:fs";

function replaceOrThrow(path, before, after) {
  const current = fs.readFileSync(path, "utf8");
  if (!current.includes(before)) {
    throw new Error(`Expected source block not found in ${path}`);
  }
  fs.writeFileSync(path, current.replace(before, after));
}

replaceOrThrow(
  "src/lib/audit/openai.ts",
  'import { reportWritingInstructions } from "./report-language";',
  'import { reportAssessmentInstructions } from "./report-prompt-contract";\nimport { reportWritingInstructions } from "./report-language";',
);

replaceOrThrow(
  "src/lib/audit/openai.ts",
  `          "not_assessed is reserved for FAILED tests only: when an observation's run_status is failed, set recommendation, comparison, and information all to not_assessed. For every COMPLETED observation all three dimensions must be assessed.",
          "For a COMPLETED observation, set recommendation to recommended only for an explicit suggestion or endorsement in the answer; otherwise set not_recommended (never not_assessed). A factual answer, contact path, or mere mention is not a recommendation.",
          "For a COMPLETED observation, use comparison client_preferred, competitor_preferred, or compared_no_preference only when the answer compares the audited brand with another named business; when the answer makes no comparison use not_observed (never not_assessed).",
          "For a COMPLETED observation, use information confirmed, incomplete, or conflicting only when the answer assesses a public fact about the audited brand; otherwise use not_assessed (this applies to the information dimension only).",`,
  "          ...reportAssessmentInstructions(),",
);

replaceOrThrow(
  "src/lib/audit/report-pipeline.test.ts",
  `  it("blocks evidence errors without a retry", async () => {
    const invalid = goldenReportContent();
    invalid.priorities[0].evidence_prompt_ids = [goldenPrompts[6].prompt_id];
    const generate = vi.fn(async () =>
      result(invalid, "response-invalid"),
    ) as unknown as ReportGenerator;

    await expect(
      createValidatedAuditReport(input, generate),
    ).rejects.toMatchObject({ status: 422, telemetry: expect.any(Array) });
    expect(generate).toHaveBeenCalledTimes(1);
  });`,
  `  it("contains an unsupported priority without a retry", async () => {
    const draft = goldenReportContent();
    const removedEvidenceId = goldenPrompts[6].prompt_id;
    draft.priorities[0].evidence_prompt_ids = [removedEvidenceId];
    const expectedSurvivors = draft.priorities.slice(1).map((priority, index) => ({
      ...priority,
      order: index + 1,
    }));
    const generate = vi.fn(async () =>
      result(draft, "response-contained"),
    ) as unknown as ReportGenerator;

    const report = await createValidatedAuditReport(input, generate);

    expect(report.priorities).toEqual(expectedSurvivors);
    expect(
      report.priorities.some((priority) =>
        priority.evidence_prompt_ids.includes(removedEvidenceId),
      ),
    ).toBe(false);
    expect(generate).toHaveBeenCalledTimes(1);
  });`,
);

replaceOrThrow(
  "src/lib/audit/report-priority.test.ts",
  ").rejects.toMatchObject<Partial<ReportPipelineError>>({",
  ").rejects.toMatchObject({",
);

replaceOrThrow(
  "src/lib/audit/questions-id-live.ts",
  `  const providerFailed =
    (httpCall !== null && httpCall.status >= 400) || selectedSource === "fallback";`,
  `  const providerFailed =
    (httpCall !== null && httpCall.status >= 400) ||
    (suggestion.source === "fallback" && !semanticFallbackUsed);`,
);

replaceOrThrow(
  "src/lib/audit/questions-id-live.ts",
  `    failure_reason: providerFailed
      ? semanticFallbackUsed
        ? "Provider question generation returned an unsafe candidate; the deterministic Indonesian fallback was used."
        : "Provider question generation failed; the deterministic Indonesian fallback was used."
      : "",`,
  `    failure_reason: providerFailed
      ? "Provider question generation failed; the deterministic Indonesian fallback was used."
      : "",`,
);

replaceOrThrow(
  "src/lib/audit/live-reliability-regression.test.ts",
  `    expect(result.telemetry).toHaveLength(1);`,
  `    expect(result.telemetry).toHaveLength(1);
    expect(result.telemetry[0].status).toBe("completed");
    expect(result.telemetry[0].accounted_cost_usd).toBeGreaterThan(0);
    expect(result.budget.calls).toHaveLength(1);`,
);

const stagesPath = "src/app/audit/AuditStages.tsx";
const stages = fs.readFileSync(stagesPath, "utf8");
const runStepStart = stages.indexOf("\nexport function RunStep({");
if (runStepStart === -1) {
  throw new Error(`Expected legacy RunStep not found in ${stagesPath}`);
}
fs.writeFileSync(stagesPath, `${stages.slice(0, runStepStart).trimEnd()}\n`);
