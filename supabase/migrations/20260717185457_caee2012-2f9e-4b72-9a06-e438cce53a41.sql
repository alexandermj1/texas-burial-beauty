ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS signed_copy_emailed_at timestamptz;