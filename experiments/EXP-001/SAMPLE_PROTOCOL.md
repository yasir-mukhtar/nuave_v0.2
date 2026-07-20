# EXP-001 sample protocol

> Status: **LOCKED — identity sample populated; no provider observations**
> Applies to: `exp-001-v0.1`
> City hypothesis: Jakarta

## Sampling objective

Select a bounded set that tests whether Nuave can resolve and measure ordinary
single-location dental clinics. Do not optimize the sample for impressive model
visibility, famous brands, likely findings, or marketing value.

## Inclusion criteria

Every evidence clinic must:

- be a dental clinic operating at one selected physical location in Jakarta;
- have an active, resolvable Google Maps/Business Profile listing;
- have an official website or authoritative public social profile;
- expose enough public identity signals to evaluate name, address, category,
  website or social profile, and public phone when available;
- not require patient, private, login-protected, or purchased data; and
- be auditable using the frozen Bahasa Indonesia, Jakarta prompt context.

## Exclusion criteria

Exclude before observation begins when the candidate is:

- a multi-location group or franchise whose selected branch cannot be isolated;
- closed, moved, duplicated, or materially ambiguous after reasonable checks;
- outside Jakarta;
- not primarily a dental clinic;
- represented only by private or patient-level information; or
- dependent on scraping or provider behavior not approved for this experiment.

Record the candidate and reason. Do not silently replace it.

## Diversity dimensions

The final ten should vary, without creating quotas that require weak identity:

- public-information completeness;
- distinctive versus potentially ambiguous business names;
- independent practice scale and apparent digital maturity;
- different parts of Jakarta; and
- website-led versus authoritative-social-profile-led public identity.

Do not inspect AI-provider inclusion before locking the sample.

## Selection procedure

1. Build a candidate pool from public business sources.
2. Apply inclusion and exclusion criteria using public identity data only.
3. Record the first ten qualifying clinics under a documented deterministic
   ordering rule, such as a seeded shuffle of the verified pool.
4. Select one additional qualifying clinic as the excluded calibration case.
5. Freeze the sample manifest, identity dossiers, selection timestamp, sources,
   and exclusion log before the first evidence observation.
6. If a frozen clinic becomes technically unauditable, retain it in the
   denominator and record the outcome. Replacement requires a protocol
   deviation and cannot erase the original failure.

For `exp-001-v0.1`, the frozen implementation is recorded in
[`sample-manifest.json`](./sample-manifest.json): screen public identity first,
sort qualifying Maps identifiers by SHA-256 of
`EXP-001-JKT-v0.1:{maps_provider_id}`, assign the first ten to evidence, and
assign the eleventh to excluded calibration. The locked pool contains eleven
qualifying clinics and one pre-selection identity exclusion. No AI-provider
visibility was inspected during screening or ordering.

## Required manifest fields

For the calibration clinic and each evidence clinic, record:

- stable experiment subject ID, never a public report token;
- sample role: `calibration` or `evidence`;
- public clinic name and known variants;
- exact selected branch and full Jakarta address;
- Maps/Business Profile stable identifier and URL;
- official website or authoritative public social profile;
- public phone when available;
- public category;
- identity-source URLs and capture timestamps;
- identity status: `resolved`, `ambiguous`, or `unresolved`;
- inclusion decision and reason;
- selection-order value and deterministic ordering method; and
- notes needed to distinguish similarly named entities.

Do not store customer contact, private owner information, patient data, access
tokens, or payment data in the manifest.

## Sample limitations to preserve

- Ten clinics cannot establish a Jakarta market rate or population estimate.
- Public-data eligibility will underrepresent clinics with sparse online data.
- Operator review cannot establish customer-perceived usefulness.
- Jakarta feasibility does not prove Bandung or Surabaya feasibility.
- Provider output during one audit window does not establish permanent
  visibility.
