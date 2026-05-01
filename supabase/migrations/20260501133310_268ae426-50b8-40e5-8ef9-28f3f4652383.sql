-- Inventory requests: agents flag inventory they want to sell that we don't currently have
CREATE TABLE public.inventory_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL,
  agent_name TEXT,
  cemetery TEXT NOT NULL,
  property_type TEXT,
  spaces INTEGER DEFAULT 1,
  section TEXT,
  target_price NUMERIC,
  buyer_context TEXT,
  notes TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  admin_response TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_requests ENABLE ROW LEVEL SECURITY;

-- Agents: can create their own and see their own
CREATE POLICY "Agents can create inventory requests"
ON public.inventory_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = agent_id AND public.has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Agents can view own inventory requests"
ON public.inventory_requests FOR SELECT TO authenticated
USING (auth.uid() = agent_id AND public.has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Agents can update own inventory requests"
ON public.inventory_requests FOR UPDATE TO authenticated
USING (auth.uid() = agent_id AND public.has_role(auth.uid(), 'agent'::app_role));

-- Admins: full access
CREATE POLICY "Admins manage inventory requests"
ON public.inventory_requests FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_inventory_requests_updated_at
BEFORE UPDATE ON public.inventory_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_inventory_requests_status ON public.inventory_requests(status);
CREATE INDEX idx_inventory_requests_agent ON public.inventory_requests(agent_id);