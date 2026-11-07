# Sozo evidence for Report v3 proof of concept B: notes

PoC B shows this clinic as "Ultima Clinic" (founder's request, 2026-11-06). In `evidence.json`, doctor names and STR numbers are redacted.

The answers come from `experiments/dataforseo-sozo/results/answers/SUMMARY.md` (run 2026-10-24). Answers 1–5 are from ChatGPT and 6–10 from Google AI Overview. The web evidence comes from 31 plain HTTPS page loads made between 2026-11-06 23:40:02 and 23:48:44 UTC. Real name kept: Sozo Skin Clinic.

## Files

- `evidence.json` has these sections: `answers`, `claims`, `own_site`, `claim_checks`, `robots`, `cited_pages`, `competitor_pages` and `loads`.
- `fetch_log.jsonl` records every load: URL, HTTP status, UTC time, final URL and any error.
- The raw pages and their text were kept in the session's scratch space only, not in Git.
- The fetch and check scripts stayed in the session's scratch space. `build_evidence.py` stops if any quote is not found word for word in its answer or saved page. 260 quotes matched exactly. 6 matched only after ignoring the missing space between two page elements: on the filler page, "Mulai dari" and the price are separate `<span>` elements.

## Rules used

- **Load budget.** 31 of about 40 loads. User agent `Mozilla/5.0 (compatible; NuavePoC/1.0; +https://nuave.ai)`, 25 s timeout, at least 3 s between loads to the same site, `utm_` parameters removed. A 403 was not retried. A timeout or reset was retried once.
- **Which cited pages were loaded.** There are 45 distinct cited URLs outside sozoskinclinic.com. They are ranked by total citation occurrences, counting inline links plus Sources-list entries across all 10 answers, with ties broken by first appearance. The top 15 were loaded. Ranking by "number of answers citing" would have swapped in 9 other URLs; they are listed in `cited_pages_selection`. Three cited competitor pages outside the top 15 (C Derma ×2, Bamed) were loaded for step 7. sozoskinclinic.cloudindo.co.id was tried as a labelled extra because answer 4 cites it for Sozo facts.
- **"Sozo named in text"** reads only the answer's prose. SUMMARY.md's own status line says "Mentions Sozo: YES" for answers 7 and 8 because a sozoskinclinic.com link is cited, but the name does not appear in their text. This matches build.py's `cited` status.
- **Claims** are split into single facts. One sentence can give several claims that share the same quote. Topics were assigned by hand. Ratings and reviews go under `lainnya`, and statements about how cheap Sozo is or how often it runs promos go under `harga`.
- **Verdicts compare the claim with text on Sozo's own pages only.**
  - `sesuai` needs the same figure or fact on the site.
  - A price range is `berbeda` even when one end equals the site price. A note then says so.
  - `tidak_bisa_dicek` means the claim is not stated on the 10 Sozo pages loaded. This includes treatments listed as "Konsultasikan", and opinions.
  - The site's promo offers are images, so promo prices could not be read. A `berbeda` result therefore means only that the site's text gives a different figure.
- **Price page.** Besides `/promo/`, the "Lihat Semua Treatment" page (`/treatment/`, 90 treatments with prices) was loaded as the site's price page.
- **robots.txt** was evaluated by RFC 9309: use the group naming the agent, otherwise `User-agent: *`. The longest matching path wins, and Allow wins a tie.
- **Competitor grid pairs:**
  - Bamed doctor profile with Sozo's `/tim-dokter-sozo-skin/`.
  - C Derma home with Sozo's home and filler page (C Derma was cited for filler/botox).
  - C Derma facial prices with Sozo's `/treatment/`.
  - Both ERHA pages with Sozo's scar page; Sozo's laser page was added as a supplement.
  - "English text" means a sentence, heading or title in English. Brand names, treatment names, menu labels and copyright lines do not count.

## Could not load or verify

- Tokopedia: timed out twice.
- tiket.com: HTTP 403, a bot check titled "Robot atau manusia?".
- Traveloka: HTTP 403 on all 3 Sozo listings.
- Instagram reel: redirected to the login page.
- sozoskinclinic.cloudindo.co.id: the connection was reset, then the retry failed TLS with "certificate has expired". TLS checks were not bypassed. Whether this host is a copy of Sozo's site is **not verified**. Answer 4 lists its title as identical to sozoskinclinic.com's home title.
- Things not readable on loaded pages:
  - the prices inside Sozo's promo images;
  - the home page counters for Dokter, Pasien and Cabang (filled in by script);
  - the body of the Scribd document (only its title and description are in the HTML, and no upload date is shown).
- Not loaded: Sozo's `/testimoni/`, the individual doctor profile pages and the sitemap. The other 26 cited URLs were outside the top 15 and are listed in `cited_pages_selection`.
- Ratings and review statements (answer 5) cannot be checked against Sozo's site.
- The 81 branch entries were counted in the static HTML of `/lokasi/`.

## Main observations (facts only)

1. **Sozo's own site states six different branch counts:**
   - "60 cabang" (home FAQ);
   - "60+ cabang" (home, and the laser page's meta description);
   - "70+ Lokasi" (home);
   - "75+ lokasi" (about page and its title);
   - "78 cabang" (home JSON-LD);
   - "80+ cabang" (`/lokasi/`, which holds 81 entries).
2. **Claim checks: 45 claims gave 21 `sesuai`, 11 `berbeda` and 13 `tidak_bisa_dicek`.**
   - 10 of the 11 `berbeda` are prices in Google's answer to "berapa biaya treatment di sozo".
   - Those prices were cited to Traveloka, tiket.com, Tokopedia, Scribd and Instagram, not to Sozo's site.
   - The 11th `berbeda` is answer 5 saying quality "tampaknya bisa berbeda antar cabang", while the site says standards are "sepenuhnya seragam".
3. **robots.txt** allows Googlebot, Bingbot and OAI-SearchBot on the home and treatment pages, decided by `User-agent: *` and `Allow: /`. No AI agent is named; the only named agent is AdsBot-Google.
4. **JSON-LD** on the home page has three top-level nodes: Organization (with ImageObject, ContactPoint and Country inside), WebSite and WebPage. There is no address and no LocalBusiness or MedicalClinic node.
5. **The cited list and cost articles do not mention Sozo:** hadirr.com's "7 Klinik Kecantikan dengan Cabang Terbanyak" (cited by answers 4 and 7) and suara.com's laser-cost article (answer 1). Only two loaded cited pages mention Sozo: a user-uploaded Scribd price list and a CariBisnis branch listing.
6. **Sozo's own blog is cited by Google without the name appearing.** In answer 7 it is cited for a competitor, Jakarta Aesthetic Clinic. In answer 8 it is cited for a general cost factor.
7. **Doctors and prices compared with competitors:**
   - Sozo shows doctor names with Sp.D.V.E titles and STR numbers on the home and doctors pages. None of the loaded competitor pages shows SIP or STR.
   - Sozo's treatment pages name no doctor, and no SIP number appears on any Sozo page loaded.
   - Sozo's scar page gives no price ("Info Lengkap Harga Hubungi Admin").
   - No Sozo page shows a visible update date. C Derma's article shows a medical reviewer and "Terakhir pada 29 Juli 2026".
8. **Smaller inconsistencies:**
   - Sozo's filler page shows "Korean Filler Mulai dari Rp3.799.000", while its `/treatment/` list says "Konsultasikan".
   - CariBisnis gives the Kelapa Gading 2 branch's hours as every day 10.00–20.00. Sozo's site footer gives Mon–Sat 09:00–19:00 and Sun 09:00–17:00 for all branches.
