import { createClient } from "@/lib/supabase/server";
import { mergeIssuesWithCollection } from "@/lib/data";
import { getSignedPhotoUrls } from "@/lib/collection";
import { HomeShell } from "@/components/HomeShell";
import { SiteHeader } from "@/components/SiteHeader";
import type { Issue } from "@/lib/types";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: issuesData, error } = await supabase
    .from("issues")
    .select("id, year, issue_period, display_label, cover_model, playmate_name, interview_subject, notable_cover_names, synopsis, source_confidence, created_at, updated_at")
    .order("year", { ascending: true });

  if (error) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-6 py-16 text-center">
          <p className="text-red">Couldn&rsquo;t load issues: {error.message}</p>
          <p className="mt-2 text-sm text-ink-soft">
            Have you run the Supabase migration and seed SQL yet? See SETUP.md.
          </p>
        </main>
      </>
    );
  }

  const issues = (issuesData ?? []) as Issue[];

  let collectionRows: { issue_id: string; owned: boolean; photo_url: string | null; condition_notes: string | null }[] = [];
  let signedPhotoUrls: Map<string, string> | undefined;
  if (user) {
    const { data } = await supabase
      .from("user_collection")
      .select("issue_id, owned, photo_url, condition_notes")
      .eq("user_id", user.id);
    collectionRows = data ?? [];

    const paths = collectionRows.map((r) => r.photo_url).filter((p): p is string => !!p);
    signedPhotoUrls = await getSignedPhotoUrls(supabase, paths);
  }

  const merged = mergeIssuesWithCollection(issues, collectionRows, signedPhotoUrls);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <HomeShell initialIssues={merged} userId={user?.id ?? null} />
      </main>
    </>
  );
}
