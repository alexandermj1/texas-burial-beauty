
-- Add sold tracking fields to plot_reservations
ALTER TABLE public.plot_reservations 
ADD COLUMN IF NOT EXISTS sold_price numeric,
ADD COLUMN IF NOT EXISTS commission_amount numeric,
ADD COLUMN IF NOT EXISTS commission_status text DEFAULT 'none';

-- Create sales tracking table
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.listings(id),
  agent_id uuid NOT NULL,
  reservation_id uuid REFERENCES public.plot_reservations(id),
  sold_price numeric NOT NULL,
  cost_price numeric,
  profit numeric,
  commission_amount numeric DEFAULT 0,
  commission_status text NOT NULL DEFAULT 'pending',
  sold_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all sales"
ON public.sales FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents can view own sales"
ON public.sales FOR SELECT
TO authenticated
USING (agent_id = auth.uid() AND public.has_role(auth.uid(), 'agent'));

CREATE POLICY "Agents can insert own sales"
ON public.sales FOR INSERT
TO authenticated
WITH CHECK (agent_id = auth.uid() AND public.has_role(auth.uid(), 'agent'));
