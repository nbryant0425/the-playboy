import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";
import type { Highlight } from "./types";

type Client = SupabaseClient<Database>;

export async function addHighlight(
  supabase: Client,
  userId: string,
  issueId: string,
  input: { file: File | null; description: string }
): Promise<Highlight> {
  let photoPath: string | null = null;
  if (input.file) {
    const ext = input.file.name.split(".").pop() || "jpg";
    photoPath = `${userId}/highlights/${issueId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("collection-photos")
      .upload(photoPath, input.file, { cacheControl: "3600", upsert: false });
    if (uploadError) throw uploadError;
  }

  const { data, error } = await supabase
    .from("highlights")
    .insert({
      user_id: userId,
      issue_id: issueId,
      photo_url: photoPath,
      description: input.description.trim() || null,
    })
    .select()
    .single();

  if (error) {
    if (photoPath) await supabase.storage.from("collection-photos").remove([photoPath]);
    throw error;
  }
  return data;
}

export async function deleteHighlight(supabase: Client, highlight: Pick<Highlight, "id" | "photo_url">) {
  const { error } = await supabase.from("highlights").delete().eq("id", highlight.id);
  if (error) throw error;
  if (highlight.photo_url) {
    await supabase.storage.from("collection-photos").remove([highlight.photo_url]);
  }
}
