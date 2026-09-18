import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrls } from "@/lib/collection";
import { mergeIssuesWithCollection, sortIssuesChronologically } from "@/lib/data";
import { SiteHeader } from "@/components/SiteHeader";
import { TagDetailClient } from "@/components/TagDetailClient";
import type { Issue } from "@/lib/types";

export default async function TagDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/tags/${id}`);

  const { data: tag } = await supabase.from("tags").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!tag) notFound();

  const { data: issueTagRows } = await supabase
    .from("issue_tags")
    .select("issue_id")
    .eq("tag_id", id)
    .eq("user_id", user.id);
  const issueIds = (issueTagRows ?? []).map((r) => r.issue_id);

  let issues: Issue[] = [];
  let collectionRows: { issue_id: string; owned: boolean; photo_url: string | null; condition_notes: string | null }[] = [];
  let signedPhotoUrls = new Map<string, string>();

  if (issueIds.length > 0) {
    const { data: issuesData } = await supabase.from("issues").select("*").in("id", issueIds);
    issues = (issuesData ?? []) as Issue[];

    const { data: collectionData } = await supabase
      .from("user_collection")
      .select("issue_id, owned, photo_url, condition_notes")
      .eq("user_id", user.id)
      .in("issue_id", issueIds);
    collectionRows = collectionData ?? [];

    const paths = collectionRows.map((r) => r.photo_url).filter((p): p is string => !!p);
    signedPhotoUrls = await getSignedPhotoUrls(supabase, paths);
  }

  const merged = sortIssuesChronologically(mergeIssuesWithCollection(issues, collectionRows, signedPhotoUrls));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <Link href="/tags" className="text-sm text-ink-faint underline underline-offset-2">
          ← Back to folders
        </Link>
        <h1 className="mt-2 font-display text-3xl font-black">{tag.name}</h1>
        <p className="mt-1 text-ink-soft">
          {merged.length} issue{merged.length === 1 ? "" : "s"} in this folder
        </p>

        <TagDetailClient initialIssues={merged} userId={user.id} />
      </main>
    </>
  );
}
