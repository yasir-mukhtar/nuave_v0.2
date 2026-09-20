import { NextResponse } from "next/server";
import { auditMode, newAuditEnabled } from "@/lib/audit/deployment-gate";
import {
  loadRetainedDirectTenPack,
  retainedConfirmedBrief,
  runLocalDirectTenAudit,
} from "@/lib/audit/local-direct-ten-audit";
import { ReportPipelineError } from "@/lib/audit/report-pipeline";

export const runtime = "nodejs";

/**
 * Returns the retained founder-approved pack and its bound confirmed-context
 * projection for the local review surface. Reading local evidence only —
 * no provider call is possible here. The client edits against this pack and
 * must resubmit the exact accepted wording before any run.
 */
export async function GET() {
  // Founder-local evidence reader: stays local-only until the old flow is
  // archived (Spec 010 R-09) — the new audit switch must be on AND the build
  // must not be production.
  if (!newAuditEnabled() || process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const pack = await loadRetainedDirectTenPack();
    const brief = retainedConfirmedBrief(pack.confirmed);
    return NextResponse.json({
      pack: pack.raw,
      prompts: pack.prompts,
      brief,
      provenance: {
        pack_method: pack.method,
        pack_response_id: pack.responseId,
        question_method: "direct-ten",
        // Whether this session would execute real provider calls at the
        // /api/audit/run + /report boundaries or the labeled substitutes.
        live_authorized: auditMode() === "live",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The retained pack could not be loaded.",
      },
      { status: 400 },
    );
  }
}

/**
 * Founder-only local direct-ten audit (Spec 009 Block B). Guarded the same
 * way as GET: the new audit switch must be on and the build must not be
 * production.
 *
 * The body may carry `questions` — the session's approved texts, which must
 * equal the retained accepted pack verbatim or the run refuses. Everything
 * else is server-side: the retained founder-approved pack is loaded from the
 * owner-only local evidence dir, its recorded hashes are re-verified, and the
 * real lock/run/report boundaries run with explicitly labeled synthetic
 * execution. No provider call is made or can be made through this route: it
 * never imports a live provider binding.
 */
export async function POST(request: Request) {
  if (!newAuditEnabled() || process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const body = (await request.json().catch(() => null)) as {
      questions?: unknown;
    } | null;
    const submitted =
      body && Array.isArray(body.questions)
        ? body.questions.map((question) => String(question))
        : undefined;
    const result = await runLocalDirectTenAudit(undefined, submitted);
    return NextResponse.json({
      report: result.report,
      prompts: result.prompts,
      observations: result.observations,
      brief: result.brief,
      provenance: result.provenance,
    });
  } catch (error) {
    if (error instanceof ReportPipelineError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          diagnostics: error.diagnostics,
        },
        { status: error.status },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The local direct-ten audit could not run.",
      },
      { status: 400 },
    );
  }
}
