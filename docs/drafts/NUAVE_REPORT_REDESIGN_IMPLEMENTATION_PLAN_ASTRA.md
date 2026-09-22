# Nuave Report Redesign — Investigation, Design Strategy, and Implementation Plan — Astra

> Status: **Draft for independent review; not an approved implementation specification**
> Author: Astra
> Date: 2026-09-22
> Investigated baseline: `main` at `4e6b2cf6302a0679aa7820d163b214ac8b486e1f`
> Deliverable: one reviewable plan; no runtime changes, new audits, or deployment

## 1. Recommendation and intended outcome

Make the report an understandable record of the tested conversation, followed by useful interpretation and work the owner can choose to do.

The report should answer, in order:

1. **Did my business appear or receive a recommendation in this test?**
2. **What question was asked, and what exactly did AI answer?**
3. **What can we reasonably learn from those answers?**
4. **What should I check or change first, and what would count as done?**

Today, the report has much of the necessary data but puts the second question behind three sections and an excerpt-only disclosure. The main remedy is to bring the exact questions and complete retained answers into the normal reading experience. A visual refresh alone will not repair weak excerpts, repetitive interpretation, or unsupported advice.

**Recommended first release:** a compact summary; a question-led evidence section with full answers one click away; concise findings with working evidence links; one to five concrete, defensible actions; and a PDF containing the complete answers as an appendix. Reuse retained observations. Preserve the current audit method, counts, provider gates, and evidence export.

Do not introduce a dashboard, report chat, new research agent, automated website audit, or another observation pass to achieve this outcome.

## 2. Investigation scope, confidence, and authority

### What was inspected

The investigation traced the active `ReportView` and report CSS, the observation/report types, synthesis and normalization, excerpt selection, priority validation and repair, direct-ten method, customer evidence export, report/session handoff, relevant tests, and the current product and audit contracts.

It also read the recorded report-quality observations in [Spec 009 deferred notes](../../specs/009-recommendation-eligible-audit/DEFERRED_NOTES.md). Those notes describe prior private live runs; their findings are attributed to that record, not presented as a new inspection of the private answers.

A standalone inspection render was built from the current component and CSS with explicitly fictional direct-ten data. The browser's local-file policy prevented visual inspection. **No desktop/mobile screenshot or newly generated PDF was visually verified in this investigation.** Composition judgments below are grounded in source, with visual confirmation made an implementation acceptance gate. No production audit was run, and no private retained evidence or credentials were opened.

The owner critiques are an expert perspective exercise, **not interviews or measured usability findings**. Proposed comprehension targets are acceptance hypotheses, not existing product metrics.

### Authority and related work

- Start with [AGENTS.md](../../AGENTS.md), [README](../../README.md), [NOW](../NOW.md), and [WORKFLOW](../WORKFLOW.md).
- [PRODUCT](../PRODUCT.md), [AUDIT](../AUDIT.md), [DESIGN](../DESIGN.md), and [journey 06](../journey/06-audit-report.md) govern the buyer, evidence standard, presentation stack, and report obligations.
- [Spec 009](../../specs/009-recommendation-eligible-audit/SPEC.md), especially R-07, governs the active ten unnamed questions. Its explicit direct-ten amendment takes precedence over older fixed 6/4 assumptions. Historical audits retain their own semantics.
- [Spec 010](../../specs/010-gated-new-audit-flow/SPEC.md) governs the active trial journey and recovery/cost boundaries.
- [Spec 011](https://github.com/yasir-mukhtar/nuave_v0.2/blob/194f0f44e7f6c7f8bc3270b97a2ac9f887b830e4/specs/011-smart-consultant-intake/SPEC.md) was inspected on `devin/sol-smart-consultant-intake-plan` at `194f0f4`; it was not present on the investigated `main`. Its R-23 sizing gate and R-27 boundary explicitly keep intake work from becoming a report redesign.

The current user request authorizes investigation, this plan, and its commit/push. It supersedes the earlier deferral **for planning**. It does not silently mark this design approved or authorize paid model calls, runtime implementation, merging, or deployment.

The proposed screen order changes the sequence prescribed in `AUDIT.md` and journey 06. The compact observation-surface label and full-answer PDF appendix also refine their presentation hierarchy. Before implementation, approve those bounded changes and reconcile the affected sections in the numbered specification. The content slice also changes the current runtime behavior that permits an empty action list after repair; section 6.7 makes that decision explicit. Do not let a frontend refactor silently override either a product contract or a deliberate recovery behavior.

## 3. Current report: evidence inventory

All code references below refer to the investigated baseline. Links resolve within this repository; use the baseline SHA when comparing later changes.

| ID | Verified behavior | Source and implication |
|---|---|---|
| E01 | Five sections: Hasil utama → Temuan utama → Langkah berikutnya → Hasil tiap pertanyaan → Cara kerja audit. | [ReportView](../../src/app/audit/ReportView.tsx), section order and contents navigation. Evidence comes after conclusions and advice. |
| E02 | A collapsed question row exposes an ordinal, category/fallback label, result label, and technical prompt ID. The actual question is inside the disclosure. | `ReportView`, `measurementLabel`, `detailTrigger`, and `DetailContent`. Direct-ten IDs have no matrix label, so rows can repeatedly say “Pertanyaan” and “Tidak disebut.” |
| E03 | Expanded screen and print details render `answer_excerpt`, never `observation.raw_answer`. | `DetailContent`, reused by screen and print. Opening the disclosure does not answer the request for the complete answer. |
| E04 | `exactAnswerExcerpt()` returns the first sentence when it fits within 320 characters; otherwise it uses a bounded prefix. | [report-excerpt.ts](../../src/lib/audit/report-excerpt.ts). A response beginning “Ya.” can produce exactly that excerpt. The deferred notes report one-word live examples and clipped heading fragments. |
| E05 | A finding displays the first nonempty excerpt among its referenced details, and the first action sharing any evidence ID. | `ReportView`, `key_findings.map`. Shared question IDs do not establish that a quote proves this finding or that this is the right action for it. |
| E06 | Per-question “meaning” is largely deterministic status wording, such as an absent-brand finding followed by a note that the retained answer does not name the business. | [contracts.ts](../../src/lib/audit/contracts.ts), `deterministicDetailCopy`. The two sentences can repeat the result without adding a business implication. |
| E07 | `raw_answer`, exact question, observed time, requested/returned observation model, and sources already exist. The component already receives observations. | [types.ts](../../src/lib/audit/types.ts), `AuditObservation`; [LocalAuditStage](../../src/app/audit/LocalAuditStage.tsx); [customer-evidence-export.ts](../../src/lib/audit/customer-evidence-export.ts). Full-answer access does not require another audit or a new database. |
| E08 | The summary always renders overall, unnamed, named, and completion tiles. `indonesianCountLabel()` formats zero denominators as numeric fractions. | `ReportView`; [report-labels.ts](../../src/lib/audit/report-labels.ts). Direct-ten can show redundant overall/unnamed results and `0/0` for a question type that was not tested. |
| E09 | Direct-ten recommendation counts use all completed eligible answers, including `not_assessed`; historical methods have different denominator rules. | `contracts.ts`, `buildAuditReport`. The current generic “pertanyaan yang dinilai” wording does not explain this distinction well. Do not redesign the metric by changing its denominator. |
| E10 | The main synthesis assembler discovers only the supplied `verified_competitor.name`; it does not enumerate every other business in the answer. | `contracts.ts`, `assembleReportContent`. An empty structured competitor list does not mean AI named no alternatives. |
| E11 | Source links display mostly hostnames. Source records contain URL/title, without a general retained quote-to-citation span mapping. | `ReportView`, `sourceTitle`; `types.ts`, `sourceSchema`. The UI cannot honestly manufacture sentence-level citation attribution. |
| E12 | The report has large serif display tokens, substantial cover/section padding, and a 9.5rem desktop content offset. Question status has greater prominence than question wording. | [audit.module.css](../../src/app/audit/audit.module.css), report selectors; [tokens.css](../../src/styles/tokens.css), report display roles. These are source-confirmed layout choices; their visual severity still needs browser review. |
| E13 | PDF is browser print. Print renders separate expanded detail markup, using the same excerpt-only component. `.printDetail` avoids page breaks across the entire item. | `ReportView`; [ReportToolbar](../../src/components/product/ReportToolbar.tsx); print CSS. Full answers require revisiting pagination; simply inserting long text into the current print box is insufficient. |
| E14 | The UI labels `report.generated_at` as audit date, while each observation has its own `observed_at`. | `ReportView`. Re-synthesizing a report must not make the evidence look newly observed. |
| E15 | Priority validation requires an observed gap. Repair may remove priorities/findings; the repair diagnostic does not itself create useful replacement content. Tests explicitly permit delivery with no surviving priorities. | [report-priority.ts](../../src/lib/audit/report-priority.ts), `validateReportContent`, [report-quality-repair.ts](../../src/lib/audit/report-quality-repair.ts), and [report-delivery-resilience.test.ts](../../src/lib/audit/report-delivery-resilience.test.ts). This needs reconciliation with the product's permitted maintenance/investigation actions and one-to-five delivery minimum. |

**Keep the existing strengths:** clear separation of result dimensions in the data, direct counts, ten retained questions, known evidence IDs, exact-excerpt integrity, Indonesian writing limits, actionable fields including `done_when`, and one shared report record for screen/export. The design should make these strengths usable, not replace the audit engine.

## 4. Critique from a business owner's perspective

The quotations in this table are hypothetical owner questions, not research quotations.

| Priority | Owner's question or concern | Critique and practical consequence | Evidence |
|---|---|---|---|
| Critical | “What exactly did AI say about us?” | The owner is given Nuave's interpretation but cannot read the full answer in the report. They must understand a JSON download to inspect the central evidence. | E01–E04, E07 |
| High | “Which customer question is this result about?” | Repeated result labels hide the differences among ten purchase situations. The owner must open rows one at a time to locate a relevant question. | E02 |
| High | “How does ‘Ya.’ prove that conclusion?” | Verbatim text is not automatically useful evidence. Short opening sentences and the first available quote can undermine confidence in an otherwise valid result. | E04–E05 |
| High | “Does zero mean nobody knows my business?” | A sampled absence can sound like a market-wide verdict. Empty denominators and method-agnostic labels add confusion. | E08–E09 |
| High | “Did AI recommend someone else? Who, and under what conditions?” | The structured alternative list is incomplete by construction. The full answer is the reliable place to see the actual choices and caveats. | E03, E10 |
| High | “Why should I spend time on this change?” | A prompt ID proves an answer exists, not that a particular website change is needed. Answer omissions must not become diagnoses of missing website content. | E05–E06, E15; deferred live-review notes |
| Medium | “I see the result. What new information am I getting?” | Repeating the same absence as finding, meaning, and conclusion creates reading effort without helping a decision. | E05–E06 |
| Medium | “Can I send this to the person doing the work?” | Useful owner/completion fields already exist, but their evidence references are plain text and the PDF still omits full answers. | E05, E13 |
| Medium | “When was this tested, and which AI answered?” | Report-generation date and evidence date are different. The observation model must not be confused with the question writer or synthesis model. | E07, E14 |
| Medium | “Can I understand this on my phone?” | Large display elements, generous repeated spacing, and hidden question text may impose too much scrolling and opening. Verify the redesign on an actual narrow viewport. | E02, E12 |

The central failure is a broken trust path: **result → exact question → complete answer → bounded interpretation → justified action**. Better typography helps, but the missing links must be repaired first.

## 5. Design challenges and strategy

| Challenge | Design strategy | Concrete response | Validation |
|---|---|---|---|
| D1. Show the actual answer without making ten long answers compulsory reading. | Use progressive disclosure around evidence, with the question always visible. | Exact questions and short, clearly labeled previews; full answers open inline with one action; all ten remain in approved order. | AC01–AC03 |
| D2. Make a conclusion inspectable instead of merely authoritative. | Treat evidence navigation as a core interaction. | Every finding/action reference opens the correct answer and moves focus there. Remove automatic first-quote/first-action matching. | AC04 |
| D3. Explain the result without exaggerating the test. | Display the actual method and denominators. | Direct-ten summary, separate appearance/recommendation, “Tidak diuji” for untested dimensions, short snapshot statement beside the result. | AC05 |
| D4. Convert observations into useful work without inventing causes. | Separate an observed fact, an interpretation, and a proposed check/change. | Stronger writing instructions, concrete `done_when`, preservation/investigation when appropriate, and a report-level usefulness gate. | AC06, AC11 |
| D5. Preserve uncertainty and contradictory evidence. | Keep qualifications accessible and avoid unsupported compression. | Full raw text, honest `not_assessed` labels, no sentence-level citation claim without mapping, no exhaustive competitor claim. | AC03, AC05–AC07 |
| D6. Make screen and PDF support different reading situations. | Share evidence/content, adapt layout. | Interactive screen; compact printable brief followed by a complete answer appendix. No second synthesis for PDF. | AC08 |
| D7. Ship independently of the intake redesign. | Reuse the settled report/observation boundary. | Presentation changes first; narrowly scoped synthesis/validation changes later. Preserve started/completed sessions and historical methods. | AC09–AC10 |

## 6. Proposed report experience

### 6.1 Reading order and composition

Screen order: **Hasil singkat → Pertanyaan & jawaban AI → Temuan penting → Langkah berikutnya → Tentang audit ini.**

Use five anchor destinations, not five oversized cover-like introductions. The navigation remains available near the summary; evidence and actions are equally easy to reach. An owner wanting the task list can jump directly to it.

| Region | Content and behavior |
|---|---|
| Compact identity/header | Business and exact scope, observation date/range with explicit timezone, a plain observation-surface label such as the recorded provider's API, and print action. Exact model identifiers and report generation time stay in method/per-answer details. Neutral Nuave attribution; do not expose legacy agency customization as a new feature. |
| Hasil singkat | Overall appearance `x/10`; explicit recommendation count with its actual denominator; one short, validated conclusion; direct link to answers; one sentence explaining the snapshot. Completion is small metadata, not a performance score. |
| Pertanyaan & jawaban AI | All ten exact questions in approved order. Each row shows a stable human ordinal, appearance and recommendation meaning, an optional substantive preview, and an explicit full-answer control. Technical prompt IDs move into method/debug detail. |
| Temuan penting | One to five material findings. Each states the observed pattern and its bounded interpretation, with working question links. Do not repeat an action here just because it shares an evidence ID. |
| Langkah berikutnya | One to five ordered actions; one prominent “Mulai dari sini” action, followed by the rest. Keep action, why, basis, suggested owner, and done-when; avoid repeating the same sentence under multiple labels. |
| Tentang audit ini | Method, actual observation surface/models, evidence dates, report creation time, scope/untested areas, limitations, and secondary JSON evidence export. Retain truthful API-versus-consumer-app disclosure. |

**Density direction:** retain the light neutral canvas, quiet rules, existing action color, and approved Geist/serif system. Use core 16px reading copy, 14px supporting copy, 20–32px functional headings. Reserve the report serif for a restrained title/result accent. Remove the 9.5rem section content offset and greatly reduce repeated section padding. Keep long-answer text roughly 60–75 characters wide on desktop. These are design targets to tune in the fixture review, not new global typography scales.

At 390px, use one reading column with modest gutters, wrapping questions, and no sideways page scrolling. At 320px and 200% zoom, preserve content and controls. Status must have a text label, not color alone. Keep touch targets approximately 44px and reuse the existing accessible disclosure primitive. Avoid a nested scrolling transcript or a modal answer reader.

### 6.2 The question and answer interaction

Each question entry has these parts in this order:

1. `Pertanyaan 01` and the **exact approved question**, visible while collapsed and never shortened with line clamping.
2. Separate appearance and recommendation labels from validated detail data. Additional comparison/information results appear only when relevant, with non-assessment stated honestly.
3. `Cuplikan jawaban AI`, if a useful exact preview can be selected. A preview is never labeled the complete answer or treated as proof of absence.
4. `Baca jawaban lengkap` / `Tutup jawaban`, with the complete retained answer inline when open.
5. `Sumber yang disertakan dalam jawaban`, using retained titles plus domains; original URLs available. If empty, say no source links were retained, not that the model did no search.
6. Observation time and observation model; any useful Nuave explanation is separately labeled `Interpretasi Nuave`.

All full answers start collapsed. Their question and preview remain visible. Multiple answers may stay open for comparison; include `Buka semua jawaban` as a secondary control. Do not make the owner close one answer to open another. Source links and copy buttons must not be nested interactive elements inside the disclosure trigger.

Finding/action references are buttons or internal links labeled `Pertanyaan 03`, not unexplained internal IDs. Activating one opens the corresponding answer, scrolls to the question heading, and places keyboard focus appropriately. Use stable, uniquely namespaced anchors derived from the retained IDs. Preserve the screen's other expanded items. A page reload may reset disclosure state; it must preserve the saved audit/report and make no provider calls.

Add `Salin pertanyaan & jawaban` with a short success/failure message. Copy the stored question and raw answer with provenance labels; do not copy a reconstructed Markdown rendering. This supports delegation without a new sharing backend.

### 6.3 Full-answer fidelity and formatting

`AuditObservation.raw_answer` is the full answer **captured by Nuave**, not the provider's response envelope or hidden reasoning. Use only that text and an explicit allowlist of question, source, date, and model fields in customer presentation. Never dump observation telemetry or failure diagnostics into the answer reader.

Render ordinary Markdown paragraphs, lists, emphasis, headings, and tables so the answer remains readable. Keep an escaped `Teks asli` view and copy action for the exact string. Rendering must not translate, rewrite, reorder, remove caveats, or silently shorten the answer. Map answer headings below the report hierarchy, preserve list numbering, and wrap long URLs. Unsupported notation remains visible as text.

Use one small Markdown renderer, not a home-made Markdown parser or new UI stack. The proposed dependency is `react-markdown`, with `remark-gfm` for common tables/lists. Its documentation describes safe default rendering and configurable element/URL handling; GFM supplies tables and related syntax. Pin compatible versions during implementation and keep raw HTML interpretation disabled. Review custom renderers because extensions can change those guarantees. See the official [react-markdown documentation](https://github.com/remarkjs/react-markdown) and [remark-gfm documentation](https://github.com/remarkjs/remark-gfm), checked 2026-09-22.

For this product, render only text-oriented elements; never load answer-authored images, embeds, scripts, forms, or remote resources. Only retained HTTP(S) source URLs become active external links in the initial implementation; other answer-authored URLs remain readable text. Original text stays available. No source-page fetch occurs when an answer opens. Sensitive content discovered in evidence follows the existing repository stop/restrict/escalate rule; it is not silently redacted and relabeled “exact.”

### 6.4 Excerpts: previews, not substitute evidence

Do not continue using the first sentence as the universal evidence quote. Also do not ask a new model call to choose prettier quotes.

Introduce a pure **display-only preview selector**:

- Segment the raw answer while retaining original character offsets.
- Prefer the first substantive complete paragraph or complete list item; skip isolated acknowledgments, standalone headings, and citation-only blocks.
- Aim for approximately 200–500 characters, but correctness takes priority over that target. Do not cut a sentence, list item, qualifier, URL, or Markdown construct to meet it.
- If no compact coherent block is available, omit the preview and show the full-answer control. A short complete answer can be shown in full and labeled accordingly.
- Render the selected contiguous raw substring. Put any omission indicator outside the quotation. Never join distant fragments into one quote.
- A preview cannot establish that the brand was absent from the entire answer. That statement comes from the existing validated appearance result and remains inspectable in the full text.

This selector does not promise to locate the strongest evidence for every synthesized claim. Therefore **remove the automatically chosen quote from headline findings**. Link all of a finding's cited questions instead. A future claim-specific quotation feature needs explicit claim-to-span support; it is not required for this release.

Keep persisted `answer_excerpt` and the evidence schema unchanged in the presentation slice. A view-specific preview must not rewrite historical report evidence or be confused with a changed model answer.

### 6.5 Counts and honest result language

| Situation | Required presentation |
|---|---|
| Active direct-ten, complete run | Overall appearance `x/10`; `Rekomendasi eksplisit ditemukan dalam y dari 10 jawaban`; state all ten questions were asked without the business name. Read validated `measures`; do not recompute a new score in React. |
| Same overall and unnamed population | Explain the unnamed scope underneath the main count; avoid a second equal-sized duplicate tile. |
| No named questions | `Menyebut bisnis Anda: Tidak diuji` in scope details, or omit that metric under the Spec 009 allowance. Never `0/0`. |
| Comparison/information not assessed | `Tidak dinilai dari jawaban yang tersedia` at detail level; keep established `Tidak diuji` where the aggregate contract requires it. No green reassurance from missing evidence. |
| Mention without endorsement | Show appearance separately. Do not turn mention into recommendation or `not_assessed` into explicit rejection. |
| Direct-ten `not_assessed` recommendation | Keep it visibly unassessed at question level. The aggregate denominator still follows direct-ten's ten evaluable answers; it does not imply ten explicit recommendation judgments. |
| All ten omit the business | Valid `0/10` result; state it concerns these answers only. Offer a bounded investigation action, not a diagnosis of poor service, lost customers, or missing website content. |
| Historical canonical/mixed pack | Preserve its actual name/no-name populations, eligible denominators, and method label. Do not reinterpret it as direct-ten or compare unlike methods as improvement. |
| Any failed/non-evaluable observation | Stay in existing recovery; no delivered customer report. A technical failure is never “Tidak disebut.” |

Model attribution comes from **the observations**, not GLM question-generation provenance or the report writer. If more than one model appears, disclose the set and per-answer details. Audit date comes from observation timestamps; label report creation separately and use the same explicit timezone in screen and PDF.

### 6.6 Other businesses and sources

The complete answer is the primary way to see which alternatives were actually named and under what conditions. Do not present the current `observed_competitors` array as an exhaustive market or answer list.

If retaining its small summary, label it narrowly as a recorded comparator observation and include working question links. State that the full answers may contain other names. An empty array suppresses this optional summary; it must not produce “AI mentioned no competitors.” Do not add automatic entity discovery, ranking, or cross-answer frequency comparisons in this release.

Label retained URLs as sources attached to the answer, not independently verified support for every claim. Distinguish buyer-supplied facts from observed answer claims. There is no current general citation-span map: do not attach a source to an individual sentence by guessing from its hostname or order.

### 6.7 Findings and actions that earn their place

Use the existing synthesis shape: `conclusion`, `key_findings`, `priorities`, and per-answer assessments. Improve its instructions and review standards rather than introducing a large new report schema.

Each finding must add something beyond repeating a status: a meaningful situation where the business is absent/present, an explicit condition or caveat attached to a recommendation, a supported contradiction, or a contrast among the retained answers. A count-level finding is enough when that is genuinely all the evidence supports. Do not imply the questions represent all customer demand.

Each action must specify a concrete object and a completion check. Use the existing fields, with `Penanggung jawab yang disarankan` to avoid pretending Nuave knows the owner's team.

| Evidence available | Defensible action | Unsupported leap |
|---|---|---|
| Business omitted; no public-page deficiency verified | Check whether official information clearly states the relevant offering/area; if already present, investigate further rather than automatically rewrite it. | “Create a service page because the website lacks one.” |
| AI makes a specific factual claim inconsistent with owner-supplied facts only | Confirm the correct fact against a suitable official source before prescribing a correction. | “AI is wrong” or “your website is wrong.” |
| A retained answer contains an explicit qualification | Check whether the qualifying need matches the intended customer, using that exact answer as the basis. | Rewrite positioning based on an invented reason for exclusion. |
| Answers support a strength; no corrective gap | Maintain the verified information or inspect a clearly labeled untested aspect. | Invent a weakness to satisfy the action minimum. |
| No recommendation outcome was assessed | Explain the limit; propose a bounded evidence check. | Treat non-assessment as a rejection or an SEO diagnosis. |

For example, a fictional action could be: “Periksa apakah halaman layanan menyebut antar-jemput dan wilayah layanan yang sesuai.” Done when: “URL dan teks yang menjelaskan keduanya sudah dicatat; bila belum ada, tambahkan informasi yang benar.” This is a proposed check, not a claim that either item is currently missing.

Keep one to five findings/actions; prefer fewer distinct, useful items over filling five slots. Preserve current writing limits initially. Never apply those limits to exact questions, raw answers, names, or source text.

**Known validator mismatch:** the current action gate accepts only an observed gap, while the product permits maintaining a strength or investigating an unknown. Do not solve this by accepting any model-authored action that cites a positive answer: that would admit corrective advice with no corrective evidence.

For the initial content slice, keep the existing gap rule for model-authored corrective priorities. Add one narrow code-owned non-corrective path for complete runs without a supported corrective gap:

- Define a small set of reviewed Indonesian preservation/verification templates. Before synthesis, prepare eligible candidate objects from the completed observation IDs, exact questions, and already observable business mentions only; do not depend on classifications that the pending synthesis call has not produced.
- After evidence normalization, select at most one candidate compatible with a specific validated strength or unassessed limit. Its basis identifies the actual question and its completion check is concrete. Reconstruct it in code, using the existing priority fields and an explicit preservation/investigation label in customer copy.
- The validator accepts this exception only when the complete action object matches the deterministic builder's expected fields and evidence references for the current observations, allowing only display-order renumbering. Do not recognize intent from a word such as “maintain” or trust a model-supplied flag.
- Keep the original regression that rejects a corrective action citing only positive evidence. Add separate coverage for the legitimate code-owned action, unknown IDs, forged template fields, and retry stability.
- Update synthesis instructions so the model is not pressured to invent a deficiency. Where a structured response still requires one priority, supply the precomputed permitted candidates in the synthesis input and allow one when appropriate; post-normalization code still checks eligibility and the exact object independently. This avoids a circular dependency on the model's own pending assessments. Do not add another call or a persisted field.

This is intentionally narrower than a new general action taxonomy. It must still pass the human usefulness rubric; if no template produces a defensible, useful action, preserve the evidence and use report recovery. A later need for freely generated maintenance categories would require a separately reviewed schema/validation amendment.

Deterministic validation can verify IDs, text integrity, counts, statuses, and some contradictions. It cannot establish that arbitrary prose is logically justified. The qualitative review rubric in section 11 remains necessary; do not claim that a regex or a valid citation proves causality.

If repair removes every material finding/action, do not show an empty section as a complete, useful report. Preserve the ten observations and expose the existing report-recovery path. The evidence reader should remain available from that state using the same observation projection, labeled as retained answers while report interpretation is unfinished; it is not a delivered partial audit. This requires a small integration in `LocalAuditStage`, not a second answer store. Repair/re-synthesis must use the retained evidence, keep ordinary cost/retry limits, and never run the observations again. A supported maintenance/investigation action may satisfy the minimum; filler may not.

This deliberately tightens the behavior currently asserted by `report-delivery-resilience.test.ts` and `report-priority.test.ts` (delivery after all priorities are removed). Obtain approval for it in block 0 and update those assertions only in the content slice. The presentation PR preserves today's recovery behavior. Availability of all ten retained answers must not depend on whether synthesis passes the usefulness minimum.

### 6.8 Screen, PDF, and JSON

Keep browser print as the PDF mechanism and retain the truthful `Cetak / simpan PDF` label. This plan does not introduce a hosted PDF service or promise native file download.

PDF layout uses the same report/observation snapshot:

1. Compact business/result brief, material findings, and actions.
2. Short method and limits.
3. `Lampiran — pertanyaan dan jawaban lengkap`, with all ten exact questions and complete answers in approved order, sources, dates, and model attribution.

The concise brief should usually fit about two to four pages for representative fixtures; **this is not a page cap**. The evidence appendix can be longer. Never truncate evidence or shrink type excessively to hit a page count.

Print must include the appendix regardless of which answers are collapsed on screen. Reuse the answer renderer and data projection, with unique screen/print IDs to avoid broken links. Hide duplicate trees appropriately from assistive technology on screen. Keep section headings with following content, but allow a long answer to break across pages. Remove whole-answer `break-inside: avoid`; test long paragraphs, lists, tables, and URLs. Append retained source titles/URLs so evidence remains useful off-screen.

JSON remains the complete technical evidence export. Keep its existing omission of internal telemetry/failure diagnostics. It moves below the primary reading/print actions but is not removed. Screen, PDF, copy, and JSON must agree on the stored question/answer and observed outcomes.

## 7. Technical approach and compatibility

### 7.1 Small presentation boundary

Use the existing `ReportView({report, brief, observations, ...})` boundary. Add one pure helper module, tentatively `src/lib/audit/report-presentation.ts`, only for view concerns:

- join validated details and observations by `prompt_id`;
- preserve the validated observation/approved-question order;
- produce stable human ordinals and internal links;
- derive display-only preview offsets and labels;
- format recorded observation time/model/source metadata.

This helper must not classify brand appearance, invent a recommendation, score businesses, call a provider, fetch sources, or mutate a report. Assert unique/matching IDs and handle missing evidence explicitly. A missing full answer never falls back to an excerpt labeled “complete.” Keep the existing report visible with an evidence-unavailable notice and recovery/support route if a previously saved record lacks usable evidence.

Extract feature-local components only where they reduce repeated screen/print logic: question result, answer body, evidence references, and action item. Keep generic interactions in the existing shadcn/Base UI stack; search BeUI before implementing custom disclosure behavior as required by `DESIGN.md`.

### 7.2 No storage migration for presentation

The first slice needs no database, report endpoint, observation schema, or saved-session migration. Keep `nuave-report-v3` and `nuave-evidence-v3`; these are schema versions, not evidence of a new observation. Full answers already travel with the saved observation array and customer export.

Changing layout must not regenerate synthesis on mount, expansion, copy, print, Back, or reload. Reformat existing reports from their retained data. A newly authorized re-synthesis is a new report instance with new synthesis provenance and generation time; preserve the original observation times and the previously delivered report. Do not overwrite a delivered interpretation in place.

If implementation discovers a need for persisted fields or a different report schema, return a bounded amendment for review before proceeding. Do not add speculative schemas or automatic historical migrations under this plan.

### 7.3 Content changes use the existing synthesis call

Change the shared report instructions and supported-basis checks inside the current call budget. Inspect all active provider implementations when consolidating instructions; do not silently repair only the OpenAI path while testing adapters retain contradictory contracts.

Increase `REPORT_SYNTHESIS_PROMPT_VERSION` when instructions materially change. Keep `plain-id-v1` if only enforcing its existing wording limits; bump the writing-standard version only if those rules themselves change. Preserve the language-only retry's protected classifications, IDs, timing/owner fields, sources, and answer text. Do not add an extra critique/rewriting model pass.

### 7.4 Spec 011 integration boundary

Safe to implement separately after this report specification is approved: `ReportView`, report-only CSS/tokens, new presentation/answer components, and focused report fixtures/tests.

Coordinate or sequence after intake changes when editing shared files: `types.ts`, `openai.ts`, `gemini.ts`, report/run request validators, or `LocalAuditStage`. Spec 011's R-23 outcome may change how optional brief values reach these boundaries. Use its confirmed handoff; do not fill absent target customers/comparators or reinterpret legacy fallback values as verified facts.

Do not modify intake screens/state, question generation, question wording, approval fingerprints, audit execution, rate limits, payment, or accounts. No cherry-pick of the whole intake branch is needed for this plan. Before implementation, inspect the then-current branch state and reconcile shared-file changes explicitly.

## 8. Proposed implementation sequence

Each block ends with a bounded, reviewable artifact. The plan is not permission to start all blocks simultaneously.

| Block | Work and likely files | Exit evidence / dependency |
|---|---|---|
| 0. Approve the report contract | Turn the reviewed plan into the next available numbered spec; reconcile `AUDIT.md` report order and journey 06, update routing/status only when approved. Explicitly approve the non-corrective action exception and empty-action recovery change. Record baseline and Spec 011 boundary. | Approved screen/PDF content order, preserved count semantics, fixture list, and review rubric. No live-call authorization implied. |
| 1. Expose exact answers | Add the presentation helper and answer renderer; update `ReportView` and report-only CSS. Add Markdown dependencies/lockfile changes if approved. Exact questions visible, full answer expansion, source/date/model display, raw text/copy, evidence links. | A reviewer can inspect any retained answer in one click; fidelity and link behavior pass on synthetic evidence. No synthesis or observation change. |
| 2. Make the report readable | Compact summary and hierarchy; method-aware metric labels; remove automatic quote/action pairing; redesign finding/action density; move technical export below primary tasks. Likely `report-labels.ts`, `ReportToolbar`, `tokens.css`, report components/CSS. | Desktop/mobile fixture review; no `0/0`; no invented method categories; core question and result visible without opening a disclosure. |
| 3. Improve interpretation and advice | Shared synthesis instructions, `contracts.ts`, `report-priority.ts`, `report-quality-repair.ts`, `report-pipeline.ts`, the small `LocalAuditStage` recovery integration, and relevant provider adapters/tests. Add the constrained non-corrective path and minimum-usefulness handling. | Complete, all-positive, zero-appearance, and thin-evidence fixtures satisfy the rubric without filler. Existing evidence and language-retry invariants pass. Shared-file work coordinated with Spec 011. |
| 4. Complete print/export parity | Shared screen/print answer components; print CSS; toolbar/evidence export only if needed for labels or wiring. Preserve exporter contract. | Opened real browser-produced A4 PDF contains all ten full answers, no orphan headings/clipping, and the same facts as screen/JSON. No re-synthesis. |
| 5. Verify and judge usefulness | Focused unit/component/browser checks, `npm run verify`, complete diff review, founder walkthrough using an approved retained report privately. | Acceptance matrix complete; original report/evidence preserved; report usefulness explicitly accepted or a bounded fix list returned. |

Suggested review-sized PR split: **A = blocks 1–2 and 4 (evidence/reading/export)**; **B = block 3 plus final usefulness evaluation**. A provides real value without waiting for better synthesis. Do not claim the whole report-quality goal complete until B and the qualitative gate pass. Do not merge/deploy either PR without the required authorization.

## 9. Acceptance criteria

| ID | Observable requirement |
|---|---|
| AC01 | Every exact approved question is visible in the collapsed evidence list, in approved order. No technical ID or matrix category substitutes for its wording. |
| AC02 | From any question entry, one action reveals the complete retained answer inline; multiple answers can remain open. Reading/expanding/copying/printing triggers zero generation, observation, report, or source-fetch requests. |
| AC03 | The original-text view and copy preserve exact question/answer strings, including line breaks, repeated whitespace, punctuation, and Unicode. Formatted content preserves all substantive answer text/qualifiers; no silent clipping. Invalid or unavailable evidence is clearly distinguished from absence. |
| AC04 | Every displayed finding/action reference opens the correct question and answer with usable focus/scroll behavior. No first-shared-ID action pairing, arbitrary headline quotation, broken duplicate anchors, or ordering by lexical prompt ID. |
| AC05 | Direct-ten, historical mixed, zero-appearance, mention-only, explicit recommendation, non-assessment, and failed-run cases keep their correct original semantics. No `0/0`, invented percentage/rank, renamed observation model, or re-generation date presented as audit date. |
| AC06 | Each finding/action has known evidence references and passes the qualitative rubric. Zero appearance does not become a site-content diagnosis. Positive results allow only the constrained supported non-corrective exception; corrective advice citing only positive evidence still fails. Empty findings/actions preserve the answer reader and report-recovery route, without being accepted as a complete useful report. |
| AC07 | All answer/source content renders as untrusted text/Markdown without active HTML, remote assets, unsafe links, or hidden network requests. No invented citation mapping or exhaustive competitor claim. No raw provider envelope/telemetry in the reader. |
| AC08 | A saved browser-produced PDF has a concise front section and all ten full answers in the appendix, even when screen disclosures were closed. Inspect every page; headings stay with content, long answers break cleanly, and URLs/tables are readable. Screen/PDF/JSON share the same stored evidence and outcomes. |
| AC09 | Back/reload reopen the same completed report without new calls. Existing synthetic/live notices remain truthful. Started/completed historical sessions survive; absent optional intake values are not replaced with invented business facts. |
| AC10 | At 390px and 1440px, the exact questions, evidence controls, and action hierarchy are usable; also check 320px reflow and 200% zoom. Keyboard users can open answers, follow references, and return through the page with visible focus. Screen readers do not read a hidden duplicate print tree. |
| AC11 | In a timed founder walkthrough, the reader can identify the sampled result, locate a complete answer, distinguish AI text from Nuave's interpretation, and choose/explain one justified next step. Record the actual outcome and confusion; do not declare usefulness from passing tests. |
| AC12 | Final `npm run verify` passes on the implementation branch with no live provider calls. Diff contains only approved scope, no temporary inspection route, private evidence, credentials, or debug bypass. Record build/browser evidence and unresolved limits separately. |

## 10. Fixture and test plan

Use fictional public fixtures. Do not copy actual business responses into Git. Preserve historical fixtures as historical; add new direct-ten cases instead of mutating them to look like the new method.

| Fixture | Specific risk it must expose |
|---|---|
| Ten completed answers, no appearance | Truthful `0/10`, complete answers with alternative choices, no invented business diagnosis. |
| Mention but no explicit recommendation | Appearance and recommendation stay distinct in aggregate and question labels. |
| Recommendation with a condition in a later paragraph | The complete answer preserves the condition; a preview is not presented as sufficient proof. |
| Opening “Ya.” followed by substantive paragraphs | Display preview avoids a trivial fragment; original answer is untouched. |
| All-positive answers | A preservation/investigation action remains useful and passes the reconciled supported-basis gate. |
| Conflicting source/owner-supplied fact | Confirmation versus correction is explicit; source links do not imply independent verification. |
| Structured comparator absent; other names in raw answer | No assertion that AI mentioned no alternatives; full evidence remains accessible. |
| One failed observation / interrupted report synthesis | Existing recovery, no partial delivery, no automatic observation rerun. |
| Long Markdown answer, table, list, long URL, HTML/image payload | Complete safe rendering, no active resources, narrow screen and multi-page print behavior. |
| Legacy mixed pack and missing optional intake values | Historical denominators remain unchanged; Spec 011 unknowns stay unknown. |
| Reordered IDs, duplicate/missing observation, missing raw answer | Join validation, correct ordinals, honest unavailable state rather than mismatched evidence. |

Meaningful automated coverage:

- Pure presentation/preview tests: exact substring offsets, approved order, no mutation, substantive preview fallback, date/model formatting, safe URLs.
- Component tests: evidence links expand the correct item, keyboard/focus behavior, accessible disclosure labels, raw copy, and separate screen/print IDs.
- Report pipeline tests: truthful method denominators, no forced negative from non-assessment, supported code-owned non-corrective actions, rejection of forged/unsupported exceptions, zero surviving actions with evidence access preserved, and language-retry invariants.
- Browser checks: report renders from the existing synthetic journey; all questions/answers and downloads are reachable; request counters prove no repeated audit/report calls during reading or navigation.
- Print checks: generate a PDF through the browser's actual print path, extract text to check all ten questions/answers, then visually inspect every page. Text presence alone does not prove layout quality.

Reuse relevant suites: `direct-ten-audit.test.ts`, `report-excerpt.test.ts`, `report-labels.test.ts`, `report-gaps.test.ts`, `report-priority.test.ts`, `report-pipeline.test.ts`, `report-language-id.test.ts`, `report-delivery-resilience.test.ts`, `customer-evidence-export.test.ts`, and `tests/e2e/new-intake-glm.spec.ts`. Some filenames/paths may move before implementation; resolve them against the approved baseline rather than adding duplicate suites.

This documentation-only commit does not claim those implementation tests pass. Validate this plan's references and diff; the full runtime gate belongs to implementation.

## 11. Human usefulness gate

Before coding, use this same rubric to mark a current retained report, without another observation call. Repeat after the redesign with the same evidence. The founder can inspect private evidence locally; public verification records should contain pass/fail findings and field-level descriptions, not customer answers.

Proposed walkthrough targets:

- **Within 30 seconds:** explain what `x/10` means and what it does not mean.
- **Within 60 seconds:** find a particular customer question and read what AI actually said, including a condition or caveat.
- **Within three minutes:** explain the basis of the first action and what would count as done.
- **Within about ten minutes:** understand the useful core of the report without needing to read all ten long answers.

These are lightweight founder checks, not a statistically validated usability study. A few target-owner sessions can follow when external contact is separately authorized.

For every material finding/action, the reviewer answers:

1. What exact observation supports it?
2. Is this an observed fact, Nuave interpretation, or proposed investigation?
3. Did the text imply a cause, missing page, wrong business fact, service quality, or lost revenue that was not established?
4. Does a caveat elsewhere in the answer materially change the claim?
5. Can the owner do something specific, and recognize when it is done?
6. Would the item still deserve inclusion if no minimum count existed?

Any unsupported material claim fails the quality gate. A readable report with only generic advice also fails the usefulness gate. A thin but honest result should lead to a bounded investigation, not fabricated certainty. If the retained evidence cannot support useful interpretation even after this work, return that finding to the founder; do not hide a method limitation behind design polish or initiate new research automatically.

## 12. Risks, limits, and deliberate exclusions

| Risk or limit | Response |
|---|---|
| Full answers increase report length. | Progressive disclosure on screen; concise front section plus complete PDF appendix. No mandatory reading of every answer. |
| Better access exposes weak synthesis. | This is useful diagnostic evidence. Complete the content/rubric slice rather than covering it with stronger-sounding copy. |
| A deterministic preview can still be unrepresentative. | Label it as a preview, preserve full context one click away, and never use it as automatic proof of a finding. |
| Supporting arbitrary prose is not fully machine-verifiable. | Retain deterministic integrity checks and explicit qualitative review. Do not add a costly model-judge loop as an unexamined fix. |
| Existing data cannot support complete competitor/source attribution. | Show exact answers and honest available source links. Defer extraction/enrichment instead of inventing completeness. |
| Shared files may change under Spec 011. | Land isolated presentation work separately; coordinate shared synthesis/request-boundary changes after inspecting its R-23 outcome. |
| A historical report has no usable full answer. | Show evidence unavailable and recovery/support guidance; do not reconstruct a quote or rerun automatically. |
| Long-answer rendering and print can become unsafe or unreadable. | One bounded renderer, no active HTML/assets, narrow-viewport and actual PDF verification. |

Excluded: new observation models/providers, new questions, causal SEO diagnosis, webpage crawls, rankings/benchmarks, model-to-model comparisons, report chat, recurring monitoring, task management, accounts, durable report hosting, payment changes, new privacy/retention promises, and automatic retrospective rewriting of delivered reports.

## 13. Independent reviewer handoff

**Role:** independent product-design, software-architecture, and evidence-integrity reviewer. Review the proposal; do not implement it or assume that detail implies correctness.

**Read in order:** `AGENTS.md`; this plan; Spec 009 R-07 and its continuation amendment; Spec 010's report/recovery boundaries; `AUDIT.md` sections “Turn evidence into findings,” “Report format,” and “Report acceptance checklist”; `DESIGN.md`; then only the code linked in section 3. Read Spec 011's R-23/R-27 boundaries at the linked branch if they remain unmerged. Do not read private evidence or archive material.

Check, in particular:

1. Is this the smallest complete change that answers “What exactly did AI say?” and makes the report useful?
2. Does the question-first evidence section improve trust without overwhelming the decision brief?
3. Are direct-ten and historical denominators preserved, including `not_assessed` handling?
4. Does the plan distinguish raw answers, previews, findings, and sources accurately?
5. Is supported-basis validation precise enough for positive and thin-evidence reports without weakening integrity?
6. Does the proposed content work fit the current synthesis/retry architecture without another model pass or schema migration?
7. Are PDF completeness, pagination, unavailable evidence, and session recovery concretely testable?
8. Are the boundaries with Spec 011 practical at the current repository head?
9. Which parts should be cut, sequenced differently, or made more explicit before specification approval?

Return findings first, ordered by severity. For each finding give the plan section, repository evidence, likely failure, smallest correction, and whether it blocks implementation. Distinguish source-confirmed defects from design hypotheses and optional preferences. End with **ready for specification / ready after narrow fixes / requires redesign**. Do not rewrite the plan before reporting the findings.

## 14. Completion record for this planning task

- Current source and relevant contracts investigated at the pinned baseline.
- Expert owner critique translated into design challenges, strategy, proposed UI/content behavior, implementation blocks, and acceptance gates.
- Spec 011 interface boundary inspected on its separate branch.
- Private evidence, production UI, and a newly produced PDF were not inspected; browser visual verification remains outstanding and is explicitly required for implementation.
- No runtime, intake, audit, provider, payment, or deployment change is included.
- Next smallest action: independent review of this draft, then promote the corrected direction into one approved numbered specification.
