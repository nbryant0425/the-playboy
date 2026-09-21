-- storage.objects had one "for all" policy scoped to your own folder. Split
-- it the same way as user_collection (migration 0005): writes stay
-- owner-only, but SELECT widens to an accepted friend's folder too, so
-- viewing their collection can also show their uploaded photos.
drop policy if exists "users manage their own photo folder" on storage.objects;

drop policy if exists "users write their own photo folder" on storage.objects;
create policy "users write their own photo folder"
  on storage.objects for insert
  with check (bucket_id = 'collection-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "users update their own photo folder" on storage.objects;
create policy "users update their own photo folder"
  on storage.objects for update
  using (bucket_id = 'collection-photos' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'collection-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "users delete their own photo folder" on storage.objects;
create policy "users delete their own photo folder"
  on storage.objects for delete
  using (bucket_id = 'collection-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "own photos or an accepted friend's photos are readable" on storage.objects;
create policy "own photos or an accepted friend's photos are readable"
  on storage.objects for select
  using (
    bucket_id = 'collection-photos'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and (
            (f.requester_id = auth.uid() and f.addressee_id::text = (storage.foldername(name))[1])
            or (f.addressee_id = auth.uid() and f.requester_id::text = (storage.foldername(name))[1])
          )
      )
    )
  );
