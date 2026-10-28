# Spec 023: Report writing quality (depth and natural Indonesian)

> Status: **In review** (draft for the founder's approval; no code changed)
> Owner: founder; plan written by Claude Code on `ccr-88631259-0lhn0m`
> Updated: 2026-10-28
> Implements: the founder's report feedback of 2026-10-28: "deeper insights
> as if advised by BCG consultants, answer first", and "natural and clear
> like Tempo", for the live report writer (Claude Opus 5.5 with pages read,
> Spec 021 Part B and PR #185)

## Required context

Read in order:

1. `AGENTS.md`, `docs/VOICE.md` (sections 1 to 5; it is the canonical
   Indonesian writing contract), `docs/content/report/PLAYBOOK.md`.
2. [Spec 021](../021-report-v2/SPEC.md), Part B (B-01 to B-08): the writer
   this spec changes.
3. The writer today:
   - `src/lib/audit/two-source-writer.ts`: the instructions and request;
   - `src/lib/audit/two-source-writing.ts`: field limits, banned title
     starts, Part B checks and the code repair after the revision;
   - `src/lib/audit/two-source-report.ts`: `twoSourceWritingViolations`,
     `repairTwoSourceWriting`, `namesBusiness`, `twoSourceCountSentence`;
   - `src/lib/audit/report-pipeline.ts`, `createValidatedAuditReport`: the
     one language-only revision and the repairs after it;
   - `src/lib/audit/report-language.ts`: `REPORT_MAX_SENTENCE_WORDS` and
     `validateIndonesianReportLanguage`;
   - `src/lib/audit/types.ts`: `twoSourceWritingSynthesisSchema` and the saved
     `two_source_writing` block (`version` is a literal);
   - `src/app/audit/report/TwoSourceReport.tsx`: the page, which also prints
     the PDF.
4. The test harness: `scripts/report-writer-test/README.md` and `harness.ts`
   (ledger, `HARD_STOP_USD`, blind letters, page pairs).
5. The founder's benchmark pack (input, not a contract):
   `nuave-editorial-skill.zip` (`SKILL.md`, `references/kamus-ringkas.md`,
   `references/contoh-sozo.md`, `QA-CHECKLIST.md`, `RUNTIME-PROMPT.md`).

Do not load: `archive/`, Spec 014, the older report prototypes.

## Problem

### Evidence

- The Sozo report (NV-3WDSAY) reads as a scoreboard. Its closing says
  "klinik Anda disebut di 3 dari 10 jawaban" twice, sentences have the same
  length, "klinik Anda" appears in nearly every sentence, and a takeaway
  title copies our own example word ("Pemenang menulis harga yang bisa
  dikutip"). The founder judged it "written by AI" despite Opus 5.5.
- The writer's instructions cause most of this (`two-source-writer.ts`):
  - "Keep every sentence to 25 words or fewer." Code also sends any sentence
    over 25 words back for revision (`REPORT_MAX_SENTENCE_WORDS`);
  - "Name the source … write 'Di ChatGPT' or 'Di Google AI Overview'" in the
    conclusion and every finding, and the conclusion must give each source's
    count, which the verdict already gave;
  - "Call the audited business 'klinik Anda'";
  - the takeaway example "Pemenang menjual keahlian, bukan harga";
  - competitor rows are labelled "Disebut AI karena:" on the page, while
    rule 3 forbids saying why;
  - nine boxes to fill and no step that settles one main message first;
  - about 30 rules in English, most of them "don't".
- Not the cause: the facts. Since PR #185 the writer reads the pages, the
  Google answer text, monthly searches and the playbook. The depth of the
  evidence is there; the instructions do not ask the writer to reason with
  it.

### Interpretation

The report is shallow because nothing asks for a storyline, and robotic
because our own rules force a uniform rhythm, repeated formulas and a fixed
way to address the owner. Fixing the rules comes first; a guide on how to
think and write comes second; a code check for typical AI phrasing catches
what is left.

## Desired outcome

An owner reading the report can say its main message after the first
paragraph, every finding answers "so what for my clinic", and an Indonesian
editor would change little. All of today's fact safety stays: the counts,
the headline numbers, the source contradiction repair and "no causes".

## Scope

- The live two-source writer's instructions, output schema and writing
  checks (Claude Opus 5.5 and the OpenAI fallback that uses the same
  two-source schema).
- A writing guide in Indonesian that the writer reads next to the playbook.
- One label on the report page and PDF ("Disebut AI karena").
- `docs/VOICE.md` amendments for report-writer prose only.
- The report-writer test harness: the USD 10 cap, a before/after blind test,
  and a metrics table.

## Non-scope

- The layout of the report, its sections, the box length limits
  (`TWO_SOURCE_WRITING_LIMITS`) and the banned title starts. Box limits are
  revisited after the human-edited report (founder, 2026-10-28).
- The code-built count sentences and the settled exact labels in
  `VOICE.md` (for example **Klinik Anda muncul di X dari N pertanyaan**).
- The legacy single-source writer (`reportWritingInstructions`,
  `validateReportLanguage`) and its 25-word rule. It is not live.
- Steps 1 to 6 and the pages read.
- The playbook's content and its three rules.
- Old saved reports: their saved content is not rewritten.

## Settled decisions (founder, 2026-10-28)

- **D-1** Use the business's brand name in report prose, not "klinik Anda"
  everywhere.
- **D-2** No hard sentence limit. Guidance: 3 to 30 words, average about 14,
  a mix of lengths, an occasional very short sentence to land a point.
- **D-3** The guide sits at the report-writing step, next to the playbook,
  and the writer reads it with every report.
- **D-4** Em dashes are banned (matches `VOICE.md` §3).
- **D-5** A human editor will rewrite the Sozo report; it arrives later
  (Phase 2).
- **D-6** The test harness cap is USD 10 (was USD 7).

## Requirements

### Rules that fight good writing (R-01 to R-06)

- **R-01, sentence length.** The two-source writer's instructions drop "Keep
  every sentence to 25 words or fewer". For two-source reports, a sentence
  over 25 words is no longer a writing violation: it is not sent back and
  not cut. A sentence over 30 words is recorded as an advisory diagnostic
  (`long_sentence`) only. The legacy writer keeps its rule.
- **R-02, sources without a formula.** The instructions drop the "write 'Di
  ChatGPT' / 'Di Google AI Overview'" formula. Every finding still makes
  clear which source it is about, in natural words ("ChatGPT menyebut…",
  "Ringkasan AI Google…"). The existing check (the conclusion and each
  finding name a source somewhere) and the last-resort repair stay as they
  are.
- **R-03, counts said once.** The verdict carries each source's result. The
  conclusion is the closing judgement and the next step: it names the
  sources but does not repeat the verdict's counts. Code records a
  `repeated_count` diagnostic when the same source count ("3 dari 10")
  appears in both the verdict and the conclusion; it joins the violation
  list only when a revision runs for another reason.
- **R-04, brand name.** The writer calls the business by its confirmed brand
  name; "klinik Anda" (or "bisnis Anda") may appear for direct address, not
  in every sentence. With no confirmed brand name, it uses "klinik Anda" /
  "bisnis Anda" as today. The contradiction check already recognises the
  brand name and aliases (`namesBusiness`); a test proves it for brand-name
  sentences.
- **R-05, no teaching examples.** The "Pemenang menjual keahlian, bukan
  harga" example is removed. No instruction contains an example title a
  writer could copy into a real report; examples live only in the guide,
  marked as illustrations of fictional businesses.
- **R-06, the competitor label.** "Disebut AI karena:" on the page and PDF
  becomes the founder-approved wording (Q-1). The writer's instruction for
  `competitor_reasons` asks for what the answers say about that business,
  not why AI chose it.

### Depth (R-07, R-08)

- **R-07, plan before writing.** The two-source output schema gains
  `storyline` as its first property: `main_message` (one sentence) and
  `support` (two or three short points). The instructions say: settle the
  storyline first; the verdict states the main message; findings come in
  order of importance and each supports it; the conclusion returns to it.
  `storyline` is never saved in the report, shown on the page or PDF, or
  included in the JSON download. The test harness keeps it next to each
  result for scoring.
- **R-08, interpretation, clearly marked.** The writer may describe a
  pattern across questions and what Nuave reads into it ("Polanya…",
  "Artinya…"), say how consistent it is ("di 4 dari 4 pertanyaan
  treatment"), and name the most sensible next step from the playbook. It
  still never says why this business got its result (playbook rule 3,
  unchanged). The guide sets the line between a pattern (allowed) and a
  cause (not allowed), with examples on both sides.

### The guide (R-09)

- **R-09, the writing guide.** `docs/content/report/WRITING_GUIDE.md`, in
  Indonesian, approved by the founder before any paid test run. It is copied
  into `src/lib/audit/report-writing-guide.ts` and a unit test checks the two
  are equal byte for byte (as for the playbook). The writer reads it after
  the playbook. Four parts:
  1. **Cara berpikir konsultan:** one main message first; "so what for this
     clinic" for every fact; most important first; use monthly searches to
     rank topics; say what you would do first and why it is the cheapest
     bet.
  2. **Cara menulis seperti editor:** common words, active sentences, the
     D-2 rhythm, the brand name, one count said once, no em or en dash in
     prose, and a short list of phrases that sound like machine translation
     (R-10) with a natural alternative for each.
  3. **Jujur tanpa berbelit:** pattern vs cause; how sure we are; no
     lawyer-style hedging ("Sampel ini belum membuktikan bahwa…"); what we
     cannot see (inside ChatGPT, other users' answers).
  4. **Contoh:** before/after pairs from at least two fictional businesses of
     different kinds, marked as illustrations. No real business, competitor
     or city name from any Nuave order.

  It stays under 2,500 words. Where it and the ChatGPT pack disagree, this
  spec and `VOICE.md` win (for example, no dashes; the brand name per D-1).

### Checks by code (R-10 to R-12)

- **R-10, typical AI phrasing.** A list in code (`AI_GIVEAWAY_PHRASES`,
  mirrored in the guide) is matched, whole words and case-insensitive, in
  the writer's prose fields (verdict, conclusion, findings, recommendations,
  reasons, takeaways, plan). First list: "hal ini menunjukkan", "perlu
  dicatat", "selain itu" at the start of a sentence, "secara signifikan",
  "signifikan", "memastikan", "komprehensif", "holistik", "krusial",
  "lanskap", "memanfaatkan", "melakukan optimalisasi", "bukan hanya …
  tetapi juga", "tidak hanya … tetapi juga", "secara keseluruhan", "dapat
  disimpulkan". Three or more hits in one report make a writing violation
  that names each hit (it triggers the one revision). One or two hits are an
  advisory diagnostic. Code never deletes a phrase.
- **R-11, dashes.** An em dash (—) anywhere in writer prose is a writing
  violation; so is an en dash (–) except between two numbers ("Minggu
  1–2"), and a spaced hyphen used as a dash (" - "). If one survives the
  revision, code replaces it with a comma (or "sampai" between numbers
  written with a hyphen) and records `dash_replaced`.
- **R-12, guide examples never leak.** The guide's illustration names are
  listed in code. A report that contains one of them, when that name is not
  in the order's own facts (context, answers, pages), gets a writing
  violation; if it survives the revision, it is recorded as
  `example_name_leaked` and the founder is told (founder notice) rather than
  the order failing.

### Canonical documents (R-13)

- **R-13** `VOICE.md` gains: the D-2 guidance for report-writer prose (the
  25-word ceiling stays for other copy), the D-1 brand-name rule for
  report-writer prose (settled labels unchanged), and the new competitor
  label. `DECISION_LOG.md` records D-1 to D-6 and the founder's answers to
  the open questions. `NOW.md` names this spec.

### The test (R-14, R-15)

- **R-14, harness.**
  - `HARD_STOP_USD` = 10 (D-6). The ledger file on this machine starts
    empty; spend recorded on another machine is not counted (Q-4).
  - `REPORT_TEST_EVIDENCE_DIR` lets a run write to its own folder, so the
    "before" writer (a git worktree of `main` before this change) and the
    "after" writer (this branch) never supersede each other. Both read the
    same exported evidence and the same `pages/<order>.json`.
  - A pairing step prints blind pairs per order and run ("Pasangan A - 1.pdf"
    and "- 2.pdf"), with the key kept apart, reusing the page-pair code.
  - A metrics table per report: sentences, mean and spread of sentence
    length, share over 30 words, giveaway hits, dashes, brand name vs
    "klinik Anda" count, repeated counts, whether the revision ran, each
    repair diagnostic, cost and time.
- **R-15, blind test.** Writer: Opus 5.5 medium with pages, before vs after.
  Orders: NV-3WDSAY (Sozo) twice per writer (to see run-to-run variation),
  plus at least one delivered two-source order of a different business
  (Q-2). The founder scores each pair blind with three questions (main
  message after the first paragraph? every finding answers "so what"? would
  an editor change much?) and an overall pick. The before reports are
  produced first, so the after writer cannot be tuned on them.

### Phase 2 (R-16)

- **R-16** When the human-edited Sozo report arrives: it is compared with
  the after writer's Sozo reports (same three questions, plus the metrics);
  its lessons go into the guide in general terms and fictional examples, never
  its Sozo text (R-12 keeps that out); the box limits are revisited; one more
  blind round runs on a non-Sozo order.

## Build order

Two pull requests, so the free and safe part can merge first.

1. **PR 1, harness only (no customer change):** R-14. Finish condition: the
   dry run (`run.spec.ts`, no provider call) builds both writers' prompts
   from two evidence folders and prints the plan with each call's worst
   case under USD 10.
2. **PR 2, the writer (customer-visible; stays a draft until AC-11 passes):**
   1. R-01 to R-06 and R-11, with tests.
   2. R-07 and R-08, with tests.
   3. R-09: the guide draft, sent to the founder to read **before** any paid
      run; R-10 and R-12 lists with tests.
   4. R-13 document edits.
   5. The free dry run, then the live blind test (R-15) after the founder
      says go, then the founder's scoring.
   6. Merge only on the founder's pass. Merging deploys.

## Failure and recovery

- A failed or discarded revision keeps today's behaviour: the first draft
  stands, code repairs the counts, headlines, titles and dashes, and the
  order never fails over writing.
- A report that still has three or more giveaway phrases after the revision
  is delivered as is, with the diagnostic; nothing is deleted from it.
- If `storyline` is missing or malformed in an answer, the schema check
  fails the call as today; the existing retry path applies.
- Rollback: revert PR 2. Saved reports keep their shape (the saved block's
  version literal does not change; `storyline` is never saved).

## Evidence, data, privacy, and cost

- **Cost per report:** the guide adds at most about 3,500 input tokens per
  call: about USD 0.014 per Opus call at USD 4 per million. Every revision
  is a second full Opus call (about USD 1.2), so the revision rate matters
  more; the metrics table reports it (AC-12).
- **Test cost:** about 6 to 8 Opus reports at about USD 1.3 each, under the
  USD 10 cap. The ledger refuses a call that could pass it. Reading pages
  for a new order uses at most 16 Firecrawl requests (Q-3).
- **Privacy:** the export queries read no email, payment or link column; the
  evidence stays in the git-ignored `.local-evidence/`. Phone numbers are
  removed before the writer, as today. The guide holds no real business
  data.

## Acceptance criteria

- **AC-01** The two-source writer's request no longer contains "25 words",
  "Pemenang", or a required "Di ChatGPT"/"Di Google AI Overview" formula,
  and contains the brand-name rule, the storyline rule and the guide text
  (unit test on `twoSourceWriterMessages`).
- **AC-02** A two-source draft with a 35-word sentence triggers no revision
  and is not cut; `long_sentence` is recorded. The legacy writer's tests
  pass unchanged.
- **AC-03** An em dash in a finding is a violation; one left after the
  revision is replaced by a comma and `dash_replaced` is recorded; "Minggu
  1–2" is untouched.
- **AC-04** Three giveaway phrases make one violation naming them; two make
  only a diagnostic; neither removes text.
- **AC-05** `storyline` is the schema's first property, and it appears in no
  saved report, page, PDF or JSON download (unit test on the saved content
  and the page render).
- **AC-06** The competitor rows show the approved label on the page and the
  PDF; the affected component and pixel tests are updated.
- **AC-07** The guide file and its code copy are equal byte for byte, the
  guide is under 2,500 words, and an illustration name in a report that is
  not in the order's facts is a violation (R-12).
- **AC-08** A brand-name sentence that contradicts the counts ("SOZO tidak
  disebut di ChatGPT" when ChatGPT named it) is still caught and repaired.
- **AC-09** Every existing fact-safety test (counts, headline basis, source
  repair, no causes, phone removal) passes without being weakened.
- **AC-10** `npm run verify` passes, and the PR has an independent verdict
  comment.
- **AC-11 (judgment, founder)** In the blind test the after writer wins on
  the three questions in a majority of pairs, including the non-Sozo order,
  and no pair shows a fact error that the before writer did not make.
- **AC-12** The metrics table shows, for the after writer: sentence length
  averaging 10 to 18 words with more spread than before; fewer giveaway
  phrases and repeated counts than before; no dashes; and no more fact
  repairs (`source_sentence_replaced`, dropped headlines) than before. Its
  revision rate is reported; if it is above half of the reports, the
  founder decides before merge whether the R-10 threshold stays.

## Open questions

- **Q-1 (founder)** The competitor label. Recommended: "Menurut jawaban AI:".
- **Q-2 (founder)** Only one delivered order has both ChatGPT and Google
  results (NV-3WDSAY; checked 2026-10-28). A second business is needed so
  the guide is not tuned to Sozo. Recommended: the founder places one free
  test-pass order for a different clinic (production caps apply: USD 5 per
  order). Without it, the test is Sozo only and its result is weaker.
- **Q-3 (founder)** Firecrawl credits for the test pages: up to 16 per order
  (about 32 for two orders), beyond the earlier 50-credit allowance.
- **Q-4 (founder)** The USD 10 cap counts only this round's calls (this
  machine's ledger starts empty). Confirm, or give the remaining amount
  instead.
- **Q-5 (founder)** The R-10 threshold of three phrases and the first list.

## Verification record

Complete after implementation:

- Verification artifact: `VERIFICATION.md`
- Result: Pending
- Date: Pending
- Verified commit or working-tree state: Pending
