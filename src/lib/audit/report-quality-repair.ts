import type { AuditObservation, BusinessBrief, ReportContent } from "./types";
import type { ReportDiagnosticCode } from "./report-recovery";

const PROHIBITED_REPORT_CLAIMS = [
  /\b(?:number|no\.?)[ -]?1\b|\b(?:permanent(?:ly)?|always) rank|\btop-ranked\b/i,
  /\b(?:same as|identical to|exactly reproduces?) (?:the )?(?:consumer )?chatgpt(?: app)?\b/i,
  /\bguarantee(?:s|d)?\b/i,
  /\b(?:lost|losing|cost(?:s|ing)?) (?:revenue|sales|money|customers?)\b/i,
  /\bcaused by\b|\bwill (?:cause|increase|improve|boost|drive)\b/i,
] as const;

function hasProhibitedClaim(value: string) {
  if (
    /\b(?:does not|do not|cannot|can't|no|without (?:a )?) guarantee\b/i.test(
      value,
    ) || /\bnot guaranteed\b/i.test(value)
  ) {
    return (
      PROHIBITED_REPORT_CLAIMS.slice(0, 2).some((pattern) =>
        pattern.test(value),
      ) ||
      PROHIBITED_REPORT_CLAIMS.slice(3).some((pattern) => pattern.test(value))
    );
  }
  return PROHIBITED_REPORT_CLAIMS.some((pattern) => pattern.test(value));
}

function neutralConclusion(
  content: ReportContent,
  brief: BusinessBrief,
  language: "en" | "id" | undefined,
) {
  const completed = content.details.filter(
    (detail) => detail.run === "completed",
  );
  const appeared = completed.filter(
    (detail) => detail.appearance === "mentioned",
  ).length;
  if (language === "id") {
    return `Audit selesai. ${brief.brand_name} disebut dalam ${appeared} dari ${completed.length} jawaban yang berhasil diuji. Lihat hasil tiap pertanyaan untuk bukti lengkap.`;
  }
  return `The audit is complete. ${brief.brand_name} appeared in ${appeared} of ${completed.length} successfully tested answers. See each question result for the retained evidence.`;
}

function safeDetailFinding(
  detail: ReportContent["details"][number],
  language: "en" | "id" | undefined,
) {
  if (language === "id") {
    if (detail.appearance === "absent") {
      return "Bisnis tidak disebut dalam jawaban ini.";
    }
    if (detail.appearance === "mentioned") {
      return "Bisnis disebut dalam jawaban ini.";
    }
    return "Hasil pertanyaan ini tersedia pada bukti yang dipertahankan.";
  }
  if (detail.appearance === "absent") {
    return "The business did not appear in this answer.";
  }
  if (detail.appearance === "mentioned") {
    return "The business appeared in this answer.";
  }
  return "This question result is available in the retained evidence.";
}

function safeEvidenceNote(language: "en" | "id" | undefined) {
  return language === "id"
    ? "Kutipan jawaban di atas berasal langsung dari bukti pengujian yang dipertahankan."
    : "The answer excerpt above comes directly from the retained test evidence.";
}

function repairedAccuracyStatus(content: ReportContent) {
  const information = content.details.map((detail) => detail.information);
  if (information.includes("conflicting")) return "needs_correction" as const;
  if (information.includes("incomplete")) return "needs_confirmation" as const;
  if (information.some((value) => value !== "not_assessed")) {
    return "no_clear_issues" as const;
  }
  return "could_not_assess" as const;
}

export type ReportQualityRepair = {
  content: ReportContent;
  diagnostics: ReportDiagnosticCode[];
};

/**
 * Removes model-authored report presentation that cannot be safely supported.
 * Observation facts are never invented or changed here: the protected
 * pre-synthesis gate remains the authority for whether the audit happened.
 */
export function sanitizeRecoverableReportQuality(
  content: ReportContent,
  observations: AuditObservation[],
  brief: BusinessBrief,
  language?: "en" | "id",
): ReportQualityRepair {
  const diagnostics = new Set<ReportDiagnosticCode>();
  const knownPromptIds = new Set(observations.map((item) => item.prompt_id));

  let conclusion = content.conclusion;
  if (hasProhibitedClaim(conclusion)) {
    conclusion = neutralConclusion(content, brief, language);
    diagnostics.add("prohibited_claim_removed");
  }

  const key_findings = content.key_findings.flatMap((finding) => {
    const evidence_prompt_ids = finding.evidence_prompt_ids.filter((id) =>
      knownPromptIds.has(id),
    );
    if (
      !evidence_prompt_ids.length ||
      hasProhibitedClaim(finding.title) ||
      hasProhibitedClaim(finding.explanation)
    ) {
      if (
        hasProhibitedClaim(finding.title) ||
        hasProhibitedClaim(finding.explanation)
      ) {
        diagnostics.add("prohibited_claim_removed");
      }
      return [];
    }
    return [{ ...finding, evidence_prompt_ids }];
  });

  const priorities = content.priorities.flatMap((priority) => {
    const authored = [
      priority.action,
      priority.why,
      priority.basis,
      priority.done_when,
      priority.caveat,
    ];
    if (authored.some(hasProhibitedClaim)) {
      diagnostics.add("prohibited_claim_removed");
      diagnostics.add("unsupported_priority_removed");
      return [];
    }
    return [priority];
  });

  const details = content.details.map((detail) => {
    const findingUnsafe = hasProhibitedClaim(detail.finding);
    const noteUnsafe = hasProhibitedClaim(detail.evidence_note);
    if (findingUnsafe || noteUnsafe) diagnostics.add("prohibited_claim_removed");
    return {
      ...detail,
      finding: findingUnsafe
        ? safeDetailFinding(detail, language)
        : detail.finding,
      evidence_note: noteUnsafe ? safeEvidenceNote(language) : detail.evidence_note,
    };
  });

  let accuracy_status = content.accuracy_status;
  const information = details.map((detail) => detail.information);
  const accuracyIsContradictory =
    (accuracy_status === "no_clear_issues" &&
      information.some((status) =>
        ["incomplete", "conflicting"].includes(status),
      )) ||
    (accuracy_status === "needs_correction" &&
      !information.includes("conflicting"));
  if (accuracyIsContradictory) {
    accuracy_status = repairedAccuracyStatus({ ...content, details });
    diagnostics.add("minimum_report_fallback_used");
  }

  if (
    (content.key_findings.length > 0 && key_findings.length === 0) ||
    (content.priorities.length > 0 && priorities.length === 0)
  ) {
    diagnostics.add("minimum_report_fallback_used");
  }

  return {
    content: {
      ...content,
      conclusion,
      accuracy_status,
      key_findings,
      priorities,
      details,
    },
    diagnostics: [...diagnostics],
  };
}
