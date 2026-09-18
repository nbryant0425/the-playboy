"use client";

import { useState } from "react";
import type { MonthGroup } from "@/lib/data";
import type { IssueWithCollection } from "@/lib/types";
import { IssueCard } from "./IssueCard";

export function MonthView({
  groups,
  onToggleOwned,
  onAddPhoto,
  pendingIds,
  photoPendingIds,
}: {
  groups: MonthGroup[];
  onToggleOwned?: (issue: IssueWithCollection) => void;
  onAddPhoto?: (issue: IssueWithCollection, file: File) => void;
  pendingIds: Set<string>;
  photoPendingIds?: Set<string>;
}) {
  const [selected, setSelected] = useState<string>(groups[0]?.period ?? "January");
  const active = groups.find((g) => g.period === selected) ?? groups[0];

  return (
    <div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-3 [scrollbar-width:thin]">
        {groups.map((g) => (
          <button
            key={g.period}
            type="button"
            onClick={() => setSelected(g.period)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              selected === g.period
                ? "border-red bg-red text-paper-card"
                : "border-line bg-paper-card text-ink-soft hover:text-ink"
            }`}
          >
            {g.period}
          </button>
        ))}
      </div>

      {active && active.issues.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
          {active.issues.map((issue) => (
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
      ) : (
        <p className="py-12 text-center text-ink-faint">No issues match the current filter.</p>
      )}
    </div>
  );
}
