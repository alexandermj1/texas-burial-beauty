
-- Canonicalize cemetery names: strip operator words, garden codes, punctuation
CREATE OR REPLACE FUNCTION public.canonical_cemetery(name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text;
BEGIN
  IF name IS NULL THEN RETURN NULL; END IF;
  s := lower(name);
  -- Strip parenthetical aliases like "(Pierce Bros.)", "(Jewish)", "(Aka: ...)"
  s := regexp_replace(s, '\([^)]*\)', '', 'g');
  -- Strip trailing garden / section codes like "g-01", "g-17", "g 11"
  s := regexp_replace(s, '\s+g[-\s]?\d+\b', '', 'g');
  -- Remove operator suffixes / generic words
  s := regexp_replace(s, '\b(m\.?\s*p\.?|memorial park|mortuary and cemetery|mortuary|cemetery|mausoleum|park|assoc\.?|association)\b', '', 'g');
  -- Remove punctuation
  s := regexp_replace(s, '[^a-z0-9 ]', ' ', 'g');
  -- Collapse whitespace
  s := regexp_replace(s, '\s+', ' ', 'g');
  s := btrim(s);
  RETURN s;
END;
$$;

-- Canonicalize property type: lower, strip punctuation, singular, drop "package"
CREATE OR REPLACE FUNCTION public.canonical_property_type(pt text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text;
BEGIN
  IF pt IS NULL THEN RETURN NULL; END IF;
  s := lower(pt);
  s := regexp_replace(s, '\bpackage\b', '', 'g');
  s := regexp_replace(s, '\bdeluxe\b', '', 'g');
  -- "t.c.", "t. c.", "tc" -> "tc"
  s := regexp_replace(s, '\bt\.?\s*c\.?', 'tc', 'g');
  -- "gr/sps" -> "gr/sp" (plural collapse)
  s := replace(s, 'gr/sps', 'gr/sp');
  s := replace(s, 'gr/sp', 'grsp');
  -- Strip non-alnum
  s := regexp_replace(s, '[^a-z0-9 ]', ' ', 'g');
  -- Singularize trailing s on each word (rough but works for "crypts","niches","spaces","graves")
  s := regexp_replace(s, '(crypt|niche|space|grave|plot)s\b', '\1', 'g');
  s := regexp_replace(s, '\s+', ' ', 'g');
  s := btrim(s);
  RETURN s;
END;
$$;

-- Add generated columns to ca_inventory
ALTER TABLE public.ca_inventory
  ADD COLUMN IF NOT EXISTS cemetery_key text GENERATED ALWAYS AS (public.canonical_cemetery(cemetery)) STORED,
  ADD COLUMN IF NOT EXISTS lawn_key text GENERATED ALWAYS AS (
    public.canonical_cemetery(cemetery) || '|' || COALESCE(lower(btrim(area)), '')
  ) STORED,
  ADD COLUMN IF NOT EXISTS property_type_norm text GENERATED ALWAYS AS (public.canonical_property_type(property_type)) STORED;

CREATE INDEX IF NOT EXISTS idx_ca_inventory_cem_key ON public.ca_inventory(cemetery_key);
CREATE INDEX IF NOT EXISTS idx_ca_inventory_lawn_key ON public.ca_inventory(lawn_key);
CREATE INDEX IF NOT EXISTS idx_ca_inventory_pt_norm ON public.ca_inventory(property_type_norm);

-- Add generated columns to ca_sold_history
ALTER TABLE public.ca_sold_history
  ADD COLUMN IF NOT EXISTS cemetery_key text GENERATED ALWAYS AS (public.canonical_cemetery(cemetery)) STORED,
  ADD COLUMN IF NOT EXISTS lawn_key text GENERATED ALWAYS AS (
    public.canonical_cemetery(cemetery) || '|' || COALESCE(lower(btrim(area)), '')
  ) STORED,
  ADD COLUMN IF NOT EXISTS property_type_norm text GENERATED ALWAYS AS (public.canonical_property_type(property_type)) STORED;

CREATE INDEX IF NOT EXISTS idx_ca_sold_cem_key ON public.ca_sold_history(cemetery_key);
CREATE INDEX IF NOT EXISTS idx_ca_sold_lawn_key ON public.ca_sold_history(lawn_key);
CREATE INDEX IF NOT EXISTS idx_ca_sold_pt_norm ON public.ca_sold_history(property_type_norm);

-- Add to quote_estimates so we can find past-cemetery accepted/declined quotes
ALTER TABLE public.quote_estimates
  ADD COLUMN IF NOT EXISTS lawn text,
  ADD COLUMN IF NOT EXISTS cemetery_key text GENERATED ALWAYS AS (public.canonical_cemetery(cemetery)) STORED,
  ADD COLUMN IF NOT EXISTS lawn_key text GENERATED ALWAYS AS (
    public.canonical_cemetery(cemetery) || '|' || COALESCE(lower(btrim(lawn)), '')
  ) STORED,
  ADD COLUMN IF NOT EXISTS property_type_norm text GENERATED ALWAYS AS (public.canonical_property_type(property_type)) STORED;

CREATE INDEX IF NOT EXISTS idx_quote_est_cem_key ON public.quote_estimates(cemetery_key);
CREATE INDEX IF NOT EXISTS idx_quote_est_lawn_key ON public.quote_estimates(lawn_key);
