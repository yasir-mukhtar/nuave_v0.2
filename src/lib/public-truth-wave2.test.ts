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

  it("Spec 022 AC-11: privacy 1.4 and later says 'ke Meta' in its summary and names server events for purchases only", () => {
    const privacy = source("src/app/privacy/page.tsx").replace(/\s+/g, " ");
    const legal = source("src/lib/legal.ts");
    // 1.5 (2026-10-28) adds the page reader and 1.6 (2026-10-28) the business
    // summary from the own pages; the Meta text is unchanged.
    expect(legal).toContain('PRIVACY_VERSION = "1.6"');
    expect(privacy).toContain(
      "Singkatnya: kami tidak mengirim data Anda ke Meta kecuali Anda memilih <strong>Allow</strong>. Email Anda tidak pernah dikirim ke Meta dalam bentuk yang bisa dibaca. Laporan, pertanyaan, jawaban AI, dan data bisnis Anda tidak pernah dikirim ke Meta. Kami tidak menjual data Anda, dan Anda bisa mengubah pilihan kapan saja.",
    );
    expect(privacy).toContain(
      "untuk pembelian, catatan yang sama dari server kami, beserta alamat IP, jenis browser, kode cookie Meta Anda, dan alamat halaman pemesanan Nuave; dan",
    );
    expect(privacy).not.toContain("untuk cek gratis dan pembelian");
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
