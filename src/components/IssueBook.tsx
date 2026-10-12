"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { HighlightWithUrl } from "@/lib/types";
import { PlaceholderCover } from "./IssueCard";

type BookPage =
  | { key: "cover"; kind: "cover"; url: string | null }
  | { key: string; kind: "highlight"; highlight: HighlightWithUrl };

/**
 * The issue as a flip-through book: the cover is the first page, followed by
 * each highlight photo in magazine page order (or the order added, for ones
 * without a page number — `highlights` arrives already sorted that way).
 */
export function IssueBook({
  coverUrl,
  displayLabel,
  highlights,
}: {
  coverUrl: string | null;
  displayLabel: string;
  highlights: HighlightWithUrl[];
}) {
  const pages: BookPage[] = [
    { key: "cover", kind: "cover", url: coverUrl },
    ...highlights
      .filter((h) => h.photo_signed_url)
      .map((h): BookPage => ({ key: h.id, kind: "highlight", highlight: h })),
  ];

  // Track the current page by key so adding or editing highlights doesn't move you to a different page.
  const [currentKey, setCurrentKey] = useState("cover");
  const [direction, setDirection] = useState(1);

  const foundIndex = pages.findIndex((p) => p.key === currentKey);
  const index = foundIndex === -1 ? 0 : foundIndex;
  const page = pages[index];
  const last = pages.length - 1;
  const hasPages = pages.length > 1;

  function go(next: number) {
    const clamped = Math.max(0, Math.min(last, next));
    if (clamped === index) return;
    setDirection(clamped > index ? 1 : -1);
    setCurrentKey(pages[clamped].key);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") go(index + 1);
    else if (e.key === "ArrowLeft") go(index - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(last);
  }

  const imageUrl = page.kind === "cover" ? page.url : page.highlight.photo_signed_url;

  return (
    <div className="mt-6" tabIndex={hasPages ? 0 : undefined} onKeyDown={hasPages ? onKeyDown : undefined}>
      <div className="relative aspect-[3/4] w-full max-w-xs overflow-hidden rounded-lg border border-line bg-paper-card-alt card-shadow">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={page.key}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d * 60, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d * -60, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 350, damping: 34 }}
            drag={hasPages ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(index + 1);
              else if (info.offset.x > 60) go(index - 1);
            }}
            className="absolute inset-0"
          >
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={page.kind === "cover" ? `Cover of ${displayLabel}` : (page.highlight.description ?? `Page ${index + 1}`)}
                fill
                sizes="(max-width: 640px) 90vw, 320px"
                className={`pointer-events-none ${page.kind === "cover" ? "object-cover" : "object-contain"}`}
                unoptimized
                draggable={false}
              />
            ) : (
              <PlaceholderCover />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {hasPages && (
        <div className="mt-3 w-full max-w-xs">
          <div className="flex items-center justify-between gap-2">
            <NavButton label="Back to the cover" disabled={index === 0} onClick={() => go(0)}>
              <path d="M18 17l-5-5 5-5M11 17l-5-5 5-5" />
            </NavButton>
            <NavButton label="Previous page" disabled={index === 0} onClick={() => go(index - 1)}>
              <path d="M15 18l-6-6 6-6" />
            </NavButton>
            <span className="min-w-16 text-center text-sm text-ink-soft">
              {index + 1} / {pages.length}
            </span>
            <NavButton label="Next page" disabled={index === last} onClick={() => go(index + 1)}>
              <path d="M9 18l6-6-6-6" />
            </NavButton>
            <NavButton label="Last page" disabled={index === last} onClick={() => go(last)}>
              <path d="M6 17l5-5-5-5M13 17l5-5-5-5" />
            </NavButton>
          </div>

          <div className="mt-3 text-center">
            {page.kind === "cover" ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Cover</p>
            ) : (
              <>
                {page.highlight.page_number !== null && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Magazine page {page.highlight.page_number}
                  </p>
                )}
                {page.highlight.description && <p className="mt-0.5 leading-relaxed">{page.highlight.description}</p>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong bg-paper-card text-ink transition hover:border-red hover:text-red disabled:opacity-30 disabled:hover:border-line-strong disabled:hover:text-ink"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
