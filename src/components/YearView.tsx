"use client";

import { useState } from "react";
import type { YearGroup } from "@/lib/data";
import type { IssueWithCollection } from "@/lib/types";
import { IssueCard } from "./IssueCard";
import { countOwned } from "@/lib/data";

export function YearView({
  groups,
  onToggleOwned,
  onAddPhoto,
  pendingIds,
  photoPendingIds,
  defaultExpandedYear,
}: {
  groups: YearGroup[];
  onToggleOwned?: (issue: IssueWithCollection) => void;
  onAddPhoto?: (issue: IssueWithCollection, file: File) => void;
  pendingIds: Set<string>;
  photoPendingIds?: Set<string>;
  defaultExpandedYear?: number;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set(defaultExpandedYear ? [defaultExpandedYear] : [])
  );

  function toggleYear(year: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  if (groups.length === 0) {
    return <p className="py-12 text-center text-ink-faint">No issues match the current filter.</p>;
  }

  return (
    <div className="space-y-2">
      {groups.map(({ year, issues }) => {
        const isOpen = expanded.has(year);
        const owned = countOwned(issues);
        return (
          <div key={year} className="overflow-hidden rounded-lg border border-line bg-paper-card/60">
            <button
              type="button"
              onClick={() => toggleYear(year)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="font-display text-xl font-semibold">{year}</span>
              <span className="flex items-center gap-3 text-sm text-ink-soft">
                <span>
                  {owned}/{issues.length}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
            {isOpen && (
              <div className="grid grid-cols-2 gap-4 border-t border-line p-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
                {issues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    onToggleOwned={onToggleOwned}
                    onAddPhoto={onAddPhoto}
                    pending={pendingIds.has(issue.id)}
                    photoPending={photoPendingIds?.has(issue.id)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
