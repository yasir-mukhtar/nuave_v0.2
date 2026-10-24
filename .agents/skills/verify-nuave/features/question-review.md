# Question review

The owner reviews the ten audit questions under "10 pertanyaan untuk AI"
(J27). They can reword any question in its edit sheet, and the edit survives a
reload. `Jalankan audit` opens the start sheet "Mulai audit sekarang?" (J27b);
only its `Mulai audit sekarang` approves the questions and starts the audit,
with the wording as reviewed.

## Sub-features

- `review-ten`: exactly ten `[data-question-slot]`, which survive a reload.
- `review-edit`: `Ubah pertanyaan <n>` opens the sheet of the same name;
  its `Pertanyaan <n>` field and `Simpan` keep the new wording.
- `review-edit-persists`: the edited wording survives a reload.
- `review-start-sheet`: `Jalankan audit` opens "Mulai audit sekarang?" and
  approves nothing by itself; `Kembali periksa` closes it.
- `review-start`: `Mulai audit sekarang` approves the questions on the server
  and the audit runs with the edited wording.

## How to get to it (user POV)

- On the review, tick the confirmation and press `Buat pertanyaan audit`.
- Reload while on the questions. The same ten come back from `localStorage`.
- The bottom bar's `Kembali` returns to the review. The e2e suite covers
  this; this skill does not drive it.

## Driving it with verify-nuave

Preconditions:

- `$V doctor` prints `doctor: OK`.

Run `$V drive question-review`. Steps, in order:

- **Review.** Goes from the entry to the ten questions through the shared
  `toQuestions` step (free check, payment, paid reading, intake, review).
  Evidence: `01-question-review`.
- **Edit.** Presses `Ubah pertanyaan 1`, fills `Pertanyaan 1` with
  `Rekomendasi kedai kopi yang cocok untuk pekerja kantoran?`, and presses
  `Simpan`. Slot 1 shows the new wording. Evidence: `02-question-1-edited`.
- **Reload.** Reloads the page. Ten slots show, and slot 1 still has the new
  wording. Evidence: `03-edit-survives-reload`.
- **Start sheet.** Presses `Jalankan audit`; the sheet "Mulai audit
  sekarang?" shows. Evidence: `04-start-sheet`.
- **Start.** Presses `Mulai audit sekarang`. `[data-order-stage="running"]`
  or `"reporting"` shows, with the note "Anda boleh menutup halaman ini. Audit
  akan tetap berjalan, dan link laporan dikirim ke email Anda.". Evidence:
  `05-audit-started`.
- **Proof.** The cron runs through `POST /api/dev/run-cron`, the emailed link
  opens the report in a new browser context (`06-report-by-link`), and
  `#report-question-1` equals the edited wording.

## Gotchas

- `Ubah pertanyaan 1` needs `exact: true`, or it also matches
  `Ubah pertanyaan 10`.
- The edit sheet is a dialog: while it is open the questions behind it are
  hidden from role queries.
- The server audit only advances when the cron runs. The drive starts it
  through the development trigger, so `running` is always captured first.
