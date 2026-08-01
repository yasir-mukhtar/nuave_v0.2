import { NextResponse } from "next/server";
import { z } from "zod";
import {
  auditObservationSchema,
  businessBriefSchema,
  promptSchema,
} from "@/lib/audit/types";
import { buildAuditReport, validateReportContent } from "@/lib/audit/contracts";
import { generateReportContent } from "@/lib/audit/openai";
import {
  validateReportLanguage,
  validateReportLanguageRevision,
} from "@/lib/audit/report-language";

export const runtime = "nodejs";

const requestSchema = z.object({
  brief: businessBriefSchema,
  prompts: z.array(promptSchema).length(10),
  observations: z.array(auditObservationSchema).length(10),
  safety_identifier: z.string().min(8).max(64),
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    let content = await generateReportContent(input);
    const evidenceErrors = validateReportContent(
      content,
      input.observations,
      input.brief,
    );
    if (evidenceErrors.length) {
      return NextResponse.json(
        { error: evidenceErrors.join(" ") },
        { status: 422 },
      );
    }

    const languageErrors = validateReportLanguage(content);
    if (languageErrors.length) {
      const original = content;
      content = await generateReportContent(input, {
        draft: original,
        violations: languageErrors,
      });
      const retryErrors = [
        ...validateReportLanguageRevision(original, content),
        ...validateReportContent(content, input.observations, input.brief),
        ...validateReportLanguage(content),
      ];
      if (retryErrors.length) {
        return NextResponse.json(
          { error: retryErrors.join(" ") },
          { status: 422 },
        );
      }
    }

    return NextResponse.json({
      report: buildAuditReport(content, input.observations),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "We couldn't create the report.",
      },
      { status: 400 },
    );
  }
}
