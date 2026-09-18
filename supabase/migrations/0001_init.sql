-- The Playboy: collector's checklist schema
-- Run this against your Supabase project (SQL editor, or `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- issues: one row per published issue, pre-seeded, shared across all users
-- ---------------------------------------------------------------------------
create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  issue_period text not null, -- "January".."December", or "Winter"/"Spring"/"Summer"/"Fall"
  display_label text not null, -- e.g. "October 1975"
  cover_model text, -- the Playmate of the Month / featured model(s); NOT a verified cover photo credit
  interview_subject text, -- the headline "Playboy Interview" guest, if documented. NULL = unknown, not "none".
  notable_cover_names text, -- other headline names on the cover / coverlines, comma-separated
  synopsis text, -- AI-generated on first detail-page view, cached here
  source_confidence text not null default 'unknown'
    check (source_confidence in ('verified', 'wikipedia-sourced', 'needs-verification', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year, issue_period)
);

create index if not exists issues_year_idx on public.issues (year);
create index if not exists issues_issue_period_idx on public.issues (issue_period);

-- Full-text search across the three name fields (cover model, interview subject, notable cover names)
alter table public.issues add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(cover_model, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(interview_subject, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(notable_cover_names, '')), 'B')
  ) stored;

create index if not exists issues_search_idx on public.issues using gin (search_vector);

-- ---------------------------------------------------------------------------
-- user_collection: one row per user x issue they've interacted with
-- ---------------------------------------------------------------------------
create table if not exists public.user_collection (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  issue_id uuid not null references public.issues (id) on delete cascade,
  owned boolean not null default false,
  photo_url text,
  condition_notes text,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, issue_id)
);

create index if not exists user_collection_user_idx on public.user_collection (user_id);
create index if not exists user_collection_issue_idx on public.user_collection (issue_id);

-- ---------------------------------------------------------------------------
-- issue_corrections: lightweight "suggested correction" queue, not a full
-- moderation system. Any signed-in user can propose a correction to shared
-- issue metadata; corrections are reviewed (accepted/rejected) rather than
-- silently overwriting the seed data for everyone.
-- ---------------------------------------------------------------------------
create table if not exists public.issue_corrections (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues (id) on delete cascade,
  suggested_by uuid not null references auth.users (id) on delete cascade,
  field text not null check (field in ('cover_model', 'interview_subject', 'notable_cover_names', 'source_confidence')),
  suggested_value text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id)
);

create index if not exists issue_corrections_issue_idx on public.issue_corrections (issue_id);
create index if not exists issue_corrections_status_idx on public.issue_corrections (status);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists issues_set_updated_at on public.issues;
create trigger issues_set_updated_at
  before update on public.issues
  for each row execute function public.set_updated_at();

drop trigger if exists user_collection_set_updated_at on public.user_collection;
create trigger user_collection_set_updated_at
  before update on public.user_collection
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.issues enable row level security;
alter table public.user_collection enable row level security;
alter table public.issue_corrections enable row level security;

-- issues: readable by anyone (even signed-out, for browsing); writes only via
-- the correction-suggestion flow below, never a direct client update.
drop policy if exists "issues are publicly readable" on public.issues;
create policy "issues are publicly readable"
  on public.issues for select
  using (true);

-- user_collection: each user can only see/manage their own rows
drop policy if exists "users manage their own collection rows" on public.user_collection;
create policy "users manage their own collection rows"
  on public.user_collection for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- issue_corrections: any signed-in user can propose a correction and see
-- their own suggestions; accepting/rejecting happens via the service role
-- (server-side route), not directly from the client.
drop policy if exists "users can suggest corrections" on public.issue_corrections;
create policy "users can suggest corrections"
  on public.issue_corrections for insert
  with check (auth.uid() = suggested_by);

drop policy if exists "users can view their own suggestions" on public.issue_corrections;
create policy "users can view their own suggestions"
  on public.issue_corrections for select
  using (auth.uid() = suggested_by);

-- ---------------------------------------------------------------------------
-- Storage bucket for physical-copy photos (private; per-user access)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('collection-photos', 'collection-photos', false)
on conflict (id) do nothing;

drop policy if exists "users manage their own photo folder" on storage.objects;
create policy "users manage their own photo folder"
  on storage.objects for all
  using (bucket_id = 'collection-photos' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'collection-photos' and auth.uid()::text = (storage.foldername(name))[1]);
