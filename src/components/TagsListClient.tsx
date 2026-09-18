"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { createTag, deleteTag } from "@/lib/tags";
import type { Tag } from "@/lib/types";

export function TagsListClient({
  userId,
  initialTags,
  initialCounts,
}: {
  userId: string;
  initialTags: Tag[];
  initialCounts: Record<string, number>;
}) {
  const supabase = createClient();
  const [tags, setTags] = useState(initialTags);
  const [counts, setCounts] = useState(initialCounts);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const tag = await createTag(supabase, userId, trimmed);
      setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
      setCounts((prev) => ({ ...prev, [tag.id]: 0 }));
      setName("");
    } catch (err) {
      console.error(err);
      alert("Couldn't create that folder — maybe you already have one with that name?");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(tag: Tag) {
    if (!confirm(`Delete the "${tag.name}" folder? Issues in it stay in your collection — this just removes the folder.`)) {
      return;
    }
    setBusyId(tag.id);
    try {
      await deleteTag(supabase, tag.id);
      setTags((prev) => prev.filter((t) => t.id !== tag.id));
    } catch (err) {
      console.error(err);
      alert("Couldn't delete that folder. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6">
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New folder name (e.g. January wall, Love-themed)"
          className="flex-1 rounded-md border border-line bg-paper-card px-3 py-2.5"
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="whitespace-nowrap rounded-md bg-red px-4 py-2.5 font-semibold text-paper-card disabled:opacity-50"
        >
          {creating ? "Adding…" : "+ New folder"}
        </button>
      </form>

      {tags.length === 0 ? (
        <p className="mt-8 text-center text-ink-faint">
          No folders yet. Create one above, or add issues to a new folder right from their detail page.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-lg border border-line bg-paper-card">
          {tags.map((tag) => (
            <li key={tag.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <Link href={`/tags/${tag.id}`} className="flex-1">
                <span className="font-display text-lg">{tag.name}</span>
                <span className="ml-2 text-sm text-ink-faint">
                  {counts[tag.id] ?? 0} issue{counts[tag.id] === 1 ? "" : "s"}
                </span>
              </Link>
              <button
                type="button"
                disabled={busyId === tag.id}
                onClick={() => handleDelete(tag)}
                className="text-sm text-ink-faint underline underline-offset-2 hover:text-red disabled:opacity-50"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
