-- Optional magazine page number for a highlight, used to keep the flip-through
-- pages in reading order even when they were added out of order.
alter table public.highlights
  add column if not exists page_number integer check (page_number is null or page_number > 0);
