ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_summary_key TEXT;