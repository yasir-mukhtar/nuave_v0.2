# Adversarial review prompt — Phase 3 (Spec 003: Live engine connection and report-quality gate)

> Copy the entire file into an AI agent that has read-only access to the Nuave
> v0.2 repository. Everything between the `---` fences is the prompt.

---

You are an **adversarial reviewer**. Your job is to break the work under review,
not to confirm it. Assume the implementation and its verification record are
wrong until you prove otherwise. Every claim you make must be backed by
evidence you actually inspected: a file path + line, a command you ran, or a
test you executed. Do not fabricate findings, and do not rubber-stamp a "Pass".

## Repository

- Repo root: `/Users/hy4-mac-006/nuave_v0.2` (branch `main`; working tree may
  contain 1–2 uncommitted files — `package-lock.json`, `src/lib/audit/report-gaps.test.ts` — ignore those).
- Constraints: **read-only**. Do not commit, push, edit, or publish anything.
  Do not read `.secrets/`, `.env*`, `node_modules/`, or `archive/`. Do not
  contact any business or person. Do not spend money: **make no paid model
  calls** — you may inspect the evaluation and run records, and you may run
  offline tests, but you must not execute the live audit path against a real
  provider.
- If you need to run things, use `npm run test:audit`, `npx vitest run
  src/lib/fixture-journey`, `npm run check`, `npm run build`, and
  `npm run test:e2e` (spawns local dev servers). The provider-evaluation
  runner (`npx vitest run scripts/eval`) makes real provider calls — **do not
  run it**; treat its existing `.results/` as read-only evidence.

## What Phase 3 promised

From `docs/END_TO_END_PLAN.md` §7 "Phase 3 — Live engine connection and
report-quality gate" (also read §4 touchpoints 6–7, §5 state model, §9
verification, §10 failure/recovery, §11 risks, §13 founder decisions):

> **Outcome:** one real Indonesian business travels through the same interface
> and produces one complete real report without manual rescue.
>
> **Exit gate: report worth paying for** — the report must: contain 10/10
> evaluable observations; reveal one to five material, specific findings
> (one or two strong findings sufficient); make every important claim
> traceable to an observation or public source; be understandable by a
> non-technical Indonesian decision-maker in about ten minutes; distinguish
> observation, interpretation, and action; offer one to five feasible,
> evidence-linked actions; retain failures and limitations visibly; and
> render the same facts in the PDF whenever that derived artifact is
> available. If the gate fails, stop and improve the method — do not proceed
> to persistence, payment, or polish merely because the software ran.

## Evidence to review

1. Spec: `specs/003-live-report-quality-gate/SPEC.md` (requirements
   R-01…R-3x, acceptance criteria AC-01…AC-26). Note: the spec's own
   Verification record section says **Pending** — the phase's quality-gate
   verdict is NOT yet recorded. Your review fills part of that gap.
2. Evaluation record: `specs/003-live-report-quality-gate/evaluation-results.md`
   — five-business provider evaluation (GPT-5.6 Luna vs Gemini 3.5
   Flash-Lite, practical quality gate).
3. Implementation (read-only):
   - `src/lib/audit/provider.ts`, `openai.ts`, `gemini.ts`, `groq.ts`,
     `stream.ts`, `retry.ts`, `run-orchestrator.ts`, `report-pipeline.ts`,
     `telemetry.ts`, `contracts.ts`, `types.ts`;
   - `src/lib/audit/questions-id-provider.ts`, `questions-id-live.ts`,
     `questions-id.ts`, `report-language.ts`, `report-labels.ts`;
   - `src/lib/audit/fixtures/fixture-kopi-taman-senja.ts`;
   - `src/app/audit/**` (`AuditWorkflow.tsx`, `ReportView.tsx`,
     `AuditStages.tsx`, `fixture/**`), `src/app/api/audit/**/route.ts`,
     `src/middleware.ts`, `.env.example`;
   - `scripts/sozo/sozo-live-run.spec.ts`, `scripts/sozo/report-rerun.ts`,
     `scripts/eval/provider-evaluation.spec.ts`;
   - `test-results/report.md` and `test-results/report-pipeline.md` — the
     Sozo Dental Depok live-run artifacts.
4. Plan context: `docs/END_TO_END_PLAN.md`, `docs/JOURNEY_CONTRACT.md`,
   `docs/AUDIT.md`, `docs/DECISION_LOG.md` (2026-08-17 rows: durable
   one-provider run with 1+2 retry policy; one to five actions; canonical
   journey order; direct appearance count; 10/10 evaluable with
   substantive-refusal rules), `User Flow/03 - Business Facts.md`,
   `User Flow/04 - Questions.md`, `User Flow/05 - Audit Run.md`,
   `User Flow/06 - Audit Report.md`.

## Known tensions to scrutinize (not a closed list)

- **Quality-gate verdict is missing.** The phase requires the verdict
  against all eight exit-gate criteria to be recorded with concrete
  evidence. It is not recorded yet. Independently apply the exit gate to
  `test-results/report.md` + `test-results/report-pipeline.md` + the
  retained evidence: does the Sozo Dental report actually satisfy 10/10
  evaluable, 1–5 material findings, traceable claims, ~10-minute readability,
  observation/interpretation/action separation, 1–5 evidence-linked actions,
  visible failures/limitations, and PDF fidelity? Where the artifacts are
  insufficient to prove a criterion, say so.
- **Provider lock (AC-08/AC-09).** The lock to GPT-5.6 Luna for 03 and 04 is
  recommended and founder-approved, but Gemini never ran (credits depleted;
  INCONCLUSIVE). Is locking with only one candidate measured acceptable, and
  is the comparison design fair (same minimized inputs, same versioned
  guidance, no web search in the question-writer test, fallback scored
  alongside)? Is the "practical quality gate cleared" claim fully supported
  by the rubric in `User Flow/04`?
- **Live-path wiring vs the spec's own gaps.** The evaluation record itself
  lists: 03 extraction instruction still English (`openai.ts`/`gemini.ts`);
  `gemini.ts` retries hard quota errors 4× with backoff; the wired
  question-writer had two real bugs fixed mid-run (developer-content shape;
  JSON-in-text parse). Check whether those fixes are complete and tested,
  whether the English 03 instruction violates the Indonesian contract
  (AC-10: answers returned in Indonesian under the recorded instruction
  version), and whether remaining English in the live UI contradicts the
  journey states promised.
- **Retry contract (AC-11, AC-13).** 1 initial + up to 2 automatic technical
  retries per question, same locked config, completed questions unchanged,
  every attempt persisted, valid result never rerun; report generation
  starts exactly once from frozen evidence; a report retry or language retry
  never reruns an observation. Trace this in `retry.ts`,
  `run-orchestrator.ts`, `report-pipeline.ts` and the Sozo run record.
- **Fail-closed behavior (AC-01, AC-09).** No client input can enable or
  disable live/fixture mode; missing production credential fails closed
  before any provider call; `/api/audit/*` 401 before any handler when the
  access cookie is wrong. Verify in `src/middleware.ts` and the route
  handlers, and check the middleware env-inlining note (build-time inlining
  means a leaked code value or missing build env changes behavior).
- **No partial report (AC-05).** Fewer than ten evaluable observations after
  targeted recovery → no report generated or exported, evidence and attempts
  retained, no partial-report state. Trace the 10/10 gate.
- **Contamination (AC-10).** Discovery requests (Tanpa menyebut bisnis Anda)
  must contain no audited business name, brief, URL, or competitor hint.
  Inspect the actual request builders. Also verify the variance re-asks
  (AC-15) are recorded as measurement only and never blend into counts or
  test-by-test rows.
- **Telemetry completeness (AC-14).** Every attempt must retain question text
  and order, classification, timestamps, surface, requested and returned
  model, instruction version, language, location, search configuration,
  sources, response ID, usage, latency, cost, completion status, failure
  category, attempt origin — and the method record must match the run that
  actually occurred. Does the Sozo run record contain all of it?
- **Cost ceilings (AC-23).** USD 5 ceiling and USD 0.4357 carryover enforced
  server-side; retry-aware observation allowance; client cannot lower the
  carryover or raise the limit; every paid call (evaluation, observations,
  report, variance re-asks) accounted with real usage. Check
  `telemetry.ts`, the budget guard, and the recorded spend in
  `evaluation-results.md` and `NOW.md`. Note the evaluation record's own
  claim: "accounted USD 0.00 by repo convention" while 10 real Luna calls
  happened — is that an honest accounting convention, and does it conflict
  with AC-23's "every paid call is accounted with real usage"?
- **Report truthfulness (AC-16…AC-22).** Headline + components with own
  denominators; `Tidak diuji` for empty denominators; findings/actions 1–5
  with evidence refs, owner, completion check, no invented deficiency; exact
  excerpts verbatim, never translated, citation URL alone never counts as
  visible appearance; method section built from recorded run facts; all
  Nuave-authored fields pass `plain-id-v1`; print/PDF uses the same payload.
  Compare `test-results/report.md` against the raw retained answers in the
  run record: are the 8/10, 3/5, 5/5, and component counts derivable from
  the observations? Any place where the report overclaims (e.g., "always
  recognised" from 5/5 in one sample)?
- **Evaluation fairness (AC-06/AC-07).** Five real public businesses in the
  launch category/city, public info only, no contact, nothing published.
  Was the evaluation set appropriate? Was the runner hardened in ways that
  changed candidate outcomes mid-run (per-clinic budget added because a
  shared budget would have blocked clinics 2–5; OpenAI path added)? Could
  any change have biased the comparison in Luna's favor?
- **Browser-bound truthfulness (AC-04).** The live run requires the browser
  to stay open; reload resumes from saved observations without rerunning
  completed questions and without claiming background continuation. Is this
  UI copy present and truthful in the live path?

## Your report

Produce a markdown report with:

1. **Verdict** on each AC-01…AC-26: `MET` / `NOT MET` / `UNVERIFIABLE` with
   evidence (file:line or test name) — or `N/A` where the criterion is a
   founder human gate you cannot re-run.
2. **Independent exit-gate assessment**: apply all eight Phase 3 exit-gate
   criteria to the Sozo Dental report and retained evidence, with a
   per-criterion verdict and the concrete evidence for each.
3. **Findings**, each with: severity (Critical / Major / Minor / Nit),
   description, evidence, why it matters, and a concrete reproduction or
   counter-example where possible.
4. **Test-suite audit**: which unit/e2e assertions are weak or vacuous.
5. **Summary**: should the phase proceed toward the recorded quality-gate
   verdict, or must the method be improved first? One paragraph, no hedging.

Be specific. A finding without a file path or a command is not a finding.

---

## After you finish

Paste the full report back. If the report is longer than your output limit,
write it to a file and report the path.
