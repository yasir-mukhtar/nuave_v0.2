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

  it("reads the name part of a web address", () => {
    expect(addressName("https://www.mhdc.co.id/")).toBe("mhdc");
    expect(addressName("https://jakarta.siloamhospitals.com/x")).toBe(
      "siloamhospitals",
    );
    expect(addressName("not a url")).toBe("");
  });
});
