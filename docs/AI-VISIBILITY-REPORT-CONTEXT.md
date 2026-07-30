# Nuave — AI Visibility Report Context

> Feature context for future human and AI work on Nuave's customer-facing audit report.
>
> **Status:** Current working direction  
> **Last consolidated:** 2026-07-30  
> **Derived from:** Three report-planning conversations covering the reusable AI setup, report vision, and content refinement

This document compresses the decisions, intent, terminology, and unresolved questions from those discussions. Use it together with `sources/nuave-project-context.md`.

If the two documents conflict, do not silently combine them. Treat the conflict as an explicit product decision that needs resolution.

This context is written in English. Indonesian wording appears only where an exact customer-facing label is itself a product decision.

## 1. What the Report Must Achieve

The report is Nuave's core customer deliverable. It should help a non-technical Indonesian business owner:

1. understand the audit result quickly;
2. feel justified urgency to act;
3. believe the result because the evidence and reasoning are visible;
4. know what to fix first and who can handle it; and
5. inspect the underlying prompts and ChatGPT responses when needed.

The report should feel personally prepared for the audited business, not like a generic template with the business name inserted.

Useful personalization comes from facts such as:

- exact business and branch;
- city or service area;
- audit date;
- recipient name or role, when available;
- priority service or customer need;
- known differentiators;
- actual appearance and accuracy findings;
- relevant competitors found in the audit; and
- the person or role best suited to own each action.

Do not manufacture personalization, urgency, causation, revenue impact, or authority.

## 2. Core Communication Principle

Every material conclusion should follow a visible reasoning chain:

> What Nuave observed → why it may matter → what the business can do

Authority should come from a transparent and repeatable method, not from an unexplained number or dramatic language.

The report should operate at two reading speeds:

- **Fast reading:** score, short summary, key findings, and priorities.
- **Evidence reading:** per-question findings, exact tested questions, ChatGPT responses, sources, method, and limitations.

The intended reading sequence is:

> Overall position → justified urgency → prioritized action → supporting evidence → limitations

## 3. Current Audit Scope

The latest report discussion set the following working scope:

- Audit **ChatGPT only**; do not include Gemini.
- Use **10 tested questions**.
- Combine branded and unbranded questions.
- Derive the questions from plausible customer intentions.
- Preserve the exact question, response, observation date, and relevant context.

The prompt taxonomy is not final. Candidate intentions discussed include:

- discovery;
- service intent;
- comparison;
- local relevance;
- deeper research; and
- branded verification.

Do not invent the final category allocation, weighting, or number of runs. These remain methodology decisions.

### Known product-context conflict

The canonical product context still describes a multi-platform Full Audit and a separate ChatGPT Check. The latest report discussion says future audits will use ChatGPT only.

Future work must resolve this before changing the offer, pricing, landing-page promise, or production methodology. Do not reintroduce Gemini merely because it appears in historical experiments.

## 4. Agreed Report Structure

### Report identity

Show the audit scope before the main content:

- **Laporan Audit Visibilitas AI**
- Business and branch
- Location
- Audit date
- System tested: ChatGPT
- Scope: 10 questions
- Testing language

### 1. Ringkasan Audit

Purpose: let the owner grasp the result in seconds.

Contents:

1. A prominent sample-based score or result.
2. Visible supporting counts.
3. A separate information-accuracy status.
4. One direct summary paragraph.
5. A short snapshot limitation directly below it.

Use **Ringkasan Audit**, not `Ringkasan Hasil` or `Ringkasan Cepat`.

Do not add a `Kesimpulan singkat` label. Start directly with the conclusion.

The summary should be concise and scannable, for example:

> ChatGPT did not select [business name] when people asked general questions about [need or service]. When [business name] was included in the prompt, ChatGPT recognized the brand but returned [different, incomplete, or unverifiable information].

Keep actions out of this paragraph. Do not end with conversational transitions such as `Jadi, urutan yang disarankan...`; actions have their own section.

Show a short qualification near the result:

> This result is a snapshot of testing on [date], not a permanent ranking or a representation of every possible ChatGPT response.

### 2. Temuan Utama

Purpose: make the important problems unmistakable and create evidence-based urgency.

Requirements:

- Use short bullets, not blocky paragraphs.
- Curate approximately three to five material findings.
- Lead each bullet with a strong conclusion.
- Follow it with the observed evidence and why it matters.
- Prefer exact counts and specific conflicts over vague severity words.
- Do not claim lost customers, lost revenue, or proven causation without evidence.

Pattern:

> **What happened.** Evidence from the tested sample and why the business should care.

Illustrative examples:

- **The business did not appear in most searches that omitted its brand name.** [Business name] appeared in only [X of Y] questions where its name was not supplied.
- **ChatGPT returned different branch information.** The address in the response did not match the audited branch address.
- **Published service information did not surface in the test.** The business website lists [service], but the business did not appear when that service was requested.
- **Other businesses received more visibility in the responses.** [Competitor A], [B], and [C] appeared across several of the same questions.

Urgency should come from concrete exposure and controllable problems, not fear-based copy.

### 3. Prioritas Perbaikan

Use **Prioritas Perbaikan** (`Improvement Priorities`), not `Tiga Hal yang Perlu Ditangani` (`Three Things to Address`). The section is not permanently limited to three items.

Keep the list curated and ordered. Normally show no more than five priorities, with the first few clearly marked `Kerjakan lebih dulu` (`Do first`) and lower items marked `Kerjakan berikutnya` (`Do next`).

Every material priority should include:

- **Yang perlu dilakukan** (`What to do`): the concrete change.
- **Mengapa ini penting** (`Why this matters`): its connection to an audit finding.
- **Dasar rekomendasi** (`Basis for the recommendation`): the supporting question, response, or verified public source.
- **Penanggung jawab** (`Owner`): business owner, admin, marketing person, or web developer.
- **Dianggap selesai ketika** (`Considered complete when`): an observable completion check.

Where useful, also show directional effort, confidence, expected impact, dependency, and an honest caveat. Never guarantee that an action will make ChatGPT recommend the business.

Only recommend actions supported by the audit evidence. Do not fill the section with generic SEO or marketing advice to make it look comprehensive.

### 4. Temuan Detail

Include one consistent entry for each of the 10 tested questions. Entries may be grouped by customer intention after the taxonomy is finalized.

Each entry should contain:

1. **Temuan** (`Finding`) — what happened and why the result is relevant.
2. **Pertanyaan yang diuji** (`Question tested`) — the exact prompt submitted to ChatGPT.
3. **Jawaban ChatGPT** (`ChatGPT response`) — the complete response or a clearly identified relevant excerpt.

`Pertanyaan yang diuji` is the preferred customer-facing label. The technical word `prompt` may still be used internally or where it is clearer.

Also show:

- ChatGPT as the tested system;
- observation date and time;
- question category;
- relevant run or context metadata; and
- a plain-language status.

Candidate statuses:

- Appeared as a recommendation
- Mentioned but not recommended
- Did not appear
- Incomplete information
- Conflicting information found
- Could not be tested

Do not use `appearance`, `mention`, and `recommendation` interchangeably.

Keep sources returned by ChatGPT visibly separate from public or customer-supplied sources Nuave used for verification.

Do not rewrite a ChatGPT answer in a way that makes it appear to have said something it did not say.

### 5. Metode dan Batasan

Explain in plain language:

- that 10 questions were submitted to ChatGPT;
- that the set combines branded and unbranded questions;
- how the questions represent customer intentions;
- the business, branch, location, language, and audit date;
- how runs and failures were handled;
- how business and competitor identities were checked;
- how the score was calculated;
- what was manually reviewed; and
- what the audit does and does not prove.

Preserve the distinction between:

1. observation;
2. Nuave's inference;
3. recommendation;
4. confidence within the tested evidence; and
5. limitation.

## 5. Score Direction and Guardrails

The founder wants a prominent 0–100-style summary because a single number can improve comprehension and perceived authority.

The score is accepted as a product direction to explore, but **the formula is not decided**.

Current working label:

> **Skor Kemunculan dalam Sampel**

This is safer than an unqualified `AI Visibility Score`, which can sound universal and permanent.

At minimum, the score presentation should expose:

- the numerator and denominator;
- how many unbranded questions produced an appearance;
- how many branded questions recognized the business;
- whether the business was merely mentioned or actively recommended;
- any failed or unavailable observations; and
- the audit date and scope.

Show information accuracy separately, for example:

> **Ketepatan informasi: Perlu diperbaiki**

### Important scoring nuance

Branded and unbranded questions measure different things:

- **Unbranded questions** test whether the business is discovered or recommended without its name being supplied.
- **Branded questions** test recognition and the accuracy or completeness of the returned information.

A branded answer should not automatically earn the same visibility credit as an unbranded discovery result. Naming the business in the question makes recognition more likely and can inflate the score.

Until the methodology is defined:

- do not calculate a simple score across all 10 questions;
- do not give branded and unbranded prompts equal weight by default;
- do not hide the underlying counts;
- do not treat a mention as equivalent to a recommendation;
- do not penalize or reward failed tests as though they were valid answers; and
- do not present the number as a permanent ranking.

Authority should be built through methodological clarity, not false precision.

## 6. Agreed Disclaimer

Use the following meaning as the current approved direction. Render it in clear, natural Indonesian in the customer-facing report.

> **About this result**  
> This report is a snapshot of testing on the stated date, not a permanent ranking or a representation of every possible ChatGPT response. Results may vary by model, time, location, language, and conversation context. The same question may also produce a different answer. Use this report to help prioritize improvements, and verify business information before using it as the basis for a decision.

> **Retesting**  
> Run the same questions again after important improvements have been implemented. If the business is actively updating its digital information, testing every 2–4 weeks may be used as an initial monitoring interval. This is an operational recommendation, not a guarantee that ChatGPT changes within that period.

Do not claim that ChatGPT changes every two weeks. The 2–4 week interval is an operational recheck suggestion, not an observed update cycle.

Also note the broader product boundary: Nuave is currently a one-time audit, not a continuous monitoring subscription. A recheck recommendation must not silently become a monitoring-product promise.

## 7. Content and Voice Rules

Write for an Indonesian owner, operator, or marketing lead who may not be technically sophisticated.

Use:

- clear, natural Indonesian;
- short, specific sentences;
- familiar business language;
- restrained, evidence-led urgency;
- visible counts and examples;
- clear separation between fact and interpretation; and
- confident wording only where the evidence supports it.

Avoid:

- abstract AI language;
- unnecessary model or API jargon;
- generic severity labels without evidence;
- large blocks of prose;
- opaque composite scores;
- claims that Nuave knows why ChatGPT behaved a certain way;
- claims that a competitor appeared because of an unproven factor;
- guarantees of future appearance or ranking; and
- generic recommendations detached from the tested evidence.

Prefer:

> The business appeared in 2 of 6 questions that omitted its brand name on the audit date.

Avoid:

> The business has 33% AI visibility.

unless the denominator, tested context, intended meaning, and limitation are immediately visible.

## 8. Format and Design Direction

Content and structure should be settled before detailed format decisions.

The report should eventually:

- work as a responsive web report;
- be downloadable as a PDF;
- be presentable on screen;
- remain printable for sharing with a decision-maker; and
- use the same factual source of truth across web and PDF.

Working design direction, not yet a final specification:

- calm, credible, executive/editorial tone;
- scannable rather than dashboard-heavy;
- strong hierarchy and generous spacing in conclusion sections;
- denser treatment only in evidence sections;
- minimal charts unless they clarify the small sample honestly;
- restrained use of brand color;
- status labels supported by text, never color alone; and
- visible evidence without forcing every reader through full transcripts.

A4 landscape versus portrait remains open. Do not let orientation or PDF pagination drive the content architecture prematurely.

## 9. Open Decisions

Do not silently decide these in future sessions:

1. The exact 10-question taxonomy and category allocation.
2. The number of branded versus unbranded questions.
3. The number of runs per question.
4. The score formula, weighting, and eligibility rules.
5. How mentions, recommendations, order, accuracy issues, and failed runs affect the score.
6. Whether the headline keeps `Skor Kemunculan dalam Sampel` or uses another label.
7. Whether full ChatGPT responses or excerpts appear by default.
8. The final web interaction model for expanding evidence.
9. PDF orientation, pagination, and appendix behavior.
10. Whether re-audits remain optional one-time purchases or become a broader product.
11. How the ChatGPT-only direction changes the current Full Audit and ChatGPT Check offers.

## 10. Implementation Checklist for Future Sessions

Before designing or building the report:

1. Read this file and `sources/nuave-project-context.md`.
2. Identify any unresolved conflict relevant to the task.
3. Use real retained evidence when available; otherwise label dummy content clearly.
4. Keep the five-section hierarchy intact unless the founder explicitly changes it.
5. Preserve exact prompts, raw responses, timestamps, and source provenance.
6. Verify every material finding against the evidence.
7. Check that every priority traces back to a finding.
8. Render and inspect the result at relevant screen and print sizes.
9. Test whether a non-technical reader can identify the result, biggest concern, first action, and limitation without explanation.
10. Report consequential assumptions and remaining methodology decisions.

## 11. Non-Negotiable Summary

- ChatGPT only is the latest report direction; Gemini is historical.
- The working audit contains 10 branded and unbranded questions based on customer intent.
- The agreed sequence is `Ringkasan Audit → Temuan Utama → Prioritas Perbaikan → Temuan Detail → Metode dan Batasan`.
- Key findings are short, specific bullets designed to create justified urgency.
- Priorities are ordered, actionable, evidence-backed, and not limited to three.
- Each detailed entry contains `Temuan → Pertanyaan yang diuji → Jawaban ChatGPT`.
- A prominent score may be used, but it must remain sample-based and transparent; its formula is still open.
- Branded recognition and unbranded discovery are not equivalent.
- Accuracy is reported separately from visibility.
- The report is a dated snapshot, not a permanent ranking or guarantee.
- Persuasion comes from evidence and logic, not inflated claims.
