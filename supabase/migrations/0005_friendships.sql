-- ---------------------------------------------------------------------------
-- friendships: mutual opt-in connection between two users. Lets a friend's
-- accepted checklist (owned/missing only — never their private photos, which
-- stay gated by the existing per-user storage policy) show up read-only.
-- ---------------------------------------------------------------------------
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

-- Either side of a friendship (pending or accepted) can see the row.
drop policy if exists "see your own friendships" on public.friendships;
create policy "see your own friendships"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Only the addressee can accept (flip status) an incoming request.
drop policy if exists "addressee can accept a request" on public.friendships;
create policy "addressee can accept a request"
  on public.friendships for update
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id);

-- Either side can remove a friendship — declining, cancelling, or unfriending
-- are all just "delete the row".
drop policy if exists "either side can remove a friendship" on public.friendships;
create policy "either side can remove a friendship"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Requests themselves are created via a server route (service role) after
-- looking up the addressee by email, so no client-side insert policy is
-- needed here.

-- ---------------------------------------------------------------------------
-- user_collection: split the old single "for all" policy so SELECT can be
-- widened to accepted friends (read-only) while writes stay owner-only.
-- ---------------------------------------------------------------------------
drop policy if exists "users manage their own collection rows" on public.user_collection;

drop policy if exists "users write their own collection rows" on public.user_collection;
create policy "users write their own collection rows"
  on public.user_collection for insert
  with check (auth.uid() = user_id);

drop policy if exists "users update their own collection rows" on public.user_collection;
create policy "users update their own collection rows"
  on public.user_collection for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users delete their own collection rows" on public.user_collection;
create policy "users delete their own collection rows"
  on public.user_collection for delete
  using (auth.uid() = user_id);

drop policy if exists "own rows or an accepted friend's rows are readable" on public.user_collection;
create policy "own rows or an accepted friend's rows are readable"
  on public.user_collection for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = user_collection.user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = user_collection.user_id)
        )
    )
  );
