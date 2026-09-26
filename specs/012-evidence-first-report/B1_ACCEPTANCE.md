# Spec 012 B1 — orchestrator acceptance

> Date: 2026-09-25
> Status: **Accepted; PR #80 merged and deployed on 2026-09-25**
> Later status (2026-09-26): Spec 012 **Verified with founder-approved exception (AC-18)**; see [closeout acceptance](./CLOSEOUT_ACCEPTANCE.md). Earlier sections retain their dated scope.

The founder relayed the independent reviewer’s PASS. The orchestrator read
the complete worker result and review, checked their evidence identity, and
accepts B1 without a corrective implementation task. This is technical
acceptance, not founder usefulness judgment or publication authorization.

## Accepted candidate and authority

- Candidate: `/private/tmp/nuave-spec012-b1-M1I6nTcs/repo/`, branch
  `codex/spec012-b1-report-content`, unstaged and uncommitted.
- Base: `8907d96d10ca101f6fdd68c8c77607cd994d83f3`, containing report A,
  verified Spec 011 and the released privacy correction.
- Authority: `9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174:specs/012-evidence-first-report/SPEC.md`;
  SHA-256 `294ac792c347d0ccce12e6d40f6250b72aaaa038d9ea7313c212421a205e4110`.
  The broader documentation-branch promotion remains separate.
- Scope: 18 code/test files plus the worker result and verification entry.
  The [original handoff](./B1_WORKER_PROMPT.md) defines the approved boundary.
- [Worker result](./B1_IMPLEMENTATION_RESULT.md):
  SHA-256 `7f72228a75ccb771d8e854c01ff958ffad81380d740f5c2f19eadae1de023339`.
- [Independent review](./B1_IMPLEMENTATION_REVIEW.md):
  SHA-256 `24d6b6644647f9946c300ff82649480993e1101034c6b4bda67b34201e2e8704`.

This durable note retains the decision and evidence fingerprints. The worker
result and review are preserved verbatim alongside it. Scratch paths in those
records identify local supporting artifacts, not permanent public evidence URLs.

## Outcome and attributed verification

| Acceptance | Result |
| --- | --- |
| AC-11 | Up to ten supported findings/actions and order ten; three stay three, eleven fails, and B1 keeps minimum one. Existing gap and recovery rules remain. |
| AC-12 | All four report adapters receive the bounded guidance. New synthesis versions record the changed contract. Language behavior, calls, retry eligibility and accounting remain unchanged. |
| AC-13 | Header identity/scope follows the confirmed context. Observation dates and actual answer models come from retained evidence; UTC is explicit and report creation time stays separate. Contents match the body. |
| Inherited A / AC-10 and B1 AC-19 | Offline evidence supports exact answers, safe presentation, references, report-local navigation, exports, historical hold and no-repeat behavior within the B1 allowlist. |

The reviewer independently passed **305 focused tests, four additional probes
and one affected browser regression**, checked patch reconstruction and hashes,
and inspected **all 11 PDF pages**. The reviewer reused the matching worker’s
successful canonical `npm run verify`: **1,429 tests, both builds and 32 browser
checks**. The full gate was not independently rerun.

At acceptance, the orchestrator matched all **20 changed-file hashes** and
**327 product/test/script/configuration hashes** to the reviewer’s manifests,
confirmed the approved spec, patch, canonical log and retained PDF hashes,
and checked candidate whitespace. No tests or PDF inspection were repeated.
The candidate remained unchanged. Acceptance-check records are at
`/private/tmp/nuave-b1-acceptance-qr5a9x4l/`.

| Retained artifact | SHA-256 |
| --- | --- |
| `evidence/b1-code.patch` | `11df20b3b25fe3023efb6b61bb262c7d2c6fb0e880ece4e9dafe0f9d21821f28` |
| `evidence/verify.log` | `67a43f74e3a784838594cd137e116bb161d720d269fbd6b26057e5430a8cf9f8` |
| Reviewed `report-print-a4.pdf` | `257944bccbcfac6dd3377108c1a11d7193474271c7712ea99191f47cb6210493` |

## Limits and next step

Gemini’s provider-side schema conversion limitation predates B1. Its shared
post-response validation remains in place; Gemini is testing-only and does
not support the v2 context path. This acceptance does not certify its
provider-side schema or add an unrelated repair to B1.

Mocked responses do not establish improved real synthesis or owner usefulness.
Native PDF Save, physical-phone behavior and native browser zoom remain
untested; CSS zoom and headless printing do not close those limits.

## Publication authorization and package

The founder said **“Proceed with B1 publication package and draft PR”**, then
clarified **“You publish B1; worker prompt covers B2.”** This authorizes the
bounded commit, push and draft PR, including the existing automatic synthetic
preview workflow. It does not authorize merge, production deployment or live
provider calls. No separate approval is needed to carry out this publication.

Publication uses an isolated checkout at
`/private/tmp/nuave-b1-publication-72lfuzyn/candidate/`, branch
`codex/spec012-b1-publication`. Current remote main was checked and fetched on
2026-09-25 and still matches base `8907d96`. The 25-file package consists of the
20 reviewed worker files, the verbatim independent review, this acceptance,
the completed worker handoff and narrow NOW/INDEX status changes. Reviewed
runtime/tests and worker records remain byte-identical. No broad documentation
promotion, protected notes, screenshots, PDF, raw logs or real customer evidence
are included. Original candidate and shared product files remain unchanged.

The unchanged canonical gate is reused with matching hashes. Publication
checks inspect the entire staged diff, exact file list, links, whitespace,
protected-file exclusion and unintended-secret/debug changes. Required CI and
independent published-PR review must be assessed on the eventual head; this
record does not claim they already passed. Publication fingerprints and the
completed PR result are retained outside the product tree at
`/private/tmp/nuave-b1-publication-72lfuzyn/`.

After B1 integration, B2 covers the constrained non-corrective action path,
final usefulness minimum and answers-only recovery. B2, combined verification
and the founder’s AC-18 before/after usefulness judgment remain outstanding.
Spec 011 stays Verified; F-01/F-03/AC-07 stay closed. No live/provider call,
source fetch or spend occurred. Accounting stays **USD 1.06241155 of 5**.

## Draft-PR publication — 2026-09-25

The founder instructed **“Proceed with B1 publication package and draft PR”**,
then clarified **“You publish B1; worker prompt covers B2.”** This authorized
commit/push and a draft PR with the existing automatic synthetic preview.

[Draft PR #80](https://github.com/yasir-mukhtar/nuave_v0.2/pull/80) is open at
`eb5483e75ef2a9eb7608e6492d0a28454c4bc672`, branch
`codex/spec012-b1-publication`. Remote main was freshly checked/fetched and
still matched `8907d96d10ca101f6fdd68c8c77607cd994d83f3` before publication.
Published tree: `300f6cd5eb7dca278ae67c04c47d63bdae76cd1a`.

All 25 published file blobs match the exact package: the 20 worker files,
verbatim independent review, publication copy of acceptance, completed B1
handoff and narrow NOW/INDEX status edits. All 327 inventoried product files
match the reviewed candidate. The complete diff, links, whitespace, protected-
file exclusion and added-secret/test-bypass scan passed. No tests were repeated
for unchanged code; the matching worker/reviewer evidence remains attributed
above. The original candidate and shared source code remain unchanged.

[Synthetic preview](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/36114202819)
passed. [Required CI](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/36114202753)
also passed on exact head `eb5483e`: 1,429 tests, both builds and 32 browser
checks. The preview comment identifies GitHub's temporary merge commit
`0cc2f051e17fca51abffd72ed0acb80e82373d97`; its tree matches the published B1
tree exactly. At this publication checkpoint the PR remained draft pending
published-PR review and the founder's merge decision. No production release
or live provider call occurred at that checkpoint; the later release is below.

Publication checkout and exact package/body/hash records:
`/private/tmp/nuave-b1-publication-72lfuzyn/`; `PR_READINESS.md`,
`publication-files.json`, `publication-checks.json`, `publication.patch`,
`PR_BODY.md`, `publication-result.json` and `pr-state.json`.
The [B2 prompt](./B2_WORKER_PROMPT.md) was prepared locally for founder handoff
after accepted B1's merge; it is not part of PR #80. It does not close
AC-18 or authorize B2 publication, live work or deployment.

## Merge and deployment — 2026-09-25

The founder said **“PR 80 approved. Merge deploy.”** This settles PR approval
and explicitly authorizes merge and production deployment. The original
independent offline review remains the supplied review artifact; this note
does not invent another published-PR review report.

Before merge, current main still matched `8907d96`, required `validate` and
preview checks were green on approved head `eb5483e`, the PR was mergeable,
and there were no unresolved conversations. All 25 publication file hashes
matched the accepted package. The orchestrator marked it ready and merged
through the protected PR path, with no admin bypass, direct main push,
force push or branch deletion.

- Merge: `d93ec8256200b662796103246e224bd4a3800603` at 17:15:52 WIB.
- Parents: `8907d96d10ca101f6fdd68c8c77607cd994d83f3` and
  `eb5483e75ef2a9eb7608e6492d0a28454c4bc672`.
- Tree: `300f6cd5eb7dca278ae67c04c47d63bdae76cd1a`, exactly the published tree.
- [Main CI and deployment](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/36123028659):
  PASS on the merge commit; 1,429 tests, both builds, 32 browser checks,
  merged-PR-origin gate and production deployment.
- Deployment completed at 17:21:04 WIB; Cloudflare version
  `7be82d31-20b2-4fad-9f41-90991b0f8631`.
- [Preview cleanup](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/36123029058):
  PASS; the temporary preview was removed.
- Production `https://v2.nuave.ai/audit`: read-only HEAD returned HTTP 200,
  response dated 10:21:45 UTC / 17:21:45 WIB. This checks availability; no
  live audit or provider request was made.

Release evidence: `/private/tmp/nuave-pr80-merge-raas_v5u/`, including
`preflight.json`, `merge-result.json`, main/cleanup workflow records,
`main-run.log`, preservation evidence and `release-result.json`.
The publication checkout and original worker candidate remain unchanged.
Local release/handoff records are separate from the exact merged package.

Next is the founder's handoff of the B2 prompt, now pointing to current main
containing `d93ec82`; no additional B1 approval is needed. B2 has not started.
Spec 012 remains Approved/in progress. Prior closed findings and accounting
remain unchanged, with no new live-call allowance.

## Later status — 2026-09-26

B2 merged through PR #81 as `d45a944` and was deployed on 2026-09-26. The founder
accepted the current report for now, with the original AC-18 comparison
unperformed and deferred. The combined Spec 012 closeout candidate is recorded in
[CLOSEOUT_RESULT.md](./CLOSEOUT_RESULT.md) and awaits independent closeout review.
Spec 012 stays Approved, not Verified, until the orchestrator records that review.
