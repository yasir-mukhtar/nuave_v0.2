# Spec 011 — current-main integration worker handoff

Prepared by the orchestrator on 2026-09-24. **Ready for worker dispatch.**
This handoff was prepared without integrating, testing, committing or publishing
a candidate. Dispatching it authorizes the bounded local work below. It does
not authorize merging into main, opening a PR, pushing, deploying or live calls.

## Role and outcome

You are the worker. Prepare one independently reviewable integration candidate
on a dedicated branch based on freshly checked `origin/main`, combining the
verified Spec 011 working tree with the already merged report presentation and
intake fixes. Resolve the actual overlaps, preserve both sets of accepted
behavior, and pass the canonical offline gate on the combined candidate.

Source repository: `/Users/hy4-mac-006/nuave_v0.2`.
Keep this shared source checkout unchanged. Build the candidate in a separate
clone under `/private/tmp/`, on `codex/spec011-main-integration` or a unique
suffix if that branch already exists. Do not reuse or overwrite an earlier
review/live evidence directory. Do not start a worker or reviewer sub-agent.

Deliver the candidate, a reproducible patch/manifest and
`specs/011-smart-consultant-intake/MAIN_INTEGRATION_RESULT.md` in that candidate.
The orchestrator will arrange independent review after your result. Your PASS
means worker offline checks passed, not independent acceptance or PR readiness.

## Read in order

1. Source `AGENTS.md`, `README.md`, `docs/NOW.md`, and `docs/WORKFLOW.md` sections
   **Specification-driven development** and **Worker handoff standard**. The
   current `NOW.md` supersedes README's older next-live-test instruction.
2. [SPEC.md](./SPEC.md), including R-23/R-27, the F-03 addenda and verification
   record; [F03_PRODUCT_CORRECTION_SCOPE.md](./F03_PRODUCT_CORRECTION_SCOPE.md)
   for the preserved extraction boundary.
3. [ACCEPTANCE_CLOSEOUT_REVIEW.md](./ACCEPTANCE_CLOSEOUT_REVIEW.md) and
   [F03_LOCATION_SOURCE_REVIEW.md](./F03_LOCATION_SOURCE_REVIEW.md). These are
   completed acceptance and code reviews; do not rerun their historical tasks.
4. On fetched main, `specs/012-evidence-first-report/VERIFICATION.md` and
   `PR_A_REVIEW.md`. Read later upstream fixes as well; the earlier report-nav
   finding was subsequently fixed by PR #77.
5. Read the approved Spec 012 from its exact commit, without importing its
   documentation branch:
   `git show 9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174:specs/012-evidence-first-report/SPEC.md`.
   Relevant complete sections: **Settled founder decisions and block 0**,
   **Presentation and evidence: A**, **Preserved behavior and integration**,
   **Acceptance criteria**, **PR boundaries and file allowlists**, and
   **Execution and review order**. Obtain this public commit in the isolated
   clone if needed. It is absent from main's spec directory; absence there is
   not missing founder approval. B1/B2 and documentation-branch promotion are
   outside this integration.
6. Read only directly affected implementation, tests and governing excerpts:
   Spec 011's named product/audit sections for exact context and historical
   behavior; `docs/DESIGN.md` for report typography/print; the installed Next.js
   guide relevant to any code you change. Resolve paths against each tree and
   record moved paths. Do not load unrelated plans or old diagnostic runners.

## Baselines and preservation

The orchestrator's read-only remote check on 2026-09-24 returned main
`4470deb2553ae1413b039191a192828c93c7fcca`. The shared checkout's local
`origin/main` is stale at `d679a5160474764457fa3efb70152eb8e885f792`.
Fetch/check current main in your isolated clone; do not change shared refs.
Record the actual remote SHA at start and recheck before handoff. If it moves,
inventory the additional delta; integrate it within this same scope and rerun
affected gates, or identify the concrete new conflict. Do not silently use a
stale base or claim an up-to-date candidate after remote drift.

The accepted source is branch `devin/sol-smart-consultant-intake-plan`, HEAD
`2a21f856d33264887df6287f9b6d9dd22468fea5`, **plus its reviewed uncommitted and
untracked product**. Common ancestor with observed main is
`4e6b2cf6302a0679aa7820d163b214ac8b486e1f`.
The accepted product is identified by all 316 entries in
`/private/tmp/nuave-f03-location-j1557mch/candidate-product-hashes.json`, SHA-256
`78027f56252a682631488b680151ea795fa90b0c56d6089e705bd0498b759403`.

Before editing:

- Verify source identity and all 316 hashes. Record source status/index and a
  preservation inventory. If the product differs, stop source transfer and
  identify the mismatch; do not silently adopt, overwrite or discard changes.
- Freeze the accepted public product and necessary public status/evidence docs
  into an immutable task snapshot outside both working trees. Include the
  untracked `source-excerpt.ts`, `source-excerpt.test.ts` and
  `smart-source-preparation.test.tsx`; HEAD alone omits accepted corrections.
- Leave the four protected local notes byte-identical, untracked and unstaged:
  `EXTRACTION_FIELD_NOTE.md`, `R23_SIZING_NOTE.md`,
  `REPORT_EXPORT_BOUNDARY_REVIEW.md`, and
  `REPORT_EXPORT_BOUNDARY_REVIEW_PROMPT.md` in the Spec 011 directory. Hashing
  for preservation is allowed; do not read or copy their contents.
- Do not copy `.env*`, `.secrets/`, credentials, private/raw provider evidence,
  ignored diagnostic artifacts, `archive/`, `Archive Candidates/`, or unrelated
  untracked drafts into the candidate. No wholesale directory copy or `git add .`.
- State your exact planned changes and blockers before editing. No switching,
  stashing, resetting, cleaning, staging or restoring the shared source checkout.

Derive the complete Spec 011 product delta from the common ancestor to the
frozen accepted working tree, accounting for additions/deletions as well as
tracked edits. Apply it to current main using three-way reconciliation. A
HEAD-only cherry-pick or a diff of only uncommitted edits is incomplete; copying
the entire source tree over main would remove accepted upstream work. Use an
isolated Git index if needed, without making commits or rewriting history.

## Integration decisions already settled

| Surface | Required combined result |
|---|---|
| `src/app/audit/ReportView.tsx` | Keep Spec 011's `AuditSubject`/v2 identity, focus and market helpers, absent optional meaning and no agency/legacy filler. Also retain main's explicit direct-ten method routing, `DirectTenReportBody`, historical rendering boundary and PR #77 report-local contents navigation with focus. Reconcile the code; do not select one whole version. |
| `tests/e2e/new-intake-glm.spec.ts` | Keep Spec 011's real Smart intake, exact v2 payload/storage/export and recovery assertions. Carry main's complete-answer, Markdown, source, clipboard/raw, navigation, responsive and print regressions into the active v2 journey. Main's test uses `nuave.localIntakeAudit.v1`; replace that test setup with the actual v2 contract, preserving its meaningful assertions. Do not reactivate v1 delivery just to make the fixture pass. |
| Historical behavior | Spec 011's hold on old started/completed v1 report display, JSON/PDF and provider resume/retry remains. Test the retained renderer's method discrimination directly at its component boundary when needed; do not expose held v1 sessions through the public flow. A renderer test is not authority to relax storage/session eligibility. |
| Main's report files/dependencies | Preserve the report presentation adapter/components/tests, safe inert Markdown and retained sources, complete exact answers, one screen/print tree, `Download PDF` label, and pinned `react-markdown@10.1.0` / `remark-gfm@4.0.1`. Keep fetched main's package/lockfile bytes unless a concrete in-scope conflict requires a reviewed correction; no upgrades or incidental lockfile regeneration. |
| Upstream intake fixes | Preserve PR #76's attempts-ledger test synchronization and PR #77's marked-history handling in `IntakeJourney.tsx` plus its tests. Exercise navigation on the active Smart v2 path too; legacy-only tests do not establish that integration. |
| F-01 and printing | Preserve the two section-heading print rules in the accepted `audit.module.css` and main's full-answer print protections. The combined layout needs fresh fictional print inspection; an old nine-page or twelve-page artifact does not validate this new combination. No fixed page count is required. |
| Status documents | Retain Spec 011's dated Verified/closed acceptance and main's Spec 012 PR A merged status. Update current routing truthfully, including that PR #77 fixed the old anchor-navigation defect; header label/order and printed URL-tail observations are separate remaining report work. Preserve existing live-flow items and their authorization boundaries. Do not replace shared operating documents wholesale or import the report documentation branch early. |

Spec 011's accepted v2 context/customer export supersedes PR A's old v1/v4
test assumptions for new sessions. It does not alter report measurement, method
selection, evidence binding or the report output schema. Preserve exact context,
questions, observations, origins, saved provenance and export omissions. The
report presentation may use the accepted context but must not fabricate an old
`BusinessBrief`, introduce a second context store or reinterpret retained data.

## Bounded edit scope

Carrying the verified Spec 011 product delta into the candidate is in scope;
its extraction, preparation, contract and recovery files should otherwise remain
byte-identical to the accepted source. Main-only files should remain identical
to fetched main. Record every exception with the exact conflict it resolves.

New integration edits are limited to:

- `src/app/audit/ReportView.tsx`, the shared browser test above, and directly
  related existing report/intake tests or a focused adjacent regression file.
- Report-local components/styles or `audit.module.css` only where necessary
  to preserve the accepted combined rendering/print behavior.
- `SmartIntakeJourney.tsx` / `SmartAuditStage.tsx` only for a demonstrated
  integration regression at navigation, rendering or saved-context handoff;
  first reproduce it and preserve/add a regression. No redesign of those flows.
- Candidate routing/status in `README.md`, `docs/NOW.md`, `docs/INDEX.md`,
  `docs/DECISION_LOG.md`, `specs/README.md`, and Spec 011 verification/result
  records. Append or reconcile facts without rewriting historical evidence.
  Preserve the independently authored closeout/code-review files unchanged.

Do not change extraction/provider instruction strings or settings, fetch/privacy
policy, request counts, retry eligibility, accounting, question/observation
methods, report synthesis/repair/schema, emergency switch, CI/deployment gates,
or dependencies to solve an integration failure. Do not implement Spec 012
B1/B2, new header/date/content policy, report usefulness work, v1 reactivation,
new storage versions or migrations. If a concrete blocker requires those changes,
stop that part and return the reproduction and smallest proposed decision to
the orchestrator. Routine conflict resolution within this handoff needs no
repeat product approval.

## Offline verification

Use Node 22 and main's locked dependencies in the isolated candidate. Dependency
installation from the existing lockfile and read-only Git retrieval are allowed;
no paid service or source/business lookup is authorized. Use a clean environment
with only the repository's required dummy build credentials and other provider
keys blank, live-provider testing disabled, fictional fixtures and intercepted
transports. Never run a retained live driver or use a real business fixture.

1. Inspect the full candidate diff against fetched main and the preserved source.
   Classify files as carried Spec 011, preserved upstream, or reconciled. Check
   for dropped upstream additions, missing untracked corrections, conflict
   markers, unexpected dependencies, private content and temporary bypasses.
2. Run proportionate focused suites for both sides: extraction/source preparation,
   smart contract/journey and recovery, direct-ten route/context/customer export;
   report presentation/body/labels and upstream generation-attempt/history tests.
   Run the combined Smart/report browser cases. Existing meaningful regressions
   must remain; do not delete/skip tests or soften assertions for a green gate.
3. In the active v2 flow, demonstrate edited questions and exact context through
   run/report, JSON and reload; national reach with empty areas and optional
   target absent; explicit confirmation and audit start; immutable retained
   answers/provenance and safe sources; contents/references by mouse and keyboard;
   raw/copy/print/JSON/Back/re-entry without another provider/source request.
   Preserve historical holds, report-attempt ceilings, uncertainty, duplicate
   protection and the disabled-flow case. Reuse existing fixtures where sufficient.
4. Inspect the integrated report at 1440px, 390px, 320px/reflow and the existing
   200% zoom/scaling check. Generate one fictional A4 print-engine PDF and inspect
   every page for complete answers/caveats, unique content, readable tables/URLs,
   clipping and stranded headings, including the priority heading that F-01
   protected. Use existing browser/artifact tooling; keep artifacts outside the
   candidate. Distinguish callback-spy coverage, print-engine rendering and any
   native-dialog behavior actually observed; no claim of native save validation.
5. Run `npm run verify` on the final integrated candidate. This is the canonical
   offline gate, including checks, unit tests, both builds and enabled/disabled
   browser tests. Do not hardcode earlier test counts as the expected result.
   A failure requires an in-scope fix/recheck or a concrete blocked result.
   Reuse successful focused runs unless subsequent changes affect them.
6. Match the tested candidate to its final product manifest, run
   `git diff --check`, recheck main's SHA and confirm the shared source/evidence
   inventory is unchanged. Keep ignored evidence out of the verification tree;
   do not weaken lint policy or delete retained evidence to make it pass.

Do not repeat live acceptance. Spec 011 is Verified on its original manifest;
that fact stays closed. Integration has its own verification result. F-01,
F-03 and AC-07 remain historically closed; report any actual new regression as
an integration finding. Do not mark all of Spec 012 Verified from PR A coverage.

## Completion report and reviewer handoff

Write `MAIN_INTEGRATION_RESULT.md` in the candidate with:

- PASS or BLOCKED for worker integration checks; actual branch/path, source
  HEAD/manifest, fetched main SHA, common ancestor and final main freshness check.
- Full changed-file inventory and the resolved conflicts, especially report
  context/body/nav, v1-to-v2 browser setup, historical eligibility and print.
- Commands, exit results, test counts, environment/lockfile identity, log paths,
  fictional screenshot/PDF paths and what was visually inspected. State limits.
- Candidate manifest, reproducible patch including added files, their hashes,
  source-preservation result, and enough base information for a reviewer to
  reconstruct the same uncommitted candidate independently. Keep evidence and
  temporary files outside the product; do not substitute a HEAD-only diff.
- Any missing requirement with severity, reproduction, line references and the
  smallest fix; next action is independent review, not publication.

Leave the shared source checkout and its Git state untouched. Place new work
unstaged in the isolated candidate at handoff. No commits, pushes, PR creation,
merge to main, deployment, external messages or live calls. All previous live
allowances are consumed; accounting remains **USD 1.06241155 of 5**.
