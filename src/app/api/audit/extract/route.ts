import { NextResponse } from "next/server";
import { extractionRequestSchema } from "@/lib/audit/types";
import { extractBusinessDraft } from "@/lib/audit/openai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = extractionRequestSchema.parse(await request.json());
    return NextResponse.json(await extractBusinessDraft(input));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "We couldn't analyze this website.",
      },
      { status: 400 },
    );
  }
}
