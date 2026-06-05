
-- 1. Pipeline region + texas stage on submissions
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS pipeline_region text,
  ADD COLUMN IF NOT EXISTS texas_pipeline_stage text,
  ADD COLUMN IF NOT EXISTS texas_intake_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS texas_details_received_at timestamptz;

-- Backfill region: anything with TX state or texas_buy_wizard channel = texas, else bayer
UPDATE public.contact_submissions
SET pipeline_region = CASE
  WHEN inquiry_channel = 'texas_buy_wizard' THEN 'texas'
  WHEN state = 'TX' THEN 'texas'
  WHEN lower(coalesce(region,'')) LIKE '%texas%' THEN 'texas'
  ELSE 'bayer'
END
WHERE pipeline_region IS NULL;

ALTER TABLE public.contact_submissions
  ALTER COLUMN pipeline_region SET DEFAULT 'bayer';

CREATE INDEX IF NOT EXISTS idx_contact_submissions_pipeline_region
  ON public.contact_submissions(pipeline_region);

-- 2. Texas cemetery profiles
CREATE TABLE public.texas_cemeteries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  canonical_name text GENERATED ALWAYS AS (public.canonical_cemetery(name)) STORED,
  city text,
  address text,
  contact_name text,
  contact_phone text,
  contact_email text,
  transfer_fee numeric,
  endowment_notes text,
  notes text,
  auto_created boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (canonical_name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.texas_cemeteries TO authenticated;
GRANT ALL ON public.texas_cemeteries TO service_role;

ALTER TABLE public.texas_cemeteries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and agents view texas cemeteries"
  ON public.texas_cemeteries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Admins and agents insert texas cemeteries"
  ON public.texas_cemeteries FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Admins and agents update texas cemeteries"
  ON public.texas_cemeteries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Admins delete texas cemeteries"
  ON public.texas_cemeteries FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_texas_cemeteries_updated_at
  BEFORE UPDATE ON public.texas_cemeteries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
