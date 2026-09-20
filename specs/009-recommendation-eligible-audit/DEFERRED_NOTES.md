# Spec 009 — issues to revisit later

Created 2026-09-18 at the founder's request. These notes are **outside the
approved 90-minute completion scope**. Recording an issue does not authorize
investigation or implementation, and does not create another completion gate.

If an unrelated issue is noticed during the focused work, append a short note
with what was observed, where, and why it may matter. Distinguish observation
from suspicion. Do not chase a reproduction or solution now. Keep credentials,
raw provider responses and business findings out of this public repository.

## Founder report preference: actual question and full answer

On 2026-09-19, after viewing the PDF, the founder requested clearer presentation
of the actual prompt asked and the actual AI answer. They explicitly want the
workflow ready for an end-to-end test first, then report-format iteration.
Keep this request deferred; it does not reopen the completed flow corrections.

Verified in source and the downloaded synthetic JSON: the evidence export
retains each exact question and full captured `raw_answer`, source URLs,
model identity and observation time. The report detail currently renders the
question and an answer excerpt. A later report should make the exact question
and full captured answer readily accessible, clearly separate from Nuave's
interpretation. Presentation can reuse the retained evidence without new
observations. Improving interpretation or recommendations is analysis work,
usually possible from the same evidence; missing evidence cannot be created
through formatting. This is a recorded preference, not a new report spec.

## September 19 disposition

The founder judged the current report not useful enough and explicitly deferred
report format/usefulness work while the continuous audit experience is finished.
Keep the report excerpt, classification and action-basis observations below for
that later work. Their existence does not block the flow-completion task.
Download failures, a mandatory-comparator schema rejection or false mode labels
may be addressed narrowly if they directly prevent or misrepresent the current
fresh-session journey; this does not release a general cleanup round.

## Retained question-generation cost display

Observed during the 2026-09-18 browser review: the retained questions screen
shows “Biaya: tidak tersedia”, although the private generation receipt records
settled billing of USD 0.000496. The numeric-string parser is already corrected;
the historical frozen pack still reflects the earlier missing parsed value.
This display issue does not block the four agreed completion items. Revisit
how to display retained receipt billing without rewriting frozen evidence.

## Route brief schema requires a non-empty competitor name

Worker observation during the approved extension: `businessBriefSchema`
requires `verified_competitor.name` to be non-empty, while
`retainedConfirmedBrief` can emit an empty string for an intake without a
comparator or category-alternatives selection. Such a future pack may be
rejected at the run/report boundary. The current accepted pack uses
category-alternatives wording, not a named competitor, and the tested flow
works. Revisit schema compatibility for optional comparator context later;
do not introduce a mandatory competitor into the approved direct-ten method.
Copied from the worker note; no additional investigation or fix was undertaken.

## PDF pagination polish

Observed in the returned nine-page synthetic PDF: “Langkah berikutnya” ends
page 2 before its body on page 3, and “Cara kerja audit” ends page 8 before
its body on page 9. Content is readable and the editor-exclusion requirement
passes. Keeping headings with their following content is deferred presentation
polish, not another gate for the current run.


## Live report evidence excerpts and interpretation

Observed in the authorized live run on 2026-09-18: deterministic excerpt repair
produced one-word affirmative snippets for multiple details, including two
headline findings. These do not show the evidence supporting the attached
interpretation. Some longer snippets end in Markdown heading fragments.
Private raw responses and report are retained in the live-run evidence folder.
No new provider call or code fix was made. Revisit evidence selection when the
founder reviews report usefulness.

The same report marks a candidate-list appearance as `not_assessed` for
recommendation and incomplete for information, while its summary makes a
stronger recommendation conclusion. Review the distinction before treating
those labels as a settled negative finding. Some proposed site changes are
based on answer omissions or an unverified brief, without a separate site
content-gap check; a numerical case-study target lacks an explicit basis.
These are interpretation concerns, not newly verified facts about the business.

## Local live-mode copy and embedded-browser exports

Observed after live completion: the report correctly discloses real provider
calls, but the surrounding demo/review shell still says answers are synthetic
and the audit has not run. This conflicting copy should be revisited later.

The in-app browser did not yield a JSON download event/file or a printable PDF
through the available controls. This is an export-verification limitation,
not yet a reproduced application defect in a standard browser. Preserved JSON
was produced with the existing exporter offline; the PDF review copy uses a
separate layout. Do not claim that either proves the live browser export.


## Worker note correction: localhost is not a listener bind

The continuous-flow return says its localhost base URL proves loopback-only
confinement. That is not established: a browser/readiness URL and the server's
listening interface are separate settings. The orchestrator review explicitly
used `next dev -p 3031 -H 127.0.0.1` and checked the listener. No broad port/test-
configuration refactor was done; a local preview command can bind explicitly
without changing a pinned test URL convention.

Correction-round update, 2026-09-19: the worker deliberately added
`--hostname 127.0.0.1` to the shared preview command and updated the matching
test URLs, cookie domain and Spec 008 port pin together. The manual review
server likewise binds explicitly. This confinement point is resolved; no
further configuration cleanup is requested.

## Completed-session question-review copy

Observed in normal Chrome during the 2026-09-19 correction review: Back from
the completed synthetic report correctly preserves the edited questions,
but the question-review notice still says “Audit belum dijalankan.” Returning
forward reopens the saved report without another run/report request. This is
stale status copy, not failed persistence. Revisit with the existing mode/copy
notes; do not reopen the accepted recovery correction for this wording.
