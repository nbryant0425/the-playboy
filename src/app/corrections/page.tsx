import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { CorrectionsQueueClient, type QueuedCorrection } from "@/components/CorrectionsQueueClient";

export default async function CorrectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/corrections");

  const service = createServiceRoleClient();

  const { data: corrections } = await service
    .from("issue_corrections")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const issueIds = [...new Set((corrections ?? []).map((c) => c.issue_id))];
  const { data: issues } = issueIds.length
    ? await service.from("issues").select("id, display_label").in("id", issueIds)
    : { data: [] };
  const labelById = new Map((issues ?? []).map((i) => [i.id, i.display_label]));

  const { data: usersPage } = await service.auth.admin.listUsers();
  const emailById = new Map((usersPage?.users ?? []).map((u) => [u.id, u.email ?? "Someone"]));

  const queued: QueuedCorrection[] = (corrections ?? []).map((c) => ({
    id: c.id,
    issue_id: c.issue_id,
    issue_label: labelById.get(c.issue_id) ?? "Unknown issue",
    field: c.field,
    suggested_value: c.suggested_value,
    note: c.note,
    created_at: c.created_at,
    suggested_by_email: emailById.get(c.suggested_by) ?? "Someone",
    suggested_by_you: c.suggested_by === user.id,
  }));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-black">Pending corrections</h1>
        <p className="mt-2 text-ink-soft">
          Everything either of you has flagged from a physical copy, waiting to be accepted into the shared record.
        </p>
        <CorrectionsQueueClient initialCorrections={queued} />
      </main>
    </>
  );
}
