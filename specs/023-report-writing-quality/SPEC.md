# Spec 023: Report writing quality (depth and natural Indonesian)

> Status: **Approved** by the founder on 2026-10-28 with the recommended
> answers to Q-1 to Q-7 (see "Founder answers" below)
> Owner: founder; plan written by Claude Code on `ccr-88631259-0lhn0m`
> Updated: 2026-10-28, revision 5. Independent review: round 1 FAIL,
> rounds 2 and 3 narrow FAIL, round 4 PASS+NOTES (notes applied)
> Implements: the founder's report feedback of 2026-10-28: "deeper insights
> as if advised by BCG consultants, answer first", and "natural and clear
> like Tempo", for the live report writer (Claude Opus 5.5 with pages read,
> Spec 021 Part B and PR #185)

## Required context

Read in order:

1. `AGENTS.md`, `docs/VOICE.md` (sections 1 to 5 and 7.4; it is the
   canonical Indonesian writing contract), `docs/content/report/PLAYBOOK.md`.
2. [Spec 021](../021-report-v2/SPEC.md), Part B (B-01 to B-08): the writer
   this spec changes.
3. The writer today:
   - `src/lib/audit/two-source-writer.ts`: the instructions, the request and
     `revisionDraft`;
   - `src/lib/audit/two-source-writing.ts`: field limits, banned title
     starts, Part B checks, `headlineConfirmed` and `questionFacts`, and the
     code repair after the revision;
   - `src/lib/audit/two-source-report.ts`: `twoSourceWritingViolations`,
     `contradictedSources`, `clauseKind`, `namesBusiness`,
     `repairTwoSourceWriting`, `twoSourceCountSentence`;
   - `src/lib/audit/report-pipeline.ts`, `createValidatedAuditReport`: the
     one language-only revision, the repairs after it, and the provenance;
   - `src/lib/audit/report-language.ts`: `REPORT_MAX_SENTENCE_WORDS` and
     `validateIndonesianReportLanguage`;
   - `src/lib/audit/types.ts`: `twoSourceWritingSynthesisSchema`, the saved
     `two_source_writing` block (its `version` is a literal) and the
     provenance;
   - `src/lib/audit/anthropic-report.ts`: the Claude call and its schema
     check;
   - `src/app/audit/report/TwoSourceReport.tsx`: the page, which also prints
     the PDF.
4. The test harness: `scripts/report-writer-test/README.md` and `harness.ts`
   (ledger, `HARD_STOP_USD`, evidence folder, pages, blind letters, page
   pairs, the writer fingerprint).
5. The founder's benchmark pack (input, not a contract):
   `nuave-editorial-skill.zip` (`SKILL.md`, `references/kamus-ringkas.md`,
   `references/contoh-sozo.md`, `QA-CHECKLIST.md`, `RUNTIME-PROMPT.md`).

Do not load: `archive/`, Spec 014, the older report prototypes.

## Problem

### Evidence

- The founder judged the latest reports "written by AI" despite Opus 5.5:
  stiff, a list of facts instead of an answer, the same sentence length, the
  same address in every sentence. The ChatGPT pack's "before" lines (Sozo)
  show it: the closing gives "3 dari 10" twice, "klinik Anda" appears in
  nearly every sentence, a takeaway copies our example word ("Pemenang…").
- The Sozo report that was delivered (NV-3WDSAY) was written by the older
  writer (provenance `report-synthesis-v7-context`), so its exact sentences
  do not prove what the current writer does. The repeated sentence "klinik
  Anda disebut di 3 dari 10 jawaban" is also word for word the sentence code
  puts in when it repairs a count (`twoSourceCountSentence`, VOICE §7.4).
- The current writer's instructions (`two-source-writer.ts`) still push the
  same style:
  - "Keep every sentence to 25 words or fewer." Code also sends any sentence
    over 25 words back for revision (`REPORT_MAX_SENTENCE_WORDS`);
  - "Name the source … write 'Di ChatGPT' or 'Di Google AI Overview'" in the
    conclusion and every finding; the conclusion must give each source's
    count; the violation text repeats the formula, and the last-resort repair
    adds "Di ChatGPT: " in front of a finding;
  - "Call the audited business 'klinik Anda'";
  - the takeaway example "Pemenang menjual keahlian, bukan harga";
  - competitor rows are labelled "Disebut AI karena:" on the page, while
    rule 3 forbids saying why;
  - nine boxes to fill and no step that settles one main message first;
  - about 30 rules in English, most of them "don't".
- **The fact checker blocks depth.** `contradictedSources` compares every "X
  dari Y", bare count or "semua" in a clause with the source-wide counts, and
  treats a clause that names no business as being about the owner. A probe
  (review round 1) showed these true sentences are all violations, then
  replaced by the code count sentence after the revision: "ChatGPT tidak
  menyebut SOZO di 4 dari 4 pertanyaan treatment", "di semua pertanyaan
  umum", "ChatGPT menyebut ERHA di 7 dari 10 jawaban". Asking for patterns
  without fixing this would bring back the robotic sentence through code and
  cost a revision call each time.
- Not the cause: the facts. Since PR #185 the writer reads the pages, the
  Google answer text, monthly searches and the playbook.

### Interpretation

The report is shallow because nothing asks for a storyline and the checker
punishes the subset numbers a storyline needs. It is robotic because our own
rules force a uniform rhythm, formulas and one way to address the owner.
Fix the rules and the checker first; then add a guide on how to think and
write; measure typical AI phrasing in the test before deciding whether code
should police it.

## Desired outcome

An owner reading the report can say its main message after the first
paragraph, every finding answers "so what for my clinic", each recommendation
answers a finding, and an Indonesian editor would change little. All of
today's fact safety stays, and the checker becomes more precise, not looser.

## Scope

- The live two-source writer's instructions, output schema and writing
  checks (Claude Opus 5.5, and the OpenAI fallback that uses the same
  two-source schema).
- A precise extension of the count checker for findings (R-03).
- A writing guide in Indonesian that the writer reads next to the playbook.
- One label on the report page and PDF ("Disebut AI karena").
- `docs/VOICE.md` amendments for report-writer prose only.
- The report-writer test harness: the cap, a before/after blind test, a
  metrics table.

## Non-scope

- The layout, sections, box length limits (`TWO_SOURCE_WRITING_LIMITS`) and
  banned title starts. Box limits are revisited in Phase 2.
- Code-built page text: the source cards, the settled exact labels, the
  code count sentence (VOICE §7.4) and the Celah Topik lede ("Topik yang
  dicari orang…"). They keep reading the same way; Phase 2 lists them.
- The legacy single-source writer (`reportWritingInstructions`,
  `validateReportLanguage`) and its 25-word rule. It is not live.
- Steps 1 to 6, the pages read, the playbook's content and its three rules.
- Old saved reports.

## Settled decisions (founder, 2026-10-28)

- **D-1** Use the business's brand name in report prose, not "klinik Anda"
  everywhere.
- **D-2** No hard sentence limit. Guidance: 3 to 30 words, average about 14,
  a mix of lengths, an occasional very short sentence to land a point.
  *Revised 2026-10-29 (founder's editorial review of the guide):* the guide
  gives no word-count targets; one point per sentence, lengths varied by
  what the ideas need. The test still measures lengths.
- **D-3** The guide sits at the report-writing step, next to the playbook,
  and the writer reads it with every report.
- **D-4** Em dashes are banned (as `VOICE.md` §3 already says).
- **D-5** A human editor will rewrite the Sozo report; it arrives later
  (Phase 2).
- **D-6** The test harness cap is USD 10 (was USD 7). What it covers is Q-4.

## Requirements

### Rules that fight good writing

- **R-01, sentence length.** The two-source instructions drop "Keep every
  sentence to 25 words or fewer". For two-source reports a long sentence is
  no longer a writing violation: not sent back, not cut. The legacy writer
  keeps its rule. Sentence length is measured in the test (R-15).
- **R-02, sources in natural words.** The instructions drop the "write 'Di
  ChatGPT' / 'Di Google AI Overview'" formula. Each finding still contains
  the word "ChatGPT" or "Google" (the existing check matches those words),
  in a natural sentence ("ChatGPT menyebut…", "Ringkasan AI Google…"). The
  violation text is reworded the same way. The last-resort repair stays, as
  the rare fallback it is.
- **R-03, the checker reads findings precisely.** All of this lives in the
  shared `contradictedSources`, so the check and the code repair always
  agree (the repair runs over every sentence whenever any violation is left).
  Nothing that is false today becomes accepted. Because this changes a fact
  check, the founder approves the exact behaviour in AC-03 (Q-6).
  - **Owner clauses in a key finding, with a named subset.** When the clause
    names the subset ("pertanyaan treatment", "pertanyaan tentang harga",
    "jawaban yang menyebut kota": a topic word or "tentang"/"yang …" after
    "pertanyaan", "jawaban" or "ringkasan"), its "X dari Y", bare count
    ("di 4 pertanyaan treatment") and "semua"/"tidak satu pun" are checked
    against the finding's own `evidence_prompt_ids`: Y is the number of cited
    questions and X how many of them have the stated fact, by the
    per-question facts the headline check uses (`questionFacts`). A
    qualifier that means the whole sample never names a subset: anything
    `ABSOLUTE` matches today, and "yang diuji", "yang ditanyakan", "yang
    dinilai", "yang sama", "audit", "Nuave", "mana pun". The qualifier is
    set aside before the clause's polarity is read, so "SOZO muncul di 2
    dari 4 jawaban yang tidak menyebut kota" stays a positive claim.
  - **Everything else stays source-wide.** A clause with no named subset
    ("di 4 dari 4 pertanyaan", "Tidak satu pun jawaban ChatGPT menyebut
    SOZO"), any clause in the verdict or conclusion, and any clause the
    checker cannot map to a per-question fact keep today's source-wide check.
  - **Competitor clauses.** A clause that names a business from
    `facts.writer.businesses` and not the owner is checked against that
    business's per-question `businesses` lists for the named source: a count
    must match (among the cited questions when a subset is named, else over
    the source's denominator, ChatGPT answers or Google summaries, as
    `sourceDenominator` does); an absolute negative ("tidak pernah menyebut
    ERHA") is false when that source named it at all; a positive is false
    when that source never named it; "semua" must hold for every question
    counted. This applies in every field the checker reads today (the
    verdict, the conclusion, finding titles and explanations); fields it does
    not read today stay unread. A clause that names both the owner and a
    competitor is checked for the owner only, as today. A competitor clause
    that names no source must be true for at least one source, as today.
  - **Repair.** A false subset or competitor sentence left after the
    revision is dropped, not replaced with the owner's count sentence. A
    false owner sentence about the whole sample is replaced as today. If a
    drop would empty a finding's title or explanation, the whole finding is
    dropped while another finding remains; for the last finding, the
    sentence is replaced as today. An emptied verdict falls back to the
    conclusion (as the page already does), and an emptied conclusion gets
    the existing count-sentence prefix. New diagnostic codes
    `source_sentence_dropped` and `finding_dropped` record each drop.
- **R-04, counts said once, in the cards.** The source cards already show
  each source's count in large type and a sentence. The verdict states the
  main message and may carry one number only when that number is the point.
  The conclusion carries no counts; it names the sources, returns to the
  main message and gives the next step.
- **R-04a, the instructions follow R-03 and R-04.** These lines of
  `two-source-writer.ts` change, and AC-01 checks them:
  - the verdict line drops "with the per-source result";
  - the conclusion line drops the required per-source counts;
  - "Copy every 'X dari Y' about a source exactly from source_counts" and
    the negative-sentence rule become: in a key finding, a count may cover
    the finding's own cited questions when the sentence names that group of
    questions; a competitor's count comes from `questions[].businesses`;
    every other number about a source is copied from `source_counts`; never
    write that a source did not name, mention or show the business when it
    did, unless the sentence names the group of questions it is limited to
    (this part of today's negative rule stays); in the
    verdict and conclusion, a count about the owner is always the
    source-wide one.
- **R-05, brand name, used like an editor.** The writer names the business
  by its exact confirmed name (or a listed alias) where a section opens or
  where it must be told apart from other businesses, then uses "klinik ini"
  or "Anda" in between, only while the owner is the subject of the
  paragraph (the checker reads "klinik ini" as the owner). With no confirmed
  name it uses "klinik Anda" / "bisnis Anda" as today. Never a short form
  that is not a listed alias.
- **R-06, no teaching examples in the instructions.** The "Pemenang menjual
  keahlian, bukan harga" example goes. Examples live only in the guide.
- **R-07, the competitor label.** "Disebut AI karena:" on the page and PDF
  becomes the founder-approved wording (Q-1). The `competitor_reasons`
  instruction asks for what the answers say about that business, not why AI
  chose it.

### Depth

- **R-08, plan before writing.** The two-source output schema gains
  `storyline` as its first property: `main_message` (a string) and
  `support` (an array of strings), with no array or length bounds in the
  schema (the Claude SDK moves bounds into descriptions and the zod re-check
  would then fail a paid call). The instructions say: settle the storyline
  first, two or three supporting points; the verdict states the main
  message; three or four strong findings beat six thin ones; findings come in
  order of importance and each supports the main message; each
  recommendation says in natural words which problem it answers (never a
  label such as "Temuan 2:"); the conclusion returns to the main message.
  `storyline` is never saved, shown on the page or PDF, or included in the
  JSON download (`assembleTwoSourceWriting` drops it). The language-only
  revision is not sent a storyline, and the storyline it returns is ignored.
  The writer function returns the first answer's storyline beside the
  content, so the harness keeps it, hidden until scoring is done.
- **R-09, interpretation without causes.** The writer may describe a pattern
  across questions ("Polanya…", "Artinya…") with how consistent it is, and
  say why a step comes first, from the evidence and from what the playbook
  says the step involves. It never says why this business got its result
  (playbook rule 3), never claims cost, effort or impact the playbook does
  not support, never says what people "search most" or "paling dicari"
  except a monthly-search figure given in the facts, and never treats the
  ten questions as the whole market.

### The guide

- **R-10, the writing guide.** `docs/content/report/WRITING_GUIDE.md`, in
  Indonesian, approved by the founder before any paid test run. It is copied
  into `src/lib/audit/report-writing-guide.ts` and a unit test checks they
  are equal byte for byte (as for the playbook). The writer reads it after
  the playbook. Four parts:
  1. **Cara berpikir konsultan:** one main message first; "so what for this
     clinic" for each fact; most important first; fewer, stronger
     findings; every recommendation answers a finding.
  2. **Cara menulis seperti editor:** common words, active sentences, the
     D-2 rhythm, R-05 naming, counts in the cards, no em dash, an en dash
     only in a time range ("Minggu 1–2", VOICE §3); a short list of phrases
     that sound translated ("hal ini menunjukkan", "selain itu" at every
     paragraph, "bukan hanya… tetapi juga…", "melakukan optimalisasi") with
     a natural alternative for each; the words "ChatGPT" or "Google" in
     every finding; a count about a group of questions cites exactly the
     questions it counts.
  3. **Jujur tanpa berbelit:** pattern vs cause, with examples on both
     sides; R-09's limits; no lawyer-style hedging; what we cannot see.
  4. **Contoh:** before/after pairs using placeholders ("Klinik A", "Klinik
     B", "[kota]"), never a real business, competitor or city from a Nuave
     order.

  Its length is measured in tokens in the dry run. Where it and the ChatGPT
  pack disagree, this spec and `VOICE.md` win; where it and `VOICE.md`
  disagree, `VOICE.md` wins.

### Checks by code (kept small)

- **R-11, dashes.** An em dash, or a spaced en dash or hyphen used as a
  dash (" – ", " - "), in writer prose is listed among the writing
  violations when a revision runs for another reason; on its own it does not
  trigger a revision. After the revision, code replaces any left with a comma
  and records `dash_replaced`. Unspaced number ranges stay. Code never
  changes exact evidence: business names and aliases, listed other
  businesses, `headline.number`, and the plan's week labels ("Minggu 1–2",
  allowed by R-13).
- **R-12, provenance.** The saved block keeps its version literal, but the
  provenance's `report_prompt_version` gets a new value for the new
  instructions, so a delivered report shows which writer wrote it.

### Canonical documents

- **R-13** `VOICE.md`, for report-writer prose only: §3 "short sentences"
  becomes the D-2 guidance (the 25-word ceiling stays for other copy), and
  §3 allows the plan's week labels ("Minggu 1–2") next to time ranges; §5's
  "25 words is the hard ceiling in validated report fields" no longer
  applies to the two-source writer; the §2 "Your business (prose)" row adds
  the R-05 rule; the new competitor label; §7.4's code count sentences stay
  as they are (said explicitly).
  The guide ranks below `VOICE.md`. `INDEX.md` routes report-writing work to
  the guide. `DECISION_LOG.md` records D-1 to D-6 and the answers to Q-1 to
  Q-6. `NOW.md` names this spec.

### The test

- **R-14, harness.**
  - `HARD_STOP_USD` follows Q-4.
  - One shared folder (`REPORT_TEST_SHARED_DIR`, an absolute path) holds the
    one ledger file, the exported evidence and `pages/<order>.json`. Each
    writer writes only its own results folder (`REPORT_TEST_RESULTS_DIR`).
    So the "before" writer (a git worktree of `main` at the commit before
    PR 2) and the "after" writer (PR 2's frozen commit) spend from one
    ledger and read the same pages; Firecrawl reads each order once.
  - Both writers run with `REPORT_TEST_MAX_OUTPUT_TOKENS=24000`, as
    production's Claude writer.
  - Writers run one at a time, pair by pair (before, then after, for each
    order and run), so a ledger refusal still leaves complete pairs; each
    ledger line is labelled before or after. Both commits are recorded.
  - The dry run prints each call's worst case and the total for both
    writers, counting one revision per report, and the guide's token count.
  - Printing: both writers' results are printed by PR 2's build, so the
    page label cannot tell them apart. A pairing step prints blind pairs per
    order and run, with the key kept apart (reusing the page-pair code).
  - A metrics table per report: mean and spread of sentence length and the
    share over 30 words; the typical-phrase hits (the guide's list plus
    "memastikan", "signifikan", "komprehensif", "holistik", "krusial",
    "lanskap", "memanfaatkan", "secara keseluruhan", "dapat disimpulkan");
    dashes; how often the brand name, "klinik ini", "klinik Anda" and
    "Anda" appear; counts repeated across verdict, conclusion and findings;
    Indonesian cause and guarantee markers ("karena", "dipilih", "lebih
    percaya", "dijamin", "pasti", "paling dicari"); any run of six or more
    words shared with the guide's examples; whether the revision ran; each
    repair diagnostic, including `source_sentence_dropped` and
    `finding_dropped`; cost and time.
- **R-15, blind test.**
  - Writer: Opus 5.5 medium with pages, before vs after.
  - Orders: NV-3WDSAY (Sozo) twice per writer, plus one order of a
    different business once per writer (Q-2): six reports.
  - Freeze first: the guide is approved and both commits (before and after)
    are recorded before any live output. A change after seeing outputs means
    both writers run again on that order, which needs new budget approval.
  - The founder scores each pair blind: main message after the first
    paragraph? every finding answers "so what"? would an editor change much?
    an overall pick. A safety gate fails a pair for any new causal claim,
    claim about AI's intent, guarantee, or claim that treats the ten
    questions as the market. The storyline stays hidden until scoring is
    done.
  - The founder wrote some of the changes (brand name, no "Di ChatGPT"), so
    the test is not fully blind for them; one more Indonesian reader scoring
    the same pairs is optional (Q-7).

### Phase 2

- **R-16** When the human-edited Sozo report arrives: compare it with the
  after writer's Sozo reports (the three questions plus the metrics); put
  its lessons into the guide in general terms and placeholder examples,
  never its Sozo text; revisit the box limits; decide whether any metric
  (typical phrases, long sentences, cause markers) should become a code
  check (Q-5); list the code-built page text that still reads stiffly (the
  source card sentences, the Celah Topik lede) for a separate change; run
  one more blind round on a non-Sozo order.

## Build order

Two pull requests, so the free and safe part can merge first.

1. **PR 1, harness only (no customer change):** R-14. Finish condition: the
   dry run, with `REPORT_TEST_SHARED_DIR` and two results folders, builds
   today's writer's prompts for NV-3WDSAY into both folders from one ledger
   and one pages file, and prints the worst-case total; all harness tests
   pass.
2. **PR 2, the writer (customer-visible; stays a draft until AC-11):**
   1. R-01 to R-07 and R-11 to R-12, with tests.
   2. R-08 and R-09, with tests.
   3. R-10: the guide draft goes to the founder to read **before** any paid
      run.
   4. R-13 document edits.
   5. Freeze the commit; the free dry run; the live blind test after the
      founder says go; the founder's scoring.
   6. Merge only on the founder's pass. Merging deploys.

## Failure and recovery

- A failed or discarded revision keeps today's behaviour: the first draft
  stands, code repairs counts, headlines, titles and dashes, and the order
  never fails over writing.
- A storyline that is missing makes the schema check fail the call as
  today, with the existing retry; the schema has no bounds that could fail a
  well-formed answer.
- Rollback: revert PR 2. Saved reports keep their shape (the saved block's
  version literal is unchanged; `storyline` is never saved).

## Evidence, data, privacy, and cost

- **Per report in production:** the guide adds a few thousand input tokens
  per call (measured in the dry run; at USD 4 per million, about USD 0.01 to
  0.02 per call). A revision is a second full Opus call; this spec adds no
  new revision triggers, and R-01 and R-03 remove two common ones.
- **Test (Q-4):** six Opus reports. Token arithmetic gives about USD 0.67
  per Opus call (about 107,000 input tokens at USD 4 per million and 12,000
  output at USD 20); the founder's earlier figure is about USD 1.3 per
  report, which likely includes a revision. The before writer keeps today's
  25-word revision trigger, so its revision rate may be high. Planned spend:
  about USD 4 to 8. The dry run prints the worst case, and the ledger's
  holds (which count every prompt character as a token) refuse a call
  before real spend reaches the cap. Per-call cost and revisions are
  recorded for each report. Firecrawl: at most 16 requests per new order (Q-3). The second order
  (Q-2) runs in production under its own caps (USD 5 per order) and is not in
  this ledger.
- **Privacy:** the export queries read no email, payment or link column; the
  evidence stays in the git-ignored `.local-evidence/`. Phone numbers are
  removed before the writer, as today. The guide holds no real business
  data.

## Acceptance criteria

- **AC-01** The two-source writer's request has no "25 words", no
  "Pemenang", no required "Di ChatGPT"/"Di Google AI Overview" formula, no
  per-source result in the verdict line, no count requirement for the
  conclusion, and the R-04a count rules in place of "Copy every 'X dari Y'
  … from source_counts"; it keeps the rule never to deny a source's naming
  except for a named group of questions; it has the naming rule, the
  storyline rule and the guide text (unit test on
  `twoSourceWriterMessages`).
- **AC-02** A two-source draft with a 35-word sentence triggers no revision
  and is not cut. The legacy writer's tests pass unchanged.
- **AC-03** Unit tests on `twoSourceWritingViolations` and
  `repairTwoSourceWriting`, with counts ChatGPT 3 of 10 and Google 0 of 6,
  and a finding citing four treatment questions where ChatGPT named the
  owner in none:
  - "ChatGPT tidak menyebut SOZO di 4 dari 4 pertanyaan treatment" and "di
    semua pertanyaan treatment" pass and survive the repair unchanged;
  - "…di 3 dari 4 pertanyaan treatment" is caught, and dropped if it
    survives the revision;
  - "Tidak satu pun jawaban ChatGPT menyebut SOZO" and "ChatGPT tidak
    menyebut SOZO di 4 dari 4 pertanyaan" (no named subset) are caught, as
    today;
  - "ChatGPT menyebut ERHA di 7 dari 10 jawaban" passes only when ERHA is in
    7 ChatGPT answers' lists, also in the verdict; "ChatGPT tidak pernah
    menyebut ERHA" is caught when ERHA is in any ChatGPT list; "Google
    menyebut ERHA" is caught when no Google list has ERHA; a caught
    competitor sentence is dropped, never replaced with the owner's count
    sentence;
  - "ChatGPT tidak menyebut SOZO di 4 dari 4 pertanyaan yang diuji", "…di
    semua pertanyaan yang ditanyakan" and "…di 4 dari 4 pertanyaan audit
    ini" are caught, as today;
  - "SOZO muncul di 2 dari 4 jawaban yang tidak menyebut kota" is read as a
    positive claim and passes when true;
  - a false sentence that is a finding's whole title drops that finding
    when another remains;
  - every false verdict and conclusion sentence that today's tests catch is
    still caught.
- **AC-04** An em dash or a spaced en dash left after a revision is
  replaced by a comma and `dash_replaced` is recorded; "Minggu 1–2", "1-2",
  a business name with " - " and a verbatim headline are untouched; a dash
  alone triggers no revision.
- **AC-05** `storyline` is the schema's first property; a schema with it
  passes the Claude SDK's transform without moved bounds; it appears in no
  saved report, page, PDF or JSON download; the revision is sent none, and
  the first answer's storyline is what the writer function returns.
- **AC-06** The competitor rows show the approved label on the page and the
  PDF; affected component and pixel tests are updated.
- **AC-07** The guide file and its code copy are equal byte for byte; the
  guide names no business from any Nuave order (a test against the order
  names in the test fixtures and NV-3WDSAY's businesses).
- **AC-08** A sentence with the exact brand name that contradicts the
  counts is caught and repaired; a sentence with a short form that is not an
  alias is still checked as being about the owner.
- **AC-09** Every existing fact-safety test (counts, headline basis, source
  repair, no causes, phone removal) passes without being weakened.
- **AC-10** `npm run verify` passes, the provenance shows the new prompt
  version, and the PR has an independent verdict comment.
- **AC-11 (judgment, founder)** The six reports make three pairs (Sozo run
  1, Sozo run 2, the second order). With the second order (Q-2): the after
  writer wins the overall pick in at least two of the three pairs, including
  the second order, and no pair fails the safety gate. Without the second
  order: the after writer wins both Sozo pairs, and the founder decides
  whether that is enough to merge.
- **AC-12** The metrics table shows, for the after writer: sentence length
  averaging 10 to 18 words with more spread than before; fewer typical
  phrases, repeated counts and "klinik Anda" than before, without one name
  repeated in every sentence; no dashes; no more cause markers or fact
  repairs (`source_sentence_replaced`, `source_sentence_dropped`,
  `finding_dropped`, dropped headlines) than before; no
  six-word overlap with the guide's examples; and the revision rate.

## Open questions

- **Q-1 (founder)** The competitor label. Recommended: "Menurut jawaban AI:".
- **Q-2 (founder)** Only one delivered order has both ChatGPT and Google
  results (NV-3WDSAY; checked 2026-10-28). Recommended: the founder places
  one free test-pass order for a different clinic before the live test, so
  the guide is not tuned to Sozo (production caps apply).
- **Q-3 (founder)** Firecrawl requests for the test pages: at most 16 per
  new order, beyond the earlier 50-credit allowance.
- **Q-4 (founder)** What USD 10 covers. NOW.md records USD 5.77 used of the
  USD 7 tests allowance as of 2026-10-27, and later Sonnet runs may have
  used more. If USD 10 is the shared total, about USD 4 or less remains:
  enough for three to five reports, and neither AC-11 path is assured.
  Recommended: USD 10 for this round, counted in a fresh ledger.
- **Q-5 (founder, after the test)** Whether typical phrases, long sentences
  or cause markers become code checks.
- **Q-6 (founder)** R-03: the checker accepts a count that is true for the
  finding's own questions or for a named competitor.
- **Q-7 (founder)** An optional second Indonesian reader for the blind
  scoring.

## Founder answers (2026-10-28)

- **Q-1:** the competitor label is "Menurut jawaban AI:".
- **Q-2:** the founder places one free test-pass order for a different
  clinic before the live test.
- **Q-3:** up to 16 Firecrawl requests per new test order.
- **Q-4:** USD 10 for this round, counted in a fresh ledger.
- **Q-5:** decided after the test.
- **Q-6:** R-03 approved, with the behaviour in AC-03.
- **Q-7:** a second Indonesian reader stays optional.

Because this session pushes to one branch, PR 1 (the harness) rides on the
spec's own pull request; PR 2 starts from `main` after it merges.

## Founder review of the guide (2026-10-29)

The founder's editorial review of the first guide draft was applied to the
second draft (`WRITING_GUIDE.md`), with these alignments:

- **Numbers.** The review allows a number to be repeated so a section
  stands alone. Kept within R-04a: a finding may repeat a count it needs;
  the verdict carries at most one proportion; the conclusion none.
- **Source name.** The review's "ringkasan AI Google" is written "Google AI
  Overview" (VOICE §2).
- **Re-audit timing.** The guide leaves it to the playbook, which sets about
  eight weeks (its item 9); the examples carry no schedule.
- **No notes field.** The review's "tandai kebutuhan itu dalam catatan
  kerja" becomes "do not write that conclusion": the writer has no notes
  field.
- **Search volume details.** The review's source, period and region for a
  search figure are left out of the guide: the code-built topic line shows
  them.
- **Site-only findings.** The review's second model finding rested only on
  the clinic's own page. R-02 asks every finding to name ChatGPT or Google,
  so the page facts sit in the recommendation that answers them. Allowing a
  site-only finding would change R-02 and the checker (founder's call).
- **Checkable wording.** The examples keep a limit in the same clause as its
  verb ("ChatGPT tidak menyebut Klinik A dalam keempat jawaban tentang
  [perawatan]"), the form R-03 can check; a finding that compares two groups
  counts one of them at most.

The writer's rules follow the review: the storyline is settled after reading
all the evidence and may hold a limiting point; two to six findings, as many
as the evidence supports; each recommendation says what it is for. VOICE §2
and §3 are amended to match. R-03 now also reads "pertanyaan tentang klinik
di [kota]" as a group (a bare "tentang klinik" stays the whole test), and
"tentang klinik ini" as the owner. The harness no longer counts
"memanfaatkan" as a typical phrase.

## Tempo style in the guide (2026-10-29)

The founder asked that the guide also carry Tempo's newsroom style, from
_Seandainya Saya Wartawan Tempo_ and Tempo's editors' principles.
`docs/content/report/GAYA_TEMPO.md` records what was taken, how each
principle maps to an audit report, and what does not transfer (the "aku"
voice, physical description, teasing leads, staged scenes, causes). The
third draft of the guide adds: the verdict as a lead that opens with the
most concrete fact; show, don't label; short exact quotes from the saved
answers; one question told first, then the pattern; plain verbs instead of
bureaucratic ones; and a closing that returns to the lead. The examples
gain a sample question and answer in the practice material. Every model
sentence still passes R-03 when true. A code check that quoted text exists
in the saved answers is proposed, not built.

Known limit (review round 6): R-03 does not read counts written as ordinals
("keempat jawaban", "ketiga jawaban lain") or groups without a count
("sebagian", "tidak disebut dalam jawaban tentang [perawatan]"); such
sentences are not checked, as before Spec 023. Reading "ke<N>" as a count
would check it against every question a finding cites, which drops true
sentences in a finding that compares two groups, so it is left for later.

## The founder's fourth guide (2026-10-29)

The founder revised the guide with another model and approved the result
("Writing Guide 4") with an editorial note on the third draft. It replaces
`WRITING_GUIDE.md` and changes R-04, R-04a and R-10 as follows.

- **R-10.** The guide's parts are now the eleven steps of the founder's
  version (reading, the main point, the order of thought, the opening, what
  the reader can see, words, limits of meaning, recommendations, the
  ending, a worked example, editing). Its length bound is 4,500 words.
- **R-04 and R-04a.** The verdict carries a number only when it is the
  point; the conclusion uses a count only when it is needed to be clear,
  has no fixed shape, and names a source only when it says the business
  was or was not named. Recommendations are one to six, as many as the
  checked evidence supports.
- **Edits to the founder's text, each for a product reason:**
  - "Klinik Bening" became "Klinik Seruni": "Bening's Clinic" is a real
    chain named in an order's Google AI Overview answers (AC-07).
  - The model verdict gives its count as a whole-test count R-03 can check
    ("dalam tiga jawaban untuk pertanyaan umum, tidak satu pun tentang bekas
    jerawat") rather than "3 dari 6 jawaban umum", which the verdict cannot
    check (it cites no questions). The model finding's "dalam tiga jawaban"
    for the general group is read against the whole test, true here only
    because every mention falls in that group (known limit below).
  - The model finding and recommendation are one paragraph each, as the
    product renders them; the guide says so, names the banned title starts,
    keeps "klinik Anda", allows "Minggu 1–2", and places group counts in
    findings.
  - The worked example notes that the product has no separate "Batas
    pengujian" part.
  - The closing note says the guide was checked against VOICE, this spec,
    the writer's rules and the checker.
- **R-03 changes so the checker reads the guide's forms** (tightened after
  review round 7, which found false whole-test claims passing):
  - an opening clause joins the claim after its comma only when it names a
    group of questions ("Dalam empat jawaban tentang bekas jerawat", "Untuk
    pertanyaan tentang harga"); "Ketika audit ini dijalankan", "Sebagai
    klinik di Depok" or "Untuk pertanyaan di Depok" limit nothing; an
    opening group size is not read as a naming count;
  - "keempat jawaban itu" and "keempatnya" limit a claim only when the
    number is below the source's total; "kesepuluh jawaban itu" is every
    answer; "keduanya" (both sources) never limits;
  - "ringkasan" names Google AI Overview only in AI Overview forms ("enam
    ringkasan", "ringkasan itu", "ringkasan yang tampil") and never beside
    "jawaban", "sebagai ringkasan" or "ringkasan hasil";
  - a competitor's short form ("Seruni" for "Klinik Seruni") is read as that
    competitor when it is capitalised as in the name, is not a generic or
    topic word ("Umum", "Jerawat", "Laser"), and no owner name and no other
    listed business shares it;
  - a conclusion names a source when any clause about the owner or another
    business says named, recommended, cited, suggested, present or listed,
    or counts; a page detail ("Nama dokter tidak ditemukan pada halaman")
    does not need one;
  - counts at a sentence's start ("Dalam 4 jawaban") are read.
- **Known limits:** a plain count about one group in a finding that cites
  two groups ("Di kelompok ini, ChatGPT menyebut Aruna dalam tiga jawaban")
  is read against the whole test; an "X dari Y" count for a second group in
  the same finding is not supported; limited claims without a count stay
  unchecked, as before. Counting two groups in one finding would need the
  writer to say which questions form each group (a later change).
  The old-versus-new comparison over the generated cases accepts the same
  350 true sentences as before; the deliberate additions are the leading
  limit and the anaphoric "keempat jawaban itu", which today's code read as
  claims about the whole test.

## Verification record

Complete after implementation:

- Verification artifact: `VERIFICATION.md`
- Result: Pending
- Date: Pending
- Verified commit or working-tree state: Pending
