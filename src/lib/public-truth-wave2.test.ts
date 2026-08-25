import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Wave 2 public truth", () => {
  const publicPages = [
    "src/app/faq/page.tsx",
    "src/app/terms/page.tsx",
    "src/app/privacy/page.tsx",
    "src/app/support/page.tsx",
  ];

  it("does not publish unresolved placeholder tokens", () => {
    for (const file of publicPages) {
      expect(source(file)).not.toMatch(/\[(?:HARGA|TANGGAL|VERSI|NAMA|KOTA|PENYEDIA|METODE|WAKTU|MASA|ALAMAT|BATAS|PAJAK)/i);
    }
  });

  it("does not publish the stale GPT-4o claim", () => {
    for (const file of publicPages) expect(source(file)).not.toContain("GPT-4o");
  });

  it("describes unimplemented payment and email delivery as unavailable", () => {
    expect(source("src/app/faq/page.tsx")).toContain("Alur pembayaran belum aktif");
    expect(source("src/app/faq/page.tsx")).toContain("Belum. State audit saat ini bersifat browser/session-based");
    expect(source("src/app/terms/page.tsx")).toContain("Checkout, pemrosesan pembayaran");
  });
});

describe("Wave 2 public accessibility and asset truth", () => {
  it("removes closed mobile-menu controls from the DOM and exposes disclosure semantics", () => {
    const nav = source("src/components/LandingNav.tsx");
    expect(nav).toContain("if (!open) return null");
    expect(nav).toContain("aria-expanded={mobileMenuOpen}");
    expect(nav).toContain("aria-controls={MOBILE_MENU_ID}");
    expect(nav).toContain('event.key === "Escape"');
    expect(nav).toContain("hamburgerRef.current?.focus()");
  });

  it("overrides the former hotlinked hero with a local CSS treatment", () => {
    expect(source("src/app/audit/SourceHero.tsx")).toContain("backdropStyles.localBackdrop");
    expect(source("src/app/audit/SourceHeroBackdrop.module.css")).not.toMatch(/https?:\/\//);
  });
});
