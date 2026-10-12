-- ---------------------------------------------------------------------------
-- highlights: a personal note and/or photo of something in a specific issue
-- (an article, an ad). Private to the user who added it. Photos live in the
-- existing collection-photos bucket under "<user_id>/highlights/...", so the
-- per-user storage policies already cover them.
-- ---------------------------------------------------------------------------
create table if not exists public.highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  issue_id uuid not null references public.issues (id) on delete cascade,
  photo_url text,
  description text,
  created_at timestamptz not null default now(),
  check (photo_url is not null or length(trim(coalesce(description, ''))) > 0)
);

create index if not exists highlights_user_issue_idx on public.highlights (user_id, issue_id, created_at);

alter table public.highlights enable row level security;

drop policy if exists "users manage their own highlights" on public.highlights;
create policy "users manage their own highlights"
  on public.highlights for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
