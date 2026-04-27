
DELETE FROM public.ca_inventory a
USING public.ca_inventory b
WHERE a.id < b.id
  AND a.cemetery IS NOT DISTINCT FROM b.cemetery
  AND a.sku IS NOT DISTINCT FROM b.sku
  AND a.location_details IS NOT DISTINCT FROM b.location_details
  AND a.control_number IS NOT DISTINCT FROM b.control_number;
