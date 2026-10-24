# Audit run

The whole path of an order, in synthetic mode against the local database
(spec 016 AC-20, spec 017 AC-24): the owner types a website, confirms the
business the free check found, sees the three steps and checkout with its
price (Rp249.000, sekali bayar), gives an email and pays with the labelled
simulated payment (no Midtrans, no money). The paid reading then starts by
itself. The owner answers the intake, reviews the profile and starts the audit
from the start sheet. The audit runs on the server, so the tab may be closed.
The report is opened later from the emailed link.

## Sub-features

- `order-free-first`: the business found (J05), "Tinggal 3 langkah" (J06) and
  checkout (J07) make no order and no paid request. Checkout shows the card
  `Ringkasan pesanan` ("AI Visibility Report", "Kedai Fiksi · 10 pertanyaan",
  Total Rp249.000, "Sekali bayar. …", the delivery promise) and, in the bottom
  bar, `Bayar Rp249.000` over the consent with links to `/terms` and
  `/privacy`.
- `order-paid-simulated`: `Bayar Rp249.000` with an email makes one order
  (`POST /api/orders`) and starts the simulated payment
  (`POST /api/payments/start`, answered `{simulated: true}`; Midtrans is never
  called).
- `paid-reading`: the paid reading (J09) starts by itself, once
  (`POST /api/audit/extract`): "Nuave sedang membaca website Anda", the pill
  "Pembayaran diterima · NV-…" (six characters), and "Yang sudah kami
  temukan", then "Website Anda sudah terbaca" and the Step 2 cover
  "Ceritakan bisnis Anda".
- `start-sheet`: `Jalankan audit` opens "Mulai audit sekarang?" and approves
  nothing by itself.
- `run-on-server`: `Mulai audit sekarang` approves the ten questions
  (`POST /api/orders/approve`) and shows "Anda boleh menutup halaman ini.
  Audit akan tetap berjalan, dan link laporan dikirim ke email Anda.". The
  retired `/api/audit/run` and `/api/audit/report` are never called.
- `run-after-close`: after the first tab is closed, a new tab in the same
  browser shows the running audit.
- `run-delivered`: once the server finishes, the tab says "Laporan Anda sudah
  siap" (J30) and shows no report.
- `run-report-by-link`: the link from the email opens the report with the
  ChatGPT and Google AI Overview cards, nine ChatGPT `[data-answer-body]`
  (question 7's synthetic check fails every time and shows "Tidak dapat
  diuji" with "Minta bantuan"), no AI Overview for questions 3 (empty twice)
  and 5 (Spec 018 AC-16), and the notice "Audit uji — jawaban sintetis".

## How to get to it (user POV)

- Press `Ya, ini bisnis saya` on the business found, `Lanjut ke pembayaran`
  on the three steps, type an email and press `Bayar Rp249.000` at checkout.
  After the paid reading, press `Mulai` and answer the intake. On the ten
  questions press `Jalankan audit`, then `Mulai audit sekarang`.
- Close the tab, wait for the email, open its link.

## Driving it with verify-nuave

Preconditions:

- `$V doctor` prints `doctor: OK`.

Run `$V drive audit-run`. Steps, in order:

- **Entry.** Fills the website. Evidence: `01-entry-filled`.
- **Business found.** `Cek bisnis saya di AI`, then "Kami menemukan bisnis
  Anda" with `Kedai Fiksi`. `network.json.apiCalls` has only
  `GET /api/audit/identity`. Evidence: `02-brand-confirm`.
- **Checkout.** `Ya, ini bisnis saya` → "Tinggal 3 langkah" →
  `Lanjut ke pembayaran`. Checkout ("Konfirmasi dan bayar") shows the order
  card with "AI Visibility Report", "Kedai Fiksi · 10 pertanyaan", "Total",
  "Rp249.000", the price note and the delivery promise (Q5, word for word);
  the bottom bar shows `Bayar Rp249.000`, the consent "Dengan membayar, Anda
  menyetujui Syarat dan Ketentuan serta Kebijakan Privasi." and both links. Still
  no order. Evidence: `03-order-summary`.
- **Simulated payment and paid reading.** Types the email and presses
  `Bayar Rp249.000`. With no further press, the paid reading shows
  "Pembayaran diterima · NV-…" and "Yang sudah kami temukan". An 800 ms
  same-origin delay on the extract request keeps it visible. Evidence:
  `04-simulated-payment-paid-reading`.
- **Cover.** The Step 2 cover "Ceritakan bisnis Anda" shows.
  `network.json.apiCalls` has `POST /api/orders: 1`,
  `POST /api/payments/start: 1` and `POST /api/audit/extract: 1`. Evidence:
  `05-reading-done-cover`.
- **Intake to questions.** `Mulai`, focus, detail screens, Step 3 cover,
  review, confirmation tick, `Buat pertanyaan audit`, ten questions. Evidence:
  `06-intake-to-questions`.
- **Start sheet.** `Jalankan audit` opens "Mulai audit sekarang?"; no
  approval yet. Evidence: `07-start-sheet`.
- **Audit started.** `Mulai audit sekarang`; the close-the-page note shows.
  One `POST /api/orders/approve`. Evidence: `08-audit-started`.
- **Tab closed and reopened.** Closes the tab, opens a new one in the same
  browser at `/audit`; the running audit shows. Evidence:
  `09-tab-closed-and-reopened`.
- **Server finishes.** Runs the cron through `POST /api/dev/run-cron` until
  the report is saved and emailed, reloads, and "Laporan Anda sudah siap"
  shows. Evidence: `10-server-finishes-audit`.
- **Report by link.** Reads the link from `.local-evidence/test-mail/` and
  opens it in a never-used browser context; the page is `noindex`, not cached
  and sends no referrer. Evidence: `11-report-by-link`.
- **Answers and label.** Both source cards; nine ChatGPT `[data-answer-body]`,
  one `[data-failed-slot]` (question 7) and two `[data-not-shown]`; the
  notice "Audit uji —
  jawaban sintetis" is visible. A reload keeps the report. Evidence:
  `12-report-after-reload`.
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
- The paid reading starts by itself only right after payment. A reading cut
  off by a reload waits for `Lanjut` and is not replayed
  (`tests/e2e/payment-screens.spec.ts`).
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
