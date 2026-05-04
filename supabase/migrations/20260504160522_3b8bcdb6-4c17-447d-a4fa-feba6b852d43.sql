-- Bayer 8-stage seller pipeline schema extensions

-- 1. Extend contact_submissions with all pipeline-specific fields
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS inquiry_channel text,
  ADD COLUMN IF NOT EXISTS lawn text,
  ADD COLUMN IF NOT EXISTS space_numbers text,
  ADD COLUMN IF NOT EXISTS plot_count integer,
  ADD COLUMN IF NOT EXISTS ownership_type text,
  ADD COLUMN IF NOT EXISTS authorization_confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS authorization_notes text,
  ADD COLUMN IF NOT EXISTS cemetery_retail numeric,
  ADD COLUMN IF NOT EXISTS cemetery_verified_ownership boolean,
  ADD COLUMN IF NOT EXISTS quote_template text,
  ADD COLUMN IF NOT EXISTS quote_net_amount numeric,
  ADD COLUMN IF NOT EXISTS quote_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS quote_approved_by text,
  ADD COLUMN IF NOT EXISTS morgued_at timestamptz,
  ADD COLUMN IF NOT EXISTS acceptance_channel text,
  ADD COLUMN IF NOT EXISTS gov_id_on_file boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deed_on_file boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS death_cert_on_file boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS la_issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS la_signature_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS la_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS listing_option text,
  ADD COLUMN IF NOT EXISTS payment_link_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS la_countersigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS multi_owner_perm_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS multi_owner_perm_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS listing_number text,
  ADD COLUMN IF NOT EXISTS gdrive_url text,
  ADD COLUMN IF NOT EXISTS listing_live_at timestamptz,
  ADD COLUMN IF NOT EXISTS listing_url text,
  ADD COLUMN IF NOT EXISTS receipt_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS pipeline_stage_override text;

-- 2. POA records (one row per required POA per inquiry)
CREATE TABLE IF NOT EXISTS public.poa_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  owner_name text NOT NULL,
  relation text,
  poa_type text NOT NULL DEFAULT 'standard',
  delivery_method text,
  issued_at timestamptz,
  mailed_at timestamptz,
  notarized_at timestamptz,
  returned_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.poa_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage poa records" ON public.poa_records
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_poa_updated BEFORE UPDATE ON public.poa_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Quote revisions
CREATE TABLE IF NOT EXISTS public.quote_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  prior_amount numeric,
  new_amount numeric NOT NULL,
  reason text,
  approved_by text,
  approved_at timestamptz,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage quote revisions" ON public.quote_revisions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));