# Audit entry

A visitor types a website into the landing hero. `/audit` looks it up once
(the free lookup, no AI) and opens straight on the brand check. Opened
directly, `/audit` shows an empty entry step: a public website and an
optional business name. The entry rejects a missing or invalid website, and
text that looks sensitive, without any server request.

## Sub-features

- `entry-cta`: the landing hero button `Cek bisnis saya di AI` opens `/audit`
  on the brand check for the website typed in the hero.
- `entry-empty`: `/audit` opened directly shows empty `Nama bisnis` and
  `URL website publik`.
- `entry-invalid`: `Periksa` with a missing or non-URL source shows
  "Masukkan satu URL website publik yang valid.".
- `entry-sensitive`: a token-like URL shows the sensitive-input notice and is
  not saved.
- `entry-offline`: nothing on this path calls `/api/*` except the hero's one
  `GET /api/audit/identity`.

## How to get to it (user POV)

- On `/`, in the region `Mulai audit visibilitas AI`, type a website into the
  `https://bisnisanda.com` field and press `Cek bisnis saya di AI`.
- Open `/audit` directly.
- The old `/audit/new-intake` path redirects to `/audit`. The e2e suite covers
  that; this skill does not drive it.

## Driving it with verify-nuave

Preconditions:

- `$V doctor` prints `doctor: OK`.

Run `$V drive audit-entry`. Steps, in order:

- **Landing.** Opens `/`. Evidence: `01-landing.png`.
- **CTA.** Fills `example.com` into the hero field and presses
  `Cek bisnis saya di AI`. The URL ends in `/audit`, and the brand check
  `[data-intake-screen="brand"]` shows `example.com`. Exactly one
  `GET /api/audit/identity` was made. Evidence: `02-landing-cta-to-brand`.
- **Direct entry.** Clears browser storage and opens `/audit`. The entry
  screen `[data-intake-screen="entry"]` shows both textboxes empty. Evidence:
  `03-direct-audit-empty-entry`.
- **Empty submit.** Presses `Periksa` with both fields empty. An alert shows
  "Masukkan satu URL website publik yang valid.". Evidence:
  `04-empty-submit-rejected`.
- **Invalid URL.** Fills `Kedai Fiksi` and `bukan alamat web`, then presses
  `Periksa`. The same alert shows. Evidence: `05-invalid-url-rejected`.
- **Sensitive URL.** Fills `https://kedai-fiksi.example/?token=private`. The
  notice "Persiapan audit belum dapat dilanjutkan. Ada teks yang mungkin berisi
  informasi sensitif. …" shows. `localStorage` `nuave.localIntake.v9` keeps
  `Kedai Fiksi` and does not contain `token=private`. Evidence:
  `06-sensitive-url-blocked`.
- **Proof.** `result.json` status is `passed`, and
  `network.json.apiCalls` is `{"GET /api/audit/identity": 1}`.

## Gotchas

- The hero hands the website over in `sessionStorage`
  (`nuave:audit-source-handoff-v1`), never in the address, and `/audit` takes
  it once. Opening `/audit` directly therefore shows the empty entry.
- The sensitive check fires on typing, so the unsafe text never lands in the
  field. The field keeps the last safe value.
- The first visit to `/` or `/audit` after launch compiles for several
  seconds. Run `doctor` first so that time is not charged to a step timeout.
