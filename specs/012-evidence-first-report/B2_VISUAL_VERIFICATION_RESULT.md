# B2 visual verification result — Spec 012

**Verdict: PASS**

All required visual, keyboard/focus, reflow, print-boundary, and completed-report PDF
checks pass on the exact reviewed B2 implementation. No runtime defect found. This is
offline evidence work only: no code was changed, nothing was published, merged, or
deployed, and no live/provider call was made.

## 1. Scope and method

Prompt executed: `specs/012-evidence-first-report/B2_VISUAL_VERIFICATION_WORKER_PROMPT.md`
— complete the missing desktop/mobile, keyboard/focus, 200% reflow, completed-report PDF,
and recovery print-boundary evidence for the already technically accepted B2
implementation.

The implementation itself was **not** re-reviewed or re-tested for correctness here; the
independent implementation review (`/private/tmp/nuave-spec012-b2/B2_IMPLEMENTATION_REVIEW.md`,
PASS) already covered unit/build/e2e. This task supplies only the missing evidence.

### Method

1. Created an isolated copy at `/private/tmp/nuave-b2-visual-devin01/repo` from clean base
   `d93ec8256200b662796103246e224bd4a3800603` plus the complete reviewed patch
   (`/private/tmp/nuave-b2-review-eopg00d2/reviewed.patch`,
   SHA-256 `e67e46bfb1301470344be5dab7a70baa7dff8e022535a99353e5a8096480ce18`).
2. Wrote a scratch Playwright probe outside the product tree
   (`/private/tmp/nuave-b2-visual-devin01/probe/b2-visual.spec.ts`) that reuses the repo's
   own `journeyWebServer` / `offlineE2EServerEnv` / synthetic-audit wiring and the same
   journey helpers as `tests/e2e/new-intake-glm.spec.ts`, adding only capture, request
   accounting, keyboard/focus, zoom, and print-media checks.
3. Generated the completed report through the real `createValidatedAuditReport` pipeline
   (scratch Vitest probe `probe/pv-report.probe.test.ts` → `evidence/pv-report.json`),
   so the report path under test is the production one; only fictional answer/source
   content and one real pipeline-produced report object were injected into a local
   session record — the same mechanism the repo's own e2e uses.
4. Captured screenshots, request logs, keyboard-stop logs, an A4 PDF, then rendered every
   PDF page with PyMuPDF (`render-pdf.py`) and inspected each page visually.

## 2. Environment

- Node `v22.23.2`, npm `10.9.8`.
- Playwright `1.62.1`, Chromium headless (bundled build).
- PyMuPDF (fitz) for PDF page rendering (no system poppler/Ghostscript available).
- macOS machine; evidence root `/private/tmp/nuave-b2-visual-devin01/evidence`.
- Synthetic setup: `NUAVE_NEW_AUDIT_ENABLED=true`, `NUAVE_AUDIT_MODE=synthetic`,
  observation system `synthetic-local-fixture`, `web_search_calls: 0`, all provider
  credentials blanked, server bound to `127.0.0.1` only.
- All fictional data: brand "Kedai Fiksi", site `https://kedai-fiksi.example/`,
  source `https://source.example/`. The `/api/audit/report` failure used a mocked
  `422 REPORT_USEFULNESS_FAILURE` response so the recovery surface could be exercised;
  the run stage used the synthetic local fixture end-to-end.
- Request allowlist enforced by route interception; a listener recorded every non-localhost
  request — `external = []` in all three tests.
- Accounting: `USD 1.06241155 of 5` — unchanged; zero provider calls in this task.

## 3. Preservation (before/after)

| Item | Before | After this task | Status |
| --- | --- | --- | --- |
| Isolated repo HEAD | `d93ec82` | `d93ec82` | unchanged |
| Isolated repo tree | 25 files applied from `reviewed.patch` | same 25 files, 25/25 SHA-256 match vs reviewed manifest | unchanged |
| Product/test manifest | 331 product files | 331/331 match (setup check) | verified |
| Original candidate `/private/tmp/nuave-spec012-b2/candidate` | base `d93ec82` + uncommitted patch | 25/25 files re-verified vs `candidate-changes-before.json` | byte-identical |
| Shared checkout `/Users/hy4-mac-006/nuave_v0.2` | HEAD `2a21f85`, its own unrelated work | untouched | unchanged |
| Reviewer evidence `/private/tmp/nuave-b2-review-eopg00d2/` | — | read-only use | unchanged |

Approved spec read from the pinned object
`9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174:specs/012-evidence-first-report/SPEC.md`
(SHA-256 `294ac792c347d0ccce12e6d40f6250b72aaaa038d9ea7313c212421a205e4110`, 738 lines;
copy at `/private/tmp/spec012-approved.md`).

## 4. Commands run (isolated copy; all scratch files outside the product tree)

- `npm ci` — 1,061 packages, 0 vulnerabilities.
- `npx vitest run --config probe/vitest.probe.config.mts probe/pv-report.probe.test.ts`
  — produced the real pipeline report with the code-owned P action.
- `npx playwright test --config probe/playwright.probe.config.ts` — 3 tests, all passed
  (`3 passed`, ~18s, latest full run).
- Repo e2e suite against the same journey (`tests/e2e/new-intake-glm.spec.ts`, run with the
  repo config, output redirected to `evidence/existing-output/`) — passed; its artifacts are
  reused as the "existing evidence" set (see §7).
- `python3 render-pdf.py <pdf> <dir>` — rendered/extracted both PDFs.
- `find … -exec shasum -a 256` — artifact manifest.

## 5. Answers-only recovery — observed results (checks run now)

Test: `B2 recovery visual sweep: widths, keyboard, zoom, print media, guarded retry to
report` (passed).

| Check | Observed |
| --- | --- |
| Notice | `role=alert` "Analisis Nuave belum selesai" visible with exact copy "Sepuluh jawaban model AI sudah tersimpan. Analisis belum memenuhi syarat laporan. Anda dapat membaca dan menyalin jawaban di bawah." |
| Ten answers | 10 `data-report-answer` blocks, each with question, full formatted answer, "Sumber yang tersimpan", provenance grid (Waktu pengamatan / Sistem / Model diminta / Model jawaban = `synthetic-local-fixture`, UTC timestamp) |
| Forbidden surface | zero "Penyebutan"/classification labels, zero buttons matching `PDF|JSON|Unduh|Cetak|Download`, no "Laporan siap", no report-contents nav, no "Analisis Nuave"/"Yang dapat dilakukan" sections |
| 1440 / 390 / 320 px | screenshots at top/middle/bottom + full-page at each width; `documentElement.scrollWidth <= innerWidth` asserted at each width — no horizontal overflow |
| Keyboard traversal | 21 real Tab stops: copy button + "Teks asli" disclosure for answers 1–10, then "Coba buat laporan lagi"; every stop shows `outline: solid 3px` + focus shadow; unfocused-stops list empty |
| Keyboard activation | Enter on "Teks asli pertanyaan 1" expands the accordion; rendered raw text is byte-identical to the persisted `raw_answer`; Enter on "Salin pertanyaan dan jawaban 1" delivers the exact stored text to the clipboard |
| 200% reflow | CSS `zoom: 2` at 1440 px — readable, no horizontal overflow (asserted) |
| Print media | `window.onbeforeprint === null` (no interception); `emulateMedia("print")` leaves all 10 answers visible while copy controls are hidden by print CSS — recovery is not blanked or suppressed |
| Reload | recovery restored from the session record without any new request; all 10 answers intact |
| Guarded retry | one click on "Coba buat laporan lagi" issues exactly one `POST /api/audit/report` (total 2) and replaces recovery with the completed report (`data-direct-ten-report`); no observation rerun (`POST /api/audit/run` stays 1) |

Test: `B2 recovery at the report-attempt ceiling stays readable` (passed).

- First retry via keyboard Enter (`report` total 2), second via pointer (total 3 → ceiling).
- At the ceiling: notice "Batas pembuatan laporan tercapai" visible, retry button rendered
  **disabled**, all 10 answers still present.
- Width sweep 1440/390/320: no horizontal overflow; screenshots at top/controls.
- Reload and Back→"Mulai audit" re-entry restore the exhausted state with zero additional
  API requests; `run` stays 1, `report` stays 3.

### Recovery screenshot index

`probe-output-preserved/b2-visual-B2-recovery-visu-46a6c-dia-guarded-retry-to-report/`:
`recovery-top-{1440,390,320}.png`, `recovery-answer5-{1440,390,320}.png`,
`recovery-controls-{1440,390,320}.png`, `recovery-full-{1440,390,320}.png`,
`recovery-zoom-200.png`, `recovery-zoom-200-answer5.png`, `recovery-print-media.png`
(full page under print emulation), `recovery-after-reload-390.png`,
`success-after-retry-390.png` (full page of the report after the guarded retry),
`crop-390-top.png`, `crop-320-top.png` (top-of-page crops from the full-page captures —
the viewport "top" shots at narrow widths landed past the notice because
`scrollIntoViewIfNeeded` on an already-visible tall element does not scroll to its start).
Logs: `recovery-tab-stops.json`, `recovery-unfocused-stops.json`, `recovery-requests.json`.

`probe-output-preserved/b2-visual-B2-recovery-at-t-3b478-empt-ceiling-stays-readable/`:
`ceiling-top-{1440,390,320}.png`, `ceiling-controls-{1440,390,320}.png`,
`ceiling-after-reentry-390.png`, `ceiling-requests.json`.

## 6. Completed report — observed results (checks run now)

Test: `B2 completed report: code-owned P action on screen and in one A4 PDF` (passed).

| Check | Observed |
| --- | --- |
| Report source | `evidence/pv-report.json` produced by the real `createValidatedAuditReport` pipeline; `priorities` = 1 code-owned P action "Pemeliharaan: periksa dan pertahankan informasi publik yang mendukung rekomendasi pada jawaban pertanyaan 1."; `accuracy_status: could_not_assess`; method summary truthfully says `synthetic-local-fixture` with no web search |
| Ten answers | all 10 rendered in order; each `#report-question-N` textContent equals the stored question; each answer body contains its `AKHIR-JAWABAN-N.` tail marker (completeness incl. late caveat) |
| Statuses/labels | exact labels "Disebut"/"Tidak disebut", "Direkomendasikan"/"Tidak dinilai dari jawaban yang tersedia"; no "Tidak diuji" on a completed observation |
| Title | "AI VISIBILITY REPORT" eyebrow + brand name + scope line on screen and in the PDF |
| Findings/action | section 03 "Analisis Nuave" with finding "Bisnis disebut dalam pengujian" + basis link to Pertanyaan 1; section 04 "Yang dapat dilakukan" with the full P card (Mengapa, Berdasarkan, Penanggung jawab yang disarankan, Selesai ketika, caveat, basis link) |
| Method/footer | section 05 truthful method summary, "Laporan dibuat" timestamp, caveat bullets, footer "KEDAI FIKSI · AUDIT VISIBILITAS AI NUAVE · 2026" |
| Widths | 1440/390/320 section screenshots (summary, detail, findings, priorities, method); no horizontal overflow at 390/320 |
| Keyboard | Tab to contents-nav link → Enter lands focus on `#summary` with non-none outline; Enter on a "Berdasarkan pertanyaan: Pertanyaan 1" evidence link lands focus on `#report-question-1` |
| 200% reflow | `zoom: 2` — readable, no horizontal overflow |
| One print tree | expanding "Teks asli pertanyaan 1" then emulating print hides the raw block (`data-raw-answer` hidden), formatted answers stay — raw text is not duplicated into print |
| External requests | none (`external = []`) |
| Unsafe content | literal rendering: `![Gambar](url)` shown as text, `<script>` escaped as text in the answer body |

Report screenshot index:
`report-summary-{1440,390,320}.png`, `report-detail-1440.png`,
`report-answer-{390,320}.png`, `report-findings-1440.png`,
`report-priorities-{1440,390,320}.png`, `report-method-1440.png`,
`report-full-390.png`, `report-zoom-200.png`, `report-requests.json`.

## 7. PDF verification (completed report, actual B2 path)

- PDF: `evidence/pdf/b2-completed-report-a4.pdf` — A4, `printBackground: true`,
  produced by `page.pdf()` (Chromium headless print pipeline).
- Page count: **11**.
- Rendered pages: `evidence/pdf/b2-completed-report-a4-pages/page-01..11.png`
  (1159×1639 px each).
- Extracted text: `evidence/pdf/b2-completed-report-a4-pages/extracted-text.txt`.

### Per-page visual review

| Page | Content | Result |
| --- | --- | --- |
| 1 | Synthetic-label notice, "AI VISIBILITY REPORT" title, "Kedai Fiksi" + scope, 4-cell meta grid, contents list, 01 Hasil singkat (mention/recommendation counts + bounded-sample caveats), 02 heading | Clean; no overflow |
| 2 | Pertanyaan 1: status grid, evidence line, heading, paragraphs 1–10 | Clean |
| 3 | Answer 1 tail: paragraphs 11–12, table with long-URL cell wrapping correctly inside the cell, nested/task lists, code block, source link, literal `![Gambar]` and escaped `<script>`, `AKHIR-JAWABAN-1.` tail, "Sumber yang tersimpan" + disclaimer, provenance | Clean; table/URL wrap verified |
| 4 | Pertanyaan 2 complete (Rekomendasi = "Tidak dinilai dari jawaban yang tersedia") + Pertanyaan 3 start | Clean |
| 5 | Answer 3 tail + sources/provenance, Pertanyaan 4 complete | Clean |
| 6 | Pertanyaan 5 complete, Pertanyaan 6 header block | Clean |
| 7 | Answer 6 body/sources/provenance, Pertanyaan 7 complete | Clean |
| 8 | Answer 7 provenance, Pertanyaan 8 complete | Clean |
| 9 | Pertanyaan 9 complete, Pertanyaan 10 header | Clean |
| 10 | Answer 10 tail + sources/provenance, 03 Analisis Nuave (finding + basis link), 04 heading + P action start (Mengapa, Berdasarkan) | Clean; section break respected |
| 11 | P action remainder (Penanggung jawab yang disarankan, Selesai ketika, caveat, basis link), 05 Tentang audit ini (method summary, report timestamp, caveat bullets), footer | Clean |

Page-break behavior: question-header + status/evidence blocks keep together; long answer
bodies flow across pages (`break-inside: auto`) without clipping or overlap; every answer
ends with its source block and provenance. No duplicated answer tree, no controls, no raw
block in the print output.

Reused existing evidence (repo's own e2e output, generated this session on the isolated
copy): `evidence/existing-output/new-intake-glm-Spec-012-re-8d586-s-reflow-and-one-print-tree/`
— `report-{1440,390,320}.png`, `report-200-percent.png`, `answer-{1440,390,320}.png`,
`report-print-a4.pdf`. Its A4 PDF (11 pages, 1159×1639 rendered set at
`evidence/pdf/existing-report-print-a4-pages/`, text extracted) shows the complementary
all-negative variant (Penyebutan "Tidak disebut") exercising the **V** template
("Prioritas ini menjelaskan langkah verifikasi, bukan tindakan pemasaran") with
basis links — spot-checked pages 2 and 11 plus the zoom/mobile screenshots, all clean.

## 8. Recovery print boundary

- No `Download PDF`/PDF control, no print control, no JSON export control, and no export
  callback exist on the recovery surface (asserted by zero-match locators).
- `window.onbeforeprint === null` — native browser print is not intercepted.
- Print emulation keeps all 10 retained answers visible; only interactive controls are
  hidden by ordinary print CSS. Recovery is not deliberately suppressed or blanked.

## 9. Request-count evidence

| Journey | identity | extract | glm-questions | extract(GET) | run | report |
| --- | --- | --- | --- | --- | --- | --- |
| Completed report | 1 | 1 | 1 | 1 | 1 | **1** |
| Recovery + guarded retry | 1 | 1 | 1 | 1 | 1 | **2** |
| Recovery at ceiling | 1 | 1 | 1 | 1 | 1 | **3** |

`POST /api/audit/run` is always 1: resizing, reading, copying, printing, reload, and
Back/re-entry never rerun the observation stage; only an explicit guarded retry adds a
report call, and the terminal ceiling is bounded at 3.

## 10. Findings

- **No defects.** All required checks passed; no clipping, overlap, missing content, or
  boundary violation was observed on screen or in either PDF.
- Minor cosmetic note (not a defect; no change requested): at 320 px the decorative
  section index "02" wraps as "0" over "2" beside "Jawaban model AI". Heading remains
  legible; if desired, `white-space: nowrap` on the index would remove it — left to the
  orchestrator.
- Artifact-note: `recovery-top-{390,320}.png` and `ceiling-top-{390,320}.png` landed on a
  scrolled position (the notice at those widths is documented by the full-page captures and
  the `crop-*-top.png` images instead).
- Playwright wipes `outputDir` on every run; after the final full 3-test run the output was
  preserved to `evidence/probe-output-preserved/` (the `probe-output/` copy is identical,
  hash-verified).

## 11. Limits (not covered by this evidence)

- Headless `page.pdf()` is not native OS Save-dialog evidence; `window.print` was stubbed
  for counting, not executed through the OS dialog.
- CSS `zoom: 2` is not native browser-zoom evidence.
- Viewport emulation is not a physical phone; no real-device check was performed.
- All evidence is synthetic/fictional; it does not establish real business usefulness —
  **AC-18 founder usefulness judgment remains separate and unassessed**.
- Print-media emulation verifies CSS/DOM behavior, not a real printer's rasterization.
- No claim is made about production Cloudflare, billing, or real provider output.

## 12. Files created

- Result: this file.
- Scratch probe/configs/scripts (outside the product tree):
  `probe/b2-visual.spec.ts`, `probe/playwright.probe.config.ts`,
  `probe/vitest.probe.config.mts`, `probe/pv-report.probe.test.ts`,
  `render-pdf.py`, `crop.py`. The repo e2e run used the repo's own
  `playwright.config.ts` with `--output` redirected to `evidence/existing-output/`.
- Evidence root `evidence/`:
  `pv-report.json` (SHA-256 `0eb759f5ca078fd16dda1e26f627aaab9dfe695dd65b5eccc26a764a8da18df4`),
  `probe-output-preserved/` (46 files: 40 screenshots incl. 2 top-crops + 5 JSON
  request/focus logs + Playwright `.last-run.json`),
  `existing-output/` (repo e2e artifacts: 7 screenshots + `report-print-a4.pdf` +
  `.last-run.json`),
  `pdf/b2-completed-report-a4.pdf` (SHA-256 `cdc7626ee20809f804fe5ef54f6d88d039abe44f3bf800c90806e62b1a7a5d3c`)
  + `b2-completed-report-a4-pages/` (11 rendered pages + extracted text),
  `pdf/existing-report-print-a4-pages/` (11 rendered pages + extracted text),
  `artifacts-sha256.txt` — SHA-256 manifest of all 124 artifact files
  (manifest SHA-256 `b0b19654a70312b1329dcb47e0fd01fe04627c6313fb4636e99047868217292a`).
- Isolated repo copy `/private/tmp/nuave-b2-visual-devin01/repo` (base + reviewed patch;
  tree unchanged after the run — 25/25 hashes re-verified).

No candidate, shared-checkout, or reviewer files were modified. No commit, push, PR,
merge, deployment, live provider call, or business-site fetch was made. Spec 012 remains
Approved/in progress; no publication is claimed.

the next action: orchestrator review of this bounded evidence, then the exact B2
publication package.
