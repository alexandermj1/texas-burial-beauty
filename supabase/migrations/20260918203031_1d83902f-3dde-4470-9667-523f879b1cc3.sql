ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS document_followup_paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS document_followup_pause_reason text;