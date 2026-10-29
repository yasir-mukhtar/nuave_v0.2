# Business name test

Checks whether the free check picks the right business name from a website.
Started after the mhdc.co.id report named the clinic "Klinik Dokter Gigi
Terdekat" (a search phrase in its site name label) instead of "MHDC Clinic".

## The list

`sites.json` holds 104 real Indonesian healthcare websites, gathered on
2026-10-29: 32 hospitals, 18 dental clinics, 18 aesthetic or skin clinics and
36 other clinics (general, eye, lab, physio, fertility, mental health,
hearing, mother and baby, vaccination). About half are small independents.

The correct name for each was written by hand from what the site shows
people (logo, footer, about text), never from the hidden title labels the
tool reads. `also_correct` lists other forms a person would accept, such as
"RS" for "Rumah Sakit". `certainty` is `medium` for 7 sites whose own pages
use more than one name; `evidence` says where the name was seen.

Left out: sites that did not load, sites built entirely with JavaScript
(Siloam, Hermina, Mitra Keluarga), and spam or hijacked clinic domains.

## Running it

It reads each homepage once, with no AI or paid service. From the
repository root:

```bash
npx esbuild experiments/business-name-test/run.ts --bundle --platform=node --format=esm --outfile=/tmp/name-test.mjs && node /tmp/name-test.mjs
```

Each site's result goes to `results.tsv` in this folder.
