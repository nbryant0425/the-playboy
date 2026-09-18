export type SourceConfidence = "verified" | "wikipedia-sourced" | "needs-verification" | "unknown";

export interface Issue {
  id: string;
  year: number;
  issue_period: string;
  display_label: string;
  /** Who is literally photographed on the front cover. May be the same person as playmate_name, or a different named celebrity/model, or null if unresolved. */
  cover_model: string | null;
  /** The centerfold Playmate of the Month — distinct from the cover model especially from the 1990s onward. */
  playmate_name: string | null;
  interview_subject: string | null;
  notable_cover_names: string | null;
  synopsis: string | null;
  source_confidence: SourceConfidence;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface IssueTag {
  id: string;
  tag_id: string;
  issue_id: string;
  user_id: string;
  created_at: string;
}

export interface UserCollectionRow {
  id: string;
  user_id: string;
  issue_id: string;
  owned: boolean;
  photo_url: string | null;
  condition_notes: string | null;
  added_at: string;
  updated_at: string;
}

/** An issue joined with the signed-in user's collection state for it (if any). */
export interface IssueWithCollection extends Issue {
  collection:
    | (Pick<UserCollectionRow, "owned" | "photo_url" | "condition_notes"> & {
        /** Signed, temporary URL for `photo_url` — resolved server-side since the storage bucket is private. */
        photo_signed_url?: string | null;
      })
    | null;
}

export type CorrectionField =
  | "cover_model"
  | "playmate_name"
  | "interview_subject"
  | "notable_cover_names"
  | "source_confidence";

export interface IssueCorrection {
  id: string;
  issue_id: string;
  suggested_by: string;
  field: CorrectionField;
  suggested_value: string;
  status: "pending" | "accepted" | "rejected";
  note: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
  created_at: string;
  responded_at: string | null;
}

export const MONTH_ORDER = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const SEASON_ORDER = ["Winter", "Spring", "Summer", "Fall"] as const;

const SEASON_MONTHS: Record<(typeof SEASON_ORDER)[number], string[]> = {
  Winter: ["January", "February", "March"],
  Spring: ["April", "May", "June"],
  Summer: ["July", "August", "September"],
  Fall: ["October", "November", "December"],
};

/** Every calendar month a period covers, e.g. "January/February" -> ["January", "February"], "Winter" -> ["January", "February", "March"]. */
export function periodMonths(period: string): string[] {
  if (period in SEASON_MONTHS) return SEASON_MONTHS[period as (typeof SEASON_ORDER)[number]];
  return period.split("/").map((p) => p.trim()).filter((p) => (MONTH_ORDER as readonly string[]).includes(p));
}

/** Sort key for an issue_period within a year: months first in calendar order (combined periods sort by their first month), then seasons. */
export function periodSortIndex(period: string): number {
  const firstToken = period.split("/")[0].trim();
  const monthIdx = MONTH_ORDER.indexOf(firstToken as (typeof MONTH_ORDER)[number]);
  if (monthIdx !== -1) return monthIdx;
  const seasonIdx = SEASON_ORDER.indexOf(period as (typeof SEASON_ORDER)[number]);
  if (seasonIdx !== -1) return 12 + seasonIdx;
  return 99;
}
