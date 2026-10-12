"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { addHighlight, deleteHighlight } from "@/lib/highlights";
import { getSignedPhotoUrl } from "@/lib/collection";
import type { HighlightWithUrl } from "@/lib/types";

type ViewMode = "flip" | "list";

export function HighlightsSection({
  issueId,
  userId,
  initialHighlights,
}: {
  issueId: string;
  userId: string;
  initialHighlights: HighlightWithUrl[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [highlights, setHighlights] = useState(initialHighlights);
  const [mode, setMode] = useState<ViewMode>("flip");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pages = highlights.filter((h) => h.photo_signed_url);
  const textOnlyCount = highlights.length - pages.length;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!file && !description.trim()) return;
    setSaving(true);
    try {
      const row = await addHighlight(supabase, userId, issueId, { file, description });
      const signed = row.photo_url ? await getSignedPhotoUrl(supabase, row.photo_url) : null;
      setHighlights((prev) => [...prev, { ...row, photo_signed_url: signed }]);
      setFile(null);
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error(err);
      alert("Couldn't save that highlight. Please try again.");
    } finally {
      setSaving(false);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">
          Highlights
          {highlights.length > 0 && <span className="ml-2 text-sm font-normal text-ink-faint">{highlights.length}</span>}
        </h2>
        {highlights.length > 0 && (
          <div className="inline-flex rounded-full border border-line bg-paper-card p-0.5 text-sm">
            {(["flip", "list"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`rounded-full px-3.5 py-1 font-medium transition ${
                  mode === m ? "bg-ink text-paper-card" : "text-ink-soft hover:text-ink"
                }`}
              >
                {m === "flip" ? "Flip through" : "List"}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Save an article or ad you loved from this issue — snap a photo, add a note. Photos become pages you can flip
        through.
      </p>

      {highlights.length > 0 &&
        (mode === "flip" ? (
          <Flipper pages={pages} textOnlyCount={textOnlyCount} busyId={busyId} onDelete={handleDelete} />
        ) : (
          <HighlightList highlights={highlights} busyId={busyId} onDelete={handleDelete} />
        ))}

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
          <span className="mb-1 block text-ink-soft">What is it, and why do you like it?</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-line bg-paper px-3 py-2"
            placeholder="e.g. The Hunter S. Thompson piece on page 84 — great illustrations too"
          />
        </label>
        <button
          type="submit"
          disabled={saving || (!file && !description.trim())}
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper-card disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add highlight"}
        </button>
      </form>
    </div>
  );
}

function Flipper({
  pages,
  textOnlyCount,
  busyId,
  onDelete,
}: {
  pages: HighlightWithUrl[];
  textOnlyCount: number;
  busyId: string | null;
  onDelete: (h: HighlightWithUrl) => void;
}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  if (pages.length === 0) {
    return (
      <p className="mt-4 rounded-md border border-line bg-paper-card px-4 py-6 text-center text-sm text-ink-faint">
        No photo pages yet — add a highlight with a photo and it will show up here to flip through.
        {textOnlyCount > 0 && " Your notes without photos are in the List view."}
      </p>
    );
  }

  const safeIndex = Math.min(index, pages.length - 1);
  const page = pages[safeIndex];
  const last = pages.length - 1;

  function go(next: number) {
    const clamped = Math.max(0, Math.min(last, next));
    if (clamped === safeIndex) return;
    setDirection(clamped > safeIndex ? 1 : -1);
    setIndex(clamped);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") go(safeIndex + 1);
    else if (e.key === "ArrowLeft") go(safeIndex - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(last);
  }

  return (
    <div className="mt-4" tabIndex={0} onKeyDown={onKeyDown} aria-label="Highlight pages">
      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-lg border border-line bg-paper-card-alt card-shadow">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={page.id}
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
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(safeIndex + 1);
              else if (info.offset.x > 60) go(safeIndex - 1);
            }}
            className="absolute inset-0"
          >
            <Image
              src={page.photo_signed_url!}
              alt={page.description ?? `Highlight page ${safeIndex + 1}`}
              fill
              sizes="(max-width: 640px) 90vw, 384px"
              className="pointer-events-none object-contain"
              unoptimized
              draggable={false}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mx-auto mt-3 flex max-w-sm items-center justify-between gap-2">
        <NavButton label="First page" disabled={safeIndex === 0} onClick={() => go(0)}>
          <path d="M18 17l-5-5 5-5M11 17l-5-5 5-5" />
        </NavButton>
        <NavButton label="Previous page" disabled={safeIndex === 0} onClick={() => go(safeIndex - 1)}>
          <path d="M15 18l-6-6 6-6" />
        </NavButton>
        <span className="min-w-20 text-center text-sm text-ink-soft">
          {safeIndex + 1} / {pages.length}
        </span>
        <NavButton label="Next page" disabled={safeIndex === last} onClick={() => go(safeIndex + 1)}>
          <path d="M9 18l6-6-6-6" />
        </NavButton>
        <NavButton label="Last page" disabled={safeIndex === last} onClick={() => go(last)}>
          <path d="M6 17l5-5-5-5M13 17l5-5-5-5" />
        </NavButton>
      </div>

      <div className="mx-auto mt-3 max-w-sm text-center">
        {page.description && <p className="leading-relaxed">{page.description}</p>}
        <button
          type="button"
          disabled={busyId === page.id}
          onClick={() => onDelete(page)}
          className="mt-2 text-sm text-ink-faint underline underline-offset-2 hover:text-red disabled:opacity-50"
        >
          Delete this page
        </button>
        {textOnlyCount > 0 && (
          <p className="mt-2 text-xs text-ink-faint">
            {textOnlyCount} note{textOnlyCount === 1 ? "" : "s"} without a photo {textOnlyCount === 1 ? "is" : "are"}{" "}
            in the List view.
          </p>
        )}
      </div>
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

function HighlightList({
  highlights,
  busyId,
  onDelete,
}: {
  highlights: HighlightWithUrl[];
  busyId: string | null;
  onDelete: (h: HighlightWithUrl) => void;
}) {
  return (
    <ul className="mt-4 space-y-3">
      {highlights.map((h) => (
        <li key={h.id} className="flex gap-3 rounded-lg border border-line bg-paper-card p-3">
          {h.photo_signed_url && (
            <a
              href={h.photo_signed_url}
              target="_blank"
              rel="noreferrer"
              className="relative block h-28 w-20 shrink-0 overflow-hidden rounded-sm bg-paper-card-alt"
            >
              <Image
                src={h.photo_signed_url}
                alt={h.description ?? "Highlight photo"}
                fill
                sizes="80px"
                className="object-cover"
                unoptimized
              />
            </a>
          )}
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
            <p className="whitespace-pre-line leading-relaxed">
              {h.description ?? <span className="italic text-ink-faint">Photo only</span>}
            </p>
            <button
              type="button"
              disabled={busyId === h.id}
              onClick={() => onDelete(h)}
              className="self-start text-sm text-ink-faint underline underline-offset-2 hover:text-red disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
