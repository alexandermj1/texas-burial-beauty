CREATE TABLE public.buyer_wants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  summary text NOT NULL DEFAULT '',
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  buyer_words text,
  confidence text,
  source_email_id uuid,
  source_at timestamptz,
  checked_until timestamptz NOT NULL DEFAULT now(),
  staff_edited boolean NOT NULL DEFAULT false,
  edited_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX buyer_wants_one_active ON public.buyer_wants(submission_id) WHERE deleted_at IS NULL;
GRANT SELECT, INSERT, UPDATE ON public.buyer_wants TO authenticated;
GRANT ALL ON public.buyer_wants TO service_role;
ALTER TABLE public.buyer_wants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage buyer wants" ON public.buyer_wants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

CREATE TABLE public.buyer_want_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  want_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  fit text NOT NULL DEFAULT 'close',
  reason text NOT NULL,
  offer_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz,
  dismissed_by_name text,
  feedback text,
  feedback_verdict text,
  deleted_at timestamptz
);
CREATE UNIQUE INDEX buyer_want_alerts_pair ON public.buyer_want_alerts(submission_id, seller_id) WHERE deleted_at IS NULL;
GRANT SELECT, INSERT, UPDATE ON public.buyer_want_alerts TO authenticated;
GRANT ALL ON public.buyer_want_alerts TO service_role;
ALTER TABLE public.buyer_want_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage buyer want alerts" ON public.buyer_want_alerts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE TRIGGER buyer_wants_no_delete BEFORE DELETE ON public.buyer_wants FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();
CREATE TRIGGER buyer_want_alerts_no_delete BEFORE DELETE ON public.buyer_want_alerts FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();