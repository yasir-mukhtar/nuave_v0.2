# Audit run

The whole path of an order, in synthetic mode against the local database
(spec 016 AC-20, spec 017 AC-24): the owner types a website, confirms the
business from the free lookup, sees the order summary with its price
(Rp99.000, sekali bayar), gives an email and pays with the labelled simulated
payment (no Midtrans, no money), waits while Nuave reads the website, answers
the intake and approves ten questions. The audit then runs on the server, so the
tab may be closed. The report is opened later from the emailed link.

## Sub-features

- `order-free-first`: brand confirm (screen 3) and the order summary (screen 3a)
  make no order and no paid request. The summary shows Rp99.000 "sekali
  bayar", the delivery promise, links to `/terms` and `/privacy`, and the
  `Bayar Rp99.000` button.
- `order-paid-simulated`: `Bayar Rp99.000` with an email makes one order
  (`POST /api/orders`) and starts the simulated payment
  (`POST /api/payments/start`, answered `{simulated: true}`; Midtrans is never
  called). The page shows "Pembayaran diterima" with the order number
  (`NV-` and six characters).
- `order-made`: `Lanjut` after payment runs the paid reading once
  (`POST /api/audit/extract`) and the "Nuave sedang membaca" screen shows.
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

- Press `Lanjut` on the brand check, type an email and press `Bayar Rp99.000`
  on the order summary, then `Lanjut` on "Pembayaran diterima". Approve the
  questions with `Mulai audit`.
- Close the tab, wait for the email, open its link.

## Driving it with verify-nuave

Preconditions:

- `$V doctor` prints `doctor: OK`.

Run `$V drive audit-run`. Steps, in order:

- **Entry.** Fills the entry. Evidence: `01-entry-filled`.
- **Brand confirm.** `Periksa`, then "Ini brand yang ingin Anda audit?".
  `network.json.apiCalls` has only `GET /api/audit/identity`. Evidence:
  `02-brand-confirm`.
- **Order summary.** `Lanjut` shows "Ringkasan pesanan" with the price
  "Rp99.000" and "sekali bayar", the delivery promise (Q5, word for word), the
  links "Syarat Penggunaan" (`/terms`) and "Kebijakan Privasi" (`/privacy`),
  the email field and the `Bayar Rp99.000` button. Still no order. Evidence:
  `03-order-summary`.
- **Simulated payment.** Types the email, presses `Bayar Rp99.000`; the page
  shows "Pembayaran diterima" with the order number. `network.json.apiCalls`
  has `POST /api/orders: 1` and `POST /api/payments/start: 1`, and no
  `POST /api/audit/extract` yet. Evidence: `04-simulated-payment`.
- **Order and preparing.** Presses `Lanjut`; "Sebentar, Nuave sedang membaca"
  shows (a 600 ms delay on the extract request keeps it observable), then the
  focus screen. Evidence: `05-order-made-preparing`.
- **Intake to questions.** Focus, detail screens, summary, ten questions.
  Evidence: `06-intake-to-questions`.
- **Audit started.** `Mulai audit`; the close-the-page note shows. Evidence:
  `07-audit-started`.
- **Tab closed and reopened.** Closes the tab, opens a new one in the same
  browser at `/audit`; the running audit shows. Evidence:
  `08-tab-closed-and-reopened`.
- **Server finishes.** Runs the cron through `POST /api/dev/run-cron` until
  the report is saved and emailed, reloads, and the delivered screen shows.
  Evidence: `09-server-finishes-audit`.
- **Report by link.** Reads the link from `.local-evidence/test-mail/` and
  opens it in a never-used browser context. Evidence: `10-report-by-link`.
- **Ten answers and label.** Ten `[data-answer-body]`; the notice "Audit uji —
  jawaban sintetis" is visible. A reload keeps the report. Evidence:
  `11-report-after-reload`.
- **Proof.** `network.json.apiCalls` has `POST /api/orders: 1`,
  `POST /api/payments/start: 1`, `POST /api/orders/approve: 1`, and no
  `/api/audit/run` or `/api/audit/report`.

## Gotchas

- The payment is the simulated one: synthetic mode only (the server marks the
  order paid with kind `simulated`; the same code in live mode refuses). The
  real Midtrans page, notifications and refunds are not driven here: they need
  the sandbox and a named approval (spec 017 AC-25).
- The waiting, checking and finally-unpaid screens, the replacement order and
  the locks after payment need a Midtrans state the simulated payment never
  produces. They are covered by `tests/e2e/payment-screens.spec.ts` and
  `src/lib/intake/payment-journey.test.tsx`, not by this drive.
- The founder test pass (`/uji`) is not part of this drive; its e2e spec is
  `tests/e2e/payment-screens.spec.ts`.
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
