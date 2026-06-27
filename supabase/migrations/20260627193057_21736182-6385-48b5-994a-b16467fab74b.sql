ALTER TABLE public.texas_cemeteries
  ADD COLUMN IF NOT EXISTS process_info text,
  ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '[]'::jsonb;