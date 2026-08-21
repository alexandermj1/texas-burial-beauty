ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS archived_by text;

CREATE INDEX IF NOT EXISTS contact_submissions_archived_at_idx
  ON public.contact_submissions (archived_at);