# Sol — Nuave Evidence-First Report Redesign Implementation Plan

> Status: **Draft for independent review**
> Date: 2026-09-22
> Decision level: report information architecture, report synthesis, screen and print presentation
> Intended implementation base: the then-current `origin/main` **after Spec 011 is verified and merged**
> Current investigation base: `origin/main` at `4e6b2cf`

## 1. Executive verdict

The current report contains enough underlying evidence to answer the owner's
main question, but its presentation does not expose that evidence well.

Every observation already retains the exact question, complete `raw_answer`,
sources, model, and observation time. The customer-facing report instead leads
with several abstract counts, Nuave-authored conclusions, and short excerpts.
The exact question and excerpt sit behind a closed disclosure, while the full
answer is available only in the JSON evidence export. This makes the report ask
the owner to trust Nuave's interpretation before they can inspect what the
model actually said.

The active direct-ten method makes the mismatch more obvious. All ten questions
are natural unnamed customer-choice questions, yet the current summary still
renders the older named-versus-unnamed structure. For a direct-ten report, the
overall appearance measure and unnamed measure duplicate one another, named
recognition becomes `Tidak diuji`, and completion becomes a fourth large
metric. The most important evidence remains lower on the page and incomplete.

The redesign should therefore use this reading order:

1. **What happened:** two direct counts and one plain-language takeaway.
2. **What the model actually said:** all ten exact questions and complete
   answers, clearly separated from Nuave's analysis.
3. **What pattern Nuave sees:** a short, fully traceable synthesis.
4. **What is worth doing:** only controllable, evidence-backed actions.
5. **How to interpret the audit:** compact method and limitation details.

This is a report-layer change. It must not rerun observations, add provider
calls, change intake, or infer evidence that the retained answers do not
contain.

## 2. Objective and intended outcome

Create a report that lets a non-technical Indonesian business owner answer
these questions without opening a JSON file:

1. What exact questions were tested?
2. What exactly did the model answer?
3. Was my brand mentioned, recommended, compared, or absent in each answer?
4. Which other businesses did the answers mention?
5. Which statements are raw evidence, which are Nuave's interpretation, and
   which are suggested actions?
6. Which one to three actions are justified by this evidence?

The report should support two reading depths without creating two competing
artifacts:

- a **30-second read** for the result and important pattern; and
- a **full-evidence read** containing the complete ten-question record.

The screen and print/PDF representation must render the same report facts and
complete answers.

## 3. Scope

### In scope

- the active direct-ten report's information architecture;
- direct-ten summary measures and labels;
- complete question-and-answer presentation;
- visible separation of evidence, interpretation, and action;
- grounded presentation of other businesses named in the answers;
- synthesis-prompt changes needed to make findings and actions more useful;
- source, date, and answer metadata presentation;
- screen, mobile, and print/PDF layouts;
- report-only accessibility and regression coverage; and
- preservation of existing JSON evidence integrity and no-repeat behavior.

### Out of scope

- intake, extraction, preparation, and question-generation changes;
- any file or contract owned by Spec 011 before it is verified and merged;
- provider selection, model changes, observation prompts, or web-search logic;
- extra observation, report, or evaluation calls;
- payment, report hosting, authentication, durable delivery, or email;
- a dashboard, benchmark, percentile, grade, or new composite score;
- a traditional SEO audit or automatic site-content audit;
- proving why an answer did or did not mention a business;
- redesigning archived or legacy report journeys; and
- deployment, merge, or a live customer run without separate founder approval.

## 4. Required context for implementation and review

Read in this order:

1. `AGENTS.md`
2. `README.md`
3. `docs/NOW.md`
4. `docs/PRODUCT.md`, especially the approved Spec 009 amendment and report
   delivery section
5. `docs/AUDIT.md`, especially capture, evidence, findings, and report format
6. `docs/VOICE.md`, especially terminology and report register
7. `docs/DESIGN.md`, especially report typography and component rules
8. `specs/009-recommendation-eligible-audit/SPEC.md`, especially R-07
9. `specs/009-recommendation-eligible-audit/DEFERRED_NOTES.md`, especially
   “Founder report preference: actual question and full answer”
10. the merged `specs/011-smart-consultant-intake/SPEC.md` and verification,
    only to confirm its output boundary rather than reopen its decisions
11. the report implementation and focused tests named in this plan

Do not use archived report prototypes as authority. They may be inspected only
if a later implementation task explicitly asks for historical comparison.

## 5. Current-state investigation

### 5.1 Data and rendering path

The current report path is:

| Layer | Current source | What is retained | What the owner sees |
| --- | --- | --- | --- |
| Observation | `AuditObservation` in `src/lib/audit/types.ts` | Exact question, complete `raw_answer`, sources, system/model, time, run status | Only the question and a short excerpt inside a closed accordion |
| Detail normalization | `assembleReportContent()` and `normalizeReportEvidence()` in `src/lib/audit/contracts.ts` | Deterministic appearance, recommendation/comparison/information status, exact excerpt, allowed sources | Status, deterministic finding, excerpt, interpretation note |
| Synthesis | report provider plus `reportSynthesisSchema` | Conclusion, findings, priorities, assessments | Conclusion, findings, actions |
| Other businesses | `observed_competitors` | Currently biased toward the one verified comparison business from the brief | A summary appears only when that narrow record exists |
| Evidence export | `makeCustomerEvidenceExport()` | Complete questions, complete answers, sources, provenance | Downloadable JSON, not a business-readable report |
| Screen/print | `ReportView.tsx` and `audit.module.css` | Same report object and observations | Editorial five-section report; print expands details but still prints excerpts, not full answers |

The important implementation fact is that the complete answers are already in
the `observations` prop passed to `ReportView`. Making them readable does not
require another model request, report regeneration, or evidence migration.

### 5.2 Current information hierarchy

The current screen uses this order:

1. cover and table of contents;
2. four large result cells;
3. three additional measurement rows;
4. conclusion and accuracy badge;
5. optional other-business summary;
6. findings, each showing one selected excerpt and sometimes one matched
   action;
7. a separate action section that repeats action content;
8. ten closed question disclosures;
9. method and limitations.

This hierarchy foregrounds Nuave's compression of the evidence. The primary
evidence appears only after three interpretive sections.

### 5.3 What already works and should be preserved

- The report uses direct counts rather than percentages, grades, or rankings.
- Observation, interpretation, and action exist as separate concepts.
- Exact excerpts are checked against retained answers.
- Unsupported sources, businesses, classifications, and actions are repaired
  or removed by integrity checks.
- Ten evaluable observations remain the delivery floor.
- Sources, timestamps, model provenance, and full raw answers are retained.
- Screen and print are generated from the same report state.
- Back and reload preserve completed results without another provider call.
- The report uses an editorial visual language distinct from the intake UI.

The redesign must improve access and usefulness without weakening any of these
protections.

## 6. Critique from a business-owner perspective

### 6.1 “What exactly did the model say?” is not answered by the report

The report shows `answer_excerpt`, which is normally the first sentence or up
to 320 normalized characters. Confirmed live evidence has produced one-word
affirmative excerpts and excerpts ending in Markdown heading fragments. Even a
technically exact excerpt can fail to represent the substance of the answer.

The complete answer exists only in the JSON export. A business owner should not
need a developer-oriented artifact to inspect the product's core evidence.

### 6.2 The ten tested questions are difficult to scan

Each disclosure row shows a generic label, a result status, and an internal
prompt ID. The actual question is invisible until the row is opened. An owner
cannot quickly compare the ten customer situations or understand where the
brand appeared.

### 6.3 The summary still carries the old method's mental model

For the active direct-ten method, all ten questions omit the audited brand.
The report nevertheless gives large visual weight to overall appearance,
unnamed appearance, named recognition, and completion. Overall and unnamed
appearance duplicate each other; named recognition is not part of this test;
and completion is operational context rather than a business result.

This makes a correct report feel internally inconsistent.

### 6.4 Mention and recommendation remain hard to understand in context

Counts correctly distinguish mention from recommendation, but the owner cannot
see the language that caused the distinction without opening each item. A
label such as `Disebut, tidak direkomendasikan` is much more credible when the
exact answer is directly beside it.

### 6.5 “Who appeared instead?” is under-served

The owner's practical question is not only whether the brand appeared, but
also which alternatives the model named or preferred. The current aggregate
other-business section is populated mainly from a pre-verified comparison
business. Direct-ten questions do not require such a business, so answers may
name useful alternatives that never reach the report summary.

Calling every name a competitor would also overstate the evidence. They should
be described as **bisnis lain yang disebut**, with answer references and no
market-share or ranking implication.

### 6.6 Findings and actions are repetitive and can feel detached from proof

A finding can cite several questions while displaying only the first available
excerpt. The renderer also attaches the first priority sharing any evidence ID,
then repeats the full priority in the following section. This produces both
weak traceability and repeated reading.

The owner needs a direct chain:

`exact answer → Nuave interpretation → justified action`

### 6.7 The report spends reading effort on mechanics before evidence

The cover, contents, metric grid, dimension rows, badges, warnings, and five
numbered sections create a formal artifact, but delay the paid-for answer. The
visual design is composed and restrained; the problem is information priority,
not decoration.

### 6.8 The PDF is complete in structure but incomplete in evidence

Print expands all ten detail blocks, yet it still prints excerpts rather than
complete answers. The current synthetic PDF has also shown section headings
orphaned at page bottoms. The downloadable artifact therefore does not resolve
the screen's main evidence-access problem.

## 7. Synthesized design challenges

### DC-01 — Make complete evidence primary without making the report unusably dense

The owner must be able to read every exact answer, while the report still needs
a fast path for someone who only has a minute.

### DC-02 — Express the active direct-ten method truthfully

The summary must describe ten unnamed recommendation-eligible questions. It
must not expose legacy named-recognition measures as if they were part of this
run.

### DC-03 — Preserve the boundary between evidence and Nuave's judgment

Full model output, deterministic classification, model-assisted synthesis, and
recommended action must never blend into one voice.

### DC-04 — Make every synthesis claim auditable

An owner should move from any finding or action to the exact supporting
question and answer without searching or interpreting internal IDs.

### DC-05 — Surface other businesses without fabricating a competitor set

Names and relationships should appear only when supported by cited retained
answers. Ambiguous relationships must degrade to “disebut”, not a stronger
claim.

### DC-06 — Offer useful next steps without inventing causation

Non-appearance alone does not prove a website or content deficiency. Actions
must either repair a directly observed public-information problem, strengthen
verified public evidence, preserve an observed strength, or investigate an
explicit unknown.

### DC-07 — Keep screen and print useful for different reading situations

The screen may use navigation and anchored references. The PDF must include the
same facts and full answers, with predictable page breaks and no orphaned
headings.

### DC-08 — Avoid conflicting with Spec 011

Spec 011 owns intake preparation, frozen state, question facts, handoff, and
affected request validators. Report implementation must consume its final
boundary and must not create a parallel brief, state, or projection.

## 8. Design strategy

### 8.1 Core principle: evidence first, interpretation second

The redesigned report uses three explicit layers:

1. **Jawaban model AI** — verbatim retained evidence.
2. **Analisis Nuave** — bounded interpretation of that evidence.
3. **Yang dapat dilakukan** — an evidence-linked, controllable next step.

These layers should remain visually and semantically distinct everywhere.

### 8.2 New report narrative

#### A. Header and 30-second result

Keep the business identity, scope, date, and report actions. Replace the current
four-cell direct-ten summary with:

- **Brand Anda disebut di X dari 10 jawaban**;
- **Brand Anda direkomendasikan di Y dari 10 jawaban**; and
- low-prominence run context: **10 dari 10 pertanyaan berhasil diuji**.

Show one short conclusion and the snapshot limitation beside it. Do not show
`Menyebut bisnis Anda`, a named-recognition zero, comparison, or information
metrics when those dimensions were not actually assessed.

Comparison or information findings may appear later when an actual answer
supports them. They do not need permanent empty rows in the summary.

The legacy renderer remains available only for historical non-direct-ten
reports. Do not reinterpret historical counts under the direct-ten layout.

#### B. What the model said

Move the ten-question evidence section immediately after the result. Every
answer block is open and readable by default. Do not use ten closed accordions
for the primary evidence.

Each block contains, in this order:

1. human number, such as `Pertanyaan 01`;
2. the exact approved question as the block title;
3. compact, deterministic result labels such as `Brand Anda tidak disebut`,
   `Brand Anda disebut`, or `Brand Anda direkomendasikan`;
4. **Jawaban model AI**, rendering the complete `raw_answer` verbatim with
   original whitespace preserved;
5. **Analisis Nuave**, containing the deterministic finding and a short
   interpretation;
6. any validated **bisnis lain yang disebut** in that answer;
7. source titles and hostnames from the retained observation; and
8. observation date and time as quiet metadata.

Do not parse the raw answer as HTML. Render it as safe plain text with
`white-space: pre-wrap`. This preserves exact evidence, avoids a new Markdown
dependency, and prevents provider-authored markup from becoming executable UI.

Internal prompt IDs may remain in exported evidence and test selectors. They
should not occupy primary visual space.

#### C. Patterns Nuave sees

After the evidence, show one to three material findings. Each finding includes:

- **Yang ditemukan** — a concise observed pattern;
- **Artinya bagi Anda** — qualified interpretation; and
- visible links such as `Lihat jawaban 02, 05, dan 07` that move to the exact
  evidence blocks.

Do not repeat an arbitrary excerpt here. The evidence blocks already contain
the complete answers, and the links provide stronger traceability.

Show **Bisnis lain yang disebut** in this section when supported. For each
business, show the number of answers and linked answer numbers. State only the
strongest validated relationship. If preference or recommendation is not
supported reliably, use `Disebut dalam jawaban`.

#### D. What is worth doing

Show one to three actions in priority order. Retain the current useful fields:

- action;
- why it matters;
- evidence links;
- owner;
- observable completion check; and
- caveat.

Remove the partial action repeated inside each finding. One complete action
should appear once.

The synthesis instruction must treat absence as an observed result, not a
diagnosed cause. An action based on absence alone must be framed as
investigation or verified-evidence improvement. It may not state that missing
copy caused the absence.

If the evidence supports no corrective action, the implementation should use a
truthful verification or maintenance action under the existing one-action
minimum. It must not invent a deficiency to fill the section. Changing the
canonical minimum to zero is a separate product-contract decision and is not
required for this first redesign.

#### E. Method and limitations

Keep method, exact system/model, search condition, date, variability, and what
the audit does not prove at the end. Use a compact disclosure on screen and
expanded deterministic content in print. Technical provenance stays in the
JSON export rather than competing with business evidence.

### 8.3 Visual strategy

- Keep the current light editorial report character and bounded report serif.
- Reduce decorative hierarchy before the first evidence block.
- Use whitespace, rules, and typography rather than nested cards.
- Give the raw answer a quiet but unmistakable evidence surface distinct from
  Nuave-authored copy.
- Keep result labels compact; color must never be the only carrier of meaning.
- Use anchored text references, not internal prompt IDs, for navigation.
- On mobile, keep question, status, answer, analysis, and sources in one
  reading column.
- In print, start each answer block together when practical and prevent a
  section heading from being stranded at the bottom of a page.

## 9. Technical strategy

### 9.1 Preserve one source of truth

Do not copy `raw_answer` into a second report field. Build the presentation from
the existing pair:

- `AuditReport` for validated counts, findings, classifications, and actions;
- `AuditObservation[]` for exact questions, full answers, sources, time, and
  system/model evidence.

Add a pure report presentation adapter that joins these by `prompt_id` and
produces a render-ready direct-ten view model. It must fail loudly in tests if a
detail or observation is missing, duplicated, or ordered differently.

### 9.2 Branch presentation by recorded method

Use `report.provenance.question_method`:

- `direct-ten` → the evidence-first report in this plan;
- historical/absent method → the current compatible report presentation until
  a separately approved migration exists.

Do not infer the method from prompt IDs or `branded` counts.

### 9.3 Improve other-business capture inside the existing report call

Extend `reportSynthesisSchema` so the existing no-search report synthesis call
may return `observed_competitors` using the already-supported
`ObservedCompetitor` shape. Rename it only at the presentation layer as
**bisnis lain yang disebut**.

For every returned name and cited prompt ID:

1. require the name to be visibly present in the cited `raw_answer` after the
   existing safe normalization;
2. remove the audited brand and its variants;
3. deduplicate spelling-equivalent names;
4. retain the relationship only when cited classifications consistently
   support it; otherwise reduce it to `mentioned`; and
5. drop entries with no valid cited answer.

This replaces the current assumption that only the one brief-supplied
comparison business can appear in the summary. It adds no provider call and
does not turn names into verified competitors.

### 9.4 Tighten synthesis usefulness without moving evidence ownership to the model

Bump the report synthesis prompt-contract version. Keep code responsible for
run state, appearance, exact answers, excerpts, sources, and count arithmetic.
The report model remains responsible only for bounded interpretation:

- conclusion;
- one to three findings;
- one to three actions;
- assessment dimensions; and
- candidate other-business names and evidence IDs, subject to deterministic
  validation.

The instruction must require:

- result-first Indonesian;
- mention and recommendation stated separately;
- no cause inferred from absence;
- no generic marketing advice without a cited observed gap;
- no action that merely restates the finding;
- an observable completion check;
- a caveat when the action might sound like a guarantee; and
- no ranking or market-position claim from mention frequency.

The existing language-only retry must continue to protect classifications,
evidence IDs, names, and sources.

### 9.5 Keep exact excerpts for integrity and compatibility, not as the main evidence

Retain `answer_excerpt` and its validation because older reports and current
integrity checks use it. The new direct-ten renderer must use
`observation.raw_answer` for the visible evidence block. This removes the
first-sentence excerpt's presentation burden without weakening the underlying
contract.

### 9.6 Preserve evidence export compatibility

Do not remove or rename current export fields. If the improved
`observed_competitors` data is already part of the validated report object, it
may flow through the existing report export. The export must continue to carry
the complete raw answers and exact approved questions.

No presentation-only label or derived display text should become a competing
evidence field.

## 10. Implementation sequence

### Phase 0 — dependency and baseline gate

1. Wait until Spec 011 is verified and merged. Do not implement this plan on
   the Spec 011 planning commit or an unverified implementation branch.
2. Start a dedicated branch from the then-current `origin/main`.
3. Read Spec 011's final output boundary and verification. Treat it as input;
   do not change its state model or projections.
4. Run the focused current report tests and preserve a synthetic screen/print
   baseline.
5. Confirm the branch has no edits under `src/lib/intake/`.

**Stop condition:** if Spec 011 changes the report input shape or owns a file
listed below, revise the file allowlist before implementation. Do not solve the
conflict by duplicating state.

### Phase 1 — pure presentation model

1. Add a pure direct-ten report view-model builder.
2. Join report details to observations by stable `prompt_id`.
3. Derive the two summary measures from validated report measures:
   appearance and explicit recommendation.
4. Produce ten ordered evidence items carrying exact question, complete raw
   answer, deterministic statuses, Nuave analysis, sources, and time.
5. Produce human answer references (`01` to `10`) for findings, actions, and
   other-business links.
6. Add unit tests for missing, duplicate, and reordered bindings; zero
   appearance; mention-only; explicit recommendation; and unassessed optional
   dimensions.

**Gate:** no React or CSS change until the adapter proves every displayed value
has one authoritative source.

### Phase 2 — evidence-first screen and print layout

1. Add a direct-ten branch in `ReportView`.
2. Replace the four-cell direct-ten summary with the two result measures and
   low-hierarchy completion context.
3. Move the ten evidence blocks directly below the result.
4. Render the exact question and complete `raw_answer` without a closed
   disclosure.
5. Label raw evidence and Nuave analysis explicitly.
6. Replace excerpt-in-finding rendering with anchored answer references.
7. Remove duplicated action snippets from findings.
8. Make method content lower hierarchy and collapsible on screen if the chosen
   Base UI/shadcn disclosure remains accessible.
9. Update print rules to include every full answer, preserve whitespace, avoid
   orphaned headings, and keep answer blocks together when practical.
10. Verify mobile at narrow phone width and desktop at the current report max
    width.

**Gate:** a reader can see all ten exact questions and complete answers in the
web report without downloading JSON or opening ten controls.

### Phase 3 — grounded other-business and synthesis improvement

1. Extend the synthesis output with candidate other-business records using the
   existing report call.
2. Normalize and validate every name against cited raw answers.
3. Fall back to `mentioned` when a stronger relationship is not consistently
   supported.
4. Update the synthesis instructions for one to three findings and actions,
   direct-ten semantics, and non-causal absence handling.
5. Preserve all current repair, language-retry, and evidence-integrity gates.
6. Add fixtures with multiple names, spelling variants, unsupported generated
   names, ambiguous relationships, and no other business.

**Gate:** an unsupported name or relationship cannot survive into the report.

### Phase 4 — end-to-end verification and founder review

1. Run focused unit and component tests.
2. Run the existing synthetic intake-to-report browser path. Assert one run
   request and one report request only.
3. Verify Back and reload preserve the new report with zero additional
   provider requests.
4. Download JSON and confirm exact questions, raw answers, and provenance are
   unchanged.
5. Produce a normal browser PDF through the existing product print path.
6. Inspect the PDF visually and extract text to confirm all ten full answers,
   questions, findings, actions, and method facts exist.
7. Run `npm run validate:fast`, then `npm run verify`.
8. Use the retained private real-business evidence for a founder-only visual
   and usefulness review. Do not make a new provider call.

**Gate:** the founder can point to the exact model answer behind every material
finding and judge the report useful without using the JSON file.

## 11. Expected file scope

The exact list should be confirmed after Spec 011 merges.

### Expected report-layer files

- `src/app/audit/ReportView.tsx`
- `src/app/audit/audit.module.css`
- `src/components/product/ReportToolbar.tsx` only if action hierarchy changes
- new `src/lib/audit/report-presentation.ts`
- new `src/lib/audit/report-presentation.test.ts`
- `src/lib/audit/report-labels.ts` and its test
- `src/lib/audit/report-prompt-contract.ts` and its test
- `src/lib/audit/contracts.ts` and focused report tests
- `src/lib/audit/types.ts` only after rebasing over merged Spec 011
- `src/lib/audit/report-language.ts` and Indonesian language tests when the
  synthesis contract changes
- `src/lib/audit/customer-evidence-export.test.ts` for no-regression coverage
- `tests/e2e/new-intake-glm.spec.ts`
- the active specification and verification record created after this plan is
  approved

### Explicitly excluded during report implementation

- `src/lib/intake/**`
- Spec 011's preparation, state, frozen-input, question-facts, and request
  projection code
- provider transport or observation execution files
- rate-limit, deployment, payment, authentication, or hosting files
- `docs/NOW.md` and `docs/DECISION_LOG.md` until implementation actually
  changes verified current state or settles a material product decision

## 12. Acceptance criteria

### Evidence access

- **AC-01:** The direct-ten report displays all ten exact approved questions in
  order without requiring the reader to open ten accordions.
- **AC-02:** The direct-ten web report displays each complete retained
  `raw_answer`, not only `answer_excerpt`, with whitespace preserved.
- **AC-03:** The print/PDF representation contains the same ten complete
  answers and exact questions.
- **AC-04:** Raw answer text is rendered as safe text and is never executed as
  HTML.

### Correct meaning

- **AC-05:** The direct-ten summary shows appearance out of ten and explicit
  recommendation out of ten separately.
- **AC-06:** The direct-ten summary does not render named-recognition,
  legacy 6/4, or zero-filled untested dimensions.
- **AC-07:** Ten-of-ten completion is visible as run context, not presented as
  a business-performance metric.
- **AC-08:** Mention, recommendation, comparison, information, non-appearance,
  and failed tests keep their existing evidence semantics.

### Traceability and usefulness

- **AC-09:** Every finding and action provides human-readable links to all
  cited answer blocks.
- **AC-10:** Findings do not display one arbitrary excerpt as if it represented
  every cited answer.
- **AC-11:** Raw evidence, Nuave interpretation, and suggested action have
  stable visible labels and cannot be mistaken for one another.
- **AC-12:** Actions are shown once, include owner and completion check, and do
  not claim that an observed absence proves a specific cause.
- **AC-13:** The report contains no more than three primary findings and three
  primary actions in newly synthesized direct-ten reports.

### Other businesses

- **AC-14:** A summarized other-business name survives only when it visibly
  occurs in every cited retained answer.
- **AC-15:** An unsupported or ambiguous stronger relationship degrades to
  `Disebut dalam jawaban` or is dropped.
- **AC-16:** The customer-facing label is **Bisnis lain yang disebut**, not
  competitor, rank, winner, or market position.

### Presentation and delivery integrity

- **AC-17:** Mobile uses one coherent reading column without horizontal
  scrolling for questions, answers, findings, or sources.
- **AC-18:** Screen and print use the same report and observation data; no
  second interpretation is generated for PDF.
- **AC-19:** Print keeps section headings with following content and avoids
  splitting short answer blocks when practical.
- **AC-20:** Existing JSON fields, raw answers, exact approved questions, and
  provenance remain intact.
- **AC-21:** Opening, refreshing, going Back, printing, or downloading evidence
  causes zero new provider calls.
- **AC-22:** Historical non-direct-ten reports retain compatible rendering and
  are not silently reinterpreted.
- **AC-23:** `npm run verify` passes offline.

### Spec 011 isolation

- **AC-24:** The implementation begins from a main commit containing the
  verified Spec 011 result.
- **AC-25:** The report branch changes no file under `src/lib/intake/` and
  creates no alternate prepared brief, state store, or question projection.
- **AC-26:** Intercepted-request tests confirm the exact Spec 011-approved
  questions and business context still reach the unchanged run/report
  boundary.

## 13. Test matrix

| Case | Required assertion |
| --- | --- |
| 0/10 appearance | Summary says 0/10 appearance, recommendation remains separate, all full answers visible |
| Mention but no recommendation | Answer shows both facts without collapsing them |
| Explicit recommendation | Recommendation count and answer label increase exactly once |
| Multiple other businesses | Only names present in cited answers appear; answer links are correct |
| Hallucinated synthesis name | Name is removed by deterministic normalization |
| Ambiguous relationship | Relationship becomes `mentioned` |
| Long Markdown-like answer | Entire value is safe text, whitespace preserved, no HTML execution |
| Answer with sources | Source title/hostname and observation time display from the observation |
| No assessed comparison/information | Empty metrics are omitted from direct-ten summary, not shown as zero |
| Finding cites several answers | All cited answer links render; no arbitrary single excerpt |
| Back/reload after completion | Same report returns; run/report request counts do not change |
| Print/PDF | All ten full answers are present; headings are not orphaned in the reviewed fixture |
| Historical report | Existing compatible presentation still renders its original denominators |
| JSON export | Existing evidence/provenance fields and exact raw answers are unchanged |

Use privacy-safe fictional fixtures in Git. Use retained real-business evidence
only in the founder's private local review and never commit it.

## 14. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Full answers make the report long | Keep the 30-second result concise; treat length as evidence depth, not a failure; use strong answer-block typography and print pagination |
| Provider output contains Markdown or awkward formatting | Render safe plain text with preserved whitespace; sources remain structured separately |
| Other-business extraction overstates competitors | Validate literal occurrence and evidence IDs; use the neutral `bisnis lain yang disebut`; reduce ambiguous relationships to `mentioned` |
| Synthesis still produces generic actions | Tighten prompt contract, cap new outputs at three, retain evidence-ID validation, and inspect the retained real report before acceptance |
| Direct-ten changes break historical reports | Branch on recorded `question_method`; preserve the legacy renderer and existing schema compatibility |
| Spec 011 changes shared types or tests | Wait for its verified merge, rebase once, then implement from its final boundary with no intake edits |
| Print becomes too many pages | Accept necessary evidence length; improve page breaks and front-matter density rather than removing answers |
| A full raw answer contains unnecessary personal data | Preserve the existing audit data boundary; if such data is observed, stop and treat it as a source/data-handling defect rather than silently rewriting evidence |

## 15. Implementation stop conditions

Stop and return to the founder or orchestrator if:

- Spec 011 is not verified and merged;
- the implementation requires changing intake or frozen-state semantics;
- full raw answers are not available for all ten retained observations;
- a proposed summary requires a new provider call or re-running an audit;
- an other-business name cannot be validated against its cited answer;
- usefulness requires a new claim about causation, ranking, or business
  performance;
- print/PDF would need a second report-generation path; or
- the report cannot preserve historical method meaning without a material
  product decision.

## 16. Review brief for an independent agent

Review this plan as an independent product designer, software architect, and
evidence-integrity reviewer. Do not optimize for agreement. Inspect the current
repository paths named above and answer:

1. Does the proposed hierarchy directly resolve “What exactly did the model
   say about my brand?”
2. Is any supposedly available data absent, truncated, unsafe, or owned by a
   different boundary?
3. Does showing full `raw_answer` introduce privacy, security, accessibility,
   or report-integrity problems the plan does not handle?
4. Are the direct-ten appearance and recommendation denominators technically
   correct?
5. Can other-business capture be added to the existing report call and
   deterministically contained as proposed?
6. Are findings and actions still likely to overreach the evidence?
7. Is the implementation sequence minimal, or does it create unnecessary
   schema, versioning, or UI complexity?
8. Does any file scope conflict with the verified Spec 011 implementation?
9. Are the acceptance criteria observable and sufficient for screen, print,
   evidence export, and no-repeat behavior?
10. What narrow changes are required before this plan can become an approved
    implementation specification?

The reviewer should return findings by severity, cite repository evidence,
identify blocking product decisions, and finish with one verdict:
`ready for specification`, `ready after narrow corrections`, or
`reframe before specification`.

## 17. Definition of plan completion

This planning task is complete when:

- the current report has been investigated from data contract through screen
  and print behavior;
- business-owner critiques are tied to repository evidence;
- the design challenges and strategy answer those critiques;
- the implementation sequence, file boundaries, acceptance criteria, tests,
  risks, and stop conditions are explicit; and
- an independent agent can review the plan without relying on prior chat
  history.

Approval of this draft should lead to one numbered report-redesign
specification. This draft itself is not implementation authority.
