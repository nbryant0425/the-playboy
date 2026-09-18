// Research tool (not shipped in the app): generates a local HTML grid of
// playboy.com's own hosted cover images (hotlinked, never downloaded/stored)
// for a given year, labeled by month, so covers can be visually read in
// batches instead of one browser navigation per issue.
//
// Usage: node scripts/gen-cover-batch.mjs 2015
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "_research");
mkdirSync(outDir, { recursive: true });

const year = process.argv[2];
if (!year) {
  console.error("Usage: node scripts/gen-cover-batch.mjs <year>");
  process.exit(1);
}

const months = [
  "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12",
];
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const cells = months
  .map(
    (m, i) => `
  <div class="cell">
    <div class="label">${monthNames[i]} ${year}</div>
    <img src="https://cdn.centerfold.com/magazine/covers/${year}/${m}/medium.jpg" loading="eager" onerror="this.parentElement.classList.add('missing')" />
  </div>`
  )
  .join("\n");

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${year} covers</title>
<style>
  body { font-family: sans-serif; background: #222; margin: 0; padding: 12px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .cell { background: #333; border-radius: 4px; overflow: hidden; }
  .cell.missing { opacity: 0.25; }
  .label { color: #fff; font-size: 12px; padding: 4px 6px; }
  img { width: 100%; display: block; background: #111; }
</style></head>
<body><div class="grid">${cells}</div></body></html>`;

const outPath = path.join(outDir, `covers-${year}.html`);
writeFileSync(outPath, html);
console.log(`Wrote ${outPath} — open http://localhost:3000/_research/covers-${year}.html`);
