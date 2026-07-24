ALTER TABLE public.texas_cemeteries ADD COLUMN IF NOT EXISTS county text;
CREATE INDEX IF NOT EXISTS idx_texas_cemeteries_county ON public.texas_cemeteries(county);