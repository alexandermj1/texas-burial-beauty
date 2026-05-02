ALTER TABLE public.contact_submissions
ADD COLUMN IF NOT EXISTS quote_response text,
ADD COLUMN IF NOT EXISTS quote_responded_at timestamp with time zone;