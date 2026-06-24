ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS cemetery_original text,
  ADD COLUMN IF NOT EXISTS cemetery_merge_history jsonb NOT NULL DEFAULT '[]'::jsonb;