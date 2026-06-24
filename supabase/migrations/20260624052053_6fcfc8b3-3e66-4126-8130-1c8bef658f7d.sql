ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by text;

CREATE INDEX IF NOT EXISTS idx_contact_submissions_deleted_at
  ON public.contact_submissions (deleted_at);