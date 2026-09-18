"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { setOwned, attachPhotoAndMarkOwned, getSignedPhotoUrl } from "@/lib/collection";
import { groupByYear, groupByMonth, applyOwnershipFilter, countOwned, type OwnershipFilter } from "@/lib/data";
import type { IssueWithCollection } from "@/lib/types";
import { createIssueSearchIndex } from "@/lib/search";
import { ViewModeSwitcher, type ViewMode } from "./ViewModeSwitcher";
import { SlidingPanes } from "./SlidingPanes";
import { YearView } from "./YearView";
import { MonthView } from "./MonthView";
import { ProgressBar } from "./ProgressBar";
import { FilterTabs } from "./FilterTabs";
import { SearchBar } from "./SearchBar";

export function HomeShell({
  initialIssues,
  userId,
  readOnly = false,
  heading,
}: {
  initialIssues: IssueWithCollection[];
  userId: string | null;
  /** When true, owned/photo controls are disabled — used for viewing a friend's collection. */
  readOnly?: boolean;
  heading?: React.ReactNode;
}) {
  const [issues, setIssues] = useState(initialIssues);
  const [mode, setMode] = useState<ViewMode>("year");
  const [filter, setFilter] = useState<OwnershipFilter>("all");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [photoPendingIds, setPhotoPendingIds] = useState<Set<string>>(new Set());
  const [signInHint, setSignInHint] = useState(false);

  const supabase = useMemo(() => createClient(), []);
  const searchIndex = useMemo(() => createIssueSearchIndex(issues), [issues]);

  const totalOwned = useMemo(() => countOwned(issues), [issues]);
  const filtered = useMemo(() => applyOwnershipFilter(issues, filter), [issues, filter]);
  const yearGroups = useMemo(() => groupByYear(filtered), [filtered]);
  const monthGroups = useMemo(() => groupByMonth(filtered), [filtered]);
  const mostRecentYear = yearGroups.at(-1)?.year;

  async function handleToggle(issue: IssueWithCollection) {
    if (readOnly) return;
    if (!userId) {
      setSignInHint(true);
      window.setTimeout(() => setSignInHint(false), 3000);
      return;
    }
    const nextOwned = !issue.collection?.owned;

    setPendingIds((prev) => new Set(prev).add(issue.id));
    setIssues((prev) =>
      prev.map((i) =>
        i.id === issue.id
          ? { ...i, collection: { owned: nextOwned, photo_url: i.collection?.photo_url ?? null, condition_notes: i.collection?.condition_notes ?? null } }
          : i
      )
    );

    try {
      await setOwned(supabase, userId, issue.id, nextOwned);
    } catch (err) {
      console.error(err);
      // revert on failure
      setIssues((prev) =>
        prev.map((i) => (i.id === issue.id ? { ...i, collection: issue.collection } : i))
      );
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(issue.id);
        return next;
      });
    }
  }

  async function handleAddPhoto(issue: IssueWithCollection, file: File) {
    if (readOnly) return;
    if (!userId) {
      setSignInHint(true);
      window.setTimeout(() => setSignInHint(false), 3000);
      return;
    }
    setPhotoPendingIds((prev) => new Set(prev).add(issue.id));
    try {
      const path = await attachPhotoAndMarkOwned(supabase, userId, issue.id, file);
      const signedUrl = await getSignedPhotoUrl(supabase, path);
      setIssues((prev) =>
        prev.map((i) =>
          i.id === issue.id
            ? { ...i, collection: { owned: true, photo_url: path, condition_notes: i.collection?.condition_notes ?? null, photo_signed_url: signedUrl } }
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {heading}
      <div className="mb-6 space-y-4">
        <SearchBar index={searchIndex} />
        <ProgressBar owned={totalOwned} total={issues.length} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterTabs value={filter} onChange={setFilter} />
          <ViewModeSwitcher mode={mode} onChange={setMode} />
        </div>
        {signInHint && (
          <p className="rounded-md border border-gold-dark/40 bg-gold/15 px-3 py-2 text-sm text-gold-dark">
            Sign in to start checking off issues you own.
          </p>
        )}
      </div>

      <SlidingPanes
        mode={mode}
        yearView={
          <YearView
            groups={yearGroups}
            onToggleOwned={readOnly ? undefined : handleToggle}
            onAddPhoto={readOnly ? undefined : handleAddPhoto}
            pendingIds={pendingIds}
            photoPendingIds={photoPendingIds}
            defaultExpandedYear={mostRecentYear}
          />
        }
        monthView={
          <MonthView
            groups={monthGroups}
            onToggleOwned={readOnly ? undefined : handleToggle}
            onAddPhoto={readOnly ? undefined : handleAddPhoto}
            pendingIds={pendingIds}
            photoPendingIds={photoPendingIds}
          />
        }
      />
    </div>
  );
}
