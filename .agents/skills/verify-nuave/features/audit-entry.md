# Audit entry

A visitor reaches the audit from the landing page or by opening `/audit`. The
entry step (J01) asks for one thing: the business's website or Instagram
account. It rejects an empty or invalid address, and text that looks
sensitive, without any server request. A website typed into the landing form
goes along to `/audit`, which starts the free business check at once.

## Sub-features

- `entry-empty`: `/audit` opens on "Bisnis Anda disebut AI?" with the heading
  focused, the field `Website atau akun Instagram bisnis` empty and the
  synthetic-mode label under the form.
- `entry-invalid`: `Cek bisnis saya di AI` with the field empty, or with text
  that is not an address, shows the alert "Masukkan satu website atau akun
  Instagram yang valid.".
- `entry-sensitive`: a token-like URL shows the sensitive-input notice; the
  field and the saved session keep the last safe website.
- `entry-offline`: typing, validation and the sensitive stop make no `/api/*`
  request.
- `entry-landing-handoff`: the landing form's `Cek bisnis saya di AI` opens
  `/audit`, which checks the website at once (one free
  `GET /api/audit/identity`) and shows "Kami menemukan bisnis Anda".
- `entry-change-link`: on the business found, "Bukan bisnis Anda?" →
  `Ganti tautan bisnis` returns to the entry with the website kept for
  correction.

## How to get to it (user POV)

- On `/`, in the hero "Bisnis Anda disebut AI?", type a website into
  `Website atau akun Instagram bisnis` and press `Cek bisnis saya di AI`.
- Open `/audit` directly.
- The old `/audit/new-intake` path redirects to `/audit`, and an old
  `?fixture=` address opens the same empty entry. The e2e suite
  (`tests/e2e/audit-entry.spec.ts`) covers both; this skill does not drive
  them.

## Driving it with verify-nuave

Preconditions:

- `$V doctor` prints `doctor: OK`.

Run `$V drive audit-entry`. Steps, in order:

- **Empty entry.** Opens `/audit`. The entry screen
  `[data-intake-screen="entry"]` shows "Bisnis Anda disebut AI?" (focused),
  an empty `Website atau akun Instagram bisnis` and the label "Mode uji lokal
  menggunakan pengganti sintetis berlabel.". Evidence: `01-audit-entry-empty`.
- **Empty submit.** Presses `Cek bisnis saya di AI` with the field empty. The
  alert "Masukkan satu website atau akun Instagram yang valid." shows.
  Evidence: `02-empty-submit-rejected`.
- **Invalid URL.** Fills `bukan alamat web` and presses the button again. The
  same alert shows. Evidence: `03-invalid-url-rejected`.
- **Sensitive URL.** Fills `https://kedai-fiksi.example/`, then
  `https://kedai-fiksi.example/?token=private`. The notice "Persiapan audit
  belum dapat dilanjutkan. Ada teks yang mungkin berisi informasi sensitif. …"
  shows, and the field keeps `https://kedai-fiksi.example/`. `localStorage`
  `nuave.localIntake.v9` holds `kedai-fiksi.example` and not
  `token=private`. Evidence: `04-sensitive-url-blocked`.
- **No request so far.** `network.json.apiCalls` is `{}` at this point (the
  drive asserts it before going on).
- **Landing.** Opens `/`. Evidence: `05-landing`.
- **Landing form.** Fills `example.com` into the hero field and presses
  `Cek bisnis saya di AI`. The URL ends in `/audit`, the free check runs, and
  "Kami menemukan bisnis Anda" shows the name read from the website,
  `Example`. Evidence: `06-landing-cta-to-audit`.
- **Change link.** Presses `Ganti tautan bisnis`. The entry shows again with
  `https://example.com/` in the field. Evidence: `07-change-business-link`.
- **Proof.** `result.json` status is `passed`, and
  `network.json.apiCalls` is exactly one `GET /api/audit/identity`.

## Gotchas

- The landing website goes to `/audit` through this tab's session storage
  (`nuave:audit-source-handoff-v1`). `/audit` removes it once read, so a
  reload of `/audit` does not check again.
- The sensitive check fires on typing, so the unsafe text never lands in the
  field. The field keeps the last safe value.
- `Cek bisnis saya di AI` exists on the landing hero and on the entry. Scope
  the click to the form or screen that holds the field.
- The first visit to `/` or `/audit` after launch compiles for several
  seconds. Run `doctor` first so that time is not charged to a step timeout.
