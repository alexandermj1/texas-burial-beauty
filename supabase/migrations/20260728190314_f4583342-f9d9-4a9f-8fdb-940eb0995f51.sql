CREATE POLICY "Public can view texas cemeteries for seller form" ON public.texas_cemeteries FOR SELECT TO anon USING (true);
GRANT SELECT ON public.texas_cemeteries TO anon;