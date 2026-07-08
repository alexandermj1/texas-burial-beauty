
ALTER TABLE public.texas_cemeteries
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS geocoded_at timestamptz;

CREATE TABLE IF NOT EXISTS public.agent_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text,
  city text,
  address text,
  latitude numeric,
  longitude numeric,
  notes text,
  color text DEFAULT '#c96f4a',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_locations TO authenticated;
GRANT ALL ON public.agent_locations TO service_role;

ALTER TABLE public.agent_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and agents can view agent locations"
  ON public.agent_locations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'));

CREATE POLICY "Admins can insert agent locations"
  ON public.agent_locations FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update agent locations"
  ON public.agent_locations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete agent locations"
  ON public.agent_locations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_agent_locations_updated_at
  BEFORE UPDATE ON public.agent_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
