-- Allow authenticated users to manage local guide storage objects

-- Lecture
drop policy if exists "Authenticated users can read local guide storage objects" on storage.objects;
create policy "Authenticated users can read local guide storage objects"
on storage.objects
for select
to authenticated
using (bucket_id in ('guide-documents', 'guides-images'));

-- Téléversement
drop policy if exists "Authenticated users can upload local guide storage objects" on storage.objects;
create policy "Authenticated users can upload local guide storage objects"
on storage.objects
for insert
to authenticated
with check (bucket_id in ('guide-documents', 'guides-images'));

-- Mise à jour
drop policy if exists "Authenticated users can update local guide storage objects" on storage.objects;
create policy "Authenticated users can update local guide storage objects"
on storage.objects
for update
to authenticated
using (bucket_id in ('guide-documents', 'guides-images'))
with check (bucket_id in ('guide-documents', 'guides-images'));

-- Suppression
drop policy if exists "Authenticated users can delete local guide storage objects" on storage.objects;
create policy "Authenticated users can delete local guide storage objects"
on storage.objects
for delete
to authenticated
using (bucket_id in ('guide-documents', 'guides-images'));
