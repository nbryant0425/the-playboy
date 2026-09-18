// Applies confirmed cover_model corrections (from visual verification against
// playboy.com's hosted cover images) to both the CSV (source of truth) and
// the live Supabase `issues` table.
//
// Usage: node scripts/apply-cover-corrections.mjs corrections.json
// corrections.json: [{ "display_label": "May 1990", "cover_model": "Margaux Hemingway" }, ...]
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, "..", "supabase", "seed", "playboy_issue_seed_data.csv");

const envPath = path.join(__dirname, "..", ".env.local");
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

const correctionsPath = process.argv[2];
if (!correctionsPath) {
  console.error("Usage: node scripts/apply-cover-corrections.mjs <corrections.json>");
  process.exit(1);
}
const corrections = JSON.parse(readFileSync(correctionsPath, "utf-8"));

// --- 1. Update the CSV ---
function parseCsvLine(line) {
  // Minimal CSV cell splitter that respects quoted commas (our CSV's own generator uses this shape).
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

const byLabel = new Map(corrections.map((c) => [c.display_label, c.cover_model]));
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
console.log(`CSV: updated ${csvUpdated}/${corrections.length} rows`);

// --- 2. Update Supabase ---
let dbUpdated = 0;
for (const { display_label, cover_model } of corrections) {
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
    console.error(`FAILED: ${display_label} (${res.status}) ${await res.text()}`);
  } else {
    dbUpdated++;
  }
}
console.log(`Supabase: updated ${dbUpdated}/${corrections.length} rows`);
