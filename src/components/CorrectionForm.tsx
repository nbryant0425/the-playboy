"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { suggestCorrection } from "@/lib/collection";
import type { CorrectionField, IssueCorrection } from "@/lib/types";

const FIELDS: { value: CorrectionField; label: string }[] = [
  { value: "cover_model", label: "Cover model (who's literally on the cover)" },
  { value: "playmate_name", label: "Playmate of the Month" },
  { value: "interview_subject", label: "Interview subject" },
  { value: "notable_cover_names", label: "Other cover names" },
  { value: "source_confidence", label: "Confidence level" },
];

export function CorrectionForm({
  issueId,
  userId,
  currentValues,
  onSubmitted,
}: {
  issueId: string;
  userId: string;
  currentValues: Record<string, string | null>;
  onSubmitted: (correction: IssueCorrection) => void;
}) {
  const supabase = createClient();
  const [field, setField] = useState<CorrectionField>("cover_model");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setSubmitting(true);
    try {
      await suggestCorrection(supabase, userId, issueId, field, value.trim(), note.trim() || undefined);
      onSubmitted({
        id: crypto.randomUUID(),
        issue_id: issueId,
        suggested_by: userId,
        field,
        suggested_value: value.trim(),
        status: "pending",
        note: note.trim() || null,
        created_at: new Date().toISOString(),
        reviewed_at: null,
        reviewed_by: null,
      });
      setValue("");
      setNote("");
    } catch (err) {
      console.error(err);
      alert("Couldn't submit that correction. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-lg border border-line bg-paper-card p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-ink-soft">Field</span>
          <select
            value={field}
            onChange={(e) => setField(e.target.value as CorrectionField)}
            className="w-full rounded-md border border-line bg-paper px-3 py-2"
          >
            {FIELDS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-soft">Current value</span>
          <input
            disabled
            value={currentValues[field] ?? "(blank / unknown)"}
            className="w-full rounded-md border border-line bg-paper-card-alt px-3 py-2 text-ink-faint"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-ink-soft">Corrected value</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          className="w-full rounded-md border border-line bg-paper px-3 py-2"
          placeholder="What does your physical copy actually show?"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-ink-soft">Note (optional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-md border border-line bg-paper px-3 py-2"
          placeholder="e.g. checked our newsstand copy"
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper-card disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Suggest correction"}
      </button>
    </form>
  );
}
