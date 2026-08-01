# Nuave v2 GTM evidence register

> Status: **Live evidence index**
> Updated: 2026-07-31
> Evidence rules: [`../AGENTS.md`](../AGENTS.md) and the recording rules in
> [`README.md`](./README.md)

This register indexes evidence that may materially affect go-to-market
recommendations. It is not a place to manufacture a complete-looking history.
Sensitive source material should remain in an appropriately restricted location
and be linked by a non-identifying record.

## Evidence register

| ID | Date | Type | Segment/city | Evidence | Source | Limitation | Decision impact |
|---|---|---|---|---|---|---|---|
| GTM-EV-001 | 2026-07-19 | FOUNDER_INPUT | Nuave v2 / all | Nuave v2 is a new product with zero customers | Founder-confirmed repository baseline | Does not establish the number of prospects contacted or any market response | Prohibits customer-derived claims and makes customer rates not applicable or not measured |
| GTM-EV-002 | 2026-07-19 | PRODUCT_CONTRACT | Single-location dental clinics / provisional Jakarta | EXP-001 has a locked identity sample but no provider observations or result | [`../experiments/EXP-001/README.md`](../experiments/EXP-001/README.md) | Preparation is not feasibility evidence; launch city remains open | Continue Gate 0 and do not claim methodology feasibility |
| GTM-EV-003 | 2026-07-19 | HYPOTHESIS | Single-location dental clinics / provisional Jakarta | Competitive discovery was the first working clinic-owner message family | [`../docs/DECISION_LOG.md`](../docs/DECISION_LOG.md) | No buyer-language, conversion, or paid evidence exists; the agency-buyer pivot superseded its operating use | Preserve as dated context; do not use it as current agency positioning |
| GTM-EV-004 | 2026-07-31 | PRODUCT_CONTRACT | Agencies, freelancers, and marketing consultants / Indonesia | The working initial buyer is now an agency-side provider ordering one client-ready audit for one client business; agency demand, pricing, acquisition cost, client use, and repeat purchase remain unvalidated | [`../docs/DECISION_LOG.md`](../docs/DECISION_LOG.md) | Founder-approved direction is not customer evidence | Run EXP-R2 and do not claim agency demand or commercial outcomes |
| GTM-EV-005 | 2026-07-20 | EXPERIMENT_RESULT | Dental clinic / Depok | EXP-R1 produced a reviewed `PASS_CANDIDATE` report from five OpenAI web-search and five Gemini Developer API Free observations | [`../experiments/runs/2026-07-20-sozo-dental-depok/REPORT.md`](../experiments/runs/2026-07-20-sozo-dental-depok/REPORT.md) | Internal methodology evidence from one clinic and a small sample; ChatGPT Free was not observed; no agency buyer or payment was tested; publication permission is not established | May support method review and a private sample decision; does not support agency-demand, pricing, client-outcome, or broad vertical claims |

## Evidence coverage

| Evidence category | Current coverage | State |
|---|---|---|
| Founder constraints and direction | Zero-customer baseline, agency-buyer pivot, and repository-backed CMO authorization recorded | PARTIAL |
| Market observations | EXP-R1 contains one dated dental-clinic observation set; EXP-001 remains prepared and unrun | PARTIAL |
| Prospect evidence | No dated repository records | NONE |
| Customer evidence | No customers | NOT_APPLICABLE |
| Funnel data | No measured funnel cohort | NONE |
| Financial data | Rp0 v2 revenue due to zero customers; no actual unit-cost baseline | PARTIAL |
| Experiment results | EXP-R1 has one internal methodology result; EXP-001 has a locked sample only; EXP-R2 has not run | PARTIAL |

## Required fields for future evidence

- stable evidence ID and date;
- evidence type;
- segment, city, and lifecycle stage;
- factual observation separated from interpretation;
- source or link to the underlying record;
- sample size and denominator where applicable;
- limitations and contradictory evidence;
- consent, confidentiality, and publication boundary; and
- decision or experiment affected.
