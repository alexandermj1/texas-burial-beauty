DROP POLICY IF EXISTS "portal_uploads_scoped_select" ON storage.objects;
DROP POLICY IF EXISTS "Public can list seller intake files" ON storage.objects;
CREATE POLICY "portal_uploads_team_staff_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'portal-uploads' AND public.has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "customer_files_team_staff_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'customer-files' AND public.has_role(auth.uid(), 'staff'::app_role));