import fs from "node:fs/promises";
import vm from "node:vm";

const baseDir = new URL("../", import.meta.url);
const sourceIndexPath = new URL("data/sourceIndex.js", baseDir);
const sourceCoveragePath = new URL("data/sourceCoverage.js", baseDir);
const bisIndexUrl = "https://www.bis.gov/enforcement/export-violations";

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

const isoDate = (value) => {
  const match = String(value).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const absolutize = (href) => {
  if (!href) return bisIndexUrl;
  if (href.startsWith("http")) return href;
  return new URL(href, "https://www.bis.gov").toString();
};

async function readExistingSourceIndex() {
  const text = await fs.readFile(sourceIndexPath, "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(text, context);
  return Array.isArray(context.window.SOURCE_INDEX) ? context.window.SOURCE_INDEX : [];
}

function extractRows(html) {
  const rows = [];
  for (const rowMatch of html.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
    const rowHtml = rowMatch[0];
    const cells = Array.from(rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi))
      .map((cell) => cell[1]);
    if (cells.length < 3) continue;

    const codeMatch = cells[0].match(/href="([^"]+)"[\s\S]*?>(E\d+)<\/a>/i);
    const code = codeMatch?.[2];
    const href = codeMatch?.[1];
    const name = textFromHtml(cells[1]);
    const date = isoDate(textFromHtml(cells[2]));
    if (!code || !name || !date) continue;

    rows.push({
      id: `bis-index-${code.toLowerCase()}`,
      date,
      agency: "BIS",
      name,
      amountUsd: null,
      recordType: "BIS export-violation document",
      codingStatus: "Indexed; not yet factor-coded",
      sourceTitle: `BIS Export Violation ${code}`,
      sourceUrl: absolutize(href)
    });
  }
  return rows;
}

function mergeRows(existing, generated) {
  const byId = new Map();
  for (const record of existing) {
    if (!String(record.id || "").startsWith("bis-index-")) byId.set(record.id, record);
  }
  for (const record of generated) {
    byId.set(record.id, record);
  }
  for (const record of existing.filter((item) => String(item.id || "").startsWith("bis-index-"))) {
    const generatedRecord = byId.get(record.id);
    byId.set(record.id, {
      ...generatedRecord,
      ...record,
      amountUsd: record.amountUsd ?? generatedRecord?.amountUsd ?? null,
      sourceUrl: record.sourceUrl || generatedRecord?.sourceUrl || bisIndexUrl
    });
  }
  return Array.from(byId.values())
    .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
}

async function updateCoverage(count) {
  let text = await fs.readFile(sourceCoveragePath, "utf8");
  text = text.replace(/(agency: "BIS",[\s\S]*?indexedRecords: )\d+/, `$1${count}`);
  text = text.replace(
    /(agency: "BIS",[\s\S]*?indexedPeriod: ")[^"]+(")/,
    `$1Official BIS export-violations index fetched from bis.gov$2`
  );
  text = text.replace(
    /(agency: "BIS",[\s\S]*?status: ")[^"]+(")/,
    `$1Indexed; source rows loaded$2`
  );
  await fs.writeFile(sourceCoveragePath, text, "utf8");
}

const response = await fetch(bisIndexUrl, { headers: { "user-agent": "SanctionsRiskPrototype/0.1" } });
if (!response.ok) throw new Error(`BIS fetch failed: ${response.status}`);
const html = await response.text();
const generated = extractRows(html);
const existing = await readExistingSourceIndex();
const combined = mergeRows(existing, generated);

await fs.writeFile(sourceIndexPath, `window.SOURCE_INDEX = ${JSON.stringify(combined, null, 2)};\n`, "utf8");
await updateCoverage(generated.length);

console.log(`Wrote ${combined.length} source-index rows (${generated.length} BIS generated).`);
