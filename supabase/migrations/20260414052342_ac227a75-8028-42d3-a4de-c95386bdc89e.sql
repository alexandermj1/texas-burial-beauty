
-- Create reservations table
CREATE TABLE public.plot_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  showing_date DATE NOT NULL,
  showing_time TEXT NOT NULL,
  reserved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '3 days'),
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.plot_reservations ENABLE ROW LEVEL SECURITY;

-- Agents and admins can view all reservations
CREATE POLICY "Agents can view all reservations"
ON public.plot_reservations FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'agent') OR public.has_role(auth.uid(), 'admin')
);

-- Agents can create reservations
CREATE POLICY "Agents can create reservations"
ON public.plot_reservations FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = agent_id AND public.has_role(auth.uid(), 'agent')
);

-- Agents can update their own reservations (cancel)
CREATE POLICY "Agents can update own reservations"
ON public.plot_reservations FOR UPDATE
TO authenticated
USING (
  auth.uid() = agent_id AND public.has_role(auth.uid(), 'agent')
);

-- Admins can manage all reservations
CREATE POLICY "Admins can manage reservations"
ON public.plot_reservations FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow agents to view all listings (including profit)
CREATE POLICY "Agents can view all listings"
ON public.listings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'agent'));
