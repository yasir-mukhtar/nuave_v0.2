# Spec 012 B2 — orchestrator acceptance and publication readiness

> Updated: 2026-09-26
> Status: **Implementation and visual evidence accepted offline; publication package prepared**
> Remaining: B2 publication authorization, PR/CI review and AC-18; Spec 012 is not Verified

The founder relayed the independent review's PASS. The orchestrator read the
worker result and complete review and accepts the bounded technical
implementation. The subsequent visual follow-up is also accepted below.
No corrective code task follows from these checks. PR/release gates and AC-18
remain separate.

## Exact accepted state

- Candidate: `/private/tmp/nuave-spec012-b2/candidate`, branch
  `codex/spec012-b2-useful-recovery`, unstaged and uncommitted.
- HEAD/base: `d93ec8256200b662796103246e224bd4a3800603`, the B1 PR #80 merge.
- Approved spec: `9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174:specs/012-evidence-first-report/SPEC.md`,
  SHA-256 `294ac792c347d0ccce12e6d40f6250b72aaaa038d9ea7313c212421a205e4110`.
- Worker result in the original candidate at
  `specs/012-evidence-first-report/B2_IMPLEMENTATION_RESULT.md`:
  SHA-256 `06c04885115cf4bbaad20751a6dbe77240c28c9a9b4c15d50a0a1f66b186d375`.
- [Independent review](./B2_IMPLEMENTATION_REVIEW.md), retained verbatim from
  `/private/tmp/nuave-spec012-b2/B2_IMPLEMENTATION_REVIEW.md`:
  SHA-256 `e734fe3d320a6c4361bc8925e9ae2d3ac9c5c182faf79599bbfaadb7deaca5cd`.
- Complete reviewed patch:
  `/private/tmp/nuave-b2-review-eopg00d2/reviewed.patch`, SHA-256
  `e67e46bfb1301470344be5dab7a70baa7dff8e022535a99353e5a8096480ce18`.

The orchestrator matched all **25 changed-file hashes** and **331 product,
test and configuration hashes** against the reviewer manifests. Remote main
still matched `d93ec82` when checked on 2026-09-25. The candidate's stale local
`origin/main` ref is not its actual base; publication must fetch current main
in its own checkout. No integration correction is needed at this checkpoint.

## Attributed verification and limits

The independent reviewer reran the canonical gate: **1,460 unit tests, both
builds and 33 browser tests**, plus **22 reviewer assertions** and an additional
accounting/recovery browser regression. Its verification log SHA-256 is
`0af7bda02f1beb6626ead9f444a531c1929f68211aaf2a0bb0d2c8ddcb152c6c`.
These are independent reviewer results, not a repeated orchestrator run.

The technical PASS covers method-specific empty-priority synthesis, exact
code-owned P/V selection after repair/revision, rejection of unsupported
model-authored actions, the final usefulness minimum and answers-only recovery
on the active SmartAuditStage path. It includes preservation of retained
observations, attempts, nonzero failed-call costs, retry guards and reload/Back
behavior. The actual session/export contracts remain unchanged.

The original worker result's `nuave-evidence-v4` reference describes the
historical export. The active confirmed-context export is `nuave-evidence-v5`;
its session key is `nuave.localIntakeAudit.v2` and report wire contract is
`live-audit-report-v2`. The inner report retains `nuave-report-v3`.
The review and preserved source establish these unchanged versions.

**Initial visual evidence gap (2026-09-25; now closed below).** The original
[B2 handoff](./B2_WORKER_PROMPT.md) requires desktop/mobile/reflow/focus checks
for recovery and success, plus representative completed-report A4 PDF text
extraction and inspection of every page. The worker result does not record
those visual checks. The reviewer explicitly states that no new PDF/native-
print inspection was performed. No matching PDF or report/recovery PNG
artifact was found under the supplied worker and reviewer roots. Existing
evidence elsewhere may be reused if it demonstrably matches this candidate;
otherwise perform this bounded offline check. Do not infer visual review from
passing browser assertions or from earlier B1 screenshots alone.

All reported tests use fictional/synthetic/mocked data. They do not establish
real model output quality, real billing, production bindings or owner
usefulness. Native Save-dialog, native zoom and physical-phone limits remain.

## Visual evidence accepted — 2026-09-26

The [visual verification result](./B2_VISUAL_VERIFICATION_RESULT.md) completes
the [bounded follow-up](./B2_VISUAL_VERIFICATION_WORKER_PROMPT.md). Its original
path is `/private/tmp/nuave-spec012-b2/B2_VISUAL_VERIFICATION_RESULT.md`, SHA-256
`835a6751bcba70eba745760204be21763dd2d0b532120045c13d914fead24db2`.

The worker checked recovery, its exhausted retry state and successful report
at 1440/390/320px, keyboard/focus, exact copy/raw text, 200% CSS zoom and print
media. Requests stayed at one observation run and one/two/three report requests
for success/retry/ceiling. Reload, Back and passive interactions added no calls.
The completed-report fixture includes the code-owned preservation action and
all ten full answers with late caveats. All 11 A4 PDF pages were rendered and
visually inspected; existing e2e captures provide a complementary ordinary
verification-action example. Native Save/zoom/physical-phone limits remain.

The orchestrator matched all **124 artifact hashes**, rechecked **25/25 changed
files and 331/331 product hashes** in both the original candidate and the
visual copy, read the capture probes and request/focus records, inspected all
11 preservation-action PDF pages, and spot-checked desktop/mobile/zoom images.
No blocking visual defect was found. Decorative section indices can wrap at
320px (including 02 and 04); headings remain readable. This cosmetic note is
retained without changing the reviewed implementation.

Evidence root: `/private/tmp/nuave-b2-visual-devin01/evidence/`.
Artifact-manifest SHA-256:
`b0b19654a70312b1329dcb47e0fd01fe04627c6313fb4636e99047868217292a`.
Completed-report PDF SHA-256:
`cdc7626ee20809f804fe5ef54f6d88d039abe44f3bf800c90806e62b1a7a5d3c`.
These local paths support reproducibility; this durable record preserves the
outcome and fingerprints without publishing screenshots or raw evidence.

The visual probe inserts a pipeline-produced action/report into a fictional
retained session with expanded answers for layout coverage; it does not prove
fresh model synthesis on those expanded answers. The worker calls the existing
e2e PDF a V-template example, but its action is the pre-existing synthetic
verification action, not the new R-13 V template. The required visual check
is satisfied by the new P action; exact P/V behavior is covered by independent
technical assertions. No separate V-template PDF inspection is claimed.
The report's on-screen
contents navigation is hidden in the PDF. The worker's page-one wording about
a contents list should not be read as a claim that navigation is printed.
Native-print conclusions rely on source/print-media behavior, not solely the
probe's null `onbeforeprint`; the probe stubs `window.print` and never exercises
the OS dialog. These limits do not invalidate the bounded offline checks.

## Publication package and next step

The isolated publication checkout is
`/private/tmp/nuave-b2-publication-exs4tvkh/candidate`, branch
`codex/spec012-b2-publication`. Freshly fetched main on 2026-09-26 still equals
`d93ec8256200b662796103246e224bd4a3800603`. The complete 25-file reviewed patch
is preserved; added changes are public-safe acceptance/review/handoff records
and narrow NOW/INDEX routing updates. Exact file list, hashes, patch, proposed
commit message and PR body are retained beside the checkout in
`PR_READINESS.md`, `publication-files.json`, `publication-checks.json`,
`publication.patch`, `COMMIT_MESSAGE.txt` and `PR_BODY.md`.

Matching canonical evidence is reused because code and base are unchanged.
This preparation performs no new tests or live calls. Commit/push and draft-PR
publication require founder authorization for B2 under `AGENTS.md`; the earlier
B1 approval does not extend to this package. Merge/deployment are separate.

Then review the published PR and required CI on its exact head. Prepare AC-18
privately using the same retained audit evidence before/after: the founder
judges whether the findings are supported and the actions useful and doable.
First establish which approved retained artifacts are available; if producing
the comparison requires a fresh provider call, scope it and obtain separate
authorization. Do not silently spend money or use synthetic fixtures as proof
of real usefulness. Complete combined verification and reconcile the approved
report-document changes before marking Spec 012 Verified.

No tests, live/provider calls, commits, pushes or deployment were performed by
the orchestrator at these acceptance checkpoints. The visual worker's focused
checks are attributed above. Candidate and shared product files remain unchanged. Spec 011
stays Verified; F-01/F-03/AC-07 stay closed. Accounting stays **USD 1.06241155 of 5**.
Acceptance-check records: `/private/tmp/nuave-b2-acceptance-a6m7er7k/`.
