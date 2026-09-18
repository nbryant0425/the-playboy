"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type Fuse from "fuse.js";
import type { IssueWithCollection } from "@/lib/types";
import { searchIssues } from "@/lib/search";

const ROLE_STYLE: Record<string, string> = {
  Cover: "bg-red/10 text-red border-red/30",
  Playmate: "bg-red/5 text-red-dark border-red/20",
  Interview: "bg-gold/15 text-gold-dark border-gold-dark/30",
  "Notable name": "bg-ink/10 text-ink-soft border-line-strong",
};

export function SearchBar({ index }: { index: Fuse<IssueWithCollection> }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => searchIssues(index, query).slice(0, 20), [index, query]);

  return (
    <div className="relative">
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          type="search"
          placeholder="Search a model, guest, or cover name…"
          className="w-full rounded-full border border-line bg-paper-card py-2.5 pl-10 pr-4 text-[15px] outline-none placeholder:text-ink-faint focus:border-red"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute z-20 mt-2 max-h-96 w-full overflow-y-auto rounded-lg border border-line bg-paper-card shadow-xl">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-ink-faint">No matches for “{query}”.</p>
          ) : (
            <ul className="divide-y divide-line">
              {results.map(({ issue, roles }) => (
                <li key={issue.id}>
                  <Link
                    href={`/issue/${issue.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper-card-alt"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display text-[15px]">{issue.display_label}</p>
                      <p className="truncate text-sm text-ink-soft">
                        {issue.cover_model}
                        {issue.interview_subject ? ` · ${issue.interview_subject}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {roles.map((role) => (
                        <span
                          key={role}
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ROLE_STYLE[role]}`}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
