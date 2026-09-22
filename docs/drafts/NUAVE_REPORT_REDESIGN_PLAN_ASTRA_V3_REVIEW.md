# Adversarial review — Astra report redesign plan v3

> Reviewed: `docs/drafts/NUAVE_REPORT_REDESIGN_IMPLEMENTATION_PLAN_ASTRA.md` at `e5fba1e`
> Baseline checked: `main` at `4e6b2cf`
> Reviewer role: tech lead, acting as independent product-design, architecture, and evidence-integrity reviewer
> Date: 2026-09-22
> Previous round: `NUAVE_REPORT_REDESIGN_PLAN_ASTRA_V2_REVIEW.md` (F1–F8, three founder answers)

## Verdict

**Ready for specification after one narrow fix.**

All five required v2 findings (F1, F2, F3, F5, F6) and all three founder
answers are applied correctly. F8 is applied. F4 and F7 are deferred to the
numbered spec with an honest interim rule, which is acceptable. I rechecked
the new claims against the baseline: the settled labels match `VOICE.md`, the
`ReportToolbar` `pdfLabel` prop exists, the e2e test does locate the PDF
button by its exact label (v3 is right and my v2 note that e2e does not
touch report internals was wrong on that one point), Base UI's accordion
panel supports `keepMounted`, and Spec 010's failure row reads as v3 quotes
it.

One new defect was introduced by the narrowing of the recovery exception.
Two smaller items are tech-lead simplifications, not founder decisions.

## Findings, ordered by severity

### G1 — High: the recovery exception is narrower than the founder's answer and inverts outcomes

- **Plan section:** 6.7, paragraph "The final useful-report gate still
  requires at least one supported finding and action"; fixture "Only one
  required section survives"; AC06.
- **What v3 says:** the answers-only state applies only when *both* findings
  and actions are empty after repair. If exactly one section survives, "do
  not deliver that incomplete report or expose its surviving analysis; retain
  the existing report-failure/retry state."
- **Evidence:** today `report-pipeline.ts` delivers a report when all
  priorities are removed (`minimum_report_fallback_used`), and
  `report-delivery-resilience.test.ts` asserts that delivery. So the
  "findings survive, actions empty" case currently *delivers*.
- **Likely failure:** after B2, a customer whose synthesis kept useful
  findings but lost every action gets **nothing** (failure screen), while a
  customer whose synthesis lost everything gets the ten answers. The better
  result produces the worse outcome, and it is strictly worse than today's
  behavior. That is not what the founder approved; the answer was "yes, show
  the raw AI answers" when the analysis is not usable.
- **Smallest fix:** the answers-only state applies whenever the final
  useful-report gate fails with ten usable observations, regardless of which
  section is empty. The rule "no surviving analysis is exposed" stays: in
  that state the reader shows questions, answers, sources, provenance, and
  the unfinished-analysis notice only. Update §6.7, AC06, the fixture row,
  and the Spec 010 amendment text in block 0 accordingly.
- **Blocks specification:** yes, but it is a two-paragraph edit.

### G2 — Medium (tech-lead call): drop the optional collapse controls from PR A

- **Plan sections:** 6.1, 6.2, 6.8, AC02, AC08, AC10, block 4.
- **Observation:** the plan carries "if retained" hedges in six places for
  `Tutup semua jawaban` / `Buka semua jawaban`, plus a `keepMounted` and
  print-CSS obligation, plus a fallback rule to remove them if the primitive
  cannot comply. The founder decided answers are open by default. Nobody has
  asked for collapse.
- **Decision:** PR A ships answers always visible, no collapse controls.
  Remove the hedges and the related AC08/AC10 clauses. A later request for
  collapse is a small follow-up, not a spec question.
- **Blocks specification:** no.

### G3 — Low: the `Download PDF` label must apply to every report, not only direct-ten

- **Plan sections:** 6.8 (Founder answer 1 paragraph), §7.4 `ReportView.tsx`
  row, block 2.
- **Observation:** v3 passes `pdfLabel="Download PDF"` only at the direct-ten
  call site, leaving historical reports on `Cetak / simpan PDF`. `VOICE.md`
  settles the label for all customer-facing surfaces, and
  `src/components/product/ReportToolbar.tsx` is not a protected file.
- **Smallest fix:** change the prop default in `ReportToolbar.tsx` to
  `Download PDF` and update the single e2e locator. One label everywhere.
- **Blocks specification:** no.

### G4 — Low: the answers-only state has no save path

- **Plan section:** 6.7, 6.8 ("must not use these report-delivery controls").
- **Observation:** in the approved recovery state the customer can read ten
  answers and copy them one by one, but cannot print or download them. That
  is defensible, since the retry control is the intended path, but it is a
  product choice the founder has not been asked about.
- **Action:** record it in block 0 as an explicit note. No plan change
  required unless the founder wants print enabled in that state.

## Verified and not defects

- F1: labels in §6.1, §6.5, AC05 and block 0 match `VOICE.md` exactly; the
  recommendation label is correctly marked as a `VOICE.md` amendment.
- F2: Spec 010 amendment is explicit, scoped to the failure-table row, and
  placed in block 0 before B2.
- F3: single tree, screen order, print CSS only; the `detailsPrint` copy is
  removed for direct-ten and the historical renderer is left alone.
- F5: every answer-body URL inert, no prose-to-source matching; the sources
  list is the only clickable surface.
- F6: B1 and B2 have separate bases, files, and gates; B1 does not depend on
  B2.
- F8: the adapter regression pins numerator 1 / denominator 10 from
  `report.measures.recommendation`, and B1 corrects the misleading type
  comment without changing arithmetic.
- Seven founder decisions are enumerated and marked not to be reopened.

## Requested changes before specification

Apply G1 in a v3.1 (or directly in the numbered spec, citing this review).
Apply G2 and G3 in the same pass; they are tech-lead decisions and need no
founder input. Record G4 in block 0.
