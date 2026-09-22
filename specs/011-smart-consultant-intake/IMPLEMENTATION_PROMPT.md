# Implement Spec 011 after accepted sizing and boundary review

Prepared: 2026-09-22. Give this whole prompt to the next implementation agent
with access to this local working tree. The accepted spec amendments are local
uncommitted changes; a checkout of HEAD alone does not contain them.

## Role, authority, and one deliverable

You are the implementation worker for Nuave Spec 011.

Repository: `/Users/hy4-mac-006/nuave_v0.2`

Deliver one complete offline-verified product change: the prepared summary and
single business confirmation, with exact confirmed meaning carried through
questions, audit/report requests, saved results, recovery, and JSON/PDF output.
Preserve old started/completed records under the approved delivery/retry hold.
Implement the approved scope and verify it; do not stop at another plan or
repeat the completed sizing exercise.

The founder accepted the recommendation on 2026-09-22: “I agree with your
recommendation totally. Lets do that. Move forward.” The decision is recorded
in `docs/DECISION_LOG.md` under **2026-09-22 — accept the Spec 011 truthful
boundary and historical hold** and incorporated into Spec 011.

The settled decisions are:

- R-00A is complete through the sanitized local extraction note.
- R-00B is **Cross-cutting**. The complete downstream boundary is large; this
  is not a time or delivery promise.
- Every new v2 session uses truthful, versioned run/report/storage/export
  context. No fabricated compatibility values reach new synthesis or output.
- New report interpretation and JSON context/version may change to remove
  invented input. Observation method/messages, measurement/evidence rules,
  report output schema/layout, question review, and cost controls stay protected.
- Old started/completed v1 records remain unchanged, with in-app report display,
  JSON/PDF delivery, observation resume, and report retry held. This is settled
  release behavior, not a pending approval or a reason to block new work.
- Legacy-only deletion and historical reactivation are deferred. No temporary
  fallback exposure exception exists.

Earlier sizing/review notes remain immutable evidence of the decision process.
Their original “not approved” and “implementation blocked” statements precede
the founder acceptance. The amended spec and newest decision govern. The old
review prompt is not a request to run another review.

## Verify the handover first

```sh
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git rev-parse origin/devin/sol-smart-consultant-intake-plan
git status --short
git status -sb
shasum -a 256 specs/011-smart-consultant-intake/EXTRACTION_FIELD_NOTE.md
shasum -a 256 specs/011-smart-consultant-intake/R23_SIZING_NOTE.md
shasum -a 256 specs/011-smart-consultant-intake/REPORT_EXPORT_BOUNDARY_REVIEW.md
shasum -a 256 specs/011-smart-consultant-intake/REPORT_EXPORT_BOUNDARY_REVIEW_PROMPT.md
```

Required branch: `devin/sol-smart-consultant-intake-plan`.

Required HEAD and local remote-tracking ref:
`194f0f44e7f6c7f8bc3270b97a2ac9f887b830e4`.

The founder's handover requires this dedicated branch. Continue here; do not
switch to `main` or conclude the spec is missing there. This session-specific
instruction takes precedence over the generic AGENTS.md starting-branch rule.
No fetch is needed to verify the local remote-tracking ref; do not describe
that as a fresh remote verification. Do not restore temporary history.

Expected starting status:

```text
 M README.md
 M docs/DECISION_LOG.md
 M docs/INDEX.md
 M docs/NOW.md
 M specs/011-smart-consultant-intake/SPEC.md
 M specs/README.md
?? specs/011-smart-consultant-intake/EXTRACTION_FIELD_NOTE.md
?? specs/011-smart-consultant-intake/IMPLEMENTATION_PROMPT.md
?? specs/011-smart-consultant-intake/R23_SIZING_NOTE.md
?? specs/011-smart-consultant-intake/REPORT_EXPORT_BOUNDARY_REVIEW.md
?? specs/011-smart-consultant-intake/REPORT_EXPORT_BOUNDARY_REVIEW_PROMPT.md
```

The six tracked documentation changes are the accepted amendment and routing
updates. Read their diff and preserve them; do not mistake them for disposable
changes. Confirm Spec 011 contains the 2026-09-22 acceptance, R-21 historical
hold, and AC-08 truthful downstream tests before editing runtime code.

| Existing local artifact | Required SHA-256 |
|---|---|
| `EXTRACTION_FIELD_NOTE.md` | `7cb622777797c8bb5fbe8851e58dfdfe79ce5272a4693524bab6b88500466427` |
| `R23_SIZING_NOTE.md` | `5637833c7eaecf30d520ec8b160c1fbdb7faba65dee162ca30e46053009ad129` |
| `REPORT_EXPORT_BOUNDARY_REVIEW.md` | `98e246b1a7c322d6721ef3900ea7627c5c2ab903a13e2d0bf576424da095c762` |
| `REPORT_EXPORT_BOUNDARY_REVIEW_PROMPT.md` | `0ccd5684f26cbd2842f48f6cfdead9cf6b2b74a3bb30ee4863d90e68e95f3b9c` |

If branch, commit, expected starting changes, or note hashes differ, stop and
report the discrepancy. Do not repair, overwrite, hide, or regenerate them.
Never run `git clean`, `git reset --hard`, or `git stash`. The four hashed
artifacts must remain untouched, untracked, unstaged, uncommitted, and unpushed.

## Required reading, in order

1. `AGENTS.md`, `README.md`, and `docs/NOW.md`.
2. `docs/WORKFLOW.md` and the newest 2026-09-22 decision-log entry only.
3. The amended `specs/011-smart-consultant-intake/SPEC.md` completely. It owns
   required behavior; this prompt organizes implementation rather than
   replacing its requirements.
4. `R23_SIZING_NOTE.md` and `REPORT_EXPORT_BOUNDARY_REVIEW.md` in the same spec
   directory for code references, fallback inventory, and likely breakpoints.
   Read the sanitized `EXTRACTION_FIELD_NOTE.md`; do not inspect raw evidence.
5. Only the Product, Design, and Audit sections named under the spec's Required
   context, reading each section in full.
6. Relevant code/tests in the bounded scope below. Before writing Next.js code,
   read the applicable installed guide in `node_modules/next/dist/docs/` as
   required by `AGENTS.md`; do not assume old APIs.

No `.secrets/`, credentials or environment-secret files, retained private
provider inputs/outputs, real customer browser storage, `archive/`, superseded
draft plans, unrelated historical experiments, or provider-evaluation work.
No extraction reinspection, fresh source fetch, or private-data migration is
needed. Use fictional fixtures and intercepted/synthetic responses.

## Bounded implementation scope

You may edit the relevant modules and focused tests under:

- `src/lib/intake/`: preparation, state, summary/navigation, frozen input,
  question-pack handoff, intake/audit session persistence and old readers.
- `src/lib/audit/`: extraction/context schemas, facts projection, versioned
  request contracts, locks/minimizers, orchestration types, report
  synthesis/interpretation/repair, customer export and provider adapters.
- `src/app/audit/`: run/report builders, saved-context recovery, historical
  availability state, and report display/print projection.
- `src/app/api/audit/`: only affected extraction, question, run/report parsing,
  version gates, and existing protection boundaries.
- `tests/` and existing co-located tests: focused fictional fixtures, regression
  tests, and intercepted browser coverage for this capability.
- Existing intake component/style files required by the summary; follow the
  approved UI stack and shared-token rules. No product-wide visual refactor.
- `specs/011-smart-consultant-intake/VERIFICATION.md`: record actual completion
  evidence, versions, remaining legacy consumers, and verification limits.
  Update current-status documentation only when implementation changes status.

Inspect the complete current call chain before changing shared types. The
review's file/line references describe the original HEAD and will move as you
edit. New narrowly scoped helpers are allowed where required; no generalized
audit architecture, new generic UI stack, feature-flag matrix, or database.

## Work sequence inside one complete product change

1. **Protect the old state before version changes.** Create literal fictional
   pre-change intake/audit fixture pairs with a real-shaped non-null brief,
   questions/originals/edits, observations, report, and ledger. Preserve strict
   old parsing and storage. Implement the historical hold without rewriting
   old bytes. Reject old run/report requests before provider work; no historical
   eligibility service or exception mechanism is needed for this release.
2. **Preserve prepared meaning.** Extend the existing extraction call with the
   three approved structured fields and Indonesian explanatory text. Map the
   result into immutable proposals, mutable selections, and separately
   confirmed values with origins. Never infer structured reach/areas/channels
   from `market_context` prose.
3. **Deliver the summary.** Preserve exact copy, row order, focus rules, optional
   details, and required-gap behavior from the spec. The rich local case needs
   zero typing after `Periksa`, one summary, at most two substantive decisions,
   and one `Sudah sesuai — buat pertanyaan audit` action. The default whole-brand
   focus remains `Saran Nuave`; typed identity remains `Dari Anda`.
4. **Complete the truthful path.** Couple frozen/facts/pack/session versions;
   carry distinct target, needs, considerations, origins, product offering,
   and comparator unknown exactly into writer and new audit context. Use one
   versioned projection through run/report, saved state, retries, JSON, and
   print. Preserve protected question-only observation messages and all named
   comparators for identity protection and evidence matching.
5. **Close every output path.** Report adapters receive confirmed context with
   honest authority, not fabricated `verified_brief`. Absent values remain
   absent. Report retry/repair and deterministic matching must stay truthful.
   JSON v5 contains saved confirmed context and existing evidence/provenance;
   report output shape/layout remains unchanged. Any testing-only adapter
   unable to accept v2 must reject it before a provider call, not fall back to
   the legacy brief. New-session recovery uses saved context, never a rebuilt
   mutable or compatibility object.
6. **Verify and inspect the full diff.** Run focused checks and required offline
   gates; fix failures before handoff. Record implementation evidence without
   claiming live validation or marking the spec independently Verified.

No partly connected change is ready for publication. Legacy-only deletion,
historical reactivation, report usefulness/layout redesign, accounts, payments,
durable jobs/storage, and commercial-launch work are out of scope. No new
business facts, unsupported comparator claims, or "unknown" filler strings may
be added merely to satisfy a validator. Never weaken old strict schemas.

## Required acceptance and regression evidence

Meet every AC-00 through AC-08 in the amended spec. In particular:

- Rich, partial, empty, product, and location fixtures prove the one-summary
  experience, exact focus rules, no optional-field blocking, and no duplicate
  confirmation or paid work on reload/Back/double-click.
- Distinct sentinel values reveal any target/need/criterion/channel/category
  substitution. Cover optional values individually and all absent, unknown
  comparator, explicit alternatives, and multiple named comparators. Inspect
  actual facts/writer/run/report/provider/export payloads and stored context.
- Customer confirmation preserves origins; it never upgrades an owner claim
  or Nuave suggestion into independently verified evidence. Hidden/rejected/
  inactive values never reappear through a pack convenience field or retry.
- Literal pre-change v1 records survive byte-for-byte with strict old readers.
  Test done, running with zero/partial observations, interrupted, report-failed,
  and pre-provider failure. Old restoration makes no provider/budget requests;
  old display/download/resume/retry stay held in UI and at provider boundaries.
  Test old/new coexistence, malformed/mismatched state, and length limits.
- New v2 resume executes only permitted missing work; report-only retry uses
  exact saved context/observations and ledger. Done records never execute again.
- New JSON v5 and print use the same saved report/context; preserve original
  wording, edits, exact evidence, and model/cost provenance. Compare reload
  exports excluding documented volatile fields only. Inspect print content,
  including all ten details; do not claim an OS save dialog was tested by a
  print-DOM assertion. Preserve existing customer-export filtering of internal
  call telemetry, provider failure diagnostics, and legacy metrics; keeping the
  saved internal cost ledger does not mean exporting it wholesale.
- Keep historical fixture-ID/method validators and their existing tests. Tests
  generated only with new builders or a `done` record with `brief: null` do not
  demonstrate cross-version preservation.

Run focused suites appropriate to changes, then `npm run validate:fast`, then
`npm run verify` with the repository's offline/dummy-credential setup. Do not
load real credentials to make tests pass or execute any live script. Browser
review uses fictional intercepted/synthetic data. A suite's previous pass at
HEAD is not evidence that your implementation passes.

In `VERIFICATION.md`, map every acceptance criterion to actual evidence,
record exact context/request/storage/facts/export versions, enumerate remaining
legacy fallback sites and their isolated consumers, and list unresolved limits.
Distinguish automated checks, offline browser judgment, independent review,
and any future live founder walkthrough.

## Permission and escalation boundaries

Offline implementation, fictional tests, and reversible local fixes inside the
approved scope are authorized. Do not ask again about the settled Cross-cutting
classification, truthful downstream scope, or historical hold.

Do not stage, commit, push, merge, deploy, contact anyone, spend money, make a
provider call, inspect private evidence, or dispatch other agents. No live
authorization is included. Even the one preparation-only walkthrough needs a
fresh explicit founder authorization; it uses one tab for desktop/mobile and
stops before final confirmation/question generation unless separately allowed.
An end-to-end live run and release each require their own authorization.

If implementation reveals a new product decision, a conflict outside the
accepted amendment, or a need to change protected measurement/report behavior,
stop the affected part and report the exact issue. Continue independent work
that remains within scope. Never change the spec to rationalize code. Never
overwrite unrelated work or claim that a historical hold provides durable
backup, a support promise, or permission to erase old records.

## Completion report

Return:

1. Outcome and the exact completed new-session path.
2. Branch, HEAD, `git status --short`, and changed files with reasons.
3. Focused and full offline check results, failures fixed, and remaining limits.
4. Acceptance-criterion evidence and the `VERIFICATION.md` path.
5. The new contract/storage/export versions and any remaining legacy consumers.
6. Proof of old-record preservation/hold and confirmation that all four local
   artifact hashes remain unchanged and outside the index.
7. Confirmation of no private evidence, live calls, commits, pushes, merges, or
   deployments, plus the next smallest verification action.

The expected next action after a green complete implementation is independent
verification and separately authorized founder preparation review. Do not
silently convert implementation approval into live-call or release authority.
