import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton, SignInButtons } from "./AuthButtons";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let pendingCorrectionsCount = 0;
  if (user) {
    const { count } = await supabase
      .from("issue_corrections")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pendingCorrectionsCount = count ?? 0;
  }

  return (
    <header>
      <Link href="/" className="block bg-ink px-4 py-8 text-center sm:py-12">
        <span className="font-masthead block text-7xl uppercase leading-none tracking-tight text-paper-card sm:text-9xl lg:text-[10rem]">
          Playboy
        </span>
        <span className="mt-3 inline-block text-xs font-semibold uppercase tracking-[0.5em] text-blossom sm:text-base sm:tracking-[0.6em]">
          Collection Tracker
        </span>
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper-card/70 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-4">
          <span className="text-xs uppercase tracking-[0.2em] text-ink-faint">Dec 1953&ndash;Present</span>
          {user && (
            <Link href="/tags" className="text-sm font-medium text-ink-soft underline underline-offset-2 hover:text-ink">
              My Folders
            </Link>
          )}
          {user && (
            <Link
              href="/corrections"
              className="text-sm font-medium text-ink-soft underline underline-offset-2 hover:text-ink"
            >
              Corrections
              {pendingCorrectionsCount > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red px-1.5 text-xs font-semibold text-paper-card no-underline">
                  {pendingCorrectionsCount}
                </span>
              )}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <Link
              href="/add"
              className="rounded-full bg-red px-4 py-2 text-sm font-semibold text-paper-card transition hover:bg-red-dark"
            >
              + Add Magazine
            </Link>
          )}
          {user ? <SignOutButton email={user.email ?? "Signed in"} /> : <SignInButtons />}
        </div>
      </div>
    </header>
  );
}
