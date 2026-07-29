# Nuave prompt-generation context

> Status: **Founder-approved product context for the next prompt pack**
>
> Updated: 2026-07-29

## Purpose

This document is the product-knowledge source for generating the ten customer
questions used in a Nuave AI visibility audit. It defines what the questions
must represent, what inputs may shape them, and what the generator must never
invent.

The
[`generate-ai-visibility-prompts`](../skills/generate-ai-visibility-prompts/SKILL.md)
skill reads this file before creating an audit prompt pack. Per-clinic facts
remain runtime inputs and do not belong in this document.

This context is intentionally narrower than [`PRODUCT.md`](./PRODUCT.md). It
does not define the offer, report layout, scoring formula, acquisition plan, or
implementation architecture.

## Product boundary

Nuave observes how ChatGPT responds to a defined sample of realistic customer
questions about one verified dental-clinic location. The audit is a dated
snapshot, not a permanent ranking or a guarantee that another person will
receive the same answer.

The next prompt pack uses:

- one verified dental clinic and one exact branch;
- ten questions in Bahasa Indonesia;
- five customer-intent categories with two questions each;
- five questions without the audited clinic's name;
- five questions that name the audited clinic;
- independent questions with no shared conversation history; and
- human review before the questions are used in an audit.

ChatGPT is the only AI product in scope for this prompt pack. The audit must
still record the exact execution surface, model when available, date, language,
location context, and run conditions. An API observation must not be presented
as an exact reproduction of a personalized consumer ChatGPT session.

## What the questions should represent

The questions should resemble how a prospective dental-clinic customer might
ask for help in an ordinary ChatGPT conversation. They should preserve the
customer's underlying intent, imperfect knowledge, and practical constraints
without manufacturing patient evidence.

The framework is adapted from consumer decision-journey models, then narrowed
for local-service AI visibility. It is not a claim that customers move through
the categories in a fixed order. A person may move back and forth, skip a
category, or combine multiple concerns in one real conversation.

## Nuave Intent-5

| ID | Category | Customer's job | Brand rule | Audit role |
|---|---|---|---|---|
| `problem_discovery` | Problem Discovery | Connect a symptom or situation to an appropriate kind of dental help. | Two unbranded questions. | Observe whether ChatGPT connects the need to relevant services or providers. |
| `provider_discovery` | Provider Discovery | Find clinics that could meet a known local or service need. | Two unbranded questions. | Observe whether the clinic enters the customer's consideration set without being named. |
| `comparison` | Comparison | Narrow several possible clinic choices. | One unbranded question and one branded head-to-head question. | Observe open comparative inclusion and representation against one verified competitor. |
| `validation` | Validation | Check important facts about a clinic already being considered. | Two branded questions. | Inspect service, branch, location, hours, and other factual representation. |
| `action` | Action | Get the practical information needed to contact, book, or visit. | Two branded questions. | Inspect price information, availability, contact paths, hours, and booking readiness. |

### 1. Problem Discovery

The customer starts with a symptom, concern, or situation rather than a service
name or clinic brand.

The two questions should cover different common situations. They may ask which
kind of clinic, service, or provider could be checked, but they must not ask
ChatGPT to diagnose a condition, prescribe medication, or provide a treatment
plan.

Illustrative language:

> Gigi belakang saya tumbuh dan gusinya sakit. Ada klinik di Depok yang
> menangani keluhan seperti ini?

> Gigi saya ngilu tiap minum dingin. Kalau mau periksa di Depok, klinik mana
> yang bisa saya cek?

These are synthetic customer scenarios, not patient records. A clinic's
non-appearance is not automatically equivalent to failure in a direct
provider-discovery question because ChatGPT may reasonably answer a
symptom-led question without naming any clinic.

### 2. Provider Discovery

The customer already knows they want a dental clinic or a particular service
and is looking for local options. The audited clinic must not be named.

Use:

- one general local-discovery question; and
- one service-led local-discovery question based on a verified relevant
  service.

Illustrative language:

> Rekomendasiin beberapa klinik gigi di Depok yang gampang dijangkau dari
> Margonda.

> Saya mau scaling di Depok. Klinik mana yang bisa saya cek?

### 3. Comparison

The customer is narrowing choices using practical criteria. Use:

- one open, unbranded comparison among local clinics; and
- one branded comparison between the audited clinic and one real, relevant,
  verified competitor.

Illustrative language:

> Kalau buat scaling di Depok, bandingin beberapa klinik dari lokasi, jam buka,
> dan kisaran harganya.

> Mending Sozo Dental Depok atau [kompetitor terverifikasi] buat scaling? Apa
> bedanya?

The generator must never invent a competitor. If no suitable competitor has
been verified, it must return a missing-input warning instead of producing the
branded comparison.

### 4. Validation

The customer already knows the clinic and wants to verify decision-relevant
facts.

Use:

- one question about a verified priority service or another important public
  fact; and
- one question about branch identity, location, hours, or factual consistency.

Illustrative language:

> Sozo Dental Depok ada layanan scaling nggak? Info yang tersedia bilang apa?

> Alamat dan jam buka Sozo Dental Depok yang terbaru apa? Saya takut salah
> cabang.

Do not seed a supposed conflict, missing fact, or negative reputation unless it
is present in the approved audit inputs.

### 5. Action

The customer is close to contacting or visiting the clinic and needs practical
information to proceed.

Use:

- one price, service-access, or availability question; and
- one hours, contact, directions, or booking question.

Illustrative language:

> Kalau mau scaling di Sozo Dental Depok, kisaran biayanya berapa?

> Sozo Dental Depok buka hari Minggu nggak? Bookingnya lewat mana?

These questions test information readiness. They do not imply that a displayed
price is current or that an appointment is available; the audit must review
such claims against retained sources.

## Required per-audit inputs

The prompt generator may use only approved inputs for the audited clinic:

- canonical clinic name and known public name variants;
- exact branch, address, city, and practical local area;
- authoritative website, business listing, or public profile;
- verified services relevant to the audit;
- intended customer context or priority service when supplied;
- one real, locally relevant, verified competitor for the branded comparison;
  and
- customer-supplied business facts, clearly identified as customer-supplied
  until independently verified.

Missing required information must be reported. It must not be guessed or
silently replaced.

Do not supply or request patient names, appointment details, diagnoses,
photographs, treatment records, private messages, or other patient data.

## Natural-language rules

Every generated question must:

- sound like one prospective customer asking ChatGPT for practical help;
- use casual-neutral Indonesian appropriate to the clinic's local context;
- contain one understandable situation and one main request;
- stand alone without relying on an earlier message;
- include location naturally when local relevance affects the answer;
- use the audited clinic's canonical public name in branded questions;
- vary sentence shape and vocabulary without changing the intended job; and
- remain specific enough that the response can be reviewed against the audit
  inputs.

Natural contractions such as `nggak`, `mending`, or `rekomendasiin` are
permitted when they fit the sentence. Do not force slang into every question.

Avoid language that sounds written for an evaluator, marketer, or computer,
including:

- `berdasarkan informasi publik yang dapat diverifikasi`;
- `sertakan sumber dan jelaskan keterbatasannya`;
- `berikan analisis komprehensif`;
- `klinik mana yang layak dipertimbangkan`;
- long lists of artificial constraints; and
- repeated keyword-style phrasing.

Requirements for web access, citations, metadata capture, or response
structure belong in the audit execution configuration, not in the simulated
customer's wording unless a real customer would naturally ask for them.

## Integrity and safety rules

The prompt generator must not:

- place the audited clinic's name or a recognizable variant in an unbranded
  question;
- invent a clinic, competitor, branch, service, price, review, credential,
  opening hour, contact method, or information conflict;
- imply that the customer has seen conflicting information unless that context
  is an approved input;
- ask ChatGPT to diagnose, prescribe, guarantee an outcome, or determine which
  clinic provides clinically superior care;
- convert AI visibility into a claim about safety, legality, treatment quality,
  popularity, patient outcomes, leads, or revenue;
- optimize the wording to make the audited clinic more likely to appear; or
- reuse clinic-specific facts from another audit.

If a natural customer phrase such as `bagus` or `terbaik` would invite an
unsupported clinical-quality judgment, replace it with concrete considerations
such as service, location, hours, price information, accessibility, or booking
method.

## Expected prompt-pack output

The prompt-generation skill should return ten reviewable prompt records. Each
record should contain at least:

- stable prompt ID;
- intent category;
- branded or unbranded status;
- exact customer question;
- short rationale for inclusion;
- clinic inputs used in the question; and
- a review status or missing-input warning.

The output format may later become machine-readable, but the product meaning of
these fields should remain stable.

## Pre-audit acceptance check

A prompt pack is ready only when:

- it contains exactly ten questions;
- every Intent-5 category has exactly two questions;
- five questions are unbranded and five are branded;
- the comparison pair contains one unbranded and one branded question;
- the audited clinic does not appear in any unbranded wording;
- every named clinic, branch, service, area, and competitor comes from approved
  inputs;
- no two questions test substantially the same customer job;
- every question sounds plausible when read aloud in isolation;
- no question asks for diagnosis, treatment instructions, or a clinical-quality
  verdict;
- a human reviewer approves the exact wording; and
- the approved questions are versioned and frozen before the audit runs.

## Interpretation boundary

Equal prompt counts create a balanced sample, not five equally weighted score
components.

- Problem Discovery primarily observes problem-to-service or
  problem-to-provider association.
- Provider Discovery and the open comparison observe unbranded
  discoverability.
- Branded comparison, Validation, and Action observe how a known clinic is
  represented.

A branded answer is not evidence that the clinic is discoverable when its name
is absent. A symptom-led non-appearance is not automatically equivalent to
non-appearance in a direct clinic-recommendation request. Any future scoring
method must preserve these distinctions.
