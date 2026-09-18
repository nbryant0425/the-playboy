import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

export async function POST(request: Request) {
  const { issueId } = await request.json();
  if (!issueId || typeof issueId !== "string") {
    return NextResponse.json({ error: "issueId is required" }, { status: 400 });
  }

  // Require a signed-in session so this can't be hit anonymously and run up API costs.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const service = createServiceRoleClient();
  const { data: issue, error } = await service
    .from("issues")
    .select("id, display_label, year, cover_model, playmate_name, interview_subject, notable_cover_names, source_confidence, synopsis")
    .eq("id", issueId)
    .single();

  if (error || !issue) return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  if (issue.synopsis) return NextResponse.json({ synopsis: issue.synopsis });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured on the server" }, { status: 500 });
  }

  const prompt = buildPrompt(issue);

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 450,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!anthropicRes.ok) {
    const text = await anthropicRes.text();
    console.error("Anthropic API error", anthropicRes.status, text);
    return NextResponse.json({ error: "Synopsis generation failed" }, { status: 502 });
  }

  const json = await anthropicRes.json();
  const synopsis: string = json.content?.[0]?.text?.trim();
  if (!synopsis) return NextResponse.json({ error: "Empty synopsis from model" }, { status: 502 });

  await service.from("issues").update({ synopsis }).eq("id", issueId);

  return NextResponse.json({ synopsis });
}

function buildPrompt(issue: {
  display_label: string;
  year: number;
  cover_model: string | null;
  playmate_name: string | null;
  interview_subject: string | null;
  notable_cover_names: string | null;
  source_confidence: string;
}) {
  const facts = [
    `Issue: ${issue.display_label}`,
    issue.cover_model ? `On the cover: ${issue.cover_model}` : "Cover subject: unknown",
    issue.playmate_name && issue.playmate_name !== issue.cover_model
      ? `Playmate of the Month: ${issue.playmate_name}`
      : null,
    issue.interview_subject
      ? `Playboy Interview subject: ${issue.interview_subject}`
      : "Playboy Interview subject: not documented for this issue (may or may not have had one)",
    issue.notable_cover_names ? `Other notable cover names: ${issue.notable_cover_names}` : null,
    issue.source_confidence === "needs-verification" || issue.source_confidence === "unknown"
      ? "Note: our records for this specific issue are sparse or unverified."
      : null,
  ].filter(Boolean);

  return `You are writing a short "About this issue" analysis for a personal magazine-collecting app called "The Playboy," which helps two collectors track their physical Playboy magazine collection.

Here is what our own records show for this specific issue:
${facts.join("\n")}

Write 3-5 sentences of genuinely useful context, drawing on whatever you actually know about the named people and the time period above — who they were/are, what they were known for around ${issue.year}, why their appearance here might have been notable. This is where you should use your general knowledge, not just restate the facts list.

Ground rules:
- Only state real, general-knowledge facts about the named people/era that you're actually confident are true. If you're not sure of a specific date, number, or claim, leave it out rather than guess.
- Do not invent anything specific to this exact issue that isn't in the facts above (no invented quotes, page numbers, sales figures, or made-up anecdotes about the magazine itself).
- If a name is missing or our data is marked sparse/unverified, say so plainly rather than papering over it with invented detail.
- Tone: like a sharp, knowledgeable collector's note card — informative and a little fun, not breathless or salacious.

Respond with only the analysis text, no preamble or heading.`;
}
