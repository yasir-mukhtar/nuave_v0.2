# Privacy-screen R3 implementation result

2026-09-25. **Offline implementation complete; independent review pending.**

## Candidate and authority

- Candidate: `/private/tmp/nuave-privacy-r3-c6jkgucu/candidate`
- Branch: `codex/privacy-screen-false-positives`; all changes unstaged, no commit.
- Freshly fetched base: `7f34d69d3be0c451e238f1cddf0da62dda250eb1`;
  tree `1a9e3431f674e759f061a827993d4e89e124e7c4`.
- Implements the founder-approved [R3 worker handoff](./PRIVACY_SCREEN_FOLLOWUP_PLAN.md#worker-handoff--authorized-for-offline-implementation).
  The approved plan, retained baseline note and relevant decision are carried
  unchanged from the preserved source. Dated links record this amendment as
  pending review; prior Spec 011 Verified status and F-01/F-03/AC-07 closure stand.
- Remote main was rechecked at handoff: same base, no drift.
  [Read-only result](/private/tmp/nuave-privacy-r3-c6jkgucu/evidence/main-at-handoff.txt).

## Change and caller outcomes

Only `sensitive-intake.ts` changes screening rules. It uses the approved clear
medical and ambiguous groups in both orders, complete words, horizontal phrase
spacing and a maximum 60-character gap without periods/newlines. A lookahead
exempts only the matching `jantung kota` occurrence; retained text is unchanged.
Strong secret/record/contact and English expressions, plus source/context
wrappers, compare exactly with the baseline. The other three runtime files
only define/import/use the two exact PS-06 messages.

| Boundary | Verified outcome |
| --- | --- |
| Shared helper and recursive context screen | P1–P4, P6–P8, P10–P13 change Block → Pass. P5 stays Pass. P9/P14 and B1–B5/B8–B11/M1 stay Block: **12 Pass / 12 Block**. Explicit term/cue matrices exercise both directions, added personal cues, 60/61-character boundaries, punctuation, case and tabs. |
| Source selection / actual extraction route | P1/P8/P11/P10 survive inline markup and reach the existing mocked SDK request once. All three B6 pairs, long/contact-mixed sensitive blocks, existing exclusions, credentials and pre-cap checks remain protected. Blocked pages make zero reservation/provider calls and retain the ledger. |
| Name / proposal / selection / confirmation | The four mechanisms survive copied extraction proposals and freeze exact website origins. Owner changes retain exact text with owner origins. Sensitive/P9/P14 proposals, owner selections and forged contexts are rejected before retention/forwarding. Existing ordinary public URLs pass; credential URLs remain blocked. |
| V2 schema / frozen parser / question-facts / writer | The same safe wording survives exact frozen-context serialization and projection. Existing legacy confirmed/buyer text receives the same shared-rule correction. No filler or source exemption is introduced. |
| Run / report / export | Four fictional contexts containing the exact safe text traverse the real synthetic run/report boundaries and export unchanged website/owner origins. Sensitive, cautious-stop, contact and credential-URL forged contexts are rejected before execution. No paid audit is used. |
| UI errors and recovery | Both exact PS-06 messages are asserted using true-sensitive and cautious-stop fixtures. Blocked page reload preserves safe entry/status/accounting and makes no request. Proposal/owner stops preserve the safe committed state, without echo or forced support contact. |

Clear medical words now apply in both orders near personal cues or bare family;
ambiguous words require the listed personal cues, with bare `kami` excluded.
These approved outcome changes apply through every shared-helper consumer,
including owner input; they are not limited to website text.

## Verification evidence

Node **22.23.2**, locked dependencies installed using `npm ci --offline`.
All development checks use a clean environment; preparation HTTP/DNS/provider
transports are intercepted and downstream runs are synthetic. The canonical
gate uses dummy build credentials and the existing browser network guard.

- [Baseline reproduction](/private/tmp/nuave-privacy-r3-c6jkgucu/evidence/baseline.log):
  all 24 original outcomes reproduced, **1 Pass / 23 Block**.
- [Before-fix regression run](/private/tmp/nuave-privacy-r3-c6jkgucu/evidence/red.log):
  **52 failed / 135 passed**, including false alarms in page selection and
  proposal mapping, plus four mocked preparation regressions.
- [Focused five-suite run](/private/tmp/nuave-privacy-r3-c6jkgucu/evidence/focused-1.log):
  **256 passed**. [Downstream suite](/private/tmp/nuave-privacy-r3-c6jkgucu/evidence/downstream-2.log):
  **31 passed**. Its first development run exposed an incorrectly shaped test
  report request; only that fixture was corrected to the existing strict contract.
  [Typecheck](/private/tmp/nuave-privacy-r3-c6jkgucu/evidence/typecheck.log) passed.
- [Final matrix and protection comparison](/private/tmp/nuave-privacy-r3-c6jkgucu/evidence/final-matrix.log):
  all 24 approved outcomes pass; unchanged strong clauses/wrappers confirmed.
- [Canonical `npm run verify`](/private/tmp/nuave-privacy-r3-c6jkgucu/evidence/verify.log):
  **PASS: 1,407 tests in 93 files, engineering checks, Next.js and Cloudflare/OpenNext builds, and 32 browser checks (29 enabled + 3 disabled).** Lint retains 23 existing warnings, zero errors.
  The [first gate](/private/tmp/nuave-privacy-r3-c6jkgucu/evidence/first-verify.log)
  passed engineering checks, 1,407 unit tests and both builds, then failed two
  browser assertions still expecting the old privacy wording (27 passed).
  Only those two existing assertions were updated to the exact approved copy;
  this concrete failure justified the final gate rerun. No new browser harness.
- [Gate input hashes](/private/tmp/nuave-privacy-r3-c6jkgucu/evidence/verification-inputs.sha256)
  bind the runtime, tests and carried documents to that run. They still match;
  only this result document was completed afterward.

## Review package and changed files

[Complete task patch](/private/tmp/nuave-privacy-r3-c6jkgucu/evidence/task.patch),
[changed-file SHA-256 hashes](/private/tmp/nuave-privacy-r3-c6jkgucu/evidence/changed-files.sha256),
[artifact hashes](/private/tmp/nuave-privacy-r3-c6jkgucu/evidence/artifacts.sha256),
and [preservation/patch checks](/private/tmp/nuave-privacy-r3-c6jkgucu/evidence/handoff-checks.log)
are outside the product tree. The patch includes this result and all added files.
The actual candidate index remains unstaged.

- Runtime: `src/lib/audit/{sensitive-intake.ts,types.ts}`;
  `src/lib/intake/{SmartIntakeJourney.tsx,smart-intake-contract.ts}`.
- Tests: new `src/lib/audit/sensitive-intake.test.ts`; extended
  `src/lib/audit/{source-excerpt,question-facts-v3,direct-ten-route}.test.ts`,
  `src/lib/intake/smart-intake-contract.test.ts`, and
  `src/lib/intake/smart-source-preparation.test.tsx`. Existing browser copy
  assertions changed in `tests/e2e/{new-intake-journey,smart-intake}.spec.ts`.
- Documentation: `docs/{NOW,INDEX,DECISION_LOG}.md`; Spec 011 `SPEC.md`,
  `F03_PRODUCT_CORRECTION_SCOPE.md`, and the three
  `PRIVACY_SCREEN_FOLLOWUP_{PLAN,EVIDENCE,RESULT}.md` files.

The preserved shared checkout's HEAD/status/index and recorded task-file hashes
match its starting snapshot. No write was made to it or to previous candidates
or evidence directories. The four protected notes, raw/private evidence and
archived material were not inspected. The complete task diff was inspected;
there are no diagnostic switches, runtime logging or temporary product scripts.

## Limits and next action

No blocker. P9/P14 remain accepted false alarms; this mechanical check does not
guarantee privacy detection or establish real-site prevalence/model reliability.
No dependency, schema, storage, transition, fetch/call, retry or budget change.
No live calls, business-site requests, commit, push, PR, merge or deployment.
Accounting remains **USD 1.06241155 of 5**.

Next: the single focused independent review described by R3. Review the patch
and exact hashes, rerun affected suites in a matching isolated copy, and reuse
the canonical gate unless a concrete unresolved concern warrants another run.
