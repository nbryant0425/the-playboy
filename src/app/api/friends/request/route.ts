import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// Looking someone up by email needs the admin API (service role), which the
// client can never hold — hence this route instead of a direct client insert.
export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const normalized = email.trim().toLowerCase();
  if (normalized === user.email?.toLowerCase()) {
    return NextResponse.json({ error: "That's your own email" }, { status: 400 });
  }

  const service = createServiceRoleClient();

  // No admin.getUserByEmail in supabase-js; list and match. Fine at this app's scale.
  const { data: usersPage, error: listError } = await service.auth.admin.listUsers({ perPage: 1000 });
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

  const target = usersPage.users.find((u) => u.email?.toLowerCase() === normalized);
  if (!target) {
    return NextResponse.json({ error: "No one with that email has signed in to The Playboy yet" }, { status: 404 });
  }

  const { data: existing } = await service
    .from("friendships")
    .select("id, status")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${user.id})`
    )
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: existing.status === "accepted" ? "You're already friends" : "A request already exists" },
      { status: 409 }
    );
  }

  const { data: friendship, error: insertError } = await service
    .from("friendships")
    .insert({ requester_id: user.id, addressee_id: target.id })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ friendship });
}
