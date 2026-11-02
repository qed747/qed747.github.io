(function () {
  "use strict";

  const cases = window.SANCTIONS_CASES || [];
  const sourceCoverage = window.SOURCE_COVERAGE || [];
  const sourceIndex = window.SOURCE_INDEX || [];
  const countryOptions = window.COUNTRY_OPTIONS || [];
  const labels = {
    routine: "Routine commercial transaction",
    dual_use: "Controlled dual-use export/reexport",
    sanctions_services: "Sanctions-sensitive services or payment",
    defense_tech: "Defense, military, aerospace, AI, or semiconductor technology",
    general_goods: "General goods",
    semiconductors_ai: "Semiconductors, AI, advanced computing",
    aerospace_aviation: "Aerospace or aviation",
    defense_services: "Defense services or military training",
    oil_gas_energy: "Oil, gas, petrochemical, or energy",
    financial_services: "Financial, securities, or payment services",
    maritime_logistics: "Maritime, freight forwarding, or logistics",
    encryption_electronics: "Electronics, encryption, sensors, or telecom",
    restricted_party: "Restricted party or ownership concern",
    military_end_use: "Military, intelligence, WMD, or defense end use",
    red_flags: "Red flags or evasive behavior",
    transshipment: "Intermediary route or unusual logistics path",
    no_license: "License likely required or unresolved",
    us_origin: "U.S.-origin goods, software, technology, or services",
    management_awareness: "Management awareness or ignored warning signs",
    weak_controls: "Weak screening, classification, or compliance controls",
    voluntary_disclosure: "Voluntary self-disclosure",
    remediation: "Remediation, hold, or license escalation",
    unknown: "Unknown or not classified",
    ear99: "EAR99 / no listed control",
    eccn: "ECCN-controlled",
    itar: "ITAR/defense article or service"
  };

  const priorByArchetype = {
    routine: 0.04,
    dual_use: 0.1,
    sanctions_services: 0.12,
    defense_tech: 0.18
  };

  const policyModifiers = {
    restricted_party: 2.2,
    military_end_use: 2.1,
    red_flags: 2.0,
    transshipment: 1.45,
    no_license: 2.35,
    us_origin: 1.35,
    management_awareness: 1.65,
    weak_controls: 1.4,
    voluntary_disclosure: 0.62,
    remediation: 0.7,
    unknown: 1.35,
    ear99: 0.82,
    eccn: 1.4,
    itar: 1.8
  };

  const sensitiveCountries = new Set(["Russia", "China", "Iran", "Syria", "Cuba", "North Korea", "Belarus"]);
  const aggravatingFactorKeys = [
    "restricted_party",
    "military_end_use",
    "red_flags",
    "transshipment",
    "no_license",
    "us_origin",
    "management_awareness",
    "weak_controls"
  ];
  const mitigatingFactorKeys = ["voluntary_disclosure", "remediation"];
  const countryAliases = {
    "United Arab Emirates": ["United Arab Emirates", "UAE", "U.A.E.", "Dubai", "Abu Dhabi"],
    "China": ["China", "Chinese", "Hong Kong", "PRC"],
    "Russia": ["Russia", "Russian Federation", "Russian"],
    "Iran": ["Iran", "Iranian"],
    "Syria": ["Syria", "Syrian"],
    "Cuba": ["Cuba", "Cuban"],
    "Sudan": ["Sudan", "Sudanese"],
    "North Korea": ["North Korea", "DPRK", "Korea, North"]
  };

  const guidanceSources = [
    {
      id: "bis-russia-belarus",
      title: "BIS Russia and Belarus Export Controls",
      agency: "BIS",
      url: "https://www.bis.gov/licensing/country-guidance/russia-belarus-export-controls",
      topics: ["russia", "belarus", "export controls", "license", "ear", "consumer goods", "luxury goods", "country guidance"],
      summary: "Use for Russia/Belarus export controls, license requirements, FAQs, red flags, and compliance resources."
    },
    {
      id: "ofac-russia-faqs",
      title: "OFAC Russian Harmful Foreign Activities Sanctions FAQs",
      agency: "OFAC",
      url: "https://ofac.treasury.gov/faqs/topic/6626",
      topics: ["russia", "sanctions", "ofac", "services", "blocked persons", "e.o. 14024", "ukraine"],
      summary: "Use for Russia sanctions questions, blocked persons, services restrictions, and OFAC Russia-related FAQs."
    },
    {
      id: "ofac-faqs",
      title: "OFAC Frequently Asked Questions",
      agency: "OFAC",
      url: "https://ofac.treasury.gov/faqs",
      topics: ["sanctions", "screening", "blocked property", "licenses", "ownership", "50 percent rule", "ofac"],
      summary: "Use for sanctions scope questions, blocked property, licenses, ownership, and program-specific FAQ issues."
    },
    {
      id: "ofac-programs",
      title: "OFAC Sanctions Programs and Country Information",
      agency: "OFAC",
      url: "https://ofac.treasury.gov/sanctions-programs-and-country-information",
      topics: ["sanctions", "country", "destination", "program", "jurisdiction", "ofac"],
      summary: "Use to identify the relevant sanctions program and country-specific restrictions before approving a transaction."
    },
    {
      id: "ofac-framework",
      title: "OFAC Framework for Compliance Commitments",
      agency: "OFAC",
      url: "https://ofac.treasury.gov/recent-actions/20190502_33",
      topics: ["controls", "compliance program", "management", "screening", "remediation", "training", "testing"],
      summary: "Use for sanctions compliance-program expectations and root-cause themes seen in OFAC enforcement."
    },
    {
      id: "bis-faqs",
      title: "BIS Guidance and Frequently Asked Questions",
      agency: "BIS",
      url: "https://media.bis.gov/guidance-frequently-asked-questions",
      topics: ["export controls", "classification", "license", "ear", "eccn", "reexport", "deemed export", "bis"],
      summary: "Use for EAR classification, licensing, reexports, deemed exports, and BIS procedural questions."
    },
    {
      id: "bis-red-flags",
      title: "BIS Know Your Customer Guidance and Red Flags",
      agency: "BIS",
      url: "https://www.bis.gov/node/1533",
      topics: ["red flags", "end use", "end user", "customer", "evasion", "transshipment", "documentation"],
      summary: "Use for abnormal transaction circumstances, end-use/end-user diligence, and escalation triggers."
    },
    {
      id: "bis-end-use",
      title: "BIS End-User, End-Use, and U.S. Person Controls",
      agency: "BIS",
      url: "https://www.bis.gov/node/20522",
      topics: ["military end use", "entity list", "us person", "part 744", "end user", "end use", "restricted party"],
      summary: "Use for restricted parties, end-use controls, Entity List issues, and U.S. person support restrictions."
    },
    {
      id: "doj-vsd",
      title: "DOJ NSD Export Control and Sanctions VSD Policy",
      agency: "DOJ NSD",
      url: "https://www.justice.gov/archives/opa/pr/department-justice-revises-and-re-issues-export-control-and-sanctions-enforcement-policy",
      topics: ["voluntary disclosure", "willful", "criminal", "cooperation", "remediation", "doj", "nsd"],
      summary: "Use for potential criminal export-control or sanctions violations, disclosure posture, cooperation, and remediation."
    },
    {
      id: "ddtc-compliance",
      title: "DDTC Compliance Resources",
      agency: "State/DDTC",
      url: "https://deccs.pmddtc.state.gov/ddtc_public?id=ddtc_public_portal_compliance_landing",
      topics: ["itar", "defense", "usml", "defense services", "ddtc", "agreement", "registration"],
      summary: "Use for ITAR, defense articles/services, USML, DDTC registration, agreements, and compliance-program expectations."
    }
  ];

  const elements = {};
  let lastAdvisorMemo = "";

  document.addEventListener("DOMContentLoaded", () => {
    bindElements();
    hydrateFilters();
    bindEvents();
    renderStats();
    renderHistorical();
    renderPatterns();
    renderReviewQueue();
  });

  function bindElements() {
    [
      "statsGrid",
      "activeView",
      "coverageGrid",
      "searchInput",
      "categoryField",
      "categoryTerm",
      "companyFilter",
      "agencyFilter",
      "countryFilter",
      "productFilter",
      "disclosureFilter",
      "factorFilter",
      "recordTypeFilter",
      "yearFilter",
      "runSearch",
      "resetFilters",
      "resultSummary",
      "agencyChart",
      "productChart",
      "penaltyBreakdown",
      "penaltyMeasure",
      "penaltyExplorerChart",
      "caseList",
      "sourceIndexSection",
      "exportCsv",
      "exportJson",
      "patternSummary",
      "countryPenaltyChart",
      "productPenaltyChart",
      "disclosurePenaltyChart",
      "factorPenaltyChart",
      "comboPatternTable",
      "similarityCase",
      "similarityBasis",
      "runSimilarity",
      "similarityOutput",
      "reviewQueueType",
      "reviewJurisdiction",
      "reviewAgency",
      "reviewQueueSummary",
      "reviewQueueList",
      "exportReviewQueue",
      "destination",
      "intermediary",
      "riskForm",
      "riskOutput",
      "advisorForm",
      "advisorQuestion",
      "advisorFocus",
      "advisorUseTransaction",
      "advisorOutput",
      "downloadAdvisorMemo"
    ].forEach((id) => {
      elements[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => selectTab(tab.dataset.tab));
    });

    ["searchInput", "categoryField", "categoryTerm", "companyFilter", "agencyFilter", "countryFilter", "productFilter", "disclosureFilter", "factorFilter", "recordTypeFilter", "yearFilter"].forEach((id) => {
      ["input", "change", "search", "keyup"].forEach((eventName) => {
        addListener(elements[id], eventName, renderHistorical);
      });
    });

    addListener(elements.runSearch, "click", renderHistorical);
    addListener(elements.runSimilarity, "click", renderSimilarity);
    addListener(elements.penaltyBreakdown, "change", renderHistorical);
    addListener(elements.penaltyMeasure, "change", renderHistorical);

    addListener(elements.resetFilters, "click", () => {
      elements.searchInput.value = "";
      elements.categoryField.value = "all";
      elements.categoryTerm.value = "";
      elements.companyFilter.value = "All";
      elements.agencyFilter.value = "All";
      elements.countryFilter.value = "All";
      elements.productFilter.value = "All";
      elements.disclosureFilter.value = "All";
      elements.factorFilter.value = "All";
      elements.recordTypeFilter.value = "All";
      elements.yearFilter.value = "All";
      renderHistorical();
    });

    addListener(elements.exportCsv, "click", exportCurrentCsv);
    addListener(elements.exportJson, "click", exportCurrentJson);
    addListener(elements.reviewQueueType, "change", () => {
      updateReviewFilterOptions();
      renderReviewQueue();
    });
    ["reviewJurisdiction", "reviewAgency"].forEach((id) => {
      addListener(elements[id], "change", renderReviewQueue);
    });
    addListener(elements.exportReviewQueue, "click", exportReviewQueueCsv);
    addListener(elements.riskForm, "submit", (event) => {
      event.preventDefault();
      renderRisk(scoreTransaction(readTransaction()));
    });
    addListener(elements.advisorForm, "submit", (event) => {
      event.preventDefault();
      renderAdvisorResponse();
    });
    addListener(elements.downloadAdvisorMemo, "click", downloadAdvisorMemo);
  }

  function addListener(element, eventName, handler) {
    if (element && typeof element.addEventListener === "function") {
      element.addEventListener(eventName, handler);
    }
  }

  function selectTab(tabName) {
    const selectedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabName);
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === tabName);
    });
    if (elements.activeView && selectedTab) {
      elements.activeView.textContent = `Viewing: ${selectedTab.textContent}`;
    }
    const panel = document.getElementById(tabName);
    if (panel) {
      requestAnimationFrame(() => panel.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  function hydrateFilters() {
    const companyNames = unique([...cases.map((item) => item.name), ...sourceIndex.map((item) => item.name)]).sort((a, b) => a.localeCompare(b));
    const agencies = unique([...cases.map((item) => item.agency), ...sourceIndex.map((item) => item.agency)]);
    const factorValues = unique(cases.flatMap((item) => item.factors)).sort((a, b) => (labels[a] || a).localeCompare(labels[b] || b));
    const recordTypes = unique([...cases.map((item) => item.recordType || "Workbook normalized case"), ...sourceIndex.map((item) => item.recordType)]).sort();
    const years = unique([...cases.map((item) => yearOf(item.date)), ...sourceIndex.map((item) => yearOf(item.date))]).sort((a, b) => b.localeCompare(a));
    fillSelect(elements.companyFilter, ["All", ...companyNames]);
    fillSelect(elements.agencyFilter, ["All", ...agencies]);
    fillSelect(elements.countryFilter, ["All", ...unique(cases.flatMap((item) => item.countries)).sort()]);
    fillSelect(elements.productFilter, ["All", ...unique(cases.map((item) => item.productCategory)).sort()], labels);
    fillSelect(elements.disclosureFilter, ["All", ...unique(cases.map((item) => item.disclosure)).sort()]);
    fillSelect(elements.factorFilter, ["All", ...factorValues], labels);
    fillSelect(elements.recordTypeFilter, ["All", ...recordTypes]);
    fillSelect(elements.yearFilter, ["All", ...years]);
    fillSelect(elements.similarityCase, cases.map((item) => item.id), Object.fromEntries(cases.map((item) => [item.id, `${item.name} (${item.date})`])));
    hydrateReviewFilters();
    const prospectiveCountries = unique([...countryOptions, ...cases.flatMap((item) => item.countries)]).sort((a, b) => a.localeCompare(b));
    fillSelect(elements.destination, ["", ...prospectiveCountries], { "": "Select destination country" });
    fillSelect(elements.intermediary, ["", ...prospectiveCountries], { "": "No intermediary / not applicable" });

  }

  function fillSelect(select, options, display = {}) {
    if (!select) return;
    select.innerHTML = "";
    options.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = display[value] || value;
      select.appendChild(option);
    });
  }

  function hydrateReviewFilters() {
    fillSelect(elements.reviewQueueType, [
      "All pending review",
      "Official agency/index records",
      "News/feed items pending verification"
    ]);
    updateReviewFilterOptions(false);
  }

  function updateReviewFilterOptions(preserve = true) {
    if (!elements.reviewJurisdiction || !elements.reviewAgency) return;
    const previousJurisdiction = preserve ? elements.reviewJurisdiction.value : "All";
    const previousAgency = preserve ? elements.reviewAgency.value : "All";
    const scopedRows = sourceIndex.filter((item) => reviewQueueMatchesType(item, elements.reviewQueueType.value));
    const jurisdictions = ["All", ...unique(scopedRows.map((item) => item.jurisdiction || "Not stated")).sort()];
    const agencies = ["All", ...unique(scopedRows.map((item) => item.agency || "Unknown agency")).sort((a, b) => a.localeCompare(b))];
    fillSelect(elements.reviewJurisdiction, jurisdictions);
    fillSelect(elements.reviewAgency, agencies);
    elements.reviewJurisdiction.value = jurisdictions.includes(previousJurisdiction) ? previousJurisdiction : "All";
    elements.reviewAgency.value = agencies.includes(previousAgency) ? previousAgency : "All";
  }

  function renderStats() {
    const totalPenalty = cases.reduce((sum, item) => sum + (item.amountUsd || 0), 0);
    const indexedRecords = sourceCoverage.reduce((sum, item) => sum + (item.indexedRecords || 0), 0);
    const sourceFamilies = sourceCoverage.length || unique(cases.map((item) => item.agency)).length;
    const agencies = unique(cases.map((item) => item.agency));

    elements.statsGrid.innerHTML = [
      stat(cases.length, "workbook-normalized enforcement records"),
      stat(indexedRecords, "records loaded from workbook and recent agency overlays"),
      stat(formatMoney(totalPenalty), "listed penalties in loaded universe", "money"),
      stat(sourceFamilies, `${agencies.length} agencies/source groupings represented`)
    ].join("");

    renderSourceCoverage();
  }

  function renderSourceCoverage() {
    if (!elements.coverageGrid) return;
    const preferredOrder = ["OFAC", "BIS/DDTC/DOJ", "BIS", "BIS/DOJ/DDTC", "Multi-jurisdiction"];
    const visibleCoverage = sourceCoverage
      .filter((item) => item.agency !== "Logistics")
      .sort((a, b) => {
        const aIndex = preferredOrder.indexOf(a.agency);
        const bIndex = preferredOrder.indexOf(b.agency);
        return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
      });
    const coverageCards = visibleCoverage.map((item) => `
      <article class="coverage-card">
        <h3><span>${escapeHtml(item.agency)}</span><strong>${item.indexedRecords == null ? "TBD" : item.indexedRecords + "+"}</strong></h3>
        <p><b>${escapeHtml(item.source)}</b></p>
        <p>${escapeHtml(item.scope)}</p>
        <p><span class="pill">${escapeHtml(item.status)}</span></p>
        <p>${escapeHtml(item.notes)}</p>
        ${primarySourceHref(item) ? `<a href="${escapeAttribute(primarySourceHref(item))}" target="_blank" rel="noreferrer">${escapeHtml(sourceLinkLabel(item))}</a>` : ""}
      </article>
    `).join("");
    elements.coverageGrid.innerHTML = coverageCards + recentNewsCard();
  }

  function recentNewsCard() {
    const feedItems = sourceIndex
      .filter((item) => String(item.recordType || "").includes("Sanctions Expert"))
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
      .slice(0, 6);
    if (!feedItems.length) return "";
    const feedCoverage = sourceCoverage.find((item) => item.source === "Sanctions Expert feed");
    const checkedDate = String(feedCoverage?.indexedPeriod || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
    const newestItemDate = String(feedItems[0]?.date || "");
    const noCurrentMonthItems = checkedDate.slice(0, 7) && checkedDate.slice(0, 7) !== newestItemDate.slice(0, 7);
    const freshnessNote = checkedDate
      ? `Checked through ${shortDate(checkedDate)}.${noCurrentMonthItems ? ` No ${new Date(`${checkedDate}T12:00:00`).toLocaleString("en-US", { month: "long" })} feed briefs have been published yet; the latest available items are shown below.` : ""}`
      : "";
    return `
      <article class="coverage-card coverage-news-card">
        <div class="coverage-news-head">
          <div>
            <h3>Recent sanctions/export-control news</h3>
            <p>Latest indexed feed briefs, including U.S. and non-U.S. developments. These are horizon-scanning records until official-source review.</p>
            ${freshnessNote ? `<p><strong>${escapeHtml(freshnessNote)}</strong></p>` : ""}
          </div>
        </div>
        <div class="news-list">
          ${feedItems.map((item) => newsItemHtml(item)).join("")}
        </div>
      </article>
    `;
  }

  function newsItemHtml(item) {
    const href = primarySourceHref(item);
    const body = `
              <span class="news-date">${escapeHtml(shortDate(item.date))}</span>
              <strong>${escapeHtml(item.name)}</strong>
              <span>${escapeHtml([item.agency, item.jurisdiction, item.actionType].filter(Boolean).join(" / "))}</span>
    `;
    return href
      ? `<a class="news-item" href="${escapeAttribute(href)}" target="_blank" rel="noreferrer">${body}</a>`
      : `<div class="news-item news-item-muted">${body}<span>Primary source pending</span></div>`;
  }

  function primarySourceHref(item) {
    const sourceUrl = item.primarySourceUrl || item.sourceUrl || "";
    return isSanctionsExpertUrl(sourceUrl) ? "" : sourceUrl;
  }

  function isSanctionsExpertUrl(value) {
    try {
      const host = new URL(value).hostname.toLowerCase();
      return host === "feed.sanctionsexpert.com" || host.endsWith(".sanctionsexpert.com") || host === "sanctionsexpert.com";
    } catch {
      return false;
    }
  }

  function sourceLinkLabel(item) {
    return String(item.recordType || "").includes("Sanctions Expert") ? "Primary source" : "Official source";
  }

  function stat(value, label, variant = "") {
    const variantClass = variant ? ` stat-value-${variant}` : "";
    return `<div class="stat"><strong class="stat-value${variantClass}">${escapeHtml(String(value))}</strong><span>${escapeHtml(label)}</span></div>`;
  }

  function renderHistorical() {
    const filtered = currentFilteredCases();
    const sourceMatches = currentSourceIndexMatches();
    const historicalRows = combinedHistoricalRows(filtered, sourceMatches);
    const totalPenalty = historicalRows.reduce((sum, item) => sum + (item.amountUsd || 0), 0);
    const q = activeSearchLabel();
    elements.resultSummary.textContent = `${historicalRows.length} historical records match${q ? ` "${q}"` : " the current filters"}: ${filtered.length} fully coded and ${sourceMatches.length} source-index. Listed penalties in matching records: ${formatMoney(totalPenalty)}.`;
    renderCharts(filtered, sourceMatches);
    renderPenaltyExplorer(filtered, sourceMatches);
    renderCaseList(filtered, sourceMatches);
    if (elements.sourceIndexSection) elements.sourceIndexSection.innerHTML = "";
  }

  function currentFilteredCases() {
    const q = elements.searchInput.value.trim().toLowerCase();
    const selectedCompany = elements.companyFilter.value;
    const agency = elements.agencyFilter.value;
    const country = elements.countryFilter.value;
    const product = elements.productFilter.value;
    const disclosure = elements.disclosureFilter.value;
    const factor = elements.factorFilter.value;
    const recordType = elements.recordTypeFilter.value;
    const year = elements.yearFilter.value;

    return cases.filter((item) => {
      const haystack = [
        item.name,
        item.agency,
        item.summary,
        item.posture,
        item.disclosure,
        item.productCategory,
        ...item.countries,
        ...item.products,
        ...item.factors
      ].join(" ").toLowerCase();

        return (!q || haystack.includes(q)) &&
        categorySearchMatches(item) &&
        (selectedCompany === "All" || item.name === selectedCompany) &&
        agencyMatches(item.agency, agency) &&
        (country === "All" || item.countries.includes(country)) &&
        productMatches(item, product) &&
        (disclosure === "All" || item.disclosure === disclosure) &&
        (factor === "All" || (item.factors || []).includes(factor)) &&
        (recordType === "All" || (item.recordType || "Workbook normalized case") === recordType) &&
        (year === "All" || yearOf(item.date) === year);
    });
  }

  function currentSourceIndexMatches() {
    const q = elements.searchInput.value.trim().toLowerCase();
    const selectedCompany = elements.companyFilter.value;
    const agency = elements.agencyFilter.value;
    const country = elements.countryFilter.value;
    const product = elements.productFilter.value;
    const disclosure = elements.disclosureFilter.value;
    const factor = elements.factorFilter.value;
    const recordType = elements.recordTypeFilter.value;
    const year = elements.yearFilter.value;

    return sourceIndex.filter((item) => {
      const haystack = [
        item.name,
        item.agency,
        item.date,
        item.recordType,
        item.codingStatus,
        item.sourceTitle,
        item.jurisdiction,
        item.actionType,
        ...(item.tags || [])
      ].join(" ").toLowerCase();

      return (!q || haystack.includes(q)) &&
        categorySearchMatches(item) &&
        (selectedCompany === "All" || item.name === selectedCompany) &&
        agencyMatches(item.agency, agency) &&
        (factor === "All" || sourceIndexFactorMatches(item, factor)) &&
        (recordType === "All" || item.recordType === recordType) &&
        (year === "All" || yearOf(item.date) === year) &&
        sourceIndexFilterMatches(item, { country, product, disclosure });
    });
  }

  function categorySearchMatches(item) {
    const term = elements.categoryTerm.value.trim().toLowerCase();
    if (!term) return true;
    return categoryValues(item, elements.categoryField.value)
      .join(" ")
      .toLowerCase()
      .includes(term);
  }

  function categoryValues(item, field) {
    const valueGroups = {
      company: [item.name],
      agency: [item.agency],
      country: item.countries || [],
      product: [labels[item.productCategory] || item.productCategory, ...(item.products || [])],
      disclosure: [item.disclosure],
      factor: (item.factors || []).map((factor) => labels[factor] || factor),
      recordType: [item.recordType || "Workbook normalized case", item.codingStatus, item.jurisdiction, item.actionType],
      year: [yearOf(item.date)],
      all: []
    };
    valueGroups.all = [
      ...valueGroups.company,
      ...valueGroups.agency,
      ...valueGroups.country,
      ...valueGroups.product,
      ...valueGroups.disclosure,
      ...valueGroups.factor,
      ...valueGroups.recordType,
      ...valueGroups.year,
      item.summary,
      item.posture,
      item.sourceTitle,
      item.jurisdiction,
      item.actionType,
      ...(item.tags || [])
    ];
    return (valueGroups[field] || valueGroups.all).filter(Boolean);
  }

  function sourceIndexFilterMatches(item, filters) {
    const productOk = filters.product === "All";
    const disclosureOk = filters.disclosure === "All" || sourceIndexDisclosureMatches(item, filters.disclosure);
    const countryOk = filters.country === "All" || sourceIndexCountryMatches(item, filters.country);
    return countryOk && productOk && disclosureOk;
  }

  function sourceIndexCountryMatches(item, country) {
    if ((item.countries || []).includes(country)) return true;
    const aliases = countryAliases[country] || [country];
    const haystack = [
      item.name,
      item.recordType,
      item.codingStatus,
      item.sourceTitle,
      item.sourceUrl,
      item.jurisdiction,
      item.actionType,
      ...(item.tags || [])
    ].join(" ").toLowerCase();
    return aliases.some((alias) => haystack.includes(alias.toLowerCase()));
  }

  function sourceIndexDisclosureMatches(item, disclosure) {
    const itemDisclosure = String(item.disclosure || "").toLowerCase();
    const selected = String(disclosure || "").toLowerCase();
    if (!itemDisclosure) return false;
    if (selected.includes("voluntary")) return itemDisclosure.includes("voluntary");
    if (selected.includes("not specified")) return itemDisclosure.includes("not specified");
    return itemDisclosure === selected;
  }

  function sourceIndexFactorMatches(item, factor) {
    const haystack = categoryValues(item, "all").join(" ").toLowerCase();
    const label = labels[factor] || factor;
    return haystack.includes(label.toLowerCase()) ||
      haystack.includes(String(factor).replace(/_/g, " ").toLowerCase());
  }

  function productMatches(item, selectedProduct) {
    if (selectedProduct === "All") return true;
    if (item.productCategory === selectedProduct) return true;
    const haystack = [
      item.productCategory,
      ...(item.products || []),
      ...(item.factors || []),
      item.summary || ""
    ].join(" ").toLowerCase();

    if (selectedProduct === "controlled_goods") {
      return [
        "controlled",
        "electronic",
        "component",
        "technology",
        "technical data",
        "software",
        "no_license",
        "us_origin",
        "restricted_party"
      ].some((needle) => haystack.includes(needle));
    }

    if (selectedProduct === "maritime_logistics") {
      return haystack.includes("logistics") || haystack.includes("freight") || haystack.includes("shipment");
    }

    return haystack.includes(selectedProduct.replace(/_/g, " "));
  }

  function renderCharts(items, sourceMatches = []) {
    const historicalRows = combinedHistoricalRows(items, sourceMatches);
    elements.agencyChart.innerHTML = barChart(countBy(historicalRows, "agency"));
    elements.productChart.innerHTML = barChart(countBy(historicalRows.map((item) => ({
      ...item,
      productOrType: labels[item.productCategory] || item.productCategory || item.recordType || "Source-index record"
      })), "productOrType"));
  }

  function renderPenaltyExplorer(codedRows, sourceRows) {
    if (!elements.penaltyExplorerChart) return;
    const breakdown = elements.penaltyBreakdown.value;
    const measure = elements.penaltyMeasure.value;
    const rows = penaltyExplorerRows(codedRows, sourceRows, breakdown);
    const groups = new Map();

    rows.forEach((item) => {
      breakdownKeys(item, breakdown).forEach((key) => {
        if (!groups.has(key)) groups.set(key, { count: 0, penalty: 0 });
        const group = groups.get(key);
        group.count += 1;
        group.penalty += item.amountUsd || 0;
      });
    });

    const chartRows = Array.from(groups.entries()).map(([key, value]) => ({
      key,
      value: measure === "count" ? value.count : value.penalty,
      count: value.count,
      penalty: value.penalty
    })).filter((row) => row.value > 0)
      .sort((a, b) => {
        if (breakdown === "year") return b.key.localeCompare(a.key);
        return b.value - a.value;
      })
      .slice(0, 20);

    if (!chartRows.length) {
      elements.penaltyExplorerChart.innerHTML = `<p class="field-note">No matching records have enough data for this breakdown.</p>`;
      return;
    }

    const max = Math.max(...chartRows.map((row) => row.value));
    elements.penaltyExplorerChart.innerHTML = chartRows.map((row) => {
      const width = Math.max(6, Math.round((row.value / max) * 100));
      const valueLabel = measure === "count" ? `${row.count}` : formatMoney(row.penalty);
      return `<div class="bar-row"><span>${escapeHtml(row.key)}</span><div class="bar"><span style="width:${width}%"></span></div><b>${escapeHtml(valueLabel)}</b></div>`;
    }).join("");
  }

  function breakdownKeys(item, breakdown) {
    if (breakdown === "year") return [String(item.date || "").slice(0, 4) || "Unknown"];
    if (breakdown === "agency") return [item.agency || "Unknown"];
    if (breakdown === "vsd") return [voluntaryDisclosureStatus(item)];
    return item.countries && item.countries.length ? item.countries : [];
  }

  function penaltyExplorerRows(codedRows, sourceRows, breakdown) {
    const rows = combinedHistoricalRows(codedRows, sourceRows);
    if (breakdown === "country") return rows.filter((item) => item.countries && item.countries.length);
    if (breakdown === "vsd") return rows.filter((item) => item.disclosure || item.factors);
    return rows;
  }

  function renderPatterns() {
    if (!elements.patternSummary) return;
    const penaltyCases = cases.filter((item) => item.amountUsd != null && item.amountUsd > 0);
    elements.patternSummary.innerHTML = `
      <strong>What this shows:</strong> each table groups the normalized workbook enforcement records by one feature and reports how many records fall in that group (<b>n</b>), plus the median, average, and total listed penalties for those cases.
      <br><strong>How to read it:</strong> higher <b>n</b> means the feature appears more often in the loaded enforcement universe; higher median/average/total penalties show penalty patterns within that universe.
      <br><strong>Limit:</strong> these are descriptive patterns, not causal findings. Small groups, especially n below 3, should be treated as directional only.
    `;
    elements.countryPenaltyChart.innerHTML = metricTable(groupPenalty(cases, (item) => item.countries));
    elements.productPenaltyChart.innerHTML = metricTable(groupPenalty(cases, (item) => [labels[item.productCategory] || item.productCategory]));
    elements.disclosurePenaltyChart.innerHTML = metricTable(groupPenalty(cases, (item) => [item.disclosure || "Unknown"]));
    elements.factorPenaltyChart.innerHTML = metricTable(groupPenalty(cases, (item) => item.factors.map((factor) => labels[factor] || factor)));
    elements.comboPatternTable.innerHTML = combinationPatternTable();
    renderSimilarity();
  }

  function groupPenalty(items, keyGetter) {
    const groups = new Map();
    items.forEach((item) => {
      if (item.amountUsd == null || item.amountUsd <= 0) return;
      keyGetter(item).filter(Boolean).forEach((key) => {
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item.amountUsd);
      });
    });
    return Array.from(groups.entries()).map(([key, values]) => ({
      key,
      count: values.length,
      total: values.reduce((sum, value) => sum + value, 0),
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
      median: median(values)
    })).sort((a, b) => b.count - a.count || b.total - a.total).slice(0, 8);
  }

  function metricTable(rows) {
    if (!rows.length) return `<p class="field-note">No penalty data available.</p>`;
    return `
      <div class="table-scroll">
      <table class="metric-table">
        <thead>
          <tr>
            <th>Group</th>
            <th>n</th>
            <th>Median</th>
            <th>Average</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.key)}</td>
              <td>${row.count}</td>
              <td>${formatMoney(row.median)}</td>
              <td>${formatMoney(row.average)}</td>
              <td>${formatMoney(row.total)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      </div>
    `;
  }

  function combinationPatternTable() {
    const penaltyCases = cases.filter((item) => item.amountUsd != null && item.amountUsd > 0);
    const combos = new Map();

    penaltyCases.forEach((item) => {
      const features = combinationFeatures(item);
      featureCombos(features, 2).concat(featureCombos(features, 3)).forEach((combo) => {
        const key = combo.join(" + ");
        if (!combos.has(key)) combos.set(key, []);
        combos.get(key).push(item);
      });
    });

    const rows = Array.from(combos.entries()).map(([key, comboCases]) => {
      const comboIds = new Set(comboCases.map((item) => item.id));
      const comparison = penaltyCases.filter((item) => !comboIds.has(item.id));
      const comboPenalties = comboCases.map((item) => item.amountUsd);
      const comparisonPenalties = comparison.map((item) => item.amountUsd);
      return {
        key,
        count: comboCases.length,
        median: median(comboPenalties),
        comparisonMedian: comparisonPenalties.length ? median(comparisonPenalties) : 0,
        lift: comparisonPenalties.length ? median(comboPenalties) / Math.max(1, median(comparisonPenalties)) : 0,
        cases: comboCases.map((item) => item.name).slice(0, 3).join("; ")
      };
    }).filter((row) => row.count >= 2)
      .sort((a, b) => b.lift - a.lift || b.count - a.count)
      .slice(0, 10);

    if (!rows.length) return `<p class="field-note">Not enough repeated feature combinations in normalized penalty records yet.</p>`;

    return `
      <div class="table-scroll">
      <table class="metric-table combo-table">
        <thead>
          <tr>
            <th>Shared features</th>
            <th>n</th>
            <th>Median with combo</th>
            <th>Median without combo</th>
            <th>Ratio</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.key)}<br><span class="field-note">${escapeHtml(row.cases)}</span></td>
              <td>${row.count}</td>
              <td>${formatMoney(row.median)}</td>
              <td>${formatMoney(row.comparisonMedian)}</td>
              <td>${row.lift.toFixed(1)}x</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      </div>
    `;
  }

  function combinationFeatures(item) {
    return unique([
      ...(item.countries || []).map((country) => `country: ${country}`),
      `product: ${labels[item.productCategory] || item.productCategory}`,
      `agency: ${item.agency}`,
      `disclosure: ${voluntaryDisclosureStatus(item)}`,
      ...(item.factors || []).map((factor) => `factor: ${labels[factor] || factor}`)
    ]).filter(Boolean);
  }

  function featureCombos(features, size) {
    const output = [];
    const walk = (start, combo) => {
      if (combo.length === size) {
        output.push(combo);
        return;
      }
      for (let index = start; index < features.length; index += 1) {
        walk(index + 1, [...combo, features[index]]);
      }
    };
    walk(0, []);
    return output;
  }

  function renderSimilarity() {
    if (!elements.similarityOutput) return;
    const selected = cases.find((item) => item.id === elements.similarityCase.value) || cases[0];
    if (!selected) {
      elements.similarityOutput.innerHTML = `<div class="empty-state">No normalized records loaded.</div>`;
      return;
    }
    const matches = cases.filter((item) => item.id !== selected.id)
      .map((item) => ({ item, score: similarityScore(selected, item, elements.similarityBasis.value) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    elements.similarityOutput.innerHTML = `
      <div class="source-index-head">
        <h3>Most Similar To ${escapeHtml(selected.name)}</h3>
        <p>The selected current case is compared against other normalized workbook records using overlap in countries, products, agencies, disclosure posture, and risk-factor tags.</p>
      </div>
      ${matches.map(({ item, score }) => `
        <article class="case-card">
          <div class="case-title">
            <h3>${escapeHtml(item.name)}</h3>
            <span class="similarity-score">${Math.round(score * 100)}%</span>
          </div>
          <p>${escapeHtml(similarityExplanation(selected, item, elements.similarityBasis.value))}</p>
          <p>${item.amountUsd ? formatMoney(item.amountUsd) : item.posture}</p>
        </article>
      `).join("") || `<div class="empty-state">No similar normalized records found.</div>`}
    `;
  }

  function similarityFeatures(item, basis) {
    const base = [];
    if (basis === "all" || basis === "commercial") {
      base.push(...item.countries.map((country) => `country:${country}`));
      base.push(`product:${item.productCategory}`);
    }
    if (basis === "all") {
      base.push(`agency:${item.agency}`, `posture:${item.posture}`, `disclosure:${item.disclosure}`);
    }
    if (basis === "all" || basis === "factors") {
      base.push(...item.factors.map((factor) => `factor:${factor}`));
    }
    return new Set(base);
  }

  function similarityScore(a, b, basis) {
    const left = similarityFeatures(a, basis);
    const right = similarityFeatures(b, basis);
    const intersection = Array.from(left).filter((feature) => right.has(feature)).length;
    const union = new Set([...left, ...right]).size;
    return union ? intersection / union : 0;
  }

  function similarityExplanation(a, b, basis) {
    const left = similarityFeatures(a, basis);
    const right = similarityFeatures(b, basis);
    const shared = Array.from(left).filter((feature) => right.has(feature)).slice(0, 6);
    if (!shared.length) return "No strong shared normalized features.";
    return `Shared features: ${shared.map((feature) => feature.replace(/^[^:]+:/, "").replace(/_/g, " ")).join(", ")}.`;
  }

  function agencyMatches(itemAgency, selectedAgency) {
    if (selectedAgency === "All") return true;
    const itemAgencies = splitAgency(itemAgency);
    const selectedAgencies = splitAgency(selectedAgency);
    return selectedAgencies.some((agency) => itemAgencies.includes(agency));
  }

  function splitAgency(value) {
    return String(value || "")
      .split("/")
      .map((agency) => agency.trim())
      .filter(Boolean);
  }

  function barChart(counts, display = {}) {
    const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = Math.max(1, ...rows.map(([, count]) => count));
    if (!rows.length) return `<p class="muted">No cases match.</p>`;
    return rows.map(([key, count]) => {
      const width = Math.max(6, Math.round((count / max) * 100));
      return `<div class="bar-row"><span>${escapeHtml(display[key] || key)}</span><div class="bar"><span style="width:${width}%"></span></div><b>${count}</b></div>`;
    }).join("");
  }

  function renderCaseList(items, sourceMatches = []) {
    const q = activeSearchLabel();
    if (!items.length && !sourceMatches.length) {
      elements.caseList.innerHTML = `
        <div class="empty-state">
          <div>
            <h3>No loaded match${q ? ` for "${escapeHtml(q)}"` : ""}</h3>
            <p>The app searches ${cases.length} normalized enforcement records from the July 22, 2026 workbook plus recent official agency-overlay records. This filter combination may not exist in the loaded fields.</p>
            <p><a href="https://ofac.treasury.gov/civil-penalties-and-enforcement-information" target="_blank" rel="noreferrer">Search OFAC civil penalties</a> | <a href="https://www.bis.gov/enforcement" target="_blank" rel="noreferrer">Search BIS enforcement</a> | <a href="https://www.justice.gov/nsd/export-control-news" target="_blank" rel="noreferrer">Search DOJ NSD matters</a> | <a href="https://www.state.gov/bureaus-offices/under-secretary-for-arms-control-and-international-security-affairs/bureau-of-political-military-affairs/directorate-of-defense-trade-controls/" target="_blank" rel="noreferrer">Search State/DDTC</a></p>
          </div>
        </div>`;
      return;
    }

      const sourceHtml = sourceMatches.length ? `
        <div class="source-index-head">
        <h2>Source-Index Historical Records</h2>
        <p>These source-index rows are searchable/exportable immediately. Official rows and third-party feed briefs are kept separate from Bayesian likelihoods until normalized into the full case schema.</p>
      </div>
      ${sourceMatches.sort((a, b) => b.date.localeCompare(a.date)).map((item) => `
        <article class="case-card">
          <div class="case-title">
            <div>
              <h3>${escapeHtml(item.name)}</h3>
              <div class="meta">
                <span class="pill">${escapeHtml(item.agency)}</span>
                ${item.jurisdiction ? `<span class="pill">${escapeHtml(item.jurisdiction)}</span>` : ""}
                ${item.actionType ? `<span class="pill">${escapeHtml(item.actionType)}</span>` : ""}
                <span class="pill">${escapeHtml(item.date)}</span>
                <span class="pill">${escapeHtml(item.recordType)}</span>
                <span class="pill">${escapeHtml(item.codingStatus)}</span>
                ${confidenceBadge(item)}
              </div>
            </div>
            <div class="amount">${item.amountUsd == null ? "Amount N/A" : formatMoney(item.amountUsd)}</div>
          </div>
          <p>${sourceIndexDescription(item)}</p>
          ${sourceIndexTags(item)}
          ${sourceFactorTable(item)}
          ${primarySourceLink(item)}
        </article>
      `).join("")}
    ` : "";

      const codedHtml = items.length ? `
      <div class="source-index-head">
        <h2>Workbook-Normalized Enforcement Records</h2>
        <p>These records include normalized model fields and are used by the Bayesian scoring model. Their legal-status labels distinguish proven or admitted violations, agency settlements, allegations, and records whose disposition requires source review.</p>
      </div>
      ${items
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((item) => `
        <article class="case-card">
          <div class="case-title">
            <div>
              <h3>${escapeHtml(item.name)}</h3>
              <div class="meta">
                <span class="pill">${escapeHtml(item.agency)}</span>
                <span class="pill">${escapeHtml(item.date)}</span>
                <span class="pill">${escapeHtml(item.posture)}</span>
                <span class="pill">${escapeHtml(labels[item.productCategory] || item.productCategory)}</span>
                ${legalStatusBadge(item)}
                ${confidenceBadge(item)}
              </div>
            </div>
            <div class="amount">${item.amountUsd ? formatMoney(item.amountUsd) : "Amount N/A"}</div>
          </div>
          ${caseSummaryBlock(item)}
          <div class="tags">
            ${item.countries.map((country) => `<span class="pill">${escapeHtml(country)}</span>`).join("")}
            ${item.factors.map((factor) => `<span class="pill">${escapeHtml(labels[factor] || factor)}</span>`).join("")}
          </div>
          ${factorTable(item)}
          ${primarySourceLink(item)}
        </article>
      `).join("")}
    ` : "";

    elements.caseList.innerHTML = sourceHtml + codedHtml;
  }

  function renderSourceIndexList(items) {
    if (!elements.sourceIndexSection) return;
    if (!items.length) {
      const q = activeSearchLabel();
      elements.sourceIndexSection.innerHTML = q
        ? `<div class="empty-state">No source-index company-name matches. The broader corpus still needs full ingestion beyond the indexed rows currently loaded.</div>`
        : "";
      return;
    }

    elements.sourceIndexSection.innerHTML = `
      <div class="source-index-head">
        <h2>Source-Index Matches</h2>
        <p>These source-index rows are searchable, but records marked as third-party or not yet factor-coded are not used for Bayesian feature likelihoods until verified and coded into the full case schema.</p>
      </div>
      ${items.sort((a, b) => b.date.localeCompare(a.date)).map((item) => `
        <article class="case-card">
          <div class="case-title">
            <div>
              <h3>${escapeHtml(item.name)}</h3>
              <div class="meta">
                <span class="pill">${escapeHtml(item.agency)}</span>
                ${item.jurisdiction ? `<span class="pill">${escapeHtml(item.jurisdiction)}</span>` : ""}
                ${item.actionType ? `<span class="pill">${escapeHtml(item.actionType)}</span>` : ""}
                <span class="pill">${escapeHtml(item.date)}</span>
                <span class="pill">${escapeHtml(item.recordType)}</span>
                <span class="pill">${escapeHtml(item.codingStatus)}</span>
                ${confidenceBadge(item)}
              </div>
            </div>
            <div class="amount">${formatMoney(item.amountUsd)}</div>
          </div>
          <p>${sourceIndexDescription(item)}</p>
          ${sourceIndexTags(item)}
          ${primarySourceLink(item)}
        </article>
      `).join("")}
    `;
  }

  function renderReviewQueue() {
    if (!elements.reviewQueueList || !elements.reviewQueueSummary) return;
    const rows = filteredReviewQueue();
    const feed = rows.filter((item) => reviewQueueType(item) === "News/feed items pending verification").length;
    const official = rows.filter((item) => reviewQueueType(item) === "Official agency/index records").length;
    const linkedRows = rows.filter((item) => primarySourceHref(item)).length;

    elements.reviewQueueSummary.innerHTML = [
      stat(rows.length, "records in current queue"),
      stat(official, "official agency/index records needing coding"),
      stat(feed, "news/feed items needing source review"),
      stat(linkedRows, "records with primary/open source links")
    ].join("");

    if (!rows.length) {
      elements.reviewQueueList.innerHTML = `<div class="empty-state">${reviewEmptyMessage()}</div>`;
      return;
    }

    elements.reviewQueueList.innerHTML = rows.map((item) => {
      const meta = confidenceMeta(item);
      return `
        <article class="case-card review-card">
          <div class="case-title">
            <div>
              <h3>${escapeHtml(item.name)}</h3>
              <div class="meta">
                <span class="pill">${escapeHtml(item.agency || "Unknown agency")}</span>
                <span class="pill">${escapeHtml(item.jurisdiction || "Not stated")}</span>
                ${item.actionType ? `<span class="pill">${escapeHtml(item.actionType)}</span>` : ""}
                <span class="pill">${escapeHtml(item.date || "Date unknown")}</span>
                <span class="pill">${escapeHtml(reviewQueueType(item))}</span>
                ${confidenceBadge(item)}
              </div>
            </div>
            <div class="amount">${item.amountUsd == null ? "Amount N/A" : formatMoney(item.amountUsd)}</div>
          </div>
          <p><b>Why queued:</b> ${escapeHtml(reviewCandidateReason(item))}</p>
          <p><b>Suggested action:</b> verify the primary/open source, code countries and route, product or service category, voluntary disclosure posture, aggravating and mitigating factors, then promote to model-ready when complete.</p>
          ${sourceIndexTags(item)}
          ${sourceFactorTable(item)}
          <div class="review-actions">
            ${primarySourceLink(item)}
            <span>${escapeHtml(meta.description)}</span>
          </div>
        </article>
      `;
    }).join("");
  }

  function filteredReviewQueue() {
    const queueType = elements.reviewQueueType ? elements.reviewQueueType.value : "All pending review";
    const jurisdiction = elements.reviewJurisdiction ? elements.reviewJurisdiction.value : "All";
    const agency = elements.reviewAgency ? elements.reviewAgency.value : "All";
    return sourceIndex
      .filter((item) => reviewQueueMatchesType(item, queueType))
      .filter((item) => jurisdiction === "All" || (item.jurisdiction || "Not stated") === jurisdiction)
      .filter((item) => agency === "All" || agencyMatches(item.agency, agency))
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }

  function reviewQueueType(item) {
    return String(item.recordType || "").includes("Sanctions Expert") ? "News/feed items pending verification" : "Official agency/index records";
  }

  function reviewQueueMatchesType(item, queueType) {
    return queueType === "All pending review" || reviewQueueType(item) === queueType;
  }

  function reviewEmptyMessage() {
    const queueType = elements.reviewQueueType ? elements.reviewQueueType.value : "All pending review";
    const jurisdiction = elements.reviewJurisdiction ? elements.reviewJurisdiction.value : "All";
    const agency = elements.reviewAgency ? elements.reviewAgency.value : "All";
    const parts = [queueType, jurisdiction !== "All" ? jurisdiction : "", agency !== "All" ? agency : ""].filter(Boolean).join(" / ");
    return `
      <div>
        <h3>No records in this review slice</h3>
        <p>${escapeHtml(parts)} does not exist in the current queue.</p>
        <p>For example, OFSI and United Kingdom items currently come from the news/feed queue, not the official agency/index queue. Switch the queue type to "News/feed items pending verification" to review those records.</p>
      </div>
    `;
  }

  function reviewCandidateReason(item) {
    if (reviewQueueType(item) === "News/feed items pending verification") {
      return primarySourceHref(item)
        ? "A news/feed brief has been captured with a primary/open source link, but it has not been verified and normalized for Bayesian scoring."
        : "A news/feed brief has been captured, but a primary/open source link still needs to be identified before coding.";
    }
    return "An official source row is indexed and searchable, but the normalized case fields needed for scoring are not fully coded.";
  }

  function confidenceBadge(item) {
    const meta = confidenceMeta(item);
    return `<span class="confidence-badge ${meta.className}" title="${escapeAttribute(meta.description)}">${escapeHtml(meta.label)}</span>`;
  }

  function legalStatusBadge(item) {
    const meta = legalStatusMeta(item);
    return `<span class="legal-status ${meta.className}" title="${escapeAttribute(meta.description)}">${escapeHtml(meta.label)}</span>`;
  }

  function legalStatusMeta(item) {
    const posture = String(item.posture || "").toLowerCase();
    const recordType = String(item.recordType || "").toLowerCase();
    const text = `${posture} ${recordType}`;
    if (/guilty plea|pleaded guilty|conviction|convicted|sentenc/.test(text)) {
      return {
        className: "legal-status-final",
        label: "Admitted or adjudicated violation",
        description: "The official record reports a guilty plea, conviction, or sentencing. This label describes the historical matter, not a proposed transaction."
      };
    }
    if (/settlement|consent agreement|final order|administrative order|denial order/.test(text)) {
      return {
        className: "legal-status-settled",
        label: /ofac|apparent/.test(`${item.agency || ""} ${item.summary || ""}`.toLowerCase()) ? "Settled apparent violation" : "Final agency resolution",
        description: "The matter was resolved by settlement, consent agreement, or final agency action; the source controls whether liability was admitted."
      };
    }
    if (/charg|indict|complaint|alleg/.test(text)) {
      return {
        className: "legal-status-alleged",
        label: "Alleged violation",
        description: "The conduct is alleged or charged and should not be presented as proven unless the linked source reports a later disposition."
      };
    }
    return {
      className: "legal-status-undetermined",
      label: "Disposition requires source review",
      description: "The normalized record does not establish enough procedural detail to characterize the conduct as admitted, adjudicated, or merely alleged."
    };
  }

  function caseSummaryBlock(item) {
    const summary = String(item.summary || "").trim();
    const limited = summary.length < 140 || summary.split(/[.!?](?:\s|$)/).filter(Boolean).length < 2;
    const detail = limited
      ? `<p class="summary-caveat"><strong>Limited-detail record:</strong> this summary preserves the available normalized source text. Unstated parties, routing, authorization, or disposition facts are unknown and are not inferred.</p>`
      : `<p class="summary-caveat summary-grounded"><strong>Source-grounded:</strong> transaction, parties, routing, authorization, and outcome are stated only to the extent supported by the linked public record.</p>`;
    return `<div class="case-summary"><h4>Case summary</h4><p>${escapeHtml(summary || "No matter-level narrative has been coded. Review the linked source before relying on this record.")}</p>${detail}</div>`;
  }

  function confidenceMeta(item) {
    const recordType = String(item.recordType || "");
    const status = String(item.codingStatus || "");
    if (recordType.includes("Sanctions Expert")) {
      return {
        className: "confidence-third-party",
        label: "Horizon scan",
        description: "Third-party feed brief; verify against the primary/open source and code before using in Bayesian likelihoods."
      };
    }
    if (status.includes("Indexed") || status.includes("not yet factor-coded")) {
      return {
        className: "confidence-indexed",
        label: "Indexed only",
        description: "Searchable official-source row; not yet normalized for Bayesian likelihoods."
      };
    }
    return {
      className: "confidence-high",
      label: "Model-ready",
      description: "Normalized record used in historical analysis, pattern analysis, and Bayesian scoring."
    };
  }

  function primarySourceLink(item) {
    const href = primarySourceHref(item);
    if (!href) return `<p class="field-note">Primary/open source pending.</p>`;
    return `<p><a href="${escapeAttribute(href)}" target="_blank" rel="noreferrer">${escapeHtml(item.sourceTitle || sourceLinkLabel(item))}</a></p>`;
  }

  function factorTable(item) {
    const aggravating = factorLabels(item, aggravatingFactorKeys);
    const mitigating = factorLabels(item, mitigatingFactorKeys);
    return `
      <div class="factor-table" aria-label="Case factors">
        <div class="factor-row">
          <strong>Voluntary disclosure</strong>
          <span>${escapeHtml(voluntaryDisclosureStatus(item))}</span>
        </div>
        <div class="factor-row">
          <strong>Aggravating factors</strong>
          <span>${escapeHtml(aggravating.length ? aggravating.join("; ") : "None coded")}</span>
        </div>
        <div class="factor-row">
          <strong>Mitigating factors</strong>
          <span>${escapeHtml(mitigating.length ? mitigating.join("; ") : "None coded")}</span>
        </div>
      </div>
    `;
  }

  function sourceIndexDescription(item) {
    if (String(item.recordType || "").includes("Sanctions Expert")) {
      return "This match comes from the Sanctions Expert feed, which includes U.S. and non-U.S. sanctions, export-control, AML, guidance, designation, and enforcement briefs. It is searchable here as an awareness/source-index record, but it is not used for Bayesian scoring until verified against the linked official source and normalized into model fields.";
    }
    return "This match comes from an official source index. It is searchable/exportable immediately, but may not yet include normalized countries, products, disclosure posture, or risk-factor tags. Company-name matches can appear even when other filters are set.";
  }

  function sourceIndexTags(item) {
    const tags = [
      item.jurisdiction,
      item.actionType,
      ...(item.tags || [])
    ].filter(Boolean);
    if (!tags.length) return "";
    return `<div class="tags">${unique(tags).map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("")}</div>`;
  }

  function sourceFactorTable(item) {
    const aggravating = item.aggravatingFactors || [];
    const mitigating = item.mitigatingFactors || [];
    const disclosure = item.disclosure || "Not factor-coded yet";
    return `
      <div class="factor-table" aria-label="Source-index coding status">
        <div class="factor-row">
          <strong>Voluntary disclosure</strong>
          <span>${escapeHtml(disclosure)}</span>
        </div>
        <div class="factor-row">
          <strong>Aggravating factors</strong>
          <span>${escapeHtml(aggravating.length ? aggravating.join("; ") : "Not factor-coded yet")}</span>
        </div>
        <div class="factor-row">
          <strong>Mitigating factors</strong>
          <span>${escapeHtml(mitigating.length ? mitigating.join("; ") : "Not factor-coded yet")}</span>
        </div>
      </div>
    `;
  }

  function factorLabels(item, allowedKeys) {
    return (item.factors || [])
      .filter((factor) => allowedKeys.includes(factor))
      .map((factor) => labels[factor] || factor);
  }

  function voluntaryDisclosureStatus(item) {
    const disclosure = String(item.disclosure || "").toLowerCase();
    if (disclosure.includes("no voluntary")) return "No voluntary self-disclosure";
    if ((item.factors || []).includes("voluntary_disclosure") || disclosure.includes("voluntary")) return "Voluntary self-disclosure";
    if (disclosure.includes("not specified")) return "Not specified";
    return item.disclosure || "Not specified";
  }

  function readTransaction() {
    const checkedFactors = Array.from(elements.riskForm.querySelectorAll("fieldset input:checked")).map((item) => item.value);
    const destination = document.getElementById("destination").value.trim();
    const intermediary = document.getElementById("intermediary").value.trim();
    const product = document.getElementById("product").value;
    const classification = document.getElementById("classification").value;
    const valueRaw = document.getElementById("valueUsd").value.trim();
    const valueKnown = valueRaw !== "";
    const valueUsd = valueKnown ? Number(valueRaw || 0) : 0;
    return {
      archetype: document.getElementById("archetype").value,
      destination,
      intermediary,
      product,
      classification,
      valueUsd,
      valueKnown,
      factors: checkedFactors
    };
  }

  function scoreTransaction(tx) {
    const prior = priorByArchetype[tx.archetype] || priorByArchetype.routine;
    let odds = prior / (1 - prior);
    const contributions = [{
      label: `Prior: ${labels[tx.archetype]}`,
      lr: odds,
      note: `${Math.round(prior * 100)}% starting point before transaction facts`
    }];

    const featureKeys = new Set([tx.product, tx.classification, ...tx.factors]);
    if (isSensitiveCountry(tx.destination)) featureKeys.add(normalizeCountryFeature(tx.destination));
    if (isSensitiveCountry(tx.intermediary)) featureKeys.add("transshipment");
    if (tx.valueUsd >= 1000000) featureKeys.add("high_value");

    featureKeys.forEach((feature) => {
      const lr = likelihoodRatio(feature);
      const modifier = policyModifiers[feature] || countryModifier(feature) || valueModifier(feature) || 1;
      const combined = clamp(lr * modifier, 0.25, 5);
      odds *= combined;
      contributions.push({
        label: labels[feature] || readableFeature(feature),
        lr: combined,
        note: `Case-derived LR ${lr.toFixed(2)} x policy modifier ${modifier.toFixed(2)}`
      });
    });

    const probability = clamp(odds / (1 + odds), 0.01, 0.96);
    const analogs = analogousCases(tx).slice(0, 5);
    return {
      tx,
      probability,
      band: riskBand(probability),
      contributions: contributions.sort((a, b) => Math.abs(Math.log(b.lr || 1)) - Math.abs(Math.log(a.lr || 1))),
      analogs
    };
  }

  function likelihoodRatio(feature) {
    const severe = cases.filter(isSevereCase);
    const lessSevere = cases.filter((item) => !isSevereCase(item));
    const alpha = 1;
    const severeHits = severe.filter((item) => caseHasFeature(item, feature)).length;
    const lessHits = lessSevere.filter((item) => caseHasFeature(item, feature)).length;
    const pSevere = (severeHits + alpha) / (severe.length + 2 * alpha);
    const pLess = (lessHits + alpha) / (lessSevere.length + 2 * alpha);
    return clamp(pSevere / pLess, 0.5, 2.25);
  }

  function isSevereCase(item) {
    return (item.amountUsd || 0) >= 1000000 ||
      String(item.posture || "").toLowerCase().includes("criminal") ||
      String(item.civilCriminal || "").toLowerCase().includes("criminal");
  }

  function caseHasFeature(item, feature) {
    if (!feature) return false;
    const normalized = feature.toLowerCase();
    if (item.productCategory === feature) return true;
    if (item.factors.includes(feature)) return true;
    return item.countries.some((country) => normalizeCountryFeature(country) === normalized);
  }

  function countryModifier(feature) {
    return feature.startsWith("country_") ? 1.35 : 0;
  }

  function valueModifier(feature) {
    return feature === "high_value" ? 1.25 : 0;
  }

  function isSensitiveCountry(country) {
    if (!country) return false;
    return sensitiveCountries.has(country.trim());
  }

  function normalizeCountryFeature(country) {
    return `country_${country.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
  }

  function analogousCases(tx) {
    return cases.map((item) => {
      let score = 0;
      if (item.productCategory === tx.product) score += 3;
      if (tx.destination && item.countries.includes(tx.destination)) score += 3;
      if (tx.intermediary && item.countries.includes(tx.intermediary)) score += 2;
      tx.factors.forEach((factor) => {
        if (item.factors.includes(factor)) score += 1;
      });
      if (isSevereCase(item)) score += 0.5;
      return { item, score };
    }).filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
  }

  function renderRisk(result) {
    const percent = Math.round(result.probability * 100);
    const bandClass = result.band === "High" ? "risk-high" : result.band === "Elevated" ? "risk-elevated" : "risk-low";
    elements.riskOutput.innerHTML = `
      <div class="score-card">
        <div class="score-top">
          <div class="gauge" style="--angle:${percent * 3.6}deg"><div class="gauge-inner">${percent}%</div></div>
          <div>
            <span class="risk-band ${bandClass}">${result.band} enforcement-analogy risk</span>
            <h2>${percent}% enforcement-pattern score</h2>
            <p>${escapeHtml(scoreMeaning(result))}</p>
            <p>This percentage means the transaction facts you entered have ${escapeHtml(result.band.toLowerCase())} similarity to patterns seen in public sanctions and export-control enforcement records. It is not a legal conclusion or a true probability that a violation has occurred.</p>
            <p><small>Risk factors are analyst-coded from agency enforcement guidance and linked public case documents.</small></p>
          </div>
        </div>

        <section>
          <h3>Largest score drivers</h3>
          <div class="contrib-list">
            ${result.contributions.slice(0, 8).map((item) => `
              <div class="contrib">
                <div><strong>${escapeHtml(item.label)}</strong><br><small>${escapeHtml(item.note)}</small></div>
                <b>${item.lr >= 1 ? "+" : ""}${item.lr.toFixed(2)}x</b>
              </div>
            `).join("")}
          </div>
        </section>

        <section>
          <h3>Analogous public cases</h3>
          ${result.analogs.length ? result.analogs.map((item) => `
            <article class="case-card">
              <div class="case-title">
                <h3>${escapeHtml(item.name)}</h3>
                <span class="amount">${item.amountUsd ? formatMoney(item.amountUsd) : item.posture}</span>
              </div>
              ${legalStatusBadge(item)}
              ${caseSummaryBlock(item)}
              <a href="${escapeAttribute(item.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.sourceTitle)}</a>
            </article>
          `).join("") : `<p>No strong analogs in the loaded enforcement universe.</p>`}
        </section>
      </div>
    `;
  }

  function riskBand(probability) {
    if (probability >= 0.55) return "High";
    if (probability >= 0.24) return "Elevated";
    return "Low";
  }

  function scoreMeaning(result) {
    if (result.band === "High") {
      return "Plain English: this transaction resembles higher-concern matters in the normalized public enforcement records. It should normally be paused for legal/compliance review, license analysis, and restricted-party/end-use escalation before proceeding.";
    }
    if (result.band === "Elevated") {
      return "Plain English: this transaction has several features that appear in enforcement matters. It likely needs enhanced diligence, documentation, and review before release.";
    }
    return "Plain English: based on the facts entered, this transaction has limited similarity to the loaded enforcement matters. It still needs normal screening, classification, and sanctions/export-control checks.";
  }

  function renderAdvisorResponse() {
    if (!elements.advisorOutput) return;
    const question = (elements.advisorQuestion && elements.advisorQuestion.value.trim()) || "What risk-management steps should we take for this transaction?";
    const focus = elements.advisorFocus ? elements.advisorFocus.value : "triage";
    const useTransaction = !elements.advisorUseTransaction || elements.advisorUseTransaction.checked;
    const tx = advisorTransaction(question, useTransaction);
    const score = scoreTransaction(tx);
    const concern = advisorConcern(tx, score);
    const sources = advisorSources(question, focus, tx);
    const actions = advisorActions(question, focus, tx, score, concern);
    const determinations = advisorDeterminations(tx, concern);
    const missing = missingAdvisorFacts(tx);
    const analogs = score.analogs.slice(0, 4);

    lastAdvisorMemo = advisorMemoText({ question, focus, tx, score, concern, sources, actions, determinations, missing, analogs });
    elements.advisorOutput.innerHTML = `
      <div class="advisor-card">
        <div class="advisor-answer-head">
          <div>
            <span class="confidence-badge confidence-high">Grounded advisor</span>
            <h2>Recommended Risk Management Response</h2>
          </div>
          <div class="advisor-score ${concern.className}">
            <strong>${escapeHtml(concern.label)}</strong>
            <span>${Math.round(score.probability * 100)}% ${escapeHtml(score.band.toLowerCase())} enforcement-pattern score</span>
          </div>
        </div>
        <p>${escapeHtml(advisorLead(tx, score, concern))}</p>
        <section class="direct-answer ${concern.className}">
          <h3>Direct answer</h3>
          <p>${escapeHtml(advisorDirectAnswer(tx, concern))}</p>
        </section>
        ${transactionSnapshot(tx)}
        <section>
          <h3>Priority management steps</h3>
          <ol class="advisor-list">
            ${actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ol>
        </section>
        <section>
          <h3>Approval checklist</h3>
          <div class="checklist-grid">
            ${determinations.map((item) => `
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.detail)}</span>
              </div>
            `).join("")}
          </div>
        </section>
        <section>
          <h3>Questions to close before approval</h3>
          <ul class="advisor-list">
            ${missing.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </section>
        <section>
          <h3>Source basis</h3>
          <div class="source-card-grid">
            ${sources.map((source) => `
              <a class="source-card" href="${escapeAttribute(source.url)}" target="_blank" rel="noreferrer">
                <strong>${escapeHtml(source.title)}</strong>
                <span>${escapeHtml(source.agency)}</span>
                <small>${escapeHtml(source.summary)}</small>
              </a>
            `).join("")}
          </div>
        </section>
        <section>
          <h3>Analogous enforcement cases</h3>
          ${analogs.length ? analogs.map((item) => `
            <article class="advisor-case">
              <div>
                <strong>${escapeHtml(item.name)}</strong>
                <span>${escapeHtml([item.agency, item.date, item.posture].filter(Boolean).join(" / "))}</span>
              </div>
              <b>${item.amountUsd ? formatMoney(item.amountUsd) : "Amount N/A"}</b>
            </article>
          `).join("") : `<p class="field-note">No strong analogs were identified in the loaded normalized case universe.</p>`}
        </section>
        <p class="field-note">Advisor outputs are decision-support notes based on cited public guidance and the loaded case corpus. The compliance concern label may be higher than the Bayesian enforcement-pattern score where current country/program restrictions demand escalation.</p>
      </div>
    `;
  }

  function advisorTransaction(question, useTransaction) {
    const base = useTransaction ? readTransaction() : defaultTransaction();
    const inferred = inferQuestionFacts(question);
    const questionHasTransactionFacts = Boolean(inferred.destination || inferred.product || inferred.intermediary || inferred.classification || inferred.factors.length);
    const tx = {
      ...base,
      factors: unique([...(base.factors || []), ...(inferred.factors || [])]),
      inferredFacts: inferred.notes,
      questionHasTransactionFacts
    };
    if (inferred.destination) tx.destination = inferred.destination;
    if (inferred.intermediary) tx.intermediary = inferred.intermediary;
    if (inferred.product) tx.product = inferred.product;
    if (inferred.classification && (tx.classification === "unknown" || inferred.explicitClassification)) tx.classification = inferred.classification;
    if (inferred.archetype && tx.archetype === "routine") tx.archetype = inferred.archetype;
    if (inferred.valueKnown) {
      tx.valueUsd = inferred.valueUsd;
      tx.valueKnown = true;
      tx.inferredFacts.push(`Value inferred from question: ${formatMoney(inferred.valueUsd)}`);
    } else if (questionHasTransactionFacts && (!base.valueKnown || base.valueUsd === 250000)) {
      tx.valueUsd = 0;
      tx.valueKnown = false;
    }
    return tx;
  }

  function defaultTransaction() {
    return {
      archetype: "routine",
      destination: "",
      intermediary: "",
      product: "general_goods",
      classification: "unknown",
      valueUsd: 0,
      valueKnown: false,
      factors: []
    };
  }

  function inferQuestionFacts(question) {
    const text = String(question || "");
    const lower = text.toLowerCase();
    const notes = [];
    const inferred = { factors: [], notes };
    const destination = inferDestination(text);
    if (destination) {
      inferred.destination = destination;
      notes.push(`Destination inferred from question: ${destination}`);
    }
    const intermediary = inferIntermediary(text);
    if (intermediary) {
      inferred.intermediary = intermediary;
      inferred.factors.push("transshipment");
      notes.push(`Intermediary/transshipment point inferred from question: ${intermediary}`);
    }
    if (/\b(tv|television|smart\s*tv|consumer electronics?)\b/i.test(text)) {
      inferred.product = "encryption_electronics";
      inferred.classification = "unknown";
      notes.push("Product inferred from question: TV / consumer electronics");
    }
    const valueMatch = text.match(/\$\s*([0-9][0-9,]*(?:\.\d{1,2})?)|\b([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:usd|dollars?)\b/i);
    if (valueMatch) {
      inferred.valueUsd = Number(String(valueMatch[1] || valueMatch[2]).replace(/,/g, ""));
      inferred.valueKnown = Number.isFinite(inferred.valueUsd);
    }
    if (/\b(eccn|ccl|dual[-\s]?use|controlled)\b/i.test(text)) {
      inferred.archetype = "dual_use";
      inferred.classification = "eccn";
      inferred.explicitClassification = true;
      notes.push("Export-control classification concern inferred from question");
    }
    if (/\b(itar|usml|defen[sc]e article|defen[sc]e service|military)\b/i.test(text)) {
      inferred.archetype = "defense_tech";
      inferred.classification = "itar";
      inferred.product = "defense_services";
      inferred.explicitClassification = true;
      inferred.factors.push("military_end_use");
      notes.push("Defense/ITAR concern inferred from question");
    }
    if (destination && isSensitiveCountry(destination)) {
      inferred.factors.push("no_license");
      notes.push(`${destination} is treated as a high-sensitivity destination for sanctions/export-control triage`);
    }
    if (/\b(without|no)\s+(?:an?\s+)?(?:export\s+)?licen[cs]e\b/i.test(text)) {
      inferred.factors.push("no_license");
      notes.push("Question asks about proceeding without a license");
    }
    if (/\b(sdn|blocked|sanctioned party|restricted party|entity list|denied party)\b/i.test(lower)) {
      inferred.factors.push("restricted_party");
      notes.push("Restricted-party concern inferred from question");
    }
    if (/\b(red flag|evasion|diversion|unusual|transship|route|reseller|end[-\s]?user|end[-\s]?use)\b/i.test(lower)) {
      inferred.factors.push("red_flags");
      notes.push("End-use/end-user or diversion red flag inferred from question");
    }
    return inferred;
  }

  function inferDestination(text) {
    const normalized = String(text || "");
    const countries = unique([...countryOptions, ...cases.flatMap((item) => item.countries), ...Array.from(sensitiveCountries)]).sort((a, b) => b.length - a.length);
    const aliasEntries = countries.flatMap((country) => (countryAliases[country] || [country]).map((alias) => ({ country, alias })));
    const directional = ["to", "into", "destined for", "destination", "ship to", "export to", "send to", "sell to"];
    for (const { country, alias } of aliasEntries) {
      const escaped = escapeRegex(alias);
      if (directional.some((word) => new RegExp(`\\b${word}\\b\\s+(?:the\\s+)?${escaped}\\b`, "i").test(normalized))) return country;
    }
    return aliasEntries.find(({ country, alias }) => country !== "United States" && new RegExp(`\\b${escapeRegex(alias)}\\b`, "i").test(normalized))?.country || "";
  }

  function inferIntermediary(text) {
    const countries = unique([...countryOptions, ...cases.flatMap((item) => item.countries)]).sort((a, b) => b.length - a.length);
    const aliasEntries = countries.flatMap((country) => (countryAliases[country] || [country]).map((alias) => ({ country, alias })));
    for (const { country, alias } of aliasEntries) {
      const escaped = escapeRegex(alias);
      if (new RegExp(`\\b(via|through|transshipping through|transshipment through)\\b\\s+(?:the\\s+)?${escaped}\\b`, "i").test(text)) return country;
    }
    return "";
  }

  function advisorConcern(tx, score) {
    if (tx.destination && isSensitiveCountry(tx.destination)) {
      return {
        label: "High concern",
        className: "advisor-score-high",
        note: `${tx.destination} requires sanctions/export-control escalation before approval, regardless of whether the case-analogy score is lower.`
      };
    }
    if ((tx.factors || []).some((factor) => ["restricted_party", "military_end_use", "no_license", "red_flags"].includes(factor)) || score.band === "High") {
      return {
        label: "High concern",
        className: "advisor-score-high",
        note: "The facts include escalation triggers that should be resolved before release."
      };
    }
    if (score.band === "Elevated") {
      return {
        label: "Elevated concern",
        className: "advisor-score-elevated",
        note: "Enhanced diligence and management-level review are appropriate before approval."
      };
    }
    return {
      label: "Baseline concern",
      className: "advisor-score-baseline",
      note: "No special escalation trigger was detected from the entered or inferred facts, but ordinary screening and classification checks still apply."
    };
  }

  function advisorLead(tx, score, concern) {
    if (concern.label === "High concern" && tx.destination === "Russia") {
      return "Plain English: do not treat this as a routine TV export. Because the question identifies Russia as the destination, the transaction should be held for sanctions screening, EAR classification, Russia/Belarus export-control review, license analysis, and end-use/end-user diligence before any shipment or sale.";
    }
    if (concern.label === "High concern") return `Plain English: ${concern.note}`;
    return scoreMeaning(score);
  }

  function advisorDirectAnswer(tx, concern) {
    if (tx.destination === "Russia" && (tx.factors || []).includes("no_license")) {
      return "Do not ship or approve as stated. A proposed export from the United States to Russia without a confirmed license determination, license exception, or other authorization should be treated as a hold-and-escalate matter.";
    }
    if (tx.destination === "Russia") {
      return "Do not approve until sanctions screening, export classification, Russia/Belarus controls, license requirements, parties, payment route, and end use are cleared and documented.";
    }
    if (concern.label === "High concern") {
      return "Do not approve on routine workflow. Resolve the listed escalation items and document the approval basis first.";
    }
    return "This can proceed only through the normal compliance workflow unless the checklist below reveals a sanctions, licensing, end-use, or restricted-party issue.";
  }

  function transactionSnapshot(tx) {
    const facts = [
      ["Transaction type", labels[tx.archetype]],
      ["Destination", tx.destination || "Not specified"],
      ["Intermediary", tx.intermediary || "None / not specified"],
      ["Product/service", labels[tx.product] || tx.product],
      ["Classification", labels[tx.classification] || tx.classification],
      ["Value", tx.valueKnown ? formatMoney(tx.valueUsd) : "Not stated"],
      ["Risk factors", tx.factors.length ? tx.factors.map((factor) => labels[factor] || factor).join("; ") : "None selected"]
    ];
    if (tx.inferredFacts && tx.inferredFacts.length) facts.push(["Inferred from question", tx.inferredFacts.join("; ")]);
    return `
      <section>
        <h3>Transaction facts used</h3>
        <div class="advisor-facts">
          ${facts.map(([key, value]) => `<div><strong>${escapeHtml(key)}</strong><span>${escapeHtml(value)}</span></div>`).join("")}
        </div>
      </section>
    `;
  }

  function advisorSources(question, focus, tx) {
    const tokens = [
      question,
      focus.replace(/_/g, " "),
      tx ? [tx.archetype, tx.product, tx.classification, tx.destination, tx.intermediary, ...tx.factors].join(" ") : ""
    ].join(" ").toLowerCase();
    const scored = guidanceSources.map((source) => {
      let score = 0;
      source.topics.forEach((topic) => {
        if (tokens.includes(topic)) score += 2;
      });
      if (focus === "triage") score += ["ofac-framework", "bis-red-flags", "bis-faqs"].includes(source.id) ? 2 : 0;
      if (focus === "sanctions") score += source.agency === "OFAC" ? 3 : 0;
      if (focus === "export_controls") score += source.agency === "BIS" ? 3 : 0;
      if (focus === "disclosure") score += ["doj-vsd", "ofac-framework"].includes(source.id) ? 3 : 0;
      if (focus === "controls") score += ["ofac-framework", "bis-red-flags", "ddtc-compliance"].includes(source.id) ? 3 : 0;
      if (tx && (tx.classification === "itar" || tx.product === "defense_services" || tx.archetype === "defense_tech") && source.id === "ddtc-compliance") score += 5;
      if (tx && (tx.classification === "eccn" || tx.archetype === "dual_use") && source.agency === "BIS") score += 2;
      if (tx && tx.factors.includes("voluntary_disclosure") && source.id === "doj-vsd") score += 4;
      return { source, score };
    }).sort((a, b) => b.score - a.score || a.source.title.localeCompare(b.source.title));
    const selected = scored.filter((item) => item.score > 0).slice(0, 5).map((item) => item.source);
    return selected.length ? selected : guidanceSources.slice(0, 4);
  }

  function advisorActions(question, focus, tx, score, concern) {
    const actions = [];
    if (concern && concern.label === "High concern") {
      actions.push("Pause release or performance until legal/compliance confirms sanctions, export-control jurisdiction, classification, license needs, and end-use/end-user risk.");
    } else if (score && score.band === "Elevated") {
      actions.push("Hold for enhanced diligence and management-level compliance review before approval.");
    } else {
      actions.push("Complete ordinary-course screening, classification, country, party, and end-use checks, and retain the rationale.");
    }

    const text = `${question || ""} ${focus}`.toLowerCase();
    const factors = tx ? new Set(tx.factors) : new Set();
    if (!tx || text.includes("sanction") || factors.has("restricted_party") || (tx.destination && isSensitiveCountry(tx.destination))) {
      actions.push("Screen all parties, owners, banks, vessels, addresses, and intermediaries; check ownership/control and any relevant OFAC country or program restrictions.");
    }
    if (!tx || text.includes("export") || text.includes("license") || ["eccn", "itar", "unknown"].includes(tx.classification)) {
      actions.push("Document export jurisdiction and classification, then determine license requirements for destination, end user, end use, and U.S.-person support.");
    }
    if (factors.has("red_flags") || factors.has("transshipment")) {
      actions.push("Resolve red flags before shipment: obtain end-use/end-user certifications, validate logistics routing, reconcile inconsistent documents, and document escalation decisions.");
    }
    if (factors.has("military_end_use") || tx && tx.product === "defense_services") {
      actions.push("Escalate military, intelligence, defense-service, or WMD indicators for specialist review; do not rely on routine commercial approval.");
    }
    if (factors.has("weak_controls") || focus === "controls") {
      actions.push("Open a control-remediation action: root-cause review, screening/classification fix, training, audit trail, and post-transaction testing.");
    }
    if (factors.has("voluntary_disclosure") || text.includes("disclosure") || focus === "disclosure") {
      actions.push("Assess voluntary self-disclosure promptly with counsel, separating OFAC, BIS, DOJ, and DDTC procedures because each agency has its own requirements and incentives.");
    }
    if (tx && tx.destination === "Russia") {
      actions.push("For Russia, perform a stop/go review under BIS Russia/Belarus controls and OFAC Russia sanctions before shipment; do not rely on the generic product label.");
      actions.push("For a TV/consumer-electronics shipment, identify the exact model, ECCN or EAR99 status, software/technology content, HTS/Schedule B if used by the screening workflow, end user, end use, and any resale or military/diversion indicators.");
      actions.push("If no license or exception clearly applies, keep the transaction on hold and document the denial/escalation decision rather than releasing on commercial urgency.");
    }
    if (score && score.analogs.length) {
      actions.push(`Compare against loaded analogs such as ${score.analogs.slice(0, 2).map((item) => item.name).join(" and ")} to document why this transaction is similar or distinguishable.`);
    }
    return unique(actions).slice(0, 8);
  }

  function advisorDeterminations(tx, concern) {
    const rows = [
      {
        title: "Party screening",
        detail: "Screen buyer, consignee, end user, owners, banks, freight forwarder, vessels, addresses, and known affiliates against sanctions and export-control lists."
      },
      {
        title: "Product classification",
        detail: "Identify exact product, model, technical parameters, ECCN or EAR99 status, U.S.-origin content, and any software/technology component."
      },
      {
        title: "Destination rules",
        detail: tx.destination ? `Apply country/program rules for ${tx.destination}; do not rely only on the product description.` : "Confirm final destination and apply country/program restrictions."
      },
      {
        title: "License decision",
        detail: "Record whether a license is required, whether a license exception is available, who approved that conclusion, and what source supports it."
      },
      {
        title: "End use/end user",
        detail: "Confirm civilian/commercial end use, obtain certifications where appropriate, and resolve military, intelligence, WMD, diversion, or resale indicators."
      },
      {
        title: "Transaction controls",
        detail: "Check payment route, shipping route, contractual restrictions, no-resale/no-Russia language where appropriate, and hold-release approvals."
      }
    ];
    if (tx.destination === "Russia") {
      rows.unshift({
        title: "Initial disposition",
        detail: "Hold. Russia destination plus no-license question requires compliance/legal escalation before any release."
      });
    } else if (concern.label === "High concern") {
      rows.unshift({
        title: "Initial disposition",
        detail: "Hold for escalation until the triggering issue is cleared."
      });
    }
    return rows;
  }

  function missingAdvisorFacts(tx) {
    const missing = [];
    if (!tx.destination) missing.push("What is the final destination, and are there any sanctioned-territory, embargoed-country, or program-specific restrictions?");
    if (!tx.intermediary) missing.push("Will any intermediary, freight forwarder, bank, consignee, reseller, or transshipment point touch the transaction?");
    if (!tx.valueKnown) missing.push("What is the transaction value? The advisor will not assume a dollar amount unless the question or form provides one.");
    if (tx.classification === "unknown") missing.push("What is the export jurisdiction/classification: EAR99, ECCN-controlled, ITAR/USML, or outside U.S. jurisdiction?");
    if (!tx.factors.includes("restricted_party")) missing.push("Have all parties and beneficial owners been screened against relevant sanctions/export-control lists?");
    if (!tx.factors.includes("military_end_use")) missing.push("Is there any military, intelligence, WMD, defense, surveillance, or restricted end-use concern?");
    if (!tx.factors.includes("red_flags")) missing.push("Are the documents, routing, customer profile, payment terms, and requested item configuration consistent?");
    return missing.slice(0, 6);
  }

  function advisorMemoText({ question, focus, tx, score, concern, sources, actions, determinations, missing, analogs }) {
    const lines = [
      "Sanctions / Export-Control Risk Advisor Memo",
      `Generated: ${new Date().toISOString()}`,
      "",
      `Question: ${question}`,
      `Focus: ${focus.replace(/_/g, " ")}`,
      ""
    ];
    if (tx && score) {
      lines.push("Transaction facts used:");
      lines.push(`- Type: ${labels[tx.archetype]}`);
      lines.push(`- Destination: ${tx.destination || "Not specified"}`);
      lines.push(`- Intermediary: ${tx.intermediary || "None / not specified"}`);
      lines.push(`- Product/service: ${labels[tx.product] || tx.product}`);
      lines.push(`- Classification: ${labels[tx.classification] || tx.classification}`);
      lines.push(`- Value: ${tx.valueKnown ? formatMoney(tx.valueUsd) : "Not stated"}`);
      lines.push(`- Risk factors: ${tx.factors.length ? tx.factors.map((factor) => labels[factor] || factor).join("; ") : "None selected"}`);
      if (tx.inferredFacts && tx.inferredFacts.length) lines.push(`- Inferred from question: ${tx.inferredFacts.join("; ")}`);
      lines.push(`- Compliance concern: ${concern.label}`);
      lines.push(`- Enforcement-pattern score: ${Math.round(score.probability * 100)}% (${score.band})`);
      lines.push("");
    }
    lines.push("Priority management steps:");
    actions.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("");
    lines.push("Approval checklist:");
    determinations.forEach((item) => lines.push(`- ${item.title}: ${item.detail}`));
    lines.push("");
    lines.push("Questions to close:");
    missing.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
    lines.push("Source basis:");
    sources.forEach((source) => lines.push(`- ${source.title} (${source.agency}): ${source.url}`));
    if (analogs.length) {
      lines.push("");
      lines.push("Analogous enforcement cases:");
      analogs.forEach((item) => lines.push(`- ${item.name} | ${item.agency} | ${item.date} | ${item.amountUsd ? formatMoney(item.amountUsd) : "Amount N/A"}`));
    }
    lines.push("");
    lines.push("Note: This is decision-support output based on public guidance and loaded case data. It is not legal advice or a legal conclusion.");
    return lines.join("\n");
  }

  function downloadAdvisorMemo() {
    if (!lastAdvisorMemo) {
      renderAdvisorResponse();
    }
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(lastAdvisorMemo, "text/plain;charset=utf-8", `sanctions-export-control-risk-advisor-${stamp}.txt`);
  }

  function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function activeSearchLabel() {
    const q = elements.searchInput.value.trim();
    const categoryTerm = elements.categoryTerm.value.trim();
    const selectedCompany = elements.companyFilter.value;
    if (q) return q;
    if (categoryTerm) return categoryTerm;
    if (selectedCompany && selectedCompany !== "All") return selectedCompany;
    return "";
  }

  function exportCurrentCsv() {
    const rows = combinedHistoricalRows(currentFilteredCases(), currentSourceIndexMatches());
    const header = ["date", "agency", "jurisdiction", "actionType", "name", "countries", "productCategory", "recordType", "posture", "codingStatus", "disclosure", "amountUsd", "transactionValueUsd", "factors", "aggravatingFactors", "mitigatingFactors", "tags", "sourceTitle", "sourceUrl"];
    const csv = [header.join(",")]
      .concat(rows.map((item) => header.map((key) => csvCell(Array.isArray(item[key]) ? item[key].join("; ") : item[key])).join(",")))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadFileName("csv");
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportCurrentJson() {
    const rows = combinedHistoricalRows(currentFilteredCases(), currentSourceIndexMatches());
    const payload = {
      exportedAt: new Date().toISOString(),
      filters: currentFilterSummary(),
      recordCount: rows.length,
      records: rows
    };
    downloadBlob(JSON.stringify(payload, null, 2), "application/json;charset=utf-8", downloadFileName("json"));
  }

  function exportReviewQueueCsv() {
    const rows = filteredReviewQueue();
    const header = ["date", "agency", "jurisdiction", "actionType", "name", "queueType", "codingStatus", "confidenceLabel", "amountUsd", "sourceTitle", "sourceUrl", "tags"];
    const csv = [header.join(",")]
      .concat(rows.map((item) => {
        const meta = confidenceMeta(item);
        const values = {
          ...item,
          queueType: reviewQueueType(item),
          confidenceLabel: meta.label,
          sourceUrl: primarySourceHref(item),
          tags: (item.tags || []).join("; ")
        };
        return header.map((key) => csvCell(values[key])).join(",");
      }))
      .join("\n");
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(csv, "text/csv;charset=utf-8", `sanctions-export-control-review-queue-${stamp}.csv`);
  }

  function downloadBlob(content, type, fileName) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadFileName(extension) {
    const stamp = new Date().toISOString().slice(0, 10);
    return `sanctions-export-control-filtered-${stamp}.${extension}`;
  }

  function currentFilterSummary() {
    return {
      text: elements.searchInput.value.trim(),
      categoryField: elements.categoryField.value,
      categoryTerm: elements.categoryTerm.value.trim(),
      company: elements.companyFilter.value,
      agency: elements.agencyFilter.value,
      country: elements.countryFilter.value,
      productCategory: elements.productFilter.value,
      disclosure: elements.disclosureFilter.value,
      riskFactor: elements.factorFilter.value,
      recordType: elements.recordTypeFilter.value,
      year: elements.yearFilter.value
    };
  }

  function combinedHistoricalRows(codedRows, sourceRows) {
    const rows = [];
    const seen = new Set();
    codedRows.forEach((item) => {
      const key = historicalKey(item);
      seen.add(key);
      rows.push(item);
    });
    sourceRows.forEach((item) => {
      const key = historicalKey(item);
      if (!seen.has(key)) rows.push(item);
    });
    return rows;
  }

  function historicalKey(item) {
    return `${item.date}|${item.agency}|${item.name}`.toLowerCase();
  }

  function yearOf(dateValue) {
    const value = String(dateValue || "");
    return /^\d{4}/.test(value) ? value.slice(0, 4) : "";
  }

  function countBy(items, key) {
    return items.reduce((acc, item) => {
      const value = item[key] || "Unknown";
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  function shortDate(dateValue) {
    const value = String(dateValue || "");
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[2]}/${match[3]}/${match[1]}` : value;
  }

  function readableFeature(feature) {
    if (feature === "high_value") return "Transaction value at or above $1 million";
    if (feature.startsWith("country_")) return `Sensitive country: ${feature.replace("country_", "").replace(/_/g, " ")}`;
    return feature.replace(/_/g, " ");
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function csvCell(value) {
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(String(value || ""));
  }

  function escapeRegex(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
})();
