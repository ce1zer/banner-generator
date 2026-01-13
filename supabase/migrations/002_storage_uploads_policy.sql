-- Storage RLS for client-side uploads (MVP)
--
-- This enables authenticated users to upload ONE dog photo directly to the private `uploads` bucket
-- under a folder matching their user id:  uploads/<user_id>/<uuid>.<ext>
--
-- IMPORTANT:
-- - This app uses service role server-side to create signed URLs and to write to the `generated` bucket.
-- - So we only need INSERT permissions for `uploads` from the client for MVP.

alter table storage.objects enable row level security;

drop policy if exists "uploads_insert_own_folder" on storage.objects;
create policy "uploads_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Optional but helpful: allow the user to select/list their own uploaded objects.
drop policy if exists "uploads_select_own_folder" on storage.objects;
create policy "uploads_select_own_folder"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

