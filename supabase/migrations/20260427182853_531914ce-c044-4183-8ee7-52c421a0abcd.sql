
-- California active inventory (admin only, not public)
CREATE TABLE public.ca_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area text,
  county text,
  control_number text,
  sku text,
  net_to_owner numeric,
  cemetery text NOT NULL,
  property_type_code integer,
  property_type text,
  location_details text,
  retail_price numeric,
  resale_price numeric,
  price_unit text,
  owner_name text,
  transfer_fee text,
  net_pct_to_owner numeric,
  discount_pct_off_retail numeric,
  resale_pct_of_retail numeric,
  poa_date date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ca_inventory_cemetery ON public.ca_inventory(cemetery);
CREATE INDEX idx_ca_inventory_property_type ON public.ca_inventory(property_type);
ALTER TABLE public.ca_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ca inventory" ON public.ca_inventory FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_ca_inventory_updated BEFORE UPDATE ON public.ca_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- California historical sales (for quote model comparables)
CREATE TABLE public.ca_sold_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area text,
  control_number text,
  sku text,
  net_to_owner numeric,
  cemetery text NOT NULL,
  property_type_code integer,
  property_type text,
  location_details text,
  retail_price numeric,
  resale_price numeric,
  owner_name text,
  transfer_fee text,
  net_pct_to_owner numeric,
  discount_pct_off_retail numeric,
  resale_pct_of_retail numeric,
  poa_date date,
  sold_marker text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ca_sold_cemetery ON public.ca_sold_history(cemetery);
CREATE INDEX idx_ca_sold_property_type ON public.ca_sold_history(property_type);
ALTER TABLE public.ca_sold_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ca sold" ON public.ca_sold_history FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Unified customer profiles
CREATE TABLE public.customer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_name text,
  primary_email text,
  primary_phone text,
  alt_emails text[] DEFAULT '{}',
  alt_phones text[] DEFAULT '{}',
  customer_kind text,
  state_focus text DEFAULT 'CA',
  lifetime_value numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  pinned_notes text,
  last_interaction_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_profiles_email ON public.customer_profiles(lower(primary_email));
CREATE INDEX idx_customer_profiles_phone ON public.customer_profiles(primary_phone);
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage customer profiles" ON public.customer_profiles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_customer_profiles_updated BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link existing submissions to customer profile
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS customer_profile_id uuid REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS handled_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS handled_by_name text,
  ADD COLUMN IF NOT EXISTS handled_at timestamptz;

ALTER TABLE public.email_messages
  ADD COLUMN IF NOT EXISTS customer_profile_id uuid REFERENCES public.customer_profiles(id) ON DELETE SET NULL;

-- Audit trail: every action taken on a customer
CREATE TABLE public.customer_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_profile_id uuid REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  submission_id uuid,
  actor_user_id uuid,
  actor_name text,
  action_type text NOT NULL,
  action_summary text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_customer ON public.customer_activity_log(customer_profile_id, created_at DESC);
ALTER TABLE public.customer_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view activity" ON public.customer_activity_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert activity" ON public.customer_activity_log FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Quote estimates (AI + comp-driven)
CREATE TABLE public.quote_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid,
  customer_profile_id uuid REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
  cemetery text NOT NULL,
  property_type text,
  spaces integer DEFAULT 1,
  request_details text,
  estimated_low numeric,
  estimated_mid numeric,
  estimated_high numeric,
  confidence_score numeric,
  confidence_label text,
  comp_count integer DEFAULT 0,
  closest_comp jsonb,
  ai_explanation text,
  ai_model_used text,
  ai_cost_estimate_usd numeric,
  outcome text DEFAULT 'pending',
  outcome_amount numeric,
  outcome_at timestamptz,
  generated_by_user_id uuid,
  generated_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_quote_estimates_cemetery ON public.quote_estimates(cemetery);
CREATE INDEX idx_quote_estimates_outcome ON public.quote_estimates(outcome);
ALTER TABLE public.quote_estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage quote estimates" ON public.quote_estimates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_quote_estimates_updated BEFORE UPDATE ON public.quote_estimates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
