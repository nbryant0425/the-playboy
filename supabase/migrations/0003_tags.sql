-- Lets each user create their own folders/tags (e.g. "January wall", "Love-themed")
-- and file issues from their collection into them. Purely organizational —
-- separate from `owned` status — and private to each user, same as the rest
-- of their collection state.
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.issue_tags (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.tags (id) on delete cascade,
  issue_id uuid not null references public.issues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tag_id, issue_id)
);

create index if not exists tags_user_idx on public.tags (user_id);
create index if not exists issue_tags_tag_idx on public.issue_tags (tag_id);
create index if not exists issue_tags_issue_idx on public.issue_tags (issue_id);
create index if not exists issue_tags_user_idx on public.issue_tags (user_id);

alter table public.tags enable row level security;
alter table public.issue_tags enable row level security;

drop policy if exists "users manage their own tags" on public.tags;
create policy "users manage their own tags"
  on public.tags for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users manage their own issue_tags" on public.issue_tags;
create policy "users manage their own issue_tags"
  on public.issue_tags for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
