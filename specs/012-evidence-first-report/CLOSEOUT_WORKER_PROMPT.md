# Worker handoff: Spec 012 combined closeout and document reconciliation

> Prepared: 2026-09-26
> Authority: founder acceptance of the current report, followed by
> “Yes proceed the work. Write a prompt for worker.”
> Scope: one documentation-only candidate for independent closeout review

You are the worker for this bounded Nuave task. Do not dispatch sub-agents.

Shared context repository: `/Users/hy4-mac-006/nuave_v0.2`.
Remote: `https://github.com/yasir-mukhtar/nuave_v0.2.git`.

## Objective and settled decision

Prepare the combined Spec 012 acceptance record and reconcile its approved
report documents with current main. Make one reviewable documentation package
that lets the reviewer and orchestrator close the spec without another report
implementation round.

The founder said:

> Generally the new report is more useful. We can improve several things, but
> we can do that later, because substantially it's all already there. Just
> need to simplify the format in several aspects so it can be read and digested
> easily. For example the reference/link section is too long that it pollute
> the report. But not a problem for now. Let's keep it for now and move forward.

This accepts the current report for progression and defers formatting and
reference-section simplification. The founder had been told the supplied PDF
was fictional and the real before/after comparison was not prepared. Record
AC-18 as **founder-accepted exception: original same-evidence comparison
unperformed and deferred**, not as a test PASS. Do not manufacture timed
rubric results, claim real synthesis quality, or ask the founder to repeat
this decision. The earlier PR A founder check on a real September 19 record
is distinct evidence; it is not the integrated B1/B2 comparison.

The workflow permits verification with an explicit founder-approved exception.
Prepare a supported closeout recommendation on that basis. Leave final
Verified status for the orchestrator after independent review of this package.
Do not require the deferred comparison before proceeding with this task.

## Start from the correct state

1. Treat the shared checkout as read-only context. It is a preserved dirty
   branch at `2a21f85`, not the runtime base. Do not switch, reset, clean,
   stash, stage, commit, or copy its whole working tree into your candidate.
2. Create a separate clone under `/private/tmp/` and a dedicated branch
   `codex/spec012-combined-closeout` from freshly fetched `origin/main`.
   Record its exact SHA. Main was checked during handoff preparation and was
   `d45a944674f29828bdd95bc878ce8ca07ff01818`.
3. Verify ancestry and read the matching records for report A (PR #74,
   `d08b9e90e20930377873fe2fd79e2489ab9c39a6`), its subsequent fixes,
   verified Spec 011 (PR #78, `7f34d69d3be0c451e238f1cddf0da62dda250eb1`),
   privacy R3 (PR #79, `8907d96d10ca101f6fdd68c8c77607cd994d83f3`),
   B1 (PR #80, `d93ec8256200b662796103246e224bd4a3800603`) and B2 (PR #81,
   `d45a944674f29828bdd95bc878ce8ca07ff01818`). Do not infer verification
   merely from ancestry.
4. If main advanced, inspect the intervening delta and record which existing
   evidence still applies. Do not silently attribute old checks to new code.
   Stop only an affected part if a material change invalidates its evidence.
5. The approved specification is
   `9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174:specs/012-evidence-first-report/SPEC.md`
   on `docs/astra-report-redesign-plan`, SHA-256
   `294ac792c347d0ccce12e6d40f6250b72aaaa038d9ea7313c212421a205e4110`.
   Read with `git show`; if necessary, fetch that branch in your isolated
   clone. Its absence from the main working tree is expected. The shared
   repository also has the pinned Git object. Do not substitute a draft.

## Required context, in order

Read the named files or complete named sections, not the entire repository.

1. `AGENTS.md`, `README.md`, `docs/NOW.md` and this prompt. Read shared NOW's
   current next action and the candidate base's status separately. Read
   `docs/WORKFLOW.md`, `specs/README.md` lifecycle, and
   `docs/templates/VERIFICATION.md`.
2. In the shared repository, `docs/DECISION_LOG.md` entry
   **2026-09-26 — accept the current report for now and defer formatting
   improvements**, and the complete
   `specs/012-evidence-first-report/B2_ACCEPTANCE.md`. These contain later
   local release/acceptance facts that are not all on main. Also read
   `B1_ACCEPTANCE.md` there for the completed B1 release.
3. The complete pinned approved Spec 012 and its `SPEC_REVIEW_1.md`, including
   the revision-1 re-check. D-01–D-08 remain settled. R-19 requires intake-first
   reconciliation; Spec 011 has now merged. Reconcile the approved report
   documentation delta onto current main in the new branch rather than
   replacing operating documents or rewriting the old branch's history.
4. On main, the Spec 012 `VERIFICATION.md`, `PR_A_REVIEW.md`,
   `B1_IMPLEMENTATION_RESULT.md`, `B1_IMPLEMENTATION_REVIEW.md`,
   `B2_IMPLEMENTATION_RESULT.md`, `B2_IMPLEMENTATION_REVIEW.md`, and
   `B2_VISUAL_VERIFICATION_RESULT.md`. Read the Spec 011
   `MAIN_INTEGRATION_RESULT.md` and `MAIN_INTEGRATION_REVIEW.md` for the
   inherited report/intake integration. Read its R-23/R-27 and historical hold.
5. For canonical reconciliation, compare current-main text with the approved
   September 22 amendments at `9c5d4c0`: `docs/PRODUCT.md` report/delivery
   sections; `docs/AUDIT.md` report format, acceptance, weak evidence and data
   boundaries; `docs/VOICE.md` terminology and report sections;
   `docs/journey/06-audit-report.md` direct-ten contract; Spec 010 failure and
   recovery. Read `docs/VISION.md` product principles and `docs/DESIGN.md`
   report exception as parent context only. Relevant report amendments begin
   at `be8187a` and include `afacda5`; use the approved final text, not the
   pre-review version. Inspect overlapping later decisions before editing.

Do not read `archive/`, `.secrets/`, credentials, raw real answers or unrelated
drafts. Do not read or publish the four protected Spec 011 notes:
`EXTRACTION_FIELD_NOTE.md`, `R23_SIZING_NOTE.md`,
`REPORT_EXPORT_BOUNDARY_REVIEW.md`, or `REPORT_EXPORT_BOUNDARY_REVIEW_PROMPT.md`.

## Work and permitted edits

In your isolated candidate only:

1. Restore the approved `specs/012-evidence-first-report/SPEC.md` and
   `SPEC_REVIEW_1.md` from the pinned source. Preserve the original requirements
   and review. Add dated closeout/exception/provenance notes separately; do
   not rewrite AC-18 to imply its original test occurred. Keep status Approved
   with combined review pending. Fix missing historical-document links with
   pinned GitHub permalinks instead of importing unrelated drafts.
2. Update `specs/012-evidence-first-report/VERIFICATION.md` with a concise
   current combined section and AC-01–AC-19 matrix. For each criterion give
   disposition, exact implementation/evidence source, attribution and limits.
   Preserve dated historical results, including superseded failures; identify
   the later fixing/acceptance evidence rather than erasing them. Attribute
   existing tests and reviewer work accurately. Map AC-19 to actual integration
   order and checks, not just a new green build.
3. Reconcile only the approved report amendments in:
   - `docs/PRODUCT.md`
   - `docs/AUDIT.md`
   - `docs/VOICE.md`
   - `docs/journey/06-audit-report.md`
   - `specs/010-gated-new-audit-flow/SPEC.md`
   Keep current Spec 011 intake/context, historical hold, privacy, exact
   evidence, retry/cost, output and commercial boundaries. Use a three-way
   comparison of the original report delta and current documents. Record
   already-integrated, applied and superseded portions; do not reapply old
   whole-file snapshots. No new product or policy decision is delegated here.
4. Reconcile current routing/status only in `README.md`, `docs/NOW.md`,
   `docs/INDEX.md`, `docs/DECISION_LOG.md`, `specs/README.md`, and the Spec 012
   `B1_ACCEPTANCE.md` / `B2_ACCEPTANCE.md`. Carry the exact later founder
   decision and completed release facts from the shared source as selective
   edits, preserving current main and unrelated user work. Fix contradictory
   current-tense claims that B1/B2 are unimplemented, release is pending, or
   another usefulness round is the immediate next task. Preserve dated history.
   Account for the original two live-flow tasks using their later disposition;
   neither drop them silently nor reinstate consumed live-call permission.
5. Add `specs/012-evidence-first-report/CLOSEOUT_RESULT.md` with the evidence
   map, reconciliation decisions, validations, preserved limits, and a clear
   recommendation for the independent reviewer. Include a short proposed final
   status update for the orchestrator after PASS. Optionally retain this
   handoff as `CLOSEOUT_WORKER_PROMPT.md` in the candidate.

Everything else is read-only. Narrow code/test inspection may confirm a cited
claim; no runtime, dependency, configuration, test, fixture or schema changes
are authorized. Do not fix reference clutter, shorten answers, redesign the
PDF, alter the privacy rule, migrate historical sessions, or revive old audits.
If a required document edit falls outside the list, report that specific need
instead of expanding the task.

## Evidence reuse and validation

The latest main gate for `d45a944` is
https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/36206938604:
1,460 unit tests, both builds and 33 browser checks passed, followed by the
merged-PR-origin gate and deployment. Local release evidence is under
`/private/tmp/nuave-pr81-merge-pt2_ikni/`, including `main-run.json`,
`main-run.log`, `merge-tree-check.json` and `release-result.json`.

Use existing repo review records first. Consult only their cited manifests,
logs or patches as needed. Supporting roots include
`/private/tmp/nuave-b2-review-eopg00d2/` and
`/private/tmp/nuave-b2-visual-devin01/evidence/`. Preserve all original evidence
and candidates. A missing temporary artifact is not proof that a check failed;
record whether durable review/CI evidence is sufficient for the specific claim.

- Verify the documentation-only delta against the starting base, with exact
  unchanged-file hashes or Git blob comparisons for code, tests, dependencies,
  scripts and configuration. Record candidate base and final state.
- Inspect the entire task diff, including new files. Run `git diff --check`,
  validate added/changed document links and anchors, check status consistency,
  and check that no protected/private content or unrelated edits entered it.
- Reuse matching canonical verification with attribution. Do not run another
  full `npm run verify`, regenerate PDFs, or repeat the founder walkthrough
  solely for Markdown changes. If evidence no longer matches the runtime
  base, explain the concrete gap and smallest required check.
- Preserve the disclosed limits: headless PDF versus native Save dialog, CSS
  zoom versus browser zoom, emulation versus a physical phone, and fictional
  evidence versus real usefulness. Do not turn these previously disclosed
  limits into new implementation tasks or claim they were tested. Distinguish
  an actual unmet criterion from an accepted qualification in its cited review.
- The B2 PDF proves a pipeline-produced P action with expanded fictional
  answers for layout. The complementary older e2e PDF uses an ordinary
  synthetic verification action, not the exact new R-13 V template. Exact P/V
  behavior is covered by technical tests. Keep those distinctions.
- F-01/F-03/AC-07 of Spec 011 remain closed. Accounting stays
  USD 1.06241155 of the USD 5 ceiling; there is no live-call allowance here.

Read-only GitHub inspection and isolated local document work are authorized.
No provider/source fetches, private real-data processing, new spend, contacts,
commits, pushes, PR creation, merge, deployment or production interaction.

## Handoff and completion report

Return **READY FOR INDEPENDENT CLOSEOUT REVIEW**, or list concrete remaining
findings. Do not describe your own reconciliation as independent verification.
The expected eventual verdict is **Pass with founder-approved exception** if
the criterion map and document reconciliation support it. Do not stamp Spec
012 Verified before the separate closeout review and orchestrator record.

Provide:

1. Candidate path/branch, exact base and changed-file list.
2. `CLOSEOUT_RESULT.md` and the complete documentation patch outside Git.
3. AC-01–AC-19 dispositions, especially the AC-18 exception and AC-08 limits.
4. Which approved document amendments were applied, already present or
   superseded; any unresolved conflict with precise file/line references.
5. Checks actually run, reused evidence with identity checks, and untouched
   shared/candidate/product evidence.
6. A short reviewer handoff identifying the exact candidate and evidence.
   Next is one independent closeout review, followed by the orchestrator's
   status record. Publication and selection of the next product capability
   remain separate; do not start another feature or roadmap.
