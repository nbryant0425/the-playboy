import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mergeIssuesWithCollection, sortIssuesChronologically } from "@/lib/data";
import { getSignedPhotoUrls } from "@/lib/collection";
import { SiteHeader } from "@/components/SiteHeader";
import { IssueCard } from "@/components/IssueCard";
import type { Issue } from "@/lib/types";

export default async function HighlightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/highlights");

  const { data: highlightRows } = await supabase.from("highlights").select("issue_id").eq("user_id", user.id);

  const counts = new Map<string, number>();
  for (const row of highlightRows ?? []) {
    counts.set(row.issue_id, (counts.get(row.issue_id) ?? 0) + 1);
  }
  const issueIds = [...counts.keys()];

  let cards: ReturnType<typeof sortIssuesChronologically> = [];
  if (issueIds.length > 0) {
    const { data: issuesData } = await supabase
      .from("issues")
      .select("id, year, issue_period, display_label, cover_model, playmate_name, interview_subject, notable_cover_names, synopsis, source_confidence, created_at, updated_at")
      .in("id", issueIds);

    const { data: collectionRows } = await supabase
      .from("user_collection")
      .select("issue_id, owned, photo_url, condition_notes")
      .eq("user_id", user.id)
      .in("issue_id", issueIds);

    const paths = (collectionRows ?? []).map((r) => r.photo_url).filter((p): p is string => !!p);
    const signedUrls = await getSignedPhotoUrls(supabase, paths);

    cards = sortIssuesChronologically(
      mergeIssuesWithCollection((issuesData ?? []) as Issue[], collectionRows ?? [], signedUrls)
    );
  }

  const total = [...counts.values()].reduce((a, b) => a + b, 0);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-black">Your highlights</h1>
        <p className="mt-2 text-ink-soft">
          {total === 0
            ? "The articles and ads you've saved from your magazines will collect here."
            : `${total} highlight${total === 1 ? "" : "s"} across ${cards.length} issue${cards.length === 1 ? "" : "s"}. Open one to flip through its pages.`}
        </p>

        {cards.length === 0 ? (
          <p className="mt-10 text-center text-ink-faint">
            Nothing yet — open any issue and add a highlight under &ldquo;About this issue.&rdquo;
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
            {cards.map((issue) => {
              const n = counts.get(issue.id) ?? 0;
              return (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  href={`/issue/${issue.id}#highlights`}
                  caption={
                    <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-red">
                      {n} highlight{n === 1 ? "" : "s"}
                    </p>
                  }
                />
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
