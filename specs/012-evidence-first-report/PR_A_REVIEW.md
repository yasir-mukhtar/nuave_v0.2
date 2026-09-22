# Independent review: Spec 012 PR A (evidence-first report presentation)

> Reviewer: Claude (fresh context, independent of the implementer)
> Date: 2026-09-22
> Reviewed tree: worktree `/private/tmp/nuave-spec-012-pr-a`, branch
> `codex/spec-012-pr-a`, uncommitted working tree on base
> `4e6b2cf6302a0679aa7820d163b214ac8b486e1f` (verified: HEAD equals base;
> base is the spec's investigation base, so no base drift to record)
> Specification read from its approved commit:
> `git show 9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174:specs/012-evidence-first-report/SPEC.md`
> Scope: PR A only — R-01–R-09, applicable R-16–R-19, AC-01–AC-10, A's
> portion of AC-19. Nothing here marks the whole specification Verified.

## Verdict

**Ready for PR, conditional on two truthfulness corrections to
`VERIFICATION.md` (documentation only). No implementation change is required
for PR A.** The pure adapter, the body, the Markdown policy, copy/raw view,
references, single-tree printing, the shared `Download PDF` default, the
approved dependency pins, and the protected boundaries all check out
independently. Both the focused suite (67/67) and the canonical offline gate
(`npm run verify`, exit 0) pass in this worktree.

The two record corrections (Findings 1 and 2 below) exist because the
verification record understates one pre-existing defect that A could not fix
and overstates what the two PDF artifacts prove. Neither changes the code
verdict; both change what a reader of the record would believe.

## 1. Findings, ordered by severity

There are no blocking defects in PR A's implementation. Findings 1–2 require
a record correction; 3–5 are low-severity code observations for the
implementer's judgment; 6–10 are informational and need no action in A.

### Finding 1 — Medium (pre-existing, outside A's allowlist; record must state it)

**The protected header's contents-nav anchors still leave the report.**

- Where: `src/app/audit/ReportView.tsx:256-275` (unchanged protected header,
  `<nav aria-label="Report contents">` with `href="#summary"` … `#method`);
  `src/lib/intake/IntakeJourney.tsx:862-878` (popstate handler) and
  `:808` (`if (m.audit) return { ...m, audit: null }`).
- Reproduction (done in this review, scripted Chromium against the offline
  synthetic server on port 3123): reach the direct-ten report, click
  `nav[aria-label="Report contents"] a[href="#findings"]`. Result:
  `[data-direct-ten-report]` unmounted, `data-local-audit-stage` gone,
  `location.hash === "#findings"`, no new `/api/audit/*` request. Reload
  restored the report with the same request counts (run 1, report 1).
  Clicking the new in-body reference `#findings a[href="#report-question-2"]`
  kept the report mounted and moved focus to `report-question-2`.
- Cause: a fragment navigation fires `popstate`; the intake handler treats it
  as Back and clears the audit stage. A's `ReportReferences.tsx:20-27`
  correctly sidesteps this with `preventDefault` and manual focus/scroll, as
  R-07 requires. The header nav is protected for A (spec: header/brief/
  contents belong to B1), so A could not fix it without breaching the
  allowlist. Both files involved are byte-identical to the base, so the
  defect is pre-existing, not a regression. I did not run the reproduction
  against a base checkout.
- User impact: on the direct-ten report, all five "Isi laporan" links send
  the owner back to the question step. No data or cost is lost; reload
  returns the report. The nav also still shows the old labels/numbers
  ("01 Hasil utama … 04 Hasil tiap pertanyaan") beside a body numbered
  "01 Hasil singkat, 02 Jawaban model AI, …". The spec explicitly assigns
  the nav to B1 and says older links "still resolve"; they do resolve, but
  they also trigger the Back behavior.
- Smallest correction: **for PR A**, add one sentence to
  `VERIFICATION.md` "Findings and limits" (line ~95) stating that the
  protected header nav anchors still fire the intake Back handler and are
  left for B1. **For B1/orchestrator**, either give the nav the same
  report-local handler or make the intake `popstate` handler ignore
  same-document fragment changes; do not fix it in A.

### Finding 2 — Low (evidence labeling; record must be corrected)

**The "toolbar" and "native" PDFs are one artifact produced twice.**

- Where: `tests/e2e/new-intake-glm.spec.ts:817-831` — after
  `emulateMedia({ media: "print" })`, two consecutive `page.pdf()` calls
  write `report-toolbar-a4.pdf` and `report-native-a4.pdf`.
  `VERIFICATION.md:66` ("AC-08 Pass (rendering)") and `:87`
  ("toolbar/native print-engine artifacts").
- Evidence: SHA-256 of both files is identical
  (`024098dba59bf5b7b44ee0fa36a74927759975dd1b141bc11b2259d25ee20686`).
  Neither file is the output of the `window.print()` callback (which is
  spied and counted, not executed) nor of the browser-native print dialog.
  They are two Chromium print-engine captures of the same DOM under print
  media, which is valid evidence for print CSS and single-tree layout, and
  nothing more.
- Impact: a reader of the record could believe two independent print paths
  were exercised. They were not. This mirrors the limitation already
  recorded for Spec 009/010 ("does not prove the native save dialog").
- Smallest correction: reword `VERIFICATION.md:66` and `:87` to "two
  identical print-engine captures; the toolbar callback was spied, not
  rendered; native Save dialog untested", and optionally drop the second
  `page.pdf()` in the test so the artifact naming stops implying two paths.

### Finding 3 — Low (lockfile platform metadata drift)

- Where: `package-lock.json`. The base lockfile carried `"libc": [...]` on
  ten optional Linux binaries (`@rolldown/binding-linux-{arm64,ppc64,s390x,x64}-{gnu,musl}`
  and vite's nested `lightningcss-linux-{arm64,x64}-{gnu,musl}`). The
  regenerated lockfile carries none (10 → 0 occurrences). Everything else
  added is the expected `react-markdown@10.1.0` / `remark-gfm@4.0.1`
  dependency graph (unified 11, micromark, mdast/hast utilities).
- What still holds: the README's known failure did **not** occur — the
  `wasm32` optional entries (`@emnapi/*` ×3, `@napi-rs/wasm-runtime` ×1)
  are retained; `npm ci --dry-run` exits 0 on Node v22.23.2 / npm 10.9.8;
  `npm ls` shows exactly the two approved exact pins, no ranges, no extra
  renderer/plugin package.
- Impact: low. Without `libc`, npm on Linux CI may fetch both the gnu and
  musl variants of those optional binaries; both are `optional`, so the
  install still succeeds. The `validate` CI check remains the authority.
- Smallest correction: regenerate with the npm version that wrote the base
  lockfile (the one that records `libc`), using
  `npm install --package-lock-only`, and confirm `npm ci --dry-run`; or
  accept and watch the first CI run. `VERIFICATION.md:42` should not claim
  "existing versions … retained" without noting this metadata change.

### Finding 4 — Low (Markdown block spacing; content preserved)

- Where: `src/app/audit/report/AnswerMarkdown.tsx:41-44`. Root-level `html`
  block nodes are converted to a bare `text` node; only `definition` /
  `*Definition` nodes are wrapped in a paragraph.
- Evidence: PDF page 4 and screen: `<script>window.__unsafeReport = true</script>`
  is rendered as inert text (correct) but sits directly under the
  `![Gambar](…)` line with no paragraph spacing, because a root-level text
  node has no `<p>` wrapper and `.markdown > * + *` spacing only applies to
  elements.
- Impact: cosmetic. R-05 ("render unsupported HTML … as inert readable
  text") is met; the text is complete and readable.
- Smallest correction: wrap root-level `html` literals in a `paragraph`
  node exactly as definitions are.

### Finding 5 — Low / latent (defensive guard)

- Where: `src/app/audit/report/AnswerMarkdown.tsx:26-29`. `literal(node)`
  slices `raw` by `node.position` offsets; if a node ever lacks `position`,
  `raw.slice(undefined, undefined)` returns the **entire** raw answer, which
  would duplicate the whole answer as text.
- Evidence: not reachable today — every node produced by remark-parse and
  remark-gfm carries a position, and the unit/e2e/PDF checks show no
  duplication. It becomes reachable only if another plugin synthesizes
  nodes.
- Smallest correction: `if (!node.position) return { type: "text", value: node.value ?? "" }`.

### Finding 6 — Informational (unavailable-binding state)

When the adapter returns `unavailable`, `DirectTenReportBody.tsx:29-42`
renders the explicit notice, but the protected header still shows the
toolbar's `Download PDF` and `Unduh bukti JSON` controls (JSON of the invalid
record remains downloadable). The spec requires an explicit unavailable
result and forbids regeneration; it does not require hiding the toolbar,
which is in the protected header. No change in A; B1/B2 may decide.

### Finding 7 — Informational (column alignment)

`report-body.module.css:1-8` centers the body at `max-width: 72ch`, while
the protected header stays full-width and left-aligned. At 1440px the body's
left edge sits roughly 210px right of the header's. R-09's 60–75 characters
per line is met and no protected style is touched. B1's header work should
reconcile the alignment; nothing for A.

### Finding 8 — Informational (nav labels are stale by design)

See Finding 1: labels and numbering in the header nav no longer match the
body. Spec assigns this to B1. Accepted interim state.

### Finding 9 — Informational (status rows)

`ReportAnswer.tsx:86-99` always shows Penyebutan and Rekomendasi and hides
Perbandingan / Informasi publik when they are `not_observed` /
`not_assessed`. R-03 allows those two to be "shown without inventing an
assessment"; AC-03's unassessed label count (9 in the fixture) matches this
reading. A defensible reading; recorded so the orchestrator can confirm it.

### Finding 10 — Informational (spec package on this branch)

`specs/012-evidence-first-report/` here contains only `VERIFICATION.md`;
the approved `SPEC.md` lives on `docs/astra-report-redesign-plan`. Under
R-19 the docs branch merges after the intake branch. Until then PR A's
record references a spec that is not yet on `main`. Expected; note it in the
PR description.

## What was verified independently (beyond the tests)

- Routing: `report-presentation.ts:111` and `ReportView.tsx:186` key only on
  `provenance?.question_method === "direct-ten"`; unit tests route
  `canonical`, `glm-indonesian-slots` and `undefined` to history with
  direct-ten-looking IDs, and `report-body.test.tsx:233-252` renders the
  historical renderer with its own denominator (1 of 3) and the new label.
- Adapter: length 10 on both sides, non-blank string IDs, uniqueness via
  `Set` before any `Map` (`:126-133`), identical set and identical order
  (`:135-139`, no sorting), evidence schema mirrors the pipeline's usable
  gate (`report-pipeline.ts:184-188`: completed, non-blank answer,
  telemetry ≥ 1), every finding/priority/competitor reference resolves and
  is non-empty, measures validated with literal `10` denominators and
  internal-consistency refinements. I checked the refinements against
  `contracts.ts:1262-1400`: `overall.appeared` is the partition sum,
  `recommended` is counted only where `appearance === "mentioned"` after
  `normalizeReportEvidence` (`contracts.ts:596-609`), direct-ten
  `assessed` is every completed record, and the information numerators are
  read from the same eligible set as the denominator. Real pipeline output
  therefore satisfies the adapter; the synthetic e2e run confirms it.
  Inputs are not mutated (frozen-input test) and `detail` is the original
  object (`toBe`).
- Full answers: ten `[data-answer-body]`, one `#report-question-N` each,
  final caveat present per answer (unit, e2e, and PDF marker counts:
  `AWAL-JAWABAN-n.` and `AKHIR-JAWABAN-n.` each exactly once for n=1..10).
  No excerpt substitution, no line clamp/height cap/collapse on the body;
  the only accordion is the auxiliary raw view inside `.controls`, hidden
  in print.
- Markdown: AST transform runs after `remark-gfm`; html/image/definition/
  footnote nodes become source-literal text; links become label +
  ` (destination)`; headings clamp to h4–h6; task checkboxes become text
  markers; element allowlist excludes `a`, `img`, `input`, `h1–h3`, media,
  forms; `unwrapDisallowed` is a second layer. Unit test asserts zero
  `a,img,script,style,iframe,input,video,audio,embed,form,object,[id],h1,h2,h3`;
  e2e asserts the injected `<script>` did not execute and zero external
  requests. Only retained `http(s)` sources without credentials are active,
  with `rel="noopener noreferrer"` and `referrerPolicy="no-referrer"`.
- Copy/raw: `answerCopyText` interpolates the stored strings unchanged;
  `<pre data-raw-answer>` shows the stored string; CRLF/Unicode/double
  space fixture strings compared with `toBe`; clipboard rejection opens the
  raw view, shows the truthful notice, and makes no fetch.
- References: every cited ID renders a link (`ids.map`), keyboard Enter
  moves focus to the exact heading (unit for findings and priorities; e2e
  for findings; my session for findings), no `#findings blockquote`, action
  text occurs once in the document, no per-question analysis paragraph.
- Comparator: empty `observed_competitors` omits the block even when a name
  occurs in prose; invalid reference → unavailable notice and the
  conclusion is not rendered.
- Print: one DOM tree (no print-only subtree in the direct-ten branch;
  `styles.detailsPrint` remains only in the historical branch), controls
  `display:none`, headings `break-after: avoid`, long blocks
  `break-inside: auto`, table `table-layout: fixed` with `overflow-wrap:
  anywhere`. I extracted text and rendered all 12 pages myself (pymupdf in
  a scratch venv): section order Hasil singkat → Jawaban model AI →
  Analisis Nuave → Yang dapat dilakukan → Tentang audit ini; every question
  heading shares a page with its answer start; no clipped text; the
  28×"panjang" URL wraps inside its cell; nested list, task markers, code
  block and inert `![Gambar]`/`<script>` text render; no "Salin", "Teks
  asli", "Download PDF" or "Unduh bukti JSON" text in the PDF.
- Toolbar/labels: default `pdfLabel = "Download PDF"`, constant and test
  updated, no `pdfLabel` override anywhere in `src/`, the only remaining
  old wording is in `archive/` and historical spec/checkpoint records; both
  pre-existing e2e locators updated; callback test passes for PDF and JSON.
- Protected boundaries: `git status` touches no `contracts.ts`,
  `report-pipeline.ts`, `report-priority.ts`, `types.ts`,
  `customer-evidence-export.ts`, provider file, `LocalAuditStage`, intake or
  projection file; `audit.module.css` untouched; `git diff -w` on
  `ReportView.tsx` shows only the import, the `isDirectTen` flag, three map
  guards and the conditional wrapper; the header/brief/nav JSX
  (`ReportView.tsx:217-276`) is byte-identical to base; the new CSS module
  is scoped and imports only tokens. Fixture is not imported by product code.
- Snapshot/requests: e2e asserts identical `sessionStorage` before/after
  raw/copy/anchor/PDF/JSON and exactly one run and one report request
  across reload; my scripted session confirmed unchanged counts across the
  body-reference click, the header-nav click and reload. Back from the
  report is covered by the existing GLM test (`new-intake-glm.spec.ts:195`),
  which now renders the new body on the synthetic direct-ten path.

## 2. Acceptance table

| Criterion | Result | Basis (independent unless stated) |
|---|---|---|
| AC-01 | **Pass** | Unit + e2e + my browser session + PDF: ten exact questions and whole answers in retained order, first render and after reload, no controls on the answer; `Ya.` opening and later `Namun…` caveat both present per answer. |
| AC-02 | **Pass (tests); chronology reported, not independently provable** | 40 adapter tests exist and pass now; they cover every listed case (missing obs/detail/question/raw answer, duplicates both sides, extra/unknown, independent reorder, invalid references, non-lexical IDs, frozen inputs). Because the tree is uncommitted there is no Git evidence of order; the record's 14:23:11 gate claim is the implementer's. The adapter and its tests have no UI dependency, which is consistent with the claim. |
| AC-03 | **Pass** | Zero-appearance, mention-only/not-recommended, and 1 recommendation + 9 `not_assessed` cases tested; last case reads `{recommended: 1, assessed: 10}` from measures; corrupt denominators 0/1/9/11/−1/1.5/NaN/∞ rejected; per-question label `Tidak dinilai dari jawaban yang tersedia`; `Tidak diuji` absent from the new body; no tiles or rank. |
| AC-04 | **Pass** | Markdown unit fixture (headings incl. `{#id}` injection, nested lists, table, code with URL, link with title, autolink, bare `www.`, reference link, image, `<script>`, `<iframe>`, `<input onmouseover>`, tasks, footnotes, `javascript:` link) renders zero active elements and keeps every substantive string; e2e proves no execution and zero external requests; retained safe source is the only active link. |
| AC-05 | **Pass** | Raw surface and copied text equal stored CRLF/Unicode/double-space strings (`toBe`/`toContain` on exact substrings) in unit and e2e; customer JSON export serialization unchanged before/after; clipboard failure truthful and selectable. |
| AC-06 | **Pass for A's links** | Multi-ID finding/priority/comparator links all resolve; Enter moves focus to the correct heading; one anchor per question; no first-quote excerpt; no repeated per-question analysis; action appears once. Pre-existing header-nav defect recorded as Finding 1 (outside A). |
| AC-07 | **Pass** | Empty comparator structure with a name in prose → block absent, no "no alternatives" claim; valid comparator shows retained relationship, references and the limited-scope sentence; invalid reference → explicit unavailable. |
| AC-08 | **Pass for rendering and print CSS; native save path untested** | 1440/390/320 screenshots reviewed (no horizontal overflow, statuses collapse at ≤480px); 200% check uses CSS `zoom`, an approximation of browser zoom; keyboard/focus and ≥44px controls asserted; A4 PDF: 12 pages, every answer once, screen order, no clipping/orphan headings, table/URL/list/code reflow verified page by page. Raw-view-open print keeps one body (`.controls` hidden). The two PDFs are the same capture (Finding 2); `window.print()` was spied, not rendered; the native OS Save dialog was not exercised. |
| AC-09 | **Pass** | Historical/absent methods with direct-ten-looking IDs render the old body with their own denominator; toolbar default, `INDONESIAN_REPORT_LABELS.download_pdf`, its unit assertion and both e2e locators say `Download PDF`; print callback and no-repeat checks retained. |
| AC-10 | **Pass** | e2e: snapshot byte-equal across read/raw/copy/anchor/PDF/JSON; run=1, report=1 after reload; export omits `operational_telemetry`/`telemetry`; my session: counts unchanged across body-reference click, header-nav click and reload. Back covered by the existing GLM test on the new body. |
| AC-19 (A) | **Pass offline, with Finding 3 noted** | Allowlist respected; protected files untouched; header byte-identical; base SHA recorded and equal to the investigation base; exact pins only; `npm ci --dry-run` 0; `npm run verify` exit 0; fictional personal-data marker test confirms an invalid binding leaks nothing. Lockfile `libc` metadata drift recorded. No live provider call, commit, push, PR, merge or deployment. |

## 3. Commands actually run and results

All in `/private/tmp/nuave-spec-012-pr-a` unless noted. No live provider
call was made; the e2e server ran with the repository's blanked offline
environment.

| Command | Result |
|---|---|
| `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, `git merge-base --is-ancestor 4e6b2cf… HEAD` | Branch `codex/spec-012-pr-a`; HEAD = `4e6b2cf…`; 7 modified tracked files, 5 untracked paths (listed in the record). Unchanged after all runs. |
| `git show 9c5d4c0f…:specs/012-evidence-first-report/SPEC.md` | Approved spec read in full. |
| `git diff` (all tracked), `git diff -w -- src/app/audit/ReportView.tsx`, header range diff vs `HEAD` | Only wiring/indentation in `ReportView.tsx`; header JSX byte-identical. |
| `git diff --check` | Clean. |
| Lockfile inspection (`git diff -- package-lock.json`, grep for `libc`, `@emnapi`, `@napi-rs/wasm-runtime`, `lockfileVersion`) | Two root deps added; 10 `libc` entries dropped (Finding 3); wasm32 entries retained; lockfile v3. |
| `npm ci --dry-run` | Exit 0 (Node v22.23.2, npm 10.9.8). |
| `npm ls react-markdown remark-gfm --depth=0` | `react-markdown@10.1.0`, `remark-gfm@4.0.1` only. |
| `npx vitest run src/lib/audit/report-presentation.test.ts src/app/audit/report/report-body.test.tsx src/lib/audit/report-labels.test.ts src/lib/audit/customer-evidence-export.test.ts` | 4 files, **67/67 passed** (5.6 s). |
| `NUAVE_E2E_PORT=3122 npm run verify` (port confirmed free first) | **Exit 0.** `check`: 0 errors, 17 pre-existing lint warnings; unit: **88 files / 1,173 tests passed**; `next build` and OpenNext Cloudflare build compiled; e2e: **24 passed** + disabled config **3 passed**; "Offline verification passed." Log: scratchpad `verify.log`. |
| `shasum -a 256` on both PDFs | Identical hash `024098db…686`. |
| pymupdf text extraction + page render of `report-toolbar-a4.pdf` and `report-native-a4.pdf` (isolated venv in the review scratchpad, no system install) | 12 pages each; markers once each; heading/answer-start pages equal for all 10; section order correct; no control text; extracted texts identical; all 12 rendered pages viewed. |
| Screenshots viewed: `report-1440.png`, `report-390.png`, `report-320.png`, `answer-1440.png`, `answer-390.png`, `report-200-percent.png` | No overflow or clipping; statuses stack on narrow widths. |
| Offline dev server on `127.0.0.1:3123` with the e2e env + scripted Chromium (`navcheck.cjs` in the review scratchpad) | See Finding 1 output: body reference keeps report and focuses heading; header nav unmounts report with no request; reload restores with run=1, report=1. Server stopped afterwards; port released. |
| `grep -rn "Cetak / simpan PDF"` (repo, excluding `node_modules`) | Only `archive/` and historical spec/checkpoint documents. |
| `grep -rn pdfLabel src tests` | No call-site override. |

## 4. Untested behavior and evidence limitations

- **Native print/Save path.** `window.print()` is spied in every browser
  test; no test lets it run, and the OS Save dialog cannot be driven
  headlessly. The PDF evidence proves print CSS and the single tree under
  Chromium's print engine, once. Accepting AC-08 on this basis repeats the
  Spec 009/010 precedent; a human "Download PDF → Save as PDF" pass on the
  founder's machine remains the only way to close it.
- **Browser zoom.** The 200% check sets CSS `zoom` on `body`; it is not
  browser-level zoom and does not reflow media queries the same way.
- **AC-02 chronology.** Verified only as the implementer's statement; the
  tree is uncommitted.
- **Real retained evidence.** No private customer answers were read. The
  adapter/measure compatibility with the real 2026-09-19 direct-ten record
  is established by code reading (`contracts.ts` normalization and measure
  construction) and by the synthetic pipeline run, not by loading that
  record.
- **Base reproduction of Finding 1** was not run on a base checkout; the
  involved files are unchanged from base.
- **Linux CI behavior** of the `libc`-less lockfile was not exercised here
  (macOS only); the `validate` check will.
- **Screen-reader traversal** was not performed with an actual assistive
  technology; semantics were reviewed from markup (`aria-labelledby`,
  `role="status"`, `role="region"` for tables, `tabIndex={-1}` targets).
- Reviewed PDFs were the implementer's artifacts; I re-extracted and
  re-rendered them myself but did not regenerate them from a fresh run
  beyond the full e2e suite inside `npm run verify`.

## 5. Verdict

**Ready for PR** once `VERIFICATION.md` is corrected per Findings 1 and 2
(one sentence each; no code change). Findings 3–5 are optional
implementer-judgment improvements that may go in the same PR or a follow-up;
none blocks. Finding 1's underlying defect belongs to B1 (header/contents)
or the intake owner, not to PR A.

No implementation file was changed by this review. No commit, push, PR,
merge, deployment, contact or live provider call was made.

## Follow-up review (same day, after the worker's resolution)

Re-reviewed the worker's four-file follow-up independently.

**Scope check.** File modification times show exactly four files changed
after this review was written: `report-body.test.tsx`, `AnswerMarkdown.tsx`,
`tests/e2e/new-intake-glm.spec.ts`, `VERIFICATION.md`. Every other
implementation file keeps its original timestamp; `git diff --stat` for
`ReportView.tsx` is unchanged (647 lines) and the e2e diff shrank by the
removed second `page.pdf()`. `git diff --check` clean. Lockfile untouched.

**Required corrections.** All three are present and truthful in
`VERIFICATION.md`: the header contents-nav `popstate` defect is stated as
pre-existing and left for B1; AC-08 now says "Pass for rendering and print
CSS only" and describes the two original PDFs as one identical capture with
the SHA-256 recorded; the `libc` lockfile note sits beside the dependency
sentence.

**Optional items.** All three taken.
- `AnswerMarkdown.tsx:26-32`: missing-position guard returns
  `node.value ?? ""` instead of slicing the whole answer.
- `AnswerMarkdown.tsx:33-50, 81`: root-level `html` blocks are wrapped in a
  paragraph; inline HTML stays in its paragraph. New unit test asserts exact
  `textContent` unchanged and paragraph structure.
- e2e now writes one `report-print-a4.pdf`.

**Independent checks run.**
- Focused vitest: **68/68 passed**.
- `NUAVE_E2E_PORT=3122 npm run verify`: **exit 0**; 88 files / **1,174 unit
  tests**; Next.js and OpenNext builds compiled; **24 + 3 browser tests
  passed**; 0 lint errors (17 pre-existing warnings).
- New PDF (`report-print-a4.pdf`, SHA-256 `51361ac4…bf17`): 12 pages; every
  `AWAL`/`AKHIR` marker once; each question heading on the same page as its
  answer start; no control text; the ten answer bodies are text-identical to
  the earlier capture; pages 4 and 5 rendered and viewed, the `<script>`
  literal now has its own paragraph spacing, no clipping or orphan heading.

**Updated verdict: ready for PR.** No open finding against PR A. The
pre-existing header-nav defect goes to B1. Native Save dialog and Linux CI
remain unverified, as recorded. No commit, push, PR, merge, deployment or
live provider call was made by this review.
