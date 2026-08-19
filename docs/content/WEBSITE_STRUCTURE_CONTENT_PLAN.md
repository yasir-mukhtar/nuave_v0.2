# Nuave V2 website structure and content plan

> Status: **Practical founder draft for an independently operated service**
> Prepared: 2026-08-16
> Scope: the smallest credible public website and its purchase touchpoints

This is a content and implementation plan, not legal advice and not a statement
that Nuave complies with every applicable law. Nuave does not currently operate
through a PT and does not expect near-term access to legal counsel. The practical
goal is therefore an honest, understandable site that identifies the independent
operator, explains the service and remedy, and accurately describes how data is
handled. The founder must verify every factual placeholder and must not publish a
privacy, refund, retention, or delivery promise that the real operation cannot keep.

A PT is not required merely to publish these pages. Nuave should describe itself
as an independently operated service and use a verified individual/operator
identity and monitored contact, without implying incorporation. Separate business
registration and PSE obligations can still apply to an individual operator and
remain an operational check; they are not replaced by website wording.

Do not turn the absence of a PT into a repeated public disclaimer. A calm operator
line in the terms, privacy page, support page, and checkout is enough. Trust should
come from verifiable identity, consistent promises, a working contact, and fair
problem handling.

## Recommendation

Launch a small Indonesian-language site with five public routes:

| Route | Page | Why it belongs in the minimum site |
|---|---|---|
| `/` | Landing page | Explains the problem, one-audit offer, deliverable, limits, and single path to order. |
| `/faq` | FAQ | Resolves practical buyer objections without overloading the landing page or support. |
| `/terms` | Syarat dan Ketentuan | States the seller, service contract, payment, delivery, correction, cancellation, refund/remedy, and dispute terms. |
| `/privacy` | Kebijakan Privasi dan Data | Gives one clear notice for personal-data processing. Do not split “privacy” and “data” into duplicate pages. |
| `/support` | Kontak dan Bantuan | Gives a real pre-sale, delivery, correction, privacy-rights, and complaint channel. |

No separate About, blog, pricing, features, dashboard, account, or subscription
page is justified for V2. Put the one price and exact purchase conditions beside
the order action once those facts are approved. Private audit, checkout, and
report routes are product surfaces, not additional marketing pages. Keep them
out of the public sitemap where appropriate and protect reports from indexing.

The current V2 landing implementation under `Archive Candidates/lp-remote` has only `/`. Its footer
already anticipates `/terms`, `/privacy`, and `/support`, but those destinations
do not exist there yet. `Archive Candidates/lp-remote/src/app/sitemap.ts` currently lists only the
root page. Implementation should add the approved public pages to the sitemap
and should not expose private order or report URLs.

## Global navigation

Keep the header short:

- logo links to `/`;
- “Cara kerja” and “Apa yang Anda terima” are landing-page anchors;
- “FAQ” links to `/faq`;
- “Kontak” links to `/support`; and
- one visually dominant primary action, “Audit bisnis saya”, leads into the
  intake/order journey.

The example report can remain a quieter secondary link where it helps explain
the product. It must stay labelled as an illustration unless it is a real result
the customer has explicitly permitted Nuave to publish.

The footer should contain:

- “Nuave adalah layanan independen yang dioperasikan oleh [NAMA PENGELOLA] di
  [KOTA], Indonesia,” or another accurate individual-operator disclosure;
- NIB or another registration identifier only after one exists and the founder
  verifies that publishing it is appropriate;
- a working support email or support link;
- `/faq`, `/terms`, `/privacy`, and `/support`;
- current year and the Nuave trading name;
- a PSE registration reference only after applicability and registration have
  been confirmed; and
- only social profiles that are active and monitored.

Do not claim “sesuai UU PDP”, “terdaftar”, or similar status unless the
underlying assessment is complete and the wording is approved.

## Landing page content order

`docs/content/landing-copy.md` is the working copy source and is being revised
separately. Use it as the copy input; do not rewrite it as part of this plan.
The page assembly should give each section one responsibility:

1. **Hero.** Say who the audit is for, the practical question it answers, and
   what is delivered. Keep one primary action. Do not imply monitoring,
   subscription software, an account, or guaranteed visibility.
2. **Why this matters.** Explain buyer behaviour in plain language. Every
   statistic or market claim needs a named, current, credible source and wording
   that does not turn correlation into a promise. Remove unsupported claims.
3. **How it works.** Show the real sequence: submit one public business source,
   review the free identity and order preview, pay once, confirm prepared
   business facts, approve ten Indonesian questions, and receive the report.
4. **What the report contains.** Describe the direct appearance count out of
   ten, the separate name/no-name measures, exact evidence, other-business
   observations, public-information gaps, one to five actions, sources, and
   limitations.
5. **Example report.** Demonstrate the experience without presenting fiction as
   proof. Keep the example clearly and persistently labelled “Ilustrasi”.
6. **Method limits.** State that this is a sampled observation at a recorded
   time, not a permanent ranking, forecast, guarantee, or causal diagnosis. AI
   answers can vary between runs.
7. **Price and order summary.** Once approved, show one total price, tax/fees,
   what is included, delivery time, and the short failure/correction/refund
   remedy before the order action.
8. **Privacy summary.** Explain data minimisation, public business data,
   buyer-supplied facts, private delivery, and link to `/privacy`. Do not say
   Nuave collects no payment data unless accurate across Nuave and its provider.
9. **FAQ preview.** Show the five highest-friction questions and link to `/faq`.
10. **Final action and footer.** Repeat the same primary action, not a new offer.

Before launch, reconcile every price, payment method, delivery promise, report
scope, and privacy statement in the landing copy with founder-approved facts. A
value in an in-progress draft is not approval.

## Supporting-page content outlines

All page titles, notices, and contract text should be in Indonesian. English can
be added later but must not displace or conflict with the Indonesian contract.

Each page now has a self-contained handoff file that can be given to a separate
implementation agent:

| Agent scope | Handoff and content file |
|---|---|
| FAQ | [`website/FAQ.md`](./website/FAQ.md) |
| Terms | [`website/TERMS.md`](./website/TERMS.md) |
| Privacy/data | [`website/PRIVACY.md`](./website/PRIVACY.md) |
| Contact/support | [`website/SUPPORT.md`](./website/SUPPORT.md) |

The FAQ, terms, and privacy files contain full founder drafts, not just outlines.
The support file also contains a small finished draft so its implementation agent
does not have to invent a tone or new commitments. Internal instructions and
bracketed placeholders must not appear on the public website.

### `/faq` — FAQ

Start with the shortlist below. Each answer should be two to five sentences,
lead with the answer, and link to terms, privacy, or support for detail. It must
not introduce a new commercial promise.

Settled fields: Rp99.000 total with no added Nuave checkout tax or fee; a
30-day unpaid quote; Midtrans with QRIS, bank transfer, GoPay, and DANA; and
`support@nuave.ai`. Still required: delivery time and clock start; supported
business/location scope; terminal failure, cancellation, refund, and re-check
rules; report access/retention; and support response target.

### `/terms` — Syarat dan Ketentuan

Treat the repository copy as a founder-reviewed draft until its placeholders
match the real operation. Do not put a scary “legal draft” banner on the public
page. The page should cover:

1. **Document identity:** title, version/effective date, prior version if
   applicable, and a way to download/save the accepted version.
2. **Operator:** `[NAMA LENGKAP PENGELOLA]`, Nuave trading name, status as an
   independent individual operator, `[KOTA/ALAMAT KORESPONDENSI]`, `[NIB IF ANY]`,
   `[PSE STATUS/NUMBER IF ANY]`, and support. Do not call Nuave a PT.
3. **Who may order:** buyer authority to audit their own business and duty to
   supply accurate, lawful information.
4. **Service:** one audit of one verified business, ten approved Indonesian
   questions, one sampled run on the named AI surface, and one private,
   downloadable report; state geography/category limits.
5. **Exclusions:** no general account or dashboard, monitoring, subscription,
   ranking, implementation service, guaranteed inclusion, traffic, leads, or
   sales. A later bounded private report-access mechanism remains open.
6. **Inputs/question approval:** required facts, branch resolution, correction
   before lock, consequences of bad/late input, and prohibition on customer
   records, sensitive personal data, unlawful material, and secrets.
7. **Price/payment:** `[TOTAL PRICE]`, taxes/fees, currency, methods/provider,
   when payment is final, invoice/receipt, and failed payment.
8. **Order formation:** previewed business, one-audit service, price, terms,
   timing, and remedy shown before payment; personalized facts and questions are
   prepared after verified payment and approved before the audit starts. Define
   contract formation and how confirmation/accepted terms can be saved.
9. **Execution/delivery:** `[DELIVERY WINDOW]`, clock start/pause, report-ready
   email, approved private-access mechanism, access period, recovery, and delay
   communication.
10. **Correction/failure/cancellation/refund:** material nonconformity,
    correction window, incomplete run, rerun, cancellation cutoff, duplicate
    payment, refund amount/timing/method, and buyer error. Avoid “all sales final”;
    use the narrow, fair remedy proposed in `website/TERMS.md`.
11. **Method limits:** recorded-time observations, answer variability, source
    limits, no permanent ranking, causal claim, forecast, or guaranteed outcome.
12. **Report use/IP:** buyer use, Nuave's pre-existing method/materials, source
    rights, misleading alteration/resale, and feasible confidentiality promise.
13. **Personal data:** incorporate `/privacy`; distinguish essential service
    communications from optional marketing.
14. **Third parties/force majeure:** real dependencies without using them to
    disclaim mandatory obligations.
15. **Refusal/suspension:** narrow grounds for ambiguous identity, unlawful or
    sensitive input, unsupported scope, fraud, or technical inability, with the
    associated remedy.
16. **Liability/consumer rights:** a short, fair allocation that explains third-
    party AI limits without attempting to waive rights that cannot be waived.
17. **Complaints/disputes:** internal path and target, `[GOVERNING LAW]`,
    `[VENUE]`, and any required consumer dispute option.
18. **Changes/contact:** material-change notice and which version governs an
    existing order.

### `/privacy` — Kebijakan Privasi dan Data

Treat the repository copy as a founder-reviewed draft until it matches the real
data flow. The public page should sound clear and settled, not like legal theatre.
Use a short plain-language summary followed by the complete notice:

1. **Responsible operator:** `[NAMA LENGKAP PENGELOLA]`, independent operator of
   Nuave in `[KOTA]`, privacy channel, and rights-request route.
2. **Scope/roles:** website visits, inquiries, orders, audits, payments,
   reports, support, and accurate controller/processor roles.
3. **Data categories:** contact/delivery details; public business identity and
   sources; buyer facts; questions; order/payment status and reference;
   report/evidence; support; device, security, cookie, and analytics data
   actually collected. Say payment credentials are handled by `[PROVIDER]` only
   if true.
4. **Sources:** buyer, public business sources, provider, system/security logs,
   and communications; distinguish business facts from personal data.
5. **Purposes/lawful bases:** map actual purposes to the most defensible basis:
   pre-contract/order, report, payment/records, security/fraud, support,
   obligations, improvement, analytics, and optional marketing. Do not use one
   blanket consent.
6. **Processing:** intake, confirmation, question approval, AI-assisted
   observation, report generation, delivery, support, deletion, and re-check
   only when ordered.
7. **Recipients/processors:** `[HOSTING]`, `[PAYMENT]`, `[AI/SEARCH]`, `[EMAIL]`,
   `[ANALYTICS]`, advisers, and authorities; name providers where advised.
8. **International transfers:** actual locations/destinations and
   safeguards/assessment. Do not claim all data remains in Indonesia unless true.
9. **Retention/deletion:** approved periods for intake, questions, raw evidence,
   reports/links, support, financial/legal records, security logs, and marketing;
   explain deletion/anonymisation and legal holds.
10. **Rights:** access, correction, deletion/destruction, consent withdrawal,
    objection/restriction, portability/copies, and complaint; include a real
    channel, reasonable identity verification, response, and escalation.
11. **Security/incidents:** proportionate controls without absolute promises or
    exploitable detail, and notification approach for relevant breaches.
12. **Children/sensitive data:** eligibility and instruction not to submit
    customer, payment, health, legal, financial, or other sensitive records;
    define stop/restrict/delete/escalate handling if received.
13. **Cookies/analytics:** actual tools only, essential versus optional, and
    preferences where required. Do not copy a generic cookie list.
14. **Automated processing/AI:** meaningful role in observations/reports and the
    human confirmation steps, without asserting an unreviewed legal category.
15. **Changes/complaints:** version/date, change notice, privacy contact, and a
    plain-language Indonesian complaint route.

The policy describes processing; it does not create operational compliance.

### `/support` — Kontak dan Bantuan

Include:

- verified seller/trading identity and monitored `[SUPPORT EMAIL/FORM]`;
- hours/time zone and `[FIRST-RESPONSE TARGET]`;
- choices for pre-sale, payment/order, report access, correction/remedy,
  privacy-rights request, and other complaint;
- safe identifiers to include, such as order number and business name, plus a
  warning not to submit credentials, customer records, or sensitive data;
- complaint steps, escalation, expected updates, and terms link;
- privacy-rights link/dedicated channel; and
- an alternative if the form cannot be used.

Do not publish a phone, address, or hours nobody monitors. A form needs success
and error states, spam protection, delivery monitoring, and fallback email.

## FAQ shortlist

These notes are answer responsibilities, not finished copy:

1. **Apa itu audit visibilitas AI Nuave?** One sampled audit/report for the
   buyer's own business, not monitoring software.
2. **Apa yang diuji?** Ten buyer-approved Indonesian questions on the exact
   launch AI surface. The suggested pack starts five/five, but the customer may
   replace any question and the report follows the final composition.
3. **Apa yang saya terima?** Approved report contents and private/downloadable
   delivery, without unsupported features.
4. **Apakah hasilnya peringkat atau jaminan bisnis saya akan muncul?** No;
   explain recorded-time sampling and answer variability.
5. **Apakah Nuave menjamin traffic, calon pelanggan, atau penjualan?** No; the
   audit provides evidence and priorities, not a commercial forecast.
6. **Berapa harga audit dan kapan saya membayar?** Approved total price, fees,
   payment timing, and provider.
7. **Kapan laporan selesai?** Approved window, clock start, and delay remedy.
8. **Bagaimana jika audit gagal atau laporan salah/tidak lengkap?** Exact
   correction, rerun, cancellation, refund/remedy, and complaint paths.
9. **Data apa yang dikumpulkan dan apakah laporan dipublikasikan?** Minimum data,
   public sources, private delivery, separate permission to publish, and privacy
   link.
10. **Apakah saya perlu website?** State the truthful eligibility rule; Nuave
    needs enough authoritative public information to resolve the business.
11. **Apakah saya bisa mengubah pertanyaan?** Yes before approval; locked
    questions are not silently changed during the run.
12. **Apa itu re-check dan kapan dilakukan?** A separately purchased same-
    question run, suggested after six to eight weeks; not a subscription and not
    a scientifically proven interval.

Retire generic educational questions whose main purpose is selling “AEO” as a
category. The FAQ should answer an order decision, not create a glossary.

## Checkout, consent, and order confirmation

These requirements belong in the order experience even though checkout is not
a public content page. Before payment, show one reviewable summary containing:

- seller identity and support contact;
- exact business/branch, all ten approved questions (or a downloadable
  attachment), service specification, and method limits;
- total value, currency, tax, fees, payment method/provider, and when payment is
  treated as received;
- delivery procedure and timing;
- correction, nonconformity, failure, cancellation, refund/remedy, and complaint
  routes; and
- links to the exact Indonesian terms and privacy versions.

Use unchecked affirmative acceptance for the terms. Present the privacy notice
when data is collected and record its version; do not mislabel every lawful basis
as consent. Optional marketing consent must be
separate, specific, unchecked by default, and revocable without affecting the
purchase.

Record accepted terms/privacy versions, timestamp, order reference, and
necessary evidence. After purchase, provide a confirmation the buyer can
download or save containing party identities, service specification,
transaction value, payment status/terms, delivery procedure, remedy/cancellation
path, and governing-law/dispute choice. A provider receipt does not replace
Nuave's service contract.

Collect only what the next step needs, warn buyers not to submit customer or
sensitive records, and allow correction of business facts and questions before
they are locked.

## Legal and compliance matrix

This matrix routes work; it is not a legal conclusion. Because counsel is not a
realistic near-term dependency, use official OSS and Komdigi guidance for the
minimum registration checks, document the founder's decisions, and avoid public
compliance claims. Seek professional review later if Nuave grows, handles more
sensitive data, receives a dispute, or materially changes its business model.

| Area and current source | Public website requirement | Operational requirement | Decision |
|---|---|---|---|
| Personal data — **UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi** | Publish an accurate privacy notice and rights/contact channel; give point-of-collection notice where needed. | Data inventory/lawful-basis map; minimisation; processor contracts; rights, retention/deletion, security, incident/breach, and transfer workflows; evidence. | Required before paid launch. The page alone is not compliance. |
| Electronic commerce — **PP No. 80 Tahun 2019 tentang Perdagangan Melalui Sistem Elektronik**, especially Arts. 53, 55, 56 | Clear seller/service/price/delivery/remedy/contact information; Indonesian terms; downloadable/saveable contract. | Capture acceptance/version; issue confirmation; operate correction, delivery, nonconformity, cancellation, refund/remedy, complaint, and record retention. | Required for real purchase. These are checkout/contract requirements, not extra-page requirements. |
| Consumer protection — **UU No. 8 Tahun 1999 tentang Perlindungan Konsumen** | Truthful advertising and clear service, limitation, price, and remedy information; do not remove mandatory rights. | Deliver the agreement; operate complaint/remedy handling; retain representations and order evidence. | Required; use a narrow, fair limitation instead of aggressive legal boilerplate. |
| Indonesian-language agreements — **UU No. 24 Tahun 2009**, Art. 31, and PP 80/2019 Art. 55 | Indonesian is the customer-facing terms/contract default. | Checkout, accepted terms, confirmation, and notices stay consistent in Indonesian. | Required. English is optional and must not conflict. |
| Private electronic-system operator — **PP No. 71 Tahun 2019** and **Permenkominfo No. 5 Tahun 2020**, as amended | Display registration status/number only if confirmed and appropriate. | Assess PSE Lingkup Privat status and likely complete registration before public use where the service processes personal data or offers online services. | Operational launch gate, not footer text. |
| PMSE classification/licensing — **Permendag No. 19 Tahun 2026** (effective 2026-06-08; replaces Permendag 31/2023) | Make no licensing/classification claim until verified. | Counsel/OSS review entity, activity, KBLI/licence, and PMSE classification/obligations. | Conditional assessment before paid launch. [Official text](https://jdih.kemendag.go.id/pdf/Regulasi/2026/PERMENDAG%2019%20TAHUN%202026.pdf). |
| DPO/data-protection function — UU 27/2022 threshold provisions | Name a DPO only if one is appointed. | Assess the threshold and assign responsible privacy ownership even if a formal DPO is not mandatory. | Conditional; do not claim every launch requires a DPO. |
| International transfer — UU 27/2022 | Describe actual destinations/provider categories and safeguards accurately. | Map locations, assess mechanism/safeguards, configure providers, and document the decision. | Conditional on providers, but likely relevant for AI, hosting, email, or analytics abroad. |
| Cookies, analytics, marketing | Accurate tool/preference information and consent where the chosen legal analysis requires it. | Inventory scripts, remove unnecessary trackers, configure preferences/withdrawal, and suppress optional tags until allowed. | Defer advertising and optional analytics until lawful and tested. |

Official source texts: [UU 27/2022](https://peraturan.bpk.go.id/Details/229798/u),
[PP 80/2019](https://peraturan.bpk.go.id/Details/126143/pp-no-80),
[UU 8/1999](https://peraturan.bpk.go.id/Details/45288/uu-no8-tahun-1999),
[UU 24/2009](https://peraturan.bpk.go.id/Details/38661/uu-),
[PP 71/2019](https://peraturan.bpk.go.id/Details/122030/pp-no-71-tahun-2019),
[Permenkominfo 5/2020](https://jdih.komdigi.go.id/produk_hukum/view/id/759/t/peraturan%2Bmenteri%2Bkomunikasi%2Bdan%2Binformatika%2Bnomor%2B5%2Btahun%2B2020),
and [Permendag 19/2026](https://jdih.kemendag.go.id/pdf/Regulasi/2026/PERMENDAG%2019%20TAHUN%202026.pdf).

Refresh this inventory immediately before launch using current official sources.
The founder should keep a dated note of the NIB/PSE checks performed and obtain
professional advice later when it becomes practical or risk materially increases.

## V1 content: reuse, rewrite, or retire

The public V1 pages at `https://nuave.ai/privacy`, `https://nuave.ai/terms`, and
`https://nuave.ai/support` are references only. They materially describe an
obsolete SaaS/account/credits product and must not be copied as V2 terms.

### Reuse only after verification and rewriting

- route convention `/privacy`, `/terms`, and `/support`;
- plain-language structure, headings, version/effective date patterns, and a
  contact channel only if it is still monitored;
- general security, confidentiality, rights, and complaint concepts only after
  matching them to V2's real systems and operating practices; and
- Nuave trading name/brand assets while separately verifying the contracting
  party.

### Retire from V2

- account, password, profile, team, role, or dashboard language;
- subscriptions, recurring billing, credits, balances, tiers, trials, upgrades,
  downgrades, or automatic renewal;
- agency, reseller, white-label, multi-client, or client-management language;
- monitoring, live tracking, continuous scans, or ongoing platform access;
- V1 prices, expiry, refund/cancellation, and delivery commitments;
- broad SaaS user-content licences and account-termination clauses;
- old providers, transfers, cookies, retention, entity, or contact details unless
  each is verified; and
- any claim that V1 consent, registration, security, or acceptance covers V2.

### Replace with V2-specific treatment

- one paid audit, one verified business, ten approved questions, one report;
- separately purchased re-check after a suggested six to eight weeks;
- private-link and downloadable delivery without a required account;
- correction before the run and a concrete failed-run/nonconformity remedy;
- purpose-specific retention for inputs, evidence, report, and link; and
- actual V2 AI/search, hosting, payment, email, and support providers.

## Lean implementation sequence

Do this as one short sequence, not a new phase framework:

1. **Resolve paid-launch decisions.** Founder completes the priority list below,
   uses the official OSS individual-UMK and Komdigi PSE guidance, and records the
   outcome. Do not invent a PT or registration number.
2. **Draft and approve content.** Reconcile the in-progress landing copy with
   approved facts; use the separate FAQ, terms, privacy, and support drafts. The
   founder verifies every placeholder and approves every promise.
3. **Implement five routes and links.** Reuse the visual system, use readable
   legal typography, add metadata, list public routes in the sitemap, and
   exclude/protect private routes.
4. **Implement purchase touchpoints.** Add pre-payment summary, correction,
   terms acceptance, point-of-collection privacy notice, separate optional
   marketing choice, version evidence, and saveable confirmation.
5. **Complete operations.** Put rights, retention/deletion, processor, transfer,
   security/incident, support, delivery, and remedy workflows behind the public
   promises. Complete applicable PSE registration/licence review.
6. **Run launch review.** Test links/forms, payment failure/duplicate payment,
   confirmation, delivery, recovery, correction, remedy, privacy request, mobile,
   basic keyboard/screen-reader use, indexing, and claim accuracy. Record the
   founder-approved content versions and the facts checked.

### Acceptance criteria

- All five public routes render in Indonesian on mobile/desktop and link without
  dead ends.
- Header and repeated calls to action lead to one order journey; no subscription,
  account, or dashboard language remains.
- Seller identity, price, taxes/fees, provider, delivery, scope, and remedies
  match across landing, FAQ, terms, checkout, confirmation, and support.
- Terms/privacy show version/effective date, and accepted terms/order confirmation
  can be downloaded or saved.
- The example is clearly illustrative; claims have recorded sources and promise
  no ranking, causation, traffic, leads, or revenue.
- Private report/audit routes are absent from the sitemap, appropriately
  protected, and noindexed where applicable.
- Contact reaches a monitored channel and has confirmation/fallback.
- Privacy matches a completed data/provider/retention inventory; a test rights
  request can be located, verified, answered, and closed.
- A failed order and correction/refund case can be handled as promised.
- The founder completes a plain-language truth check: every commercial and data
  statement describes what Nuave actually does and can consistently honour.

### Paid public launch gates

Do not accept a paid public order until the practical minimum below is true:

- verified contracting party, address/contact, NIB/licence facts, and price;
- founder-approved Indonesian terms, privacy notice, checkout summary, remedy,
  and complaint route contain no unresolved placeholders;
- PSE decision is documented and registration is completed if the official
  criteria apply;
- individual-UMK NIB and applicable OSS classification checks are documented;
- delivery, correction, cancellation, failed-run, refund/remedy, and support
  procedures tested end to end;
- data inventory, lawful-basis map, processor contracts, transfer assessment,
  retention/deletion, rights, and security/incident workflows operate;
- payment, confirmation, private delivery, recovery, and deletion work; and
- public claims/examples pass source and truthfulness review.

## Open founder decisions, in priority order

### Before final legal text or payment

1. **Independent operator:** public operator name, relationship to the Nuave
   trading name, city/correspondence address, monitored contact, and the minimum
   personal identity the founder is comfortable publishing. Never imply a PT.
2. **Registration check:** individual-UMK NIB/KBLI position and PSE
   assessment/result/number using current OSS and Komdigi guidance.
3. **Offer/price:** verify the settled Rp99.000 customer total, no additional
   Nuave checkout tax or fee, 30-day quote, launch category/location, and
   included output.
4. **Delivery:** window, clock start/pause, delivery/recovery, report/link access
   period, and delay communication.
5. **Payment:** verify Midtrans QRIS, bank transfer, GoPay, and DANA; settlement
   rule; receipt/invoice issuer; failed or duplicate payment; and chargeback
   handling.
6. **Remedies:** correction window, nonconformity, failure/rerun, cancellation,
   refund eligibility/amount/method/timing, and escalation.

### Before privacy and copy approval

7. **Retention:** periods/deletion triggers for abandoned intake, facts,
   questions, raw evidence, report/link, order/financial records, support,
   security logs, analytics, and marketing preferences.
8. **Providers/locations:** hosting, AI/search, payment, email, support/form,
   analytics/cookies, storage/backups, processing locations, contracts.
9. **Privacy ownership:** controller, privacy channel/internal owner, rights
   verification/response, deletion, incident lead, DPO-threshold assessment.
10. **Publication/confidentiality:** private-by-default rule, staff/contractor
    access, and separate permission required to publish a finding/example.
11. **Analytics/marketing:** whether non-essential analytics are needed;
    marketing purpose, opt-in, provider, unsubscribe. Lean default: no ad tracker
    and no marketing opt-in in the first paid flow.

### Before support and terms are final

12. **Support:** `support@nuave.ai` monitoring hours/time zone, response target,
    order and privacy escalation, complaint owner, and outage fallback.
13. **Disputes:** Indonesian law, good-faith internal complaint step, and a
    competent Indonesian dispute forum stated without pretending Nuave has a
    lawyer or sophisticated arbitration process.
14. **Re-check:** price rule, eligibility, same-question/version requirements,
    timing, and necessary retention. Never present it as renewal or monitoring.
15. **Buyer eligibility:** age/capacity, authority for the business, official
    source requirements, ambiguous branch handling, disallowed/sensitive input.

Until these decisions are approved, use explicit placeholders in internal
drafts and do not invent values from V1 or the in-progress landing copy.
