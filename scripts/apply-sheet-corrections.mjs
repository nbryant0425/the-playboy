// Processes the user's own researched Google Sheet (scripts/cover-model-sheet.csv,
// columns: Year, Month, Cover Model) into cover_model corrections.
//
// Handles:
//   - Combined-month issues ("January/February", "April/May/June") — the same
//     cover value is applied to each constituent month's existing row.
//   - Illustration covers ("Vol. 1, No. 2") — stored verbatim as cover_model,
//     since that's literally what's printed on the cover.
//   - Multi-person covers ("Leigh Lewin, Arlene Kieta") — stored verbatim.
//
// This is the user's own primary-source research, so it takes priority over
// (and will overwrite) any earlier cover_model value, including ones this
// project already verified against playboy.com.
//
// Usage: node scripts/apply-sheet-corrections.mjs [--dry-run]
import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sheetPath = path.join(__dirname, "cover-model-sheet.csv");
const csvPath = path.join(__dirname, "..", "supabase", "seed", "playboy_issue_seed_data.csv");
const envPath = path.join(__dirname, "..", ".env.local");
const dryRun = process.argv.includes("--dry-run");

const MONTH_NAMES = new Set([
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]);

const env = Object.fromEntries(
  readFileSync(envPath, "utf-8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

// --- 1. Parse the sheet and expand combined-month rows into single targets ---
const sheetRows = parse(readFileSync(sheetPath, "utf-8"), { columns: true, skip_empty_lines: true });

const targets = new Map(); // display_label -> cover_model
const badMonths = [];

for (const row of sheetRows) {
  const year = (row.Year || "").trim();
  const coverValue = (row["Cover Model"] || "").trim();
  if (!year || !coverValue) continue;

  for (const rawMonth of (row.Month || "").split("/")) {
    const month = rawMonth.trim();
    if (!MONTH_NAMES.has(month)) {
      badMonths.push({ year, month, raw: row.Month });
      continue;
    }
    targets.set(`${month} ${year}`, coverValue);
  }
}

console.log(`Parsed ${sheetRows.length} sheet rows -> ${targets.size} unique (month, year) targets.`);
if (badMonths.length) {
  console.log(`Unrecognized month tokens (skipped):`, badMonths.slice(0, 10));
}

// --- 2. Cross-reference against our CSV ---
function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  cells.push(cur);
  return cells;
}
function csvCell(value) {
  if (value == null) return "";
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

const raw = readFileSync(csvPath, "utf-8");
const lines = raw.split(/\r\n|\n/);
const header = parseCsvLine(lines[0]);
const displayLabelIdx = header.indexOf("display_label");
const coverModelIdx = header.indexOf("cover_model");
const confidenceIdx = header.indexOf("source_confidence");

const existingLabels = new Set();
for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  existingLabels.add(parseCsvLine(lines[i])[displayLabelIdx]);
}

const matched = [];
const unmatched = [];
for (const [label, coverModel] of targets) {
  if (existingLabels.has(label)) matched.push([label, coverModel]);
  else unmatched.push([label, coverModel]);
}

console.log(`Matched to existing issues: ${matched.length}`);
console.log(`Unmatched (no such issue in our data): ${unmatched.length}`);
if (unmatched.length) console.log(unmatched.slice(0, 20));

if (dryRun) {
  console.log("\n--dry-run: no changes written.");
  process.exit(0);
}

// --- 3. Apply to the CSV ---
const byLabel = new Map(matched);
let csvUpdated = 0;
const newLines = lines.map((line, i) => {
  if (i === 0 || !line.trim()) return line;
  const cells = parseCsvLine(line);
  const label = cells[displayLabelIdx];
  if (byLabel.has(label)) {
    cells[coverModelIdx] = byLabel.get(label);
    cells[confidenceIdx] = "verified";
    csvUpdated++;
    return cells.map(csvCell).join(",");
  }
  return line;
});
writeFileSync(csvPath, newLines.join("\n"));
console.log(`\nCSV: updated ${csvUpdated} rows`);

// --- 4. Apply to Supabase ---
let dbUpdated = 0;
let dbFailed = 0;
for (const [display_label, cover_model] of matched) {
  const url = `${SUPABASE_URL}/rest/v1/issues?display_label=eq.${encodeURIComponent(display_label)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ cover_model, source_confidence: "verified" }),
  });
  if (!res.ok) {
    dbFailed++;
    console.error(`FAILED: ${display_label} (${res.status}) ${await res.text()}`);
  } else {
    dbUpdated++;
  }
}
console.log(`Supabase: updated ${dbUpdated}, failed ${dbFailed}`);
