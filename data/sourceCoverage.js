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
    "agency": "DOJ",
    "source": "Recent official DOJ export-control feed",
    "scope": "Post-workbook DOJ export-control and sanctions news checked against justice.gov",
    "indexedRecords": 2,
    "indexedPeriod": "Official DOJ feed checked 2026-08-14",
    "status": "Loaded and normalized for Bayesian scoring",
    "notes": "Recent post-workbook DOJ matters are normalized as overlay records so the scoring model includes the latest official entries identified after the July 22 workbook update.",
    "sourceUrl": "https://www.justice.gov/nsd/export-control-news"
  }
];
