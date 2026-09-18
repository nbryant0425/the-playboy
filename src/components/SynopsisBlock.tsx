"use client";

import { useEffect, useState } from "react";

export function SynopsisBlock({
  issueId,
  initialSynopsis,
  signedIn,
}: {
  issueId: string;
  initialSynopsis: string | null;
  signedIn: boolean;
}) {
  const [synopsis, setSynopsis] = useState(initialSynopsis);
  const [loading, setLoading] = useState(!initialSynopsis && signedIn);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialSynopsis || !signedIn) return;
    let cancelled = false;

    async function generate() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch("/api/synopsis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ issueId }),
        });
        if (!res.ok) {
          if (res.status === 401) throw new Error("Sign in to generate this issue's analysis.");
          if (res.status === 500) throw new Error("The server isn't set up to generate analyses yet.");
          throw new Error("Couldn't generate a synopsis for this issue right now.");
        }
        const { synopsis: text } = await res.json();
        if (!cancelled) setSynopsis(text);
      } catch (err) {
        console.error(err);
        if (!cancelled) setErrorMessage(err instanceof Error ? err.message : "Couldn't generate a synopsis for this issue right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    generate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId, signedIn]);

  if (!signedIn && !synopsis) {
    return <p className="mt-3 text-sm text-ink-faint">Sign in to generate this issue&rsquo;s analysis.</p>;
  }

  if (loading) {
    return (
      <div className="mt-3 space-y-2">
        <div className="h-3.5 w-11/12 animate-pulse rounded bg-paper-card-alt" />
        <div className="h-3.5 w-10/12 animate-pulse rounded bg-paper-card-alt" />
        <div className="h-3.5 w-8/12 animate-pulse rounded bg-paper-card-alt" />
      </div>
    );
  }

  if (errorMessage || !synopsis) {
    return <p className="mt-3 text-sm text-ink-faint">{errorMessage ?? "Couldn't generate a synopsis for this issue right now."}</p>;
  }

  return <p className="mt-3 leading-relaxed text-ink">{synopsis}</p>;
}
