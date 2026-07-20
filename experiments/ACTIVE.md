# Active experiment — EXP-R1 raw report

> Status: complete — PASS_CANDIDATE
> Time box: one working day
> Owner: founder or assigned operator

## Question

Can Nuave produce one specific, evidence-backed dental-clinic report that is
useful enough to show a real clinic owner?

## Hypothesis

Five realistic questions across up to two AI systems, combined with public web
research, will produce at least three specific observations or actions that are
more useful than an unstructured chatbot conversation.

## Scope

- One real, clearly identified Jabodetabek dental-clinic branch.
- Five questions from [`../docs/AUDIT.md`](../docs/AUDIT.md).
- Up to two AI systems available to the operator.
- One run per question and system.
- One short internal report.
- No customer contact, publication, paid order, or broad market claim.

The detailed ten-clinic experiment under `EXP-001/` is preserved but deferred.
EXP-R1 is a faster product-learning test and must not be reported as a result of
that frozen protocol.

## Five actions

1. Choose and verify one clinic before observing its AI visibility.
2. Run the five questions and save all answers, dates, systems, and source links.
3. Check the clinic and relevant competitors against public sources.
4. Produce the short report defined in `docs/AUDIT.md`.
5. Review every claim and record the result below.

## Pass signal

Pass as a candidate for owner testing when:

- at least three findings or actions are specific to the selected clinic;
- every finding traces to retained evidence;
- no finding depends on guessed identity, causation, or clinical quality;
- the report can be explained in ten minutes; and
- the founder would be comfortable showing it privately as an honest sample.

Otherwise record `REVISE`, `INCONCLUSIVE`, or `STOP`. A pass does not validate
willingness to pay or customer usefulness; it only unlocks a small owner test.

## Stop conditions

Stop the run if clinic identity is ambiguous, patient information appears, a
system cannot be used within its permitted access, or useful-looking results
would require hiding contradictions or inventing certainty.

## Result

| Field | Value |
|---|---|
| Clinic and exact branch | Sozo Dental Depok, Jl. Margonda No.267 |
| Run date | 2026-07-20 |
| Systems used | OpenAI Codex web search; Gemini Developer API Free (`gemini-3.5-flash`) |
| Successful observations | 10 of 10 across two observed surfaces |
| Specific evidence-backed findings | 4 primary findings, including a conflicting Gemini branch address |
| Report location | [`runs/2026-07-20-sozo-dental-depok/REPORT.md`](./runs/2026-07-20-sozo-dental-depok/REPORT.md) |
| Review outcome | `PASS_CANDIDATE` for founder and private owner review |
| What to change next | Add ChatGPT Free answers manually, then test report comprehension with 3–5 relevant people |

Do not add more tracking fields before running the experiment. Add only what a
real execution proves necessary.
