// One-time structural migration: Playboy stopped monthly publication in 2017.
// 2017-2018 were bi-monthly ("January/February", etc.); 2019-2020 were
// quarterly, labeled by season (Winter/Spring/Summer/Fall) on the actual
// print masthead (confirmed directly against playboy.com's own issue pages).
// Print stopped after Spring 2020.
//
// This script:
//   1. Merges each real combined issue's constituent monthly rows into one
//      row (keeping every distinct Playmate name, tagged by month).
//   2. Deletes the now-redundant monthly rows.
//   3. Deletes everything after Spring 2020 (Jul-Dec 2020, the 2021 seasonal
//      placeholders, and all of 2025-2026) as non-existent issues.
//
// Usage: node scripts/restructure-late-era.mjs [--dry-run]
import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, "..", "supabase", "seed", "playboy_issue_seed_data.csv");
const envPath = path.join(__dirname, "..", ".env.local");
const dryRun = process.argv.includes("--dry-run");

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

const rows = parse(readFileSync(csvPath, "utf-8"), { columns: true, skip_empty_lines: true });
const byLabel = new Map(rows.map((r) => [r.display_label, r]));

// --- Groupings for the real combined-issue era ---
const bimonthlyGroups = (year) => [
  ["January", "February"],
  ["March", "April"],
  ["May", "June"],
  ["July", "August"],
  ["September", "October"],
  ["November", "December"],
].map((months) => ({ year, months, period: months.join("/") }));

const quarterlySeasonGroups = (year, months6only = false) => {
  const groups = [
    { season: "Winter", months: ["January", "February", "March"] },
    { season: "Spring", months: ["April", "May", "June"] },
    { season: "Summer", months: ["July", "August", "September"] },
    { season: "Fall", months: ["October", "November", "December"] },
  ];
  return (months6only ? groups.slice(0, 2) : groups).map((g) => ({ year, months: g.months, period: g.season }));
};

const groups = [
  ...bimonthlyGroups("2017"),
  ...bimonthlyGroups("2018"),
  ...quarterlySeasonGroups("2019"),
  ...quarterlySeasonGroups("2020", true), // only Winter + Spring exist
];

function mergeGroup({ year, months, period }) {
  const sourceRows = months.map((m) => byLabel.get(`${m} ${year}`)).filter(Boolean);
  if (sourceRows.length === 0) return null;

  const coverModel = sourceRows.map((r) => r.cover_model).find((v) => v && v.trim()) || "";

  const playmateParts = sourceRows
    .map((r, i) => (r.playmate_name && r.playmate_name.trim() ? `${r.playmate_name.trim()} (${months[i]})` : null))
    .filter(Boolean);
  const playmateName = playmateParts.join(", ");

  const interviewValues = [...new Set(sourceRows.map((r) => r.interview_subject).filter((v) => v && v.trim()))];
  const interviewSubject = interviewValues.join("; ");

  const notableValues = [...new Set(sourceRows.map((r) => r.notable_cover_names).filter((v) => v && v.trim()))];
  const notableCoverNames = notableValues.join("; ");

  const confidence = sourceRows.some((r) => r.source_confidence === "verified") ? "verified" : sourceRows[0].source_confidence;

  return {
    year,
    issue_period: period,
    display_label: `${period} ${year}`,
    cover_model: coverModel,
    playmate_name: playmateName,
    interview_subject: interviewSubject,
    notable_cover_names: notableCoverNames,
    source_confidence: confidence,
    consumedLabels: months.map((m) => `${m} ${year}`),
  };
}

const newRows = groups.map(mergeGroup).filter(Boolean);
const labelsToRemove = new Set(newRows.flatMap((r) => r.consumedLabels));

// Also remove everything after Spring 2020: Jul-Dec 2020, the 2021 seasonal
// placeholders, and all of 2025-2026 (non-existent issues).
const extraRemovals = [
  "July 2020", "August 2020", "September 2020", "October 2020", "November 2020", "December 2020",
  "Winter 2021", "Spring 2021",
  ...["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m) => `${m} 2025`),
  ...["January", "February", "March", "April", "May", "June", "July", "August", "September"].map((m) => `${m} 2026`),
];
for (const label of extraRemovals) labelsToRemove.add(label);

console.log(`Merging into ${newRows.length} combined-issue rows.`);
console.log(`Removing ${labelsToRemove.size} old/nonexistent rows.`);

if (dryRun) {
  console.log("\nSample merged rows:");
  console.log(newRows.slice(0, 3));
  console.log("\n--dry-run: no changes written.");
  process.exit(0);
}

// --- Rebuild the CSV: drop removed labels, append new combined rows ---
const fields = ["year", "issue_period", "display_label", "cover_model", "playmate_name", "interview_subject", "notable_cover_names", "source_confidence"];
function csvCell(value) {
  const v = value ?? "";
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

const keptRows = rows.filter((r) => !labelsToRemove.has(r.display_label));
const allRows = [...keptRows, ...newRows].sort((a, b) => {
  if (a.year !== b.year) return Number(a.year) - Number(b.year);
  return 0;
});

const csvLines = [fields.join(",")];
for (const r of allRows) {
  csvLines.push(fields.map((f) => csvCell(r[f])).join(","));
}
writeFileSync(csvPath, csvLines.join("\n") + "\n");
console.log(`CSV rewritten: ${allRows.length} total rows (was ${rows.length}).`);

// --- Apply to Supabase: delete removed rows, insert new combined rows ---
async function sb(pathAndQuery, options) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res;
}

const removeList = [...labelsToRemove];
for (let i = 0; i < removeList.length; i += 20) {
  const batch = removeList.slice(i, i + 20);
  const filter = batch.map((l) => encodeURIComponent(l)).join(",");
  await sb(`issues?display_label=in.(${filter})`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}
console.log(`Supabase: deleted ${removeList.length} rows.`);

const insertPayload = newRows.map(({ consumedLabels, ...rest }) => rest);
await sb("issues", {
  method: "POST",
  headers: { Prefer: "return=minimal" },
  body: JSON.stringify(insertPayload),
});
console.log(`Supabase: inserted ${insertPayload.length} combined rows.`);
