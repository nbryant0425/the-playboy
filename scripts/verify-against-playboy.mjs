// One-time research script: cross-checks our seed CSV's cover_model and
// interview_subject fields against playboy.com's own issue archive
// (https://www.playboy.com/magazine/issues/{year}/{MM}), which only covers
// December 1953 through April 2020. Fetches only factual metadata (names) —
// never stores or reproduces the site's copyrighted article text or images.
//
// playboy.com uses a few different TOC label conventions across eras:
//   - "Playboy Interview: NAME"                (most issues)
//   - "NAME--candid conversation ... <page#>"   (some OCR'd older issues, as
//     a second, noisier copy of the same fact elsewhere on the page)
//   - "Playmate: NAME"                          (modern issues)
//   - "NAME, Miss <Month>, <Year>" pictorial title (older issues)
// This version tries multiple patterns and only accepts name-shaped matches.
//
// Usage: node scripts/verify-against-playboy.mjs
// Writes a report to scripts/verify-report.json and prints a summary.
import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, "..", "supabase", "seed", "playboy_issue_seed_data.csv");
const reportPath = path.join(__dirname, "verify-report.json");

const MONTH_NUM = {
  January: "01", February: "02", March: "03", April: "04", May: "05", June: "06",
  July: "07", August: "08", September: "09", October: "10", November: "11", December: "12",
};
const MONTH_NAMES = Object.keys(MONTH_NUM);

const ARCHIVE_END = { year: 2020, month: 4 };

function withinArchiveRange(year, monthNum) {
  if (year < ARCHIVE_END.year) return true;
  if (year === ARCHIVE_END.year) return monthNum <= ARCHIVE_END.month;
  return false;
}

// A match is "name-shaped" if it looks like a plausible human name/short
// phrase: starts uppercase, no digits, no stray punctuation runs, reasonable length.
function isNameShaped(s) {
  if (!s) return false;
  const t = s.trim();
  if (t.length < 2 || t.length > 60) return false;
  if (/\d/.test(t)) return false;
  if (/(call|price|sheet|only \$|conversation|please)/i.test(t)) return false;
  if (!/^[A-ZÀ-Ý]/.test(t)) return false;
  return true;
}

function cleanNameMatch(raw) {
  if (!raw) return null;
  // stop at the first sign of OCR/page-number noise
  const stopped = raw.split(/--|\.\.\.|\s{2,}\d|\n/)[0].trim();
  return isNameShaped(stopped) ? stopped : null;
}

function extractInterview(html) {
  const matches = [...html.matchAll(/Playboy Interview:\s*([^"&<\n]{2,80})/g)];
  for (const m of matches) {
    const cleaned = cleanNameMatch(m[1]);
    if (cleaned) return cleaned;
  }
  return null;
}

function extractPlaymate(html, year, monthName) {
  // Primary: modern "Playmate: NAME" label
  const direct = [...html.matchAll(/Playmate:\s*([^"&<\n]{2,80})/g)];
  for (const m of direct) {
    const cleaned = cleanNameMatch(m[1]);
    if (cleaned) return cleaned;
  }
  // Fallback: older "NAME, Miss <Month>, <Year>" pictorial title convention
  const missPattern = new RegExp(`([A-ZÀ-Ý][A-Za-zÀ-ÿ'.\\- ]{1,50}),\\s*Miss\\s+${monthName},?\\s*${year}`, "i");
  const missMatch = html.match(missPattern);
  if (missMatch) {
    const cleaned = cleanNameMatch(missMatch[1]);
    if (cleaned) return cleaned;
  }
  return null;
}

function normalizeName(s) {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function namesRoughlyMatch(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return null;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const lastA = na.split(" ").pop();
  const lastB = nb.split(" ").pop();
  if (lastA && lastB && lastA === lastB && lastA.length > 2) return true;
  return false;
}

async function fetchIssue(year, monthNum, monthName) {
  const url = `https://www.playboy.com/magazine/issues/${year}/${monthNum}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (res.status === 404) return { status: "not_found", url };
    if (!res.ok) return { status: "error", url, httpStatus: res.status };
    const html = await res.text();
    return {
      status: "ok",
      url,
      sitePlaymate: extractPlaymate(html, year, monthName),
      siteInterview: extractInterview(html),
    };
  } catch (err) {
    return { status: "error", url, error: String(err) };
  }
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

async function main() {
  const raw = readFileSync(csvPath, "utf-8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true });

  const candidates = rows
    .map((row, idx) => ({ row, idx, monthNum: MONTH_NUM[row.issue_period] }))
    .filter(({ row, monthNum }) => monthNum && withinArchiveRange(parseInt(row.year, 10), parseInt(monthNum, 10)));

  console.log(`Checking ${candidates.length} of ${rows.length} issues against playboy.com (archive covers Dec 1953 - Apr 2020)...`);

  let done = 0;
  const results = await mapWithConcurrency(candidates, 10, async ({ row, monthNum }) => {
    const site = await fetchIssue(row.year, monthNum, row.issue_period);
    done++;
    if (done % 150 === 0) console.log(`  ${done}/${candidates.length}...`);

    let playmateVerdict = "unverified";
    let interviewVerdict = "unverified";
    if (site.status === "ok") {
      if (site.sitePlaymate) {
        const match = namesRoughlyMatch(row.cover_model, site.sitePlaymate);
        playmateVerdict = match ? "match" : "MISMATCH";
      }
      if (site.siteInterview) {
        const match = namesRoughlyMatch(row.interview_subject, site.siteInterview);
        interviewVerdict = match ? "match" : row.interview_subject ? "MISMATCH" : "MISMATCH_ours_blank";
      } else if (row.interview_subject) {
        interviewVerdict = "unverified"; // site had nothing extractable; don't accuse
      } else {
        interviewVerdict = "both_blank";
      }
    }

    return {
      display_label: row.display_label,
      ours: { cover_model: row.cover_model, interview_subject: row.interview_subject },
      site: { status: site.status, playmate: site.sitePlaymate ?? null, interview: site.siteInterview ?? null, url: site.url },
      playmateVerdict,
      interviewVerdict,
    };
  });

  const interviewMismatches = results.filter((r) => r.interviewVerdict.startsWith("MISMATCH"));
  const playmateMismatches = results.filter((r) => r.playmateVerdict === "MISMATCH");
  const notFound = results.filter((r) => r.site.status === "not_found");

  writeFileSync(reportPath, JSON.stringify({ results, interviewMismatches, playmateMismatches, notFound }, null, 2));

  console.log(`\nChecked: ${results.length}`);
  console.log(`Interview mismatches: ${interviewMismatches.length}`);
  console.log(`Playmate mismatches: ${playmateMismatches.length}`);
  console.log(`404 on playboy.com: ${notFound.length}`);
  console.log(`Full report: ${path.relative(process.cwd(), reportPath)}`);
}

main();
