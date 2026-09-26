# Spec 012 — combined closeout result (candidate)

> Date: 2026-09-26
> Handoff: [CLOSEOUT_WORKER_PROMPT.md](./CLOSEOUT_WORKER_PROMPT.md)
> Candidate: `/private/tmp/nuave-spec012-closeout`, branch `codex/spec012-combined-closeout`, uncommitted
> Base: freshly fetched `origin/main` = `d45a944674f29828bdd95bc878ce8ca07ff01818` (PR #81 merge; equals the handoff's recorded main)
> Result: **READY FOR INDEPENDENT CLOSEOUT REVIEW.** Proposed verdict: **Pass with founder-approved exception (AC-18)**. This is the worker's reconciliation, not independent verification. Spec 012 stays **Approved** until the orchestrator records the review.

## 1. What this candidate does

It changes documentation only. It:

1. restores the approved spec and review 1 from the pinned commit;
2. records the AC-01–AC-19 matrix in [VERIFICATION.md](./VERIFICATION.md#combined-closeout-2026-09-26);
3. reconciles the approved 2026-09-22 report amendments onto current main
   (R-19's documentation half); and
4. updates routing and status to match the completed releases and the founder's
   2026-09-26 acceptance.

No runtime, test, fixture, dependency, script, configuration or schema file
changed.

## 2. Starting state and identity checks

| Item | Check | Result |
|---|---|---|
| Main | `git fetch`; `origin/main` | `d45a944`, unchanged since the handoff |
| Ancestry | `merge-base --is-ancestor` | `d08b9e9` (A), `7f34d69` (Spec 011), `8907d96` (R3), `d93ec82` (B1), `d45a944` (B2) are all ancestors. Ancestry was not treated as verification; each step's review/CI record is cited. |
| Approved spec | `git show 9c5d4c0:…/SPEC.md \| shasum -a 256` | `294ac792…e4110` (matches) |
| Main CI per merge | read-only `gh run view` / `gh api` | All success. PR A's run 35712356136 passed on **attempt 2**; attempt 1 is the recorded failure. |
| Release evidence | `/private/tmp/nuave-pr81-merge-pt2_ikni/` | `release-result.json` (merge, tree `8337005d`, 32 files, 1,460/2/33, deployment success, 0 live calls); `merge-tree-check.json` `matches_approved_package: true`; `main-run.log` SHA-256 `e340c936…703a` equals the recorded value. Log shows 95 test files, 30 + 3 browser tests. |
| B2 review | `reviewed.patch`, `verify.log` | SHA-256 `e67e46bf…ce18` and `0af7bda0…2c6c`, matching B2_ACCEPTANCE |
| B2 visual | `artifacts-sha256.txt`, completed PDF | `b0b19654…292a`, `cdc7626e…a5d3c`, matching |
| Founder-reviewed sample | shared `review-artifacts/b2-fictional-layout-sample.pdf` (local only, not in Git) | `cdc7626e…a5d3c`, byte-identical to the B2 visual PDF |
| Shared context records | B1/B2 prompts, visual result, B2 review | Identical hashes between the shared checkout and main, except `B1_ACCEPTANCE.md` / `B2_ACCEPTANCE.md`, whose later shared sections are carried here |

No code changed between the evidence and the runtime base. B2 was reviewed on
`d93ec82` plus a 25-file patch whose 331 product hashes match the merged
package, and `d45a944` adds only documentation to that product tree. Existing
evidence therefore applies unchanged, and no new check is needed.

## 3. Evidence map (summary)

The full matrix, with sources, attribution and limits, is in
[VERIFICATION.md](./VERIFICATION.md#combined-closeout-2026-09-26).

- **AC-01–AC-07, AC-09:** Pass (A; worker plus PR A review; rechecked by the
  B1, integration and B2 visual evidence).
- **AC-08:** Pass with accepted qualifications. Every page of the A4 PDFs was
  inspected at A, B1, integration and B2. The qualifications, which the cited
  reviews accepted, are: headless print engine only; a spied `window.print()`;
  native Save dialog not exercised; the "toolbar" and "native" PDFs were a
  single capture; CSS zoom; viewport emulation; and a cosmetic 320px index
  wrap. None is an unmet criterion.
- **AC-10:** Pass for A, rechecked at B1 and B2. The export baseline is
  post-Spec-011 `nuave-evidence-v5`. R-17's `v4` wording predates Spec 011's
  approved versioning.
- **AC-11–AC-13:** Pass (B1 review). AC-12 carries the pre-existing,
  testing-only Gemini schema limitation.
- **AC-14–AC-17:** Pass (B2 review, including its canonical rerun and 22
  assertions; B2 visual result). `SmartAuditStage` is the accepted counterpart
  of the spec's `LocalAuditStage` reference.
- **AC-18:** **Founder-accepted exception: original same-evidence comparison
  unperformed and deferred.** The founder accepted the report after a disclosed
  fictional sample. There are no rubric results and no claim about real
  synthesis quality. The 2026-09-22 PR A check on the real 2026-09-19 record is
  separate evidence and is not this comparison.
- **AC-19:** Pass for the code PRs, in the integration order shown in the
  matrix. The documentation integration is this candidate.

Attribution: A was implemented by Codex and reviewed by Claude. B1 and B2 were
each reviewed independently. The B2 visual evidence was produced by a separate
worker and re-inspected by the orchestrator. This candidate reran none of those
checks.

## 4. Document reconciliation

### Three-way basis

The approved report delta is `git diff 4e6b2cf 9c5d4c0` (commits `be8187a`,
`afacda5` and `9c5d4c0`, final post-review text). None of the five canonical
targets changed on main after `4e6b2cf`
(`git diff --stat 4e6b2cf origin/main` is empty for them). The delta therefore
applied cleanly, and each file first equaled its `9c5d4c0` blob exactly. Only
then were status statements corrected.

| File | Applied (approved text, verbatim) | Adjusted to current facts | Superseded / not applied |
|---|---|---|---|
| `docs/PRODUCT.md` | Direct-ten reporting amendment, delivery list (1–10), answers-only recovery paragraph | "does not claim the redesign is implemented" → implemented through PRs #74/#80/#81; verification in closeout | — |
| `docs/AUDIT.md` | Direct-ten report format, historical split, `plain-id-v1` note, Download PDF, acceptance checklist | Header date/status; "contract is in review" → approved and implemented; "A/B1 preserve current recovery until B2 lands" → B2 implemented it | The approved delta did not touch Weak evidence or Data boundaries; both were read and left unchanged |
| `docs/VOICE.md` | Sixth settled label, 7.4 direct-ten order | "do not claim runtime implementation" → implemented (writing limits unchanged) | — |
| `docs/journey/06-audit-report.md` | Direct-ten contract, historical relabeling, gap-list note | "in review" / "still pending" → approved/implemented; recovery ownership → released in PR #81 | Old "Next smallest report action" ("approve the numbered spec before runtime work") → replaced with the current state and the founder's deferral |
| `specs/010-gated-new-audit-flow/SPEC.md` | Observation/report failure row, 2026-09-22 amendment, revision record | "A/B1 preserve…; B2 owns implementation after approval" → implemented through PR #81; verification lives in the Spec 012 closeout | — |

Operating and routing documents were edited selectively on current main. They
were not replaced by `9c5d4c0` snapshots.

| File | Already on main | Applied | Superseded (not applied) |
|---|---|---|---|
| `docs/DECISION_LOG.md` | Entries through 2026-09-25 R3 approval | Shared-source entries (2026-09-26 founder acceptance; PR #80, PR #79, R3 commit/push, PR #78, Spec 011 draft-PR). The approved 2026-09-22 Spec 012 promotion entry, verbatim, with pinned draft permalinks and a dated reconciliation note. A PR #81 release entry built only from the facts in B2_ACCEPTANCE. | — |
| `docs/NOW.md` | B1 release; R3 release; PR A report state | Founder acceptance in the checkpoint paragraph; next action = closeout review; B2 release; report-state paragraph; direct-ten 1–10 limits and the code-owned P/V path in "What is known"; Do now items 4–5; "Not now" deferral; "Done for this cycle" note | `9c5d4c0`'s report pointer ("start PR A"), "Current objective" rewrite and Do-now items 3–5 (all completed) |
| `docs/INDEX.md` | B1 release | Current Spec 012 entry; stale B2-publication and Spec 011 PR-package claims corrected | `9c5d4c0` "Review … before runtime implementation" |
| `specs/README.md` | PR A pointer | Spec 012 entry; stale Spec 011 publication claim; Spec 010 entry uses the approved recovery wording, updated to "implemented" | `9c5d4c0` "No implementation is claimed" and the Spec 011 snapshot caveat (Spec 011 has since merged) |
| `README.md` | — | Status paragraph, start-here row and journey paragraph, from the shared source updated to the closeout state | — |
| `B1_ACCEPTANCE.md` | Main's version, with relative links to the preserved result/review | Shared status line, then the "Draft-PR publication" and "Merge and deployment" sections appended; a later-status note | Shared version's absolute scratch-path links (main's relative links kept); shared's rewrite of the dated publication section (main's dated text kept) |
| `B2_ACCEPTANCE.md` | Main's version | Shared version (a pure superset: status lines, draft-PR, merge/deployment, founder acceptance), plus a closeout pointer | The link to the unpublished local `PR_81_REVIEWER_PROMPT.md` became plain text |
| `SPEC.md`, `SPEC_REVIEW_1.md` | Absent (expected) | Restored from `9c5d4c0`. `SPEC_REVIEW_1.md` is byte-identical to the pinned file. `SPEC.md` = pinned text + one header closeout line + four draft links changed to `9c5d4c0` permalinks + a dated closeout/provenance section. No requirement or AC text changed. | — |

Overlapping later decisions were checked; none conflicts:

- **Spec 011 truthful context and historical hold.** The report amendments
  never reconstruct optional facts and never rewrite historical records. The
  hold on in-app v1 delivery is stricter and still governs.
- **Privacy R3.** Not touched.
- **Direct OpenAI provider (2026-09-20).** Not touched.

No new product or policy decision was made.

### Live-flow tasks

Review 1 (S1) restored two live-flow items beside report work:

1. Prepare one real-flow approval scope.
2. After authorization, run the ordinary intake through real preparation,
   approved questions, ten grounded answers and report/download.

Later disposition:

- Both were executed on 2026-09-19 by the authorized
  [complete real end-to-end test](../009-recommendation-eligible-audit/VERIFICATION.md#complete-real-end-to-end-test--execution-2026-09-19).
  Its proposal is the approval scope; the run covered 13 requests, report,
  JSON/PDF and a retained export.
- They were repeated on the deployed site by Spec 010 AC-11 on 2026-09-20.
- The Spec 011 integration (PR #78) removed them from `NOW.md` "Do now".

`NOW.md` item 5 now records this disposition. The allowances are consumed. A
new real end-to-end run through the Spec 011/012 path needs new founder
authorization; none is reinstated.

## 5. Checks run by this worker

| Check | Result |
|---|---|
| Documentation-only delta | `git diff --name-only origin/main` lists only `.md` files. The untracked files are `SPEC.md`, `SPEC_REVIEW_1.md`, `CLOSEOUT_WORKER_PROMPT.md` and this file. Blob comparison: every tracked non-Markdown file equals its `origin/main` blob (see §7). |
| Canonical-delta fidelity | After applying, each of the five files matched its `9c5d4c0` blob before the status edits |
| `git diff --check origin/main` plus a whitespace scan of untracked files | Pass |
| Relative links and anchors in all changed/added Markdown | Pass for introduced links. False positive: URL-encoded `Archive%20Candidates` exists. Pre-existing on main, not introduced: `DECISION_LOG.md` link to `NEXT_STEP.md#current-worker-task--continuous-audit-flow` has no matching heading. |
| Pinned permalinks | All four draft paths exist at `9c5d4c0`, and the commit is on the remote (`origin/docs/astra-report-redesign-plan`; GitHub API resolves it) |
| Protected/private content | None of the four protected Spec 011 notes was read, linked or added. No `archive/`, `.secrets/`, credentials, raw answers or business findings entered the diff. The only artifact path added is the already-recorded local fictional sample. |
| Status consistency | No current-tense claim remains that B1/B2 are unimplemented, that release is pending, or that another usefulness round is next. Dated historical sections are preserved and marked. |

Not run, by design: `npm run verify`, test suites, PDF regeneration, and
founder walkthroughs. These are Markdown-only changes on an unchanged runtime.
No provider call, source fetch, commit, push, PR, merge or deployment happened.

## 6. Preserved limits and residual notes

- Headless PDF output is not the native Save dialog. CSS zoom is not browser
  zoom. Emulation is not a physical phone. Fictional evidence is not real
  usefulness. Production output quality, billing and rate-limit bindings are
  unassessed.
- The B2 visual worker called the older e2e PDF a "V-template" example. Its
  action is the pre-existing synthetic verification action, not the exact R-13
  V template. Exact P/V behavior is covered by technical assertions only.
- Model link tails (`?utm_source=`) still print verbatim, by design under
  R-04/R-05. This falls under the founder's deferred reference-clutter work.
- Outside this task, reported rather than edited:
  - `docs/AUDIT.md:22` (Spec 009 amendment) still says "Implementation and live
    validation are pending". It is outside the approved report delta and the
    permitted reconciliation scope.
  - The pre-existing broken `NEXT_STEP.md` anchor noted above.
- Spec 011 F-01/F-03/AC-07 stay closed. Accounting stays USD 1.06241155 of 5.
  There is no live-call allowance.

## 7. Candidate state and changed files

Modified (13): `README.md`, `docs/AUDIT.md`, `docs/DECISION_LOG.md`,
`docs/INDEX.md`, `docs/NOW.md`, `docs/PRODUCT.md`, `docs/VOICE.md`,
`docs/journey/06-audit-report.md`, `specs/010-gated-new-audit-flow/SPEC.md`,
`specs/README.md`, `specs/012-evidence-first-report/B1_ACCEPTANCE.md`,
`B2_ACCEPTANCE.md`, `VERIFICATION.md`.

Added (4): `specs/012-evidence-first-report/SPEC.md`, `SPEC_REVIEW_1.md`,
`CLOSEOUT_RESULT.md`, `CLOSEOUT_WORKER_PROMPT.md` (the handoff, byte-identical to
the shared copy).

Out-of-Git companion evidence is in `/private/tmp/nuave-spec012-closeout-evidence/`:

- `closeout.patch`: the complete documentation patch, including new files;
- `pinned-SPEC.md` and `pinned-SPEC_REVIEW_1.md`;
- `approved-canonical-delta.patch`;
- `check_links.py` and `link-check.json`;
- `non-md-blob-check.txt`.

The shared checkout (`2a21f85`, dirty) was not modified. The original B2 and
visual evidence, review roots and release roots were read only.

## 8. Recommendation and reviewer handoff

**Recommendation:** Pass with founder-approved exception. Every criterion
except AC-18 is supported by existing independent review, CI and visual
evidence on a runtime identical to deployed `d45a944`. AC-18 is covered by the
founder's explicit 2026-09-26 acceptance, with its evidence limit recorded, and
the workflow allows verification with a founder-approved exception
(`specs/README.md` lifecycle, step 5).

For the independent reviewer:

1. Review the uncommitted candidate at `/private/tmp/nuave-spec012-closeout`
   against `d45a944`, or apply `closeout.patch` to a fresh clone.
2. Confirm the matrix against the cited records.
3. Confirm the AC-18 wording is an exception and not a PASS.
4. Confirm the five canonical files equal `9c5d4c0` plus only the listed status
   edits, and that no dated history was erased.
5. Confirm links, the doc-only scope and the absence of protected content.

Return PASS, or concrete findings.

**Proposed status update for the orchestrator after a PASS** (do not apply
before):

> Spec 012 — **Verified** (YYYY-MM-DD, independent closeout review):
> **Pass with founder-approved exception.** AC-01–AC-17 and AC-19 pass on
> deployed `d45a944`. AC-18's original same-evidence before/after rubric was
> not performed and is deferred. The founder accepted the current report for
> now on 2026-09-26 and deferred format/reference simplification. Limits:
> headless PDF / CSS zoom / emulation / fictional evidence. Next product
> capability to be selected separately.

Apply that line to the status of `SPEC.md`, the result line of
`VERIFICATION.md`, and the Spec 012 entries in `specs/README.md`, `INDEX.md`
and `NOW.md`. Publication of this candidate and selection of the next
capability remain separate founder decisions.
