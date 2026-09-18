"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { setOwned, attachPhotoAndMarkOwned, getSignedPhotoUrl } from "@/lib/collection";
import type { IssueWithCollection } from "@/lib/types";
import { IssueCard } from "./IssueCard";

export function TagDetailClient({
  initialIssues,
  userId,
}: {
  initialIssues: IssueWithCollection[];
  userId: string;
}) {
  const [issues, setIssues] = useState(initialIssues);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [photoPendingIds, setPhotoPendingIds] = useState<Set<string>>(new Set());
  const supabase = useMemo(() => createClient(), []);

  async function handleToggle(issue: IssueWithCollection) {
    const nextOwned = !issue.collection?.owned;
    setPendingIds((prev) => new Set(prev).add(issue.id));
    setIssues((prev) =>
      prev.map((i) =>
        i.id === issue.id
          ? {
              ...i,
              collection: {
                owned: nextOwned,
                photo_url: i.collection?.photo_url ?? null,
                condition_notes: i.collection?.condition_notes ?? null,
                photo_signed_url: i.collection?.photo_signed_url ?? null,
              },
            }
          : i
      )
    );
    try {
      await setOwned(supabase, userId, issue.id, nextOwned);
    } catch (err) {
      console.error(err);
      setIssues((prev) => prev.map((i) => (i.id === issue.id ? { ...i, collection: issue.collection } : i)));
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(issue.id);
        return next;
      });
    }
  }

  async function handleAddPhoto(issue: IssueWithCollection, file: File) {
    setPhotoPendingIds((prev) => new Set(prev).add(issue.id));
    try {
      const path = await attachPhotoAndMarkOwned(supabase, userId, issue.id, file);
      const signedUrl = await getSignedPhotoUrl(supabase, path);
      setIssues((prev) =>
        prev.map((i) =>
          i.id === issue.id
            ? {
                ...i,
                collection: { owned: true, photo_url: path, condition_notes: i.collection?.condition_notes ?? null, photo_signed_url: signedUrl },
              }
            : i
        )
      );
    } catch (err) {
      console.error(err);
      alert("Couldn't upload that photo. Please try again.");
    } finally {
      setPhotoPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(issue.id);
        return next;
      });
    }
  }

  if (issues.length === 0) {
    return (
      <p className="mt-10 text-center text-ink-faint">
        Nothing here yet — open an issue and add it to this folder from its detail page.
      </p>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
      {issues.map((issue) => (
        <IssueCard
          key={issue.id}
          issue={issue}
          onToggleOwned={handleToggle}
          onAddPhoto={handleAddPhoto}
          pending={pendingIds.has(issue.id)}
          photoPending={photoPendingIds.has(issue.id)}
        />
      ))}
    </div>
  );
}
