# Nuave v2 Compliance and Data Policy

> **Purpose:** Establish launch guardrails for clinic-related claims, acquisition, customer and public data, model-provider use, report access, retention, corrections, and legal review.
>
> **Authority:** Governs compliance-sensitive and data-handling decisions for Nuave v2. The newest founder-approved entry in [DECISION_LOG.md](./DECISION_LOG.md) takes precedence; product intent is governed by [FOUNDATION.md](./FOUNDATION.md), while operational execution is governed by [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md). Where requirements conflict, choose the safer reversible behavior and escalate for founder and qualified legal review.
>
> **Status:** Internal working policy, not legal advice. Every statement about applicable law, regulatory obligation, required notice, consent, healthcare advertising, consumer protection, taxes, or retention is **[OPEN] until reviewed by qualified Indonesian counsel**. This document sets product-risk guardrails that can be adopted before that review; it does not determine legal compliance.
>
> **Related:** [MVP_SPEC.md](./MVP_SPEC.md) · [MEASUREMENT_SPEC.md](./MEASUREMENT_SPEC.md) · [FUNNEL_AND_LIFECYCLE.md](./FUNNEL_AND_LIFECYCLE.md) · [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) · [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md) · [DECISION_LOG.md](./DECISION_LOG.md)

## 1. Scope and operating posture

Nuave audits the public information environment of a business. It does not provide medical advice, assess patient care, determine treatment suitability, verify clinical efficacy, or operate as a patient-data system.

- **[SETTLED product guardrail]** Launch with dental clinics only unless [FOUNDATION.md](./FOUNDATION.md) is explicitly amended.
- **[SETTLED product guardrail]** The customer is a clinic owner, operator, or marketer acting in a business capacity; the product is not marketed to patients.
- **[SETTLED product guardrail]** Nuave must not request, collect, infer, analyze, or reproduce patient health data.
- **[SETTLED product guardrail]** Nuave reports sampled observations and evidence-backed inferences. It does not certify a clinic, treatment, practitioner, advertisement, or public claim as lawful, medically accurate, safe, or effective.
- **[SETTLED product guardrail]** Generated wording is never a substitute for the clinic’s clinical, professional, or legal review.
- **[OPEN — legal]** Determine the laws, regulations, professional rules, platform policies, and contractual obligations that apply to Nuave, its clinic customers, its ads, its recommendations, and its data processing in Indonesia.

## 2. Data classification

| Class | Examples | Launch treatment |
|---|---|---|
| Public business data | Clinic name, business address, public phone, website, services page, public social/profile content, public directory listing | Collect only what the audit needs; store provenance and observation date; public availability does not remove accuracy, privacy, copyright, or retention concerns |
| Customer-supplied business data | Confirmed listing, official website, service priorities, USP, target audience, named competitors | Use for the purchased audit; label as customer-supplied; do not present unverified claims as fact |
| Customer contact/accounting data | Name, role, business email, opted-in WhatsApp, order ID, payment status, invoice/refund data | Restrict access; separate from public evidence; do not send to model providers unless strictly required—which it should not be |
| Audit evidence | Prompts, raw provider outputs, source links/snippets, timestamps, model/surface metadata, extracted observations | Preserve traceability; minimize copied source content; restrict to order and QA purposes under the retention policy |
| Derived Nuave data | Findings, confidence, inferences, recommendations, report versions, QA notes | Version and trace to evidence; do not use as universal facts or cross-customer benchmarks without an approved basis |
| Sensitive or prohibited data | Patient names, appointments, diagnoses, symptoms, records, treatment photographs tied to a person, identity documents, payment credentials, private messages | Do not request or intentionally process; quarantine and escalate if received |
| Security data | Access tokens, API keys, webhook secrets, recovery credentials | Never expose to clients, analytics, model prompts, reports, support transcripts, or ordinary logs |

### 2.1 No patient data

Every intake and support surface must state, in appropriate language: do not submit patient names, contact details, medical information, clinical images, appointment records, or private patient communications.

If patient or other sensitive personal data is received:

1. stop processing it and do not paste it into another tool or model;
2. restrict access and record an incident without duplicating the content;
3. determine whether safe deletion is possible while preserving a minimal incident record;
4. tell the sender not to provide further patient data; and
5. escalate under [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md).

Deletion, notification, preservation, and regulatory duties are **[OPEN pending legal review]**.

## 3. Clinic advertising and medical-claims guardrails

### 3.1 Prohibited Nuave behavior

Nuave must not:

- recommend or draft claims that a treatment is guaranteed, risk-free, universally suitable, permanent, painless, medically superior, or certain to produce a result;
- invent or embellish credentials, licenses, awards, affiliations, patient counts, success rates, prices, discounts, availability, equipment, treatment outcomes, or practitioner expertise;
- infer clinical quality from AI visibility, review volume, website completeness, popularity, or model recommendation;
- advise a clinic to hide material limitations, risks, eligibility conditions, or uncertainty;
- create fake testimonials, reviews, patient stories, ratings, before/after evidence, scarcity, endorsements, or competitor comparisons;
- reuse patient images, reviews, or stories outside their demonstrated permitted context;
- recommend bidding on, impersonating, or misleadingly comparing a competitor or practitioner;
- label Nuave observations as medical, legal, regulatory, or professional approval; or
- include patient-level content found incidentally in public sources when it is unnecessary to the business audit.

### 3.2 High-risk recommendation topics

Any finding or proposed copy involving the following requires manual review and should normally be excluded from launch-ready copy generation:

- treatment safety, efficacy, outcomes, suitability, contraindications, pain, recovery, or permanence;
- professional registration, specialization, certification, or institutional affiliation;
- before/after material, testimonials, reviews, endorsements, or patient volume;
- medical devices, pharmaceuticals, sedation, anesthesia, or diagnostic claims;
- price, discount, financing, limited availability, or “free” treatment claims;
- “best,” “number one,” “most trusted,” “safest,” or other comparative superiority;
- claims about a named competitor’s quality, legality, ethics, safety, or outcomes; and
- content that could reasonably influence a patient’s care decision rather than describe public business information.

The safe launch output is usually a task, not publish-ready clinical copy. Example: “Ask the clinic’s qualified reviewer to clarify the public service description and eligibility information,” not a generated efficacy claim.

### 3.3 Evidence and customer responsibility

- Customer-supplied claims must be labeled as such until verified against an appropriate authoritative source.
- Nuave may flag a contradiction or missing source; it must not decide that a medical claim is substantively true.
- A clinic remains responsible for reviewing and approving its public content. This allocation must be reflected in reviewed terms but does not eliminate Nuave’s responsibility for its own output.
- **[OPEN — legal]** Establish which clinic advertising restrictions apply to each recommendation type and whether professional or regulatory review is required before publication.

## 4. B2B acquisition and proof

### 4.1 Audience and targeting

- Ads and outreach should address clinic businesses, owners, operators, and marketers—not infer that an individual has a dental condition or needs treatment.
- Do not use patient lists, health-interest inference, appointment data, treatment history, or sensitive audience traits for acquisition or retargeting.
- Keep targeting and creative aligned with current Meta, Google, WhatsApp, email, and other channel rules.
- Do not claim access to private ChatGPT, Gemini, search, patient, competitor, or platform data.
- Do not imply that Nuave can see what a specific patient asked or received.
- **[OPEN — legal/platform]** Review the exact audience, custom-audience basis, outreach method, opt-out, and ad creative before each channel launches.

### 4.2 Marketing claims

Acquisition materials must:

- identify results as dated, sampled observations on named API or standardized surfaces;
- avoid claiming exact equivalence with personalized consumer interfaces;
- distinguish a real category/city example from a personalized paid audit;
- use permissioned, anonymized, or appropriately aggregated customer examples;
- show controllable actions alongside gaps, without fearmongering;
- avoid guaranteed visibility, ranking, revenue, lead, or patient outcomes; and
- avoid fake urgency, fake scarcity, fake counters, fabricated demand, and deceptive personalization.

“Founding cohort,” limited capacity, delivery time, price anchor, and discount claims may be used only when factually current and operationally enforced.

### 4.3 Testimonials and case studies

- Obtain explicit, recorded permission for the exact name, logo, quote, findings, screenshots, and channels to be used.
- Do not treat report purchase or a support conversation as marketing consent.
- Offer a meaningful way to withdraw future use, subject to **[OPEN] legal and archival requirements**.
- Preserve the original context and do not edit a testimonial into a stronger result claim.
- Do not imply typicality from a single case. State dates, methodology changes, and material limitations.
- Never condition support, correction, or refund on permission to publish a testimonial.

## 5. Data minimization and model providers

### 5.1 Collection minimization

Collect only what is needed to:

1. resolve the clinic and eligibility;
2. take and reconcile payment;
3. run and QA the audit;
4. deliver, recover, correct, and support the report; and
5. send separately consented reminders or research requests.

Optional intake fields must be visibly optional and must not be repurposed silently.

### 5.2 Provider payload rules

Before any model, SERP, analytics, email, WhatsApp, error-monitoring, or storage provider receives data:

- define the minimum fields it needs;
- remove customer contact and payment data from prompts and audit payloads;
- use public business identifiers rather than internal access tokens or order secrets;
- exclude patient and sensitive personal data;
- avoid full-page or full-document copying when a source URL and necessary excerpt suffice;
- document provider, purpose, location/transfer considerations, retention controls, model-training settings, and deletion capability;
- ensure test and staging data is synthetic or intentionally sanitized; and
- prohibit staff from pasting production reports or support threads into unapproved AI tools.

### 5.3 Provider approval register

No provider may receive production data until this register is complete:

| Field | Required decision |
|---|---|
| Provider and service | Exact legal entity/service and purpose |
| Data sent | Field-level inventory and classification |
| Data returned | Outputs, metadata, source data, identifiers |
| Retention/training | Configured retention and whether data may train provider models |
| Hosting/transfers | Processing/storage locations and transfer mechanism |
| Access/security | Authentication, least privilege, encryption, incident contacts |
| Deletion/export | Available process and verified behavior |
| Contract/legal basis | **[OPEN pending legal review]** |
| Owner and review date | Named internal owner and next review |

Provider abstraction does not by itself solve privacy or compliance obligations.

## 6. Consent and communication preferences

Keep these purposes separate:

| Purpose | Required handling |
|---|---|
| Transactional payment, identity, delivery, access, correction, and support messages | Explain as necessary to fulfill the order; do not add promotional content that changes the purpose |
| Optional post-payment product research | Ask separately; participation must not affect report quality or remedy |
| Action follow-up and re-audit reminder | Obtain a clear preference for channel and purpose; record time, wording version, source, and withdrawal |
| Marketing email/WhatsApp | Separate opt-in; no pre-ticked box; easy channel-appropriate opt-out |
| Testimonial or case-study publication | Separate, specific permission for assets, identity, finding, and channels |
| Aggregate benchmarks/product improvement | Disclose and decide a separate approved basis before use; not automatically authorized by purchase |

- Store the exact consent artifact and policy/copy version, not only a boolean.
- Withdrawal must stop future non-essential messages promptly and propagate to all sending tools.
- A report access request or support message must not re-subscribe a contact.
- **[OPEN — legal]** Confirm when consent is required, what other lawful bases may apply, proof requirements, opt-out timing, and WhatsApp/email rules in Indonesia.

## 7. Attribution and analytics

### 7.1 Permitted launch attribution

Track only what is necessary to understand the business funnel:

- first-touch and last-touch source;
- campaign, creative, content slug, and referral identifier;
- landing, sample-report, clinic-confirmation, checkout, payment, delivery, report-open, action-selection, feedback, referral, and re-audit events; and
- coarse device/session metadata needed for reliability and attribution.

### 7.2 Guardrails

- Do not put clinic report access tokens, customer contact data, payment data, report findings, raw prompts/outputs, or patient-related content into analytics properties or URLs.
- Use internal order/event identifiers that cannot be used to open a report.
- Keep marketing attribution separate from report authorization.
- Avoid session replay on checkout, intake, report, support, and any field that could contain customer or sensitive data unless a separately reviewed implementation proves adequate masking and necessity.
- Do not build sensitive health-related audiences or lookalikes from clinic customer or patient data.
- Define cookie/device-tracking disclosure and controls before enabling non-essential tracking.
- **[OPEN — legal/platform]** Review consent-banner requirements, analytics configuration, ad-platform terms, retention, and cross-platform audience use.

## 8. Report access, recovery, and revocation

### 8.1 Access design

- Use a cryptographically strong, opaque, order-linked access token with sufficient entropy.
- Store a one-way token hash where practical; never store or log a reusable plain token unnecessarily.
- Keep public report identifiers separate from access secrets and prevent enumeration.
- Never send report tokens to analytics, model providers, referrer headers, error messages, or support screenshots.
- Apply rate limiting and anomaly logging to access and recovery attempts.
- A report link is confidential access, not identity proof and not “permanent ownership.”

### 8.2 Recovery

Recovery must verify control of the original delivery channel through an expiring one-time link or code. Support must not reveal or replace report access based only on clinic name, order amount, or public business information.

**[OPEN]** Choose the exact recovery assurance level for changes to the original email/phone, and define a safe manual exception process.

### 8.3 Revocation and rotation

- Customers can request link revocation or rotation through the verified recovery channel.
- Rotate immediately when a link is exposed, sent to the wrong recipient, or included in a public page.
- Revocation invalidates the old token without deleting the audit record unless deletion is separately requested and approved.
- Security or privacy incidents may trigger defensive revocation and customer notification.

### 8.4 Sharing and downloads

- Customer-facing copy must explain that anyone with the active link may be able to view the report.
- Do not claim the link is private solely because it is hard to guess.
- PDF/downloads cannot be technically revoked after the customer saves or forwards them; disclose this when relevant.
- **[OPEN — legal/product]** Decide whether reports may be shared with agencies, staff, or prospective buyers and what terms apply.

## 9. Retention and deletion

### 9.1 Required retention schedule

Before production launch, approve a field-level schedule covering:

- abandoned clinic lookups and leads;
- failed/unpaid checkout sessions;
- orders, payments, refunds, invoices, and disputes;
- customer contact and consent artifacts;
- optional intake data;
- raw model/SERP outputs and copied source material;
- extracted observations and audit evidence;
- reports and report versions;
- QA notes, support threads, and manual intervention records;
- analytics/attribution events;
- security, access, and application logs;
- backups and provider-held copies; and
- deletion tombstones or suppression records.

For each class record: purpose, owner, access group, retention duration, deletion/anonymization action, backup behavior, provider propagation, and legal basis.

### 9.2 Launch default

- **[SETTLED product guardrail]** Do not promise permanent report hosting or indefinite data retention.
- **[HYPOTHESIS]** Offer report access for 12 months and retain raw audit evidence for a shorter QA/correction window where possible.
- **[OPEN — legal/business]** Approve actual durations after accounting, tax, payment-dispute, contract, privacy, security, model-provider, and product-research review.
- Until durations are approved, production launch remains gated; “keep everything” is not an acceptable default.

### 9.3 Deletion requests

A deletion process must:

1. verify the requester through the original delivery/recovery channel;
2. identify the requested scope: contact, report access, report/evidence, marketing, or all eligible data;
3. preserve only records that must or legitimately need to remain, with access restricted;
4. propagate deletion to applicable processors and derived stores;
5. address backups through an approved expiry/recovery policy;
6. invalidate report access and prevent accidental recreation; and
7. confirm completion in plain language.

Exact rights, exceptions, response periods, identity proof, and record-keeping are **[OPEN pending legal review]**.

## 10. Logs, secrets, and internal access

### 10.1 Logging rules

Logs may contain operational identifiers, timestamps, state, provider result codes, latency, cost, and sanitized error classifications. Logs must not contain:

- API keys, database credentials, webhook secrets, authorization headers, or payment credentials;
- report access/recovery tokens or magic links;
- full customer contact details when an internal identifier suffices;
- patient/sensitive personal data;
- full raw model outputs or report bodies by default;
- complete payment callbacks; or
- unredacted support messages and uploaded material.

Use allowlisted structured logging, not best-effort redaction after ingestion.

### 10.2 Secrets

- Store secrets in approved environment/secret management, scoped by production and preview environment.
- Grant least privilege and rotate secrets after suspected exposure, staff/contractor departure, or provider guidance.
- Validate payment webhooks cryptographically and keep verification server-side.
- Never expose secrets in client bundles, repository history, prompts, screenshots, tickets, or chat.
- Maintain an incident-ready inventory of secret owner, scope, creation/rotation date, and revocation process.

### 10.3 Internal access

- Separate operator access to contact/payment metadata from audit evidence where feasible.
- Record privileged report views, corrections, token rotations, exports, refunds, and deletions.
- Review access at launch and whenever a collaborator’s role changes.
- Do not use shared personal accounts for production systems.
- **[OPEN]** Define exact roles, authentication requirements, session policy, and access-review cadence in the technical security design.

## 11. Accuracy disputes and corrections

Customers may challenge clinic identity, provider observations, public sources, Nuave inference, recommendation, or report presentation. These are different issues and must be handled separately.

### 11.1 Correction rules

- Preserve the original report and challenged evidence; do not overwrite history.
- Verify identity first, then reproduce or inspect the original dated observation.
- A later-changed public source does not make the earlier observation false; add the new context and date.
- Correct Nuave extraction, attribution, inference, or rendering errors promptly and version the report.
- Do not modify a valid provider observation simply because it is unfavorable. Add limitation or customer-supplied context when appropriate.
- Do not ask a model to adjudicate whether its own prior output was correct without external evidence.
- Tell the customer what changed, why, which version is current, and whether the correction affects recommendations.
- If an error materially undermines paid value, follow the remedy policy in [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md).

### 11.2 Public-source correction and removal

Nuave does not control third-party model or source content. It may identify the relevant public source or correction channel when supported, but must not guarantee removal, correction, indexing, ranking, or model-update timing.

Requests to remove personal information, patient content, allegedly defamatory material, copyrighted content, or illegal claims require restricted handling and **[OPEN] legal escalation criteria**.

## 12. Legal-review checklist

The following must be reviewed by qualified Indonesian counsel and, where relevant, tax/accounting, payment, healthcare-advertising, privacy/security, or platform specialists. This checklist is not a legal conclusion.

### Business, offer, and terms

- [ ] Correct Nuave legal entity, business registrations, seller identity, contact details, and invoice/tax treatment.
- [ ] Terms of sale: one-time audit scope, sampled methodology, named surfaces, exclusions, customer responsibilities, intellectual property, limitations, governing terms, and dispute path.
- [ ] Consumer-versus-business customer classification and any mandatory rights that cannot be waived.
- [ ] Price, tax, discount, anchor, founding-cohort, scarcity, delivery, refund, cancellation, partial-report, and re-audit claims.
- [ ] Midtrans/payment-method terms, webhook records, refunds, chargebacks, prohibited businesses, and data allocation.

### Clinic and advertising rules

- [ ] Rules governing healthcare/clinic advertising, practitioner claims, treatment claims, testimonials, before/after material, comparisons, pricing, endorsements, and required disclosures.
- [ ] Whether Nuave’s generated recommendations or examples create advertising, medical-device, professional, publisher, agency, or other regulated responsibilities.
- [ ] Appropriate disclaimer language and whether disclaimers can mitigate—or cannot cure—specific prohibited claims.
- [ ] Meta, Google, WhatsApp, email, and other channel policies for B2B clinic targeting, health-related audiences, remarketing, lead forms, testimonials, and destination content.

### Privacy and data

- [ ] Applicable Indonesian privacy/data-protection framework, controller/processor roles, lawful bases, notices, consent, sensitive data, data-subject rights, records, and officer/contact requirements.
- [ ] Data localization and cross-border transfers for Supabase/Vercel, model/SERP providers, analytics, email, WhatsApp, error monitoring, and support tools.
- [ ] Provider agreements, model-training/retention settings, subprocessors, breach terms, audit rights, deletion, and export.
- [ ] Approved field-level retention schedule, backups, accounting/payment exceptions, deletion verification, and anonymized aggregate use.
- [ ] Security incident and personal-data breach assessment, notification duties, recipients, content, and timing.
- [ ] Cookie/device tracking, marketing attribution, session replay, consent management, pixels, custom audiences, and suppression lists.
- [ ] Transactional versus marketing communication, opt-in evidence, unsubscribe/withdrawal, WhatsApp outreach, and re-audit reminders.

### Content, evidence, and access

- [ ] Copyright/database/terms implications of storing provider responses, search snippets, directory data, screenshots, logos, reviews, and excerpts in reports.
- [ ] Customer permission for logos, testimonials, case studies, anonymized examples, aggregate benchmarks, and product improvement.
- [ ] Defamation, unfair competition, and correction handling for named competitor observations and comparisons.
- [ ] Report-link access model, confidentiality statement, sharing rights, recovery identity proof, revocation, PDF limitations, and hosted-access duration.

### Launch record

For every reviewed item, record:

- reviewer and qualification;
- date and jurisdiction/scope;
- documents, product flows, providers, and copy versions reviewed;
- conclusion and required changes;
- owner and completion evidence;
- unresolved risk and launch constraint; and
- revisit trigger or review date.

## 13. Production readiness gate

Do not accept production payment until:

- [ ] No-patient-data warnings and incident handling are implemented in intake and support.
- [ ] Clinic claim guardrails and manual-review routing are tested on representative reports.
- [ ] Customer-facing methodology does not claim consumer-interface equivalence or guaranteed outcomes.
- [ ] Transactional and optional marketing/research consent are separated and recorded with copy versions.
- [ ] Provider approval register and data-flow inventory are complete.
- [ ] Report tokens are non-enumerable, excluded from analytics/logs, recoverable, and revocable.
- [ ] Retention and deletion schedules are approved and technically executable.
- [ ] Logs use an allowlist and secrets/webhooks are handled server-side.
- [ ] Correction, refund, access-rotation, deletion, and sensitive-data incident drills pass.
- [ ] Required privacy, terms, refund, advertising, consent, and provider reviews in Section 12 are complete, or a qualified reviewer has explicitly approved a narrower pilot scope.

## 14. Maintenance

- Review this policy before adding a vertical, city, provider, marketing channel, publish-ready copy generator, customer upload, benchmark dataset, partner/agency sharing, or new data use.
- Record material decisions and legal-review outcomes in [DECISION_LOG.md](./DECISION_LOG.md); do not silently change **[OPEN]** items to settled.
- Recheck platform policies and provider data terms before campaign launch and at a defined cadence; their current status is **[OPEN]** until verified.
- Treat repeated corrections, patient-data submissions, claim-review flags, access incidents, opt-outs, and provider-data exceptions as product signals, not isolated support noise.
