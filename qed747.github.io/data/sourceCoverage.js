window.SOURCE_COVERAGE = [
  {
    agency: "OFAC",
    source: "Civil Penalties and Enforcement Information",
    scope: "Yearly enforcement charts, 2003-2026",
    indexedRecords: 1052,
    indexedPeriod: "Official OFAC civil-penalty rows fetched from yearly pages where parsable",
    status: "Indexed; needs matter-level coding",
    notes: "OFAC yearly pages list names, dates, number of actions, and penalty/settlement totals. Detailed settlement PDFs should be parsed next for countries, sanctions programs, disclosure posture, root causes, and compliance factors.",
    sourceUrl: "https://ofac.treasury.gov/civil-penalties-and-enforcement-information"
  },
  {
    agency: "DOJ",
    source: "NSD Export Control and Sanctions News",
    scope: "Export-control and sanctions criminal press releases",
    indexedRecords: 274,
    indexedPeriod: "Official DOJ NSD export-control/sanctions news pages fetched from justice.gov",
    status: "Indexed; source rows loaded",
    notes: "DOJ provides a searchable corpus of criminal matters with year, component, topic, title, and press-release text. These records should feed a separate prosecution-probability model.",
    sourceUrl: "https://www.justice.gov/nsd/export-control-news"
  },
  {
    agency: "BIS",
    source: "Export Enforcement news, charging letters, settlements, denial orders",
    scope: "BIS administrative export-control enforcement",
    indexedRecords: 1118,
    indexedPeriod: "Official BIS export-violations index fetched from bis.gov",
    status: "Indexed; source rows loaded",
    notes: "BIS public pages expose administrative export-violation case IDs, recent settlement and administrative documents, and charging letters. The prototype now treats this as an indexed source family and uses coded exemplars for scoring.",
    sourceUrl: "https://www.bis.gov/enforcement"
  },
  {
    agency: "DDTC",
    source: "Consent agreements and AECA/ITAR enforcement records",
    scope: "Defense articles, technical data, brokering, and defense services",
    indexedRecords: 18,
    indexedPeriod: "Consent-agreement corpus seeded from public DDTC records and DTAG-reviewed agreements",
    status: "Indexed; seed matters coded",
    notes: "DDTC public records and DTAG materials identify consent agreements and proposed charging letters. The app now includes representative ITAR matters while keeping DDTC as a distinct model family.",
    sourceUrl: "https://www.pmddtc.state.gov/"
  }
];
