# Spec 012 — independent review 1

> Reviewed: `specs/012-evidence-first-report/SPEC.md` and the accompanying
> canonical-document amendments at `be8187a`
> Baseline checked: `main` at `4e6b2cf`
> Reviewer role: tech lead, acting as independent product-design, architecture,
> and evidence-integrity reviewer
> Date: 2026-09-22

## Verdict

**Ready after narrow fixes.** No founder decision is reopened and none is
needed. Once S1–S4 are applied, the spec can be marked **Approved** and PR A
can start.

The spec faithfully carries the eight settled decisions, the three required
document amendments (`VOICE.md` label, Spec 010 failure row, `AUDIT.md` /
journey 06 report order) are present and correctly scoped, and the file
allowlists match the plan. I verified against the baseline: the status enums
used by R-13, the observed-gap predicate, the direct-ten assessment classes
(every direct-ten prompt carries `recommendation`, so R-02's "denominator must
be ten" is safe), the session `report-failed` status and `reportFailure.code`
field R-15 relies on, the report route's existing `code` error envelope, the
recovery classification module, the two e2e label locators, and that every
file the spec names exists. The proposed pins are the current latest releases:
`react-markdown@10.1.0` (peer React `>=18`, ESM) and `remark-gfm@4.0.1`.

## Findings, ordered by severity

### S1 — Medium: the promotion rewrites operating documents that the Spec 011 branch also rewrites, and drops two live founder items

- **Where:** `docs/NOW.md`, `docs/DECISION_LOG.md`, `docs/INDEX.md`,
  `specs/README.md` in `be8187a`.
- **Evidence:** the Spec 011 intake working tree on
  `devin/sol-smart-consultant-intake-plan` also modifies all four files.
  Whichever branch merges second will conflict. Separately, the new `NOW.md`
  "Do now" list replaced the founder's two live-flow items (prepare one
  real-flow approval scope; run the ordinary intake through real preparation
  after authorization) with Spec 012 review items. None of the eight
  decisions superseded those live-flow items; only the report-work deferral
  was superseded.
- **Fix:** keep the Spec 012 block in `NOW.md` as a short pointer, restore the
  two live-flow items beside the Spec 012 items, and add one line saying
  Spec 011 owns intake state and Spec 012 owns report state. When merging,
  merge the intake branch first and rebase this branch once.
- **Blocks approval:** no, but fix before merge.

### S2 — Medium: R-15's recovery print CSS over-implements G4

- **Where:** R-15 last paragraph; AC-17 "browser print contains the
  unfinished notice only"; Failure table row "Recovery browser print invoked".
- **Evidence:** the founder's G4 answer was that the answers-only state has no
  PDF/JSON *buttons*. The spec adds print CSS that blanks the answers when the
  customer uses the browser's own print command, plus a test for it, and then
  concedes it "is not a security claim".
- **Likely failure:** a customer who can read and copy ten answers is
  deliberately prevented from printing the page in front of them. Extra CSS
  and a test for behavior nobody asked for.
- **Fix:** delete that paragraph, the AC-17 clause, and the failure-table
  row. G4 means no download controls and no export route, nothing more.
- **Blocks approval:** yes, small edit.

### S3 — Medium: "Tidak diuji" is used for a per-question `not_assessed` status

- **Where:** R-03 ("`Tidak diuji` for an unassessed dimension" at question
  level); R-13 template V `basis`: "Penilaian informasi pada pertanyaan {n}
  adalah Tidak diuji."
- **Evidence:** `VOICE.md` settles **Tidak diuji** as the aggregate label for
  an empty denominator (a dimension that was not part of the test). A
  per-question `information === "not_assessed"` means the dimension was in the
  test but this answer gave nothing to judge. The v3.1 plan §6.5 kept the
  distinction: "Tidak dinilai dari jawaban yang tersedia" at detail level.
- **Fix:** R-03 and template V use the plan's detail-level phrase. Reserve
  **Tidak diuji** for aggregate tiles and historical contracts.
- **Blocks approval:** yes, since template V copy is customer-facing.

### S4 — Medium (simplification): do not send template candidates into the synthesis prompt

- **Where:** R-13 paragraphs 1–2 ("The request presents candidates alongside
  their exact question/answer so the model can return an exact eligible
  object"); R-10 "Keep minimum one at initial synthesis"; B2 allowlist
  "report-only candidate plumbing/instructions in the four adapters".
- **Evidence:** the spec already says code reconstructs the candidate "when
  synthesis omitted a usable candidate" and rejects any model-returned object
  that differs by a character. So the model round-trip adds up to twenty
  objects to every synthesis prompt across four adapters and produces nothing
  code cannot produce alone. Meanwhile `reportSynthesisSchema` keeps
  `priorities.min(1)`, so a model with no observed gap is still forced to
  invent one, which repair then strips. That is exactly the pressure the plan
  said to remove.
- **Fix:** candidates never enter the prompt. For direct-ten, the synthesis
  pick allows zero priorities (the final report content keeps min one).
  Instructions tell the model to return no action when no gap is observed.
  After repair, code selects at most one eligible P or V as already specified.
  Remove the adapter "candidate plumbing" from the B2 allowlist; the adapters
  only need the instruction change.
- **Blocks approval:** no, but it removes a whole plumbing path and should be
  taken now rather than discovered in B2.

### S5 — Low: `report-labels.ts` still carries the old PDF label and is not in PR A's allowlist

- **Evidence:** `INDONESIAN_REPORT_LABELS.download_pdf` is
  `"Cetak / simpan PDF"` with a test asserting it. Nothing in `src/` consumes
  the key, but leaving it contradicts R-08 and the label test would enshrine
  the wrong string.
- **Fix:** add `src/lib/audit/report-labels.ts` and its test to the PR A
  allowlist (the v2 plan already listed them) and change the value.

### S6 — Low: unverified numeric claim in R-11

- R-11 states a 12–20 word target and a 25-word ceiling in
  `report-language.ts`. I could not confirm those numbers by inspection.
  Implementer confirms at B1 and corrects the spec text if different. No
  behavior depends on the exact numbers.

## Verified, not defects

- R-13 eligibility is reachable: for direct-ten, an answer with
  `appearance === "mentioned"` and `recommendation === "recommended"`, or
  `information === "not_assessed"`, is not an observed gap under the current
  predicate, so P and V can pass without weakening the gap rule.
- R-15 can reuse the existing `reportFailure.code` field (`string | null`,
  max 80) and `report-failed` status; a new code needs only to be added to
  `REPORT_FAILURE_CODES` and classified as retryable.
- The Spec 010 amendment changes only the "Observation/report failure" row
  and records the founder decision; r1–r4 are untouched.
- `VOICE.md` adds the recommendation label as a sixth settled label and keeps
  **Download PDF** as the shared default. `AUDIT.md`, `PRODUCT.md`, and
  journey 06 split direct-ten from historical rather than rewriting history.
- F4 is resolved deterministically (no per-question analysis block). F7 is
  carried as-is. Both acceptable.

## Approvals this review grants (tech-lead scope)

- **R-06 pins:** `react-markdown@10.1.0` and `remark-gfm@4.0.1` approved as
  exact pins. Build under Next 16 / OpenNext remains an implementation gate.
- **R-13 templates:** approved after S3 (label) and S4 (no prompt round-trip).

## What the founder needs to do

Nothing new to decide. After S1–S4 are applied, say "approve Spec 012" and the
status line flips to **Approved**. PR A can then start from current `main`.

## Re-check after revision 1 (`afacda5`)

All six findings are applied and verified against the baseline:

- **S1:** `NOW.md` restores both live-flow items as items 1–2, keeps the
  Spec 012 pointer short, states that Spec 011 owns intake state and Spec 012
  owns report state, and records the merge order (intake first, rebase once).
- **S2:** recovery print suppression, its AC-17 clause, and the failure-table
  row are removed. D-08 now reads "no Nuave print/PDF/JSON controls or export
  route; browser-native printing is unchanged".
- **S3:** R-03 and template V use `Tidak dinilai dari jawaban yang tersedia`
  at question level; `Tidak diuji` is reserved for aggregate labels.
- **S4:** templates never enter any model request. B2 allows an empty
  `priorities` list in direct-ten synthesis only; the final report-content
  minimum stays one; code selects at most one eligible P or V after repair.
  The adapter "candidate plumbing" is gone from the B2 allowlist.
- **S5:** `report-labels.ts` and its test are in the PR A allowlist with the
  `download_pdf` value change.
- **S6:** the constants Astra cites (`sentence_target_max_words: 20`,
  `sentence_hard_ceiling_words: 25`) are confirmed by
  `report-language-id.test.ts` at `4e6b2cf`; `report-language.ts` itself is
  stored in a form git reports as binary, which is why my first inspection
  could not read it.

**Verdict: ready for founder approval.** No further review round is needed
before PR A.
