import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

type Client = SupabaseClient<Database>;

export async function createTag(supabase: Client, userId: string, name: string) {
  const { data, error } = await supabase
    .from("tags")
    .insert({ user_id: userId, name: name.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTag(supabase: Client, tagId: string) {
  const { error } = await supabase.from("tags").delete().eq("id", tagId);
  if (error) throw error;
}

export async function addIssueToTag(supabase: Client, userId: string, tagId: string, issueId: string) {
  const { error } = await supabase
    .from("issue_tags")
    .upsert({ user_id: userId, tag_id: tagId, issue_id: issueId }, { onConflict: "tag_id,issue_id" });
  if (error) throw error;
}

export async function removeIssueFromTag(supabase: Client, tagId: string, issueId: string) {
  const { error } = await supabase.from("issue_tags").delete().eq("tag_id", tagId).eq("issue_id", issueId);
  if (error) throw error;
}
