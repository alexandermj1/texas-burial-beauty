
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS accepted_quote_amount numeric,
  ADD COLUMN IF NOT EXISTS list_price numeric,
  ADD COLUMN IF NOT EXISTS sold_at timestamptz,
  ADD COLUMN IF NOT EXISTS sold_price numeric,
  ADD COLUMN IF NOT EXISTS seller_payout_status text,
  ADD COLUMN IF NOT EXISTS seller_payout_paid_at timestamptz;

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.contact_submissions(id) ON DELETE SET NULL,
  kind text NOT NULL,
  description text,
  recipient_email text,
  recipient_name text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending',
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text,
  checkout_url text,
  environment text NOT NULL DEFAULT 'sandbox',
  paid_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by_user_id uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_submission ON public.payment_transactions(submission_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);

GRANT SELECT, INSERT, UPDATE ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payment transactions"
  ON public.payment_transactions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access"
  ON public.payment_transactions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
