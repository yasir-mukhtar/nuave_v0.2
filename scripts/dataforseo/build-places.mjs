// Spec 018 R-03: builds src/lib/discovery/places-id.json, the stored snapshot
// of DataForSEO's Google SERP locations for Indonesia (cities plus Jakarta's
// "City Region"), with Indonesian display names. The CSV is public and free:
//
//   curl -o serp.csv https://cdn.dataforseo.com/v3/locations/locations_serp_google_2026_09_01.csv
//   node scripts/dataforseo/build-places.mjs serp.csv 2026-09-01
//
// No credentials, no paid call. Re-run when DataForSEO publishes a new list.
import { readFileSync, writeFileSync } from "node:fs";

const [csvPath, listDate] = process.argv.slice(2);
if (!csvPath || !listDate) {
  console.error("usage: node build-places.mjs <locations.csv> <YYYY-MM-DD>");
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += c;
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [head, ...body] = rows;
  return body.map((r) =>
    Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])),
  );
}

const PROVINCES = {
  Aceh: "Aceh",
  Bali: "Bali",
  "Bangka Belitung Islands": "Kepulauan Bangka Belitung",
  Banten: "Banten",
  Bengkulu: "Bengkulu",
  "Central Java": "Jawa Tengah",
  "Central Kalimantan": "Kalimantan Tengah",
  "Central Sulawesi": "Sulawesi Tengah",
  "East Java": "Jawa Timur",
  "East Kalimantan": "Kalimantan Timur",
  "East Nusa Tenggara": "Nusa Tenggara Timur",
  Gorontalo: "Gorontalo",
  Jakarta: "DKI Jakarta",
  Jambi: "Jambi",
  Lampung: "Lampung",
  Maluku: "Maluku",
  "North Kalimantan": "Kalimantan Utara",
  "North Maluku": "Maluku Utara",
  "North Sulawesi": "Sulawesi Utara",
  "North Sumatra": "Sumatera Utara",
  Papua: "Papua",
  Riau: "Riau",
  "Riau Islands": "Kepulauan Riau",
  "South East Sulawesi": "Sulawesi Tenggara",
  "South Kalimantan": "Kalimantan Selatan",
  "South Sulawesi": "Sulawesi Selatan",
  "South Sumatra": "Sumatera Selatan",
  "Special Region of Yogyakarta": "DI Yogyakarta",
  "West Java": "Jawa Barat",
  "West Kalimantan": "Kalimantan Barat",
  "West Nusa Tenggara": "Nusa Tenggara Barat",
  "West Papua": "Papua Barat",
  "West Sulawesi": "Sulawesi Barat",
  "West Sumatra": "Sumatera Barat",
};

const COMPASS = {
  South: "Selatan",
  East: "Timur",
  North: "Utara",
  West: "Barat",
};

/** "South Jakarta" → "Jakarta Selatan", "Bekasi Regency" → "Kabupaten
 * Bekasi", "West Bandung Regency" → "Kabupaten Bandung Barat". */
function indonesian(name) {
  let base = name.trim();
  let regency = false;
  if (/ Regency$/.test(base)) {
    regency = true;
    base = base.replace(/ Regency$/, "");
  }
  const m = base.match(/^(South|East|North|West|Central) (.+)$/);
  if (m) {
    const dir =
      m[1] === "Central"
        ? m[2] === "Jakarta"
          ? "Pusat"
          : "Tengah"
        : COMPASS[m[1]];
    base = `${m[2]} ${dir}`;
  }
  return regency ? `Kabupaten ${base}` : base;
}

const rows = parseCsv(readFileSync(csvPath, "utf8")).filter(
  (r) => r.country_iso_code === "ID",
);
const byCode = new Map(rows.map((r) => [r.location_code, r]));
const places = rows
  .filter(
    (r) => r.location_type === "City" || r.location_type === "City Region",
  )
  .map((r) => {
    const parts = r.location_name.split(",");
    const parent = byCode.get(r.location_code_parent);
    // Three cities (Merauke, Sorong, Timika) hang directly under the country.
    const provinceEn =
      parent?.location_type === "Province"
        ? parent.location_name.split(",")[0]
        : null;
    if (provinceEn && !PROVINCES[provinceEn])
      throw new Error(`no Indonesian name for province ${provinceEn}`);
    const display = indonesian(parts[0]);
    const middle = parts.length === 4 ? indonesian(parts[1]) : null;
    return {
      code: Number(r.location_code),
      name: r.location_name,
      display,
      area: middle && middle !== display ? middle : null,
      province: provinceEn ? PROVINCES[provinceEn] : null,
      type: r.location_type === "City Region" ? "city_region" : "city",
    };
  })
  .sort((a, b) => a.display.localeCompare(b.display, "id") || a.code - b.code);

writeFileSync(
  new URL("../../src/lib/discovery/places-id.json", import.meta.url),
  JSON.stringify(
    { source: "DataForSEO Google SERP locations", listDate, places },
    null,
    1,
  ) + "\n",
);
console.log(`${places.length} places written`);
