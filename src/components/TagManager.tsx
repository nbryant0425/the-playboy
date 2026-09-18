"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createTag, addIssueToTag, removeIssueFromTag } from "@/lib/tags";
import type { Tag } from "@/lib/types";

export function TagManager({
  issueId,
  userId,
  allTags,
  initialIssueTagIds,
}: {
  issueId: string;
  userId: string;
  allTags: Tag[];
  initialIssueTagIds: string[];
}) {
  const supabase = createClient();
  const [tags, setTags] = useState(allTags);
  const [activeIds, setActiveIds] = useState(new Set(initialIssueTagIds));
  const [newTagName, setNewTagName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function toggleTag(tag: Tag) {
    setBusyId(tag.id);
    const isActive = activeIds.has(tag.id);
    try {
      if (isActive) {
        await removeIssueFromTag(supabase, tag.id, issueId);
        setActiveIds((prev) => {
          const next = new Set(prev);
          next.delete(tag.id);
          return next;
        });
      } else {
        await addIssueToTag(supabase, userId, tag.id, issueId);
        setActiveIds((prev) => new Set(prev).add(tag.id));
      }
    } catch (err) {
      console.error(err);
      alert("Couldn't update that folder. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newTagName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const tag = await createTag(supabase, userId, name);
      await addIssueToTag(supabase, userId, tag.id, issueId);
      setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
      setActiveIds((prev) => new Set(prev).add(tag.id));
      setNewTagName("");
    } catch (err) {
      console.error(err);
      alert("Couldn't create that folder — maybe you already have one with that name?");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const active = activeIds.has(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              disabled={busyId === tag.id}
              onClick={() => toggleTag(tag)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                active
                  ? "border-red bg-red text-paper-card"
                  : "border-line bg-paper-card text-ink-soft hover:border-red hover:text-red"
              }`}
            >
              {active ? "✓ " : "+ "}
              {tag.name}
            </button>
          );
        })}
        {tags.length === 0 && <p className="text-sm text-ink-faint">No folders yet — create your first one below.</p>}
      </div>

      <form onSubmit={handleCreate} className="mt-3 flex gap-2">
        <input
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="New folder name (e.g. January wall, Love-themed)"
          className="flex-1 rounded-md border border-line bg-paper px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={creating || !newTagName.trim()}
          className="whitespace-nowrap rounded-md bg-ink px-3 py-2 text-sm font-semibold text-paper-card disabled:opacity-50"
        >
          {creating ? "Adding…" : "+ New folder"}
        </button>
      </form>
    </div>
  );
}
