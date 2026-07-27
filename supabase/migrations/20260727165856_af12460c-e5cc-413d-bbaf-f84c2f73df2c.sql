-- Lock anon down to non-sensitive columns on listings.
REVOKE SELECT ON public.listings FROM anon;
GRANT SELECT (
  id, user_id, cemetery, city, plot_type, section, spaces,
  asking_price, description, photos, status, created_at, updated_at
) ON public.listings TO anon;