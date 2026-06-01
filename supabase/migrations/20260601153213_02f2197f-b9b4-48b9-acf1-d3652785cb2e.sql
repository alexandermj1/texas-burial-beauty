
-- 1. Restrict anon column access on listings (hide seller PII from public)
REVOKE SELECT ON public.listings FROM anon;
GRANT SELECT (
  id, user_id, cemetery, city, plot_type, section, spaces,
  asking_price, description, photos, status, created_at, updated_at
) ON public.listings TO anon;

-- 2. Tighten agent reservation visibility
DROP POLICY IF EXISTS "Agents can view all reservations" ON public.plot_reservations;
CREATE POLICY "Agents view own reservations, admins view all"
ON public.plot_reservations
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'agent'::app_role) AND agent_id = auth.uid())
);

-- 3. Add UPDATE policy for listing-photos so owners can replace their own files
CREATE POLICY "Owners can update own listing photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'listing-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'listing-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Revoke public execute on admin/agent-only SECURITY DEFINER function
REVOKE EXECUTE ON FUNCTION public.get_listings_with_internal() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_listings_with_internal() TO authenticated;
