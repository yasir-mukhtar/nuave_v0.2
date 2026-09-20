# Complete local intake journey

The public `/audit` entry (Spec 010 R-08) runs this journey: the blank start
opens on the empty business name + source step, and `?fixture=` seeds exist
only for the synthetic-mode test harness. `/audit/new-intake` redirects here.
The server gate (`NUAVE_NEW_AUDIT_ENABLED` + `NUAVE_AUDIT_MODE`) decides
whether real provider boundaries or their labeled substitutes answer.

`IntakeJourney.tsx` owns committed answers, the current working answer, stable
Back history, Review edit transactions, preparation, questions, and local start.
Screens stage functional updates; Lanjut validates and commits. Scope and target
choices resolve the route. Review edits keep a rollback snapshot until every
affected answer is reconfirmed, then return to Review.

`preparation.ts` derives deterministic candidates for the exact selected target.
Unknown targets use manual controls. The fixture examples are not real business
evidence. Corrections must pass the existing public-source parser; local preparation
never fetches that source.

`local-questions.ts` freezes precisely the active Review meaning, then uses the
existing ten-slot measurement matrix and Indonesian question validators. The
versioned input retains optional reasons, all service channels, all comparator names,
exact target, reach/areas, and public fact. It does not invent required fields to
fit an older BusinessBrief. `questions-screen.tsx` edits a controlled pack; saved
wording persists. Material intake changes invalidate that pack.

`local-session.ts` parses `nuave.localIntake.v1` in sessionStorage. Only this shell
writes it. Refresh restores the last committed state, discards an unfinished Review
edit/correction, and keeps validated saved question edits. Corrupt/incompatible
records restart safely. It never reads or writes a live workflow key.
Storage is same-tab and non-durable; no cross-device or paid resume is claimed.

The local start handoff contains the exact input and approved ten questions,
marks `auditExecuted: false`, and can be downloaded as JSON. Production routing,
entitlement, providers, execution, reporting, and deployment remain unchanged.

Default entry supports all three scopes without URL changes. Optional recovery
examples use a fresh tab/session: `?fixture=F2` for empty target suggestions,
`?fixture=F4` for a wrong identity, `?fixture=F6` for an unavailable identity
(retry remains unsuccessful until the user corrects the name/source), and
`?failure=questions` for one question-preparation failure. Each failure offers
retry/correction/cancel as applicable. The normal walkthrough has no screen tabs.

Shared controls use shadcn/Base UI and Tabler. The approved workbench governs
composition, with canonical Geist typography from docs/DESIGN.md.
