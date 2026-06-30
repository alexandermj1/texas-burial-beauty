
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS reserved_at timestamptz,
  ADD COLUMN IF NOT EXISTS reserved_until timestamptz,
  ADD COLUMN IF NOT EXISTS reserved_by_email text,
  ADD COLUMN IF NOT EXISTS reserved_by_name text,
  ADD COLUMN IF NOT EXISTS reserved_by_submission_id uuid;

CREATE INDEX IF NOT EXISTS contact_submissions_reserved_until_idx
  ON public.contact_submissions(reserved_until)
  WHERE reserved_until IS NOT NULL;
