import { NextResponse } from "next/server";
import { z } from "zod";
import { businessBriefSchema } from "@/lib/audit/types";
import { validatePromptPack } from "@/lib/audit/contracts";
import { buildPromptPack } from "@/lib/audit/questions";

export const runtime = "nodejs";

// The ten questions are built in code from the verified brief. This route
// makes no OpenAI call, so it takes no budget and records no call telemetry.
const requestSchema = z.object({
  brief: businessBriefSchema,
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const pack = buildPromptPack(input.brief);
    const errors = validatePromptPack(pack.prompts, input.brief);
    if (errors.length)
      return NextResponse.json({ error: errors.join(" ") }, { status: 422 });
    return NextResponse.json({ pack });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "We couldn't create the audit questions.",
      },
      { status: 400 },
    );
  }
}
