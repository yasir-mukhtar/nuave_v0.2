import { NextResponse } from "next/server";
import { enforceAuditCallerRateLimit } from "@/lib/audit/rate-limit";
import { sha256Hex } from "@/lib/orders/config";
import { orderRuntime } from "@/lib/orders/http";
import {
  countPdf,
  issuePrintToken,
  pdfBrowser,
  pdfContentDisposition,
  pdfRequest,
  printOrigin,
} from "@/lib/orders/report-pdf";
import { reportForLink } from "@/lib/orders/store";
import {
  PRIVATE_HEADERS,
  SECRET_PATTERN,
  neutral,
  unavailable,
} from "@/lib/orders/report-route";

export const runtime = "nodejs";

function answer(status: number, code: string, error: string) {
  return NextResponse.json(
    { error, code },
    { status, headers: PRIVATE_HEADERS },
  );
}

/** The report's business name, for the footer and the file name. */
function businessName(intakeJson: string): string {
  try {
    const name = (
      JSON.parse(intakeJson) as { context?: { identity?: { name?: unknown } } }
    ).context?.identity?.name;
    return typeof name === "string" ? name.trim() : "";
  } catch {
    return "";
  }
}

/** One line per PDF, numbers and codes only: never the secret, the print
 * code, the address or any report data. */
function logPdf(status: string, extra: Record<string, number> = {}) {
  const line = JSON.stringify({ event: "report_pdf", status, ...extra });
  if (status === "ok") console.info(line);
  else console.warn(line);
}

/**
 * Spec 021 Part P: "Unduh PDF". The page POSTs the link secret (as for the
 * report data); the server makes a single-use print code, Browser Run opens
 * `/r/print#<code>` and prints it, and the PDF comes back as a download.
 * Nothing is stored (P-04). Without Browser Run (local development, offline
 * tests) or for a report saved before Spec 018, the answer is
 * `pdf_unavailable` and the page uses the browser's print (P-05).
 */
export async function POST(request: Request) {
  const rateLimited = await enforceAuditCallerRateLimit(
    request,
    (bindings) => bindings.reportPdfCaller,
  );
  if (rateLimited) {
    for (const [key, value] of Object.entries(PRIVATE_HEADERS)) {
      rateLimited.headers.set(key, value);
    }
    return rateLimited;
  }

  const body = (await request.json().catch(() => null)) as {
    secret?: unknown;
  } | null;
  const secret = body?.secret;
  if (typeof secret !== "string" || !SECRET_PATTERN.test(secret)) {
    return neutral();
  }
  const server = orderRuntime();
  if (!server) return unavailable();
  const now = new Date();

  let saved: Awaited<ReturnType<typeof reportForLink>>;
  try {
    saved = await reportForLink(server.db, {
      linkHash: await sha256Hex(secret),
      environment: server.environment,
      now,
    });
  } catch {
    return unavailable();
  }
  if (!saved) return neutral();
  let twoSource = false;
  try {
    twoSource = Boolean(
      (JSON.parse(saved.report_json) as { two_source?: unknown }).two_source,
    );
  } catch {
    return neutral();
  }
  // Reports saved before Spec 018, and deployments without Browser Run,
  // keep the browser's print. Checked after the secret, so a wrong secret
  // gets the same answer everywhere.
  const browser = pdfBrowser();
  if (!twoSource || !browser) {
    return answer(501, "pdf_unavailable", "PDF dibuat lewat cetak browser.");
  }
  const origin = printOrigin(request, server.environment);
  if (!origin) return unavailable();
  // Made before Browser Run is asked, so a name the header cannot carry
  // never costs browser time.
  const name = businessName(saved.intake_json);
  const disposition = pdfContentDisposition(name);

  let token: string;
  try {
    if (!(await countPdf(server.db, { orderId: saved.order_id, now }))) {
      logPdf("daily_limit");
      return answer(
        429,
        "pdf_daily_limit",
        "Batas unduhan PDF hari ini sudah tercapai. Coba lagi besok.",
      );
    }
    token = await issuePrintToken(server.db, {
      orderId: saved.order_id,
      now,
      hash: sha256Hex,
    });
  } catch {
    return unavailable();
  }

  let pdf: Response;
  try {
    pdf = await browser.quickAction(
      "pdf",
      pdfRequest({ url: `${origin}/r/print#${token}`, name }),
    );
  } catch {
    logPdf("browser_error");
    return answer(502, "pdf_failed", "PDF belum bisa dibuat. Coba lagi.");
  }
  // Browser time for this PDF, from Browser Run's own header.
  const used = pdf.headers.get("X-Browser-Ms-Used");
  const timing: Record<string, number> =
    used !== null && Number.isFinite(Number(used))
      ? { browser_ms: Number(used) }
      : {};
  if (!pdf.ok) {
    await pdf.body?.cancel();
    logPdf("browser_failed", { http: pdf.status, ...timing });
    return answer(502, "pdf_failed", "PDF belum bisa dibuat. Coba lagi.");
  }
  logPdf("ok", timing);
  return new Response(pdf.body, {
    headers: {
      ...PRIVATE_HEADERS,
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
    },
  });
}
