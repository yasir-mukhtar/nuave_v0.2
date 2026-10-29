import { describe, expect, it } from "vitest";
import {
  addressName,
  pickBusinessName,
  type NameLabels,
} from "./business-name";
import { parseSourceMetadata } from "./source-identity";

function labels(overrides: Partial<NameLabels>): NameLabels {
  return {
    siteName: "",
    shareTitle: "",
    pageTitle: "",
    applicationName: "",
    structuredData: [],
    ...overrides,
  };
}

describe("business name from page labels", () => {
  // The head of https://mhdc.co.id/ as read on 2026-10-29, trimmed: its
  // site name label and structured data say "nearest dental clinic".
  const mhdcHead = `<head>
    <title>Klinik Gigi Spesialis &amp; Vaksinasi - MHDC Clinic</title>
    <meta property="og:title" content="Klinik Gigi Spesialis &amp; Vaksinasi - MHDC Clinic" />
    <meta property="og:site_name" content="Klinik Dokter Gigi Terdekat" />
    <script type="application/ld+json" class="yoast-schema-graph">{"@context":"https://schema.org","@graph":[
      {"@type":"WebPage","name":"Klinik Gigi Spesialis & Vaksinasi - MHDC Clinic"},
      {"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home"}]},
      {"@type":"WebSite","name":"Klinik Dokter Gigi Terdekat"},
      {"@type":"Organization","name":"Klinik Dokter Gigi Terdekat"}]}</script>
  </head>`;

  it("finds MHDC Clinic, not the search phrase in its site name label", () => {
    expect(
      parseSourceMetadata(mhdcHead, "website", "https://mhdc.co.id/")
        .displayName,
    ).toBe("MHDC Clinic");
  });

  it("is confident about MHDC Clinic", () => {
    const pick = pickBusinessName(
      labels({
        siteName: "Klinik Dokter Gigi Terdekat",
        shareTitle: "Klinik Gigi Spesialis & Vaksinasi - MHDC Clinic",
        pageTitle: "Klinik Gigi Spesialis & Vaksinasi - MHDC Clinic",
      }),
      "https://mhdc.co.id/",
    );
    expect(pick).toMatchObject({ name: "MHDC Clinic", confident: true });
  });

  it("keeps a plain site name label that is a real name", () => {
    expect(
      pickBusinessName(
        labels({ siteName: "Kopi & Taman", pageTitle: "Document title" }),
        "https://business.example/",
      ),
    ).toMatchObject({ name: "Kopi & Taman", confident: true });
  });

  it("prefers the business entry in structured data", () => {
    expect(
      pickBusinessName(
        labels({
          siteName: "Dokter Gigi Murah Bandung",
          pageTitle: "Beranda | Dokter Gigi Murah Bandung",
          structuredData: [
            '{"@type":"Dentist","name":"Klinik Gigi Senyum Sehat"}',
          ],
        }),
        "https://senyumsehat.id/",
      ),
    ).toMatchObject({ name: "Klinik Gigi Senyum Sehat", confident: true });
  });

  it("matches a name to its web address by initials", () => {
    expect(
      pickBusinessName(
        labels({ pageTitle: "Beranda - Rumah Sakit Pondok Indah" }),
        "https://www.rspi.co.id/",
      ).name,
    ).toBe("Rumah Sakit Pondok Indah");
  });

  it("returns no name when every label is a search phrase", () => {
    expect(
      pickBusinessName(
        labels({
          siteName: "Klinik Gigi Terdekat",
          pageTitle: "Klinik Gigi Terbaik di Jakarta",
        }),
        "https://example-dental.com/",
      ),
    ).toMatchObject({ name: "", confident: false });
  });

  it("ignores broken structured data", () => {
    expect(
      pickBusinessName(
        labels({ pageTitle: "Klinik Mata Nusantara", structuredData: ["{"] }),
        "https://klinikmatanusantara.com/",
      ).name,
    ).toBe("Klinik Mata Nusantara");
  });

  // Cases from the 104-site test (experiments/business-name-test).
  it("never takes a web address or a blocked-page notice as the name", () => {
    expect(
      pickBusinessName(
        labels({
          siteName: "https://rs-jih.co.id/",
          pageTitle: "Request Rejected",
        }),
        "https://rs-jih.co.id/",
      ).name,
    ).toBe("");
  });

  it("drops a welcome prefix and an official suffix", () => {
    expect(
      pickBusinessName(
        labels({ pageTitle: "Welcome to Dermaster Indonesia" }),
        "https://dermaster.co.id/",
      ).name,
    ).toBe("Dermaster Indonesia");
    expect(
      pickBusinessName(
        labels({ siteName: "EDERMA CLINIC OFFICIAL" }),
        "https://ederma.co.id/",
      ).name,
    ).toBe("EDERMA CLINIC");
  });

  it("splits a label at a colon", () => {
    expect(
      pickBusinessName(
        labels({
          pageTitle:
            "Kehamilan Sehat: Pro-Normal Clinic with Complete Services",
        }),
        "https://kehamilansehat.com/",
      ).name,
    ).toBe("Kehamilan Sehat");
  });

  it("gives the address credit to the part that matches, not the whole label", () => {
    expect(
      pickBusinessName(
        labels({
          siteName: "Royal Dental Center - Dokter Gigi Medan Terbaik",
          pageTitle: "Dokter Gigi Medan - Royal Dental Center",
        }),
        "https://www.doktergigimedan.com/",
      ).name,
    ).toBe("Royal Dental Center");
  });

  it("uses a site-made clinic type but not a nickname or a specialty", () => {
    expect(
      pickBusinessName(
        labels({
          structuredData: [
            JSON.stringify({
              "@type": ["Hospital", "LocalBusiness"],
              name: "RS PKU Muhammadiyah Yogyakarta",
              alternateName: "RSPKU Jogja",
            }),
          ],
        }),
        "https://rspkujogja.com/",
      ).name,
    ).toBe("RS PKU Muhammadiyah Yogyakarta");
    expect(
      pickBusinessName(
        labels({
          structuredData: [
            '{"@type":"CosmeticClinic","name":"L\'VIORS BEAUTY CLINIC - Surabaya Pusat"}',
          ],
        }),
        "https://lviors.com/",
      ).name,
    ).toBe("L'VIORS BEAUTY CLINIC");
  });

  it("never takes a medical specialty as the name", () => {
    expect(
      pickBusinessName(
        labels({
          structuredData: [
            '{"@type":"MedicalSpecialty","name":"Klinik Mata Nusantara"}',
          ],
        }),
        "https://klinikmatanusantara.com/",
      ).name,
    ).toBe("");
  });

  // Found by independent review of PR 203.
  it("decodes entities in structured data names", () => {
    expect(
      parseSourceMetadata(
        `<head><script type="application/ld+json">{"@type":"Dentist","name":"Senyum &amp; Sehat"}</script></head>`,
        "website",
        "https://senyumsehat.id/",
      ).displayName,
    ).toBe("Senyum & Sehat");
  });

  it("reads structured data whose script tag has a > inside an attribute", () => {
    expect(
      parseSourceMetadata(
        `<head><script data-x="a>b" type='application/ld+json'>{"@type":"Dentist","name":"Kirana Dental"}</script></head>`,
        "website",
        "https://kirana.id/",
      ).displayName,
    ).toBe("Kirana Dental");
  });

  it("keeps names that only look like an address or an error", () => {
    expect(
      pickBusinessName(labels({ siteName: "dr.Affandi" }), "https://x.id/")
        .name,
    ).toBe("dr.Affandi");
    expect(
      pickBusinessName(
        labels({ siteName: "Error Free Dental" }),
        "https://errorfree.id/",
      ).name,
    ).toBe("Error Free Dental");
  });

  it("stays quick on a head stuffed with structured data", () => {
    const stores = Array.from({ length: 12_000 }, () => ({
      "@type": "Store",
      name: "Brand Store",
    }));
    const started = performance.now();
    pickBusinessName(
      labels({ structuredData: [JSON.stringify({ "@graph": stores })] }),
      "https://brand.id/",
    );
    expect(performance.now() - started).toBeLessThan(500);
  });

  // Found by the second independent review of PR 203.
  it("never takes a doctor or audience the page mentions as the name", () => {
    const pick = pickBusinessName(
      labels({
        pageTitle: "Beranda",
        structuredData: [
          JSON.stringify({
            "@graph": [
              { "@type": "WebSite", name: "Klinik Gigi Sehat Senyum" },
              {
                "@type": "Dentist",
                name: "Klinik Gigi Sehat Senyum",
                employee: { "@type": "Physician", name: "drg. Budi Santoso" },
                audience: { "@type": "BusinessAudience", name: "Perusahaan" },
              },
            ],
          }),
        ],
      }),
      "https://dentalku.id/",
    );
    expect(pick.name).toBe("Klinik Gigi Sehat Senyum");
    expect(pick.candidates.map((candidate) => candidate.name)).not.toContain(
      "drg. Budi Santoso",
    );
  });

  it("offers a plain description over the web address when nothing reads as a name", () => {
    expect(
      pickBusinessName(
        labels({ siteName: "Klinik Gigi Keluarga" }),
        "https://keluargasehat.id/",
      ),
    ).toMatchObject({ name: "Klinik Gigi Keluarga", confident: false });
  });

  it("stays quick on a head of unclosed script tags", () => {
    const html = `<head>${"<script>".repeat(60_000)}</script><title>Kirana Dental</title></head>`;
    const started = performance.now();
    const name = parseSourceMetadata(
      html,
      "website",
      "https://kirana.id/",
    ).displayName;
    expect(performance.now() - started).toBeLessThan(1_000);
    expect(name).toBe("Kirana Dental");
  });

  it("reads the name part of a web address", () => {
    expect(addressName("https://www.mhdc.co.id/")).toBe("mhdc");
    expect(addressName("https://jakarta.siloamhospitals.com/x")).toBe(
      "siloamhospitals",
    );
    expect(addressName("https://sasana.physio/")).toBe("sasana");
    expect(addressName("not a url")).toBe("");
  });
});
