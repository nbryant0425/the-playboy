import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

type Client = SupabaseClient<Database>;

/** Toggles (or explicitly sets) the owned flag for one issue, for the signed-in user. RLS restricts this to their own row. */
export async function setOwned(supabase: Client, userId: string, issueId: string, owned: boolean) {
  const { error } = await supabase
    .from("user_collection")
    .upsert({ user_id: userId, issue_id: issueId, owned }, { onConflict: "user_id,issue_id" });
  if (error) throw error;
}

/** Uploads a photo of a physical copy to the user's private storage folder and marks the issue owned. */
export async function attachPhotoAndMarkOwned(supabase: Client, userId: string, issueId: string, file: File) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${issueId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("collection-photos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { error: upsertError } = await supabase
    .from("user_collection")
    .upsert({ user_id: userId, issue_id: issueId, owned: true, photo_url: path }, { onConflict: "user_id,issue_id" });
  if (upsertError) throw upsertError;

  return path;
}

export async function getSignedPhotoUrl(supabase: Client, path: string, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage.from("collection-photos").createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

/** Bulk version for grid views showing many photos at once — one API call instead of one per card. */
export async function getSignedPhotoUrls(supabase: Client, paths: string[], expiresInSeconds = 3600) {
  if (paths.length === 0) return new Map<string, string>();
  const { data, error } = await supabase.storage.from("collection-photos").createSignedUrls(paths, expiresInSeconds);
  if (error) throw error;
  const map = new Map<string, string>();
  for (const item of data) {
    if (item.signedUrl && item.path) map.set(item.path, item.signedUrl);
  }
  return map;
}

export async function updateConditionNotes(supabase: Client, userId: string, issueId: string, notes: string) {
  const { error } = await supabase
    .from("user_collection")
    .upsert(
      { user_id: userId, issue_id: issueId, owned: true, condition_notes: notes },
      { onConflict: "user_id,issue_id" }
    );
  if (error) throw error;
}

export async function suggestCorrection(
  supabase: Client,
  userId: string,
  issueId: string,
  field: "cover_model" | "playmate_name" | "interview_subject" | "notable_cover_names" | "source_confidence",
  suggestedValue: string,
  note?: string
) {
  const { error } = await supabase.from("issue_corrections").insert({
    issue_id: issueId,
    suggested_by: userId,
    field,
    suggested_value: suggestedValue,
    note: note || null,
  });
  if (error) throw error;
}
