import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";
import type { Highlight } from "./types";

type Client = SupabaseClient<Database>;

/** Reading order: by magazine page number, with unnumbered highlights last in the order they were added. */
export function sortHighlights<T extends Pick<Highlight, "page_number" | "created_at">>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.page_number !== null && b.page_number !== null && a.page_number !== b.page_number) {
      return a.page_number - b.page_number;
    }
    if (a.page_number !== null && b.page_number === null) return -1;
    if (a.page_number === null && b.page_number !== null) return 1;
    return a.created_at.localeCompare(b.created_at);
  });
}

export async function addHighlight(
  supabase: Client,
  userId: string,
  issueId: string,
  input: { file: File | null; description: string; pageNumber: number | null }
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
      page_number: input.pageNumber,
    })
    .select()
    .single();

  if (error) {
    if (photoPath) await supabase.storage.from("collection-photos").remove([photoPath]);
    throw error;
  }
  return data;
}

export async function updateHighlight(
  supabase: Client,
  highlightId: string,
  input: { description: string; pageNumber: number | null }
): Promise<Highlight> {
  const { data, error } = await supabase
    .from("highlights")
    .update({ description: input.description.trim() || null, page_number: input.pageNumber })
    .eq("id", highlightId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteHighlight(supabase: Client, highlight: Pick<Highlight, "id" | "photo_url">) {
  const { error } = await supabase.from("highlights").delete().eq("id", highlight.id);
  if (error) throw error;
  if (highlight.photo_url) {
    await supabase.storage.from("collection-photos").remove([highlight.photo_url]);
  }
}

/** Blank or non-positive input means "no page number". */
export function parsePageNumber(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
