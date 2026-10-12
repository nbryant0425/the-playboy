"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export function PhotoLightbox({
  src,
  caption,
  onClose,
}: {
  src: string;
  caption?: React.ReactNode;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const clamp = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

  return (
    <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-50 flex flex-col bg-ink/95">
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-paper-card">
        <div className="flex items-center gap-2">
          <ZoomButton label="Zoom out" disabled={zoom <= MIN_ZOOM} onClick={() => setZoom((z) => clamp(z - 0.75))}>
            <path d="M5 12h14" />
          </ZoomButton>
          <span className="min-w-12 text-center text-sm">{Math.round(zoom * 100)}%</span>
          <ZoomButton label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={() => setZoom((z) => clamp(z + 0.75))}>
            <path d="M12 5v14M5 12h14" />
          </ZoomButton>
          {zoom !== 1 && (
            <button type="button" onClick={() => setZoom(1)} className="ml-1 text-sm underline underline-offset-2">
              Reset
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-paper-card/40 hover:border-paper-card"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <Image
          src={src}
          alt={typeof caption === "string" ? caption : "Highlight photo"}
          width={0}
          height={0}
          sizes="100vw"
          unoptimized
          draggable={false}
          onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 2.5))}
          style={{ width: `${zoom * 100}%`, maxWidth: "none", height: "auto" }}
          className="mx-auto block cursor-zoom-in"
        />
      </div>

      {caption && <div className="px-4 py-3 text-center text-sm text-paper-card">{caption}</div>}
    </div>
  );
}

function ZoomButton({
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
      className="flex h-9 w-9 items-center justify-center rounded-full border border-paper-card/40 hover:border-paper-card disabled:opacity-30"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
        {children}
      </svg>
    </button>
  );
}
