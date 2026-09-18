-- Splits the old single "cover_model" field (which really meant "Playmate of
-- the Month") into two distinct facts:
--   - playmate_name: the centerfold Playmate of the Month (unchanged meaning)
--   - cover_model:   who is *literally photographed on the front cover* —
--     for much of Playboy's history these are the same person, but from the
--     1990s onward they frequently diverge (a named celebrity cover vs. that
--     month's Playmate). cover_model is being corrected issue-by-issue
--     against playboy.com's own archive; until corrected it's seeded from
--     playmate_name as the best available guess.
alter table public.issues add column if not exists playmate_name text;
update public.issues set playmate_name = cover_model where playmate_name is null;

-- Rebuild the search vector to include playmate_name alongside the other name fields.
alter table public.issues drop column if exists search_vector;
alter table public.issues add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(cover_model, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(playmate_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(interview_subject, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(notable_cover_names, '')), 'B')
  ) stored;

create index if not exists issues_search_idx on public.issues using gin (search_vector);
