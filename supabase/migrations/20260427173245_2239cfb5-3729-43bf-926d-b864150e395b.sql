CREATE TABLE public.agent_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date date NOT NULL,
  sale_number text,
  agent_name text NOT NULL,
  is_mortuary boolean NOT NULL DEFAULT false,
  cemetery text,
  listing_source text,
  sale_amount numeric,
  profit numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_sales_agent ON public.agent_sales(agent_name);
CREATE INDEX idx_agent_sales_date ON public.agent_sales(sale_date DESC);

ALTER TABLE public.agent_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage agent sales"
ON public.agent_sales FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_agent_sales_updated
BEFORE UPDATE ON public.agent_sales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();