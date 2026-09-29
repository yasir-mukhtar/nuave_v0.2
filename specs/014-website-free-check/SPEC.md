# Spec 014: Website with the free name check

> Status: **In review**, for the founder's approval
> Owner: website build thread (reviewed by the site orchestrator)
> Updated: 2026-09-29
> Implements: plan milestone S6 (landing page) and the S5 page wording,
> brought forward by the founder on 2026-09-29; the launch waits for
> Stage 2 (S3, S4) of [`docs/PAYING_CUSTOMER_PLAN.md`](../../docs/PAYING_CUSTOMER_PLAN.md)
> Decision basis: the three website entries of 2026-09-27 to 2026-09-29 in
> [`docs/DECISION_LOG.md`](../../docs/DECISION_LOG.md), recorded with this
> spec

## Required context

Read in order:

1. `AGENTS.md`
2. This spec
3. `docs/PAYING_CUSTOMER_PLAN.md`: §2 and §5 S3–S6 (what the launch needs)
4. `docs/AUDIT.md`: "Scope of one audit" and "Capture only what the report
   needs" (the observation method and the words mention and recommendation)
5. `docs/VOICE.md` and `docs/DESIGN.md`
6. The website team's approved files, in the project's shared folder
   (`/mnt/project-files/site/`). They are the source for every word and
   every design choice; this spec does not copy them:
   - copy: `content/home-v9.md`, `content/result-and-pay-v1.md` (called RP
     below), `content/faq-v1.md`, `content/legal/syarat-v1.md`,
     `privasi-v1.md`, `kontak-v1.md`
   - design: `design/home-v2.html` (the home and its result states),
     `design/page-system-v1.html` (tokens, parts, legal page layout),
     `design/a11y-notes.md`
   - SEO: `seo/page-seo.md`, `seo/structured-data.md`,
     `seo/jsonld/faqpage.json`
   - conditions: `architecture/implementation-notes.md`,
     `legal/pdp-requirements.md` §3.3, `legal/meta-ads-and-capi-check.md`
   - stored questions: `/mnt/project-files/landing/stored-question-sets-draft.md`
     (klinik kecantikan)
7. Code: `src/app/page.tsx`, `layout.tsx`, `fonts.ts`, `robots.ts`,
   `sitemap.ts`, `src/app/{faq,terms,privacy,support}/page.tsx`,
   `src/styles/tokens.css`; `src/app/api/audit/identity/route.ts` (reused
   for "Lainnya"); `src/lib/audit/rate-limit.ts`, `wrangler.jsonc`,
   `.github/workflows/pr-preview.yml`; for the stored-answers run,
   `src/lib/audit/protected-observation-provider.ts`, `telemetry.ts` and the
   existing live-run pattern in `scripts/kopikenangan/`

Do not load: `archive/`, the intake screens under `src/lib/intake/`, and the
older landing drafts in `docs/content/` (superseded by the team's files).

## Problem

**Evidence.** `v2.nuave.ai` still shows the interim landing of 2026-08-20
(Spec 006 P1): Rp99.000, a free link into `/audit`, no free check. Since
then the founder set the price at Rp299.000 with a Rp790.000 package that
adds a re-check, chose aesthetic clinics in Jabodetabek as the first target,
and approved a website built by the site team: home copy v9, design home v2,
an FAQ and new legal pages (decision log, 2026-09-27 to 2026-09-29). The
approved home opens with a free check of the visitor's business name
against stored AI answers. None of that exists: there are no stored
answers, no check, and no place outside the public repository to keep the
real business names those answers contain.

**Interpretation.** A visitor from a Meta ad needs to see, free and within a
minute, whether AI names their business before being asked to pay.

## Desired outcome

A visitor on a phone picks a business type and city, types the business
name, and sees on the same page, within seconds: in how many of 10 real,
dated AI answers the name appears; how many other businesses are named
(counts, never names); and the two packages. The FAQ and legal pages carry
the approved text. All of it runs now on a pull-request preview with
invented data, and goes live on `nuave.ai` only together with payment.

## User and situation

The owner or marketing lead of a small Indonesian business, first an
aesthetic clinic in Jabodetabek, on a phone after tapping a Meta ad. Until
launch, the founder and the site team, reviewing the preview.

## Scope

- **Home `/`:** every section of home v9 in home v2's design, including the
  check form, all result states and the packages; the 404 page.
- **The free check:** a server endpoint with no AI call, the name matching,
  a reader for stored answers kept in Cloudflare KV, and an invented set for
  previews and tests.
- **"Lainnya":** the business preview from a link, through today's identity
  check, which reads the public page without AI.
- **Other pages:** `/faq`, `/terms` (with `#uang-kembali`), `/privacy`,
  `/support`, with the approved text.
- **SEO:** titles, descriptions, H1s, JSON-LD, sitemap and robots, with
  noindex kept until launch.
- **Look:** the approved fonts (Gabarito, Hanken Grotesk, Gochi Hand) and
  the site's tokens, on the site pages only; `docs/DESIGN.md` records them.
- **A launch switch**, so finished slices can merge without going live.
- **The stored-answers run:** one script, run once where the OpenAI key
  already lives, within USD 2, and its two findings.

## Non-scope

- The intake and report (Specs 013 and 012). `/audit` and its APIs do not
  change. The home only calls the existing identity check.
- Payment, orders and email (S3, S4): the pay page `/bayar`, the payment
  status page, and opening the stored answers after payment. Until then
  "Pesan audit" leads to a preview-only notice (R-20).
- The Meta Conversions API, both events. It needs the founder's Meta dataset
  ID and token, and comes with payment.
- `/contoh-laporan`: a later slice, once the site team's page lands (round
  4). Links to it stay hidden until it exists.
- The launch itself: `nuave.ai`, its DNS, and lifting noindex.
- Stored answers for klinik gigi, wedding organizer, travel and bimbel, and
  any refresh. Each needs a new founder approval; until then those types show
  the "not collected yet" state.
- Category pages, an agency page and guides (phase 2).
- A cookie bar, analytics or a Meta Pixel (decided: none).
- Deleting the old landing and old legal pages: after launch.

## Experience

The home follows home v9 top to bottom (hero and form; result; story with
the night street and the chat example; why them; how it works; sample
report; pricing; limits; FAQ; final call; footer), in home v2's design, with
one sticky "Cek gratis sekarang" button on phones. Every word comes from the
team's files.

After "Cek sekarang" the result replaces the hero on the same page:

| State | When | Copy |
|---|---|---|
| Found often | the name is in 4 to 10 answers | RP §2.4 |
| Found a few times | 1 to 3 answers | RP §2.3 |
| Not found | 0 answers, no similar name | RP §2.2 |
| Similar name | 0 answers, 1 to 3 similar names | RP §2.5 |
| Nobody named | the answers name no business | RP §2.2, edge line |
| Not collected yet | no stored set for this type and city | RP §2.6 |
| Lainnya | the visitor picked "Lainnya" | RP §2.7 |
| Errors | validation, rate limit, server or network | RP §1.4 |

The packages (RP §2.8) follow every state.

## Requirements

**Launch and preview**

- **R-01:** A server setting, `NUAVE_NEW_SITE_ENABLED`, switches `/`,
  `/faq`, `/terms`, `/privacy`, `/support`, the 404 page and the check
  endpoint to this spec's site. Off, which is the default and production's
  value until launch, today's pages stay and the check endpoint answers 404.
  On: pull-request previews now; production only at launch, with payment.
  The founder turns it on.
- **R-02:** Stored answers come from one source, set on the server:
  `fixture` (an invented set in the repository, for previews and tests) or
  `kv` (a Cloudflare KV namespace, for production). With no source set,
  every type and city shows "not collected yet". Production never falls back
  to the fixture, and a fixture result carries a visible "Data contoh" label.
- **R-03:** `/audit` works exactly as today in both switch positions, so the
  founder's test runs still start there.

**The stored-answers run**

- **R-04:** A script asks the 10 approved klinik kecantikan questions, with
  `{kota}` set to Jakarta, Bogor, Depok, Tangerang and Bekasi: 50 answers.
  Each question is asked once through the audit's protected observation
  method (same model, low reasoning, web search required). A failed call is
  retried only as the audit retries, and the retry is recorded.
- **R-05:** For each city, one more call with the same model and no web
  search lists the businesses each answer names, and merges spellings of the
  same business within that city. These 5 calls are part of the run.
- **R-06:** The script reserves each call's cost before making it and stops
  before any call that could take the run past USD 2. It prints the
  accounted spend, which goes on the agent-run line in `docs/NOW.md`.
- **R-07:** The output stays out of Git (`.secrets/`). For each city set it
  holds the date, the system and returned model, the 10 questions, each
  answer's text and sources, and the business list per answer. A set with
  fewer than 10 completed answers is never uploaded.
- **R-08:** The script reports two findings without naming any business:
  how many businesses each answer names (lowest, middle and highest, per
  city), and whether small local clinics appear at all. The second is a
  judgment, made from the names by whoever runs the script on the founder's
  device, and reported as counts. The first is the launch gate for the subhead's "ChatGPT biasanya
  cuma menyebut beberapa nama" (home v9 §13); the content designer sets the
  line from it.

**The check**

- **R-09:** The form offers the six types, the five cities, the business
  name, and a website or Instagram link that is optional, except for
  "Lainnya". Validation and its messages follow RP §1.4 (empty, under three
  letters, only the type, a link in the name field, no city), shown under
  the field, with focus on the first field that needs fixing. The fine print
  under the button shows the date of the stored set for the picked type and
  city, and its "Cara kami cek" opens the same note the result shows, in
  place (home v9 §1).
- **R-10:** The check runs on the server, makes no AI call and fetches
  nothing. From the stored set for the type and city it returns: each
  question with "ditemukan" or "tidak ditemukan"; the count out of 10; how
  many other businesses the 10 answers name in total; how many of them are
  named more often than the visitor; the named list as counts only, with the
  visitor's row in its real position; up to three similar names (R-12); and
  the set's date. The browser never receives answer text, or any other
  business name, before payment.
- **R-11:** A name is **found** in an answer when the whole typed name
  appears in it, ignoring case, accents, punctuation and spacing, and
  treating "klinik" and "clinic", and "&" and "dan", as the same word. An
  answer counts once.
- **R-12:** When the name is found nowhere, the check offers up to three
  **similar names** from the stored business list. A similar name shares
  most of the typed name's distinctive words (the words left after the
  type's generic words and the city), counted in both directions, allowing
  small spelling differences. It never matches on one shared word when
  either name has more distinctive words, so "Rina" cannot surface "Klinik
  dr. Rina Kusuma". A chip shows the business name as the answer states it,
  with no person's name or quote added, and its count. Tapping a chip shows
  the found state for that name with "Dihitung dari nama … yang Anda
  pilih."; "Bukan, tidak ada yang cocok" shows not found.
- **R-13:** The result states, their words and the packages follow RP §2:
  the meta line, and under it the method line only with stored answers; the
  question list with "Lihat 6 pertanyaan lainnya"; the named list with
  "(Anda)" in its real position and "+ N … lain"; "Cara kami cek", closed
  but in the page source; the caveat; the difference line, the two cards
  and the lines under them. "Cek bisnis lain", "Cek nama lain" and "Ganti
  jenis usaha atau kota" return to the form with the right field focused
  and what was typed kept.
- **R-14:** The result stays on the same address; nothing typed ever enters
  the address bar. Focus moves to the result heading, the main line is
  announced politely, and so is the loading state.
- **R-15:** With "Lainnya", the link is required and the button reads "Cari
  bisnis saya". The page calls today's identity check and shows RP §2.7:
  found, partial, not sure, or the link errors. "Ya, lihat paket audit"
  shows the packages.
- **R-16:** Each address may run the check 10 times a minute (a new
  Cloudflare limit). Above that, RP's "too many checks" line gives the real
  wait, one minute, in the content designer's words. A server or network
  failure shows "Cek belum berhasil. Coba sekali lagi, ya." and keeps what
  was typed.
- **R-17:** The server stores and logs nothing the visitor types. The
  privacy page's 30-day line stays true as an upper limit.
- **R-18:** `/?jenis=<type>&kota=<city>` preselects the type and city and
  server-renders that type's headline word. Unknown values are ignored, the
  canonical address stays `/`, and a business name is never read from the
  address.

**The page**

- **R-19:** The headline's rotating word is server-rendered as "Klinik", or
  the preset type's word. Only that word rotates; the type chips never
  change on their own. Rotation stops when the visitor touches the form and
  then shows the picked type; it has a "Jeda"/"Putar" button and is off
  with reduced motion. Screen readers hear one stable sentence.
- **R-20:** "Pesan audit" goes to `/bayar?paket=audit` or
  `/bayar?paket=cek-ulang`. Until S3 and S4 build the pay page, `/bayar`
  shows a plain notice, marked noindex, that payment is not built yet. The
  switch cannot go on in production before the real pay page exists (R-01).
- **R-21:** The words that follow the business type (home v9 §11): the
  headline word, the customer noun, the calculator hint and output, the
  final call and the result's nouns.
- **R-22:** The pricing calculator computes its two outputs live from the
  value typed (home v9 §7); nothing typed there leaves the browser.
- **R-23:** Accessibility follows `a11y-notes.md`: AA colours, 44 px
  targets, visible focus (white on dark areas), a skip link, `lang="id"`,
  one h1, focus never hidden under the sticky parts, reduced motion. Blurred
  names are drawn shapes, hidden from screen readers, which hear "Nama ada
  di laporan, N jawaban". The shapes' widths never come from the real names.
  Nothing scrolls sideways at 320 px.
- **R-24:** Fonts load through `src/app/fonts.ts` and apply only to the
  site pages; `/audit` and the report keep Geist. The site's colours and
  sizes live in `src/styles/tokens.css`. `docs/DESIGN.md` records the fonts,
  the display role, the AA shades, the rotating-word exception, the drawn
  scenes and the one-column desktop (founder, 2026-09-28).
- **R-25:** Generic parts use shadcn with Base UI and Tabler icons, per
  `AGENTS.md`. The night street, the chat example and the drawn shapes are
  Nuave's own drawings. The prototype's "Prototype only" controls are not
  built.

**Other pages**

- **R-26:** `/faq` carries `faq-v1.md`: the groups with their anchors, the
  jump links, the questions and answers, and the closing call. Answers stay
  in the page source. Its FAQPage JSON-LD matches the visible text.
- **R-27:** `/terms`, `/privacy` and `/support` carry `syarat-v1.md`,
  `privasi-v1.md` and `kontak-v1.md` in the page system's legal layout
  (numbered sections, a contents list, tables that stack on phones), with
  the date and version lines. The refund heading has `id="uang-kembali"`.
  Placeholders such as "[Nama PT Perorangan]" stay visible until the founder
  sends the PT's details. The lawyer's ⚖️ marks are review marks, so they
  stay in the team's files and are not shown on the page.
- **R-28:** The 404 page follows RP §5 and is noindex.
- **R-29:** Titles, descriptions and H1s follow `page-seo.md` §3; JSON-LD
  follows `structured-data.md` (Organization, WebSite, Service with two IDR
  offers and no availability, FAQPage; no `legalName` until the PT exists).
  The sitemap lists the five public pages at `https://nuave.ai`, and
  canonical addresses point there. Every deployment stays noindex until a
  setting, `NUAVE_SITE_INDEXABLE`, lifts it on `nuave.ai` at launch; then
  robots.txt allows AI crawlers and names the sitemap. `/bayar`, `/audit`
  and 404 are always noindex.

**Quality**

- **R-30:** Words are copied from the team's files as they stand when a
  slice is built. A needed change goes back to the content designer through
  the orchestrator; the build never rewrites copy.
- **R-31:** Unit tests cover the matching (R-11, R-12, including the "Rina"
  case), the endpoint's response (no names beyond the chips; no fixture in
  `kv` mode), validation and the calculator. A browser suite with the switch
  on covers every result state at 390 and 320 px, the keyboard path and
  reduced motion. `verify-nuave` gains a site feature. `npm run verify`
  passes with no live call.

## Failure and recovery

- **No stored set** for the type and city: "not collected yet" (RP §2.6).
- **KV unreachable, or a stored set fails its checks:** "Cek belum
  berhasil. Coba sekali lagi, ya.", and the server logs the failure without
  any name. Never "not collected yet", which would be untrue.
- **Identity check fails** ("Lainnya"): the RP §1.4 link errors.
- **Too many checks:** R-16.
- **The run** stops at the USD 2 limit or on repeated failure. It keeps what
  completed, and a city with fewer than 10 answers is not uploaded.
- Never show fixture data in production, never guess a count, and never let
  the page imply a live AI call happened during the check.

## Evidence, data, privacy, and cost

- **Real names** from the stored answers live only in the run's output file
  on the founder's device and in KV. The browser sees at most three of them,
  as similar-name chips (legal, 2026-09-29). They never go into Git, the
  page source, logs or a preview.
- **Provenance:** each stored set records its date, system, returned model
  and web search, and the page shows the date. The site calls them "jawaban
  AI" and the method line names OpenAI (`docs/VOICE.md`).
- **Cost:** the check costs nothing but a KV read. The run is capped at
  USD 2 under the founder's decision of 2026-09-29; other types and
  refreshes need new approval.
- **Typed names** are not stored (R-17). The site sets no cookies and
  loads no analytics or pixel.
- **Credentials:** the run uses the OpenAI key where it is already set up,
  never in chat, Git or a prompt.

## Acceptance criteria

- **AC-01:** With the switch off, `/`, `/faq`, `/terms`, `/privacy` and
  `/support` are today's pages, the check endpoint answers 404, and
  `/audit` works as before (R-01, R-03).
- **AC-02:** With the switch on and the fixture set, typing a fixture name
  found in 4 or more answers, in 1 to 3, a name found nowhere, a near
  spelling, and any type without a set each shows its state with the RP
  words, the packages, and the "Data contoh" label (R-02, R-10, R-13).
- **AC-03:** The endpoint's response and the page source contain no fixture
  business name other than the offered chips, and no answer text (R-10).
- **AC-04:** Matching, in unit tests: "klinik tarlesa" is found in an answer
  that says "KLINIK TARLESA,"; where the answers say only "Tarlesa Clinic",
  it is not found and "Tarlesa Clinic" is offered as a similar name;
  "Tarlesa Skin Clinic", with "Tarlesa Skin" and "Klinik Tarlesa" stored,
  offers both; "Rina" offers nothing from "Klinik dr. Rina Kusuma"; a
  type-only name is refused before any request (R-09, R-11, R-12).
- **AC-05:** With source `kv` and no set for a type and city, the page shows
  "not collected yet", never fixture data; with KV failing, it shows the
  failure line (R-02, failure).
- **AC-06:** "Lainnya" with a link shows the identity preview in synthetic
  mode, and "Ya, lihat paket audit" shows the packages (R-15).
- **AC-07:** The eleventh check from one address within a minute shows the
  wait line (R-16).
- **AC-08:** After a check, the address bar has no business name; focus is on
  the result heading; the main line is in a polite live region (R-14).
- **AC-09:** `/?jenis=wo&kota=depok` renders "WO" as the headline word in the
  server HTML with WO and Depok selected; `/` renders "Klinik" (R-18, R-19).
- **AC-10:** The rotation stops on the first touch of the form, has a
  working "Jeda"/"Putar" button, and never starts under reduced motion; the
  chips never change on their own (R-19).
- **AC-11:** At 320 and 390 px no page scrolls sideways, every control is at
  least 44 px, and keyboard focus is visible and never covered (R-23).
- **AC-12:** `/faq`, `/terms`, `/privacy` and `/support` show the team's text
  word for word, `/terms#uang-kembali` lands on the refund section, and the
  FAQPage JSON-LD matches the visible questions and answers (R-26, R-27,
  R-29).
- **AC-13:** Every page is noindex and robots.txt disallows all while
  `NUAVE_SITE_INDEXABLE` is unset; the sitemap lists the five pages at
  `https://nuave.ai` (R-29).
- **AC-14:** The run, dry-run with a stub provider, asks 50 questions and 5
  list calls, stops before passing a lower test limit, writes only under
  `.secrets/`, and prints the two findings without names (R-04 to R-08).
- **AC-15:** `npm run verify` passes, and `verify-nuave` passes the site
  feature with no unexpected outside request (R-31).
- **AC-16 (judgment, orchestrator and founder):** the preview matches home v2
  and the page system on a phone and a laptop, and the words match the
  team's files.

## Delivery slices

One PR each, in this order. A slice may merge once it passes review: the
switch keeps it off production until launch.

| Slice | Contents | Requirements | Size |
|---|---|---|---|
| **W0** | This spec, the decision-log entries and the price wording in the product docs | — | S |
| **W1** | The stored-answers script, with a stub-provider test; the founder's run on their device; the two findings | R-04–R-08 | S |
| **W2** | The switch, fonts and tokens, the home with the check, result states and packages, "Lainnya", the 404 and `/bayar` notice, the fixture set, KV reader and rate limit, home SEO | R-01–R-03, R-09–R-25, R-28–R-31 | L |
| **W3** | `/faq`, `/terms`, `/privacy`, `/support`, the sitemap and robots, FAQPage JSON-LD | R-26, R-27, R-29–R-31 | M |

W1 and W2 may share one PR if the run is still waiting when W2 is ready.

## Before launch (not in these slices)

The switch goes on in production, and `nuave.ai` points at the worker, only
when all of these are true:

- S1 to S5 are done: security patches, spending cap, orders with email and
  saved reports, Midtrans, and the page wording checked against them.
- The pay page and the payment status page are built from RP §3 and §4, and
  payment opens the stored answers (RP §2.1).
- Both Meta Conversions API events are built as decided on 2026-09-29.
- The founder has made a KV namespace for the `nuave-v2` worker (plan §4.3)
  and the run's sets are uploaded.
- The PT's name, address and NIB replace the placeholders, and a lawyer has
  checked the 12 marked points (decision 8), if possible.
- The subhead follows the run's first finding, and the invented names are
  checked once more against real businesses.
- `/contoh-laporan` exists (decision 4).
- A TalkBack and VoiceOver pass covers check, result and pay.

## Open questions

None for the product. Approving this spec also approves three defaults:

1. **A launch switch** instead of keeping the pull requests open until
   payment: slices merge after review and stay off production until launch.
2. **Five extra small calls** in the run, without web search, to list the
   businesses each answer names (R-05), within the USD 2.
3. **Where the run happens:** a Remote Control session in the founder's
   Nuave folder, where the OpenAI key already is, or the founder runs one
   command. The founder picks at W1.

Copy still owed by the content designer, not blocking approval: the fine
print for a type without stored answers, and the rate-limit wait line.

## Implementation notes

- Stored-answers data: one KV key per type and city, for example
  `klinik-kecantikan:bekasi`, holding the whole set as JSON with a version.
  The worker reads it through the OpenNext Cloudflare context.
- Previews set `NUAVE_NEW_SITE_ENABLED=true` and the fixture source in
  `pr-preview.yml`; the production deploy sets neither until launch.
- Fonts: prefer `next/font/local` with the OFL files in the repository, so
  the build needs no network.
- The fixture set uses only the invented names from home v9 §13 (Tarlesa,
  Klinik Jevrana, Brivenna Skin, Kinovra Clinic) and new invented names
  checked the same way.

## Verification record

Complete after implementation:

- Verification artifact: `specs/014-website-free-check/VERIFICATION.md`
- Result: Pending
- Date: Pending
- Verified commit or working-tree state: Pending
