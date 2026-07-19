# Nuave v2 — Funnel and Customer Lifecycle

> **Purpose:** Define the complete customer journey from first touch through re-audit, including acquisition, landing-page conversion, purchase, delivery, support, action follow-through, and referral.
>
> **Authority:** This document governs funnel, acquisition-message, landing-page, checkout, attribution, and post-delivery lifecycle decisions. [`FOUNDATION.md`](./FOUNDATION.md) remains authoritative for product vision, market boundary, principles, and non-goals. If the two conflict, stop and record the conflict in [`DECISION_LOG.md`](./DECISION_LOG.md) before implementation.
>
> **Status:** Working specification for founder review and the first paid cohort. Decisions marked **[SETTLED]** may be implemented. Items marked **[OPEN]** require a recorded decision before they materially affect customer promises, data collection, or spend.
>
> **Last updated:** 2026-07-19

## Related documents

- [`README.md`](./README.md) — documentation map and authority rules
- [`FOUNDATION.md`](./FOUNDATION.md) — canonical product and strategy context
- [`MVP_SPEC.md`](./MVP_SPEC.md) — screens, product flow, and acceptance criteria
- [`MEASUREMENT_SPEC.md`](./MEASUREMENT_SPEC.md) — audit surfaces, prompts, evidence, and re-audit comparability
- [`OPERATIONS_RUNBOOK.md`](./OPERATIONS_RUNBOOK.md) — QA, support, failure remedies, refunds, and delivery operations
- [`TECHNICAL_ARCHITECTURE.md`](./TECHNICAL_ARCHITECTURE.md) — state machine, event implementation, security, and integrations
- [`EXPERIMENTS_AND_GATES.md`](./EXPERIMENTS_AND_GATES.md) — hypotheses, experiment records, thresholds, and scale gates
- [`COMPLIANCE_AND_DATA.md`](./COMPLIANCE_AND_DATA.md) — consent, privacy, retention, clinic claims, and channel constraints
- [`DECISION_LOG.md`](./DECISION_LOG.md) — dated material decisions and revisit triggers

## 1. How to use this document

This is a journey contract, not a copy deck. It defines what each touch point must accomplish and what it must never imply. Final customer-facing copy may vary by channel, city, or experiment only when it preserves these claims and transitions.

Decision labels:

- **[SETTLED]** — current operating decision; implement unless later evidence produces a recorded change.
- **[HYPOTHESIS]** — plausible but unvalidated belief.
- **[EXPERIMENT]** — bounded test with a metric, guardrail, and decision rule.
- **[OPEN]** — unresolved choice; do not disguise it as a decision.
- **[NON-GOAL]** — explicitly outside the launch journey.

Future human and AI sessions must:

1. Preserve message match between acquisition creative and the page it opens.
2. Never invent customer results, market observations, urgency, capacity limits, or testimonials.
3. Distinguish a real market example from a personalized audit.
4. Treat consent, attribution, and report access as part of the product, not cleanup.
5. Route operational remedies to the runbook and measurement claims to the measurement specification.
6. Record material changes in the decision log.

## 2. Funnel objective and governing decisions

The funnel exists to help the right clinic owner make a well-informed low-friction purchase, receive a credible diagnosis, commit to a realistic action, and later measure a comparable change. It is not designed to maximize checkout starts at the expense of fit, trust, or delivery quality.

### 2.1 Current decisions

- **[SETTLED]** The first paid cohort serves one wedge: single-location dental clinics.
- **[OPEN]** Select one initial city from Jakarta, Bandung, or Surabaya after the feasibility and founder-access review. Do not launch or pool the first public cohort across all three cities.
- **[SETTLED]** Aesthetic clinics are the first vertical-expansion experiment, not part of the initial dental prompt pack or generic launch copy.
- **[SETTLED]** The first 20–30 paid reports are acquired primarily through founder-assisted outreach, referrals, owner communities, and partners.
- **[SETTLED]** Cold advertising is not a validated scale engine and begins only after the report-value and delivery gates in [`EXPERIMENTS_AND_GATES.md`](./EXPERIMENTS_AND_GATES.md) pass.
- **[SETTLED]** The public launch has one offer: **Founding Cohort Full Audit — Rp149,000**.
- **[SETTLED]** A lower-cost or single-platform downsell is not displayed publicly during the first cohort. It may be tested privately only through a recorded experiment.
- **[SETTLED]** The clinic's exact identity and launch eligibility are confirmed before checkout.
- **[SETTLED]** The personalized audit begins only after confirmed payment.
- **[SETTLED]** No customer account or dashboard is required at launch.
- **[SETTLED]** Report access uses an opaque, revocable, order-linked token with a recovery path. “Permanent access” is not promised.
- **[SETTLED]** The web report is the primary aftersales surface. A PDF, if offered, is a portable rendering of the same report rather than a separate product.
- **[SETTLED]** Follow-up is designed around understanding and action, not a generic marketing drip.

### 2.2 Prohibited funnel behavior

- **[NON-GOAL]** A fake personalized score, scan, loading state, or result before an audit has run.
- **[NON-GOAL]** Fake scarcity, evergreen countdown timers, invented “spots left,” or an unsubstantiated crossed-out reference price.
- **[NON-GOAL]** Claims that Nuave measures a permanent ranking, exactly reproduces consumer AI interfaces, or guarantees future recommendation.
- **[NON-GOAL]** Health-condition targeting, patient profiling, or creative that implies knowledge of a viewer's health status.
- **[NON-GOAL]** Patient lead generation, treatment advice, clinical claims, or collection of patient health data.
- **[NON-GOAL]** Thin city or vertical pages created only to capture search traffic.
- **[NON-GOAL]** A forced sales call, account creation, or subscription during the launch journey.
- **[NON-GOAL]** Indefinite founder consulting silently bundled into a Rp149,000 audit.

## 3. Canonical journey

```text
Founder outreach / partner / organic content / later paid campaign
                              ↓
               Message-matched landing page
                              ↓
            Exact clinic lookup and eligibility
                              ↓
       Real dated proof + clearly labeled sample report
                              ↓
           One offer and transparent checkout
                              ↓
                   Midtrans payment
                              ↓
             Two-minute post-payment brief
                              ↓
        Durable audit workflow + logged manual QA
                              ↓
       Secure mobile-first web report (+ optional PDF)
                              ↓
          Customer selects one priority action
                              ↓
     Support → completion evidence → referral request
                              ↓
               Comparable 30–90 day re-audit
```

Each transition must answer one customer question:

| Transition | Customer question the touch point must answer |
|---|---|
| First touch → landing page | “Is this relevant to my clinic and city?” |
| Landing page → lookup | “Is this a real, credible problem?” |
| Lookup → offer | “Can Nuave audit the correct clinic, and what will I receive?” |
| Offer → payment | “Is the price, delivery promise, and remedy clear?” |
| Payment → brief | “What extra context will make this report more useful?” |
| Audit → delivery | “Is work progressing, and when will I hear from you?” |
| Report → action | “What should I do first, and how do I know it is done?” |
| Action → re-audit | “Did the tested evidence change after my work?” |

## 4. Segment and rollout discipline

### 4.1 First wedge

The first customer-facing experience should say “dental clinic,” not “local business” or “health and beauty business.” Prompts, examples, source-readiness checks, FAQ answers, recommendations, and partner enablement must be specific to dental clinics.

**[HYPOTHESIS]** Single-location dental-clinic owners or marketing leads will understand and act on the audit more readily than a blended dental-and-aesthetic segment.

**[OPEN]** Which one of Jakarta, Bandung, or Surabaya should be the first city. Resolve this before the first public cohort; any feasibility outreach must remain city-specific and results must not be pooled to hide weak fit.

### 4.2 Expansion rule

Aesthetic clinics may be tested only after the dental report has a stable prompt pack, repeatable QA, and evidence of customer usefulness. Expansion requires a separate landing-page variant, examples, prompt pack, regulated-claims review, and cohort reporting. Changing a noun in dental copy is not a vertical launch.

**[OPEN]** Exact gate and sample size for the aesthetic-clinic experiment; define in [`EXPERIMENTS_AND_GATES.md`](./EXPERIMENTS_AND_GATES.md).

## 5. Acquisition sequence

### 5.1 Founder-assisted first cohort

Founder-assisted acquisition is a research and sales channel, not a workaround to conceal an unfinished product.

Use:

- direct introductions and personal referrals;
- respectful, individualized outreach to clinic owners or marketing leads;
- relevant owner or healthcare-business communities where promotion is permitted;
- agency, freelancer, web-studio, local-SEO, and clinic-marketing partners;
- short live or recorded walkthroughs using a permissioned sample;
- follow-up with prospects who explicitly invite it.

Do not use:

- bulk unsolicited WhatsApp or email blasts;
- scraped personal phone lists;
- a fabricated “we already audited your clinic” opener;
- pressure based on an unverified competitor claim;
- a free bespoke audit that undermines the paid product and distorts fulfillment cost.

Every founder-led interaction should capture the prospect's actual language for:

- perceived problem and urgency;
- “why not ask ChatGPT myself?” objection;
- trust and methodology concerns;
- expected output and desired action;
- who would implement changes;
- price objection or purchase trigger;
- reason for declining or delaying.

Store concise structured notes with consent and access controls. Do not turn private conversation details into marketing copy without permission.

### 5.2 Partner channel

Partners are valuable when they already help clinics change websites, Google Business Profiles, directories, content, or positioning. Nuave should complement their work without implying that the report proves the partner caused an AI outcome.

Partner enablement should include:

- a one-page explanation of the sampled methodology;
- one permissioned sample report;
- fit and eligibility checklist;
- approved claim and objection guidance;
- referral attribution method;
- delivery and support boundaries;
- disclosure of any incentive or commercial relationship where required.

**[HYPOTHESIS]** Small agencies and freelancers can lower trust friction and improve action completion because they can implement recommendations.

**[OPEN]** Referral fee, customer discount, payout timing, tax treatment, and whether partners may purchase on behalf of a clinic.

**[EXPERIMENT]** Compare partner-referred and founder-direct cohorts on paid conversion, usefulness, action selection, completion, support minutes, refund rate, and contribution—not lead count alone.

### 5.3 Organic content architecture

Organic content should build category understanding and evidence, then route readers to the relevant city/vertical proof page. Use four content pillars:

1. **Discovery behavior:** how people may use AI to research dental clinics, with appropriately qualified language.
2. **Observed examples:** dated, permissioned or anonymized findings from real audits or explicitly labeled market observations.
3. **Source readiness:** practical website, Google Business Profile, directory, service-description, and factual-consistency checks.
4. **Method and trust:** how sampling, identity resolution, variability, evidence, limitations, privacy, and re-audits work.

Suitable formats include:

- permissioned clinic case studies;
- “how AI answers this customer question” explainers;
- city-level market observations with platform and date;
- source-readiness checklists;
- examples of inconsistent public business information;
- implementation stories showing an action and its completion check;
- methodology and FAQ pages.

Every evidence-led article must identify whether its data is live, cached, sampled, anonymized, customer-supplied, or illustrative. An observation from one audit cannot be generalized to all clinics in a city.

### 5.4 Later paid acquisition

Cold paid acquisition may begin after the first cohort demonstrates useful reports, reliable delivery, and acceptable manual effort. Start with bounded proof-led tests, retargeting where consent and platform rules permit, and city-specific creative.

Paid creative must:

- address clinic owners or marketers as business operators;
- avoid implying that the viewer has a health condition or that Nuave knows patient information;
- avoid diagnosis, treatment-result, or unsupported superiority claims;
- use real, dated, permissioned, anonymized, or clearly illustrative proof;
- state a sampled observation as a sample;
- lead to a page with the same vertical, city, question, offer, and evidence standard;
- preserve campaign and creative attribution through payment and report delivery.

Do not scale spend based on click-through rate, cheap traffic, or gross revenue alone. Scaling requires paid-order conversion plus delivery, refund, support, manual-QA, and contribution evidence.

## 6. Acquisition message families

Use three message families. They are hypotheses to test, not simultaneous promises to stack into one headline.

| Family | Customer question | Safe message pattern | Proof required | Natural CTA |
|---|---|---|---|---|
| Competitive discovery | “When people ask AI for a dental clinic in my city, which clinics appear?” | “See which clinics appeared across a defined sample of AI-assisted searches—and where yours did not.” | Dated platform/prompt observation and sample limitations | “Check whether your clinic is eligible” |
| Accuracy | “Do AI systems describe my clinic, services, and location correctly?” | “Find inconsistent or unsupported descriptions in the tested responses and public sources.” | Traceable response plus authoritative clinic source | “Confirm your clinic” |
| Controllability | “What public information can I improve first?” | “Prioritize the website, Maps, and public-information gaps you can address.” | Evidence-linked example recommendation with completion check | “See the sample action plan” |

Prohibited transformations:

- “did not appear in this sample” must not become “invisible to AI”;
- “competitor appeared” must not become “competitor is taking your patients”;
- “source gap may contribute” must not become “this is why ChatGPT excluded you”;
- “directional action” must not become “guaranteed ranking improvement”;
- “API or standardized search surface” must not become “exactly what every patient sees.”

## 7. Message-match contract

Every acquisition link should carry a message contract containing:

- vertical;
- city or geographic scope;
- message family;
- customer question or intent;
- proof shown or referenced;
- offer and displayed price;
- CTA expectation;
- campaign and creative identifiers where applicable.

The destination page must preserve that contract above the fold. For example, a Bandung competitive-discovery ad should open a dental-clinic Bandung page using the same customer question and a Bandung-appropriate dated observation—not a generic “AI is the future” homepage.

Changing the promise after the click is a funnel defect even when conversion rises.

## 8. Landing-page and content-page strategy

### 8.1 Page model

Use a small number of substantive pages:

- one canonical dental-clinic product page;
- a city-specific page only when Nuave has genuine city-specific proof, operational support, and differentiated copy;
- message-family landing variants for controlled campaigns;
- methodology, privacy, terms/refund, sample report, and FAQ pages;
- evidence-rich articles and case studies.

Do not programmatically generate combinations of city, neighborhood, treatment, and clinic type. A city page is justified only when it adds real local evidence or operational information. Pages with swapped place names and identical claims should not be published or indexed.

**[SETTLED]** A visitor may enter through any evidence page, but all purchase paths converge on the same eligibility, offer, and checkout rules.

### 8.2 Exact landing-page sequence

The initial conversion page should use this order:

1. **Problem-led hero and clinic lookup.** Name the vertical, city context where known, sampled nature of the product, price, and primary action without jargon.
2. **One real, dated market observation.** Show platform/surface, question, date, location/language context, and limitation. If no relevant observation exists, omit it rather than fabricate proof.
3. **What Nuave tests and does not claim.** Explain the defined prompts and AI surfaces in plain language; state that results are sampled and not a permanent ranking.
4. **Permissioned sample report.** Show real or clearly illustrative evidence, platform differences, findings, and action format. Label every sample accurately.
5. **Three example actions.** Include low-, medium-, and higher-effort examples, each with evidence, owner, effort, caveat, and completion check.
6. **Process and service promise.** Identity confirmation, payment, brief, audit, manual QA where needed, expected delivery window, progress communication, and failure remedy.
7. **Single offer and checkout CTA.** Founding Cohort Full Audit at Rp149,000, with inclusions, exclusions, total price treatment, and no subscription.
8. **Objection-focused FAQ.** Address casual ChatGPT use, variability, guarantees, relationship to SEO/Google Business Profile work, implementation, data use, and unsupported clinics.
9. **Trust and policy footer.** Link methodology, privacy, terms, refund/failure policy, clinic-advertising disclaimer, business identity, and contact route.

The page should work on mobile first. The CTA may repeat after major proof sections, but it must always initiate clinic lookup/confirmation rather than bypass eligibility.

### 8.3 Preview policy

**[SETTLED]** Do not build an interactive pseudo-personalized Preview for the first cohort.

Use:

- a permissioned sample report;
- clearly labeled illustrative report sections where real examples cannot be shared;
- real dated category/city observations when Nuave has the right to publish them;
- a clinic identity lookup that does not imply the audit has started.

The lookup may display known public identity fields so the buyer can confirm the correct clinic. It must not display a personalized score, competitor gap, or “analysis in progress” unless a real personalized process has run and its status is truthful.

**[OPEN]** Whether a later cached city/category explorer materially improves qualified conversion. If tested, freshness, provenance, fallback, and non-personalization must be visible.

## 9. Clinic identity and eligibility before checkout

Wrong-entity audits create misleading findings, support burden, and refunds. Identity confirmation is part of conversion quality.

### 9.1 Required identity inputs

Before creating a payable checkout, resolve and ask the buyer to confirm:

- exact public clinic name;
- one physical location and full address;
- city;
- Google Maps/Business Profile listing or stable place identifier;
- official website, or an authoritative official social profile when no website exists;
- public phone number where available for disambiguation;
- buyer delivery email;
- optional WhatsApp number only with a clear service-message purpose and consent;
- explicit confirmation: “Yes, this is the clinic and location I want audited.”

Do not infer the chosen branch from the buyer's GPS, ad city, IP address, or nearest search result.

### 9.2 Eligibility checks

The launch flow should verify:

- category is supported by the current dental-clinic methodology;
- location is in a supported city;
- exactly one branch is selected;
- identity is sufficiently unambiguous;
- enough public information exists to fulfill the promised audit;
- the requester can provide or identify an authoritative clinic source;
- the order does not require patient data or clinical interpretation.

The eligibility check is not a free audit and must not claim personalized visibility findings.

### 9.3 Ineligible or ambiguous outcomes

Route the buyer to one of four transparent outcomes:

1. **Eligible:** identity confirmed; continue to offer and checkout.
2. **Clarification needed:** ask for a Maps URL, website, address, or branch choice; do not accept payment yet.
3. **Waitlist/unsupported:** explain the unsupported city, vertical, franchise, or multi-location constraint and optionally collect explicit waitlist consent.
4. **Insufficient public data:** explain why the normal audit may not be fulfillable; do not sell a normal audit unless a separately specified readiness product exists.

**[OPEN]** Whether clinics without a website but with a robust Google Business Profile and authoritative social profile qualify.

**[OPEN]** Whether a buyer must attest that they own, work for, or are authorized by the clinic. The legal and operational rule belongs in [`COMPLIANCE_AND_DATA.md`](./COMPLIANCE_AND_DATA.md).

## 10. Offer and checkout

### 10.1 Public founding offer

The offer is:

> **Founding Cohort Full Audit — Rp149,000**

The offer display must state:

- one clinic and one confirmed location;
- AI surfaces included, using the exact names and qualifications from [`MEASUREMENT_SPEC.md`](./MEASUREMENT_SPEC.md);
- audit date, language, city context, prompt/sample scope, and known limitations;
- evidence-led findings and prioritized actions;
- mobile web report and downloadable PDF generated from the same reviewed report;
- estimated delivery window;
- manual review may occur during the founding cohort;
- no subscription and no guarantee of recommendation or improvement;
- total payable amount and any applicable taxes/fees;
- remedy for failure, partial coverage, or inability to fulfill, linked to the runbook/policy.

“Founding Cohort” may be used only while it describes a genuine validation cohort with a real end condition. Do not invent limited seats. If capacity is constrained, show a truthful next available delivery window.

**[OPEN]** Whether Rp149,000 includes tax and which Midtrans payment methods are enabled.

**[OPEN]** Exact delivery promise; it must follow measured fulfillment capability, not a marketing preference.

### 10.2 Midtrans checkout

Checkout should minimize re-entry. Carry the confirmed clinic identity and display it in the order summary. Ask the buyer to verify:

- clinic and branch;
- delivery email;
- total amount;
- report inclusions;
- delivery estimate;
- required service terms and privacy acknowledgement;
- optional, separate follow-up/marketing preferences.

Payment states must be truthful and idempotent:

- initiated;
- pending;
- paid/settled;
- failed/expired/cancelled;
- challenged/refunded as applicable.

Audit work begins only from a verified paid/settled event. Browser redirects are not proof of payment. Detailed webhook and recovery behavior belongs in [`TECHNICAL_ARCHITECTURE.md`](./TECHNICAL_ARCHITECTURE.md) and [`OPERATIONS_RUNBOOK.md`](./OPERATIONS_RUNBOOK.md).

Abandoned checkout follow-up requires an appropriate service basis or explicit consent. Do not automatically add a checkout starter to a marketing list.

## 11. Post-payment brief

After confirmed payment, collect a brief that should take approximately two minutes. Payment success and receipt must not depend on completing optional context.

### 11.1 Required and optional fields

Required:

- confirm the clinic and branch again;
- choose a primary business contact for clarification;
- acknowledge that no patient data should be submitted.

Optional and visibly labeled:

- priority services the clinic wants accurately represented;
- target customer or service area in business terms, not patient health records;
- official description, differentiators, or proof sources;
- known competitors for context, clearly distinguished from audited competitors;
- recent public-information changes that may affect interpretation;
- current website/GBP/content implementation owner;
- preferred delivery/service channel where consented.

Customer-supplied claims are inputs, not automatically verified facts. The report must label their source and avoid amplifying unsupported treatment or outcome claims.

### 11.2 Brief completion behavior

- **[SETTLED]** The audit can proceed when optional fields are skipped.
- **[SETTLED]** A secure resume link may be sent for incomplete optional context.
- **[SETTLED]** Missing optional answers must not be replaced with invented information.
- **[OPEN]** Cutoff after which late brief changes require manual handling or a new audit run.

## 12. Progress and delivery experience

The customer should not need a dashboard to understand status.

Minimum service communications:

1. **Payment confirmation:** receipt, confirmed clinic, expected delivery window, brief link, support contact, and order reference.
2. **Clarification request, when necessary:** exact missing item, response route, effect on delivery timing, and fallback if unanswered.
3. **Delay or partial-coverage notice:** what failed, what is being retried or reviewed, revised timing, and remedy options.
4. **Report delivery:** secure link, report scope, first recommended action, access/recovery guidance, and support route.

Avoid a fake granular progress bar. Show only states supported by actual workflow events, such as payment confirmed, information received, audit in progress, QA review, and ready.

Detailed status transitions, retry behavior, and service-level escalation belong in the architecture and operations documents.

## 13. Report access and action commitment

### 13.1 No-account access

**[SETTLED]** Customers access the report without creating an account.

The access model must support:

- an opaque, high-entropy order-linked token;
- token revocation and rotation;
- email OTP or magic-link recovery;
- an access-expiry or retention rule disclosed before purchase;
- PDF download if included in the offer;
- protection against order enumeration and token leakage in analytics or logs;
- deletion or access-removal requests according to [`COMPLIANCE_AND_DATA.md`](./COMPLIANCE_AND_DATA.md).

Do not place the raw access token in analytics properties, support screenshots, ad-platform events, or referrer URLs.

### 13.2 Action commitment

The report should end its core reading path with three prioritized actions and ask the customer to choose one to start. Selection is lightweight and does not create a dashboard.

Capture:

- recommendation ID and version;
- selected action;
- intended implementer: owner, staff, freelancer, agency, developer, or other;
- optional target date;
- whether implementation help is needed;
- timestamp and report version.

The customer may skip selection. Do not block report access or manufacture a commitment.

The completion check must be concrete: for example, a public URL, corrected field, live page, or screenshot. Completion indicates the action was performed; it does not prove that the action caused a later visibility change.

## 14. Aftersales cadence

Lifecycle messages should be event-aware, useful, and sent only through permitted channels. Avoid sending every message when the customer has already responded or completed the next step.

| Timing | Purpose | Core content | Primary event/response |
|---|---|---|---|
| Delivery | Get the customer to the result and first action | Secure report link, tested scope, top three actions, support/recovery path | `report_delivered`, `report_opened` |
| Day 2 | Catch confusion or material inaccuracies early | Ask whether anything is unclear or appears factually wrong; route disputes to review | usefulness/accuracy response, support case |
| Day 7 | Turn reading into a commitment | Ask which action they chose; link directly to the action section | `action_selected` or reason blocked |
| Day 21–30 | Verify implementation, not outcome | Ask whether the action was completed; accept URL/screenshot; offer bounded clarification | `action_completed`, evidence submitted |
| Day 45–75 | Offer a comparable re-audit when enough implementation time has passed | Explain comparable subset, what may or may not be learned, current price and eligibility | `reaudit_offer_viewed`, purchase |
| Day 90 | Final introductory reminder, only if a real policy exists | State the genuine re-audit eligibility or price deadline without fake urgency | reminder response, opt-out, purchase |

### 14.1 Delivery message

The delivery message should lead with the result being ready, not promotional copy. It should identify the clinic, audit date, secure access method, and one recommended starting action. It must not expose sensitive tokens in channels where link previews, forwarding, or shared devices create unacceptable risk.

### 14.2 Day 2 review

Ask two short questions:

1. “Was anything unclear?”
2. “Did anything look factually wrong about your clinic?”

Negative feedback pauses testimonial and referral requests and routes the case to support. A disputed finding is not automatically deleted; it is reviewed against evidence and corrected transparently where appropriate.

### 14.3 Day 7 action selection

If no action is selected, ask about the blocker rather than repeating the full report. Useful blocker categories include unclear, not a priority, no access, no implementer, too difficult, too costly, and does not agree.

### 14.4 Day 21–30 completion check

Ask whether the selected action is complete and request only the evidence needed to verify implementation. Never ask for patient data. If the action remains blocked, provide bounded clarification or point to an implementer category; do not silently become an agency.

### 14.5 Day 45–90 re-audit offer

Send a re-audit offer only when:

- the customer consented to the relevant channel/purpose;
- the original report remains eligible for a comparable audit;
- the re-audit method and price are defined;
- the message explains that changed results are not guaranteed;
- the timing is based on a real policy, not invented urgency.

**[OPEN]** Exact re-audit price and whether the founding cohort receives a genuine time-limited introductory rate.

## 15. Support boundaries

Launch support should cover:

- payment and receipt issues;
- clinic identity correction before the audit begins;
- report access and token recovery;
- explanation of methodology, evidence, and recommendation wording;
- correction review for a material factual or identity error;
- fulfillment failure, partial report, refund, or remedy handling;
- one bounded clarification about how to verify a selected action.

Support does not include:

- executing website, Google Business Profile, directory, or content changes;
- guaranteeing a provider will cite or recommend the clinic;
- clinical, legal, advertising, or SEO advice beyond the report's stated scope;
- unlimited consulting or recurring account management;
- interpreting or processing patient information.

During the founding cohort, an optional short explanation call may be offered consistently or as a recorded experiment. Log its duration and reason. Do not hide it from unit economics.

**[OPEN]** Included support window, channel, response-time target, and whether the explanation call is part of every founding order.

## 16. Referral journey

Request a referral only after a positive value signal, such as:

- the customer rates a finding useful and credible;
- an action is selected or completed;
- a support issue is satisfactorily resolved;
- the customer voluntarily expresses satisfaction.

Do not ask for a testimonial or referral while a dispute, correction, failed delivery, or refund is unresolved.

Referral messages should:

- make no promise about the referred clinic's result;
- use a trackable code or link that contains no report token or private finding;
- disclose incentives where applicable;
- let the referrer share a neutral description rather than a fabricated endorsement;
- request separate permission before turning feedback into public copy.

**[OPEN]** Referral incentive, fraud controls, payout/credit form, and eligibility.

## 17. Re-audit journey

A re-audit is valuable only when it permits a fair comparison. It is not merely another newly generated report.

Before offering or accepting payment, confirm:

- same clinic identity and branch;
- material business changes since the prior audit;
- eligible time window;
- comparable prompt subset, language, location, provider surface, and methodology version;
- known provider or methodology changes that limit comparison;
- actions the customer reports completing, with evidence where available.

The re-audit should show:

- unchanged comparable observations;
- changed observations without claiming causality;
- non-comparable or newly added tests in a separate section;
- provider/method changes and limitations;
- whether previously reported identity or accuracy issues persist;
- next action, if evidence supports one.

Use “change observed after action” rather than “change caused by action” unless an adequate causal design exists.

**[SETTLED]** If the comparable subset is too small or a provider changed materially, disclose that constraint before purchase or offer a different product/remedy.

**[OPEN]** Minimum comparable coverage, default re-audit timing, price, and treatment of customers who made no changes.

## 18. Attribution and journey instrumentation

Instrumentation should connect acquisition context to paid value and action without exposing report tokens or collecting unnecessary personal data.

### 18.1 Attribution fields

Capture, when available and permitted:

- anonymous visitor/session ID;
- first-touch and last-touch timestamp;
- source, medium, campaign, content, and term;
- platform campaign, ad set/ad group, and creative IDs;
- click IDs only when there is a defined compliant use and retention policy;
- landing-page variant and message family;
- content slug or referral/partner code;
- vertical and city context;
- offer and price version;
- consent state and source;
- clinic/order ID only in first-party systems, with pseudonymous analytics linkage;
- experiment assignments and version;
- device class and locale where useful and proportionate.

First-touch and last-touch are reporting lenses, not proof that one touch caused the purchase. Keep personally identifying contact data separate from ad-platform and product analytics wherever practical.

### 18.2 Canonical events

Use stable names and versioned schemas. Minimum events:

| Event | When emitted | Required properties |
|---|---|---|
| `landing_viewed` | Qualified page render | page/variant, vertical, city, message family, attribution IDs |
| `proof_viewed` | Meaningful sample/observation view | proof ID/type/version, dwell or explicit open |
| `clinic_lookup_started` | Lookup interaction begins | page/variant, city context |
| `clinic_candidate_selected` | Public clinic candidate chosen | pseudonymous clinic candidate ID, source, city |
| `clinic_identity_confirmed` | Buyer confirms exact branch | clinic ID, branch/place ID, eligibility version |
| `eligibility_resolved` | Eligibility decision completes | eligible/status, reason code, rules version |
| `offer_viewed` | Eligible buyer sees complete offer | offer ID, price, inclusions version |
| `checkout_started` | Midtrans transaction is created | order ID, offer/price version, attribution snapshot |
| `payment_settled` | Verified payment event | order ID, amount, method category, timestamp |
| `brief_submitted` | Required brief step completes | order ID, completion status; no free text in analytics |
| `audit_status_changed` | Durable internal state changes | order/audit ID, from/to state, reason code |
| `report_delivered` | Delivery communication succeeds | order/report version, channel category |
| `report_opened` | Valid first report access | order/report version, anonymous access session |
| `finding_feedback_submitted` | Customer rates or disputes a finding | finding ID/version, usefulness, credibility, reason code |
| `action_selected` | Customer chooses a recommendation | recommendation ID/version, implementer category |
| `action_completed` | Customer reports/verifies completion | recommendation ID/version, verification type/status |
| `support_case_opened` | Support/review begins | order ID, category, severity |
| `refund_resolved` | Refund/remedy concludes | order ID, reason, outcome, amount category |
| `referral_created` | Customer creates a referral | referral ID, source order/cohort, incentive version |
| `reaudit_offer_viewed` | Eligible customer sees offer | original audit ID, comparability status, offer version |
| `reaudit_purchased` | Verified re-audit payment | original/new audit IDs, offer version |
| `consent_changed` | Customer changes a communication permission | purpose, channel, old/new state, timestamp, source |

Do not send raw responses, report text, clinic contact details, free-text brief answers, payment secrets, or report-access tokens to generic analytics tools.

### 18.3 Funnel views

Report at least:

- first touch → eligible clinic;
- eligible clinic → checkout;
- checkout → settled payment;
- settled payment → full/partial/refunded outcome;
- delivery → report open;
- report open → useful/credible finding;
- report open → action selected;
- action selected → action completed;
- satisfied customer → referral;
- eligible audit → re-audit purchase.

Slice results by cohort, vertical, city, channel, partner, message family, page variant, offer version, and fulfillment outcome. Do not publish percentages from tiny samples without denominators.

## 19. Consent and communication rules

Service communication and marketing/re-audit communication must have distinct purposes and records.

- **[SETTLED]** Email may be required for receipt, clarification, delivery, access recovery, and other transactional service messages.
- **[SETTLED]** WhatsApp is optional and requires a clear purpose and consent before use.
- **[SETTLED]** Marketing, referral promotion, partner promotion, and re-audit reminders must not be bundled into a required purchase checkbox.
- **[SETTLED]** Consent records include purpose, channel, wording/version, timestamp, source, and withdrawal state.
- **[SETTLED]** Opt-out must be honored across the relevant purpose and channel without removing access to a paid report.
- **[SETTLED]** A customer may receive necessary service messages even when they decline marketing, as defined by applicable policy and law.
- **[OPEN]** Exact lawful basis, retention period, WhatsApp provider/template rules, and re-consent requirements; resolve in [`COMPLIANCE_AND_DATA.md`](./COMPLIANCE_AND_DATA.md).

## 20. Funnel experiments and metrics

The first cohort optimizes for evidence of value and action, not traffic volume.

### 20.1 Primary learning metrics

Track:

- percentage of contacted qualified prospects who agree to a serious product conversation;
- eligible-prospect-to-paid conversion, with denominator and acquisition mode;
- checkout completion and payment failure by method;
- full, partial, delayed, and refunded fulfillment rate;
- time from payment to delivery;
- report-open rate;
- percentage reporting at least one credible, non-obvious, useful finding;
- action-selection rate within seven days;
- verified/reported action-completion rate within 30 days;
- referral permission and completed referral rate;
- re-audit interest and purchase rate;
- support and manual-QA minutes per order;
- contribution before and after acquisition.

### 20.2 Guardrails

Every conversion experiment must also monitor:

- identity mismatch rate;
- ineligible checkout attempts;
- confusion about personalization or guarantees;
- material finding disputes;
- unsubscribe/complaint rate by channel;
- failed, partial, delayed, refund, and chargeback rates;
- manual labor and support load;
- prohibited-claim or compliance incidents.

An experiment that raises payment conversion by misleading buyers or increasing unresolved disputes fails.

### 20.3 Initial experiment queue

| ID | Hypothesis | Test | Primary metric | Guardrails |
|---|---|---|---|---|
| FUN-001 | Competitive-discovery language creates more qualified urgency than generic AI-visibility language | Founder outreach scripts or landing variants | Eligible-prospect-to-paid conversion plus objection quality | Guarantee confusion, dispute rate |
| FUN-002 | A permissioned sample report creates sufficient trust without an interactive Preview | Sample-view path versus concise proof path | Proof-view-to-eligible-checkout | Personalization confusion, page completion |
| FUN-003 | Identity confirmation before checkout reduces fulfillment and refund problems without unacceptable abandonment | Observe lookup-to-checkout funnel and reasons | Identity-mismatch and refund rates | Eligible drop-off, support burden |
| FUN-004 | Partner-referred customers act on more recommendations | Partner cohort versus founder-direct cohort | Action selection/completion | CAC/incentive, refund, manual minutes |
| FUN-005 | Asking for one action commitment improves follow-through | Action-selection prompt versus report-only baseline when ethically and operationally practical | 30-day action completion | Customer annoyance, support burden |
| FUN-006 | A timely comparable re-audit offer has demand after implementation | Eligible customers at defined timing | Re-audit purchase | Opt-out, confusion, non-comparability |

Sample sizes, pass thresholds, stop rules, and final decisions belong in [`EXPERIMENTS_AND_GATES.md`](./EXPERIMENTS_AND_GATES.md). Do not invent statistical confidence from the founding cohort.

## 21. Funnel failure and recovery paths

The journey must remain coherent when the happy path breaks.

| Failure | Customer-facing behavior | Destination |
|---|---|---|
| Clinic cannot be resolved | Ask for exact Maps listing, address, or authoritative URL before payment | Clarification or waitlist |
| Unsupported city/vertical/branch model | Explain boundary; optionally collect separate waitlist consent | No checkout |
| Payment pending or expired | Show verified state and a safe retry/new-payment path | Checkout recovery |
| Payment settled but redirect fails | Send transactional confirmation based on verified webhook | Brief/status link |
| Brief incomplete | Proceed with required minimum; invite optional completion before cutoff | Audit queue |
| Audit needs clarification | Ask one precise question and explain timing impact | Paused/manual review |
| Provider or report failure | Communicate actual status, retry/review, revised timing, and available remedy | Full/partial/refund path |
| Report token lost or exposed | Verify via recovery channel, rotate/revoke token | Recovered report |
| Material finding disputed | Pause referral asks; open evidence review; correct/version if warranted | Support resolution |
| Customer opts out | Stop affected optional communication without removing paid access | Updated consent state |

Specific service levels, refund rules, and operator procedures are governed by [`OPERATIONS_RUNBOOK.md`](./OPERATIONS_RUNBOOK.md).

## 22. Acceptance criteria for the launch journey

The funnel and lifecycle are ready for the first paid cohort only when:

- a channel-specific link preserves vertical, city, message, proof, offer, and attribution through the landing experience;
- the page contains real or clearly labeled proof and no deceptive personalized Preview;
- the buyer confirms the exact clinic and branch before checkout;
- ineligible and ambiguous clinics cannot accidentally purchase the normal audit;
- one public offer is displayed consistently at Rp149,000 with no hidden subscription;
- the Midtrans state shown to the customer matches verified payment state;
- optional brief fields can be skipped without blocking receipt or inventing context;
- actual audit progress, delay, clarification, and delivery communications work without a dashboard;
- a customer can recover report access and an operator can rotate or revoke a token;
- the report offers a voluntary one-action commitment with a concrete completion check;
- service and optional marketing/re-audit consent are stored separately;
- all canonical events carry their required versions and no access token or sensitive free text leaks to analytics;
- Day 2, Day 7, Day 21–30, and re-audit follow-ups respect consent, customer state, and unresolved support cases;
- refund, dispute, and partial-delivery customers are excluded from promotional/referral prompts until resolved;
- cohort metrics can be reported with denominators by source, city, message family, and fulfillment outcome;
- founder and manual-review time is captured in unit economics.

## 23. Open-question register

Resolve before accepting paid orders:

1. Which single city will host the first public cohort?
2. What exact public-data minimum makes a dental clinic eligible?
3. Must the buyer attest authorization to order an audit?
4. What exact delivery window can be promised from observed pilot performance?
5. Is tax included in Rp149,000, and which Midtrans methods are enabled?
6. What report retention/access period is disclosed at checkout?
7. What support window, channel, and response target are included?
8. Which optional communications may use WhatsApp, under what consent and template rules?
9. What constitutes sufficient consent to publish an anonymized or permissioned example?
10. What are the partial-report and refund remedies shown before payment?

Resolve with founding-cohort evidence:

1. Which acquisition message family produces qualified buyers and useful reports?
2. Does a city-specific page outperform the canonical dental page for the right reason?
3. Does a permissioned sample report provide enough proof without an interactive Preview?
4. Which founder or partner channel produces acceptable contribution after support?
5. Who actually implements clinic recommendations, and what blocks completion?
6. Does action commitment improve completion or only increase follow-up burden?
7. When do customers want a re-audit, and what price is sustainable?
8. Do aesthetic clinics warrant a distinct second wedge?

Defer until earlier validation gates pass:

1. Cold-ad scaling and automated budget rules.
2. Programmatic city or service pages.
3. Public downsells or multi-tier pricing.
4. Personalized pre-payment scans.
5. Accounts, dashboards, subscriptions, or continuous monitoring.
6. Nationwide or all-category expansion.

## 24. Definition of lifecycle success

The v2 lifecycle is working when a qualified dental-clinic buyer can move from a truthful, message-matched first touch to a correctly identified clinic; understand one offer; pay without an account; receive a traceable, manually reviewed report; choose and complete a realistic action; and later receive a methodologically comparable re-audit offer—without deceptive proof, unsupported claims, hidden consulting labor, or unwanted communication.

Traffic, form starts, report length, and gross revenue are secondary until this end-to-end behavior is supported by evidence.
