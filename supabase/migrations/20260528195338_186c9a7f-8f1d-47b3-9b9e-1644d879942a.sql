-- 1) Reset table-level grants on public.listings for anon/authenticated.
REVOKE ALL ON public.listings FROM anon;
REVOKE ALL ON public.listings FROM authenticated;

-- 2) Re-grant only safe columns to anon and authenticated for SELECT.
GRANT SELECT (
  id, user_id, cemetery, city, plot_type, section, spaces,
  asking_price, description, contact_name, contact_phone, contact_email,
  status, created_at, updated_at, photos
) ON public.listings TO anon, authenticated;

-- 3) Restore write privileges for owners/admins via RLS (column lists must include
--    cost_price/profit so admins can set them; RLS still restricts who can write).
GRANT INSERT, UPDATE, DELETE ON public.listings TO authenticated;

-- 4) Service role keeps full access.
GRANT ALL ON public.listings TO service_role;

-- 5) SECURITY DEFINER RPC for admins/agents to read full listings including
--    cost_price and profit. Internal access is gated by has_role().
CREATE OR REPLACE FUNCTION public.get_listings_with_internal()
RETURNS SETOF public.listings
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'agent'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY SELECT * FROM public.listings ORDER BY created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_listings_with_internal() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listings_with_internal() TO authenticated;
