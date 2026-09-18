import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// Any signed-in user can accept a correction — this is a two-person household
// app, not a public one, so a lightweight "flag then accept" flow is enough;
// a full moderation/approval system would be over-engineering for v1.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const service = createServiceRoleClient();

  const { data: correction, error: fetchError } = await service
    .from("issue_corrections")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !correction) return NextResponse.json({ error: "Correction not found" }, { status: 404 });
  if (correction.status !== "pending") {
    return NextResponse.json({ error: "Correction already resolved" }, { status: 409 });
  }

  const issueUpdate: Record<string, string> = { [correction.field]: correction.suggested_value };
  const { error: updateIssueError } = await service
    .from("issues")
    .update(issueUpdate as never)
    .eq("id", correction.issue_id);

  if (updateIssueError) {
    return NextResponse.json({ error: updateIssueError.message }, { status: 500 });
  }

  await service
    .from("issue_corrections")
    .update({ status: "accepted", reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
