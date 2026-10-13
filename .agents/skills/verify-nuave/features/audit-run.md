# Audit run

The whole path of an order, in synthetic mode against the local database
(spec 016 AC-20): the owner types a website, confirms the business from the
free lookup, gives an email, waits while Nuave reads the website, answers the
intake and approves ten questions. The audit then runs on the server, so the
tab may be closed. The report is opened later from the emailed link.

## Sub-features

- `order-free-first`: brand confirm (screen 3) and the order summary (screen 3a)
  make no order and no paid request.
- `order-made`: `Lanjut` with an email makes one order (`POST /api/orders`),
  then the paid reading runs once (`POST /api/audit/extract`) and the "Nuave
  sedang membaca" screen shows.
- `run-on-server`: approving the ten questions (`POST /api/orders/approve`)
  shows "Anda boleh menutup halaman ini. Kami akan mengirim link laporan ke
  email Anda." The retired `/api/audit/run` and `/api/audit/report` are never
  called.
- `run-after-close`: after the first tab is closed, a new tab in the same
  browser shows the running audit.
- `run-delivered`: once the server finishes, the tab says "Laporan Anda sudah
  siap dan kami kirim ke email Anda." and shows no report.
- `run-report-by-link`: the link from the email opens the report with ten
  `[data-answer-body]` and the notice "Audit uji — jawaban sintetis".

## How to get to it (user POV)

- Press `Lanjut` on the brand check, type an email and press `Lanjut` on the
  order summary. Approve the questions with `Mulai audit`.
- Close the tab, wait for the email, open its link.

## Driving it with verify-nuave

Preconditions:

- `$V doctor` prints `doctor: OK`.

Run `$V drive audit-run`. Steps, in order:

- **Entry.** Fills the entry. Evidence: `01-entry-filled`.
- **Brand confirm.** `Periksa`, then "Ini brand yang ingin Anda audit?".
  `network.json.apiCalls` has only `GET /api/audit/identity`. Evidence:
  `02-brand-confirm`.
- **Order summary.** `Lanjut` shows "Ringkasan pesanan" with the email field.
  Still no order. Evidence: `03-order-summary`.
- **Order and preparing.** Types the email, presses `Lanjut`; "Sebentar, Nuave
  sedang membaca" shows (a 600 ms delay on the extract request keeps it
  observable), then the focus screen. Evidence: `04-order-made-preparing`.
- **Intake to questions.** Focus, detail screens, summary, ten questions.
  Evidence: `05-intake-to-questions`.
- **Audit started.** `Mulai audit`; the close-the-page note shows. Evidence:
  `06-audit-started`.
- **Tab closed and reopened.** Closes the tab, opens a new one in the same
  browser at `/audit`; the running audit shows. Evidence:
  `07-tab-closed-and-reopened`.
- **Server finishes.** Runs the cron through `POST /api/dev/run-cron` until
  the report is saved and emailed, reloads, and the delivered screen shows.
  Evidence: `08-server-finishes-audit`.
- **Report by link.** Reads the link from `.local-evidence/test-mail/` and
  opens it in a never-used browser context. Evidence: `09-report-by-link`.
- **Ten answers and label.** Ten `[data-answer-body]`; the notice "Audit uji —
  jawaban sintetis" is visible. A reload keeps the report. Evidence:
  `10-report-after-reload`.
- **Proof.** `network.json.apiCalls` has `POST /api/orders: 1`,
  `POST /api/orders/approve: 1`, and no `/api/audit/run` or
  `/api/audit/report`.

## Gotchas

- `POST /api/dev/run-cron` is a test helper that stands in for the one-minute
  cron. It exists only under `next dev` in synthetic mode and answers 404
  otherwise. Its calls show in `network.json`; they are not user requests.
- The report is not shown in the tab that ran the audit. Only the emailed link
  opens it.
- The label proves synthetic mode only because the report shows it for a
  synthetic order. If it is missing, stop: the server may be live.
- The email goes to `.local-evidence/test-mail/` (git-ignored). No real email
  is ever sent in synthetic mode.
- Interrupted and failed orders need request stubs or a failing provider. They
  are covered by `src/lib/orders/*.test.ts`, not by this drive.
