import { NextResponse } from "next/server";
import { z } from "zod";
import {
  auditBudgetSchema,
  businessBriefSchema,
  promptSchema,
  type AuditCallTelemetry,
} from "@/lib/audit/types";
import { validatePromptPack } from "@/lib/audit/contracts";
import { executeAuditPrompt } from "@/lib/audit/openai";
import {
  encodeAuditRunEvent,
  runWithConcurrency,
  type AuditRunEvent,
} from "@/lib/audit/stream";

export const runtime = "nodejs";

const requestSchema = z.object({
  brief: businessBriefSchema,
  prompts: z.array(promptSchema).length(10),
  safety_identifier: z.string().min(8).max(64),
  budget: auditBudgetSchema,
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const errors = validatePromptPack(input.prompts, input.brief);
    if (errors.length)
      return NextResponse.json({ error: errors.join(" ") }, { status: 422 });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: AuditRunEvent) =>
          controller.enqueue(encoder.encode(encodeAuditRunEvent(event)));
        try {
          send({ type: "run_started", total: 10 });
          const runCalls: AuditCallTelemetry[] = [];
          const observations = await runWithConcurrency({
            items: input.prompts,
            limit: 1,
            onStart(prompt, index) {
              send({
                type: "prompt_started",
                index,
                prompt_id: prompt.prompt_id,
              });
            },
            work: (prompt) =>
              executeAuditPrompt({
                prompt,
                brief: input.brief,
                safety_identifier: input.safety_identifier,
                budget: {
                  ...input.budget,
                  calls: [...input.budget.calls, ...runCalls],
                },
              }),
            onComplete(observation, index) {
              runCalls.push(...observation.telemetry);
              send({ type: "prompt_completed", index, observation });
            },
          });
          send({ type: "run_completed", observations });
        } catch (error) {
          send({
            type: "fatal_error",
            message:
              error instanceof Error
                ? error.message
                : "We couldn't run the audit.",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "We couldn't run the audit.",
      },
      { status: 400 },
    );
  }
}
