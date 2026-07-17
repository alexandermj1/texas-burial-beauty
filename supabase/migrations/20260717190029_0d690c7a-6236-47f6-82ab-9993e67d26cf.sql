ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS countersigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS countersigned_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS countersigner_name TEXT,
  ADD COLUMN IF NOT EXISTS countersigner_signature TEXT,
  ADD COLUMN IF NOT EXISTS countersigned_pdf_path TEXT;