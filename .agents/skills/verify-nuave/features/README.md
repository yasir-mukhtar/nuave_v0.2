# Nuave audit journey verification map

This directory is the maintained source for verifying Nuave's user-facing audit
journey. Read this index before driving, then use the matching feature file as
the recipe. `V` below means `.agents/skills/verify-nuave/bin/verify-nuave`.

## Baseline preconditions

- `npm ci` has run in this checkout.
- `$V launch` started the server from this checkout. Nothing else is driven.
- `$V doctor` prints `doctor: OK`. Use `--allow-dirty` only when you are
  verifying uncommitted work, and say so in the report.
- Mode is synthetic. Every answer, question and report comes from a labelled
  synthetic substitute. Live mode is out of scope for this skill.
- Every drive starts from an empty browser session (a new context). The
  journey state lives in `sessionStorage` (`nuave.localIntake.v2`,
  `nuave.localIntakeAudit.v2`), so a new context is the baseline.
- The fictional business is `Kedai Fiksi` at `https://kedai-fiksi.example/`.

## Driving conventions

- Drive only through `$V drive <feature>`. Its steps come from
  `tests/e2e/journey.ts`, the shared driver the e2e specs also use.
- Use ARIA roles and accessible names, plus the stable `data-*` handles the app
  exposes: `data-intake-screen`, `data-smart-summary`, `data-question-slot`,
  `data-local-audit-stage`, `data-direct-ten-report`, `data-answer-body`,
  `data-report-answer`. Never use coordinates.
- UI text is Indonesian. Copy names exactly, including the em dash in
  `Sudah sesuai — buat pertanyaan audit`.
- A new step goes into `tests/e2e/journey.ts` first, then into the recipe in
  `src/features.ts`.

## Proof and skip reporting

- A drive's proof is its `result.json` plus a screenshot and an ARIA snapshot
  after every user action, and `network.json`.
- `result.json.checks` lists the end states the recipe asserted; a drive that
  throws is `failed`, never partially passed.
- Every artifact carries the feature ID (its folder) and the drive-time
  `HEAD` and dirty flag.
- The network log must show zero unexpected external requests.
- A fault-injected drive reports
  `fault-injected (not user-reachable in synthetic mode)`. Never report it as
  `passed`, and never count it as proof of a user path.
- An entry point that is not driven is reported as not driven. Do not report
  it as verified through another path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the
user-visible behavior. It then uses exactly four H2 sections in this order:

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with verify-nuave` starts with `Preconditions:` and pairs each
   user action with the exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a run.

## Features

- [Audit entry](./audit-entry.md) covers the landing call-to-action, the
  `/audit` entry step, and its validation.
- [Smart intake summary](./smart-intake-summary.md) covers the
  "Ini yang Nuave pahami." summary, its row edits, and focus, through question
  creation.
- [Question review](./question-review.md) covers "Periksa pertanyaan audit",
  question edits, and `Mulai audit`.
- [Audit run](./audit-run.md) covers the ten synthetic observations, the
  synthetic label, and no duplicate run on reload.
- [Report and recovery](./report-and-recovery.md) covers the report,
  `Download PDF`, the JSON download, and the fault-injected answers-only
  recovery.
