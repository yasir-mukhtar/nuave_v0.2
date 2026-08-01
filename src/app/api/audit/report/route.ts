import { NextResponse } from "next/server";
import { z } from "zod";
import {
  auditObservationSchema,
  businessBriefSchema,
  promptSchema,
} from "@/lib/audit/types";
import { buildAuditReport, validateReportContent } from "@/lib/audit/contracts";
import { generateReportContent } from "@/lib/audit/openai";

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
    const content = await generateReportContent(input);
    const errors = validateReportContent(
      content,
      input.observations,
      input.brief,
    );
    if (errors.length)
      return NextResponse.json({ error: errors.join(" ") }, { status: 422 });
    return NextResponse.json({
      report: buildAuditReport(content, input.observations),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Laporan tidak dapat dibuat.",
      },
      { status: 400 },
    );
  }
}
