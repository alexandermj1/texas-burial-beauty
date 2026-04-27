
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS state text DEFAULT 'CA';

ALTER TABLE public.quote_estimates
  ADD COLUMN IF NOT EXISTS state text DEFAULT 'CA';

-- Backfill nulls
UPDATE public.contact_submissions SET state = 'CA' WHERE state IS NULL;
