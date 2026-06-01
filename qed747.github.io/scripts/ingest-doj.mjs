import fs from "node:fs/promises";
import vm from "node:vm";

const baseDir = new URL("../", import.meta.url);
const sourceIndexPath = new URL("data/sourceIndex.js", baseDir);
const sourceCoveragePath = new URL("data/sourceCoverage.js", baseDir);
const baseUrl = "https://www.justice.gov/nsd/export-control-news";

const decodeHtml = (value) => value
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&#039;/g, "'")
  .replace(/&quot;/gi, '"')
  .replace(/\s+/g, " ")
  .trim();

const textFromHtml = (html) => decodeHtml(html.replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " "));

const slugify = (value) => value.toLowerCase()
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 90);

const absolutize = (href) => href?.startsWith("http") ? href : new URL(href || baseUrl, "https://www.justice.gov").toString();

async function readExistingSourceIndex() {
  const text = await fs.readFile(sourceIndexPath, "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(text, context);
  return Array.isArray(context.window.SOURCE_INDEX) ? context.window.SOURCE_INDEX : [];
}

function extractTotalPages(html) {
  const pageMatches = Array.from(html.matchAll(/href="\?page=(\d+)"/g)).map((match) => Number(match[1]));
  return Math.max(0, ...pageMatches) + 1;
}

function extractRows(html) {
  const rows = [];
  for (const rowMatch of html.matchAll(/<div class="views-row">([\s\S]*?)<\/article>\s*<\/div>/gi)) {
    const rowHtml = rowMatch[1];
    const linkMatch = rowHtml.match(/<h2 class="news-title">[\s\S]*?<a href="([^"]+)"[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i);
    const timeMatch = rowHtml.match(/<time datetime="([^"]+)">([\s\S]*?)<\/time>/i);
    if (!linkMatch || !timeMatch) continue;
    const title = textFromHtml(linkMatch[2]);
    const date = timeMatch[1].slice(0, 10);
    rows.push({
      id: `doj-index-${date}-${slugify(title)}`,
      date,
      agency: "DOJ",
      name: title,
      amountUsd: null,
      recordType: "DOJ NSD export-control/sanctions news",
      codingStatus: "Indexed; not yet factor-coded",
      sourceTitle: "DOJ NSD Export Control and Sanctions News",
      sourceUrl: absolutize(linkMatch[1])
    });
  }
  return rows;
}

function mergeRows(existing, generated) {
  const byId = new Map();
  for (const record of existing) {
    if (!String(record.id || "").startsWith("doj-index-")) byId.set(record.id, record);
  }
  for (const record of generated) byId.set(record.id, record);
  for (const record of existing.filter((item) => String(item.id || "").startsWith("doj-index-"))) {
    const generatedRecord = byId.get(record.id);
    byId.set(record.id, { ...generatedRecord, ...record });
  }
  return Array.from(byId.values())
    .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
}

async function updateCoverage(count) {
  let text = await fs.readFile(sourceCoveragePath, "utf8");
  text = text.replace(/(agency: "DOJ",[\s\S]*?indexedRecords: )\d+/, `$1${count}`);
  text = text.replace(
    /(agency: "DOJ",[\s\S]*?indexedPeriod: ")[^"]+(")/,
    `$1Official DOJ NSD export-control/sanctions news pages fetched from justice.gov$2`
  );
  text = text.replace(
    /(agency: "DOJ",[\s\S]*?status: ")[^"]+(")/,
    `$1Indexed; source rows loaded$2`
  );
  await fs.writeFile(sourceCoveragePath, text, "utf8");
}

const firstResponse = await fetch(baseUrl, { headers: { "user-agent": "SanctionsRiskPrototype/0.1" } });
if (!firstResponse.ok) throw new Error(`DOJ fetch failed: ${firstResponse.status}`);
const firstHtml = await firstResponse.text();
const pages = extractTotalPages(firstHtml);
const generated = [...extractRows(firstHtml)];

for (let page = 1; page < pages; page += 1) {
  const response = await fetch(`${baseUrl}?page=${page}`, { headers: { "user-agent": "SanctionsRiskPrototype/0.1" } });
  if (!response.ok) throw new Error(`DOJ page ${page} fetch failed: ${response.status}`);
  const html = await response.text();
  const rows = extractRows(html);
  generated.push(...rows);
  console.log(`DOJ page ${page + 1}/${pages}: ${rows.length} rows`);
}

const existing = await readExistingSourceIndex();
const combined = mergeRows(existing, generated);
await fs.writeFile(sourceIndexPath, `window.SOURCE_INDEX = ${JSON.stringify(combined, null, 2)};\n`, "utf8");
await updateCoverage(generated.length);

console.log(`Wrote ${combined.length} source-index rows (${generated.length} DOJ generated).`);
