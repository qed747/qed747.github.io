import fs from "node:fs/promises";
import vm from "node:vm";

const baseDir = new URL("../", import.meta.url);
const sourceIndexPath = new URL("data/sourceIndex.js", baseDir);
const sourceCoveragePath = new URL("data/sourceCoverage.js", baseDir);
const feedUrl = "https://feed.sanctionsexpert.com/feed";

const monthIndex = new Map([
  ["january", "01"],
  ["february", "02"],
  ["march", "03"],
  ["april", "04"],
  ["may", "05"],
  ["june", "06"],
  ["july", "07"],
  ["august", "08"],
  ["september", "09"],
  ["october", "10"],
  ["november", "11"],
  ["december", "12"],
]);

const jurisdictionByAuthority = {
  BIS: "United States",
  DOJ: "United States",
  OFAC: "United States",
  FinCEN: "United States",
  "State Department": "United States",
  "State Deparment": "United States",
  OFSI: "United Kingdom",
  ECJU: "United Kingdom",
  "EU Council": "European Union",
  "EU Commission": "European Union",
  "EU Commision": "European Union",
  DFAT: "Australia",
  DGT: "France",
  "UN SC": "United Nations",
  "The White House": "United States",
  "Wolfsberg Group": "Industry / Multilateral",
};

const decodeHtml = (value = "") => value
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&apos;|&#039;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&rsquo;|&#x27;/gi, "'")
  .replace(/&ldquo;|&rdquo;/gi, '"')
  .replace(/\s+/g, " ")
  .trim();

const stripTags = (html = "") => decodeHtml(html
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " "));

const isoDate = (value = "") => {
  const match = String(value).match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!match) return "";
  const [, day, month, year] = match;
  const mm = monthIndex.get(month.toLowerCase());
  return mm ? `${year}-${mm}-${day.padStart(2, "0")}` : "";
};

const actionSlug = (value = "") => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const isSanctionsExpertUrl = (value = "") => {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "feed.sanctionsexpert.com" || host.endsWith(".sanctionsexpert.com") || host === "sanctionsexpert.com";
  } catch {
    return false;
  }
};

async function readJsArray(path, variable) {
  const text = await fs.readFile(path, "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(text, context);
  return Array.isArray(context.window[variable]) ? context.window[variable] : [];
}

function parseFeed(html) {
  const records = [];
  const articlePattern = /<article[\s\S]*?<\/article>/gi;
  for (const match of html.matchAll(articlePattern)) {
    const article = match[0];
    const href = article.match(/href="(\/feed\/item\/[^"]+)"/i)?.[1];
    if (!href) continue;

    const meta = Array.from(article.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi))
      .map((span) => stripTags(span[1]))
      .filter(Boolean);
    if (meta.length < 4) continue;

    const authority = meta[0] === "EU Commision" ? "EU Commission" : meta[0];
    const actionType = meta[1] === "Regulatory Developent" ? "Regulatory Development" : meta[1];
    const dateText = meta.find((item) => /^\d{1,2}\s+[A-Za-z]+\s+\d{4}$/.test(item));
    const dateIndex = meta.indexOf(dateText);
    const title = meta.slice(dateIndex + 1).find((item) => item !== authority && item !== actionType);
    const date = isoDate(dateText);
    const tags = meta.slice(meta.indexOf(title) + 1).filter((item) => item !== authority && item !== actionType);
    const itemUrl = new URL(href, feedUrl).toString();
    const idPart = href.split("/").pop() || actionSlug(title);

    if (!title || !date) continue;

    records.push({
      id: `sanctionsexpert-${idPart}`,
      date,
      agency: authority,
      jurisdiction: jurisdictionByAuthority[authority] || "Other / non-U.S.",
      actionType,
      name: title,
      amountUsd: null,
      recordType: "Sanctions Expert feed brief",
      codingStatus: "Third-party feed index; official-source review needed",
      sourceTitle: title,
      sourceUrl: "",
      feedItemUrl: itemUrl,
      tags: Array.from(new Set(tags)),
    });
  }
  return records;
}

function extractPrimarySource(html) {
  const urls = Array.from(html.matchAll(/href="([^"]+)"/gi))
    .map((match) => decodeHtml(match[1]))
    .filter((href) => /^https?:\/\//i.test(href))
    .filter((href) => !isSanctionsExpertUrl(href))
    .filter((href) => !/\.(css|js|png|jpg|jpeg|gif|svg|ico)(\?|$)/i.test(href));
  return Array.from(new Set(urls))[0] || "";
}

async function addPrimarySources(records) {
  const enriched = [];
  for (const record of records) {
    const { feedItemUrl, ...publicRecord } = record;
    try {
      const response = await fetch(feedItemUrl, { headers: { "user-agent": "SanctionsRiskPrototype/0.1" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const primarySourceUrl = extractPrimarySource(html);
      enriched.push({
        ...publicRecord,
        sourceUrl: primarySourceUrl,
        primarySourceUrl,
      });
    } catch {
      enriched.push(publicRecord);
    }
  }
  return enriched;
}

function mergeRows(existing, generated) {
  const byId = new Map();
  for (const record of existing) {
    byId.set(record.id, record);
  }
  for (const record of generated) {
    const prior = byId.get(record.id);
    byId.set(record.id, {
      ...prior,
      ...record,
      tags: Array.from(new Set([...(prior?.tags || []), ...(record.tags || [])])),
    });
  }
  return Array.from(byId.values())
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(a.name || "").localeCompare(String(b.name || "")));
}

async function updateCoverage(feedCount) {
  const coverage = await readJsArray(sourceCoveragePath, "SOURCE_COVERAGE");
  const withoutOld = coverage.filter((item) => item.source !== "Sanctions Expert feed");
  withoutOld.push({
    agency: "Multi-jurisdiction",
    source: "Sanctions Expert feed",
    scope: "U.S. and non-U.S. sanctions, export-control, AML, designation, guidance, and enforcement briefs",
    indexedRecords: feedCount,
    indexedPeriod: `Feed fetched ${new Date().toISOString().slice(0, 10)}`,
    status: "Third-party feed indexed; official-source review needed for model coding",
    notes: "Feed items are searchable in the historical explorer and category search. They are not used for Bayesian likelihoods until verified against official sources and normalized into the full case schema.",
    sourceUrl: "",
  });
  await fs.writeFile(sourceCoveragePath, `window.SOURCE_COVERAGE = ${JSON.stringify(withoutOld, null, 2)};\n`, "utf8");
}

const response = await fetch(feedUrl, { headers: { "user-agent": "SanctionsRiskPrototype/0.1" } });
if (!response.ok) throw new Error(`Sanctions Expert feed fetch failed: ${response.status}`);
const html = await response.text();
const generated = await addPrimarySources(parseFeed(html));
const existing = await readJsArray(sourceIndexPath, "SOURCE_INDEX");
const combined = mergeRows(existing, generated);

await fs.writeFile(sourceIndexPath, `window.SOURCE_INDEX = ${JSON.stringify(combined, null, 2)};\n`, "utf8");
await updateCoverage(combined.filter((record) => String(record.id || "").startsWith("sanctionsexpert-")).length);

console.log(`Wrote ${combined.length} source-index rows (${generated.length} Sanctions Expert feed rows).`);
