import Fuse, { type IFuseOptions } from "fuse.js";
import type { IssueWithCollection } from "./types";

export type SearchMatchRole = "Cover" | "Playmate" | "Interview" | "Notable name";

export interface SearchResult {
  issue: IssueWithCollection;
  roles: SearchMatchRole[];
}

const options: IFuseOptions<IssueWithCollection> = {
  keys: [
    { name: "cover_model", weight: 2 },
    { name: "playmate_name", weight: 1.5 },
    { name: "interview_subject", weight: 2 },
    { name: "notable_cover_names", weight: 1 },
  ],
  threshold: 0.22,
  ignoreLocation: true,
  minMatchCharLength: 3,
  includeMatches: true,
};

export function createIssueSearchIndex(issues: IssueWithCollection[]) {
  return new Fuse(issues, options);
}

/** Runs the query and tags each hit with which field(s) it matched, so the UI can show a "Cover" / "Playmate" / "Interview" chip. */
export function searchIssues(index: Fuse<IssueWithCollection>, query: string): SearchResult[] {
  if (!query.trim()) return [];
  const hits = index.search(query);
  return hits.map((hit) => {
    const roles = new Set<SearchMatchRole>();
    for (const match of hit.matches ?? []) {
      if (match.key === "cover_model") roles.add("Cover");
      if (match.key === "playmate_name") roles.add("Playmate");
      if (match.key === "interview_subject") roles.add("Interview");
      if (match.key === "notable_cover_names") roles.add("Notable name");
    }
    return { issue: hit.item, roles: [...roles] };
  });
}
