import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { mergeIssuesWithCollection } from "@/lib/data";
import { HomeShell } from "@/components/HomeShell";
import { SiteHeader } from "@/components/SiteHeader";
import type { Issue } from "@/lib/types";

export default async function FriendCollectionPage({ params }: { params: Promise<{ friendId: string }> }) {
  const { friendId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/friends/${friendId}`);

  const { data: friendship } = await supabase
    .from("friendships")
    .select("*")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`
    )
    .maybeSingle();

  if (!friendship) notFound();

  const service = createServiceRoleClient();
  const { data: friendUser } = await service.auth.admin.getUserById(friendId);
  const friendEmail = friendUser?.user?.email ?? "Your friend";

  const { data: issuesData } = await supabase
    .from("issues")
    .select("id, year, issue_period, display_label, cover_model, playmate_name, interview_subject, notable_cover_names, synopsis, source_confidence, created_at, updated_at")
    .order("year", { ascending: true });
  const issues = (issuesData ?? []) as Issue[];

  const { data: collectionRows } = await supabase
    .from("user_collection")
    .select("issue_id, owned, photo_url, condition_notes")
    .eq("user_id", friendId);

  // Friends' photos stay private (the storage bucket policy never grants
  // cross-user access) — collection state only, no signed photo URLs here.
  const merged = mergeIssuesWithCollection(issues, collectionRows ?? []);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <HomeShell
          initialIssues={merged}
          userId={user.id}
          readOnly
          heading={
            <div className="mb-4">
              <Link href="/friends" className="text-sm text-ink-faint underline underline-offset-2">
                ← Friends
              </Link>
              <h1 className="mt-1 font-display text-2xl font-black">{friendEmail}&rsquo;s collection</h1>
              <p className="text-sm text-ink-soft">Read-only — you&rsquo;re viewing what they&rsquo;ve marked as owned.</p>
            </div>
          }
        />
      </main>
    </>
  );
}
