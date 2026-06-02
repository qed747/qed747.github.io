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

  const elements = {};

  document.addEventListener("DOMContentLoaded", () => {
    bindElements();
    hydrateFilters();
    bindEvents();
    renderStats();
    renderHistorical();
    renderPatterns();
  });

  function bindElements() {
    [
      "statsGrid",
      "coverageGrid",
      "searchInput",
      "companyFilter",
      "agencyFilter",
      "countryFilter",
      "productFilter",
      "disclosureFilter",
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
      "destination",
      "intermediary",
      "riskForm",
      "riskOutput"
    ].forEach((id) => {
      elements[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => selectTab(tab.dataset.tab));
    });

    ["searchInput", "companyFilter", "agencyFilter", "countryFilter", "productFilter", "disclosureFilter"].forEach((id) => {
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
      elements.companyFilter.value = "All";
      elements.agencyFilter.value = "All";
      elements.countryFilter.value = "All";
      elements.productFilter.value = "All";
      elements.disclosureFilter.value = "All";
      renderHistorical();
    });

    addListener(elements.exportCsv, "click", exportCurrentCsv);
    addListener(elements.riskForm, "submit", (event) => {
      event.preventDefault();
      renderRisk(scoreTransaction(readTransaction()));
    });
  }

  function addListener(element, eventName, handler) {
    if (element && typeof element.addEventListener === "function") {
      element.addEventListener(eventName, handler);
    }
  }

  function selectTab(tabName) {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabName);
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === tabName);
    });
  }

  function hydrateFilters() {
    const companyNames = unique([...cases.map((item) => item.name), ...sourceIndex.map((item) => item.name)]).sort((a, b) => a.localeCompare(b));
    const agencies = unique([...cases.map((item) => item.agency), ...sourceIndex.map((item) => item.agency)]);
    fillSelect(elements.companyFilter, ["All", ...companyNames]);
    fillSelect(elements.agencyFilter, ["All", ...agencies]);
    fillSelect(elements.countryFilter, ["All", ...unique(cases.flatMap((item) => item.countries)).sort()]);
    fillSelect(elements.productFilter, ["All", ...unique(cases.map((item) => item.productCategory)).sort()], labels);
    fillSelect(elements.disclosureFilter, ["All", ...unique(cases.map((item) => item.disclosure)).sort()]);
    fillSelect(elements.similarityCase, cases.map((item) => item.id), Object.fromEntries(cases.map((item) => [item.id, `${item.name} (${item.date})`])));
    const prospectiveCountries = unique([...countryOptions, ...cases.flatMap((item) => item.countries)]).sort((a, b) => a.localeCompare(b));
    fillSelect(elements.destination, ["", ...prospectiveCountries], { "": "Select destination country" });
    fillSelect(elements.intermediary, ["", ...prospectiveCountries], { "": "No intermediary / not applicable" });

  }

  function fillSelect(select, options, display = {}) {
    select.innerHTML = "";
    options.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = display[value] || value;
      select.appendChild(option);
    });
  }

  function renderStats() {
    const totalPenalty = cases.reduce((sum, item) => sum + (item.amountUsd || 0), 0);
    const indexedRecords = sourceCoverage.reduce((sum, item) => sum + (item.indexedRecords || 0), 0);
    const sourceFamilies = sourceCoverage.length || unique(cases.map((item) => item.agency)).length;
    const agencies = unique(cases.map((item) => item.agency)).join(", ");

    elements.statsGrid.innerHTML = [
      stat(cases.length, "fully coded exemplar cases"),
      stat(`${indexedRecords}+`, `${sourceIndex.length} searchable source-index rows`),
      stat(formatMoney(totalPenalty), "penalties in coded exemplars"),
      stat(sourceFamilies, `source families covering ${agencies}`)
    ].join("");

    renderSourceCoverage();
  }

  function renderSourceCoverage() {
    if (!elements.coverageGrid) return;
    elements.coverageGrid.innerHTML = sourceCoverage.map((item) => `
      <article class="coverage-card">
        <h3><span>${escapeHtml(item.agency)}</span><strong>${item.indexedRecords == null ? "TBD" : item.indexedRecords + "+"}</strong></h3>
        <p><b>${escapeHtml(item.source)}</b></p>
        <p>${escapeHtml(item.scope)}</p>
        <p><span class="pill">${escapeHtml(item.status)}</span></p>
        <p>${escapeHtml(item.notes)}</p>
        <a href="${escapeAttribute(item.sourceUrl)}" target="_blank" rel="noreferrer">Official source</a>
      </article>
    `).join("");
  }

  function stat(value, label) {
    return `<div class="stat"><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(label)}</span></div>`;
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
    const hasQuery = Boolean(q || selectedCompany !== "All");
    const agency = elements.agencyFilter.value;
    const country = elements.countryFilter.value;
    const product = elements.productFilter.value;
    const disclosure = elements.disclosureFilter.value;

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
        (q || selectedCompany === "All" || item.name === selectedCompany) &&
        (hasQuery || agencyMatches(item.agency, agency)) &&
        (hasQuery || country === "All" || item.countries.includes(country)) &&
        (hasQuery || productMatches(item, product)) &&
        (hasQuery || disclosure === "All" || item.disclosure === disclosure);
    });
  }

  function currentSourceIndexMatches() {
    const q = elements.searchInput.value.trim().toLowerCase();
    const selectedCompany = elements.companyFilter.value;
    const hasQuery = Boolean(q || selectedCompany !== "All");
    const agency = elements.agencyFilter.value;
    const country = elements.countryFilter.value;
    const product = elements.productFilter.value;
    const disclosure = elements.disclosureFilter.value;

    return sourceIndex.filter((item) => {
      const haystack = [
        item.name,
        item.agency,
        item.date,
        item.recordType,
        item.codingStatus,
        item.sourceTitle
      ].join(" ").toLowerCase();

      return (!q || haystack.includes(q)) &&
        (q || selectedCompany === "All" || item.name === selectedCompany) &&
        (hasQuery || agencyMatches(item.agency, agency)) &&
        (hasQuery || sourceIndexFilterMatches(item, { country, product, disclosure }));
    });
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
      item.sourceUrl
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
      <strong>What this shows:</strong> each table groups the fully coded enforcement cases by one feature and reports how many coded cases fall in that group (<b>n</b>), plus the median, average, and total listed penalties for those cases.
      <br><strong>How to read it:</strong> higher <b>n</b> means the feature appears more often in the coded sample; higher median/average/total penalties show penalty patterns within that sample.
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

    if (!rows.length) return `<p class="field-note">Not enough repeated feature combinations in coded penalty cases yet.</p>`;

    return `
      <table class="metric-table">
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
      elements.similarityOutput.innerHTML = `<div class="empty-state">No coded cases loaded.</div>`;
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
        <p>The selected current case is compared against other coded cases using overlap in normalized features.</p>
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
      `).join("") || `<div class="empty-state">No similar coded cases found.</div>`}
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
            <p>The current local prototype searches ${cases.length} fully coded cases and ${sourceIndex.length} indexed source rows. The company may be in the broader official corpus but not yet loaded into this local index.</p>
            <p><a href="https://ofac.treasury.gov/civil-penalties-and-enforcement-information" target="_blank" rel="noreferrer">Search OFAC civil penalties</a> | <a href="https://www.bis.gov/enforcement" target="_blank" rel="noreferrer">Search BIS enforcement</a> | <a href="https://www.justice.gov/nsd/export-control-news" target="_blank" rel="noreferrer">Search DOJ NSD matters</a></p>
          </div>
        </div>`;
      return;
    }

      const sourceHtml = sourceMatches.length ? `
        <div class="source-index-head">
        <h2>Source-Index Historical Records</h2>
        <p>These official source rows are historical results and are searchable/exportable immediately. Rows marked "not yet factor-coded" are not used for Bayesian likelihoods until normalized into the full case schema.</p>
      </div>
      ${sourceMatches.sort((a, b) => b.date.localeCompare(a.date)).map((item) => `
        <article class="case-card">
          <div class="case-title">
            <div>
              <h3>${escapeHtml(item.name)}</h3>
              <div class="meta">
                <span class="pill">${escapeHtml(item.agency)}</span>
                <span class="pill">${escapeHtml(item.date)}</span>
                <span class="pill">${escapeHtml(item.recordType)}</span>
                <span class="pill">${escapeHtml(item.codingStatus)}</span>
              </div>
            </div>
            <div class="amount">${item.amountUsd == null ? "Amount N/A" : formatMoney(item.amountUsd)}</div>
          </div>
          <p>This match comes from an official source index. It confirms a public penalty-chart record, but may not yet include normalized countries, products, disclosure posture, or risk-factor tags. Company-name matches can appear even when other filters are set.</p>
          ${sourceFactorTable(item)}
          <p><a href="${escapeAttribute(item.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.sourceTitle)}</a></p>
        </article>
      `).join("")}
    ` : "";

    const codedHtml = items.length ? `
      <div class="source-index-head">
        <h2>Fully Coded Cases</h2>
        <p>These records include normalized model fields and are used by the Bayesian scoring prototype.</p>
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
              </div>
            </div>
            <div class="amount">${item.amountUsd ? formatMoney(item.amountUsd) : "Amount N/A"}</div>
          </div>
          <p>${escapeHtml(item.summary)}</p>
          <div class="tags">
            ${item.countries.map((country) => `<span class="pill">${escapeHtml(country)}</span>`).join("")}
            ${item.factors.map((factor) => `<span class="pill">${escapeHtml(labels[factor] || factor)}</span>`).join("")}
          </div>
          ${factorTable(item)}
          <p><a href="${escapeAttribute(item.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.sourceTitle)}</a></p>
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
        <p>These official penalty-chart rows are searchable, but records marked "not yet factor-coded" are not used for Bayesian feature likelihoods until coded into the full case schema.</p>
      </div>
      ${items.sort((a, b) => b.date.localeCompare(a.date)).map((item) => `
        <article class="case-card">
          <div class="case-title">
            <div>
              <h3>${escapeHtml(item.name)}</h3>
              <div class="meta">
                <span class="pill">${escapeHtml(item.agency)}</span>
                <span class="pill">${escapeHtml(item.date)}</span>
                <span class="pill">${escapeHtml(item.recordType)}</span>
                <span class="pill">${escapeHtml(item.codingStatus)}</span>
              </div>
            </div>
            <div class="amount">${formatMoney(item.amountUsd)}</div>
          </div>
          <p>This match comes from an official source index. It confirms a public penalty-chart record, but does not yet include normalized countries, products, disclosure posture, or risk-factor tags unless separately coded above.</p>
          <p><a href="${escapeAttribute(item.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.sourceTitle)}</a></p>
        </article>
      `).join("")}
    `;
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
    const valueUsd = Number(document.getElementById("valueUsd").value || 0);
    return {
      archetype: document.getElementById("archetype").value,
      destination,
      intermediary,
      product,
      classification,
      valueUsd,
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
    return (item.amountUsd || 0) >= 1000000 || item.posture.toLowerCase().includes("criminal");
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
              <p>${escapeHtml(item.summary)}</p>
              <a href="${escapeAttribute(item.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.sourceTitle)}</a>
            </article>
          `).join("") : `<p>No strong analogs in the current seed dataset.</p>`}
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
      return "Plain English: this transaction resembles higher-concern enforcement matters in the coded public record. It should normally be paused for legal/compliance review, license analysis, and restricted-party/end-use escalation before proceeding.";
    }
    if (result.band === "Elevated") {
      return "Plain English: this transaction has several features that appear in enforcement matters. It likely needs enhanced diligence, documentation, and review before release.";
    }
    return "Plain English: based on the facts entered, this transaction has limited similarity to the coded enforcement matters. It still needs normal screening, classification, and sanctions/export-control checks.";
  }

  function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function activeSearchLabel() {
    const q = elements.searchInput.value.trim();
    const selectedCompany = elements.companyFilter.value;
    if (q) return q;
    if (selectedCompany && selectedCompany !== "All") return selectedCompany;
    return "";
  }

  function exportCurrentCsv() {
    const rows = combinedHistoricalRows(currentFilteredCases(), currentSourceIndexMatches());
    const header = ["date", "agency", "name", "countries", "productCategory", "recordType", "posture", "codingStatus", "disclosure", "amountUsd", "factors", "aggravatingFactors", "mitigatingFactors", "sourceUrl"];
    const csv = [header.join(",")]
      .concat(rows.map((item) => header.map((key) => csvCell(Array.isArray(item[key]) ? item[key].join("; ") : item[key])).join(",")))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sanctions-export-control-cases.csv";
    link.click();
      URL.revokeObjectURL(url);
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
})();
