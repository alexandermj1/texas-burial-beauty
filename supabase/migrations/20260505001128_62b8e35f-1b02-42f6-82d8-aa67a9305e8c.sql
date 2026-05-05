ALTER TABLE public.customer_notes ADD COLUMN IF NOT EXISTS submission_id uuid;
ALTER TABLE public.customer_notes ALTER COLUMN customer_profile_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_notes_submission ON public.customer_notes(submission_id);