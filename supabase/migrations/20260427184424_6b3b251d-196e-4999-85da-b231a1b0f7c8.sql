
-- Drop dependent generated columns (and their indexes) so we can replace the functions
DROP INDEX IF EXISTS idx_ca_inventory_cem_key;
DROP INDEX IF EXISTS idx_ca_inventory_lawn_key;
DROP INDEX IF EXISTS idx_ca_inventory_pt_norm;
DROP INDEX IF EXISTS idx_ca_sold_cem_key;
DROP INDEX IF EXISTS idx_ca_sold_lawn_key;
DROP INDEX IF EXISTS idx_ca_sold_pt_norm;
DROP INDEX IF EXISTS idx_quote_est_cem_key;
DROP INDEX IF EXISTS idx_quote_est_lawn_key;

ALTER TABLE public.ca_inventory
  DROP COLUMN IF EXISTS cemetery_key,
  DROP COLUMN IF EXISTS lawn_key,
  DROP COLUMN IF EXISTS property_type_norm;

ALTER TABLE public.ca_sold_history
  DROP COLUMN IF EXISTS cemetery_key,
  DROP COLUMN IF EXISTS lawn_key,
  DROP COLUMN IF EXISTS property_type_norm;

ALTER TABLE public.quote_estimates
  DROP COLUMN IF EXISTS cemetery_key,
  DROP COLUMN IF EXISTS lawn_key,
  DROP COLUMN IF EXISTS property_type_norm;

DROP FUNCTION IF EXISTS public.canonical_cemetery(text);
DROP FUNCTION IF EXISTS public.canonical_property_type(text);

-- Cemetery canonicalizer using POSIX patterns that actually work in PG
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
  -- Remove parenthetical aliases
  s := regexp_replace(s, '\([^)]*\)', ' ', 'g');
  -- Remove trailing garden codes like " g-01", " g 17"
  s := regexp_replace(s, '[[:space:]]+g[-[:space:]]?[[:digit:]]+', ' ', 'g');
  -- Remove operator suffixes (case-insensitive, no word boundaries needed since alone)
  s := regexp_replace(s, '[[:<:]]m\.?[[:space:]]*p\.?[[:>:]]', ' ', 'gi');
  s := regexp_replace(s, 'memorial[[:space:]]+park', ' ', 'g');
  s := regexp_replace(s, 'mortuary[[:space:]]+and[[:space:]]+cemetery', ' ', 'g');
  s := regexp_replace(s, '(mausoleum|mortuary|cemetery|association|assoc\.?)', ' ', 'g');
  -- Strip remaining punctuation
  s := regexp_replace(s, '[^a-z0-9 ]', ' ', 'g');
  -- Collapse whitespace
  s := regexp_replace(s, '[[:space:]]+', ' ', 'g');
  s := btrim(s);
  RETURN s;
END;
$$;

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
  s := regexp_replace(s, '(package|deluxe)', ' ', 'g');
  -- "t.c.", "t. c.", "tc " -> "tc "
  s := regexp_replace(s, 't\.?[[:space:]]*c\.?', 'tc', 'g');
  -- gr/sps -> gr/sp; then gr/sp -> grsp (no slash)
  s := replace(s, 'gr/sps', 'gr/sp');
  s := replace(s, 'gr/sp', 'grsp');
  -- Strip non-alnum
  s := regexp_replace(s, '[^a-z0-9 ]', ' ', 'g');
  -- Singularize trailing s on common nouns
  s := regexp_replace(s, '(crypt|niche|space|grave|plot)s', '\1', 'g');
  s := regexp_replace(s, '[[:space:]]+', ' ', 'g');
  s := btrim(s);
  RETURN s;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.canonical_cemetery(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.canonical_property_type(text) FROM PUBLIC, anon, authenticated;

-- Re-add generated columns
ALTER TABLE public.ca_inventory
  ADD COLUMN cemetery_key text GENERATED ALWAYS AS (public.canonical_cemetery(cemetery)) STORED,
  ADD COLUMN lawn_key text GENERATED ALWAYS AS (
    public.canonical_cemetery(cemetery) || '|' || COALESCE(lower(btrim(area)), '')
  ) STORED,
  ADD COLUMN property_type_norm text GENERATED ALWAYS AS (public.canonical_property_type(property_type)) STORED;

ALTER TABLE public.ca_sold_history
  ADD COLUMN cemetery_key text GENERATED ALWAYS AS (public.canonical_cemetery(cemetery)) STORED,
  ADD COLUMN lawn_key text GENERATED ALWAYS AS (
    public.canonical_cemetery(cemetery) || '|' || COALESCE(lower(btrim(area)), '')
  ) STORED,
  ADD COLUMN property_type_norm text GENERATED ALWAYS AS (public.canonical_property_type(property_type)) STORED;

ALTER TABLE public.quote_estimates
  ADD COLUMN cemetery_key text GENERATED ALWAYS AS (public.canonical_cemetery(cemetery)) STORED,
  ADD COLUMN lawn_key text GENERATED ALWAYS AS (
    public.canonical_cemetery(cemetery) || '|' || COALESCE(lower(btrim(lawn)), '')
  ) STORED,
  ADD COLUMN property_type_norm text GENERATED ALWAYS AS (public.canonical_property_type(property_type)) STORED;

CREATE INDEX idx_ca_inventory_cem_key ON public.ca_inventory(cemetery_key);
CREATE INDEX idx_ca_inventory_lawn_key ON public.ca_inventory(lawn_key);
CREATE INDEX idx_ca_inventory_pt_norm ON public.ca_inventory(property_type_norm);
CREATE INDEX idx_ca_sold_cem_key ON public.ca_sold_history(cemetery_key);
CREATE INDEX idx_ca_sold_lawn_key ON public.ca_sold_history(lawn_key);
CREATE INDEX idx_ca_sold_pt_norm ON public.ca_sold_history(property_type_norm);
CREATE INDEX idx_quote_est_cem_key ON public.quote_estimates(cemetery_key);
CREATE INDEX idx_quote_est_lawn_key ON public.quote_estimates(lawn_key);
