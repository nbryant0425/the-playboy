import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { IssueDetailClient } from "@/components/IssueDetailClient";
import type { Issue, IssueCorrection, UserCollectionRow, Tag } from "@/lib/types";

export default async function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: issue, error } = await supabase.from("issues").select("*").eq("id", id).single();

  if (error || !issue) notFound();

  let collection: UserCollectionRow | null = null;
  let signedPhotoUrl: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("user_collection")
      .select("*")
      .eq("user_id", user.id)
      .eq("issue_id", id)
      .maybeSingle();
    collection = data ?? null;

    if (collection?.photo_url) {
      const { data: signed } = await supabase.storage
        .from("collection-photos")
        .createSignedUrl(collection.photo_url, 3600);
      signedPhotoUrl = signed?.signedUrl ?? null;
    }
  }

  let pendingCorrections: IssueCorrection[] = [];
  let allTags: Tag[] = [];
  let issueTagIds: string[] = [];
  if (user) {
    const { data } = await supabase
      .from("issue_corrections")
      .select("*")
      .eq("issue_id", id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    pendingCorrections = data ?? [];

    const { data: tagsData } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });
    allTags = tagsData ?? [];

    const { data: issueTagsData } = await supabase
      .from("issue_tags")
      .select("tag_id")
      .eq("user_id", user.id)
      .eq("issue_id", id);
    issueTagIds = (issueTagsData ?? []).map((r) => r.tag_id);
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <Link href="/" className="text-sm text-ink-faint underline underline-offset-2">
          ← Back to checklist
        </Link>

        <IssueDetailClient
          issue={issue as Issue}
          collection={collection}
          signedPhotoUrl={signedPhotoUrl}
          userId={user?.id ?? null}
          pendingCorrections={pendingCorrections}
          allTags={allTags}
          initialIssueTagIds={issueTagIds}
        />
      </main>
    </>
  );
}
