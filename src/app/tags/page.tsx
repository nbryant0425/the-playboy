import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { TagsListClient } from "@/components/TagsListClient";

export default async function TagsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/tags");

  const { data: tags } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  const { data: issueTags } = await supabase.from("issue_tags").select("tag_id").eq("user_id", user.id);

  const counts = new Map<string, number>();
  for (const row of issueTags ?? []) {
    counts.set(row.tag_id, (counts.get(row.tag_id) ?? 0) + 1);
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-black">Your folders</h1>
        <p className="mt-2 text-ink-soft">
          Custom ways to organize your collection — by theme, display wall, decade, whatever helps.
        </p>
        <TagsListClient
          userId={user.id}
          initialTags={tags ?? []}
          initialCounts={Object.fromEntries(counts)}
        />
      </main>
    </>
  );
}
