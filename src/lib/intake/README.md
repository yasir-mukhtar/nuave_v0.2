# Public audit intake

The public `/audit` entry (Spec 010 R-08) runs `SmartIntakeJourney.tsx`. The
blank start opens on the empty business name + source step; `/audit/new-intake`
redirects here. The server gate (`NUAVE_NEW_AUDIT_ENABLED` + `NUAVE_AUDIT_MODE`)
decides whether real provider boundaries or their labeled substitutes answer.

## Journey shape (Spec 013 J2–J4)

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
- `summary`/`clarify` — `SmartSummary.tsx`, the row-level corrected
  understanding. The focus row is read-back only; its `Ubah` returns to the
  focus screen, whose `Kembali` then exits to the summary (a `focusReturn`
  marker survives refresh). `Sudah sesuai — buat pertanyaan audit` freezes
  the context.
- `questions` — `SmartQuestionsScreen.tsx` edits the approved ten.
- `audit` — `SmartAuditStage` runs the ten and shows the report.

Back from `summary` re-enters the screen the current focus implies —
location, product, or focus for whole-brand.

Screens 3 onward carry the four-segment chapter progress and a fixed
`Kembali`/`Lanjut` footer; browser Back performs the same one in-flow step.
Each arrival focuses the screen heading.

## Session

`smart-session.ts` parses `nuave.localIntake.v4` (schema version 5) in
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
