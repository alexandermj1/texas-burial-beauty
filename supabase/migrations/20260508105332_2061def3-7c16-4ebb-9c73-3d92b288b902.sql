-- Storage bucket for customer files (PoA, deeds, IDs, etc.)
insert into storage.buckets (id, name, public) values ('customer-files', 'customer-files', false)
on conflict (id) do nothing;

-- Table to track uploaded files per customer profile
create table if not exists public.customer_files (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null,
  uploaded_by_user_id uuid,
  uploaded_by_name text,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  mime_type text,
  document_type text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.customer_files enable row level security;

create policy "Admins manage customer files"
on public.customer_files for all to authenticated
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

-- Storage policies on the customer-files bucket
create policy "Admins read customer files"
on storage.objects for select to authenticated
using (bucket_id = 'customer-files' and has_role(auth.uid(), 'admin'::app_role));

create policy "Admins upload customer files"
on storage.objects for insert to authenticated
with check (bucket_id = 'customer-files' and has_role(auth.uid(), 'admin'::app_role));

create policy "Admins update customer files"
on storage.objects for update to authenticated
using (bucket_id = 'customer-files' and has_role(auth.uid(), 'admin'::app_role));

create policy "Admins delete customer files"
on storage.objects for delete to authenticated
using (bucket_id = 'customer-files' and has_role(auth.uid(), 'admin'::app_role));