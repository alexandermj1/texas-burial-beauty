-- Merge duplicate cemetery records and prevent future duplicates.

-- 1. Cook-Walden Capital Parks (Pflugerville): keep the row that carries the transfer fee.
UPDATE public.cemetery_files SET cemetery_id = '4293fcb2-7a76-4685-b582-fa91183407b7'
WHERE cemetery_id IN ('cb91fac5-d880-494d-a1fe-35fce0f3abb5','cab44e2e-bf86-496b-9c5e-f2f681f3c142');
DELETE FROM public.texas_cemeteries WHERE id IN ('cb91fac5-d880-494d-a1fe-35fce0f3abb5','cab44e2e-bf86-496b-9c5e-f2f681f3c142');
UPDATE public.texas_cemeteries
   SET name = 'Cook-Walden Capital Parks Funeral Home & Cemetery', city = 'Pflugerville', region = 'Austin'
 WHERE id = '4293fcb2-7a76-4685-b582-fa91183407b7';

-- 2. Forest Park Lawndale duplicate with no city.
UPDATE public.cemetery_files cf
   SET cemetery_id = (SELECT id FROM public.texas_cemeteries WHERE name = 'Forest Park Lawndale Cemetery' LIMIT 1)
 WHERE cf.cemetery_id = 'e4a21f74-06ae-4517-b064-65a340b4a3f9'
   AND EXISTS (SELECT 1 FROM public.texas_cemeteries WHERE name = 'Forest Park Lawndale Cemetery');
DELETE FROM public.texas_cemeteries
 WHERE id = 'e4a21f74-06ae-4517-b064-65a340b4a3f9'
   AND EXISTS (SELECT 1 FROM public.texas_cemeteries WHERE name = 'Forest Park Lawndale Cemetery');

-- 3. Fill in the missing city/region on the remaining row.
UPDATE public.texas_cemeteries
   SET city = 'Palestine', region = 'East Texas'
 WHERE id = '4b5980c4-fed2-4faf-814a-2581fef28931';

-- 4. Block future duplicate cemetery entries (same name + city, ignoring case/punctuation).
CREATE UNIQUE INDEX IF NOT EXISTS texas_cemeteries_name_city_uniq
  ON public.texas_cemeteries (
    lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g')),
    lower(coalesce(regexp_replace(city, '[^a-zA-Z0-9]', '', 'g'), ''))
  );