import { describe, expect, it } from "vitest";
import { customerAuditErrorMessage } from "./customer-error";

const RAW_PROVIDER_DIAGNOSTIC =
  "OpenCode Go upstream 502: gpt-5.6-luna transport reset api_key=secret";

describe("customer audit error mapping", () => {
  it("returns stable customer copy instead of arbitrary provider diagnostics", () => {
    const rendered = customerAuditErrorMessage("run");
    expect(rendered).toBe(
      "Audit terhenti sebelum selesai. Coba lanjutkan dari hasil yang sudah tersimpan.",
    );
    expect(rendered).not.toContain("OpenCode");
    expect(rendered).not.toContain("gpt-5.6-luna");
    expect(rendered).not.toContain("502");
    expect(rendered).not.toContain(RAW_PROVIDER_DIAGNOSTIC);
  });

  it("maps known report codes without rendering their raw diagnostic", () => {
    const rendered = customerAuditErrorMessage(
      "report",
      "REPORT_INTEGRITY_FAILURE",
    );
    expect(rendered).toContain("pemeriksaan kualitas");
    expect(rendered).not.toContain(RAW_PROVIDER_DIAGNOSTIC);
  });

  it("falls back by finite stage for unknown provider codes", () => {
    expect(
      customerAuditErrorMessage("extract", "OPENCODEGO_UPSTREAM_BAD_GATEWAY"),
    ).toBe(
      "Sumber bisnis belum dapat dianalisis. Periksa sumber lalu coba lagi.",
    );
  });
});
