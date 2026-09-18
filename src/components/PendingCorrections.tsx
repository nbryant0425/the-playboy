"use client";

import { useState } from "react";
import type { IssueCorrection } from "@/lib/types";

export function PendingCorrections({
  corrections,
  onResolved,
}: {
  corrections: IssueCorrection[];
  onResolved: (id: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  if (corrections.length === 0) return null;

  async function accept(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/corrections/${id}/accept`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      onResolved(id);
    } catch (err) {
      console.error(err);
      alert("Couldn't accept that correction. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ul className="mt-4 space-y-2">
      {corrections.map((c) => (
        <li
          key={c.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gold-dark/30 bg-gold/10 px-3 py-2 text-sm"
        >
          <span>
            <strong className="font-semibold">{c.field.replace(/_/g, " ")}</strong> → &ldquo;{c.suggested_value}&rdquo;
            {c.note && <span className="text-ink-soft"> ({c.note})</span>}
          </span>
          <button
            type="button"
            disabled={busyId === c.id}
            onClick={() => accept(c.id)}
            className="rounded-full border border-gold-dark/50 px-3 py-1 text-xs font-semibold text-gold-dark hover:bg-gold/20 disabled:opacity-50"
          >
            {busyId === c.id ? "Accepting…" : "Accept"}
          </button>
        </li>
      ))}
    </ul>
  );
}
