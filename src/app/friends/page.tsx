import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { FriendsClient, type FriendshipView } from "@/components/FriendsClient";

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/friends");

  const { data: rows } = await supabase
    .from("friendships")
    .select("*")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const counterpartIds = [
    ...new Set((rows ?? []).map((r) => (r.requester_id === user.id ? r.addressee_id : r.requester_id))),
  ];

  let emailById = new Map<string, string>();
  if (counterpartIds.length) {
    const service = createServiceRoleClient();
    const { data: usersPage } = await service.auth.admin.listUsers({ perPage: 1000 });
    emailById = new Map((usersPage?.users ?? []).map((u) => [u.id, u.email ?? "Unknown"]));
  }

  const friendships: FriendshipView[] = (rows ?? []).map((r) => {
    const counterpartId = r.requester_id === user.id ? r.addressee_id : r.requester_id;
    return {
      id: r.id,
      status: r.status,
      counterpart_email: emailById.get(counterpartId) ?? "Unknown",
      counterpart_id: counterpartId,
      incoming: r.addressee_id === user.id,
    };
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-black">Friends</h1>
        <p className="mt-2 text-ink-soft">
          Add each other to see what one another has collected — read-only, no photos, just owned/missing.
        </p>
        <FriendsClient initialFriendships={friendships} />
      </main>
    </>
  );
}
