/**
 * Picks a website's business name from the labels in its page head.
 *
 * Sites often fill these labels with search phrases instead of the name:
 * mhdc.co.id says "Klinik Dokter Gigi Terdekat" ("nearest dental clinic") in
 * og:site_name, while its title ends in "MHDC Clinic". So every label is a
 * candidate, titles are split at their separators, and each candidate is
 * scored: points for where it came from, for appearing in more than one
 * label and for matching the web address; a loss for reading like a search
 * phrase or a plain description. When nothing scores above zero the name is
 * left empty and the caller falls back to the web address.
 */

import { cleanText } from "./html-text";

export type NameSource =
  | "business-data"
  | "organization-data"
  | "website-data"
  | "site-name"
  | "application-name"
  | "share-title"
  | "page-title";

export interface NameLabels {
  siteName: string;
  shareTitle: string;
  pageTitle: string;
  applicationName: string;
  /** Raw text of each `application/ld+json` script. */
  structuredData: string[];
}

export interface NameCandidate {
  name: string;
  score: number;
  sources: NameSource[];
  matchesAddress: boolean;
  looksGeneric: boolean;
}

export interface BusinessNamePick {
  name: string;
  /** True when the winner is clear: scored well and well ahead of the next. */
  confident: boolean;
  candidates: NameCandidate[];
}

const SOURCE_POINTS: Record<NameSource, number> = {
  "business-data": 3,
  "site-name": 3,
  "organization-data": 2,
  "application-name": 2,
  "website-data": 1,
  "share-title": 1,
  "page-title": 1,
};

// schema.org types that describe the business itself.
const BUSINESS_TYPES = new Set(
  [
    "LocalBusiness",
    "MedicalBusiness",
    "MedicalClinic",
    "MedicalOrganization",
    "Dentist",
    "Hospital",
    "Physician",
    "Optician",
    "Pharmacy",
    "DiagnosticLab",
    "HealthAndBeautyBusiness",
    "BeautySalon",
    "DaySpa",
    "HealthClub",
    "Store",
    "Restaurant",
    "CafeOrCoffeeShop",
    "ProfessionalService",
  ].map((type) => type.toLowerCase()),
);
// Site-made types such as "CosmeticClinic" that still name the business.
const BUSINESS_TYPE_WORDS =
  /clinic|hospital|dentist|physician|business|salon|spa$|pharmacy|optician/;
// A label split into parts scores each part like this, and the whole like
// a plain title: the parts are where the name usually is.
const PART_POINTS = 2;
const SPLIT_LABEL_POINTS = 1;
const ORGANIZATION_TYPES = new Set(["organization", "corporation"]);

// Words that only describe: a name made only of these (and city names) is a
// description, not a name.
const DESCRIPTIVE_WORDS = new Set(
  `klinik clinic clinics gigi dental dentist dentistry dokter doctor drg dr
  spesialis specialist specialists umum pratama utama kecantikan beauty
  aesthetic aesthetics estetika estetik kulit skin kelamin care center centre
  rumah sakit hospital hospitals rs rsu rsia rsud rsgm ibu anak bayi mata eye
  eyes fisioterapi physiotherapy physio vaksin vaksinasi vaccine vaccination
  imunisasi laboratorium lab laboratory kesehatan health healthcare medical
  medis perawatan layanan pelayanan treatment treatments keluarga family
  terapi therapy bersalin kandungan kebidanan bidan praktek praktik mandiri
  behel kawat scaling tambal cabut implan implant veneer bleaching orthodonti
  ortodonti dan and di of the untuk for with dengan serta atau or in at
  home beranda homepage halaman utama official website situs web resmi
  selamat datang welcome page indonesia jakarta selatan utara barat timur
  pusat surabaya bandung medan makassar semarang yogyakarta jogja bali
  denpasar tangerang bekasi depok bogor malang solo palembang batam
  balikpapan samarinda pekanbaru padang manado pontianak banjarmasin
  lampung`.split(/\s+/),
);

// Words a search phrase uses and a business name almost never does.
const SEARCH_PHRASE_WORDS = new Set(
  `terdekat terbaik termurah murah terpercaya terlengkap terjangkau
  berkualitas profesional terbaru terkini promo diskon harga biaya tarif
  rekomendasi near nearby best cheap top cheapest affordable`.split(/\s+/),
);

// Labels that name a page, not a business.
const PAGE_LABELS = new Set([
  "home",
  "beranda",
  "homepage",
  "home page",
  "halaman utama",
  "index",
  "welcome",
  "selamat datang",
  "untitled",
  "coming soon",
  "under construction",
  "maintenance mode",
]);

// Text a blocked or broken page shows instead of the site.
// The whole label only: "Error Free Dental" is a name.
const ERROR_PAGE =
  /^(request rejected|access denied|(403 )?forbidden|(404 )?not found|403|404|just a moment|attention required( cloudflare)?|page not found|account suspended|error)$/;

// Lower case with a domain ending: "dr.Affandi" is a name.
const WEB_ADDRESS =
  /^(https?:\/\/|www\.)|^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}\/?$/;

// Limits that keep a huge page head from making the scoring slow.
const MAX_STRUCTURED_NAMES = 20;
const MAX_PARTS = 10;
const MAX_LABEL_LENGTH = 200;

// Endings of a web address that are not part of the name.
const ADDRESS_ENDINGS = new Set(
  "id co or ac go sch web my biz net com org info io xyz site online clinic health care".split(
    " ",
  ),
);

const TITLE_SEPARATOR = /\s+[-–—]\s+|\s*:\s+|\s*[|·•»~]\s*/;

function words(value: string): string[] {
  return value
    .toLocaleLowerCase("id-ID")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function compact(value: string): string {
  return words(value).join("");
}

/** The name part of a web address: `mhdc` for https://www.mhdc.co.id/. */
export function addressName(pageUrl: string): string {
  let hostname: string;
  try {
    hostname = new URL(pageUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
  const labels = hostname.split(".").filter((label) => label !== "www");
  // The last part is never the name, known ending or not (.physio, .fit).
  if (labels.length > 1) labels.pop();
  while (labels.length > 1 && ADDRESS_ENDINGS.has(labels[labels.length - 1]!))
    labels.pop();
  return (labels[labels.length - 1] ?? "").replace(/[^a-z0-9]/g, "");
}

function matchesAddress(name: string, address: string): boolean {
  if (address.length < 3) return false;
  const joined = compact(name);
  if (joined.includes(address)) return true;
  if (joined.length >= 4 && address.includes(joined)) return true;
  // "Rumah Sakit Pondok Indah" → rspi
  const initials = words(name)
    .map((word) => word[0])
    .join("");
  if (initials.length >= 3 && address.startsWith(initials)) return true;
  // A distinctive word of the name inside the address: "Audy" in audydental.
  return words(name).some(
    (word) =>
      word.length >= 4 &&
      !DESCRIPTIVE_WORDS.has(word) &&
      address.includes(word),
  );
}

function looksGeneric(name: string): boolean {
  const nameWords = words(name);
  if (nameWords.some((word) => SEARCH_PHRASE_WORDS.has(word))) return true;
  return nameWords.every((word) => DESCRIPTIVE_WORDS.has(word));
}

function cleanCandidate(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, "")
    .replace(/^(welcome to|selamat datang (di|ke)) /i, "")
    .replace(/ (official( website| site)?|(website|situs) resmi)$/i, "")
    .trim();
}

function structuredNames(
  blocks: string[],
): Array<{ name: string; source: NameSource }> {
  const found: Array<{ name: string; source: NameSource }> = [];
  const visit = (node: unknown, depth: number) => {
    if (
      depth > 6 ||
      found.length >= MAX_STRUCTURED_NAMES ||
      !node ||
      typeof node !== "object"
    )
      return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }
    const record = node as Record<string, unknown>;
    const types = (
      Array.isArray(record["@type"]) ? record["@type"] : [record["@type"]]
    )
      .filter((type): type is string => typeof type === "string")
      .map((type) => type.toLowerCase());
    const source: NameSource | null = types.some(
      (type) => BUSINESS_TYPES.has(type) || BUSINESS_TYPE_WORDS.test(type),
    )
      ? "business-data"
      : types.some((type) => ORGANIZATION_TYPES.has(type))
        ? "organization-data"
        : types.includes("website")
          ? "website-data"
          : null;
    if (source) {
      // Only the main name: `alternateName` is a nickname ("RSPKU Jogja").
      if (typeof record.name === "string")
        found.push({ name: cleanText(record.name), source });
    }
    for (const value of Object.values(record)) visit(value, depth + 1);
  };
  for (const block of blocks) {
    try {
      visit(JSON.parse(block), 0);
    } catch {
      // Broken structured data is common; the other labels still count.
    }
  }
  return found;
}

export function rankBusinessNames(
  labels: NameLabels,
  pageUrl: string,
): NameCandidate[] {
  const labelList: Array<{ name: string; source: NameSource }> = [
    ...structuredNames(labels.structuredData),
    { name: labels.siteName, source: "site-name" },
    { name: labels.applicationName, source: "application-name" },
    { name: labels.shareTitle, source: "share-title" },
    { name: labels.pageTitle, source: "page-title" },
  ];
  // `whole`: a label that splits into parts, which compete for the name.
  const raw: Array<{
    name: string;
    source: NameSource;
    points: number;
    whole: boolean;
  }> = [];
  for (const { name, source } of labelList) {
    if (name.length > MAX_LABEL_LENGTH) continue;
    const parts = name.split(TITLE_SEPARATOR).slice(0, MAX_PARTS);
    if (parts.length < 2) {
      raw.push({ name, source, points: SOURCE_POINTS[source], whole: false });
      continue;
    }
    raw.push({ name, source, points: SPLIT_LABEL_POINTS, whole: true });
    for (const part of parts)
      raw.push({ name: part, source, points: PART_POINTS, whole: false });
  }

  const byKey = new Map<
    string,
    {
      name: string;
      sources: Set<NameSource>;
      points: number;
      whole: boolean;
    }
  >();
  for (const { name: value, source, points, whole } of raw) {
    const name = cleanCandidate(value);
    const key = words(name).join(" ");
    if (
      name.length < 2 ||
      name.length > 100 ||
      !key ||
      PAGE_LABELS.has(key) ||
      ERROR_PAGE.test(key) ||
      WEB_ADDRESS.test(name)
    )
      continue;
    const existing = byKey.get(key);
    if (existing) {
      existing.sources.add(source);
      existing.points = Math.max(existing.points, points);
      existing.whole &&= whole;
    } else byKey.set(key, { name, sources: new Set([source]), points, whole });
  }

  const address = addressName(pageUrl);
  const keys = [...byKey.keys()].map((key) => ` ${key} `);
  const ranked = [...byKey.entries()].map(
    ([key, { name, sources, points, whole }]) => {
      const sourceList = [...sources];
      // A split label matches the address through one of its parts, which
      // gets the credit instead: "Dokter Gigi Medan - Royal Dental Center".
      const matches = !whole && matchesAddress(name, address);
      const generic = looksGeneric(name);
      const wordCount = words(name).length;
      // The short core that longer labels repeat: "EternaMoore" inside
      // "Klinik Kecantikan dan Slimming EternaMoore".
      const repeated =
        matches && !generic
          ? Math.min(
              2,
              keys.filter(
                (other) => other !== ` ${key} ` && other.includes(` ${key} `),
              ).length,
            )
          : 0;
      const score =
        points +
        (sourceList.length > 1 ? 1 : 0) +
        repeated +
        (matches ? 4 : 0) -
        (generic ? 5 : 0) -
        (name.length > 50 || wordCount > 6 ? 2 : 0);
      return {
        name,
        score,
        sources: sourceList,
        matchesAddress: matches,
        looksGeneric: generic,
      };
    },
  );
  // Ties keep the order labels were read in.
  return ranked.sort((a, b) => b.score - a.score);
}

export function pickBusinessName(
  labels: NameLabels,
  pageUrl: string,
): BusinessNamePick {
  const candidates = rankBusinessNames(labels, pageUrl);
  const [best] = candidates;
  if (!best || best.score <= 0)
    return { name: "", confident: false, candidates };
  // A full title that contains the winner ("… - MHDC Clinic") is not a rival.
  const bestKey = ` ${words(best.name).join(" ")} `;
  const next = candidates.find((candidate) => {
    const key = ` ${words(candidate.name).join(" ")} `;
    return (
      candidate !== best && !key.includes(bestKey) && !bestKey.includes(key)
    );
  });
  return {
    name: best.name,
    confident: best.score >= 3 && (!next || best.score - next.score >= 2),
    candidates,
  };
}
