
CREATE POLICY "portal_uploads_anon_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'portal-uploads');

CREATE POLICY "portal_uploads_anon_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'portal-uploads');

CREATE POLICY "portal_uploads_anon_delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'portal-uploads');
