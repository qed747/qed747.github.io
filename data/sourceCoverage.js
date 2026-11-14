window.SOURCE_COVERAGE = [
  {
    "agency": "OFAC",
    "source": "Workbook OFAC sheet",
    "scope": "OFAC civil penalties and settlements through workbook update",
    "indexedRecords": 294,
    "indexedPeriod": "Workbook updated 2026-07-22",
    "status": "Loaded and normalized for Bayesian scoring",
    "notes": "Rows mapped from workbook fields including penalty, regime, VSD, countries, items, SDN flag, and egregious-case flag.",
    "sourceUrl": "https://ofac.treasury.gov/civil-penalties-and-enforcement-information"
  },
  {
    "agency": "BIS/DDTC/DOJ",
    "source": "Workbook EAR-ITAR sheet",
    "scope": "Export-control, ITAR, administrative, civil, and criminal enforcement actions",
    "indexedRecords": 725,
    "indexedPeriod": "Workbook updated 2026-07-22",
    "status": "Loaded and normalized for Bayesian scoring",
    "notes": "Rows mapped from workbook fields including agency, case ID, goods, description, source URL, country nexus from notes, VSD, and penalty amount.",
    "sourceUrl": ""
  },
  {
    "agency": "Logistics",
    "source": "Workbook Logistics sheet",
    "scope": "Logistics-specific enforcement rows",
    "indexedRecords": 19,
    "indexedPeriod": "Workbook updated 2026-07-22",
    "status": "Loaded and normalized for Bayesian scoring",
    "notes": "Rows mapped as logistics/freight/shipping cases.",
    "sourceUrl": ""
  },
  {
    "agency": "BIS/DOJ/DDTC",
    "source": "Recent official agency overlay",
    "scope": "Post-workbook BIS, DOJ, and State/DDTC export-control and sanctions matters checked against official releases",
    "indexedRecords": 27,
    "indexedPeriod": "Official feeds checked 2026-11-14",
    "status": "Loaded and normalized for Bayesian scoring",
    "notes": "November 14 review added the official DOJ Einolghozati sentencing to the normalized overlay. BIS, OFAC and DOJ ingesters completed. The indexed State/DDTC consent-agreement list and official-domain search showed no newer agreement.",
    "sourceUrl": "https://www.bis.gov/enforcement/export-violations"
  },
  {
    "agency": "BIS",
    "source": "Official BIS export-violations index",
    "scope": "BIS export-violation documents, including recent orders and charging letters",
    "indexedRecords": 1127,
    "indexedPeriod": "Official BIS index fetched 2026-11-14",
    "status": "Indexed; source rows loaded",
    "notes": "These official BIS rows are searchable in the historical explorer. Rows become part of Bayesian likelihoods after normalization into the full case schema.",
    "sourceUrl": "https://www.bis.gov/enforcement/export-violations"
  },
  {
    "agency": "OFAC",
    "source": "Official OFAC civil-penalty index",
    "scope": "OFAC civil-penalty rows from official yearly enforcement pages",
    "indexedRecords": 1058,
    "indexedPeriod": "Official OFAC pages fetched 2026-11-14",
    "status": "Indexed; source rows loaded",
    "notes": "These official OFAC rows are searchable but remain outside Bayesian likelihoods until fully normalized and factor-coded.",
    "sourceUrl": "https://ofac.treasury.gov/civil-penalties-and-enforcement-information"
  },
  {
    "agency": "DOJ",
    "source": "Official DOJ NSD export-control/sanctions news",
    "scope": "DOJ NSD export-control and sanctions press releases",
    "indexedRecords": 290,
    "indexedPeriod": "Official DOJ pages fetched 2026-11-14",
    "status": "Indexed; source rows loaded",
    "notes": "These official DOJ rows are searchable but remain outside Bayesian likelihoods until fully normalized and factor-coded.",
    "sourceUrl": "https://www.justice.gov/nsd/export-control-news"
  },
  {
    "agency": "Multi-jurisdiction",
    "source": "Sanctions Expert feed",
    "scope": "U.S. and non-U.S. sanctions, export-control, AML, designation, guidance, and enforcement briefs",
    "indexedRecords": 239,
    "indexedPeriod": "Feed fetched 2026-11-14",
    "status": "Third-party feed indexed; official-source review needed for model coding",
    "notes": "Feed items are searchable in the historical explorer and category search. They are not used for Bayesian likelihoods until verified against official sources and normalized into the full case schema.",
    "sourceUrl": "https://feed.sanctionsexpert.com/feed"
  }
];
