
-- Drop the broken restrictive policies on listings
DROP POLICY IF EXISTS "Anyone can view active listings" ON public.listings;
DROP POLICY IF EXISTS "Owners can view own listings" ON public.listings;
DROP POLICY IF EXISTS "Owners can insert listings" ON public.listings;
DROP POLICY IF EXISTS "Owners can update own listings" ON public.listings;
DROP POLICY IF EXISTS "Owners can delete own listings" ON public.listings;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Anyone can view active listings"
  ON public.listings FOR SELECT
  TO public
  USING (status = 'active');

CREATE POLICY "Owners can view own listings"
  ON public.listings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert listings"
  ON public.listings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update own listings"
  ON public.listings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete own listings"
  ON public.listings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
