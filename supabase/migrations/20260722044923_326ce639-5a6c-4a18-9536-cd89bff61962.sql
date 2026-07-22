
DROP POLICY IF EXISTS "portal_uploads_anon_insert" ON storage.objects;
DROP POLICY IF EXISTS "portal_uploads_anon_delete" ON storage.objects;

CREATE POLICY "portal_uploads_scoped_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'portal-uploads'
    AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{16,}$'
  );

CREATE POLICY "portal_uploads_scoped_delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (
    bucket_id = 'portal-uploads'
    AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{16,}$'
  );
