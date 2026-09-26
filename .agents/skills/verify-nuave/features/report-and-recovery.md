# Report and recovery

A finished audit shows the AI Visibility Report. The owner can save it with
`Download PDF` (the browser print dialog) and download the evidence with
`Unduh bukti JSON`. If the report does not meet the usefulness minimum, the
page shows answers-only recovery instead: the ten saved answers, a notice, no
report controls, and one explicit retry, `Coba buat laporan lagi`.

## Sub-features

- `report-view`: `[data-direct-ten-report]` and the navigation
  `Report contents`.
- `report-pdf`: `Download PDF` calls `window.print()` once. In print media,
  all ten answers are visible.
- `report-json`: `Unduh bukti JSON` downloads `nuave-evidence-v5` with ten
  observations and a report.
- `recovery-answers-only`: after a usefulness failure, the page shows the
  alert "Analisis Nuave belum selesai" and ten `[data-report-answer]`, with no
  PDF, JSON, print or download control. A reload restores it without a new
  request.
- `recovery-retry`: `Coba buat laporan lagi` makes one more report request
  and no new run. The report replaces the recovery view.

## How to get to it (user POV)

- Finish an audit (see [audit-run](./audit-run.md)). The report shows.
- Answers-only recovery is **not user-reachable in synthetic mode**. The synthetic
  report does not produce the usefulness failure. The only way to reach
  recovery here is to inject it.

## Driving it with verify-nuave

Preconditions:

- `$V doctor` prints `doctor: OK`.

**Report (real user path):** run `$V drive report-and-recovery`.

- **Review.** Goes from entry to the ten questions. Evidence:
  `01-question-review`.
- **Report.** Presses `Mulai audit`. `done`, the report and
  `Report contents` show. Evidence: `02-report`.
- **PDF.** Presses `Download PDF`. The counted `window.print()` calls equal 1.
  Evidence: `03-download-pdf-pressed`.
- **Print media.** Emulates print media. Every `[data-answer-body]` is
  visible. The drive saves `report-a4.headless.pdf` through `page.pdf()` (A4,
  backgrounds on). `result.json.artifacts` labels it
  "headless, not native print" and records `pdfPages`.
- **JSON.** Presses `Unduh bukti JSON`. The download is saved as
  `download-evidence.json`. It has `export_version` `nuave-evidence-v5`, ten
  `observations` and a `report`.
- **Proof.** Exactly one `POST /api/audit/run` and one
  `POST /api/audit/report`.

**Answers-only recovery (fault-injected):** run
`$V drive report-and-recovery --inject usefulness-failure`. Its evidence folder
is `report-and-recovery--inject-usefulness-failure/`. Its status is
`fault-injected (not user-reachable in synthetic mode)`.

- **Inject.** `injectUsefulnessFailureOnce` (`tests/e2e/journey.ts`) answers
  the first `POST /api/audit/report` with a fake 422
  `REPORT_USEFULNESS_FAILURE`. It is the same stub
  `tests/e2e/new-intake-glm.spec.ts` uses.
- **Recovery.** Presses `Mulai audit`. `[data-local-audit-stage="report-failed"]`,
  the alert "Analisis Nuave belum selesai" and ten `[data-report-answer]`
  show. No button matches `/PDF|JSON|Unduh|Cetak/i`. Evidence:
  `02-answers-only-recovery`.
- **Reload.** Reloads the page. `report-failed` and `Coba buat laporan lagi`
  show, and there is still one report request. Evidence:
  `03-recovery-after-reload`.
- **Retry.** Presses `Coba buat laporan lagi`. `done` shows. Evidence:
  `04-retry-finishes-report`.
- **Proof.** One `POST /api/audit/run` and two `POST /api/audit/report`.

## Gotchas

- Check every page of `report-a4.headless.pdf` for clipped text or tables. It
  shows print CSS, not how a given browser's native print dialog paginates.
- The report has a known cosmetic wrap at 320 px width. It is not a
  regression.
- Headless Chromium cannot show a print dialog, so the drive replaces
  `window.print` with a counter before the page loads. Do not claim the native
  dialog was seen.
- The JSON download's suggested file name is
  `nuave-local-audit-evidence.json`. The drive saves it under its own name.
- Recovery evidence is never proof of a user path. Report it with its
  fault-injected status.
