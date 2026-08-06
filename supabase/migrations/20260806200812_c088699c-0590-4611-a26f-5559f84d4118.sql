ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS documents_completed_at timestamptz;
ALTER TABLE public.email_messages ALTER COLUMN gmail_thread_id DROP NOT NULL;