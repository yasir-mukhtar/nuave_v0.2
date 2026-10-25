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
    // src/lib/legal.ts holds the operator, city and date the pages show.
    for (const file of [...publicPages, "src/lib/legal.ts"]) {
      expect(source(file)).not.toMatch(
        /\[(?:HARGA|TANGGAL|VERSI|NAMA|KOTA|PENYEDIA|METODE|WAKTU|MASA|ALAMAT|BATAS|PAJAK)/i,
      );
    }
  });

  it("does not publish the stale GPT-4o claim", () => {
    for (const file of publicPages)
      expect(source(file)).not.toContain("GPT-4o");
  });

  // S5: payment, saved reports and email delivery are live, so the pages
  // state the price, the promise and the support inbox instead of saying
  // they are unavailable.
  it("states the live price, promise and support inbox", () => {
    for (const file of ["src/app/faq/page.tsx", "src/app/terms/page.tsx"]) {
      expect(source(file)).toContain("Rp249.000");
      expect(source(file)).toContain("{DELIVERY_PROMISE}");
    }
    expect(source("src/lib/legal.ts")).toContain(
      'SUPPORT_EMAIL = "support@nuave.ai"',
    );
    for (const file of publicPages) {
      expect(source(file)).not.toMatch(/pengujian privat|belum aktif/i);
      expect(source(file)).not.toContain("hello@nuave.ai");
      expect(source(file)).not.toContain("Rp99.000");
    }
  });

  it("only describes Meta tracking as running after the visitor agrees", () => {
    const privacy = source("src/app/privacy/page.tsx");
    expect(privacy).toContain("Meta Pixel");
    expect(privacy).toContain("hanya aktif jika Anda memilih");
    expect(privacy).toContain("https://www.facebook.com/privacy/policy");
    expect(privacy).toContain("https://www.facebook.com/adpreferences");
  });
});

describe("Wave 2 public accessibility and asset truth", () => {
  it("uses the controlled Sheet contract for mobile-menu disclosure semantics", () => {
    const nav = source("src/components/LandingNav.tsx");
    expect(nav).toContain(
      "<Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>",
    );
    expect(nav).toContain("id={MOBILE_MENU_ID}");
    expect(nav).toContain('id="nuave-mobile-menu-first-link"');
    expect(nav).toContain("aria-expanded={mobileMenuOpen}");
    expect(nav).toContain(
      "aria-controls={mobileMenuOpen ? MOBILE_MENU_ID : undefined}",
    );
    expect(nav).not.toContain("document.body.style.overflow");
    expect(nav).not.toContain('event.key === "Escape"');
  });

  it("overrides the former hotlinked hero with a local CSS treatment", () => {
    expect(source("src/app/audit/SourceHero.tsx")).toContain(
      "backdropStyles.localBackdrop",
    );
    expect(source("src/app/audit/SourceHeroBackdrop.module.css")).not.toMatch(
      /https?:\/\//,
    );
  });
});
