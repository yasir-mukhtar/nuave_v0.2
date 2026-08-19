# Adversarial review prompt — Phase 2 (Spec 002: Indonesian audit and report contract)

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
  contact any business or person.
- If you need to run things, use `npm run test:audit`, `npx vitest run
  src/lib/fixture-journey`, `npm run check`, `npm run build`, and
  `npm run test:e2e` (spawns local dev servers).

## What Phase 2 promised

From `docs/END_TO_END_PLAN.md` §7 "Phase 2 — Indonesian audit and report
contract" (also read §4 touchpoints, §5 state model, §8 language quality):

> **Outcome:** the fixture journey and audit contracts can produce
> customer-facing Indonesian that is natural, bounded, and machine-checkable.
>
> **Exit gate:** all ten questions pass mechanical safety rules and
> native-language judgment; the report fixture passes the Indonesian writing
> contract; every customer-facing string in the journey is Indonesian except
> exact source, provider, model, or official business text; existing evidence,
> provenance, and cost tests still pass.

## Evidence to review

1. Spec: `specs/002-indonesian-audit-contract/SPEC.md` (45 requirements
   R-01…R-45, acceptance criteria AC-01…AC-30).
2. Verification record: `specs/002-indonesian-audit-contract/VERIFICATION.md`
   (claims Verified 2026-08-17; 276 audit unit + 126 fixture-journey unit +
   31 e2e tests).
3. Voice contract: `docs/VOICE.md` (canonical) and its draft history.
4. Implementation:
   - `src/lib/audit/questions-id.ts` (+ test) — Indonesian question
     generation boundary, deterministic fallback, validation, dynamic
     classification, pack persistence.
   - `src/lib/audit/report-language.ts`, `report-labels.ts` (+ tests) —
     `plain-id-v1` writing standard, settled label mapping.
   - `src/lib/audit/fixtures/fixture-kopi-taman-senja.ts` (+ test) — frozen
     NVA-FIKTIF-001 chain (facts / questions / 10-of-10 evidence).
   - `src/lib/fixture-journey/**`, `src/app/audit/fixture/**` — realigned
     journey 01 Order Preview → 02 simulated payment → 03 Business Facts →
     04 Questions → 05 Audit Run → 06 Report, session key
     `nuave.fixtureJourney.v3`, Indonesian copy.
   - `tests/e2e/**` — rewritten browser suite.
5. Plan context: `docs/END_TO_END_PLAN.md`, `docs/JOURNEY_CONTRACT.md`,
   `docs/AUDIT.md`, `docs/journey/04-questions.md`,
   `docs/journey/06-audit-report.md` (only as context for what the spec must satisfy).

## Known tensions to scrutinize (not a closed list)

- **Question-generation boundary (AC-23/AC-24).** The provider is stubbed;
  no live call exists. Attack the stub: can the deterministic fallback
  hard-fail on malformed provider output? Can identity leak into a
  "Tanpa menyebut bisnis Anda" question? Are blockers narrow or do they
  over-block legitimate content? Is pack persistence (exact ten strings,
  order, edits, classification, provenance, approval timestamp) really
  replayable, and does replay preserve everything a re-check needs?
- **Report-language calibration (AC-25).** `plain-id-v1` limits (12–20 word
  target, 25 ceiling) apply to Nuave-authored fields only, with exact-excerpt
  exemption. Are the limits enforced in code, or only asserted in tests that
  could pass vacuously? Are field-level totals really unset (null), and does
  the fixture report itself comply with the limits? Check `report-language-id.test.ts`
  for what is actually measured.
- **Label mapping (AC-26).** `report-labels.ts` maps code-derived dimensions.
  Does `Tidak diuji` render for empty denominators without being confused
  with zero performance? Do counts match the fixture's code-derived
  dimensions (8/10 headline; 3/5 Tanpa; 5/5 Menyebut; rec 2/6; comp 1/2;
  info 1/2/1 of 4)?
- **Frozen fixture chain.** Is `fixture-kopi-taman-senja.ts` really frozen,
  or does it drift from the record in `docs/drafts/00-journey-fixtures.md`?
  Is `report-golden.ts` (the Phase-1 record) truly untouched, and does
  anything now depend on it that the realignment broke?
- **Session v3 state validation (AC-03, AC-14/15/16).** Can a crafted
  session bypass a gate in the realigned 01→06 order? Does "Start over"
  truly clear only `nuave.fixtureJourney.v3` and leave live workflow keys
  intact? Are stale v1/v2 shapes reset with a visible explanation?
- **Indonesian quality.** You do not need to be a native speaker to catch:
  English strings leaking into customer-visible fixture screens; mixed
  language in the report; awkward translations of settled labels; any
  customer-facing string that is not Indonesian. Grep the fixture journey
  JSX and report builder for ASCII-only strings. Note that native-language
  judgment (AC-30) is a founder human gate — your job is to find anything
  machine-checkable that contradicts "natural, bounded, machine-checkable".
- **Engine regression (AC-27).** 276 = 208 baseline + 68 new. Confirm the
  live audit engine path (`src/lib/audit/openai.ts`, `gemini.ts`, `groq.ts`,
  `stream.ts`, `telemetry.ts`, `contracts.ts`) was not semantically changed
  by Spec 002 — or explain why that is not a regression. Watch for additive
  `types.ts` widening that weakens existing contracts.
- **Exact excerpts.** Evidence excerpts must remain exact and never be
  translated. Can any code path translate, paraphrase, or reformat an
  excerpt between retention and display/export?
- **Known gaps recorded by the verifier** — check whether they are honest
  and whether any is actually a defect: priority actions capped at 3 in the
  schema (settled contract allows 1–5); the `not_assessed` →
  `not_recommended` adapter projection at the retained-evidence validator
  boundary; `.claude/worktrees/` duplicate test files inflating vitest
  counts (the "208 baseline" itself includes a 93-test worktree copy);
  Next.js 16 `middleware → proxy` deprecation warning.

## Your report

Produce a markdown report with:

1. **Verdict** on each AC-01…AC-30: `MET` / `NOT MET` / `UNVERIFIABLE` with
   evidence (file:line or test name) — or `N/A` where the criterion was a
   human gate you cannot re-run.
2. **Findings**, each with: severity (Critical / Major / Minor / Nit),
   description, evidence, why it matters, and a concrete reproduction or
   counter-example where possible.
3. **Test-suite audit**: which unit/e2e assertions are weak or vacuous.
4. **Summary**: is this phase a sound basis for connecting the live engine
   (Phase 3)? One paragraph, no hedging.

Be specific. A finding without a file path or a command is not a finding.

---

## After you finish

Paste the full report back. If the report is longer than your output limit,
write it to a file and report the path.
