"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignInButtons() {
  const supabase = createClient();

  async function signIn(provider: "google" | "azure") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        onClick={() => signIn("google")}
        className="rounded-full border border-line bg-paper-card px-4 py-2 text-sm font-medium text-ink transition hover:border-ink"
      >
        Continue with Google
      </button>
      <button
        type="button"
        onClick={() => signIn("azure")}
        className="rounded-full border border-line bg-paper-card px-4 py-2 text-sm font-medium text-ink transition hover:border-ink"
      >
        Continue with Microsoft
      </button>
    </div>
  );
}

export function SignOutButton({ email }: { email: string }) {
  const supabase = createClient();
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden text-ink-soft sm:inline">{email}</span>
      <button
        type="button"
        onClick={async () => {
          await supabase.auth.signOut();
          router.push("/");
          router.refresh();
        }}
        className="rounded-full border border-line px-3 py-1.5 font-medium text-ink-soft transition hover:border-ink hover:text-ink"
      >
        Sign out
      </button>
    </div>
  );
}
