CREATE TABLE public.buyer_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL,
  listing_id UUID NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_by_name TEXT,
  cemetery TEXT,
  plot_type TEXT,
  asking_price NUMERIC,
  notes TEXT,
  buyer_response TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_buyer_recs_submission ON public.buyer_recommendations(submission_id);

ALTER TABLE public.buyer_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage buyer recommendations"
ON public.buyer_recommendations
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));