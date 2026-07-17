ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS template_hash text,
  ADD COLUMN IF NOT EXISTS signed_hash text,
  ADD COLUMN IF NOT EXISTS consent_accepted_at timestamptz;