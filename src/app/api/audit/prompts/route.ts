import { NextResponse } from "next/server";
import { z } from "zod";
import { businessBriefSchema } from "@/lib/audit/types";
import { generatePromptPack } from "@/lib/audit/openai";
import { validatePromptPack } from "@/lib/audit/contracts";

export const runtime = "nodejs";

const requestSchema = z.object({
  brief: businessBriefSchema,
  safety_identifier: z.string().min(8).max(64),
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const pack = await generatePromptPack(input.brief, input.safety_identifier);
    const errors = validatePromptPack(pack.prompts, input.brief);
    if (errors.length)
      return NextResponse.json({ error: errors.join(" ") }, { status: 422 });
    return NextResponse.json(pack);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Pertanyaan tidak dapat dibuat.",
      },
      { status: 400 },
    );
  }
}
