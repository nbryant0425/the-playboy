"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { addHighlight, deleteHighlight, parsePageNumber, sortHighlights, updateHighlight } from "@/lib/highlights";
import { getSignedPhotoUrl } from "@/lib/collection";
import type { HighlightWithUrl } from "@/lib/types";
import { PhotoLightbox } from "./PhotoLightbox";

export function HighlightsSection({
  issueId,
  userId,
  highlights,
  setHighlights,
}: {
  issueId: string;
  userId: string;
  highlights: HighlightWithUrl[];
  setHighlights: React.Dispatch<React.SetStateAction<HighlightWithUrl[]>>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<HighlightWithUrl | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [pageNumber, setPageNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!file && !description.trim()) return;
    setSaving(true);
    try {
      const row = await addHighlight(supabase, userId, issueId, {
        file,
        description,
        pageNumber: parsePageNumber(pageNumber),
      });
      const signed = row.photo_url ? await getSignedPhotoUrl(supabase, row.photo_url) : null;
      setHighlights((prev) => sortHighlights([...prev, { ...row, photo_signed_url: signed }]));
      setFile(null);
      setDescription("");
      setPageNumber("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error(err);
      alert("Couldn't save that highlight. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(h: HighlightWithUrl, input: { description: string; pageNumber: number | null }) {
    setSavingId(h.id);
    try {
      const row = await updateHighlight(supabase, h.id, input);
      setHighlights((prev) =>
        sortHighlights(prev.map((x) => (x.id === h.id ? { ...row, photo_signed_url: x.photo_signed_url } : x)))
      );
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert("Couldn't save your changes. Please try again.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(h: HighlightWithUrl) {
    if (!confirm("Delete this highlight?")) return;
    setBusyId(h.id);
    try {
      await deleteHighlight(supabase, h);
      setHighlights((prev) => prev.filter((x) => x.id !== h.id));
    } catch (err) {
      console.error(err);
      alert("Couldn't delete that highlight. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div id="highlights" className="mt-8 scroll-mt-4 border-t border-line pt-6">
      <h2 className="font-display text-lg font-semibold">
        Highlights
        {highlights.length > 0 && <span className="ml-2 text-sm font-normal text-ink-faint">{highlights.length}</span>}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Save an article or ad you loved from this issue — snap a photo, add a note. Photos also become pages in the
        flip-through book at the top of this page, in order of magazine page number.
      </p>

      {highlights.length > 0 && (
        <ul className="mt-4 space-y-3">
          {highlights.map((h) => (
            <li key={h.id} className="flex gap-3 rounded-lg border border-line bg-paper-card p-3">
              {h.photo_signed_url && (
                <button
                  type="button"
                  onClick={() => setViewing(h)}
                  aria-label="View photo"
                  title="View photo"
                  className="relative block h-28 w-20 shrink-0 cursor-zoom-in overflow-hidden rounded-sm bg-paper-card-alt"
                >
                  <Image
                    src={h.photo_signed_url}
                    alt={h.description ?? "Highlight photo"}
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized
                  />
                </button>
              )}
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                {editingId === h.id ? (
                  <EditForm
                    highlight={h}
                    saving={savingId === h.id}
                    onSave={(input) => handleSave(h, input)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <div>
                      {h.page_number !== null && (
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                          Magazine page {h.page_number}
                        </p>
                      )}
                      <p className="mt-0.5 whitespace-pre-line leading-relaxed">
                        {h.description ?? <span className="italic text-ink-faint">Photo only</span>}
                      </p>
                    </div>
                    <div className="flex gap-4 text-sm">
                      {h.photo_signed_url && (
                        <button
                          type="button"
                          onClick={() => setViewing(h)}
                          className="text-ink-soft underline underline-offset-2 hover:text-ink"
                        >
                          View photo
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingId(h.id)}
                        className="text-ink-soft underline underline-offset-2 hover:text-ink"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busyId === h.id}
                        onClick={() => handleDelete(h)}
                        className="text-ink-faint underline underline-offset-2 hover:text-red disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="mt-5 space-y-3 rounded-lg border border-line bg-paper-card p-4">
        <p className="text-sm font-medium">Add a highlight</p>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Photo (optional)</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded-full file:border file:border-line-strong file:bg-paper file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-line bg-paper px-3 py-2"
            placeholder="What is it, and why do you like it?"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Page number (optional)</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={pageNumber}
            onChange={(e) => setPageNumber(e.target.value)}
            className="w-28 rounded-md border border-line bg-paper px-3 py-2"
            placeholder="e.g. 84"
          />
          <span className="mt-1 block text-xs text-ink-faint">
            Highlights are kept in page order, so you can add them in any order. Ones without a page number go after the
            numbered ones, in the order you added them.
          </span>
        </label>
        <button
          type="submit"
          disabled={saving || (!file && !description.trim())}
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper-card disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add highlight"}
        </button>
      </form>

      {viewing?.photo_signed_url && (
        <PhotoLightbox
          src={viewing.photo_signed_url}
          onClose={() => setViewing(null)}
          caption={
            <>
              {viewing.page_number !== null && (
                <span className="block text-xs font-semibold uppercase tracking-wide opacity-70">
                  Magazine page {viewing.page_number}
                </span>
              )}
              {viewing.description}
            </>
          }
        />
      )}
    </div>
  );
}

function EditForm({
  highlight,
  saving,
  onSave,
  onCancel,
}: {
  highlight: HighlightWithUrl;
  saving: boolean;
  onSave: (input: { description: string; pageNumber: number | null }) => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState(highlight.description ?? "");
  const [pageNumber, setPageNumber] = useState(highlight.page_number?.toString() ?? "");
  // A highlight needs a photo or a note, so a text-only one can't have its note cleared.
  const canSave = !!highlight.photo_url || !!description.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave) onSave({ description, pageNumber: parsePageNumber(pageNumber) });
      }}
      className="space-y-2 text-left"
    >
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        aria-label="Description"
        className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        Page number
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={pageNumber}
          onChange={(e) => setPageNumber(e.target.value)}
          className="w-24 rounded-md border border-line bg-paper px-2 py-1.5"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !canSave}
          className="rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-paper-card disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-full border border-line-strong px-3.5 py-1.5 text-sm font-medium text-ink-soft hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
