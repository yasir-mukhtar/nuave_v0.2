# Public audit intake

The public `/audit` entry (Spec 010 R-08) runs `SmartIntakeJourney.tsx`. The
blank start opens on the empty business name + source step; `/audit/new-intake`
redirects here. The server gate (`NUAVE_NEW_AUDIT_ENABLED` + `NUAVE_AUDIT_MODE`)
decides whether real provider boundaries or their labeled substitutes answer.

## Journey shape (Spec 013 J2–J5)

`SmartIntakeJourney.tsx` owns the screen frame and the session state machine:

- `entry` — `Nama bisnis` + `URL website publik` and `Periksa`. Invalid or
  sensitive input is rejected without a request. A name-only edit keeps
  preparation and every later answer; a website edit resets them.
- `reading` — "Sebentar, Nuave sedang membaca" while the identity and extract
  calls run, with the synthetic-mode label in synthetic mode. It has no
  navigation and is never a navigation target.
- `brand` — "Ini brand yang ingin Anda audit?" shows the typed name, the
  discovered name when different, and the canonical source; `Ubah nama`
  corrects the name inline. `Kembali` returns to the filled entry, `Lanjut`
  opens the focus screen.
- `focus` — "Apa yang ingin Anda audit?" (`smart-target-screens.tsx`) offers
  brand-wide (marked `Saran Nuave`), one location, or one product/service.
  Choosing one location without a usable published list asks to type it
  manually; `Lanjut` then opens the location target screen.
- `location` — "Cabang mana yang ingin diaudit?" lists published locations
  that preparation attributed to the canonical source host (`Dari website
Anda`), plus `Tambah lokasi lain` for a manual name + address
  (`Dari Anda`). `Lanjut` stays blocked until a complete target exists.
- `product` — "Produk atau layanan mana?" lists the
  prepared offerings and accepts a typed name with the same completeness
  gate.
- `category` — "... biasanya disebut apa?" (`smart-detail-screens.tsx`)
  offers the active focus's `Saran Nuave` suggestions — the whole-brand list
  for brand/location, the product's own suggestion for a product focus —
  plus the prepared website category (`Dari website Anda`) and a
  `Tulis kategori sendiri` manual input (`Dari Anda`). A manually typed
  category survives focus changes; a suggested one re-resolves for the new
  focus (R-05/R-13).
- `offerings` — prepared offerings sit in a `Dari website Anda` chip group
  and `Penawaran lain` adds owner items (`Dari Anda`); at least one is
  required outside a product focus, where the audited product is the
  offering and the catalogue is read-only context (R-14).
- `service` — the four fixed channel choices as multi-select cards; at
  least one is required (R-15).
- `market` — four reach cards; `sekitar` needs exactly one area, `beberapa`
  one to eight (a ninth is refused with a visible block, never silently
  dropped), `seluruh`/`luar` none. A location focus never shows this
  screen (R-16).
- `summary` — `SmartSummary.tsx`, the read-back understanding. Each
  business-detail row is read-back; its `Ubah` opens the owning screen and
  `Lanjut`/`Kembali` returns to the summary (an `editReturn`/`editBaseline`
  marker pair survives refresh, so a changed focus or category re-passes the
  category checkpoint before exiting — R-05). While a required meaning is
  missing, `Lengkapi yang perlu dipastikan` opens the first owning detail
  screen. `Sudah sesuai — buat pertanyaan audit` freezes the context.
- `questions` — `SmartQuestionsScreen.tsx` edits the approved ten.
- `audit` — `SmartAuditStage` runs the ten and shows the report.

Back from `summary` re-enters the last detail screen the current focus
implies — `market` for brand/product, `service` for a location focus.

Screens 3 onward carry the four-segment chapter progress and a fixed
`Kembali`/`Lanjut` footer; browser Back performs the same one in-flow step.
Each arrival focuses the screen heading.

## Session

`smart-session.ts` parses `nuave.localIntake.v6` (schema version 6) in
sessionStorage. Only the journey writes it. Refresh restores the stored stage
and answers; a session stored mid-`reading` restores `entry` with the fields
kept and an interruption note — the read is never replayed. Corrupt or
pre-bump records restart safely at entry. Storage is same-tab and
non-durable; no cross-device or paid resume is claimed.
`nuave.localIntakeAudit.v2` holds the audit record.

`smart-intake-contract.ts` freezes precisely the confirmed selection into the
versioned intake input; material changes invalidate the stored question pack.
It also keeps the location gate: `prepareUnderstanding` drops published
locations whose `source_url` host is not the canonical source host
(`samePublicSourceHost` in `source-input.ts` allows a leading `www` only) —
a missing or unparsable `source_url` drops the row too, because without it
the `Dari website Anda` claim cannot be substantiated. An Instagram
canonical accepts only the profile page itself.
`usablePublishedLocations` re-applies that check at display time so a stale
or tampered session cannot surface them.
`source-input.ts` remains the public-source parser behind every entry and
correction.

## Donor shell

`IntakeJourney.tsx`, `screens-bab1.tsx`, `screens-bab2.tsx`, `navigation.ts`,
`state.ts`, `local-session.ts` and `local-questions.ts` are the older
screen-by-screen shell kept as a parts donor for the staged rollout. They are
not mounted by the public journey and must not be wired back in.
`progress.tsx` is the exception: its four-segment meter drives the active
frame's chapter progress.

Shared controls use shadcn/Base UI and Tabler. The approved workbench governs
composition, with canonical Geist typography from docs/DESIGN.md.
