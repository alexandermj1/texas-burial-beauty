CREATE POLICY "Public can list seller intake files"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'customer-files'
  AND (storage.foldername(name))[1] = 'public-intake'
  AND (storage.foldername(name))[2] ~ '^[0-9a-f-]{16,}$'
);