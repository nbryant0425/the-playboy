import type { Issue, IssueWithCollection, UserCollectionRow } from "./types";
import { periodSortIndex, periodMonths, MONTH_ORDER } from "./types";

export function mergeIssuesWithCollection(
  issues: Issue[],
  collectionRows: Pick<UserCollectionRow, "issue_id" | "owned" | "photo_url" | "condition_notes">[],
  signedPhotoUrls?: Map<string, string>
): IssueWithCollection[] {
  const byIssueId = new Map(collectionRows.map((row) => [row.issue_id, row]));
  return issues.map((issue) => {
    const row = byIssueId.get(issue.id);
    return {
      ...issue,
      collection: row
        ? {
            owned: row.owned,
            photo_url: row.photo_url,
            condition_notes: row.condition_notes,
            photo_signed_url: row.photo_url ? (signedPhotoUrls?.get(row.photo_url) ?? null) : null,
          }
        : null,
    };
  });
}

export function sortIssuesChronologically(issues: IssueWithCollection[]): IssueWithCollection[] {
  return [...issues].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return periodSortIndex(a.issue_period) - periodSortIndex(b.issue_period);
  });
}

export interface YearGroup {
  year: number;
  issues: IssueWithCollection[];
}

export function groupByYear(issues: IssueWithCollection[]): YearGroup[] {
  const sorted = sortIssuesChronologically(issues);
  const byYear = new Map<number, IssueWithCollection[]>();
  for (const issue of sorted) {
    if (!byYear.has(issue.year)) byYear.set(issue.year, []);
    byYear.get(issue.year)!.push(issue);
  }
  return [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, list]) => ({ year, issues: list }));
}

export interface MonthGroup {
  period: string;
  issues: IssueWithCollection[];
}

/**
 * Groups every issue by calendar month (e.g. all "July" issues, 1954-present).
 * A combined issue (a bi-monthly "January/February" or a season like "Winter",
 * which covers Jan/Feb/Mar) shows up under every month it actually covers, so
 * browsing "By Month" never hides an issue you own under a period you didn't
 * think to check.
 */
export function groupByMonth(issues: IssueWithCollection[]): MonthGroup[] {
  const byMonth = new Map<string, IssueWithCollection[]>();
  for (const issue of issues) {
    for (const month of periodMonths(issue.issue_period)) {
      if (!byMonth.has(month)) byMonth.set(month, []);
      byMonth.get(month)!.push(issue);
    }
  }
  return MONTH_ORDER.filter((month) => byMonth.has(month)).map((month) => ({
    period: month,
    issues: byMonth.get(month)!.sort((a, b) => a.year - b.year),
  }));
}

export type OwnershipFilter = "all" | "owned" | "missing";

export function applyOwnershipFilter(issues: IssueWithCollection[], filter: OwnershipFilter): IssueWithCollection[] {
  if (filter === "all") return issues;
  if (filter === "owned") return issues.filter((i) => i.collection?.owned);
  return issues.filter((i) => !i.collection?.owned);
}

export function countOwned(issues: IssueWithCollection[]): number {
  return issues.filter((i) => i.collection?.owned).length;
}

/** Renders the primary issue-card label: "October 1975. Bridgett Rollins with Muhammad Ali." */
export function issueLabel(
  issue: Pick<Issue, "display_label" | "cover_model" | "playmate_name" | "interview_subject">
): string {
  const model = (issue.cover_model || issue.playmate_name)?.trim();
  const guest = issue.interview_subject?.trim();
  if (model && guest) return `${issue.display_label}. ${model} with ${guest}.`;
  if (model) return `${issue.display_label}. ${model}.`;
  return `${issue.display_label}.`;
}
