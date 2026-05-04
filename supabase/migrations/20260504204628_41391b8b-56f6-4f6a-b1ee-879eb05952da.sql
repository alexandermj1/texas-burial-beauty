
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS bayer_entry_id text,
  ADD COLUMN IF NOT EXISTS cemetery_city text,
  ADD COLUMN IF NOT EXISTS deed_owner_names text,
  ADD COLUMN IF NOT EXISTS deed_owners_status text,
  ADD COLUMN IF NOT EXISTS relationship_to_owner text;

CREATE UNIQUE INDEX IF NOT EXISTS contact_submissions_bayer_entry_id_key
  ON public.contact_submissions (bayer_entry_id)
  WHERE bayer_entry_id IS NOT NULL;
