create table if not exists public.cemetery_photos (
  id uuid primary key default gen_random_uuid(),
  cemetery_name text,
  cemetery_slug text,
  city text,
  file_name text not null,
  file_path text not null,
  folder_name text,
  caption text,
  alt_text text,
  latitude double precision,
  longitude double precision,
  taken_at timestamptz,
  file_size bigint,
  mime_type text,
  match_method text,
  match_distance_m integer,
  status text not null default 'pending',
  uploaded_by uuid,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT ON public.cemetery_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cemetery_photos TO authenticated;
GRANT ALL ON public.cemetery_photos TO service_role;

alter table public.cemetery_photos enable row level security;

create policy "Public read approved photos"
on public.cemetery_photos for select to anon
using (status = 'approved' and deleted_at is null);

create policy "Admins manage cemetery photos"
on public.cemetery_photos for all to authenticated
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

create policy "Public read cemetery photos bucket"
on storage.objects for select to public
using (bucket_id = 'cemetery-photos');

create policy "Admins upload cemetery photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'cemetery-photos' and has_role(auth.uid(), 'admin'::app_role));

create policy "Admins update cemetery photos"
on storage.objects for update to authenticated
using (bucket_id = 'cemetery-photos' and has_role(auth.uid(), 'admin'::app_role));

create policy "Admins delete cemetery photos"
on storage.objects for delete to authenticated
using (bucket_id = 'cemetery-photos' and has_role(auth.uid(), 'admin'::app_role));