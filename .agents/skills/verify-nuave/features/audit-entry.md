# Audit entry

A visitor reaches the audit from the landing page and lands on an empty entry
step at `/audit`. They type a business name and a public website. The entry
rejects missing or invalid input, and text that looks sensitive, without any
server request.

## Sub-features

- `entry-cta`: the landing hero button `Cek bisnis saya di AI` opens `/audit`.
- `entry-empty`: the entry step opens with empty `Nama bisnis` and
  `URL website publik`.
- `entry-invalid`: `Periksa` with a missing name or a non-URL source shows
  "Isi nama bisnis dan satu URL website publik yang valid.".
- `entry-sensitive`: a token-like URL shows the sensitive-input notice and is
  not saved.
- `entry-offline`: nothing on this path calls `/api/*`.

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
  `Cek bisnis saya di AI`. The URL ends in `/audit`, and the entry screen
  `[data-intake-screen="entry"]` shows both textboxes empty. Evidence:
  `02-landing-cta-to-audit`.
- **Empty submit.** Presses `Periksa` with both fields empty. An alert shows
  "Isi nama bisnis dan satu URL website publik yang valid.". Evidence:
  `03-empty-submit-rejected`.
- **Invalid URL.** Fills `Kedai Fiksi` and `bukan alamat web`, then presses
  `Periksa`. The same alert shows. Evidence: `04-invalid-url-rejected`.
- **Sensitive URL.** Fills `https://kedai-fiksi.example/?token=private`. The
  notice "Persiapan audit belum dapat dilanjutkan. Ada teks yang mungkin berisi
  informasi sensitif. …" shows. `sessionStorage` `nuave.localIntake.v2` keeps
  `Kedai Fiksi` and does not contain `token=private`. Evidence:
  `05-sensitive-url-blocked`.
- **Proof.** `result.json` status is `passed`, and
  `network.json.apiCalls` is `{}`.

## Gotchas

- The hero field value does not carry into `/audit`: the entry opens empty by
  design.
- The sensitive check fires on typing, so the unsafe text never lands in the
  field. The field keeps the last safe value.
- The first visit to `/` or `/audit` after launch compiles for several
  seconds. Run `doctor` first so that time is not charged to a step timeout.
