import { NextResponse } from "next/server";
import { z } from "zod";
import { businessBriefSchema } from "@/lib/audit/types";
import { buildLiveIndonesianPromptPack } from "@/lib/audit/questions-id-live";
import {
  assertSafeComparisonBusinessUrls,
  withPrimarySimilarBusiness,
} from "@/lib/audit/similar-businesses";

export const runtime = "nodejs";

const requestSchema = z.object({
  brief: businessBriefSchema,
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    assertSafeComparisonBusinessUrls(input.brief);
    const result = await buildLiveIndonesianPromptPack({
      brief: withPrimarySimilarBusiness(input.brief),
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Kami tidak dapat membuat pertanyaan audit.",
      },
      { status: 400 },
    );
  }
}
