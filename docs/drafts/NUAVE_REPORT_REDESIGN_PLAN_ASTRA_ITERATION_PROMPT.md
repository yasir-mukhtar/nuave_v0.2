# Prompt for Astra — iterate the report redesign plan to v2

> Role: you are Astra, author of
> `docs/drafts/NUAVE_REPORT_REDESIGN_IMPLEMENTATION_PLAN_ASTRA.md` on branch
> `docs/astra-report-redesign-plan`.
> Task: revise that plan in place into **v2**. This is a documentation task.
> Do not implement, do not touch runtime code, do not run providers.

## 1. Decision

Two independent plans were reviewed against `main` at `4e6b2cf`:

- yours (`NUAVE_REPORT_REDESIGN_IMPLEMENTATION_PLAN_ASTRA.md`), and
- Sol's (`docs/drafts/NUAVE_REPORT_REDESIGN_IMPLEMENTATION_PLAN_SOL.md` on
  branch `plan/sol-report-redesign`).

Your plan was chosen as the base. It found two defects Sol missed (the
observed-gap validator would strip the maintenance action Sol proposes; the
report's synthesis time is labelled as the audit date), it defers the
other-business extraction that collides with Spec 011's comparator work, and it
splits delivery into a presentation PR and a content PR.

Read Sol's plan in full before editing. Several of its sections are tighter
than yours and should be absorbed (section 4 below).

## 2. Founder decisions — apply these, do not reopen them

| # | Decision | What changes in the plan |
|---|---|---|
| 1 | **All ten answers are open by default.** | Rewrite §6.1, §6.2, D1, AC01–AC02. The exact question, result labels, and the complete answer are visible without any click. Drop "Baca jawaban lengkap" as the primary path. Keep a secondary `Tutup semua jawaban` / `Buka semua jawaban` control if the disclosure primitive stays accessible. Remove the display-only preview selector (§6.4) from the first release; it exists only to justify collapsed rows. Keep the rule that findings link to questions rather than quoting an arbitrary excerpt. |
| 2 | **Render answers as Markdown.** | Keep §6.3 as written: `react-markdown` + `remark-gfm`, raw HTML disabled, text-oriented elements only, no answer-authored images/embeds/remote assets, only retained HTTP(S) source URLs become live links, `Teks asli` view and exact copy preserved. Add to block 0: explicit founder approval of the two new dependencies and their pinned versions. Add a fixture with headings, nested lists, a table, a long URL, and an HTML/image payload; assert nothing executes and print reflows. |
| 3 | **Findings and actions: minimum one, maximum ten, never padded.** | Replace every "one to five" with "one to ten". State plainly: if the evidence supports three, show three. Update §6.7, AC06, the summary of block 3, and the usefulness rubric question 6 ("would this survive with no minimum?"). The validator's one-action minimum and the code-owned non-corrective path stay as designed. Keep the existing Indonesian writing limits. |
| 4 | **Sequencing (tech-lead call).** PR A (blocks 1, 2, 4) starts **now** from the current `main`. PR B (block 3) waits for Spec 011 to merge. | Rewrite §7.4 and §8 accordingly. Evidence for the split: the Spec 011 working branch changes the `ReportView` `brief` prop from `BusinessBrief` to `AuditSubject` and rewrites parts of `contracts.ts`, `report-pipeline.ts`, `report-priority.ts`, `types.ts`, and `customer-evidence-export.ts`. Its `ReportView` edits are confined to the header/identity block. Therefore PR A must: put all new logic in new files (`report-presentation.ts`, answer/evidence components), keep `ReportView` edits out of the header/brief region, not touch `contracts.ts`, `report-pipeline.ts`, `report-priority.ts`, or `types.ts`, and rebase once after Spec 011 merges. PR B starts only from a `main` commit containing the verified Spec 011 result. |

## 3. Correction to your own plan

- **E08 is wrong.** `indonesianCountLabel()` in `src/lib/audit/report-labels.ts`
  returns `Tidak diuji` for any denominator ≤ 0. It never renders `0/0`. Fix
  E08, remove the `0/0` clause from AC05 and from the §6.5 table, and keep the
  real problem: the direct-ten summary renders four equal-weight tiles where
  overall and unnamed duplicate each other and named recognition is not part
  of the test.

## 4. Absorb these from Sol's plan

Take the idea, rewrite it in your own structure. Cite Sol where you adopt it.

1. **Three named layers with stable visible labels** — `Jawaban model AI`,
   `Analisis Nuave`, `Yang dapat dilakukan` (Sol §8.1, AC-11). Use these as
   the report's fixed vocabulary on screen and in print.
2. **Summary = two counts plus quiet run context** (Sol §8.2 A): "disebut di
   X dari 10", "direkomendasikan di Y dari 10", and "10 dari 10 pertanyaan
   berhasil diuji" at low prominence. No zero-filled or untested tiles.
3. **Branch presentation on `report.provenance.question_method`** (Sol §9.2).
   `direct-ten` gets the new layout; absent/historical keeps the current
   renderer. Never infer the method from prompt IDs or counts.
4. **Presentation adapter fails loudly** (Sol §9.1, Phase 1 gate): unit tests
   for missing, duplicate, and reordered observation/detail bindings, and a
   gate of "no React or CSS change until every displayed value has one
   authoritative source".
5. **Actions appear once.** Remove the action snippet repeated inside each
   finding (Sol §8.2 C–D, AC-12).
6. **Stop conditions** (Sol §15). Add an equivalent section: when the
   implementer must stop and return to the founder rather than improvise.
7. **Test matrix as a two-column table** (Sol §13). Merge it with your §10
   fixture table so each fixture has one required assertion.
8. **Print rules** (Sol §8.3, AC-19): headings never orphaned; short answer
   blocks kept together *when practical*; long answers may break (your rule
   wins where they conflict).
9. **Personal-data risk row** (Sol §14, last row): if a raw answer contains
   unnecessary personal data, stop and treat it as a data-handling defect;
   never silently rewrite evidence.
10. **Neutral label for other businesses** — `Bisnis lain yang disebut`
    (Sol §8.2 C, AC-16) — for the narrowly-scoped comparator summary you
    already keep. Do **not** adopt Sol §9.3 (synthesis-schema extension for
    other-business extraction); it stays deferred for the reason in your §6.6.
11. **Review brief with a three-way verdict** (Sol §16): keep your §13 but
    end with `ready for specification / ready after narrow fixes / requires
    redesign` and ask the reviewer to name blocking product decisions.

## 5. Output format

- Edit `docs/drafts/NUAVE_REPORT_REDESIGN_IMPLEMENTATION_PLAN_ASTRA.md` in
  place on your branch. Bump the header to `Status: Draft v2 for independent
  review`.
- Add a short **Changelog v1 → v2** section directly under the header: what
  changed, what was taken from Sol, what was rejected and why (one line each).
- Keep the plan a plan. No code, no fixtures, no dependency installs, no
  `docs/NOW.md` or `DECISION_LOG.md` edits.
- Re-verify every code reference against `main` at `4e6b2cf` before citing it.
  If a claim cannot be verified, mark it as a hypothesis.
- Finish with the smallest next action: independent review of v2, then
  promotion to one numbered spec.
