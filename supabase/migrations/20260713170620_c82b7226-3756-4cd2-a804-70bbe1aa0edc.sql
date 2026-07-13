
-- 1) Fill in cities for existing auto-created rows we can identify
UPDATE public.texas_cemeteries SET city='Houston'
  WHERE city IS NULL AND lower(name) IN (
    'beth israel cemetery',
    'earthman resthaven funeral home & cemetery',
    'forest park  westheimer, houston texas'
  );
UPDATE public.texas_cemeteries SET city='Colleyville'
  WHERE city IS NULL AND lower(name)='bluebonnet hills memorial park';
UPDATE public.texas_cemeteries SET city='Pflugerville'
  WHERE city IS NULL AND lower(name)='cook-walden capital parks funeral home & cemetery';
UPDATE public.texas_cemeteries SET city='Fort Worth'
  WHERE city IS NULL AND lower(name)='laurel land -rosehill cemetery in fort worth';
UPDATE public.texas_cemeteries SET city='Lubbock'
  WHERE city IS NULL AND lower(name)='resthaven funeral home & memorial park';
UPDATE public.texas_cemeteries SET city='Dallas'
  WHERE city IS NULL AND lower(name)='restland funeral home, cemetery & crematorys';

-- 2) Seed canonical Texas cemeteries that aren't already represented
INSERT INTO public.texas_cemeteries (name, city, auto_created)
SELECT x.name, x.city, false
FROM (VALUES
  ('Assumption Cemetery','Austin'),
  ('Cook-Walden Forest Oaks Funeral Home','Pflugerville'),
  ('Oak Hill Cemetery (San Jose)','Austin'),
  ('Remembrance Gardens','Austin'),
  ('Mission Burial Park North','San Antonio'),
  ('Mission Burial Park South','San Antonio'),
  ('Mission Park Chapels — Dominion','San Antonio'),
  ('Restland Cemetery','San Antonio'),
  ('Oakwood Cemetery','Waco'),
  ('Killeen City Cemetery','Killeen'),
  ('Restlawn Cemetery','El Paso'),
  ('Rest Haven Memorial Park','Rockwall'),
  ('Ridgeview Memorial Park','Allen'),
  ('Rest Haven Funeral Home','Lucas'),
  ('Forest Park The Woodlands','Conroe'),
  ('Rosewood Memorial Park','Humble'),
  ('Magnolia Cemetery','Beaumont'),
  ('Davis-Greenlawn Cemetery','Rosenberg'),
  ('Olivewood Cemetery','Houston'),
  ('Memory Gardens','Corpus Christi'),
  ('Rose Hill Cemetery','Corpus Christi'),
  ('Seaside Memorial Park','Corpus Christi'),
  ('Bluebonnet Memorial Park','Grand Prairie'),
  ('Forest Park East','League City'),
  ('Memorial Oaks Cemetery — Katy Freeway','Houston')
) AS x(name, city)
WHERE NOT EXISTS (
  SELECT 1 FROM public.texas_cemeteries t
  WHERE public.canonical_cemetery(t.name) IS NOT NULL
    AND public.canonical_cemetery(t.name) = public.canonical_cemetery(x.name)
);

-- 3) Backfill Texas-region submissions to use canonical registry names.
-- Preserves the customer's original wording in cemetery_original and appends
-- to cemetery_merge_history for audit. Only relabels when the canonical form
-- matches a registry row and the current name isn't already the canonical one.
WITH matches AS (
  SELECT s.id AS sub_id,
         s.cemetery AS old_name,
         COALESCE(s.cemetery_original, s.cemetery) AS keep_original,
         COALESCE(s.cemetery_merge_history, '[]'::jsonb) AS history,
         t.name AS new_name
  FROM public.contact_submissions s
  JOIN public.texas_cemeteries t
    ON public.canonical_cemetery(t.name) IS NOT NULL
   AND public.canonical_cemetery(t.name) = public.canonical_cemetery(s.cemetery)
  WHERE s.cemetery IS NOT NULL
    AND s.cemetery <> ''
    AND s.pipeline_region IN ('texas','bayer')
    AND s.cemetery <> t.name
)
UPDATE public.contact_submissions s
SET cemetery = m.new_name,
    cemetery_original = COALESCE(s.cemetery_original, m.old_name),
    cemetery_merge_history = m.history
      || jsonb_build_array(jsonb_build_object(
        'at', now(),
        'from', m.old_name,
        'to', m.new_name,
        'source', 'seed_backfill_2026_07_13'
      ))
FROM matches m
WHERE s.id = m.sub_id;
