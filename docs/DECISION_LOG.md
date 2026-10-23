# Nuave decision log

> Status: **Authoritative dated decision history**
> Updated: 2026-10-23

The newest founder-approved entry governs when decisions conflict. Do not edit
old rows to make history cleaner; add a superseding row.

## 2026-10-23 — Real-search questions, ChatGPT and Google, Rp249.000

Yasir decided, after the DataForSEO test on Sozo Skin Clinic
([`experiments/dataforseo-sozo/`](../experiments/dataforseo-sozo/), USD 0.16),
what the audit sold to the first paying customers will be:

- **Questions from real searches:** the ten questions come from real Google
  search data for the business's type and city (People also ask,
  autocomplete, keyword volumes), keep real human wording, and show how often
  their topic is searched. Cheaper Inference stays the question writer and the
  fallback when search data is missing.
- **Two answers per question:** the same question is asked to ChatGPT and to
  Google's AI summary (via DataForSEO). This reopens the earlier "two grounded
  API surfaces for v0" row for this one addition; Gemini is left out for now.
- **One package, no tiers.**
- **City:** the business's main city by default, or the branch the customer
  chooses.
- **Price:** Rp249.000 (was Rp99.000).
- **Order:** build this first ([Spec 018](../specs/018-search-grounded-chatgpt-google-audit/SPEC.md)),
  then S5 (terms, price and promise wording), S6 (landing page) and G1, so the
  promise and landing page describe the new audit once.

## 2026-10-23 — Errors use Jeton red

Yasir chose red for errors, "probably Jeton red" (Figma page 09's JETON
study: #f73b20 / #e02e14), so a mistake no longer looks like a violet
highlight. Error messages, wrong-field edges, the "business name in this
question" warning, missing required profile details and payment problems
are red; running states, accent words and highlights stay violet. Small
error text uses Jeton's next step, ember-700 #bc2410, to stay clearly
readable on the grey surfaces.

## 2026-10-23 — Switch the v2 journey to the violet design (Figma page 11)

Yasir asked to update v2.nuave.ai to the violet copy of the mobile journey
(Figma `eXCVryQzgx93oaYTR9NYGA`, page 11, node `238:1967`), reviewed by an
independent Opus review before merging, and authorised merging once the
review passes and checks are green.

- **What changes:** the look only. Cool ink greys and one violet accent
  replace the warm greys and orange; the paid reading (J09) is the one
  full-violet screen. The 3D miniatures are re-exported from page 11 (the
  kedai is now a small clinic). The report-ready email takes the same
  colours, picture and logo.
- **Unchanged:** every screen, word and layout of the 2026-10-21 journey
  (page 11 is a copy of page 09 with the same frames and text), gates,
  payment, the audit and report method, and what the browser stores. The
  orange page 09 stays in Figma.

## 2026-10-21 — Adopt the v2 mobile journey design (Figma J01–J35)

Yasir asked to adopt the new audit journey design from the Figma file
(`eXCVryQzgx93oaYTR9NYGA`, mobile, J01–J35) on v2.nuave.ai, with intentional
animation benchmarked on Airbnb, reviewed by an independent Opus review loop
before merging. Desktop follows when its design is ready; until then desktop
shows the same 480px column.

- **What the customer sees:** the landing page (J01) is the website field,
  "how customers ask", three steps and what the report holds. One website
  field starts the free check (J02–J04, with a way out after 30 seconds);
  the business card (J05), the three steps (J06), checkout (J07/J08), the
  paid reading (J09), Step 2 (J10–J23), the profile review with edit sheets
  (J25/J26), the ten questions with an edit sheet and a final start sheet
  (J27/J27b/J28), the running and ready pages (J29/J30), the ready email
  (J31) and the report (J32–J35) follow the design.
- **Supersedes the screen split of 2026-10-02 (JQ):** decision
  considerations share one optional screen with customer needs (J17); the
  public fact sits under the differentiator (J22) instead of its own screen;
  the target customer is picked as chips and stored as one phrase.
- **After payment the paid reading starts by itself** (once per order in a
  tab), as the design shows. A reading interrupted by a reload, or one that
  failed, still waits for "Lanjut": a refresh never replays the call.
- **Unchanged:** server-side provider and spending gates, the audit and
  report method and wording rules, validation limits, what the browser
  stores (R-31: the email never), Spec 017 payment states and locks.
- **Spec 013's screen-level presentation follows the design where they
  differ** (Yasir's Figma file is the founder's direction for it): one
  website field and "Cek bisnis saya di AI" instead of R-06's two fields and
  R-01's `Periksa`; the review (J25) reads the answers back without
  repeating each one's source label, which stays on the answer's own screen
  (R-02, R-21), and edits by section in sheets (J26) instead of one screen
  per row; its confirmation is J25's tick plus "Buat pertanyaan audit"
  instead of R-21's exact `Sudah sesuai — buat pertanyaan audit`, and it
  calls the same confirmation and freeze. Behaviour Spec 013 fixes is kept:
  R-18/AC-09's three competitor choices (named, "Tidak ada pembanding
  langsung", "Belum tahu"), each freezing as itself, and unticking the last
  name keeps "named" and blocks `Lanjut` until a name or another choice is
  picked.
- **Where the build differs from the Figma file, and why:**
  1. The website field accepts a website or an Instagram account, not a
     Google Maps link (the source parser does not accept one).
  2. Payment methods are shown for information; the choice happens on the
     Midtrans page.
  3. No address autocomplete or location permission for branches (J12b);
     areas get one-tap Indonesian place suggestions instead (J19b).
  4. All ten questions are asked without the business name (the current
     direct-ten method); the design's 6 + 4 split is not built.
  5. No "Kirim ulang email" (there is no resend service for customers):
     "Minta kirim ulang email" opens an email to support.
  6. The running and ready pages do not show the order email, masked or not
     (it is never stored in the browser).
  7. The running page shows the question texts and the elapsed time only in
     the tab that approved them (both stay in memory, never in browser
     storage); after a reload it shows "Pertanyaan 1" to "Pertanyaan 10" and
     no clock.
  8. The differentiator counter shows the real limit (1,000 characters),
     not 160; competitor names allow up to 5 (the context limit), and the
     copy says so.
  9. The payment consent links name the real page, "Syarat Penggunaan", not
     "Ketentuan Layanan".
  10. The report keeps both downloads (PDF and the evidence JSON) and the
      header facts for the system and model tested.
  11. Areas typed on J19b show as chips above the field, as products do on
      J14/J15, rather than as tokens inside the field.
  12. J04 says the website is read after payment, because continuing with a
      name stops the free check; J05 then shows "Bisnis yang akan diaudit"
      without the found tick (the design's "Kami tetap membaca website di
      belakang layar" would not be true).
  13. The free check's third line reads "Membaca deskripsi bisnis", not
      "Mencari cabang dan produk": the free check reads only the name, logo
      and description; branches and products come from the paid reading.
  14. J12 does not pre-select a branch: the owner picks the one to audit.
  15. J20 rows show a "Saran Nuave" or "Dari Anda" tag instead of a source
      line, and the screen adds "Tidak ada pembanding langsung? Lewati
      juga." under "Belum tahu? Lewati" (R-18's third choice; the review's
      sheet offers both).
  16. J10 has no `Kembali` after payment: the website and business are
      locked (R-19).
  17. The commit buttons (pay, start the audit, open the report) are filled
      #d4420b instead of ember-600 #e2470b, so their white labels reach WCAG
      AA (4.6:1; ember-600 gives 4.1:1).
  18. Small grey text on cream (J01's sample note, J30's help line and
      order number) is ink-600 instead of ink-500, so it reaches WCAG AA
      (6.8:1; ink-500 gives 4.3:1 on cream).

## 2026-10-18 — S4 live check; slow websites; refund check at G1

- **AC-25 accepted** with one exception: the Midtrans sandbox refused the
  refund ("merchant insufficient funds"), so the refund notification and a
  DANA dashboard refund are checked at G1 on Midtrans production. Spec 017
  is Verified with that exception.
- **Slow websites (Option A):** Nuave retries a slow website read once
  (PR #139) and lets each try wait up to 10 seconds instead of 5 (12 seconds
  in total per read). A
  customer may wait longer on a slow site before an error, but fewer slow
  sites fail.
- **Workers plan:** the account is still on Workers Free. Q10 stands: move
  to Workers Paid before G1 (live CPU is about 200 ms per invocation).

## 2026-10-15 — S4 merged; Q18

Yasir merged PR #137 (Spec 017, S4) on 2026-10-15 as `15842d4`, and
answered **Q18 — A**: when an order has a payment attempt closed as unknown
and its latest attempt ended unpaid, the customer sees the support-only
screen, not "Coba bayar lagi" (which Q14 would refuse). Recorded in the
spec; built in a follow-up PR.

## 2026-10-14 — S4 build: partial chargeback and lost second payment try

Yasir answered two questions found while building
[Spec 017](../specs/017-payment-and-test-pass/SPEC.md) (S4), where the spec
did not decide:

- **Q11 — B:** a Midtrans `partial_chargeback` is handled like a full
  chargeback (R-15). Before the questions are approved, a partial chargeback
  of the paying transaction ends the order (`failed`, code `refunded`), with
  no AI work and no failure email. After approval it is only recorded. The
  founder gets a notice in every case.
- **Q12 — A:** when the customer's page checks a waiting payment (R-14),
  Nuave also asks Midtrans by the attempt's `order_id`, not only by the
  transaction IDs it already knows. A second payment try whose notification
  was lost is then found at once. It is still at most one check per attempt
  per 30 seconds.
- **Q13 — A:** when a payment attempt has no final answer from Midtrans
  after 7 days (R-06 "closed unknown"), the customer's screen shows only the
  order number and "Hubungi support@nuave.ai", with no "Coba bayar lagi".
  The founder is told after 24 hours (`payment_unknown`) and settles the
  case by hand, so a customer is never invited to pay twice.

Yasir also approved the S4 live check (Spec 017 AC-25) with a budget of
USD 2.00, to run after he merges and deploys PR #137. It does not approve
merge or deploy.

After the Opus max review of PR #137, Yasir answered four more questions
(recorded in the spec as Q14–Q17): an order with a payment attempt closed
as unknown cannot be replaced until the founder settles it; a settled
`99000.00` answer without a currency counts as IDR; the AC-25 budget is a
worst case of USD 4.00 (expected about USD 0.30); and a customer refunded
before approval gets a "Mulai pesanan baru" button for a fresh start.

## 2026-10-14 — Approve Spec 017 (S4)

Yasir approved [Spec 017](../specs/017-payment-and-test-pass/SPEC.md)
revision 6 (PR #136): Midtrans Snap payment in sandbox, founder test pass,
short order number, the order hold at payment confirmation, and founder
notices and cap alerts. Independent plan reviews (Opus, maximum effort): FAIL
on revisions 2, 3, 4 and 5; PASS+NOTES on revision 6, notes applied. Founder
answers Q1–Q10 are recorded in the spec.

This approves the build of S4 in a new session (Sonnet worker, Opus review),
on a feature branch with a pull request. It does not approve merge, deploy,
live AI calls, real emails, live sandbox payments or spending; AC-25 needs a
separate named approval. The founder reports the Midtrans sandbox account,
redirect URLs and GitHub secrets as set up (2026-10-14).

## 2026-10-14 — Bank transfer kept; Workers Paid before G1

Yasir answered two questions raised by the plan reviews of
[Spec 017](../specs/017-payment-and-test-pass/SPEC.md) (S4):

- **Q9:** keep bank transfer as a payment method. Midtrans cannot refund it
  from its dashboard, so such refunds are made by hand from the founder's
  bank and recorded with the support command. The customer's account number
  is asked by support email only when needed and is never stored in Nuave.
- **Q10:** move the Cloudflare account to Workers Paid (USD 5 per month)
  before G1, the first real purchase. Reason: the S3 live run used 12–22 ms
  of CPU per question step and 55 ms for the report, against Workers Free's
  10 ms per cron run, and Cloudflare stops Workers that exceed it
  consistently. S4 sandbox testing may stay on Free. **This supersedes the
  2026-10-13 decision "stay on Workers Free for now".** No plan change is
  made by agents; the founder upgrades the account.

## 2026-10-13 — S4 answers for Spec 017 (draft)

Yasir answered the open questions of the draft
[Spec 017](../specs/017-payment-and-test-pass/SPEC.md) (S4). The spec is not
yet approved; an independent plan review (Opus, maximum effort) comes first,
and the build happens in a new session after approval.

- Keep the founder's email list while Midtrans runs in sandbox (test mode).
- Reserve the USD 2.00 order hold when the payment is confirmed.
- Payment window 60 minutes.
- A paid order with no approved questions after 7 days ends; the founder is
  emailed and refunds by hand.
- Delivery promise wording approved: "Laporan biasanya siap dalam 15 menit
  setelah Anda menyetujui pertanyaan, paling lama 24 jam. Jika gagal, kami
  kembalikan uang Anda."
- Founder test pass through an unlinked page with a secret code plus a
  listed email.
- The server may ask Midtrans directly about a waiting payment.
- Founder alerts go to `hello@nuave.ai`.

## 2026-10-13 — S3 decisions after Spec 016

Yasir made these decisions after Spec 016 was approved. PR #129 is merged
(`d641701`) and deployed.

1. **Late report:** a report that starts before the order's 24-hour deadline
   and finishes just after it is still delivered. No code change; this is how
   the merged runner works.
2. **Secret order code stays as built:** only the customer's browser holds it.
   It is never shown, emailed or put in a URL.
3. **Order number (build in S4/S5):** after payment, the customer's email
   shows a short order number. It is separate from the secret code and
   unlocks nothing; it only helps the customer and the founder talk about one
   order.
4. **Plan:** stay on Cloudflare Workers Free for now. A paid plan needs a new
   founder decision.

Also on 2026-10-13, Yasir accepted the AC-20 evidence exception (browser-drive
screenshots kept locally, not in the PR); see the Spec 016
[verification record](../specs/016-order-and-saved-report/VERIFICATION.md).

## 2026-10-12 — Approve Spec 016 (S3)

Yasir approved [Spec 016](../specs/016-order-and-saved-report/SPEC.md)
revision 6 (`a006048`) on [PR #129](https://github.com/yasir-mukhtar/nuave_v0.2/pull/129).
Independent plan review: FAIL on revision 4, PASS+NOTES on revision 5, notes
applied in revision 6. Founder answers recorded in the spec:

- Order limit USD 2.00 per live order, held from the daily cap until the
  order ends (Q1/D2); unstarted orders expire after 2 hours (Q2).
- Record lifetimes as listed in the spec (Q3); no deletion is authorized.
- Intake progress is kept in the customer's browser only (Q4, option A).
- Live orders only for emails on the founder's private list until S4 (Q6).
  This stops live audits for strangers once S3 is deployed.
- New screen order: free brand confirm, then the order, then the paid
  website reading (D1). The account stays on Workers Free (D3). Every resend
  makes a new link and the old one stops (D4).

This approves the build of S3a and S3b. It does not approve merge, deploy,
live AI calls, provisioning, or spending; AC-21 needs a separate named
approval. Founder actions are listed in the spec (Q5).

## 2026-10-05 — S0 private report delivery and recovery approved

Yasir directed: preserve and resolve identifiable S2 activity where
possible, settle S0 with Fox, then proceed with full S2 integration. Fox
is the delegated founder-side decision representative and merge/deploy
decision delegate; Pac coordinates and records. Publication, provisioning,
payments, refund execution, deletion, and launch are not approved by this
decision.

Fox approved the S0 decision packet V2 exactly as reviewed (163 lines, Git
blob `7c15793a54cc5723caf69664c03e2cc7304caec0`, written on base `62b5b51`).
Independent review `a0738376` returned **PASS+NOTES** over the entire
source packet and its named canonicals, with all V1 gaps fixed; Fox
approval `d68c7478` covers the exact packet plus this bounded
four-document recording on a non-main feature branch, its push/PR work,
and read-only network checks.

**Selected mechanism.** One immutable private report per order, stored on
the server, with a revocable private link sent to the order email. No
account, password, dashboard, or report-history product at launch.

This is an approved private operating policy, not a public performance
promise. The live product, `/terms`, `/privacy` and `/support` are
unchanged by this entry. Customer-facing wording still needs separate S5
approval, the build needs an approved bounded S3 specification, and
deletion, provisioning, sending-domain/support verification and actual
delivery performance remain separate implementation/launch gates.

### Options compared

| Option | Customer/access implications | Operating and engineering cost drivers | Recommendation |
| --- | --- | --- | --- |
| Stored report + revocable emailed link | Simple initial access and cross-device return; link possession grants access, including to someone receiving a forwarded link; support handles recovery | Durable storage/jobs, initial email and retries/resends, grant revocation; least new authentication machinery | Choose |
| Stored report + private link only, no email | Customer must retain the link; weaker cross-device return/recovery; contradicts current Module 06 email ownership unless separately changed | Same storage/jobs; removes initial email, increases manual recovery burden | Reject |
| Stored report + emailed one-time code/magic-link recovery | Verifies mailbox possession for self-service recovery; needs enumeration/rate-limit/expiry controls | Same storage/jobs plus challenge state and additional email attempts | Defer |
| Narrow report history for one verified email | Easier repeated access to several reports; unnecessary for the first one-report purchase | Same storage/jobs plus verified-email sessions, history listing and its access controls | Defer |
| Bounded customer account | Credentials/login and account recovery before reading; largest support/authentication burden of these launch choices | Same storage/jobs plus credential/session/account lifecycle | Defer |

These are qualitative comparisons, not measured effort or current dollar
quotes. Existing Cloudflare/Resend account terms, quotas, credentials and
pricing are unverified. No zero-cost/free-tier claim or new fixed subscription
is approved. Verify costs and permissions before provisioning; the USD 5
provider-call allowance does not authorize infrastructure charges.

### D1–D8 approved decisions

- D1: retain the completed report and its immutable customer-visible evidence
  for 12 months after completion. Private access ends at that expiry or earlier
  revocation. Support may reissue only while the report exists and D7 succeeds.
  Nonexistent, expired and revoked access show a neutral unavailable response.
  This selects a finite future policy, not permission to delete anything now.
  Before S3 approval, separately bound every other record class; do not silently
  apply report deletion to financial records or unresolved spending liability.
- D2: target usually 15 minutes and at most 24 hours from the first
  server-accepted audit start for the customer's approved question pack, not
  payment, opening the page, or a client-supplied timestamp. The start time is
  immutable across retry. Fulfillment requires a validated private web report,
  an active access grant, and Resend acceptance of a report-ready email attempt
  without a known unresolved terminal delivery failure. This is not proof of
  inbox arrival or customer opening. PDF-only delay does not block fulfillment.
  This is a proposed future launch policy, not observed performance.
- D3: retry only technically failed work within S2's safe commitment; do not
  repeat valid observations or regenerate a valid report to fix email/PDF.
  Unknown post-dispatch cost remains a liability. At the 24-hour deadline,
  missing web report/access or unsuccessful email handoff/unresolved terminal
  email failure triggers full refund by hand. An earlier irrecoverable failure
  or a later confirmed unrecoverable delivery failure also triggers that remedy.
  Record terminal failure once; complete refund within three business days
  from that record. Email-only failure means retry the email/support recovery,
  not rerun the audit; PDF-only failure means repair the derived artifact, not
  refund an otherwise fulfilled web report automatically. Business days mean
  Monday-Friday in Asia/Jakarta; precise customer wording is reviewed in S5.
  No money movement or automatic refund is authorized now.
- D4: support@nuave.ai, response within one business day under the same
  business-day convention. Mailbox operational readiness is unverified;
  no email is sent by this decision and no current service claim is made.
- D5: wrong email or business is handled manually through support, not by
  creating another paid entitlement or repeating a valid audit. Recipient
  changes require ownership authorization AND verification of the destination
  mailbox. If the original mailbox is available, confirm from it and verify
  the new one before a new recipient version/access grant. If unavailable,
  an authenticated current order session may authorize the change only if S3
  implements and verifies it, plus verification of the new mailbox. Without
  either approved proof path, refuse redirection; an exceptional manual
  proof method is deferred until separately approved. "Manual" and an order
  number alone are never sufficient proof.
- D6: plain Indonesian terms/privacy wording receives separate approval in
  S5. No legal-compliance claim, customer publication or launch now.
- D7: an order number or Midtrans receipt locates the order, never proves
  ownership. Require confirmation from the recorded order mailbox or an
  authenticated current order session if implemented and verified in S3.
  No approved proof means no reissue, recipient change or disclosure.
- D8: after D7, issue a fresh grant to the SAME mailbox and invalidate the old
  grant atomically, including sessions derived from it. Do not mutate the
  report, evidence, order or entitlement. A different mailbox follows D5,
  verifies the destination, and creates a new recipient version.

### Ten required customer flows

1. Original-device email open: 06 sends the ready notice using 07's active
   destination; 07 validates the grant/expiry/report and opens the immutable web
   report with honest PDF status.
2. Same-device return: reopen the email link or a still-valid exchanged session;
   recheck revocation and expiry. No provider work starts.
3. Other-device return: open the same email link and validate the same grant;
   no account or new audit is created.
4. Forwarded/leaked secret: disclose that bearer-link sharing transfers access.
   After D7 confirmation, replace/revoke under D8; old links and derived
   sessions stop working. Do not claim access is inherently identity-bound.
5. Expired/revoked access: neutral unavailable result, no private metadata,
   cached protected content or AI calls. Support reissue only if the report
   still exists and D7 succeeds.
6. Lost email/unusable action: support confirms the recorded mailbox, then 07
   replaces the grant and 06 resends. An unavailable original mailbox follows
   the conditional D5 proof path; otherwise fail closed.
7. Arbitrary-email enumeration: recovery responses do not reveal order/report
   existence; rate-limit and deduplicate requests. No access is issued without
   proof.
8. Recipient change: authorize ownership, verify the new mailbox, create a new
   recipient version, and invalidate former access before 06 sends to the new
   recipient. Do not edit report/evidence/order.
9. Web ready/PDF pending or failed: deliver the validated web report/email;
   preserve truthful PDF state and repair only that artifact.
10. Ready-email resend: 07 supplies a currently valid authorized destination;
    06 records a new delivery attempt for the same immutable report and
    recipient version. No report regeneration, observation or entitlement.

### Minimum conceptual state and boundaries

This is an inventory, not a database schema: order and recipient version;
server-owned accepted-start/deadline; immutable report/evidence version and
retention expiry; grant validity/expiry/revocation and any exchanged session;
separate web/PDF artifact states; idempotent delivery identity and attempts;
terminal remedy/support status. Email/credentials/private contents stay out of
model prompts, analytics, logs and Git.

Module 06 owns report validation, artifact state, Resend delivery, delivery
failure and resend. Module 07 owns access opening, return, expiry/revocation,
replacement and recovery. Require no indexing, no referrer-secret leakage,
safe secret storage, protected downloads, and server-side authorization on
every private artifact. Private storage has no public-bucket shortcut.

Prefer the existing Cloudflare stack, with D1 as the S2 server-ledger/order
metadata baseline. Select and prove exact private artifact storage and durable
runner in S3's specification, not through an unverified SDK choice here.
Closing the tab must not stop paid work or repeat successful observations.
The current browser PDF path is not replaced by this decision.

### Sequence, held state and remaining gates

- S1 is already complete through PR #110.
- The S2 spending-cap foundation remains held on feature branch
  `feat/s2-ledger-foundation-20261004` (committed `fad8cfe`, not on main),
  plus a preserved uncommitted canonical timestamp correction. Its 21
  focused tests pass, but the revision-3 full `npm run verify` FAILED on
  four browser checks (52 passed). There is no final independent acceptance
  of the correction, no release, and no enforcement on main. The failed
  gate is carried forward, and the foundation worker's consumed budget
  (7 of 9) is not reset.
- Next: full S2 integration — inventory, storage compatibility/bindings,
  credible versioned pricing bounds, retry accounting and fail-closed
  provider integration — routed by [`NOW.md`](./NOW.md). S3 still needs an
  approved bounded specification and the non-report retention decisions.
  Held Spec 015 is not adopted.
- Payment, final S5 wording, outside users and broad design polish remain
  gated.

**Carried-forward clarification for S3/S5 acceptance context (Fox note, not
a policy change):** revoking an access grant stops future access and
sessions derived from it; it cannot take back report copies or screenshots
already downloaded.

Acceptance for this record (from the packet): explicit delegated policy
choice; complete comparison and ten flows; honest costs/readiness; correct
module ownership; finite report access without deletion authority; no
current customer behavior or public promise changed. Provisioning,
sending-domain and support-mailbox verification, current prices and actual
delivery performance remain separate implementation/launch evidence.

## 2026-10-04 PR120 JQ status finding assessed

Yasir asked Pac to coordinate resolution of PR #120 and supplied the withheld
Devin Review finding, "Milestone records disagree on JQ closeout." At the
original PR head `869c9f1`, NOW routed to JZ while the ledger still marked JQ
in progress and Spec 013 retained active/pending JQ status. The finding was
valid for that revision; it was not an application failure.

Current main `613f1b3` already records JQ as merged with independent PASS in
[the ledger](./PAYING_CUSTOMER_PLAN.md#1-progress-ledger), and qualified JZ
acceptance in [Spec 013](../specs/013-airbnb-intake-journey/SPEC.md#verification-record)
and [final verification](../specs/013-airbnb-intake-journey/VERIFICATION.md#final-jz-closeout).
This follow-up incorporates those closeouts, reconciles shared routing and
updates current pre-merge documentation references to the completed
[PR #122 closeout](https://github.com/yasir-mukhtar/nuave_v0.2/pull/122#issuecomment-5979454013).
Frozen slice outcomes and evidence exceptions remain history, not active
handoff instructions; no completed implementation or live test is repeated.

The supplied finding is assessed and addressed by this reconciliation. That
does not claim its Devin Review UI item was marked resolved or that a later
automated review has no findings. The earlier access-blocker record remains
historical. Fresh exact-head independent review and GitHub checks are required.
This bounded documentation follow-up grants no merge, deployment, PR closure,
deletion, settings/spending change, Stage 2 implementation or customer exposure.

## 2026-10-04 trustworthy baseline and deferred polish

Yasir accepted the repository-baseline recommendation and asked Pac to
coordinate one current, verified main with accurate status. Clean means a
trustworthy starting point, not deleting retained drafts, branches or evidence.
Yasir deferred experience and design polish until all intended screens exist,
so it can be done in one pass.

Yasir then said, "Fox, take over from me." Within this baseline task, Fox
approved safe local-only fast-forward synchronization and preparation of the
existing PR #120 documentation correction. Pac retains technical coordination;
Imu implements a bounded brief and Rev independently reviews the exact result.
This is scoped delegation, not a standing replacement for founder approval.

Merge, deployment, PR closure, deletion, visibility or billing changes, live
cleanup, new spending and customer exposure remain separately permissioned.
Stage 2 implementation is not authorized. The local Spec 015 draft stays held;
older draft decisions and allowances do not override the current main pause.

JZ's canonical closeout is complete in [PR #122](https://github.com/yasir-mukhtar/nuave_v0.2/pull/122#issuecomment-5979454013),
merged as `613f1b3`; the existing evidence exceptions remain. Current routing
updates do not reopen JZ acceptance or require another recursive closeout.

Observed repository enforcement is private/unprotected; the protection and
ruleset APIs return HTTP 403. This entry records the discrepancy, not permission
to weaken rules, change visibility or buy a subscription. The withheld PR #120
review finding and PR #121/#122 preview-cleanup failures remain unresolved.

## 2026-10-04 — accept JZ with documented evidence exceptions; Stage 2 not authorized

Alfred **accepts JZ** under Yasir's delegated completion authority on 2026-10-04.
Yasir's exact successful-result approval was: “The prompts generated, the report
is successfully created. I approve this result.” Alfred accepts the three plan
judgments — flow and feel, information completeness/use, and settled nuances —
from the composite live-reported, visual, slice and contract evidence, not a
claim that Yasir personally tested every acceptance criterion or F1–F18 rule.

[Spec 013's final verification](../specs/013-airbnb-intake-journey/VERIFICATION.md#final-jz-closeout)
records **Verified with documented evidence exceptions** under
[WORKFLOW](./WORKFLOW.md#independent-verification): historical-drive freshness;
the record-specific blocked-framework/JavaScript-guard and fictional/stubbed
synthetic limits (original FAIL/HOLD and stop-at-entry remain failures); the
missing reading-animation/continuous synthetic-label observation for R-07;
and unknown live business/revision/run/usage/charges/attempt count, without a
reconstructed per-field R-24 or all-F1–F18 live walkthrough. “2nd retry” remains
the founder's wording, not an inferred attempt count. No requirement is waived
or reusable exception created. Exact observer/executor attribution is retained
in the verification record; no live efficacy or prevention guarantee is made.

The requested bounded reliability/security correction is complete:
[PR121](https://github.com/yasir-mukhtar/nuave_v0.2/pull/121), reviewed
`7aa6fc9a08d141ecab03ff98e05a06408ade405d`, merged
`d7a2f50fddafae222eb62dbabaec5497010743b8`; the
[resolved final-head response](https://github.com/yasir-mukhtar/nuave_v0.2/pull/121#discussion_r4176920304)
records independent review and the parent's canonical gate.
[Main CI/deployment](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/37192219597)
shipped worker version `09c25e17-02e8-498b-bfe7-20e43f7ea0cd`.
Parent's HTTP smoke is availability only, not rendered QA or a new live audit.
The separate [closed-preview cleanup failure](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/37192219083/job/111406635060)
remains disclosed; no cause, ongoing exposure or remediation is established here.

This decision supersedes earlier current JZ HOLD/correction-pending routing,
not historical failures, counts or warnings. **JZ accepted; canonical docs
PR, independent review and merge pending.** Parent records that transition.
After closeout, await a separate next-stage instruction: **S0 is not initiated;
Stage 2, outside users, new spending and commercial commitments are not authorized**,
despite the plan's eventual sequencing. Earlier entries below remain dated history.

## 2026-10-04 — approve PR121 public question-error correction

Alfred, under delegated founder authority, approves the bounded public API/UI
projection recorded in Spec 013 R-30/AC-18. The unresolved PR121 thread
`discussion_r4176528975` is a release blocker; the parent owns its disposition.
Failure text, rejected content, diagnostics and provider-controlled failure IDs
are withheld explicitly. Internal identities/evidence and validated billing,
known preflight refusal versus uncertain execution, accepted success and retry
gates remain unchanged. Scope is only the question endpoint and its UI, one
pure helper and nearby regressions. No new persistence, live spend, dependency,
shared gate, instruction or other-stage change is approved. Founder successful
prompts/report approval stands. Earlier review/gate covers the old head only;
fresh review/CI are required. No merge, deploy or JZ closeout approval.

## 2026-10-04 — approve bounded JZ question-generation reliability correction

Alfred (delegated founder authority) approved A+B; Mia's independent technical
review supports the bounded correction. The parent reconciled spec routing:
one active [Spec 013 R-30](../specs/013-airbnb-intake-journey/SPEC.md) and AC-18,
with cross-references, not changes to historical Specs 009/010.

- Yasir's successful prompts/report result is accepted. His observed
  `Error: finish_reason: length` followed by “its succeed on the 2nd retry”
  remains reliability evidence, not a known attempt count, cost or root cause.
- R-30 is an explicit narrow exception to the unchanged-instruction/generation
  boundaries: safe incomplete recovery copy and live retry-cost disclosure,
  optional allowlisted normalized diagnostics within existing outcome/owner-only
  configured sidecars, and the exact concise-v1 runtime addendum.
- Alfred's remount refinement supersedes the retrospective notice condition:
  display the exact R-30 notice beside an available retry in the current
  server-selected live mode, from the existing `live` prop, including remount.
  It describes the next request, not past transport/billing. Synthetic current
  mode omits it; historical attempts, interruption and unknown/zero billing
  stay unchanged. No discriminator, persistence, schema or version is added.
  A received-response evidence-write failure retains responded/settled billing;
  no-response transport plus evidence failure retains sent/unknown, not a
  fabricated response or settled zero. Parent approved the adjacent JQ-row
  reconciliation from PR #117's merged/PASS evidence.
- Preserve the verbatim core, research method, three sections, all ten unnamed
  questions, frozen context/hash protections, explicit confirmation and all
  request settings. No partial repair, automatic paid retry, token/model change,
  new persistence, evidence enablement or agent live call is approved.
- Runtime instruction version becomes `glm-direct-ten-2026-09-18-concise-v1`;
  method/pack/session versions do not change. Presentation guidance is not a
  new rejection cap. No measured live efficacy or guaranteed prevention claim.
- Spec 013 remains Implementing; JZ is founder-result-accepted with this narrow
  correction pending independent exact-head review after its offline gate.
  Parent owns later closeout; no Stage 2, outside users, merge or deploy approval.

## 2026-10-03 — Park optional PRs until an explicit founder request

Decided directly by Yasir: [PR #115](https://github.com/yasir-mukhtar/nuave_v0.2/pull/115)
(autonomous workflow documentation), [PR #116](https://github.com/yasir-mukhtar/nuave_v0.2/pull/116)
(CI browser-artifact pilot), and [PR #102](https://github.com/yasir-mukhtar/nuave_v0.2/pull/102)
(Spec 014 website/free-check experiment) are parked outside the main work.

Close them without merging or deleting their branches. Preserve their work,
evidence, owner records and existing budgets. They must not appear in routine
backlog, status, blocker or notification reports, and agents must not inspect,
resume, repair, test, update or reopen them unless Yasir explicitly names the
relevant PR or topic and asks to inspect or continue it. Do not proactively
ask to restart them. A broad instruction to work autonomously or tackle the
backlog is not permission to reactivate them.

Minimal metadata may be read to exclude these items from active work.
Inspection permission is not implementation approval; a request to resume
does not reset a budget or waive specification, review or release gates.
Their unmerged branch material is not active product context. The main
plan's landing-page milestone and existing engineering/review requirements
remain in force. This supersedes older instructions to queue or update these
three PRs. The standing rule is in [AGENTS.md](../AGENTS.md#parked-work).

## 2026-10-02 — JQ decisions: the three retained customer questions return as dedicated optional screens

For [Spec 013](../specs/013-airbnb-intake-journey/SPEC.md) milestone JQ,
decided by Alfred (delegated), 2026-10-02:

- **Every question is shown.** Target customer, buyer considerations and
  differentiator each get a dedicated chapter-3 screen instead of staying
  review-only. Nothing on the JQ list is dropped.
- **Optional stays optional.** No new required fields: `Lanjut` is never
  blocked on the three new screens, and an empty Continue is allowed on
  each. No `Belum tahu` chip is added to them.
- **Chapter 3 order:** target customer → customer needs → buyer
  considerations → service → market (skipped for a location focus) →
  competitors → differentiator → public fact → review.
- **Provenance and edits:** prepared values arrive selected with their
  source label; any owner change becomes `Dari Anda`. Each review row's
  `Ubah` opens its dedicated screen, and `Lanjut`, footer `Kembali`, or
  marked browser Back returns to the review.
- **Comparators unchanged:** the three modes stay as built in J6; named
  mode still requires one to five names.
- **Contracts unchanged:** no new AI call, provider, payment step, report
  shape change, or required-field gate. The privacy rejection path, session
  versioning, frozen context and question-generation contracts apply to the
  new screens as to the existing ones.

## 2026-09-28 — plain landing voice in VOICE.md

The founder approved updating [`VOICE.md`](VOICE.md) to match landing copy v8,
first as item 12 of the website team's round 1 decisions and then with a
direct **"yes"** to "Should I update VOICE.md to match?".

- `bisnis Anda` replaces `brand Anda` as the default in prose.
  `Seluruh brand` stays where the report and intake separate a whole
  multi-location brand from one location.
- Marketing copy says plain `AI`. The report and intake keep `model AI` where
  the model is the tested actor.
- Light spoken words (`cuma`, `kok`, `duluan`) are welcome in marketing copy,
  and copy is written in Indonesian first, not translated from English.

Item 9 of the same decisions is recorded with it: `ChatGPT` names the
customer's habit, never Nuave's own answers, because Nuave asks OpenAI's model
through the API. Nuave's data is `jawaban AI`, and the method note names
OpenAI.

The price in `VOICE.md` (`Rp99.000`) and the settled landing CTA are not
changed here; they change with the product.

## 2026-09-27 — approve Spec 013

The founder said: **"Approved."** This approves
[Spec 013](../specs/013-airbnb-intake-journey/SPEC.md), the Stage 1
Airbnb-style intake, after independent review of
[PR #95](https://github.com/yasir-mukhtar/nuave_v0.2/pull/95): FAIL in round
1, then PASS with notes in round 2, with the notes fixed. Building starts
with slice J2. The spec's tightenings are approved with it: a ninth market
area, a sixth competitor, and "named" with no name are blocked with a
message instead of being changed silently, and a focus change re-checks the
category.

## 2026-09-27 — Spec 013 open questions answered

The founder answered the three open questions in the Spec 013 draft:
**"1. Default. 2. With Nuave's suggested names already selected. 3.
Default."**

1. When one location is audited, the category screen uses the whole-brand
   suggestions.
2. When preparation suggests competitors, the competitor screen arrives with
   "named competitors" selected and those names (up to five), labelled
   `Saran Nuave`. The owner can remove them or pick another choice. With no
   suggestions, "don't know yet" is selected. This changes today's default,
   which starts at "don't know yet" even when suggestions exist.
3. Stage 1 uses the prototype's Indonesian headings and helper text; the
   founder reviews final wording at JZ.

## 2026-09-27 — J1 decisions: the Airbnb-style intake keeps today's rules

The founder approved all eighteen recommendations of the J1 gap list
([PR #94](https://github.com/yasir-mukhtar/nuave_v0.2/pull/94), section F and
the founder's decisions comment): **"All recommendations in section F are
approved as the J1 decisions."** PR #94 is a read-only record and is closed
without merging. [Spec 013](../specs/013-airbnb-intake-journey/SPEC.md) turns
the decisions into requirements.

- **Shape (F1, F12):** one question per screen in the prototype's order;
  prepared answers arrive selected; a screen blocks only when a required
  answer is missing, by today's rules, not the prototype's looser ones.
  Optional screens are shown, say `Opsional`, and never block (F12).
- **Kept from today:** name and website at entry (F2); inline name
  correction keeps other answers, while a website change resets preparation
  (F4); the three source labels (F5); whole brand pre-selected as
  `Saran Nuave` (F6); single-target product focus, with the rest of the
  catalogue shown read-only (F8); today's market rules, including the
  regional limit, with no skip rule (F9); privacy checks and source links
  (F14); unreadable websites are errors (F15); the all-unnamed ten-question
  method (F17).
- **Taken from the references:** the one-location option only when
  locations are found, plus a manual route requiring name and address (F7);
  the workbench's four service channels (F10); three competitor choices:
  named, none, don't know yet (F11); one review screen as the single
  confirmation, with editable aliases (F13); category suggestions that fit
  the chosen focus (F18).
- **Deferred:** the no-website path to Stage 2 (F3); Google Maps sources
  until a Maps extraction exists (F16).
- **JQ list:** buyer decision considerations is added. Four service channels
  and the competitor distinction are now built in Stage 1 (F10, F11).
  Must-answer vs only-asked stays open until JQ.
- **No implementation before Spec 013 is approved.**

## 2026-09-27 — keep every intake question; build the Airbnb experience first

The founder said: **"Those questions are important and mandatory, except the
extra public fact."** and **"Decision: prioritize implementing the Airbnb
intake experience into the journey first. After that, we will recreate
questions for what's missing. But please write an important note into the
plan so me and the agent won't forget about this."**

- Nothing today's intake asks for is dropped in J1. This settles the "items
  the founder explicitly drops" exception in the entry below: there are
  none. The extra public fact stays optional.
- Order: J2…Jn build the Airbnb-style experience first. A new milestone, JQ,
  then adds back what the prototype and the workbench lack, before JZ:
  target customer, what makes you different, "I don't know yet" vs "no
  direct competitor", and the four ways customers are served
  ([plan §5, JQ](./PAYING_CUSTOMER_PLAN.md)).
- Open until JQ: competitors, target customer, customer needs and what makes
  you different can be skipped today. Must the owner answer them, or only be
  asked?

## 2026-09-27 — what "done" means for the intake journey

The founder answered plan §4.1: **"Yes matching the prototype, but it doesnt
mean to implement it brutally. There are probably some nuances in the
existing intake that needs to be reconsidered instead of blindly overriding
it (point out to me). Basically the protoype should cover all the
informations needs and developed from the previous version of the intake
journey, so it's as complete as the previous version but more intuitive."**

Stage 1 is done (JZ) when the journey:

1. follows the flow and feel of `intake-prototype.html`;
2. asks for and uses everything today's intake asks for and uses: as complete,
   but more intuitive. The only exceptions are items the founder explicitly
   drops in J1; and
3. has had every nuance of today's intake that the prototype would override
   shown to the founder, who decided to keep, adapt, or drop it.

J1 now produces an information check and a list of nuances to reconsider,
each with a plain recommendation, alongside the gap table
([plan §5, J1](./PAYING_CUSTOMER_PLAN.md)).

## 2026-09-27 — approve the paying-customer plan

The founder said: **"The plan is approved. J0 can record this."** This
approves [`PAYING_CUSTOMER_PLAN.md`](./PAYING_CUSTOMER_PLAN.md) as merged
through PR #92 (`29addbe`). It is now the active plan.

- **It replaces [`END_TO_END_PLAN.md`](./END_TO_END_PLAN.md) for the order of
  work, the stages and the gates.** The old plan stays as the reference for
  the detailed requirements the new plan points to (for example, the Phase 4
  exit gate, §6 technical shape, §10 failure matrix and §12 non-scope). Where
  the two disagree, the new plan wins.
- **Founder direction (plan §3.4):**
  - order: first finish the intake journey (URL → Airbnb-style confirm and
    quiz → review questions → report); then payment and the landing page;
    then everything else;
  - real test runs without payment stay possible throughout. Stage 1 has no
    payment step, and a private founder test pass follows once payment exists;
  - payment goes right after the URL and before any business details: URL →
    order summary (email) → pay → intake → approve questions → report;
  - how reports are saved, emailed and recovered is decided at S0, after
    Stage 1;
  - the intake reference is `intake-prototype.html`, with the design
    workbench second. Today's `/audit`, the only live intake, is the
    implementation to measure against, not a reference (`/audit/new-intake`
    now redirects to it).
- **Changes to the original plan (plan §3.5):**
  - the Airbnb-style intake is Stage 1, ahead of durable delivery and payment;
  - polish (Phase 6) is no longer a gate before payment or before owners see
    the product. This supersedes the `NOW.md` "Not now" line that held back
    showing the product until after polish;
  - the known-owner pilot is no longer a gate before selling to strangers
    (the 2026-08-09 order, steps 5–6, and the 2026-08-12 slice order).
    Owner feedback is the optional Track V, and G1 opens Nuave to paying
    customers. The outside-user safeguards in `NOW.md` still apply;
  - lighter paperwork: one PR per milestone, proven by its PR description and
    one verdict. Customer-visible work still needs a short approved spec: one
    for Stage 1 (after J1) and one for Stage 2 (after S0);
  - at low volume, manual support replaces features for refunds, recipient
    changes, wrong-business replacements and retries.
- **Track V:** the founder approved the three owner-feedback questions as
  written (plan §5, Track V).

Not decided here: the S0 answers (D1–D8) stay suggested defaults until S0.
`NOW.md` is reset to a short page and `END_TO_END_PLAN.md` is relabelled as a
reference. [`INDEX.md`](./INDEX.md#current-development-plan) is the one place
that says which plan governs what; `README.md`, `AGENTS.md`, `PRODUCT.md`,
`JOURNEY_CONTRACT.md` and `specs/README.md` point there.

## 2026-09-27 — accept playbook proposals P-1 to P-4 and P-7

The founder said: **"Accept all."** This adopts the remaining proposals of the
[Agentic Engineering Playbook](./AGENTIC_ENGINEERING_PLAYBOOK.md) (§B.5) as
written:

- **P-1:** agents may commit and push to their own non-`main` feature branches
  without asking. Merge, deploy, force-push, and anything on `main` stay
  founder-only. This supersedes the `AGENTS.md` rule "Do not commit or push
  unless the founder explicitly requests it" and the same line in the P-6
  entry below.
- **P-2:** an internal engineering change with no customer-visible behavior
  change needs no spec. Its checkable finish condition goes in the PR
  description. Customer-visible behavior still needs an approved spec.
- **P-3:** no paid tools now (no bot reviewer, cloud agents, or extra
  subscriptions). Revisit when the playbook's §7 shows a gap that humans keep
  catching.
- **P-4:** merge and deploy stay with the founder. Revisit only after the
  playbook appendix's trusted-verdict item is built.
- **P-7:** add `npm run test:workers` to CI or `verify` when a second
  worker-runtime-only failure (class C) occurs. Nothing changes until then.

`AGENTS.md`, [`WORKFLOW.md`](./WORKFLOW.md), and the worker prompt template
now state P-1 to P-4.

## 2026-09-26 — evidence per change: PR description plus one verdict comment

The founder said: **"Accept P-6."** This adopts proposal P-6 of the
[Agentic Engineering Playbook](./AGENTIC_ENGINEERING_PLAYBOOK.md) (§B.4).
[`WORKFLOW.md`](./WORKFLOW.md) now has an **Evidence per change** section:

- each change leaves only its PR description and one verdict comment from an
  agent that did not write it;
- a product-behavior spec package holds only `SPEC.md` and `VERIFICATION.md`;
- worker prompts, worker results, separate review reports, and hash manifests
  stay out of Git unless the founder asks for a specific one.

Files already committed stay as historical records. The first change to use
this rule was the `verify-nuave` build (PR #84, independent **PASS** at
`563d10f`). The rule on commits and pushes is unchanged: agents still commit or
push only when the founder asks (P-1 remains a proposal).

## 2026-09-26 — adopt the agentic engineering playbook; place the verify skill

After independent review returned **ACCEPT** (R2.1 review with follow-up check
`d2d92c1`, on draft `536a6cf`), the founder accepted the reviewer's
recommendation on where the verify skill lives and asked to proceed. This
adopts the [Agentic Engineering Playbook](./AGENTIC_ENGINEERING_PLAYBOOK.md),
moved out of `drafts/`.

- **P-5 decided as written.** The canonical skill folder is
  `.agents/skills/verify-nuave/`, with a `.claude/skills/verify-nuave` symlink
  pointing to it so Claude Code finds it too. The first run checks that each
  tool in use lists the skill without being told the path.
- **Build go-ahead.** Asked whether the build needs its own spec, the founder
  chose: "B.2 is the go-ahead." The playbook's section B.2, including its
  finish condition, is the approved plan for the one `verify-nuave` PR. This
  is a one-off: the general spec rule is unchanged, and P-2 stays a proposal.
- **Still proposals:** P-1 to P-4, P-6 and P-7. `AGENTS.md` and
  `docs/WORKFLOW.md` are unchanged.

This record grants no merge, deployment, live-call or spending authority.

## 2026-09-26 — record Spec 012 Verified with the AC-18 exception

The founder relayed independent closeout **PASS with founder-approved exception
(AC-18), with no remaining findings**. The orchestrator matched reviewed patch
`16835384b2daf47866ebc0135fdb241e4b3f36413686d92623eda7395c35a56d`,
reconstructed all 17 reviewed Markdown files on `d45a944`, and records Spec 012
**Verified with founder-approved exception (AC-18)**. See the
[closeout acceptance](../specs/012-evidence-first-report/CLOSEOUT_ACCEPTANCE.md).

The original same-evidence real before/after comparison remains unperformed
and deferred. The founder's acceptance of the disclosed fictional sample
supports progression; it is not a rubric PASS or proof of real synthesis
quality. Print, zoom, emulation and fictional-evidence limits remain recorded.
Formatting and reference-section simplification remain deferred.

The reviewed candidate stays preserved. Final status changes are a separate
local documentation package; publication needs explicit founder authorization.
No code, tests, live calls, commits, pushes or deployment follow from this
closeout. Spec 011 closures and USD 1.06241155 accounting remain unchanged.

## 2026-09-26 — accept the current report for now and defer formatting improvements

The founder said: “Generally the new report is more useful,” judged its
substance already present, and directed: “Let's keep it for now and move
forward.” The reference/link section is too long and distracts from reading;
the founder explicitly accepts it for now. Simplifying the format and reducing
reference clutter are deferred improvements, not a new implementation task.

The review followed delivery of the clearly labeled fictional B2 layout PDF,
now available locally as `review-artifacts/b2-fictional-layout-sample.pdf`.
Its SHA-256 is
`cdc7626ee20809f804fe5ef54f6d88d039abe44f3bf800c90806e62b1a7a5d3c`.
The real retained-evidence before/after comparison had not been prepared.
Record the founder's acceptance as sufficient to move forward with the current
report, with that comparison deferred; do not claim the original AC-18
same-evidence rubric was executed or that real model-output usefulness was
established by the fictional sample.

This supersedes report polishing and another usefulness-review round as the
immediate next action. Complete combined acceptance/document reconciliation
with this acceptance and its evidence limit retained. Spec 012 remains
Approved pending that closeout, rather than automatically becoming Verified.
No runtime change, publication, new provider call, or commercial-release
authorization follows from this decision. See the
[B2 acceptance record](../specs/012-evidence-first-report/B2_ACCEPTANCE.md#founder-acceptance-for-now--2026-09-26).

## 2026-09-26 — approve and complete PR #81 merge and production deployment

The founder said **“PR approved”**, then **“Merge”** after being told that
merging triggers automatic production deployment after main's checks pass.
The orchestrator confirmed approved head `25679a5`, current main `d93ec82`,
green required `validate` and synthetic preview, mergeability and zero
unresolved conversations. It merged
[PR #81](https://github.com/yasir-mukhtar/nuave_v0.2/pull/81) through the
protected PR path without an admin bypass, force push or branch deletion.

Merge `d45a944674f29828bdd95bc878ce8ca07ff01818` at 08:00:49 WIB has parents
`d93ec82` and `25679a5`, and approved tree
`8337005d84a729292e7138c142ebc55acfb3b393`.
[Main validation and deployment](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/36206938604)
passed: 1,460 unit tests, both builds, 33 browser checks, the merged-PR-origin
gate and production deployment. Deployment completed at 08:06:42 WIB, version
`d188c76a-d1e6-4d78-b9e4-c771c16722b3`. Preview cleanup passed. A production
`/audit` HEAD request returned HTTP 200. No live provider call was made.
This entry carries the release facts already recorded in the
[B2 acceptance](../specs/012-evidence-first-report/B2_ACCEPTANCE.md#merge-and-deployment--2026-09-26).

## 2026-09-25 — approve and complete PR #80 merge and production deployment

The founder said **“PR 80 approved. Merge deploy.”** The orchestrator checked
the approved head `eb5483e`, current main, required `validate` success, resolved
conversations and the exact publication tree. It marked the draft ready and
merged [PR #80](https://github.com/yasir-mukhtar/nuave_v0.2/pull/80) through the
protected PR path without an admin bypass, force push or branch deletion.

Merge `d93ec8256200b662796103246e224bd4a3800603` at 17:15:52 WIB has parents
`8907d96` and `eb5483e`, and approved tree
`300f6cd5eb7dca278ae67c04c47d63bdae76cd1a`.
[Main CI and deployment](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/36123028659)
passed: 1,429 tests, both builds, 32 browser checks, the merged-PR-origin gate
and production deployment. Deployment completed at 17:21:04 WIB, version
`7be82d31-20b2-4fad-9f41-90991b0f8631`.
[Preview cleanup](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/36123029058)
passed. A production `/audit` HEAD request returned HTTP 200.

This completes the approved B1 release. It supplies no live-audit/provider-call
allowance and does not complete Spec 012: B2, combined verification and the
founder's AC-18 usefulness judgment remain open. Spec 011 stays Verified and
F-01/F-03/AC-07 stay closed; accounting stays USD 1.06241155 of 5. The
[B2 worker prompt](../specs/012-evidence-first-report/B2_WORKER_PROMPT.md) is
ready for founder handoff from main containing this merge. No worker was
dispatched, and shared source/product and reviewed candidates were preserved.

## 2026-09-25 — approve and complete PR #79 merge and production deployment

The founder said **“Draft PR #79 approved. Merge deploy.”** The orchestrator
verified current main, required `validate` success on reviewed head `dd9e405`,
no unresolved conversations, the exact approved tree and protected merge rules.
It marked the draft ready and merged [PR #79](https://github.com/yasir-mukhtar/nuave_v0.2/pull/79)
through the protected PR path, with no admin bypass, force push or branch deletion.

Merge commit `8907d96d10ca101f6fdd68c8c77607cd994d83f3` at 12:39:52 WIB has
parents `7f34d69` and `dd9e405` and approved tree
`c74a801518be9e7f3181360f52ba783dc072ecd1`. The
[main workflow](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/36099502093)
passed validation (1,407 tests, both builds, 32 browser checks), the merged-PR
origin gate and production deployment. Deployment finished at 12:45:09 WIB;
Cloudflare version `f4e24bb4-4da1-48ef-9bfa-102d6d332c9e`.
[Preview cleanup](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/36099502511)
passed. A read-only HEAD check of production `/audit` returned HTTP 200.

This completes the approved release; it is not a new live audit or provider-call
allowance. P9/P14 stay accepted cautious stops, Spec 011 stays Verified,
F-01/F-03/AC-07 stay closed, and accounting stays USD 1.06241155 of 5.
The local source/candidates remain preserved. Next is the founder's handoff of
the prepared [Spec 012 B1 prompt](../specs/012-evidence-first-report/B1_WORKER_PROMPT.md),
now pinned to main containing this release. No B1 agent was dispatched.

## 2026-09-25 — approve and complete privacy-screen R3 commit and push

The founder said **“Approved commit push.”** The orchestrator committed the
exact 21-file prepared package and pushed `codex/privacy-screen-false-positives`
to origin without a force push. Commit
[`dd9e405c704b874483ff0165c8e61c5e2dc2908b`](https://github.com/yasir-mukhtar/nuave_v0.2/commit/dd9e405c704b874483ff0165c8e61c5e2dc2908b)
has approved tree `c74a801518be9e7f3181360f52ba783dc072ecd1` and parent
`7f34d69d3be0c451e238f1cddf0da62dda250eb1`. GitHub's ref and tree match;
the publication checkout is clean and main remains unchanged.

This executes the named commit/push approval. No PR, preview, workflow comment,
merge, production deployment or live call was initiated. The draft PR and its
automatic synthetic preview/comment remain the next founder decision. Prior
offline verification remains valid for the unchanged product; required PR CI
has not run. The local source handoff records this outcome separately from the
exact published package. See the [acceptance record](../specs/011-smart-consultant-intake/PRIVACY_SCREEN_FOLLOWUP_ACCEPTANCE.md).

## 2026-09-25 — accept the privacy-screen R3 offline implementation

**Orchestrator closeout under the founder's R3 approval.** Independent
implementation review returns **PASS** with no actionable findings. Accept
PS-01–PS-06 as Verified offline for the exact candidate in the
[acceptance record](../specs/011-smart-consultant-intake/PRIVACY_SCREEN_FOLLOWUP_ACCEPTANCE.md).
The reviewer independently passed 287 affected tests plus 14 new probes and
reused the matching worker canonical gate: 1,407 tests, both builds and 32
browser checks. The orchestrator checked reports, logs and evidence hashes;
no tests or live calls were repeated. P9/P14 retain the approved cautious stops.

The reviewed implementation and original evidence remain unchanged. A separate
publication copy adds documentation closeout only; its reviewed runtime and
tests are identical. Main still matches reviewed base `7f34d69` at closeout.
Next is founder approval of the concrete commit/branch-push/draft-PR package,
including the existing automatic synthetic preview and workflow comment.
This record grants no publication, merge, production deployment or live-call
authority. Spec 011 stays Verified; F-01/F-03/AC-07 stay closed; accounting
remains USD 1.06241155 of 5.

## 2026-09-25 — approve privacy-screen R3 for offline implementation

After relaying an independent **plan-review PASS** with no blocking findings,
the founder said: **“Approved. Shall I pass it to the worker now?”** This
approves [R3](../specs/011-smart-consultant-intake/PRIVACY_SCREEN_FOLLOWUP_PLAN.md)
and releases its included worker handoff for bounded offline implementation
and one focused independent review. The reviewer changed no files and ran no
tests or live calls; implementation verification remains pending.

The approved correction uses explicit word groups in both Indonesian proximity
directions and complete-word matching. P9/P14 remain accepted cautious stops;
P10 exempts only the `jantung kota` occurrence. Strong protections, downstream
checks, three bounded mixed cases and the two gentler stop/recovery messages
remain required. The worker runs the plan's targeted checks and one final
canonical `npm run verify`; the reviewer reuses that gate and reruns affected
tests unless a concrete change, failure or uncovered risk requires more.

Use an isolated candidate from fresh `origin/main`, preserving the shared
source checkout and prior evidence. This supersedes the prior absence of
authority for this specific correction; it does not authorize commits, pushes,
PR publication, merge, deployment, business-site fetches or live provider calls.
Spec 011 remains Verified for its prior scope, F-01/F-03/AC-07 remain closed,
and the new amendment awaits implementation review. Accounting stays
USD 1.06241155 of 5. No additional plan approval is needed within this scope.

## 2026-09-25 — approve PR #78 merge and automatic production deployment

The founder replied **“Approved”** to marking PR #78 ready and merging reviewed
head `29d65f19bb4f681a0854efab2ebe13089337bc61`, explicitly including its
automatic production deployment. The orchestrator rechecked current main,
required CI, conversations and product hashes, marked the PR ready and merged
through GitHub's protected PR path without bypassing checks.

[PR #78](https://github.com/yasir-mukhtar/nuave_v0.2/pull/78) merged as
`7f34d69d3be0c451e238f1cddf0da62dda250eb1` at 2026-09-24 23:54:51 UTC
(2026-09-25 06:54:51 WIB). Its tree exactly matches approved publication tree
`1a9e3431f674e759f061a827993d4e89e124e7c4`, with parents `4470deb` and `29d65f1`.
Main [CI/deployment run](https://github.com/yasir-mukhtar/nuave_v0.2/actions/runs/36075063156)
**passed**: validation, merged-PR-origin verification and production deployment
all succeeded. Deployment completed at 2026-09-25 06:59:22 WIB. The temporary
preview was removed successfully, and a read-only HEAD request to production
`/audit` returned HTTP 200. Execution details are in `docs/NOW.md` and the
Spec 011 integration acceptance record.

This approves deploying the reviewed behavior, including the recorded
nonblocking privacy-screen limitation. It does not approve weakening that
screen, implementing a narrower rule, a paid audit or another live provider
call. A bounded privacy-screen proposal remains separate. No production test
audit is included. Spec 011 stays Verified; F-01/F-03/AC-07 stay closed; Spec 012
B1/B2 remain separate. Recorded audit accounting stays USD 1.06241155 of 5.

## 2026-09-24 — approve and publish the Spec 011 draft PR package

The founder replied **“Approve”** to the exact 100-file local package on
`codex/spec011-main-integration`, including commit, branch push, draft PR,
publication of its acceptance records, and the workflow's automatic isolated
synthetic preview and preview-link comment. This follows independent integration
PASS and the completed local publication checks. No further approval for these
named actions is needed.

Published commit `29d65f19bb4f681a0854efab2ebe13089337bc61` has exactly the
approved tree `1a9e3431f674e759f061a827993d4e89e124e7c4`, based on current main
`4470deb2553ae1413b039191a192828c93c7fcca`. Opened
[draft PR #78](https://github.com/yasir-mukhtar/nuave_v0.2/pull/78).
The isolated candidate is clean; the original source implementation and prior
evidence remain preserved. Required `validate` and the authorized preview both
**passed** on the exact published head. The
[synthetic audit preview](https://nuave-pr-78.mail-yasirmukhtar.workers.dev/audit)
is available. Final main remains `4470deb`, with no unresolved conversations or
merge conflicts. The PR is still draft and unmerged; details are retained in
`docs/NOW.md` and the integration acceptance record.

The approval excludes merging to main, production deployment, live provider
calls and unrelated publication. Spec 011 stays Verified; F-01/F-03/AC-07 stay
closed; Spec 012 B1/B2 remain separate. All live allowances remain consumed;
accounting stays USD 1.06241155 of 5.

## 2026-09-24 — record Spec 011 acceptance closure and Verified status

**Orchestrator closeout under existing founder approvals.** The independent
[acceptance closeout review](../specs/011-smart-consultant-intake/ACCEPTANCE_CLOSEOUT_REVIEW.md)
returns PASS against AC-00 through AC-08, incorporating the founder's explicit
acceptance of the live reach and prepared summary. Record **F-03 and AC-07 closed,
F-01 still closed, and Spec 011 Verified**. No additional acceptance gate remains.

This status applies to preserved HEAD `2a21f85` plus the reviewed uncommitted/
untracked product identified by the 316-file manifest in the
[specification verification record](../specs/011-smart-consultant-intake/SPEC.md#verification-record).
It does not establish current-main integration, PR/CI readiness or release
authority. Next is a separate bounded scope for the report/test integration
conflicts; no main integration is performed or authorized by this closeout.

Preserve the review's limits: unresolved historical extraction cause under the
approved exception, unobserved provider-internal retrieval, the accepted regional
representation limit and the bounded language assessment with R-03 unchanged.
The application remains unconfirmed. All live allowances are consumed;
accounting stays **USD 1.06241155 of 5**. This documentation-only closure repeats
no tests or live work and grants no new execution or publication authority.

## 2026-09-24 — accept the live reach and prepared summary

The founder answered **“Accept the reach and prepared summary”** after reviewing
the latest desktop/mobile preparation and being asked whether national reach
was appropriate and the experience felt like confirming a consultant's prepared
understanding. This accepts the observed whole-brand proposal and resolves the
previous completeness concern for this case. Do not request this judgment again.

The [walkthrough result](../specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_WALKTHROUGH_RESULT.md)
records the accepted outcome. The application's confirmation was not clicked;
this review does not submit it or authorize downstream requests. The next action
is the [independent acceptance closeout](../specs/011-smart-consultant-intake/ACCEPTANCE_CLOSEOUT_REVIEW_PROMPT.md)
against existing evidence and the approved criteria, without inventing another
live-test requirement. No new product policy, global language exception or
current-main integration is approved. Accounting remains USD 1.06241155 of 5.
F-01 remains closed; F-03/AC-07 await formal closeout; Spec 011 remains Approved
until that review establishes whether all required criteria are satisfied.

## 2026-09-24 — authorize one location-source preparation walkthrough

**SETTLED — one new live allowance.** The founder replied **“Approved”** to
the orchestrator's [prepared walkthrough](../specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_WALKTHROUGH_PROMPT.md)
after independent offline PASS on preserved baseline `2a21f85`.

Authorize one Periksa from the same nominated homepage, existing identity/icon
work and bounded document read, and one extraction API request with at most
its existing eligible technical retry (two paid attempts maximum). Preserve
the USD 5 total ceiling and USD 1.04786450 minimum historical carryover,
retaining any higher configured accounting or additional known spend. Reuse
configured credentials without exposing them. A dedicated local runtime and
fresh tab may inspect desktop/mobile and source disclosure in the same session.
Stop before confirmation and all question/observation/report work. No manual
retry, second click or restart after uncertain dispatch is authorized.

Record actual discovery/proposals, request and cost evidence, and founder
judgment. Do not prefill reach or substitute the supplied location page for the
ordinary homepage input. Earlier live allowances stay consumed. Current-main
integration, code changes, publication, commits and pushes remain outside scope.
This authorization is not acceptance: F-01 stays closed; F-03/AC-07 stay open;
Spec 011 stays Approved, not Verified until remaining acceptance is resolved.

**Execution recorded:** the [single preparation](../specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_WALKTHROUGH_RESULT.md)
completed without retry and stopped before confirmation. The allowance is
consumed; cumulative accounting is USD 1.06241155. Founder judgment is pending.

## 2026-09-24 — approve the F-03 location-source implementation

**SETTLED — approved for offline implementation.** The founder replied
**“approved”** to the revised
[location-source package](../specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_PROPOSAL.md),
including its stated regional-representation limitation. The earlier
broad-presence meaning is already settled; neither decision needs repeat approval.

Direct the existing extraction search toward relevant official location or
service-area evidence when homepage evidence does not establish current reach.
Add no server fetch, model request or retry for valid partial output. Preserve
the approved model, search settings, source/privacy limits, accounting and
confirmation. Apply the definitions to OpenAI and testing-only Gemini, and exempt
supported five-to-eight-area descriptions from generic retry list shortening.

A supported national footprint uses `seluruh` with no active city list and
does not imply universal delivery. For genuinely regional presence that cannot
be represented faithfully within eight supported areas, with no published
broader description, retain supported reach and leave areas unresolved in the
existing controls. Do not sample an arbitrary subset, invent a grouping or
promote regional presence to national to satisfy validation. This accepted
representation limit does not close F-03/AC-07 or waive founder review.

The amended Spec 011 and F-03 correction scope authorize the instruction changes
and their focused offline regressions. Execute the
[implementation handoff](../specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_IMPLEMENTATION_PROMPT.md),
then obtain independent review. Fresh source/provider calls, live confirmation,
publication, staging, commits and pushes are outside this approval. All earlier
live allowances remain consumed. Accounted cost stays USD 1.04786450 of 5,
including the historical estimate. F-01 stays closed; F-03/AC-07 stay open;
Spec 011 stays Approved, not Verified.

## 2026-09-24 — whole-brand reach means broad business presence

**SETTLED — founder-approved meaning.** In response to whether whole-brand
`jangkauan pasar` describes broad business presence or an exact list of served
areas, the founder selected **“Broad business presence (recommended)”**.

For whole-brand audits, reach describes supported geographic business presence
through the stated service channels, not an exhaustive outlet inventory. A
documented national outlet network can support a national reach proposal while
delivery limits remain separate. It does not mean delivery to every address.
Actual published locations/availability must support the interpretation; an
outlet count, ambition, category stereotype or area-list overflow alone does not.
Local/regional presence must not be promoted to national to avoid the area cap.

The existing national/international representations need no active city list.
The eight-area cap is not an eight-outlet cap and does not by itself make a
national footprint unrepresentable. This decision does not approve arbitrary
area sampling, invented regional grouping, an expanded schema or a specific
business's confirmed reach. Prepared information still needs customer confirmation.
Service-channel meanings, row origins and owner-edit provenance are unchanged.

The [location-source proposal](../specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_PROPOSAL.md)
is revised against this meaning. The earlier [review](../specs/011-smart-consultant-intake/F03_LOCATION_SOURCE_PROPOSAL_REVIEW.md)
remains evidence of the first draft's unresolved choice. Do not ask for this
meaning decision again. Approval of the implementation package, including the
search instruction and any residual regional-representation rule, remains
pending. No code change, live call, publication or acceptance closure follows
from this decision alone. F-01 stays closed; F-03/AC-07 stay open; Spec 011 stays
Approved, not Verified.

## 2026-09-23 — approve the F-03 product correction

**SETTLED — founder-approved for offline implementation.** The founder replied
“Approve. Write a short prompt to be executed by the worker” after reviewing
[F03_PRODUCT_CORRECTION_SCOPE.md](../specs/011-smart-consultant-intake/F03_PRODUCT_CORRECTION_SCOPE.md).
That scope is now the bounded implementation addendum to Spec 011.

Add one server-owned, safely bounded read of the supplied canonical website
page and at most 8,000 UTF-8 bytes of literal public business text to the existing
extraction input before reservation. Preserve identity behavior, hosted search,
developer instructions, provider/model settings, ledger/cost/retry limits,
row-level proposal origins and confirmation, and downstream audit/report behavior.
Do not promote the temporary runner or inspector into product code.

For a safe readable page with no usable excerpt, continue the existing extraction
without supplemental text and show the scope's limitation notice. Unsafe,
unreadable, sensitive-content and rate-limit failures stop before paid extraction.
Keep excerpt selection server-owned and ephemeral; do not add per-value fact
matching, claim independent verification, or infer absent channels/reach.

The diagnostic's independent PASS supports this correction without resolving
the historical cause. Its allowance and both extraction slots remain consumed.
This decision authorizes implementation and offline verification only, followed
by independent product review. A refreshed founder walkthrough still needs
separate live authorization. No commit, push, publication, merge, deployment,
provider contact or historical reactivation is authorized. F-01 remains closed;
F-03/AC-07 remain open and Spec 011 remains Approved, not Verified.

Execute the [short worker handoff](../specs/011-smart-consultant-intake/F03_PRODUCT_CORRECTION_IMPLEMENTATION_PROMPT.md)
without seeking repeat approval for this scope.

## 2026-09-22 — promote Astra v3.1 report direction; all eight decisions settled

**SETTLED — founder-approved.** The founder directed promotion of the tech
lead's published v3.1 at `316ac5b` into the next numbered specification and
confirmed that all eight decisions, including G4, are settled. The published
[plan](https://github.com/yasir-mukhtar/nuave_v0.2/blob/9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174/docs/drafts/NUAVE_REPORT_REDESIGN_IMPLEMENTATION_PLAN_ASTRA.md),
[iteration prompt](https://github.com/yasir-mukhtar/nuave_v0.2/blob/9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174/docs/drafts/NUAVE_REPORT_REDESIGN_PLAN_ASTRA_ITERATION_PROMPT.md),
[v2 Founder answers](https://github.com/yasir-mukhtar/nuave_v0.2/blob/9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174/docs/drafts/NUAVE_REPORT_REDESIGN_PLAN_ASTRA_V2_REVIEW.md), and
[v3 review](https://github.com/yasir-mukhtar/nuave_v0.2/blob/9c5d4c0f5e1ec3d59f5fd90c4f5d88ee1e1a7174/docs/drafts/NUAVE_REPORT_REDESIGN_PLAN_ASTRA_V3_REVIEW.md) are the
decision evidence. [Spec 012](../specs/012-evidence-first-report/SPEC.md) is the
implementation contract, **Approved** by the founder on 2026-09-22 after
independent review 1 (S1–S6) was applied; approval is not an implementation pass.

| Decision | Settled direction |
|---|---|
| D-01 | All ten exact questions/full answers are visible immediately; no collapse controls (G2). |
| D-02 | Bounded Markdown, exact raw view and copy; preserve the retained answer. |
| D-03 | One to ten findings and one to ten actions for completed new direct-ten reports; never pad. |
| D-04 | Presentation PR A starts from current main without waiting for Spec 011. Shared content/header B1 and template/recovery B2 wait for its verified merge; B2 consumes integrated A/B1. |
| D-05 | Exact labels: `Bisnis Anda muncul di X dari 10 pertanyaan`, `Bisnis Anda direkomendasikan di Y dari 10 pertanyaan`, `Download PDF`. G3 fixes the shared toolbar default for every report. |
| D-06 | Final usefulness failure after repair with ten usable observations permits only retained questions/answers, sources/provenance, and unfinished-analysis recovery; findings empty, actions empty, or both qualify. No surviving analysis or partial report. |
| D-07 | Screen and PDF have the same order and one DOM tree; no appendix or duplicate print answer tree. |
| D-08 | G4, confirmed 2026-09-22: recovery has copy and explicit report retry within existing limits, with no print/PDF/JSON save path. |

The reading order is **Hasil singkat → Jawaban model AI → Analisis Nuave →
Yang dapat dilakukan → Tentang audit ini**. These decisions supersede the
earlier blanket report-work deferral and conflicting direct-ten content/order
rules. Historical methods retain their semantics. The accompanying amendments
reconcile `PRODUCT.md`, `AUDIT.md`, `VOICE.md`, journey 06, and Spec 010's
**Observation/report failure** row. A/B1 retain current recovery until B2.
Spec approval must explicitly cover the proposed exact Markdown pins and
code-owned template contract before their implementation. No runtime,
dependency, live-provider, merge, or deployment work is authorized by this
documentation promotion.

*Reconciliation note (2026-09-26):* this entry is carried verbatim from the
approved documentation branch at `9c5d4c0`. The draft links are pinned
permalinks because the drafts were never merged. A/B1/B2 were later merged and
deployed (PRs #74, #80, #81). The founder's 2026-09-26 acceptance above records
the current report status.

## 2026-09-22 — authorize the F-03 controlled-input diagnostic

**SETTLED — founder-approved.** The founder replied **“approved”** to the
orchestrator's controlled-input diagnostic amendment in
[F03_CONTROLLED_INPUT_PROPOSAL.md](../specs/011-smart-consultant-intake/F03_CONTROLLED_INPUT_PROPOSAL.md).
This replaces the earlier provider-receipt prerequisite for this diagnostic;
it does not require another OpenAI capability answer or repeat authorization.

Keep the recorded F-03 attempt **unresolved between source access and
extraction**. Available observations do not distinguish them. The founder
accepts that historical uncertainty while authorizing new controlled evidence;
the empty summary is not accepted and F-03/AC-07 are not closed.

Reassign the existing unused diagnostic allowance to one temporary local
experiment after focused offline checks pass: safely fetch one nominated
official page, select at most 8,000 UTF-8 bytes of necessary literal public
service text, and add it as labeled source data to the extractor's user input.
Use direct OpenAI Responses, `gpt-5.6-luna`, low reasoning, existing developer
instructions/schema/hosted-search settings, and the existing cost/retry limits.
Reserve against the complete request including the added input and preserve
prior carryover. Permit at most the existing one technical retry for unusable
structured output; a valid empty draft never triggers another attempt.

There is one reassigned allowance, not an unchanged baseline run plus an
experiment. No crawl, extra page, model change, paid tuning, undocumented
results include, provider contact, or private-response inspection is included.
If the nominated page has no usable passage, stop before paid extraction.
The temporary runner is separate from ordinary Periksa and does not count as
the founder product walkthrough. Product/runtime changes require a separately
bounded correction; the experiment first returns its evidence and proposal.

No questions, observations, reports, intake confirmation, historical changes,
publication, commit, push, merge, or deployment are authorized by this decision.
F-01 remains closed and Spec 011 remains Approved, not Verified. Use the
[worker handoff](../specs/011-smart-consultant-intake/F03_CONTROLLED_INPUT_WORKER_PROMPT.md),
then the [diagnostic reviewer handoff](../specs/011-smart-consultant-intake/F03_CONTROLLED_INPUT_REVIEWER_PROMPT.md).

## 2026-09-22 — accept the Spec 011 truthful boundary and historical hold

**SETTLED — founder-approved.** After the R-00B sizing, separate report/export
boundary review, and a plain-language explanation of the scope and historical
access tradeoff, the founder accepted the recommendation: “I agree with your
recommendation totally. Lets do that. Move forward.” This supersedes the
2026-09-21 instruction to defer cross-cutting downstream compatibility work
while keeping report/export meaning and historical delivery unchanged.

The accepted R-00B classification is **Cross-cutting**. The complete truthful
boundary is **large** relative to an intake adapter; this is a size estimate,
not a delivery-time commitment. The existing compatibility brief invents
required values that enter report synthesis and customer JSON, and can affect
deterministic comparator matching. Isolating only the question writer or
hiding a summary row cannot remove that exposure. No temporary exception to
keep exposing fallback values is approved.

[Spec 011](../specs/011-smart-consultant-intake/SPEC.md) now includes the prepared
summary and exact confirmation/frozen/facts/writer handoff **together with** a
versioned truthful direct-ten context for run/report requests, every enabled
report adapter, deterministic interpretation, saved audit records, recovery,
customer JSON, and print display. Optional values remain absent. Target
customer, needs, decision considerations, channels, category, and business type
remain distinct; unknown comparator never becomes an alternative or named
company. Report context retains the authority of website, Nuave-proposed, and
owner-supplied meanings rather than labeling them all independently verified.

Removing fabricated input may change new report interpretation. Customer JSON
advances to `nuave-evidence-v5` with truthful confirmed context. These changes
are accepted; observation messages/method, approved questions, measurement and
evidence rules, report output schema/layout, 10/10 gates, cost controls, and
explicit audit approval remain protected. Removing legacy-only code may be
deferred; removing fallback exposure from the new path may not.

**Historical behavior for this release:** preserve already-started/completed
v1 records exactly in their existing browser-session storage, including frozen
input, approved/original/edited questions, saved brief, observations, report,
provenance, and cost ledger. Hold their in-app report display, JSON/PDF
delivery, observation resume, and report retry. Reject old request variants
before provider work and show a clear availability state. Never migrate,
regenerate, overwrite, or silently delete a valid old record to fit v2.
Already downloaded files remain unchanged. This preserves existing session
data; it does not create permanent storage, a backup, or a recovery promise.
The hold is settled release behavior, not a pending implementation gate.
Historical reactivation needs separate founder approval and is deferred.

R-00A was received through the sanitized local note. R-00B and the separate
boundary review are complete and accepted. The existing extraction/sizing/
review notes remain unchanged, untracked, unstaged, uncommitted, and unpushed.
Their original pending-approval wording is historical evidence; this decision
and the amended spec govern the next implementation. Do not repeat private
extraction inspection or the sizing review.

The next work is one complete product branch/PR for the amended Spec 011,
starting with fictional old-state preservation fixtures, followed by the
prepared summary and truthful downstream path. Focused checks,
`npm run validate:fast`, and `npm run verify` must pass offline. Legacy-only
removal, historical reactivation, report usefulness/layout redesign, durable
delivery, and commercial-launch work remain separate. This acceptance
authorizes specification alignment, the implementation handoff, and subsequent
offline implementation. It does not authorize secrets/private-evidence
inspection, a live provider call, commit, push, merge, or deployment. The
preparation-only live walkthrough and any later full live audit each need
separate explicit authorization.

## 2026-09-21 — approve and promote the Smart Consultant prepared intake

**SETTLED — founder-approved.** The founder explicitly confirms
[Spec 011](../specs/011-smart-consultant-intake/SPEC.md) as **Approved** and
promotes it as the next bounded implementation. After brand name, website URL,
and `Periksa`, Nuave presents one prepared summary headed **Ini yang Nuave
pahami.** The customer primarily reviews, selects, corrects, and confirms;
typing is an escape hatch.

`Brand secara keseluruhan` is the visible default audit-focus proposal. It is a
**Saran Nuave**, not website-derived evidence. Service channels, market reach,
and market areas are added to the existing extraction output in the same call;
unsupported fields stay empty. The happy path has one business-information
confirmation before question review and no duplicate final review. Optional
customer context, needs, decision considerations, alternatives, differentiator,
and public fact remain optional; comparator `unknown` remains unresolved rather
than claiming no competitors or category alternatives.

Two gates precede runtime work. First, the founder inspects one retained
extraction response and records only whether each relevant field is `filled`,
`empty`, or `wrong`, especially whether market text names a place and whether
it says how customers receive the service or product. Workers and reviewers do
not open `.secrets` or receive private evidence. Second, the worker sizes R-23
before coding by tracing the compatibility `BusinessBrief` through question
preparation, audit run, report, persistence, exports, and historical readers.

If removing invented-completeness fallbacks is bounded to frozen v2,
`QuestionFactsV3`, and a direct-ten-specific/versioned boundary, include it in
Spec 011. If it requires changing run/report payloads, persisted audit records,
report schemas, or historical readers, split that legacy compatibility cleanup
into a separately reviewed follow-up. The Spec 011 product PR still ships the
prepared summary and carries confirmed target customer and decision
considerations through frozen v2, facts projection, and the direct-ten writer.
Temporarily retained compatibility fallbacks remain only in the legacy bridge,
are enumerated in verification, and never enter prepared, confirmed, frozen,
facts-projection, or writer state. Existing question review, audit execution,
report meaning, downloads, cost, persistence, and historical runs remain
unchanged.

`specs/README.md` and `docs/NOW.md` name Spec 011 as active authority. This
decision authorizes the approved specification and offline implementation after
the two gates; it does not authorize opening private evidence, a provider call,
merge, deployment, or production activation.

## 2026-09-20 — use one neutral brand-entry screen for first entry and correction

**SETTLED — founder-approved.** The shared brand name and website step uses the
same neutral copy for a first audit and for later correction:

- heading: **Brand apa yang ingin Anda audit?**
- supporting copy: **Masukkan nama brand dan link website-nya.**
- fields: **Nama brand** and **Link website**
- primary action: **Periksa**

This supersedes the correction-only “Perbaiki brand” and “Periksa lagi”
framing. Existing entry, re-reading, cancellation, validation and persistence
behavior stays unchanged.

## 2026-09-20 — audit provider switches to direct OpenAI; OpenCode Go dropped

**SETTLED — founder-approved.** The founder's OpenCode Go subscription lapsed
and live audit stages began failing with 401s. The founder asked to switch to
Cheaper Inference while keeping Luna, then supplied OpenAI API credits.
Probing established the decisive facts:

- Cheaper Inference serves `gpt-5.6-luna` on chat completions **and** a
  Responses-shaped endpoint, but **silently ignores the `web_search` tool** —
  no `web_search_call` items, no grounding, no citations. It therefore cannot
  run the search-grounded extraction/observation stages the audit is built on.
- `gpt-5.6-luna` is a real OpenAI model; on `api.openai.com` it executes
  `web_search` and returns grounded answers.

**Decision:** production serves the audit stages (extraction, observations,
report) and the question writer through **OpenAI's own Responses API**:
`NUAVE_PROVIDER=openai`, `NUAVE_QUESTION_PROVIDER=openai`,
`OPENAI_BASE_URL=https://api.openai.com/v1`, `OPENAI_AUDIT_MODEL=gpt-5.6-luna`,
`OPENAI_AUDIT_REASONING_EFFORT=low`, credential `OPENAI_API_KEY`. GLM question
generation keeps using Cheaper Inference (`glm-5.3-flash`) — it needs no web
search and stays much cheaper there. This supersedes the 2026-08-21 OpenCode
Go transport lock while preserving GPT-5.6 Luna, low reasoning, required web
search, Indonesian output, exact provenance, and one-provider-per-audit
discipline. `liveAuditProvider`/`liveIndonesianQuestionProviderName` now admit
`openai` alongside `opencodego`; all other providers remain testing-only.

## 2026-09-19 — new flow becomes the public trial journey on v2.nuave.ai without login

**SETTLED — founder-approved.** The founder decided the new direct-ten audit
journey becomes the only flow on the deployed site, reachable from `/` and
`/audit`, with **no authentication**: "Adding Google login is out of scope.
Let the audit journey open to public, assuming nobody would open the URL
v2.nuave.ai and intentionally abuse it. If there is a low hanging fruit
solution, I'd like to do that." An earlier same-day preference for Google
login via the existing v1 Supabase project was superseded by this decision
before any implementation.

**Accepted risk:** the site is publicly accessible during the trial. One
complete journey costs ≈ USD 0.17–0.35 of provider usage (2026-09-19 measured
basis). Protection is deliberately minimal: per-IP Cloudflare rate limits
(2 generations, 2 runs, 3 reports per 60 s), existing per-request ceilings
(≤ 2 extraction, ≤ 30 observation calls, ≤ 3 report calls, USD 5 accounted
session ceiling), and one switch (`NUAVE_NEW_AUDIT_ENABLED`) that stops the
whole audit before any provider work. These reduce bursts and accidents; they
are not a hard spending cap and do not stop a determined abuser. The founder
monitors provider billing during the trial.

**Decisions inside the change:** legacy question methods (`canonical`,
`glm-slots`, omitted method) are rejected with `400` at the shared routes
rather than kept dormant; the old flow (pages, components, `prompts`,
`variance`, their tests) moves to `archive/2026-09-19-legacy-audit-flow/`;
the disk-based single-send freeze is retained only for local evidence runs
(`NUAVE_GLM_EVIDENCE_DIR`) and replaced on Workers by the per-IP limits plus
client locks; generation attempts are recorded in the session so failed and
interrupted (possibly-billed) attempts are visible in the export totals.

Report usefulness remains deferred until this work is verified (Spec 010).
[Spec 010](../specs/010-gated-new-audit-flow/SPEC.md) carries the contract.

## 2026-09-19 — complete the audit experience before improving the report

**SETTLED — founder-approved priority change.** After the live-report checkpoint,
the founder said:

> The report isnt that useful now. I can improve the format later. But now what we need to rush to complete is the end-to-end audit experience, despite the report is not match our standard yet.

Record the report-usefulness verdict as **not yet useful enough**, not pending
and not passed. Defer report format/usefulness improvements and remove that
quality verdict as a prerequisite for completing the continuous audit flow.
The immediate deliverable is one founder-local journey: enter a business/source,
prepare and confirm its facts, generate/edit/approve ten questions, run the
same approved pack, read the current report, and download PDF/evidence without
manual file preparation or switching to the retained-case demo.

This amends the stop-and-improve sequence in the Phase 3 plan and Spec 009's
AC-08 for this bounded flow-completion work. The report-quality standard remains
a later obligation. Preserve truthful counts, original evidence, explicit
approval, ten evaluable answers, provider isolation, budget controls and honest
failure handling. An unhelpful report is not permission to fabricate a better
one or claim failed calls succeeded.

Continue the existing implementation through the founder-relayed worker.
No report redesign, generation-method debate or unrelated fixes in this task.
Existing payment/hosted-delivery simulation and local-only scope remain; this
instruction does not authorize a new paid call, commercial release, commit,
push, merge or deployment. The [Spec 009 amendment](../specs/009-recommendation-eligible-audit/SPEC.md#2026-09-19-amendment--finish-the-continuous-audit-experience)
and [current handoff](./checkpoints/2026-09-17-winning-prompt-glm/NEXT_STEP.md#current-worker-task--continuous-audit-flow)
carry the concrete continuation.

## 2026-09-19 — preserve the first completed direct-ten live-report checkpoint

**SETTLED — founder-requested record.** The founder said:

> It's a great progress (despite I think too slow that we achieved this after a week). But lets make this moment as a check point that we can remember in the future.

Preserve this as [NUAVE-LIVE-REPORT-2026-09-19](./checkpoints/2026-09-19-live-direct-ten-report/CHECKPOINT.md):
the accepted questions now have a completed real audit and report, with exact
evidence and remaining limits retained. Record the positive progress assessment
and dissatisfaction with pace together. This is not report-quality acceptance,
Spec 009 Verified status, or permission for another run, implementation round,
commit, publication or deployment. Continue from the saved result with a bounded
next action and keep unrelated issues in the existing deferred note.

## 2026-09-18 — authorize one real audit and report from the accepted pack

**SETTLED — founder-approved and consumed.** The founder replied “authorized”
to the orchestrator's corrected one-run proposal: ten accepted questions and
one report workflow on OpenCode Go / `gpt-5.6-luna` / low, with the existing
automatic retries and USD 5 accounted-usage guard. The founder was told that
this guard is not a guaranteed provider billing cap. No generation, second
run, model switch, publishing, customer delivery or deployment is included.

The run completed with 11 successful provider requests and no retries; live
access is off. This authorizes the execution, not acceptance of report quality.
The [execution record](../specs/009-recommendation-eligible-audit/VERIFICATION.md#authorized-live-execution--2026-09-18)
contains usage and export limitations. The founder next reviews the real
report for AC-08. Further paid runs require a new explicit scope.

## 2026-09-18 — approve 90 minutes to finish only the remaining Block B work

**SETTLED — founder-approved.** In response to the proposed 90-minute completion
extension, the founder said:

> Yes of course, allowed. But be focus and fast, do not go chasing other goal or issues other than what already determined. Store issues found along the way (if any) in an .md note that we can revisit later.

Release **90 additional active minutes including implementation and final
verification**, on the existing worker branch/worktree. Finish only the four
determined items: accepted-pack browser connection to the live audit/report
boundaries, recommendation counts across ten evaluable answers, report-only
PDF, and an accurate bounded live-call/cost proposal. Preserve the ten accepted
questions and completed implementation. Record extension time separately;
this does not reset or erase earlier work/time.

Put unrelated observations in
[`DEFERRED_NOTES.md`](../specs/009-recommendation-eligible-audit/DEFERRED_NOTES.md)
without chasing them or adding them to this delivery's acceptance criteria.
Orchestrator review follows the same bounded scope. The founder still relays
the handoff and return; no automatic delegation or duplicate implementation.
This approves development and offline checks. Paid provider calls, commit,
push, merge, deployment and production activation remain separately gated.

## 2026-09-18 — accept the retained-business direct-ten questions and release Block B

**SETTLED — founder-approved.** After seeing the actual ten retained-business questions
and their business context, the founder said: “Yes this is good enough, beyond
what we achieved in the 6/4 formula. Move forward.” All ten questions are
accepted unchanged; no human edits were supplied. This passes Spec 009's real
question checkpoint (AC-04) for this specific pack and releases offline Block B
under its existing 210-minute budget. It does not establish general performance
superiority or completion of the product path.

The [verification record](../specs/009-recommendation-eligible-audit/VERIFICATION.md)
identifies the accepted pack, exact text/input/method binding and private
acceptance receipt. Preserve the captured response and consumed generation
attempt; do not regenerate. The old-preview URL and numeric-string billing
issue remain bounded implementation carryovers. Paid audit/report calls need
their own explicit scope and authorization; no commit, push, merge or deployment
is authorized. The founder continues to relay the worker handoff and return.

| Date       | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Label      | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Revisit trigger                                                                                                                                                                                                                                                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-19 | This modular documentation set supersedes the earlier `V2_GRAND_DESIGN.md` for v2 strategy and implementation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | SETTLED    | Remove competing canonical contexts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Founder approves a later foundation.                                                                                                                                                                                                                                                                                                              |
| 2026-07-19 | V2 is a one-time paid audit, not subscription SaaS.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | SETTLED    | Lower commitment and cleaner validation of an unfamiliar category.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Strong repeated monitoring demand and demonstrated retention economics.                                                                                                                                                                                                                                                                           |
| 2026-07-19 | Start with single-location dental clinics; treat aesthetic clinics as the first vertical experiment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | SETTLED    | One prompt, claims, QA, and landing system must feel purpose-built.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Dental demand or report value fails, or materially stronger access/evidence favors another wedge.                                                                                                                                                                                                                                                 |
| 2026-07-19 | Select one initial city from Jakarta, Bandung, or Surabaya after feasibility and access review.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | OPEN       | Three simultaneous cities add localization and acquisition variance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Resolve before the first public cohort.                                                                                                                                                                                                                                                                                                           |
| 2026-07-19 | Launch one public Full Audit at a Rp149,000 founding-cohort price.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | SETTLED    | Avoid tier confusion and validate willingness to pay for the complete diagnosis.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | First-cohort objection, value, support, or contribution data.                                                                                                                                                                                                                                                                                     |
| 2026-07-19 | Keep an OpenAI-only offer private as a possible downsell experiment; do not market an API observation as ChatGPT.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | EXPERIMENT | Learn price objections without weakening the public offer or surface disclosure.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Sufficient abandoned-checkout or sales-objection sample.                                                                                                                                                                                                                                                                                          |
| 2026-07-19 | Use OpenAI web search and Gemini Google Search grounding for audit v0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | SETTLED    | Smallest multi-surface methodology using official grounded APIs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Feasibility failure, provider changes, or customer evidence that another surface adds more value.                                                                                                                                                                                                                                                 |
| 2026-07-19 | Defer Perplexity and Google AI Mode/Overviews.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | SETTLED    | Reduce provider and methodology scope until the base audit is trustworthy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Gate 2 passes and platform breadth is shown to affect purchase or report value.                                                                                                                                                                                                                                                                   |
| 2026-07-19 | Do not claim API observations reproduce personalized consumer interfaces.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | SETTLED    | API, UI, retrieval, location, and personalization behavior can differ.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | No planned revisit; wording may improve.                                                                                                                                                                                                                                                                                                          |
| 2026-07-19 | Use no composite 0–100 score for the first ten paid reports.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | EXPERIMENT | Test comprehension of evidence before introducing a potentially opaque anchor.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Review first ten customer interviews and run the score-comprehension experiment.                                                                                                                                                                                                                                                                  |
| 2026-07-19 | Deliver one reviewed mobile web report plus a PDF generated from the same report version.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | SETTLED    | Customers need a shareable artifact without creating two sources of truth.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Evidence shows the PDF is unused, harmful, or operationally disproportionate.                                                                                                                                                                                                                                                                     |
| 2026-07-19 | Confirm exact clinic identity and eligibility before payment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | SETTLED    | Prevent ambiguous reports, disputes, and avoidable refunds.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | A proven alternative achieves equal identity quality with less friction.                                                                                                                                                                                                                                                                          |
| 2026-07-19 | Start the personalized audit only after verified payment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | SETTLED    | Control abuse and cost while keeping the preview truthful.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | A bounded personalized pre-check improves contribution after cost.                                                                                                                                                                                                                                                                                |
| 2026-07-19 | Require no customer account; use revocable token access with email recovery.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | SETTLED    | Minimize checkout and build friction without sacrificing recovery or deletion.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Repeat report management makes an account materially valuable.                                                                                                                                                                                                                                                                                    |
| 2026-07-19 | Treat seven days as a sellable concierge-pilot build target.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | SETTLED    | Preserve speed without pretending full automation or platform breadth.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Feasibility shows a required safety or correctness constraint needs more time.                                                                                                                                                                                                                                                                    |
| 2026-07-19 | Review every founding-cohort report and log interventions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | SETTLED    | Early quality and learning outweigh zero-touch delivery.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Review causes are understood, automated checks pass, and operational metrics support selective QA.                                                                                                                                                                                                                                                |
| 2026-07-19 | Use a fresh v2 repository and data model, with selective reviewed reuse of small legacy modules.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | SETTLED    | Avoid legacy SaaS scope while not rewriting proven utilities for ideological purity.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | A reuse candidate introduces coupling or a rewrite is demonstrably safer.                                                                                                                                                                                                                                                                         |
| 2026-07-19 | Acquire the first 20–30 customers through founder-assisted and partner channels before cold-ad scale.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | SETTLED    | Learn objections and delivery value before paying to amplify the funnel.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Report-value and operational gates pass.                                                                                                                                                                                                                                                                                                          |
| 2026-07-19 | Create touchpoint artifacts through a tracked golden-path phase workflow, with repository files rather than chat history as the AI handoff.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | SETTLED    | Preserve context while exposing end-to-end contradictions before engineering or visual polish.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | The workflow repeatedly slows learning or fails to maintain cross-touchpoint consistency.                                                                                                                                                                                                                                                         |
| 2026-07-19 | Make aftersales, action selection, referrals, and comparable re-audits part of the measured product lifecycle.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | SETTLED    | The product must change action, not merely deliver a PDF.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Customer evidence shows a different value-realization mechanism.                                                                                                                                                                                                                                                                                  |
| 2026-07-19 | Use Jakarta as the provisional EXP-001 and artifact city and competitive discovery as the first working message family; neither choice settles the public launch city or validates the message.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | EXPERIMENT | Unblock one coherent P1 journey while using measurement and founder-access evidence, rather than preference, to settle the launch city and message family.                                                                                                                                                                                                                                                                                                                                                                                                            | EXP-001 results, founder/partner access, or buyer-language evidence materially favors another city or message family.                                                                                                                                                                                                                             |
| 2026-07-19 | Establish a repository-backed acting CMO operating system for Nuave's zero-customer stage. The acting CMO may own internal analysis, drafts, evidence records, and experiment preparation; external communication, publishing, spend, contracts, discounts, and material public decisions remain founder-approved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | SETTLED    | Give the solo founder durable strategic and execution leverage without inventing market validation or delegating irreversible commercial authority by default.                                                                                                                                                                                                                                                                                                                                                                                                        | Review after the first ten paid customers, a proposed external-action delegation, or repeated workflow friction.                                                                                                                                                                                                                                  |
| 2026-07-20 | Test Jabodetabek as the market umbrella while keeping prompts, reports, and customer comparisons local to a city or practical travel area, starting with Sozo Dental Depok/Margonda in EXP-R1. This does not yet settle the public launch geography.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | EXPERIMENT | The founder identified a digitally active Depok clinic and proposed Jabodetabek as more representative than Jakarta alone; local intent remains necessary for a useful clinic comparison.                                                                                                                                                                                                                                                                                                                                                                             | Owner-comprehension evidence, access to prospects, or additional city-level audits show whether the umbrella improves or weakens relevance.                                                                                                                                                                                                       |
| 2026-07-29 | Use the Nuave Intent-5 framework for the next dental prompt pack: Problem Discovery, Provider Discovery, Comparison, Validation, and Action, with two questions per category and a five-unbranded/five-branded allocation. Branded and unbranded results remain distinct.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | SETTLED    | Cover the customer's path from problem recognition through practical action while keeping discovery separate from factual representation of a known clinic.                                                                                                                                                                                                                                                                                                                                                                                                           | Real customer language, audit usefulness, or repeated overlap between categories shows that the taxonomy or allocation should change.                                                                                                                                                                                                             |
| 2026-07-29 | Target ChatGPT only for the next prompt pack and remove Gemini from this scope. Record the exact execution surface and do not represent API output as an exact reproduction of personalized consumer ChatGPT. This supersedes the two-provider rule for this next prompt pack.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | SETTLED    | Focus the audit on the AI product selected by the founder while preserving an honest surface boundary.                                                                                                                                                                                                                                                                                                                                                                                                                                                                | ChatGPT execution feasibility fails or customer evidence shows that another AI product materially improves report value.                                                                                                                                                                                                                          |
| 2026-07-31 | Shift Nuave's working initial buyer from a dental-clinic owner to a small agency, SEO freelancer, Google Business Profile consultant, independent marketer, or website agency that provides marketing services. The audited business is the buyer's client. This supersedes the clinic-owner buyer direction but does not convert the buyer hypothesis into proven demand.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | SETTLED    | These buyers already understand visibility and may use one audit across sales, delivery, differentiation, or existing client work. The change tests a more reachable buyer without rebuilding the audit method.                                                                                                                                                                                                                                                                                                                                                       | Agency purchase evidence fails, another reachable buyer shows materially stronger demand, or the buyer/client separation makes delivery uneconomic.                                                                                                                                                                                               |
| 2026-07-31 | Use one client-ready audit for one client business as the raw-MVP agency offer. Deliver a downloadable report with a concise summary, neutral presentation, optional agency name and logo, tested scope, evidence, limitations, and clear commercial-use terms. Defer dashboards, team accounts, client management, custom domains, bulk workflows, APIs, integrations, subscriptions, and complex branding.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | SETTLED    | This is the smallest delivery layer that can test whether the agency buyer values and uses the report.                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Repeated paid use shows that a deferred capability is necessary to complete or repeat the one-audit workflow.                                                                                                                                                                                                                                     |
| 2026-07-31 | Treat the agency-facing per-audit price as open. Do not automatically carry the Rp149,000 clinic-owner price into the new offer, and do not create public tiers, subscriptions, credits, or volume plans before purchase evidence.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | OPEN       | Agency buyers evaluate resale margin, client value, manual effort, and repeat use differently from a clinic owner.                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Founder selects one pilot price for the active agency offer, then reviews payment, objections, delivery cost, and repeat behavior.                                                                                                                                                                                                                |
| 2026-07-31 | Validate the agency offer first with one truthful sample, three to five relevant buyer conversations, and one concrete paid offer. Targeted paid advertising may be tested in a small founder-approved experiment after the sample is ready, but lower acquisition cost is not assumed and spend must not scale before delivered-order economics exist.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | EXPERIMENT | Separate buyer and offer learning from speculative ad scale while preserving paid acquisition as a plausible way to reach a visible professional audience.                                                                                                                                                                                                                                                                                                                                                                                                            | Direct buyer feedback, payment evidence, or a bounded paid test establishes whether to revise, continue, scale, or stop.                                                                                                                                                                                                                          |
| 2026-07-31 | Preserve completed dental-clinic and Sozo work as methodology evidence and a possible first client example. It does not define the new buyer, prove agency demand, authorize public use of clinic findings, or establish broad multi-vertical support.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | SETTLED    | Retain real work without allowing historical scope or evidence to become a false customer claim.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | A new client vertical receives its own reviewed prompt, claims, QA, and report evidence.                                                                                                                                                                                                                                                          |
| 2026-07-31 | Make `generate-ai-visibility-prompts` the universal default skill for varied agency client brands. It requires one verified brand scope and uses a universal ten-question Intent-5 matrix with five unbranded and five branded questions. Preserve the former method as `generate-dental-clinic-ai-visibility-prompts` for later dental-specific experiments.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | SETTLED    | The agency buyer may serve different client categories, while a dedicated dental method remains useful when that vertical is deliberately tested.                                                                                                                                                                                                                                                                                                                                                                                                                     | Real prompt-pack review shows the universal matrix is unsafe, generic, or unsuitable for a material category, or another vertical needs a dedicated skill.                                                                                                                                                                                        |
| 2026-07-31 | Test one bounded self-service workflow that extracts a review draft from an official website, requires the user to confirm business facts and approve the ten-question pack, runs ten independent OpenAI Responses API calls with web search, and automatically produces the final-format report without a separate Nuave report-review gate. This supersedes mandatory founding-cohort report review for this workflow experiment only. Do not expose it publicly before cost, abuse, privacy, and correction controls exist.                                                                                                                                                                                                                                                                                                                                                                                                                                                          | EXPERIMENT | The founder chose to test the complete input-to-report workflow and automatic final output before investing in accounts, persistence, payments, or operating infrastructure.                                                                                                                                                                                                                                                                                                                                                                                          | A live founder-approved audit exposes unsupported claims, unacceptable report errors, provider cost or latency problems, or a need to reinstate selective review.                                                                                                                                                                                 |
| 2026-07-31 | Name the workflow's tested surface as the OpenAI Responses API with the exact returned model and web search, not as the ChatGPT consumer interface. The prompt pack may continue to model plausible ChatGPT-style customer questions, but the report must disclose that API results do not exactly reproduce personalized consumer ChatGPT.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | SETTLED    | The API is the closest automatable test surface selected for this prototype, while the existing surface-honesty rule remains non-negotiable.                                                                                                                                                                                                                                                                                                                                                                                                                          | OpenAI changes the relevant API/product relationship or a separately controlled consumer-interface method becomes feasible.                                                                                                                                                                                                                       |
| 2026-08-01 | Use HeroUI v3's default light design system for the unlisted `/audit` workflow only. Present the existing audit contract as five guided stages, lock inputs once execution starts, stream real prompt progress, and use the same report data for the collapsed screen view and expanded print output. Leave the landing page design and pilot access model unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | SETTLED    | One coherent component system reduces visual drift in the AI-built workflow while keeping this raw-MVP change bounded to the customer touchpoint under test.                                                                                                                                                                                                                                                                                                                                                                                                          | Invited-pilot usability, accessibility, report print quality, or landing-page regression evidence shows that the route-scoped implementation should change.                                                                                                                                                                                       |
| 2026-08-01 | Use English throughout the unlisted `/audit` workflow for now, including intake, question generation, API observations, the final report, and the evidence export. Keep the public landing page bilingual.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | SETTLED    | The existing Indonesian workflow copy sounds unnatural. One consistent English flow is clearer for the current private product test than retaining low-quality translated copy.                                                                                                                                                                                                                                                                                                                                                                                       | Direct buyer feedback supports a reviewed Indonesian version or another language becomes necessary for the next real audit.                                                                                                                                                                                                                       |
| 2026-08-05 | Rebuild the editorial-style report prototype as a React + Vite + shadcn/ui single-page application in `report-prototype/`, preserving all content (cover, 10 sections, 2 appendices). Use the Acctual.com SaaS landing-page aesthetic: Geist font, Lora italic for blockquotes, Tabler outline icons, white background, #111 headings, #2563eb accent, pill-shaped badges, 12px-radius cards with soft shadows. This replaces the single-file HTML prototype for visual fidelity and developer velocity without changing the report structure or content.                                                                                                                                                                                                                                                                                                                                                                                                                               | SETTLED    | The HTML prototype became difficult to iterate on for visual polish and interactive states. A component-based approach with shadcn's design tokens maps the report's visual hierarchy predictably and keeps the Acctual reference aesthetic consistent.                                                                                                                                                                                                                                                                                                               | Acctual or another reference design changes materially, shadcn/ui becomes unavailable, or a Next.js build pipeline is needed for SSR/PDF generation.                                                                                                                                                                                              |
| 2026-08-08 | Adopt `docs/VISION.md` as Nuave's highest-level product document. It states why Nuave exists, who it serves, what it sells, and eight named principles that downstream documents cite. It sits below this log and above `NOW.md` in the authority chain.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | SETTLED    | Product specs, design, tone, GTM, and landing copy had no single parent document, so each drifted separately. Naming the principles makes them citable rather than re-argued.                                                                                                                                                                                                                                                                                                                                                                                         | Evidence contradicts a principle, or the customer, promise, or product changes materially.                                                                                                                                                                                                                                                        |
| 2026-08-08 | Shift the buyer from an agency, freelancer, or marketing consultant to the owner of a small or medium Indonesian business, ordering an audit of their own business. This supersedes the 2026-07-31 agency buyer direction. A white-label or reseller offer is deliberately deferred until direct owner demand is proven or disproven.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | SETTLED    | The agency case rested largely on the existing report format being built for a professional reader, which is a report problem rather than a buyer problem. The founder cannot picture executing agency outreach, and a channel that cannot be run has no expected value. Owner-direct also allows the audit to be run before contact, which agency outreach does not.                                                                                                                                                                                                 | Owners consistently understand the report, agree with it, and take no action; or owners repeatedly decline while resellers approach unprompted.                                                                                                                                                                                                   |
| 2026-08-08 | Use Indonesian across every customer-facing touchpoint: landing page, intake, the ten questions asked of AI systems, the report, and all outreach. The ten questions are generated dynamically in natural Indonesian rather than translated from English templates, with a deterministic Indonesian template set retained as a guaranteed fallback so the prompts stage cannot hard-fail. This supersedes the 2026-08-01 English-throughout decision. English remains acceptable only for internal engineering artefacts no customer sees.                                                                                                                                                                                                                                                                                                                                                                                                                                              | SETTLED    | Indonesian language, sources, and local search behaviour are the one advantage funded international tools will not build. The earlier English decision was taken because the Indonesian copy sounded unnatural, which is a copy-quality problem and not an argument for an English product. A question no Indonesian would type does not test anything real.                                                                                                                                                                                                          | Indonesian question generation proves infeasible after a confirmed provider diagnosis, or owner feedback shows the Indonesian phrasing misrepresents real customer language.                                                                                                                                                                      |
| 2026-08-08 | Make a re-check of the same business after six to eight weeks, showing what changed, the recurring product. Describe the interval as a recommended cadence, not a scientifically derived one. The approved question pack must be persisted and replayed verbatim, and the score compared only within one version.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | SETTLED    | A one-time audit has no retention. The re-check is the only recurring promise the observed evidence can support, and it matches how slowly AI answers actually move. Dynamic question generation makes persistence mandatory, since a pack cannot be re-derived.                                                                                                                                                                                                                                                                                                      | Owners consistently decline the re-check, or observed results move so little between checks that a second measurement has no content.                                                                                                                                                                                                             |
| 2026-08-08 | Report the observed count with its denominator as the headline result, and report an AI Visibility Score beneath it as a band rather than an exact integer. The band is a transparent composition of separately reported components, published and versioned in the report, and must be wider than the observed variation between identical runs. State no peer benchmark until enough businesses in a category have been measured. This supersedes the 2026-07-19 no-composite-score experiment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | SETTLED    | An owner needs one handle they can hold and improve against, and the score is what makes a re-check meaningful. Each question is observed once and AI answers vary between runs, so an exact integer would show owners gains and declines they did not cause — on the exact product moment repeat purchase depends on. The band is the honesty mechanism, not a compromise.                                                                                                                                                                                           | Measured run-to-run variation shows the bands must be so wide they carry no information, or owner interviews show the band is not understood.                                                                                                                                                                                                     |
| 2026-08-08 | Acquire the first customers by demonstrating before selling: run a small number of unbranded Indonesian questions against candidate businesses before any contact, then approach only those that did not appear, leading with the observed answer and the competitor named instead. Never contact a business using a finding that was not actually observed. This supersedes founder-assisted and sample-led outreach as the first acquisition motion.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | SETTLED    | It requires no network and no ad budget, proves the problem before asking for money, and turns the first message into a finding about the recipient's business rather than a pitch. It is the only acquisition motion a solo founder can run immediately.                                                                                                                                                                                                                                                                                                             | Response rates show the observed finding does not create a conversation, or the pre-contact observation cost stops being negligible at volume.                                                                                                                                                                                                    |
| 2026-08-08 | Produce the first credible sample audit by hand, from real observations for one Indonesian business, without depending on the automated `/audit` workflow. Resume automation only after several real deliveries show which parts actually consumed time.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | SETTLED    | Four consecutive live attempts failed on model-authored structured output and no sample exists. The sample is the asset that unblocks outreach, pricing, and the landing page; the pipeline is currently the thing preventing it.                                                                                                                                                                                                                                                                                                                                     | A hand-made sample proves impractical to produce, or the workflow passes a live report end to end.                                                                                                                                                                                                                                                |
| 2026-08-09 | Build the whole journey before selling any of it, in this order: (1) the measurement path runs end to end from intake form to report at an unguessable link, (2) a gate — read the pipeline's first real report and stop if it holds no finding worth paying for, (3) payment and report persistence, (4) one design and copy polish pass across every touchpoint, (5) show it to owners we know, (6) sell to strangers, (7) the re-check, (8) the benchmark, (9) widen and open the white-label layer. This supersedes the 2026-08-08 hand-made-sample decision and the manual-first phase order in `VISION.md`.                                                                                                                                                                                                                                                                                                                                                                       | SETTLED    | Most of the measurement path already exists in `/audit`, so hand-making a sample means working around a nearly-built system rather than finishing it, and a hand-delivered report does not test what Nuave intends to sell, which is a self-serve measurement. The founder's fastest work is building and designing; a plan that front-loads manual delivery has low real expected value for this specific operator. The risk of building before demand is contained at one point — the Phase 2 gate.                                                                 | The Phase 2 gate fails, meaning the pipeline's first real report holds no finding worth paying for; or the pipeline stalls long enough that a hand-made report becomes the faster route to owner feedback.                                                                                                                                        |
| 2026-08-09 | Delete principle 8 of `VISION.md`, "Manual until it hurts". The principles section becomes seven. Restraint against premature systems work now lives in `AGENTS.md` rules 4 and 5 and the "Not now" list in `NOW.md`, scoped so that automating the intake-to-report path is in scope while automating anything around it is not.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | SETTLED    | The principle stated that the workflow is convenience and the report is the product. Under the build-first order the workflow is the product surface, so the principle contradicted the phase order rather than qualifying it. It was cited nowhere outside `VISION.md`.                                                                                                                                                                                                                                                                                              | Systems work Nuave does not need starts appearing — a dashboard, CRM, or integration layer before a customer exists — showing the guardrail needed to sit in the vision after all.                                                                                                                                                                |
| 2026-08-09 | Require no customer account for the first purchase. How a report persists and is found again — a magic link, a permanent emailed link with no login, or a real account — stays open and is decided in the Phase 3 spec. Phase 1 uses an unguessable link with no login.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | OPEN       | Report persistence is needed before a re-check can exist, but an account is the piece least likely to change what Nuave learns from the first buyers, and checkout friction is a real cost at an untested price.                                                                                                                                                                                                                                                                                                                                                      | The Phase 3 spec work, or evidence that owners cannot find their report again without an account.                                                                                                                                                                                                                                                 |
| 2026-08-09 | Adopt the independently rewritten `docs/VISION.md` as Nuave's canonical highest-level product document and preserve the former version at `archive/visions/VISION-2026-08-09.md`. The canonical vision serves the owner or person accountable for marketing, defines Nuave as an evidence-to-action-to-remeasurement loop, makes durable shareable reports and autonomous delivery product principles, and leaves phases, exact methods, scoring, price, and cadence to downstream documents.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | SETTLED    | The founder approved the independent draft after aligning on the primary user, diagnostic boundary, automation constraint, durable report value, and honest single-surface starting scope. Removing tactical phase details keeps the vision stable enough to govern specifications, design, voice, GTM, and customer-facing artifacts.                                                                                                                                                                                                                                | Material customer evidence contradicts the target user or improvement loop, autonomous delivery cannot meet the evidence standard sustainably, or the founder approves a materially different promise or boundary.                                                                                                                                |
| 2026-08-09 | Treat the adopted canonical `docs/VISION.md` as containing nine product principles. The earlier row saying the principles section became seven describes the superseded vision and must not be used to remove or merge principles from the adopted rewrite. "Manual until it hurts" remains absent.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | SETTLED    | The independently rewritten and founder-approved vision replaced the earlier document after the seven-principle edit. Its nine principles cover distinct trust, action, localization, durability, automation, comparability, simplicity, and privacy concerns.                                                                                                                                                                                                                                                                                                        | The founder approves a new canonical vision or explicitly consolidates its principles.                                                                                                                                                                                                                                                            |
| 2026-08-12 | Build Nuave v2 through a hybrid vertical slice. First make the full landing-to-report journey reviewable with deterministic fixtures, an unmistakably simulated checkout, and a simulated private-report destination. Then replace the boundaries in this order: Indonesian audit and report contracts, live report and its quality gate, durable jobs and private delivery, real checkout and remedies, product-wide polish, known-owner pilot, controlled public launch, and comparable re-check. Preserve the existing v2 audit engine as the protected core and treat the legacy SaaS only as a selective donor.                                                                                                                                                                                                                                                                                                                                                                    | SETTLED    | A complete simulated surface reveals journey gaps early without coupling customer experience work to provider calls, persistence, or payment. Replacing one boundary at a time keeps the valuable evidence engine intact. The real-report quality gate still prevents Nuave from commercializing a polished but weak report, and real checkout remains blocked until the report passes and commercial terms are approved.                                                                                                                                             | The fixture shell requires substantial throwaway architecture, the live report cannot fit the shared journey contract, or the first real-report quality gate fails badly enough to change the product promise.                                                                                                                                    |
| 2026-08-17 | Generate the primary ten-question suggestion with one bounded, no-search model call from customer-confirmed business facts. Use the five-purpose, five-without-name/five-with-name matrix as a default coverage brief rather than universal sentence templates. Questions must use context-appropriate natural Indonesian, may investigate unknown public facts without asserting them, and may use an unnamed comparison fallback. Customers may freely replace any question and alter the default composition; Nuave explains coverage consequences but blocks only narrow privacy, safety, scope, and technical violations. Persist and report the exact final pack and derive denominators from its actual composition. Retain deterministic Indonesian questions only as a resilience fallback. This refines the 2026-08-08 dynamic-generation decision and supersedes deterministic-only live generation and mandatory preservation of the generated matrix after customer edits. | SETTLED    | A structurally valid universal template can still sound unlike a real customer and produce irrelevant evidence. Business owners are buying answers to questions that matter to them, so Nuave should provide a strong contextual recommendation without policing ordinary curiosity. Warning-based guidance preserves methodological transparency while open editing preserves relevance and customer ownership.                                                                                                                                                      | The five-business evaluation shows model-authored questions are not materially more natural or relevant than the fallback, unrestricted editing repeatedly makes reports uninterpretable despite warnings, or customer evidence supports a different default composition.                                                                         |
| 2026-08-17 | Run the paid audit as one durable background job using one production provider and ten independent observations. Keep provider/model details out of the primary customer hierarchy but preserve them in method and evidence records. Closing the page does not stop the job. Retry only technically failed questions—one initial attempt plus up to two automatic retries, followed by a targeted customer retry—and never rerun a valid result or completed question. Require 10/10 evaluable observations before automatic report generation and delivery. Report-generation retries reuse the frozen evidence and never rerun observations. When report generation fails, record one support incident, show a one-click help action, and notify the founder with safe order, customer, time, stage, attempt, and diagnostic context; notification and help requests are idempotent. Groq/Tavily remains testing-only and cannot serve or backstop a paid production audit.           | SETTLED    | A browser-bound run can lose paid work when the customer disconnects, rerunning all ten corrupts the measurement and wastes cost, and delivering fewer than ten silently reduces the purchased scope. Durable targeted recovery protects both evidence and customer confidence. Provider mechanics matter for reproducibility but not as primary user value. A failed report after successful observations is Nuave's operational problem, so the customer needs a visible human-help path and the founder needs an actionable alert without raw evidence or secrets. | Durable jobs prove operationally disproportionate before paid launch, the chosen production surface cannot reliably complete ten independent observations within the cost ceiling, 10/10 causes unacceptable unresolved-order rates despite targeted recovery, or support incidents show that a different remedy or escalation channel is needed. |
| 2026-08-17 | Require every delivered audit report to contain one to five evidence-backed actions, superseding the current implementation limit of at most three. Derive report composition and denominators from the exact final customer-approved questions using the labels **Tanpa menyebut bisnis Anda** and **Menyebut bisnis Anda**, not the original suggested matrix or intent labels after substantial edits. Label the primary report action **Download PDF**. Review the complete Indonesian report language in a separate dedicated session rather than treating this content decision as language approval.                                                                                                                                                                                                                                                                                                                                                                             | SETTLED    | One action can be enough when it is the only supported next step, while five may be justified when distinct evidence supports them. Zero actions means the report has not delivered practical value, but the minimum must never be met with filler. Literal name-composition labels remain true after customer edits, and a prominent PDF action delivers the shareable artifact the buyer expects.                                                                                                                                                                   | Real reports repeatedly need more than five independent actions, owners cannot prioritize lists of this length, evidence cannot reliably support at least one action, or dedicated Indonesian-language review establishes clearer labels or CTA wording.                                                                                          |
| 2026-08-17 | Use this customer journey order: landing and public-source submission, free identity and order preview, verified payment, prepared business-fact review, question review, explicit audit start, audit run, and report delivery. Payment unlocks personalized fact and question preparation but does not start or consume the audit. This supersedes the earlier facts-and-questions-before-checkout order. The price remains open and no planning simulation may introduce a numeric anchor; Midtrans remains a candidate until the real-checkout specification approves it.                                                                                                                                                                                                                                                                                                                                                                                                            | SETTLED    | The free preview gives the buyer enough identity and scope to recognize the order while verified payment prevents unpaid personalized preparation cost. Keeping the explicit audit-start boundary after fact and question approval preserves customer control and prevents payment from being mistaken for execution.                                                                                                                                                                                                                                                 | Unpaid preparation proves affordable and materially improves conversion, buyers repeatedly dispute paying before seeing personalized questions, or the wrong-business remedy becomes operationally unacceptable.                                                                                                                                  |
| 2026-08-17 | Replace the banded AI Visibility Score with one direct appearance count across the ten retained answers, expressed as a count with its denominator, for example **Bisnis Anda muncul di 4 dari 10 pertanyaan** and **4/10**. Continue to show **Tanpa menyebut bisnis Anda** and **Menyebut bisnis Anda** separately so the overall count is not presented as spontaneous discovery, a stable ranking, or a percentage forecast.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | SETTLED    | The customer can understand a direct result without learning a score formula. The component denominators preserve the difference between appearing before the business is named and being recognized after it is named.                                                                                                                                                                                                                                                                                                                                               | Owners consistently misunderstand the overall count despite the component breakdown, or repeat-run evidence supports a more useful honest summary.                                                                                                                                                                                                |
| 2026-08-17 | A delivered report requires 10/10 evaluable observations and contains one to five evidence-backed actions plus one to five material findings; one or two strong findings are sufficient. A substantive response that declines to recommend, cannot verify a fact, or explains uncertainty is evaluable. A provider or policy refusal that prevents a usable observation is a failed test and receives targeted same-method recovery. If the evidence shows no immediate corrective gap, an action may preserve a supported strength, improve the public evidence behind it, or propose checking an explicitly untested aspect; it must be labelled as maintenance or further investigation and may not invent a deficiency.                                                                                                                                                                                                                                                             | SETTLED    | A nine-question output is not the purchased report. Separating substantive uncertainty from provider failure preserves honest negative evidence without counting a blocked call as a result. Allowing fewer strong findings and evidence-maintenance or further-investigation actions prevents filler while ensuring the report still helps the customer decide what to do next.                                                                                                                                                                                      | Targeted recovery makes delivery operationally unreliable, customers find maintenance or investigation actions unhelpful, or real reports repeatedly support more than five independent findings or actions.                                                                                                                                      |
| 2026-08-17 | Assign Landing to a later `00` touchpoint. Assign report generation, report-ready customer email, email-delivery failure, and resend to `06 — Audit Report`. Assign private access opening, another-device return, expired or revoked access, and access recovery to a later `07 — Report Access and Recovery` module. Do not preselect a private link, account, narrow report history, or dashboard architecture; a general analytics or monitoring dashboard remains out of scope. Correction submission and corrected-report notification remain open until their authenticated report-version behavior and owner are approved.                                                                                                                                                                                                                                                                                                                                                      | SETTLED    | Explicit ownership prevents Audit Run, payment, report, and access agents from creating overlapping state and email behavior. Deferring the access mechanism preserves the customer need without turning it into premature architecture.                                                                                                                                                                                                                                                                                                                              | The durable-delivery specification shows a different module boundary is materially simpler without weakening privacy, recovery, or immutable report versions.                                                                                                                                                                                     |
| 2026-08-17 | Set the current one-audit total to **Rp99.000**, with no additional tax or fee charged to the customer at checkout. An unpaid Order Preview keeps that quoted total for 30 days; after expiry Nuave requires a refreshed preview before payment. Use Midtrans for production checkout with QRIS, bank transfer, GoPay, and DANA enabled. This refines the earlier open-price and Midtrans-candidate parts of the journey decision.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | SETTLED    | A real checkout needs one exact customer total, familiar Indonesian methods, and a finite quote period. Treating Rp99.000 as the total avoids a surprise checkout addition without making a legal claim that the operator is tax-exempt.                                                                                                                                                                                                                                                                                                                              | Founder changes the offer or price, Midtrans cannot operationally support the approved methods, or tax and payment obligations require different customer wording.                                                                                                                                                                                |
| 2026-08-17 | Keep a paid order undelivered until 10/10 observations are evaluable. Persistent technical failure causes delayed delivery, targeted retry, and an immediate path to founder support; it never produces a partial report. If the validated web report is ready but PDF generation fails, deliver the web report, keep **Download PDF** temporarily unavailable, and retry or troubleshoot only the PDF artifact from the same immutable report version.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | SETTLED    | The customer bought ten observations, so technical difficulty cannot reduce the scope. A PDF rendering failure does not invalidate a complete, evidence-checked web report and should not withhold the useful deliverable.                                                                                                                                                                                                                                                                                                                                            | Customers require the PDF as a condition of delivery, PDF failures expose web/PDF factual divergence, or persistent failures require a stronger terminal remedy.                                                                                                                                                                                  |
| 2026-08-17 | Before audit start, let the customer correct the business facts and then regenerate and reapprove the question pack under the same order. After audit start, lock the original run. If the customer accidentally supplied the wrong business, they contact support; the founder may grant one replacement audit chance from the admin support view while preserving the original run and audit trail. Creating a replacement order is the last resort. This is an order remedy, not a correction to an observed answer or delivered report.                                                                                                                                                                                                                                                                                                                                                                                                                                             | SETTLED    | Customers are warned to review the business and questions before starting, but a bounded founder-granted remedy handles genuine mistakes without editing evidence or forcing a new purchase immediately.                                                                                                                                                                                                                                                                                                                                                              | Mistakes become frequent enough to need self-service controls, abuse makes discretionary grants unsustainable, or payment/accounting constraints require a replacement order.                                                                                                                                                                     |
| 2026-08-17 | Use Resend for Nuave transactional and support email. Send as **Tim Nuave <support@nuave.ai>** and use `support@nuave.ai` as the monitored help address. Module 06 owns report-ready email, delivery failure, and resend; founder-support alerts may use the same service.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | SETTLED    | Reusing the service and identity already operated in v1 minimizes delivery setup and gives customers one consistent reply and support address.                                                                                                                                                                                                                                                                                                                                                                                                                        | Deliverability, domain configuration, support load, or provider reliability requires a different service or sender identity.                                                                                                                                                                                                                      |
| 2026-08-17 | Select **dental clinics in Depok (Jabodetabek)** as the Phase 3 launch wedge: the five-business provider evaluation and the first live audit run target dental clinics in that area. This supersedes the open initial-city/vertical question for the current phase; the wedge remains provisional until stranger response validates it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | SETTLED    | The founder selected the wedge matching the earlier dental experiments; one vertical in one city until it works.                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Strong evidence that another wedge validates better before the first paid cohort, or the dental wedge fails the report-quality gate.                                                                                                                                                                                                              |
| 2026-08-17 | Lock the production providers for 03 extraction and 04 question generation to **GPT-5.6 Luna** (`NUAVE_PROVIDER=openai`, `NUAVE_QUESTION_PROVIDER=openai`) — the only candidate that cleared the practical quality gate in the five-business evaluation (50/50 questions relevant and natural, 49 accepted unchanged / 1 light / 0 replaced, 0 leaks/premises/blockers; 03 drafts resolve the exact branch with official-source-only evidence; ≈ USD 0.003/audit). Gemini 3.5 Flash-Lite could not be measured (prepayment credits depleted); a comparison rerun remains possible when credits are restored — the runner and five frozen confirmed briefs are unchanged.                                                                                                                                                                                                                                                                                                                | SETTLED    | Founder-approved 2026-08-17 after the scored evaluation record; Luna is already the wired default for both stages, so no code change is required.                                                                                                                                                                                                                                                                                                                                                                                                                     | Gemini credits restored and a comparison rerun changes the verdict, or a cheaper provider clears the gate at equal quality.                                                                                                                                                                                                                       |
| 2026-08-19 | Retire the two standing domain plans. The **v2 subdomain launch is complete** (`https://v2.nuave.ai` live on Cloudflare Workers, access gate and CI verified); its plan was archived at `archive/completed-plans/V2_SUBDOMAIN_LAUNCH_PLAN.md` and the facts it established now live in `docs/NOW.md`. The **apex domain transition plan is superseded** — it targeted moving `nuave.ai` to this repository with the v1 SaaS relocated to `monitor.nuave.ai`, which the `v2.` subdomain route replaced; it was archived at `archive/superseded-plans/DOMAIN_TRANSITION_PLAN.md`.                                                                                                                                                                                                                                                                                                                                                                                                         | SETTLED    | A completed plan and an unexecuted alternative route both read as active work and compete with the real current objective, which is the Phase 3 live report and quality gate.                                                                                                                                                                                                                                                                                                                                                                                         | The founder decides to serve the apex `nuave.ai` from this repository, which requires reopening or rewriting the transition plan.                                                                                                                                                                                                                 |
| 2026-08-20 | Approve the product-wide design pass (`specs/006-product-wide-polish`, calm instrument) and ship its Wave 1: P0 foundation (tokens, typography, color, motion, accessibility, shared component language) and P1 landing (one-question/one-input intake submitting to `/audit`, VOICE-compliance excision including the `docs/content/landing-copy.md` source, navigation fixes, motion cleanup).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | SETTLED    | Phase 6 of `docs/END_TO_END_PLAN.md`; the landing carried prohibited claims on a deployed domain, and parallel phase work without a shared foundation produced the two-hero and two-report divergences.                                                                                                                                                                                                                                                                                                                                                               | The final-copy task replaces the interim copy table, or the full-pass judgment gates (AC-18/19/20) fail after P7.                                                                                                                                                                                                                                 |
| 2026-08-20 | Accept **interim exposure** for the access-gate removal: `/audit` and `/api/audit/*` ship ungated with no server-side rate/cost guard for now, because `v2.nuave.ai` is site-wide noindex and shared only by direct link. A minimal server-side rate/cost guard remains a prerequisite before any public link sharing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | SETTLED    | Spec 006 AC-05 requires the gate removal to be paired with either an approved minimal guard or explicit founder acceptance of interim exposure; the founder accepted the exposure on 2026-08-20.                                                                                                                                                                                                                                                                                                                                                                      | Any plan to share the link beyond direct outreach — the guard must land first; or the first sign of unsolicited traffic spending provider budget.                                                                                                                                                                                                 |
| 2026-08-21 | Use **OpenCode Go as the Phase 3 production API transport for GPT-5.6 Luna** across 03 extraction, 04 Indonesian question generation, 05 observations, and 06 report synthesis. Set `NUAVE_PROVIDER=opencodego` and `NUAVE_QUESTION_PROVIDER=opencodego`, use the OpenAI-compatible Responses endpoint `https://opencode.ai/zen/go/v1`, and keep `OPENCODEGO_API_KEY` server-side. This supersedes the 2026-08-17 **direct-OpenAI transport** lock while preserving GPT-5.6 Luna, low reasoning, required web search where the audit method requires it, Indonesian customer output, exact model/provenance recording, and one-provider-per-audit discipline.                                                                                                                                                                                                                                                                                                                           | SETTLED    | Founder selected OpenCode Go as Nuave's API to GPT-5.6 Luna. Explicit provider, credential, and base-URL wiring removes the script-only `OPENCODEGO_API_KEY` → `OPENAI_API_KEY` workaround and makes deployment, local configuration, and the protected product path agree.                                                                                                                                                                                                                                                                                           | OpenCode Go cannot provide the required Responses-compatible features or web search, returned model/provenance diverges from the lock, reliability fails the Phase 3 quality gate, or the founder changes the provider.                                                                                                                           |
| 2026-08-28 | Standardize Nuave's presentation layer on **shadcn/ui** for generic components, **Base UI** for their behavioral and accessibility foundation, **Tailwind CSS v4** for styling and tokens, **BeUI** for higher-order AI UI, progressive disclosure, motion character, and interaction patterns, **Motion** only when a retained BeUI interaction genuinely needs an animation engine, and **Tabler Icons** for generic icons. Use the BeUI light theme as the initial visual baseline. This supersedes the 2026-08-01 HeroUI visual-system decision and conflicting component-stack guidance while preserving product behavior, audit semantics, and report structure.                                                                                                                                                                                                                                                                                                                  | SETTLED    | Solo-founder implementation speed, reuse, AI-agent maintainability, and restylability improve when one composable stack replaces competing generic systems. Borrowing proven primitives avoids duplicated accessibility work and keeps future presentation changes bounded.                                                                                                                                                                                                                                                                                           | The approved stack becomes unavailable, fails an accessibility or product-quality gate, or the founder approves a materially different presentation architecture.                                                                                                                                                                                 |
| 2026-08-30 | Constrained question editing enforces identity policy, not semantic purpose. A customer may edit a question's wording within its slot; the slot's category, measurement purpose, and brand/comparison-target policies are fixed and uneditable. Edits that break an identity policy, drop the comparison relation from the comparison slot, or fail length/shape checks are **blocked on save**. Wording that passes every mechanical check while drifting from the slot's purpose raises a **non-blocking warning** and the customer may proceed. Nuave does not run model-assisted purpose validation on edits in V1.                                                                                                                                                                                                                                                                                                                                                                 | SETTLED    | Purpose drift is not mechanically decidable, and a model-assisted validator would add a call per save plus a false-positive class that can trap a paying customer at the final intake step. Identity and composition labels and the reported denominators derive from the final question text and remain mechanically correct; only the slot's measurement intent is at risk.                                                                                                                                                                                         | Real question packs show customers materially degrading their own slots, or a delivered audit is weakened by an off-purpose question.                                                                                                                                                                                                             |
| 2026-08-30 | Ship V1 identity fetching **without DNS pinning**, accepting the residual DNS-rebinding/SSRF risk. Pinning a fetch to a pre-validated IP is not practical on the current Cloudflare Workers runtime, so identity fetching ships with the complete R-22 control set — HTTP/HTTPS only, rejection of reserved, private, loopback, link-local and metadata ranges for IPv4 and IPv6, revalidation of every redirect hop, at most 3 hops, 5 s per request and 10 s total, a 512 KB streamed response cap, restricted content types, no credential forwarding, and the same protection for icon fetching — plus the R-23 Workers Rate Limiting bindings. This is a V1 tradeoff, **not** a claim that DNS rebinding has been technically eliminated, and not a claim that Cloudflare blocks a hostname that resolves to private space; that behavior is unverified.                                                                                                                           | SETTLED    | The decision rests on the current deployment having no private-network connectivity or equivalent internal HTTP target: the Worker's only binding is `ASSETS`, there is no Workers VPC, Tunnel, Hyperdrive, Durable Object or KV, and Workers exposes no VM-style metadata service, so the high-impact SSRF target does not exist. The realistic residual is abuse of Nuave as a public fetch proxy, which the rate-limiting bindings mitigate.                                                                                                                       | Workers VPC, Tunnel, Hyperdrive, another private-network mechanism, or materially different endpoint exposure is introduced; or live evidence shows this threat model is wrong.                                                                                                                                                                   |
| 2026-08-30 | The comparison target is proposed **without an additional provider or web call**. When extraction returns a usable `similar_businesses` entry, the first one is shown on the comparison screen as a labelled proposal the customer must accept, edit, or replace — it is never written into the brief unseen. When extraction returns none, the screen asks the customer to name the comparison target and offers one acceptable fallback: the category-level alternative, `alternatif lain di kategori <kategori>`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | SETTLED    | Spec 007 R-13 required a deterministic derivation and did not define one, so two implementers would have built different things — one inventing a category mapping, one spending a model call, one leaving a required field unfillable. A second call inside the paid flow adds cost and a new failure mode for a field the customer is being shown anyway, and `verified_competitor.name` is required, so the empty case needs an answer the customer can always give.                                                                                               | Real journeys show customers stalling on the comparison screen, or the fallback target visibly weakens slot 9's comparison.                                                                                                                                                                                                                       |
| 2026-09-12 | For Spec 008 v3 slot 9 (`direct_comparison`), multiple confirmed comparators with no designated target run on the category-alternatives relation (`alternatif lain di kategori <kategori>`); a later **optional** intake control will let the customer designate the direct-comparison target. Competitive role (`entityType`) is sourced only from the existing optional `factsContext` seam — no intake question yet.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | SETTLED    | R5 left the multi-comparator slot-9 relation and the role source open; the adapter may not select, join, or infer either. The category-alternatives fallback is the already-approved comparison form, and optional-only controls preserve the no-universally-required-fields rule.                                                                                                                                                                                                                                                                                    | The intake designation control ships, or generated evidence shows the category fallback materially weakens slot 9's comparison.                                                                                                                                                                                                                   |

## 2026-09-16 — natural questions may address the same need

**SETTLED — founder-approved in the Nuave orchestration task.** Natural,
relevant customer questions may address the same underlying need. Repeated
needs or purchasing decisions alone must not block acceptance. Remove the
requirement for six materially distinct unnamed decisions, and do not require
ten different customer jobs. Do not invent needs, occasions or comparison
formats merely to satisfy a diversity quota.

The founder rejected “Saat membuat invoice manual mulai lambat, aplikasi
invoice mana yang cocok?” as unnatural, considered the automatic-invoice
question more plausible, and supplied these exact preferred examples:

1. “Saya butuh solusi untuk bikin invoice cepet. Ada aplikasi yang bisa kamu rekomendasiin?”
2. “Ada ngga aplikasi atau website untuk bikin invoice otomatis?”

These are approved naturalness examples for this context, not universal
templates, mandatory slang, numeric reviewer scores or approval of an entire
pack. A short need statement followed by its question can express one consumer
request. The founder explained that needs around a product can be narrow, so
forcing different needs is not a useful acceptance condition.

This supersedes conflicting diversity requirements in Spec 008 R5 §§2.1/8,
SPEC R-17/R-18/AC-06 and the Questions guide. Apply it equally to rich/simple
generation and fallback; candidate alternatives need not invent a different
need. Distinct-decision counts may remain descriptive but cannot determine
usability, rejection or retry. No substitute diversity quota is approved.

Keep ten canonical slots, six unnamed/four named, their purposes and identity
rules, naturalness, concrete entity relevance, factual/context permissions,
safety, and exact-duplicate checks. No change to report calculations, provider
budgets, the distinct-business comparison threshold or P/M/C evidence rules
is authorized. Same-need wording can provide a real wording improvement;
labels alone still do not establish one.

Show the founder small sets of actual questions with their business context
at meaningful quality checkpoints, before presenting the agents' verdicts.
Record feedback against exact wording. Preserve previous captures, review
answers and frozen-policy results; any future reassessment must identify this
amended contract separately. The original G2P result remains historical
`not_retained`; this decision is not a new pilot pass.

Revisit only if real question/report evidence demonstrates a specific quality
problem beyond shared need. Runtime writer/evaluator updates remain worker
implementation work; this entry does not deploy them or authorize paid calls.

## 2026-09-16 — recover the accepted prompt and record founder wording feedback

The founder identified **Winning Prompt Generation Approach** as the source
of the accepted generation approach, reiterated satisfaction with the earlier
GLM-5.3 / GLM-5.3 Flash results, and requested a trace of why the recent work
had degraded. The [exact accepted experiment prompt](./references/WINNING_QUESTION_GENERATION_PROMPT_2026-09-07.md)
is now preserved in the repository with its conversation provenance. Preserve
that quality reference; the same-day no-diversity-quota amendment above still
governs. The current investigation is not a new model-selection exercise.

For the returned founder sample, the founder supplied these exact revisions:

- Q3: “Saya lagi nyari kafe yang nyaman buat nugas di Jaksel. Ada rekomendasi?”
- Q4: “Laptop saya mulai lemot. Kayaknya butuh beli baru. Cariin dong toko laptop di Bandung/Cimahi yang bagus.”
- Q5: **Drop.** The founder rejected “Untuk layanan dan kemudahan akses
  seperti apa Klinik Gigi Senyum cocok, dan kapan sebaiknya pasien memilih
  klinik gigi lain di Depok?” as something nobody would ask.

Record these as naturalness feedback on these texts, not a new universal
sentence template, numerical rubric score, or approval of the complete pack.
Dropping Q5 does not silently remove its matrix slot or adjudicate the
separate pending dental-review fields.

Investigation confirmed that the September 7 GLM-5.3 Flash writer decision
and implementation survive on `feat/cheaperinference-glm-5-3-flash`
(`2dbd86737cf3f652733e21a90991bb342e3dae04`, draft PR #47), separate from
main. That work retains the old generation instruction. The later G2P pilot
used Luna with different instructions; its result cannot establish that the
founder's GLM approach failed. Original model-specific response captures
were not recovered from the supplied conversation.

Orchestrator next action: reconcile the accepted source and existing GLM
integration with the current implementation requirements before issuing more
fallback-rewrite work. Further sample drafting is paused for that
reconciliation. Preserve earlier captures and results. This record does not
authorize implementation, a model switch in production, or new paid calls.

## 2026-09-17 — founder wording edits to the captured GLM invoice sample

The second local GLM-5.3 Flash connection attempt returned twelve invoice
questions for fictional ContohInvoice. The founder's overall feedback was
**“Mostly—some questions need edits.”** The founder then supplied these exact
replacements, using the original candidate numbers:

- **Q1:** “Aplikasi buat bikin invoice untuk usaha kecil enaknya pakai apa ya?”
- **Q3:** “Bikin invoice tiap bulan capek kalau manual. Biasanya UMKM pakai aplikasi apa sih?”

These are wording preferences for these two questions. Relative to the
captured response, Q1 removes “yang” before “enaknya”; Q3 removes “orang”
before “UMKM”. Carry the exact revisions into the integration handoff as
naturalness examples. Do not generalize them into word bans or mandatory
sentence templates. No further edits or drops were supplied, and approval of
the entire twelve-question set is not inferred.

Preserve the original response as observed evidence; founder revisions remain
separate. The accepted source prompt and no-diversity-quota amendment still
govern. This feedback does not resolve the provider model-name discrepancy,
change the product question composition, or authorize further paid requests.

## 2026-09-17 — preserve the winning-prompt milestone as a checkpoint

The founder requested a durable checkpoint so future sessions can recover
this moment if work drifts. Record
[`NUAVE-PROMPTS-2026-09-17`](./checkpoints/2026-09-17-winning-prompt-glm/CHECKPOINT.md)
as the reference for the accepted generation source, GLM connection capture,
and exact founder feedback. Include the tested fictional input/request and
twelve original questions in the repository, with founder edits separate;
keep credentials and raw provider/account metadata outside it.

Future question-generation work starts from this checkpoint and the latest
decisions. Preserve the accepted approach, selected GLM writer direction and
no-diversity-quota amendment. Any proposed departure must be explicit and
reasoned; mechanical compliance is not evidence that question quality improved.
Do not silently reconstruct the prompt from R5 or restart model selection.

The recorded milestone is connection/response capture with the founder's
“mostly” feedback and two exact edits, not a passed G2P or production integration. The model alias,
billing extraction and twelve-to-ten product adaptation remain as documented.
The portable next step is an offline integration draft and unsent request
specimen. This checkpoint grants no additional paid-call or release authority.
Later explicit founder decisions may supersede it; preserve the dated record
and link the new decision rather than rewriting its historical outcome.

## 2026-09-17 — time-box the next founder test

After repeated dormant-validator correction rounds, the founder challenged
the delay in reaching a functional product test and agreed that time-boxing
was the right next step. The founder asked for an action plan. The immediate
priority is now a working local founder test of confirmed facts → GLM →
editable questions. Stop expanding general validator hardening as the
prerequisite for preparing that controlled test. Preserve the findings as
known limitations; do not rewrite them as fixed or claim G2P has passed.

The orchestrator prepared the concrete
[local founder-test handoff](./drafts/glm-local-integration-2026-09-17/LOCAL_FOUNDER_TEST_HANDOFF.md):
a proposed 120-minute implementation session, 20-minute focused review, then
a founder test. The detailed scope and timing are prepared for dispatch, not
claimed as already executed or individually approved in this conversation.
Passing that handoff to the worker authorizes the specified offline local
experiment and its narrow sequencing exception before G2P; it does not
authorize production plumbing or release. The next milestone after question
review is one complete audit/report journey.

The winning source, GLM writer choice, founder wording and no-diversity-quota
amendment remain settled. Keep the default preview and deployed product
unchanged. A test deadline does not excuse false provenance, secret exposure,
unapproved spending or a false completion claim. No new provider request,
commit, push, merge or deployment is authorized by this planning request.
The two prior paid-request authorizations remain consumed. Prepare the
concrete live test first and obtain authorization only for that action.

## 2026-09-17 — local founder-test UI accepted; move to live preparation

After the synthetic local demo was made available, the founder said:
“Okay good enough, lets move on”. Treat the local interface as accepted for
this milestone and stop further UI/wording iteration here. This feedback
does not establish the quality of real GLM output: the demo used labeled
synthetic responses.

Next is the existing [45-minute live-readiness correction](./drafts/glm-local-integration-2026-09-17/LOCAL_FOUNDER_TEST_REVIEW.md),
limited to B1–B3: the frozen single-send attempt, original-text/metadata
preservation, and response-ID handling. Preserve the accepted interface,
prompt and model. Prepare the concrete live request for founder authorization;
this acceptance does not authorize a paid call or production release.

## 2026-09-18 — authorize one frozen GLM request through the local UI

After independent closure of B1–B3, the founder answered **“Authorized”** to
the request for the existing worker to make one paid GLM-5.3 Flash generation
through the local UI for fictional Laundry Ceria, then return the questions
for founder review. The presented estimate was about USD 0.004, explicitly
not a guaranteed cap; the scope has a 180-second client wait, zero client
retries and stops before audit execution.

This authorizes the single attempt in the
[accepted execution scope](./drafts/glm-local-integration-2026-09-17/LOCAL_FOUNDER_TEST_REVIEW.md),
bound to intake SHA-256
`7b82b585bae93ec539375c0eee7aec9c519e48edb2c532e14919920d3f5ceddb`
and outbound request SHA-256
`32356cbacf97610cfd927a4ff90cc0c65c83e6ee358e8e311aaaeaf46c0b9e29`.
Use the reviewed implementation and existing key by name only in the server
environment; no further confirmation is needed for this exact action.

At authorization recording, the artifacts still match and the consumed
marker is absent. This is permission to execute, not a claim of execution.
Do not reset the marker, retry after timeout/failure, change the request or
model, start observations/report generation, commit, push, merge or deploy.
Prior smoke-test authorizations remain separately consumed. This permission
does not approve generated question quality or activate production.

## 2026-09-18 — authorized UI request captured; allowance consumed

Execution evidence confirms one real GLM-5.3 Flash response for fictional
Laundry Ceria: HTTP 200/stop, response `gen-1789685244-h9NLCCkHFyzekfBLpIqh`,
settled USD 0.000782, marker consumed at 2026-09-17 22:47:22 UTC. The exact
outbound request hash matches the authorization. Ten questions are captured;
the UI returned `validation_failed`, not an approved pack. No audit/report
followed. No additional provider request is authorized by the original grant.

The worker changed the frozen intake record/sidecar after a pre-send
`input_changed` rejection. This departed from the explicit handoff even
though the actual API request remained identical. The
[review record](./drafts/glm-local-integration-2026-09-17/LOCAL_FOUNDER_TEST_REVIEW.md)
preserves both input hashes and distinguishes the worker's diagnosis from
independently confirmed evidence. This outcome record does not retrospectively
authorize that intake replacement or approve question quality. The worker
reports live mode disabled; the restored synthetic demo is not a new live run.

## 2026-09-18 — recommendation-eligible generation replaces fixed question purposes

The founder instructed: “I would like to focus entirely on implementing the
‘recommendation-eligible’ approach rather than giving each prompt fixed slots
with functional purpose.” The founder requested a high-level plan and worker
opinion, to be returned through the founder for alignment before implementation.

For the new method, the founder-accepted question-generation prompt and the
no-forced-diversity amendment govern generation quality. Fixed functional
slots, mandatory coverage of their purposes and the 6/4 allocation are no
longer constraints on the design. Do not reintroduce them as hidden categories,
required intent mixes or validation rules. Existing downstream dependencies
must be addressed rather than used to reshape natural questions back into
the old matrix. Preserve privacy, safety, honest business facts and evidence.

This supersedes conflicting fixed-purpose requirements for the new method in
the older question context, journey 04, Spec 007/008 and R5. It does not claim
that the shipped code or historical reports already use the new method.
Historical records retain their recorded measurement semantics.

The [high-level plan](./drafts/RECOMMENDATION_ELIGIBLE_PLAN_2026-09-18.md)
proposes an all-unnamed default and twelve candidates with ten selected for
execution. These details remain proposals for alignment, not additional
founder decisions. GLM-5.3 Flash remains the selected question writer; the
audit-answer provider is unchanged. The next task is the bounded worker
opinion. No implementation, new paid call, commit, push, merge or deployment
is authorized by this planning request; prior live allowances are consumed.

## 2026-09-18 — approve the bounded recommendation-eligible delivery

**SETTLED — founder-approved.** After the orchestrator compared the worker's
proposal and recommended a combined plan, the founder said: “Good judgement.
I agree with your plan. The worker agent too.” The founder requested a revised
plan for fresh orchestrator/worker sessions, clearly bounded and time boxed,
with founder testing at important judgment points.

The approved flow is **one confirmed brief → ten directly generated unnamed
questions → human editing and approval → ten independent grounded answers →
downloadable report**. This resolves the earlier proposals: no twelve-to-ten
selection step and no mandatory 6/4 split. Direct-ten is an explicit count-only
adaptation of the recovered source; human quality review remains. The returned
worker opinion still favored twelve/select-ten, so it is review evidence, not
unanimous agreement on that detail.

No fixed purposes, compulsory comparison, distinct-need quota or punctuation
count governs the new method. Competitor input is optional. Keep the accepted
source reasoning, natural Indonesian, open recommendation opportunity,
privacy/safety and honest evidence. GLM-5.3 Flash remains the question writer;
the grounded audit-answer provider is unchanged. Use actual evidence for
report counts and recommendations; preserve historical packs under their own
method rather than fabricating legacy categories on new questions.

[Spec 009](../specs/009-recommendation-eligible-audit/SPEC.md) is the approved
bounded implementation contract. Its two worker blocks are capped at 150 and
210 active minutes, including their checks. The founder judges real questions
before the second block and the real report at completion. Deadline overruns
return working progress and concrete blockers; extensions are explicit.

Offline implementation begins in the requested fresh sessions. This revision
session changes documentation only. New generation and audit/report calls
each need explicit scoped authorization; old allowances remain consumed. No
commit, push, merge, deployment or production activation is authorized.

This prospectively supersedes conflicting matrix, editing, report and R5 gate
requirements for the new method. Old G2 results and shipped behavior are not
relabelled as passed or migrated. [Fresh-session handoffs](./checkpoints/2026-09-17-winning-prompt-glm/NEXT_STEP.md)
carry the approved scope; no further general alignment round is required.

## Supersession annotations

The historical decision rows above remain unchanged. Their obsolete
measurement directions are explicitly superseded by the founder-approved
Spec 007 R-01/R-02 canonical matrix (2026-08-30):

- **2026-07-29 — Intent-5:** the five-category, two-per-category, 5/5
  allocation is superseded. The distinction between named and unnamed results
  remains, but the current matrix has 6 unnamed and 4 named fixed slots.
- **2026-07-31 — universal `generate-ai-visibility-prompts` skill:** its
  Intent-5 and 5/5 generation contract is superseded. The skill remains the
  retained generation method only after being rewritten against Spec 007's
  matrix.
- **2026-08-17 — five-and-five coverage brief:** its five-purpose, 5/5
  composition and free-composition editing direction are superseded. The
  bounded no-search generation call, natural Indonesian, fallback, and exact
  final-pack recording remain part of the current direction where compatible
  with Spec 007.

## Superseded directions

| Former direction                                                        | Status     | Superseded by                                                                                                                 |
| ----------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Broad Indonesian SMB launch                                             | SUPERSEDED | Dental-clinic validation wedge                                                                                                |
| Dental and aesthetic clinics in one initial prompt pack                 | SUPERSEDED | Dental first; aesthetic as an experiment                                                                                      |
| Rp99,000 public flagship or equal two-tier launch                       | SUPERSEDED | One Rp149,000 public founding offer                                                                                           |
| Four launch platforms including AI Overviews and Perplexity             | SUPERSEDED | Two grounded API surfaces for v0                                                                                              |
| Guaranteed or universal AI Visibility Score framing                     | SUPERSEDED | Sampled evidence with no initial composite score                                                                              |
| Meta Ads as the primary immediate launch engine                         | SUPERSEDED | Founder-assisted first cohort, ads after validation                                                                           |
| Permanent bearer-link report access                                     | SUPERSEDED | Revocable token with recovery and finite retention                                                                            |
| Revocable token access with no account as the fixed first mechanism     | SUPERSEDED | Later Report Access and Recovery module selects the bounded private-access mechanism                                          |
| No code copied from the legacy system under any circumstance            | SUPERSEDED | Selective, reviewed, low-coupling reuse                                                                                       |
| Dental-clinic owner as the initial buyer                                | SUPERSEDED | Agency, freelancer, or marketing-consultant buyer ordering for one client business                                            |
| Rp149,000 clinic-owner offer as the active launch price                 | SUPERSEDED | One agency-facing per-audit pilot price remains open                                                                          |
| Founder-assisted clinic-owner acquisition before cold ads               | SUPERSEDED | Sample-led agency validation with targeted outreach and an optional bounded paid test                                         |
| Agency, freelancer, or marketing-consultant buyer                       | SUPERSEDED | Indonesian small or medium business owner, ordering an audit of their own business                                            |
| Apex `nuave.ai` transition with v1 SaaS moved to `monitor.nuave.ai`     | SUPERSEDED | `v2.nuave.ai` subdomain launch, with `nuave.ai` left untouched                                                                |
| English throughout the `/audit` workflow                                | SUPERSEDED | Indonesian across every customer-facing touchpoint                                                                            |
| No composite score in the first ten reports                             | SUPERSEDED | Counts with denominators as the headline, plus a banded score beneath                                                         |
| Counts with denominators plus a banded AI Visibility Score              | SUPERSEDED | One direct appearance count out of ten, with name/no-name components kept separate                                            |
| Facts and question approval before checkout                             | SUPERSEDED | Free identity/order preview, then payment, then personalized fact and question preparation                                    |
| Sample-led agency validation with three to five buyer conversations     | SUPERSEDED | Demonstrate-before-selling outreach to Indonesian business owners                                                             |
| Universal multi-industry prompt matrix as the default scope             | SUPERSEDED | One vertical in one city until it works                                                                                       |
| Hand-made first sample audit, automation deferred                       | SUPERSEDED | Pipeline built first, with a report-quality gate before design and payment work                                               |
| "Manual until it hurts" as a vision principle                           | SUPERSEDED | Seven principles; scope restraint moved to `AGENTS.md` and `NOW.md`                                                           |
| The 2026-08-08 highest-level product vision                             | SUPERSEDED | Founder-approved independent vision adopted on 2026-08-09 and former version archived                                         |
| Seven-principle count in the superseded vision                          | SUPERSEDED | Nine principles in the founder-approved canonical rewrite; "Manual until it hurts" remains absent                             |
| Pipeline-only implementation before any checkout surface                | SUPERSEDED | Fixture-backed full journey with explicitly simulated checkout; live report quality gate still precedes real checkout         |
| Durable live report link before the first report-quality gate           | SUPERSEDED | Simulated destination in the fixture shell; durable private delivery only after the first live report passes the quality gate |
| Price open and future planning simulations use no numeric anchor        | SUPERSEDED | Rp99.000 total, no added Nuave checkout tax or fee, with a 30-day unpaid quote                                                |
| Midtrans only as a real-checkout candidate                              | SUPERSEDED | Midtrans selected for QRIS, bank transfer, GoPay, and DANA, pending production verification                                   |
| PDF rendering success required before report-ready delivery             | SUPERSEDED | Deliver the validated web report while retrying the PDF artifact from the same report version                                 |
| Direct OpenAI transport for Phase 3 GPT-5.6 Luna                        | SUPERSEDED | OpenCode Go transport serving GPT-5.6 Luna (2026-08-21)                                                                       |
| HeroUI v3 as the default workflow design system                         | SUPERSEDED | shadcn/ui + Base UI + Tailwind CSS v4 + BeUI with a BeUI light baseline and Tabler Icons (2026-08-28)                         |
| Intent-5: five categories, two questions each, with 5 unnamed / 5 named | SUPERSEDED | Spec 007 R-01/R-02 canonical ten-slot matrix: 6 unnamed + 4 named, with fixed slot policies (2026-08-30)                      |
| Universal `generate-ai-visibility-prompts` skill using Intent-5 and 5/5 | SUPERSEDED | Retained skill rewritten against Spec 007's canonical 6/4 matrix (2026-08-30)                                                 |
| Five-and-five coverage brief with free-composition editing              | SUPERSEDED | Spec 007 R-10: wording edits stay within fixed slots; composition and slot policies cannot change (2026-08-30)                |
| `END_TO_END_PLAN.md` as the current order of work                       | SUPERSEDED | `PAYING_CUSTOMER_PLAN.md` (2026-09-27); the old plan stays as the requirements reference                                      |
| Product-wide polish before owners see the product or before payment     | SUPERSEDED | Polish parked until after the first paying customer (`PAYING_CUSTOMER_PLAN.md` §3.5, 2026-09-27)                              |
| Known-owner pilot before selling to strangers                           | SUPERSEDED | Optional Track V owner feedback; G1 opens Nuave to paying customers (`PAYING_CUSTOMER_PLAN.md`, 2026-09-27)                   |
