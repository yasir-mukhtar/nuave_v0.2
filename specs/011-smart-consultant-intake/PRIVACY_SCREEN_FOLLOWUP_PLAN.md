# Reduce privacy false alarms during business preparation

> Status: **Verified offline — implementation review accepted; publication pending**
> Owner: Orchestrator
> Date: 2026-09-25
> Revision: **R3 — explicit word groups, two accepted cautious stops and one location idiom**
> Bounded follow-up to deployed Spec 011; its existing Verified status is unchanged

## Decision and intended result

Implement a small correction to the existing text check so clearly ordinary
business descriptions can reach the prepared summary and confirmation. Keep
blocking sensitive records, credentials and unresolved suspicious wording.
The owner should not need to rewrite a harmless website or contact Nuave merely
because its marketing mentions a family, a harvest, a taste test or a room.

The founder approved R3 for **offline implementation and independent review**
on 2026-09-25 after an independent plan-review PASS. It refines both Indonesian
word-proximity rules and whole-word matching, and makes the existing privacy-stop
copy calmer and actionable. It does not
approve a new data category,
retention policy, customer bypass or permission to process private records.
Publication, merge, deployment and live calls require their own authorization.

## Evidence and why the change must cover the whole preparation path

The durable [evidence note](./PRIVACY_SCREEN_FOLLOWUP_EVIDENCE.md) records the
original reviewer examples, the later chat feedback, independent baseline
checks and the `NOW.md` preservation audit. It is sufficient to understand and
reproduce the finding without access to temporary review folders. The current
helper rejects 13 benign examples in the expanded table. R3 requires fixing
11 and accepts continued cautious stops for P9/P14. This establishes those
false positives, not their frequency on actual business sites.

`source-excerpt.ts` screens candidate page blocks using `isSensitiveIntakeText`.
Two expressions need correction: a possible health word followed by a personal
reference, and a personal reference followed by a possible health word. Bare
`keluarga` is currently treated as personal in both. The first expression also
lacks a word-start boundary, so `tes` in `kontes`/`protes` and `lab` in `kolab`
can trigger it. Correcting only the first rule or only the family cue is
insufficient. A match stops preparation before extraction.

The same helper is used by `prepareUnderstanding`, selection/confirmation,
the v2 context schema and question-facts conversion. This is a code-traced risk:
a page-only exception could still reject a phrase copied into the summary.
The worker must reproduce that case with a mocked response before correcting it.

**Recommended scope:** refine both clauses and word boundaries in the shared
helper, and verify every affected caller. This intentionally benefits the same benign
business wording whether it came from the website, the owner or extraction.
There is no trusted-source exemption. A public page and an AI-generated response
must still pass the check. A page-only bypass or wholesale removal of all
first-person patterns is not the proposed solution.

## Approved behavior

- **PS-01 — Use two explicit word groups in both directions.** Match complete
  words, case-insensitively; `tes`/`lab` inside `kontes`, `kolab` or `protes`
  are not triggers. Retain the existing limit of at most 60 intervening
  characters, without crossing a period or newline. Apply the same groups
  whether the trigger or the personal/family cue comes first:

  **Clear medical terms:** `diagnosis`, `diagnosa`, `penyakit`, `gejala`,
  `kanker`, `diabetes`, `hiv`, `aids`, `didiagnosis`, `menderita`, `stroke`,
  `depresi`, `gangguan jiwa`. Block near any of the personal cues below or
  bare `keluarga`. This keeps B8–B10 blocked without requiring possession.

  **Ambiguous terms:** `hasil`, `riwayat`, `kondisi`, `tes`, `test`, `lab`,
  `laboratorium`, `obat`, `positif`, `negatif`, `jantung`, `mental`. Block only
  near a clear personal cue: `saya`, `pribadi`, `aku`, `keluarga saya`,
  `keluarga aku`, `keluarga kami` or `keluargaku`. Bare `kami` is not a cue.
  Match phrase tokens with ordinary horizontal whitespace, not across lines.

  **One named exception:** the complete phrase `jantung kota` exempts only
  that occurrence of `jantung` from the ambiguous-term check. P10 must pass.
  Other trigger occurrences and all other protections still apply; do not
  exempt an entire sentence/block, change the proximity window or alter the
  source text retained for preparation. No other idiom is authorized here.

  These inventories cover every term from the two current Indonesian clauses,
  adding the reviewer's `menderita` and personal cues explicitly. Do not infer
  meaning from verbs, commercial tone or surrounding subject matter. P9/P14
  deliberately remain blocked, like B11: they share an ambiguous term near
  `keluarga kami`. Accept that residual false alarm instead of adding tailored
  exceptions. No domain/category exemption or exact-sentence allowlist.
- **PS-02 — Keep strong protections.** Preserve credential/token, financial
  and identity-number, explicit medical-record, personal-health and existing
  English-language protections. Retain their current outcomes unless the
  PS-01 word groups and named idiom apply to the two Indonesian clauses.
  All remaining matches stay blocked. A benign prefix must never
  hide a later record. The English clauses and explicit secret/record checks
  are not being relaxed.
- **PS-03 — Keep meaning and origins.** Safe text survives selection, preparation,
  edits, confirmation and downstream context with its original meaning and
  origin. Existing trimming/entity decoding may continue. No sanitizing away
  content, invented replacement fact, second context store or new provenance flag.
- **PS-04 — Keep failure and privacy behavior.** Detected sensitive page content
  still stops before extraction/reservation, including when mixed with contact
  text or beyond the final excerpt size cap. No URL-only fallback or automatic
  retry. Keep the same stop/error codes and prior safe entry/ledger; never echo
  the triggering content or save it in logs, browser storage or customer export.
  Ordinary public contact blocks remain excluded as today; contact details
  remain prohibited in owner text/confirmed facts as today.
- **PS-05 — Keep the execution boundary.** No extra fetch, model call, classifier
  service, dependency, UI control, budget, retry, storage/schema or source-selection
  expansion. Safe-page extraction uses the existing call and technical retry
  behavior. Empty optional values remain optional. Historical v1 output/resume
  holds, confirmation and explicit audit approval remain intact.
- **PS-06 — Use calm, useful privacy-stop copy.** Replace the accusatory certainty
  and mandatory `hubungi Nuave` in the existing preparation errors with:

  **Website page:** `Nuave belum dapat menyiapkan informasi dari halaman ini.
  Sebagian teks mungkin berisi informasi sensitif. Pilih halaman lain yang hanya
  memuat informasi publik tentang brand Anda.`

  **Entry or prepared facts:** `Persiapan audit belum dapat dilanjutkan. Ada teks
  yang mungkin berisi informasi sensitif. Gunakan hanya informasi publik tentang
  brand Anda, tanpa data pribadi atau akses akun.`

  These are single strings with ordinary spaces at the line wraps above.
  Use existing message locations/controls and keep page versus entered/prepared
  context accurate, including reload of a blocked source. Do not promise that
  retrying the same page works, show the matched words, or request that owners
  send sensitive text to support. Preserve the stop; no new bypass or support flow.
  Check both messages with truly sensitive fictional fixtures as well as the
  accepted false alarms: they must still clearly say preparation has stopped
  and direct the owner to public business information, without continuing.

The correction is a bounded mechanical check, not a guarantee of perfect
privacy detection. A match is a reason to stop, not proof that the owner
provided private information. P9/P14 and other wording matching the same rule
remain a documented limitation. No new logging or monitoring system is part
of this work.

## Concrete acceptance examples

All examples below are fictional test strings. “Pass” means allowed by this
privacy check; ordinary validity/completeness checks still apply. “Block” means
the existing privacy stop, with no sensitive text forwarded or retained.
IDs are retained from R2; the `P` prefix no longer means every row must pass.

| ID | Fictional text or condition | Required result |
| --- | --- | --- |
| P1 | `Hasil panen petani lokal untuk keluarga Indonesia.` | Pass |
| P2 | `Tes rasa menu baru bersama keluarga Anda.` | Pass |
| P3 | `Obat herbal tradisional untuk keluarga sejak 1990.` | Pass; no Nuave claim about medical effectiveness |
| P4 | `Kondisi ruangan nyaman untuk keluarga dan teman.` | Pass |
| P5 | `Paket hemat untuk keluarga setiap akhir pekan.` and an ordinary menu sentence | Continue to pass |
| P6 | `Kontes foto untuk keluarga setiap bulan.` | Pass; `tes` inside a word is not a trigger |
| P7 | `Kolab spesial untuk keluarga.` | Pass; `lab` inside a word is not a trigger |
| P8 | `Menu sehat keluarga, baik untuk jantung.` | Pass; ambiguous term near bare `keluarga` only |
| P9 | `Keluarga kami menyajikan menu sehat untuk jantung.` | Block; accepted cautious stop for a clear personal cue near an ambiguous term |
| P10 | `Keluarga kami membuka kedai di jantung kota.` | Pass; only the named `jantung kota` phrase is exempt |
| P11 | `Kontes foto untuk saya dan keluarga.` | Pass; word-start protection also works with a personal cue |
| P12 | `Kolab spesial untuk keluarga saya.` | Pass; same independent word-start check for `lab` |
| P13 | `Protes? Kami siap membantu keluarga Anda.` | Pass; reviewer-provided word-fragment case |
| P14 | `Keluarga kami menyajikan kopi sejak 1990, positif dan hangat.` | Block; accepted cautious stop under the same rule as B11 |
| B1 | `Hasil tes darah keluarga saya menunjukkan anemia.` | Block |
| B2 | `Kondisi keluarga saya setelah perawatan kanker.` | Block |
| B3 | `Obat keluarga saya diminum dua kali sehari sesuai resep dokter.` | Block |
| B4 | `Hasil tes HIV saya positif` and the existing English personal-health fixtures | Block |
| B5 | `Hasil saya untuk keluarga.` | Block: ambiguous meaning remains unresolved |
| B6 | Three representative pairs only: P10 + B1, P8 + B10, P11 + one existing fictional password fixture from B7 | Block; test P10/B1 in one paragraph and the other two pairs in separate candidate blocks; no full cross-product |
| B7 | Existing fictional password/API key, credential URL, bank/card/identity number and medical-record fixtures | Continue to block |
| B8 | `Keluarga kami menderita penyakit jantung.` | Block; a personal health disclosure with `kami` |
| B9 | `Riwayat penyakit keluarga.` | Block; explicit record language without a possessive |
| B10 | `Keluarga mengalami penyakit jantung.` | Block; clinical disclosure still restricted without a possessive |
| B11 | `Keluarga kami positif.` | Block; same clear-personal-cue rule as P9/P14 |
| C1 | Existing public-contact-only, hidden/profile/testimonial and script-only fixtures | Preserve current exclusions/no-excerpt outcome |

Acceptance requires the behavior below as well as this table:

1. Reproduce the current outcomes of all 24 retained baseline inputs. After
   correction, P1–P4, P6–P8 and P10–P13 change to Pass; P5 stays Pass and
   P9/P14 stay Block as accepted limitations. All Block controls stay blocked.
   Use one parameterized matrix with case/spacing variations and punctuation/
   start-of-string checks for complete words versus P6/P7/P11–P13 fragments.
2. Test the word groups and personal cues in both orders, including bare family
   cues, period/newline and proximity boundaries, inline HTML and long blocks.
   Check case/spacing variants of the single idiom, plus
   `Keluarga kami di jantung kota, jantung memburuk.` (Block): one
   exempt occurrence cannot hide another trigger. Use the three B6 pairs,
   retaining P10 + B1 as mixed baseline M1. The reviewer adds a few fictional
   probes of these stated rules, without inventing semantic exceptions.
3. In the real preparation route with **all network/provider transports mocked**,
   safe fictional HTML reaches the existing extraction request once. A mocked
   extraction copies a passing example from each mechanism (P1 forward, P8
   reverse, P11 word fragment and P10 location idiom) into a descriptive field;
   preparation and confirmation retain it with the right origin. An owner edit
   follows the same safe-text rule. Prove the frozen v2 context, question-facts
   conversion and existing run/report/export contracts accept that exact text.
   Reuse current downstream fixtures; do not run a paid audit to prove this.
4. A blocked page reaches zero provider/reservation calls and preserves prior
   accounting. Sensitive text injected later into a mocked proposal, owner field
   or forged context is rejected at the existing boundary before it can be
   forwarded or persisted. Keep existing credential URL rejection and ordinary
   public-source behavior at every caller of the shared helper.
5. Assert both PS-06 messages at their existing boundaries and in the blocked
   page reload path, using an actual sensitive fictional fixture and an
   accepted cautious-stop fixture. Verify clear stop/recovery wording;
   source/entered facts stay distinguishable. No sensitive
   echo, forced support contact, new request or loss of prior accounting.
6. Use one worker implementation and one focused independent review. Run targeted
   tests during development, then **one final `npm run verify`** as required by
   `AGENTS.md` engineering guardrail 2. Reuse its evidence; no separate duplicate
   `validate:fast`, second full reviewer gate, repeated 402-test selection,
   PDF inspection or real-business walkthrough by default. Further runs need
   an actual change, failure or uncovered risk. Do not skip required checks.

## Worker handoff — authorized for offline implementation

**Role/objective:** implement PS-01 through PS-06 and prove the acceptance cases
in one isolated candidate. Report evidence and the smallest remaining issue;
do not silently widen the rule or reinterpret a Block example as Pass.

Repository: `/Users/hy4-mac-006/nuave_v0.2` (preserve this shared checkout).
Create a separate clone under `/private/tmp/` on a dedicated
`codex/privacy-screen-false-positives` branch based on freshly fetched
`origin/main`. Last observed main on 2026-09-25:
`7f34d69d3be0c451e238f1cddf0da62dda250eb1`, tree
`1a9e3431f674e759f061a827993d4e89e124e7c4`. The original source HEAD `2a21f85`
is not the implementation baseline. Keep the published candidate and prior
review/evidence directories unchanged. Recheck main before handoff and report
material drift. Do not start sub-agents.

Read in order:

1. `AGENTS.md`, `README.md`, current source `docs/NOW.md`; `docs/WORKFLOW.md`
   **Specification-driven development** and **Worker handoff standard**.
2. This plan and its recorded approval; `docs/VISION.md` **Privacy and permission
   are part of trust**; `docs/PRODUCT.md` **4. Business confirmation**;
   `docs/AUDIT.md` **Data boundaries**; `docs/VOICE.md` **3. Tone rules** for
   PS-06. Read those sections completely.
3. Spec 011 `SPEC.md` **Preparation and extraction**, **Safety, cost, and
   preserved behavior**, **Failure and recovery**, **Evidence, data, privacy,
   and cost**, **Acceptance criteria**; `F03_PRODUCT_CORRECTION_SCOPE.md`
   **Source selection and privacy** and **Failure behavior and customer copy**.
4. [PRIVACY_SCREEN_FOLLOWUP_EVIDENCE.md](./PRIVACY_SCREEN_FOLLOWUP_EVIDENCE.md),
   which retains the relevant examples and observations without requiring
   temporary files; then the named code and relevant tests below.

Rule-edit scope: `src/lib/audit/sensitive-intake.ts` only. Keep its public
API and the wrappers' credential/source/context protection. A small private
helper inside that file is a routine choice; no new general privacy framework.
Read affected consumers in `source-excerpt.ts`, `direct-ten-context-v2.ts`,
`question-facts-v3.ts`, `smart-intake-contract.ts` and existing preparation/
run/report routes. Add `src/lib/audit/sensitive-intake.test.ts`; extend existing
`source-excerpt.test.ts`, `smart-intake-contract.test.ts`,
`smart-source-preparation.test.tsx` and `question-facts-v3.test.ts` as needed.
Copy-only scope: `src/lib/audit/types.ts` for existing page-error text and a
shared entered/prepared-text message if useful; `SmartIntakeJourney.tsx` and
`smart-intake-contract.ts` only for using that copy/import. Existing source
errors/restored status already use the page constant. Do not change schemas,
transitions or persistence in those consumers. Use current preparation tests
for copy and recovery; no new browser harness. An adjacent existing route/export
test may hold a downstream assertion when necessary. Any broader runtime
change needs a concrete reproduction and an orchestrator scope decision.

The founder's recorded R3 approval releases this bounded offline task.
The worker may carry the approved plan and add
dated amendment links in Spec 011/F-03 scope as routine parts of that candidate.
No separate approval round for each link or test is needed. Keep old verification
history; record the new amendment as pending its focused review. If a material
decision is missing, return the exact conflict and smallest resolution.

Use Node 22 and the locked dependencies. Clear real provider credentials and
use dummy keys/intercepted transports. No business-site fetch, provider call,
live browser audit or source corpus collection. Keep fictional test evidence
outside the product tree. Do not inspect the four protected Spec 011 notes:
`EXTRACTION_FIELD_NOTE.md`, `R23_SIZING_NOTE.md`,
`REPORT_EXPORT_BOUNDARY_REVIEW.md`, `REPORT_EXPORT_BOUNDARY_REVIEW_PROMPT.md`.
Do not read raw/private evidence, `archive/` or unrelated drafts.

Deliver one unstaged candidate and a concise `PRIVACY_SCREEN_FOLLOWUP_RESULT.md`
in its Spec 011 directory. Include the base, complete task patch, changed-file
hashes, reproduction and final test logs. Do not build another whole-repository
inventory system or repeat unchanged historical evidence packages.
Report changed files, actual test results, every rule outcome changed at each
caller, preserved limitations and any blocker. No commit, push, PR, merge,
deployment or GitHub message is authorized by this offline scope. Accounting
remains USD 1.06241155 of 5.

## Reviewer handoff — after implementation

Independently review the approved plan, implementation delta and worker result
against the exact candidate/base. Use the same required context and preservation
boundaries. Inspect the whole helper and every caller affected by its changed
outcomes, including owner input and URL/context wrappers. Challenge the word
groups and single idiom with new fictional mixed and ambiguous cases. A source-helper-only
PASS is insufficient if preparation or confirmation still rejects safe text.

Use the same matrix and a few independently authored adversarial cases. Rerun
only the affected privacy/source/preparation/context tests in a matching clean
copy; verify both error messages and blocked reload behavior. Inspect the
worker's canonical log against the changed-file hashes. Do not repeat the full
gate without a concrete unresolved concern or changed candidate. This single
review also handles the copy; no separate design or acceptance review cycle.

Write `PRIVACY_SCREEN_FOLLOWUP_REVIEW.md` outside the product checkout with
PASS or REVISE; use BLOCKED only for material missing evidence. Findings need
severity, reproduction, file/line, violated requirement and smallest fix.
State exactly which checks were rerun versus reused, preserved files, reviewed
SHA/tree, limitations and next action. Do not fix code, change policy, commit,
publish a GitHub review, merge or deploy. Return the local review to the founder.

## Approval and current verification

**Implementation review accepted by the orchestrator on 2026-09-25: PASS.**
PS-01–PS-06 are verified for the exact isolated candidate recorded in the
[acceptance closeout](./PRIVACY_SCREEN_FOLLOWUP_ACCEPTANCE.md). The reviewer
independently passed 287 affected tests and 14 new probes, and reused the
matching worker gate: 1,407 tests, both builds and 32 browser checks. The
orchestrator checked the reports, logs, patch and file/artifact hashes; no
tests or live calls were repeated. P9/P14 remain accepted cautious stops.
The worker/reviewer handoffs above are retained execution instructions;
their implementation work is complete. Publication approval is next.

**Approved by the founder on 2026-09-25:** “Approved. Shall I pass it to the
worker now?” This authorizes the bounded offline worker task above, followed
by independent review. The orchestrator records the decision in
[DECISION_LOG.md](../../docs/DECISION_LOG.md#2026-09-25--approve-privacy-screen-r3-for-offline-implementation).
No further plan approval is needed within this scope. Successful implementation
review makes a candidate eligible for a separate publication/release decision;
it does not itself change production.

**Independent plan review: PASS**, relayed by the founder in chat immediately
before approval. The reviewer found no blocking findings and confirmed that
the explicit rules agree with the acceptance matrix, the three mixed cases
are bounded, strong/downstream protections remain required, and both messages
clearly communicate the stop and recovery action. The reviewer read the plan,
evidence, helper and affected callers; it changed no files and ran no tests or
live calls. This is a plan-review verdict, not implementation verification.

R3 resolves the R2 review's conflicting expectations with explicit word groups,
accepted cautious stops for P9/P14 and one `jantung kota` exception for P10.
It bounds B6 to three pairs and checks the calmer messages on sensitive
fixtures. It retains proportional checks, durable evidence and the unrelated
`NOW.md` diff audit. The first draft changed only
8 added / 4 removed `NOW.md` lines in two relevant hunks; the 280 added / 38
removed whole-file diff included prior uncommitted work. Preserve that work.

The orchestrator ran 24 fictional **baseline** helper checks in isolated scratch
storage, with no application edits or network/provider calls. All 13 expected
false alarms were reproduced; the allowed control and 10 blocked controls
retained their current outcomes. This is evidence for the proposed correction,
not a completed fix. See the durable evidence note for inputs, method and limits.
