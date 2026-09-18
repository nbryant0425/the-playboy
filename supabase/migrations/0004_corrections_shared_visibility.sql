-- issue_corrections was readable only by the person who submitted a given
-- correction, which defeats the two-person "suggest, then the other person
-- reviews and accepts" flow the accept route already assumes (any signed-in
-- user can accept any pending correction). Widen SELECT to any signed-in
-- user, matching accept's trust model — this is a private household app,
-- not a public one.
drop policy if exists "users can view their own suggestions" on public.issue_corrections;
drop policy if exists "signed-in users can view pending corrections" on public.issue_corrections;
create policy "signed-in users can view pending corrections"
  on public.issue_corrections for select
  using (auth.role() = 'authenticated');

-- The field check constraint predates the cover_model/playmate_name split
-- (migration 0002) and was never updated, so a "Playmate of the Month"
-- correction fails silently at the database level. Allow it.
alter table public.issue_corrections drop constraint if exists issue_corrections_field_check;
alter table public.issue_corrections add constraint issue_corrections_field_check
  check (field in ('cover_model', 'playmate_name', 'interview_subject', 'notable_cover_names', 'source_confidence'));
