# Bayesian Risk Model

## Purpose

The model estimates how closely a proposed transaction resembles matters that U.S. agencies have historically penalized, charged, settled, or prosecuted. It should be treated as a triage and escalation aid, not as a legal conclusion.

## Current Prototype

The current app has two layers:

- Fully coded exemplar cases in `data/cases.js`. These are usable by the scoring model today because they contain countries, product categories, disclosure posture, enforcement posture, risk factors, summaries, and source links.
- Source-index coverage in `data/sourceCoverage.js`. These are official corpora identified for ingestion, with OFAC, DOJ, BIS, and DDTC now represented. Not every indexed record is model-ready until normalized into the full case schema.
- Searchable source-index rows in `data/sourceIndex.js`. These let the historical explorer return company-name matches from official penalty charts even when the matter has not yet been fully coded into risk factors.

The first scoring version uses:

- A prior probability by transaction archetype.
- Feature likelihood ratios estimated from the public-record case set with Laplace smoothing.
- Policy modifiers for factors that agency guidance repeatedly treats as aggravating or mitigating, such as restricted-party involvement, unresolved license requirements, transshipment, management awareness, voluntary self-disclosure, and remediation.
- Analogous-case retrieval based on country, product category, route, and risk-factor overlap.

## Formula

```text
prior_odds = prior_probability / (1 - prior_probability)
posterior_odds = prior_odds x LR(feature_1) x LR(feature_2) ... x policy_modifier(feature_n)
posterior_probability = posterior_odds / (1 + posterior_odds)
```

The current likelihood-ratio calculation compares feature prevalence in severe public cases against less-severe public cases:

```text
LR(feature) =
  P(feature | severe public enforcement case) /
  P(feature | less-severe public enforcement case)
```

Severity is currently defined as either a criminal posture or a listed penalty/settlement of at least $1 million.

## Data Schema

Each case record should preserve:

- `date`
- `agency`
- `name`
- `countries`
- `productCategory`
- `products`
- `disclosure`
- `posture`
- `amountUsd`
- `factors`
- `summary`
- `sourceTitle`
- `sourceUrl`

## Risk Factor Sources

Risk factors are analyst-coded from public enforcement materials rather than imported from a single structured government field. The current tags are based on:

- OFAC Economic Sanctions Enforcement Guidelines and OFAC self-disclosure guidance.
- BIS enforcement guidance, red-flag resources, voluntary self-disclosure materials, charging letters, and settlement documents.
- DOJ National Security Division voluntary self-disclosure policy for export-control and sanctions matters.
- DDTC consent agreements, proposed charging letters, and ITAR enforcement orders.
- Public case-specific settlement agreements, charging documents, plea/sentencing releases, and penalty announcements linked in each coded record.

For production, each factor should carry evidence provenance: source URL, supporting excerpt or pinpoint citation, coder, date coded, and confidence.

## Pattern Analysis

The app includes descriptive pattern recognition across fully coded cases:

- Similar-case matching with Jaccard overlap across countries, products, agencies, posture, disclosure status, and risk factors.
- Average and median penalty summaries by country, product category, disclosure status, and risk factor.
- Clear separation between searchable source-index rows and model-ready coded cases.

These summaries are exploratory. They should not be read causally without controlling for transaction value, statutory maximums, agency, year, cooperation, compliance commitments, company size, and whether the record is civil, administrative, or criminal.

For production, add:

- Statutory/regulatory basis: EAR, IEEPA, ITSR, CACR, AECA, ITAR, FTR, antiboycott, customs/smuggling, money laundering, false statements.
- Case stage: subpoena, charging letter, settlement, plea, sentencing, forfeiture, denial order, temporary denial order.
- Actor attributes: U.S. person, foreign person, exporter, freight forwarder, financial institution, manufacturer, broker, end user.
- Compliance facts: screening failure, classification failure, license exception reliance, escalation failure, repeat conduct, concealment, management involvement.
- Outcome facts: penalty, suspended penalty, monitorship, denial order, debarment, imprisonment, forfeiture, compliance commitments.

## Source Expansion

Recommended official-source ingestion order:

1. OFAC Civil Penalties and Enforcement Information, including selected settlement agreements.
2. BIS enforcement announcements, charging letters, settlement agreements, denial orders, and "Don't Let This Happen To You."
3. DOJ National Security Division export control and sanctions news.
4. DDTC consent agreements and AECA/ITAR enforcement announcements.
5. Federal Register penalty and enforcement-guideline updates.

The dashboard should never treat source-index rows as model-ready until they have been normalized into the case schema. They can support coverage reporting, but feature likelihood ratios should be trained only on records that have enough facts coded for the relevant model.

## Production Calibration

Public enforcement records are selected outcomes. To estimate real transaction violation probability, add denominators and negative examples:

- Total shipments or payments by business line and destination.
- License applications, approvals, denials, returns without action, and provisos.
- Screening alerts and disposition outcomes.
- Internal compliance escalations and closed false positives.
- Voluntary self-disclosures that resulted in no action, cautionary letters, or non-public resolutions where available.
