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

## Results, 2026-10-29

99 of the 104 homepages could be read; 5 refused or timed out on the day
(kiraridentalcare.com, okdentalclinic.com, pantirapih.or.id,
rspantinirmala.com, klinikutamabenecia.com).

| Method | Right, of 99 |
| --- | --- |
| Old: first of site name label, share title, page title | 59 |
| New picker, first version (the code as first proposed) | 82 |
| New picker after fixes from the misses below | **92** |

The last row is measured on the same sites the fixes came from, so it
flatters the picker; a fresh list would score somewhat lower. No site the
old method got right is wrong now.

Fixes made after the first run: ignore labels that are a web address or a
blocked-page notice ("Request Rejected"); drop "Welcome to" and "Official";
split labels at a colon too; read site-made clinic types such as
`CosmeticClinic` but not `MedicalSpecialty` or the `alternateName` nickname;
give the web-address credit to the part of a label that matches, not the
whole label.

The 7 still wrong:

- Name plus extra words (3): "Klinik Kecantikan dan Bedah Plastik
  EternaMoore", "LAYANAN KESEHATAN MENTAL CONQUERA PSIKOLOGI SURABAYA",
  "Klinik Pratama Rawat Inap Mandiri Makassar".
- No name in any label (4): estetikadraffandi.com, kasoemhearingcenter.com
  and rsmelatiperbaungan.com put only a web address, a search phrase or
  "Home" in their labels; rsgm.unair.ac.id blocks the reader. The picker
  returns nothing and the free check shows a name made from the web address.

The picker also says whether it is sure. Of the 92 right, it was sure of 81;
of the 7 wrong, it was unsure of 5 (the four empty ones and Pratama
Mandiri). Asking the customer to confirm the name when it is unsure would
have caught all but EternaMoore and Conquera, and those two still contain
the right name.

`results.tsv` has every site: expected name, picked name, sure or not, and
roughly what the old method picked.
