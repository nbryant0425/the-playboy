"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { IssueWithCollection } from "@/lib/types";

const CONFIDENCE_FLAG: Record<string, string> = {
  "needs-verification": "Needs verification",
  unknown: "Unverified",
};

export function IssueCard({
  issue,
  onToggleOwned,
  onAddPhoto,
  pending,
  photoPending,
}: {
  issue: IssueWithCollection;
  onToggleOwned: (issue: IssueWithCollection) => void;
  onAddPhoto?: (issue: IssueWithCollection, file: File) => void;
  pending?: boolean;
  photoPending?: boolean;
}) {
  const owned = !!issue.collection?.owned;
  const photoUrl = issue.collection?.photo_signed_url;
  const flag = CONFIDENCE_FLAG[issue.source_confidence];
  const displayName = issue.cover_model || issue.playmate_name;
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="group rounded-lg border border-line bg-paper-card p-2.5 card-shadow transition hover:-translate-y-0.5 hover:shadow-lg sm:p-3">
      <Link href={`/issue/${issue.id}`} className="block">
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm bg-paper-card-alt">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={`Your copy of ${issue.display_label}`}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 220px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <PlaceholderCover flag={flag} />
          )}

          <button
            type="button"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              onToggleOwned(issue);
            }}
            aria-pressed={owned}
            aria-label={owned ? "Mark as not owned" : "Mark as owned"}
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-paper-card/80 bg-ink/40 backdrop-blur-sm transition hover:border-red disabled:opacity-50"
          >
            <AnimatePresence initial={false}>
              {owned && (
                <motion.svg
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.3, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-paper-card"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 13l4 4L19 7" />
                </motion.svg>
              )}
            </AnimatePresence>
          </button>

          {owned && !photoUrl && (
            <div
              key={issue.id + "-stamp"}
              className="collected-stamp collected-stamp-animate pointer-events-none absolute bottom-2 right-2 px-1.5 py-0.5 text-[9px] font-bold"
            >
              Collected
            </div>
          )}

          {owned && !photoUrl && onAddPhoto && (
            <button
              type="button"
              disabled={photoPending}
              onClick={(e) => {
                e.preventDefault();
                fileInputRef.current?.click();
              }}
              aria-label="Add a photo of your copy"
              title="Add a photo of your copy"
              className="absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-line-strong bg-paper-card/90 text-ink-soft transition hover:border-red hover:text-red disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path
                  d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="13.5" r="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        <div className="mt-2.5 text-center sm:mt-3">
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">{issue.year}</p>
          <p className="font-display text-base font-bold leading-tight text-ink sm:text-lg">{issue.issue_period}</p>
          {displayName ? (
            <p className="mt-0.5 line-clamp-2 text-[13px] italic leading-tight text-ink-soft">{displayName}</p>
          ) : (
            <p className="mt-0.5 text-[13px] italic leading-tight text-ink-faint">Unknown</p>
          )}
        </div>
      </Link>

      {owned && !photoUrl && onAddPhoto && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onAddPhoto(issue, file);
            e.target.value = "";
          }}
        />
      )}
    </div>
  );
}

function PlaceholderCover({ flag }: { flag: string | undefined }) {
  return (
    <div className="texture-halftone-cover flex h-full w-full flex-col items-center justify-center gap-2">
      <div className="h-8 w-px bg-red/40 sm:h-12" />
      <div className="h-2 w-2 rotate-45 bg-gold/70" />
      <div className="h-8 w-px bg-red/40 sm:h-12" />
      {flag && (
        <p className="absolute bottom-2 text-[8px] uppercase tracking-wide text-gold-dark">{flag}</p>
      )}
    </div>
  );
}
