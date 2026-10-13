# Question review

The owner reviews the ten audit questions under "Periksa pertanyaan audit". They
can reword any question, and the edit survives a reload. `Mulai audit` then
starts the audit with the wording as reviewed.

## Sub-features

- `review-ten`: exactly ten `[data-question-slot]`, which survive a reload.
- `review-edit`: `Ubah pertanyaan <n>` → `Pertanyaan <n>` textbox → `Simpan`.
- `review-edit-persists`: the edited wording survives a reload.
- `review-start`: `Mulai audit` starts the audit with the edited wording.

## How to get to it (user POV)

- Confirm the summary with `Sudah sesuai — buat pertanyaan audit`.
- Reload while on the review. The same ten questions come back from
  `localStorage`.

## Driving it with verify-nuave

Preconditions:

- `$V doctor` prints `doctor: OK`.

Run `$V drive question-review`. Steps, in order:

- **Review.** Goes from entry to the ten questions through the shared
  `toQuestions` step. Evidence: `01-question-review`.
- **Edit.** Presses `Ubah pertanyaan 1`, fills `Pertanyaan 1` with
  `Kedai kopi apa yang cocok untuk pekerja di Indonesia?`, and presses
  `Simpan`. Slot 1 shows the new wording. Evidence: `02-question-1-edited`.
- **Reload.** Reloads the page. Ten slots show, and slot 1 still has the new
  wording. Evidence: `03-edit-survives-reload`.
- **Start.** Presses `Mulai audit`. `[data-order-stage="running"]` or
  `"reporting"` shows, with the note that the page may be closed. Evidence:
  `04-audit-started`.
- **Proof.** The cron runs through `POST /api/dev/run-cron`, the emailed link
  opens the report in a new browser context (`05-report-by-link`), and
  `#report-question-1` equals the edited wording.

## Gotchas

- `Ubah pertanyaan 1` needs `exact: true`, or it also matches
  `Ubah pertanyaan 10`.
- The server audit only advances when the cron runs. The drive starts it
  through the development trigger, so `running` is always captured first.
