# Audit run

`Mulai audit` asks the ten questions and saves ten observations, then builds the
report. In synthetic mode, labelled substitutes answer through the same
`/api/audit/run` and `/api/audit/report` routes a live audit uses. The report
says so. Reloading a finished audit shows the saved result and does not run
again.

## Sub-features

- `run-ten`: ten observations `NUAVE-DT-01` … `NUAVE-DT-10` are saved in
  `nuave.localIntakeAudit.v2`.
- `run-answers`: ten `[data-answer-body]` show inside
  `[data-direct-ten-report]`.
- `run-synthetic-label`: the notice "Audit lokal — jawaban sintetis" shows on
  the report.
- `run-no-duplicate`: a reload makes no second `POST /api/audit/run` or
  `POST /api/audit/report`.

## How to get to it (user POV)

- Press `Mulai audit` on question review.
- Reload a finished audit. The saved report comes back.

## Driving it with verify-nuave

Preconditions:

- `$V doctor` prints `doctor: OK`.

Run `$V drive audit-run`. Steps, in order:

- **Review.** Goes from entry to the ten questions. Evidence:
  `01-question-review`.
- **Run.** Presses `Mulai audit`, then waits up to 45 s for
  `[data-local-audit-stage="done"]`. Evidence: `02-audit-done`.
- **Ten answers.** The report shows ten `[data-answer-body]`. The saved
  observations have `prompt_id`s `NUAVE-DT-01` … `NUAVE-DT-10`, in order.
- **Label.** The text "Audit lokal — jawaban sintetis" is visible.
- **Reload.** Reloads the page. The `done` stage shows again. Evidence:
  `03-after-reload`.
- **Proof.** `network.json.apiCalls` has `POST /api/audit/run: 1` and
  `POST /api/audit/report: 1`.

## Gotchas

- The run also makes one `GET /api/audit/extract` (the budget read) before
  `POST /api/audit/run`. That is expected.
- The label proves synthetic mode only because the report shows it when the
  run made zero provider calls. If it is missing, stop: the server may be live.
- Interrupted and partial runs (`Lanjutkan audit`) need request stubs. They
  are covered by `tests/e2e/new-intake-glm.spec.ts`, not by this drive.
