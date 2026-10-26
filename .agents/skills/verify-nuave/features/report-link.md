# Report link

When the audit is done the server saves the report and emails a private link.
The link opens the report on `/r`, in any browser, with no login. The owner can
save it with either `Unduh PDF` button (the browser print dialog). The
report offers no JSON download (Spec 021 A-08; support exports it with
`npm run support -- export <order>`). A wrong, expired or switched-off link shows
only "Laporan ini tidak tersedia." The tab that ran the audit never shows the
report itself.

## Sub-features

- `link-from-email`: the ready email (the fake mailbox in synthetic mode) holds
  `<site>/r#<secret>`. In a browser with no cookies the link opens the report.
- `link-private`: the report page and its data answer are `noindex`, not
  cached and send no referrer. The secret is in the fragment, never in a
  request URL.
- `report-view`: `[data-saved-report="ready"]`, `[data-direct-ten-report]` and
  the navigation `Report contents`.
- `report-pdf`: the report has two `Unduh PDF` buttons, in the top bar and
  at the end. Each calls `window.print()` once. In print media, all ten
  answers are visible.
- `report-no-json`: no `Unduh bukti JSON` button.
- `link-not-available`: a wrong secret shows `[data-saved-report="unavailable"]`
  with the one sentence "Laporan ini tidak tersedia." and nothing else.

## How to get to it (user POV)

- Finish an audit (see [audit-run](./audit-run.md)). The email arrives and the
  owner opens its link.
- Open any `/r#…` address that is not a working link. The not-available page
  shows.
- A failed audit has no report and no link; the owner gets the failure email
  instead. That path is not reachable in synthetic mode.

## Driving it with verify-nuave

Preconditions:

- `$V doctor` prints `doctor: OK`.

Run `$V drive report-link`. Steps, in order:

- **Order path.** The same ten steps as `audit-run` up to the delivered tab
  (`01-entry-filled` … `10-server-finishes-audit`).
- **Report by link.** Opens the link from the fake mailbox in a new browser
  context. The page is `noindex` and sends no referrer;
  `[data-saved-report="ready"]` and `Report contents` show. Evidence:
  `11-report-by-link`.
- **PDF.** Two `Unduh PDF` buttons show. Pressing the first (top bar)
  brings the counted `window.print()` calls to 1, the last (at the end)
  to 2. Evidence: `12-download-pdf-pressed`.
- **Print media.** Emulates print media. Every `[data-answer-body]` is
  visible. The drive saves `report-a4.headless.pdf` through `page.pdf()` (A4,
  backgrounds on). `result.json.artifacts` labels it
  "headless, not native print" and records `pdfPages`.
- **No JSON.** No `Unduh bukti JSON` button shows.
- **Wrong link.** A second new browser context opens `/r#WWWW…`. The page is
  only "Laporan ini tidak tersedia." Evidence: `13-wrong-link-not-available`.

## Gotchas

- The link secret is in the URL fragment. The drive records URLs without it
  and hides it in each step's `url`, so evidence never holds a working link.
- Check every page of `report-a4.headless.pdf` for clipped text or tables. It
  shows print CSS, not how a given browser's native print dialog paginates.
- The report has a known cosmetic wrap at 320 px width. It is not a
  regression.
- Headless Chromium cannot show a print dialog, so the drive replaces
  `window.print` with a counter before the page loads. Do not claim the native
  dialog was seen.
- The report's contents links show a focus ring only for keyboard focus
  (`:focus-visible`), not after a click. That is intended.
- Switched-off and expired links are proved by the unit tests
  (`src/lib/orders/report-link.test.ts`, `support.test.ts`), not by this drive.
