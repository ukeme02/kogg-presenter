-- Run once in the KOGG project's SQL Editor. No public file access.
-- 50 MiB is compatible with the Free project's maximum file size.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('service-media', 'service-media', false, 52428800,
 array['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm','video/ogg'])
on conflict (id) do update set public=false,
 file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

-- Restrictive guards prevent an unrelated broad policy from exposing this bucket.
drop policy if exists "kogg_media_owner_guard" on storage.objects;
create policy "kogg_media_owner_guard" on storage.objects as restrictive for all to public
using (bucket_id<>'service-media' or (select auth.uid()::text)=(storage.foldername(name))[1])
with check (bucket_id<>'service-media' or (select auth.uid()::text)=(storage.foldername(name))[1]);
drop policy if exists "kogg_media_immutable_guard" on storage.objects;
create policy "kogg_media_immutable_guard" on storage.objects as restrictive for update to public
using (bucket_id<>'service-media') with check (bucket_id<>'service-media');
drop policy if exists "kogg_media_delete_guard" on storage.objects;
create policy "kogg_media_delete_guard" on storage.objects as restrictive for delete to public
using (bucket_id<>'service-media');

-- Content-addressed immutable files: only insert and read in your own account folder.
-- No overwrite or delete permission is needed by the presenter.
drop policy if exists "kogg_media_read_own" on storage.objects;
create policy "kogg_media_read_own" on storage.objects for select to authenticated
using (bucket_id='service-media' and (storage.foldername(name))[1]=(select auth.uid()::text));
drop policy if exists "kogg_media_insert_own" on storage.objects;
create policy "kogg_media_insert_own" on storage.objects for insert to authenticated
with check (bucket_id='service-media'
 and (storage.foldername(name))[1]=(select auth.uid()::text)
 and name ~ '^[0-9a-f-]{36}/[0-9a-f]{64}$');
commit;
