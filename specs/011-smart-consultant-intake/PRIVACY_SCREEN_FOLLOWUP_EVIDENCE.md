# Privacy-screen follow-up: retained baseline evidence

2026-09-25. This note preserves the finding and fictional inputs for
[plan R3](./PRIVACY_SCREEN_FOLLOWUP_PLAN.md). It does not establish that a fix
has been implemented. No real personal records or business pages were used.

## Baseline and method

- Deployed baseline: `7f34d69d3be0c451e238f1cddf0da62dda250eb1` (PR #78).
- Product tree: `1a9e3431f674e759f061a827993d4e89e124e7c4`.
- Function: `isSensitiveIntakeText` in `src/lib/audit/sensitive-intake.ts`.
- File SHA-256:
  `a3dc03e16daa370a0b715f62fac3fdd3f71715fb764eee6c9eaee878ce94bd9b`.
- Independent orchestrator observation: 2026-09-25 00:40:22 UTC
  (07:40:22 WIB), Node 22.23.2, installed locked TypeScript compiler.

The existing helper was transpiled in memory and evaluated in an isolated
JavaScript context, then called with the 24 fictional inputs below. The helper
file was not changed. No application server, fetch, model, live audit or
provider credential was used. This isolates the text check; it is not a new
end-to-end preparation test.

To reproduce without any temporary artifacts: obtain the helper at the pinned
commit, check the file hash, import/transpile it with the repository's existing
tools, and call `isSensitiveIntakeText` on each input in the plan's acceptance
table. `true` means Block; `false` means Pass. Add the mixed input given below.
Do not run the reviewer's proposed expression as if it were the deployed code.

## Observed results

The exact P1–P14, B1–B5 and B8–B11 input strings are retained in the
[acceptance table](./PRIVACY_SCREEN_FOLLOWUP_PLAN.md#concrete-acceptance-examples).
B6/B7/C1 describe later compound/existing-suite obligations, not additional
individual runs in this 24-input probe.

| Inputs | Observed baseline result | R3 required result | Meaning |
| --- | --- | --- | --- |
| P1–P4 | Block (4/4) | Pass | Original harvest/taste/herbal/room false alarms |
| P5 | Pass (1/1) | Pass | Existing harmless control |
| P6/P7/P11/P12/P13 | Block (5/5) | Pass | `tes`/`lab` matched inside `kontes`, `kolab`, `protes` |
| P8/P10 | Block (2/2) | Pass | Bare-family marketing and the named `jantung kota` idiom |
| P9/P14 | Block (2/2) | Block | Accepted residual false alarms: personal phrase near an ambiguous term |
| B1–B5, B8–B11 | Block (9/9) | Block | Private/record/ambiguous controls |
| M1: P10 followed by a space and B1 | Block (1/1) | Block | Benign business sentence must not override a private health statement |

Total: **24 observed outcomes**. Thirteen were identified as benign false
positives under R2's requested outcomes; one allowed control and ten blocked
controls retained their expected baseline outcomes. R3 requires fixing 11 of
those false positives and accepts continued blocking for P9/P14. Its expected
total is 12 Pass / 12 Block. The observed baseline remains 1 Pass / 23 Block;
these are not passing correction tests.

Two directional rules cause the false positives: possible health term before
a personal/family cue, and personal/family cue before a possible health term.
The first also lacks a word-start boundary. P11/P12 deliberately retain a
personal cue, so dropping bare `keluarga` cannot accidentally make a missing
word-start fix appear complete.

`Keluarga kami` alone does not establish a private record. R2 nevertheless
required P9/P10/P14 to pass while B11 blocked, relying on sentence meaning to
separate the same personal phrase and ambiguous words. The R2 reviewer correctly
identified that this invites fragile exceptions. R3 instead names two word
groups: clear medical terms near any personal/family cue, and ambiguous terms
near clear personal phrases only. P9/P14 may remain false alarms under this
rule; P10 passes through one explicitly named `jantung kota` exception, never
through an exemption for the whole sentence. B9/B10 still block without a
possessive. Passing a marketing sentence is not a Nuave endorsement of its
medical or commercial claim.

## Provenance and limits

The PR #78 independent reviewer originally reported P1–P4 and retained their
fictional source-selector outputs. Its review document hash is
`307e2b4b07c40088d6c58a15a3d25bcc71958acf6a691f3447974491218789f3`.
The founder subsequently relayed the plan review and exact P6/P7/P8/P13/P14
examples in chat. The later review was not written to a file; the reviewer said
its initial additional probe had been overwritten. A retained `wb.test.ts`
contained the simpler expression sketch and several examples. Its logging-only
checks are not treated here as assertions proving a product correction.

In the latest chat review of R2, the reviewer reported that its two-group rule
with word-start matching met 21 of the 24 R2 expectations: every blocking
control, including B8–B11 and mixed M1, blocked; only P9/P10/P14 missed the
requested Pass result. This is attributed reviewer evidence, not a new
orchestrator run or an implemented rule. The reviewer recommended accepting
P9/P14 stops and either accepting P10's stop or allowing the fixed location
idiom. R3 proposes the idiom. Its complete rule and outcomes still need worker
tests after approval. The earlier possessive-only sketch was incomplete
because it left B10 unblocked; that limitation is not attributed to the later
two-group rule.

The orchestrator independently reproduced the current helper results above,
including the chat-supplied cases. P9/P10/P11/P12/B8–B11 and M1 are additional
orchestrator controls. No claim about the prevalence on real sites follows
from this sample. Full route, confirmation, server and copy behavior still
need the implementation/reviewer checks in the plan.

Historical local artifacts, useful if still available but **not prerequisites**:
`/private/tmp/nuave-pr78-review-p2QvgOje/` (review and scratch sketch),
`/private/tmp/nuave-privacy-plan-r2-2r4ae4sq/` (independent baseline script,
24-input results, logs and preservation checks). The essential inputs, baseline,
method and outcomes are retained here and in the plan so loss of those folders
does not lose the finding.

## NOW.md change audit

At the start of R2, `git diff --numstat -- docs/NOW.md` reported **280 added /
38 removed lines** against the old source HEAD, totaling the 318 lines noticed
by the reviewer. That included earlier uncommitted acceptance, publication and
merge/deployment records.

Comparison with the preserved file immediately before the first privacy plan
shows only **8 added / 4 removed lines in two hunks**, at the next-action and
privacy-follow-up paragraphs. The unrelated earlier content remained identical.

- Before first plan SHA-256:
  `35f962193a3dee22f7cf3ad56f2458ae9b2509ffcf2a1255d896f89a41148c17`.
- After first plan / before R2 SHA-256:
  `91f4759e7619cbe9df66a61d1893b4700c2647dae13f562ddbbea41e9b9180f6`.

R2 likewise changes only those two paragraphs: **9 added / 8 removed lines**
in `NOW.md`. The before-edit inventory and bounded diffs retain the comparison;
the existing changes are preserved rather than removed to shrink Git's diff.

R3 changes only those same two `NOW.md` paragraphs: **7 added / 5 removed
lines**. Its four-document revision leaves the other 662 inventoried files
unchanged; all 316 preserved-source and 325 published-candidate product hashes
match their existing records. Task links and whitespace checks pass. No
application tests, provider calls or implementation changes were made for R3.
