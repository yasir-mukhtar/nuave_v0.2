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

Behind a proxy, add `NODE_USE_ENV_PROXY=1` before `node`.

Each site's result goes to `results.tsv` in this folder.

## Results, 2026-10-29

`results.tsv` is the output of `run.ts` on the code in this PR: every site's
expected name, the picked name, whether the picker was sure, and what the
old method (first of site name label, share title, page title) picked.

| | Right |
| --- | --- |
| Old method | 63 of 103 |
| New picker | **96 of 103** |

103 of 104 homepages were read (rspantinirmala.com reset the connection). No
site the old method got right is wrong now. The picker was sure of 85 of its
96 right answers, and unsure of 5 of its 7 wrong ones.

An earlier run the same day read 99 sites. The first version of the picker
scored 82 of those 99. The misses led to these fixes, so the 96 is measured
on the sites the fixes came from and flatters the picker; a fresh list would
score somewhat lower. The fixes were: ignore labels that are a web address
or a blocked-page notice ("Request Rejected"); drop "Welcome to" and
"Official"; split labels at a colon too; read site-made clinic types such as
`CosmeticClinic` but not `MedicalSpecialty` or the `alternateName` nickname;
give the web-address credit to the part of a label that matches, not the
whole label. That first version is not kept, so its score can't be re-run.

The 7 still wrong:

- Name plus extra words (3): "Klinik Kecantikan dan Bedah Plastik
  EternaMoore", "LAYANAN KESEHATAN MENTAL CONQUERA PSIKOLOGI SURABAYA",
  "Klinik Pratama Rawat Inap Mandiri Makassar".
- No name in any label (4): estetikadraffandi.com, kasoemhearingcenter.com
  and rsmelatiperbaungan.com put only a web address, a search phrase or
  "Home" in their labels; rsgm.unair.ac.id blocks the reader. The picker
  returns nothing and the free check shows a name made from the web address.

Asking the customer to confirm the name when the picker is unsure would
catch all but EternaMoore and Conquera, and those two still contain the
right name.

`run.ts` reads each whole page with a plain request; the picker only looks
at the page head, as the free check does. The free check's own reader also
stops at 512 KB and refuses private addresses, so a site could read
differently there.
