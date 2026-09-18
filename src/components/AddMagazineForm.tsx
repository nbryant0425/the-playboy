"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import { createClient } from "@/lib/supabase/client";
import { attachPhotoAndMarkOwned, setOwned, suggestCorrection } from "@/lib/collection";
import type { Issue, CorrectionField } from "@/lib/types";
import { issueLabel } from "@/lib/data";

export function AddMagazineForm({ issues, userId }: { issues: Issue[]; userId: string }) {
  const supabase = createClient();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Issue | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [corrections, setCorrections] = useState<Record<CorrectionField, string>>({
    cover_model: "",
    playmate_name: "",
    interview_subject: "",
    notable_cover_names: "",
    source_confidence: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const index = useMemo(
    () => new Fuse(issues, { keys: ["display_label", "cover_model", "playmate_name", "interview_subject"], threshold: 0.35 }),
    [issues]
  );

  const results = query.trim() ? index.search(query).slice(0, 12).map((r) => r.item) : issues.slice(0, 12);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      if (file) {
        await attachPhotoAndMarkOwned(supabase, userId, selected.id, file);
      } else {
        await setOwned(supabase, userId, selected.id, true);
      }

      for (const [field, value] of Object.entries(corrections) as [CorrectionField, string][]) {
        if (value.trim()) {
          await suggestCorrection(supabase, userId, selected.id, field, value.trim());
        }
      }

      setDone(true);
      setTimeout(() => router.push(`/issue/${selected.id}`), 900);
    } catch (err) {
      console.error(err);
      alert("Couldn't save that. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 rounded-lg border border-gold-dark/40 bg-gold/15 p-6 text-center">
        <p className="collected-stamp inline-block px-3 py-1 text-sm font-bold">Collected</p>
        <p className="mt-3 text-ink-soft">Added to your checklist. Taking you to the issue…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      {!selected ? (
        <div>
          <label className="block text-sm font-medium text-ink-soft">Which issue is it?</label>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by month, year, model, or guest…"
            className="mt-1 w-full rounded-md border border-line bg-paper-card px-3 py-2.5 outline-none focus:border-red"
          />
          <ul className="mt-3 max-h-80 divide-y divide-line overflow-y-auto rounded-md border border-line">
            {results.map((issue) => (
              <li key={issue.id}>
                <button
                  type="button"
                  onClick={() => setSelected(issue)}
                  className="block w-full px-3 py-2.5 text-left hover:bg-paper-card-alt"
                >
                  <p className="font-display">{issue.display_label}</p>
                  <p className="text-sm text-ink-soft">{issue.cover_model ?? issue.playmate_name ?? "Model unknown"}</p>
                </button>
              </li>
            ))}
            {results.length === 0 && <li className="px-3 py-4 text-sm text-ink-faint">No matching issues.</li>}
          </ul>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3 rounded-lg border border-line bg-paper-card p-4">
            <div>
              <p className="font-display text-lg">{issueLabel(selected)}</p>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="text-sm text-ink-faint underline">
              Change
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-soft">Photo of your copy</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm"
            />
            <p className="mt-1 text-xs text-ink-faint">
              Optional — you can also just mark it owned now and add a photo later from the issue page.
            </p>
          </div>

          <details className="rounded-md border border-line p-3">
            <summary className="cursor-pointer text-sm font-medium text-ink-soft">
              Correct any details while you&rsquo;re at it (optional)
            </summary>
            <div className="mt-3 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-ink-soft">
                  Cover model — who&rsquo;s literally on the cover {selected.cover_model ? `(currently: ${selected.cover_model})` : "(currently unconfirmed)"}
                </span>
                <input
                  value={corrections.cover_model}
                  onChange={(e) => setCorrections((c) => ({ ...c, cover_model: e.target.value }))}
                  className="w-full rounded-md border border-line bg-paper px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-ink-soft">
                  Playmate of the Month {selected.playmate_name ? `(currently: ${selected.playmate_name})` : ""}
                </span>
                <input
                  value={corrections.playmate_name}
                  onChange={(e) => setCorrections((c) => ({ ...c, playmate_name: e.target.value }))}
                  className="w-full rounded-md border border-line bg-paper px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-ink-soft">
                  Interview subject {selected.interview_subject ? `(currently: ${selected.interview_subject})` : "(currently blank)"}
                </span>
                <input
                  value={corrections.interview_subject}
                  onChange={(e) => setCorrections((c) => ({ ...c, interview_subject: e.target.value }))}
                  className="w-full rounded-md border border-line bg-paper px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-ink-soft">Other notable cover names</span>
                <input
                  value={corrections.notable_cover_names}
                  onChange={(e) => setCorrections((c) => ({ ...c, notable_cover_names: e.target.value }))}
                  className="w-full rounded-md border border-line bg-paper px-3 py-2"
                />
              </label>
            </div>
          </details>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-red py-3 font-display font-semibold uppercase tracking-wide text-paper-card transition hover:bg-red-dark disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Add to my collection"}
          </button>
        </>
      )}
    </form>
  );
}
