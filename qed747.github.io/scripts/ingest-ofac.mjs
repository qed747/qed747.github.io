import fs from "node:fs/promises";
import vm from "node:vm";

const years = Array.from({ length: 24 }, (_, index) => 2026 - index);
const baseDir = new URL("../", import.meta.url);
const sourceIndexPath = new URL("data/sourceIndex.js", baseDir);
const sourceCoveragePath = new URL("data/sourceCoverage.js", baseDir);

const pageCandidates = (year) => {
  if (year === 2026) {
    return [
      "https://ofac.treasury.gov/civil-penalties-and-enforcement-information",
      "https://ofac.treasury.gov/civil-penalties-and-enforcement-information/2026-enforcement-information"
    ];
  }
  return [`https://ofac.treasury.gov/civil-penalties-and-enforcement-information/${year}-enforcement-information`];
};

const moneyToNumber = (value) => {
  if (!value) return null;
  const cleaned = value.replace(/[$,\s]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const decodeHtml = (value) => value
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&#039;/g, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&ndash;/gi, "-")
  .replace(/&mdash;/gi, "-")
  .replace(/\s+/g, " ")
  .trim();

const textFromHtml = (html) => decodeHtml(html.replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " "));

const slugify = (value) => value.toLowerCase()
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 72);

const isoDate = (value) => {
  const match = String(value).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

async function fetchYear(year) {
  const errors = [];
  for (const url of pageCandidates(year)) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "SanctionsRiskPrototype/0.1" } });
      if (!response.ok) {
        errors.push(`${url} ${response.status}`);
        continue;
      }
      return { url, html: await response.text() };
    } catch (error) {
      errors.push(`${url} ${error.message}`);
    }
  }
  throw new Error(`No OFAC page fetched for ${year}: ${errors.join("; ")}`);
}

function extractRowsFromTables(html, year, pageUrl) {
  const rows = [];
  for (const rowMatch of html.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
    const cells = Array.from(rowMatch[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi))
      .map((cell) => textFromHtml(cell[1]))
      .filter(Boolean);
    if (cells.length < 2) continue;

    const dateIndex = cells.findIndex((cell) => isoDate(cell));
    if (dateIndex === -1) continue;

    const date = isoDate(cells[dateIndex]);
    const name = cells[dateIndex + 1];
    const amountCell = cells.slice(dateIndex + 2).reverse().find((cell) => /^\$?\s?\d[\d,\s]*(?:\.\d{2})?$/.test(cell));
    const amountUsd = moneyToNumber(amountCell);
    if (!date || !name || !amountUsd) continue;

    rows.push(makeRecord({ year, date, name, amountUsd, pageUrl }));
  }
  return dedupe(rows);
}

function extractRowsFromText(html, year, pageUrl) {
  const lines = textFromHtml(html)
    .split(/(?=\d{1,2}\/\d{1,2}\/\d{4})|[\n\r]+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const rows = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const date = isoDate(line);
    if (!date) continue;
    const tail = line.replace(/^\d{1,2}\/\d{1,2}\/\d{4}\s*[a-z]?\s*/i, "").trim();
    const amountMatch = line.match(/\$?\s?\d[\d,]{3,}(?:\.\d{2})?/);
    if (tail && amountMatch) {
      const name = tail.split(/\$?\s?\d[\d,]{3,}(?:\.\d{2})?/)[0].replace(/\b\d+\b\s*$/, "").trim();
      if (name.length > 2) rows.push(makeRecord({ year, date, name, amountUsd: moneyToNumber(amountMatch[0]), pageUrl }));
      continue;
    }

    const nextLines = lines.slice(index + 1, index + 6);
    const amountLine = nextLines.find((candidate) => /\$?\s?\d[\d,]{3,}(?:\.\d{2})?/.test(candidate));
    const name = nextLines.find((candidate) => !/\$?\s?\d[\d,]{3,}(?:\.\d{2})?/.test(candidate) && !/^\d+$/.test(candidate));
    if (name && amountLine) {
      rows.push(makeRecord({ year, date, name, amountUsd: moneyToNumber(amountLine.match(/\$?\s?\d[\d,]{3,}(?:\.\d{2})?/)?.[0]), pageUrl }));
    }
  }

  return dedupe(rows);
}

function makeRecord({ year, date, name, amountUsd, pageUrl }) {
  return {
    id: `ofac-index-${date}-${slugify(name)}`,
    date,
    agency: "OFAC",
    name,
    amountUsd,
    recordType: "Penalty chart row",
    codingStatus: "Indexed; not yet factor-coded",
    sourceTitle: `OFAC ${year} Civil Penalties Information Chart`,
    sourceUrl: pageUrl
  };
}

function dedupe(rows) {
  const seen = new Map();
  for (const row of rows) {
    const key = `${row.date}|${row.name.toLowerCase()}|${row.amountUsd}`;
    if (!seen.has(key)) seen.set(key, row);
  }
  return Array.from(seen.values());
}

async function readExistingSourceIndex() {
  try {
    const text = await fs.readFile(sourceIndexPath, "utf8");
    const context = { window: {} };
    vm.createContext(context);
    vm.runInContext(text, context);
    return Array.isArray(context.window.SOURCE_INDEX) ? context.window.SOURCE_INDEX : [];
  } catch {
    return [];
  }
}

async function writeSourceIndex(records) {
  const serialized = `window.SOURCE_INDEX = ${JSON.stringify(records, null, 2)};\n`;
  await fs.writeFile(sourceIndexPath, serialized, "utf8");
}

async function updateCoverage(ofacCount) {
  let text = await fs.readFile(sourceCoveragePath, "utf8");
  text = text.replace(/(agency: "OFAC",[\s\S]*?indexedRecords: )\d+/, `$1${ofacCount}`);
  text = text.replace(
    /(agency: "OFAC",[\s\S]*?indexedPeriod: ")[^"]+(")/,
    `$1Official OFAC civil-penalty rows fetched from yearly pages where parsable$2`
  );
  await fs.writeFile(sourceCoveragePath, text, "utf8");
}

const generated = [];
const failures = [];

for (const year of years) {
  try {
    const page = await fetchYear(year);
    const tableRows = extractRowsFromTables(page.html, year, page.url);
    const rows = tableRows.length ? tableRows : extractRowsFromText(page.html, year, page.url);
    generated.push(...rows);
    console.log(`${year}: ${rows.length} rows`);
  } catch (error) {
    failures.push(`${year}: ${error.message}`);
    console.warn(`${year}: failed - ${error.message}`);
  }
}

const existing = await readExistingSourceIndex();
const manual = existing.filter((record) => !String(record.id || "").startsWith("ofac-index-"));
const combined = dedupe([...manual, ...generated])
  .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));

await writeSourceIndex(combined);
await updateCoverage(generated.length);

console.log(`Wrote ${combined.length} source-index rows (${generated.length} OFAC generated, ${manual.length} manual).`);
if (failures.length) {
  console.warn(`Failures:\n${failures.join("\n")}`);
}
