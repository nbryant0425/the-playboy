import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { AddMagazineForm } from "@/components/AddMagazineForm";
import type { Issue } from "@/lib/types";

export default async function AddMagazinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/add");

  const { data: issuesData } = await supabase
    .from("issues")
    .select("id, year, issue_period, display_label, cover_model, playmate_name, interview_subject, notable_cover_names, synopsis, source_confidence, created_at, updated_at")
    .order("year", { ascending: false });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-black">Add a magazine</h1>
        <p className="mt-2 text-ink-soft">
          Pick the issue from your stack, snap or upload a photo, and it&rsquo;ll be marked owned automatically.
        </p>
        <AddMagazineForm issues={(issuesData ?? []) as Issue[]} userId={user.id} />
      </main>
    </>
  );
}
