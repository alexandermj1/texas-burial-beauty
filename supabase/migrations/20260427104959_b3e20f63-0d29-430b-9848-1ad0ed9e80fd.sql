ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS quote_amount numeric,
  ADD COLUMN IF NOT EXISTS transfer_fee_amount numeric,
  ADD COLUMN IF NOT EXISTS quote_message text,
  ADD COLUMN IF NOT EXISTS quote_sent_at timestamptz;