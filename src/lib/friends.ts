import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

type Client = SupabaseClient<Database>;

export async function acceptFriendRequest(supabase: Client, friendshipId: string) {
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", friendshipId);
  if (error) throw error;
}

/** Covers declining an incoming request, cancelling an outgoing one, and unfriending — all just "remove the row". */
export async function removeFriendship(supabase: Client, friendshipId: string) {
  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
  if (error) throw error;
}
