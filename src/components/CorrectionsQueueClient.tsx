"use client";

import { useState } from "react";
import Link from "next/link";
import type { CorrectionField } from "@/lib/types";

export type QueuedCorrection = {
  id: string;
  issue_id: string;
  issue_label: string;
  field: CorrectionField;
  suggested_value: string;
  note: string | null;
  created_at: string;
  suggested_by_email: string;
  suggested_by_you: boolean;
};

const FIELD_LABELS: Record<CorrectionField, string> = {
  cover_model: "Cover model",
  playmate_name: "Playmate of the Month",
  interview_subject: "Interview subject",
  notable_cover_names: "Other cover names",
  source_confidence: "Confidence level",
};

export function CorrectionsQueueClient({ initialCorrections }: { initialCorrections: QueuedCorrection[] }) {
  const [corrections, setCorrections] = useState(initialCorrections);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function accept(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/corrections/${id}/accept`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      setCorrections((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
      alert("Couldn't accept that correction. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (corrections.length === 0) {
    return <p className="mt-8 text-center text-ink-faint">No pending corrections right now.</p>;
  }

  return (
    <ul className="mt-6 space-y-3">
      {corrections.map((c) => (
        <li key={c.id} className="rounded-lg border border-gold-dark/30 bg-gold/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link href={`/issue/${c.issue_id}`} className="font-display text-lg underline underline-offset-2">
                {c.issue_label}
              </Link>
              <p className="mt-1 text-sm">
                <strong className="font-semibold">{FIELD_LABELS[c.field]}</strong> → &ldquo;{c.suggested_value}&rdquo;
              </p>
              {c.note && <p className="mt-1 text-sm text-ink-soft">{c.note}</p>}
              <p className="mt-2 text-xs uppercase tracking-wide text-ink-faint">
                Suggested by {c.suggested_by_you ? "you" : c.suggested_by_email} ·{" "}
                {new Date(c.created_at).toLocaleDateString()}
              </p>
            </div>
            <button
              type="button"
              disabled={busyId === c.id}
              onClick={() => accept(c.id)}
              className="whitespace-nowrap rounded-full border border-gold-dark/50 px-4 py-1.5 text-sm font-semibold text-gold-dark hover:bg-gold/20 disabled:opacity-50"
            >
              {busyId === c.id ? "Accepting…" : "Accept"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
