
-- Admin can view ALL listings (including non-active)
CREATE POLICY "Admins can view all listings"
  ON public.listings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update any listing
CREATE POLICY "Admins can update all listings"
  ON public.listings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete any listing
CREATE POLICY "Admins can delete all listings"
  ON public.listings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
