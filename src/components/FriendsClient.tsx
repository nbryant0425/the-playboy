"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { acceptFriendRequest, removeFriendship } from "@/lib/friends";

export type FriendshipView = {
  id: string;
  status: "pending" | "accepted";
  counterpart_email: string;
  counterpart_id: string;
  /** True if the current user is the addressee (someone sent them this request). */
  incoming: boolean;
};

export function FriendsClient({ initialFriendships }: { initialFriendships: FriendshipView[] }) {
  const supabase = createClient();
  const [friendships, setFriendships] = useState(initialFriendships);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const accepted = friendships.filter((f) => f.status === "accepted");
  const incomingPending = friendships.filter((f) => f.status === "pending" && f.incoming);
  const outgoingPending = friendships.filter((f) => f.status === "pending" && !f.incoming);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't send that request");
      setFriendships((prev) => [
        { id: body.friendship.id, status: "pending", counterpart_email: trimmed, counterpart_id: body.friendship.addressee_id, incoming: false },
        ...prev,
      ]);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that request");
    } finally {
      setSending(false);
    }
  }

  async function handleAccept(id: string) {
    setBusyId(id);
    try {
      await acceptFriendRequest(supabase, id);
      setFriendships((prev) => prev.map((f) => (f.id === id ? { ...f, status: "accepted" } : f)));
    } catch (err) {
      console.error(err);
      alert("Couldn't accept that request. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(id: string, confirmMessage?: string) {
    if (confirmMessage && !confirm(confirmMessage)) return;
    setBusyId(id);
    try {
      await removeFriendship(supabase, id);
      setFriendships((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error(err);
      alert("Couldn't do that. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6 space-y-8">
      <form onSubmit={handleSend} className="flex flex-wrap gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Their email"
          required
          className="min-w-0 flex-1 rounded-md border border-line bg-paper-card px-3 py-2.5"
        />
        <button
          type="submit"
          disabled={sending || !email.trim()}
          className="whitespace-nowrap rounded-md bg-red px-4 py-2.5 font-semibold text-paper-card disabled:opacity-50"
        >
          {sending ? "Sending…" : "+ Add friend"}
        </button>
      </form>
      {error && <p className="text-sm text-red">{error}</p>}

      {incomingPending.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold">Requests for you</h2>
          <ul className="mt-3 space-y-2">
            {incomingPending.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 rounded-md border border-gold-dark/30 bg-gold/10 px-4 py-3">
                <span className="text-sm">{f.counterpart_email}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === f.id}
                    onClick={() => handleAccept(f.id)}
                    className="rounded-full border border-gold-dark/50 px-3 py-1 text-xs font-semibold text-gold-dark hover:bg-gold/20 disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={busyId === f.id}
                    onClick={() => handleRemove(f.id)}
                    className="rounded-full border border-line-strong px-3 py-1 text-xs font-semibold text-ink-faint hover:text-red disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {outgoingPending.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold">Sent, waiting</h2>
          <ul className="mt-3 space-y-2">
            {outgoingPending.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 rounded-md border border-line bg-paper-card px-4 py-3">
                <span className="text-sm text-ink-soft">{f.counterpart_email}</span>
                <button
                  type="button"
                  disabled={busyId === f.id}
                  onClick={() => handleRemove(f.id)}
                  className="text-sm text-ink-faint underline underline-offset-2 hover:text-red disabled:opacity-50"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-display text-lg font-semibold">Friends</h2>
        {accepted.length === 0 ? (
          <p className="mt-3 text-ink-faint">No friends yet — add one by email above.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-paper-card">
            {accepted.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <Link href={`/friends/${f.counterpart_id}`} className="text-sm font-medium underline underline-offset-2 hover:text-red">
                  {f.counterpart_email}&rsquo;s collection
                </Link>
                <button
                  type="button"
                  disabled={busyId === f.id}
                  onClick={() => handleRemove(f.id, `Remove ${f.counterpart_email} as a friend?`)}
                  className="text-sm text-ink-faint underline underline-offset-2 hover:text-red disabled:opacity-50"
                >
                  Unfriend
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
