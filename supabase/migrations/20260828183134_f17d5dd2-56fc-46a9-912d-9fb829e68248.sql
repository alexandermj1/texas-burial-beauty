drop policy if exists "Public read cemetery photos bucket" on storage.objects;

create policy "Admins read cemetery photos"
on storage.objects for select to authenticated
using (bucket_id = 'cemetery-photos' and has_role(auth.uid(), 'admin'::app_role));