import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignInButtons } from "@/components/AuthButtons";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <p className="font-display text-sm uppercase tracking-[0.3em] text-ink-faint">The Playboy</p>
      <h1 className="mt-2 font-display text-4xl font-black">Sign in to your checklist</h1>
      <p className="mt-3 max-w-sm text-ink-soft">
        Each of you gets your own owned/missing progress, tracked separately against the same shared archive of issues.
      </p>
      {error && <p className="mt-4 text-sm text-red">Something went wrong signing you in — try again.</p>}
      <div className="mt-8">
        <SignInButtons />
      </div>
      <Link href="/" className="mt-8 text-sm text-ink-faint underline underline-offset-2">
        Keep browsing without signing in
      </Link>
    </main>
  );
}
