# The Playboy — Collector's Checklist

A personal, two-person collector's checklist for tracking a physical Playboy magazine
collection: every issue ever published (Dec 1953–present) pre-populated as a
trackable entry, with per-user owned/missing state, photo attachments for your own
physical copies, name search across cover models/interview subjects, and on-demand
AI-generated issue synopses.

Not affiliated with or endorsed by Playboy Enterprises. No Playboy logos, trademarks,
or copyrighted cover photography are used — only text metadata (names, dates) and
photos you take of your own physical copies.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Framer Motion for the By Month / By Year slide transition
- Supabase: Postgres, Auth (Google + Microsoft/Azure OAuth), Storage
- Fuse.js for client-side fuzzy name search
- Claude API for on-demand issue synopses (cached after first generation)

## Getting started

See [`SETUP.md`](SETUP.md) — it walks through creating the Supabase project, running
the schema migration and seed import, wiring up Google/Microsoft sign-in, and getting
an Anthropic API key. None of those steps can be done for you (they require your own
accounts), but everything else is already built.

```bash
npm install
cp .env.local.example .env.local   # then fill it in per SETUP.md
npm run dev
```

## Project structure

- `supabase/migrations/0001_init.sql` — schema (issues, user_collection, issue_corrections, RLS, storage bucket)
- `supabase/seed/playboy_issue_seed_data.csv` — the source-of-truth seed data (827 issues)
- `supabase/seed/seed.sql` — generated from the CSV via `npm run seed:generate`; paste into the Supabase SQL editor
- `src/app` — routes (home, login, issue detail, add magazine, API routes)
- `src/components` — UI components
- `src/lib` — Supabase clients, data/grouping helpers, search, collection mutations, shared types

## Known v1 scope notes (from the original spec)

- Each signed-in user tracks their own owned/missing state independently — this is
  **not** a shared household collection yet. A shared/group mode is a reasonable v2
  feature if you want it later (see spec section 2).
- Corrections to shared issue metadata (cover model, interview subject, etc.) go
  through a lightweight suggest → accept flow (`issue_corrections` table), not a full
  moderation system — either of you can accept a pending suggestion from the issue's
  detail page.
- The 2021–2024 print-schedule gap in the seed data is intentional, not a bug — fill
  it in via corrections as you go through your physical copies.
