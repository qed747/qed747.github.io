# Sanctions and Export Control Risk Prototype

This is a browser-based prototype for exploring public sanctions/export-control enforcement patterns and estimating a prospective transaction's enforcement-analogy risk with a transparent Bayesian-style model.

## What It Does

- Historical explorer: filters public-record cases by agency, destination/intermediary country, product category, disclosure posture, and risk factors.
- Prospective scorer: lets a user enter a proposed transaction and returns a posterior risk estimate, risk band, feature contributions, and analogous cases.
- Evidence-first modeling: every score is tied back to the case dataset and shows which factors moved the estimate.

## Run

Open `index.html` in a browser, or serve the folder locally:

```powershell
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Ingest OFAC Source Index

The historical explorer can be expanded from official OFAC yearly civil-penalty pages:

```powershell
node scripts\ingest-ofac.mjs
```

The script fetches OFAC civil-penalty chart rows, updates `data/sourceIndex.js`, and refreshes OFAC coverage counts in `data/sourceCoverage.js`. These rows are searchable in the Historical Explorer, but they are not used as Bayesian training records until matter-level fields such as countries, products, disclosure posture, and risk factors are coded.

Manual non-OFAC source-index rows, such as BIS FedEx and joint OFAC/BIS DHL records, use IDs that do not start with `ofac-index-`; the OFAC ingester preserves those rows.

## Ingest BIS Source Index

The historical explorer can also load the official BIS export-violations table:

```powershell
node scripts\ingest-bis.mjs
```

The script fetches the BIS export-violations index, updates `data/sourceIndex.js`, and refreshes BIS coverage counts in `data/sourceCoverage.js`. Most BIS source rows do not include penalty amounts on the index page; amounts should be extracted from the linked PDFs during matter-level coding.

## Ingest DOJ Source Index

The historical explorer can load DOJ NSD export-control and sanctions news:

```powershell
node scripts\ingest-doj.mjs
```

The script fetches the paginated DOJ NSD listing and adds each press-release title as a searchable source-index row. These rows support discovery, but detailed defendant, country, product, charge, forfeiture, plea, and sentence fields require matter-level coding.

## Modeling Note

Public enforcement records are not a denominator for all transactions. They are a selected sample of detected, investigated, settled, charged, or prosecuted matters. The current model therefore estimates an "enforcement-analogy risk" rather than a true legal violation probability. A production model should add denominators such as export volumes, license application statistics, screening hits, internal alert volumes, shipment counts, and confirmed false-positive outcomes.

## Suggested Data Sources

- OFAC Civil Penalties and Enforcement Information
- BIS enforcement actions, settlement agreements, charging letters, and "Don't Let This Happen To You"
- DOJ National Security Division export control and sanctions press releases
- DDTC consent agreements and AECA/ITAR charging records
- Federal Register penalty-rule updates and agency enforcement guidelines
