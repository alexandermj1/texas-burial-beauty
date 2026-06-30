ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_amount_cents integer,
  ADD COLUMN IF NOT EXISTS dispute_status text,
  ADD COLUMN IF NOT EXISTS stripe_charge_id text;
CREATE INDEX IF NOT EXISTS idx_payment_transactions_charge ON public.payment_transactions(stripe_charge_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_intent ON public.payment_transactions(stripe_payment_intent_id);