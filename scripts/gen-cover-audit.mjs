// Research tool (not shipped in the app): generates a local HTML grid of
// playboy.com's own hosted cover images (hotlinked, never downloaded/stored)
// for a given year, each labeled with what our CSV currently says for
// cover_model, so a discrepancy between the printed cover text and our data
// can be spotted in a single screenshot instead of cross-referencing by hand.
//
// Usage: node scripts/gen-cover-audit.mjs 2015
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "_research");
mkdirSync(outDir, { recursive: true });

const year = process.argv[2];
if (!year) {
  console.error("Usage: node scripts/gen-cover-audit.mjs <year>");
  process.exit(1);
}

const csvPath = path.join(__dirname, "..", "supabase", "seed", "playboy_issue_seed_data.csv");
const raw = readFileSync(csvPath, "utf8");
const lines = raw.split(/\r\n|\n/).filter(Boolean);
const header = lines[0].split(",");

function parseCsvLine(line) {
  const fields = [];
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
      fields.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  fields.push(cur);
  return fields;
}

const rows = lines.slice(1).map(parseCsvLine).filter((f) => f[0] === String(year));

const monthNum = {
  January: "01", February: "02", March: "03", April: "04", May: "05", June: "06",
  July: "07", August: "08", September: "09", October: "10", November: "11", December: "12",
};
const seasonMonth = { Winter: "01", Spring: "04", Summer: "07", Fall: "10" };

function firstToken(period) {
  return period.split("/")[0].trim();
}

const cells = rows
  .map((f) => {
    const [, issue_period, display_label, cover_model, playmate_name, interview_subject] = f;
    const tok = firstToken(issue_period);
    const mm = monthNum[tok] || seasonMonth[tok] || "01";
    return `
  <div class="cell">
    <div class="label">${display_label}</div>
    <img src="https://cdn.centerfold.com/magazine/covers/${year}/${mm}/medium.jpg" loading="eager" onerror="this.parentElement.classList.add('missing')" />
    <div class="data">
      <div><span>cover_model:</span> ${cover_model || "<em>none</em>"}</div>
      <div><span>playmate:</span> ${playmate_name || "<em>none</em>"}</div>
      <div><span>interview:</span> ${interview_subject || "<em>none</em>"}</div>
    </div>
  </div>`;
  })
  .join("\n");

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${year} audit</title>
<style>
  body { font-family: sans-serif; background: #222; margin: 0; padding: 12px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .cell { background: #333; border-radius: 4px; overflow: hidden; }
  .cell.missing { opacity: 0.25; }
  .label { color: #fff; font-size: 13px; font-weight: bold; padding: 4px 6px; }
  img { width: 100%; display: block; background: #111; }
  .data { color: #ffd; font-size: 11px; padding: 4px 6px 8px; line-height: 1.4; }
  .data span { color: #999; }
  .data em { color: #f88; font-style: normal; }
</style></head>
<body><div class="grid">${cells}</div></body></html>`;

const outPath = path.join(outDir, `audit-${year}.html`);
writeFileSync(outPath, html);
console.log(`Wrote ${outPath} — open http://localhost:3000/_research/audit-${year}.html (${rows.length} rows)`);
