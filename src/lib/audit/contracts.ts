import type {
  AuditObservation,
  AuditPrompt,
  AuditReport,
  BusinessBrief,
  ReportContent,
} from "./types";

export const PROMPT_CONTRACT_VERSION = "draft-v1";

export const PROMPT_MATRIX = [
  [
    "NUAVE-BRAND-NEED-01",
    "need_discovery",
    false,
    "Explore one verified need without naming a brand",
  ],
  [
    "NUAVE-BRAND-NEED-02",
    "need_discovery",
    false,
    "Explore a different verified need without naming a brand",
  ],
  [
    "NUAVE-BRAND-SOLUTION-01",
    "solution_discovery",
    false,
    "Find relevant category options in the market context",
  ],
  [
    "NUAVE-BRAND-SOLUTION-02",
    "solution_discovery",
    false,
    "Find options for one verified offering or use case",
  ],
  [
    "NUAVE-BRAND-COMPARISON-01",
    "comparison",
    false,
    "Compare unnamed category options using verified criteria",
  ],
  [
    "NUAVE-BRAND-COMPARISON-02",
    "comparison",
    true,
    "Compare the brand with one verified competitor",
  ],
  [
    "NUAVE-BRAND-VALIDATION-01",
    "validation",
    true,
    "Verify category fit, offering, or an important public fact",
  ],
  [
    "NUAVE-BRAND-VALIDATION-02",
    "validation",
    true,
    "Verify identity, scope, market, or information consistency",
  ],
  [
    "NUAVE-BRAND-ACTION-01",
    "action",
    true,
    "Ask about a practical next step or access path",
  ],
  [
    "NUAVE-BRAND-ACTION-02",
    "action",
    true,
    "Ask about another verified decision or conversion detail",
  ],
] as const;

function normalize(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim();
}

export function validatePromptPack(
  prompts: AuditPrompt[],
  brief: BusinessBrief,
) {
  const errors: string[] = [];
  if (prompts.length !== 10)
    errors.push("Paket harus berisi tepat 10 pertanyaan.");

  PROMPT_MATRIX.forEach(([id, category, branded, role], index) => {
    const prompt = prompts[index];
    if (!prompt) return;
    if (prompt.prompt_id !== id)
      errors.push(`ID pertanyaan ${index + 1} tidak sesuai.`);
    if (prompt.category !== category)
      errors.push(`Kategori ${id} tidak sesuai.`);
    if (prompt.branded !== branded)
      errors.push(`Status branded ${id} tidak sesuai.`);
    if (prompt.role !== role) errors.push(`Peran ${id} tidak sesuai.`);
    if (!prompt.question.trim()) errors.push(`Pertanyaan ${id} kosong.`);
  });

  const brandSignals = [brief.brand_name, ...brief.brand_name_variants]
    .map(normalize)
    .filter((value) => value.length >= 3);
  prompts
    .filter((prompt) => !prompt.branded)
    .forEach((prompt) => {
      const question = normalize(prompt.question);
      if (brandSignals.some((signal) => question.includes(signal))) {
        errors.push(`${prompt.prompt_id} membocorkan nama atau varian brand.`);
      }
    });

  const counts = new Map<string, number>();
  prompts.forEach((prompt) =>
    counts.set(prompt.category, (counts.get(prompt.category) ?? 0) + 1),
  );
  for (const category of [
    "need_discovery",
    "solution_discovery",
    "comparison",
    "validation",
    "action",
  ]) {
    if (counts.get(category) !== 2)
      errors.push(`Kategori ${category} harus memiliki dua pertanyaan.`);
  }
  if (prompts.filter((prompt) => prompt.branded).length !== 5) {
    errors.push(
      "Paket harus berisi lima pertanyaan branded dan lima unbranded.",
    );
  }
  return errors;
}

export function validateReportContent(
  content: ReportContent,
  observations: AuditObservation[],
  brief: BusinessBrief,
): string[] {
  const errors: string[] = [];
  const promptIds = new Set(observations.map((item) => item.prompt_id));
  const validateIds = (ids: string[], label: string) => {
    ids.forEach((id) => {
      if (!promptIds.has(id))
        errors.push(`${label} merujuk pertanyaan yang tidak ada: ${id}.`);
    });
  };
  content.key_findings.forEach((finding) =>
    validateIds(finding.evidence_prompt_ids, "Temuan"),
  );
  content.priorities.forEach((priority) =>
    validateIds(priority.evidence_prompt_ids, "Prioritas"),
  );
  if (
    new Set(content.details.map((detail) => detail.prompt_id)).size !==
    observations.length
  ) {
    errors.push("Setiap pertanyaan harus memiliki tepat satu temuan detail.");
  }
  const brandSignals = [brief.brand_name, ...brief.brand_name_variants]
    .map(normalize)
    .filter(Boolean);
  content.details.forEach((detail, index) => {
    if (!promptIds.has(detail.prompt_id))
      errors.push(`Temuan detail tidak dikenal: ${detail.prompt_id}.`);
    const observation = observations.find(
      (item) => item.prompt_id === detail.prompt_id,
    );
    if (!observation) return;
    if (detail.prompt_id !== observations[index]?.prompt_id) {
      errors.push(
        `Urutan temuan detail tidak sesuai pada ${detail.prompt_id}.`,
      );
    }
    if (
      observation.run_status === "failed" &&
      detail.status !== "could_not_be_tested"
    ) {
      errors.push(
        `${detail.prompt_id} gagal tetapi tidak ditandai tidak dapat diuji.`,
      );
    }
    const claimsBrandAppeared = [
      "appeared_as_recommendation",
      "mentioned_not_recommended",
      "incomplete_information",
      "conflicting_information",
    ].includes(detail.status);
    const normalizedAnswer = normalize(observation.raw_answer);
    if (
      claimsBrandAppeared &&
      !brandSignals.some((signal) => normalizedAnswer.includes(signal))
    ) {
      errors.push(
        `${detail.prompt_id} mengklaim brand muncul tanpa penyebutan brand dalam jawaban mentah.`,
      );
    }
    const permittedSources = new Set(
      observation.sources.map((source) => source.url),
    );
    detail.source_urls.forEach((url) => {
      if (!permittedSources.has(url))
        errors.push(
          `${detail.prompt_id} memakai sumber yang tidak ada di observasi.`,
        );
    });
  });
  return errors;
}

export function buildAuditReport(
  content: ReportContent,
  observations: AuditObservation[],
): AuditReport {
  const details = new Map(
    content.details.map((detail) => [detail.prompt_id, detail]),
  );
  const completed = observations.filter(
    (item) => item.run_status === "completed",
  );
  const unbranded = completed.filter((item) => !item.branded);
  const branded = completed.filter((item) => item.branded);
  const statusFor = (id: string) => details.get(id)?.status;
  const recognized = new Set([
    "appeared_as_recommendation",
    "mentioned_not_recommended",
    "incomplete_information",
    "conflicting_information",
  ]);
  const returnedModels = [
    ...new Set(completed.map((item) => item.returned_model).filter(Boolean)),
  ];

  return {
    ...content,
    report_version: "nuave-report-v1",
    generated_at: new Date().toISOString(),
    system_label: `OpenAI Responses API — ${returnedModels.join(", ") || "model tidak tersedia"} dengan web search`,
    counts: {
      unbranded_recommended: unbranded.filter(
        (item) => statusFor(item.prompt_id) === "appeared_as_recommendation",
      ).length,
      unbranded_mentioned: unbranded.filter(
        (item) => statusFor(item.prompt_id) === "mentioned_not_recommended",
      ).length,
      unbranded_total: unbranded.length,
      branded_recognized: branded.filter((item) =>
        recognized.has(statusFor(item.prompt_id) ?? ""),
      ).length,
      branded_total: branded.length,
      failed: observations.filter((item) => item.run_status === "failed")
        .length,
    },
  };
}

export function makeEvidenceExport(
  brief: BusinessBrief,
  prompts: AuditPrompt[],
  observations: AuditObservation[],
  report: AuditReport,
) {
  return {
    export_version: "nuave-evidence-v1",
    exported_at: new Date().toISOString(),
    disclosure:
      "Observasi berasal dari OpenAI Responses API, bukan reproduksi persis antarmuka konsumen ChatGPT.",
    brief: {
      ...brief,
      agency_logo_data_url: brief.agency_logo_data_url
        ? "[device-local logo omitted]"
        : "",
    },
    prompts,
    observations,
    report,
  };
}
