"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { setOwned, attachPhotoAndMarkOwned, getSignedPhotoUrl } from "@/lib/collection";
import type { Issue, IssueCorrection, UserCollectionRow, Tag } from "@/lib/types";
import { SynopsisBlock } from "./SynopsisBlock";
import { CorrectionForm } from "./CorrectionForm";
import { PendingCorrections } from "./PendingCorrections";
import { TagManager } from "./TagManager";

const CONFIDENCE_COPY: Record<string, { label: string; tone: string }> = {
  verified: { label: "Verified against primary sources", tone: "text-ink-soft" },
  "wikipedia-sourced": { label: "Sourced from Wikipedia / playboy.com archives", tone: "text-ink-soft" },
  "needs-verification": { label: "Needs verification — data may be incomplete", tone: "text-gold-dark" },
  unknown: { label: "Unverified", tone: "text-gold-dark" },
};

export function IssueDetailClient({
  issue,
  collection,
  signedPhotoUrl,
  userId,
  pendingCorrections,
  allTags,
  initialIssueTagIds,
}: {
  issue: Issue;
  collection: UserCollectionRow | null;
  signedPhotoUrl: string | null;
  userId: string | null;
  pendingCorrections: IssueCorrection[];
  allTags: Tag[];
  initialIssueTagIds: string[];
}) {
  const supabase = createClient();
  const [owned, setOwnedState] = useState(!!collection?.owned);
  const [photoUrl, setPhotoUrl] = useState(signedPhotoUrl);
  const [busy, setBusy] = useState(false);
  const [corrections, setCorrections] = useState(pendingCorrections);
  const confidence = CONFIDENCE_COPY[issue.source_confidence];

  async function toggleOwned() {
    if (!userId) return;
    const next = !owned;
    setOwnedState(next);
    try {
      await setOwned(supabase, userId, issue.id, next);
    } catch (err) {
      console.error(err);
      setOwnedState(!next);
    }
  }

  async function handleFile(file: File) {
    if (!userId) return;
    setBusy(true);
    try {
      const path = await attachPhotoAndMarkOwned(supabase, userId, issue.id, file);
      setOwnedState(true);
      const url = await getSignedPhotoUrl(supabase, path);
      setPhotoUrl(url);
    } catch (err) {
      console.error(err);
      alert("Couldn't upload that photo. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="mt-4">
      <p className="font-display text-sm uppercase tracking-[0.25em] text-ink-faint">{issue.display_label}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink-faint">
        {issue.cover_model ? (
          "On the cover"
        ) : (
          <>
            Playmate of the Month{" "}
            <span className="normal-case tracking-normal text-ink-faint/70">— cover subject not yet confirmed</span>
          </>
        )}
      </p>
      <h1 className="mt-1 font-display text-3xl font-black leading-tight sm:text-4xl">
        {issue.cover_model ?? issue.playmate_name ?? <span className="italic text-ink-faint">Unknown</span>}
      </h1>
      {issue.cover_model && issue.playmate_name && issue.playmate_name !== issue.cover_model && (
        <p className="mt-1 text-sm text-ink-soft">
          Playmate of the Month: <span className="text-ink">{issue.playmate_name}</span>
        </p>
      )}
      {issue.interview_subject && (
        <p className="mt-3 text-lg text-ink-soft">
          Playboy Interview: <span className="text-ink">{issue.interview_subject}</span>
        </p>
      )}
      {issue.notable_cover_names && (
        <p className="mt-1 text-sm text-ink-soft">
          <span className="font-semibold text-ink">Also on the cover:</span> {issue.notable_cover_names}
        </p>
      )}

      {confidence && <p className={`mt-3 text-xs uppercase tracking-wide ${confidence.tone}`}>{confidence.label}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {userId ? (
          <button
            type="button"
            onClick={toggleOwned}
            className={`rounded-full px-5 py-2.5 font-display font-semibold uppercase tracking-wide transition ${
              owned ? "bg-ink text-paper-card" : "bg-red text-paper-card hover:bg-red-dark"
            }`}
          >
            {owned ? "✓ Collected" : "Mark as owned"}
          </button>
        ) : (
          <p className="text-sm text-ink-faint">Sign in to track this issue in your own checklist.</p>
        )}

        {userId && (
          <label className="cursor-pointer text-sm font-medium text-ink-soft underline underline-offset-2 hover:text-ink">
            {photoUrl ? "Replace photo" : "Attach a photo of your copy"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
        )}
      </div>

      {photoUrl && (
        <div className="relative mt-6 aspect-[3/4] w-full max-w-xs overflow-hidden rounded-lg border border-line card-shadow">
          <Image src={photoUrl} alt={`Your copy of ${issue.display_label}`} fill className="object-cover" unoptimized />
        </div>
      )}

      {userId && (
        <div className="mt-8 border-t border-line pt-6">
          <h2 className="font-display text-lg font-semibold">Folders</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Organize this issue into your own folders — by theme, display wall, decade, whatever helps you find it
            again.
          </p>
          <div className="mt-3">
            <TagManager issueId={issue.id} userId={userId} allTags={allTags} initialIssueTagIds={initialIssueTagIds} />
          </div>
        </div>
      )}

      <div className="mt-8 border-t border-line pt-6">
        <h2 className="font-display text-lg font-semibold">About this issue</h2>
        <SynopsisBlock issueId={issue.id} initialSynopsis={issue.synopsis} signedIn={!!userId} />
      </div>

      {userId && (
        <div className="mt-8 border-t border-line pt-6">
          <h2 className="font-display text-lg font-semibold">Suggest a correction</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Checked your physical copy and something&rsquo;s off? Suggest a fix — it&rsquo;s flagged here for review
            rather than silently overwriting the record.
          </p>
          <CorrectionForm
            issueId={issue.id}
            userId={userId}
            currentValues={{
              cover_model: issue.cover_model,
              playmate_name: issue.playmate_name,
              interview_subject: issue.interview_subject,
              notable_cover_names: issue.notable_cover_names,
            }}
            onSubmitted={(c) => setCorrections((prev) => [c, ...prev])}
          />
          <PendingCorrections corrections={corrections} onResolved={(id) => setCorrections((prev) => prev.filter((c) => c.id !== id))} />
        </div>
      )}
    </article>
  );
}
