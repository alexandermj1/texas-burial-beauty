CREATE OR REPLACE FUNCTION public.get_public_featured_plots()
RETURNS TABLE (id uuid, cemetery text, city text, plot_type text, section text, spaces integer, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, coalesce(nullif(c.canonical_name, ''), nullif(c.name, ''), s.cemetery),
    coalesce(nullif(s.cemetery_city, ''), c.city, ''),
    coalesce(nullif(s.property_type, ''), 'Cemetery property'),
    coalesce(nullif(s.plot_description, ''), nullif(s.section, ''), ''),
    coalesce(s.plot_count, CASE WHEN trim(s.spaces) ~ '^[0-9]{1,3}$' THEN trim(s.spaces)::integer END, 0),
    s.listing_paid_at
  FROM public.contact_submissions s
  LEFT JOIN LATERAL (
    SELECT tc.name, tc.canonical_name, tc.city
    FROM public.texas_cemeteries tc
    WHERE tc.deleted_at IS NULL AND (
      lower(tc.name) = lower(s.cemetery) OR lower(tc.canonical_name) = lower(s.cemetery)
    )
    ORDER BY (lower(tc.name) = lower(s.cemetery)) DESC, tc.id
    LIMIT 1
  ) c ON true
  WHERE s.deleted_at IS NULL AND s.archived_at IS NULL AND s.sold_at IS NULL
    AND s.listing_tier IN ('featured', 'custom_plus', 'set_your_price', 'set_your_own_price')
    AND s.listing_paid_at IS NOT NULL
    AND nullif(trim(s.cemetery), '') IS NOT NULL
  ORDER BY s.listing_paid_at DESC, s.id;
$$;
REVOKE ALL ON FUNCTION public.get_public_featured_plots() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_featured_plots() TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.get_public_featured_plots() IS 'Fixed public projection of unsold paid Featured (including legacy custom_plus) and higher-tier properties. Excludes seller identity, asking prices, payments and all private records.';