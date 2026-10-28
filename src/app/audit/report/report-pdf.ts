/**
 * Spec 021 Part P: asks the server for the report PDF with the link secret
 * (in the body, never in a URL) and saves it. "print" means this deployment
 * has no server PDF for the report (local development, offline tests, or
 * today's limit reached): the page then uses the browser's print.
 */
export type PdfOutcome = "saved" | "print" | "failed";

export type DownloadPdf = () => Promise<PdfOutcome>;

/** The file name the server chose (`filename*`, then `filename`). */
export function pdfFileName(disposition: string | null): string {
  const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.trim());
    } catch {
      // Fall through to the plain name.
    }
  }
  return disposition?.match(/filename="([^"]+)"/i)?.[1] ?? "Laporan-Nuave.pdf";
}

export async function downloadReportPdf(secret: string): Promise<PdfOutcome> {
  let response: Response;
  try {
    response = await fetch("/api/report/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
  } catch {
    return "failed";
  }
  if (response.status === 501) return "print";
  if (response.status === 429) {
    const code = await response
      .json()
      .then((body: { code?: unknown }) => body?.code)
      .catch(() => null);
    // Today's PDFs for this report are used up: print still works.
    if (code === "pdf_daily_limit") return "print";
    return "failed";
  }
  if (!response.ok) return "failed";
  let blob: Blob;
  try {
    blob = await response.blob();
  } catch {
    return "failed";
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = pdfFileName(response.headers.get("Content-Disposition"));
  document.body.append(link);
  link.click();
  link.remove();
  // Some browsers read the file after the click returns.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "saved";
}
